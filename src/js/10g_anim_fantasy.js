/* =====================================================================
   ANIMATIONS FANTASY — nouveaux clips de combat, au format CLIP_DEFS
   · fins de combo du Destin (aujourd'hui elles réutilisent les clips d'Overflow)
   · Jugement (activation) et Dénouement (exécution)
   · armes fantasy : épée longue, espadon, marteau de guerre, dagues, sceptre, bouclier
   Les clips sont enregistrés tout de suite (sans effet tant qu'aucune attaque ne les nomme).
   AnimFantasy.install() branche les attaques, les combos proposés et la prise à deux mains : à appeler à l'intégration.
   ===================================================================== */
const FANTASY_CLIPS = {
  /* ----- poings ----- */
  // uppercut : on s'accroupit en armant, puis tout le corps remonte derrière le poing
  uppercut: { hitU: 0.45, cat: 'fists', keys: [[0, {}],
    [0.25, { shR: [-0.3, -0.1, -0.3], elR: [-2.3], shL: [-0.8, 0.2, 0.35], elL: [-2.0], chest: [0.05, -0.25, 0], spine: [0.25, -0.2, 0], hips: [0.05, -0.25, 0], P: [0, -0.12, 0] }],
    [0.45, { shR: [-2.1, 0.25, -0.1], elR: [-1.9], haR: [0.2], shL: [-0.6, 0.2, 0.45], elL: [-2.1], chest: [-0.08, 0.35, 0], spine: [-0.12, 0.25, 0], hips: [0.02, 0.25, 0], head: [-0.2], P: [0, 0.02, 0.06] }],
    [0.6, { shR: [-2.2, 0.25, -0.1], elR: [-1.8], chest: [-0.08, 0.32, 0], spine: [-0.15, 0.22, 0], hips: [0.02, 0.22, 0], P: [0, 0.03, 0.05] }],
    [0.85, { shR: [-0.8, 0, -0.35], elR: [-2.0], chest: [0, 0.05, 0], spine: [0.05, 0.05, 0], hips: [0, 0.03, 0], P: [0, -0.02, 0.02] }], [1, {}]] },
  // poussée des paumes : les deux mains ramenées aux épaules puis projetées, poignets cassés
  palmBurst: { hitU: 0.5, cat: 'fists', keys: [[0, {}],
    [0.3, { shL: [-0.4, 0, 0.5], elL: [-2.2], shR: [-0.4, 0, -0.5], elR: [-2.2], spine: [-0.05], chest: [-0.08], P: [0, -0.08, -0.06] }],
    [0.5, { shL: [-1.5, -0.25, 0.05], elL: [-0.1], haL: [-0.9], shR: [-1.5, 0.25, -0.05], elR: [-0.1], haR: [-0.9], spine: [0.3], chest: [0.08], hips: [0.06], P: [0, -0.12, 0.16] }],
    [0.68, { shL: [-1.45, -0.22, 0.05], elL: [-0.15], haL: [-0.8], shR: [-1.45, 0.22, -0.05], elR: [-0.15], haR: [-0.8], spine: [0.28], chest: [0.08], P: [0, -0.11, 0.15] }],
    [0.88, { shL: [-0.8, 0.1, 0.35], elL: [-1.6], shR: [-0.8, -0.1, -0.35], elR: [-1.6], spine: [0.1], P: [0, -0.04, 0.04] }], [1, {}]] },

  /* ----- armes lourdes (batte, clé, marteau) ----- */
  // revers : l'arme part du côté gauche et balaie vers la droite
  backhand: { hitU: 0.5, cat: 'heavy', keys: [[0, {}],
    [0.32, { shR: [-1.1, 0.95, -0.2], elR: [-1.5], shL: [-0.6, 0.3, 0.35], elL: [-1.6], chest: [0.04, 0.75, -0.05], spine: [0.1, 0.35, 0], hips: [0.04, 0.4, 0], P: [0, -0.07, -0.02] }],
    [0.5, { shR: [-1.45, -0.35, -0.5], elR: [-0.2], shL: [-0.8, 0, 0.6], elL: [-1.0], chest: [0.12, -0.6, 0.06], spine: [0.18, -0.3, 0.03], hips: [0.08, -0.32, 0], P: [0, -0.08, 0.08] }],
    [0.68, { shR: [-1.15, -0.95, -0.9], elR: [-0.4], chest: [0.1, -0.9, 0.08], spine: [0.15, -0.42, 0.04], hips: [0.06, -0.42, 0], P: [0, -0.07, 0.06] }],
    [1, {}]] },
  // fendoir : grand coup vertical à deux mains, le buste plonge avec l'arme
  cleave: { hitU: 0.58, ground: true, cat: 'heavy', grip2: 0.16, keys: [[0, {}],
    [0.38, { shR: [-3.0, 0.1, -0.3], elR: [-1.3], shL: [-2.9, -0.1, 0.3], elL: [-1.3], spine: [-0.3], chest: [-0.12], head: [0.15], P: [0, 0.03, -0.04] }],
    [0.58, { haR: [-0.55], shR: [-1.2, 0.05, -0.1], elR: [-0.1], shL: [-1.2, -0.05, 0.1], elL: [-0.15], spine: [0.7], chest: [0.2], head: [-0.3], P: [0, -0.25, 0.12] }],
    [0.78, { haR: [-0.6], shR: [-1.05, 0.05, -0.1], elR: [-0.15], shL: [-1.05, -0.05, 0.1], elL: [-0.2], spine: [0.72], chest: [0.2], head: [-0.3], P: [0, -0.27, 0.11] }],
    [1, {}]] },
  // frappe bondissante : accroupi, saut l'arme au-dessus de la tête, réception genou en avant
  leapSlam: { hitU: 0.62, ground: true, cat: 'heavy', legs: 'LR', grip2: 0.16, keys: [[0, {}],
    [0.2, { hipL: [-0.9, 0, 0.08], knL: [1.6], anL: [-0.7], hipR: [-0.9, 0, -0.08], knR: [1.6], anR: [-0.7], spine: [0.35], shR: [-0.4, 0, -0.4], elR: [-1.2], shL: [-0.4, 0, 0.4], elL: [-1.2], P: [0, -0.25, -0.02] }],
    [0.42, { hipL: [-0.75, 0, 0.06], knL: [1.3], anL: [0.2], hipR: [-0.3, 0, -0.06], knR: [0.9], anR: [0.3], spine: [-0.35], chest: [-0.15], head: [0.15], shR: [-3.0, 0, -0.35], elR: [-0.6], shL: [-3.0, 0, 0.35], elL: [-0.6], P: [0, 0.35, 0.06] }],
    [0.62, { haR: [-0.55], hipL: [-1.3, 0, 0.1], knL: [2.0], anL: [-0.7], hipR: [0.2, 0, -0.1], knR: [1.55], anR: [0.4], spine: [0.75], chest: [0.22], head: [-0.3], shR: [-1.2, 0, -0.1], elR: [-0.1], shL: [-1.2, 0, 0.1], elL: [-0.1], P: [0, -0.4, 0.1] }],
    [0.84, { haR: [-0.55], hipL: [-1.25, 0, 0.1], knL: [1.95], anL: [-0.7], hipR: [0.15, 0, -0.1], knR: [1.5], anR: [0.4], spine: [0.7], chest: [0.2], head: [-0.25], shR: [-1.1, 0, -0.1], elR: [-0.2], shL: [-1.1, 0, 0.1], elL: [-0.2], P: [0, -0.38, 0.09] }],
    [1, {}]] },
  // coup remontant (marteau) : l'arme part basse à gauche et monte haut à droite
  upswing: { hitU: 0.5, cat: 'heavy', grip2: 0.16, keys: [[0, {}],
    [0.3, { shR: [-0.2, 0.7, -0.1], elR: [-0.4], shL: [-0.3, 0.4, 0.2], elL: [-0.5], chest: [0.25, 0.5, -0.05], spine: [0.4, 0.25, 0], hips: [0.08, 0.3, 0], P: [0, -0.2, -0.02] }],
    [0.5, { shR: [-2.2, -0.4, -0.5], elR: [-0.3], shL: [-2.0, -0.7, 0.1], elL: [-0.4], chest: [-0.1, -0.5, 0.05], spine: [-0.15, -0.25, 0], hips: [0, -0.3, 0], head: [-0.2], P: [0, 0.02, 0.07] }],
    [0.7, { shR: [-2.3, -0.5, -0.55], elR: [-0.35], shL: [-2.1, -0.75, 0.1], elL: [-0.45], chest: [-0.1, -0.55, 0.05], spine: [-0.15, -0.27, 0], hips: [0, -0.32, 0], P: [0, 0.02, 0.06] }],
    [1, {}]] },

  /* ----- dagues ----- */
  // estoc en revers : la lame part basse et remonte sous la garde
  reverseStab: { hitU: 0.45, cat: 'dagger', keys: [[0, {}],
    [0.25, { shR: [-0.1, 0.2, -0.4], elR: [-1.0], haR: [0.6], chest: [0.05, -0.3, 0], spine: [0.15, -0.1, 0], hips: [0.03, -0.2, 0], P: [0, -0.1, -0.02] }],
    [0.45, { shR: [-1.25, 0.25, -0.1], elR: [-0.4], haR: [-0.4], chest: [0.1, 0.35, -0.04], spine: [0.25, 0.15, 0], hips: [0.06, 0.2, 0], shL: [-0.3, 0, 0.6], elL: [-1.0], P: [0, -0.12, 0.1] }],
    [0.6, { shR: [-1.2, 0.25, -0.1], elR: [-0.45], haR: [-0.35], chest: [0.1, 0.32, -0.04], spine: [0.24, 0.14, 0], hips: [0.05, 0.18, 0], P: [0, -0.11, 0.09] }],
    [0.85, { shR: [-0.6, 0.05, -0.3], elR: [-1.3], chest: [0.02, 0.05, 0], spine: [0.08, 0.02, 0], P: [0, -0.03, 0.02] }], [1, {}]] },
  // taille en diagonale : de haut à droite vers bas à gauche
  diagSlash: { hitU: 0.45, cat: 'dagger', keys: [[0, {}],
    [0.28, { shR: [-2.6, -0.5, -0.6], elR: [-1.6], chest: [-0.02, -0.4, 0.05], spine: [-0.05, -0.15, 0], hips: [0, -0.2, 0], shL: [-0.7, 0.2, 0.4], elL: [-1.6], P: [0, 0, -0.03] }],
    [0.45, { shR: [-0.9, 0.7, -0.1], elR: [-0.3], chest: [0.15, 0.5, -0.08], spine: [0.25, 0.25, -0.03], hips: [0.08, 0.25, 0], shL: [-0.4, 0, 0.7], elL: [-0.9], P: [0, -0.1, 0.09] }],
    [0.62, { shR: [-0.6, 0.95, -0.05], elR: [-0.4], chest: [0.15, 0.6, -0.08], spine: [0.25, 0.28, -0.03], hips: [0.08, 0.28, 0], P: [0, -0.1, 0.08] }],
    [1, {}]] },
  // danse des lames : bras ouverts, accroupi, le corps tourne (spin: le moteur fait pivoter l'acteur)
  bladeDance: { hitU: 0.42, cat: 'dagger', spin: true, keys: [[0, {}],
    [0.2, { shR: [-0.6, -0.8, -1.0], elR: [-1.2], shL: [-0.6, 0.8, 1.0], elL: [-1.2], chest: [0, -0.5, 0], spine: [0.15, -0.2, 0], P: [0, -0.12, 0] }],
    [0.42, { shR: [-1.4, 0.3, -1.2], elR: [-0.15], shL: [-0.9, -0.2, 1.2], elL: [-0.3], chest: [0.05, 0.4, 0], spine: [0.2, 0.2, -0.1], P: [0, -0.16, 0.04] }],
    [0.7, { shR: [-1.3, 0.6, -1.3], elR: [-0.2], shL: [-1.0, 0, 1.2], elL: [-0.3], chest: [0.05, 0.5, 0], spine: [0.18, 0.2, -0.1], P: [0, -0.14, 0.03] }],
    [0.88, { shR: [-0.8, 0.1, -0.6], elR: [-0.9], shL: [-0.7, 0, 0.6], elL: [-1.0], P: [0, -0.05, 0] }], [1, {}]] },
  // double estoc : les deux lames plongent ensemble
  twinStab: { hitU: 0.45, cat: 'dagger', keys: [[0, {}],
    [0.28, { shR: [-0.3, -0.1, -0.45], elR: [-2.0], shL: [-0.3, 0.1, 0.45], elL: [-2.0], spine: [0.05], P: [0, -0.06, -0.04] }],
    [0.45, { shR: [-1.45, 0.2, -0.02], elR: [-0.15], shL: [-1.45, -0.2, 0.02], elL: [-0.15], spine: [0.3], chest: [0.08], hips: [0.06], P: [0, -0.12, 0.14] }],
    [0.62, { shR: [-1.4, 0.18, -0.02], elR: [-0.2], shL: [-1.4, -0.18, 0.02], elL: [-0.2], spine: [0.28], chest: [0.08], P: [0, -0.11, 0.13] }],
    [0.85, { shR: [-0.7, 0, -0.3], elR: [-1.4], shL: [-0.7, 0, 0.3], elL: [-1.5], spine: [0.1], P: [0, -0.03, 0.03] }], [1, {}]] },
  // coupe en croix : les deux bras partent hauts et se croisent devant
  crossCut: { hitU: 0.48, cat: 'dagger', keys: [[0, {}],
    [0.3, { shR: [-2.4, -0.3, -0.9], elR: [-1.2], shL: [-2.4, 0.3, 0.9], elL: [-1.2], spine: [-0.1], chest: [-0.08], P: [0, 0.01, -0.02] }],
    [0.48, { shR: [-1.0, 0.6, 0.1], elR: [-0.4], shL: [-1.0, -0.6, -0.1], elL: [-0.4], spine: [0.35], chest: [0.1], P: [0, -0.12, 0.1] }],
    [0.66, { shR: [-0.8, 0.7, 0.1], elR: [-0.45], shL: [-0.8, -0.7, -0.1], elL: [-0.45], spine: [0.35], chest: [0.1], P: [0, -0.12, 0.09] }],
    [1, {}]] },

  /* ----- bâton ----- */
  // fauchage bas : accroupi, le bâton rase le sol de droite à gauche
  staffSweep: { hitU: 0.5, ground: true, cat: 'staff', grip2: 0.5, keys: [[0, {}],
    [0.3, { shR: [-0.7, -0.5, -0.6], elR: [-0.9], shL: [-0.9, -0.6, 0.1], elL: [-1.0], chest: [0.1, -0.75, 0.05], spine: [0.3, -0.35, 0], hips: [0.1, -0.4, 0], P: [0, -0.18, -0.03] }],
    [0.5, { haR: [-0.95], shR: [-0.9, 0.6, -0.4], elR: [-0.15], shL: [-0.8, 0.7, 0.4], elL: [-0.6], chest: [0.2, 0.7, -0.08], spine: [0.4, 0.35, -0.04], hips: [0.12, 0.38, 0], P: [0, -0.26, 0.06] }],
    [0.7, { haR: [-0.95], shR: [-0.8, 0.8, -0.3], elR: [-0.2], shL: [-0.7, 1.0, 0.4], elL: [-0.6], chest: [0.2, 0.85, -0.08], spine: [0.38, 0.4, -0.04], hips: [0.1, 0.42, 0], P: [0, -0.24, 0.05] }],
    [1, {}]] },
  // moulinet : le bâton tourne au-dessus de la tête puis frappe à l'horizontale (spin)
  staffTwirl: { hitU: 0.45, cat: 'staff', spin: true, grip2: 0.5, keys: [[0, {}],
    [0.25, { shR: [-2.7, 0, -0.4], elR: [-0.7], shL: [-2.6, 0, 0.4], elL: [-0.8], spine: [-0.15], head: [0.15], P: [0, 0.02, 0] }],
    [0.45, { shR: [-1.35, 0.4, -0.45], elR: [-0.2], shL: [-1.3, 0.6, 0.5], elL: [-0.6], chest: [0.05, 0.5, -0.05], spine: [0.15, 0.2, 0], P: [0, -0.1, 0.05] }],
    [0.7, { shR: [-1.32, 0.45, -0.45], elR: [-0.2], shL: [-1.25, 0.7, 0.5], elL: [-0.6], chest: [0.05, 0.55, -0.05], spine: [0.15, 0.22, 0], P: [0, -0.1, 0.04] }],
    [1, {}]] },

  /* ----- Destin ----- */
  // Jugement : poings croisés sur la poitrine, on se ramasse, puis les bras s'ouvrent et la tête se lève
  reckonCall: { hitU: 0.55, cat: 'fate', legs: 'LR', keys: [[0, {}],
    [0.3, { hipL: [-0.7, 0, 0.12], knL: [1.25], anL: [-0.55], hipR: [-0.5, 0, -0.12], knR: [1.0], anR: [-0.5], spine: [0.45], chest: [0.15], head: [0.3], shL: [-0.9, -0.5, 0.2], elL: [-1.9], shR: [-0.9, 0.5, -0.2], elR: [-1.9], P: [0, -0.2, 0] }],
    [0.55, { hipL: [-0.1, 0, 0.15], knL: [0.15], anL: [0], hipR: [-0.1, 0, -0.15], knR: [0.15], anR: [0], spine: [-0.3], chest: [-0.2], head: [-0.45], shL: [-2.2, 0, 1.3], elL: [-0.2], shR: [-2.2, 0, -1.3], elR: [-0.2], P: [0, 0.04, 0] }],
    [0.8, { hipL: [-0.1, 0, 0.14], knL: [0.2], hipR: [-0.1, 0, -0.14], knR: [0.2], spine: [-0.22], chest: [-0.15], head: [-0.3], shL: [-1.8, 0, 1.1], elL: [-0.3], shR: [-1.8, 0, -1.1], elR: [-0.3], P: [0, 0.02, 0] }],
    [1, {}]] },
  // Dénouement : bond, l'arme levée à deux mains, réception un genou à terre en la plantant
  fateshift: { hitU: 0.6, ground: true, cat: 'fate', legs: 'LR', grip2: 0.16, keys: [[0, {}],
    [0.15, { hipL: [-0.85, 0, 0.1], knL: [1.5], anL: [-0.65], hipR: [-0.85, 0, -0.1], knR: [1.5], anR: [-0.65], spine: [0.45], shR: [0.2, 0, -0.35], elR: [-1.3], haR: [-0.7], shL: [0.2, 0, 0.35], elL: [-1.3], P: [0, -0.22, 0] }],
    [0.38, { hipL: [-1.2, 0, 0.08], knL: [1.8], anL: [0.2], hipR: [-0.9, 0, -0.08], knR: [1.6], anR: [0.2], spine: [-0.2], head: [0.2], shR: [-3.05, 0.2, -0.05], elR: [-0.3], shL: [-3.05, -0.2, 0.05], elL: [-0.3], P: [0, 0.45, 0.05] }],
    [0.6, { haR: [-0.3], hipL: [-1.45, 0, 0.08], knL: [2.1], anL: [-0.65], hipR: [0.1, 0, -0.08], knR: [1.7], anR: [0.6], spine: [0.65], chest: [0.2], head: [-0.25], shR: [-1.0, 0.25, 0], elR: [-0.05], shL: [-1.0, -0.25, 0], elL: [-0.05], P: [0, -0.5, 0.05] }],
    [0.85, { haR: [-0.3], hipL: [-1.42, 0, 0.08], knL: [2.08], anL: [-0.66], hipR: [0.08, 0, -0.08], knR: [1.68], anR: [0.6], spine: [0.6], chest: [0.18], head: [-0.15], shR: [-1.05, 0.25, 0], elR: [-0.1], shL: [-1.05, -0.25, 0], elL: [-0.1], P: [0, -0.49, 0.05] }],
    [1, {}]] },

  /* ----- épée longue (une main) ----- */
  // taille de droite à gauche, à hauteur de poitrine
  swordSlash: { hitU: 0.5, cat: 'sword', keys: [[0, {}],
    [0.3, { shR: [-1.3, -1.1, -1.0], elR: [-1.0], haR: [0.3], chest: [0.02, -0.8, 0.05], spine: [0.06, -0.35, 0], hips: [0.04, -0.4, 0], shL: [-0.6, 0.3, 0.6], elL: [-1.4], P: [0, -0.05, -0.03] }],
    [0.5, { shR: [-1.5, 0.4, -0.2], elR: [-0.1], haR: [-0.2], chest: [0.1, 0.6, -0.06], spine: [0.15, 0.3, -0.03], hips: [0.08, 0.32, 0], shL: [-0.4, -0.1, 0.7], elL: [-1.0], P: [0, -0.08, 0.08] }],
    [0.68, { shR: [-1.3, 1.0, -0.4], elR: [-0.2], chest: [0.1, 0.85, -0.06], spine: [0.14, 0.4, -0.03], hips: [0.07, 0.4, 0], P: [0, -0.07, 0.07] }],
    [1, {}]] },
  // retour en revers, de gauche à droite
  swordReturn: { hitU: 0.48, cat: 'sword', keys: [[0, {}],
    [0.28, { shR: [-1.4, 1.1, -0.4], elR: [-1.7], haR: [0.4], chest: [0.05, 0.6, -0.04], spine: [0.1, 0.3, 0], hips: [0.04, 0.3, 0], P: [0, -0.06, -0.02] }],
    [0.48, { shR: [-1.5, -0.5, -0.9], elR: [-0.1], haR: [-0.2], chest: [0.1, -0.55, 0.05], spine: [0.16, -0.25, 0.03], hips: [0.07, -0.3, 0], shL: [-0.5, 0.3, 0.6], elL: [-1.2], P: [0, -0.08, 0.08] }],
    [0.66, { shR: [-1.2, -0.9, -1.1], elR: [-0.2], chest: [0.08, -0.7, 0.05], spine: [0.14, -0.32, 0.03], hips: [0.06, -0.36, 0], P: [0, -0.07, 0.06] }],
    [1, {}]] },
  // estoc fendu : grand pas en avant, bras et lame alignés
  swordThrust: { hitU: 0.45, cat: 'sword', keys: [[0, {}],
    [0.3, { shR: [-0.9, -0.3, -0.5], elR: [-2.0], haR: [0.4], chest: [0.04, -0.4, 0.03], spine: [0.05, -0.15, 0], hips: [0.02, -0.25, 0], shL: [-0.7, 0.2, 0.5], elL: [-1.5], P: [0, -0.06, -0.06] }],
    [0.45, { shR: [-1.55, 0.15, -0.05], elR: [-0.05], haR: [0.2], chest: [0.14, 0.45, -0.05], spine: [0.3, 0.2, -0.02], hips: [0.1, 0.25, 0], shL: [-0.1, 0, 0.9], elL: [-0.4], P: [0, -0.16, 0.18] }],
    [0.65, { shR: [-1.5, 0.15, -0.05], elR: [-0.1], chest: [0.13, 0.42, -0.05], spine: [0.28, 0.2, -0.02], hips: [0.09, 0.23, 0], shL: [-0.15, 0, 0.9], elL: [-0.45], P: [0, -0.15, 0.16] }],
    [0.88, { shR: [-0.7, 0, -0.3], elR: [-1.3], chest: [0.03, 0.05, 0], spine: [0.08, 0.02, 0], P: [0, -0.04, 0.03] }], [1, {}]] },
  // taille montante (fin à pause) : la lame part du sol et projette l'ennemi en l'air
  risingSlash: { hitU: 0.5, cat: 'sword', keys: [[0, {}],
    [0.3, { shR: [-0.1, -0.3, -0.6], elR: [-0.6], haR: [0.2], spine: [0.35, -0.2, 0], chest: [0.1, -0.3, 0], hips: [0.05, -0.3, 0], shL: [-0.5, 0, 0.5], elL: [-1.3], P: [0, -0.18, -0.02] }],
    [0.5, { shR: [-2.8, 0.2, -0.3], elR: [-0.3], haR: [-0.4], spine: [-0.25, 0.2, 0], chest: [-0.1, 0.25, 0], hips: [0, 0.2, 0], head: [-0.25], shL: [-0.3, 0, 0.9], elL: [-0.6], P: [0, 0.04, 0.08] }],
    [0.7, { shR: [-2.85, 0.2, -0.3], elR: [-0.35], spine: [-0.25, 0.2, 0], chest: [-0.1, 0.25, 0], hips: [0, 0.2, 0], head: [-0.2], shL: [-0.35, 0, 0.85], elL: [-0.7], P: [0, 0.04, 0.07] }],
    [1, {}]] },

  /* ----- espadon (deux mains) ----- */
  // diagonale à deux mains, de haut à droite vers bas à gauche
  greatDiag: { hitU: 0.55, cat: 'greatsword', grip2: 0.18, keys: [[0, {}],
    [0.35, { shR: [-2.7, -0.5, -0.5], elR: [-1.4], shL: [-2.5, -0.9, 0.0], elL: [-1.5], chest: [-0.05, -0.5, 0.05], spine: [-0.1, -0.25, 0], hips: [0, -0.3, 0], P: [0, 0, -0.04] }],
    [0.55, { shR: [-0.9, 0.6, -0.1], elR: [-0.2], shL: [-0.9, 0.1, 0.1], elL: [-0.4], chest: [0.18, 0.6, -0.08], spine: [0.3, 0.3, -0.04], hips: [0.1, 0.35, 0], P: [0, -0.14, 0.1] }],
    [0.74, { shR: [-0.6, 0.9, -0.1], elR: [-0.3], shL: [-0.6, 0.5, 0.1], elL: [-0.5], chest: [0.2, 0.75, -0.08], spine: [0.32, 0.35, -0.04], hips: [0.1, 0.4, 0], P: [0, -0.15, 0.09] }],
    [1, {}]] },
  // large revers horizontal à deux mains
  greatWide: { hitU: 0.52, cat: 'greatsword', grip2: 0.18, keys: [[0, {}],
    [0.32, { shR: [-1.2, 1.0, -0.1], elR: [-1.2], shL: [-1.2, 0.7, 0.3], elL: [-1.3], chest: [0.04, 0.8, -0.05], spine: [0.1, 0.4, 0], hips: [0.04, 0.45, 0], P: [0, -0.08, -0.02] }],
    [0.52, { shR: [-1.4, -0.2, -0.35], elR: [-0.2], shL: [-1.4, -0.75, -0.1], elL: [-0.3], chest: [0.12, -0.7, 0.06], spine: [0.18, -0.35, 0.03], hips: [0.08, -0.4, 0], P: [0, -0.1, 0.08] }],
    [0.7, { shR: [-1.25, -0.55, -0.55], elR: [-0.3], shL: [-1.2, -1.1, -0.3], elL: [-0.4], chest: [0.1, -0.95, 0.06], spine: [0.16, -0.45, 0.03], hips: [0.06, -0.48, 0], P: [0, -0.09, 0.07] }],
    [1, {}]] },
  // tourbillon (fin à pause) : lame tendue sur le côté, le corps tourne (spin)
  greatWhirl: { hitU: 0.45, cat: 'greatsword', spin: true, grip2: 0.18, keys: [[0, {}],
    [0.25, { shR: [-1.0, -1.0, -0.6], elR: [-0.6], shL: [-1.0, -1.3, 0.0], elL: [-0.7], chest: [0.05, -0.7, 0], spine: [0.15, -0.3, 0], P: [0, -0.12, 0] }],
    [0.45, { shR: [-1.4, 0.35, -0.5], elR: [-0.1], shL: [-1.4, -0.3, -0.6], elL: [-0.2], chest: [0.05, 0.3, 0], spine: [0.2, 0.15, -0.12], P: [0, -0.18, 0.03] }],
    [0.75, { shR: [-1.38, 0.38, -0.5], elR: [-0.15], shL: [-1.35, -0.25, -0.6], elL: [-0.25], chest: [0.05, 0.32, 0], spine: [0.18, 0.15, -0.12], P: [0, -0.16, 0.03] }],
    [1, {}]] },

  /* ----- sceptre ----- */
  // trait : le sceptre est projeté vers l'avant, poignet cassé au moment du sort
  scepterBolt: { hitU: 0.5, cat: 'scepter', keys: [[0, {}],
    [0.3, { shR: [-0.6, -0.3, -0.6], elR: [-1.9], haR: [0.5], chest: [0.03, -0.35, 0.03], spine: [0.05, -0.12, 0], hips: [0.02, -0.2, 0], shL: [-0.9, 0.2, 0.4], elL: [-1.7], P: [0, -0.04, -0.04] }],
    [0.5, { shR: [-1.65, 0.1, -0.05], elR: [-0.05], haR: [-0.6], chest: [0.08, 0.35, -0.04], spine: [0.12, 0.15, -0.02], hips: [0.04, 0.18, 0], shL: [-0.4, 0.1, 0.5], elL: [-1.2], P: [0, -0.05, 0.07] }],
    [0.7, { shR: [-1.6, 0.1, -0.05], elR: [-0.1], haR: [-0.5], chest: [0.07, 0.32, -0.04], spine: [0.11, 0.14, -0.02], hips: [0.04, 0.16, 0], P: [0, -0.05, 0.06] }],
    [1, {}]] },
  // vague : les deux bras balaient de droite à gauche
  scepterWave: { hitU: 0.5, cat: 'scepter', keys: [[0, {}],
    [0.3, { shR: [-1.2, -0.9, -0.8], elR: [-0.6], shL: [-1.2, -0.4, 0.0], elL: [-1.3], chest: [0.03, -0.6, 0.04], spine: [0.06, -0.28, 0], hips: [0.03, -0.3, 0], P: [0, -0.05, -0.02] }],
    [0.5, { shR: [-1.4, 0.5, -0.3], elR: [-0.2], shL: [-1.4, 0.9, 0.6], elL: [-0.2], chest: [0.08, 0.55, -0.05], spine: [0.12, 0.28, 0], hips: [0.05, 0.3, 0], P: [0, -0.07, 0.06] }],
    [0.7, { shR: [-1.35, 0.6, -0.35], elR: [-0.25], shL: [-1.35, 1.0, 0.6], elL: [-0.25], chest: [0.08, 0.6, -0.05], spine: [0.12, 0.3, 0], hips: [0.05, 0.32, 0], P: [0, -0.07, 0.05] }],
    [1, {}]] },
  // nova (fin à pause) : sceptre levé à deux mains puis planté au sol, onde autour
  scepterNova: { hitU: 0.6, ground: true, cat: 'scepter', grip2: 0.14, keys: [[0, {}],
    [0.35, { shR: [-3.0, 0.2, -0.15], elR: [-0.4], haR: [-0.3], shL: [-3.0, -0.2, 0.15], elL: [-0.5], spine: [-0.25], chest: [-0.12], head: [0.3], P: [0, 0.04, 0] }],
    [0.6, { shR: [-0.6, 0.15, -0.1], elR: [-0.2], haR: [0.1], shL: [-0.6, -0.15, 0.1], elL: [-0.3], spine: [0.55], chest: [0.15], head: [-0.2], P: [0, -0.3, 0.04] }],
    [0.8, { shR: [-0.55, 0.15, -0.1], elR: [-0.25], haR: [0.1], shL: [-0.55, -0.15, 0.1], elL: [-0.35], spine: [0.55], chest: [0.15], head: [-0.15], P: [0, -0.3, 0.04] }],
    [1, {}]] },

  /* ----- bouclier ----- */
  // coup de bouclier : le bras gauche, plié, est projeté avec l'épaule
  shieldBash: { hitU: 0.45, cat: 'shield', keys: [[0, {}],
    [0.28, { shL: [-1.1, -0.3, 0.0], elL: [-1.9], chest: [0.03, 0.35, -0.03], spine: [0.05, 0.15, 0], hips: [0.02, 0.25, 0], shR: [-0.5, 0, -0.3], elR: [-1.4], P: [0, -0.06, -0.04] }],
    [0.45, { shL: [-1.5, -0.4, -0.1], elL: [-1.5], chest: [0.12, -0.35, 0.04], spine: [0.25, -0.15, 0], hips: [0.08, -0.2, 0], P: [0, -0.1, 0.14] }],
    [0.62, { shL: [-1.45, -0.4, -0.1], elL: [-1.55], chest: [0.11, -0.32, 0.04], spine: [0.23, -0.14, 0], hips: [0.07, -0.18, 0], P: [0, -0.09, 0.13] }],
    [1, {}]] }
};
/* ---------- prise à deux mains ----------
   Les clips « grip2 » posent la main gauche sur le manche, à grip2 m du poing droit le long de l'arme :
   un petit IK (moindres carrés amortis sur l'épaule et le coude gauches) corrige le bras gauche du clip. */
