/* =====================================================================
   DESTIN — combat façon Kingdom of Amalur
   · chaînes de combos par arme, combos « à pause » (attendre un temps change la fin du combo)
   · jauge de Destin, mode Jugement (le monde ralentit) et Dénouement (les ennemis marqués tombent d'un coup)
   · trois arbres de talents (Puissance, Finesse, Sorcellerie) et les Destinées qu'ils débloquent
   ===================================================================== */
// player-only attacks: they reuse the existing clips with their own timing (the clip is warped onto hit / dur)
Object.assign(ATK, {
  p_upper: { clip: 'hook', dur: 0.62, hit: 0.3, range: 1.5, dmg: 21, knock: 3, lunge: 3, snd: 'heavy', poise: 55, kd: 0.8, cancel: 0.45, fin: true },
  p_shove: { clip: 'shove', dur: 0.66, hit: 0.3, range: 1.9, dmg: 12, knock: 9, lunge: 2.4, snd: 'heavy', poise: 70, kd: 1, arc: 1.2, cancel: 0.5, fin: true, pause: true },
  p_swing2: { clip: 'swing', dur: 0.56, hit: 0.28, range: 2.15, dmg: 24, knock: 5, lunge: 2.2, snd: 'heavy', poise: 45, arc: 1.4, cancel: 0.4 },
  p_overhead: { clip: 'overhead', dur: 0.86, hit: 0.48, range: 2.4, dmg: 38, knock: 8, lunge: 2.6, snd: 'heavy', poise: 90, kd: 1, cancel: 0.6, fin: true },
  p_slam: { clip: 'slam', dur: 1.0, hit: 0.56, range: 3.6, dmg: 30, knock: 9, lunge: 0, snd: 'slam', poise: 90, kd: 1, aoe: true, arc: 3.2, cancel: 0.75, fin: true, pause: true },
  p_stab2: { clip: 'stab', dur: 0.34, hit: 0.15, range: 1.55, dmg: 18, knock: 1.2, lunge: 3.8, snd: 'flesh', poise: 12, lethal: true, cancel: 0.22 },
  p_slash: { clip: 'swing', dur: 0.44, hit: 0.2, range: 1.9, dmg: 22, knock: 3, lunge: 3, snd: 'flesh', poise: 30, lethal: true, arc: 1.5, cancel: 0.32, fin: true },
  p_flurry: { clip: 'spinKick', dur: 0.62, hit: 0.26, hitEnd: 0.5, range: 2, dmg: 16, knock: 4, lunge: 1.2, snd: 'flesh', poise: 40, arc: 3.2, spin: true, lethal: true, cancel: 0.45, fin: true, pause: true },
  p_staff2: { clip: 'swing', dur: 0.5, hit: 0.24, range: 2.4, dmg: 18, knock: 4, lunge: 2.4, snd: 'heavy', poise: 35, arc: 1.6, cancel: 0.36 },
  p_staff3: { clip: 'spinKick', dur: 0.66, hit: 0.3, range: 2.6, dmg: 24, knock: 7, lunge: 1.6, snd: 'heavy', poise: 60, kd: 0.8, arc: 3.2, spin: true, cancel: 0.48, fin: true }
});
// the chain each weapon walks through on the main button; « pause » is the finisher that comes out
// when the player waits a beat (PAUSE_MIN…PAUSE_MAX after the last blow ended) before pressing again
const COMBOS = {
  fists: { chain: ['jab', 'cross', 'hook', 'p_upper'], pause: 'p_shove' },
  bat: { chain: ['batSwing', 'p_swing2', 'p_overhead'], pause: 'p_slam' },
  wrench: { chain: ['batSwing', 'p_swing2', 'p_overhead'], pause: 'p_slam' },
  knife: { chain: ['stab', 'p_stab2', 'stab', 'p_slash'], pause: 'p_flurry' },
  staff: { chain: ['batSwing', 'p_staff2', 'p_staff3'], pause: 'p_slam' }
};
const PAUSE_MIN = 0.2, PAUSE_MAX = 0.85;

