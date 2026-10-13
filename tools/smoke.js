// Test de fumée : ouvre dist/index.html dans Chromium, lance la patrouille libre,
// tape quelques coups et relève les erreurs JavaScript. Usage : node tools/smoke.js [capture.png]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 90000 });
  await p.click('#menu-title .mi[data-go="patrol"]');
  await p.waitForTimeout(4000);
  for (const k of ['KeyJ', 'KeyJ', 'KeyJ', 'KeyF', 'KeyJ', 'KeyV', 'KeyC']) { await p.keyboard.down(k); await p.waitForTimeout(90); await p.keyboard.up(k); await p.waitForTimeout(260); }
  await p.waitForTimeout(1500);
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], timeout: 120000 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const extra = process.env.SMOKE_EXTRA ? await p.evaluate(process.env.SMOKE_EXTRA) : null;
  console.log(JSON.stringify({ errors: errs, extra }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