const _gw = [], _gt = M4.create(); for (let i = 0; i <= BI.haR; i++) _gw.push(M4.create());
function _gripFK(P) {
  for (let i = 1; i <= BI.haR; i++) {
    const b = BONES[i], ax = typeof ARM_X === 'number' ? ARM_X : 0.19; let ox = b[2], oy = b[3], oz = b[4];
    if (i === 1) { ox += P[HX]; oy += P[HY]; oz += P[HZ]; } else if (i === BI.shL) ox = ax; else if (i === BI.shR) ox = -ax;
    if (XZY[i]) M4.composeXZY(_gt, ox, oy, oz, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); else M4.compose(_gt, ox, oy, oz, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    M4.mul(_gw[i], _gw[b[1]], _gt);
  }
}
const _gp = (i, x, y, z) => { const m = _gw[i]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; };
function fantasyGrip(C, u, O) {
  const w = Math.min(ease(u / 0.14), ease((1 - u) / 0.14)); if (!(w > 0.002)) return;
  const r = C.cat === 'staff' ? 0.35 : 0.9, d = C.grip2, ix = [CH.shL, CH.shL + 1, CH.shL + 2, CH.elL], q0 = ix.map(k => O[k]);
  _gripFK(O); const tg = _gp(BI.haR, -0.033, -0.097 - Math.cos(r) * d, Math.sin(r) * d);
  for (let it = 0; it < 14; it++) {
    _gripFK(O); const a = _gp(BI.haL, 0.033, -0.097, 0), e = [tg[0] - a[0], tg[1] - a[1], tg[2] - a[2]];
    if (e[0] * e[0] + e[1] * e[1] + e[2] * e[2] < 1e-6) break;
    const J = ix.map(k => { const v = O[k]; O[k] = v + 1e-3; _gripFK(O); const b = _gp(BI.haL, 0.033, -0.097, 0); O[k] = v; return [(b[0] - a[0]) * 1e3, (b[1] - a[1]) * 1e3, (b[2] - a[2]) * 1e3]; });
    // dq = Jt (J Jt + l2 I)^-1 e
    const A = [0, 1, 2].map(i => [0, 1, 2].map(j => J.reduce((s, c) => s + c[i] * c[j], i === j ? 0.01 : 0)));
    const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    const inv = [[A[1][1] * A[2][2] - A[1][2] * A[2][1], A[0][2] * A[2][1] - A[0][1] * A[2][2], A[0][1] * A[1][2] - A[0][2] * A[1][1]],
      [A[1][2] * A[2][0] - A[1][0] * A[2][2], A[0][0] * A[2][2] - A[0][2] * A[2][0], A[0][2] * A[1][0] - A[0][0] * A[1][2]],
      [A[1][0] * A[2][1] - A[1][1] * A[2][0], A[0][1] * A[2][0] - A[0][0] * A[2][1], A[0][0] * A[1][1] - A[0][1] * A[1][0]]];
    const y = inv.map(row => (row[0] * e[0] + row[1] * e[1] + row[2] * e[2]) / det);
    ix.forEach((k, j) => { O[k] += J[j][0] * y[0] + J[j][1] * y[1] + J[j][2] * y[2]; });
    O[CH.elL] = clamp(O[CH.elL], -2.4, -0.02);
  }
  if (w < 1) ix.forEach((k, j) => { O[k] = q0[j] + (O[k] - q0[j]) * w; });
}

/* ---------- passe de style ----------
   Les clips sont écrits en poses clés simples (armé, impact, accompagnement) ; une spline monotone entre ces poses
   freine l'arme juste avant l'impact (13 % de sa vitesse de pointe en moyenne). La passe de style, appliquée à
   l'enregistrement, reprend les principes des jeux d'action :
   · armé chargé : l'arme recule encore un peu puis part tard, l'accélération se fait juste avant l'impact ;
   · sortie rapide : l'arme traverse la cible, l'accompagnement dépasse sa pose puis revient (follow-through) ;
   · coups vers le sol (ground) : l'arme s'arrête net sur le sol au lieu de le traverser ;
   · articulations en cascade : hanches, buste, épaule, coude puis poignet partent les uns après les autres
     et la tête suit en retard (fantasyEval, à l'évaluation). Le poids de l'arme règle chaque effet. */
const STYLE = {
  fists: { coil: 0.08, over: 0.08, drag: 0.8 }, heavy: { coil: 0.12, over: 0.14, drag: 1.3 }, dagger: { coil: 0.05, over: 0.06, drag: 0.6 },
  sword: { coil: 0.08, over: 0.1, drag: 1 }, greatsword: { coil: 0.12, over: 0.14, drag: 1.3 }, staff: { coil: 0.08, over: 0.1, drag: 1 },
  scepter: { coil: 0.06, over: 0.08, drag: 0.8 }, shield: { coil: 0.06, over: 0.06, drag: 0.8 }, fate: { coil: 0.1, over: 0.1, drag: 1 }
};
// how far ahead (-) or behind (+) of the clip each joint moves, in clip time, before the weight factor
const LEAD = { P: -0.045, hips: -0.05, spine: -0.035, chest: -0.02, head: 0.035, elL: 0.015, elR: 0.015, haL: 0.03, haR: 0.03 };
// a key between A and B (s = 0 → A, 1 → B, beyond → past them). A value missing from a key means « the base pose »,
// which is not known here: the new key then copies the value of the key it is closer to, or leaves it to the base too
function mixKey(A, B, s) {
  const o = {}, near = s < 0.5 ? A : B;
  for (const j of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[j] || [], b = B[j] || [], c = near[j] || [], v = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) v.push(a[i] !== undefined && b[i] !== undefined ? a[i] + (b[i] - a[i]) * s : c[i]);
    // elbows and knees never bend backwards, however far the key is pushed
    if (/^el/.test(j) && v[0] !== undefined) v[0] = Math.min(v[0], -0.02);
    if (/^kn/.test(j) && v[0] !== undefined) v[0] = Math.max(v[0], 0.02);
    if (v.some(x => x !== undefined)) o[j] = v;
  }
  return o;
}
const isRest = k => k === 'S' || Object.keys(k).length === 0;
function stylize(def) {
  const S = STYLE[def.cat] || STYLE.sword, keys = def.keys.map(k => [k[0], k[1]]), h = keys.findIndex(k => k[0] === def.hitU);
  if (h < 1) return Object.assign({}, def, { drag: S.drag });
  const W = keys[h - 1], H = keys[h], F = keys[h + 1], out = keys.slice(0, h - 1);
  out.push(W);
  const C = isRest(W[1]) ? W : [W[0] + (H[0] - W[0]) * 0.5, mixKey(W[1], H[1], -S.coil)];   // coil: slow start, late whip
  if (C !== W) out.push(C);
  out.push(H);
  if (F && !isRest(F[1])) {
    // the blade keeps its speed through the target: every joint carries on in its strike direction a little while
    const te = (F[0] - H[0]) * 0.2, e = def.ground ? 0.04 : clamp(te / Math.max(0.02, H[0] - C[0]), 0.1, 0.5);
    out.push([H[0] + te, isRest(C[1]) ? mixKey(H[1], F[1], 0.5) : mixKey(C[1], H[1], 1 + e)]);
    out.push([F[0], def.ground ? F[1] : Object.assign({}, F[1], mixKey(H[1], F[1], 1 + S.over))]); // overshoot past the follow pose (not into the ground)
    out.push(...keys.slice(h + 2));
  } else out.push(...keys.slice(h + 1));
  return Object.assign({}, def, { keys: out, drag: def.ground ? S.drag * 0.4 : S.drag });
}
function laggedClip(def) {
  const C = makeClip(def);
  for (const c of C.chans) c.lag = LEAD[c.idx >= NANG ? 'P' : BONES[Math.floor(c.idx / 3)][0]] || 0;
  return C;
}
// clipEval with each channel shifted in time by its lag (successive breaking of joints)
function fantasyEval(C, u, B, O, w = 1) {
  const t = C.times, n = C.n, D = C.drag || 0;
  for (let j = 0; j < C.chans.length; j++) {
    const c = C.chans[j], uc = clamp(u + c.lag * -D, 0, 1);
    let k = 0; while (k < n - 2 && t[k + 1] <= uc) k++;
    const hk = Math.max(1e-5, t[k + 1] - t[k]), s = clamp((uc - t[k]) / hk, 0, 1), s2 = s * s, s3 = s2 * s;
    const bv = c.add ? 0 : B[c.idx];
    const v = (2 * s3 - 3 * s2 + 1) * _kv(c, k, bv) + (s3 - 2 * s2 + s) * hk * _kt(c, t, k, n, bv) + (-2 * s3 + 3 * s2) * _kv(c, k + 1, bv) + (s3 - s2) * hk * _kt(c, t, k + 1, n, bv);
    const full = c.add ? B[c.idx] + v : v;
    O[c.idx] = w >= 1 ? full : B[c.idx] + (c.idx < NANG ? wrapAngle(full - B[c.idx]) : full - B[c.idx]) * w;
  }
}
for (const k in FANTASY_CLIPS) {
  const D = stylize(FANTASY_CLIPS[k]); CLIP_DEFS[k] = D; CLIPS2[k] = laggedClip(D);
  CLIPS2[k].raw = makeClip(FANTASY_CLIPS[k]);   // the clip before the style pass, to compare
}

