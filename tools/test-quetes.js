// Test des quêtes en données (conditions → actions) dans le vrai jeu, simulation pas à pas.
// Usage : node tools/build.js && node tools/test-quetes.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ok = [], ko = [];
const check = (name, cond, info) => (cond ? ok : ko).push(name + (cond ? '' : ' → ' + JSON.stringify(info)));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; try { localStorage.clear(); } catch (e) { } });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 120000 });
  const E = f => p.evaluate(f);
  await p.click('#menu-title [data-go="recit"]');
  await E(() => { const T = __OF.test; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(30); });
  await E(() => {
    __OF.Game._noPauseOnUnlock = true;
    window.S = __OF.Story; window.Q = __OF.Quetes; window.run = n => __OF.test.step(n);
    window.go = (x, z) => { const P = __OF.Game.player, s = __OF.World.safeSpot(x, z, P.r); P.pos.set(s.x, s.y, s.z); P.vel.set(0, 0, 0); run(2); };
    window.br = () => Q.lieu('braziers');
  });
  check('le moteur est branché sur le Récit', await E(() => !!S._quetes && __OF.QUESTS.braseros.steps.veilleurs._donnees === true), null);
  // conditions seules
  const c = await E(() => {
    const ctx = { S, rt: { t: 5 } };
    S.set('essai', 'oui'); Q.action({ fait: 'compteur', nom: 'essai', ajoute: 3 }, ctx);
    return {
      drapeau: Q.vrai({ si: 'drapeau', nom: 'essai', vaut: 'oui' }, ctx), drapeauFaux: Q.vrai({ si: 'drapeau', nom: 'essai', vaut: 'non' }, ctx),
      compteur: Q.vrai({ si: 'compteur', nom: 'essai', min: 3, max: 3 }, ctx), temps: Q.vrai({ si: 'temps', secondes: 4 }, ctx),
      ou: Q.vrai({ un_de: [false, { si: 'temps', secondes: 1 }] }, ctx), non: Q.vrai({ non: { si: 'temps', secondes: 1 } }, ctx),
      quete: Q.vrai({ si: 'quete', id: 'eveil', etape: 'anselme' }, ctx), absente: Q.vrai({ si: 'quete', id: 'braseros', etat: 'absente' }, ctx)
    };
  });
  check('conditions : drapeau, compteur, temps, un_de, non, quête', c.drapeau && !c.drapeauFaux && c.compteur && c.temps && c.ou && !c.non && c.quete && c.absente, c);
  // le déclencheur attend la fin du prologue
  const d0 = await E(() => { const b = br(); go(b.x + 12, b.z); run(4); return { q: S.step('braseros') }; });
  check('pas de quête des braseros avant la fin du prologue', d0.q === null, d0);
  const d1 = await E(() => { S.finish('eveil'); run(4); const rt = S.rt.braseros; return { step: S.step('braseros'), foes: rt && rt.foes.length, groupe: rt && rt.groupes && rt.groupes.veilleurs.length, obj: __OF.Game.mission.objective, label: __OF.Game.mission.objLabel }; });
  check('près des braseros, la quête démarre et les veilleurs apparaissent', d1.step === 'veilleurs' && d1.foes === 4 && d1.groupe === 4, d1);
  const tracked = await E(() => { S.data().track = 'braseros'; run(2); return __OF.Game.mission.objective; });
  check('l’objectif montre le décompte « 0/4 »', /0\/4/.test(tracked), tracked);
  const d2 = await E(() => { const g = S.rt.braseros.foes; g[0].alive = false; g[0].removed = true; run(3); const r = { step: S.step('braseros'), obj: __OF.Game.mission.objective }; for (const a of g) { a.alive = false; a.removed = true; } run(3); r.after = S.step('braseros'); return r; });
  check('un veilleur à terre : 1/4, la quête attend', d2.step === 'veilleurs' && /1\/4/.test(d2.obj), d2);
  check('tous à terre : l’étape suivante commence', d2.after === 'autel', d2);
  const d3 = await E(() => { const b = br(); go(b.x, b.z + 1); run(4); return { state: S.q('braseros').state, codex: S.data().codex.indexOf('braseros') >= 0, flag: S.flag('braseros_eteints'), ordre: Q.compteur('ordre'), fired: Q.faits().braseros_debut }; });
  check('à l’autel : quête finie, codex, drapeau, compteur d’ordre +5', d3.state === 'done' && d3.codex && d3.flag === true && d3.ordre === 5, d3);
  check('le déclencheur est noté comme joué une fois', d3.fired === 1, d3);
  const d4 = await E(() => { const n0 = Q.faits().braseros_retour | 0; const b = br(); go(b.x + 60, b.z + 60); Q.rt.braseros_retour.t = 30; run(4); return { n0, n1: Q.faits().braseros_retour, again: S.q('braseros').state }; });
  check('déclencheur « apres » : la ville remarque les feux éteints', d4.n0 === 0 && d4.n1 === 1 && d4.again === 'done', d4);
  check('aucune erreur dans la console', errs.length === 0, errs.slice(0, 5));
  await b.close();
  console.log(ok.map(s => '✓ ' + s).join('\n'));
  if (ko.length) { console.log(ko.map(s => '✗ ' + s).join('\n')); process.exit(1); }
  console.log(`\n${ok.length} vérifications réussies`);
})().catch(e => { console.error(e); process.exit(1); });
