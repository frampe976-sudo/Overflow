// Embarque des modèles 3D dans le jeu : lit modeles/roles.json, traite chaque .glb dans le vrai moteur
// (Chromium sans écran, même code que l'import en jeu) et écrit src/js/10i_modeles_data.js.
// modeles/roles.json :
//   { "pnj:anselme": { "fichier": "anselme.glb" },
//     "apparence:cultist": { "fichier": "noye.glb", "tourner": 180, "triangles": 5000, "texture": 512 } }
// (texture : taille maximale des textures embarquées, 256 px par défaut pour garder le jeu léger)
// Rôles : pnj:<id du récit>, ennemi:<type ETYPES>, apparence:<thug|cultist|merc|forgeron|…|civ|hero>.
// Usage : node tools/build.js && node tools/modeles.js && node tools/build.js
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.join(__dirname, '..'), dir = path.join(root, 'modeles'), outF = path.join(root, 'src', 'js', '10i_modeles_data.js');
(async () => {
  const roles = fs.existsSync(path.join(dir, 'roles.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'roles.json'), 'utf8')) : {};
  const files = {}; for (const cle in roles) { const r = typeof roles[cle] === 'string' ? { fichier: roles[cle] } : roles[cle]; const k = JSON.stringify([r.fichier, r.tourner || 0, r.triangles || 7000, r.texture || 256]); (files[k] = files[k] || { r, cles: [] }).cles.push(cle); }
  const out = { modeles: {}, roles: {} };
  if (Object.keys(files).length) {
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const p = await b.newPage(); await p.addInitScript(() => { window.__TEST_HOLD = true; });
    await p.goto('file://' + path.join(root, 'dist', 'index.html')); await p.waitForFunction(() => window.Modeles3D, null, { timeout: 90000 });
    let n = 0;
    for (const k in files) {
      const { r, cles } = files[k], id = 'e' + (++n), bytes = [...fs.readFileSync(path.join(dir, r.fichier))];
      const res = await p.evaluate(async ([bytes, o]) => { const M3 = window.Modeles3D, m = await M3.traiter(new Uint8Array(bytes).buffer, o); return { b64: M3.versB64(M3.emballer(m)), info: m.info }; }, [bytes, { nom: r.nom || r.fichier.replace(/\.(glb|gltf)$/i, ''), tourner: r.tourner || 0, triangles: r.triangles || 7000, texture: r.texture || 256 }]);
      out.modeles[id] = { nom: r.nom || r.fichier.replace(/\.(glb|gltf)$/i, ''), gz: 1, b64: require('zlib').gzipSync(Buffer.from(res.b64, 'base64'), { level: 9 }).toString('base64') };
      for (const c of cles) out.roles[c] = id;
      console.log(`${r.fichier} → ${cles.join(', ')} · ${res.info.final} triangles · rig ${res.info.rig} · ${(out.modeles[id].b64.length / 1024).toFixed(0)} Ko`);
    }
    await b.close();
  }
  fs.writeFileSync(outF, '/* Modèles 3D livrés avec le jeu : écrit par tools/modeles.js à partir de modeles/roles.json (ne pas modifier à la main). */\nModeles3D.embarquer(' + JSON.stringify(out) + ');\n');
  console.log(`${path.relative(root, outF)} · ${Object.keys(out.modeles).length} modèle(s)`);
})();
