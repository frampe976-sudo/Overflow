// Règle le projet Android généré par Capacitor : jeu en paysage, plein écran, icône d'Overflow.
const fs = require('fs'), path = require('path');
const app = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const mf = path.join(app, 'AndroidManifest.xml');
let s = fs.readFileSync(mf, 'utf8');
if (!s.includes('screenOrientation')) s = s.replace('<activity', '<activity\n            android:screenOrientation="sensorLandscape"');
fs.writeFileSync(mf, s);
// icône : la même image dans chaque densité ; l'icône adaptative de Capacitor est retirée
const res = path.join(app, 'res'), icon = path.join(__dirname, '..', 'assets', 'icon.png');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const d of fs.readdirSync(res).filter(d => d.startsWith('mipmap-'))) {
  for (const f of fs.readdirSync(path.join(res, d))) fs.rmSync(path.join(res, d, f));
  for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) fs.copyFileSync(icon, path.join(res, d, f));
}
// écran de démarrage : fond nuit et icône (au lieu du logo Capacitor)
const splash = path.join(__dirname, '..', 'assets', 'splash.png');
for (const d of fs.readdirSync(res).filter(d => d.startsWith('drawable'))) { const f = path.join(res, d, 'splash.png'); if (fs.existsSync(f)) fs.copyFileSync(splash, f); }
console.log('Android : paysage, icône et écran de démarrage Overflow');
