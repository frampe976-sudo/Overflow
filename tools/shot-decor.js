// Captures du décor : plusieurs points de vue fixes dans la ville (rendu réel, sans IHM).
// Usage : node tools/build.js && node tools/shot-decor.js dossier/ [prefixe]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs');
const out = process.argv[2] || 'shots', pre = process.argv[3] || 'decor';
// [nom, caméra x,y,z, cible x,y,z]
const VIEWS = [
  ['rue', 6, 3.2, 60, 6, 3, 0],
  ['carrefour', -20, 9, 40, 27, 2, -27],
  ['quai', 30, 6, 150, -40, 4, 175],
  ['hauteur', 120, 70, 140, 0, 0, -60],
  ['place', -60, 4, -20, -10, 6, -60],
  ['toits', -20, 38, 60, -70, 6, -10],
  ['marche', -88, 3, 22, -110, 3, -5]
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 120000 });
  await p.click('#menu-title .mi[data-go="patrol"]');
  await p.evaluate(() => { const T = __OF.test; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(30); __OF.Env.setWeather({ weather: 'clear' }); document.querySelectorAll('#hud, .hud, [id^=hud]').forEach(e => e.style.display = 'none'); });
  if (process.env.DISTRICTS) { // one aerial view per district
    const L = await p.evaluate(() => { const D = __OF.Districts, out = []; for (const code in D.blocks) { const g = D.groups[code]; let R = g ? g.rect : null; if (!R) { const Ks = D.blocks[code]; R = { cx: Ks.reduce((s, K) => s + K.cx, 0) / Ks.length, cz: Ks.reduce((s, K) => s + K.cz, 0) / Ks.length }; } out.push([code, R.cx + 45, 38, R.cz + 60, R.cx, 4, R.cz]); } return out; });
    VIEWS.length = 0; for (const v of L) if (!process.env.DISTRICTS.length || process.env.DISTRICTS === '1' || process.env.DISTRICTS.split(',').includes(v[0])) VIEWS.push(v);
  }
  for (const [name, ...v] of VIEWS) {
    if (process.argv[4] && !name.startsWith(process.argv[4])) continue;
    await p.evaluate(v => {
      const { CamCtl, Cam } = __OF; const up = CamCtl.update;
      CamCtl.update = () => { Cam.pos.set(v[0], v[1], v[2]); Cam.target.set(v[3], v[4], v[5]); };
      for (let i = 0; i < 3; i++) __OF.test.render();
      CamCtl.update = up;
    }, v);
    await p.screenshot({ path: path.join(out, `${pre}-${name}.png`), timeout: 120000 });
  }
  console.log(JSON.stringify({ errors: errs }));
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
