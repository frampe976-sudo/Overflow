// Prépare www/ (le jeu tel que l'embarquent l'appli PC et l'appli Android) à partir de dist/index.html.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(www);
fs.copyFileSync(path.join(root, 'dist', 'index.html'), path.join(www, 'index.html'));
fs.copyFileSync(path.join(root, 'assets', 'icon.png'), path.join(www, 'icon.png'));
console.log('www/ prêt');
