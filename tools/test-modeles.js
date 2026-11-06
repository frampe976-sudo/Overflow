// Test des modèles 3D importés (src/js/10h_modeles3d.js) dans le vrai jeu :
// deux humanoïdes GLB en pose en T (l'un avec un squelette Mixamo, l'autre sans squelette) sont traités,
// donnés à un brigand et au joueur, puis animés : chaque sommet de la main doit suivre l'os de la main,
// le rendu doit tourner sans erreur et les données doivent survivre au format compact.
// Usage : node tools/build.js && node tools/test-modeles.js [capture.png]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const { humanoide } = require('./glb-test');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 90000 });
  const ui = await p.evaluate(() => ({ ecran: !!document.getElementById('scr-modeles'), bouton: !!document.querySelector('#menu-title [data-go="modeles"]') }));
  await p.click('#menu-title .mi[data-go="patrol"]');
  const glbs = { skin: [...humanoide({ skin: true })], auto: [...humanoide({ skin: false, echelle: 1 })] };
  const res = await p.evaluate(async glbs => {
    const T = __OF.test, M3 = window.Modeles3D, G = __OF.Game, BI = __OF.BI, out = { bad: [], info: {} };
    for (let i = 0; i < 20 && G.mode !== 'play'; i++) T.step(10); T.step(30);
    // 1. traitement
    for (const k of ['skin', 'auto']) {
      const m = await M3.traiter(new Uint8Array(glbs[k]).buffer, { nom: 'test-' + k });
      out.info[k] = m.info;
      const back = M3.deballer(M3.emballer(m));
      if (back.nv !== m.nv || back.idx.length !== m.idx.length || Math.abs(back.pos[5] - m.pos[5]) > 1e-6) out.bad.push(k + ' : format compact infidèle');
      M3.ajouterTraite('test-' + k, m);
    }
    // allègement : un modèle trop fin est réduit sous le nombre de triangles demandé
    const lite = await M3.traiter(new Uint8Array(glbs.skin).buffer, { triangles: 200 });
    out.info.leger = lite.info.final; if (lite.info.final > 320 || lite.info.final < 40) out.bad.push('allègement raté : ' + lite.info.final + ' triangles');
    if (!/squelette/.test(out.info.skin.rig)) out.bad.push('le squelette Mixamo n’est pas reconnu : ' + out.info.skin.rig);
    if (out.info.auto.rig !== 'automatique') out.bad.push('rig auto attendu');
    if (out.info.auto.pose.L !== 'T') out.bad.push('pose en T non détectée : ' + JSON.stringify(out.info.auto.pose));
    // 2. rôles : un brigand (squelette) et le joueur (rig auto)
    M3.lier('apparence:thug', 'test-skin'); M3.lier('apparence:hero', 'test-auto');
    const P = G.player, e = __OF.spawnEnemy('thug', P.pos.x + 2.5, P.pos.z + 1.5, { ai: 'script' });
    if (!M3.pour(e) || !M3.pour(P)) out.bad.push('modèle non attribué');
    // 3. les sommets proches de la main suivent la main, quelle que soit la pose
    const follow = (a, label) => {
      const m = M3.pour(a).m, hand = [];
      for (let k = 0; k < m.nv; k++) if (m.j[k * 4] === BI.haL && m.w[k * 4] > 200) hand.push(k);
      if (!hand.length) { out.bad.push(label + ' : aucun sommet sur la main gauche'); return; }
      let worst = 0;
      for (let f = 0; f < 90; f++) {
        T.step(1, 1 / 60, f < 45 ? ['KeyW'] : ['KeyD']);
        const W = __OF.CharRender.bones(a), hw = W[BI.haL];
        for (const k of hand.slice(0, 12)) { const v = M3.sommet(a, k); worst = Math.max(worst, Math.hypot(v[0] - hw[12], v[1] - hw[13], v[2] - hw[14])); }
        if (a.pose.some(x => !Number.isFinite(x))) { out.bad.push(label + ' : pose non finie'); break; }
      }
      out[label + 'Main'] = +worst.toFixed(3);
      if (worst > 0.3 * (a.app.scale || 1)) out.bad.push(label + ' : la main du modèle décroche de l’os (' + worst.toFixed(2) + ' m)');
    };
    follow(P, 'joueur'); follow(e, 'brigand');
    // 4. attaque + rendu
    const C = __OF.Cam.pos, dx = P.pos.x - C.x, dz = P.pos.z - C.z, dl = Math.hypot(dx, dz) || 1; e.pos.x = P.pos.x + dx / dl * 2.5 + dz / dl * 0.8; e.pos.z = P.pos.z + dz / dl * 2.5 - dx / dl * 0.8;
    P.startAttack('jab', null); T.step(10); T.render(); T.render();
    out.dessines = M3.stats().dessines;
    if (out.dessines < 2) out.bad.push('modèles non dessinés (' + out.dessines + ')');
    // 5. retrait : retour à l'apparence d'origine
    M3.lier('apparence:thug', ''); if (M3.pour(e)) out.bad.push('le retrait ne rend pas l’apparence d’origine'); M3.lier('apparence:thug', 'test-skin');
    return out;
  }, glbs);
  if (process.argv[2]) {
    await p.evaluate(() => { __OF.test.render(); });
    await p.screenshot({ path: process.argv[2] });
  }
  console.log('écran Modèles 3D : ' + (ui.ecran && ui.bouton ? 'présent' : 'ABSENT'));
  console.log('squelette : ' + JSON.stringify(res.info.skin));
  console.log('auto      : ' + JSON.stringify(res.info.auto));
  console.log('allégé à 200 → ' + res.info.leger + ' triangles');
  console.log(`main gauche ↔ os : joueur ${res.joueurMain} m, brigand ${res.brigandMain} m · dessinés ${res.dessines}`);
  const ko = [...res.bad, ...errs, ...(ui.ecran && ui.bouton ? [] : ['écran absent'])];
  console.log(ko.length ? 'ÉCHECS :\n  ' + ko.join('\n  ') : 'aucune erreur');
  await b.close(); process.exit(ko.length ? 1 : 0);
})();
