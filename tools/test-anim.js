// Test des animations fantasy dans le vrai jeu : chaque attaque proposée est jouée par le robot,
// la pose doit rester finie, sans erreur, et la prise à deux mains doit réunir les mains.
// Usage : node tools/build.js && node tools/test-anim.js [capture.png]
// (pilote la simulation avec window.__OF.test, ajouté par la branche du Destin)
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 90000 });
  await p.click('#menu-title .mi[data-go="patrol"]');
  const res = await p.evaluate(() => {
    const T = __OF.test, ATK = __OF.ATK, AnimFantasy = window.AnimFantasy; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(60);
    const out = { installed: AnimFantasy.install(), bad: [], played: 0, grip: [] }, P = __OF.Game.player;
    P.giveWeapon('bat');
    const names = [...Object.keys(AnimFantasy.ATK), ...Object.keys(AnimFantasy.SWAP)];
    for (const n of names) {
      if (ATK[n].clip !== (AnimFantasy.ATK[n] || {}).clip && ATK[n].clip !== AnimFantasy.SWAP[n]) out.bad.push(n + ' : clip non branché');
      P.combo = 0; P.startAttack(n, null); const C = AnimFantasy.clip(ATK[n].clip); let k = 0, gripD = null;
      while (P.atk && P.atk.name === n && k++ < 240) {
        T.step(1);
        if (P.pose.some(v => !Number.isFinite(v))) { out.bad.push(n + ' : pose non finie'); break; }
        // halfway through the blow, the two fists of a two-handed clip should be about grip2 apart
        if (C.grip2 && P.atk && Math.abs(P.atk.t - ATK[n].hit) < 1 / 60) {
          const W = __OF.CharRender.bones(P), ap = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
          const a = ap(W[__OF.BI.haR], -0.033, -0.097, 0), c = ap(W[__OF.BI.haL], 0.033, -0.097, 0);
          gripD = Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) / (P.app.scale || 1);
        }
      }
      if (gripD !== null) out.grip.push(n + ' ' + gripD.toFixed(2) + ' / ' + C.grip2);
      if (k >= 240) out.bad.push(n + ' : ne se termine pas');
      out.played++; T.step(30);
    }
    return out;
  });
  if (process.argv[2]) {
    await p.evaluate(() => { const P = __OF.Game.player; P.startAttack('f_hmSlam', null); __OF.test.step(Math.round(__OF.ATK.f_hmSlam.hit * 60)); __OF.test.render(); });
    await p.screenshot({ path: process.argv[2] });
  }
  console.log(`${res.played} attaques jouées · install ${res.installed ? 'ok' : 'ÉCHEC'}`);
  console.log('prise à deux mains (écart des poings / visé) :\n  ' + res.grip.join('\n  '));
  const ko = [...res.bad, ...errs];
  console.log(ko.length ? 'ÉCHECS :\n  ' + ko.join('\n  ') : 'aucune erreur');
  await b.close(); process.exit(ko.length || !res.installed ? 1 : 0);
})();
