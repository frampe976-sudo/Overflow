/* =====================================================================
   NATURE — base commune de la faune et de la flore du Débordement :
   géométries unitaires, rendu instancié, sacoche (ingrédients pour le futur craft),
   carnet du naturaliste (bestiaire, herbier, sacoche), sons, branchements au jeu.
   Tout le reste du jeu est laissé tel quel : ce module s'accroche à Render.init.
   ===================================================================== */

/* ---------- ingrédients (récoltés sur les plantes, prélevés sur les bêtes) ---------- */
const NITEMS = {
  // flore
  petale_lys: { name: 'Pétale de lys des marées', cat: 'flore', col: '#6fe6ff', use: 'Alchimie : philtres de mana, encres runiques.' },
  chapeau_lanterne: { name: 'Chapeau-lanterne', cat: 'flore', col: '#5dffc0', use: 'Alchimie : potion de nyctalopie. Cuisine : ragoût des enclaves.' },
  baie_sanguine: { name: 'Baie sanguine', cat: 'flore', col: '#ff4058', use: 'Se mange : rend 15 points de vie. Alchimie : potions de soin.', eat: 15 },
  mousse_ecume: { name: 'Mousse d’écume', cat: 'flore', col: '#7dd8c8', use: 'Pansements, onguents, mèches de torches.' },
  larme_argent: { name: 'Larme d’argent', cat: 'flore', col: '#e6f2ff', use: 'Ingrédient rare : élixirs, enchantements d’armes.', rare: true },
  fronde_spectrale: { name: 'Fronde spectrale', cat: 'flore', col: '#b59cff', use: 'Alchimie : poisons, philtre d’effacement.' },
  racine_coeur: { name: 'Racine-cœur', cat: 'flore', col: '#ff9a3c', use: 'Ingrédient rare : potions de vigueur, braise des forges runiques.', rare: true },
  fibre_roseau: { name: 'Fibre de roseau', cat: 'flore', col: '#e8e0a8', use: 'Cordes, empennage des flèches, paniers.' },
  essence_lumineuse: { name: 'Essence lumineuse', cat: 'flore', col: '#fff08a', use: 'Lanternes éternelles, enchantements de lumière.' },
  // faune
  bois_opale: { name: 'Bois d’opale', cat: 'faune', col: '#9fd8ff', use: 'Forge : gardes et pommeaux. Sceptres.', rare: true },
  cuir_opale: { name: 'Cuir d’opale', cat: 'faune', col: '#c9d4e0', use: 'Armures légères, fourreaux.' },
  patte_lievre: { name: 'Patte de lièvre-lune', cat: 'faune', col: '#e8ecff', use: 'Talisman de chance. Alchimie : potion de célérité.' },
  croc_brume: { name: 'Croc de brume', cat: 'faune', col: '#cfd8e6', use: 'Forge : pointes de flèches, dagues dentelées.' },
  fourrure_brume: { name: 'Fourrure de brume', cat: 'faune', col: '#7f8aa0', use: 'Capes, doublures d’armure.' },
  chitine: { name: 'Chitine abyssale', cat: 'faune', col: '#c0583e', use: 'Forge : plaques d’armure légères et dures.' },
  pince: { name: 'Pince de gouffre', cat: 'faune', col: '#e07a4f', use: 'Forge : masses et marteaux.', rare: true },
  essence_follette: { name: 'Essence follette', cat: 'faune', col: '#8ff0ff', use: 'Enchantements de foudre et de feu froid.' },
  soie: { name: 'Soie de tisseuse', cat: 'faune', col: '#d6c8ff', use: 'Cordes d’arc, tissus enchantés.' },
  venin: { name: 'Glande à venin', cat: 'faune', col: '#9cff6a', use: 'Alchimie : poisons à enduire sur les lames.' },
  coeur_corail: { name: 'Cœur de corail', cat: 'faune', col: '#ff8a7a', use: 'Relique : cœur d’une arme légendaire.', rare: true },
  plume_spectre: { name: 'Plume de corbeau-spectre', cat: 'faune', col: '#a6ffcf', use: 'Empennage, plumes d’écriture runique.' }
};

