// Test du module Destin dans le vrai jeu, simulation pas à pas sans rendu (window.__OF.test).
// Usage : node tools/build.js && node tools/test-destin.js [capture.png]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ok = [], ko = [];
const check = (name, cond, info) => (cond ? ok : ko).push(name + (cond ? '' : ' → ' + JSON.stringify(info)));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 90000 });
  await p.click('#menu-title .mi[data-go="patrol"]');
  const E = f => p.evaluate(f);
  await E(() => { const T = __OF.test; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(60); });
  check('la patrouille démarre', await E(() => __OF.Game.mode === 'play'), await E(() => __OF.Game.mode));
  // helpers in the page: tap a key for 2 frames, then let n frames run
  await E(() => { window.tap = (k, n = 0) => { __OF.test.step(2, 1 / 60, [k]); if (n) __OF.test.step(n); }; window.P = () => __OF.Game.player; window.atk = () => P().atk && P().atk.name; window.placeFoe = () => { const Q = P(); foe.pos.x = Q.pos.x + Math.sin(Q.yaw) * 1.1; foe.pos.z = Q.pos.z + Math.cos(Q.yaw) * 1.1; }; window.upFoe = () => { let n = 0; while (foe.down && n++ < 600) __OF.test.step(1); const Q = P(); foe.pos.x = Q.pos.x + Math.sin(Q.yaw) * 1.1; foe.pos.z = Q.pos.z + Math.cos(Q.yaw) * 1.1; }; });
  // 1. fists chain, presses buffered during each blow
  const chain = await E(() => { const r = []; for (let i = 0; i < 4; i++) { tap('KeyJ'); r.push(atk()); __OF.test.step(Math.round(__OF.ATK[atk()].cancel * 60) + 1); } __OF.test.step(120); return r.join(); });
  check('chaîne de poings : jab → cross → hook → p_upper', chain === 'jab,cross,hook,p_upper', chain);
  // 2. pause combo: one blow, let it end, wait ~0.4 s, press again
  const pz = await E(() => { tap('KeyJ'); let n = 0; while (P().atk && n++ < 120) __OF.test.step(1); __OF.test.step(24); tap('KeyJ'); const a = atk(); __OF.test.step(120); return a; });
  check('combo à pause : p_shove', pz === 'p_shove', pz);
  // waiting too long resets the chain
  const late = await E(() => { tap('KeyJ'); let n = 0; while (P().atk && n++ < 120) __OF.test.step(1); __OF.test.step(90); tap('KeyJ'); const a = atk(); __OF.test.step(120); return a; });
  check('trop attendre recommence la chaîne', late === 'jab', late);
  // 3. weapon chains
  const bat = await E(() => { P().giveWeapon('bat'); P().combo = 0; P().idleAtk = 9; const r = [0, 1, 2].map(() => __OF.Destin.nextPunch(P())).join(); P().combo = 0; P().equip('fists'); return r; });
  check('chaîne de la batte', bat === 'batSwing,p_swing2,p_overhead', bat);
  // 4. Fate gauge fills on hits against a foe standing in front
  const fate = await E(() => {
    const Q = P(); Q.fate = 0; const e = __OF.spawnEnemy('thug', Q.pos.x + Math.sin(Q.yaw) * 1.1, Q.pos.z + Math.cos(Q.yaw) * 1.1, {}); e.hp = e.maxHp = 5000; e.superArmor = true; e.poiseMax = 1e9; window.foe = e; // stays on its feet: the test hits it again and again
    for (let i = 0; i < 6; i++) { e.pos.x = Q.pos.x + Math.sin(Q.yaw) * 1.1; e.pos.z = Q.pos.z + Math.cos(Q.yaw) * 1.1; tap('KeyJ', 30); }
    __OF.test.step(30); return { fate: Q.fate, hp: e.hp };
  });
  check('la jauge de Destin monte en frappant', fate.fate > 0 && fate.hp < 5000, fate);
  // 5. Reckoning: the world slows down, foes hit are marked, then the Fateshift
  const r = await E(() => { upFoe(); P().combo = 0; P().fate = 100; tap('KeyV', 5); return { t: P().reckT, k: __OF.Destin.worldK(), cls: document.body.classList.contains('reckoning') }; });
  check('Jugement activé (monde ralenti, voile violet)', r.t > 0 && r.k < 1 && r.cls, r);
  const marked = await E(() => { const Q = P(), log = []; for (let i = 0; i < 3; i++) { placeFoe(); tap('KeyJ', 30); log.push([atk(), foe.state, Math.round(foe.hp)]); } return { n: Q.marked.size, log, reck: Q.reckT }; });
  check('les ennemis touchés sont marqués', marked.n >= 1, marked);
  const after = await E(() => { placeFoe(); const hp0 = foe.hp; /* no waiting: the Reckoning clock runs, and a marked foe on the ground is hit too */ tap('KeyV', 10); return { t: P().reckT, f: P().fate, cls: document.body.classList.contains('reckoning'), dmg: hp0 - foe.hp }; });
  check('Dénouement : frappe les marqués, vide la jauge', after.t <= 0 && after.f === 0 && !after.cls && after.dmg > 0, after);
  const timeout = await E(() => { const Q = P(); Q.fate = 100; tap('KeyV'); __OF.test.step(Math.ceil((Q.reckMax + 0.5) * 60)); return { t: Q.reckT, f: Q.fate }; });
  check('le Jugement s’arrête seul après sa durée', timeout.t <= 0 && timeout.f === 0, timeout);
  // 6. talents and destinies
  const tal = await E(() => {
    const D = __OF.Destin, Q = P(); D.reset(); const hp0 = Q.maxHp, dmg0 = Q.dmgOut, free0 = D.free();
    D.buy('brute'); D.buy('plate'); D.buy('breath');
    return { free0, free1: D.free(), hp0, hp1: Q.maxHp, dmg0, dmg1: Q.dmgOut, lockedBuy: D.canBuy('colossus'), brawler: D.choose('brawler'), cur: D.destiny().id };
  });
  check('acheter des talents dépense des points', tal.free1 === tal.free0 - 3, tal);
  check('Carapace augmente les PV, Force brute les dégâts', tal.hp1 > tal.hp0 && tal.dmg1 > tal.dmg0, tal);
  check('talent ultime verrouillé sans 6 points dans l’arbre', tal.lockedBuy === false, tal);
  check('Destinée verrouillée sans les points requis (2 Puissance + 1 Finesse)', tal.brawler === false && tal.cur === 'wanderer', tal);
  const dest = await E(() => { const D = __OF.Destin; const sv = __OF.Save.data.xp; __OF.Save.data.xp = 2000; D.reset(); ['brute', 'brute', 'plate', 'crush', 'crush', 'crush'].forEach(t => D.buy(t)); const a = D.choose('brawler'), hpB = P().maxHp; const ult = D.canBuy('colossus'); __OF.Save.data.xp = sv; D.reset(); return { a, ult, hpB }; });
  check('Destinée Bagarreur débloquée avec 3 points en Puissance, ultime à 6', dest.a === true && dest.ult === true, dest);
  // 7. the Destin screen, from the pause menu
  await E(() => { __OF.Game.pause(); });
  await p.click('#menu-pause .mi[data-go="destin"]');
  const scr = await E(() => ({ shown: !document.getElementById('scr-destin').hidden, tals: document.querySelectorAll('#trees [data-tal]').length, cards: document.querySelectorAll('#dcards [data-dest]').length }));
  check('écran Destin : 12 talents, 11 Destinées', scr.shown && scr.tals === 12 && scr.cards === 11, scr);
  await p.click('#trees [data-tal="affinity"]');
  check('cliquer un talent l’achète', await E(() => __OF.Destin.rank('affinity') === 1), await E(() => __OF.Destin.rank('affinity')));
  if (process.argv[2]) { await E(() => __OF.test.render()); await p.screenshot({ path: process.argv[2], timeout: 120000 }); }
  await E(() => __OF.Destin.reset());
  check('aucune erreur JavaScript', errs.length === 0, errs);
  console.log(ok.map(s => '✓ ' + s).concat(ko.map(s => '✗ ' + s)).join('\n'));
  await b.close(); process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
