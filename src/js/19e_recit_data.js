/* =====================================================================
   RÉCIT · contenu — prologue « L'Éveil » et chapitre I « La Cloche engloutie »
   Personnages, dialogues, quêtes et codex (le moteur est dans 19d_recit.js ;
   la trame complète est dans docs/scenario.md).
   ===================================================================== */
// where the people of the story stand: a named spot of the city, plus an offset
const at = (k, dx = 0, dz = 0, yaw = 0) => () => { const s = World.spots[k]; return { x: s.x + dx, z: s.z + dz, yaw }; };
const spotPos = k => { const s = World.spots[k]; return { x: s.x, y: s.y !== undefined ? s.y : World.groundAt(s.x, s.z, 0.3, 4), z: s.z }; };

Object.assign(STORY_FOLK, { nadia: 'Nadia', okafor: 'Okafor' });

/* ---------------- the people ---------------- */
Object.assign(STORY_NPCS, {
  anselme: { name: 'Anselme Roux', title: 'Dernier des Lampistes', app: 'anselme', col: '#d9c7a3', at: at('policeFront', 3, 4, Math.PI) },
  okafor: { name: 'Okafor', title: 'Capitaine du Guet', app: 'okafor', col: '#6fb8ff', at: at('policeFront', -5, 5, Math.PI * 0.85), here: S => S.done('eveil') || S.step('eveil') === 'okafor' || S.step('eveil') === 'anselme' },
  fredo: { name: 'Fredo', title: '« La Fouine »', app: 'fredo', col: '#e8b64a', at: at('plaza', 4, 2, Math.PI) },
  nadia: { name: 'Nadia Ferrand', title: 'Contrebandière des canaux', app: 'nadia', col: '#ff6b7d', at: at('market', 3, 2, -Math.PI / 2) },
  petronille: { name: 'Mme Pétronille', title: 'Tisseuse', app: 'petronille', col: '#e58ad8', at: at('park', 2, 3, Math.PI) },
  vasseur: { name: 'Victor Vasseur', title: 'Échevin du Sel', app: 'vasseur', col: '#f4f1e8', at: at('cityhall', 2, -2, Math.PI), here: S => S.step('cloche') === 'vasseur' || S.step('cloche') === 'rapport' || S.done('cloche') },
  maelle: {
    name: 'Sœur Maelle', title: 'Enfant de la Marée', app: 'cultist', col: '#2ef2b0',
    at: () => { const S = Story, m = S.flag('maelle'); return m === 'livree' ? at('policeFront', -9, 3, Math.PI / 2)() : m === 'epargnee' ? at('chapel', 2, 0, -Math.PI / 2)() : at('cemetery', 0, 0, -Math.PI / 2)(); },
    here: S => S.step('cloche') === 'maelle' || S.flag('maelle') === 'epargnee' || S.flag('maelle') === 'livree'
  },
  bastien: { name: 'Bastien', title: 'Allumeur de lanternes', app: 'civ', col: '#bfb6a3', at: at('plaza', -6, -3, 0) },
  margot: { name: 'Margot', title: 'Pêcheuse', app: 'civ', col: '#bfb6a3', at: at('market', -3, -5, Math.PI / 2) },
  corentin: { name: 'Le vieux Corentin', title: 'Ancien marin', app: 'civ', col: '#bfb6a3', at: at('plaza', 7, 12, Math.PI) }
});

/* ---------------- codex ---------------- */
Object.assign(CODEX, {
  debordement: { cat: 'Histoire', title: 'Le Débordement', text: 'Il y a douze ans, la mer s’est levée sans vent. Ce n’était pas de l’eau mais la Marée, venue des fosses. En une heure, la Basse-Saline a disparu. Les survivants se sont réfugiés sur les hauteurs, les ponts et les quais.' },
  maree: { cat: 'Magie', title: 'La Marée', text: 'Une magie noire et salée. Elle corrompt ce qu’elle touche, mais elle porte aussi les fils du destin : chaque goutte en contient un. Chaque nuit où la cloche sonne, elle monte d’un doigt.' },
  sel: { cat: 'Magie', title: 'Le sel-de-lune', text: 'Ce que la Marée laisse en se retirant. Frotté, il brille : c’est lui qui éclaire les lanternes de la cité et qui bat dans le cœur des golems. Plus la Marée monte, plus il y en a.' },
  lampistes: { cat: 'Factions', title: 'L’ordre des Lampistes', text: 'Horlogers, alchimistes et gardiens des lanternes. Ils ont construit le Phare noir et les golems du Guet. L’ordre s’est éteint après le Débordement ; Anselme Roux en est le dernier.' },
  golems: { cat: 'Histoire', title: 'Les golems du Guet', text: 'Armures de laiton animées par un cœur de sel-de-lune, numérotées de Un à Dix-Sept. Ils gardaient les ponts et les vannes. Les Tisseuses n’ont jamais pu lire leur destin.' },
  guet: { cat: 'Factions', title: 'Le Guet de Saline', text: 'La garde de la cité. Trois cents hommes avant le Débordement, quatre-vingt-dix aujourd’hui, sous les ordres du capitaine Okafor. Ils tiennent les ponts, les puits et les lanternes.' },
  cloche: { cat: 'Lieux', title: 'La cloche de Sainte-Ondine', text: 'Le clocher de la chapelle Sainte-Ondine s’est effondré dans l’eau la nuit du Débordement. Depuis trois nuits, sa cloche sonne sous l’eau, et à chaque coup la Marée monte.' },
  enfants: { cat: 'Factions', title: 'Les Enfants de la Marée', text: 'Un culte en robes noires et lanternes vertes. Ils prient la Mère-Abysse et attendent la Grande Marée qui « lavera » la cité. Leur chef porte un masque d’argent : le Héraut.' },
  canaux: { cat: 'Factions', title: 'Les Gens des Canaux', text: 'Ceux qui sont remontés de la Basse-Saline quand même. Ils vivent sur les barques et dans les étages hauts des maisons à moitié noyées, et ne doivent rien aux hauteurs.' },
  basse_saline: { cat: 'Lieux', title: 'La Basse-Saline', text: 'L’ancienne ville basse, sous la Marée. Quand l’eau est claire, on voit encore les toits, les rues et les lanternes éteintes. La nuit du Débordement, le Guet a fermé les vannes de la ville haute.' },
  tisseuses: { cat: 'Magie', title: 'Les Tisseuses', text: 'Des femmes qui lisent les fils de la Marée dans une coupe d’eau noire. Elles voient comment chacun vivra et mourra. Elles savent aussi dénouer ce qui a été noué.' },
  vasseur: { cat: 'Factions', title: 'La Maison Vasseur', text: 'La plus riche maison marchande de Port-Saline, qui contrôle le commerce du sel-de-lune. Ses armes : une balance d’or. Ses gardes, les « lames », ne portent pas l’uniforme du Guet.' },
  mere_abysse: { cat: 'Magie', title: 'La Mère-Abysse', text: 'Ce que prient les Enfants de la Marée : une puissance au fond des fosses, qui chanterait avec la voix des noyés. Le Héraut promet qu’à la Grande Marée, chacun retrouvera les siens.' },
  seize: { cat: 'Personnages', title: 'Seize', text: 'Le golem qui précédait Dix-Sept. Il est descendu dans la Basse-Saline la nuit du Débordement avec six hommes du Guet. Selon Pétronille, il marche toujours au fond, et la Marée lui obéit.' },
  aubemer: { cat: 'Lieux', title: 'Le Ventre de la Baleine', text: 'L’épave de la Reine d’Aubemer, le vaisseau royal coulé à l’entrée du port la nuit du Débordement. On dit qu’un golem y est entré, après, et n’en est jamais ressorti.' }
});

