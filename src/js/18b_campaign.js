/* =====================================================================
   CAMPAIGN — five chapters, thirty cases.
   Chapter I (Première nuit) keeps the four original cases and adds two;
   chapters II to V follow the trail from the Tide cult to the men who
   paid it, and to what really happened to Saline-16.
   ===================================================================== */
const MAR = 'Maryse · PC Radio', NAD = 'Nadia Ferrand', FRE = 'Fredo « la Fouine »', ANS = 'Anselme Roux', DEL = 'Commissaire Delorme', VAS = 'Victor Vasseur', ROOK = 'Rook', S16 = 'Saline-16 · journal', PET = 'Mme Pétronille';

// each voice on the radio has its colour
HUD.speakerCol = { [MAR]: '#5fd0c4', [NAD]: '#ff6b7d', [FRE]: '#e8b64a', [ANS]: '#d9c7a3', [DEL]: '#f0c850', [VAS]: '#f4f1e8', [ROOK]: '#ff5a3a', [S16]: '#ff9a3c', [PET]: '#e58ad8', [SOL]: '#8fe3ff' };

/* ---------------- kit: spawning and small helpers ---------------- */
const Kit = {
  P() { return Game.player; },
  at(x, z) { return World.safeSpot(x, z, 0.45); },
  // enemy at street level near (x, z) (or exactly there with o.y), mission foes stay down longer when knocked out
  foe(type, x, z, o = {}) {
    const s = o.y !== undefined ? { x, y: o.y, z } : World.safeSpot(x, z, 0.45);
    const e = spawnEnemy(type, s.x, s.z, Object.assign({ ai: 'patrol', homeR: 3, yaw: R(0, TAU) }, o, { y: s.y }));
    if (o.label) e.tags.label = o.label;
    if (!e.boss && e.koTime < 60) e.koTime = 60;
    if (o.hunt) e.hunt = o.hunt;
    return e;
  },
  squad(types, cx, cz, r, o = {}) { const n = types.length, a0 = R(0, TAU); return types.map((t, i) => { const a = a0 + i / n * TAU + R(-0.3, 0.3), rr = r * (0.45 + 0.55 * Math.random()); return this.foe(t, cx + Math.sin(a) * rr, cz + Math.cos(a) * rr, o); }); },
  civ(app, x, z, o = {}) {
    const s = o.y !== undefined ? { x, y: o.y, z } : World.safeSpot(x, z, 0.4);
    const c = spawnCiv(s.x, s.z, { app, mode: o.mode || 'script', yaw: o.yaw || 0, hp: o.hp || 60, tags: { keep: true, noArrest: true, label: o.label } });
    if (o.y !== undefined) c.pos.y = o.y; if (o.victim) { c.mode = 'victim'; c.victim = true; }
    return c;
  },
  car(type, x, z, yaw, o = {}) { const c = Cars.add(new Car(type, x, z, yaw, o)); c.tags.keep = true; return c; },
  // the driver of a stopped car gets out (on the pavement side, on safe ground)
  eject(c, ai = 'engage') {
    const d = c.driver; if (!d || d === Game.player) return null;
    const s = World.safeSpot(c.pos.x - c.fz * (c.wid / 2 + 1), c.pos.z + c.fx * (c.wid / 2 + 1), 0.4);
    d.inCar = null; d.setState('move'); d.pos.set(s.x, s.y, s.z); d.vel.set(0, 0, 0); d.ai = ai; d.alerted = true; c.driver = null; return d;
  },
  // put the robot somewhere else (a lift, a cut): short fade, camera reset
  teleport(x, y, z, yaw) {
    const P = Game.player; if (P.car) Cars.exit(P.car, P);
    Game.fade(true); P.setState('move'); P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.grounded = true; P.groundY = y; P.yaw = yaw || 0; CamCtl.reset(P.yaw);
    setTimeout(() => Game.fade(false), 450);
  },
  // rooftop of the Vasseur tower: invisible rails around the edge
  toRoof(quiet) { const S = World.spots.skyscraper; this.fence('sky', S.x - 12, S.z - 12, S.x + 12, S.z + 12, S.y, S.y + 3); this.teleport(S.x, S.y, S.z + 7, Math.PI); if (!quiet) HUD.big('Toit de la tour Vasseur', '158 mètres au-dessus de la tempête', 'good', 2.4); },
  // evacuees walk off toward the shuttles and leave the scene once out of the robot's way
  evac(M, civs, to) { M.evacs = M.evacs || []; for (const c of civs) { if (!c.alive) continue; c.mode = 'goto'; c.victim = false; if (c.state === 'cower' || c.state === 'victim') c.setState('move'); const a = angleTo(c.pos.x, c.pos.z, to.x, to.z); c.dest = World.safeSpot(c.pos.x + Math.sin(a) * 22, c.pos.z + Math.cos(a) * 22, 0.4); c.destSpeed = 3.6; M.evacs.push({ c, t: 0 }); } },
  evacUpdate(M, dt) { for (const e of M.evacs || []) { e.t += dt; if (!e.c.removed && e.t > 9 && dist3(e.c.pos, Game.player.pos) > 16) e.c.removed = true; } },
  say(lines) { for (const l of lines) HUD.say(l[0], l[1], l[2]); },
  // out of the fight: dead, arrested, knocked out, or hands up
  isDown(a) { return !a || neutral(a) || a.state === 'ko' || a.state === 'surrender' || a.state === 'beingCuffed'; },
  nearest(list) { let b = null, bd = 1e9; const P = Game.player; for (const a of list || []) { if (this.isDown(a)) continue; const d = dist3(a.pos, P.pos); if (d < bd) { bd = d; b = a; } } return b; },
  // nearest crossing node of the road graph
  node(x, z) { return Cars.nearestNode(x, z); },
  lane(a, b, t) { const N = Cars.graph.nodes; return Cars.laneP(N[a], N[b], t); },
  // a car of the road graph placed on its lane between two crossings, heading from a to b
  laneCar(type, a, b, t, o) { const p = this.lane(a, b, t); const c = this.car(type, p.x, p.z, Math.atan2(p.dx, p.dz), o); c.from = a; c.to = b; return c; },
  // a neighbour of node a (the one farthest from a point, to run away)
  away(a, x, z) { const N = Cars.graph.nodes; let best = N[a].nb[0], bd = -1; for (const k of N[a].nb) { const d = dist2D(N[k].x, N[k].z, x, z); if (d > bd) { bd = d; best = k; } } return best; },
  toward(a, x, z) { const N = Cars.graph.nodes; let best = N[a].nb[0], bd = 1e9; for (const k of N[a].nb) { const d = dist2D(N[k].x, N[k].z, x, z); if (d < bd) { bd = d; best = k; } } return best; },
  // bring the robot close to an interactable in the scripts of the smoke test
  box(name) { return Districts.list.find(d => d.name === name); },
  // simulated gunfire on a vehicle the robot must protect (tracers from the shooter, sparks, damage)
  fireAt(from, car, dmg) {
    const mx = from.pos.x, my = from.pos.y + 1.35, mz = from.pos.z; const tx = car.pos.x + R(-0.9, 0.9), ty = car.pos.y + R(0.6, 1.5), tz = car.pos.z + R(-0.9, 0.9);
    FX.tracer(mx, my, mz, tx, ty, tz, [1, 0.5, 0.35]); FX.muzzle(mx, my, mz, angleTo(mx, mz, tx, tz)); FX.spark(tx, ty, tz, 0.6, 5, [1, 0.8, 0.5]);
    Snd.play(from.weapon === 'shotgun' ? 'shotgun' : 'pistol', from.pos, 0.6); car.hp = Math.max(0, car.hp - dmg); from.yaw = angleTo(mx, mz, tx, tz);
  },
  // lethal fall zones (rooftops in the sky): invisible walls switched on for one case only
  walls: {},
  fence(key, x0, z0, x1, z1, y0, y1) {
    let W = this.walls[key];
    if (!W) { const t = 0.5, o = { noray: true, nowalk: true }; W = this.walls[key] = [World.addBox(x0 - t, y0, z0 - t, x1 + t, y1, z0, 'bound', o), World.addBox(x0 - t, y0, z1, x1 + t, y1, z1 + t, 'bound', o), World.addBox(x0 - t, y0, z0, x0, y1, z1, 'bound', o), World.addBox(x1, y0, z0, x1 + t, y1, z1, 'bound', o)]; }
    for (const b of W) b.off = false; return W;
  },
  unfence() { for (const k in this.walls) for (const b of this.walls[k]) b.off = true; }
};

/* ---------------- stage templates ---------------- */
// o: cp (checkpoint), cpPos, say (radio lines at start), time (countdown), fail (message when time runs out), start / update hooks
function stGo(text, tag, where, r = 8, o = {}) {
  return { kind: 'go', where, r, o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) { M.obj(text, where, tag); if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G); },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      const p = typeof where === 'function' ? where() : where, P = G.player; if (!p) return false;
      if (o.onFoot && P.state === 'car') return false; if (o.inCar && P.state !== 'car') return false;
      const ok = dist2D(P.pos.x, P.pos.z, p.x, p.z) < r && (p.y === undefined || Math.abs(P.pos.y - p.y) < (o.dy || 3.5));
      if (ok && o.time) G.timer = null; return ok;
    }
  };
}
// put a group out of the fight (knock-out, surrender, arrest)
function stClear(text, tag, spawn, o = {}) {
  return { kind: 'clear', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      const L = M.group = spawn(M, G) || [];
      for (const a of L) { a.tags.target = true; if (o.alert !== false) { a.alerted = true; if (a.ai !== 'guard' || o.alert === true) a.ai = 'engage'; } }
      M.obj(text, () => (Kit.nearest(M.group) || G.player).pos, tag); if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const L = M.group, n = L.filter(a => Kit.isDown(a)).length; M.objective = `${text} <small>${n}/${L.length}</small>`;
      if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      if (n >= L.length) { if (o.time) G.timer = null; return true; } return false;
    }
  };
}
// arrest one person (dead or escaped can fail the case)
function stArrest(text, tag, who, o = {}) {
  return { kind: 'arrest', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) { const t = M.tgt = who(M, G); t.tags.target = true; if (o.label) t.tags.label = o.label; if (o.boss) Game.boss = t; M.obj(text, () => M.tgt.pos, tag); if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G); },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const t = M.tgt; if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      if (t.cuffed) { if (o.time) G.timer = null; if (o.boss) Game.boss = null; if (o.onDone) o.onDone(M, G); return true; }
      if (t.removed && !t.alive) return o.lost || 'Le suspect s’est enfui.';
      if (!t.alive) { if (o.mustLive) return o.dead || 'Le suspect est mort : la piste est perdue.'; M.bossKilled = M.bossKilled || !!o.boss; if (o.boss) Game.boss = null; return true; }
      return false;
    }
  };
}
// pick up items (glowing, with a light beam)
function stCollect(text, tag, items, o = {}) {
  return { kind: 'collect', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      M.got = 0; const list = items(M, G);
      M.picks = list.map(it => Pickups.add('item', it.x, it.y, it.z, { geo: it.geo || 'intel', col: it.col || [0.85, 0.85, 0.8], e: it.e || 0.3, glow: it.glow || [0.4, 0.9, 1], scale: it.scale || 1.5, beam: true,
        onCollect: () => { M.got++; HUD.toast(it.label || 'Pièce récupérée', it.sub || '', 'gold', true); if (it.onCollect) it.onCollect(M, G); } }));
      M.obj(text, () => { const r = M.picks.filter(p => p.alive); let b = null, bd = 1e9; for (const p of r) { const d = dist3(p.pos, G.player.pos); if (d < bd) { bd = d; b = p; } } return b ? b.pos : G.player.pos; }, tag);
      if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      if (M.picks.length > 1) M.objective = `${text} <small>${M.got}/${M.picks.length}</small>`;
      if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      if (M.got >= M.picks.length) { if (o.time) G.timer = null; return true; } return false;
    }
  };
}
// use things: search, defuse, free a hostage (hold: seconds the action must be held in place; guard: those must be down first)
function stUse(text, tag, points, o = {}) {
  return { kind: 'use', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      M.uses = points(M, G).map(pt => {
        const it = { pos: new V3(pt.x, pt.y !== undefined ? pt.y : World.groundAt(pt.x, pt.z, 0.3, 4), pt.z), text: pt.label, r: pt.r || 2.2, active: true, hold: pt.hold || 0, t: 0, done: false, pt,
          use: () => { if (it.pt.guards && it.pt.guards.some(a => !Kit.isDown(a))) { HUD.hint('Neutralisez d’abord les gardes'); return; } if (it.hold) it.busy = true; else finish(it); } };
        G.interactables.push(it); return it;
      });
      const finish = it => { it.active = false; it.done = true; it.busy = false; Snd.play('pickup', it.pos, 0.9); if (it.pt.toast) HUD.toast(it.pt.toast, it.pt.sub || '', 'gold', true); if (it.pt.onDone) it.pt.onDone(M, G, it); };
      M._finish = finish;
      M.obj(text, () => { let b = null, bd = 1e9; for (const u of M.uses) { if (u.done || (o.ordered && M.uses.find(v => !v.done) !== u)) continue; const d = dist3(u.pos, G.player.pos); if (d < bd) { bd = d; b = u; } } return b ? b.pos : G.player.pos; }, tag);
      if (o.ordered) for (const u of M.uses) u.active = false;
      if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const P = G.player;
      if (o.ordered) { const nx = M.uses.find(u => !u.done); if (nx && !nx.active && !nx.busy) nx.active = true; }
      for (const u of M.uses) if (u.busy) {
        // progress while the robot stands by; a blow only pauses it, walking away cancels it
        const d = dist3(P.pos, u.pos), ready = P.state === 'move' && P.speedNow < 2.2;
        if (d < u.r + 0.9 && ready) { u.t += dt; P.prompt = { a: 'action', t: u.pt.busy || 'En cours…', p: clamp(u.t / u.hold, 0, 1) }; if (u.t >= u.hold) M._finish(u); }
        else if (d > u.r + 2.2 || P.state === 'car') { u.busy = false; u.t = 0; }
      }
      const n = M.uses.filter(u => u.done).length; if (M.uses.length > 1) M.objective = `${text} <small>${n}/${M.uses.length}</small>`;
      if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      if (n >= M.uses.length) { if (o.time) G.timer = null; return true; } return false;
    }
  };
}
// hold a place against waves (waves: [time, [types], {from: point, hunt}] ); protect: key of someone who must survive
function stDefend(text, tag, where, o = {}) {
  return { kind: 'defend', where, o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      M.dw = { t: 0, waves: o.waves.slice(), foes: [] }; G.timer = o.time; M.obj(text, where, tag); if (o.say) Kit.say(o.say); o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const D = M.dw, p = typeof where === 'function' ? where() : where; D.t += dt;
      while (D.waves.length && D.waves[0][0] <= D.t) {
        const [, types, w = {}] = D.waves.shift(); const a = w.ang !== undefined ? w.ang : R(0, TAU), d = w.dist || 30;
        const cx = w.from ? w.from.x : p.x + Math.sin(a) * d, cz = w.from ? w.from.z : p.z + Math.cos(a) * d;
        for (const e of Kit.squad(types, cx, cz, 4, { ai: 'engage', alerted: true, hpMul: o.hpMul, hunt: o.protect ? M[o.protect] : null })) { e.tags.target = true; if (o.protect && w.hunt) e.huntAll = true; D.foes.push(e); }
        if (w.say) Kit.say(w.say);
      }
      if (o.protect) { const c = M[o.protect]; if (c && !c.alive) return o.dead || 'La personne que vous protégiez est morte.'; }
      if (o.leash && dist2D(G.player.pos.x, G.player.pos.z, p.x, p.z) > o.leash) { M.leashT = (M.leashT || 0) + dt; if (M.leashT > 8) return o.leashMsg || 'Vous avez abandonné votre position.'; } else M.leashT = 0;
      const left = D.foes.filter(a => !Kit.isDown(a)).length; M.objective = `${text}${left ? ` <small>${left} assaillant${left > 1 ? 's' : ''}</small>` : ''}`;
      if (G.timer <= 0) { if (o.clearAtEnd && left) { M.objective = `Neutralisez les derniers assaillants <small>${left}</small>`; return false; } G.timer = null; return true; }
      return false;
    }
  };
}
// someone follows the robot to a place (gets in its car too)
function stEscort(text, tag, key, dest, o = {}) {
  return { kind: 'escort', key, dest, o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) { const c = M[key]; c.mode = 'follow'; c.tags.escort = true; c.victim = false; if (c.state === 'victim' || c.state === 'cower') c.setState('move'); M.obj(text, dest, tag); if (o.say) Kit.say(o.say); if (o.time) G.timer = o.time; o.start && o.start(M, G); },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const c = M[key], p = typeof dest === 'function' ? dest() : dest; if (!c.alive) return o.dead || `${c.tags.label || 'La personne escortée'} n’a pas survécu.`;
      if (o.time && G.timer <= 0) return o.fail || 'Trop tard.';
      const far = !c.inCar && dist2D(c.pos.x, c.pos.z, G.player.pos.x, G.player.pos.z) > 30;
      M.objective = far ? `${text} <small>${c.tags.label || 'Escorte'} est resté${o.fem ? 'e' : ''} en arrière</small>` : text;
      const cp = c.inCar ? c.inCar.pos : c.pos;
      if (dist2D(cp.x, cp.z, p.x, p.z) < (o.r || 6) && (!c.inCar || !o.onFoot)) { if (o.time) G.timer = null; if (!o.keepFollow) { if (c.inCar) { c.mode = 'follow'; } else { c.mode = 'script'; c.faceYaw = c.yaw; } } return true; }
      return false;
    }
  };
}
// a vehicle to immobilise, then (optionally) its driver to catch on foot
function stChase(text, tag, o) {
  return { kind: 'chase', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      const c = M.chaseCar = o.spawn(M, G); c.tags.target = true; c.hp = c.maxHp = o.hp || 150; M.bar = { name: o.name || 'Véhicule suspect', k: () => c.hp / c.maxHp };
      M.obj(text, () => c.pos, tag); if (o.say) Kit.say(o.say); G.timer = o.time || 180; o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const c = M.chaseCar;
      if (c.dead || c.hp <= 0) { M.bar = null; G.timer = null; c.tags.target = false; const d = Kit.eject(c, 'flee'); if (d) { d.tags.target = true; d.tags.label = o.driverLabel || 'Chauffeur'; M.runner = d; } c.ai = null; HUD.big('Véhicule immobilisé', '', 'good', 2); return true; }
      if (G.timer <= 0) return o.fail || 'Le véhicule vous a échappé.';
      const d = dist3(c.pos, G.player.pos); if (d > (o.lose || 240)) { M.farT = (M.farT || 0) + dt; if (M.farT > 8) return o.lost || 'Le véhicule vous a semé.'; } else M.farT = 0;
      return false;
    }
  };
}
// radio exchange, then move on (a short beat of story between two actions)
function stTalk(lines, wait = 0, o = {}) {
  return { kind: 'talk', o, checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) { M.talkT = 0; Kit.say(lines); M.talkLen = wait || lines.reduce((s, l) => s + (l[2] || Math.max(3.2, l[1].length * 0.055)), 0) * 0.85; if (o.obj) M.obj(o.obj, null, ''); o.start && o.start(M, G); },
    update(M, G, dt) { M.talkT += dt; if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; } return M.talkT >= M.talkLen; } };
}

