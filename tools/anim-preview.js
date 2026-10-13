// Aperçu des animations : construit dist/anim-preview.html, une page autonome qui joue chaque clip
// avec le vrai code d'animation du jeu (squelette, clips splines, couches de garde) extrait des sources.
//   node tools/anim-preview.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), js = f => fs.readFileSync(path.join(root, 'src', 'js', f), 'utf8');
// the lines of src from the one starting with `from` up to (excluded) the one starting with `to`, or up to `to` included when incl
function cut(src, from, to, incl) {
  const L = src.split('\n'), a = L.findIndex(l => l.startsWith(from));
  if (a < 0) throw new Error('repère introuvable : ' + from);
  let b = L.findIndex((l, i) => i > a && l.startsWith(to));
  if (b < 0) throw new Error('repère introuvable : ' + to);
  return L.slice(a, incl ? b + 1 : b).join('\n');
}
const core = js('01_core.js'), actors = js('11_actors.js'), chars = js('10_chars.js'), anim = js('10a_anim.js'), fant = js('10g_anim_fantasy.js');
const engine = [
  cut(core, 'const TAU', 'function wrapAngle', true),
  cut(core, 'const M4 = {', '};', true),
  cut(chars, 'const BONES = [', 'const XZY', true),
  cut(anim, 'const HX = ', '/* ---------- springs'),
  cut(anim, '/* ---------- spline clips', '// idle attitudes'),
  'APose.stand(STAND); for (const k in CLIP_DEFS) CLIPS2[k] = makeClip(CLIP_DEFS[k]);',
  fant,
  cut(actors, 'const ATK = {', '};', true)
].join('\n');
// the comment line above each new clip is its description
const DESC = {};
for (const m of fant.matchAll(/\/\/ ([^\n]+)\n\s+(\w+): \{ hitU/g)) DESC[m[2]] = m[1];
const tpl = fs.readFileSync(path.join(__dirname, 'anim-preview.html'), 'utf8');
const out = tpl.replace('/*__ENGINE__*/', () => engine).replace('/*__DESC__*/', () => 'const DESC = ' + JSON.stringify(DESC) + ';');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'anim-preview.html'), out);
console.log(`dist/anim-preview.html · ${Object.keys(DESC).length} clips · ${(out.length / 1024).toFixed(0)} Ko`);
