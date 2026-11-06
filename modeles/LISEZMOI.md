# Modèles 3D des PNJ et ennemis

Déposez ici des fichiers `.glb` (Kimi 3D, Meshy, Tripo, Blender…) puis indiquez dans `roles.json`
quel personnage les porte :

```json
{
  "pnj:anselme": { "fichier": "anselme.glb" },
  "apparence:cultist": { "fichier": "noye.glb", "tourner": 180, "triangles": 5000 }
}
```

Rôles possibles : `pnj:<id>` (anselme, okafor, fredo, nadia, petronille, vasseur, maelle, bastien, margot,
corentin), `ennemi:<type>` (un type précis de `ETYPES`, ex. `cultShot`), `apparence:<groupe>` (thug,
cultist, merc, forgeron, thugBoss, mercBoss, colosse, herald, leviathan, drone, hdrone, civ, hero = le joueur).

Puis : `node tools/build.js && node tools/modeles.js && node tools/build.js`.

Le modèle doit être un humanoïde debout, face à +Z (sinon `"tourner": 180`), en pose en T, en A ou bras
le long du corps, sans compression Draco. S'il a un squelette (noms Mixamo, Unreal ou Blender) ses poids
sont repris, sinon il est riggé automatiquement. On peut aussi importer un GLB directement en jeu :
menu **Modèles 3D**.