/* ---------------- chapters ---------------- */
const CHAPTERS = [
  { n: 'I', title: 'Première nuit', ids: ['m1', 'c02', 'm2', 'c04', 'm3', 'm4'] },
  { n: 'II', title: 'Eaux troubles', ids: ['c07', 'c08', 'c09', 'c10', 'c11', 'c12'] },
  { n: 'III', title: 'Saline-16', ids: ['c13', 'c14', 'c15', 'c16', 'c17', 'c18'] },
  { n: 'IV', title: 'Hors-la-loi', ids: ['c19', 'c20', 'c21', 'c22', 'c23', 'c24'] },
  { n: 'V', title: 'La Grande Crue', ids: ['c25', 'c26', 'c27', 'c28', 'c29', 'c30'] }
];
const Campaign = {
  chapterOf(def) { return CHAPTERS.find(c => c.ids.indexOf(def.id) >= 0); },
  done(id) { const r = Save.data.missions[id]; return !!(r && r.done); },
  locked(def) { const i = MISSIONS.indexOf(def); if (i <= 0) return false; return !this.done(def.id) && !this.done(MISSIONS[i - 1].id); },
  nextCase() { return MISSIONS.find(m => !this.done(m.id) && !this.locked(m)) || null; },
  progress() { return MISSIONS.filter(m => this.done(m.id)).length; }
};

/* =====================================================================
   CHAPTER I — Première nuit (the two new cases)
   ===================================================================== */
const CASES = {};
CASES.c02 = {
  id: 'c02', no: 'DOSSIER 26-0919', title: 'La Fouine', district: 'Gare centrale · parvis', par: 300, diff: { dmg: 0.9, acc: 0.9 },
  brief: "Deuxième nuit, Solis. Des pickpockets travaillent le parvis de la gare centrale. Rien de bien méchant, mais les voyageurs se plaignent, et le préfet aussi. Un nom revient souvent : Fredo, dit « la Fouine ». Il n'a jamais frappé personne. Il n'a jamais non plus passé plus d'une heure en cellule.",
  goals: ['Rejoindre le parvis de la gare', 'Interpeller le pickpocket', 'Rendre le portefeuille volé', 'Rattraper Fredo (encore)'],
  start: { x: 20, z: -234, yaw: Math.PI }, traffic: 9, civs: 26,
  setup(M) {
    const g = World.spots.gare;
    M.victim = Kit.civ('civ', g.x - 5, g.z + 4, { label: 'Voyageur' });
    M.fredo = Kit.foe('fredo', g.x + 3, g.z - 1, { ai: 'script', label: 'Fredo' });
  },
  stages: [
    stGo('Rejoignez le parvis de la gare centrale', 'Gare', () => World.spots.gare, 14, { cp: true, say: [[MAR, "Saline-17, ici Maryse, au PC. Pickpocket signalé sur le parvis de la gare centrale."], [MAR, "Signalement : bonnet rouge, blouson moutarde, air innocent."], [SOL, "« Air innocent » : critère absent de ma base de données."]] }),
    stArrest('Rattrapez et interpellez le pickpocket', 'Fredo', M => { const f = M.fredo; f.ai = 'flee'; f.alerted = true; return f; }, { say: [[FRE, "Oh non. Un robot. Ça court pas vite, les robots, hein ? Hein ?"]], lost: 'Fredo s’est volatilisé dans la foule.' }),
    stCollect('Ramassez le portefeuille volé', 'Portefeuille', M => { const f = M.fredo; return [{ x: f.pos.x + 0.8, y: f.pos.y, z: f.pos.z + 0.4, geo: 'intel', col: [0.35, 0.2, 0.1], label: 'Portefeuille récupéré' }]; }, { say: [[FRE, "D'accord, d'accord ! C'est pas moi, c'est ma main. Elle a une vie à elle."]] }),
    stGo('Rendez le portefeuille au voyageur', 'Voyageur', M => Game.mission.victim.pos, 2.8),
    stTalk([['Voyageur', "Merci ! … Attendez. Il manque dix euros."], [FRE, "Frais de service !"], [MAR, "Saline-17… petit souci. Le fourgon qui emmenait votre pickpocket s'est arrêté à un feu rouge."], [MAR, "Il est reparti. Sans le pickpocket."], [SOL, "Définissez « petit »."], [MAR, "Bonnet rouge, direction les quais de la gare. Vous connaissez le chemin."]], 0, {
      start(M) { M.fredo.removed = true; const p = World.spots.platform; M.fredo2 = Kit.foe('fredo', p.x, p.z, { y: p.y, ai: 'script', label: 'Fredo' }); } }),
    stArrest('Rattrapez Fredo sur les quais', 'Fredo', M => { M.fredo.removed = true; if (!M.fredo2) { const p = World.spots.platform; M.fredo2 = Kit.foe('fredo', p.x, p.z, { y: p.y, ai: 'script', label: 'Fredo' }); } return M.fredo2; }, { cp: true, lost: 'Fredo a sauté dans un train de nuit.',
      update(M, G) { const f = M.fredo2; if (f.ai === 'script' && dist3(f.pos, G.player.pos) < 22) { f.ai = 'flee'; f.alerted = true; Kit.say([[FRE, "Encore vous ?! Je vous jure que je voulais juste acheter un billet !"]]); } } }),
    stTalk([[SOL, "Destination du billet ?"], [FRE, "… Loin de vous."]])
  ],
  outro: "Fredo « la Fouine » dort au poste, cette fois derrière une porte qui ferme à clé. Maryse a punaisé votre double interpellation au tableau du PC, avec un petit cœur au feutre rouge."
};
CASES.c04 = {
  id: 'c04', no: 'DOSSIER 26-0922', title: 'Les Prêcheurs', district: 'Cité des Tilleuls', par: 360, diff: { dmg: 0.95, acc: 0.95 },
  brief: "Depuis l'alerte crue, des prêcheurs de la Marée font du porte-à-porte à la cité des Tilleuls. D'abord des tracts, ensuite des menaces. Ce soir, on signale des coups. Va voir, Solis, et ramène-moi du calme. Pas de héros, pas de caméras : on en a assez comme ça.",
  goals: ['Rejoindre la cité des Tilleuls', 'Neutraliser les prêcheurs', 'Parler à la journaliste', 'La raccompagner à sa voiture'],
  start: { x: -140, z: -58, yaw: -Math.PI / 2 }, traffic: 7, civs: 16,
  setup(M) {
    M.nadia = Kit.civ('nadia', -196, -66, { label: 'Nadia', victim: true, hp: 90 });
    M.nadiaCar = Kit.car('compact', -130.1, -42, 0, { ai: 'parked', color: [0.5, 0.08, 0.1], tags: { noEnter: true } });
  },
  stages: [
    stGo('Rejoignez la cité des Tilleuls', 'Tilleuls', () => Game.mission.nadia.pos, 18, { cp: true, say: [[MAR, "Saline-17, des prêcheurs de la Marée malmènent des habitants à la cité des Tilleuls."], [MAR, "Il y a aussi une journaliste sur place. En train de filmer, évidemment."]] }),
    stClear('Neutralisez les prêcheurs', 'Prêcheurs', M => Kit.squad(['cultist', 'cultist', 'cultist', 'cultShot'], M.nadia.pos.x, M.nadia.pos.z, 7, { hunt: M.nadia }), {
      say: [[NAD, "Hé, le robot ! Ils en veulent à ma caméra ! Et accessoirement à ma tête !"], ['Prêcheur', "La mer reprendra tout, et d'abord les menteurs !"]],
      update: M => !M.nadia.alive ? 'Nadia Ferrand n’a pas survécu.' : false }),
    stGo('Parlez à la journaliste', 'Nadia', () => Game.mission.nadia.pos, 2.8, { start(M) { const n = M.nadia; n.mode = 'script'; n.victim = false; n.setState('move'); } }),
    stTalk([[NAD, "Nadia Ferrand, L'Écho de la Saline. Merci. Tu es la nouvelle unité ? Saline-17 ?"], [SOL, "Affirmatif. Êtes-vous blessée ?"], [NAD, "Juste vexée. Dis-moi, Saline-17… tu sais ce qui est arrivé à l'unité d'avant ?"], [SOL, "Je n'ai aucune donnée sur une unité Saline-16."], [NAD, "Justement. C'est bien ça, le problème."], [NAD, "Raccompagne-moi à ma voiture, tu veux ? Ils ne sont peut-être pas tous partis."]]),
    stEscort('Raccompagnez Nadia à sa voiture', 'Voiture', 'nadia', () => Game.mission.nadiaCar.pos, { r: 4.5, fem: true,
      update(M, G) { if (!M.amb && dist2D(G.player.pos.x, G.player.pos.z, M.nadiaCar.pos.x, M.nadiaCar.pos.z) < 42) { M.amb = Kit.squad(['cultist', 'cultist'], M.nadiaCar.pos.x - 9, M.nadiaCar.pos.z - 7, 3, { ai: 'engage', alerted: true, hunt: M.nadia }); for (const a of M.amb) a.tags.target = true; Kit.say([['Prêcheur', "Tu ne partiras pas avec tes mensonges, journaliste !"]]); } } }),
    stTalk([[NAD, "Merci, Saline-17. Tiens, ma carte. Si tu entends parler de la Marée, appelle-moi."], [NAD, "Et si un jour tu veux savoir ce qui est arrivé à Saline-16… demande à Okafor ce qui s'est passé le 14 juin."]], 0, { start(M) { const n = M.nadia; n.mode = 'script'; n.faceYaw = n.yaw; } })
  ],
  outro: "Nadia est repartie avec ses images. Au dos de sa carte de visite, une phrase griffonnée à la hâte : « Demande à Okafor ce qui s'est passé le 14 juin. »"
};

/* =====================================================================
   CHAPTER II — Eaux troubles
   ===================================================================== */
