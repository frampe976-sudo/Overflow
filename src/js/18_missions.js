/* =====================================================================
   MISSIONS — scripted cases + free patrol
   ===================================================================== */
const OKA = 'Cdt. Okafor', PC = 'PC Radio', SOL = 'Unité Solis';
function spawnEnemy(type, x, z, o = {}) { const e = new Enemy(type, x, z, o); Game.addActor(e); return e; }
function spawnCiv(x, z, o = {}) { const c = new Civilian(x, z, o); Game.addActor(c); return c; }
function activeFoe(a) { return a && a.alive && !a.removed && !a.cuffed && !a.arrestable && a.state !== 'surrender'; }
function neutral(a) { return !a || !a.alive || a.removed || a.cuffed; }

const MISSIONS = [
  {
    id: 'm1', no: 'DOSSIER 26-0917', title: 'Première ronde', district: 'Marché de nuit · vieille ville', par: 360,
    brief: "Solis, pour ta première nuit en service actif, tu fais une ronde au Marché de nuit. Des vols à l'arraché se multiplient depuis l'alerte crue, et les gens ne sont pas encore habitués aux unités robotisées : reste visible, protège les passants. Et souviens-toi : un suspect se ramène menotté, pas sur une civière.",
    goals: ['Rejoindre le Marché de nuit', 'Neutraliser et interpeller les agresseurs', 'Poursuivre le voleur sur les toits', 'Rendre le sac à la victime'],
    start: { x: 0, z: -88.3, yaw: 0 }, traffic: 9, civs: 24,
    setup(M, G) {
      const S = World.spots;
      M.victim = spawnCiv(S.marketVictim.x, S.marketVictim.z, { mode: 'victim', yaw: -Math.PI / 2 }); M.victim.victim = true; M.victim.tags.noArrest = true;
      M.m1 = spawnEnemy('mugger', S.marketVictim.x - 1.6, S.marketVictim.z + 0.6, { ai: 'script', weapon: null, yaw: Math.PI / 2 });
      M.m2 = spawnEnemy('mugger', S.marketVictim.x - 1.2, S.marketVictim.z - 1.4, { ai: 'script', weapon: null, yaw: Math.PI / 3 });
      M.thief = spawnEnemy('thief', S.thiefPath[0].x, S.thiefPath[0].z, { ai: 'script', yaw: -Math.PI / 2 });
      for (const m of [M.m1, M.m2]) { m.koTime = 45; m.victim = M.victim; }
      M.thief.koTime = 45;
    },
    stages: [
      { checkpoint: true, start(M) { M.obj('Rejoignez le Marché de nuit', World.spots.market, 'Marché'); HUD.say(OKA, "Solis, ici Okafor. Commence ta ronde par le Marché de nuit, deux rues à l'ouest. Ouvre l'œil."); },
        update(M, G) { return dist3(G.player.pos, World.spots.market) < 16; } },
      { start(M) {
          M.obj('Neutralisez puis interpellez les agresseurs', () => M.m1.alive && !M.m1.cuffed ? M.m1.pos : M.m2.pos, 'Agresseurs');
          HUD.say(PC, 'À toutes les unités : agression en cours au Marché de nuit.'); HUD.say(SOL, 'Police ! Lâchez-la !');
          for (const m of [M.m1, M.m2]) { m.ai = 'engage'; m.alert(); m.tags.target = true; }
          M.victim.mode = 'victim';
        },
        update(M, G) {
          const done = [M.m1, M.m2].filter(neutral).length; M.progress = `${done}/2`;
          return done >= 2;
        } },
      { checkpoint: true, start(M) {
          const T = M.thief; T.path = World.spots.thiefPath; T.ai = 'path'; T.pi = 1; T.tags.target = true; T.tags.label = 'Voleur'; T.alerted = false;
          M.obj('Rattrapez le voleur qui s’enfuit par les toits', () => T.pos, 'Voleur');
          HUD.say(PC, "Un troisième complice vient d'arracher un sac ! Il grimpe sur les toits."); HUD.say(OKA, 'Ne le lâche pas, Solis. Les échelles de secours, les toits, tout.');
          M.victim.mode = 'script'; M.victim.faceYaw = 0; M.victim.setState('move'); M.victim.victim = false;
        },
        update(M, G) {
          const T = M.thief;
          if (!T.alive || T.cuffed || T.removed) return true;
          if (T.arrestable && !M.th2) { M.th2 = true; HUD.say(SOL, 'Terminé pour toi.'); }
          return false;
        } },
      { start(M) {
          const T = M.thief; const p = T.pos;
          M.bag = Pickups.add('item', p.x + 0.8, p.y, p.z, { geo: 'bag', col: [0.55, 0.2, 0.3], e: 0.2, glow: [1, 0.8, 0.3], scale: 1.5, onCollect: () => { M.hasBag = true; HUD.toast('Sac récupéré', '', 'gold', true); } });
          M.obj('Récupérez le sac volé', () => M.bag.pos, 'Sac');
          if (T.alive && T.cuffed) HUD.say(OKA, 'Beau travail. Rends le sac à sa propriétaire, elle attend au marché.');
        },
        update(M, G) {
          if (M.hasBag && !M.bagStage) { M.bagStage = true; M.obj('Rendez le sac à la victime', () => M.victim.pos, 'Victime'); }
          if (M.hasBag && dist3(G.player.pos, M.victim.pos) < 2.6) { HUD.say('Passante', "Merci… Merci infiniment. Tout mon salaire était dedans."); return true; }
          return false;
        } }
    ]
  },
  {
    id: 'm2', no: 'DOSSIER 26-0921', title: 'Les Rats de Quai', district: 'Docks · parc à conteneurs', par: 480,
    brief: "Depuis l'évacuation des entrepôts, le gang des Rats de Quai tient les docks. Ils ont volé une caisse d'armes au port. Fais baisser la criminalité du secteur, récupère la caisse et ramène-moi leur chef, celui qu'ils appellent le Grutier.",
    goals: ['Faire passer la criminalité des docks sous 30 %', "Récupérer la caisse d'armes volée", 'Interpeller le Grutier'],
    start: { x: -54, z: 76, yaw: 0 }, traffic: 7, civs: 10, crime: 82, crimeTarget: 30,
    setup(M, G) {
      Cars.add(new Car('police', -46, 81 - PARK, -Math.PI / 2));
      const K0 = World.coreBlock(0, 4), K1 = World.coreBlock(1, 4);
      const g = [
        ['thug', K1.cx - 8, K1.lz0 + 6], ['thugBat', K1.cx + 4, K1.lz0 + 6.5], ['thugKnife', K1.cx - 2, K1.lz0 + 13.5], ['thug', K1.cx + 10, K1.lz0 + 21],
        ['gunner', K1.cx - 6, K1.lz0 + 21], ['thug', K0.cx, K0.lz0 + 6], ['thugBat', K0.cx - 6, K0.lz0 + 13.5], ['gunner', K0.cx + 8, K0.lz0 + 21],
        ['thugKnife', -80, 150], ['thug', -70, 158], ['gunner', -95, 152], ['thugBat', -30, 150]
      ];
      M.gang = g.map(([t, x, z]) => spawnEnemy(t, x, z, { ai: 'patrol', homeR: 4, yaw: R(0, TAU) }));
      // gunners perched on container stacks
      const perch = World.boxes.filter(b => b.kind === 'cont' && b.x0 > -128 && b.x1 < -34 && b.z0 > 88 && b.z1 < 128 && b.y1 > 5 && b.y1 < 6).slice(0, 2);
      perch.forEach(b => M.gang.push(spawnEnemy('gunner', (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, { y: b.y1, ai: 'guard', yaw: Math.PI })));
      Pickups.add('health', K1.lx0 + 2, CURB, K1.lz1 - 2); Pickups.add('ammo', K0.lx1 - 2, CURB, K0.lz0 + 2); Pickups.add('health', -60, 0, 146);
      Pickups.add('weapon', K0.cx + 3, CURB, K0.lz0 + 9.5, { weapon: 'bat' });
    },
    stages: [
      { checkpoint: true, start(M) { M.obj('Réduisez la criminalité des docks sous 30 %', () => M.nearestGang(), 'Rats de Quai'); HUD.say(OKA, "Les docks sont à toi, Solis. Chaque suspect interpellé fait baisser la criminalité du secteur. Les tirs à vue, j'en veux le moins possible."); },
        update(M, G) { return G.crime <= G.crimeTarget; } },
      { start(M) { const c = World.spots.crate; M.crate = Pickups.add('item', c.x, c.y, c.z, { geo: 'crate', col: [0.3, 0.35, 0.22], e: 0.1, glow: [1, 0.75, 0.3], beam: true, onCollect: () => { M.gotCrate = true; Game.player.giveWeapon('shotgun', 18); HUD.toast("Caisse d'armes récupérée", 'Fusil à pompe', 'gold', true); } }); M.obj("Récupérez la caisse d'armes sur les conteneurs", () => M.crate.pos, 'Caisse'); HUD.say(PC, "La caisse est au sommet d'une pile de conteneurs, au centre du parc. Il faudra grimper."); },
        update(M) { return M.gotCrate; } },
      { checkpoint: true, start(M) {
          const c = World.spots.crane; M.boss = spawnEnemy('grutier', c.x, c.z, { ai: 'engage', alerted: false, tags: { target: true, label: 'Le Grutier' } }); Game.boss = M.boss;
          spawnEnemy('thugBat', c.x - 4, c.z - 3, { ai: 'patrol' }); spawnEnemy('thug', c.x + 4, c.z - 2, { ai: 'patrol' });
          M.obj('Interpellez le Grutier, près de la grue', () => M.boss.pos, 'Le Grutier');
          HUD.say(PC, 'Le Grutier est sous la grue orange, sur le quai.'); HUD.say(OKA, 'Il charge comme un taureau. Esquive, et laisse-le percuter un mur.');
        },
        update(M) { const B = M.boss; if (B.cuffed) return true; if (!B.alive) { M.bossKilled = true; return true; } return false; } }
    ]
  },
  {
    id: 'm3', no: 'DOSSIER 26-0924', title: 'Code 3', district: 'Centre-ville · boulevards', par: 300,
    brief: "Une camionnette de la secte de la Marée transporte quelque chose d'important. Elle va passer devant le commissariat d'une minute à l'autre. Prends une voiture de patrouille, gyrophare allumé, et immobilise-la. Je veux le coursier vivant.",
    goals: ['Monter dans la voiture de patrouille', 'Immobiliser la camionnette (percutez-la ou tirez depuis la voiture)', 'Interpeller le coursier', 'Fouiller la camionnette'],
    start: { x: 3, z: -88.3, yaw: 0 }, traffic: 12, civs: 20,
    setup(M) { const s = World.spots.policeCar; M.car = Cars.add(new Car('police', s.x, s.z, s.yaw)); },
    stages: [
      { checkpoint: true, start(M) { M.obj('Montez dans la voiture de patrouille', () => M.car.pos, 'Voiture'); HUD.say(OKA, 'La voiture est devant l’entrée. Dépêche-toi, ils arrivent.'); },
        update(M, G) { return G.player.car === M.car || (G.player.car && G.player.car.police); } },
      { checkpoint: true, start(M, G) {
          const N = Cars.graph.nodes; const a = Cars.graph.idx(CI + 0, CJ + 1), b = Cars.graph.idx(CI + 1, CJ + 1);
          const p = Cars.laneP(N[a], N[b], 0.4);
          M.van = Cars.add(new Car('van', p.x, p.z, Math.atan2(p.dx, p.dz), { ai: 'chase', driver: 'cultist', color: [0.12, 0.14, 0.16], tags: { target: true } }));
          M.van.from = a; M.van.to = b; Cars.planEdge(M.van, a, b); M.van.hp = M.van.maxHp = 260;
          G.timer = 180; M.vanBar = true;
          M.obj('Immobilisez la camionnette : percutez-la ou tirez dessus', () => M.van.pos, 'Camionnette');
          HUD.say(PC, "Camionnette sombre, direction est, rue des Calfats ! Elle ne s'arrêtera pas."); HUD.say(OKA, `Gyrophare, Solis. ${Input.glyph('siren')} Et frappe-la par l'arrière, ou sur le flanc.`);
        },
        update(M, G) {
          if (M.van.dead) return true;
          if (G.timer <= 0) return 'La camionnette a disparu dans le trafic.';
          const d = dist3(M.van.pos, G.player.pos); if (d > 230) { M.farT = (M.farT || 0) + G.dt; if (M.farT > 8) return 'La camionnette vous a semée.'; } else M.farT = 0;
          return false;
        } },
      { start(M, G) {
          G.timer = null; M.vanBar = false; const v = M.van; v.tags.target = false; v.ai = null;
          const lx = -v.fz, lz = v.fx;
          if (v.driver) { v.driver.removed = true; v.driver = null; }
          M.courier = spawnEnemy('courier', v.pos.x + lx * 2, v.pos.z + lz * 2, { ai: 'flee', alerted: true, tags: { target: true, label: 'Coursier' } }); M.courier.fleeAfter = false;
          M.guard = spawnEnemy('cultist', v.pos.x - lx * 2.2, v.pos.z - lz * 2.2, { ai: 'engage', alerted: true });
          M.obj('Interpellez le coursier', () => M.courier.pos, 'Coursier');
          HUD.say(PC, 'La camionnette est immobilisée ! Le coursier part à pied !'); HUD.big('Véhicule immobilisé', '', 'good', 2.2); Snd.play('objective');
        },
        update(M, G) { const c = M.courier; if (c.cuffed) return true; if (c.removed) return 'Le coursier s’est échappé.'; if (!c.alive) return 'Le coursier est mort : la piste est perdue.'; return false; } },
      { start(M, G) {
          const v = M.van; const it = { pos: new V3(v.pos.x - v.fx * (v.len / 2 + 0.8), v.pos.y, v.pos.z - v.fz * (v.len / 2 + 0.8)), text: 'Fouiller', r: 2.2, use: () => { it.active = false; M.searched = true; Snd.play('pickup'); HUD.toast('Plan du phare', 'Pièce à conviction', 'tide', true); } };
          G.interactables.push(it); M.obj('Fouillez l’arrière de la camionnette', () => it.pos, 'Fouiller');
          HUD.say(OKA, "Bien joué. Fouille la camionnette avant que les renforts n'arrivent.");
        },
        update(M) { if (M.searched && !M.doneT) { M.doneT = 1; HUD.say(SOL, 'Un plan du vieux phare… annoté « Grande Marée, 3 h 00 ».'); HUD.say(OKA, "Le phare. C'est là qu'ils vont frapper. Rentre au poste, Solis."); } if (M.doneT) { M.doneT += 0.016; return M.doneT > 1.8; } return false; } }
    ]
  },
  {
    id: 'm4', no: 'DOSSIER 26-0927', title: 'Grande Marée', district: 'Jetée du vieux phare', par: 540,
    brief: "C'est cette nuit. La secte s'est retranchée au vieux phare, au bout de la jetée. Leur Héraut veut « ouvrir les vannes » à la marée haute. Tous les effectifs sont mobilisés sur l'évacuation : tu es la seule unité disponible, Solis. Arrête le Héraut et coupe leur signal.",
    goals: ['Traverser la jetée tenue par la secte', 'Arrêter le Héraut de la Marée', 'Monter au sommet du phare et couper le signal'],
    start: { x: 95, z: 150, yaw: 0 }, traffic: 5, civs: 6, cult: true,
    setup(M, G) {
      Cars.add(new Car('police', 101, 146, Math.PI));
      const lanes = [[93, 186, 'cultist'], [97, 190, 'cultist'], [95, 198, 'cultShot'], [93, 208, 'cultist'], [97, 212, 'cultRifle'], [95, 222, 'cultShot'], [92, 228, 'cultist'], [98, 229, 'cultist']];
      M.jetty = lanes.map(([x, z, t]) => spawnEnemy(t, x, z, { ai: 'guard', yaw: Math.PI, y: 0 }));
      Pickups.add('health', 95, 0, 204); Pickups.add('ammo', 93, 0, 180); Pickups.add('health', 82, 0, 236); Pickups.add('ammo', 108, 0, 236);
      Game.cultBeam = true;
    },
    stages: [
      { checkpoint: true, start(M) { M.obj('Traversez la jetée jusqu’au phare', { x: 95, y: 0, z: 234 }, 'Phare'); HUD.say(OKA, 'Tu vois le faisceau vert ? Leur « signal ». Ils attendent la marée haute pour le grand final. Avance prudemment.'); },
        update(M, G) { return G.player.pos.z > 233 && G.player.pos.y > -0.5; } },
      { checkpoint: true, start(M, G) {
          const A = World.spots.lighthouse.arena; M.boss = spawnEnemy('herald', A.x, A.z + 4, { ai: 'engage', alerted: true, tags: { target: true, label: 'Le Héraut' }, yaw: Math.PI }); Game.boss = M.boss;
          M.boss.lethalOnly = false; M.boss.koTime = 9999;
          M.obj('Arrêtez le Héraut de la Marée', () => M.boss.pos, 'Le Héraut');
          HUD.big('Le Héraut de la Marée', '« La mer reprendra tout. »', 'tide', 3.2); HUD.say('Le Héraut', 'Une machine de la police contre la marée ? Agenouille-toi, ferraille, et regarde les vagues venir.');
          Snd.play('magic'); Music.target = 1;
        },
        update(M, G) { const B = M.boss; if (B.cuffed) return true; if (!B.alive) { M.bossKilled = true; return true; } return false; } },
      { checkpoint: true, start(M, G) {
          const L = World.spots.lighthouse; M.boss && (M.boss.tags.target = false); Game.boss = null;
          const it = { pos: new V3(L.x, L.top, L.z - 1.5), text: 'Couper le signal', r: 2.4, use: () => { it.active = false; M.cut = true; Game.cultBeam = false; Snd.play('win'); HUD.big('Signal coupé', 'La lumière du phare redevient blanche.', 'good', 3); } };
          G.interactables.push(it);
          M.obj('Montez au sommet du phare et coupez le signal', () => it.pos, 'Signal');
          HUD.say(OKA, "Le Héraut est à nous. Monte là-haut et éteins cette saleté de lumière verte. L'échelle est côté jetée.");
        },
        update(M) { if (M.cut) { M.cutT = (M.cutT || 0) + 0.016; if (M.cutT > 0.2 && !M.saidEnd) { M.saidEnd = true; HUD.say(OKA, "Solis… la marée monte, mais personne n'ouvrira les vannes cette nuit. Rentre te recharger. Tu l'as bien mérité."); } return M.cutT > 3.2; } return false; } }
    ]
  }
];
/* ---------------- training course (Entraînement): every action, one step at a time ---------------- */
const TRAIN_STEPS = (() => {
  const g = a => Input.glyph(a), dev = () => Input.device, P = () => Game.player, S = () => World.spots.train;
  const near = (x, z, r) => dist2D(P().pos.x, P().pos.z, x, z) < r;
  const moveTxt = () => dev() === 'touch' ? 'joystick à gauche' : dev() === 'pad' ? 'stick gauche' : `<kbd>${Input.moveKeys()}</kbd>`;
  const lookTxt = () => dev() === 'touch' ? 'glissez le doigt à droite' : dev() === 'pad' ? 'stick droit' : 'souris';
  const driveTxt = () => dev() === 'touch' ? 'joystick, Gaz, Frein' : dev() === 'pad' ? `${g('gas')} ${g('brake')} et stick gauche` : `<kbd>${Input.moveKeys()}</kbd>`;
  const inState = (M, k, st) => { if (P().state === st) M[k] = true; return !!M[k]; };
  return [
    { t: () => `Rejoignez le repère · ${moveTxt()}`, m: () => ({ x: -6, y: CURB, z: -110 }), tag: 'Repère', ok: () => near(-6, -110, 1.7) },
    { t: () => `Tournez la caméra · ${lookTxt()}`, ok: M => (M.look = (M.look || 0) + Math.abs(Input.look.x) + Math.abs(Input.look.y)) > 2.2 },
    { t: () => `Sprintez jusqu'au repère · ${g('sprint')}`, m: () => ({ x: 9.6, y: CURB, z: -110.5 }), tag: 'Sprint', ok: M => { if (P().sprinting) M.sprinted = true; return M.sprinted && near(9.6, -110.5, 2.1); } },
    { t: () => `Courez vers le muret et sautez pour le franchir · ${g('jump')}`, m: () => ({ x: 12.7, y: CURB + 1, z: -110.5 }), tag: 'Muret', ok: M => inState(M, 'vaulted', 'vault') && P().pos.x > 13.2 && P().state === 'move' },
    { t: () => `Faites une roulade · ${g('dodge')}`, ok: M => inState(M, 'rolled', 'roll') && P().state === 'move' },
    { t: () => `Sautez, agrippez le rebord du bloc et hissez-vous · ${g('jump')}`, m: () => ({ x: 12.5, y: CURB + 2.5, z: -121.5 }), tag: 'Rebord',
      ok: () => { const b = S().block, p = P().pos; return P().state === 'move' && p.y > b.top - 0.25 && p.x > b.x0 - 0.2 && p.x < b.x1 + 0.2 && p.z > b.z0 - 0.2 && p.z < b.z1 + 0.2; } },
    { t: () => `Descendez et grimpez à l'échelle du commissariat · ${g('action')}`, m: () => ({ x: 16.6, y: CURB, z: -98 }), tag: 'Échelle', ok: M => inState(M, 'lad', 'ladder') && P().pos.y > 10.5 && P().state === 'move' },
    { t: () => `Prenez la tyrolienne · ${g('action')} près du poteau`, m: () => ({ x: 8, y: 11, z: -105.4 }), tag: 'Tyrolienne', ok: M => inState(M, 'zipped', 'zip') && P().state === 'move' && P().grounded },
    { t: () => `Un robot d'entraînement arrive : verrouillez-le · ${g('lock')}${dev() === 'kbm' ? ' ou clic molette' : ''}`, bot: 'passive', m: M => M.bot && M.bot.pos, tag: 'Robot', ok: M => P().lock === M.bot && !!M.bot },
    { t: () => `Enchaînez trois coups · ${g('punch')} ×3`, bot: 'passive', ok: M => M.ev.punch >= 3 },
    { t: () => `Donnez un coup de pied · ${g('kick')}`, bot: 'passive', ok: M => M.ev.kick >= 1 },
    { t: () => `Il attaque : maintenez la parade quand il frappe · ${g('block')}`, bot: 'active', ok: M => M.ev.block >= 1 },
    { t: () => `Mettez-le à terre, puis interpellez-le · ${g('action')}`, bot: 'arrest', ok: M => !!M.bot && M.bot.cuffed },
    { t: () => `Sortez votre pistolet · ${g('next')}${dev() === 'kbm' ? ' ou <kbd>2</kbd>' : ''}`, ammo: true, ok: () => P().cur === 'pistol' },
    { t: () => `Tirez sur les trois cibles (${S().targets.filter(x => x.hit).length}/3) · ${dev() === 'kbm' ? g('aim') + ' viser, ' + g('fire') + ' tirer' : g('lock') + ' puis ' + g('fire')}`, aim: true, ammo: true, m: () => S().shootLine, tag: 'Pas de tir', ok: () => S().targets.every(x => x.hit) },
    { t: () => dev() === 'touch' ? `Videz le chargeur : la recharge est automatique · ${g('fire')}` : `Rechargez · ${g('reload')}`, ammo: true, ok: M => { if (P().reloadT > 0) M.rel = true; return !!M.rel; } },
    { t: () => `Montez dans la voiture de patrouille · ${g('action')}`, m: M => M.car && M.car.pos, tag: 'Voiture', ok: M => P().car === M.car },
    { t: () => `Allumez le gyrophare · ${g('siren')}`, ok: M => !!(M.car && M.car.siren) },
    { t: () => `Tirez par la fenêtre, visée assistée · ${g('carfire')}`, ammo: true, ok: M => (M.carShots || 0) >= 1 },
    { t: () => `Sortez par le portail jusqu'au repère · ${driveTxt()}`, m: () => ({ x: -27, y: 0, z: -112 }), tag: 'Repère', ok: () => !!P().car && dist2D(P().car.pos.x, P().car.pos.z, -27, -112) < 6.5 },
    { t: () => `Remontez l'avenue jusqu'au repère · ${driveTxt()}`, m: () => ({ x: -27, y: 0, z: -52 }), tag: 'Repère', ok: () => !!P().car && dist2D(P().car.pos.x, P().car.pos.z, -27, -52) < 8 },
    { t: () => `Arrêtez-vous et sortez de la voiture · ${g('exit')}`, ok: () => P().state !== 'car' && !P().car }
  ];
})();
const TRAINING = {
  id: 'train', no: 'MODULE DE FORMATION', title: 'Entraînement', district: 'Cour du commissariat', training: true,
  start: { x: -13, z: -109, yaw: Math.PI / 2 }, traffic: 0, civs: 0,
  goals: ['Se déplacer, sprinter, franchir, grimper', 'Verrouiller une cible et combattre', 'Tirer, conduire'],
  brief: "Avant ta première nuit, un tour de la cour du commissariat pour vérifier tous tes systèmes.",
  setup(M, G) {
    const T = World.spots.train;
    // each board is also an aim point: the lock button and the assisted aim (touch, pad) can pick it
    M.aimables = T.targets.map(x => (x.aimable = { aim: true, aimY: x.y, pos: new V3(x.x, x.y - 1.2, x.z + 0.05), h: 1.2, alive: true, alerted: true, hittable: true, hp: 1, maxHp: 1, team: 'target', state: 'idle', tags: {}, id: 'board' + x.x }));
    for (const x of T.targets) {
      x.hit = false;
      x.box.onHit = sh => { if (sh !== G.player || x.hit) return; x.hit = true; x.aimable.alive = false; Snd.play('coin', { x: x.x, y: x.y, z: x.z }, 0.9); FX.spark(x.x, x.y, x.z + 0.1, 0.8, 14, [0.4, 1, 0.5]); };
    }
    M.car = Cars.add(new Car('police', T.car.x, T.car.z, T.car.yaw));
    G.dmgTaken = 0.5; M.ev = { punch: 0, kick: 0, block: 0 };
    M.spawnBot = () => {
      if (M.bot && M.bot.alive && !M.bot.removed) return;
      const s = World.safeSpot(T.botSpot.x, T.botSpot.z, 0.4);
      M.bot = spawnEnemy('drone', s.x, s.z, { ai: 'engage', alerted: true, yaw: 0, tags: { label: 'Robot d’entraînement', keep: true } });
      FX.smoke(s.x, s.y + 1, s.z, [0.9, 0.5, 0.15], 10);
    };
    M.retireBot = () => { const B = M.bot; if (!B) return; if (G.player.lock === B) G.player.setLock(null); FX.smoke(B.pos.x, B.pos.y + 1, B.pos.z, [0.6, 0.6, 0.65], 10); B.removed = true; B.alive = false; M.bot = null; };
    M.refill = () => { const P = G.player; if (!P.inv.pistol) P.inv.pistol = { mag: 12, res: 24 }; const i = P.inv.pistol; i.res = Math.max(i.res, 24); if (i.mag + i.res < 12) i.mag = 12; };
  },
  stages: TRAIN_STEPS.map((S, i) => ({
    start(M, G) {
      const P = G.player, c = M.car;
      M.ev = { punch: 0, kick: 0, block: 0 }; M.look = 0; M.carShots = 0; M.nudged = false;
      // snapshot of where this step began, for « Recommencer l'étape »
      M.snap = { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw, inCar: P.state === 'car', car: c ? { x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw } : null };
      G.aimables = S.aim ? M.aimables : [];
      if (S.bot) { M.spawnBot(); P.equip('fists'); } // hand-to-hand steps: fists, so punch / kick buttons are there
      if (S.bot === 'arrest' && M.bot) M.bot.hp = Math.min(M.bot.hp, M.bot.maxHp * 0.35); // a couple of hits put it down
      if (S.ammo) M.refill();
      M.obj(S.t(M), S.m ? () => S.m(M) : null, S.tag || '');
      M.objLabel = `Entraînement · ${i + 1}/${TRAIN_STEPS.length}`;
    },
    update(M, G) {
      M.objective = S.t(M);
      if (S.bot) {
        const B = M.bot;
        if (!B || B.removed || !B.alive) M.spawnBot(); // a destroyed training robot is replaced
        else if (S.bot !== 'arrest' && (B.cuffed || B.state === 'beingCuffed')) { M.retireBot(); M.spawnBot(); } // arrested too early: a fresh one takes over
        else {
          B.fleeAfter = false; if (B.ai === 'flee') { B.ai = 'engage'; B.alerted = true; } // it never runs away
          if (S.bot !== 'arrest') {
            if (B.hp < B.maxHp * 0.6) B.hp = B.maxHp * 0.6; // no knock-out before the arrest step…
            if ((B.state === 'ko' || B.state === 'down') && B.downT > B.st + 1.2) B.downT = B.st + 1.2; // …and a quick get-up after a knock-down
          }
          if (S.bot === 'passive') B.atkCd = Math.max(B.atkCd, 1);
        }
      } else if (M.bot && M.bot.cuffed && M.stageT > 1.6) M.retireBot(); // the arrested robot is taken away
      if (S.ammo) { const inv = G.player.inv.pistol; if (!inv || inv.mag + inv.res < 12) M.refill(); }
      if (M.stageT > 50 && !M.nudged) { M.nudged = true; HUD.toast('Bloqué ?', 'Pause › Recommencer l’étape', 'gold'); }
      return S.ok(M, G) === true;
    }
  })),
  // « Recommencer l'étape » (pause menu): back to where the step began, with a fresh robot / targets / car
  restartStep(M, G) {
    const S = TRAIN_STEPS[M.stage], P = G.player, sn = M.snap; if (!S || !sn || !P) return;
    P.setLock(null); P.lockT = null; P.reloadT = 0;
    const car = M.car;
    if (P.car) { P.car.speed = 0; P.car.vx = P.car.vz = 0; Cars.exit(P.car, P); }
    if (car && sn.car) { car.pos.set(sn.car.x, sn.car.y, sn.car.z); car.yaw = sn.car.yaw; car.vx = car.vz = 0; car.speed = 0; car.dead = false; car.sinking = false; car.hp = car.maxHp; car.fireT = 0; car.burnT = 0; car.burnt = false; car.inp.throttle = 0; car.inp.brake = 0; car.inp.park = true; }
    if (sn.inCar && car) { Cars.enter(car, P); }
    else { P.pos.set(sn.x, sn.y, sn.z); P.vel.set(0, 0, 0); P.setState('move'); P.yaw = sn.yaw; P.grounded = false; }
    CamCtl.reset(sn.yaw);
    if (S.bot && M.bot) M.retireBot();
    if (S.aim) for (const x of World.spots.train.targets) { x.hit = false; x.aimable.alive = true; }
    if (S.bot === 'arrest') M.bot = null;
    for (const k of ['sprinted', 'vaulted', 'rolled', 'lad', 'zipped', 'rel']) M[k] = false;
    M.stageT = 0; this.stages[M.stage].start(M, G);
    HUD.toast('Étape recommencée', `${M.stage + 1}/${TRAIN_STEPS.length}`, 'gold');
  },
  // target lamps: red until hit, then green
  render(M) {
    const I = CharRender.inst.lamp, T = World.spots.train; if (!I || !T) return;
    const m = this._m || (this._m = M4.create()), id = this._id || (this._id = M4.create()), k = 0.5 + 0.5 * Math.sin(Env.time * 6);
    for (const x of T.targets) { M4.compose(m, x.x, x.y + 0.62, x.z - 0.05, 0, 0, 0); if (x.hit) I.pushMul(m, id, 0.25, 1, 0.4, 2.6); else I.pushMul(m, id, 1, 0.15, 0.1, 1.2 + k * 1.6); }
  }
};
const PATROL = { id: 'patrol', no: 'PATROUILLE', title: 'Patrouille libre', district: 'Toute la ville', start: { x: 0, z: -88.3, yaw: 0 }, traffic: 13, civs: 30, crime: 55, patrol: true, stages: [] };

class MissionRun {
  constructor(def) { this.def = def; this.stage = -1; this.objective = ''; this.marker = null; this.markerTag = ''; this.t = 0; this.stageT = 0; this.progress = ''; this.checkpointStage = 0; }
  obj(text, marker, tag) { this.objective = text; this.marker = marker || null; this.markerTag = tag || ''; Snd.play('radio', null, 0.3); }
  markerPos() { const m = this.marker; if (typeof m === 'function') return m() || Game.player.pos; return m || Game.player.pos; }
  nearestGang() { let b = null, bd = 1e9; for (const a of this.gang || []) { if (!activeFoe(a) && !a.arrestable) continue; const d = dist3(a.pos, Game.player.pos); if (d < bd) { bd = d; b = a; } } return b ? b.pos : World.spots.yard; }
  start(fromStage = 0) {
    this.stage = fromStage - 1; this.t = 0;
    this.next();
  }
  next() {
    this.stage++; const S = this.def.stages[this.stage];
    if (!S) { Game.missionComplete(); return; }
    this.stageT = 0; this.progress = '';
    if (S.checkpoint) { this.checkpointStage = this.stage; Game.checkpoint = { stage: this.stage, crime: Game.crime }; }
    if (this.stage > 0) Snd.play('objective');
    S.start && S.start(this, Game);
  }
  update(dt) {
    this.t += dt; this.stageT += dt;
    const S = this.def.stages[this.stage]; if (!S) return;
    const r = S.update ? S.update(this, Game, dt) : false;
    if (r === true) this.next(); else if (typeof r === 'string') Game.missionFailed(r);
    if (this.def.id === 'm3' && this.vanBar && this.van) { Game.bossProxy = this.van; }
  }
}

/* ---------------- free patrol crimes ---------------- */
const Patrol = {
  events: [], nextT: 8, timeUp: 0,
  reset() { this.events = []; this.nextT = 6; this.timeUp = 0; },
  update(dt) {
    const G = Game; this.nextT -= dt; this.timeUp += dt;
    if (this.timeUp > 40) { this.timeUp = 0; G.addCrime(1); }
    const N = MP.host && MP.state === 'play' ? MP.robots().length : 1; // a brigade gets more work, and tougher
    if (this.nextT <= 0 && this.events.filter(e => !e.done).length < 2 + Math.floor((N - 1) / 2)) { this.nextT = R(35, 55) / (1 + 0.22 * (N - 1)); this.spawn(N); }
    for (const e of this.events) {
      if (e.done) continue; e.t += dt;
      const r = e.check(e);
      if (r === true) { e.done = true; G.addCrime(-e.reward); G.score += e.team ? 400 : 250; G.tellAll('toast', 'Délit résolu', `−${e.reward} % criminalité`, 'gold'); Snd.play('objective'); HUD.say(PC, RP(['Bien reçu Saline-17, affaire classée.', 'Merci Saline-17. Le secteur respire.', 'Reçu, beau travail.'])); }
      else if (r === 'fail' || e.t > e.limit) { e.done = true; G.addCrime(4); G.tellAll('toast', 'Délit non résolu', '+4 % criminalité', 'bad'); }
    }
    this.events = this.events.filter(e => !e.done || e.t < 1);
    // objective = nearest open event
    const open = this.events.filter(e => !e.done); const M = G.mission;
    if (open.length) { open.sort((a, b) => dist3(a.pos(), G.player.pos) - dist3(b.pos(), G.player.pos)); const e = open[0]; M.objective = e.label + ` <small>${fmtTime(e.limit - e.t)}</small>`; M.marker = () => e.pos(); M.markerTag = e.tag; }
    else { M.objective = 'Patrouillez. Restez à l’écoute de la radio.'; M.marker = null; }
  },
  // the people in a stopped car get out (its driver, and the crew it carried) to run or to fight
  unload(c, crew, ai, hp) {
    const out = [], d = c.driver;
    if (d) { d.inCar = null; d.hidden = false; d.setState('move'); const s = World.safeSpot(c.pos.x - c.fz * 2, c.pos.z + c.fx * 2, 0.35); d.pos.set(s.x, s.y, s.z); d.ai = ai; d.alerted = true; d.tags.target = true; d.tags.label = ai === 'flee' ? 'Chauffeur' : ''; c.driver = null; out.push(d); }
    (crew || []).forEach((t, i) => { const side = i % 2 ? 1 : -1, back = 1.2 + i * 0.8, s = World.safeSpot(c.pos.x + c.fz * 2 * side - c.fx * back, c.pos.z - c.fx * 2 * side - c.fz * back, 0.35); const e = spawnEnemy(t, s.x, s.z, Object.assign({ ai, alerted: true }, hp || {})); e.tags.target = true; out.push(e); });
    c.tags.target = false;
    return out;
  },
  // where the robots are: one of them (at random in a brigade) is the centre a new crime is placed around
  anchor() { const L = MP.host && MP.state === 'play' ? MP.robots().filter(r => r.alive) : []; return (L.length ? RP(L) : Game.player).pos; },
  spot(minD, maxD) {
    const P = this.anc || Game.player.pos;
    const rings = World.nav.rings.filter(q => { const d = dist2D(q.cx, q.cz, P.x, P.z); return d > minD - 40 && d < maxD + 40; });
    for (let i = 0; i < 40 && rings.length; i++) {
      const ring = RP(rings); const k = RI(0, 3); const p = ring.pts[k], q = ring.pts[(k + 1) % 4]; const t = R(0.2, 0.8);
      const x = lerp(p[0], q[0], t), z = lerp(p[1], q[1], t); const d = dist2D(x, z, P.x, P.z);
      if (d > minD && d < maxD) return { x, z };
    }
    return { x: P.x + 60, z: P.z };
  },
  spawn(N = 1, force) {
    // a brigade (multiplayer) also gets jobs made for a team: an armoured van to chase, a shop robbery with a getaway car
    const kinds = ['agression', 'rixe', 'vol', 'toits', 'secte'].concat(N >= 2 ? ['fourgon', 'bijouterie'] : []); const kind = force || RP(kinds);
    let e = null; this.anc = this.anchor(); const A = this.anc, hp = { hpMul: 1 + 0.15 * (N - 1) };
    if (kind === 'agression') {
      const s = this.spot(50, 140); const v = spawnCiv(s.x, s.z, { mode: 'victim' }); v.victim = true; v.tags.noArrest = true;
      const m = spawnEnemy('mugger', s.x + 1.3, s.z + 0.5, Object.assign({ ai: 'mug' }, hp)); m.victim = v; m.yaw = angleTo(m.pos.x, m.pos.z, v.pos.x, v.pos.z);
      e = { label: 'Agression en cours', tag: 'Agression', reward: 6, limit: 80, list: [m], pos: () => m.alive && !m.removed ? m.pos : v.pos, check: () => neutral(m) || m.arrestable ? (m.cuffed || !m.alive ? true : false) : (m.removed ? 'fail' : false) };
      e.check = () => { if (m.cuffed || (!m.alive && !m.removed)) { v.release && v.release(); return true; } if (m.removed) return 'fail'; return false; };
      HUD.say(PC, `À toutes les unités : agression signalée ${World.crossName(s.x, s.z)}.`);
    } else if (kind === 'rixe') {
      const s = this.spot(60, 150); const list = ['thug', 'thugBat', 'thugKnife'].concat(N >= 3 ? ['gunner'] : [], N >= 5 ? ['thugBat'] : []).map((t, i) => spawnEnemy(t, s.x + Math.sin(i * 2.1) * 2, s.z + Math.cos(i * 2.1) * 2, Object.assign({ ai: 'patrol', homeR: 3 }, hp)));
      e = { label: 'Rixe entre bandes', tag: 'Rixe', reward: 8, limit: 110, list, pos: () => { const a = list.find(x => x.alive && !x.cuffed && !x.removed); return a ? a.pos : { x: s.x, y: 0, z: s.z }; }, check: () => list.every(neutral) ? true : false };
      HUD.say(PC, `Rixe signalée ${World.crossName(s.x, s.z)}. Plusieurs individus armés.`);
    } else if (kind === 'vol') {
      const GN = Cars.graph.nodes; let a, b; for (let i = 0; i < 30; i++) { a = RI(0, 35); b = RP(GN[a].nb); if (dist2D(GN[a].x, GN[a].z, A.x, A.z) > 70) break; }
      const p = Cars.laneP(GN[a], GN[b], 0.5); const c = Cars.add(new Car(RP(['sedan', 'compact']), p.x, p.z, Math.atan2(p.dx, p.dz), { ai: 'chase', driver: 'driver', tags: { target: true } }));
      c.from = a; c.to = b; Cars.planEdge(c, a, b); c.hp = c.maxHp = 90;
      e = { label: 'Voiture volée : immobilisez-la', tag: 'Voiture volée', reward: 9, limit: 150, car: c, pos: () => e.driver ? e.driver.pos : c.pos,
        check: () => { if (c.dead && !e.driver) { const d = c.driver; if (d) { d.inCar = null; d.setState('move'); d.pos.set(c.pos.x - c.fz * 2, c.pos.y, c.pos.z + c.fx * 2); d.ai = 'flee'; d.alerted = true; d.tags.target = true; d.tags.label = 'Voleur'; c.driver = null; e.driver = d; e.label = 'Interpellez le voleur'; c.tags.target = false; } } if (e.driver) { if (e.driver.cuffed) return true; if (e.driver.removed || !e.driver.alive) return 'fail'; } if (c.removed) return 'fail'; return false; } };
      HUD.say(PC, 'Vol de véhicule en cours, le suspect roule dangereusement. Interceptez.');
    } else if (kind === 'fourgon') { // chase it (a driver and a shooter at the window), then its crew comes out fighting
      const GN = Cars.graph.nodes; let a = 0, b = 1; for (let i = 0; i < 40; i++) { a = RI(0, GN.length - 1); b = RP(GN[a].nb); const d = dist2D(GN[a].x, GN[a].z, A.x, A.z); if (d > 80 && d < 220) break; }
      const p = Cars.laneP(GN[a], GN[b], 0.5), c = Cars.add(new Car('van', p.x, p.z, Math.atan2(p.dx, p.dz), { ai: 'chase', driver: 'gunner', tags: { target: true }, color: [0.2, 0.24, 0.2] }));
      c.from = a; c.to = b; Cars.planEdge(c, a, b); c.hp = c.maxHp = 220 + 40 * N;
      const crew = ['mercPistol', 'thugBat'].concat(N >= 3 ? ['merc'] : []);
      e = { label: 'Fourgon blindé braqué : immobilisez-le', tag: 'Fourgon', reward: 14, limit: 200, car: c, team: true, list: null,
        pos: () => { if (e.list) { const x = e.list.find(q => q.alive && !q.cuffed && !q.removed); return x ? x.pos : c.pos; } return c.pos; },
        check: () => {
          if (c.dead && !e.list) { e.list = this.unload(c, crew, 'engage', hp); e.label = 'Braqueurs du fourgon : neutralisez-les'; HUD.say(PC, 'Le fourgon est arrêté ! Les braqueurs sortent, ils sont armés.'); }
          if (e.list) return e.list.every(neutral) ? true : false;
          return c.removed ? 'fail' : false;
        } };
      HUD.say(PC, `Braquage d’un fourgon blindé ${World.crossName(p.x, p.z)} ! Il fonce : un robot au volant, un autre au tir.`);
    } else if (kind === 'bijouterie') { // robbers at a shop; their car waits down the street and runs when it turns bad
      const s = this.spot(60, 160);
      const types = ['gunner', 'gunner', 'thugBat', 'thugKnife'].concat(N >= 3 ? ['mercPistol'] : [], N >= 5 ? ['merc'] : []);
      const list = types.map((t, i) => spawnEnemy(t, s.x + Math.sin(i * 1.7) * 2.2, s.z + Math.cos(i * 1.7) * 2.2, Object.assign({ ai: 'guard', homeR: 3 }, hp)));
      for (const x of list) x.tags.target = true;
      const GN = Cars.graph.nodes, na = Cars.nearestNode(s.x, s.z), nb = RP(GN[na].nb), lp = Cars.laneP(GN[na], GN[nb], 0.35);
      const c = Cars.add(new Car(RP(['sedan', 'compact']), lp.x, lp.z, Math.atan2(lp.dx, lp.dz), { ai: 'chase', driver: 'driver', tags: { target: true } }));
      c.from = na; c.to = nb; Cars.planEdge(c, na, nb); c.hold = true; c.hp = c.maxHp = 110;
      e = { label: 'Braquage de bijouterie', tag: 'Braquage', reward: 16, limit: 210, list, car: c, team: true,
        pos: () => { const x = list.find(q => q.alive && !q.cuffed && !q.removed); return x ? x.pos : e.driver ? e.driver.pos : c.pos; },
        check: () => {
          const active = list.filter(q => !neutral(q)).length, fighting = list.filter(q => !neutral(q) && !q.down && q.state !== 'surrender').length;
          if (c.hold && (fighting <= Math.floor(list.length / 2) || MP.robots().some(r => dist2D(r.pos.x, r.pos.z, c.pos.x, c.pos.z) < 10))) { c.hold = false; e.label = 'Braquage : la voiture des braqueurs s’enfuit'; HUD.say(PC, 'La voiture des braqueurs démarre ! Ne la laissez pas filer.'); }
          if (c.dead && !e.driver && c.driver) e.driver = this.unload(c, null, 'flee', hp)[0];
          const carDone = e.driver ? neutral(e.driver) : c.dead && !c.driver;
          if (e.driver && e.driver.removed && !e.driver.cuffed) return 'fail'; // the driver got away
          return active === 0 && carDone ? true : false;
        } };
      HUD.say(PC, `Braquage d’une bijouterie ${World.crossName(s.x, s.z)} ! Plusieurs individus armés, une voiture les attend.`);
    } else if (kind === 'toits') {
      const cand = World.buildings.filter(b => b.ladders.length && b.h > 6 && b.h < 18 && dist2D((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, A.x, A.z) > 50 && dist2D((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, A.x, A.z) < 160);
      if (!cand.length) return; const b = RP(cand); const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      const list = [spawnEnemy('thug', cx - 1, cz, Object.assign({ y: b.h, ai: 'guard' }, hp)), spawnEnemy(chance(0.5) ? 'gunner' : 'thugKnife', cx + 1.5, cz + 1, Object.assign({ y: b.h, ai: 'guard' }, hp))];
      if (N >= 3) list.push(spawnEnemy('thugBat', cx + 0.5, cz - 1.5, Object.assign({ y: b.h, ai: 'guard' }, hp)));
      e = { label: 'Cambrioleurs sur un toit', tag: 'Toit', reward: 8, limit: 150, list, pos: () => { const a = list.find(x => x.alive && !x.cuffed && !x.removed); return a ? a.pos : { x: cx, y: b.h, z: cz }; }, check: () => list.every(neutral) ? true : false };
      HUD.say(PC, `Cambriolage par les toits ${World.crossName(cx, cz)}. Une échelle de secours donne accès au toit.`);
    } else {
      const s = this.spot(60, 150); const list = [spawnEnemy('cultist', s.x, s.z, Object.assign({ ai: 'patrol', homeR: 3 }, hp)), spawnEnemy('cultist', s.x + 2, s.z + 1, Object.assign({ ai: 'patrol', homeR: 3 }, hp)), spawnEnemy(chance(0.5) ? 'cultShot' : 'cultist', s.x - 2, s.z + 1, Object.assign({ ai: 'patrol', homeR: 3 }, hp))];
      if (N >= 3) list.push(spawnEnemy(chance(0.5) ? 'cultRifle' : 'cultist', s.x, s.z - 2, Object.assign({ ai: 'patrol', homeR: 3 }, hp)));
      e = { label: 'Prêcheurs de la Marée armés', tag: 'Secte', reward: 9, limit: 130, list, pos: () => { const a = list.find(x => x.alive && !x.cuffed && !x.removed); return a ? a.pos : { x: s.x, y: 0, z: s.z }; }, check: () => list.every(neutral) ? true : false };
      HUD.say(PC, `Des membres de la secte menacent des passants ${World.crossName(s.x, s.z)}.`);
    }
    if (e) { e.t = 0; e.kind = kind; this.events.push(e); }
  }
};