/* ---------- talents ---------- */
// each talent has 3 ranks; the last talent of a tree needs 6 points already spent in that tree
const TREES = [
  { id: 'might', name: 'Puissance', col: '#ff5a4e', talents: [
    { id: 'brute', name: 'Force brute', desc: r => `+${r * 8} % de dégâts au corps à corps` },
    { id: 'plate', name: 'Carapace', desc: r => `+${r * 12} points de vie` },
    { id: 'crush', name: 'Fracas', desc: r => `+${r * 15} % de déséquilibre infligé` },
    { id: 'colossus', name: 'Colosse', req: 6, desc: r => `Les fins de combo renversent · +${r * 10} % de leurs dégâts` }
  ] },
  { id: 'finesse', name: 'Finesse', col: '#3ee08f', talents: [
    { id: 'breath', name: 'Second souffle', desc: r => `+${r * 10} % d'endurance` },
    { id: 'shadow', name: 'Pas de l’ombre', desc: r => `Roulade : +${r * 40} ms d'invulnérabilité, coûte ${r * 2} de moins` },
    { id: 'vengeful', name: 'Lame vengeresse', desc: r => `+${r * 20} % de dégâts de riposte` },
    { id: 'precise', name: 'Coup précis', req: 6, desc: r => `${r * 8} % de coups critiques (dégâts doublés)` }
  ] },
  { id: 'sorcery', name: 'Sorcellerie', col: '#6aa8ff', talents: [
    { id: 'affinity', name: 'Affinité du Destin', desc: r => `+${r * 15} % de jauge de Destin gagnée` },
    { id: 'thread', name: 'Fil tendu', desc: r => `Jugement : +${(r * 1.5).toString().replace('.', ',')} s` },
    { id: 'sap', name: 'Sève runique', desc: r => `Régénère ${r} PV/s pendant les combats` },
    { id: 'wave', name: 'Onde arcanique', req: 6, desc: r => `Les fins de combo à pause libèrent une onde (${(2 + r).toString()} m)` }
  ] }
];
const TALENT = {}; for (const T of TREES) for (const t of T.talents) { t.tree = T.id; TALENT[t.id] = t; }
// Destinées: one is worn at a time; each needs points in one or two trees
const DESTINIES = [
  { id: 'wanderer', name: 'Vagabond', need: {}, desc: '+5 % de dégâts et de points de vie', fx: { dmg: 0.05, hp: 0.05 } },
  { id: 'brawler', name: 'Bagarreur', need: { might: 3 }, desc: '+10 % de dégâts, +10 % de points de vie', fx: { dmg: 0.1, hp: 0.1 } },
  { id: 'rogue', name: 'Rôdeur', need: { finesse: 3 }, desc: '+10 % d’endurance, +5 % de critiques', fx: { stam: 0.1, crit: 0.05 } },
  { id: 'adept', name: 'Adepte', need: { sorcery: 3 }, desc: '+25 % de jauge de Destin', fx: { fate: 0.25 } },
  { id: 'warlord', name: 'Seigneur de guerre', need: { might: 9 }, desc: '+20 % de dégâts, +25 % de points de vie, +25 % de déséquilibre', fx: { dmg: 0.2, hp: 0.25, poise: 0.25 } },
  { id: 'assassin', name: 'Assassin', need: { finesse: 9 }, desc: '+15 % de critiques, ripostes +40 %', fx: { crit: 0.15, rip: 0.4, stam: 0.1 } },
  { id: 'archmage', name: 'Archimage', need: { sorcery: 9 }, desc: '+50 % de jauge de Destin, Jugement +3 s', fx: { fate: 0.5, reck: 3 } },
  { id: 'blade', name: 'Lame de guerre', need: { might: 5, finesse: 5 }, desc: '+12 % de dégâts, +8 % de critiques', fx: { dmg: 0.12, crit: 0.08 } },
  { id: 'runeknight', name: 'Chevalier runique', need: { might: 5, sorcery: 5 }, desc: '+12 % de dégâts, +15 % de points de vie, +25 % de Destin', fx: { dmg: 0.12, hp: 0.15, fate: 0.25 } },
  { id: 'spellblade', name: 'Ombre-sort', need: { finesse: 5, sorcery: 5 }, desc: 'Ripostes +30 %, +30 % de Destin', fx: { rip: 0.3, fate: 0.3 } },
  { id: 'weaver', name: 'Tisse-destin', need: { might: 4, finesse: 4, sorcery: 4 }, desc: '+10 % à tout, Jugement +2 s', fx: { dmg: 0.1, hp: 0.1, stam: 0.1, fate: 0.1, crit: 0.05, reck: 2 } }
];

