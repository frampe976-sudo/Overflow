# Overflow → aventure dark fantasy

Base : **Overflow 21.0** (action urbaine, moteur WebGL2 maison), extrait de l'APK Android.
Objectif : en faire un RPG d'action narratif, avec la narration de Dragon Age et le combat de Kingdom of Amalur.

## Jouer
```
node tools/build.js      # assemble src/ en dist/index.html
```
Ouvrir `dist/index.html` dans Chrome, Edge ou Firefox. C'est ce même fichier qui va dans l'APK (`assets/index.html`).

## Organisation
- `src/shell.html` : la page (HTML + CSS), `src/end.html` : la fin du script
- `src/js/NN_*.js` : les modules du jeu, concaténés dans l'ordre des numéros
- `src/js/11b_destin.js` : combos, jauge de Destin, Jugement, talents et Destinées
- `tools/test-destin.js` : tests dans le vrai jeu (Chromium sans écran)

## Destin (nouveau)
- **Chaînes de combos par arme** : poings, batte, clé, couteau, bâton ont chacun leur enchaînement.
- **Combos à pause** : frapper, marquer un temps (0,2 à 0,85 s), frapper → une fin de combo spéciale.
- **Jauge de Destin** : se remplit en frappant, sur une parade ou une esquive parfaite.
- **Jugement** (`V`, manette `LB + RB`, bouton tactile étoile) : le monde ralentit, dégâts ×1,6,
  rien ne vous déséquilibre, chaque ennemi touché est marqué. **Dénouement** (même touche, ou à la fin) :
  tous les marqués tombent d'un coup.
- **Talents** : trois arbres (Puissance, Finesse, Sorcellerie), 4 talents à 3 rangs, le dernier demande 6 points dans l'arbre.
  3 points au départ, 3 de plus à chaque grade.
- **Destinées** : 11 cartes (dont hybrides : Chevalier runique, Lame de guerre, Ombre-sort, Tisse-destin) débloquées selon les points.
  Menu **Destin** dans l'écran titre et la pause.
