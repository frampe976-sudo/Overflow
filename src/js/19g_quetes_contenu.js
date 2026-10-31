/* =====================================================================
   QUÊTES EN DONNÉES — contenu : tout ici s'écrit sans code moteur
   (voir 19f_quetes_donnees.js pour les conditions et actions possibles)
   ===================================================================== */
Object.assign(CODEX, {
  braseros: { cat: 'Lieux', title: 'Les braseros des noyés', text: 'Quatre braseros de pierre sur l’ancienne plateforme. Les Enfants de la Marée y brûlent du sel-de-lune pour « éclairer le chemin » des noyés qui remontent. Éteints, ils ne sont plus que des vasques froides où dorment les chats du port.' }
});

Object.assign(QUESTS, {
  braseros: {
    title: 'Les Braseros des noyés', kind: 'side', xp: 200,
    sum: () => 'Vous avez dispersé les veilleurs et éteint les braseros de la plateforme.',
    steps: {
      veilleurs: {
        text: 'Dispersez les veilleurs des braseros <small>{vaincus}/{total}</small>', tag: 'Veilleurs', ou: 'braziers',
        debut: [
          { fait: 'titre', titre: 'Les braseros des noyés', sous: 'Des silhouettes veillent les flammes.', style: 'bad' },
          { fait: 'ennemis', groupe: 'veilleurs', types: ['cultist', 'cultist', 'cultist'], lieu: 'braziers', rayon: 7, nom: 'Veilleur de la Marée', chef: { type: 'cultShot', nom: 'Gardien des feux', dx: 0, dz: 4 } }
        ],
        quand: { si: 'groupe_vaincu', groupe: 'veilleurs' },
        alors: [
          { fait: 'message', qui: 'Gardien des feux', texte: 'Les noyés… ne trouveront plus… le chemin…' },
          { fait: 'quete_etape', id: 'braseros', etape: 'autel' }
        ]
      },
      autel: {
        text: 'Éteignez l’autel entre les braseros', tag: 'Autel', ou: 'braziers',
        quand: { si: 'proche', lieu: 'braziers', rayon: 4 },
        alors: [
          { fait: 'codex', id: 'braseros' },
          { fait: 'drapeau', nom: 'braseros_eteints' },
          { fait: 'compteur', nom: 'ordre', ajoute: 5 },
          { fait: 'quete_fin', id: 'braseros' }
        ]
      }
    }
  }
});

DECLENCHEURS.push(
  // après le prologue, s'approcher de la plateforme lance la quête
  {
    id: 'braseros_debut',
    si: { tous: [{ si: 'quete', id: 'eveil', etat: 'finie' }, { si: 'quete', id: 'braseros', etat: 'absente' }, { si: 'proche', lieu: 'braziers', rayon: 26 }] },
    alors: [{ fait: 'quete_debut', id: 'braseros' }]
  },
  // de retour sur la plateforme une fois les feux éteints : la ville a remarqué
  {
    id: 'braseros_retour', apres: 'braseros_debut',
    si: { tous: [{ si: 'quete', id: 'braseros', etat: 'finie' }, { non: { si: 'proche', lieu: 'braziers', rayon: 30 } }, { si: 'temps', secondes: 20 }] },
    alors: [{ fait: 'message', qui: 'Une lavandière', texte: 'C’est vous qui avez éteint les feux de la plateforme ? On dort mieux depuis.' }]
  }
);