/* ---------------- quests ---------------- */
const nearestOf = (S, ids) => { const P = Game.player; let b = null, bd = 1e9; for (const id of ids) { const p = S.where(id); if (!p) continue; const d = dist3(p, P.pos); if (d < bd) { bd = d; b = p; } } return b; };
const downCount = rt => rt.foes.filter(a => Kit.isDown(a)).length;
Object.assign(QUESTS, {
  eveil: {
    title: 'Prologue · L’Éveil', kind: 'main', xp: 150,
    sum: () => 'Anselme Roux vous a réveillé. Le capitaine Okafor vous a pris à l’essai.',
    steps: {
      anselme: { text: 'Parlez à Anselme Roux, devant le Corps de garde', tag: 'Anselme', where: S => S.where('anselme') },
      okafor: { text: 'Présentez-vous au capitaine Okafor', tag: 'Okafor', where: S => S.where('okafor') }
    }
  },
  cloche: {
    title: 'La Cloche engloutie', kind: 'main', xp: 500,
    sum: S => ({ epargnee: 'Vous avez épargné Sœur Maelle. ', livree: 'Vous avez livré Sœur Maelle au Guet. ', jugee: 'Vous avez jugé Sœur Maelle. ' }[S.flag('maelle')] || '') + ({ paye: 'Vous avez accepté l’or de Vasseur.', menace: 'Vous avez menacé Vasseur.', feint: 'Vous avez feint d’accepter le marché de Vasseur.' }[S.flag('vasseur')] || ''),
    steps: {
      rumeurs: {
        text: 'Trouvez qui fait sonner la cloche : interrogez Fredo sur la place des Lanternes, ou Nadia au marché aux Sels', tag: 'Rumeurs', where: S => nearestOf(S, ['fredo', 'nadia']),
        // the robot found the cemetery on its own: the story follows it, nobody needs to tell it the way
        update(rt, S) { const c = World.spots.cemetery, P = Game.player; if (dist2D(c.x, c.z, P.pos.x, P.pos.z) < 34) { S.codex('enfants'); S.advance('cloche', 'combat'); } }
      },
      cimetiere: {
        text: 'Rendez-vous au cimetière des noyés, derrière la chapelle Sainte-Ondine', tag: 'Cimetière', where: () => spotPos('cemetery'),
        update(rt, S) { const c = World.spots.cemetery, P = Game.player; if (dist2D(c.x, c.z, P.pos.x, P.pos.z) < 34) S.advance('cloche', 'combat'); }
      },
      combat: {
        text: (S, rt) => `Dispersez les Enfants de la Marée <small>${rt.foes ? downCount(rt) : 0}/${rt.foes ? rt.foes.length : 0}</small>`, tag: 'Culte',
        where: (S, rt) => { const a = Kit.nearest(rt.foes); return a ? a.pos : spotPos('cemetery'); },
        start(rt) {
          const c = World.spots.cemetery;
          rt.foes = Kit.squad(['cultist', 'cultist', 'cultist', 'cultist'], c.x, c.z, 8, { label: 'Enfant de la Marée' });
          rt.foes.push(Kit.foe('cultShot', c.x - 4, c.z + 6, { label: 'Gardien de la cloche' }));
          for (const f of rt.foes) { f.tags.target = true; }
          HUD.big('Le cimetière des noyés', 'Les chants s’arrêtent. Ils vous ont vu.', 'bad', 2.6);
        },
        update(rt, S) { if (rt.foes.length && rt.foes.every(a => Kit.isDown(a))) { HUD.say('Sœur Maelle', 'Arrêtez ! Je me rends… je me rends !'); S.advance('cloche', 'maelle'); } }
      },
      maelle: { text: 'Parlez à l’acolyte qui s’est rendue', tag: 'Maelle', where: S => S.where('maelle') },
      lettre: { text: 'Rapportez la lettre scellée au capitaine Okafor', tag: 'Okafor', where: S => S.where('okafor') },
      vasseur: { text: 'Rencontrez l’échevin Victor Vasseur à l’Hôtel des Échevins', tag: 'Vasseur', where: S => S.where('vasseur') },
      rapport: { text: 'Faites votre rapport à Anselme Roux, au Corps de garde', tag: 'Anselme', where: S => S.where('anselme') }
    }
  },
  sel: {
    title: 'Le Sel volé', kind: 'side', xp: 300,
    sum: S => S.flag('sel') === 'nadia' ? 'Vous avez rendu la caisse de sel à Nadia.' : 'Vous avez remis la caisse de sel au Guet.',
    steps: {
      quai: {
        text: 'Reprenez la caisse de sel aux lames de Vasseur, au Quai des Grues', tag: 'Caisse',
        where: (S, rt) => rt.crate && rt.crate.alive ? rt.crate.pos : spotPos('yard'),
        start(rt, S) {
          const y = World.spots.yard, s = Kit.at(y.x + 4, y.z + 3);
          rt.foes = [Kit.foe('thugBat', y.x + 1, y.z + 6, { label: 'Lame de Vasseur' }), Kit.foe('thugKnife', y.x + 7, y.z, { label: 'Lame de Vasseur' }), Kit.foe('thug', y.x - 2, y.z + 1, { label: 'Lame de Vasseur' })];
          rt.crate = Pickups.add('item', s.x, s.y, s.z, { geo: 'crate', col: [0.42, 0.3, 0.16], e: 0.1, glow: [0.4, 0.95, 1], scale: 1.4, beam: true, onCollect: () => { HUD.toast('Caisse de sel-de-lune', 'Scellée aux armes des Vasseur', 'gold', true); S.set('sel_caisse'); S.advance('sel', 'choix'); } });
          rt.picks.push(rt.crate);
        }
      },
      choix: { text: 'Rendez la caisse à Nadia, ou remettez-la au capitaine Okafor', tag: 'Nadia', where: S => S.where('nadia') }
    }
  },
  fils: {
    title: 'Ce que disent les fils', kind: 'side', xp: 250,
    sum: () => 'Pétronille a vu Seize marcher au fond de la Basse-Saline.',
    steps: {
      larmes: {
        text: S => `Ramassez des larmes de sel au bord de l’étang du Jardin <small>${S.flag('larmes') | 0}/3</small>`, tag: 'Larmes',
        where: (S, rt) => { const P = Game.player; let b = null, bd = 1e9; for (const p of rt.picks) { if (!p.alive) continue; const d = dist3(p.pos, P.pos); if (d < bd) { bd = d; b = p; } } return b ? b.pos : spotPos('pond'); },
        start(rt, S) {
          const c = World.spots.pond, n = 3 - (S.flag('larmes') | 0);
          [[16, 4], [-12, 11], [3, -15]].slice(0, n).forEach(([dx, dz]) => {
            const s = Kit.at(c.x + dx, c.z + dz);
            rt.picks.push(Pickups.add('item', s.x, s.y, s.z, { geo: 'intel', col: [0.7, 0.95, 1], e: 1.2, glow: [0.3, 1, 0.85], scale: 1.2, beam: true, onCollect: () => { const k = (S.flag('larmes') | 0) + 1; S.set('larmes', k); HUD.toast('Larme de sel', `${k} / 3`, 'gold', true); if (k >= 3) S.advance('fils', 'retour'); } }));
          });
        }
      },
      retour: { text: 'Rapportez les larmes à Mme Pétronille', tag: 'Pétronille', where: S => S.where('petronille') }
    }
  },
  rumeurs: {
    title: 'Les Rumeurs de la Place', kind: 'side', xp: 150,
    sum: () => 'Bastien, Margot et le vieux Corentin vous ont raconté la cité.',
    steps: {
      ecouter: {
        text: S => `Écoutez les habitants de Port-Saline <small>${['bastien', 'margot', 'corentin'].filter(k => S.flag('ru_' + k)).length}/3</small>`, tag: 'Habitant',
        where: S => nearestOf(S, ['bastien', 'margot', 'corentin'].filter(k => !S.flag('ru_' + k)))
      }
    }
  }
});
// a villager told his story: the rumours quest opens with the first one, closes with the third
function heard(S, id) {
  if (!S.q('rumeurs')) S.start('rumeurs');
  S.set('ru_' + id);
  if (['bastien', 'margot', 'corentin'].every(k => S.flag('ru_' + k))) S.finish('rumeurs');
}