CASES.c07 = {
  id: 'c07', no: 'DOSSIER 26-0930', title: 'Le Transfert', district: 'Commissariat → palais de justice', par: 420, diff: { dmg: 1, acc: 1 },
  brief: "Le Héraut de la Marée est transféré ce soir au palais de justice. Un fourgon, une escorte : toi. Depuis son arrestation, il n'a prononcé qu'une phrase, en boucle : « Le courant vient d'en haut. » Reste collé au fourgon, Solis. Les fanatiques n'abandonnent pas les leurs.",
  goals: ['Monter dans une voiture de patrouille', 'Escorter le fourgon jusqu’au palais de justice', 'Repousser les embuscades'],
  start: { x: 3, z: -88.3, yaw: 0 }, traffic: 7, civs: 12,
  setup(M) {
    const I = Cars.graph.idx, a = I(7, 5), b = I(8, 5), dest = I(9, 3);
    M.van = Kit.laneCar('van', a, b, 0.62, { color: [0.86, 0.87, 0.9], driver: 'civ', tags: { noEnter: true } }); M.van.hp = M.van.maxHp = 420; M.van.police = true;
    M.route = [a].concat(Cars.pathTo(b, dest) || [b]);
    const s = World.spots.policeCar; M.car = Kit.car('police', s.x, s.z, s.yaw);
    const N = Cars.graph.nodes, R2 = M.route, mid = (i, t) => { const A = N[R2[i]], B = N[R2[i + 1]], L = Math.hypot(B.x - A.x, B.z - A.z) || 1; return { x: lerp(A.x, B.x, t), z: lerp(A.z, B.z, t), dx: (B.x - A.x) / L, dz: (B.z - A.z) / L }; };
    M.ambush = [{ p: mid(Math.min(1, R2.length - 2), 0.55) }, { p: mid(R2.length - 2, 0.45), ram: true }];
  },
  stages: [
    stGo('Montez dans une voiture de patrouille', 'Voiture', () => Game.mission.car.pos, 4, { inCar: true, cp: true, say: [[OKA, "Le fourgon démarre dès que tu es au volant derrière lui. Colle-lui au pare-chocs, Solis."]] }),
    { start(M, G) {
        Cars.route(M.van, M.route); M.van.cruise = 10.5; M.van.siren = true;
        M.bar = { name: 'Fourgon pénitentiaire', k: () => M.van.hp / M.van.maxHp };
        M.obj('Escortez le fourgon jusqu’au palais de justice', () => M.van.pos, 'Fourgon');
        Kit.say([[MAR, "Fourgon en route, Saline-17. Itinéraire dégagé… en théorie."]]);
      },
      update(M, G, dt) {
        const v = M.van, P = G.player;
        if (v.hp <= 0 || v.dead) return 'Le fourgon a été détruit. Le Héraut a disparu dans la fumée.';
        const far = dist2D(P.pos.x, P.pos.z, v.pos.x, v.pos.z) > 70;
        let act = null;
        for (const A of M.ambush) {
          if (!A.on && dist2D(v.pos.x, v.pos.z, A.p.x, A.p.z) < 44) {
            A.on = true; A.foes = [];
            for (const sgn of [-(RHW + 1.8), RHW + 1.8]) A.foes.push(...Kit.squad(A.ram ? ['merc', 'mercShot'] : ['merc', 'mercPistol'], A.p.x - A.p.dz * sgn, A.p.z + A.p.dx * sgn, 3, { ai: 'engage', alerted: true }));
            for (const f of A.foes) f.tags.target = true;
            if (A.ram) { // a car comes the other way, straight at the van
              const x = A.p.x + A.p.dx * 34 - A.p.dz * LANE, z = A.p.z + A.p.dz * 34 + A.p.dx * LANE;
              const c = Kit.car('sedan', x, z, Math.atan2(-A.p.dx, -A.p.dz), { ai: 'ram', driver: 'mercPistol', color: [0.05, 0.05, 0.06] }); c.ramTarget = v; c.hp = c.maxHp = 110; c.tags.target = true; A.foes.push(c.driver); A.ramCar = c; }
            HUD.big('Embuscade !', '', 'bad', 1.8); Snd.play('alarm');
            Kit.say(A.ram ? [[MAR, "Deuxième embuscade ! Et une voiture qui fonce sur le fourgon !"]] : [[MAR, "Embuscade ! Tireurs de part et d'autre de la chaussée !"], [SOL, "Ce ne sont pas des membres de la secte. Équipement militaire."]]);
          }
          if (A.on && !A.done) {
            act = A;
            for (const f of A.foes) if (f.alive && !Kit.isDown(f) && !f.inCar && dist3(f.pos, v.pos) < 40 && Math.random() < dt * 0.85) Kit.fireAt(f, v, 3);
            if (A.foes.every(f => Kit.isDown(f) || (f.inCar && (f.inCar.dead || f.inCar.hp <= 0)))) { A.done = true; Kit.say([[MAR, "Voie dégagée. Le fourgon repart."]]); }
          }
        }
        v.hold = !!act || far;
        if (act) { const n = act.foes.filter(f => Kit.isDown(f) || (f.inCar && f.inCar.dead)).length; M.objective = `Repoussez l’embuscade <small>${n}/${act.foes.length}</small>`; M.marker = () => { const t = Kit.nearest(act.foes.filter(f => !f.inCar)); return t ? t.pos : act.ramCar && !act.ramCar.dead ? act.ramCar.pos : v.pos; }; }
        else { M.objective = far ? 'Rejoignez le fourgon : il vous attend' : 'Escortez le fourgon jusqu’au palais de justice'; M.marker = () => v.pos; }
        return !!v.arrived;
      } },
    stTalk([['Le Héraut', "Tu crois m'avoir sauvé, machine ? Ils ne voulaient pas me libérer. Ils voulaient me faire taire."], ['Le Héraut', "La Marée n'était qu'un drapeau. Le courant vient d'en haut. Cherche qui a payé."], [OKA, "Des tireurs en tenue de combat en plein centre-ville… Ce ne sont pas des fanatiques, Solis. Ce sont des professionnels."]], 0, { start(M) { M.bar = null; } })
  ],
  outro: "Le Héraut a été remis au palais de justice à 3 h 40. À 6 h 12, un gardien l'a trouvé sans vie dans sa cellule. « Arrêt cardiaque », dit le rapport. Okafor l'a lu deux fois, puis l'a déchiré."
};
CASES.c08 = {
  id: 'c08', no: 'DOSSIER 26-1002', title: 'Les Entrepôts', district: 'Les Entrepôts · port', par: 420, diff: { dmg: 1, acc: 1 },
  brief: "Le Héraut est mort, mais la Marée a laissé des traces. Les Rats de Quai ont repris un entrepôt près du port, et quelqu'un les paie beaucoup mieux qu'avant. Fouille les lieux, Solis. Je veux savoir d'où vient l'argent.",
  goals: ['Rejoindre les entrepôts', 'Neutraliser les Rats de Quai', 'Fouiller les lieux', 'Repousser les renforts'],
  start: { x: 78, z: 16, yaw: Math.PI / 2 }, traffic: 6, civs: 6,
  setup(M) { const K = World.blocks[9][7]; M.K = { x: K.cx, z: K.cz }; Pickups.add('health', K.lx0 + 3, CURB, K.lz0 + 3); Pickups.add('ammo', K.lx1 - 3, CURB, K.lz1 - 3); },
  stages: [
    stGo('Rejoignez les entrepôts', 'Entrepôts', () => Game.mission.K, 24, { cp: true, say: [[OKA, "Entrepôt 7, derrière la criée. Les Rats de Quai s'y sentent chez eux. Plus pour longtemps."]] }),
    stClear('Neutralisez les Rats de Quai', 'Rats de Quai', M => Kit.squad(['thug', 'thugBat', 'thugKnife', 'gunner', 'gunner', 'mercPistol', 'thug', 'mercPistol'], M.K.x, M.K.z, 12), { say: [['Rat de Quai', "C'est le robot des docks ! Celui qui a coffré le Grutier !"]] }),
    stUse('Fouillez les lieux', 'Indice', M => {
      const p = (dx, dz) => Kit.at(M.K.x + dx, M.K.z + dz);
      return [
        Object.assign(p(-10, -8), { label: 'Fouiller le registre', hold: 1.4, busy: 'Lecture…', toast: 'Registre de livraisons', onDone: () => Kit.say([[SOL, "Livraisons « S.S. » chaque mardi. S.S. : Sentinelle Sécurité."]]) }),
        Object.assign(p(9, 6), { label: 'Fouiller l’ordinateur', hold: 1.8, busy: 'Extraction…', toast: 'Virement bancaire', onDone: () => Kit.say([[SOL, "Virement : Vasseur & Fils vers Sentinelle Sécurité. 2,4 millions. Objet : « gardiennage de la vieille ville »."]]) }),
        Object.assign(p(2, -12), { label: 'Ouvrir la caisse', hold: 1.2, busy: 'Ouverture…', toast: 'Détonateurs', onDone: () => Kit.say([[SOL, "Détonateurs de chantier. Estampillés « Digue de Saline, lot 7 »."], [OKA, "La Digue ? Qu'est-ce que la Digue vient faire là-dedans ?"]]) })
      ];
    }),
    stClear('Des renforts ! Neutralisez-les', 'Mercenaires', M => Kit.squad(['merc', 'mercPistol', 'mercBaton'], M.K.x + 26, M.K.z + 2, 4), { cp: true, say: [[MAR, "Trois véhicules noirs viennent de s'arrêter devant l'entrepôt. Sans plaques."], [SOL, "Armes de guerre. Tenue identique à l'embuscade du fourgon."]] }),
    stTalk([[NAD, "Solis ? C'est Nadia. Maryse m'a donné ton canal… ne lui en veux pas."], [NAD, "Vasseur & Fils ? Victor Vasseur, le promoteur de « Saline Nouvelle ». Depuis l'alerte crue, il a racheté la moitié des immeubles de la vieille ville. À prix cassé."], [SOL, "Pourquoi paierait-il des mercenaires pour garder la vieille ville ?"], [NAD, "« Garder », Solis ? Tu es adorable."]])
  ],
  outro: "Vasseur & Fils, Sentinelle Sécurité, et des détonateurs estampillés « Digue ». Okafor a demandé un mandat de perquisition. Le commissaire divisionnaire Delorme l'a refusé dans l'heure, « faute d'éléments »."
};
CASES.c09 = {
  id: 'c09', no: 'DOSSIER 26-1004', title: 'Le Dépôt', district: 'Dépôt pétrolier', par: 420, diff: { dmg: 1, acc: 1.02 },
  brief: "Alerte au dépôt pétrolier : les gardiens ne répondent plus, et un camion est en train d'être chargé. Après les détonateurs de l'entrepôt, je n'aime pas ça du tout. Fonce, Solis. Ce camion ne doit pas sortir.",
  goals: ['Rejoindre la zone de chargement à temps', 'Neutraliser les pilleurs', 'Immobiliser le camion', 'Interpeller le chauffeur'],
  start: { x: -150, z: -238, yaw: -Math.PI / 2 }, traffic: 6, civs: 4,
  setup(M) { M.bay = Kit.at(-189, -262); Kit.car('police', -160, -238.1, -Math.PI / 2); Pickups.add('health', -175, CURB, -250); },
  stages: [
    stGo('Rejoignez la zone de chargement du dépôt', 'Dépôt', () => Game.mission.bay, 14, { cp: true, time: 100, fail: 'Le camion a quitté le dépôt avant votre arrivée.', say: [[MAR, "Des individus chargent du matériel dans un camion au dépôt pétrolier. Les gardiens ne répondent plus."], [OKA, "Des explosifs de chantier, Solis. Il ne faut pas que ce camion sorte."]] }),
    stClear('Neutralisez les pilleurs', 'Dépôt', M => Kit.squad(['cultist', 'cultist', 'cultShot', 'merc', 'mercPistol', 'mercPistol'], M.bay.x, M.bay.z - 8, 9), { time: 150, fail: 'Le camion est reparti pendant l’affrontement.', say: [['Pilleur', "Chargez plus vite ! Le robot est là !"]] }),
    stChase('Immobilisez le camion', 'Camion', { cp: true, hp: 230, name: 'Camion d’explosifs', driverLabel: 'Chauffeur', time: 180,
      spawn(M, G) { const a = Kit.node(-189, -243), b = Kit.away(a, G.player.pos.x, G.player.pos.z); const c = Kit.laneCar('van', a, b, 0.25, { ai: 'chase', driver: 'mercPistol', color: [0.08, 0.08, 0.09] }); Cars.planEdge(c, a, b); return c; },
      say: [[MAR, "Le camion force la barrière ! Il sort du dépôt !"], [OKA, "Il y a une voiture de patrouille sur l'avenue. Rattrape-le et sors-le de la route."]] }),
    stArrest('Interpellez le chauffeur', 'Chauffeur', M => M.runner, { lost: 'Le chauffeur a disparu dans la nuit.' })
  ],
  outro: "Le camion contenait trois cents kilos d'explosif de chantier : de quoi ouvrir une brèche dans n'importe quel mur. Le chauffeur n'a prononcé qu'un mot : « Avocat ». Le cabinet qui l'a fait sortir en deux heures travaille pour Vasseur & Fils."
};
// the cat: hops away when the robot gets close, a few times
function catStage(text, hops, final) {
  return { kind: 'cat',
    start(M, G) {
      if (!M.cat || !M.cat.alive) { const p = M.catPts[M.catI]; M.cat = Pickups.add('item', p.x, p.y, p.z, { geo: 'cat', col: [0.86, 0.48, 0.18], e: 0.08, glow: [1, 0.7, 0.3], scale: 1.4, onCollect: () => { if (!M.catFinal) return false; M.gotCat = true; HUD.toast('Monsieur Brioche', 'Suspect appréhendé', 'gold', true); Snd.play('meow', G.player.pos); } }); }
      M.catFinal = !!final;
      M.hopsLeft = hops; M.obj(text, () => M.cat.pos, 'Monsieur Brioche');
    },
    update(M, G, dt) {
      const c = M.cat, d = dist3(c.pos, G.player.pos); c.t += dt * 3; // wriggles
      if (M.hopsLeft > 0 && d < 4.3) {
        M.hopsLeft--; M.catI++; const p = M.catPts[M.catI]; FX.dust(c.pos.x, c.pos.y + 0.2, c.pos.z); Snd.play('meow', c.pos, 1, 1.2); c.pos.set(p.x, p.y, p.z); FX.dust(p.x, p.y + 0.2, p.z);
        const lines = [[[SOL, "Le suspect est rapide, agile, et totalement dépourvu de respect pour l'autorité."], [MAR, "C'est un chat, Saline-17."]], [[SOL, "Il m'a regardé. Avec mépris."], [MAR, "C'est un chat, Saline-17."]], [[PET, "Brioche ! Viens voir maman !"]]];
        Kit.say(lines[Math.min(lines.length - 1, M.catSaid = (M.catSaid || 0) + 1) - 1]);
        if (!final && M.hopsLeft === 0) return true;
      }
      return final ? !!M.gotCat : false;
    }
  };
}
CASES.c10 = {
  id: 'c10', no: 'DOSSIER 26-1006', title: 'Opération Moustache', district: 'Les Glycines', par: 480, diff: { dmg: 0.9, acc: 0.9 }, weather: 'shower', // the cat hates the rain
  brief: "Solis, ne me regarde pas comme ça. Oui, c'est un chat. Oui, la requérante a appelé onze fois. Et oui, elle a le numéro personnel du maire. Après la semaine qu'on vient de passer, une mission sans balles, ça ne te fera pas de mal. Sois gentil avec la dame.",
  goals: ['Rejoindre Mme Pétronille', 'Attraper Monsieur Brioche', 'Récupérer la voiture volée', 'Rendre le chat à sa maîtresse'],
  start: { x: -246, z: 30, yaw: -Math.PI / 2 }, traffic: 5, civs: 12,
  setup(M) {
    M.pet = Kit.civ('petronille', -262, 22, { label: 'Mme Pétronille' });
    M.petCar = Kit.car('compact', -247.9, 46, 0, { ai: 'parked', color: [0.25, 0.55, 0.32], tags: { noEnter: true } });
    M.catPts = [[-282, 12], [-300, 44], [-331, 14], [-318, -6], [-296, 30]].map(([x, z]) => Kit.at(x, z)); M.catI = 0;
  },
  stages: [
    stGo('Rejoignez Mme Pétronille', 'Mme Pétronille', () => Game.mission.pet.pos, 3, { cp: true, say: [[MAR, "Saline-17, appel prioritaire. Enfin, « prioritaire » selon la requérante."], [MAR, "Mme Pétronille, quatre-vingt-quatre ans, les Glycines. Son chat a disparu."], [SOL, "S'agit-il d'une mission de police ?"], [MAR, "C'est une mission de paix sociale, Saline-17."]] }),
    stTalk([[PET, "Ah, vous voilà ! Monsieur Brioche est sorti par la fenêtre de la cuisine. Il déteste la pluie. Il doit être terrorisé."], [PET, "Il est roux, il répond à « Brioche » et il griffe les inconnus. Soyez gentil avec lui."], [SOL, "Signalement enregistré. Suspect : roux, griffu, terrorisé."]]),
    catStage('Attrapez Monsieur Brioche', 2, false),
    stTalk([[PET, "Ma voiture ! Ce voyou vole ma voiture !"], [FRE, "Désolé, madame ! C'est une urgence professionnelle !"], [SOL, "Fredo."], [MAR, "Il y a une voiture de patrouille au bout de la rue, Saline-17. Faites-moi plaisir."]], 0, {
      start(M, G) { const c = M.petCar; c.setNpcDriver('fredo'); c.driver.tags.label = 'Fredo'; const a = Kit.node(c.pos.x, c.pos.z + 20), b = Kit.away(a, G.player.pos.x, G.player.pos.z); c.from = a; c.to = b; c.wps = []; Cars.planEdge(c, a, b, true); c.ai = 'chase';
        const n = Kit.node(G.player.pos.x, G.player.pos.z), e = Cars.graph.nodes[n].nb[0]; M.pcar = Kit.laneCar('police', n, e, 0.28, {}); } }),
    stChase('Immobilisez la voiture volée', 'Voiture volée', { hp: 75, name: 'La voiture de Mme Pétronille', driverLabel: 'Fredo', time: 180, spawn: M => M.petCar }),
    stArrest('Interpellez Fredo', 'Fredo', M => M.runner, { say: [[FRE, "Encore vous ?! Mais c'est de l'acharnement !"], [SOL, "Troisième rencontre cette semaine, Fredo."], [FRE, "Vous comptez, vous ?"]], lost: 'Fredo s’est encore échappé.' }),
    Object.assign(catStage('Attrapez enfin Monsieur Brioche', 1, true), { checkpoint: false }),
    stGo('Rendez Monsieur Brioche à sa maîtresse', 'Mme Pétronille', () => Game.mission.pet.pos, 2.8),
    stTalk([[PET, "Monsieur Brioche ! Mon bébé ! Vous êtes un amour, monsieur le robot."], [SOL, "Je suis une unité de police, madame."], [PET, "Un amour d'unité de police, alors."]])
  ],
  outro: "Monsieur Brioche a retrouvé son coussin. Mme Pétronille a fait livrer au commissariat une boîte de madeleines « pour le gentil robot ». Okafor les a toutes mangées, « pour vérifier qu'elles n'étaient pas piégées ». Quant à la voiture… l'assurance a promis de rappeler."
};
CASES.c11 = {
  id: 'c11', no: 'DOSSIER 26-1009', title: 'Guerre des gangs', district: 'Faubourg des Forges', par: 540, diff: { dmg: 1.02, acc: 1.02 }, crime: 88, crimeTarget: 30,
  brief: "Depuis que tu as coffré le Grutier, les Rats de Quai cherchent un nouveau territoire. Ils ont choisi le Faubourg des Forges, qui appartient déjà à un autre gang : les Forgerons. Résultat : des barres de fer dans toutes les rues. Calme-moi ce quartier, Solis, et ramène-moi le chef des Forgerons. On l'appelle La Pince.",
  goals: ['Faire passer la criminalité du Faubourg sous 30 %', 'Interpeller La Pince'],
  start: { x: -246, z: -165, yaw: -Math.PI / 2 }, traffic: 6, civs: 10,
  setup(M) {
    M.gang = [].concat(
      Kit.squad(['forgeron', 'forgeron', 'forgeronGun'], -285, -160, 6), Kit.squad(['thug', 'thugBat', 'gunner'], -300, -205, 6),
      Kit.squad(['forgeron', 'forgeronGun', 'forgeron'], -345, -175, 6), Kit.squad(['thugKnife', 'thug', 'gunner', 'forgeron'], -360, -215, 7));
    Pickups.add('health', -300, CURB, -180); Pickups.add('ammo', -330, CURB, -200); Pickups.add('weapon', -290, CURB, -170, { weapon: 'bat' });
  },
  stages: [
    { checkpoint: true, start(M) { M.obj('Faites passer la criminalité du Faubourg sous 30 %', () => M.nearestGang(), 'Gangs'); Kit.say([[MAR, "Les Rats de Quai et les Forgerons se disputent le Faubourg. Depuis l'arrestation du Grutier, c'est la foire aux chefs."], [SOL, "Une foire. Avec des manèges ?"], [MAR, "Avec des barres de fer, Saline-17."]]); },
      update(M, G) { return G.crime <= G.crimeTarget; } },
    stArrest('Interpellez La Pince', 'La Pince', M => { const b = Kit.foe('pince', -330, -198, { ai: 'engage', alerted: true, label: 'La Pince' }); Kit.squad(['forgeron', 'forgeronGun'], -330, -198, 4, { ai: 'engage', alerted: true }); return b; }, { boss: true, cp: true,
      say: [[MAR, "La Pince sort de la fonderie, avec ses gardes du corps."], ['La Pince', "Un robot ? Parfait. J'ai toujours voulu savoir ce qu'il y avait dedans."]] }),
    stTalk([['La Pince', "Les Rats ? Ils bossent pour les types en noir, maintenant. Sentinelle. Ça paie en liquide, et ça tire en premier."], ['La Pince', "Leur chef, on l'appelle Rook. Personne l'a jamais vu sans son casque."]])
  ],
  outro: "Le Faubourg des Forges dort enfin. En garde à vue, La Pince a répété un nom, toujours à voix basse : Rook. Le chef des mercenaires de Sentinelle."
};
CASES.c12 = {
  id: 'c12', no: 'DOSSIER 26-1011', title: 'Nuit blanche à Saint-Roch', district: 'Hôpital Saint-Roch', par: 540, diff: { dmg: 1.05, acc: 1.05 },
  brief: "Anselme Roux, soixante-dix-huit ans, ingénieur à la retraite, a été renversé hier par une voiture qui ne s'est pas arrêtée. À son réveil, il a demandé la police. Il a demandé toi, Solis, nommément. Et il y a dix minutes, des coups de feu ont éclaté aux urgences de Saint-Roch.",
  goals: ['Rejoindre l’entrée des urgences', 'Tenir l’entrée pendant l’évacuation', 'Interpeller Mâchoire', 'Escorter Anselme Roux jusqu’à la voiture'],
  start: { x: 190, z: 90, yaw: Math.PI }, traffic: 6, civs: 10,
  setup(M) { M.er = World.spots.emergency; M.car = Kit.car('police', 176, 85.9, Math.PI / 2); Pickups.add('health', M.er.x - 6, CURB, M.er.z + 4); Pickups.add('health', M.er.x + 6, CURB, M.er.z + 4); Pickups.add('ammo', M.er.x, CURB, M.er.z + 8); },
  stages: [
    stGo('Rejoignez l’entrée des urgences', 'Urgences', () => World.spots.emergency, 10, { cp: true, say: [[MAR, "Coups de feu à Saint-Roch, entrée des urgences ! Des hommes armés cherchent un patient."], [OKA, "Anselme Roux. Solis, ce vieil homme n'a demandé qu'une chose en se réveillant : toi."]] }),
    stDefend('Tenez l’entrée des urgences pendant l’évacuation', 'Urgences', () => World.spots.emergency, { time: 90, leash: 34, clearAtEnd: true, say: [[MAR, "Les infirmiers évacuent les patients par l'arrière. Il leur faut une minute et demie !"]],
      waves: [[1, ['merc', 'mercBaton'], { dist: 30 }], [15, ['mercPistol', 'mercPistol', 'mercBaton'], { dist: 32 }], [33, ['merc', 'merc'], { dist: 34 }], [50, ['mercBaton', 'mercPistol', 'merc'], { dist: 30 }], [68, ['mercShot', 'mercPistol'], { dist: 30 }]] }),
    stArrest('Interpellez Mâchoire', 'Mâchoire', M => { const p = World.spots.emergency; const b = Kit.foe('machoire', p.x + 14, p.z + 16, { ai: 'engage', alerted: true, label: 'Mâchoire' }); Kit.squad(['merc', 'mercPistol'], p.x + 16, p.z + 18, 3, { ai: 'engage', alerted: true }); return b; }, { boss: true, cp: true,
      say: [[MAR, "Un colosse avec une clé à molette arrive par le parking !"], ['Mâchoire', "Le vieux, tu nous le laisses. Et on te laisse tes boulons."], [OKA, "Il charge comme le Grutier. Esquive, et laisse-le embrasser un mur."]] }),
    stTalk([[ANS, "C'est fini ? Merci… jeune machine. Aidez-moi à marcher, voulez-vous ?"]], 0, { start(M) { const p = World.spots.emergency; M.ans = Kit.civ('anselme', p.x, p.z - 1.5, { label: 'Anselme Roux', hp: 70 }); } }),
    stEscort('Escortez Anselme Roux jusqu’à la voiture', 'Voiture', 'ans', () => Game.mission.car.pos, { r: 5, update(M, G) { if (!M.amb2 && dist2D(G.player.pos.x, G.player.pos.z, M.car.pos.x, M.car.pos.z) < 30) { M.amb2 = Kit.squad(['mercPistol', 'mercBaton'], M.car.pos.x + 14, M.car.pos.z - 10, 3, { ai: 'engage', alerted: true, hunt: M.ans }); } } }),
    stTalk([[ANS, "La Digue… C'est moi qui l'ai construite, vous savez. En 1994."], [ANS, "Les vannes du bassin Est ne tiennent plus que par la peinture. J'ai envoyé douze rapports à la mairie. Douze."], [ANS, "Tous classés sans suite par le même homme : le commissaire Delorme."], [OKA, "… Delorme ?"]])
  ],
  outro: "Mâchoire est en cellule, Anselme Roux sous protection. Il se souvient d'une visite, en juin : une lieutenante et une unité robotisée, venues parler de la Digue. La lieutenante s'appelait Camille Arnaud. Okafor n'a pas dit un mot pendant tout le trajet du retour."
};

