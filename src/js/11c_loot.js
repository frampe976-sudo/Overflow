/* =====================================================================
   BUTIN — armes fantasy à raretés et propriétés (façon Kingdom of Amalur)
   · les ennemis mis à terre lâchent parfois une arme : Commune, Rare, Épique ou Légendaire
   · chaque arme porte des propriétés tirées au sort (dégâts, critiques, Destin, vol de vie, feu, givre, foudre)
   · l'écran Équipement permet d'équiper, de recycler en éclats et de forger (+1 niveau)
   ===================================================================== */
// player attacks of the fantasy weapons (the clips are warped onto hit / dur, like the Destin attacks)
Object.assign(ATK, {
  p_sw1: { clip: 'swing', dur: 0.5, hit: 0.25, range: 2.2, dmg: 22, knock: 4, lunge: 2.6, snd: 'flesh', poise: 35, arc: 1.4, lethal: true, cancel: 0.36 },
  p_sw2: { clip: 'stab', dur: 0.44, hit: 0.2, range: 2.1, dmg: 20, knock: 2.5, lunge: 3.8, snd: 'flesh', poise: 25, lethal: true, cancel: 0.3 },
  p_sw3: { clip: 'overhead', dur: 0.72, hit: 0.4, range: 2.4, dmg: 34, knock: 7, lunge: 2.6, snd: 'heavy', poise: 80, kd: 0.9, lethal: true, cancel: 0.52, fin: true },
  p_swspin: { clip: 'spinKick', dur: 0.66, hit: 0.28, hitEnd: 0.52, range: 2.4, dmg: 26, knock: 6, lunge: 1.4, snd: 'flesh', poise: 60, arc: 3.2, spin: true, lethal: true, cancel: 0.5, fin: true, pause: true },
  p_ham1: { clip: 'swing', dur: 0.8, hit: 0.44, range: 2.3, dmg: 34, knock: 7, lunge: 2, snd: 'heavy', poise: 70, kd: 0.6, arc: 1.5, cancel: 0.6 },
  p_ham2: { clip: 'overhead', dur: 0.98, hit: 0.56, range: 2.5, dmg: 48, knock: 9, lunge: 2.2, snd: 'heavy', poise: 110, kd: 1.1, cancel: 0.75, fin: true },
  p_hamslam: { clip: 'slam', dur: 1.1, hit: 0.62, range: 4.4, dmg: 40, knock: 10, lunge: 0, snd: 'slam', poise: 120, kd: 1.2, aoe: true, arc: 3.2, cancel: 0.85, fin: true, pause: true },
  p_dag3: { clip: 'stab', dur: 0.3, hit: 0.13, range: 1.6, dmg: 15, knock: 1, lunge: 4, snd: 'flesh', poise: 10, lethal: true, cancel: 0.2 },
  p_sc2: { clip: 'shove', dur: 0.5, hit: 0.24, range: 2.4, dmg: 18, knock: 6, lunge: 2, snd: 'heavy', poise: 45, arc: 1.3, cancel: 0.36 },
  p_scnova: { clip: 'slam', dur: 0.95, hit: 0.5, range: 4.8, dmg: 26, knock: 8, lunge: 0, snd: 'slam', poise: 80, kd: 0.9, aoe: true, arc: 3.2, cancel: 0.7, fin: true, pause: true, elem: 'arcane' }
});
Object.assign(COMBOS, {
  sword: { chain: ['p_sw1', 'p_sw2', 'p_sw1', 'p_sw3'], pause: 'p_swspin' },
  hammer: { chain: ['p_ham1', 'p_ham1', 'p_ham2'], pause: 'p_hamslam' },
  dagger: { chain: ['stab', 'p_dag3', 'p_stab2', 'p_dag3', 'p_slash'], pause: 'p_flurry' },
  sceptre: { chain: ['p_staff2', 'p_sc2', 'p_staff3'], pause: 'p_scnova' }
});