const Destin = {
  /* ---------- save data ---------- */
  data() { const d = Save.data; if (!d.fate || typeof d.fate !== 'object') d.fate = {}; const f = d.fate; if (!f.ranks || typeof f.ranks !== 'object') f.ranks = {}; if (typeof f.destiny !== 'string') f.destiny = 'wanderer'; return f; },
  // talent points: 3 to start with, then 3 more per rank of the unit
  points() { return 3 + rankK() * 3; },
  rank(id) { return this.data().ranks[id] | 0; },
  spent(tree) { let n = 0; for (const t of TREES) if (!tree || t.id === tree) for (const k of t.talents) n += this.rank(k.id); return n; },
  free() { return this.points() - this.spent(); },
  canBuy(id) { const t = TALENT[id]; return !!t && this.free() > 0 && this.rank(id) < 3 && this.spent(t.tree) >= (t.req || 0); },
  buy(id) { if (!this.canBuy(id)) return false; this.data().ranks[id] = this.rank(id) + 1; this.validate(); Save.write(); this.refresh(); return true; },
  reset() { const f = this.data(); f.ranks = {}; f.destiny = 'wanderer'; Save.write(); this.refresh(); },
  unlocked(D) { for (const k in D.need) if (this.spent(k) < D.need[k]) return false; return true; },
  destiny() { const f = this.data(); const D = DESTINIES.find(x => x.id === f.destiny); return D && this.unlocked(D) ? D : DESTINIES[0]; },
  choose(id) { const D = DESTINIES.find(x => x.id === id); if (!D || !this.unlocked(D)) return false; this.data().destiny = id; Save.write(); this.refresh(); return true; },
  validate() { const f = this.data(); const D = DESTINIES.find(x => x.id === f.destiny); if (!D || !this.unlocked(D)) f.destiny = 'wanderer'; },
  /* ---------- what the talents and the destiny add up to ---------- */
  mods() {
    const r = id => this.rank(id), F = this.destiny().fx;
    return {
      dmg: 1 + r('brute') * 0.08 + (F.dmg || 0), hp: r('plate') * 12, hpK: 1 + (F.hp || 0), poise: 1 + r('crush') * 0.15 + (F.poise || 0),
      fin: r('colossus') * 0.1, finKd: r('colossus') > 0,
      stam: 1 + r('breath') * 0.1 + (F.stam || 0), iframe: r('shadow') * 0.04, rollCost: r('shadow') * 2,
      rip: 1 + r('vengeful') * 0.2 + (F.rip || 0), crit: r('precise') * 0.08 + (F.crit || 0),
      fate: 1 + r('affinity') * 0.15 + (F.fate || 0), reck: 8 + r('thread') * 1.5 + (F.reck || 0), sap: r('sap'), wave: r('wave')
    };
  },
  // (re)apply the build to the robot: on spawn, and live when the build changes from the pause menu
  apply(P) {
    if (!P) return; const M = this.mods(); P.fm = M;
    const S = Save.data.stats, hpK = P.maxHp > 0 ? P.hp / P.maxHp : 1, stK = P.maxStamina > 0 ? P.stamina / P.maxStamina : 1;
    P.maxHp = Math.round((playerMaxHp(S) + M.hp) * M.hpK); P.hp = Math.max(1, P.maxHp * hpK);
    P.maxStamina = 100 * (1 + S.endurance * 0.15) * M.stam; P.stamina = P.maxStamina * stK;
    P.dmgBase = 1 + S.force * 0.1 + rankK() * 0.015; P.dmgOut = P.dmgBase * M.dmg;
    if (P.fate === undefined) { P.fate = 0; P.reckT = 0; P.marked = new Set(); }
  },
  refresh() { if (Game.player) this.apply(Game.player); },
  /* ---------- the Fate gauge ---------- */
  gain(P, v) {
    if (!P || P !== Game.player || P.reckT > 0) return;
    const was = P.fate; P.fate = Math.min(100, P.fate + v * (P.fm ? P.fm.fate : 1) * Loot.fateK(P));
    if (was < 100 && P.fate >= 100) { HUD.toast('Destin prêt', 'Jugement : ' + Input.glyphFate(), 'gold', true); Snd.play('perfect', P.pos, 0.6); }
  },
  // a blow of the robot landed: crits, Fate, marks during the Reckoning
  onHit(att, t, A) {
    if (att !== Game.player || t.team === 'civ') return;
    this.gain(att, A.d.fin ? 7 : 4);
    if (att.reckT > 0) { att.marked.add(t); t.fateMark = true; }
  },
  // multiplier applied by Combat.resolveMelee to the robot's blows
  dmgK(att, A) {
    if (att !== Game.player || !att.fm) return 1;
    const M = att.fm; let k = 1;
    if (A.d.fin) k *= 1 + M.fin;
    if (att.reckT > 0) k *= 1.6;
    k *= Loot.dmgK(att); const crit = M.crit + Loot.crit(att); // the weapon in hand adds its own properties
    A.crit = crit > 0 && Math.random() < crit; if (A.crit) k *= 2;
    return k;
  },
  /* ---------- Reckoning (Jugement) ---------- */
  canReckon(P) { return P && P.fate >= 100 && P.reckT <= 0 && P.alive && P.state !== 'car' && P.state !== 'dead'; },
  reckon(P) {
    if (!this.canReckon(P)) return false;
    P.reckT = P.fm ? P.fm.reck : 8; P.reckMax = P.reckT; P.fate = 100; P.marked.clear(); P.poise = 0;
    Game.hitstop(0.12); CamCtl.shake(0.5); Render.post.extraFlash = 0.12; Input.rumble(0.6, 0.9, 260);
    Snd.play('perfect', P.pos, 1); FX.ring(P.pos.x, P.pos.y + 0.05, P.pos.z, 4, [0.75, 0.5, 1], 0.7);
    HUD.big('JUGEMENT', 'Chaque ennemi touché est marqué', '', 1.8); document.body.classList.add('reckoning');
    return true;
  },
  // Fateshift: every marked foe still standing nearby goes down at once
  shift(P) {
    let n = 0;
    for (const t of P.marked) {
      t.fateMark = false;
      if (!t.alive || t.removed || t.cuffed || dist2D(P.pos.x, P.pos.z, t.pos.x, t.pos.z) > 16) continue;
      if (t.down) { n++; continue; }
      t.takeHit(P, Math.max(60, t.maxHp * 0.6), { kind: 'melee', knock: 9, kd: 1.4, poise: 999, heavy: true, unblockable: true });
      FX.hit(t.pos.x, t.pos.y + 1.2, t.pos.z, 1.6); FX.ring(t.pos.x, t.pos.y + 0.05, t.pos.z, 1.6, [0.75, 0.5, 1], 0.6); n++;
    }
    P.marked.clear(); P.reckT = 0; P.fate = 0; document.body.classList.remove('reckoning');
    FX.shockwave(P.pos.x, P.pos.y + 0.05, P.pos.z, 6); CamCtl.shake(0.8); Game.hitstop(0.14); Snd.play('slam', P.pos, 1); Render.post.extraFlash = 0.15;
    if (n) Game.award(80 * n, P.pos, n > 1 ? `DÉNOUEMENT ×${n}` : 'DÉNOUEMENT', 'feat');
    else HUD.toast('Jugement terminé', 'Aucun ennemi marqué', '');
  },
  update(P, dt) {
    if (!P || P !== Game.player) return;
    if (Input.pressed.fate) { if (P.reckT > 0) this.shift(P); else if (!this.reckon(P) && P.fate < 100) HUD.toast('Destin', `Jauge à ${Math.floor(P.fate)} %`, ''); }
    P.poiseMax = P.reckT > 0 ? 999 : 60; // nothing staggers the robot in the Reckoning
    if (P.reckT > 0) { P.reckT -= dt; P.fate = 100 * Math.max(0, P.reckT) / P.reckMax; if (P.reckT <= 0) this.shift(P); }
    // Sève runique: slow repair while the fight goes on
    if (P.fm && P.fm.sap && P.combatT > 0 && P.alive && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.fm.sap * dt);
  },
  // the world slows down while the robot is in the Reckoning (never in multiplayer: the others play in real time)
  worldK() { const P = Game.player; return P && P.reckT > 0 && !MP.on ? 0.45 : 1; },
  /* ---------- combos ---------- */
  // which blow comes out of the main button, given the chain so far and how long the robot waited
  nextPunch(P) {
    const C = COMBOS[P.cur] || COMBOS.fists;
    const idle = P.idleAtk;
    if (P.combo > 0 && !P.atk && idle >= PAUSE_MIN && idle <= PAUSE_MAX && C.pause) { P.combo = 0; P.pauseFx = true; return C.pause; }
    const name = C.chain[P.combo % C.chain.length];
    P.combo = (P.combo + 1) % C.chain.length;
    return name;
  },
  // a pause finisher landed: the arcane wave talent answers it
  onFinisher(P, A) {
    if (P !== Game.player || !A.d.pause || !P.fm || !P.fm.wave) return;
    const rad = 2 + P.fm.wave; let n = 0;
    for (const t of Game.actors) {
      if (t === P || !t.hittable || t.down || t.team === 'police' || t.team === 'civ') continue;
      if (dist2D(P.pos.x, P.pos.z, t.pos.x, t.pos.z) > rad) continue;
      t.takeHit(P, 10 + 6 * P.fm.wave, { kind: 'melee', knock: 6, kd: 0.6, poise: 50, heavy: true }); n++;
    }
    FX.ring(P.pos.x, P.pos.y + 0.05, P.pos.z, rad, [0.4, 0.65, 1], 0.5); if (n) Snd.play('slam', P.pos, 0.5);
  }
};