/* ---------------- dialogues ---------------- */
Object.assign(DIALOGUES, {
  /* ---------- Anselme Roux, the last Lampist ---------- */
  anselme: {
    mark: S => S.step('eveil') === 'anselme' ? '!' : S.step('cloche') === 'rapport' ? '?' : '',
    start: S => S.step('eveil') === 'anselme' ? 'eveil' : S.step('cloche') === 'rapport' ? 'rapport' : 'idle',
    nodes: {
      eveil: {
        t: ['Doucement… doucement. Ne bouge pas encore, laisse le sel se répandre dans tes jointures.', 'Tu m’entends ? Bien. Tes yeux brillent, c’est bon signe. Douze ans que tu dormais sous le Corps de garde. Et cette nuit, la cloche s’est remise à sonner. Alors je t’ai réveillé.'],
        do: S => S.set('met_anselme'), opts: null
      },
      hub: {
        t: 'Pose tes questions, Dix-Sept. Nous avons un peu de temps. Pas beaucoup.',
        opts: [
          { t: 'Qui êtes-vous ?', once: 'a_qui', go: 'qui' },
          { t: 'Où suis-je ? Quelle est cette ville ?', once: 'a_ou', go: 'ou' },
          { t: 'Pourquoi m’avoir réveillé, moi ?', once: 'a_pq', go: 'pourquoi' },
          { t: '(Regarder la lueur bleue qui bat dans votre poitrine.)', once: 'a_coeur', go: 'coeur' },
          { t: 'Que dois-je faire ?', go: 'mission' }
        ]
      },
      qui: { t: 'Anselme Roux. Archiviste, horloger, et dernier de l’ordre des Lampistes. C’est nous qui t’avons construit, toi et tes frères. Il ne reste plus que moi… et toi.', do: S => S.codex('lampistes'), next: 'hub' },
      ou: { t: ['Port-Saline. Ou ce qu’il en reste.', 'Il y a douze ans, la nuit du Débordement, la mer s’est levée sans vent. Pas de l’eau : la Marée. Une magie noire, salée, venue des fosses. Elle a englouti la Basse-Saline en une heure.', 'Ceux d’en haut ont survécu. Ceux d’en bas… sont toujours en bas.'], do: S => { S.codex('debordement'); S.codex('maree'); }, opts: [{ t: 'Continuer', go: 'hub' }] },
      pourquoi: { t: ['Parce que les golems du Guet ont été faits pour ça. Et parce que tu es différent.', 'Les Tisseuses lisent le destin de chaque être dans les fils de la Marée. Le tien, elles ne le trouveront pas. Tu n’en as pas.', 'Tu es peut-être la seule chose dans cette cité qui puisse changer ce qui est écrit.'], do: S => S.codex('golems'), opts: [{ t: 'Continuer', go: 'hub' }] },
      coeur: {
        who: '', t: 'Vos doigts de laiton se plient. Dans votre poitrine, une lueur bleue pulse comme un cœur. Anselme détourne les yeux, comme s’il ne supportait pas de la regarder.',
        opts: [{ t: 'Qu’y a-t-il dans ma poitrine ?', go: 'coeur2' }, { t: '(Ne rien dire.)', go: 'hub' }]
      },
      coeur2: { t: 'Du sel-de-lune. Le plus pur que l’ordre ait jamais taillé. C’est… c’est tout ce que tu as besoin de savoir pour l’instant.', do: S => { S.codex('sel'); S.set('anselme_cache'); }, opts: [{ t: 'Vous mentez mal, Anselme.', go: 'coeur3' }, { t: 'Continuer', go: 'hub' }] },
      coeur3: { t: 'Je mens très bien, d’habitude. C’est toi qui regardes trop bien. Un jour je te dirai. Pas cette nuit.', opts: [{ t: 'Continuer', go: 'hub' }] },
      mission: {
        t: ['Va voir le capitaine Okafor, là, devant le Corps de garde. Il commande ce qui reste du Guet.', 'Il n’aime pas les golems. Le dernier, Seize, est descendu dans la Marée avec six de ses hommes et n’est jamais remonté. Sois patient avec lui.'],
        do: S => S.advance('eveil', 'okafor'),
        opts: [{ t: 'J’y vais.' }, { t: '[Ironique] Un capitaine qui déteste les golems. Le début idéal.', go: 'ironie' }]
      },
      ironie: { t: 'Ha ! Ils t’ont donc laissé de l’humour. Je ne me souvenais pas de l’avoir gravé. Va.', opts: [{ t: '(Partir)' }] },
      rapport: {
        t: S => [
          ({ paye: 'Tu as pris son or ? … Je ne te juge pas. Je me demande seulement ce qu’il croit avoir acheté.', menace: 'Tu l’as menacé ? Vasseur n’oublie jamais une menace. Il ne pardonne pas non plus. Mais il a eu peur, et c’est déjà beaucoup.', feint: 'Tu l’as laissé croire qu’il t’avait acheté. Malin. Garde cette lettre comme une lame dans ta manche.' }[S.flag('vasseur')] || 'Vasseur, donc.'),
          'Le sel monte avec la Marée, et sa fortune avec. Et cette lettre parle du Phare noir. Le Héraut veut rallumer quelque chose que nous, les Lampistes, avions éteint.'
        ],
        opts: [
          { t: 'Que savez-vous du Héraut ?', once: 'a_heraut', go: 'heraut' },
          { t: 'Que se passera-t-il si le Phare noir s’allume ?', once: 'a_phare', go: 'phare' },
          { t: 'La cloche s’est tue. C’est déjà ça.', go: 'fin' }
        ]
      },
      heraut: { t: 'Il parle comme un Lampiste. Il connaît nos mots, nos sceaux. Je crains… Non. Pas encore. Je dois en être sûr.', do: S => S.codex('enfants'), next: 'rapport2' },
      phare: { t: 'La Grande Marée. Celle qui ne redescend pas. Le Phare noir n’éclairait pas les bateaux, Dix-Sept : il tenait la mer à distance. Allumé à l’envers, il l’appelle.', next: 'rapport2' },
      rapport2: { t: 'Autre chose ?', opts: [{ t: 'Que savez-vous du Héraut ?', once: 'a_heraut', go: 'heraut' }, { t: 'Que se passera-t-il si le Phare noir s’allume ?', once: 'a_phare', go: 'phare' }, { t: 'La cloche s’est tue. C’est déjà ça.', go: 'fin' }] },
      fin: {
        t: ['Pour cette nuit, oui. Repose ton cœur, Dix-Sept.', 'Demain, nous irons chercher ce que Vasseur achète avec son or. Et à qui.'],
        do: S => { if (S.active('cloche')) { S.finish('cloche'); S.set('chap1_fin'); S.later(() => HUD.big('Fin du chapitre I', 'À suivre · Le Sel et l’Or', 'good', 5)); } },
        opts: [{ t: '(Partir)' }]
      },
      idle: {
        t: S => S.flag('chap1_fin') ? ['Vasseur ne restera pas les bras croisés. Garde l’œil ouvert.', S.done('sel') && S.done('fils') ? 'Et merci d’avoir aidé Nadia et la vieille Pétronille. La cité a besoin de toutes ses mains.' : 'Va voir Nadia au marché, et la vieille Pétronille au Jardin, si ce n’est pas fait. La cité a besoin de toutes ses mains.'] : 'Le sel chante dans tes jointures. Tu l’entends ? Moi, à mon âge, je l’entends dans tous mes os.',
        opts: [
          { t: 'Parlez-moi des Lampistes.', go: 'lamp' },
          { t: 'Parlez-moi du Débordement.', go: 'ou2' },
          { t: 'Et Seize ? Qui était-il ?', if: S => S.flag('seize_rumeur') || S.done('fils'), go: 'seize' },
          { t: '(Partir)' }
        ]
      },
      lamp: { t: ['Nous gardions les lanternes. Puis nous avons appris à faire bouger le laiton, à faire battre le sel. Nous avons construit le Phare noir, et dix-sept golems.', 'Nous étions fiers. Trop fiers. Certaines choses qu’on fabrique ont un prix qu’on ne paie pas soi-même.'], do: S => S.codex('lampistes'), opts: [{ t: 'Quel prix ?', go: 'prix' }, { t: '(Partir)' }] },
      prix: { t: 'Plus tard, Dix-Sept. Je te le promets. Plus tard.', opts: [{ t: '(Partir)' }] },
      ou2: { t: 'La mer s’est levée sans vent. Les vannes de la ville haute se sont fermées. J’ai entendu les cloches de la Basse-Saline sonner toute la nuit, une par une, puis plus rien.', do: S => S.codex('debordement'), opts: [{ t: '(Partir)' }] },
      seize: { t: ['Seize était… doux. C’est un mot étrange pour une armure, je sais. Il aimait les enfants des canaux. Il est descendu chercher les survivants quand le Guet a fermé les vannes.', 'S’il marche encore en bas, comme le dit Pétronille… alors ce n’est plus Seize.'], do: S => S.codex('seize'), opts: [{ t: '(Partir)' }] }
    }
  },

  /* ---------- Captain Okafor ---------- */
  okafor: {
    mark: S => S.step('eveil') === 'okafor' ? '!' : S.step('cloche') === 'lettre' ? '?' : S.step('sel') === 'choix' ? '?' : '',
    start: S => S.step('eveil') === 'anselme' ? 'tot' : S.step('eveil') === 'okafor' ? 'intro' : S.step('cloche') === 'lettre' ? 'lettre' : 'idle',
    nodes: {
      tot: { t: 'Le vieux Roux veut te parler d’abord. Va. Moi, j’attends de voir si tu tiens debout.', opts: [{ t: '(Partir)' }] },
      intro: {
        t: ['Alors c’est vrai. Le vieux a remonté un golem.', 'Je vais être franc, la boîte de conserve. Le dernier de ta série s’appelait Seize. Il est descendu dans la Basse-Saline la nuit du Débordement avec six de mes hommes. Personne n’est remonté. Ni eux, ni lui.'],
        do: S => S.set('met_okafor'),
        opts: [
          { t: 'Je ne suis pas Seize.', do: S => S.approve('okafor', 5), go: 'intro2' },
          { t: 'Je suis désolé pour vos hommes.', do: S => S.approve('okafor', 10), go: 'intro2' },
          { t: '[Ironique] Je promets de ne pas me noyer le premier soir.', do: S => S.approve('okafor', -5), go: 'intro2' },
          { t: 'Vos hommes ou pas, je suis ce que vous avez de plus solide. Servez-vous de moi.', need: { might: 2 }, do: S => S.approve('okafor', 10), go: 'intro2' }
        ]
      },
      intro2: {
        t: ['Hm. On verra. Tu es à l’essai.', 'Voilà ce qui m’empêche de dormir : la cloche de Sainte-Ondine. Le clocher est sous l’eau depuis douze ans, et depuis trois nuits, elle sonne. À chaque coup, la Marée monte d’un doigt.', 'Quelqu’un la fait sonner. Je veux savoir qui.'],
        do: S => S.codex('cloche'),
        opts: [{ t: 'Par où commencer ?', go: 'pistes' }, { t: 'Et si elle continue de sonner ?', go: 'si' }]
      },
      si: { t: 'Alors un matin, il n’y aura plus de hauteurs. Juste la Marée, et ceux qui l’aiment.', next: 'pistes' },
      pistes: {
        t: 'Les rues parlent, mais pas au Guet. Essaie Fredo la Fouine, sur la place des Lanternes : il vendrait sa mère pour une pièce. Ou Nadia Ferrand, au marché aux Sels. Une contrebandière. Si quelqu’un passe par l’eau la nuit, elle le sait.',
        do: S => { S.codex('guet'); if (S.active('eveil')) { S.finish('eveil'); S.start('cloche'); } },
        opts: [{ t: 'J’y vais, capitaine.' }, { t: 'Une contrebandière ? Vous la laissez faire ?', go: 'nadia' }]
      },
      nadia: { t: 'Je laisse faire ce qui nourrit les canaux. Le jour où ça nourrira la Marée, je la pendrai moi-même.', opts: [{ t: '(Partir)' }] },
      lettre: {
        t: S => [
          ({ livree: 'Tu m’as ramené une acolyte vivante. Bien. Elle parlera… peut-être.', jugee: 'On m’a dit, pour l’acolyte. La justice du Guet passe par un tribunal, golem. Pas par ta lame. … Mais je ne pleurerai pas une fanatique.', epargnee: 'Tu l’as laissée partir ? J’espère que tu sais ce que tu fais.' }[S.flag('maelle')] || 'Alors ?'),
          'Montre-moi cette lettre.'
        ],
        opts: [{ t: '(Lui tendre le pli scellé.)', go: 'lettre2' }]
      },
      lettre2: {
        who: '', t: ['Okafor brise le sceau. La cire est dorée, frappée d’une balance : les armes de la Maison Vasseur.', '« Au Héraut. Le sel de la troisième nuit sera livré au Quai des Grues comme convenu. Que la cloche sonne jusqu’à ce que le Phare noir s’allume. — V. »'],
        do: S => S.codex('vasseur'), opts: [{ t: 'Continuer', go: 'lettre3' }]
      },
      lettre3: {
        t: 'Vasseur. Un échevin. L’homme le plus riche de la cité, qui paie des fanatiques pour noyer sa propre ville… Si je l’arrête sur la foi d’une lettre, les Échevins me cassent avant midi.',
        opts: [
          { t: 'Alors j’irai lui parler moi-même.', do: S => S.advance('cloche', 'vasseur'), go: 'prudence' },
          { t: 'La lettre dit « comme convenu ». Il y a un registre quelque part. Je le trouverai.', need: { finesse: 2 }, do: S => { S.set('registre'); S.approve('okafor', 5); S.advance('cloche', 'vasseur'); }, go: 'prudence' }
        ]
      },
      prudence: { t: 'Fais attention. Vasseur ne menace jamais. Il achète. Et quand il ne peut pas acheter, il fait disparaître.', opts: [{ t: '(Partir)' }] },
      idle: {
        t: S => S.flag('maelle') === 'livree' && S.flag('chap1_fin') ? 'L’acolyte ne dit rien. Elle prie. Pour nous, je crois. C’est pire.' : S.approval('okafor') >= 15 ? 'Golem. Tu tiens debout, finalement. Qu’est-ce qu’il te faut ?' : 'Le Guet a besoin de bras, pas de discours. Qu’est-ce que tu veux ?',
        opts: [
          { t: 'Je vous remets une caisse de sel saisie au Quai des Grues.', if: S => S.step('sel') === 'choix', tag: 'Le Sel volé', go: 'caisse' },
          { t: 'Parlez-moi du Guet.', go: 'guet' },
          { t: 'Et les vannes, la nuit du Débordement ?', if: S => S.flag('nadia_vannes'), once: 'o_vannes', go: 'vannes' },
          { t: 'Rien. Je reprends ma ronde.' }
        ]
      },
      caisse: {
        t: 'Du sel-de-lune volé, avec le sceau des Vasseur. Bien. Il ira aux lanternes des hauteurs, et j’ai une preuve de plus contre l’échevin. … La Ferrand va hurler.',
        do: S => { S.set('sel', 'guet'); S.approve('okafor', 10); S.approve('nadia', -15); S.finish('sel'); },
        opts: [{ t: '(Partir)' }]
      },
      guet: { t: 'Trois cents gardes avant le Débordement. Quatre-vingt-dix aujourd’hui. On tient les ponts, les puits et les lanternes. Le reste, on prie pour que ça tienne.', do: S => S.codex('guet'), opts: [{ t: '(Partir)' }] },
      vannes: { t: ['… Qui t’a parlé de ça ? La Ferrand, évidemment.', 'J’ai donné l’ordre. Il fallait choisir entre la ville haute et la ville basse, et la Marée montait. Je l’ai donné, et je l’entends tous les soirs.', 'Ne m’en reparle pas, golem. Pas encore.'], do: S => S.approve('okafor', -5), opts: [{ t: '(Partir)' }] }
    }
  },

  /* ---------- Nadia Ferrand, smuggler of the canals ---------- */
  nadia: {
    mark: S => S.step('cloche') === 'rumeurs' || (!S.q('sel') && S.flag('met_nadia')) ? '!' : S.step('sel') === 'choix' ? '?' : '',
    start: S => !S.flag('met_nadia') ? 'hello' : S.step('sel') === 'choix' ? 'caisse' : S.step('cloche') === 'rumeurs' ? 'cloche' : !S.q('sel') ? 'offre' : 'idle',
    nodes: {
      hello: {
        t: ['Pas un pas de plus, le tas de ferraille. Ici, c’est le marché aux Sels, et le Guet n’y vient pas sans y laisser sa bourse.', '… T’es pas du Guet. T’es un golem. Je croyais qu’ils avaient tous coulé.'],
        do: S => { S.set('met_nadia'); S.codex('canaux'); },
        opts: [
          { t: 'Je cherche qui fait sonner la cloche.', if: S => S.step('cloche') === 'rumeurs', go: 'cloche' },
          { t: 'Qui êtes-vous ?', go: 'qui' },
          { t: 'Le Guet tolère votre trafic. Pour l’instant.', do: S => S.approve('nadia', -5), go: 'menace' },
          { t: '(Partir)' }
        ]
      },
      qui: {
        t: 'Nadia Ferrand. Je fais passer ce dont les canaux ont besoin : du pain, des bougies, du sel. Les hauteurs appellent ça de la contrebande. Moi, j’appelle ça ne pas laisser crever les miens.',
        opts: [{ t: 'Je cherche qui fait sonner la cloche.', if: S => S.step('cloche') === 'rumeurs', go: 'cloche' }, { t: 'Les vôtres ont de la chance de vous avoir.', do: S => S.approve('nadia', 5), go: 'flatte' }, { t: '(Partir)' }]
      },
      flatte: { t: 'Garde tes compliments, ils sont en laiton aussi. … Mais merci.', next: 'offre' },
      menace: { t: 'Ha. Le Guet tolère ce qu’il ne peut pas empêcher. Et toi, golem, tu toléreras quoi ?', opts: [{ t: 'Je cherche qui fait sonner la cloche.', if: S => S.step('cloche') === 'rumeurs', go: 'cloche' }, { t: '(Partir)' }] },
      cloche: {
        t: ['La cloche ? Tout le monde l’entend, personne n’en parle. Mais moi, je vois passer des barques la nuit. Des robes noires, des lanternes vertes. Elles vont vers Sainte-Ondine.', 'Je te dis où exactement si tu me rends un service. Les lames de Vasseur ont saisi une de mes caisses au Quai des Grues. Du sel-de-lune, de quoi éclairer les canaux tout l’hiver.'],
        opts: [
          { t: 'Marché conclu. Je vous rapporte votre caisse.', do: S => { S.approve('nadia', 5); S.start('sel'); }, go: 'lieu' },
          { t: 'Dites-le-moi maintenant. Des gens vont se noyer.', do: S => S.approve('nadia', 5), go: 'lieu2' },
          { t: 'Parlez, ou je retourne ce marché étal par étal.', need: { might: 2 }, do: S => { S.approve('nadia', -15); S.set('nadia_menacee'); }, go: 'lieu3' }
        ]
      },
      lieu: { t: 'Le cimetière des noyés, derrière la chapelle Sainte-Ondine, tout à l’ouest. Ils chantent au bord de l’eau, là où le clocher s’est effondré. Et ma caisse est au Quai des Grues, au nord, entre les conteneurs.', do: S => { S.advance('cloche', 'cimetiere'); S.codex('enfants'); }, opts: [{ t: '(Partir)' }] },
      lieu2: { t: '… T’as raison. Cimetière des noyés, derrière Sainte-Ondine, à l’ouest. Mais ma caisse, tu y penses, hein ? Quai des Grues, au nord.', do: S => { S.advance('cloche', 'cimetiere'); S.codex('enfants'); if (!S.q('sel')) S.start('sel'); }, opts: [{ t: '(Partir)' }] },
      lieu3: { t: 'Tu ferais ça, hein. Comme eux. … Cimetière des noyés, derrière Sainte-Ondine. Maintenant dégage.', do: S => { S.advance('cloche', 'cimetiere'); S.codex('enfants'); }, opts: [{ t: '(Partir)' }] },
      offre: {
        t: 'Tant que t’es là : les lames de Vasseur ont saisi une de mes caisses au Quai des Grues. Du sel-de-lune. Tu me la rapportes, et les canaux te devront une fière chandelle.',
        opts: [{ t: 'Je m’en occupe.', do: S => { S.start('sel'); S.approve('nadia', 5); } }, { t: 'Pas maintenant.' }]
      },
      caisse: {
        t: 'Ma caisse ! T’as vraiment été la chercher. Montre-moi ça… Le sceau des Vasseur est encore dessus. Ces porcs.',
        opts: [
          { t: 'Elle est à vous. Pour les canaux.', do: S => { S.set('sel', 'nadia'); S.approve('nadia', 15); S.finish('sel'); }, go: 'merci' },
          { t: 'Ce sceau est trop propre. D’où venait ce sel, avant la saisie ?', need: { finesse: 2 }, once: 'n_origine', go: 'origine' },
          { t: 'Je la remets au Guet.', once: 'n_refus', do: S => S.approve('nadia', -10), go: 'refus' }
        ]
      },
      origine: {
        t: ['… D’un passeur. Je ne pose pas de questions. Pourquoi ?', 'Attends. Vasseur paie le culte en sel, c’est ça ? Si ma caisse vient du même stock… alors j’ai peut-être nourri ceux qui noient ma ville.', 'Garde ça pour toi, d’accord ? S’il te plaît.'],
        do: S => { S.set('nadia_sel_culte'); S.approve('nadia', 5); }, next: 'caisse'
      },
      refus: { t: 'Alors pourquoi tu viens me la montrer ? Pour que je la regarde partir ? Va au diable, golem. Va la donner à ton capitaine.', opts: [{ t: '(Partir)' }] },
      merci: { t: '… Merci. Vraiment. Les gens d’en bas vont avoir de la lumière cet hiver. Si un jour t’as besoin d’une barque, d’une porte ou d’un couteau, tu viens me voir.', opts: [{ t: '(Partir)' }] },
      idle: {
        t: S => S.flag('sel') === 'nadia' ? 'Le golem préféré des canaux ! Les gamins t’ont dessiné sur les murs, tu sais. Avec une couronne.' : S.flag('sel') === 'guet' ? 'Tiens. Le chien du Guet. T’as un os à me rendre, peut-être ?' : 'Toujours debout, le tas de ferraille ?',
        opts: [{ t: 'Parlez-moi des canaux.', go: 'canaux' }, { t: 'Pourquoi en voulez-vous autant au Guet ?', once: 'n_guet', go: 'vannes' }, { t: '(Partir)' }]
      },
      canaux: { t: 'Les canaux, c’est ce qui reste de la Basse-Saline au-dessus de l’eau. Les toits, les clochers, les étages hauts. On y vit en barque. Et la nuit, quand l’eau est calme, on voit nos anciennes rues en dessous.', do: S => { S.codex('canaux'); S.codex('basse_saline'); }, opts: [{ t: '(Partir)' }] },
      vannes: { t: ['La nuit du Débordement, le Guet a fermé les vannes de la ville haute. Pour la sauver. Ceux qui étaient en bas sont restés en bas.', 'Mon père était en bas. Demande à ton capitaine qui a donné l’ordre.'], do: S => { S.set('nadia_vannes'); S.codex('basse_saline'); }, opts: [{ t: '(Partir)' }] }
    }
  },

  /* ---------- Fredo « la Fouine » ---------- */
  fredo: {
    mark: S => S.step('cloche') === 'rumeurs' ? '!' : '',
    start: S => S.step('cloche') === 'rumeurs' ? 'cloche' : 'idle',
    nodes: {
      cloche: {
        t: ['Psst ! Hé, le golem ! T’as l’air de chercher quelque chose. Fredo trouve tout : les clés, les ragots, les bourses mal fermées.', 'La cloche ? Ah, la cloche. Ça, c’est une info qui vaut cher. Au moins… trois sous.'],
        do: S => S.set('met_fredo'),
        opts: [
          { t: 'Je n’ai pas un sou. Mais le Guet saura que tu as aidé.', go: 'gratuit' },
          { t: '(Le soulever par le col.) Parle.', need: { might: 2 }, do: S => S.set('fredo_secoue'), go: 'secoue' },
          { t: 'Tu as les mains vertes de sel de Marée. Tu étais au cimetière cette nuit.', need: { finesse: 2 }, do: S => S.set('fredo_respect'), go: 'mains' },
          { t: '(Écouter le sel qui bat dans votre poitrine.)', need: { sorcery: 2 }, go: 'sel' }
        ]
      },
      gratuit: { t: 'Le Guet ? Super, ma mère sera fière. … Bon, d’accord. Pour la beauté du geste.', next: 'info' },
      secoue: { t: 'Aïe aïe aïe ! D’accord ! D’accord ! Pose-moi, tu vas me dévisser la tête !', next: 'info' },
      mains: { t: '… T’as de bons yeux pour un tas de boulons. Ouais, j’y étais. Je pique les offrandes. Elles finissent à l’eau de toute façon.', next: 'info' },
      sel: { who: '', t: 'Votre cœur bat plus fort quand vous tournez le visage vers l’ouest. Là-bas, quelque chose appelle la Marée. Fredo vous regarde, la bouche ouverte.', opts: [{ t: 'Continuer', go: 'sel2' }] },
      sel2: { t: 'Euh… T’es en train de faire un truc magique, là ? Bon. Ouais. C’est à l’ouest. Je vais tout te dire, mais arrête de briller comme ça.', next: 'info' },
      info: {
        t: ['Les robes noires. Les Enfants de la Marée, qu’ils s’appellent. Ils se réunissent au cimetière des noyés, derrière la chapelle Sainte-Ondine, tout à l’ouest. Ils chantent et tapent sur des chaînes qui descendent dans l’eau… jusqu’à la cloche, je parie.', 'Y en a une parmi eux, une petite, qui pleure tout le temps. Sœur Maelle. Elle avait une famille en bas, avant.'],
        do: S => { S.advance('cloche', 'cimetiere'); S.codex('enfants'); },
        opts: [{ t: 'Merci, Fredo.' }, { t: 'Pourquoi tu me dis tout ça ?', go: 'pq' }]
      },
      pq: { t: 'Parce que si la ville coule, y aura plus rien à voler. Logique.', opts: [{ t: '(Partir)' }] },
      idle: {
        t: () => RP(['Paraît que les Échevins font creuser sous leur Hôtel. Creuser, avec la Marée qui monte. Va comprendre.', 'Le vieux Corentin raconte qu’un golem est entré dans l’épave du port. Le précédent, avant toi. Il en est jamais ressorti.', 'Si tu cherches la Tisseuse, elle est au Jardin des Pendus. Elle lit l’avenir. Le mien, elle a refusé. Mauvais signe.', 'Les lanternes vertes, la nuit, sur l’eau ? Faut pas les suivre. Jamais.']),
        do: S => S.set('met_fredo'),
        opts: [{ t: 'Tu as d’autres rumeurs ?', go: 'idle' }, { t: '(Partir)' }]
      }
    }
  },

  /* ---------- Mme Pétronille, the Weaver ---------- */
  petronille: {
    mark: S => !S.q('fils') ? '!' : S.step('fils') === 'retour' ? '?' : '',
    start: S => !S.flag('met_petronille') ? 'hello' : !S.q('fils') ? 'quete' : S.step('fils') === 'larmes' ? 'attente' : S.step('fils') === 'retour' ? 'lecture' : 'idle',
    nodes: {
      hello: {
        t: ['Approche, enfant de laiton. N’aie pas peur de la vieille Pétronille.', 'Je suis Tisseuse. Je lis les fils que la Marée dépose sur chaque vie. Viens, que je lise le tien.'],
        do: S => { S.set('met_petronille'); S.codex('tisseuses'); }, opts: [{ t: '(Tendre la main.)', go: 'lit' }, { t: 'Non merci.', go: 'refus' }]
      },
      refus: { t: 'Comme tu voudras. Mais je l’aurais su, de toute façon. Je sais toujours.', next: 'lit' },
      lit: { who: '', t: 'Elle plonge un doigt dans une coupe d’eau noire. Ses yeux blanchissent. Puis elle recule, brusquement, et la coupe tremble.', opts: [{ t: 'Continuer', go: 'rien' }] },
      rien: {
        t: ['Rien. Il n’y a rien. Pas un fil.', 'Je vois le destin de chaque passant, de chaque chat, de chaque rat de cette cité… et toi, tu n’es pas écrit.'],
        opts: [{ t: 'Qu’est-ce que ça veut dire ?', go: 'sens' }, { t: 'Vous pouvez essayer encore ?', go: 'quete' }]
      },
      sens: { t: 'Que tu peux faire ce que nul ne peut : choisir. Et défaire ce qui était tissé. C’est un don terrible, enfant. Si un jour tu veux changer ce que tu es devenu, reviens me voir : je saurai dénouer ce que tu as noué.', next: 'quete' },
      quete: {
        t: 'Je peux regarder plus loin, dans les eaux profondes, avec des larmes de sel. La Marée en laisse au bord de l’étang du Jardin, les nuits où la cloche sonne. Rapporte-m’en trois.',
        opts: [{ t: 'J’irai les chercher.', do: S => S.start('fils') }, { t: 'Plus tard.' }]
      },
      attente: { t: 'Trois larmes, enfant. Au bord de l’étang. Elles brillent comme des yeux qui ne dorment pas.', opts: [{ t: '(Partir)' }] },
      lecture: {
        who: '', t: 'Elle écrase les trois larmes dans la coupe. L’eau s’illumine, et vos jointures se mettent à vibrer comme une cloche qu’on frappe.',
        opts: [{ t: 'Continuer', go: 'lecture2' }]
      },
      lecture2: {
        t: ['Je ne vois toujours pas ton fil… mais je vois celui qui était avant toi. Un golem, comme toi. Seize.', 'Il est en bas. Il marche au fond de la Basse-Saline, et la Marée lui obéit.', 'Il t’attend, enfant. Je ne sais pas s’il veut te sauver ou te noyer.'],
        do: S => { S.codex('seize'); S.set('retissage'); S.finish('fils'); },
        opts: [{ t: 'Seize est vivant ?', go: 'vivant' }, { t: 'Merci, Pétronille.' }]
      },
      vivant: { t: 'Vivant ? Rien n’est vivant, en bas. Mais il marche.', opts: [{ t: '(Partir)' }] },
      idle: {
        t: 'Les fils de la cité se resserrent, enfant. Je les sens trembler sous mes doigts.',
        opts: [
          { t: 'Dénouez mon Destin.', tag: 'Destin', tagCol: '#c58bff', if: S => S.flag('retissage'), go: 'retisser' },
          { t: 'Lisez le destin de la cité.', go: 'cite' },
          { t: '(Partir)' }
        ]
      },
      retisser: { t: 'Tout ce que tu as appris, tous les talents que tu as noués, je peux les défaire. Tu choisiras à nouveau. Tu es sûr ?', opts: [{ t: 'Oui, dénouez tout.', do: S => { Destin.reset(); HUD.toast('Destin dénoué', 'Vos points de talent sont libres', 'gold', true); }, go: 'fait' }, { t: 'Non, pas maintenant.' }] },
      fait: { who: '', t: 'Pétronille passe ses doigts froids sur votre plaque de poitrine. Quelque chose se défait, sans douleur. Vous vous sentez léger. Ouvert.', opts: [{ t: '(Partir)' }] },
      cite: { t: ['Je vois l’eau monter jusqu’au Phare noir. Je vois une lumière verte en haut de la tour. Et je vois des milliers de fils coupés d’un coup.', 'Sauf si quelqu’un qui n’a pas de fil s’en mêle.'], opts: [{ t: '(Partir)' }] }
    }
  },

  /* ---------- Victor Vasseur, alderman of Salt ---------- */
  vasseur: {
    mark: S => S.step('cloche') === 'vasseur' ? '!' : '',
    start: S => S.step('cloche') === 'vasseur' ? 'rencontre' : 'idle',
    nodes: {
      rencontre: {
        t: 'Un golem du Guet à ma porte. Quelle délicieuse antiquité. Victor Vasseur, échevin du Sel. Que me vaut l’honneur ?',
        opts: [
          { t: '(Montrer la lettre scellée.)', go: 'lettre' },
          { t: 'Vos bottes sont tachées d’eau de Marée, échevin. Elle ne monte qu’au Quai des Grues.', need: { finesse: 2 }, go: 'bottes' }
        ]
      },
      bottes: { t: 'Vous avez l’œil. J’inspecte mes entrepôts moi-même : un bon marchand ne délègue jamais ce qu’il peut perdre. C’est un crime, maintenant ?', do: S => S.set('vasseur_bottes'), opts: [{ t: '(Montrer la lettre scellée.)', go: 'lettre' }] },
      lettre: {
        t: ['Ah. Mon sceau. Il est si facile à imiter, vous savez. Des faussaires le copient tous les jours.', 'Mais soyons francs, puisque vous êtes une machine et que les machines aiment la franchise. La Marée monte. Quand elle se retire, elle laisse du sel. Plus de Marée, plus de sel. Plus de sel, plus de lanternes, plus de pain, plus d’ordre.', 'Je ne noie pas la cité, golem. Je la nourris.'],
        do: S => S.codex('vasseur'), opts: [{ t: 'Continuer', go: 'offre' }]
      },
      offre: {
        t: 'Je vous fais une offre. Une bourse pour le Corps de garde, une autre pour le vieux Roux et ses horloges. Et vous oubliez cette lettre.',
        opts: [
          { t: 'Pourquoi le Phare noir ?', once: 'v_phare', go: 'phare' },
          { t: 'J’accepte votre or.', do: S => { S.set('vasseur', 'paye'); S.approve('okafor', -10); S.approve('nadia', -5); S.advance('cloche', 'rapport'); }, go: 'paye' },
          { t: 'Rappelez vos fanatiques. Sinon je reviens, sans la lettre et sans frapper.', need: { might: 2 }, do: S => { S.set('vasseur', 'menace'); S.approve('okafor', 5); S.advance('cloche', 'rapport'); }, go: 'menace' },
          { t: 'Le culte vous menace aussi, échevin. Quand la Grande Marée viendra, elle ne fera pas de différence.', need: { sorcery: 2 }, once: 'v_peur', go: 'peur' },
          { t: '(Feindre.) Je vais réfléchir à votre offre.', do: S => { S.set('vasseur', 'feint'); S.advance('cloche', 'rapport'); }, go: 'feint' }
        ]
      },
      phare: { t: 'Le Phare ? Une ruine. Je ne sais rien de ce que racontent les fanatiques. Pour moi, ce n’est qu’un tas de pierres que je pourrais racheter. … Alors, golem ?', next: 'offre' },
      peur: { t: ['…', 'Pour une machine, vous parlez comme un prêtre. Le culte croit me servir. Je crois m’en servir. Nous verrons bien qui a raison. … Alors, mon offre ?'], do: S => S.set('vasseur_doute'), next: 'offre' },
      paye: { t: 'Voilà qui est raisonnable. Je savais que les Lampistes construisaient des choses intelligentes. Mes gens passeront au Corps de garde demain.', opts: [{ t: '(Partir)' }] },
      menace: { t: 'Des menaces. Comme c’est… mécanique. Faites attention, golem : le sel fait briller les lanternes, mais il ronge aussi le métal.', opts: [{ t: '(Partir)' }] },
      feint: { t: 'Réfléchissez. Rien ne presse. Enfin… rien, sauf la Marée.', opts: [{ t: '(Partir)' }] },
      idle: {
        t: S => ({ paye: 'Mon associé de laiton ! Tout va bien au Corps de garde ?', menace: 'Encore vous. Mes gardes ont ordre de vous sourire. C’est tout ce qu’ils ont ordre de faire.', feint: 'Alors, cette réflexion avance ?' }[S.flag('vasseur')] || 'Golem.'),
        opts: [{ t: '(Partir)' }]
      }
    }
  },

  /* ---------- Sister Maelle, a Child of the Tide ---------- */
  maelle: {
    mark: S => S.step('cloche') === 'maelle' ? '!' : '',
    start: S => S.step('cloche') === 'maelle' ? 'rendue' : S.flag('maelle') === 'livree' ? 'cellule' : 'libre',
    nodes: {
      rendue: {
        t: ['Ne… ne me tue pas. Je t’en prie. Je n’ai jamais voulu que quelqu’un se noie. Je voulais seulement les entendre encore.', 'Ma mère, mes deux frères. Ils sont en bas, dans la Basse-Saline. Quand la cloche sonne, la Marée chante avec leurs voix. Le Héraut dit qu’à la Grande Marée, on les retrouvera tous.'],
        do: S => { S.codex('mere_abysse'); S.codex('cloche'); }, opts: [{ t: 'Continuer', go: 'choix' }]
      },
      choix: {
        t: 'Que vas-tu faire de moi ?',
        opts: [
          { t: 'Qui est le Héraut ?', once: 'm_heraut', go: 'heraut' },
          { t: 'Qu’est-ce que tu serres contre toi ?', if: S => !S.flag('lettre'), go: 'lettre' },
          { t: 'Pars. Quitte le culte et ne reviens pas.', tag: 'Épargner', tagCol: '#58e39b', do: S => { S.set('maelle', 'epargnee'); S.set('lettre'); S.approve('nadia', 10); S.approve('okafor', -5); }, go: 'epargnee' },
          { t: 'Tu répondras de tes actes devant le Guet.', tag: 'Livrer', tagCol: '#6fb8ff', do: S => { S.set('maelle', 'livree'); S.set('lettre'); S.approve('okafor', 10); S.approve('nadia', -5); }, go: 'livree' },
          { t: 'Ta Marée a noyé des milliers de gens.', tag: 'Juger', tagCol: '#ff5a4e', go: 'juger' }
        ]
      },
      heraut: { t: 'Il porte un masque d’argent. Il connaît des mots anciens, les mots des Lampistes. Il dit que la Mère-Abysse lavera la cité de ses péchés. Et que l’échevin paie le sel des offrandes.', do: S => S.codex('enfants'), next: 'choix' },
      lettre: { who: '', t: 'Elle vous tend un pli scellé de cire dorée. « Je devais le porter au Héraut, cette nuit. Prends-le. Je ne veux plus le porter. »', do: S => S.set('lettre'), opts: [{ t: 'Continuer', go: 'choix' }] },
      juger: { t: 'Tu as raison. Elle les a noyés. Et moi, je l’ai priée. Fais ce que tu as à faire, golem.', opts: [{ t: '(Frapper.)', tag: 'Irréversible', tagCol: '#ff5a4e', do: S => { S.set('maelle', 'jugee'); S.set('lettre'); S.approve('okafor', -5); S.approve('nadia', -15); }, go: 'jugee' }, { t: '(Baisser le bras.)', go: 'choix' }] },
      jugee: { who: '', t: ['Le coup est rapide. Sœur Maelle s’effondre sans un cri, le visage tourné vers l’eau. Sous le lac, la cloche se tait.', 'Dans ses mains ouvertes, un pli scellé de cire dorée.'], do: S => S.advance('cloche', 'lettre'), opts: [{ t: '(Prendre la lettre et partir.)' }] },
      epargnee: { t: '… Merci. Je ne l’oublierai pas. Si un jour tu as besoin d’une porte ouverte chez les Enfants, souviens-toi de Maelle. Et prends ça : la lettre que je devais porter au Héraut.', do: S => S.advance('cloche', 'lettre'), opts: [{ t: '(Partir)' }] },
      livree: { t: 'Je comprends. Tiens, la lettre que je devais porter au Héraut. Elle est à toi, maintenant. … Je prierai pour toi, golem. Même si tu n’as pas de fil.', do: S => S.advance('cloche', 'lettre'), opts: [{ t: '(Partir)' }] },
      libre: { t: S => S.flag('chap1_fin') ? 'Je prie toujours. Mais plus pour la Marée. Pour eux, juste pour eux. Et parfois pour toi.' : 'Va, golem. La lettre. Le capitaine doit la voir.', opts: [{ t: 'Que va faire le culte, maintenant ?', once: 'm_culte', go: 'culte' }, { t: '(Partir)' }] },
      culte: { t: 'Le Héraut ne s’arrête jamais. Sans la cloche, il trouvera autre chose. Il parle souvent du Phare. Toujours la nuit, toujours en regardant la mer.', opts: [{ t: '(Partir)' }] },
      cellule: { t: 'Le capitaine m’a donné une couverture. Il n’est pas aussi dur qu’il le croit. Ne le lui dis pas.', opts: [{ t: '(Partir)' }] }
    }
  },

  /* ---------- the people of the square ---------- */
  bastien: {
    mark: S => !S.flag('ru_bastien') ? '!' : '',
    start: S => S.flag('ru_bastien') ? 'idle' : 'hello',
    nodes: {
      hello: {
        t: 'Je frotte les lanternes, golem. Une par une, toute la nuit. Le sel-de-lune brille quand on le frotte, tu savais ? Comme ton cœur.',
        do: S => { S.codex('sel'); heard(S, 'bastien'); },
        opts: [{ t: 'Les lanternes protègent la cité ?', go: 'protege' }, { t: '(Partir)' }]
      },
      protege: { t: 'On dit qu’elles tiennent la Marée à distance. Moi, je crois qu’elles l’empêchent seulement de nous voir. C’est déjà pas mal.', opts: [{ t: '(Partir)' }] },
      idle: { t: 'Encore une lanterne, et encore une. Bonne nuit, golem.', opts: [{ t: '(Partir)' }] }
    }
  },
  margot: {
    mark: S => !S.flag('ru_margot') ? '!' : '',
    start: S => S.flag('ru_margot') ? 'idle' : 'hello',
    nodes: {
      hello: {
        t: ['Je pêchais au-dessus de la Basse-Saline. Les filets remontaient des poissons sans yeux, et parfois… des clés. Des bagues.', 'Une fois, une poupée. J’ai arrêté.'],
        do: S => { S.codex('basse_saline'); heard(S, 'margot'); },
        opts: [{ t: 'Que pêchez-vous, maintenant ?', go: 'mtnt' }, { t: '(Partir)' }]
      },
      mtnt: { t: 'Je vends le poisson des autres. Ça sent pareil, et je dors mieux.', opts: [{ t: '(Partir)' }] },
      idle: { t: 'Poisson frais ! Enfin… frais pour Port-Saline.', opts: [{ t: '(Partir)' }] }
    }
  },
  corentin: {
    mark: S => !S.flag('ru_corentin') ? '!' : '',
    start: S => S.flag('ru_corentin') ? 'idle' : 'hello',
    nodes: {
      hello: {
        t: ['J’ai servi sur la Reine d’Aubemer, le grand vaisseau royal. Elle a coulé la nuit du Débordement, à l’entrée du port. On l’appelle le Ventre de la Baleine, maintenant.', 'Paraît qu’un golem y est entré, après. Le précédent, avant toi. Il en est jamais sorti.'],
        do: S => { S.codex('aubemer'); S.set('seize_rumeur'); heard(S, 'corentin'); },
        opts: [{ t: 'Que cherchait-il dans l’épave ?', go: 'quoi' }, { t: '(Partir)' }]
      },
      quoi: { t: 'Les gens disent : les survivants. Moi je dis : quelque chose qui était dans la cale. On chargeait des caisses pour les Lampistes, ce soir-là. Lourdes. Qui bourdonnaient.', opts: [{ t: '(Partir)' }] },
      idle: { t: 'La mer, petit. Faut jamais lui tourner le dos.', opts: [{ t: '(Partir)' }] }
    }
  }
});
// the first page of Anselme leads to the questions
DIALOGUES.anselme.nodes.eveil.opts = [{ t: 'Continuer', go: 'hub' }];