/* =====================================================================
   CHAPTER III — Saline-16
   ===================================================================== */
CASES.c13 = {
  id: 'c13', no: 'DOSSIER 26-1014', title: 'Ferraille', district: 'Marché aux puces · casse Mercier', par: 480, diff: { dmg: 1.08, acc: 1.05 },
  brief: "Nadia a retrouvé une trace de Saline-16 : son châssis a été vendu à la casse Mercier, au marché aux puces. Comme de la ferraille. Si sa mémoire est encore là-dedans, elle nous dira peut-être ce qui s'est passé le 14 juin. Va la chercher, Solis. Et méfie-toi : la casse a changé de propriétaire le mois dernier.",
  goals: ['Rejoindre la casse', 'Neutraliser les gardiens', 'Fouiller les tas de ferraille', 'Récupérer la boîte noire de Saline-16'],
  start: { x: -127.5, z: 56, yaw: -Math.PI / 2 }, traffic: 6, civs: 10,
  setup(M) { M.y = World.spots.scrapyard; Pickups.add('health', M.y.x + 8, CURB, M.y.z - 8); },
  stages: [
    stGo('Rejoignez la casse Mercier', 'Casse', () => World.spots.scrapyard, 16, { cp: true, say: [[NAD, "Solis, c'est Nadia. Le châssis de Saline-16 a été vendu à la casse Mercier. Au prix du cuivre."], [SOL, "Une unité de police, vendue au poids."], [NAD, "Fais attention. Le nouveau propriétaire de la casse n'aime pas les visites."]] }),
    stClear('Neutralisez les gardiens de la casse', 'Casse', M => Kit.squad(['hdrone', 'hdrone', 'hdrone', 'thug', 'thugBat'], M.y.x, M.y.z, 9), { say: [[SOL, "Des unités de patrouille déclassées. Quelqu'un a reprogrammé leurs voyants en rouge."], [MAR, "Ces robots ont été vendus aux enchères par la ville en juillet. Acheteur : Sentinelle Sécurité."]] }),
    stUse('Fouillez les tas de ferraille', 'Ferraille', M => {
      M.heaps = 0; const pts = [[-10, 6], [8, 10], [3, -11]].map(([dx, dz]) => Kit.at(M.y.x + dx, M.y.z + dz));
      return pts.map(p => Object.assign(p, { label: 'Fouiller la ferraille', hold: 2, busy: 'Fouille…', onDone: (M2, G, it) => {
        M2.heaps++; if (M2.heaps < 3) { Kit.squad(['hdrone', 'hdrone'], it.pos.x + 4, it.pos.z + 4, 2, { ai: 'engage', alerted: true }); Kit.say([[SOL, M2.heaps === 1 ? "Rien. Et ce tas-là était piégé." : "Toujours rien. Encore un piège."]]); }
        else { M2.boxAt = { x: it.pos.x + 0.6, y: it.pos.y, z: it.pos.z }; Kit.say([[SOL, "Là. Un boîtier orange, sous une portière. Numéro de série : S-16."]]); } } }));
    }),
    stCollect('Récupérez la boîte noire de Saline-16', 'Boîte noire', M => [Object.assign({}, M.boxAt, { geo: 'blackbox', col: [0.95, 0.5, 0.1], e: 0.5, glow: [1, 0.6, 0.2], scale: 1.4, label: 'Boîte noire de Saline-16', sub: 'Fragment 1 / 4' })]),
    stTalk([[S16, "Journal de bord de l'unité Saline-16. 12 juin."], [S16, "La lieutenante Arnaud pense que les rapports d'inspection de la Digue ont été falsifiés. Je l'aide à retrouver les originaux."], [S16, "Elle dit que je suis trop poli. Je l'ai remerciée pour sa remarque."], [NAD, "Solis ? Ça va ?"], [SOL, "Je l'ignore. C'est la première fois que j'entends la voix d'une unité comme moi."]])
  ],
  outro: "La boîte noire de Saline-16 a été démontée : il lui manque trois fragments de mémoire. Le laboratoire n'a pu extraire que le premier. Quelque part dans Port-Saline, le reste du journal attend."
};
CASES.c14 = {
  id: 'c14', no: 'DOSSIER 26-1016', title: 'Le Cimetière de l’Ouest', district: 'Cimetière de l’Ouest', par: 540, diff: { dmg: 1.08, acc: 1.08 },
  brief: "Okafor ne t'a pas donné de dossier ce soir. Juste une adresse : le cimetière de l'Ouest, allée des Tilleuls. « Viens à pied », a-t-il dit. Anselme Roux doit vous y rejoindre : il prétend avoir quelque chose qui appartenait à Camille Arnaud.",
  goals: ['Rejoindre Okafor au cimetière', 'Retrouver Anselme à la chapelle', 'Protéger Anselme', 'Récupérer le deuxième fragment', 'Escorter Anselme jusqu’à la voiture'],
  resume(M, G, stage) { if (stage >= 2) { const s = World.safeSpot(-296, -72, 0.4); M.oka.pos.set(s.x, s.y, s.z); } },
  start: { x: -289.5, z: -70, yaw: -Math.PI / 2 }, traffic: 4, civs: 2,
  setup(M) {
    const c = World.spots.chapel; M.oka = Kit.civ('okafor', -343, -97, { label: 'Okafor', yaw: Math.PI, hp: 5000 });
    M.ans = Kit.civ('anselme', c.x + 4, c.z + 1, { label: 'Anselme Roux', hp: 140, yaw: Math.PI / 2 });
    M.car = Kit.car('police', -292.1, -98, 0); Pickups.add('health', c.x + 8, CURB, c.z - 6); Pickups.add('ammo', c.x + 10, CURB, c.z + 6);
  },
  stages: [
    stGo('Rejoignez Okafor au cimetière', 'Okafor', () => Game.mission.oka.pos, 3, { cp: true, say: [[OKA, "Solis. Allée des Tilleuls, la troisième tombe après le grand if. Je t'attends."]] }),
    stTalk([[OKA, "Camille Arnaud. Vingt-neuf ans. Elle me battait aux échecs et elle détestait le café du poste."], [OKA, "Le 14 juin, elle est partie avec Saline-16 inspecter la centrale. Il y a eu une explosion."], [OKA, "On m'a rendu un badge fondu et une carte de condoléances. Signée Delorme."], [SOL, "Je suis désolé, commandant."], [OKA, "Tu n'y es pour rien, Solis. C'est bien ça qui me rendait fou : je t'en voulais d'être là, et pas elle."], [OKA, "Anselme nous attend à la chapelle. Vas-y. Je surveille l'entrée."]]),
    stGo('Rejoignez Anselme à la chapelle', 'Chapelle', () => Game.mission.ans.pos, 3, { start(M) { const o = M.oka; o.mode = 'goto'; o.dest = World.safeSpot(-296, -72, 0.4); o.destSpeed = 1.5; } }),
    stTalk([[ANS, "Camille m'a confié ceci la veille de sa mort. Elle m'a dit : « Si je ne reviens pas, donnez-le à l'unité qui me remplacera. »"], [ANS, "Je l'ai gardé quatre mois dans ma boîte à sucre. Personne ne fouille jamais une boîte à sucre."], [MAR, "Saline-17 ! Plusieurs véhicules noirs entrent dans le cimetière !"]]),
    stClear('Protégez Anselme : repoussez les mercenaires', 'Mercenaires', M => { const c = World.spots.chapel; return Kit.squad(['merc', 'merc', 'mercPistol', 'mercPistol', 'mercBaton', 'mercShot'], c.x + 12, c.z - 30, 8, { hunt: M.ans }); }, {
      cp: true, start(M) { M.ans.mode = 'hide'; }, update: M => !M.ans.alive ? 'Anselme Roux n’a pas survécu.' : false,
      say: [[ROOK, "Le vieux et la boîte noire. Ramenez-moi les deux. Le robot, en pièces détachées."], [SOL, "Fréquence de Sentinelle interceptée. L'homme qui donne les ordres s'appelle Rook."]] }),
    stCollect('Prenez le fragment que vous tend Anselme', 'Fragment', M => { M.ans.mode = 'script'; M.ans.setState('move'); const p = M.ans.pos; return [{ x: p.x + 0.7, y: p.y, z: p.z, geo: 'drive', col: [0.9, 0.5, 0.15], e: 0.6, glow: [1, 0.6, 0.2], label: 'Fragment de mémoire', sub: '2 / 4' }]; }),
    stTalk([[S16, "Journal de Saline-16. 13 juin."], [S16, "Les vannes du bassin Est ont été affaiblies volontairement. Les boulons de sécurité ont été sciés aux trois quarts."], [S16, "Camille dit que si la Digue cède pendant une grande marée, la vieille ville sera sous deux mètres d'eau. Et que les terrains ne vaudront plus rien. Sauf pour qui les rachète."]]),
    stEscort('Escortez Anselme jusqu’à la voiture d’Okafor', 'Voiture', 'ans', () => Game.mission.car.pos, { r: 5 })
  ],
  outro: "Deuxième fragment récupéré. En déposant Anselme chez lui, Okafor a dit : « Merci, Solis. » Juste Solis. Pour la première fois, sans le « Saline-17 » devant."
};
CASES.c15 = {
  id: 'c15', no: 'DOSSIER 26-1019', title: 'Haute tension', district: 'Centrale électrique', par: 480, diff: { dmg: 1.1, acc: 1.08 },
  brief: "Anselme a raison sur un point : sans les pompes de la centrale, la vieille ville se remplit à chaque marée haute. Ce soir, les caméras de la centrale se sont éteintes toutes en même temps. Si quelqu'un veut noyer la vieille ville sans toucher à la Digue, c'est là qu'il frappera.",
  goals: ['Rejoindre la centrale', 'Désamorcer les quatre charges', 'Survivre à la riposte'],
  start: { x: 160, z: -233.5, yaw: Math.PI }, traffic: 5, civs: 2,
  setup(M) { M.gate = Kit.at(160, -262); const C = World.spots.cooling; M.pts = [Kit.at(C[0].x, C[0].z + 25), Kit.at(C[1].x, C[1].z + 25), Kit.at(214, -297), Kit.at(108, -274)]; Pickups.add('health', 160, CURB, -280); Pickups.add('ammo', 130, CURB, -290); Pickups.add('health', 190, CURB, -310); },
  stages: [
    stGo('Rejoignez la centrale', 'Centrale', () => Game.mission.gate, 14, { cp: true, say: [[MAR, "Toutes les caméras de la centrale viennent de s'éteindre, Saline-17. En même temps."]] }),
    stUse('Désamorcez les charges', 'Charge', M => {
      const guards = [['merc', 'mercPistol'], ['mercShot', 'hdrone', 'hdrone'], ['merc', 'mercBaton'], ['mercPistol', 'merc', 'hdrone']];
      return M.pts.map((p, i) => { const g = Kit.squad(guards[i], p.x, p.z, 5, { ai: 'guard' }); for (const a of g) a.tags.target = true; return Object.assign({}, p, { label: 'Désamorcer', hold: 3, busy: 'Désamorçage…', guards: g, toast: 'Charge désamorcée' }); });
    }, { time: 260, fail: 'Les charges ont explosé. Les pompes sont à l’arrêt.', say: [[SOL, "Quatre signaux de détonateur. Minuterie réglée sur 3 h 00."], [OKA, "3 h 00, l'heure de la pleine mer. Désamorce-les, Solis !"]] }),
    stTalk([[ROOK, "Joli travail, boîte de conserve. Mais tu te trompes de cible."], [ROOK, "Ma paye ne dépend pas de la centrale. Elle dépend d'une date. Et cette date approche."], [SOL, "Identifiez-vous."], [ROOK, "Tu me connais déjà, Saline-17. Ton prédécesseur aussi me connaissait."]])
  ],
  outro: "Les charges étaient réglées sur 3 h 00, l'heure de la pleine mer. Sans les pompes, la vieille ville aurait bu la tasse. Quelqu'un chez Sentinelle connaît le calendrier des marées par cœur."
};
CASES.c16 = {
  id: 'c16', no: 'DOSSIER 26-1021', title: 'Les Arcades', district: 'Centre commercial des Arcades', par: 540, diff: { dmg: 1.1, acc: 1.1 },
  brief: "Prise d'otages aux Arcades : des hommes armés retiennent le personnel de nuit. Aucune revendication. Nadia pense savoir pourquoi : les Arcades conservent six mois d'archives vidéo, et Camille Arnaud y est passée le 14 juin au soir. Libère les otages, Solis. Et trouve ce qu'ils veulent effacer.",
  goals: ['Rejoindre les Arcades', 'Libérer les cinq otages', 'Récupérer les archives vidéo', 'Repousser les renforts'],
  start: { x: 300, z: -238, yaw: Math.PI }, traffic: 6, civs: 6,
  resume(M, G, stage) { if (stage >= 2) { for (const h of M.hostages) h.removed = true; for (const g of M.hguards) for (const a of g) a.removed = true; } },
  setup(M) {
    const m = World.spots.mall; M.m = m;
    M.hostages = [[-18, 8], [-6, 18], [10, 14], [22, 4], [4, -10]].map(([dx, dz]) => Kit.civ('civ', m.x + dx, m.z + dz, { victim: true, hp: 160, label: 'Otage' }));
    M.hguards = M.hostages.map((h, i) => Kit.squad(i % 2 ? ['mercPistol'] : ['merc', 'mercBaton'], h.pos.x + 2.5, h.pos.z + 2, 1.5, { ai: 'guard' })); for (const g of M.hguards) for (const a of g) a.tags.target = true;
    Pickups.add('health', m.x - 24, CURB, m.z + 22); Pickups.add('ammo', m.x + 26, CURB, m.z + 20);
  },
  stages: [
    stGo('Rejoignez les Arcades', 'Arcades', () => World.spots.mall, 26, { cp: true, say: [[MAR, "Cinq otages, au moins six preneurs. Pas de revendication, pas de négociateur. Juste toi, Saline-17."], [NAD, "Camille est passée aux Arcades le 14 juin, à 21 h 40. J'ai vérifié ses relevés de carte bancaire. Ils veulent effacer quelque chose."]] }),
    stUse('Libérez les otages', 'Otage', M => M.hostages.map((h, i) => ({ x: h.pos.x, y: h.pos.y, z: h.pos.z, r: 2.4, label: 'Libérer l’otage', hold: 1, busy: 'Libération…', guards: M.hguards[i], toast: 'Otage libéré', onDone: () => h.release() })), {
      say: [[SOL, "Cinq otages. Neutraliser leurs gardiens avant de les libérer."]],
      update(M) { for (let i = 0; i < M.hostages.length; i++) { const h = M.hostages[i], u = M.uses && M.uses[i]; if (u && !u.done && !h.alive) { u.done = true; u.active = false; HUD.toast('Un otage a été touché', '', 'bad'); M.lostHostage = true; } } } }),
    stUse('Récupérez les archives vidéo au poste de sécurité', 'Archives', M => [Object.assign(Kit.at(M.m.x + 14, M.m.z - 18), { label: 'Copier les archives', hold: 2.5, busy: 'Copie des archives…', toast: 'Archives vidéo', sub: 'Fragment 3 / 4' })], { cp: true }),
    stTalk([[S16, "Journal de Saline-16. 14 juin, 21 h 40. Caméra 12 des Arcades."], [S16, "Camille parle avec un homme en costume blanc. Il sourit. Elle ne sourit pas."], [S16, "Il lui tend une enveloppe. Elle la refuse. Il lui dit : « La marée ne demande l'avis de personne, lieutenante. »"], [NAD, "Un costume blanc… Victor Vasseur ne porte que ça."]]),
    stClear('Repoussez les renforts de Sentinelle', 'Mercenaires', M => Kit.squad(['merc', 'merc', 'mercShot', 'mercBaton', 'hdrone'], M.m.x - 30, M.m.z + 24, 6), { say: [[MAR, "Deux fourgons noirs devant l'entrée principale !"]] })
  ],
  outro: M => (M.lostHostage ? "Un otage a été grièvement blessé pendant l'assaut ; les médecins de Saint-Roch se battent pour lui. " : "Les cinq otages sont sains et saufs. ") + "Sur l'image de la caméra 12, l'homme au costume blanc tend une enveloppe à Camille Arnaud : Victor Vasseur. Trois heures plus tard, la centrale explosait, avec Camille et Saline-16 à l'intérieur."
};
CASES.c17 = {
  id: 'c17', no: 'DOSSIER 26-1022', title: 'Boulevard des Néons', district: 'Boulevard des Néons · Lanternes', par: 480, diff: { dmg: 1.12, acc: 1.1 },
  brief: "Pendant l'assaut des Arcades, une berline noire est sortie par le parking arrière. Nadia en est sûre : elle transporte la copie de sauvegarde des archives. Si cette copie disparaît, ce sera ta parole contre celle de Vasseur. Rattrape-la.",
  goals: ['Monter dans la voiture de patrouille', 'Immobiliser la berline du coursier', 'Interpeller le coursier', 'Récupérer le disque dur'],
  start: { x: 250.5, z: -176, yaw: Math.PI }, traffic: 10, civs: 18,
  setup(M) { const n = Kit.node(250, -189), e = Cars.graph.nodes[n].nb[0]; M.car = Kit.laneCar('police', n, e, 0.2, {}); },
  stages: [
    stGo('Montez dans la voiture de patrouille', 'Voiture', () => Game.mission.car.pos, 4, { inCar: true, cp: true, say: [[MAR, "La berline remonte le boulevard des Néons. Elle ne s'arrêtera pas aux feux, Saline-17."], [OKA, "Sors-la de la route. Proprement, si tu peux."]] }),
    stChase('Immobilisez la berline du coursier', 'Berline', { hp: 190, name: 'Berline de Sentinelle', driverLabel: 'Coursier', time: 200,
      spawn(M, G) {
        const a = Kit.node(G.player.pos.x + 40, G.player.pos.z), b = Kit.away(a, G.player.pos.x, G.player.pos.z);
        const c = Kit.laneCar('sedan', a, b, 0.35, { ai: 'chase', driver: 'driver', color: [0.04, 0.04, 0.05] }); Cars.planEdge(c, a, b);
        M.rams = [0.3, 0.6].map(t => { const r = Kit.laneCar('sedan', b, a, t, { ai: 'ram', driver: 'mercPistol', color: [0.05, 0.05, 0.06] }); r.hp = r.maxHp = 100; r.tags.target = true; return r; });
        return c;
      }, say: [[ROOK, "Deux voitures sur le robot. Le coursier passe, quoi qu'il en coûte."]] }),
    stArrest('Interpellez le coursier', 'Coursier', M => M.runner, { lost: 'Le coursier s’est fondu dans le quartier des Lanternes.',
      start(M) { for (const r of M.rams || []) { if (r.dead || r.removed) continue; r.ai = null; r.inp.throttle = 0; r.inp.brake = 1; r.inp.park = true; const d = Kit.eject(r); if (d) d.tags.target = true; } } }),
    stCollect('Récupérez le disque dur', 'Disque dur', M => { const p = M.runner.pos; return [{ x: p.x + 0.7, y: p.y, z: p.z, geo: 'drive', col: [0.2, 0.22, 0.25], e: 0.3, label: 'Copie des archives' }]; }),
    stTalk([[SOL, "Le disque contient la copie des archives. Et un planning."], [SOL, "« Opération Grande Crue. J moins onze. »"], [OKA, "Onze jours avant la plus grande marée de l'année. Ils ne se cachent même plus, Solis."]])
  ],
  outro: "La copie des archives dort au coffre du commissariat. Le planning, lui, est épinglé au mur du bureau d'Okafor : « Opération Grande Crue — J-11 ». Rook compte les jours. Nous aussi, désormais."
};
CASES.c18 = {
  id: 'c18', no: 'DOSSIER 26-1024', title: 'Le Colosse', district: 'Stade de la Marée', par: 600, diff: { dmg: 1.12, acc: 1.12 },
  brief: "Nadia Ferrand a été enlevée devant son journal il y a une heure, juste après avoir publié la photo de Vasseur et de Camille. Sa voiture a été retrouvée devant le stade de la Marée. C'est un piège, Solis, et ils veulent que tu le saches. Vas-y quand même.",
  goals: ['Entrer dans le stade', 'Neutraliser les mercenaires', 'Mettre le Colosse hors d’état de nuire', 'Libérer Nadia', 'Récupérer le dernier fragment'],
  start: { x: 275, z: -19.5, yaw: Math.PI }, traffic: 5, civs: 4,
  setup(M) { M.pitch = Kit.at(324, -81); M.nadia = Kit.civ('nadia', M.pitch.x + 6, M.pitch.z - 8, { label: 'Nadia', victim: true, hp: 200 }); Pickups.add('health', M.pitch.x - 12, CURB, M.pitch.z + 6); Pickups.add('health', M.pitch.x + 14, CURB, M.pitch.z + 10); Pickups.add('ammo', M.pitch.x, CURB, M.pitch.z + 16); },
  stages: [
    stGo('Entrez dans le stade', 'Stade', () => World.spots.stadiumGate, 10, { cp: true, say: [[ROOK, "Tu la veux ? Viens la chercher sur la pelouse, Saline-17. Quelqu'un t'attend."]] }),
    stClear('Neutralisez les mercenaires du stade', 'Stade', M => Kit.squad(['merc', 'merc', 'mercShot', 'mercPistol', 'hdrone', 'hdrone', 'hdrone'], M.pitch.x, M.pitch.z, 14)),
    stArrest('Mettez le Colosse hors d’état de nuire', 'Le Colosse', M => Kit.foe('colosse', M.pitch.x - 10, M.pitch.z + 4, { ai: 'engage', alerted: true, label: 'Le Colosse' }), { boss: true, cp: true,
      say: [[OKA, "Deux mètres cinquante dans un exosquelette de chantier. Fais-le charger contre les poteaux, Solis !"]], onDone: () => Kit.say([[SOL, "Suspect interpellé. Il faudra trois paires de menottes."]]) }),
    stUse('Libérez Nadia', 'Nadia', M => [{ x: M.nadia.pos.x, y: M.nadia.pos.y, z: M.nadia.pos.z, label: 'Libérer Nadia', hold: 1.2, busy: 'Détache les liens…', toast: 'Nadia est libre' }]),
    stTalk([[NAD, "Tu en as mis, du temps, le robot."], [NAD, "Tiens. Le dernier fragment. La mère de Camille me l'a donné hier, avec ses affaires. Je comptais te l'apporter… avant qu'ils me mettent un sac sur la tête."]], 0, { start(M) { const n = M.nadia; n.mode = 'script'; n.victim = false; n.setState('move'); } }),
    stCollect('Récupérez le dernier fragment', 'Fragment', M => { const p = M.nadia.pos; return [{ x: p.x + 0.8, y: p.y, z: p.z, geo: 'drive', col: [0.9, 0.5, 0.15], e: 0.6, glow: [1, 0.6, 0.2], label: 'Fragment de mémoire', sub: '4 / 4' }]; }),
    stTalk([[S16, "Journal de Saline-16. 14 juin, 23 h 58. Centrale électrique."], [S16, "Camille est blessée. Je la porte. Les portes ont été bloquées de l'extérieur."], [S16, "Si quelqu'un trouve ce journal : ce n'était pas un accident."], [S16, "Et à l'unité qui me remplacera : prends soin d'Okafor. Il fait semblant d'être en colère. En vérité, il est seulement triste."], [SOL, "… Message reçu, Saline-16."]])
  ],
  outro: "Dans la nuit, le commissaire divisionnaire Delorme a donné une conférence de presse : « Une unité robotisée défaillante a causé un carnage au stade de la Marée. Saline-17 doit être désactivée sans délai. » La photo de Solis passe en boucle sur toutes les chaînes."
};