const RARITY = [
  { name: 'Commune', col: '#c9ced9', glow: [0.8, 0.82, 0.9], n: 1, k: 1 },
  { name: 'Rare', col: '#4da3ff', glow: [0.3, 0.6, 1], n: 2, k: 1.25 },
  { name: 'Épique', col: '#b07bff', glow: [0.7, 0.45, 1], n: 3, k: 1.5 },
  { name: 'Légendaire', col: '#ffb547', glow: [1, 0.7, 0.25], n: 4, k: 1.8 }
];
const LOOT_BASES = ['sword', 'hammer', 'dagger', 'sceptre'];
// properties: roll = value at item level 1 for a Common item; fmt shows it
const AFFIX = {
  dmg: { roll: 0.08, fmt: v => `+${Math.round(v * 100)} % de dégâts`, adj: ['acéré', 'acérée'] },
  crit: { roll: 0.04, fmt: v => `+${Math.round(v * 100)} % de critiques`, adj: ['précis', 'précise'] },
  fate: { roll: 0.12, fmt: v => `+${Math.round(v * 100)} % de Destin`, adj: ['du destin', 'du destin'] },
  leech: { roll: 0.03, fmt: v => `Vol de vie ${Math.round(v * 100)} %`, adj: ['vampirique', 'vampirique'] },
  fire: { roll: 0.12, fmt: v => `Feu : ${Math.round(v * 100)} % d'embraser`, adj: ['de braise', 'de braise'] },
  frost: { roll: 0.1, fmt: v => `Givre : ${Math.round(v * 100)} % de geler`, adj: ['de givre', 'de givre'] },
  storm: { roll: 0.1, fmt: v => `Foudre : ${Math.round(v * 100)} % d'arc électrique`, adj: 'de l’orage' }
};
const AFFIX_KEYS = Object.keys(AFFIX);
const LEGENDS = { sword: ['Aube-Grise', 'Brise-Serment'], hammer: ['Glas des Digues', 'Poing du Colosse'], dagger: ['Croc de Marée', 'Murmure Noyé'], sceptre: ['Chant du Noyé', 'Œil de la Crue'] };
const BAG_MAX = 24;

