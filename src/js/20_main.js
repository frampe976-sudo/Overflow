/* =====================================================================
   GAME — state, rules, loop, boot
   ===================================================================== */
const QUALITY = {
  low: { scale: 0.72, maxDpr: 1, msaa: 0, bloom: false, refl: false, rain: 1200, lights: 3, draw: 170, detail: 85 },
  medium: { scale: 1, maxDpr: 1.5, msaa: 0, bloom: true, refl: false, rain: 2400, lights: 5, draw: 210, nmap: true, detail: 120 },
  high: { scale: 1, maxDpr: 2, msaa: 4, bloom: true, refl: true, rain: 4000, lights: 8, draw: 260, ca: true, nmap: true, detail: 160 }
};
const Game = {
  mode: 'boot', actors: [], player: null, mission: null, def: null, score: 0, crime: 0, crimeTarget: 0, showCrime: false, timer: null,
  stats: null, interactables: [], boss: null, dt: 0, stopT: 0, slowT: 0, slowK: 1, comboN: 0, comboT: 0, dmgTaken: 1, enemyAcc: 1,
  checkpoint: null, cultBeam: false, lastSafe: null, aimables: [], flags: {}, dynScale: 1, fpsAcc: 0, fpsN: 0, badgeCount: 0, warned: {},
  addActor(a) { this.actors.push(a); return a; },
  resetStats() { this.stats = { arrests: 0, kos: 0, kills: 0, killsUnarmed: 0, civHurt: 0, civKilled: 0, shots: 0, hits: 0, surrenders: 0, badges: 0 }; },
  applyQuality() {
    let q = Save.data.options.quality;
    if (q === 'auto') q = this.autoQ || (('ontouchstart' in window) || /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'medium' : 'high');
    const Q = Object.assign({}, QUALITY[q]); Q.scale *= (Save.data.options.quality === 'auto' ? this.dynScale : 1); Q.scale = Math.round(Q.scale * 20) / 20;
    this.q = Q; Gfx.setup(Q); Render.rainCount = Q.rain;
  },
  /* ---------------- world population ---------------- */
  clearWorld() {
    this.actors = []; this.aimables = []; Cars.clear(); Pickups.clear(); Nades.clear(); FX.ps = []; FX.tracers = []; FX.marks = []; FX.rings = [];
    Combat.tokens.clear(); Combat.shooters.clear(); this.fightN = 0; this.streakN = 0; if (this.dmgAcc) this.dmgAcc.clear(); this.interactables = []; this.boss = null; this.timer = null; this.cultBeam = false; this.beamC = null; Lights.dyn = [];
    HUD.clearRadio(); Snd.silenceLoops();
  },
  spawnBadges() { for (const b of World.badges) if (Save.data.badges.indexOf(b.id) < 0) Pickups.add('badge', b.x, b.y - 0.9, b.z, { badge: b }); },
  populate(dt, force) {
    const P = this.player; if (!P || !this.def) return;
    // multiplayer: the city lives around every robot of the brigade (a few more people when they are many)
    const multi = MP.host && MP.state === 'play', RB = multi ? MP.robots() : [P];
    const near = (x, z) => { let b = 1e18; for (const r of RB) { const d = (r.pos.x - x) ** 2 + (r.pos.z - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
    const want = Math.round((this.def.civs || 0) * (multi ? Math.min(1.8, 1 + 0.25 * (RB.length - 1)) : 1)); let civs = 0;
    for (const a of this.actors) {
      if (a.team !== 'civ' || a.inCar || a.tags.keep || a.mode === 'victim' || a.mode === 'script' || a.puppet) { if (a.team === 'civ' && !a.inCar && !a.puppet) civs++; continue; }
      const d = near(a.pos.x, a.pos.z);
      if (d > 135 || (!a.alive && d > 60) || a.removed) a.removed = true; else civs++;
    }
    this.popT = (this.popT || 0) - dt;
    if ((force || this.popT <= 0) && civs < want) {
      this.popT = force ? 0 : 0.4;
      const n = force ? want - civs : 1;
      for (let k = 0; k < n; k++) {
        const C = RB.length > 1 ? RP(RB) : P, rings = RB.length > 1 ? World.nav.rings.filter(q => dist2D(q.cx, q.cz, C.pos.x, C.pos.z) < 180) : this._nearRings(P.pos, 140);
        for (let tries = 0; tries < 12 && rings.length; tries++) {
          const ring = RP(rings); const i = RI(0, 3); const p = ring.pts[i], q = ring.pts[(i + 1) % 4]; const t = R(0, 1);
          const x = lerp(p[0], q[0], t), z = lerp(p[1], q[1], t); const d = dist2D(x, z, C.pos.x, C.pos.z);
          if (d < (force ? 8 : 35) || d > 110 || (multi && near(x, z) < (force ? 8 : 35))) continue;
          if (!force && dist2D(x, z, P.pos.x, P.pos.z) < 70 && Cam.sphereVisible(x, 1, z, 1)) continue;
          const c = new Civilian(x, z, { yaw: R(0, TAU) }); c.ring = ring; c.ri = (i + 1) % 4; c.target = { x: q[0], z: q[1] }; this.addActor(c); break;
        }
      }
    }
    // traffic
    const wantCars = Math.round((this.def.traffic || 0) * (multi ? Math.min(1.6, 1 + 0.2 * (RB.length - 1)) : 1)); let cars = 0;
    for (const c of Cars.list) {
      if (c.ai !== 'traffic' && !(c.ambient && !c.ai)) continue; // traffic, and ambient cars the player drove then left
      const d = near(c.pos.x, c.pos.z); if (d > 190 && !(c.driver && c.driver.isRobot) && !c.remote) { c.removed = true; if (c.driver) c.driver.removed = true; } else if (c.ai === 'traffic') cars++;
    }
    Cars.list = Cars.list.filter(c => !c.removed);
    if (cars < wantCars && (force || Math.random() < dt * 0.6)) Cars.spawnTraffic(force ? wantCars - cars : 1);
    // parked cars on the parking spots around the player (far ones that nobody drives are removed)
    this.parkT = (this.parkT || 0) - dt;
    if (force || this.parkT <= 0) {
      this.parkT = 0.8; const wantP = this.def.parked === undefined ? 12 : this.def.parked; let np = 0;
      for (const c of Cars.list) { if (c.ai !== 'parked') continue; if (!c.driver && !c.tags.keep && !c.remote && near(c.pos.x, c.pos.z) > 115) c.removed = true; else np++; }
      if (Cars.list.some(c => c.removed)) Cars.list = Cars.list.filter(c => !c.removed);
      const spots = np < wantP ? World.parkSpots.filter(s => { const d = near(s.x, s.z); return d >= (force ? 14 : 40) && (multi ? RB.some(r => dist2D(s.x, s.z, r.pos.x, r.pos.z) <= 100) : d <= 100); }) : [];
      let tries = force ? 60 : 6;
      while (np < wantP && tries-- > 0 && spots.length) {
        const s = spots[RI(0, spots.length - 1)]; const d = dist2D(s.x, s.z, P.pos.x, P.pos.z);
        if (s.car && !s.car.removed && dist2D(s.car.pos.x, s.car.pos.z, s.x, s.z) < 4) continue;
        if (!force && d < 75 && Cam.sphereVisible(s.x, 1, s.z, 3)) continue;
        if (Cars.list.some(c => dist2D(c.pos.x, c.pos.z, s.x, s.z) < 5.5)) continue;
        s.car = Cars.add(new Car(RP(['sedan', 'sedan', 'compact', 'compact', 'van', 'taxi']), s.x, s.z, s.yaw, { ai: 'parked' })); s.car.ambient = true; np++;
      }
    }
  },
  // sidewalk rings near a point (refreshed when the player has moved)
  _nearRings(p, r) { const k = Math.round(p.x / 20) + ',' + Math.round(p.z / 20); if (k !== this._nrK) { this._nrK = k; this._nr = World.nav.rings.filter(q => dist2D(q.cx, q.cz, p.x, p.z) < r + 40); } return this._nr; },
  /* ---------------- missions ---------------- */
  startMission(def, fromCheckpoint) {
    Snd.init(); Snd.resume();
    Folk.finishLevel(3); // every look has at least its lowest level before the case starts
    this.clearWorld(); this.def = def; this.resetStats(); this.score = 0; this.warned = {}; HUD._area = null; HUD._areaC = null;
    Kit.unfence(); Env.setWeather(def); Menus.lastCase = def;
    const st = def.start;
    const sp = World.safeSpot(st.x, st.z, 0.35);
    this.player = new Player(sp.x, sp.z, st.yaw); this.addActor(this.player);
    this.lastSafe = { x: st.x, z: st.z };
    this.crime = def.crime || 0; this.crimeTarget = def.crimeTarget || 0; this.showCrime = def.crime !== undefined;
    // late cases get harder, a bit less steeply than their raw numbers now that the base fight is tougher
    this.dmgTaken = def.diff ? 1 + (def.diff.dmg - 1) * 0.4 : 1; this.enemyAcc = def.diff ? 1 + (def.diff.acc - 1) * 0.4 : 1;
    Combat.maxShooters = def.diff && def.diff.acc >= 1.18 ? 3 : 2; // how many gunmen may aim at the robot at once (the last cases: three)
    this.mission = new MissionRun(def);
    if (def.setup) def.setup(this.mission, this);
    this.spawnBadges();
    let stage = 0;
    if (fromCheckpoint && this.checkpoint && this.checkpointDef === def) { stage = this.checkpoint.stage; this.crime = this.checkpoint.crime; this.applyCheckpoint(def, stage); }
    this.checkpointDef = def;
    this.populate(0, true);
    if (def.patrol) Patrol.reset();
    this.mission.start(stage);
    this.mode = 'play'; Menus.hideAll(); HUD.show(true); HUD.carMode(this.player.state === 'car'); HUD.weaponChanged();
    CamCtl.mode = 'foot'; CamCtl.reset(this.player.state === 'car' ? this.player.car.yaw : this.player.yaw);
    Music.target = 0.1; Render.post.dmg = 0;
    this.fade(false);
    if (Input.device === 'kbm') Input.requestLock();
    const chap = !fromCheckpoint && Campaign.chapterOf(def);
    if (chap && chap.ids[0] === def.id) HUD.big(def.title, `Chapitre ${chap.n} · ${chap.title}`, 'good', 3.4);
    else if (!def.patrol) HUD.big(def.title, def.no, 'good', 2.6); else if (def.coop) HUD.big('Brigade de nuit', `Patrouille en équipe · ${MP.count()} robots`, 'good', 2.6); else HUD.big('Patrouille libre', 'Port-Saline', 'good', 2.4);
  },
  applyCheckpoint(def, stage) {
    const M = this.mission, P = this.player, S = World.spots;
    // checkpoints always put the robot back on safe ground (never on a container, a roof or a crane)
    const place = (x, z, yaw) => { const s = World.safeSpot(x, z, P.r); P.pos.set(s.x, s.y, s.z); P.vel.set(0, 0, 0); P.yaw = yaw || 0; P.grounded = true; P.groundY = s.y; };
    if (def.id === 'm1' && stage >= 2) { M.m1.removed = M.m2.removed = true; M.victim.mode = 'script'; M.victim.victim = false; place(S.market.x - 4, S.market.z + 2, -Math.PI / 2); }
    if (def.id === 'm2' && stage >= 2) { for (const g of M.gang) g.removed = true; P.giveWeapon('shotgun', 18); place(-49, 146, 0.62); }
    if (def.id === 'm3' && stage >= 1) { Cars.enter(M.car, P); }
    if (def.id === 'm4' && stage >= 1) { for (const g of M.jetty) g.removed = true; place(95, 228, 0); }
    if (def.id === 'm4' && stage >= 2) place(95, 240, 0);
    // campaign cases: each checkpoint stage says where the robot resumes, and may restore the state of the case
    const cp = def.stages[stage] && def.stages[stage].cp; if (cp) { const c = typeof cp === 'function' ? cp(M, this) : cp; if (c) place(c.x, c.z, c.yaw); }
    if (def.resume) def.resume(M, this, stage);
    this.actors = this.actors.filter(a => !a.removed);
  },
  missionComplete() {
    if (this.mode !== 'play') return;
    const def = this.def, M = this.mission, S = this.stats;
    this.mode = 'result'; Input.releaseLock(); HUD.show(false); Snd.silenceLoops(); Snd.play('win'); Music.target = 0.2;
    // rating
    let r = 100 + Math.min(20, S.arrests * 4) - S.civHurt * 8 - S.civKilled * 30 - S.killsUnarmed * 10 - S.kills * 2;
    if (M.bossKilled) r -= 15; const t = M.t; if (def.par && t > def.par) r -= Math.min(20, (t - def.par) / 20);
    if (this.player.hp < this.player.maxHp * 0.25) r -= 5;
    const grade = def.patrol || def.training ? '' : r >= 112 ? 'S' : r >= 96 ? 'A' : r >= 80 ? 'B' : r >= 62 ? 'C' : 'D';
    if (def.training) { Save.data.trained = true; Save.write(); }
    else if (!def.patrol) { const rec = Save.data.missions[def.id] || {}; const order = ['D', 'C', 'B', 'A', 'S']; if (!rec.grade || order.indexOf(grade) > order.indexOf(rec.grade)) rec.grade = grade; rec.done = true; Save.data.missions[def.id] = rec; Save.write(); }
    const rows = [['Temps', fmtTime(M.t)], ['Interpellations', S.arrests], ['Suspects neutralisés', S.kos], ['Neutralisations létales', S.kills], ['Bavures', S.civHurt + S.civKilled], ['Précision', S.shots ? Math.round(S.hits / S.shots * 100) + ' %' : '—'], ['Score', this.score]];
    if (def.patrol) rows.splice(1, 0, ['Criminalité finale', Math.round(this.crime) + ' %']);
    const texts = { m1: "Le sac est rendu, le voleur dort en cellule. Okafor note dans ton dossier : « circuits froids, bonnes jambes ».", m2: M.bossKilled ? "Les docks sont calmes, mais le Grutier ne parlera plus. L'IGPN va vouloir lire ta boîte noire." : "Le Grutier est en garde à vue. Il a parlé d'une livraison pour « ceux de la Marée ».", m3: "Le plan du phare est sur le bureau d'Okafor. La Grande Marée, c'est pour cette nuit.", m4: M.bossKilled ? "Le signal est coupé, la ville est sauve. Le Héraut, lui, ne sera jamais jugé." : "Le Héraut est menotté, le signal coupé, et les vannes restent fermées. Port-Saline dort enfin. Merci, unité Solis.", patrol: 'Fin de service. Le PC Radio vous remercie, Saline-17.', train: 'Tous les systèmes sont opérationnels. Bienvenue dans la brigade de nuit, unité Solis. La carte et la pause sont en haut à droite de l’écran.' };
    if (!texts[def.id] && def.outro) texts[def.id] = typeof def.outro === 'function' ? def.outro(M, this) : def.outro;
    const idx = MISSIONS.indexOf(def); const nextM = def.training ? MISSIONS[0] : idx >= 0 ? MISSIONS[idx + 1] : null;
    const btns = []; if (nextM) btns.push([def.training ? 'Premier dossier' : 'Dossier suivant', () => Game.startMission(nextM), true]);
    btns.push([def.patrol ? 'Reprendre la patrouille' : def.training ? 'Refaire l’entraînement' : 'Rejouer', () => Game.startMission(def), !nextM]); btns.push(['Menu', () => Game.toMenu()]);
    const rows2 = def.training ? [['Temps', fmtTime(M.t)], ['Étapes', def.stages.length + ' / ' + def.stages.length]] : rows;
    const last = idx >= 0 && idx === MISSIONS.length - 1;
    let xp = null;
    if (!def.training) {
      const gained = Math.max(0, Math.round(this.score)), r0 = rankOf(Save.data.xp); Save.data.xp += gained; const r1 = rankOf(Save.data.xp); Save.write();
      const next = RANKS[r1 + 1]; xp = { gained, name: RANKS[r1][0], up: r1 > r0, k: next ? (Save.data.xp - RANKS[r1][1]) / (next[1] - RANKS[r1][1]) : 1, left: next ? next[1] - Save.data.xp : 0 };
      if (xp.up) setTimeout(() => Snd.play('rank'), 900);
    }
    setTimeout(() => Menus.result(true, def.patrol ? 'Fin de patrouille' : def.training ? 'Entraînement terminé' : last ? 'Fin de l’histoire' : 'Affaire classée', def.no + ' · ' + def.title, grade, rows2, texts[def.id] || '', btns, xp), 400);
  },
  missionFailed(reason) {
    if (this.mode !== 'play') return;
    this.mode = 'result'; Input.releaseLock(); Snd.silenceLoops(); Snd.play('fail'); HUD.show(false);
    const def = this.def; const cp = this.checkpoint && this.checkpointDef === def && this.checkpoint.stage > 0;
    const btns = []; if (cp) btns.push(['Reprendre au point de contrôle', () => Game.startMission(def, true), true]);
    btns.push(['Recommencer', () => Game.startMission(def), !cp]); btns.push(['Menu', () => Game.toMenu()]);
    Menus.result(false, 'Mission échouée', def.no + ' · ' + def.title, '', [['Temps', fmtTime(this.mission.t)], ['Interpellations', this.stats.arrests]], reason, btns, null);
  },
  // the game is running (in multiplayer the city goes on behind the pause menu)
  live() { return this.mode === 'play' || (this.mode === 'pause' && MP.on && MP.state === 'play'); },
  playerDied() {
    if (!this.live() || this.dying) return;
    if (MP.on && MP.state === 'play') { // a brigade: on the ground, out of service; a partner can come and repair the robot
      const P = this.player; if (P.downed) return;
      P.downed = true; P.downT = 30; P.lock = null;
      HUD.big('Hors service', 'Un partenaire peut vous réparer', 'bad', 3); Music.target = 0.25; Snd.play('down', null, 0.8);
      MP.onDowned(); return;
    }
    this.dying = true;
    this.slowmo(1.6, 0.3); HUD.big('Unité hors service', (MP.on ? ROBOT_ACCENTS[this.player.slot || 0].n : 'Saline-17') + ' ne répond plus', 'bad', 3); Music.target = 0; Music.stop(2.5);
    setTimeout(() => { this.dying = false; if (this.def && this.def.patrol) { this.respawnPatrol(); return; } this.missionFailed('Unité mise hors service. Les renforts arrivent trop tard.'); }, 2600);
  },
  respawnPatrol() {
    const P = this.player; if (P._respawning) return; P._respawning = true; this.fade(true);
    P.downed = false;
    setTimeout(() => {
      P._respawning = false; if (this.player !== P) return; P.alive = true; P.dead = false; P.downed = false; P.inWater = false; P.hp = P.maxHp; P.setState('move');
      // a brigade: back next to a partner still standing (else, like alone, at the station)
      const mate = MP.on && MP.state === 'play' ? MP.robots().find(r => r !== P && r.alive && !r.downed && !r.removed && r.state !== 'car' && World.onLand(r.pos.x, r.pos.z)) : null;
      const f = World.spots.policeFront, s = mate ? World.safeSpot(mate.pos.x - Math.sin(mate.yaw) * 3, mate.pos.z - Math.cos(mate.yaw) * 3, P.r) : World.safeSpot(f.x + ((P.slot || 0) % 3 - 1) * 2, f.z + (P.slot > 2 ? 1.8 : 0), P.r);
      P.pos.set(s.x, s.y, s.z); P.vel.set(0, 0, 0); P.setLock && P.setLock(null); CamCtl.reset(P.yaw); this.addCrime(8);
      HUD.toast(mate ? 'Retour auprès de ' + (mate.pname || 'votre partenaire') : 'Réparation au commissariat', '+8 % criminalité', 'bad'); this.fade(false);
    }, 500);
  },
  // multiplayer: a partner repaired our robot
  revived(by) {
    const P = this.player; if (!P || !P.downed || !this.live()) return;
    P.downed = false; P.alive = true; P.dead = false; P.hp = P.maxHp * 0.4; P.setState('getup'); P.iframe = 1.5; P.vel.set(0, 0, 0); P.hitFlash = 0;
    HUD.big('De retour en service', 'Réparé par ' + by, 'good', 2); Snd.play('repair', P.pos); Music.target = 0.6; this.dying = false;
  },
  playerFellInWater() {
    const P = this.player; if (this.waterBusy) return;
    if (MP.on && !P.alive) { this.respawnPatrol(); return; } // a brigade: a robot out of service knocked into the water
    this.waterBusy = true; this.fade(true);
    setTimeout(() => {
      if (P.car) { const c = P.car; c.driver = null; P.car = null; P.inCar = null; HUD.carMode(false); Input.ctx.car = false; }
      P.inWater = false; P.setState('move'); P.vel.set(0, 0, 0);
      const l = this.lastSafe || World.spots.policeFront, s = World.safeSpot(l.x, l.z, P.r); P.pos.set(s.x, s.y, s.z); P.grounded = true;
      P.hp = Math.max(10, P.hp - 15); HUD.toast('Court-circuit', 'Chute à l’eau · −15 PV', 'bad'); CamCtl.reset(P.yaw); this.fade(false); this.waterBusy = false;
    }, 700);
  },
  toMenu() {
    if (MP.on) MP.close();
    this.clearWorld(); this.mode = 'menu'; this.def = null; this.mission = null; HUD.show(false); Input.releaseLock(); CamCtl.mode = 'menu'; Music.target = 0.05; Kit.unfence(); Env.setWeather(null);
    this.player = null; Menus.hideAll(); Menus.show('scr-title', false);
  },
  // multiplayer: back to the game room (the others stay connected)
  toLobby() {
    if (MP.guest) MP.clearEnts();
    this.clearWorld(); this.mode = 'menu'; this.def = null; this.mission = null; HUD.show(false); Input.releaseLock(); CamCtl.mode = 'menu'; Music.target = 0.05; Kit.unfence(); Env.setWeather(null);
    this.player = null; Menus.hideAll(); Menus.show('scr-multi', false);
  },
  // multiplayer guest: the host has started the patrol; our robot appears in front of the police station
  startCoopGuest(at) {
    Snd.init(); Snd.resume(); Folk.finishLevel(3); MP.clearEnts();
    this.clearWorld(); this.def = COOP; this.resetStats(); this.score = 0; this.warned = {}; HUD._area = null; HUD._areaC = null; this.dying = false;
    Kit.unfence(); Env.setWeather(COOP);
    Actor.nid = Math.max(Actor.nid, 1e9); Car.nid = Math.max(Car.nid, 1e9); // our own ids never meet the host's
    const f = at || World.spots.policeFront, k = MP.slot || 1, sp = World.safeSpot(f.x + (k % 3 - 1) * 2.2, f.z + (at ? -2.5 : 1.2) + (k > 2 ? 1.8 : 0), 0.35); // a late joiner: next to the host's robot
    this.player = new Player(sp.x, sp.z, 0, MP.slot); this.addActor(this.player);
    this.lastSafe = { x: sp.x, z: sp.z };
    this.crime = 55; this.crimeTarget = 0; this.showCrime = true; this.dmgTaken = 1; this.enemyAcc = 1; this.timer = null;
    this.mission = new MissionRun(COOP); this.mission.objective = 'Patrouillez. Restez à l’écoute de la radio.';
    this.spawnBadges(); MP.myPts = 0; MP.events = [];
    this.mode = 'play'; Menus.hideAll(); HUD.show(true); HUD.carMode(false); HUD.weaponChanged();
    CamCtl.mode = 'foot'; CamCtl.reset(this.player.yaw); Music.target = 0.1; Render.post.dmg = 0; this.fade(false);
    if (Input.device === 'kbm') Input.requestLock();
    HUD.big('Brigade de nuit', `Patrouille en équipe · ${Math.max(2, MP.roster.length)} robots`, 'good', 2.6);
  },
  // multiplayer: the end of the shift (the host ended it): team result, one's own experience
  coopResult(team, myPts) {
    if (this.mode !== 'play' && this.mode !== 'pause') return;
    this.mode = 'result'; Input.releaseLock(); HUD.show(false); Snd.silenceLoops(); Snd.play('win'); Music.target = 0.2;
    const rows = [['Temps', fmtTime(team.t || 0)], ['Criminalité finale', team.crime + ' %'], ['Score de la brigade', team.score]];
    for (const r of team.rows || []) rows.push([r[0], `${r[1]} interp. · ${r[2]} K.-O. · ${r[3]} pts`]);
    const gained = Math.max(0, Math.round((myPts || 0) + team.score * 0.2)), r0 = rankOf(Save.data.xp); Save.data.xp += gained; const r1 = rankOf(Save.data.xp); Save.write();
    const next = RANKS[r1 + 1], xp = { gained, name: RANKS[r1][0], up: r1 > r0, k: next ? (Save.data.xp - RANKS[r1][1]) / (next[1] - RANKS[r1][1]) : 1, left: next ? next[1] - Save.data.xp : 0 };
    if (xp.up) setTimeout(() => Snd.play('rank'), 900);
    const btns = MP.host ? [['Nouvelle patrouille', () => MP.startGame(), true], ['Salon', () => this.toLobby()], ['Menu', () => this.toMenu()]] : MP.guest ? [['Salon', () => this.toLobby(), true], ['Quitter', () => this.toMenu()]] : [['Menu', () => this.toMenu(), true]];
    setTimeout(() => Menus.result(true, 'Fin de patrouille', `Brigade de nuit · ${(team.rows || []).length} robots`, '', rows, 'Fin de service. Le PC Radio remercie la brigade de nuit.', btns, xp), 400);
  },
  // page hidden while hosting: the city keeps running for the guests (no drawing)
  hiddenTick(dt) { if (this.mode !== 'play' && this.mode !== 'pause') return; Input.blank(); try { this.update(dt); } catch (e) { console.error(e); } Input.unblank(); },
  onCarShot() { const M = this.mission; if (M) M.carShots = (M.carShots || 0) + 1; },
  pause() { if (this.mode !== 'play') return; this.mode = 'pause'; Input.releaseLock(); if (!MP.on) Snd.silenceLoops(); HUD.show(false); Menus.show('scr-pause', false); },
  resume() { Menus.hideAll(); this.mode = 'play'; HUD.show(true); if (Input.device === 'kbm') Input.requestLock(); Save.write(); },
  // Android app: the back button pauses the game, or goes back one menu
  androidBack() {
    if (this.mode === 'play') { this.pause(); return; }
    if (Menus.cur && Menus.cur !== 'scr-title' && Menus.cur !== 'scr-loading') Menus.back();
  },
  openMap() { if (this.mode !== 'play') return; this.mode = 'pause'; Input.releaseLock(); Snd.silenceLoops(); HUD.show(false); Menus.show('scr-map', false); },
  fade(on) { $('fade').classList.toggle('on', on); },
  /* ---------------- rules / hooks ---------------- */
  addCrime(d) { if (MP.guest) { if (d) MP.send({ t: 'crime', d }); return; } if (!this.showCrime) return; this.crime = clamp(this.crime + d, 0, 100); },
  hitstop(t) { this.stopT = Math.max(this.stopT, t); },
  slowmo(d, k) { if (MP.on) return; this.slowT = d; this.slowK = k; }, // never in multiplayer: the others keep playing in real time
  combo() { this.comboN = this.comboT > 0 ? this.comboN + 1 : 1; this.comboT = 2.2; HUD.combo(this.comboN); if (this.comboN > 0 && this.comboN % 5 === 0) this.award(this.comboN * 6, null); },
  comboTier(n) { return n >= 10 ? 4 : n >= 6 ? 3 : n >= 3 ? 2 : 1; },
  mult() { return [1, 1, 1.5, 2, 3][this.comboTier(this.comboN)]; },
  /* the robot behind an action (ours, or in multiplayer a partner's) and feedback meant for it: shown on this
     screen if the robot is ours, sent to its owner's screen otherwise */
  tell(who, k, ...a) { if (MP.host && who && who.peer) MP.tell(who, k, a); else if (!who || who === this.player) MP.hud(k, a); },
  tellAll(k, ...a) { MP.hud(k, a); if (MP.host && MP.state === 'play') MP.sendTo(0, { t: 'hud', k, a }); },
  statOf(who) { return who && who.peer ? who.peer.stats : MP.host && MP.myStats ? MP.myStats : null; },
  // points, multiplied by the combo (of the robot who earned them), shown where they were earned
  award(pts, pos, label, cls, who) {
    who = who || this.player; const remote = MP.host && who && who.peer;
    const m = pts > 0 ? (remote ? who.mult || 1 : this.mult()) : 1, v = Math.round(pts * m); this.score += v;
    if (remote) { who.peer.pts += v; who.peer.stats.pts += v; MP.sendTo(who.peer.id, { t: 'pts', v }); if (pos) MP.tell(who, 'pop', [pos.x, pos.y + 2.05, pos.z, (label ? label + ' ' : '') + (v > 0 ? '+' + v : v), cls || (v < 0 ? 'bad' : 'score'), m > 1 && v > 0 ? '×' + m : null, v > 0 && cls !== 'feat' ? 1 : 0]); return v; }
    if (MP.host && MP.myStats) MP.myStats.pts += v;
    if (MP.guest) { MP.send({ t: 'pts', v }); MP.myPts = (MP.myPts || 0) + v; }
    if (pos && !(this.def && this.def.training)) { HUD.pop(pos.x, pos.y + 2.05, pos.z, (label ? label + ' ' : '') + (v > 0 ? '+' + v : v), cls || (v < 0 ? 'bad' : 'score'), m > 1 && v > 0 ? '×' + m : null); if (v > 0 && cls !== 'feat') Snd.play('score', pos, 0.45); }
    return v;
  },
  // a takedown without having been hit since the last one: the streak grows (and pays), per robot
  streak(pos, who) {
    who = who || this.player; const o = who === this.player ? this : who;
    o.streakN = (o.streakN || 0) + 1;
    if (o.streakN >= 3) { this.tell(who, 'streak', o.streakN); this.award(o.streakN * 15, pos, 'SÉRIE', 'feat', who); }
  },
  // how many are still fighting around a robot
  threats(who) { const P = who || this.player; let n = 0; for (const a of this.actors) if (a !== P && !a.isRobot && a.alerted && a.alive && !a.down && !a.cuffed && !a.removed && a.state !== 'surrender' && a.team !== 'civ' && a.team !== 'police' && a.ai !== 'flee' && dist3(a.pos, P.pos) < 45) n++; return n; },
  afterTakedown(a, who) {
    who = who || this.player; this.streak(a.pos, who);
    if (who === this.player && (this.fightN || 0) >= 2 && this.threats() === 0) { // the last one: a breath of slow motion (solo)
      this.slowmo(0.9, 0.32); Snd.play('perfect', null, 0.7); this.award(this.fightN * 25, this.player.pos, 'ZONE SÉCURISÉE', 'feat'); this.fightN = 0; Input.rumble(0.4, 0.6, 220);
    }
  },
  flushDamage() {
    const A = this.dmgAcc; if (!A || !A.size) return;
    if (Save.data.options.dmgNums !== false) for (const e of A.values()) { const t = e.t; HUD.pop(t.pos.x, t.pos.y + (t.h || 1.8) + 0.25, t.pos.z, (e.head ? 'TÊTE ' : '') + Math.max(1, Math.round(e.dmg)), e.head ? 'head' : 'dmg'); }
    A.clear();
  },
  onHit(t, src, dmg, o) {
    const P = this.player, bot = !!(src && src.isRobot);
    if (bot && t.team === 'civ') { this.stats.civHurt++; const S = this.statOf(src); if (S) S.civHurt++; this.score -= 100; if (!t._bav) { t._bav = true; this.tell(src, 'toast', 'Bavure', 'Un civil a été blessé', 'bad'); } this.addCrime(2); }
    if (bot && o.kind === 'bullet' && (t.team === 'gang' || t.team === 'cult')) {
      const armed = t.weapon && WEAPONS[t.weapon] && WEAPONS[t.weapon].firearm;
      if (!armed && !t.boss && t.state !== 'attack' && !this.warned[t.id]) { this.warned[t.id] = true; this.score -= 40; if (!this.warned.force) { this.warned.force = true; this.tell(src, 'toast', 'Usage disproportionné', 'Suspect non armé d’une arme à feu', 'bad'); } }
    }
    if (t === P && src && src !== P) { Music.target = 1; if (dmg > 0 && this.streakN) { this.streakN = 0; HUD.streak(0); } if (dmg > 0 && MP.guest) MP.send({ t: 'ouch' }); } // attacked: the fight music, the streak is broken
    else if (src === P && t.team !== 'civ' && t.team !== 'police' && !(Game.def && Game.def.training)) {
      Music.target = Math.max(Music.target, 0.9);
      if (o.kind === 'bullet') this.combo();
      const A = this.dmgAcc || (this.dmgAcc = new Map()); const e = A.get(t.id); if (e) { e.dmg += dmg; e.head = e.head || !!o.head; } else A.set(t.id, { t, dmg, head: !!o.head });
    }
    // training: count the strikes that land on the training robot
    const M = this.mission;
    if (M && M.ev && M.bot && t === M.bot && src === P && P.atk) { const n = P.atk.name; if (n === 'jab' || n === 'cross' || n === 'hook') M.ev.punch++; else if (/kick/i.test(n)) M.ev.kick++; }
  },
  onPlayerBlocked(src) { const M = this.mission; if (M && M.ev) M.ev.block++; },
  onDown(a) { },
  dropWeapon(a) {
    if (a.team === 'civ' || a.isRobot) return;
    if (a.nades > 0 && !a.tags.noDrop) { // grenades he did not get to throw
      const x = a.pos.x + R(-0.7, 0.7), z = a.pos.z + R(-0.7, 0.7); Pickups.add('nades', x, World.groundAt(x, z, 0.2, a.pos.y + 0.5), z, { count: a.nades }); a.nades = 0;
    }
    const w = a.weapon; if (!w || w === 'wrench' || w === 'staff') return;
    const W = WEAPONS[w]; a.setWeapon(null);
    const x = a.pos.x + R(-0.6, 0.6), z = a.pos.z + R(-0.6, 0.6); const y = World.groundAt(x, z, 0.2, a.pos.y + 0.5);
    Pickups.add('weapon', x, y, z, { weapon: w, ammo: W.mag ? Math.round(W.mag * R(0.55, 1)) : 0 }); // what was left in his magazine
  },
  // a beaten suspect sometimes had a repair cell on him: the more battered the robot, the likelier
  dropRepair(a, by) {
    const P = by || this.player; if (!P || a.team === 'civ' || a.boss || (this.def && this.def.training) || a.tags.noDrop) return;
    const hurt = 1 - P.hp / P.maxHp, now = this.simT || 0; if (now - (this.repairAt || -99) < 9) return;
    if (Math.random() > 0.08 + hurt * 0.55) return;
    this.repairAt = now; const x = a.pos.x + R(-0.8, 0.8), z = a.pos.z + R(-0.8, 0.8);
    Pickups.add('health', x, World.groundAt(x, z, 0.2, a.pos.y + 0.5), z, { heal: 35 });
  },
  onKO(a, src) {
    Loot.onFoeDown(a, src);
    const bot = !!(src && src.isRobot);
    this.dropWeapon(a); if (bot) this.dropRepair(a, src);
    if (a.team === 'civ') return;
    if (bot || src === null) { this.stats.kos++; const S = this.statOf(src); if (bot && S) S.kos++; this.award(60, a.pos, 'K.-O.', null, src); this.addCrime(-5); this.tell(src, 'toast', 'Suspect neutralisé', this.showCrime ? '−5 % criminalité' : 'Interpellez-le', ''); if (bot) this.afterTakedown(a, src); }
  },
  onDeath(a, src, o) {
    if (a === this.player || a.isRobot) return;
    Loot.onFoeDown(a, src);
    const bot = !!(src && src.isRobot), carBot = !!(o && o.kind === 'car' && (bot || this.player.car));
    const armedAtDeath = !!(a.weapon && WEAPONS[a.weapon] && WEAPONS[a.weapon].firearm) || a.nades > 0;
    this.dropWeapon(a); if (bot && a.team !== 'civ') this.dropRepair(a, src);
    if (a.team === 'civ') { if (bot || (src && src.team === 'police') || carBot) { this.stats.civKilled++; this.score -= 400; if (!this.def.patrol) setTimeout(() => this.missionFailed('Un civil a été tué. Une enquête interne est ouverte.'), 900); else this.tell(bot ? src : null, 'toast', 'Civil tué', '−400', 'bad'); } return; }
    if (bot || (o && o.kind === 'car')) {
      this.stats.kills++; const S = this.statOf(src); const armed = armedAtDeath; if (!armed && !a.boss) { this.stats.killsUnarmed++; this.award(-100, a.pos, 'FORCE INJUSTIFIÉE', 'bad', src); } else { this.award(20, a.pos, null, null, src); if (o && o.head && bot) this.award(40, a.pos, 'TÊTE', 'head', src); }
      if (bot && S) S.kills++;
      this.addCrime(-3); this.tell(bot ? src : null, 'toast', 'Suspect abattu', armed ? 'Légitime défense' : 'Force létale injustifiée', armed ? '' : 'bad');
      if (bot) this.afterTakedown(a, src);
    }
  },
  onArrest(a, by) {
    if (MP.guest) { if (a.puppet) MP.send({ t: 'cuffed', id: a.net }); Input.rumble(0.3, 0.3, 120); return; } // the host scores it
    by = by || this.player;
    this.stats.arrests++; const S = this.statOf(by); if (S) S.arrests++;
    this.award(a.boss ? 600 : 150, a.pos, a.boss ? 'CHEF INTERPELLÉ' : 'INTERPELLATION', null, by); this.addCrime(a.boss ? -10 : -7); this.afterTakedown(a, by);
    this.tell(by, 'toast', a.boss ? 'Chef interpellé' : 'Interpellation', this.showCrime ? `−${a.boss ? 10 : 7} % criminalité` : '+150', 'gold');
    this.tell(by, 'rumble', 0.3, 0.3, 120);
  },
  onSurrender(a) { this.dropWeapon(a); this.stats.surrenders++; const who = a.lastHitBy && a.lastHitBy.isRobot ? a.lastHitBy : MP.host ? MP.nearestRobot(a.pos.x, a.pos.z) : null; this.tell(who, 'toast', 'Le suspect se rend', 'Interpellez-le', ''); },
  onEscape(a) { if (a.team !== 'civ') { this.addCrime(3); this.tellAll('toast', 'Un suspect s’est enfui', '+3 % criminalité', 'bad'); } },
  onNpcLost(a) { },
  onAlert(a) { Music.target = Math.max(Music.target, 0.7); },
  onParry(t, src) { HUD.toast('Parade !', 'Contre-attaquez', 'gold', true); if (t === this.player) { Destin.gain(t, 10); this.onPlayerBlocked(src); t.riposteT = 2.5; this.award(50, t.pos, 'PARADE', 'feat'); if (MP.guest && src && src.puppet) MP.send({ t: 'parried', id: src.net }); } },
  onCarDisabled(c) { },
  // a car the case depends on (the patrol car, the convoy, a vehicle to search…) blows up: the case is lost
  onCarExploded(c) {
    if (this.mode !== 'play' || !this.def || this.def.patrol || this.def.training) return;
    const M = this.mission; if (!M || M.failing) return;
    if (c === M.chaseCar || (M.rams && M.rams.indexOf(c) >= 0)) return; // a suspect's car: wrecked, it is just stopped for good
    const critical = !!c.tags.mission || ['car', 'pcar', 'van', 'tv', 'nadiaCar', 'ncar'].some(k => M[k] === c);
    if (!critical) return;
    M.failing = true; const why = c.police ? 'La voiture de patrouille a explosé.' : c.T.van ? 'Le fourgon de la mission a explosé.' : 'Le véhicule de la mission a explosé.';
    M.failWhy = why; M.failT = 1.8; HUD.big('Véhicule détruit', why, 'bad', 2.2); // the case is lost a moment later (game time: a pause does not skip it)
  },
  onCarHit(a, b, v) { },
  onRunOver(a, v, by) { if (a.team === 'civ') { this.stats.civHurt++; const S = this.statOf(by); if (S) S.civHurt++; this.score -= 150; this.tell(by, 'toast', 'Piéton renversé', 'Bavure', 'bad'); } },
  onBossPhase(boss, ph) {
    if (this.def && this.def.bossPhase) { this.def.bossPhase(this.mission, boss, ph, this); return; }
    if (!boss.T.herald) return;
    HUD.say('Le Héraut', ph === 1 ? 'Mes frères ! Que la marée l’emporte !' : 'Encore ! Noyez cette machine !');
    const br = World.spots.braziers; for (let k = 0; k < 2; k++) { const b = br[(ph * 2 + k) % br.length]; const e = spawnEnemy(k === 0 && ph === 2 ? 'cultShot' : 'cultist', b[0], b[1] - 1.5, { ai: 'engage', alerted: true, y: 0 }); FX.smoke(e.pos.x, 1, e.pos.z, [0.2, 0.9, 0.7], 12); }
    Snd.play('magic');
  },
  onEnterCar(c) { },
  onExitCar(c) { },
  collectBadge(p) {
    const b = p.badge; if (Save.data.badges.indexOf(b.id) >= 0) return;
    Save.data.badges.push(b.id); Save.data.stats[b.stat] = Math.min(5, (Save.data.stats[b.stat] || 0) + 1); Save.write();
    const names = { force: 'Force', endurance: 'Endurance', constitution: 'Constitution', adresse: 'Adresse' };
    HUD.toast('Insigne trouvé', `${names[b.stat]} +1 · ${Save.data.badges.length}/${World.badges.length}`, 'gold'); Snd.play('badge'); this.award(200, p.pos || p, 'INSIGNE'); this.stats.badges++;
    const P = this.player; const S = Save.data.stats; const oldMax = P.maxHp; P.maxHp = playerMaxHp(S); P.hp += P.maxHp - oldMax; P.maxStamina = 100 * (1 + S.endurance * 0.15); P.dmgOut = 1 + S.force * 0.1 + rankK() * 0.015; P.skill = S.adresse;
  },
  /* ---------------- update ---------------- */
  update(raw) {
    let dt = raw; this.simT = (this.simT || 0) + raw; this.rawDt = raw;
    if (this.stopT > 0) { this.stopT -= raw; dt = raw * 0.06; } else if (this.slowT > 0) { this.slowT -= raw; dt = raw * lerp(1, this.slowK, clamp(this.slowT / 0.25, 0, 1)); }
    // multiplayer: the city keeps real time (the others play in it); only our own robot feels a hit-stop
    const dtP = dt; if (MP.on && MP.state === 'play') dt = raw;
    this.dt = dt;
    const P = this.player; const I = Input;
    if (this.mode === 'play') { if (I.pressed.pause) { this.pause(); return; } if (I.pressed.map) { this.openMap(); return; } }
    if (this.comboT > 0) { this.comboT -= raw; if (this.comboT <= 0) { this.comboN = 0; HUD.combo(0); } }
    if (MP.guest && MP.state === 'play') { this.updateGuest(raw, dtP); return; }
    const multi = MP.host && MP.state === 'play';
    // update actors (those far from every robot sleep)
    for (const a of this.actors) {
      if (a.removed) continue;
      const d = P ? (multi ? MP.distToRobots(a.pos.x, a.pos.z) : dist2D(a.pos.x, a.pos.z, P.pos.x, P.pos.z)) : 0;
      if (a !== P && d > 150 && !a.tags.keep && !a.inCar && !a.puppet) continue;
      a.update(a === P ? dtP : dt * Destin.worldK()); // the Reckoning slows the world, not the robot
      // safety net: a non-finite position is rolled back to the last good one
      if (isFinite(a.pos.x) && isFinite(a.pos.y) && isFinite(a.pos.z)) { const g = a._good || (a._good = new V3()); g.copy(a.pos); }
      else if (a._good) { a.pos.copy(a._good); a.vel.set(0, 0, 0); }
      a.far = d > 70;
    }
    this.separate();
    Cars.update(dt); Nades.update(dt);
    // drivers follow cars
    for (const c of Cars.list) if (c.driver && c.driver !== P) { const a = c.driver; a.pos.set(c.pos.x + c.fz * 0.4 - c.fx * 0.25, c.pos.y, c.pos.z - c.fx * 0.4 - c.fz * 0.25); a.yaw = c.yaw; }
    if (P.car) { Cars.seatPos(P.car, P.ride ? P.seat : -1, P.pos); P.yaw = P.car.yaw; }
    Pickups.update(dt); Loot.update(dt);
    if (MP.on && MP.state === 'play' && this.mode === 'play' && Input.pressed.ping) MP.ping();
    if (!this.live()) return;
    if (this.mission && this.mission.failing && (this.mission.failT -= dt) <= 0) { this.missionFailed(this.mission.failWhy); return; }
    if (this.def.patrol) Patrol.update(dt); else this.mission.update(dt);
    if (!this.live()) return;
    if (this.timer !== null) this.timer = Math.max(0, this.timer - dt);
    this.populate(dt);
    FX.update(dt);
    // safe position tracking (on land, grounded)
    if (P.grounded && P.state === 'move' && World.onLand(P.pos.x, P.pos.z) && P.pos.y < 1) this.lastSafe = { x: P.pos.x, z: P.pos.z };
    this.musicDanger(P);
    if ((this.fightT = (this.fightT || 0) - dt) <= 0) { this.fightT = 0.5; const n = this.threats(); if (n > (this.fightN || 0)) this.fightN = n; if (n === 0) { this.calmT = (this.calmT || 0) + 0.5; if (this.calmT > 5) this.fightN = 0; } else this.calmT = 0; }
    this.flushDamage();
    this.cleanup(P);
    if (multi) MP.hostTick(this.rawDt);
  },
  // music: how tense it is around the robot (0 calm, 1 enemies on alert around, 2 a fight, 3 a boss)
  musicDanger(P) {
    let danger = 0;
    for (const a of this.actors) {
      if (a === P || a.isRobot || !a.alerted || !a.alive || a.down || a.cuffed || a.removed || a.state === 'surrender' || a.team === 'civ' || a.team === 'police') continue;
      const d = dist3(a.pos, P.pos); if (d > 60) continue;
      danger = Math.max(danger, 1);
      if (d < 28 && (a.seesPlayer || d < 12 || a.ai === 'engage')) danger = 2;
    }
    if (this.boss && this.boss.alive && !this.boss.cuffed && !this.boss.down && this.boss.alerted && dist3(this.boss.pos, P.pos) < 45) danger = 3;
    if (this.mission && this.mission.vanBar) danger = Math.max(danger, 2); // a chase
    Music.danger = P.alive ? danger : 0;
  },
  cleanup(P) {
    if (this.actors.length > 60) this.actors = this.actors.filter(a => !a.removed || a === P);
    else for (let i = this.actors.length - 1; i >= 0; i--) if (this.actors[i].removed && this.actors[i] !== P) this.actors.splice(i, 1);
  },
  // multiplayer guest: our robot is simulated here, the rest of the city is the host's (puppets)
  updateGuest(raw, dtP) {
    const P = this.player, dt = raw;
    for (const a of this.actors) {
      if (a.removed) continue;
      a.update(a === P ? dtP : dt * Destin.worldK()); // the Reckoning slows the world, not the robot
      if (a !== P) continue;
      if (isFinite(a.pos.x) && isFinite(a.pos.y) && isFinite(a.pos.z)) { const g = a._good || (a._good = new V3()); g.copy(a.pos); }
      else if (a._good) { a.pos.copy(a._good); a.vel.set(0, 0, 0); }
    }
    this.separate();
    Cars.update(dt); Nades.update(dt);
    if (P.car) { Cars.seatPos(P.car, P.ride ? P.seat : -1, P.pos); P.yaw = P.car.yaw; }
    Pickups.update(dt);
    if (this.mode === 'play' && Input.pressed.ping) MP.ping();
    if (this.mission) this.mission.t += dt;
    FX.update(dt);
    if (P.grounded && P.state === 'move' && World.onLand(P.pos.x, P.pos.z) && P.pos.y < 1) this.lastSafe = { x: P.pos.x, z: P.pos.z };
    this.musicDanger(P);
    this.flushDamage();
    this.cleanup(P);
    MP.guestTick(raw);
  },
  separate() {
    const L = this.actors; const n = L.length;
    for (let i = 0; i < n; i++) {
      const a = L[i]; if (a.removed || a.inCar || (a.noPhys && !a.puppet) || a.down || a.hidden) continue;
      for (let j = i + 1; j < n; j++) {
        const b = L[j]; if (b.removed || b.inCar || (b.noPhys && !b.puppet) || b.down || b.hidden || (a.puppet && b.puppet)) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; if (Math.abs(dx) > 1.2 || Math.abs(dz) > 1.2 || Math.abs(a.pos.y - b.pos.y) > 1.5) continue;
        const d = Math.hypot(dx, dz), m = a.r + b.r; if (!(d < m) || d < 1e-5) continue;
        const push = (m - d) / 2; const nx = dx / d, nz = dz / d;
        const wa = a.puppet ? 0 : a === this.player ? 0.3 : 1, wb = b.puppet ? 0 : b === this.player ? 0.3 : 1; // a robot or a passer-by moved by the network does not give way here
        a.pos.x -= nx * push * wa; a.pos.z -= nz * push * wa; b.pos.x += nx * push * wb; b.pos.z += nz * push * wb;
      }
    }
  },
  /* ---------------- render ---------------- */
  renderScene(dt) {
    Render.addParticles.reset(); Render.particles.reset(); Render.shadows.reset(); Render.beams.reset(); Glare.reset();
    CamCtl.update(dt); Cam.update();
    Snd.listener.x = Cam.pos.x; Snd.listener.y = Cam.pos.y; Snd.listener.z = Cam.pos.z; Snd.listener.yaw = CamCtl.yaw;
    const P = this.player;
    const fx = P ? P.pos.x : Cam.target.x, fy = P ? P.pos.y + 1.5 : Cam.target.y, fz = P ? P.pos.z : Cam.target.z;
    if (P && P.alive && !P.inCar && this.mode === 'play') { const c = ROBOT_ACCENTS[P.slot || 0].light; Lights.add(P.pos.x, P.pos.y + 1.25, P.pos.z, c[0], c[1], c[2], 5.5, 0.05, 'hero'); } // the glow of his own strips on the street around him
    Lights.update(dt, fx, fy, fz);
    CharRender.begin();
    for (const a of this.actors) {
      if (a.removed || a.hidden || a.inCar) continue;
      const d = dist3(a.pos, Cam.pos); if (d > 115) continue;
      if (!Cam.sphereVisible(a.pos.x, a.pos.y + 1, a.pos.z, 1.6)) continue;
      a.tint = 1 + a.hitFlash * 1.5; a.glow = 1;
      CharRender.draw(a);
      if (!a.inCar && d < 60) Render.shadows.push(a.pos.x, a.groundY + 0.03, a.pos.z, a.down ? 1.7 : 1.05, 0, 0, 0, clamp(0.55 - (a.pos.y - a.groundY) * 0.15, 0.1, 0.55), 0, 1, 0, true);
    }
    Cars.render(); Signals.render(); Pickups.render(); Nades.render(); FX.render();
    if (this.def && this.def.render && this.mode === 'play') this.def.render(this.mission, this);
    this.renderBeacon(); this.renderLighthouse();
    Render.frame();
  },
  renderBeacon() {
    const M = this.mission; if (!M || !M.marker || this.mode !== 'play') return;
    const p = M.markerPos(); const d = dist3(p, Cam.pos); if (d < 6 || d > 400) return;
    const P = this.player; if (P && dist2D(P.pos.x, P.pos.z, p.x, p.z) < 12 && Math.abs(P.pos.y - p.y) < 3) return;
    const w = clamp(d * 0.012, 0.35, 2.2); const a = 0.25 + Math.sin(Env.time * 3) * 0.08;
    Render.beams.push(p.x, p.y, p.z, p.x, p.y + 55, p.z, w, 1, 0.65, 0.2, a, Cam.pos);
    Render.addParticles.push(p.x, p.y + 0.06, p.z, 2.2 + Math.sin(Env.time * 4) * 0.2, 1, 0.65, 0.2, 0.7, 0, 1, 1, true);
  },
  renderLighthouse() {
    const L = World.spots.lighthouse; if (!L) return; const c = this.beamC || (this.cultBeam ? [0.3, 1.6, 1.1] : [1.6, 1.4, 1.0]);
    const ang = Env.time * 0.6; const lx = L.lamp.x, ly = L.lamp.y, lz = L.lamp.z;
    for (const off of [0, Math.PI]) { const a = ang + off; Render.beams.push(lx, ly, lz, lx + Math.sin(a) * 160, ly - 6, lz + Math.cos(a) * 160, 2.6, c[0], c[1], c[2], 0.22, Cam.pos); }
    Render.addParticles.push(lx, ly, lz, 3.2, c[0] * 1.4, c[1] * 1.4, c[2] * 1.4, 1, 0, 1, 5, false);
    Lights.add(lx, ly, lz, c[0] * 3, c[1] * 3, c[2] * 3, 30, 0.05, 'lh');
  },
  /* ---------------- main loop ---------------- */
  last: 0,
  frame(now) {
    if (this.hold) { requestAnimationFrame(t => this.frame(t)); return; }
    const raw = Math.min(0.05, Math.max(0.0005, (now - this.last) / 1000 || 0.016)); this.last = now;
    try {
      Input.update(raw);
      if (Input.pad) Menus.updateDevices && (this._devT = (this._devT || 0) + raw) > 2 && (this._devT = 0, Menus.updateDevices());
      if (this.mode === 'play') { this.update(raw); Env.update(this.dt); this.renderScene(this.dt); HUD.update(raw); this.dynRes(raw); }
      else if (this.mode === 'pause' && MP.on && MP.state === 'play') { Menus.update(raw); Input.blank(); this.update(raw); Input.unblank(); Env.update(this.dt); this.renderScene(this.dt); } // multiplayer: the city goes on behind the menu
      else if (this.mode === 'menu') { Menus.update(raw); Env.update(raw); this.menuUpdate(raw); this.renderScene(raw); }
      else if (this.mode === 'pause' || this.mode === 'result') { Menus.update(raw); if (this.mode === 'result') { Env.update(raw * 0.3); this.renderScene(raw * 0.3); } }
      Music.update(raw); Amb.update(raw, this.mode === 'pause'); // music and ambience keep going (muffled in the pause menu)
      // sculpt the people in the background (more time when nothing else runs)
      Folk.update(this.mode === 'play' ? 2.5 : this.mode === 'menu' ? 5 : 8);
    } catch (e) { console.error(e); this.errors = (this.errors || 0) + 1; if (this.errors < 3) HUD.toast('Erreur interne', String(e.message || e).slice(0, 60), 'bad'); }
    requestAnimationFrame(t => this.frame(t));
  },
  menuUpdate(dt) {
    for (const a of this.actors) if (!a.removed && a !== this.player) a.update(dt);
    Cars.update(dt); FX.update(dt);
  },
  dynRes(dt) {
    if (Save.data.options.quality !== 'auto') return;
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 2.5) {
      const fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0;
      if (fps < 38 && this.dynScale > 0.6) { this.dynScale -= 0.1; if (this.dynScale <= 0.7 && this.autoQ !== 'low') { this.autoQ = this.autoQ === 'medium' || !this.autoQ && ('ontouchstart' in window) ? 'low' : 'medium'; this.dynScale = 1; } this.applyQuality(); }
      else if (fps > 57 && this.dynScale < 1) { this.dynScale = Math.min(1, this.dynScale + 0.05); this.applyQuality(); }
    }
  },
  menuScene() {
    this.def = { civs: 18, traffic: 10 }; this.player = new Player(0, -88.3, 0); this.player.hidden = true; this.player.tags.keep = true;
    this.populate(0, true);
  },
  async boot() {
    const bar = $('loadbar'), txt = $('loadtxt'); const step = (p, t) => { bar.style.width = p + '%'; txt.textContent = t; return new Promise(r => setTimeout(r, 30)); };
    Save.load();
    if (!Gfx.init($('gl'))) { $('scr-loading').hidden = true; $('scr-nogl').hidden = false; return; }
    Input.init();
    await step(10, 'Chargement des polices…'); await Tex.fontsReady();
    Tex.lowRes = /Android|iPhone|iPad/i.test(navigator.userAgent) && (navigator.deviceMemory || 4) <= 3;
    await step(25, 'Peinture des façades…'); { const t0 = performance.now(); Tex.build(); Game.texMs = Math.round(performance.now() - t0); }
    await step(55, 'Construction de Port-Saline…'); { const t0 = performance.now(); City.build(); Game.buildMs = Math.round(performance.now() - t0); }
    await step(80, 'Réglage des néons…'); Lightmap.build(); Render.init(); CharRender.init(); Cars.init(); Signals.init(); HUD.init(); Menus.init();
    await step(90, 'Les habitants s’habillent…'); { const t0 = performance.now(); Folk.warm(3, 9000); Folk.update(1200); Folk.warm(2, 20000); Game.folkMs = Math.round(performance.now() - t0); }
    this.applyQuality();
    window.addEventListener('resize', () => { this.applyQuality(); Menus.fitBrand(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Menus.fitBrand()).catch(() => { });
    MP.metronome();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause();
      if (Snd.ctx) { if (document.hidden) Snd.ctx.suspend().catch(() => { }); else Snd.resume(); } // no sound from a hidden page (app in the background)
    });
    if (/android_asset/.test(location.href)) { const b = $('mi-fs'); if (b) b.remove(); } // Android app: already full screen
    Bus.on('lock', locked => { if (!locked && this.mode === 'play' && Input.device === 'kbm' && !this._noPauseOnUnlock) this.pause(); });
    $('gl').addEventListener('click', () => { Snd.init(); Snd.resume(); if (this.mode === 'play' && Input.device === 'kbm') Input.requestLock(); });
    const unlockAudio = () => { Snd.init(); Snd.resume(); }; window.addEventListener('pointerdown', unlockAudio); window.addEventListener('keydown', unlockAudio);
    await step(100, 'Systèmes prêts.');
    this.mode = 'menu'; CamCtl.mode = 'menu'; this.menuScene();
    if (window.__TEST_HOLD) this.hold = true;
    $('scr-loading').hidden = true; Menus.show('scr-title', false);
    if (MP.servedByHost() && location.search.indexOf('rejoindre') >= 0) Menus.mpAuto(); // opened from the host's QR code
    this.last = performance.now(); requestAnimationFrame(t => this.frame(t));
  }
};
window.__OF = { Destin, COMBOS, TREES, DESTINIES, Loot, RARITY, Pickups, ATK, spawnEnemy, MP, QR, COOP, NetActor, Patrol, Lightmap, Music, Amb, Folk, People, Sculpt, Arms, Nades, WEAPONS, Game, World, Input, Cars, Save, Gfx, Render, Cam, CamCtl, HUD, Menus, MISSIONS, PATROL, Pickups, FX, Combat, CharRender, BI, Enemy, Civilian, Snd, TRAINING, Tex, City, Districts, Net, Cull, Lights, Env, Glare, Car, Signals, Kit, CASES, CHAPTERS, Campaign,
  test: {
    // run the simulation without rendering (for automated checks)
    step(n, dt, keys, pad) {
      dt = dt || 1 / 60; Input.keys = {}; for (const k of keys || []) Input.keys[k] = 1;
      for (let i = 0; i < n; i++) { if (pad) pad(i); Input.update(dt); if (Game.mode === 'play') { Game.update(dt); CamCtl.update(Game.dt); Cam.update(); } }
      Input.keys = {};
    },
    press(k) { Input.keys[k] = 1; },
    render() { Game.renderScene(1 / 60); if (Game.mode === 'play') HUD.update(1 / 60); },
    state() { const P = Game.player; return { mode: Game.mode, st: P && P.state, pos: P && [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)], hp: P && Math.round(P.hp), stage: Game.mission && Game.mission.stage, obj: Game.mission && Game.mission.objective }; }
  } };
Game.boot();