/* =====================================================================
   CHAPTER IV — Hors-la-loi
   ===================================================================== */
// shake off black cars that try to ram the robot: done once none is left within `far` metres for five seconds
function stEvade(text, tag, o = {}) {
  return { kind: 'evade', o,
    checkpoint: !!o.cp, cp: o.cpPos,
    start(M, G) {
      const P = G.player, N = Cars.graph.nodes; M.rams = [];
      const cand = N.map((n, i) => ({ i, d: dist2D(n.x, n.z, P.pos.x, P.pos.z) })).filter(q => q.d > 60 && q.d < 135);
      for (let k = 0; k < (o.n || 3) && cand.length; k++) {
        const q = cand.splice(RI(0, cand.length - 1), 1)[0], b = Kit.toward(q.i, P.pos.x, P.pos.z);
        const c = Kit.laneCar('sedan', q.i, b, 0.2, { ai: 'ram', driver: 'mercPistol', color: [0.04, 0.04, 0.05] }); c.hp = c.maxHp = o.hp || 110; c.tags.target = true; M.rams.push(c);
      }
      M.freeT = 0; G.timer = o.time || 180;
      M.obj(text, () => { let b = null, bd = 1e9; for (const c of M.rams) { if (c.dead || c.removed) continue; const d = dist3(c.pos, G.player.pos); if (d < bd) { bd = d; b = c; } } return b ? b.pos : G.player.pos; }, tag);
      if (o.say) Kit.say(o.say); o.start && o.start(M, G);
    },
    update(M, G, dt) {
      if (o.update) { const r2 = o.update(M, G, dt); if (r2) return r2; }
      const P = G.player, far = o.far || 160;
      for (const c of M.rams) if ((c.dead || c.hp <= 0) && c.driver && c.driver !== P) { const d = Kit.eject(c); if (d) d.tags.target = true; }
      const live = M.rams.filter(c => !c.dead && !c.removed && c.hp > 0), near = live.filter(c => dist2D(c.pos.x, c.pos.z, P.pos.x, P.pos.z) < far).length;
      M.freeT = near ? 0 : M.freeT + dt;
      M.objective = near ? `${text} <small>${near} à vos trousses</small>` : `Vous les avez semées… <small>${Math.max(0, Math.ceil(5 - M.freeT))}</small>`;
      if (M.freeT >= 5) { G.timer = null; for (const c of live) { c.removed = true; if (c.driver) c.driver.removed = true; } return true; }
      if (G.timer <= 0) return o.fail || 'Les voitures de Sentinelle vous ont coincé.';
      return false;
    }
  };
}
CASES.c19 = {
  id: 'c19', no: 'DOSSIER 26-1025', title: 'Désactivation', district: 'Commissariat central', par: 480, diff: { dmg: 1.15, acc: 1.12 },
  brief: "Solis, écoute-moi bien, je n'aurai pas le temps de répéter. Delorme a signé ton ordre de désactivation. Une équipe de Sentinelle, « en renfort technique », arrive dans la cour pour te débrancher. Officiellement, je ne peux rien pour toi. Officieusement, la voiture de la cour a le plein, et les clés sont dessus.",
  goals: ['Échapper à l’équipe de désactivation', 'Prendre la voiture de la cour', 'Semer les voitures de Sentinelle', 'Rejoindre le garage de Nadia'],
  start: { x: -2, z: -112, yaw: Math.PI / 2 }, traffic: 8, civs: 12,
  setup(M) { const T = World.spots.train.car; M.car = Kit.car('police', T.x, T.z, T.yaw); M.garage = Kit.at(-54, -35); Pickups.add('health', -10, CURB, -104); Pickups.add('health', -40, CURB, -40); },
  stages: [
    stTalk([[DEL, "À toutes les unités. L'unité robotisée Saline-17 est déclarée défaillante et dangereuse."], [DEL, "Procédez à sa désactivation immédiate. Aucune sommation."], [MAR, "Solis… Ils t'ont coupé l'accès au réseau de la police. Je suis désolée."]], 0, { update(M) { if (!M.orderShown && M.talkT > 3) { M.orderShown = true; HUD.big('Ordre de désactivation', 'Saline-17 est recherché', 'bad', 3); Snd.play('alarm'); } } }),
    stClear('Échappez à l’équipe de désactivation', 'Sentinelle', () => Kit.squad(['hdrone', 'hdrone', 'hdrone', 'hdrone', 'mercBaton', 'mercBaton'], -2, -102, 8), { cp: true, say: [[SOL, "Des unités de patrouille reprogrammées. Et deux agents de Sentinelle avec des matraques électriques."], [SOL, "Ils viennent me débrancher. Je ne suis pas d'accord."]] }),
    stGo('Prenez la voiture de la cour', 'Voiture', () => Game.mission.car.pos, 4, { inCar: true, say: [[OKA, "Je n'ai rien vu, Solis. Je ne vois jamais rien. Cours !"]] }),
    stEvade('Semez les voitures de Sentinelle', 'Sentinelle', { n: 3, time: 180, say: [[MAR, "Trois berlines noires convergent vers le commissariat. Elles ne sont pas là pour discuter."], [MAR, "Enfin… Je n'ai rien dit. Je range mon bureau."]] }),
    stGo('Rejoignez le garage de Nadia, dans la vieille ville', 'Garage', () => Game.mission.garage, 7, { say: [[NAD, "Solis ! Viens au garage de mon oncle, rue des Tanneurs, dans la vieille ville. Je t'ouvre le rideau."]] }),
    stTalk([[NAD, "Entre, vite. Personne ne viendra te chercher ici : mon oncle répare des scooters depuis 1987, et la police ne s'y est jamais intéressée."], [SOL, "Nadia. Je suis recherché."], [NAD, "Bienvenue au club."]])
  ],
  outro: "À l'aube, toutes les chaînes ont diffusé la photo de Solis avec un numéro vert. Dans le garage de l'oncle de Nadia, Solis a vérifié ses liaisons une à une : plus de réseau, plus de matricule, plus d'accès. « Tu n'existes plus », a dit Nadia. « Pour eux. Pour moi, tu existes très bien. »"
};
CASES.c20 = {
  id: 'c20', no: 'DOSSIER 26-1026', title: 'Planque', district: 'Vieille ville · rue des Tanneurs', par: 480, diff: { dmg: 1.15, acc: 1.15 }, from: NAD,
  brief: "C'est moi qui écris ce dossier, puisque plus personne à la police n'a le droit de t'en donner. Le plan : je mets en ligne le journal complet de Saline-16 sur le site de L'Écho. Deux minutes et demie de transfert, avec la connexion du garage. Toi, tu empêches Sentinelle d'entrer. Simple, non ?",
  goals: ['Tenir le garage pendant la mise en ligne', 'Protéger Nadia', 'L’escorter jusqu’à sa voiture'],
  start: { x: -50, z: -33.5, yaw: 0 }, traffic: 6, civs: 8,
  setup(M) {
    M.garage = Kit.at(-54, -35); M.nadia = Kit.civ('nadia', M.garage.x - 1.5, M.garage.z - 1.2, { label: 'Nadia', hp: 160, mode: 'hide' });
    M.ncar = Kit.car('compact', -31.9, -75, 0, { ai: 'parked', color: [0.5, 0.08, 0.1], tags: { noEnter: true } });
    Pickups.add('health', M.garage.x + 6, CURB, M.garage.z + 2); Pickups.add('ammo', M.garage.x - 8, CURB, M.garage.z + 2); Pickups.add('health', M.garage.x, CURB, M.garage.z + 9);
  },
  stages: [
    stDefend('Tenez le garage pendant la mise en ligne', 'Garage', () => Game.mission.garage, { cp: true, time: 150, leash: 32, clearAtEnd: true, protect: 'nadia',
      start(M, G) { M.nadia.mode = 'hide'; M.bar = { name: 'Mise en ligne du journal de Saline-16', k: () => Math.min(0.98, 1 - (G.timer === null ? 0 : G.timer) / 150) }; },
      say: [[NAD, "Transfert lancé. Deux minutes et demie. Ne laisse entrer personne, d'accord ?"]],
      waves: [[3, ['merc', 'mercPistol'], { dist: 30 }], [24, ['hdrone', 'hdrone', 'hdrone'], { dist: 28, say: [[ROOK, "Bonsoir, boîte de conserve. Tu pensais vraiment qu'un garage à scooters allait te cacher ?"]] }],
        [48, ['mercBaton', 'merc', 'mercPistol'], { dist: 32, hunt: true }], [74, ['mercShot', 'hdrone', 'hdrone'], { dist: 30 }], [98, ['merc', 'merc', 'mercBaton'], { dist: 34, hunt: true, say: [[NAD, "Quatre-vingts pour cent ! Tiens bon !"]] }], [122, ['mercPistol', 'mercShot', 'hdrone'], { dist: 30 }]] }),
    stTalk([[NAD, "Quatre-vingt-dix-sept… Quatre-vingt-dix-huit… Non. Non, non, non !"], [NAD, "Plus de courant. Plus rien. Tout le quartier est dans le noir."], [ROOK, "Tu croyais qu'on allait te laisser mettre ça en ligne ? J'ai coupé le quartier. Tout le quartier. Rien que pour toi."], [SOL, "Nadia. Il faut partir."]], 0, { start(M) { M.bar = null; } }),
    stEscort('Escortez Nadia jusqu’à sa voiture', 'Voiture', 'nadia', () => Game.mission.ncar.pos, { r: 5, fem: true,
      update(M, G) { if (!M.amb && dist2D(G.player.pos.x, G.player.pos.z, M.ncar.pos.x, M.ncar.pos.z) < 34) { M.amb = Kit.squad(['merc', 'mercPistol', 'hdrone'], M.ncar.pos.x + 10, M.ncar.pos.z - 12, 3, { ai: 'engage', alerted: true, hunt: M.nadia }); for (const a of M.amb) a.tags.target = true; Kit.say([[SOL, "Trois hostiles près de la voiture. Restez derrière moi."]]); } } }),
    stTalk([[NAD, "Le journal est toujours sur ma clé. On trouvera une autre façon de le diffuser."], [NAD, "Il nous faut quelque chose de plus gros, Solis. Quelque chose qui fasse tomber Delorme en direct, devant tout le monde."]], 0, { start(M) { M.nadia.mode = 'script'; M.nadia.faceYaw = M.nadia.yaw; } })
  ],
  outro: "Le quartier est resté dans le noir jusqu'au matin. Personne n'a su qui avait coupé le courant ; tout le monde a deviné qui l'avait payé. Nadia a dormi trois heures sur la banquette arrière, la clé USB serrée dans le poing."
};
CASES.c21 = {
  id: 'c21', no: 'DOSSIER 26-1027', title: 'La Criée', district: 'Port · La Criée', par: 480, diff: { dmg: 1.15, acc: 1.15 }, from: NAD,
  brief: "Tu ne devineras jamais qui vient d'appeler sur mon portable. Fredo. Oui, ce Fredo-là. Il dit qu'il a « un truc énorme » pour toi, et que des types veulent lui couper les doigts pour le récupérer. Il se cache à la criée. Il a insisté pour que ce soit toi qui viennes : « le seul flic de la ville qui ne peut plus m'arrêter ».",
  goals: ['Rejoindre la criée', 'Protéger Fredo des Rats de Quai', 'Écouter ce qu’il a à dire', 'L’escorter jusqu’à la voiture de Nadia'],
  start: { x: 19.5, z: 100, yaw: Math.PI / 2 }, traffic: 6, civs: 8,
  setup(M) { M.fredo = Kit.civ('fredo', 62, 116, { label: 'Fredo', hp: 120, mode: 'hide' }); M.ncar = Kit.car('compact', 22.1, 58, Math.PI, { ai: 'parked', color: [0.5, 0.08, 0.1], tags: { noEnter: true } }); Pickups.add('health', 44, CURB, 110); Pickups.add('ammo', 66, CURB, 124); },
  stages: [
    stGo('Rejoignez la criée', 'La Criée', () => Game.mission.fredo.pos, 16, { cp: true, say: [[FRE, "Allô ? Le robot ? C'est Fredo. Ne raccrochez pas !"], [FRE, "J'suis derrière la criée, et y a des Rats de Quai qui me cherchent. Pas pour me faire un câlin."], [SOL, "Fredo, vous savez que je suis recherché ?"], [FRE, "Ben oui. C'est pour ça que je vous appelle vous : vous êtes le seul flic qui peut plus m'arrêter. C'est reposant."]] }),
    stClear('Protégez Fredo des Rats de Quai', 'Rats de Quai', M => Kit.squad(['thug', 'thugBat', 'thugKnife', 'gunner', 'gunner', 'thug'], 54, 118, 10, { hunt: M.fredo }), {
      start(M) { M.fredo.mode = 'hide'; }, update: M => !M.fredo.alive ? 'Fredo n’a pas survécu.' : false,
      say: [['Rat de Quai', "Le voilà, le rat ! Et son copain en fer blanc !"], [FRE, "C'est moi qu'ils appellent « le rat » ? Venant d'eux ?"]] }),
    stGo('Rejoignez Fredo', 'Fredo', () => Game.mission.fredo.pos, 2.8, { start(M) { M.fredo.mode = 'script'; M.fredo.setState('move'); } }),
    stTalk([[FRE, "Bon. Vous vous souvenez du gala de la police, le mois dernier ? J'y étais. Comme serveur. Enfin, presque comme serveur."], [FRE, "Et j'ai pris un téléphone. Par réflexe, hein. Celui du commissaire Delorme."], [FRE, "Y a des messages avec un certain « V ». Des virements, des dates, et des trucs sur la Digue. J'y comprends rien, mais ça sent mauvais."], [SOL, "Pourquoi me le donner, Fredo ?"], [FRE, "Trois fois vous m'avez attrapé. Trois fois sans jamais me taper. Je me suis dit que ça méritait une médaille."], [FRE, "Enfin, pas une vraie médaille. J'en avais volé une, mais je l'ai revendue."]]),
    stEscort('Escortez Fredo jusqu’à la voiture de Nadia', 'Voiture', 'fredo', () => Game.mission.ncar.pos, { r: 5,
      update(M, G) { if (!M.amb && dist2D(G.player.pos.x, G.player.pos.z, M.ncar.pos.x, M.ncar.pos.z) < 36) { M.amb = Kit.squad(['merc', 'mercPistol', 'mercBaton'], M.ncar.pos.x + 12, M.ncar.pos.z + 10, 3, { ai: 'engage', alerted: true, hunt: M.fredo }); for (const a of M.amb) a.tags.target = true; Kit.say([[FRE, "Les types en noir ! Ceux-là, ils tapent plus fort que les Rats !"]]); } } }),
    stTalk([[NAD, "Fredo ? LE Fredo ? Celui qui m'a volé mon portefeuille en 2019 ?"], [FRE, "Je vous l'ai rendu, non ?"], [NAD, "Vide."], [FRE, "Frais de service."]], 0, { start(M) { M.fredo.mode = 'script'; M.fredo.faceYaw = M.fredo.yaw; } })
  ],
  outro: "Le téléphone de Delorme contient deux cent quatorze messages échangés avec « V ». Des virements, des horaires de marée, et une photo des vannes du bassin Est. Pour sa peine, Fredo a demandé un sandwich jambon-beurre. Nadia lui en a payé deux."
};
CASES.c22 = {
  id: 'c22', no: 'DOSSIER 26-1028', title: 'Gare de triage', district: 'Gare de triage', par: 540, diff: { dmg: 1.18, acc: 1.15 },
  brief: "Je ne te parle pas, Solis. Je n'ai pas le droit. Alors écoute ce que je ne te dis pas : d'après les messages de Delorme, quatre camions chargés d'explosif de chantier quittent la gare de triage cette nuit. Lot 7, comme les détonateurs de l'entrepôt. Si tu les sabotes avant le départ, personne ne pourra m'accuser de t'avoir prévenu.",
  goals: ['Rejoindre la gare de triage à temps', 'Saboter les camions', 'Récupérer les détonateurs', 'Repousser l’escouade de Rook'],
  start: { x: -73.5, z: -235.5, yaw: Math.PI }, traffic: 6, civs: 4,
  setup(M) {
    M.gate = Kit.at(-46, -257); M.trucks = [-112, -92, -72].map(x => { const c = Kit.car('van', x, -264, Math.PI / 2, { ai: 'parked', color: [0.1, 0.1, 0.11], tags: { noEnter: true } }); c.hp = c.maxHp = 150; return c; });
    Pickups.add('health', -60, CURB, -258); Pickups.add('health', -100, CURB, -258); Pickups.add('ammo', -84, CURB, -270);
  },
  stages: [
    stGo('Rejoignez la gare de triage avant le départ des camions', 'Gare de triage', () => Game.mission.gate, 8, { cp: true, time: 95, fail: 'Les camions ont quitté la gare de triage.', say: [[OKA, "Ceci n'est pas un appel. Départ des camions dans une minute et demie. Fin de l'appel qui n'a pas eu lieu."]] }),
    stUse('Sabotez les camions', 'Camion', M => {
      const guards = [['merc', 'mercPistol'], ['mercShot', 'hdrone', 'hdrone'], ['merc', 'mercBaton', 'hdrone']];
      return M.trucks.map((t, i) => { const p = Kit.at(t.pos.x + 3.9, t.pos.z); const g = Kit.squad(guards[i], p.x, p.z, 5, { ai: 'guard', hpMul: 1.1 }); for (const a of g) a.tags.target = true;
        return Object.assign(p, { label: 'Saboter le camion', hold: 2, busy: 'Sabotage du moteur…', guards: g, toast: 'Camion saboté', onDone: () => { t.hp = t.maxHp * 0.3; FX.smoke(t.pos.x, t.pos.y + 1.2, t.pos.z, [0.25, 0.25, 0.27], 12); Snd.play('crash', t.pos, 0.5); } }); });
    }, { time: 240, fail: 'Les camions ont quitté la gare de triage.', say: [[SOL, "Trois camions. Le quatrième n'est pas là."]] }),
    stCollect('Récupérez la caisse de détonateurs', 'Détonateurs', M => { const t = M.trucks[2].pos; return [{ x: t.x - 1, y: CURB, z: t.z - 4, geo: 'crate', col: [0.3, 0.35, 0.22], e: 0.1, glow: [1, 0.75, 0.3], label: 'Détonateurs', sub: 'Digue de Saline · lot 7' }]; }),
    stClear('Repoussez l’escouade de Rook', 'Sentinelle', () => Kit.squad(['merc', 'merc', 'mercShot', 'mercPistol', 'hdrone', 'hdrone'], -50, -262, 6, { hpMul: 1.1 }), { cp: true, cpPos: { x: -84, z: -262, yaw: Math.PI / 2 },
      say: [[ROOK, "Tu casses mes jouets, Saline-17 ? Mes garçons vont casser les tiens."], [SOL, "Je n'ai pas de jouets."], [ROOK, "C'est bien ce que je dis."]] }),
    stTalk([[SOL, "Trois camions sur quatre. Le dernier est parti avant mon arrivée."], [SOL, "Commandant ? … Commandant Okafor ?"], [MAR, "Solis, c'est Maryse. Okafor ne répond plus. Depuis une heure."]])
  ],
  outro: "Le quatrième camion a été repéré par une caméra de la voirie, en route vers le chantier naval. Et depuis une heure, le téléphone du commandant Okafor sonne dans le vide."
};
CASES.c23 = {
  id: 'c23', no: 'DOSSIER 26-1029', title: 'Le Chantier naval', district: 'Chantier naval', par: 540, diff: { dmg: 1.2, acc: 1.18 }, from: MAR,
  brief: "Solis, c'est Maryse. Rook vient d'appeler le standard, en personne. Il a Okafor. Il dit qu'il l'échangera contre toi, sur la coque en construction du chantier naval. Il dit aussi de venir seul. Je lui ai répondu que tu étais toujours seul, et je le regrette déjà. Ramène-le, Solis. S'il te plaît.",
  goals: ['Rejoindre le chantier naval', 'Neutraliser les mercenaires du quai', 'Monter sur la coque', 'Mettre Rook hors d’état de nuire', 'Libérer Okafor'],
  start: { x: -142.5, z: 118, yaw: -Math.PI / 2 }, traffic: 5, civs: 2,
  setup(M) {
    const H = World.spots.hull; M.oka = Kit.civ('okafor', H.x, H.z + 22, { y: H.y, label: 'Okafor', victim: true, hp: 400 });
    Pickups.add('health', -236, CURB, 150); Pickups.add('ammo', -186, CURB, 150); Pickups.add('health', H.x + 5, H.y, H.z - 20);
  },
  resume(M, G, stage) { if (stage >= 3) { const L = World.spots.hullLadder; const s = World.safeSpot(L.x, L.z - 1.5, 0.35); G.player.pos.set(s.x, s.y, s.z); G.player.yaw = 0; } },
  stages: [
    stGo('Rejoignez le chantier naval', 'Chantier naval', () => ({ x: -236, y: 0, z: 152 }), 14, { cp: true, say: [[ROOK, "Saline-17. J'ai quelque chose qui t'appartient. Un vieux flic grincheux."], [ROOK, "Cale sèche, sur la coque. Viens seul. Enfin… tu es toujours seul, non ?"]] }),
    stClear('Neutralisez les mercenaires du quai', 'Mercenaires', () => Kit.squad(['merc', 'mercPistol', 'hdrone', 'mercBaton'], -240, 156, 7, { hpMul: 1.1 }).concat(Kit.squad(['merc', 'mercShot', 'hdrone'], -188, 156, 6, { hpMul: 1.1 }))),
    stGo('Montez sur la coque par l’échelle de la poupe', 'Coque', () => { const H = World.spots.hull; return { x: H.x + 4, y: H.y, z: 150 }; }, 7, { dy: 2, say: [[SOL, "Une échelle de chantier à la poupe. Quinze mètres."]] }),
    stArrest('Mettez Rook hors d’état de nuire', 'Rook', () => { const H = World.spots.hull; Kit.foe('merc', H.x - 5, H.z - 6, { y: H.y, ai: 'engage', alerted: true, hpMul: 1.15 }); Kit.foe('mercShot', H.x + 5, H.z - 2, { y: H.y, ai: 'engage', alerted: true, hpMul: 1.15 }); return Kit.foe('rook', H.x, H.z + 6, { y: H.y, ai: 'engage', alerted: true, label: 'Rook' }); }, { boss: true, cp: true,
      say: [[ROOK, "Enfin. Tu sais que j'ai démonté ton prédécesseur ? Pièce par pièce. Il n'a pas crié. Toi non plus, j'imagine."], [SOL, "Vous parlez beaucoup, pour quelqu'un qui porte un casque."]] }),
    stUse('Libérez Okafor', 'Okafor', M => [{ x: M.oka.pos.x, y: M.oka.pos.y, z: M.oka.pos.z, label: 'Libérer Okafor', hold: 1.2, busy: 'Détache les liens…', toast: 'Okafor est libre' }]),
    stTalk([[OKA, "… Tu es venu."], [SOL, "Saline-16 m'a demandé de prendre soin de vous."], [OKA, "Il a dit ça ?"], [SOL, "Il a dit que vous faisiez semblant d'être en colère. Et qu'en vérité, vous étiez seulement triste."], [OKA, "… C'est Camille qui lui avait appris à parler comme ça."], [OKA, "Allez. Aide-moi à descendre de ce rafiot. J'ai soixante et un ans, et je déteste les échelles."]], 0, { start(M) { const o = M.oka; o.mode = 'script'; o.victim = false; o.setState('move'); } })
  ],
  outro: "Rook dort en cellule, sans son casque ; il a une tête parfaitement ordinaire. Okafor a passé la nuit à relire les messages de Delorme. À l'aube, il a posé sur la table un carton d'invitation : demain, le commissaire divisionnaire donne une conférence de presse sur le parvis de l'hôtel de ville. « On va lui voler la vedette », a dit Nadia."
};
CASES.c24 = {
  id: 'c24', no: 'DOSSIER 26-1030', title: 'Conférence de presse', district: 'Hôtel de ville', par: 540, diff: { dmg: 1.2, acc: 1.18 }, from: NAD,
  brief: "Delorme parle à 23 heures sur le parvis de l'hôtel de ville, avec toutes les télévisions de la région. Le camion-régie de la télé est garé sur la place. Si tu branches ma clé sur leur console, le journal de Saline-16 passe en direct, sur toutes les chaînes. Le service d'ordre, c'est Sentinelle. Évidemment.",
  goals: ['Rejoindre le parvis de l’hôtel de ville', 'Neutraliser le service d’ordre', 'Diffuser le journal de Saline-16', 'Rattraper Delorme, vivant'],
  start: { x: 0, z: -127.5, yaw: Math.PI }, traffic: 6, civs: 20,
  setup(M) { M.tv = Kit.car('van', 44, -151, Math.PI / 2, { ai: 'parked', color: [0.9, 0.9, 0.92], tags: { noEnter: true } }); Pickups.add('health', 10, CURB, -160); Pickups.add('health', 44, CURB, -176); Pickups.add('ammo', 27, CURB, -150); },
  stages: [
    stGo('Rejoignez le parvis de l’hôtel de ville', 'Hôtel de ville', () => ({ x: 27, y: CURB, z: -160 }), 14, { cp: true, say: [[DEL, "… et c'est pourquoi, mesdames et messieurs, la sécurité de Port-Saline passe par des partenaires privés, fiables et…"], [DEL, "Qu'est-ce que… Sécurité ! Le robot ! Arrêtez-le !"]] }),
    stClear('Neutralisez le service d’ordre de Sentinelle', 'Sentinelle', () => Kit.squad(['merc', 'merc', 'mercPistol', 'mercPistol', 'mercShot', 'mercBaton', 'hdrone', 'hdrone'], 27, -176, 12, { hpMul: 1.1 }), { say: [[NAD, "Les caméras tournent, Solis. Pas de bavure, tout le pays regarde."]] }),
    stUse('Branchez la clé de Nadia sur la régie de la télévision', 'Régie', M => [Object.assign(Kit.at(M.tv.pos.x - 3.6, M.tv.pos.z), { label: 'Brancher la clé', hold: 3, busy: 'Diffusion en cours…', toast: 'En direct sur toutes les chaînes' })]),
    stTalk([[S16, "Journal de Saline-16. 13 juin, 22 h 05. Couloir du bureau du commissaire Delorme. Porte entrouverte."], [VAS, "Deux cent mille euros. Et les rapports sur la Digue disparaissent."], [DEL, "Ils ont déjà disparu, Victor. Et la lieutenante Arnaud ?"], [VAS, "La lieutenante Arnaud visitera la centrale demain soir. Seule."], [NAD, "C'est en direct, Solis. Sur toutes les chaînes."]]),
    stArrest('Rattrapez Delorme, vivant', 'Delorme', () => { const c = World.spots.cityhall; return Kit.foe('delormeRun', c.x, c.z + 1, { y: c.y, ai: 'flee', alerted: true, label: 'Delorme' }); }, { mustLive: true, dead: 'Delorme est mort : sans ses aveux, Vasseur s’en sortira.', lost: 'Delorme s’est enfui dans la nuit.',
      say: [[MAR, "Delorme s'enfuit par l'arrière de la tribune ! Il nous le faut vivant, Solis !"]] }),
    stTalk([[DEL, "Tu crois que ça change quelque chose, machine ? Vasseur a déjà gagné. La Grande Crue, c'est dans trois jours. Avec ou sans moi."], [SOL, "Commissaire Delorme, vous êtes en état d'arrestation. Vous avez le droit de garder le silence."], [SOL, "Je vous le recommande vivement."]])
  ],
  outro: "Quatre-vingt mille personnes ont vu Delorme menotté en direct. À 4 h 12, l'ordre de désactivation de Saline-17 a été annulé, et Okafor nommé commissaire par intérim. Victor Vasseur, lui, a quitté sa tour cinq minutes avant la diffusion. Au large, la météo marine suit une dépression qui se creuse : la tempête arrivera en même temps que la grande marée."
};

