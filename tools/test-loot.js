// Test du butin et des armes fantasy dans le vrai jeu, simulation pas à pas sans rendu (window.__OF.test).
// Usage : node tools/build.js && node tools/test-loot.js [capture.png]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ok = [], ko = [];
const check = (name, cond, info) => (cond ? ok : ko).push(name + (cond ? '' : ' → ' + JSON.stringify(info)));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; try { localStorage.clear(); } catch (e) { } });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 90000 });
  await p.click('#menu-title .mi[data-go="patrol"]');
  const E = f => p.evaluate(f);
  await E(() => { const T = __OF.test; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(60);
    window.tap = (k, n = 0) => { __OF.test.step(2, 1 / 60, [k]); if (n) __OF.test.step(n); }; window.P = () => __OF.Game.player; window.atk = () => P().atk && P().atk.name;
    window.foeAt = (hp, type = 'thug') => { const Q = P(); const e = __OF.spawnEnemy(type, Q.pos.x + Math.sin(Q.yaw) * 1.1, Q.pos.z + Math.cos(Q.yaw) * 1.1, {}); e.hp = e.maxHp = hp; return e; }; });
  // 1. a first blade in hand
  const st = await E(() => ({ cur: P().cur, name: __OF.Loot.name(P()), n: __OF.Loot.items().length, hud: document.getElementById('wname').textContent }));
  check('épée rouillée équipée au départ', st.cur === 'sword' && st.name === 'Épée rouillée' && st.n === 1, st);
  check('le HUD affiche le nom de l’arme', st.hud === 'Épée rouillée', st);
  // 2. sword combo chain + pause finisher
  const chain = await E(() => { P().combo = 0; P().idleAtk = 9; const r = []; for (let i = 0; i < 4; i++) { tap('KeyJ'); r.push(atk()); __OF.test.step(Math.round(__OF.ATK[atk()].cancel * 60) + 1); } __OF.test.step(120); return r.join(); });
  check('chaîne de l’épée', chain === 'p_sw1,p_sw2,p_sw1,p_sw3', chain);
  const pz = await E(() => { tap('KeyJ'); let n = 0; while (P().atk && n++ < 120) __OF.test.step(1); __OF.test.step(24); tap('KeyJ'); const a = atk(); __OF.test.step(120); return a; });
  check('combo à pause de l’épée : tourbillon', pz === 'p_swspin', pz);
  // 3. rolled items: properties by rarity, names
  const rolls = await E(() => { const L = __OF.Loot; const r = [0, 1, 2, 3].map(k => L.roll({ rarity: k })); return r.map(i => ({ n: Object.keys(i.aff).length, name: i.name, base: i.base })); });
  check('1 à 4 propriétés selon la rareté', rolls.map(r => r.n).join() === '1,2,3,4', rolls);
  check('chaque arme a un nom', rolls.every(r => r.name && !/undefined/.test(r.name)), rolls);
  const dist = await E(() => { const c = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) c[__OF.Loot.rollRarity(0)]++; return c; });
  check('les légendaires restent rares (≈4 %)', dist[3] > 80 && dist[3] < 260 && dist[0] > dist[1] && dist[1] > dist[2], dist);
  // 4. a foe put down drops loot, walking over it picks it up
  const drop = await E(() => {
    const n0 = __OF.Loot.items().length, e = foeAt(5); const rnd = Math.random; Math.random = () => 0.01; // force the drop roll
    try { for (let i = 0; i < 4 && e.alive && !e.down; i++) { e.pos.x = P().pos.x + Math.sin(P().yaw) * 1.1; e.pos.z = P().pos.z + Math.cos(P().yaw) * 1.1; tap('KeyJ', 40); } } finally { Math.random = rnd; }
    // the robot stands right next to it: the drop is picked up at once
    return { down: e.down || !e.alive, got: __OF.Loot.items().length - n0, last: __OF.Loot.items()[__OF.Loot.items().length - 1] };
  });
  check('un ennemi à terre lâche une arme (ramassée en passant)', drop.down && drop.got === 1 && drop.last.rarity === 3, drop);
  const got = await E(() => { const it = __OF.Loot.roll({ rarity: 1 }), Q = P(); const pk = __OF.Pickups.add('loot', Q.pos.x + 4, Q.pos.y, Q.pos.z, { item: it }); __OF.test.step(5); const before = pk.alive; Q.pos.x += 4; __OF.test.step(5); return { before, after: pk.alive, has: !!__OF.Loot.byId(it.id) }; });
  check('une arme au sol se ramasse en marchant dessus', got.before && !got.after && got.has, got);
  // 5. equip / salvage / forge
  const eq = await E(() => { const L = __OF.Loot, it = L.items().find(i => i.name !== 'Épée rouillée'); L.equip(it.id); return { cur: P().cur, base: it.base, hud: document.getElementById('wname').textContent, name: it.name }; });
  check('équiper change l’arme en main', eq.cur === eq.base && eq.hud === eq.name, eq);
  const fg = await E(() => { const L = __OF.Loot, g = L.data(); const rusty = L.items().find(i => i.name === 'Épée rouillée'); const v = L.salvage(rusty.id); const it = L.equipped(); const before = L.mods(it); g.shards = 1000; const okF = L.forge(it.id); const after = L.mods(it); const k = Object.keys(it.aff)[0]; return { v, lvl: it.lvl, up: after[k] > before[k], okF, shards: g.shards }; });
  check('recycler donne des éclats, forger monte le niveau', fg.v > 0 && fg.okF && fg.lvl === 2 && fg.up, fg);
  // 6. properties in combat: damage bonus, fire
  const dmgK = await E(() => { const L = __OF.Loot; return { k: L.dmgK(P()), fists: (P().equip('fists'), L.dmgK(P())) }; });
  check('les dégâts de l’arme ne comptent que si elle est en main', dmgK.fists === 1, dmgK);
  const fire = await E(() => { const L = __OF.Loot, it = L.roll({ rarity: 0, base: 'sword' }); it.aff = { fire: 1 }; L.add(it); L.equip(it.id); const e = foeAt(500); e.alive = true; const hp0 = 500; tap('KeyJ', 30); const hp1 = e.hp; __OF.test.step(150); return { burn: hp1 > e.hp, hp0, hp1, hp2: e.hp, cur: P().cur }; });
  check('le feu embrase et brûle dans la durée', fire.burn, fire);
  // 7. saved, and the Equipment screen
  const sv = await E(() => { __OF.Save.write(); const d = JSON.parse(localStorage.getItem('overflow-save-v1')); return { n: d.gear.items.length, eq: !!d.gear.eq }; });
  check('l’équipement est sauvegardé', sv.n >= 2 && sv.eq, sv);
  await E(() => __OF.Game.pause());
  await p.click('#menu-pause .mi[data-go="gear"]');
  const scr = await E(() => ({ shown: !document.getElementById('scr-gear').hidden, n: document.querySelectorAll('#glist [data-it]').length, bag: __OF.Loot.items().length }));
  check('écran Équipement : toutes les armes listées', scr.shown && scr.n === scr.bag, scr);
  await p.click('#glist [data-it]:last-child'); await p.click('#gdetail [data-ga="equip"]');
  const sel = await E(() => ({ eq: __OF.Loot.data().eq, sel: __OF.Menus.gearSel }));
  check('bouton Équiper', sel.eq === sel.sel, sel);
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], timeout: 120000 });
  check('aucune erreur JavaScript', errs.length === 0, errs);
  console.log(ok.map(s => '✓ ' + s).concat(ko.map(s => '✗ ' + s)).join('\n'));
  await b.close(); process.exit(ko.length ? 1 : 0);
})().catch(e => { console.log(ok.map(s => '✓ ' + s).concat(ko.map(s => '✗ ' + s)).join('\n')); console.error(e); process.exit(2); });