/* ---------- sauvegarde séparée (n'altère pas celle du jeu) ---------- */
const NSAVE_KEY = 'overflow-nature-v1';
const NSave = {
  d: null,
  load() {
    let d = null; try { const r = localStorage.getItem(NSAVE_KEY); if (r) d = JSON.parse(r); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    d.items = d.items || {}; d.seen = d.seen || {}; d.picked = d.picked || {}; d.kills = d.kills || {}; d.hint = !!d.hint;
    this.d = d; return d;
  },
  write() { this._dirty = true; },
  flush() { if (!this._dirty) return; this._dirty = false; try { localStorage.setItem(NSAVE_KEY, JSON.stringify(this.d)); } catch (e) { /* stockage indisponible */ } }
};
const Satchel = {
  count(id) { return NSave.d.items[id] || 0; },
  add(id, n = 1, pos) {
    const I = NITEMS[id]; if (!I || n <= 0) return;
    NSave.d.items[id] = (NSave.d.items[id] || 0) + n; NSave.write();
    if (pos && Save.data.options.dmgNums !== false) HUD.pop(pos.x, pos.y + 1.1, pos.z, '+' + n + ' ' + I.name, 'nat');
    else HUD.toast('+' + n + ' ' + I.name, 'Sacoche', I.rare ? 'gold' : 'tide', true);
  },
  take(id, n = 1) { if (this.count(id) < n) return false; NSave.d.items[id] -= n; if (!NSave.d.items[id]) delete NSave.d.items[id]; NSave.write(); return true; },
  total() { let n = 0; for (const k in NSave.d.items) n += NSave.d.items[k]; return n; }
};

/* ---------- géométries unitaires et rendu instancié ---------- */
const NG = {};
const NMAT = { flesh: [24, 0.3, 0.4], fur: [12, 0.1, 0.4], shell: [60, 0.7, 0.3, 0.12], plant: [16, 0.22, 0.5], bark: [10, 0.1, 0.4] };
const NR = {
  inst: {}, glowI: null, tint: 1, fade: 1, ready: false,
  _L: M4.create(), _T: M4.create(), _a: { x: 0, y: 0, z: 0 }, _b: { x: 0, y: 0, z: 0 },
  init() {
    NG.sph = sphereGeo(1, 12, 8); NG.cyl = cylGeo(1, 1, 1, 8, true); NG.tap = cylGeo(1, 0.55, 1, 8, true); NG.cone = cylGeo(1, 0.04, 1, 8, true); NG.box = boxGeo(1, 1, 1);
    for (const g of ['sph', 'cyl', 'tap', 'cone', 'box']) for (const m in NMAT) { const it = new Instanced(NG[g], 700); it.mat = NMAT[m]; this.inst[g + ':' + m] = it; Render.inst.push(it); }
    this.glowI = new Instanced(NG.sph, 900); Render.glowInst.push(this.glowI);
    this.ready = true;
  },
  begin() { for (const k in this.inst) this.inst[k].reset(); this.glowI.reset(); },
  I(geo, mat) { return this.inst[geo + ':' + mat]; },
  // pièce posée dans le repère B (local : position, rotation, échelle)
  part(geo, mat, B, x, y, z, rx, ry, rz, sx, sy, sz, c, e = 0) {
    M4.compose(this._L, x, y, z, rx, ry, rz, sx * this.fade, sy * this.fade, sz * this.fade);
    const k = this.tint; this.I(geo, mat).pushMul(B, this._L, c[0] * k, c[1] * k, c[2] * k, e);
  },
  // segment entre deux points locaux de B (membres, cous, queues)
  seg(geo, mat, B, a, b, r, c, e = 0) {
    const A = M4.transformPoint(B, a[0], a[1], a[2], this._a), Bq = M4.transformPoint(B, b[0], b[1], b[2], this._b);
    M4.segment(this._T, A.x, A.y, A.z, Bq.x, Bq.y, Bq.z, r * this.fade);
    const k = this.tint; this.I(geo, mat).push(this._T, c[0] * k, c[1] * k, c[2] * k, e);
  },
  // point lumineux (yeux, cœurs, feux follets) : non éclairé, il « brille » dans le bloom
  glow(B, x, y, z, s, c, e = 1) {
    M4.compose(this._L, x, y, z, 0, 0, 0, s, s, s);
    this.glowI.pushMul(B, this._L, c[0], c[1], c[2], e);
  },
  world(B, x, y, z, out) { return M4.transformPoint(B, x, y, z, out || { x: 0, y: 0, z: 0 }); }
};
// genou d'un membre à deux os (hanche H, pied F, longueurs l1 et l2, direction de flexion b), en coordonnées locales
function nIK(H, F, l1, l2, bx, by, bz, out) {
  let dx = F[0] - H[0], dy = F[1] - H[1], dz = F[2] - H[2]; let d = Math.hypot(dx, dy, dz) || 1e-4;
  const dm = Math.min(d, (l1 + l2) * 0.999); dx /= d; dy /= d; dz /= d;
  const a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const k = bx * dx + by * dy + bz * dz; let px = bx - dx * k, py = by - dy * k, pz = bz - dz * k; const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
  out[0] = H[0] + dx * a + px * h; out[1] = H[1] + dy * a + py * h; out[2] = H[2] + dz * a + pz * h;
  // le pied ne descend pas plus loin que la jambe ne le permet
  if (d > dm) { F[0] = H[0] + dx * dm; F[1] = H[1] + dy * dm; F[2] = H[2] + dz * dm; }
  return out;
}

/* ---------- géographie : où pousse quoi ---------- */
const NAT_ZONE = { park: 'wild', cem: 'wild', beach: 'shore', marina: 'shore', ferry: 'shore', yard: 'shore', docks: 'shore', univ: 'garden', hosp: 'garden', civic: 'garden', stad: 'garden', subs: 'garden' };
const Nature = {
  t: 0, discovered: [],
  // district (clé) sous un point
  district(x, z) {
    const i = RX.findIndex((r, k) => k < NI && x >= r && x < RX[k + 1]), j = RZ.findIndex((r, k) => k < NJ && z >= r && z < RZ[k + 1]);
    if (i < 0) return null;
    const jj = j >= 0 ? j : z >= RZ[NJ] ? NJ - 1 : -1; if (jj < 0) return null;
    if (i >= CI && i < CI + 5 && jj >= CJ && jj < CJ + 5) return CORE_D[jj - CJ][i - CI];
    return DLAYOUT[jj] ? DLAYOUT[jj][i] : null;
  },
  // milieu : 'wild' (parcs, cimetière, herbe), 'shore' (quais, plage), 'garden' (pelouses), 'urban'
  biome(x, z) {
    if (z > WATER_Z - 16) return 'shore';
    for (const m of World.mapAreas || []) if (x > m.x0 && x < m.x1 && z > m.z0 && z < m.z1) { if (m.c === '#0d2235' || m.c === '#3b3526') return 'shore'; if (m.c === '#16301f' || m.c === '#1c4428') return 'wild'; }
    return NAT_ZONE[this.district(x, z)] || 'urban';
  },
  _q: [],
  // sol libre au niveau de la rue (ni mur, ni toit, ni eau) sous un cercle de rayon r
  freeAt(x, z, r, roadOk) {
    if (!World.onLand(x, z) || z > WATER_Z - 1.2) return -1;
    const g = World.groundAt(x, z, r, 0.6); if (g < -0.4 || g > CURB + 0.06) return -1;
    if (!roadOk && Net.onRoad(x, z)) return -1;
    const q = World.query(x - r, z - r, x + r, z + r, this._q);
    for (const b of q) { if (b.y1 <= g + 0.05 || b.y0 >= g + 2.2 || b.kind === 'awning') continue; const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return -1; }
    return g;
  },
  /* ---------- découvertes (carnet) ---------- */
  discover(kind, id, name) {
    const key = kind + ':' + id; if (NSave.d.seen[key]) return; NSave.d.seen[key] = 1; NSave.write();
    HUD.toast('Nouvelle entrée · ' + (kind === 'faune' ? 'Bestiaire' : 'Herbier'), name + (NSave.d.hint ? '' : ' · B : carnet'), 'gold');
    NSnd.play('discover');
  },
  /* ---------- boucle ---------- */
  update(dt) {
    this.t += dt;
    Flora.update(dt); Fauna.update(dt);
    if ((this._saveT = (this._saveT || 0) - dt) <= 0) { this._saveT = 3; NSave.flush(); }
  },
  render() { NR.begin(); Flora.render(); Fauna.render(); },
  /* ---------- branchements au jeu (après la construction de la ville) ---------- */
  init() {
    NSave.load(); NR.init(); Flora.init(); Fauna.init(); Carnet.init(); this.hook();
    if (window.__OF) window.__OF.Nature = { Nature, Flora, Fauna, Satchel, Carnet, NSave, FLORA, FAUNA, NITEMS };
  },
  hook() {
    const G = Game;
    const upd = G.update; G.update = function (raw) { const r = upd.call(this, raw); if (this.mode === 'play' && this.player && this.def) Nature.update(this.dt); return r; };
    const mu = G.menuUpdate; G.menuUpdate = function (dt) { mu.call(this, dt); Nature.t += dt; Flora.update(dt); };
    const cw = G.clearWorld; G.clearWorld = function () { cw.call(this); Fauna.clear(); };
    const od = G.onDeath; G.onDeath = function (a, src, o) { if (a.creature) { Fauna.onDeath(a, src, o); return; } return od.call(this, a, src, o); };
    const ok = G.onKO; G.onKO = function (a, src, o) { if (a.creature) { Fauna.onDeath(a, src, o); return; } return ok.call(this, a, src, o); };
    const oh = G.onHit; G.onHit = function (t, src, dmg, o) { oh.call(this, t, src, dmg, o); if (t.creature) t.onHurt(src, dmg, o); };
    const begin = CharRender.begin; CharRender.begin = function () { begin.call(this); Nature.render(); };
    const draw = CharRender.draw; CharRender.draw = function (a) { if (a.creature) { a.draw(); return; } return draw.call(this, a); };
    const dr = HUD.drawRadar; HUD.drawRadar = function (P, M) { dr.call(this, P, M); Fauna.radar(this, P); };
    // cueillette : une plante ou un essaim à portée devient une interaction (touche d'action)
    const ic = Player.prototype.interactCandidate;
    Player.prototype.interactCandidate = function () {
      const c = ic.call(this); if (c && c.type !== 'zip' && c.type !== 'ladder') return c;
      if (this.state === 'move' && this.grounded) { const h = Flora.harvestCandidate(this.pos); if (h) return h; }
      return c;
    };
  }
};

/* ---------- sons des bêtes (synthèse, comme le reste du jeu) ---------- */
const NSnd = {
  play(name, pos, vol = 1) {
    if (!Snd.ok || !Snd.ctx || Snd.ctx.state !== 'running') return;
    const c = Snd.ctx, t = c.currentTime + 0.005, O = Snd.out(pos || null, vol), D = O.g; if (O.gain < 0.004) return;
    const p = 0.92 + Math.random() * 0.16, rv = Snd.revIn;
    switch (name) {
      case 'howl': { // hurlement : une glissade qui monte, tient et retombe
        Snd.tone(t, 'triangle', 290 * p, 560 * p, 0.55, 0.32, D, 0.2); Snd.tone(t + 0.5, 'triangle', 560 * p, 380 * p, 1.2, 0.3, D, 0.05);
        Snd.tone(t, 'sine', 580 * p, 1120 * p, 0.55, 0.08, D, 0.2); Snd.tone(t + 0.5, 'sine', 1120 * p, 760 * p, 1.2, 0.07, D, 0.05);
        Snd.tone(t + 0.1, 'triangle', 300 * p, 520 * p, 0.6, 0.2, rv, 0.2); Snd.tone(t + 0.6, 'triangle', 520 * p, 360 * p, 1.2, 0.2, rv, 0.05); break;
      }
      case 'growl': Snd.noise(t, 0.6, 'lowpass', 380 * p, 160, 3, 0.55, D, Snd.brownBuf); Snd.tone(t, 'sawtooth', 72 * p, 58, 0.55, 0.16, D, 0.06); break;
      case 'snarl': Snd.noise(t, 0.25, 'bandpass', 900 * p, 400, 2, 0.5, D); Snd.tone(t, 'sawtooth', 110 * p, 70, 0.22, 0.2, D); break;
      case 'yelp': Snd.tone(t, 'triangle', 900 * p, 1400 * p, 0.12, 0.25, D); Snd.tone(t + 0.1, 'triangle', 1300 * p, 600, 0.25, 0.2, D); break;
      case 'bugle': Snd.tone(t, 'sawtooth', 210 * p, 520 * p, 0.5, 0.1, D, 0.15); Snd.tone(t + 0.45, 'sine', 1040 * p, 900 * p, 0.6, 0.14, D, 0.05); Snd.tone(t + 0.45, 'sine', 1040 * p, 900 * p, 0.8, 0.1, rv, 0.05); break;
      case 'chirp': Snd.tone(t, 'sine', 2400 * p, 3200 * p, 0.06, 0.12, D); Snd.tone(t + 0.08, 'sine', 2800 * p, 2100 * p, 0.07, 0.1, D); break;
      case 'caw': Snd.noise(t, 0.22, 'bandpass', 1300 * p, 900, 4, 0.5, D); Snd.tone(t, 'sawtooth', 520 * p, 380, 0.2, 0.12, D); Snd.noise(t + 0.25, 0.18, 'bandpass', 1200 * p, 850, 4, 0.4, D); break;
      case 'flap': for (let i = 0; i < 4; i++) Snd.noise(t + i * 0.09, 0.07, 'bandpass', 700, 400, 1, 0.25, D); break;
      case 'chime': Snd.tone(t, 'sine', 1320 * p, 1320 * p, 0.7, 0.2, D, 0.01); Snd.tone(t + 0.06, 'sine', 1980 * p, 1980 * p, 0.6, 0.12, D, 0.01); Snd.tone(t, 'sine', 1320 * p, 1320 * p, 0.9, 0.12, rv, 0.01); break;
      case 'orb': Snd.tone(t, 'sine', 880 * p, 260, 0.45, 0.25, D); Snd.noise(t, 0.4, 'bandpass', 3000, 900, 3, 0.15, D); break;
      case 'orbhit': Snd.tone(t, 'sine', 600 * p, 120, 0.3, 0.35, D); Snd.noise(t, 0.2, 'highpass', 2500, 2500, 1, 0.3, D); break;
      case 'clack': Snd.noise(t, 0.04, 'bandpass', 2600 * p, 2200, 3, 0.6, D); Snd.noise(t + 0.09, 0.04, 'bandpass', 2300 * p, 2000, 3, 0.5, D); break;
      case 'hiss': Snd.noise(t, 0.45, 'highpass', 3800 * p, 6000, 1, 0.35, D); break;
      case 'rumble': Snd.noise(t, 1.2, 'lowpass', 220, 60, 1, 0.9, D, Snd.brownBuf); Snd.tone(t, 'sine', 48, 32, 1.0, 0.5, D, 0.2); break;
      case 'crack': Snd.noise(t, 0.12, 'highpass', 1800, 1200, 1, 0.5, D); Snd.tone(t, 'square', 140 * p, 60, 0.12, 0.2, D); break;
      case 'harvest': Snd.noise(t, 0.12, 'bandpass', 2400 * p, 1400, 1.5, 0.35, D); Snd.tone(t + 0.05, 'sine', 1568 * p, 1568 * p, 0.25, 0.12, D, 0.01); Snd.tone(t + 0.12, 'sine', 2093 * p, 2093 * p, 0.3, 0.1, D, 0.01); break;
      case 'discover': Snd.tone(t, 'sine', 784, 784, 0.4, 0.14, D, 0.01); Snd.tone(t + 0.12, 'sine', 1175, 1175, 0.5, 0.12, D, 0.01); Snd.tone(t + 0.24, 'sine', 1568, 1568, 0.7, 0.1, D, 0.01); Snd.tone(t + 0.24, 'sine', 1568, 1568, 0.9, 0.08, rv, 0.01); break;
      case 'dissolve': Snd.noise(t, 0.9, 'bandpass', 1800, 5000, 2, 0.18, D); Snd.tone(t, 'sine', 660 * p, 1320 * p, 0.8, 0.05, D, 0.2); break;
    }
  }
};

/* ---------- carnet du naturaliste : bestiaire, herbier, sacoche ---------- */
const Carnet = {
  open: false, tab: 'faune', sel: null, el: null,
  init() {
    const css = document.createElement('style');
    css.textContent = `
#nat-carnet { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(3,5,10,0.72); backdrop-filter: blur(3px); font-family: var(--f-ui); color: var(--text); }
#nat-carnet[hidden] { display: none; }
#nat-carnet .nc { width: min(980px, calc(100vw - 32px)); height: min(640px, calc(100vh - 32px)); display: flex; flex-direction: column; background: linear-gradient(180deg, rgba(14,18,24,0.97), rgba(8,10,16,0.97)); border: 1px solid var(--line-2); border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); overflow: hidden; }
#nat-carnet header { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
#nat-carnet h2 { margin: 0; font-family: var(--f-display); font-weight: 700; font-size: 26px; letter-spacing: 0.05em; text-transform: uppercase; color: #bfe9d6; flex: 1; }
#nat-carnet h2 small { font-family: var(--f-mono); font-size: 12px; color: var(--muted); letter-spacing: 0; margin-left: 10px; text-transform: none; }
#nat-carnet .tabs { display: flex; gap: 6px; padding: 10px 16px 0; }
#nat-carnet .tabs button, #nat-carnet .x, #nat-carnet .act { font-family: var(--f-display); font-weight: 700; font-size: 17px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 6px 6px 0 0; padding: 6px 14px; cursor: pointer; }
#nat-carnet .tabs button.on { color: #10140f; background: #9fe8c4; border-color: #9fe8c4; }
#nat-carnet .x { border-radius: 6px; padding: 4px 12px; }
#nat-carnet .body { flex: 1; display: grid; grid-template-columns: minmax(200px, 300px) 1fr; min-height: 0; border-top: 1px solid var(--line); }
#nat-carnet .list { overflow-y: auto; padding: 8px; border-right: 1px solid var(--line); }
#nat-carnet .row { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }
#nat-carnet .row:hover, #nat-carnet .row.on { background: rgba(159,232,196,0.1); }
#nat-carnet .row i { width: 12px; height: 12px; border-radius: 50%; flex: none; box-shadow: 0 0 8px currentColor; background: currentColor; }
#nat-carnet .row.unk { color: var(--dim); }
#nat-carnet .row b { margin-left: auto; font-family: var(--f-mono); font-size: 12px; color: var(--muted); font-weight: 400; }
#nat-carnet .det { overflow-y: auto; padding: 18px 22px; }
#nat-carnet .det h3 { margin: 0; font-family: var(--f-display); font-size: 30px; letter-spacing: 0.04em; text-transform: uppercase; }
#nat-carnet .det .lat { font-style: italic; color: var(--muted); margin: 2px 0 12px; }
#nat-carnet .det p { margin: 8px 0; line-height: 1.45; font-size: 16px; }
#nat-carnet .det .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
#nat-carnet .det .tags span { font-family: var(--f-mono); font-size: 12px; padding: 3px 8px; border: 1px solid var(--line-2); border-radius: 20px; color: var(--sodium-2); }
#nat-carnet .det .tags span.bad { color: #ff8a95; } #nat-carnet .det .tags span.ok { color: #9fe8c4; }
#nat-carnet .det dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 12px 0; font-size: 15px; }
#nat-carnet .det dt { color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; padding-top: 2px; }
#nat-carnet .det dd { margin: 0; }
#nat-carnet .det .lore { border-left: 3px solid #9fe8c4; padding-left: 12px; color: #cfd6e4; font-style: italic; }
#nat-carnet .act { border-radius: 6px; color: #10140f; background: #9fe8c4; border-color: #9fe8c4; margin-top: 8px; }
#nat-carnet .empty { color: var(--muted); padding: 20px; }
#nat-carnet footer { padding: 8px 16px; border-top: 1px solid var(--line); font-family: var(--f-mono); font-size: 12px; color: var(--muted); }
#nat-btn { position: absolute; right: 0; top: calc(var(--radar) + 70px); font-family: var(--f-display); font-weight: 700; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: #bfe9d6; background: var(--panel); border: 1px solid rgba(159,232,196,0.4); border-radius: 6px; padding: 5px 10px; pointer-events: auto; cursor: pointer; }
.pop.nat { color: #9fe8c4; font-size: 15px; }
@media (max-width: 640px) { #nat-carnet .body { grid-template-columns: 1fr; grid-template-rows: 40% 60%; } #nat-carnet .list { border-right: 0; border-bottom: 1px solid var(--line); } }
`;
    document.head.appendChild(css);
    const el = this.el = document.createElement('div'); el.id = 'nat-carnet'; el.hidden = true;
    el.innerHTML = `<div class="nc" role="dialog" aria-label="Carnet du naturaliste"><header><h2>Carnet du naturaliste<small id="nc-prog"></small></h2><button class="x" id="nc-x">Fermer</button></header>
<div class="tabs"><button data-t="faune">Bestiaire</button><button data-t="flore">Herbier</button><button data-t="sac">Sacoche</button></div>
<div class="body"><div class="list" id="nc-list"></div><div class="det" id="nc-det"></div></div><footer>B ou Échap : fermer · Les ingrédients serviront à l’alchimie et à la forge.</footer></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-t]'); if (t) { this.tab = t.dataset.t; this.sel = null; this.draw(); return; }
      const r = e.target.closest('[data-k]'); if (r) { this.sel = r.dataset.k; this.draw(); return; }
      if (e.target.id === 'nc-x' || e.target === el) this.toggle(false);
      const a = e.target.closest('[data-eat]'); if (a) this.eat(a.dataset.eat);
    });
    window.addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyB' && !e.repeat && (Game.mode === 'play' || this.open)) { this.toggle(!this.open); e.preventDefault(); }
      else if (this.open && (e.code === 'Escape' || e.code === 'Backspace')) { this.toggle(false); e.preventDefault(); }
    }, true);
    const tr = document.querySelector('#hud .hud-tr');
    if (tr) { const b = document.createElement('button'); b.id = 'nat-btn'; b.textContent = 'Carnet'; b.addEventListener('click', e => { e.stopPropagation(); this.toggle(true); }); tr.appendChild(b); }
  },
  toggle(on) {
    if (on === this.open) return;
    if (on && Game.mode !== 'play') return;
    this.open = on; this.el.hidden = !on;
    if (on) { this.prevMode = Game.mode; Game.mode = 'carnet'; Input.releaseLock(); NSave.d.hint = true; NSave.write(); Snd.play('ui'); this.draw(); }
    else { Game.mode = 'play'; Game.last = performance.now(); Input.keys = {}; if (Input.device === 'kbm') Input.requestLock(); Snd.play('back'); NSave.flush(); }
  },
  eat(id) {
    const I = NITEMS[id], P = Game.player; if (!I || !I.eat || !P || !Satchel.take(id, 1)) return;
    P.hp = Math.min(P.maxHp, P.hp + I.eat); Snd.play('repair'); this.draw();
  },
  progress() {
    let n = 0, k = 0; for (const t in FAUNA) { k++; if (NSave.d.seen['faune:' + t]) n++; } for (const s in FLORA) { k++; if (NSave.d.seen['flore:' + s]) n++; }
    return n + ' / ' + k + ' entrées';
  },
  draw() {
    const L = $('nc-list'), D = $('nc-det'); $('nc-prog').textContent = this.progress();
    for (const b of this.el.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.t === this.tab);
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let rows = '';
    if (this.tab === 'sac') {
      const ids = Object.keys(NSave.d.items).filter(k => NITEMS[k]);
      if (!ids.length) { L.innerHTML = '<div class="empty">La sacoche est vide. Approchez-vous d’une plante qui luit, ou abattez une bête.</div>'; D.innerHTML = ''; return; }
      if (!this.sel || !NITEMS[this.sel] || !Satchel.count(this.sel)) this.sel = ids[0];
      for (const k of ids) rows += `<div class="row${k === this.sel ? ' on' : ''}" data-k="${k}" style="color:${NITEMS[k].col}"><i></i><span style="color:var(--text)">${esc(NITEMS[k].name)}</span><b>×${Satchel.count(k)}</b></div>`;
      L.innerHTML = rows;
      const I = NITEMS[this.sel];
      D.innerHTML = `<h3 style="color:${I.col}">${esc(I.name)}</h3><div class="lat">${I.cat === 'flore' ? 'Ingrédient végétal' : 'Prélevé sur une bête'}${I.rare ? ' · rare' : ''}</div><p>${esc(I.use)}</p><dl><dt>Quantité</dt><dd>${Satchel.count(this.sel)}</dd></dl>` + (I.eat ? `<button class="act" data-eat="${this.sel}">Manger (+${I.eat} PV)</button>` : '');
      return;
    }
    const DB = this.tab === 'faune' ? FAUNA : FLORA, keys = Object.keys(DB);
    if (!this.sel || !DB[this.sel]) this.sel = keys.find(k => NSave.d.seen[this.tab + ':' + k]) || keys[0];
    for (const k of keys) {
      const known = !!NSave.d.seen[this.tab + ':' + k], E = DB[k];
      const n = this.tab === 'faune' ? NSave.d.kills[k] || 0 : 0;
      rows += `<div class="row${known ? '' : ' unk'}${k === this.sel ? ' on' : ''}" data-k="${k}" style="color:${known ? E.css : '#3a4050'}"><i></i><span style="color:${known ? 'var(--text)' : 'var(--dim)'}">${known ? esc(E.name) : '???'}</span>${n ? `<b>${n} abattu${n > 1 ? 's' : ''}</b>` : E.hostile ? '<b>hostile</b>' : ''}</div>`;
    }
    L.innerHTML = rows;
    const E = DB[this.sel], known = !!NSave.d.seen[this.tab + ':' + this.sel], C = E.codex;
    if (!known) { D.innerHTML = `<h3 style="color:var(--dim)">Entrée inconnue</h3><p class="lat">${this.tab === 'faune' ? 'Aucune bête de cette espèce n’a encore croisé votre route.' : 'Cette plante n’a pas encore été observée.'}</p><p>Indice : ${esc(C.hint)}</p>`; return; }
    const drops = (E.drops || (E.item ? [[E.item]] : [])).map(d => NITEMS[d[0]] ? `<span>${esc(NITEMS[d[0]].name)}</span>` : '').join('');
    const tags = this.tab === 'faune' ? `<span class="${E.hostile ? 'bad' : 'ok'}">${E.hostile ? 'Hostile' : 'Paisible'}</span><span>Menace : ${C.danger}</span>` : `<span>${E.rare ? 'Rare' : 'Commune'}</span>${E.glowTxt ? `<span class="ok">${E.glowTxt}</span>` : ''}`;
    D.innerHTML = `<h3 style="color:${E.css}">${esc(E.name)}</h3><div class="lat">${esc(C.latin)}</div><div class="tags">${tags}</div>
<dl><dt>Milieu</dt><dd>${esc(C.habitat)}</dd><dt>${this.tab === 'faune' ? 'Comportement' : 'Aspect'}</dt><dd>${esc(C.behave)}</dd>${C.tip ? `<dt>Conseil</dt><dd>${esc(C.tip)}</dd>` : ''}<dt>${this.tab === 'faune' ? 'Dépouilles' : 'Récolte'}</dt><dd><div class="tags" style="margin:0">${drops || '—'}</div></dd></dl>
<p class="lore">${esc(C.lore)}</p>`;
  }
};

/* ---------- démarrage : après la construction de la ville et du rendu ---------- */
{
  const ri = Render.init;
  Render.init = function () { ri.call(this); try { Nature.init(); } catch (e) { console.error('Nature', e); } };
}