/* =====================================================================
   CHAPTER V — La Grande Crue (one stormy night, then the dawn)
   ===================================================================== */
CASES.c25 = {
  id: 'c25', no: 'DOSSIER 26-1102', title: 'Alerte rouge', district: 'Vieille ville · place centrale', par: 600, diff: { dmg: 1.2, acc: 1.2 }, storm: true,
  brief: "Commissaire par intérim depuis trois jours, et déjà ma première tempête. Vigilance rouge, Solis : la grande marée et la tempête arrivent ensemble. Si la Digue cède, la vieille ville sera sous deux mètres d'eau. Des navettes attendent sur la place centrale, mais des habitants sont coincés dans quatre secteurs, et des pillards profitent du chaos. Sors-les de là. Au fait : ton matricule est rétabli. Bon retour parmi nous, Saline-17.",
  goals: ['Évacuer les habitants des quatre secteurs', 'Chasser les pillards', 'Rejoindre les navettes'],
  start: { x: 0, z: 19.5, yaw: Math.PI }, traffic: 3, civs: 4,
  setup(M) {
    M.vans = [-9, 9].map(x => Kit.car('van', x, 22.1, Math.PI / 2, { ai: 'parked', color: [0.92, 0.93, 0.95], tags: { noEnter: true } }));
    M.car = Kit.car('police', -24, 31.9, Math.PI / 2);
    const defs = [
      { name: 'Marché de nuit', x: -100, z: 9, civ: ['civ', 'civ', 'civ'], foes: ['looter', 'looter', 'thugBat'] },
      { name: 'Rue des Tanneurs', x: -54, z: -36, civ: ['petronille', 'civ'], foes: ['looter', 'thugKnife'], pet: true },
      { name: 'Les Entrepôts', x: 108, z: 35, civ: ['civ', 'civ', 'civ'], foes: ['merc', 'mercPistol', 'hdrone'] },
      { name: 'Quai de la grue', x: -46, z: 150, civ: ['civ', 'civ'], foes: ['merc', 'looter', 'looter'] }
    ];
    M.groups = defs.map(g => {
      const s = Kit.at(g.x, g.z);
      const civs = g.civ.map((a, k) => Kit.civ(a, s.x + Math.sin(k * 2.4) * 1.6, s.z + Math.cos(k * 2.4) * 1.6, { mode: 'hide', hp: 120, label: a === 'petronille' ? 'Mme Pétronille' : undefined }));
      const foes = Kit.squad(g.foes, s.x + 3, s.z + 4, 4, { ai: 'guard' }); for (const f of foes) f.tags.target = true;
      Pickups.add('health', s.x - 4, CURB, s.z - 3);
      return Object.assign({ s, civs, foes }, g);
    });
  },
  stages: [
    stUse('Évacuez les habitants des quatre secteurs', 'Habitants', M => M.groups.map(g => ({ x: g.s.x, y: g.s.y, z: g.s.z, r: 3, label: 'Évacuer les habitants', hold: 1.2, busy: 'Évacuation…', guards: g.foes, toast: 'Habitants évacués', sub: g.name,
      onDone: M2 => {
        Kit.evac(M2, g.civs, { x: 0, z: 10 });
        if (g.pet) Kit.say([[PET, "Je ne pars pas sans Monsieur Brioche !"], [SOL, "Madame, le suspect est déjà dans son panier. Dans vos bras."], [PET, "Oh ! Le voilà. Il se cache toujours quand il pleut."]]);
        else Kit.say([[MAR, RP(["Habitants en route vers les navettes. Beau travail.", "Un secteur de plus. Les navettes les attendent.", "Reçu, Saline-17. Ils sont en sécurité."])]]);
      } })), { cp: true, time: 420, fail: 'La marée a envahi les rues avant la fin de l’évacuation.', update: (M, G, dt) => { Kit.evacUpdate(M, dt); },
      say: [[OKA, "Quatre secteurs, Solis : le marché de nuit, la rue des Tanneurs, les Entrepôts et le quai de la grue."], [OKA, "Une voiture t'attend sur la place. La marée n'attendra pas."]] }),
    stGo('Rejoignez les navettes pour le dernier départ', 'Navettes', () => ({ x: 0, y: CURB, z: 20 }), 10, { say: [[MAR, "Tous les secteurs sont vides ! Les navettes n'attendent plus que ton feu vert, Solis."]], update: (M, G, dt) => { Kit.evacUpdate(M, dt); } }),
    stTalk([[MAR, "Dernière navette partie. Mille deux cents personnes évacuées de la vieille ville."], [OKA, "Beau travail. Maintenant, il faut que la vieille ville reste hors de l'eau."], [OKA, "Les pompes de la centrale viennent de s'arrêter. Toutes en même temps. Comme par hasard."]])
  ],
  outro: "Mille deux cents habitants dorment au gymnase de l'université. Mme Pétronille a exigé un coussin pour Monsieur Brioche ; on lui en a trouvé deux. Dehors, le vent force. À la centrale, les pompes se sont tues."
};
CASES.c26 = {
  id: 'c26', no: 'DOSSIER 26-1102-B', title: 'Les Pompes', district: 'Centrale électrique', par: 540, diff: { dmg: 1.25, acc: 1.22 }, storm: true,
  brief: "Sentinelle a pris la centrale et coupé les pompes. Sans elles, chaque vague qui passe par-dessus la Digue reste dans les rues. Il faut réenclencher les trois disjoncteurs principaux, dans l'ordre, sinon tout saute. Ils t'attendent, Solis. Tous. Alors montre-leur pourquoi ils ont eu tort de t'attendre.",
  goals: ['Pénétrer dans la centrale', 'Réenclencher les trois disjoncteurs, dans l’ordre', 'Repousser la contre-attaque'],
  start: { x: 160, z: -233.5, yaw: Math.PI }, traffic: 3, civs: 0,
  setup(M) { M.gate = Kit.at(160, -262); M.pts = [Kit.at(109, -274), Kit.at(216, -296), Kit.at(142, -287)]; Pickups.add('health', 160, CURB, -272); Pickups.add('health', 180, CURB, -300); Pickups.add('ammo', 125, CURB, -280); Pickups.add('health', 130, CURB, -300); },
  stages: [
    stGo('Pénétrez dans la centrale', 'Centrale', () => Game.mission.gate, 12, { cp: true, say: [[MAR, "La centrale ne répond plus. La vieille ville commence à boire la tasse, Solis."]] }),
    stUse('Réenclenchez les disjoncteurs, dans l’ordre', 'Disjoncteur', M => {
      const guards = [['merc', 'merc', 'mercShot'], ['merc', 'mercPistol', 'hdrone', 'hdrone'], ['mercShot', 'merc', 'mercBaton', 'hdrone']];
      const names = ['Disjoncteur de la salle de contrôle', 'Disjoncteur du transformateur', 'Disjoncteur des tours de refroidissement'];
      const lines = [[[SOL, "Premier disjoncteur réenclenché."], [MAR, "Pompe numéro 1 en marche !"]], [[MAR, "Pompe numéro 2 ! Le niveau baisse rue des Tanneurs !"]], [[MAR, "Toutes les pompes tournent ! La vieille ville respire !"]]];
      return M.pts.map((p, i) => { const g = Kit.squad(guards[i], p.x, p.z, 6, { ai: 'guard', hpMul: 1.15 }); for (const a of g) a.tags.target = true; return Object.assign({}, p, { label: names[i], hold: 2.5, busy: 'Réenclenchement…', guards: g, toast: 'Disjoncteur réenclenché', sub: `${i + 1} / 3`, onDone: () => Kit.say(lines[i]) }); });
    }, { ordered: true, time: 330, fail: 'Les rues de la vieille ville sont inondées : les pompes ne redémarreront pas à temps.' }),
    stClear('Repoussez la contre-attaque', 'Sentinelle', () => Kit.squad(['merc', 'merc', 'mercShot', 'mercPistol', 'hdrone', 'hdrone', 'mercBaton'], 160, -262, 9, { hpMul: 1.15 }), { cp: true, cpPos: { x: 150, z: -290, yaw: 0 }, say: [[MAR, "Trois camions noirs à l'entrée de la centrale !"]] }),
    stTalk([[VAS, "Monsieur Solis. Victor Vasseur. Nous n'avons jamais été présentés."], [VAS, "Vous avez sauvé les pompes. Bravo. Mais les pompes ne retiennent pas la mer. La Digue, si."], [VAS, "Et cette nuit, la Digue va s'ouvrir. Mes amitiés à Mme Pétronille."], [SOL, "Il était sur notre fréquence. Depuis le début."]])
  ],
  outro: "Les pompes tournent à plein régime. Sur tous les écrans de la salle de contrôle, le même message clignote : « La marée ne demande l'avis de personne. » Nadia a retrouvé la trace du Trésorier de Vasseur : il embarque cette nuit sur le dernier ferry, tempête ou pas."
};
CASES.c27 = {
  id: 'c27', no: 'DOSSIER 26-1102-C', title: 'Gare maritime', district: 'Gare maritime · ferry de nuit', par: 540, diff: { dmg: 1.25, acc: 1.25 }, storm: true,
  brief: "Le Trésorier de Vasseur tient les comptes de Sentinelle, et surtout la télécommande qui arme les charges de la Digue. Il embarque sur le dernier ferry, qui appareille dans une minute et demie. Pas de trafic avec cette tempête : la route est à toi. Fonce.",
  goals: ['Rejoindre la gare maritime avant le départ', 'Neutraliser les gardes du quai', 'Monter à bord du ferry', 'Interpeller le Trésorier', 'Récupérer la télécommande'],
  start: { x: 0, z: 19.5, yaw: 0 }, traffic: 3, civs: 4,
  setup(M) { M.car = Kit.car('police', 6, 22.1, Math.PI / 2); Pickups.add('health', 176, CURB, 150); Pickups.add('ammo', 200, CURB, 150); Pickups.add('health', 163, 4, 190); Pickups.add('health', 240, 4, 186); },
  stages: [
    stGo('Montez dans la voiture', 'Voiture', () => Game.mission.car.pos, 4, { inCar: true, cp: true, say: [[NAD, "Le Trésorier vient de passer le contrôle des billets. Le ferry lève l'ancre dans une minute et demie !"]] }),
    stGo('Rejoignez la gare maritime avant le départ du ferry', 'Gare maritime', () => World.spots.ferryTerminal, 14, { time: 95, fail: 'Le ferry a appareillé avec le Trésorier à bord.' }),
    stClear('Neutralisez les gardes du quai', 'Quai', () => Kit.squad(['merc', 'merc', 'mercPistol', 'mercShot', 'hdrone'], 176, 152, 9, { hpMul: 1.2 }), { cp: true, cpPos: { x: 189, z: 127.5, yaw: 0 }, say: [[MAR, "Cinq gardes sur le quai. Le ferry n'appareille pas tant que ses passagers de marque ne sont pas à bord."]] }),
    stGo('Montez à bord par la passerelle', 'Passerelle', () => World.spots.ferryDeck, 4, { dy: 1.6 }),
    stClear('Nettoyez le pont du ferry', 'Pont', () => [[162, 186, 'merc'], [163, 195, 'mercPistol'], [190, 179.5, 'mercShot'], [214, 198.5, 'merc'], [236, 184, 'mercBaton'], [239, 196, 'hdrone']].map(([x, z, t]) => Kit.foe(t, x, z, { y: 4, ai: 'engage', alerted: true, hpMul: 1.2 })), { say: [[SOL, "Pont supérieur. Six hostiles. Houle de quatre mètres."], [MAR, "Ne tombe pas à l'eau, Solis. Tu rouilles."]] }),
    stArrest('Interpellez le Trésorier', 'Le Trésorier', () => Kit.foe('tresorier', 242, 190, { y: 4, ai: 'engage', alerted: true, label: 'Le Trésorier' }), { lost: 'Le Trésorier s’est échappé.', say: [['Le Trésorier', "N'approchez pas ! Je suis comptable ! Je sais me servir de ça… en théorie !"]] }),
    stCollect('Récupérez la télécommande', 'Télécommande', M => { const p = M.tgt.pos; return [{ x: p.x + 0.8, y: p.y, z: p.z, geo: 'phone', col: [0.15, 0.15, 0.17], e: 0.4, glow: [1, 0.35, 0.2], label: 'Télécommande', sub: 'Réseau de charges de la Digue' }]; }),
    stTalk([['Le Trésorier', "Vous croyez que M. Vasseur n'a qu'une télécommande ? Les charges sont déjà posées. Minuterie réglée sur la pleine mer."], [SOL, "Combien de charges ?"], ['Le Trésorier', "Cinq. Sur les vannes du bassin Est. Je peux avoir un avocat, maintenant ?"], [SOL, "Vous pouvez même en avoir deux."]])
  ],
  outro: "Le Trésorier a tout avoué pour une remise de peine : cinq charges sur les vannes du bassin Est, reliées à une minuterie réglée sur la pleine mer. 3 h 00. La télécommande ne peut plus rien arrêter : il faudra les désamorcer une par une."
};
CASES.c28 = {
  id: 'c28', no: 'DOSSIER 26-1102-D', title: 'Les Vannes', district: 'Quai des vannes · bassin Est', par: 540, diff: { dmg: 1.28, acc: 1.25 }, storm: true,
  brief: "Cinq charges sur les vannes du bassin Est, le long du quai. Mise à feu automatique à 3 h 00, à la pleine mer. Il te reste cinq minutes, Solis. Anselme est en ligne avec nous : c'est lui qui a construit ces vannes, il va te guider. Et Sentinelle va tout faire pour t'en empêcher.",
  goals: ['Rejoindre le quai des vannes', 'Désamorcer les cinq charges avant 3 h 00', 'Tenir face aux renforts'],
  start: { x: -132, z: 152, yaw: Math.PI / 2 }, traffic: 2, civs: 0,
  setup(M) { M.pts = [-108, -72, -24, 22, 58].map((x, i) => Kit.at(x, i % 2 ? 163 : 166)); Pickups.add('health', -90, CURB, 150); Pickups.add('health', -2, CURB, 150); Pickups.add('ammo', 40, CURB, 150); Pickups.add('health', 70, CURB, 152); },
  stages: [
    stGo('Rejoignez le quai des vannes', 'Vannes', () => Game.mission.pts[0], 10, { cp: true, say: [[ANS, "Jeune machine ? Anselme Roux. Je suis devant les plans des vannes. Et devant une tasse de café, parce qu'il est deux heures du matin."]] }),
    stUse('Désamorcez les charges', 'Charge', M => {
      const guards = [['merc', 'hdrone'], ['mercPistol', 'merc'], ['hdrone', 'hdrone', 'mercShot'], ['merc', 'mercBaton'], ['mercShot', 'merc', 'hdrone']];
      const lines = [[[ANS, "Première charge. Coupez le fil de gauche. Votre gauche, pas la mienne."]], [[ANS, "Elles sont posées exactement là où j'avais signalé des fissures. Douze rapports. Ils les ont lus, finalement."]], [[SOL, "Anselme, les deux fils sont gris."], [ANS, "Alors coupez celui qui a l'air le plus coupable."]], [[ANS, "Plus qu'une ! J'ai construit ces vannes en 1994, vous savez. Je ne pensais pas les sauver trente-deux ans plus tard."]], []];
      return M.pts.map((p, i) => { const g = Kit.squad(guards[i], p.x, p.z - 5, 4, { ai: 'guard', hpMul: 1.2 }); for (const a of g) a.tags.target = true; return Object.assign({}, p, { label: 'Désamorcer', hold: 3, busy: 'Désamorçage…', guards: g, toast: 'Charge désamorcée', sub: `${i + 1} / 5`, onDone: M2 => { M2.defused = (M2.defused || 0) + 1; Kit.say(lines[Math.min(4, M2.defused - 1)]); } }); });
    }, { time: 300, fail: 'Trois heures. Les vannes ont sauté : la vieille ville est sous l’eau.', say: [[MAR, "Minuterie synchronisée : 3 h 00. Tu as cinq minutes."]],
      update(M, G, dt) { M.wT = (M.wT || 0) + dt; if (M.wT > 36 && (M.waves || 0) < 6) { M.wT = 0; M.waves = (M.waves || 0) + 1; const P = G.player.pos; for (const a of Kit.squad(M.waves % 2 ? ['merc', 'mercPistol'] : ['mercShot', 'hdrone', 'hdrone'], P.x + R(-20, 20), P.z - 30, 3, { ai: 'engage', alerted: true, hpMul: 1.2 })) a.tags.target = true; if (M.waves === 1) Kit.say([[MAR, "Des renforts de Sentinelle arrivent par les entrepôts !"]]); } } }),
    stTalk([[MAR, "Cinq charges sur cinq ! Et il est 2 h 57 !"], [ANS, "Écoutez… Vous entendez ? La mer tape, et les vannes tiennent. Trente-deux ans de peinture, et elles tiennent."], [SOL, "Anselme. Sur la dernière charge, il y a un second récepteur. Une autre fréquence."], [OKA, "Un réseau de secours… Et un hélicoptère vient de décoller du toit de la tour Vasseur. Non, attends : il s'y pose."]])
  ],
  outro: "La Digue tient. Mais la dernière charge cachait un second récepteur, relié à un déclencheur de secours que Vasseur garde sur lui. Il s'est retranché au sommet de sa tour, cent cinquante-huit mètres au-dessus de la tempête."
};
CASES.c29 = {
  id: 'c29', no: 'DOSSIER 26-1102-E', title: 'La Tour Vasseur', district: 'Cité financière', par: 600, diff: { dmg: 1.3, acc: 1.28 }, storm: true,
  brief: "Vasseur est au sommet de sa tour avec le déclencheur de secours. Le hall est tenu par ses derniers mercenaires, et son ascenseur privé monte directement au toit. Il lui reste un garde du corps : le Colosse, version améliorée. Solis… s'il y a quelqu'un pour l'arrêter cette nuit, c'est toi.",
  goals: ['Entrer dans la tour Vasseur', 'Prendre l’ascenseur privé', 'Neutraliser la garde du toit', 'Vaincre le Colosse Mk II'],
  start: { x: 162, z: -181.5, yaw: Math.PI }, traffic: 3, civs: 2,
  setup(M) { const S = World.spots.skyscraper; Pickups.add('health', 150, CURB, -192); Pickups.add('ammo', 174, CURB, -192); Pickups.add('health', S.x - 9, S.y, S.z - 9); Pickups.add('health', S.x + 9, S.y, S.z + 9); Pickups.add('ammo', S.x + 9, S.y, S.z - 9); },
  resume(M, G, stage) { if (stage >= 3) Kit.toRoof(true); },
  stages: [
    stGo('Rejoignez le hall de la tour Vasseur', 'Tour Vasseur', () => ({ x: 162, y: CURB, z: -197 }), 9, { cp: true, say: [[OKA, "Le hall est au pied de la tour, côté avenue. Sois prudent, Solis."]] }),
    stClear('Neutralisez la garde du hall', 'Hall', () => Kit.squad(['merc', 'merc', 'mercShot', 'mercPistol', 'hdrone', 'hdrone'], 162, -193, 9, { hpMul: 1.2 })),
    stUse('Prenez l’ascenseur privé', 'Ascenseur', () => [Object.assign(Kit.at(162, -200.6), { label: 'Appeler l’ascenseur', hold: 1.5, busy: 'Montée…', onDone: () => Kit.toRoof() })], { say: [[MAR, "L'ascenseur privé de Vasseur. Musique d'ascenseur comprise, j'imagine."]] }),
    stClear('Neutralisez la garde du toit', 'Toit', () => { const S = World.spots.skyscraper; return [[-8, -8, 'merc'], [8, -6, 'mercShot'], [-7, 6, 'mercPistol'], [6, 2, 'hdrone'], [0, -9, 'hdrone']].map(([dx, dz, t]) => Kit.foe(t, S.x + dx, S.z + dz, { y: S.y, ai: 'engage', alerted: true, hpMul: 1.25 })); }, { cp: true,
      say: [[SOL, "Toit de la tour. Vent à cent dix kilomètres-heure. Cinq hostiles."], [VAS, "Vous êtes tenace, monsieur Solis. C'est une qualité que j'apprécie chez les machines à laver."]] }),
    stArrest('Venez à bout du Colosse Mk II', 'Le Colosse Mk II', () => { const S = World.spots.skyscraper; return Kit.foe('colosse2', S.x, S.z - 7, { y: S.y, ai: 'engage', alerted: true, label: 'Le Colosse · Mk II' }); }, { boss: true, cp: true,
      say: [['Le Colosse', "Trois paires de menottes, la dernière fois. Cette fois, apporte-en quatre."], [OKA, "Sur un toit, il ne peut pas charger bien loin. Fais-le cogner l'antenne !"]] }),
    stTalk([[VAS, "Admirable, monsieur Solis. Vraiment. Mais je ne me bats jamais sur le terrain des autres."], [SOL, "Hélicoptère en approche… Il repart. Cap au sud, vers le vieux phare."], [OKA, "Le déclencheur de secours. Il va le relier au relais du phare, là où la Digue rejoint la jetée."]], 0, { start() { Snd.play('whoosh', null, 0.9, 0.5); } })
  ],
  outro: "Le Colosse Mk II est redescendu par le monte-charge, sous bonne garde. Victor Vasseur, lui, s'est posé sur la jetée du vieux phare, à l'endroit même où tout a commencé. La pleine mer culmine dans vingt minutes."
};
CASES.c30 = {
  id: 'c30', no: 'DOSSIER 26-1102-F', title: 'Le Dernier Phare', district: 'Jetée du vieux phare', par: 720, diff: { dmg: 1.3, acc: 1.3 }, storm: true,
  brief: "Tout finit là où tout a commencé, Solis : au vieux phare. Vasseur y a posé son hélicoptère, et il porte le Léviathan, l'exosquelette de chantier conçu pour bâtir sa « Saline Nouvelle ». Le relais du déclencheur est au sommet du phare. Arrête-le, coupe ce relais, et reviens-nous entier. C'est un ordre.",
  goals: ['Traverser la jetée', 'Arrêter Victor Vasseur', 'Couper le relais au sommet du phare'],
  start: { x: 95, z: 150, yaw: 0 }, traffic: 3, civs: 2,
  setup(M, G) {
    Kit.car('police', 101, 146, Math.PI); G.beamC = [1.7, 0.3, 0.22];
    const lanes = [[93, 186, 'merc'], [97, 191, 'hdrone'], [95, 199, 'mercShot'], [93, 208, 'merc'], [97, 212, 'mercPistol'], [95, 221, 'hdrone'], [92, 228, 'mercShot'], [98, 229, 'merc']];
    M.jetty = lanes.map(([x, z, t]) => Kit.foe(t, x, z, { y: 0, ai: 'guard', yaw: Math.PI, hpMul: 1.25 }));
    Pickups.add('health', 95, 0, 204); Pickups.add('ammo', 93, 0, 180); Pickups.add('health', 82, 0, 236); Pickups.add('health', 108, 0, 236); Pickups.add('ammo', 95, 0, 226);
  },
  resume(M, G, stage) { if (stage >= 1) for (const a of M.jetty) a.removed = true; if (stage >= 1) { const s = World.safeSpot(95, 230, 0.35); G.player.pos.set(s.x, s.y, s.z); G.player.yaw = 0; } },
  bossPhase(M, boss, ph, G) {
    Kit.say([[VAS, ph === 1 ? "Messieurs ! Montrez à cette machine ce que coûte un contrat résilié !" : "Encore ! Je vous paie le triple !"]]);
    const br = World.spots.braziers; for (let k = 0; k < 2; k++) { const b = br[(ph * 2 + k) % br.length]; const e = Kit.foe(k === 0 && ph === 2 ? 'mercShot' : 'merc', b[0], b[1] - 1.5, { y: 0, ai: 'engage', alerted: true, hpMul: 1.1 }); e.tags.target = true; FX.smoke(e.pos.x, 1, e.pos.z, [0.4, 0.4, 0.45], 12); }
  },
  stages: [
    stGo('Traversez la jetée jusqu’au phare', 'Phare', () => ({ x: 95, y: 0, z: 236 }), 7, { cp: true, say: [[OKA, "La lumière du phare est rouge. Vasseur a pris le contrôle du relais. Avance, Solis. Doucement."]] }),
    stArrest('Arrêtez Victor Vasseur', 'Victor Vasseur', () => { const A = World.spots.lighthouse.arena; return Kit.foe('leviathan', A.x, A.z + 4, { y: 0, ai: 'engage', alerted: true, label: 'Victor Vasseur', yaw: Math.PI }); }, { boss: true, cp: true,
      start() { HUD.big('Victor Vasseur', '« La marée ne demande l’avis de personne. »', 'bad', 3.2); Snd.play('magic'); Music.target = 1; },
      say: [[VAS, "Le progrès est une vague, monsieur Solis. On surfe dessus, ou on se noie."], [SOL, "Victor Vasseur, vous êtes en état d'arrestation pour le meurtre de la lieutenante Camille Arnaud et la destruction de l'unité Saline-16."], [VAS, "« L'unité ». Vous voyez ? Même vous, vous n'arrivez pas à dire son nom comme on dit un nom."], [SOL, "Saline-16. Il s'appelait Saline-16."]] }),
    stUse('Coupez le relais au sommet du phare', 'Relais', () => { const L = World.spots.lighthouse; return [{ x: L.x, y: L.top, z: L.z - 1.5, r: 2.4, label: 'Couper le relais', hold: 2, busy: 'Coupure du relais…', toast: 'Relais coupé', sub: 'La Digue est sauvée', onDone: (M, G) => { G.beamC = null; HUD.big('Relais coupé', 'La lumière du phare redevient blanche.', 'good', 3); Snd.play('win'); } }]; }, { cp: true, cpPos: { x: 95, z: 238, yaw: 0 },
      say: [[OKA, "Vasseur est à nous. Monte là-haut et coupe ce relais. L'échelle est côté jetée. Dernière ligne droite, Solis."]] }),
    stTalk([[MAR, "Relais coupé. À toutes les unités : la Digue tient. Je répète, la Digue tient !"], [NAD, "Et Vasseur a avoué face caméra. Enfin, il a surtout insulté la caméra. Mais ça compte."], [ANS, "Regardez la mer, jeune machine. Elle monte, elle frappe, et elle redescend. Comme toujours."], [OKA, "Solis."], [SOL, "Commissaire."], [OKA, "Camille aurait été fière de toi. Saline-16 aussi."], [SOL, "… Je crois que je suis fier aussi. Est-ce que c'est comme ça que ça marche ?"], [OKA, "C'est exactement comme ça que ça marche."], [MAR, "Au fait : Mme Pétronille a déposé des madeleines au commissariat. Pour le gentil robot."], [OKA, "Je les goûte d'abord. On ne sait jamais."]], 0, { obj: 'Regardez le jour se lever sur Port-Saline', start() { Env.toDawn(); Music.target = 0.3; } })
  ],
  outro: "Victor Vasseur a été inculpé pour le meurtre de la lieutenante Camille Arnaud et la destruction de l'unité Saline-16 ; Delorme a tout confirmé pour alléger sa peine. La Digue a tenu. Au matin, la mer est redescendue et, pour la première fois depuis des semaines, il ne pleuvait plus sur Port-Saline. Au commissariat, à côté de la photo de Camille, quelqu'un a accroché une petite plaque orange : S-16.\n\n— FIN —"
};

/* ---------------- the case board follows the chapters ---------------- */
(function () {
  const byId = Object.assign({}, CASES); for (const m of MISSIONS) byId[m.id] = m;
  MISSIONS.splice(0, MISSIONS.length, ...CHAPTERS.flatMap(c => c.ids.map(id => byId[id]).filter(Boolean)));
})();