const Loot = {
  data() { const d = Save.data; let g = d.gear; if (!g || typeof g !== 'object' || !Array.isArray(g.items)) g = d.gear = { items: [], eq: null, shards: 0, n: 0 }; g.shards = g.shards | 0; g.n = g.n | 0; return g; },
  items() { return this.data().items; },
  byId(id) { return this.items().find(i => i.id === id) || null; },
  equipped() { const g = this.data(); return g.eq ? this.byId(g.eq) : null; },
  /* ---------- making an item ---------- */
  roll(o = {}) {
    const g = this.data(), base = o.base || LOOT_BASES[Math.floor(Math.random() * LOOT_BASES.length)];
    const r = o.rarity !== undefined ? o.rarity : this.rollRarity(o.luck || 0), Rr = RARITY[r];
    const keys = AFFIX_KEYS.slice().sort(() => Math.random() - 0.5);
    if (base === 'sceptre' && Math.random() < 0.6) { const e = ['fire', 'frost', 'storm'][Math.floor(Math.random() * 3)]; keys.splice(keys.indexOf(e), 1); keys.unshift(e); } // sceptres favour the elements
    const aff = {}; for (const k of keys.slice(0, Rr.n)) aff[k] = +(AFFIX[k].roll * Rr.k * (0.75 + Math.random() * 0.5)).toFixed(3);
    const it = { id: 'g' + (++g.n) + '-' + Math.floor(Math.random() * 1e6).toString(36), base, rarity: r, lvl: 1, aff };
    const fem = base === 'sword' || base === 'dagger' ? 1 : 0; // une épée, une dague ; un marteau, un sceptre
    it.name = r === 3 ? LEGENDS[base][Math.floor(Math.random() * LEGENDS[base].length)] : `${WEAPONS[base].name} ${AFFIX[keys[0]].adj[fem]}`;
    return it;
  },
  rollRarity(luck) { const x = Math.random() - luck; return x < 0.04 ? 3 : x < 0.16 ? 2 : x < 0.45 ? 1 : 0; },
  // what an item adds, at its level (each forge level: +12 % on every property)
  mods(it) { const m = { dmg: 0, crit: 0, fate: 0, leech: 0, fire: 0, frost: 0, storm: 0 }; if (!it) return m; const k = 1 + (it.lvl - 1) * 0.12; for (const a in it.aff) if (a in m) m[a] = it.aff[a] * k; return m; },
  score(it) { const m = this.mods(it); return m.dmg * 3 + m.crit * 4 + m.fate + m.leech * 4 + m.fire + m.frost + m.storm + it.rarity * 0.05; },
  value(it) { return (it.rarity + 1) * 3 + (it.lvl - 1) * 2; }, // shards from recycling
  forgeCost(it) { return 6 * it.lvl * (it.rarity + 1); },
  /* ---------- bag ---------- */
  add(it) {
    const g = this.data(); g.items.push(it);
    if (g.items.length > BAG_MAX) { // full: the weakest unequipped item is recycled
      const worst = g.items.filter(i => i.id !== g.eq && i !== it).sort((a, b) => this.score(a) - this.score(b))[0];
      if (worst) { this.salvage(worst.id, true); HUD.toast('Sac plein', `${worst.name} recyclée en éclats`, ''); }
    }
    Save.write(); return it;
  },
  salvage(id, quiet) {
    const g = this.data(), it = this.byId(id); if (!it) return 0; if (g.eq === id) this.unequip();
    g.items.splice(g.items.indexOf(it), 1); const v = this.value(it); g.shards += v; if (!quiet) Save.write(); return v;
  },
  forge(id) {
    const g = this.data(), it = this.byId(id); if (!it || it.lvl >= 10) return false; const c = this.forgeCost(it); if (g.shards < c) return false;
    g.shards -= c; it.lvl++; Save.write(); this.refresh(); return true;
  },
  equip(id) { const g = this.data(); if (!this.byId(id)) return false; g.eq = id; Save.write(); this.refresh(true); return true; },
  unequip() { const g = this.data(); g.eq = null; Save.write(); const P = Game.player; if (P && WEAPONS[P.cur] && WEAPONS[P.cur].loot) { P.inv.melee = null; P.equip('fists'); } },
  // hand the equipped item to the robot (spawn, or a change from the menus)
  apply(P, take) {
    if (!P || (Game.def && Game.def.training)) return; const it = this.equipped(); P.gear = it;
    if (it && (!P.inv.melee || WEAPONS[P.inv.melee].loot || take)) { P.inv.melee = it.base; if (take || P.cur === 'fists') { P.cur = it.base; P.setWeapon(it.base); } }
  },
  refresh(take) { const P = Game.player; if (P && Game.mode !== 'menu') { this.apply(P, take); HUD.weaponChanged(); } },
  // the item's bonuses count only while its weapon is in hand
  cur(P) { return P && P.gear && P.cur === P.gear.base ? this.mods(P.gear) : null; },
  name(P) { return P && P.gear && P.cur === P.gear.base ? P.gear.name : (WEAPONS[P.cur] || WEAPONS.fists).name; },
  /* ---------- in combat ---------- */
  dmgK(P) { const m = this.cur(P); return m ? 1 + m.dmg : 1; },
  crit(P) { const m = this.cur(P); return m ? m.crit : 0; },
  fateK(P) { const m = this.cur(P); return m ? 1 + m.fate : 1; },
  onHit(P, t, dmg, A) {
    const m = this.cur(P); if (!m) return;
    if (m.leech > 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + dmg * m.leech);
    const elem = A.d.elem === 'arcane' ? 'storm' : null;
    if (m.fire > 0 && Math.random() < m.fire) this.ignite(t, P);
    if (m.frost > 0 && Math.random() < m.frost && t.alive && !t.down) { t.stagger && t.stagger(1.1, true); FX.spark(t.pos.x, t.pos.y + 1.2, t.pos.z, 0.9, 14, [0.6, 0.9, 1]); HUD.pop(t.pos.x, t.pos.y + 2.2, t.pos.z, 'GELÉ', 'feat'); }
    if ((m.storm > 0 && Math.random() < m.storm) || elem) this.arc(t, P, dmg);
  },
  burning: [],
  ignite(t, P) { if (!t.alive || t.burnT > 0) { t.burnT = 4; return; } t.burnT = 4; t.burnBy = P; this.burning.push(t); HUD.pop(t.pos.x, t.pos.y + 2.2, t.pos.z, 'EMBRASÉ', 'feat'); },
  arc(t, P, dmg) {
    let best = null, bd = 6;
    for (const a of Game.actors) { if (a === t || a === P || !a.hittable || a.down || a.team === 'police' || a.team === 'civ') continue; const d = dist2D(a.pos.x, a.pos.z, t.pos.x, t.pos.z); if (d < bd) { bd = d; best = a; } }
    FX.spark(t.pos.x, t.pos.y + 1.3, t.pos.z, 1, 16, [0.7, 0.8, 1]);
    if (best) { best.takeHit(P, Math.max(8, dmg * 0.45), { kind: 'melee', knock: 2, poise: 30, unblockable: true }); FX.spark(best.pos.x, best.pos.y + 1.3, best.pos.z, 1, 16, [0.7, 0.8, 1]); Snd.play('clank', best.pos, 0.5); }
  },
  update(dt) {
    if (!this.burning.length) return;
    this.burning = this.burning.filter(t => {
      if (!t.alive || t.removed || t.cuffed || !(t.burnT > 0)) { t.burnT = 0; return false; }
      t.burnT -= dt; t.burnAcc = (t.burnAcc || 0) + dt;
      if (t.burnAcc >= 0.5) { t.burnAcc = 0; t.takeHit(t.burnBy, 4, { kind: 'burn', knock: 0, poise: 0 }); FX.spark(t.pos.x, t.pos.y + 1, t.pos.z, 0.5, 6, [1, 0.55, 0.2]); }
      return t.burnT > 0;
    });
  },
  /* ---------- drops ---------- */
  // a foe put down by a robot may drop an item (bosses always, at least Rare)
  onFoeDown(a, src) {
    if (!src || !src.isRobot || a.team === 'civ' || a.isRobot || a.lootDone || MP.on || (Game.def && Game.def.training)) return; // solo only for now
    a.lootDone = true;
    const boss = !!(a.T && a.T.boss);
    if (!boss && Math.random() > 0.3) return;
    const it = this.roll({ luck: boss ? 0.2 : 0, rarity: boss ? Math.max(1, this.rollRarity(0.3)) : undefined });
    Pickups.add('loot', a.pos.x + R(-0.4, 0.4), a.pos.y, a.pos.z + R(-0.4, 0.4), { item: it, beam: it.rarity >= 1 });
  },
  collect(p, P) {
    const it = p.item; this.add(it);
    const Rr = RARITY[it.rarity]; HUD.toast(`<span style="color:${Rr.col}">${it.name}</span>`, `${Rr.name} · ${Object.keys(it.aff).map(k => AFFIX[k].fmt(it.aff[k])).join(' · ')}`, it.rarity >= 2 ? 'gold' : '', true);
    Snd.play(it.rarity >= 2 ? 'perfect' : 'pickup', P.pos, 0.7);
    if (!this.data().eq) this.equip(it.id); // the first weapon found goes straight into the hand
  },
  // a first, modest blade so the Equipment screen is never empty
  starter() { const g = this.data(); if (g.items.length || g.n) return; const it = this.roll({ base: 'sword', rarity: 0 }); it.aff = { dmg: 0.06 }; it.name = 'Épée rouillée'; g.items.push(it); g.eq = it.id; Save.write(); }
};

// the fantasy animation clips (10g_anim_fantasy.js) take over the Destin finishers and the fantasy weapons' combos
AnimFantasy.install({ daggers: 'dagger', scepter: 'sceptre' });
