// Assemble les modules de src/ en un seul fichier jouable : dist/index.html
// (le jeu reste un unique HTML, comme dans l'APK Android).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'src', 'js');
const mods = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
let out = fs.readFileSync(path.join(root, 'src', 'shell.html'), 'utf8');
for (const m of mods) out += '// ---- ' + m + '\n' + fs.readFileSync(path.join(dir, m), 'utf8');
out += fs.readFileSync(path.join(root, 'src', 'end.html'), 'utf8');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), out);
console.log(`dist/index.html · ${mods.length} modules · ${(out.length / 1024).toFixed(0)} Ko`);
