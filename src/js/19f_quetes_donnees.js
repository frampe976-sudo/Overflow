/* =====================================================================
   QUÊTES EN DONNÉES — « si … alors … », inspiré du système de waypoints
   d'Urban Chaos (EWAY, Mucky Foot 1999, code publié sous licence MIT)
   · s'appuie sur le Récit (19d) sans le réécrire : Story, QUESTS, CODEX
   · une étape de quête peut s'écrire sans code :
       { text, tag, ou: 'cemetery', debut: [actions], quand: condition, alors: [actions] }
     l'étape est traduite en start/update au chargement, Story la joue comme les autres
   · des déclencheurs libres (DECLENCHEURS) surveillent la ville en dehors des quêtes :
       { id, si: condition, alors: [actions], une_fois: true (défaut), apres: 'autre_id' }
   · conditions : proche, drapeau, compteur, quete, groupe_vaincu, groupe_moitie,
                  temps, aleatoire, tous, un_de, non
   · actions    : ennemis, message, titre, drapeau, compteur, codex, approbation, xp,
                  quete_debut, quete_etape, quete_fin, dialogue, sauvegarde
   ===================================================================== */
const DECLENCHEURS = []; // déclencheurs libres de la ville, remplis par les fichiers de contenu

const Quetes = {
  /* ---------- lieux ---------- */
  // un lieu : nom d'un emplacement de la ville ('cemetery'), 'pnj:anselme', 'joueur', {x, z}, ou une liste de points
  lieu(L, S) {
    if (!L) return null;
    if (typeof L === 'object' && !Array.isArray(L) && L.x !== undefined) return { x: L.x, y: L.y !== undefined ? L.y : World.groundAt(L.x, L.z, 0.3, 4), z: L.z };
    if (L === 'joueur') { const P = Game.player; return P ? P.pos : null; }
    if (typeof L === 'string' && L.indexOf('pnj:') === 0) return (S || Story).where(L.slice(4));
    const s = typeof L === 'string' ? World.spots[L] : L; if (!s) return null;
    if (Array.isArray(s)) { // une liste de points [[x, z], …] ou [{x, z}, …] : son centre
      let x = 0, z = 0; for (const p of s) { x += Array.isArray(p) ? p[0] : p.x; z += Array.isArray(p) ? p[1] : p.z; }
      x /= s.length; z /= s.length; return { x, y: World.groundAt(x, z, 0.3, 4), z };
    }
    return { x: s.x, y: s.y !== undefined ? s.y : World.groundAt(s.x, s.z, 0.3, 4), z: s.z };
  },
  /* ---------- compteurs (sauvegardés avec le récit) ---------- */
  compteurs() { const s = Story.data(); if (!s.compteurs || typeof s.compteurs !== 'object') s.compteurs = {}; return s.compteurs; },
  compteur(k) { return this.compteurs()[k] | 0; },
  /* ---------- conditions ---------- */
  // ctx : { S, rt } — rt est l'état de l'étape en cours (groupes d'ennemis, temps écoulé)
  vrai(c, ctx) {
    if (c === undefined || c === null || c === true) return true;
    if (c === false) return false;
    if (Array.isArray(c)) return c.every(x => this.vrai(x, ctx)); // une liste = toutes à la fois
    const S = ctx.S, rt = ctx.rt || {}, P = Game.player;
    if (c.tous) return c.tous.every(x => this.vrai(x, ctx));
    if (c.un_de) return c.un_de.some(x => this.vrai(x, ctx));
    if (c.non) return !this.vrai(c.non, ctx);
    switch (c.si) {
      case 'proche': { // le joueur (ou un PNJ du récit avec qui) est à moins de rayon du lieu
        const p = this.lieu(c.lieu, S), w = c.qui ? this.lieu(c.qui, S) : P && P.pos;
        return !!p && !!w && dist2D(p.x, p.z, w.x, w.z) < (c.rayon || 8) && (c.hauteur === undefined || Math.abs(p.y - w.y) < c.hauteur);
      }
      case 'drapeau': return c.vaut === undefined ? !!S.flag(c.nom) : S.flag(c.nom) === c.vaut;
      case 'compteur': { const n = this.compteur(c.nom); return (c.min === undefined || n >= c.min) && (c.max === undefined || n <= c.max); }
      case 'quete': {
        const q = S.q(c.id);
        if (c.etat === 'absente') return !q;
        if (c.etat) return !!q && q.state === (c.etat === 'finie' ? 'done' : c.etat === 'active' ? 'active' : c.etat);
        if (c.etape) return S.step(c.id) === c.etape;
        return !!q;
      }
      case 'groupe_vaincu': { const g = rt.groupes && rt.groupes[c.groupe]; return !!g && g.length > 0 && g.every(a => Kit.isDown(a)); }
      case 'groupe_moitie': { const g = rt.groupes && rt.groupes[c.groupe]; return !!g && g.length > 0 && g.filter(a => Kit.isDown(a)).length * 2 >= g.length; }
      case 'temps': return (rt.t || 0) >= (c.secondes || 0);
      case 'aleatoire': return Math.random() < (c.chance === undefined ? 0.5 : c.chance);
    }
    console.warn('Quêtes : condition inconnue', c); return false;
  },
  /* ---------- actions ---------- */
  faire(list, ctx) {
    for (const a of [].concat(list || [])) {
      try { this.action(a, ctx); } catch (e) { console.error('Quêtes : action', a, e); }
    }
  },
  action(a, ctx) {
    const S = ctx.S, rt = ctx.rt || (ctx.rt = {});
    switch (a.fait) {
      case 'ennemis': { // un groupe d'ennemis autour d'un lieu
        const p = this.lieu(a.lieu, S); if (!p) return;
        const o = { label: a.nom }; if (a.ia) o.ai = a.ia;
        const foes = Kit.squad(a.types || ['thug'], p.x, p.z, a.rayon || 6, o);
        for (const f of foes) { f.tags.target = a.cible !== false; f.tags.groupe = a.groupe || 'ennemis'; }
        if (a.chef) { const c = Kit.foe(a.chef.type, p.x + (a.chef.dx || 0), p.z + (a.chef.dz || 0), { label: a.chef.nom }); c.tags.target = true; foes.push(c); }
        rt.groupes = rt.groupes || {}; const g = rt.groupes[a.groupe || 'ennemis'] = (rt.groupes[a.groupe || 'ennemis'] || []).concat(foes);
        if (rt.foes) rt.foes.push(...foes); else rt.foes = g.slice(); // rt.foes : le Récit les retire si l'étape recommence
        if (a.alerte) for (const f of foes) { f.alerted = true; f.ai = 'engage'; }
        return;
      }
      case 'message': HUD.say(a.qui || '', a.texte); return;
      case 'titre': HUD.big(a.titre, a.sous || '', a.style || '', a.duree || 2.6); return;
      case 'drapeau': S.set(a.nom, a.vaut === undefined ? true : a.vaut); return;
      case 'compteur': { const C = this.compteurs(); C[a.nom] = a.vaut !== undefined ? a.vaut : (C[a.nom] | 0) + (a.ajoute === undefined ? 1 : a.ajoute); Save.write(); return; }
      case 'codex': S.codex(a.id); return;
      case 'approbation': S.approve(a.qui, a.n); return;
      case 'xp': S.xp(a.n); return;
      case 'quete_debut': S.start(a.id, a.etape); return;
      case 'quete_etape': S.advance(a.id, a.etape); return;
      case 'quete_fin': S.finish(a.id); return;
      case 'dialogue': if (!Talk.on) Talk.open(a.pnj); return;
      case 'sauvegarde': Save.write(); return;
    }
    console.warn('Quêtes : action inconnue', a);
  },
  /* ---------- étapes de quête écrites en données ---------- */
  // donne à chaque étape déclarative le start/update que Story attend (les étapes en code restent telles quelles)
  compiler() {
    for (const qid in QUESTS) {
      const Q = QUESTS[qid];
      for (const sid in Q.steps) {
        const st = Q.steps[sid]; if (st._donnees || !(st.debut || st.quand || st.alors || typeof st.ou === 'string' || (st.ou && st.ou.x !== undefined))) continue;
        st._donnees = true;
        if (st.ou && !st.where) st.where = (S, rt) => {
          // le marqueur suit l'ennemi debout le plus proche du groupe en cours, sinon le lieu
          const a = rt && rt.foes && Kit.nearest(rt.foes); return a ? a.pos : Quetes.lieu(st.ou, S);
        };
        const start0 = st.start, update0 = st.update;
        st.start = (rt, S) => { rt.fait = false; if (start0) start0(rt, S); Quetes.faire(st.debut, { S, rt }); };
        st.update = (rt, S, dt) => {
          if (update0) update0(rt, S, dt);
          if (rt.fait || st.quand === undefined) return;
          if (Quetes.vrai(st.quand, { S, rt })) { rt.fait = true; Quetes.faire(st.alors, { S, rt }); }
        };
        // le texte peut montrer le décompte d'un groupe : « {vaincus}/{total} »
        if (typeof st.text === 'string' && st.text.indexOf('{') >= 0) {
          const t = st.text; st.text = (S, rt) => { const g = (rt && rt.foes) || []; return t.replace('{vaincus}', g.filter(a => Kit.isDown(a)).length).replace('{total}', g.length); };
        }
      }
    }
  },
  /* ---------- déclencheurs libres ---------- */
  faits() { const s = Story.data(); if (!s.declenches || typeof s.declenches !== 'object') s.declenches = {}; return s.declenches; },
  rt: {}, // état de chaque déclencheur pendant la partie (ses ennemis, son temps)
  tick(dt) {
    const S = Story, F = this.faits();
    for (const D of DECLENCHEURS) {
      if (D.une_fois !== false && F[D.id]) continue;
      if (D.apres && !F[D.apres]) continue;
      const rt = this.rt[D.id] || (this.rt[D.id] = { t: 0 }); rt.t += dt;
      if ((rt.cd = (rt.cd || 0) - dt) > 0) continue;
      if (!this.vrai(D.si, { S, rt })) continue;
      F[D.id] = (F[D.id] | 0) + 1; rt.cd = D.delai || 1; Save.write();
      this.faire(D.alors, { S, rt });
    }
  },
  // branche le moteur sur le Récit sans toucher à son code : Story.update appelle aussi tick
  install() {
    if (Story._quetes) return; Story._quetes = true;
    this.compiler();
    const update0 = Story.update, begin0 = Story.begin;
    Story.begin = function (M) { Quetes.rt = {}; Quetes.compiler(); return begin0.call(this, M); };
    Story.update = function (M, dt) { update0.call(this, M, dt); if (!Talk.on) Quetes.tick(dt); };
  }
};
queueMicrotask(() => { Quetes.install(); if (window.__OF) Object.assign(window.__OF, { Quetes, DECLENCHEURS }); });