/* ---------- branchement (à l'intégration) ----------
   SWAP : les attaques du Destin gardent leurs réglages et prennent leur nouveau clip.
   ATK  : les attaques des armes fantasy, au format ATK de 11_actors.js.
   COMBOS : la chaîne de chaque arme fantasy et sa fin à pause (format de 11b_destin.js). */
const AnimFantasy = {
  CLIPS: FANTASY_CLIPS,
  clip: name => CLIPS2[name],
  style: true, // false: the clips as authored, without the style pass (to compare)
  SWAP: { p_upper: 'uppercut', p_shove: 'palmBurst', p_swing2: 'backhand', p_overhead: 'cleave', p_slam: 'leapSlam',
    p_stab2: 'reverseStab', p_slash: 'diagSlash', p_flurry: 'bladeDance', p_staff2: 'staffSweep', p_staff3: 'staffTwirl' },
  ATK: {
    // épée longue
    f_swSlash: { clip: 'swordSlash', dur: 0.5, hit: 0.24, range: 2.1, dmg: 22, knock: 3, lunge: 2.6, snd: 'flesh', poise: 30, arc: 1.5, lethal: true, cancel: 0.36 },
    f_swReturn: { clip: 'swordReturn', dur: 0.48, hit: 0.22, range: 2.1, dmg: 22, knock: 3, lunge: 2.4, snd: 'flesh', poise: 30, arc: 1.5, lethal: true, cancel: 0.34 },
    f_swThrust: { clip: 'swordThrust', dur: 0.62, hit: 0.28, range: 2.6, dmg: 30, knock: 6, lunge: 4.2, snd: 'flesh', poise: 55, lethal: true, cancel: 0.45, fin: true },
    f_swRise: { clip: 'risingSlash', dur: 0.7, hit: 0.34, range: 2.2, dmg: 26, knock: 4, lunge: 2, snd: 'heavy', poise: 80, kd: 1, lethal: true, cancel: 0.52, fin: true, pause: true },
    // espadon
    f_gsDiag: { clip: 'greatDiag', dur: 0.78, hit: 0.42, range: 2.6, dmg: 34, knock: 6, lunge: 2.4, snd: 'heavy', poise: 60, arc: 1.5, lethal: true, cancel: 0.55 },
    f_gsWide: { clip: 'greatWide', dur: 0.74, hit: 0.38, range: 2.7, dmg: 32, knock: 6, lunge: 2, snd: 'heavy', poise: 60, arc: 2, lethal: true, cancel: 0.52 },
    f_gsCrush: { clip: 'cleave', dur: 0.95, hit: 0.55, range: 2.7, dmg: 46, knock: 9, lunge: 2.6, snd: 'heavy', poise: 100, kd: 1, lethal: true, cancel: 0.68, fin: true },
    f_gsWhirl: { clip: 'greatWhirl', dur: 0.9, hit: 0.4, hitEnd: 0.7, range: 2.8, dmg: 30, knock: 7, lunge: 1.2, snd: 'heavy', poise: 70, kd: 0.8, arc: 3.2, spin: true, lethal: true, cancel: 0.66, fin: true, pause: true },
    // marteau de guerre
    f_hmUp: { clip: 'upswing', dur: 0.72, hit: 0.36, range: 2.2, dmg: 30, knock: 6, lunge: 2, snd: 'heavy', poise: 70, cancel: 0.5 },
    f_hmBack: { clip: 'backhand', dur: 0.7, hit: 0.35, range: 2.3, dmg: 30, knock: 7, lunge: 2, snd: 'heavy', poise: 70, arc: 1.5, cancel: 0.5 },
    f_hmCleave: { clip: 'cleave', dur: 1.0, hit: 0.58, range: 2.5, dmg: 48, knock: 9, lunge: 2.4, snd: 'heavy', poise: 110, kd: 1, cancel: 0.72, fin: true },
    f_hmSlam: { clip: 'leapSlam', dur: 1.1, hit: 0.66, range: 3.8, dmg: 36, knock: 10, lunge: 3, snd: 'slam', poise: 110, kd: 1, aoe: true, arc: 3.2, cancel: 0.82, fin: true, pause: true },
    // dagues
    f_dgStab: { clip: 'reverseStab', dur: 0.34, hit: 0.15, range: 1.5, dmg: 16, knock: 1, lunge: 3.6, snd: 'flesh', poise: 12, lethal: true, cancel: 0.22 },
    f_dgDiag: { clip: 'diagSlash', dur: 0.4, hit: 0.18, range: 1.7, dmg: 17, knock: 1.5, lunge: 3, snd: 'flesh', poise: 15, arc: 1.4, lethal: true, cancel: 0.26 },
    f_dgCross: { clip: 'crossCut', dur: 0.46, hit: 0.22, range: 1.7, dmg: 20, knock: 2.5, lunge: 2.6, snd: 'flesh', poise: 25, arc: 1.4, lethal: true, cancel: 0.32 },
    f_dgTwin: { clip: 'twinStab', dur: 0.5, hit: 0.22, range: 1.7, dmg: 26, knock: 4, lunge: 3.8, snd: 'flesh', poise: 35, lethal: true, cancel: 0.36, fin: true },
    f_dgDance: { clip: 'bladeDance', dur: 0.66, hit: 0.28, hitEnd: 0.52, range: 2, dmg: 18, knock: 4, lunge: 1.2, snd: 'flesh', poise: 40, arc: 3.2, spin: true, lethal: true, cancel: 0.48, fin: true, pause: true },
    // sceptre (le projectile reste à brancher : en attendant c'est une frappe à longue portée)
    f_scBolt: { clip: 'scepterBolt', dur: 0.5, hit: 0.25, range: 4, dmg: 16, knock: 2, lunge: 0.6, snd: 'heavy', poise: 20, cancel: 0.36 },
    f_scWave: { clip: 'scepterWave', dur: 0.6, hit: 0.3, range: 3.2, dmg: 18, knock: 4, lunge: 0.6, snd: 'heavy', poise: 35, arc: 2.2, cancel: 0.44 },
    f_scNova: { clip: 'scepterNova', dur: 0.9, hit: 0.54, range: 3.6, dmg: 28, knock: 8, lunge: 0, snd: 'slam', poise: 80, kd: 1, aoe: true, arc: 3.2, cancel: 0.68, fin: true, pause: true },
    // bouclier
    f_bash: { clip: 'shieldBash', dur: 0.5, hit: 0.22, range: 1.6, dmg: 10, knock: 7, lunge: 3, snd: 'heavy', poise: 70, cancel: 0.36 },
    // Destin
    f_reckon: { clip: 'reckonCall', dur: 1.0, hit: 0.55, range: 3.5, dmg: 0, knock: 6, lunge: 0, snd: 'heavy', poise: 60, aoe: true, arc: 3.2, cancel: 0.85 },
    f_fateshift: { clip: 'fateshift', dur: 1.3, hit: 0.78, range: 4, dmg: 0, knock: 9, lunge: 4, snd: 'slam', poise: 999, kd: 1, aoe: true, arc: 3.2, cancel: 1.2 }
  },
  COMBOS: {
    sword: { chain: ['f_swSlash', 'f_swReturn', 'f_swSlash', 'f_swThrust'], pause: 'f_swRise' },
    greatsword: { chain: ['f_gsDiag', 'f_gsWide', 'f_gsCrush'], pause: 'f_gsWhirl' },
    hammer: { chain: ['f_hmUp', 'f_hmBack', 'f_hmCleave'], pause: 'f_hmSlam' },
    daggers: { chain: ['f_dgStab', 'f_dgDiag', 'f_dgCross', 'f_dgTwin'], pause: 'f_dgDance' },
    scepter: { chain: ['f_scBolt', 'f_scBolt', 'f_scWave'], pause: 'f_scNova' }
  },
  // weaponIds : { sword: 'epee_longue', ... } pour accrocher les combos aux identifiants d'armes choisis par le loot
  install(weaponIds = {}) {
    if (typeof ATK === 'undefined') return false;
    for (const k in this.SWAP) if (ATK[k]) ATK[k].clip = this.SWAP[k];
    Object.assign(ATK, this.ATK);
    if (typeof COMBOS !== 'undefined') for (const k in this.COMBOS) COMBOS[weaponIds[k] || k] = this.COMBOS[k];
    // the two-handed clips put the left hand on the handle right after the clip is evaluated
    // the new clips go through fantasyEval (lagged joints), and the two-handed ones put the left hand on the handle
    if (!clipEval.fantasy) {
      const base = clipEval;
      clipEval = function (C, u, B, O, w) {
        if (!C.raw) return base(C, u, B, O, w);
        if (AnimFantasy.style) fantasyEval(C, u, B, O, w); else base(C.raw, u, B, O, w);
        if (C.grip2) fantasyGrip(C, clamp(u, 0, 1), O);
      };
      clipEval.fantasy = true;
    }
    return true;
  }
};
window.AnimFantasy = AnimFantasy; // reachable from the console and the tests
