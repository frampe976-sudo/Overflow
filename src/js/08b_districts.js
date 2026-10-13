/* =====================================================================
   DISTRICTS — the city around the original core (15 × 9 blocks)
   ===================================================================== */
// one word per block, west → east; rows north → south. "C" = the original city (unchanged)
const DLAYOUT = [
  'zi zi zi oil oil rail rail gare gare power power power mall mall mall',
  'zi zi zi oil oil rail rail gare gare power power power mall mall mall',
  'tenem tenem tenem fire park park park civic civic fin fin fin neon neon neon',
  'tenem tenem tenem fire park park park civic civic fin fin fin neon neon neon',
  'cem cem hlm hlm hlm C C C C C lant lant stad stad stad',
  'cem cem hlm hlm hlm C C C C C lant lant stad stad stad',
  'subs subs subs flea flea C C C C C hosp hosp univ univ univ',
  'subs subs subs flea flea C C C C C hosp hosp univ univ univ',
  'marina marina yard yard yard C C C C C ferry ferry beach beach beach'
].map(r => r.split(' '));
const CORE_D = [
  ['resid', 'resid', 'police', 'resid', 'resid'],
  ['old', 'old', 'down', 'down', 'resid'],
  ['market', 'old2', 'plaza', 'down', 'indus'],
  ['old', 'old', 'down', 'indus', 'indus'],
  ['docks', 'docks', 'docks', 'docks', 'docks']
];
const CORE_AREA = { resid: 'Hauts de Saline', police: 'Commissariat central', old: 'Vieille ville', old2: 'Vieille ville', market: 'Marché de nuit', plaza: 'Place de la Marée', down: 'Centre', indus: 'Les Entrepôts', docks: 'Les Docks' };
// merged districts have no inner roads
const DINFO = {
  zi: { name: 'Zone industrielle' }, oil: { name: 'Dépôt pétrolier', merged: 1 }, rail: { name: 'Gare de triage', merged: 1 }, gare: { name: 'Gare centrale', merged: 1 },
  power: { name: 'Centrale électrique', merged: 1 }, mall: { name: 'Les Arcades', merged: 1 }, tenem: { name: 'Faubourg des Forges' }, fire: { name: 'Caserne des pompiers' },
  park: { name: 'Parc municipal', merged: 1 }, civic: { name: 'Hôtel de ville', merged: 1 }, fin: { name: 'Cité financière' }, neon: { name: 'Boulevard des Néons' },
  cem: { name: 'Cimetière de l’Ouest', merged: 1 }, hlm: { name: 'Cité des Tilleuls' }, lant: { name: 'Quartier des Lanternes' }, stad: { name: 'Stade de la Marée', merged: 1 },
  subs: { name: 'Les Glycines' }, flea: { name: 'Marché aux puces', merged: 1 }, hosp: { name: 'Hôpital Saint-Roch', merged: 1 }, univ: { name: 'Université', merged: 1 },
  marina: { name: 'Port de plaisance', merged: 1 }, yard: { name: 'Chantier naval', merged: 1 }, ferry: { name: 'Gare maritime', merged: 1 }, beach: { name: 'Plage des Sables', merged: 1 }
};
const rectOf = (i0, j0, i1, j1) => { const bx0 = RX[i0] + RHW, bx1 = RX[i1 + 1] - RHW, bz0 = RZ[j0] + RHW, bz1 = RZ[j1 + 1] - RHW; return { bx0, bx1, bz0, bz1, lx0: bx0 + SIDEW, lx1: bx1 - SIDEW, lz0: bz0 + SIDEW, lz1: bz1 - SIDEW, cx: (bx0 + bx1) / 2, cz: (bz0 + bz1) / 2, w: bx1 - bx0, d: bz1 - bz0 }; };

// colours of the special grounds on the map
const MAP_GROUND = new Map([[GCELL.grass, '#16301f'], [GCELL.pitch, '#1c4428'], [GCELL.sand, '#3b3526'], [GCELL.pond, '#0d2235'], [GCELL.tracks, '#2b2724'], [GCELL.court, '#2a3550'], [GCELL.runtrack, '#4a2a22'], [GCELL.deck, '#3a322a'], [GCELL.gravel, '#2a2926']]);
const Districts = {
  groups: {}, list: [], blocks: {},
  assign() {
    this.groups = {}; this.list = []; this.blocks = {};
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
      const code = DLAYOUT[j][i], K = World.blocks[i][j];
      if (code === 'C') { K.d = CORE_D[j - CJ][i - CI]; K.core = true; K.area = K.d === 'docks' && K.ci === 3 ? 'La Criée' : CORE_AREA[K.d]; }
      else { K.d = code; K.area = DINFO[code].name; if (DINFO[code].merged) K.grp = code; }
      (this.blocks[K.core ? 'core:' + K.area : code] = this.blocks[K.core ? 'core:' + K.area : code] || []).push(K);
    }
    for (const code in DINFO) {
      const Ks = this.blocks[code]; if (!Ks) continue;
      const i0 = Math.min(...Ks.map(k => k.i)), i1 = Math.max(...Ks.map(k => k.i)), j0 = Math.min(...Ks.map(k => k.j)), j1 = Math.max(...Ks.map(k => k.j));
      const rect = rectOf(i0, j0, i1, j1);
      if (DINFO[code].merged) this.groups[code] = { code, i0, i1, j0, j1, rect };
      this.list.push({ code, name: DINFO[code].name, x: rect.cx, z: j1 === NJ - 1 && ['marina', 'yard', 'ferry', 'beach'].includes(code) ? rect.cz + 30 : rect.cz, rect, i0, i1, j0, j1 });
    }
  },
  generate(C) {
    this.C = C; World.parkSpots = World.parkSpots || []; World.mapAreas = World.mapAreas || [];
    const order = ['zi', 'oil', 'rail', 'gare', 'power', 'mall', 'tenem', 'fire', 'park', 'civic', 'fin', 'neon', 'cem', 'hlm', 'lant', 'stad', 'subs', 'flea', 'hosp', 'univ', 'marina', 'yard', 'ferry', 'beach'];
    // sidewalk along the quay road beyond the original docks
    C.slab(RX[0] - RHW, 141, -260, 144, GCELL.pavers); C.slab(260, 141, RX[NI] + RHW, 144, GCELL.pavers);
    for (const code of order) {
      const g = this.groups[code], Ks = this.blocks[code];
      const fn = this['g_' + code]; if (!fn) continue;
      if (g) { C.slab(g.rect.bx0, g.rect.bz0, g.rect.bx1, g.rect.bz1, GCELL.pavers); fn.call(this, C, g.rect, Ks); }
      else for (const K of Ks) { C.slab(K.bx0, K.bz0, K.bx1, K.bz1, GCELL.pavers); C.streetFurniture(K); fn.call(this, C, K); C.addLadders(K); }
    }
  },
  /* ---------- construction helpers ---------- */
  // flat ground layer (grass, sand, tiles…) on top of a slab
  ground(x0, z0, x1, z1, cell, su = 6, y = CURB + 0.012, col = [1, 1, 1, 0]) {
    const g = this.C.B.ground, W = x1 - x0, D = z1 - z0;
    const mk = MAP_GROUND.get(cell); if (mk && W * D > 30) World.mapAreas.push({ x0, z0, x1, z1, c: mk });
    g.quad(x0, y, z1, W, 0, 0, 0, 0, -D, [x0 / su, -z1 / su, x1 / su, -z0 / su], cell, col);
  },
  // ground strip whose texture runs along its length (tracks, lanes)
  strip(x0, z0, x1, z1, cell, along, su, y = CURB + 0.014) {
    const g = this.C.B.ground, W = x1 - x0, D = z1 - z0;
    const mk = MAP_GROUND.get(cell); if (mk && W * D > 30) World.mapAreas.push({ x0, z0, x1, z1, c: mk });
    if (along === 'z') g.quad(x0, y, z1, W, 0, 0, 0, 0, -D, [0, 0, 1, D / su], cell, [1, 1, 1, 0]);
    else g.quad(x0, y, z1, W, 0, 0, 0, 0, -D, [0, 0, W / su, 1], cell, [1, 1, 1, 0]);
  },
  // cylinder with a texture cell wrapped around it
  cyl(x, y, z, r0, r1, h, segs, cell, col, su = 6, sv = 6, caps = true) {
    const geo = cylGeo(r0, r1, h, segs, caps), circ = TAU * Math.max(r0, r1);
    for (let k = 0; k < geo.uv.length; k += 4) { geo.uv[k] *= circ / su; geo.uv[k + 1] = geo.uv[k + 1] / sv; geo.uv[k + 2] = cell[0]; geo.uv[k + 3] = cell[1]; }
    this.C.B.atlas.addGeo(geo, M4.compose(M4.create(), x, y, z, 0, 0, 0), col);
  },
  wall(x0, z0, x1, z1, h, col, cell, kind = 'wall') {
    this.C.B.atlas.box(x0, 0, z0, x1, h, z1, { faces: 'xXzZY', cell: cell || CELL.rough, su: 3, sv: 3, col });
    World.addBox(x0, 0, z0, x1, h, z1, kind);
  },
  hedge(x0, z0, x1, z1, h = 1.1) {
    const A = this.C.B.atlas; A.box(x0, CURB, z0, x1, CURB + h, z1, { faces: 'xXzZY', cell: CELL.rough, su: 1.5, sv: 1.5, col: [0.18, 0.3, 0.15, 0] });
    World.addBox(x0, 0, z0, x1, CURB + h, z1, 'prop');
  },
  // gabled roof over a rectangle; ridge along x or z
  gable(x0, z0, x1, z1, y, rise, along, col, overhang = 0.35) {
    const A = this.C.B.atlas; x0 -= overhang; z0 -= overhang; x1 += overhang; z1 += overhang;
    const c = col || [0.85, 0.85, 0.85, 0], cell = CELL.tiles;
    if (along === 'x') { const zm = (z0 + z1) / 2, W = x1 - x0, hd = zm - z0, sl = Math.hypot(hd, rise);
      A.quad(x0, y, z0, W, 0, 0, 0, rise, hd, [x0 / 4, 0, x1 / 4, sl / 4], cell, c); // north slope (normal up/-z)
      A.quad(x1, y, z1, -W, 0, 0, 0, rise, -hd, [x0 / 4, 0, x1 / 4, sl / 4], cell, c);
      const gc = [0.8, 0.78, 0.74, 0]; this.tri(x0 + overhang, y, z0 + overhang, x0 + overhang, y, z1 - overhang, x0 + overhang, y + rise, zm, gc); this.tri(x1 - overhang, y, z1 - overhang, x1 - overhang, y, z0 + overhang, x1 - overhang, y + rise, zm, gc);
    } else { const xm = (x0 + x1) / 2, D = z1 - z0, hd = xm - x0, sl = Math.hypot(hd, rise);
      A.quad(x1, y, z0, 0, 0, D, -hd, rise, 0, [z0 / 4, 0, z1 / 4, sl / 4], cell, c);
      A.quad(x0, y, z1, 0, 0, -D, hd, rise, 0, [z0 / 4, 0, z1 / 4, sl / 4], cell, c);
      const gc = [0.8, 0.78, 0.74, 0]; this.tri(x1 - overhang, y, z0 + overhang, x0 + overhang, y, z0 + overhang, xm, y + rise, z0 + overhang, gc); this.tri(x0 + overhang, y, z1 - overhang, x1 - overhang, y, z1 - overhang, xm, y + rise, z1 - overhang, gc);
    }
  },
  tri(ax, ay, az, bx, by, bz, cx, cy, cz, col) {
    const A = this.C.B.atlas; const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i0 = A.vert(ax, ay, az, nx, ny, nz, 0, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
    A.vert(bx, by, bz, nx, ny, nz, 1, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
    A.vert(cx, cy, cz, nx, ny, nz, 0.5, 1, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
    A.i.push(i0, i0 + 1, i0 + 2);
  },
  // two-storey suburban house with a gabled roof, porch light and garden
  house(x0, z0, x1, z1, front, floors = 2) {
    const C = this.C, A = C.B.atlas, h = floors * 3.2 + 0.4;
    const pal = [[0.94, 0.92, 0.86], [0.86, 0.9, 0.94], [0.95, 0.88, 0.74], [0.82, 0.88, 0.8], [0.93, 0.82, 0.8], [0.8, 0.8, 0.82]];
    const c = G.pick(pal);
    A.box(x0, CURB, z0, x1, h, z1, { faces: 'xXzZ', cell: CELL.house, su: 24, sv: 25.6, uvBase: CURB, ou: G.i(0, 3) / 4, col: [c[0], c[1], c[2], 0] });
    World.addBox(x0, 0, z0, x1, h, z1, 'bld');
    const info = { x0, z0, x1, z1, h, style: 'house', box: null, streets: '', ladders: [], reserved: [[0, 0, 0]] };
    const along = (x1 - x0) >= (z1 - z0) ? 'x' : 'z'; const rise = Math.min(x1 - x0, z1 - z0) * 0.38;
    this.gable(x0, z0, x1, z1, h, rise, along, [0.62 + G.r(-0.1, 0.1), 0.34, 0.26, 0]);
    World.addBox(x0, h, z0, x1, h + rise * 0.6, z1, 'prop', { nowalk: true });
    // porch light on the front side
    const [px, pz, nx, nz] = C.facePoint(info, front, 0.3);
    C.B.glow.cbox(px + nx * 0.08 - 0.1, 2.3, pz + nz * 0.08 - 0.1, px + nx * 0.08 + 0.1, 2.5, pz + nz * 0.08 + 0.1, [1, 0.78, 0.45, 2]);
    World.lightsStatic.push({ x: px + nx * 1.2, y: 2.4, z: pz + nz * 1.2, r: 1.2, g: 0.85, b: 0.5, range: 7 });
    C.pool(px + nx * 1.5, pz + nz * 1.5, 2.6, [0.4, 0.28, 0.14], CURB + 0.03);
    return info;
  },
  // static parked-car spot (real cars are spawned there when the player is near)
  park(x, z, yaw) { World.parkSpots.push({ x, z, yaw }); },
  // curbside parking along the block edges (away from the crossings)
  curbParking(K, prob = 0.5) {
    const off = RHW - PARK; // distance from the curb edge toward the road centre
    for (const [ax, az, bx, bz, nx, nz] of [[K.bx0, K.bz0, K.bx1, K.bz0, 0, -1], [K.bx0, K.bz1, K.bx1, K.bz1, 0, 1], [K.bx0, K.bz0, K.bx0, K.bz1, -1, 0], [K.bx1, K.bz0, K.bx1, K.bz1, 1, 0]]) {
      const L = Math.hypot(bx - ax, bz - az); for (let t = 9; t < L - 9; t += 6.5) { if (!G.chance(prob)) continue; const x = lerp(ax, bx, t / L) + nx * off, z = lerp(az, bz, t / L) + nz * off; if (!Net.onRoad(x, z)) continue; this.park(x, z, nx !== 0 ? (G.chance(0.5) ? 0 : Math.PI) : (G.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)); }
    }
  },
  // painted parking lot with bays; registers the bays as parking spots
  lot(x0, z0, x1, z1, fill = 0.55) {
    this.ground(x0, z0, x1, z1, GCELL.parking, 10);
    for (let x = x0 + 1.25; x < x1 - 1; x += 2.5) for (const z of [z0 + 2.3, z1 - 2.3]) if (z1 - z0 > 5 && G.chance(fill)) this.park(x, z, z < (z0 + z1) / 2 ? Math.PI : 0);
    for (let z = z0 + 10; z < z1 - 8; z += 10) for (let x = x0 + 1.25; x < x1 - 1; x += 2.5) if (G.chance(fill * 0.6)) this.park(x, z + (G.chance(0.5) ? 2.3 : 7.7), G.chance(0.5) ? 0 : Math.PI);
    for (let x = x0 + 8; x < x1 - 4; x += 22) for (let z = z0 + 8; z < z1 - 4; z += 22) this.C.lampPost(x, z, 7, [1.1, 0.85, 0.55]);
  },
  tree(x, z, s = 1, dark) {
    const A = this.C.B.atlas; const h = 2.4 * s; A.tube(x, CURB, z, x, CURB + h, z, 0.16 * s, [0.22, 0.16, 0.12, 0], 6);
    const c = dark ? [0.06, 0.12, 0.08, 0] : [0.1 + G.r(-0.02, 0.03), 0.2 + G.r(-0.03, 0.04), 0.12, 0];
    A.addGeo(sphereGeo(1.8 * s, 8, 6, 0.85), M4.compose(M4.create(), x, CURB + h + 1.1 * s, z, 0, G.r(0, 3), 0), c);
    A.addGeo(sphereGeo(1.2 * s, 7, 5), M4.compose(M4.create(), x + 0.6 * s, CURB + h + 2.0 * s, z - 0.3 * s, 0, 0, 0), [c[0] * 1.15, c[1] * 1.15, c[2] * 1.1, 0]);
    World.addBox(x - 0.22 * s, 0, z - 0.22 * s, x + 0.22 * s, CURB + h, z + 0.22 * s, 'prop');
  },
  cypress(x, z, h = 7) {
    const A = this.C.B.atlas; A.tube(x, CURB, z, x, CURB + 1, z, 0.14, [0.2, 0.15, 0.1, 0], 5);
    A.addGeo(cylGeo(0.9, 0.08, h, 8, true), M4.compose(M4.create(), x, CURB + 0.6, z, 0, 0, 0), [0.05, 0.12, 0.07, 0]);
    World.addBox(x - 0.3, 0, z - 0.3, x + 0.3, CURB + h * 0.8, z + 0.3, 'prop');
  },
  palm(x, z, h = 7) {
    const A = this.C.B.atlas; const lean = G.r(-0.6, 0.6), lz = G.r(-0.6, 0.6);
    A.tube(x, CURB, z, x + lean, CURB + h, z + lz, 0.2, [0.4, 0.32, 0.22, 0], 6);
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; const L = 2.6; A.tube(x + lean, CURB + h, z + lz, x + lean + Math.sin(a) * L, CURB + h - 0.9, z + lz + Math.cos(a) * L, 0.12, [0.16, 0.34, 0.14, 0], 3); }
    World.addBox(x - 0.25, 0, z - 0.25, x + 0.25, CURB + h, z + 0.25, 'prop');
  },
  bench(x, z, along) { const A = this.C.B.atlas, hw = 0.9, hd = 0.25; const x0 = along ? x - hw : x - hd, x1 = along ? x + hw : x + hd, z0 = along ? z - hd : z - hw, z1 = along ? z + hd : z + hw; A.cbox(x0, CURB + 0.4, z0, x1, CURB + 0.48, z1, [0.35, 0.25, 0.16, 0], 'xXzZY'); A.cbox(x0 + 0.05, CURB, z0 + 0.05, x1 - 0.05, CURB + 0.4, z1 - 0.05, [0.15, 0.15, 0.15, 0], 'xXzZ'); World.addBox(x0, 0, z0, x1, CURB + 0.48, z1, 'prop'); },
  // string of glowing bulbs / lanterns between two points (sagging)
  bulbs(ax, ay, az, bx, by, bz, n, col, size = 0.08, sag = 1) {
    const Gl = this.C.B.glow; const A = this.C.B.atlas;
    A.tube(ax, ay, az, (ax + bx) / 2, (ay + by) / 2 - sag, (az + bz) / 2, 0.012, [0.1, 0.1, 0.1, 0], 3); A.tube((ax + bx) / 2, (ay + by) / 2 - sag, (az + bz) / 2, bx, by, bz, 0.012, [0.1, 0.1, 0.1, 0], 3);
    for (let k = 1; k < n; k++) { const t = k / n, x = lerp(ax, bx, t), z = lerp(az, bz, t), y = lerp(ay, by, t) - Math.sin(t * Math.PI) * sag; const c = typeof col === 'function' ? col(k) : col; Gl.cbox(x - size, y - size * 1.4, z - size, x + size, y + size * 1.4, z + size, [c[0], c[1], c[2], 2.5]); }
  },
  // steel lattice mast with a light head
  mast(x, z, h, col = [1.2, 1.1, 0.95], range = 30, heads = 1) {
    const A = this.C.B.atlas; A.tube(x, 0, z, x, h, z, 0.28, [0.35, 0.36, 0.38, 0], 6);
    for (let k = 0; k < heads; k++) { const o = (k - (heads - 1) / 2) * 1.4; A.cbox(x + o - 0.6, h, z - 0.5, x + o + 0.6, h + 0.6, z + 0.5, [0.2, 0.2, 0.22, 0]); this.C.B.glow.cbox(x + o - 0.5, h - 0.06, z - 0.4, x + o + 0.5, h, z + 0.4, [col[0], col[1], col[2], 3]); }
    World.lightsStatic.push({ x, y: h - 1, z, r: col[0] * 2.6, g: col[1] * 2.6, b: col[2] * 2.6, range });
    this.C.pool(x, z, Math.min(18, h * 0.8), [col[0] * 0.3, col[1] * 0.26, col[2] * 0.2]);
    World.addBox(x - 0.35, 0, z - 0.35, x + 0.35, h, z + 0.35, 'pole', { noray: true });
  },
  // freight wagon / carriage on a track
  wagon(x, z, along, len, kind, col) {
    const A = this.C.B.atlas, hw = 1.45; const x0 = along === 'x' ? x - len / 2 : x - hw, x1 = along === 'x' ? x + len / 2 : x + hw, z0 = along === 'x' ? z - hw : z - len / 2, z1 = along === 'x' ? z + hw : z + len / 2;
    const y0 = 1.05; const c = col || G.pick([[0.45, 0.22, 0.16], [0.2, 0.3, 0.4], [0.35, 0.35, 0.33], [0.5, 0.42, 0.2]]);
    if (kind === 'tank') { this.cylX(x, y0 + 1.5, z, 1.45, len - 0.8, along, [0.2, 0.2, 0.22, 0]); A.cbox(x0 + 0.2, y0 - 0.1, z0 + 0.4, x1 - 0.2, y0 + 0.3, z1 - 0.4, [0.12, 0.12, 0.13, 0]); }
    else if (kind === 'flat') { A.cbox(x0, y0, z0, x1, y0 + 0.35, z1, [0.2, 0.2, 0.2, 0]); if (G.chance(0.8)) this.C.container(x, y0 + 0.35, z, along === 'x' ? Math.PI / 2 : 0, G.pick(PAL.container)); }
    else if (kind === 'coach') { A.box(x0, y0, z0, x1, y0 + 3.0, z1, { faces: 'xXzZY', cell: CELL.office, su: 24, sv: 25.6, uvBase: y0 - 0.9, col: [0.85, 0.85, 0.9, 0.2] }); A.cbox(x0, y0 + 3.0, z0, x1, y0 + 3.25, z1, c === col ? [0.3, 0.32, 0.36, 0] : [0.25, 0.27, 0.3, 0]); A.cbox(x0 - 0.01, y0 + 0.2, z0 - 0.01, x1 + 0.01, y0 + 0.6, z1 + 0.01, [c[0], c[1], c[2], 0], 'xXzZ'); }
    else { A.box(x0, y0, z0, x1, y0 + 2.8, z1, { faces: 'xXzZY', cell: CELL.corrugated, su: 4, sv: 3, col: [c[0], c[1], c[2], 0] }); }
    for (const t of [-0.35, 0.35]) { const wx = along === 'x' ? x + t * len : x, wz = along === 'x' ? z : z + t * len; A.cbox(wx - (along === 'x' ? 1.2 : 1.35), 0.2, wz - (along === 'x' ? 1.35 : 1.2), wx + (along === 'x' ? 1.2 : 1.35), y0, wz + (along === 'x' ? 1.35 : 1.2), [0.1, 0.1, 0.11, 0]); }
    World.addBox(x0, 0, z0, x1, kind === 'flat' ? y0 + 0.35 : y0 + 3, z1, 'cont');
  },
  cylX(x, y, z, r, len, along, col) { // horizontal cylinder
    const geo = cylGeo(r, r, len, 12, true); const m = along === 'x' ? M4.compose(M4.create(), x - len / 2, y, z, 0, 0, -Math.PI / 2) : M4.compose(M4.create(), x, y, z - len / 2, Math.PI / 2, 0, 0);
    this.C.B.atlas.addGeo(geo, m, col);
  },
  // glazed front with a lit lobby behind it (soft warm glow + dark mullions), facing +z at plane z
  lobbyZ(x0, x1, y0, y1, z, col = [0.62, 0.5, 0.34]) {
    const A = this.C.B.atlas, Gl = this.C.B.glow, m = [0.07, 0.075, 0.085, 0];
    Gl.cbox(x0, y0, z, x1, y1, z + 0.02, [col[0], col[1], col[2], -0.35], 'Z');
    const nx = Math.max(1, Math.round((x1 - x0) / 2.2)), ny = Math.max(1, Math.round((y1 - y0) / 3));
    for (let k = 0; k <= nx; k++) { const x = x0 + (x1 - x0) * k / nx; A.cbox(x - 0.07, y0, z + 0.02, x + 0.07, y1, z + 0.12, m, 'xXZ'); }
    for (let k = 0; k <= ny; k++) { const y = y0 + (y1 - y0) * k / ny; A.cbox(x0, y - 0.06, z + 0.02, x1, y + 0.06, z + 0.12, m, 'ZYy'); }
  },
  // two rails + sleepers + ballast (walkable, drawn on the ground)
  track(x0, z0, x1, z1, along) { if (along === 'x') this.strip(x0, z0, x1, z1, GCELL.tracks, 'x', 4); else this.strip(x0, z0, x1, z1, GCELL.tracks, 'z', 4); },
  sign(x, y, z, nx, nz, name, h = 1.4) {
    const S = Tex.signs[name]; if (!S) return; const c = SIGN_COL[name] || [1, 1, 1]; const w = h * S.aspect;
    const ox = x + nx * 0.08, oz = z + nz * 0.08; const ux = nz * w, uz = -nx * w;
    this.C.B.neon.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
    World.lightsStatic.push({ x: ox + nx * 1.5, y: y + h / 2, z: oz + nz * 1.5, r: c[0] * 2.2, g: c[1] * 2.2, b: c[2] * 2.2, range: 12 });
    if (y < 12) this.C.streak(ox, oz, nx, nz, w * 0.9, 7, c);
  },
  // sign standing on a roof edge, facing (nx,nz)
  roofSign(x, y, z, nx, nz, name, h = 2.2) {
    const S = Tex.signs[name]; if (!S) return; const w = h * S.aspect; const A = this.C.B.atlas; const ux = nz * w, uz = -nx * w;
    A.cbox(Math.min(x - ux / 2, x + ux / 2) - 0.1, y, Math.min(z - uz / 2, z + uz / 2) - 0.1, Math.max(x - ux / 2, x + ux / 2) + 0.1, y + 0.3, Math.max(z - uz / 2, z + uz / 2) + 0.1, [0.15, 0.15, 0.17, 0]);
    for (const t of [-0.4, 0.4]) A.tube(x + ux * t - nx * 0.4, y, z + uz * t - nz * 0.4, x + ux * t, y + h * 0.9, z + uz * t, 0.06, [0.2, 0.2, 0.22, 0], 4);
    this.sign(x, y + 0.35, z, nx, nz, name, h);
  },
  // fire escape on a building face: floors of grated platforms + ladders (NY style), climbable via a ladder
  fireEscape(info, f, t, floors) {
    const C = this.C, A = C.B.atlas; const [px, pz, nx, nz] = C.facePoint(info, f, t); const tx = -nz, tz = nx; const w = 2.2, d = 1.1, col = [0.13, 0.13, 0.14, 0];
    for (let k = 1; k <= floors; k++) {
      const y = 3.2 * k + 0.9; const cx = px + nx * d / 2, cz = pz + nz * d / 2;
      const x0 = Math.min(cx - tx * w - nx * d / 2, cx + tx * w + nx * d / 2), x1 = Math.max(cx - tx * w - nx * d / 2, cx + tx * w + nx * d / 2), z0 = Math.min(cz - tz * w - nz * d / 2, cz + tz * w + nz * d / 2), z1 = Math.max(cz - tz * w - nz * d / 2, cz + tz * w + nz * d / 2);
      A.cbox(x0, y, z0, x1, y + 0.08, z1, col, 'xXzZYy');
      const ox = px + nx * d, oz = pz + nz * d; A.tube(ox - tx * w, y + 1.0, oz - tz * w, ox + tx * w, y + 1.0, oz + tz * w, 0.03, col, 4);
      for (let s = -w; s <= w + 0.01; s += w / 4) A.tube(ox + tx * s, y, oz + tz * s, ox + tx * s, y + 1.0, oz + tz * s, 0.015, col, 3);
      if (k < floors) A.tube(ox - nx * 0.3 - tx * (w - 0.5), y + 0.08, oz - nz * 0.3 - tz * (w - 0.5), ox - nx * 0.3 + tx * (w - 0.9), y + 3.2, oz - nz * 0.3 + tz * (w - 0.9), 0.05, col, 4);
      World.addBox(x0, y - 0.05, z0, x1, y + 0.08, z1, 'awning');
    }
  }
};

/* ---------- north: industry, oil depot, rail yard, station, power plant, mall ---------- */
Object.assign(Districts, {
  sawtooth(x0, z0, x1, z1, y, n = 5) { // factory roof: sloped panels + glazed vertical faces, ridges along z
    const A = this.C.B.atlas; const step = (x1 - x0) / n, rise = Math.min(2.4, step * 0.5);
    for (let k = 0; k < n; k++) {
      const a = x0 + k * step, b = a + step;
      A.quad(a, y, z1, 0, 0, -(z1 - z0), b - a, rise, 0, [0, 0, (z1 - z0) / 6, step / 6], CELL.metal, [0.55, 0.56, 0.58, 0]);
      A.quad(b, y, z0, 0, 0, z1 - z0, 0, rise, 0, [0, 0, (z1 - z0) / 6, rise / 6], CELL.glassroof, [0.8, 0.85, 0.9, 0.5]);
    }
  },
  g_zi(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    const split = K.lz0 + (K.lz1 - K.lz0) * G.r(0.48, 0.62), h1 = Math.round(G.r(9, 13));
    const f = C.bld(K.lx0, K.lz0, K.lx1, split - 2, h1, G.pick(['warehouse', 'industrial', 'warehouse']), { streets: C.streets(K, K.lx0, K.lz0, K.lx1, split - 2), shops: false, signs: false, roofProps: false });
    K.blds.push(f); this.sawtooth(f.x0 + 0.5, f.z0 + 0.5, f.x1 - 0.5, f.z1 - 0.5, h1, Math.max(3, Math.round((f.x1 - f.x0) / 6)));
    World.addBox(f.x0, h1, f.z0, f.x1, h1 + 2.2, f.z1, 'prop', { nowalk: true });
    // loading doors with lights on the yard side
    for (let t = 0.2; t < 0.9; t += 0.3) { const x = lerp(f.x0, f.x1, t); A.box(x - 2.2, 0, f.z1 + 0.02, x + 2.2, 4.5, f.z1 + 0.06, { faces: 'Z', cell: CELL.shutter, su: 4.4, sv: 4.5, col: [0.75, 0.7, 0.55, 0] }); Gl.cbox(x - 0.3, 5, f.z1, x + 0.3, 5.2, f.z1 + 0.3, [1, 0.72, 0.4, 2]); World.lightsStatic.push({ x, y: 5, z: f.z1 + 1.6, r: 1.6, g: 1.1, b: 0.6, range: 11 }); C.pool(x, f.z1 + 2.5, 4, [0.45, 0.32, 0.16]); }
    // yard: silos or a chimney, containers, pallets, office, fence
    const yz0 = split + 1, yz1 = K.lz1;
    if (G.chance(0.5)) { const sx = K.lx0 + 5, sz = yz1 - 6, H = G.r(28, 40); this.cyl(sx, 0, sz, 1.7, 1.2, H, 12, CELL.rough, [0.5, 0.42, 0.38, 0], 4, 4); A.cbox(sx - 1.35, H - 2, sz - 1.35, sx + 1.35, H - 1.4, sz + 1.35, [0.85, 0.85, 0.85, 0]); Gl.cbox(sx - 0.25, H, sz - 0.25, sx + 0.25, H + 0.4, sz + 0.25, [1, 0.1, 0.08, 3]); World.addBox(sx - 1.7, 0, sz - 1.7, sx + 1.7, H, sz + 1.7, 'prop'); }
    else for (let k = 0; k < 2; k++) { const sx = K.lx0 + 4 + k * 5.2, sz = yz1 - 5, H = G.r(12, 16); this.cyl(sx, 0, sz, 2.3, 2.3, H, 14, CELL.tank, [0.78, 0.8, 0.8, 0], 5, 16); A.addGeo(cylGeo(2.35, 0.3, 1.6, 14, false), M4.compose(M4.create(), sx, H, sz, 0, 0, 0), [0.6, 0.62, 0.64, 0]); World.addBox(sx - 2.3, 0, sz - 2.3, sx + 2.3, H + 1, sz + 2.3, 'prop'); }
    for (let k = 0; k < G.i(2, 4); k++) C.container(G.r(K.lx0 + 16, K.lx1 - 5), CURB, G.r(yz0 + 5, yz1 - 4), G.chance(0.5) ? 0 : Math.PI / 2, G.pick(PAL.container));
    for (let k = 0; k < 5; k++) { const x = G.r(K.lx0 + 14, K.lx1 - 3), z = G.r(yz0 + 2, yz1 - 2); const q = World.query(x - 1, z - 1, x + 1, z + 1, []); if (q.some(b => b.kind !== 'slab')) continue; A.box(x - 0.6, CURB, z - 0.6, x + 0.6, CURB + 1.0, z + 0.6, { faces: 'xXzZY', cell: CELL.wood, su: 1.2, sv: 1.2, col: [0.8, 0.7, 0.55, 0] }); World.addBox(x - 0.6, 0, z - 0.6, x + 0.6, CURB + 1.0, z + 0.6, 'prop'); }
    const off = C.bld(K.lx1 - 12, yz1 - 9, K.lx1, yz1, 6.5, 'concrete', { streets: C.streets(K, K.lx1 - 12, yz1 - 9, K.lx1, yz1), shops: false, signs: false });
    K.blds.push(off);
    C.fence(K.lx0, yz1 + 0.5, K.lx1 - 14, yz1 + 0.5, 2.6);
    this.mast(K.cx, (yz0 + yz1) / 2, 12, [1.25, 0.9, 0.5], 24);
    for (let k = 0; k < 3; k++) this.park(G.r(K.lx0 + 16, K.lx1 - 16), G.r(yz0 + 3, yz1 - 3), G.chance(0.5) ? 0 : Math.PI);
    this.curbParking(K, 0.35);
    // pipes between the hall and the yard
    A.tube(K.lx0 + 2, 7, split - 2, K.lx0 + 2, 7, split + 3, 0.35, [0.45, 0.42, 0.4, 0], 8); A.tube(K.lx0 + 3, 5.5, split - 2, K.lx0 + 3, 5.5, split + 3, 0.25, [0.6, 0.3, 0.2, 0], 8);
  },
  g_oil(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.gravel, 5);
    // tanks in a 3 × 2 grid, each inside a low containment wall
    const cols = 3, rows = 2, cw = (R.lx1 - R.lx0 - 20) / cols, rh = (R.lz1 - R.lz0 - 26) / rows;
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      const cx = R.lx0 + 8 + cw * (a + 0.5), cz = R.lz0 + 6 + rh * (b + 0.5), r = Math.min(cw, rh) * 0.34, H = G.r(11, 16);
      this.cyl(cx, 0, cz, r, r, H, 20, CELL.tank, [0.92, 0.92, 0.9, 0], 9, 16);
      A.addGeo(cylGeo(r + 0.05, r * 0.2, 1.8, 20, false), M4.compose(M4.create(), cx, H, cz, 0, 0, 0), [0.7, 0.7, 0.72, 0]);
      World.addBox(cx - r * 0.72, 0, cz - r * 0.72, cx + r * 0.72, H + 1.2, cz + r * 0.72, 'prop'); World.addBox(cx - r, 0, cz - r * 0.35, cx + r, H, cz + r * 0.35, 'prop'); World.addBox(cx - r * 0.35, 0, cz - r, cx + r * 0.35, H, cz + r, 'prop');
      // stairs spiralling up the side, rail on top
      for (let s = 0; s < 8; s++) { const a0 = s / 8 * Math.PI, a1 = (s + 1) / 8 * Math.PI; A.tube(cx + Math.cos(a0) * (r + 0.4), H * s / 8, cz + Math.sin(a0) * (r + 0.4), cx + Math.cos(a1) * (r + 0.4), H * (s + 1) / 8, cz + Math.sin(a1) * (r + 0.4), 0.05, [0.2, 0.2, 0.22, 0], 3); }
      const w = r + 2.2; for (const [x0, z0, x1, z1] of [[cx - w, cz - w, cx + w, cz - w + 0.4], [cx - w, cz + w - 0.4, cx + w, cz + w], [cx - w, cz - w, cx - w + 0.4, cz + w], [cx + w - 0.4, cz - w, cx + w, cz + w]]) { A.cbox(x0, 0, z0, x1, 1.0, z1, [0.55, 0.54, 0.52, 0]); World.addBox(x0, 0, z0, x1, 1.0, z1, 'wall'); }
      Gl.cbox(cx - 0.15, H + 1.8, cz - 0.15, cx + 0.15, H + 2.1, cz + 0.15, [1, 0.12, 0.1, 3]);
    }
    // pipe racks along the middle
    const pz = R.lz0 + 6 + rh; for (let x = R.lx0 + 4; x < R.lx1 - 4; x += 8) { A.tube(x, 0, pz - 1, x, 3.2, pz - 1, 0.12, [0.3, 0.3, 0.3, 0], 5); A.tube(x, 0, pz + 1, x, 3.2, pz + 1, 0.12, [0.3, 0.3, 0.3, 0], 5); }
    for (const [dy, c] of [[3.4, [0.7, 0.62, 0.2, 0]], [3.9, [0.6, 0.25, 0.15, 0]], [4.4, [0.35, 0.36, 0.38, 0]]]) A.tube(R.lx0 + 4, dy, pz, R.lx1 - 4, dy, pz, 0.28, c, 8);
    // flare stack
    const fx = R.lx1 - 8, fz = R.lz1 - 10; A.tube(fx, 0, fz, fx, 44, fz, 0.7, [0.55, 0.3, 0.2, 0], 8); Gl.cbox(fx - 0.9, 44, fz - 0.9, fx + 0.9, 46.5, fz + 0.9, [1.4, 0.6, 0.15, 4]); World.lightsStatic.push({ x: fx, y: 45, z: fz, r: 4, g: 1.8, b: 0.5, range: 30 }); World.addBox(fx - 0.8, 0, fz - 0.8, fx + 0.8, 44, fz + 0.8, 'pole', { noray: true });
    World.spots.flare = { x: fx, y: 45, z: fz };
    // truck loading canopy by the gate
    const gx = R.cx, gz = R.lz1 - 8; A.cbox(gx - 14, 6, gz - 5, gx + 14, 6.4, gz + 5, [0.8, 0.2, 0.15, 0], 'xXzZYy'); for (const [x, z] of [[gx - 13, gz - 4], [gx + 13, gz - 4], [gx - 13, gz + 4], [gx + 13, gz + 4]]) { A.tube(x, 0, z, x, 6, z, 0.2, [0.7, 0.7, 0.72, 0], 6); World.addBox(x - 0.25, 0, z - 0.25, x + 0.25, 6, z + 0.25, 'pole', { noray: true }); }
    Gl.cbox(gx - 12, 5.95, gz - 0.3, gx + 12, 6.0, gz + 0.3, [1, 0.95, 0.85, 1.6]); World.lightsStatic.push({ x: gx, y: 5, z: gz, r: 2, g: 1.9, b: 1.7, range: 18 }); World.addBox(gx - 14, 6, gz - 5, gx + 14, 6.4, gz + 5, 'awning');
    for (const x of [gx - 7, gx + 7]) this.park(x, gz, Math.PI / 2);
    // perimeter fence with the gate in the south side
    C.fence(R.lx0, R.lz0, R.lx1, R.lz0, 3); C.fence(R.lx0, R.lz0, R.lx0, R.lz1, 3); C.fence(R.lx1, R.lz0, R.lx1, R.lz1, 3);
    C.fence(R.lx0, R.lz1, R.cx - 9, R.lz1, 3); C.fence(R.cx + 9, R.lz1, R.lx1, R.lz1, 3);
    for (const x of [R.lx0 + 6, R.lx1 - 6]) for (const z of [R.lz0 + 6, R.cz]) this.mast(x, z, 16, [1.3, 0.85, 0.45], 26);
  },
  g_rail(C, R) {
    const A = C.B.atlas;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.gravel, 5);
    const n = 9, z0 = R.lz0 + 5, dz = (R.lz1 - R.lz0 - 26) / n;
    for (let k = 0; k < n; k++) {
      const z = z0 + dz * (k + 0.5); this.track(R.lx0, z - 2, R.lx1, z + 2, 'x');
      // a train of wagons with random gaps
      let x = R.lx0 + G.r(3, 20);
      while (x < R.lx1 - 16) { if (G.chance(0.72)) { const kind = G.pick(['box', 'box', 'tank', 'flat', 'flat']); const len = kind === 'flat' ? 13 : 12; this.wagon(x + len / 2, z, 'x', len, kind); x += len + 0.8; } else x += G.r(8, 26); }
    }
    // signal box and light masts, lamps along the service road
    const sb = C.bld(R.lx1 - 16, R.lz1 - 16, R.lx1 - 4, R.lz1 - 6, 7.5, 'brick', { shops: false, signs: false });
    C.B.glow.cbox(R.lx1 - 16, 5.2, R.lz1 - 16.05, R.lx1 - 4, 6.4, R.lz1 - 16.0, [1, 0.8, 0.5, 1.2]);
    for (let x = R.lx0 + 10; x < R.lx1; x += 34) this.mast(x, R.lz0 + 4 + dz * n / 2, 20, [1.2, 0.95, 0.7], 30);
    C.fence(R.lx0, R.lz1 - 2, R.lx1 - 20, R.lz1 - 2, 3); C.fence(R.lx0, R.lz0 + 1, R.lx1, R.lz0 + 1, 3);
    for (let x = R.lx0 + 6; x < R.lx1 - 22; x += 18) C.lampPost(x, R.lz1 - 5, 5, [1.2, 0.8, 0.45]);
    World.spots.railyard = { x: R.cx, y: CURB, z: R.cz };
  },
  g_gare(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    // forecourt (south, facing the avenue), station hall, clock tower, glazed train shed with platforms
    this.ground(R.lx0, R.lz1 - 16, R.lx1, R.lz1, GCELL.tiles, 6);
    const hz0 = R.lz1 - 42, hz1 = R.lz1 - 18;
    const hall = C.bld(R.lx0 + 6, hz0, R.lx1 - 6, hz1, 17, 'stone', { streets: 'Z', shops: false, signs: false, col: [0.9, 0.86, 0.78], roofProps: false });
    this.lobbyZ(R.cx - 10, R.cx + 10, 0, 11, hz1 + 0.02);
    const tw = 7; const tower = C.bld(R.cx - tw / 2, hz0 + 6, R.cx + tw / 2, hz0 + 6 + tw, 34, 'stone', { col: [0.88, 0.84, 0.76], shops: false, signs: false, roofProps: false });
    A.addGeo(cylGeo(tw * 0.62, 0.2, 6, 4, false), M4.compose(M4.create(), R.cx, 34, hz0 + 6 + tw / 2, 0, Math.PI / 4, 0), [0.3, 0.36, 0.34, 0]);
    Gl.addGeo(cylGeo(2.2, 2.2, 0.15, 24, true), M4.compose(M4.create(), R.cx, 28, hz0 + 6 + tw + 0.05, Math.PI / 2, 0, 0), [0.85, 0.8, 0.65, 0.25]);
    A.tube(R.cx, 28, hz0 + 6 + tw + 0.25, R.cx, 29.7, hz0 + 6 + tw + 0.25, 0.06, [0.1, 0.1, 0.1, 0], 3); A.tube(R.cx, 28, hz0 + 6 + tw + 0.25, R.cx + 1.2, 28.4, hz0 + 6 + tw + 0.25, 0.06, [0.1, 0.1, 0.1, 0], 3);
    World.lightsStatic.push({ x: R.cx, y: 28, z: hz0 + 6 + tw + 3, r: 2, g: 1.8, b: 1.4, range: 14 });
    this.sign(R.cx, 12.2, hz1, 0, 1, 'gare', 2.2);
    for (let x = R.lx0 + 10; x < R.lx1 - 8; x += 12) { if (Math.abs(x - R.cx) < 12) continue; C.lampPost(x, R.lz1 - 4, 5, [1.1, 0.95, 0.75]); }
    for (let x = R.lx0 + 14; x < R.lx0 + 40; x += 5) this.park(x, R.lz1 - 10, Math.PI / 2);
    World.spots.gare = { x: R.cx, y: CURB, z: R.lz1 - 8 };
    // train shed
    const sz0 = R.lz0 + 2, sz1 = hz0 - 2, np = 5, pd = (sz1 - sz0) / np;
    for (let k = 0; k < np; k++) {
      const z = sz0 + pd * k; this.track(R.lx0, z + 1, R.lx1, z + 5, 'x');
      A.box(R.lx0 + 8, 0, z + 5.6, R.lx1 - 8, 0.9, z + pd - 0.6, { faces: 'xXzZY', cell: CELL.rough, su: 3, sv: 3, col: [0.6, 0.6, 0.58, 0], top: { cell: CELL.concrete, su: 8, sv: 8, col: [0.55, 0.55, 0.55, 0] } });
      World.addBox(R.lx0 + 8, 0, z + 5.6, R.lx1 - 8, 0.9, z + pd - 0.6, 'slab');
      A.cbox(R.lx0 + 8, 0.9, z + 5.6, R.lx1 - 8, 0.92, z + 5.9, [0.95, 0.85, 0.2, 0], 'Y');
      if (G.chance(0.7)) { let x = R.lx0 + G.r(4, 16); const cars = G.i(4, 7); const col = G.pick([[0.75, 0.2, 0.2], [0.2, 0.35, 0.6], [0.85, 0.85, 0.88]]); for (let c = 0; c < cars && x < R.lx1 - 22; c++) { this.wagon(x + 10, z + 3, 'x', 20, 'coach', col); x += 20.6; } }
      for (let x = R.lx0 + 12; x < R.lx1 - 10; x += 15) { A.tube(x, 0.9, z + pd - 1.2, x, 13, z + pd - 1.2, 0.18, [0.25, 0.3, 0.3, 0], 6); World.addBox(x - 0.2, 0, z + pd - 1.4, x + 0.2, 13, z + pd - 1.0, 'pole', { noray: true }); C.B.glow.cbox(x - 0.4, 5, z + pd - 1.6, x + 0.4, 5.15, z + pd - 0.8, [0.9, 0.95, 1.1, 2]); }
      World.lightsStatic.push({ x: R.cx - 30, y: 5, z: z + pd - 3, r: 1.6, g: 1.7, b: 2, range: 20 }); World.lightsStatic.push({ x: R.cx + 30, y: 5, z: z + pd - 3, r: 1.6, g: 1.7, b: 2, range: 20 });
    }
    // glazed roof: a row of barrel-like vaults (sloped panes) over the platforms
    for (let k = 0; k < np; k++) { const z = sz0 + pd * k, zm = z + pd / 2, y = 13, rise = 3.2; A.quad(R.lx0 + 6, y, z, R.lx1 - R.lx0 - 12, 0, 0, 0, rise, pd / 2, [0, 0, (R.lx1 - R.lx0) / 6, pd / 12], CELL.glassroof, [0.85, 0.9, 1, 0.4]); A.quad(R.lx1 - 6, y, z + pd, -(R.lx1 - R.lx0 - 12), 0, 0, 0, rise, -pd / 2, [0, 0, (R.lx1 - R.lx0) / 6, pd / 12], CELL.glassroof, [0.85, 0.9, 1, 0.4]); }
    World.spots.platform = { x: R.cx, y: 0.9, z: sz0 + pd * 2 + 7 };
  },
  coolingTower(x, z, r0, rw, r1, h) {
    const N = 10; // outward profile runs top → bottom
    const top2bottom = []; for (let k = 0; k <= N; k++) { const t = 1 - k / N; const r = t < 0.7 ? lerp(r0, rw, Math.sin(t / 0.7 * Math.PI / 2)) : lerp(rw, r1, (t - 0.7) / 0.3); top2bottom.push([r, h * t, 1, 0.12]); }
    const g2 = latheGeo(top2bottom, 28, [1, 1, 1, 0]);
    for (let k = 0; k < g2.uv.length; k += 4) { g2.uv[k] *= TAU * rw / 8; g2.uv[k + 1] /= 8; g2.uv[k + 2] = CELL.rough[0]; g2.uv[k + 3] = CELL.rough[1]; }
    this.C.B.atlas.addGeo(g2, M4.compose(M4.create(), x, 0, z, 0, 0, 0), [0.66, 0.65, 0.62, 0]);
    World.addBox(x - rw * 0.9, 0, z - rw * 0.9, x + rw * 0.9, h, z + rw * 0.9, 'bld'); World.addBox(x - r0 * 0.7, 0, z - r0 * 0.7, x + r0 * 0.7, h * 0.3, z + r0 * 0.7, 'bld');
  },
  pylon(x, z, h) { const A = this.C.B.atlas, c = [0.45, 0.46, 0.48, 0]; for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) A.tube(x + dx, 0, z + dz, x + dx * 0.25, h, z + dz * 0.25, 0.1, c, 4); for (let y = 4; y < h - 2; y += 5) { const k = 1 - y / h * 0.75; A.tube(x - 1.6 * k, y, z - 1.6 * k, x + 1.6 * k, y + 4, z + 1.6 * k, 0.05, c, 3); A.tube(x + 1.6 * k, y, z - 1.6 * k, x - 1.6 * k, y + 4, z + 1.6 * k, 0.05, c, 3); } for (const y of [h - 4, h - 8]) A.tube(x - 5, y, z, x + 5, y, z, 0.12, c, 4); this.C.B.glow.cbox(x - 0.15, h, z - 0.15, x + 0.15, h + 0.3, z + 0.15, [1, 0.1, 0.1, 3]); World.addBox(x - 1.6, 0, z - 1.6, x + 1.6, h, z + 1.6, 'prop'); },
  g_power(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.gravel, 5);
    this.coolingTower(R.lx0 + 30, R.lz0 + 28, 19, 12, 13.5, 44); this.coolingTower(R.lx0 + 74, R.lz0 + 28, 19, 12, 13.5, 44);
    World.spots.cooling = [{ x: R.lx0 + 30, z: R.lz0 + 28, h: 44 }, { x: R.lx0 + 74, z: R.lz0 + 28, h: 44 }];
    const hall = C.bld(R.lx1 - 48, R.lz0 + 6, R.lx1 - 6, R.lz0 + 40, 22, 'industrial', { shops: false, signs: false, col: [0.62, 0.64, 0.68] });
    for (let k = 0; k < 2; k++) { const x = R.lx1 - 40 + k * 12, z = R.lz0 + 46, H = 72; this.cyl(x, 0, z, 3.2, 2.2, H, 14, CELL.rough, [0.6, 0.58, 0.55, 0], 4, 4); for (let y = H - 10; y < H; y += 5) A.addGeo(cylGeo(2.35, 2.3, 2.5, 14, false), M4.compose(M4.create(), x, y, z, 0, 0, 0), [0.8, 0.2, 0.15, 0]); Gl.cbox(x - 0.3, H, z - 0.3, x + 0.3, H + 0.5, z + 0.3, [1, 0.1, 0.08, 3.5]); World.addBox(x - 3, 0, z - 3, x + 3, H, z + 3, 'prop'); }
    // transformer yard with pylons and wires
    const ty0 = R.lz1 - 34; for (let x = R.lx0 + 12; x < R.lx1 - 60; x += 14) for (const z of [ty0 + 6, ty0 + 18]) { A.cbox(x - 2.2, 0, z - 1.6, x + 2.2, 3.4, z + 1.6, [0.35, 0.38, 0.36, 0]); A.tube(x, 3.4, z, x, 5.2, z, 0.35, [0.7, 0.55, 0.3, 0], 6); World.addBox(x - 2.2, 0, z - 1.6, x + 2.2, 3.4, z + 1.6, 'prop'); }
    const pys = []; for (let x = R.lx0 + 8; x < R.lx1 - 50; x += 30) { this.pylon(x, ty0 + 28, 24); pys.push(x); }
    for (let k = 0; k < pys.length - 1; k++) for (const dy of [-4, -8]) for (const dx of [-5, 5]) A.tube(pys[k] + dx, 24 + dy, ty0 + 28, pys[k + 1] + dx, 24 + dy, ty0 + 28, 0.02, [0.1, 0.1, 0.1, 0], 3);
    // coal heap
    A.addGeo(cylGeo(16, 3, 9, 10, true), M4.compose(M4.create(), R.lx1 - 22, 0, R.lz1 - 20, 0, 0.3, 0), [0.07, 0.07, 0.08, 0]); World.addBox(R.lx1 - 30, 0, R.lz1 - 28, R.lx1 - 14, 7, R.lz1 - 12, 'prop', { nowalk: true });
    C.fence(R.lx0, R.lz1, R.cx - 10, R.lz1, 3); C.fence(R.cx + 10, R.lz1, R.lx1, R.lz1, 3); C.fence(R.lx0, R.lz0, R.lx0, R.lz1, 3); C.fence(R.lx1, R.lz0, R.lx1, R.lz1, 3); C.fence(R.lx0, R.lz0, R.lx1, R.lz0, 3);
    for (const [x, z] of [[R.lx0 + 50, R.lz1 - 40], [R.lx1 - 60, R.lz1 - 10], [R.lx0 + 10, R.lz0 + 60]]) this.mast(x, z, 18, [1.3, 0.85, 0.45], 28);
  },
  g_mall(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    const mx0 = R.lx0 + 30, mx1 = R.lx1 - 22, mz0 = R.lz0 + 10, mz1 = R.lz0 + 52;
    const mall = C.bld(mx0, mz0, mx1, mz1, 14, 'mall', { streets: 'Z', col: [0.95, 0.93, 0.9], roofProps: true });
    // glazed atrium at the entrance with a big sign on top
    const ax = (mx0 + mx1) / 2; A.box(ax - 12, 0, mz1, ax + 12, 18, mz1 + 7, { faces: 'xXZY', cell: CELL.glassroof, su: 4, sv: 4, col: [0.9, 0.95, 1, 0.9], top: { cell: CELL.glassroof, su: 4, sv: 4, col: [0.8, 0.85, 0.9, 0.4] } }); World.addBox(ax - 12, 0, mz1, ax + 12, 18, mz1 + 7, 'bld');
    this.lobbyZ(ax - 11.8, ax + 11.8, 0.2, 17.6, mz1 + 7.02, [0.6, 0.55, 0.45]); World.lightsStatic.push({ x: ax, y: 5, z: mz1 + 10, r: 2.4, g: 2.1, b: 1.6, range: 18 });
    this.roofSign(ax, 18, mz1 + 5, 0, 1, 'arcades', 3.2);
    this.sign(mx0 + 14, 9, mz1, 0, 1, 'bowling', 1.3); this.sign(mx1 - 14, 9, mz1, 0, 1, 'cinema', 1.3);
    // parking lots around
    this.lot(R.lx0 + 2, mz1 + 12, R.lx1 - 2, R.lz1 - 2, 0.6);
    this.lot(R.lx0 + 2, R.lz0 + 2, mx0 - 4, mz1 + 8, 0.45);
    // multi-storey car park frame
    const px0 = mx1 + 4, px1 = R.lx1 - 2; for (const y of [3.4, 6.8]) { A.box(px0, y, mz0, px1, y + 0.35, mz1, { faces: 'xXzZYy', cell: CELL.concrete, su: 6, sv: 6, col: [0.6, 0.6, 0.6, 0] }); World.addBox(px0, y, mz0, px1, y + 0.35, mz1, 'awning'); }
    for (let x = px0 + 1; x < px1; x += 8) for (let z = mz0 + 1; z < mz1; z += 8) { A.tube(x, 0, z, x, 6.8, z, 0.3, [0.55, 0.55, 0.55, 0], 6); World.addBox(x - 0.3, 0, z - 0.3, x + 0.3, 6.8, z + 0.3, 'pole', { noray: true }); }
    for (let z = mz0 + 4; z < mz1; z += 9) { Gl.cbox(px0 + 3, 3.3, z, px1 - 3, 3.38, z + 0.2, [0.9, 1, 1.1, 1.5]); Gl.cbox(px0 + 3, 6.7, z, px1 - 3, 6.78, z + 0.2, [0.9, 1, 1.1, 1.5]); }
    World.lightsStatic.push({ x: (px0 + px1) / 2, y: 3, z: (mz0 + mz1) / 2, r: 1.5, g: 1.7, b: 2, range: 16 });
    World.spots.mall = { x: ax, y: CURB, z: mz1 + 12 };
  }
});

/* ---------- middle belt: tenements, fire station, park, city hall, towers, neon boulevard ---------- */
Object.assign(Districts, {
  // ring of row buildings along the block edges, split in narrow fronts of varied height
  rowBlock(C, K, styles, hmin, hmax, depth = 13, opts = {}) {
    const lots = [[K.lx0, K.lz0, K.lx1, K.lz0 + depth], [K.lx0, K.lz1 - depth, K.lx1, K.lz1], [K.lx0, K.lz0 + depth + 3, K.lx0 + depth, K.lz1 - depth - 3], [K.lx1 - depth, K.lz0 + depth + 3, K.lx1, K.lz1 - depth - 3]];
    const out = [];
    for (const [x0, z0, x1, z1] of lots) {
      const W = x1 - x0, D = z1 - z0, n = Math.max(1, Math.round(Math.max(W, D) / G.r(8, 11))); let prev = 0, lastH = G.r(hmin, hmax);
      for (let k = 1; k <= n; k++) {
        const t = k === n ? 1 : k / n + G.r(-0.04, 0.04); const p = W >= D ? [x0 + W * prev, z0, x0 + W * t, z1] : [x0, z0 + D * prev, x1, z0 + D * t]; prev = t;
        const h = Math.round(clamp(lastH + G.r(-4, 4), hmin, hmax) * 2) / 2; lastH = h;
        const info = C.bld(p[0], p[1], p[2], p[3], h, G.pick(styles), Object.assign({ streets: C.streets(K, p[0], p[1], p[2], p[3]) }, opts));
        K.blds.push(info); out.push(info);
      }
    }
    return out;
  },
  g_tenem(C, K) {
    const B = this.rowBlock(C, K, ['tenement', 'tenement', 'brick2', 'warehouse'], 12.5, 22.5, 13);
    for (const b of B) { b.waterTower = true; if (b.streets && G.chance(0.55) && b.h > 12) { const f = b.streets[0]; const L = (f === 'x' || f === 'X') ? b.z1 - b.z0 : b.x1 - b.x0; if (L > 7) this.fireEscape(b, f, G.r(0.3, 0.7), Math.floor(b.h / 3.2) - 1); } }
    // laundry lines across the back court
    for (let k = 0; k < 4; k++) { const z = G.r(K.lz0 + 16, K.lz1 - 16), y = G.r(6, 11); this.bulbs(K.lx0 + 13, y, z, K.lx1 - 13, y + G.r(-1, 1), z + G.r(-3, 3), 9, () => G.pick([[0.9, 0.9, 0.85], [0.8, 0.3, 0.3], [0.3, 0.5, 0.8], [0.9, 0.8, 0.3]]).map(v => v * 0.25), 0.25, 0.8); }
    C.alleyDressing(K, K.cx, K.cz, 2); this.curbParking(K, 0.55);
  },
  g_fire(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    if (K.j === 3) { this.rowBlock(C, K, ['tenement', 'brick', 'brick2'], 10, 17, 13); this.curbParking(K, 0.5); return; }
    // the fire station faces the east avenue
    const st = C.bld(K.lx1 - 16, K.lz0 + 6, K.lx1, K.lz1 - 6, 10, 'brick', { streets: 'X', shops: false, signs: false, col: [0.66, 0.3, 0.24] });
    K.blds.push(st);
    for (let k = 0; k < 3; k++) { const z = K.lz0 + 12 + k * 8; A.box(K.lx1 + 0.02, 0, z - 3, K.lx1 + 0.06, 4.6, z + 3, { faces: 'X', cell: CELL.shutter, su: 6, sv: 4.6, col: [0.85, 0.2, 0.15, 0] }); Gl.cbox(K.lx1, 5, z - 0.3, K.lx1 + 0.35, 5.25, z + 0.3, [1, 0.85, 0.6, 2]); World.lightsStatic.push({ x: K.lx1 + 2, y: 5, z, r: 1.6, g: 1.3, b: 0.9, range: 10 }); }
    this.sign(K.lx1, 6.2, (K.lz0 + K.lz1) / 2 - 4, 1, 0, 'pompiers', 1.2);
    // fire engines in front of the doors (static)
    for (let k = 0; k < 2; k++) { const z = K.lz0 + 12 + k * 8, x = K.lx1 + 4.5; A.cbox(x - 1.25, 0.5, z - 4.2, x + 1.25, 3.1, z + 4.2, [0.8, 0.1, 0.08, 0]); A.cbox(x - 1.2, 3.1, z - 3, x + 1.2, 3.4, z + 3.6, [0.75, 0.75, 0.78, 0]); A.cbox(x - 1.26, 1.5, z + 2.6, x + 1.26, 2.8, z + 4.21, [0.1, 0.12, 0.15, 0], 'xXZ'); Gl.cbox(x - 1, 3.1, z + 3.9, x + 1, 3.3, z + 4.1, [1, 0.1, 0.1, 2]); for (const wz of [z - 3, z + 2.8]) for (const wx of [x - 1.2, x + 1.2]) A.cbox(wx - 0.2, 0, wz - 0.5, wx + 0.2, 1.0, wz + 0.5, [0.08, 0.08, 0.08, 0]); World.addBox(x - 1.25, 0, z - 4.2, x + 1.25, 3.4, z + 4.2, 'cont'); }
    // training tower: open concrete frame, five floors
    const tx = K.lx0 + 12, tz = K.cz, s = 6; for (let f = 1; f <= 5; f++) { A.box(tx - s / 2, f * 3.4, tz - s / 2, tx + s / 2, f * 3.4 + 0.3, tz + s / 2, { faces: 'xXzZYy', cell: CELL.concrete, su: 6, sv: 6, col: [0.62, 0.6, 0.58, 0] }); World.addBox(tx - s / 2, f * 3.4, tz - s / 2, tx + s / 2, f * 3.4 + 0.3, tz + s / 2, 'awning'); }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { A.cbox(tx + dx * s / 2 - 0.3 * (dx + 1), 0, tz + dz * s / 2 - 0.3 * (dz + 1), tx + dx * s / 2 - 0.3 * (dx + 1) + 0.3, 17.3, tz + dz * s / 2 - 0.3 * (dz + 1) + 0.3, [0.55, 0.54, 0.52, 0]); World.addBox(tx + dx * s / 2 - 0.3 * (dx + 1), 0, tz + dz * s / 2 - 0.3 * (dz + 1), tx + dx * s / 2 - 0.3 * (dx + 1) + 0.3, 17.3, tz + dz * s / 2 - 0.3 * (dz + 1) + 0.3, 'pole'); }
    C.ladder(tx, tz + s / 2, 0, 1, CURB, 17.3, null);
    this.ground(K.lx0 + 2, K.lz0 + 2, K.lx1 - 18, K.lz1 - 2, GCELL.asphalt, 8, CURB + 0.01);
    A.tube(K.lx0 + 26, CURB, K.lz0 + 6, K.lx0 + 26, 12, K.lz0 + 6, 0.06, [0.8, 0.8, 0.8, 0], 5); A.cbox(K.lx0 + 26.05, 10.4, K.lz0 + 6, K.lx0 + 28.6, 11.9, K.lz0 + 6.03, [0.15, 0.3, 0.75, 0], 'zZ');
    World.spots.fireTower = { x: tx, y: 17.6, z: tz };
  },
  g_park(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.grass, 7);
    // paths: a cross + a ring, gravel
    const P = (x0, z0, x1, z1) => this.ground(x0, z0, x1, z1, GCELL.gravel, 4, CURB + 0.018);
    P(R.lx0, R.cz - 2, R.lx1, R.cz + 2); P(R.cx - 2, R.lz0, R.cx + 2, R.lz1);
    const rx0 = R.lx0 + 14, rx1 = R.lx1 - 14, rz0 = R.lz0 + 12, rz1 = R.lz1 - 12; P(rx0, rz0, rx1, rz0 + 3); P(rx0, rz1 - 3, rx1, rz1); P(rx0, rz0, rx0 + 3, rz1); P(rx1 - 3, rz0, rx1, rz1);
    // pond with a stone rim (east part)
    const px0 = R.cx + 18, px1 = rx1 - 10, pz0 = rz0 + 10, pz1 = R.cz - 8;
    this.ground(px0, pz0, px1, pz1, GCELL.pond, 12, CURB + 0.02);
    for (const [x0, z0, x1, z1] of [[px0 - 0.5, pz0 - 0.5, px1 + 0.5, pz0], [px0 - 0.5, pz1, px1 + 0.5, pz1 + 0.5], [px0 - 0.5, pz0, px0, pz1], [px1, pz0, px1 + 0.5, pz1]]) { A.cbox(x0, CURB, z0, x1, CURB + 0.45, z1, [0.55, 0.53, 0.5, 0]); World.addBox(x0, 0, z0, x1, CURB + 0.45, z1, 'prop'); }
    World.addBox(px0, 0, pz0, px1, CURB + 0.45, pz1, 'prop', { nowalk: true, noray: true });
    World.spots.pond = { x: (px0 + px1) / 2, z: (pz0 + pz1) / 2 };
    // bandstand at the centre
    const bx = R.cx - 22, bz = R.cz + 16; A.addGeo(cylGeo(5, 5, 0.9, 8, true), M4.compose(M4.create(), bx, CURB, bz, 0, Math.PI / 8, 0), [0.6, 0.58, 0.55, 0]); World.addBox(bx - 4.5, 0, bz - 4.5, bx + 4.5, CURB + 0.9, bz + 4.5, 'slab');
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.PI / 8; A.tube(bx + Math.cos(a) * 4.4, CURB + 0.9, bz + Math.sin(a) * 4.4, bx + Math.cos(a) * 4.4, CURB + 4.2, bz + Math.sin(a) * 4.4, 0.12, [0.85, 0.85, 0.82, 0], 6); }
    A.addGeo(cylGeo(5.6, 0.4, 2.2, 8, true), M4.compose(M4.create(), bx, CURB + 4.2, bz, 0, Math.PI / 8, 0), [0.2, 0.35, 0.32, 0]); World.addBox(bx - 4.6, CURB + 4.2, bz - 4.6, bx + 4.6, CURB + 5, bz + 4.6, 'awning');
    this.bulbs(bx - 5.5, CURB + 4.1, bz - 5.5, bx + 5.5, CURB + 4.1, bz - 5.5, 10, [1, 0.8, 0.45], 0.06, 0.4); this.bulbs(bx - 5.5, CURB + 4.1, bz + 5.5, bx + 5.5, CURB + 4.1, bz + 5.5, 10, [1, 0.8, 0.45], 0.06, 0.4);
    World.lightsStatic.push({ x: bx, y: CURB + 3.5, z: bz, r: 1.6, g: 1.2, b: 0.7, range: 12 });
    World.spots.bandstand = { x: bx, y: CURB + 0.9, z: bz };
    // statue on a pedestal at the crossing
    A.cbox(R.cx - 1.5, CURB, R.cz - 1.5, R.cx + 1.5, CURB + 2.2, R.cz + 1.5, [0.55, 0.54, 0.5, 0]); A.addGeo(capsuleGeo(0.45, 1.6, 8, 3), M4.compose(M4.create(), R.cx, CURB + 4.6, R.cz, 0, 0, 0), [0.25, 0.32, 0.28, 0]); A.addGeo(sphereGeo(0.35, 8, 6), M4.compose(M4.create(), R.cx, CURB + 5.3, R.cz, 0, 0, 0), [0.25, 0.32, 0.28, 0]); World.addBox(R.cx - 1.5, 0, R.cz - 1.5, R.cx + 1.5, CURB + 2.2, R.cz + 1.5, 'prop');
    // playground
    const gx = R.lx0 + 30, gz = R.lz1 - 26; this.ground(gx - 10, gz - 8, gx + 10, gz + 8, GCELL.sand, 5, CURB + 0.02);
    for (const sx of [gx - 6, gx - 2]) { A.tube(sx, CURB, gz - 1, sx + 1.2, CURB + 2.4, gz, 0.05, [0.8, 0.2, 0.15, 0], 4); A.tube(sx, CURB, gz + 1, sx + 1.2, CURB + 2.4, gz, 0.05, [0.8, 0.2, 0.15, 0], 4); }
    A.tube(gx - 4.8, CURB + 2.4, gz, gx - 0.8, CURB + 2.4, gz, 0.06, [0.8, 0.2, 0.15, 0], 4);
    A.obox(gx + 5, CURB + 1.1, gz, 0.5, 0.06, 2.2, 0.5, [0.2, 0.5, 0.8, 0]); A.cbox(gx + 3.4, CURB, gz - 0.6, gx + 4.4, CURB + 2.2, gz + 0.6, [0.9, 0.7, 0.15, 0]); World.addBox(gx + 3.4, 0, gz - 0.6, gx + 4.4, CURB + 2.2, gz + 0.6, 'prop');
    // trees in clusters, avoiding paths, pond, bandstand
    const clear = (x, z) => Math.abs(z - R.cz) > 4 && Math.abs(x - R.cx) > 4 && !(x > px0 - 3 && x < px1 + 3 && z > pz0 - 3 && z < pz1 + 3) && Math.hypot(x - bx, z - bz) > 9 && !(Math.abs(x - gx) < 12 && Math.abs(z - gz) < 10) && !(x > rx0 - 2 && x < rx0 + 5) && !(x > rx1 - 5 && x < rx1 + 2) && !(z > rz0 - 2 && z < rz0 + 5) && !(z > rz1 - 5 && z < rz1 + 2) && Math.hypot(x - R.cx, z - R.cz) > 5;
    for (let k = 0; k < 90; k++) { const x = G.r(R.lx0 + 3, R.lx1 - 3), z = G.r(R.lz0 + 3, R.lz1 - 3); if (!clear(x, z)) continue; if (World.query(x - 2, z - 2, x + 2, z + 2, []).some(b => b.kind === 'prop')) continue; this.tree(x, z, G.r(0.8, 1.35), G.chance(0.3)); }
    // lamps and benches along the ring path
    for (let t = 0; t < 1; t += 1 / 12) { const x = lerp(rx0 + 1.5, rx1 - 1.5, t); for (const z of [rz0 + 4.5, rz1 - 4.5]) { C.lampPost(x, z, 3.8, [1.1, 0.85, 0.55]); if (G.chance(0.5)) this.bench(x + 3, z, true); } }
    for (let t = 0.1; t < 1; t += 1 / 7) { const z = lerp(rz0 + 3, rz1 - 3, t); for (const x of [rx0 + 4.5, rx1 - 4.5]) C.lampPost(x, z, 3.8, [1.1, 0.85, 0.55]); }
    // hedge perimeter with openings in the middle of each side
    for (const [x0, z0, x1, z1] of [[R.lx0, R.lz0, R.cx - 4, R.lz0 + 0.8], [R.cx + 4, R.lz0, R.lx1, R.lz0 + 0.8], [R.lx0, R.lz1 - 0.8, R.cx - 4, R.lz1], [R.cx + 4, R.lz1 - 0.8, R.lx1, R.lz1], [R.lx0, R.lz0, R.lx0 + 0.8, R.cz - 4], [R.lx0, R.cz + 4, R.lx0 + 0.8, R.lz1], [R.lx1 - 0.8, R.lz0, R.lx1, R.cz - 4], [R.lx1 - 0.8, R.cz + 4, R.lx1, R.lz1]]) this.hedge(x0, z0, x1, z1, 1.0);
    World.spots.park = { x: R.cx, y: CURB, z: R.cz };
  },
  g_civic(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0 + 40, R.lx1, R.lz1, GCELL.tiles, 5);
    const hall = C.bld(R.lx0 + 10, R.lz0 + 6, R.lx1 - 10, R.lz0 + 34, 20, 'stone', { streets: 'z', shops: false, signs: false, col: [0.92, 0.88, 0.8], roofProps: false });
    this.gable(R.lx0 + 10, R.lz0 + 6, R.lx1 - 10, R.lz0 + 34, 20, 5, 'x', [0.35, 0.4, 0.42, 0], 0.2);
    World.addBox(R.lx0 + 10, 20, R.lz0 + 6, R.lx1 - 10, 23, R.lz0 + 34, 'prop', { nowalk: true });
    // central pavilion + dome + clock
    const cx = R.cx; A.box(cx - 8, 0, R.lz0 + 30, cx + 8, 26, R.lz0 + 37, { faces: 'xXZ', cell: CELL.stone, su: 24, sv: 25.6, col: [0.94, 0.9, 0.82, 0] }); World.addBox(cx - 8, 0, R.lz0 + 30, cx + 8, 26, R.lz0 + 37, 'bld');
    A.addGeo(sphereGeo(6, 16, 8, 1), M4.compose(M4.create(), cx, 26, R.lz0 + 33, 0, 0, 0), [0.28, 0.42, 0.4, 0]); A.tube(cx, 31.5, R.lz0 + 33, cx, 36, R.lz0 + 33, 0.12, [0.8, 0.7, 0.3, 0], 5);
    Gl.addGeo(cylGeo(2.4, 2.4, 0.15, 24, true), M4.compose(M4.create(), cx, 21, R.lz0 + 37.05, Math.PI / 2, 0, 0), [1, 0.95, 0.8, 1.8]);
    // columns portico
    for (let k = -3; k <= 3; k++) { const x = cx + k * 2.2; A.tube(x, CURB + 1, R.lz0 + 38, x, 13, R.lz0 + 38, 0.45, [0.92, 0.9, 0.84, 0], 10); World.addBox(x - 0.45, 0, R.lz0 + 37.55, x + 0.45, 13, R.lz0 + 38.45, 'pole'); }
    A.cbox(cx - 8.5, 13, R.lz0 + 36.5, cx + 8.5, 14.4, R.lz0 + 39.5, [0.9, 0.87, 0.8, 0], 'xXzZYy'); World.addBox(cx - 8.5, 13, R.lz0 + 36.5, cx + 8.5, 14.4, R.lz0 + 39.5, 'awning');
    A.box(cx - 10, 0, R.lz0 + 37, cx + 10, CURB + 1, R.lz0 + 44, { faces: 'xXzZY', cell: CELL.marble, su: 3, sv: 3, col: [0.85, 0.84, 0.8, 0], top: { cell: CELL.marble, su: 3, sv: 3, col: [0.85, 0.84, 0.8, 0] } }); World.addBox(cx - 10, 0, R.lz0 + 37, cx + 10, CURB + 0.55, R.lz0 + 44, 'slab'); World.addBox(cx - 10, 0, R.lz0 + 37, cx + 10, CURB + 1, R.lz0 + 40.5, 'slab');
    this.sign(cx, 15.2, R.lz0 + 39.6, 0, 1, 'mairie', 1.2);
    for (const x of [cx - 6, cx + 6]) { Gl.cbox(x - 0.25, 3.2, R.lz0 + 39.6, x + 0.25, 3.8, R.lz0 + 39.9, [1, 0.85, 0.55, 2.5]); World.lightsStatic.push({ x, y: 3.5, z: R.lz0 + 41, r: 1.8, g: 1.4, b: 0.8, range: 10 }); }
    World.spots.cityhall = { x: cx, y: CURB + 1, z: R.lz0 + 41 };
    // fountains, flags, trees in planters
    for (const fx of [cx - 20, cx + 20]) { const fz = R.lz0 + 62; A.addGeo(cylGeo(4.5, 4.5, 0.7, 20, true), M4.compose(M4.create(), fx, CURB, fz, 0, 0, 0), [0.6, 0.58, 0.55, 0]); Gl.addGeo(cylGeo(4.1, 4.1, 0.05, 20, true), M4.compose(M4.create(), fx, CURB + 0.66, fz, 0, 0, 0), [0.15, 0.4, 0.55, 0.8]); A.tube(fx, CURB + 0.7, fz, fx, CURB + 2.6, fz, 0.3, [0.6, 0.58, 0.55, 0], 8); World.addBox(fx - 4.2, 0, fz - 4.2, fx + 4.2, CURB + 0.7, fz + 4.2, 'prop'); World.lightsStatic.push({ x: fx, y: CURB + 1, z: fz, r: 0.5, g: 1.2, b: 1.6, range: 9 }); }
    for (const x of [cx - 4, cx, cx + 4]) { A.tube(x, CURB, R.lz1 - 8, x, 14, R.lz1 - 8, 0.07, [0.85, 0.85, 0.85, 0], 5); const fc = x === cx - 4 ? [0.1, 0.2, 0.6, 0] : x === cx ? [0.95, 0.95, 0.95, 0] : [0.8, 0.1, 0.12, 0]; A.cbox(x + 0.05, 11.6, R.lz1 - 8, x + 2.6, 13.4, R.lz1 - 7.97, fc, 'zZ'); }
    for (let x = R.lx0 + 8; x < R.lx1 - 4; x += 14) for (const z of [R.lz0 + 52, R.lz1 - 16]) { if (Math.abs(x - cx) < 10) continue; A.cbox(x - 1.4, CURB, z - 1.4, x + 1.4, CURB + 0.7, z + 1.4, [0.5, 0.48, 0.45, 0]); World.addBox(x - 1.4, 0, z - 1.4, x + 1.4, CURB + 0.7, z + 1.4, 'prop'); this.tree(x, z, 0.85); }
    for (let x = R.lx0 + 4; x < R.lx1; x += 12) C.lampPost(x, R.lz1 - 3, 5, [1.1, 0.95, 0.75]);
  },
  g_fin(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(K.lx0, K.lz0, K.lx1, K.lz1, GCELL.tiles, 5, CURB + 0.011);
    const landmark = K.i === 10 && K.j === 2;
    const n = landmark ? 1 : G.chance(0.5) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const w = landmark ? 24 : G.r(15, 20), d = landmark ? 24 : G.r(15, 20);
      const x = n === 1 ? K.cx : (k === 0 ? K.lx0 + w / 2 + 2 : K.lx1 - w / 2 - 2), z = n === 1 ? K.cz : (k === 0 ? K.lz0 + d / 2 + 2 : K.lz1 - d / 2 - 2);
      const H = landmark ? 158 : Math.round(G.r(55, 125));
      const style = landmark ? 'office' : G.pick(['office', 'glass', 'tower', 'office']);
      const podH = G.pick([6, 8, 9]);
      const pod = C.bld(x - w / 2 - 2, z - d / 2 - 2, x + w / 2 + 2, z + d / 2 + 2, podH, 'concrete', { streets: C.streets(K, x - w / 2 - 2, z - d / 2 - 2, x + w / 2 + 2, z + d / 2 + 2) || 'xXzZ', col: [0.75, 0.76, 0.78], roofProps: false });
      const tw = C.bld(x - w / 2, z - d / 2, x + w / 2, z + d / 2, H, style, { base: podH, roofProps: false, signs: false });
      K.blds.push(pod, tw);
      // setbacks and crown
      const sH = H * G.r(0.72, 0.85); A.box(x - w / 2 - 0.4, sH, z - d / 2 - 0.4, x + w / 2 + 0.4, sH + 1, z + d / 2 + 0.4, { faces: 'xXzZY', cell: CELL.concrete, su: 6, sv: 6, col: [0.3, 0.32, 0.35, 0] });
      const lc = G.pick([[0.4, 0.8, 1], [1, 0.55, 0.3], [0.9, 0.9, 1], [0.6, 1, 0.8]]);
      Gl.cbox(x - w / 2 - 0.1, H - 0.8, z - d / 2 - 0.1, x + w / 2 + 0.1, H - 0.2, z + d / 2 + 0.1, [lc[0], lc[1], lc[2], 1.6]);
      for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]]) Gl.cbox(cx - 0.12, podH, cz - 0.12, cx + 0.12, H, cz + 0.12, [lc[0], lc[1], lc[2], 0.9]);
      const ah = landmark ? 36 : G.r(8, 20); A.tube(x, H, z, x, H + ah, z, 0.25, [0.4, 0.4, 0.42, 0], 6); Gl.cbox(x - 0.3, H + ah, z - 0.3, x + 0.3, H + ah + 0.6, z + 0.3, [1, 0.1, 0.1, 3.5]);
      if (landmark) { for (let y = H - 30; y < H - 2; y += 4) Gl.cbox(x - w / 2 - 0.15, y, z - d / 2 - 0.15, x + w / 2 + 0.15, y + 0.25, z + d / 2 + 0.15, [0.5, 0.85, 1, 1.4]); World.spots.skyscraper = { x, y: H, z }; }
      C.billboard(pod, G.pick(pod.streets.split('')), G.pick(['bb_volt', 'bb_tel', 'bb_cine']), podH);
    }
    // plaza sculpture
    if (!landmark && G.chance(0.6)) { const sx = K.lx0 + 6, sz = K.lz1 - 6; A.obox(sx, CURB + 2, sz, 0.6, 2, 0.6, 0.6, [0.7, 0.3, 0.2, 0]); A.obox(sx + 0.8, CURB + 3.4, sz, 0.3, 1.6, 1.4, 1.1, [0.7, 0.3, 0.2, 0]); World.addBox(sx - 1, 0, sz - 1, sx + 1, CURB + 4, sz + 1, 'prop'); }
    this.curbParking(K, 0.3);
  },
  g_neon(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    const B = this.rowBlock(C, K, ['plaster', 'brick', 'stone', 'concrete', 'tenement'], 9, 19, 14);
    const flat = ['cinema', 'karaoke', 'ouvert', 'pizza', 'sushi', 'kebab', 'theatre', 'cabaret', 'bowling', 'laverie', 'tabacTxt'], blade = ['hotel', 'bar', 'club', 'ramen', 'carotte'];
    for (const b of B) {
      for (const f of b.streets) { const L = (f === 'x' || f === 'X') ? b.z1 - b.z0 : b.x1 - b.x0; if (L < 6) continue; for (let t = 0.25; t < 1; t += 0.5) { if (G.chance(0.6)) C.sign(b, f, t, G.pick(flat), 'flat', G.pick([4.6, 7.8, 11])); if (G.chance(0.35) && b.h > 8) C.sign(b, f, t + 0.15, G.pick(blade), 'blade', G.r(5.5, 9)); } }
    }
    // one showpiece per block: casino or theatre marquee
    const f = B.find(b => b.streets && b.x1 - b.x0 > 9 && b.h > 10);
    if (f) {
      const face = f.streets[0]; const [px, pz, nx, nz] = C.facePoint(f, face, 0.5); const tx = -nz, tz = nx; const w = 5.5;
      const name = G.chance(0.5) ? 'casino' : 'theatre';
      // marquee canopy with chasing bulbs
      const x0 = Math.min(px - tx * w, px + tx * w + nx * 3), x1 = Math.max(px - tx * w, px + tx * w + nx * 3), z0 = Math.min(pz - tz * w, pz + tz * w + nz * 3), z1 = Math.max(pz - tz * w, pz + tz * w + nz * 3);
      A.cbox(x0, 3.6, z0, x1, 4.4, z1, [0.12, 0.1, 0.1, 0], 'xXzZYy'); World.addBox(x0, 3.6, z0, x1, 4.4, z1, 'awning');
      for (let s = -w; s <= w; s += 0.55) Gl.cbox(px + tx * s + nx * 3.02 - 0.06, 3.9, pz + tz * s + nz * 3.02 - 0.06, px + tx * s + nx * 3.02 + 0.06, 4.1, pz + tz * s + nz * 3.02 + 0.06, [1, 0.8, 0.35, 3]);
      Gl.cbox(x0 + 0.2, 3.58, z0 + 0.2, x1 - 0.2, 3.6, z1 - 0.2, [1, 0.85, 0.55, -0.5], 'y');
      World.lightsStatic.push({ x: px + nx * 4, y: 3.2, z: pz + nz * 4, r: 3, g: 2.2, b: 1, range: 14 });
      this.sign(px, 5, pz, nx, nz, name, 2.4);
      if (name === 'casino') World.spots.casino = { x: px + nx * 5, y: CURB, z: pz + nz * 5 };
    }
    // LED strips over the street (festoons between the lamp posts)
    if (G.chance(0.6)) this.bulbs(K.bx0, 9, K.bz1 + 1, K.bx1, 9, K.bz1 + 1, 30, k => [[1, 0.3, 0.6], [0.3, 0.8, 1], [1, 0.8, 0.3]][k % 3], 0.07, 0.6);
    this.curbParking(K, 0.45);
  }
});

/* ---------- west / east of the core: cemetery, housing estate, lantern quarter, stadium ---------- */
Object.assign(Districts, {
  g_cem(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.grass, 7, CURB + 0.011, [0.7, 0.75, 0.7, 0]);
    // stone walls, gate on the east side
    const wc = [0.52, 0.5, 0.47, 0], h = 2.6;
    this.wall(R.lx0, R.lz0, R.lx1, R.lz0 + 0.6, h, wc); this.wall(R.lx0, R.lz1 - 0.6, R.lx1, R.lz1, h, wc); this.wall(R.lx0, R.lz0, R.lx0 + 0.6, R.lz1, h, wc);
    this.wall(R.lx1 - 0.6, R.lz0, R.lx1, R.cz - 4, h, wc); this.wall(R.lx1 - 0.6, R.cz + 4, R.lx1, R.lz1, h, wc);
    for (const z of [R.cz - 4.3, R.cz + 4.3]) { A.cbox(R.lx1 - 0.9, 0, z - 0.6, R.lx1 + 0.3, 4, z + 0.6, [0.48, 0.46, 0.43, 0]); World.addBox(R.lx1 - 0.9, 0, z - 0.6, R.lx1 + 0.3, 4, z + 0.6, 'wall'); A.addGeo(sphereGeo(0.5, 8, 6), M4.compose(M4.create(), R.lx1 - 0.3, 4.4, z, 0, 0, 0), [0.48, 0.46, 0.43, 0]); }
    A.tube(R.lx1 - 0.3, 3.8, R.cz - 4.3, R.lx1 - 0.3, 3.8, R.cz + 4.3, 0.06, [0.1, 0.1, 0.1, 0], 4);
    // main alley with cypresses to the chapel, side paths
    this.ground(R.lx0 + 18, R.cz - 2.5, R.lx1, R.cz + 2.5, GCELL.gravel, 4, CURB + 0.018);
    for (let x = R.lx0 + 22; x < R.lx1 - 4; x += 9) for (const z of [R.cz - 4.5, R.cz + 4.5]) this.cypress(x, z, G.r(6, 9));
    for (let z = R.lz0 + 8; z < R.lz1 - 4; z += 14) this.ground(R.lx0 + 18, z - 1.2, R.lx1 - 2, z + 1.2, GCELL.gravel, 4, CURB + 0.017);
    // tombs in rows
    for (let z = R.lz0 + 3; z < R.lz1 - 3; z += 14) for (const zz of [z + 1.8, z + 6.2, z + 10.6]) {
      if (Math.abs(zz - R.cz) < 6) continue;
      for (let x = R.lx0 + 20; x < R.lx1 - 3; x += G.r(2.1, 2.8)) {
        const r = G.r(); const c = [0.62 + G.r(-0.1, 0.1), 0.6 + G.r(-0.1, 0.08), 0.58, 0];
        if (r < 0.08 && x < R.lx1 - 8) { // mausoleum
          A.box(x, CURB, zz - 1.6, x + 3.2, 3.2, zz + 1.6, { faces: 'xXzZY', cell: CELL.marble, su: 2, sv: 2, col: c }); this.gable(x, zz - 1.6, x + 3.2, zz + 1.6, 3.2, 1.2, 'z', [0.4, 0.4, 0.42, 0], 0.15); World.addBox(x, 0, zz - 1.6, x + 3.2, 4.4, zz + 1.6, 'prop'); x += 3.6;
        } else if (r < 0.2) { // cross
          A.cbox(x + 0.45, CURB, zz - 0.12, x + 0.6, CURB + 1.6, zz + 0.12, c); A.cbox(x + 0.1, CURB + 1.05, zz - 0.1, x + 0.95, CURB + 1.25, zz + 0.1, c); A.box(x, CURB, zz - 0.9, x + 1.05, CURB + 0.3, zz + 0.9, { faces: 'xXzZY', cell: CELL.marble, su: 2, sv: 2, col: c }); World.addBox(x, 0, zz - 0.9, x + 1.05, CURB + 0.3, zz + 0.9, 'prop');
        } else if (r < 0.28) { // angel
          A.box(x, CURB, zz - 0.5, x + 1.1, CURB + 1.2, zz + 0.5, { faces: 'xXzZY', cell: CELL.marble, su: 2, sv: 2, col: c }); A.addGeo(capsuleGeo(0.22, 0.7, 6, 2), M4.compose(M4.create(), x + 0.55, CURB + 2.35, zz, 0, 0, 0), c); A.obox(x + 0.55, CURB + 2.0, zz + 0.25, 0.5, 0.35, 0.04, 0, c); World.addBox(x, 0, zz - 0.5, x + 1.1, CURB + 2.6, zz + 0.5, 'prop');
        } else { // slab + headstone
          A.box(x, CURB, zz - 1, x + 1.0, CURB + 0.35, zz + 1, { faces: 'xXzZY', cell: CELL.marble, su: 2, sv: 2, col: c }); A.box(x + 0.05, CURB, zz - 1.12, x + 0.95, CURB + G.r(0.9, 1.3), zz - 0.96, { faces: 'xXzZY', cell: CELL.marble, su: 1.5, sv: 1.5, col: [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9, 0] }); World.addBox(x, 0, zz - 1.12, x + 1.0, CURB + 0.35, zz + 1, 'prop');
          if (G.chance(0.06)) { Gl.cbox(x + 0.4, CURB + 0.36, zz, x + 0.6, CURB + 0.5, zz + 0.2, [1, 0.35, 0.12, 2.5]); World.lightsStatic.push({ x: x + 0.5, y: 0.8, z: zz, r: 0.9, g: 0.3, b: 0.08, range: 4, flick: 0.8 }); }
        }
      }
    }
    // chapel with bell tower on the west side
    const chx = R.lx0 + 3, chz = R.cz; const ch = C.bld(chx, chz - 6, chx + 13, chz + 6, 9, 'stone', { shops: false, signs: false, col: [0.72, 0.7, 0.66], roofProps: false });
    this.gable(chx, chz - 6, chx + 13, chz + 6, 9, 4.5, 'x', [0.3, 0.3, 0.33, 0]); World.addBox(chx, 9, chz - 6, chx + 13, 12, chz + 6, 'prop', { nowalk: true });
    const bt = C.bld(chx + 13, chz - 2, chx + 17, chz + 2, 17, 'stone', { shops: false, signs: false, col: [0.7, 0.68, 0.64], roofProps: false });
    A.addGeo(cylGeo(2.9, 0.1, 6, 4, true), M4.compose(M4.create(), chx + 15, 17, chz, 0, Math.PI / 4, 0), [0.3, 0.3, 0.33, 0]);
    Gl.cbox(chx + 17, 7, chz - 0.8, chx + 17.05, 9.5, chz + 0.8, [1, 0.75, 0.4, 0.8]);
    for (let x = R.lx0 + 30; x < R.lx1; x += 30) { C.lampPost(x, R.cz + 7, 3.4, [1, 0.7, 0.4]); }
    World.spots.chapel = { x: chx + 19, y: CURB, z: chz }; World.spots.cemetery = { x: R.cx, y: CURB, z: R.cz };
  },
  g_hlm(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    const layout = G.i(0, 2);
    if (layout === 0) { // long bar on the north side + tower on the south-east corner
      const bar = C.bld(K.lx0, K.lz0, K.lx1, K.lz0 + 12, Math.round(G.r(24, 34)), 'hlm', { streets: C.streets(K, K.lx0, K.lz0, K.lx1, K.lz0 + 12), shops: false, signs: false }); K.blds.push(bar);
      const tw = C.bld(K.lx1 - 16, K.lz1 - 16, K.lx1, K.lz1, Math.round(G.r(42, 52)), 'hlm', { streets: C.streets(K, K.lx1 - 16, K.lz1 - 16, K.lx1, K.lz1), shops: false, signs: false }); K.blds.push(tw);
    } else if (layout === 1) { // two parallel bars
      for (const z0 of [K.lz0, K.lz1 - 12]) { const b = C.bld(K.lx0 + 3, z0, K.lx1 - 3, z0 + 12, Math.round(G.r(18, 30)), 'hlm', { streets: C.streets(K, K.lx0 + 3, z0, K.lx1 - 3, z0 + 12), shops: false, signs: false }); K.blds.push(b); }
    } else { // L-shaped
      const a = C.bld(K.lx0, K.lz0, K.lx0 + 12, K.lz1, Math.round(G.r(24, 32)), 'hlm', { streets: C.streets(K, K.lx0, K.lz0, K.lx0 + 12, K.lz1), shops: false, signs: false });
      const b = C.bld(K.lx0 + 12, K.lz1 - 12, K.lx1, K.lz1, Math.round(G.r(18, 26)), 'hlm', { streets: C.streets(K, K.lx0 + 12, K.lz1 - 12, K.lx1, K.lz1), shops: false, signs: false }); K.blds.push(a, b);
    }
    // entrance lights on the bars
    for (const b of K.blds) { const f = 'xXzZ'.split('').find(q => b.streets.indexOf(q) < 0) || 'z'; const [px, pz, nx, nz] = C.facePoint(b, f, 0.5); Gl.cbox(px + nx * 0.05 - 0.6, 2.4, pz + nz * 0.05 - 0.6, px + nx * 0.05 + 0.6, 2.6, pz + nz * 0.05 + 0.6, [0.8, 0.95, 1, 1.5]); World.lightsStatic.push({ x: px + nx * 1.5, y: 2.4, z: pz + nz * 1.5, r: 1, g: 1.2, b: 1.4, range: 8 }); }
    // courtyard: basketball court or parking + graffiti wall
    const free = K.blds.length ? K.blds : [];
    const q = (x0, z0, x1, z1) => !World.query(x0, z0, x1, z1, []).some(b => b.kind === 'bld');
    const cx = K.cx - 4, cz = K.cz + (layout === 1 ? 0 : 4);
    if (q(cx - 14, cz - 9, cx + 14, cz + 9)) {
      this.ground(cx - 14, cz - 8, cx + 14, cz + 8, GCELL.court, 28, CURB + 0.02);
      for (const x of [cx - 13, cx + 13]) { A.tube(x, CURB, cz, x, CURB + 3, cz, 0.08, [0.3, 0.3, 0.32, 0], 5); A.cbox(x - 0.05, CURB + 2.9, cz - 0.9, x + 0.05, CURB + 3.9, cz + 0.9, [0.85, 0.85, 0.85, 0]); World.addBox(x - 0.1, 0, cz - 0.1, x + 0.1, CURB + 3, cz + 0.1, 'pole'); }
      this.mast(cx, cz - 10, 9, [1.15, 1.1, 1.0], 22);
    } else this.lot(cx - 12, cz - 8, cx + 12, cz + 8, 0.5);
    const gx0 = K.lx0 + 3, gz = K.lz1 - 1; if (q(gx0, gz - 0.5, gx0 + 14, gz)) { A.box(gx0, 0, gz - 0.4, gx0 + 14, 2.6, gz, { faces: 'xXzZY', cell: CELL.graffiti, su: 12, sv: 12, col: [1, 1, 1, 0] }); World.addBox(gx0, 0, gz - 0.4, gx0 + 14, 2.6, gz, 'wall'); }
    for (let k = 0; k < 5; k++) { const x = G.r(K.lx0 + 3, K.lx1 - 3), z = G.r(K.lz0 + 3, K.lz1 - 3); if (q(x - 2.5, z - 2.5, x + 2.5, z + 2.5) && !World.query(x - 2, z - 2, x + 2, z + 2, []).some(b => b.kind === 'prop' || b.kind === 'pole')) this.tree(x, z, G.r(0.8, 1.1)); }
    // a burnt-out car
    if (G.chance(0.4)) { const x = K.lx0 + G.r(8, 30), z = K.lz0 + G.r(16, 28); if (q(x - 3, z - 2, x + 3, z + 2)) { A.cbox(x - 2.2, 0.3, z - 0.9, x + 2.2, 1.1, z + 0.9, [0.06, 0.05, 0.05, 0]); A.cbox(x - 1.2, 1.1, z - 0.8, x + 0.8, 1.6, z + 0.8, [0.05, 0.05, 0.05, 0]); World.addBox(x - 2.2, 0, z - 0.9, x + 2.2, 1.6, z + 0.9, 'prop'); } }
    this.curbParking(K, 0.5);
  },
  g_lant(C, K) {
    const A = C.B.atlas, Gl = C.B.glow;
    const B = this.rowBlock(C, K, ['lantern', 'lantern', 'plaster', 'lantern'], 9, 18, 13);
    const red = [1, 0.18, 0.1], gold = [1, 0.7, 0.2];
    for (const b of B) {
      // up-turned eaves on some roofs
      if (G.chance(0.45)) { const o = 0.9; A.cbox(b.x0 - o, b.h + 0.1, b.z0 - o, b.x1 + o, b.h + 0.45, b.z1 + o, [0.55, 0.12, 0.1, 0], 'xXzZYy'); A.box(b.x0 - o + 0.3, b.h + 0.45, b.z0 - o + 0.3, b.x1 + o - 0.3, b.h + 1.3, b.z1 + o - 0.3, { faces: 'xXzZY', cell: CELL.tiles, su: 3, sv: 3, col: [0.3, 0.55, 0.35, 0] }); for (const [x, z] of [[b.x0 - o, b.z0 - o], [b.x1 + o, b.z0 - o], [b.x0 - o, b.z1 + o], [b.x1 + o, b.z1 + o]]) A.obox(x, b.h + 0.6, z, 0.12, 0.35, 0.12, 0, [0.85, 0.65, 0.2, 0]); World.addBox(b.x0, b.h, b.z0, b.x1, b.h + 1.3, b.z1, 'prop', { nowalk: true }); b.noRoof = true; }
      for (const f of b.streets) { const L = (f === 'x' || f === 'X') ? b.z1 - b.z0 : b.x1 - b.x0; if (L < 6) continue; if (G.chance(0.55)) C.sign(b, f, G.r(0.2, 0.8), G.pick(['dragon', 'lotus']), 'blade', G.r(5, 8)); if (G.chance(0.5)) C.sign(b, f, G.r(0.2, 0.8), G.pick(['dimsum', 'the', 'ramen', 'karaoke']), 'flat', 4.6); }
    }
    // red lanterns strung across the streets around the block
    for (const [ax, az, bx, bz] of [[K.bx0 - RHW - 0.5, K.bz0 + 12, K.bx0 + 0.5, K.bz0 + 12], [K.bx0 + 14, K.bz0 - RHW - 0.5, K.bx0 + 14, K.bz0 + 0.5], [K.bx1 - 0.5, K.bz1 - 14, K.bx1 + RHW + 0.5, K.bz1 - 14], [K.bx0 + 20, K.bz1 - 0.5, K.bx0 + 20, K.bz1 + RHW + 0.5]]) {
      for (let s = 0; s < 3; s++) { const off = s * 6; const vx = ax === bx ? off : 0, vz = az === bz ? off : 0; this.bulbs(ax + vx, 8, az + vz, bx + vx, 8, bz + vz, 6, k => k % 2 ? red : gold, 0.28, 0.9); }
      World.lightsStatic.push({ x: (ax + bx) / 2, y: 7, z: (az + bz) / 2, r: 2.2, g: 0.6, b: 0.25, range: 12 });
    }
    // gate over the west entrance of the quarter
    if (K.i === 10 && K.j === 4) {
      const x = RX[10] + RHW + 4, z = RZ[5], c = [0.7, 0.12, 0.08, 0];
      for (const zz of [z - RHW - 1.2, z + RHW + 1.2]) { A.tube(x, CURB, zz, x, 8.6, zz, 0.45, c, 10); World.addBox(x - 0.45, 0, zz - 0.45, x + 0.45, 8.6, zz + 0.45, 'pole'); }
      A.cbox(x - 0.6, 7.6, z - RHW - 2.6, x + 0.6, 8.4, z + RHW + 2.6, c, 'xXzZYy'); A.box(x - 1.8, 8.4, z - RHW - 3.4, x + 1.8, 9.4, z + RHW + 3.4, { faces: 'xXzZY', cell: CELL.tiles, su: 3, sv: 3, col: [0.3, 0.55, 0.35, 0] });
      A.cbox(x - 0.62, 6.2, z - 2.4, x + 0.62, 7.4, z + 2.4, [0.9, 0.7, 0.2, 0]);
      for (const zz of [z - RHW - 1.2, z + RHW + 1.2]) { Gl.addGeo(sphereGeo(0.45, 8, 6), M4.compose(M4.create(), x + 0.8, 7.1, zz, 0, 0, 0), [1, 0.2, 0.1, 2.5]); Gl.addGeo(sphereGeo(0.45, 8, 6), M4.compose(M4.create(), x - 0.8, 7.1, zz, 0, 0, 0), [1, 0.2, 0.1, 2.5]); }
      World.lightsStatic.push({ x, y: 7, z, r: 2.6, g: 0.8, b: 0.3, range: 16 });
      World.spots.lanternGate = { x: x + 8, y: CURB, z };
    }
    if (K.i === 11 && K.j === 5) { // temple courtyard
      const tx = K.cx, tz = K.cz; this.ground(tx - 9, tz - 9, tx + 9, tz + 9, GCELL.tiles, 3, CURB + 0.02);
      A.addGeo(cylGeo(1.2, 1.4, 1.2, 8, true), M4.compose(M4.create(), tx, CURB, tz, 0, 0, 0), [0.35, 0.3, 0.25, 0]); Gl.cbox(tx - 0.3, CURB + 1.2, tz - 0.3, tx + 0.3, CURB + 1.5, tz + 0.3, [1, 0.5, 0.15, 3]); World.addBox(tx - 1.2, 0, tz - 1.2, tx + 1.2, CURB + 1.2, tz + 1.2, 'prop');
      World.lightsStatic.push({ x: tx, y: 2, z: tz, r: 2, g: 0.9, b: 0.3, range: 9, flick: 0.85 }); World.spots.temple = { x: tx, y: CURB, z: tz + 4 };
    }
    this.curbParking(K, 0.5);
  },
  stand(x0, z0, x1, z1, dir, steps, sh, sd) { // stepped stand rising toward dir ('z' = -z, 'Z' = +z, 'x', 'X')
    const A = this.C.B.atlas;
    for (let s = 0; s < steps; s++) {
      const y = CURB + (s + 1) * sh; let a0 = x0, a1 = x1, b0 = z0, b1 = z1;
      if (dir === 'z') { b1 = z1 - s * sd; } else if (dir === 'Z') { b0 = z0 + s * sd; } else if (dir === 'x') { a1 = x1 - s * sd; } else { a0 = x0 + s * sd; }
      World.addBox(a0, 0, b0, a1, y, b1, 'prop');
    }
    // one sloped surface with the seat rows
    const H = steps * sh, D = steps * sd;
    if (dir === 'z') A.quad(x0, CURB, z1, x1 - x0, 0, 0, 0, H, -D, [0, 0, (x1 - x0) / 24, 1], CELL.seats, [1, 1, 1, 0]);
    else if (dir === 'Z') A.quad(x1, CURB, z0, -(x1 - x0), 0, 0, 0, H, D, [0, 0, (x1 - x0) / 24, 1], CELL.seats, [1, 1, 1, 0]);
    else if (dir === 'x') A.quad(x1, CURB, z1, 0, 0, -(z1 - z0), -D, H, 0, [0, 0, (z1 - z0) / 24, 1], CELL.seats, [1, 1, 1, 0]);
    else A.quad(x0, CURB, z0, 0, 0, z1 - z0, D, H, 0, [0, 0, (z1 - z0) / 24, 1], CELL.seats, [1, 1, 1, 0]);
    return H;
  },
  g_stad(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    const px0 = R.cx - 52, px1 = R.cx + 52, pz0 = R.cz - 32, pz1 = R.cz + 32; // pitch
    this.ground(px0 - 4, pz0 - 4, px1 + 4, pz1 + 4, GCELL.runtrack, 8, CURB + 0.012);
    this.ground(px0, pz0, px1, pz1, GCELL.pitch, 12, CURB + 0.016);
    const L = (x0, z0, x1, z1) => this.ground(x0, z0, x1, z1, GCELL.plain, 1, CURB + 0.02, [0.95, 0.95, 0.95, 0]);
    L(px0 + 2, pz0 + 2, px1 - 2, pz0 + 2.15); L(px0 + 2, pz1 - 2.15, px1 - 2, pz1 - 2); L(px0 + 2, pz0 + 2, px0 + 2.15, pz1 - 2); L(px1 - 2.15, pz0 + 2, px1 - 2, pz1 - 2); L(R.cx - 0.08, pz0 + 2, R.cx + 0.08, pz1 - 2);
    for (const gx of [px0 + 2, px1 - 2]) { A.tube(gx, CURB, R.cz - 3.7, gx, CURB + 2.44, R.cz - 3.7, 0.06, [0.95, 0.95, 0.95, 0], 5); A.tube(gx, CURB, R.cz + 3.7, gx, CURB + 2.44, R.cz + 3.7, 0.06, [0.95, 0.95, 0.95, 0], 5); A.tube(gx, CURB + 2.44, R.cz - 3.7, gx, CURB + 2.44, R.cz + 3.7, 0.06, [0.95, 0.95, 0.95, 0], 5); }
    // four stands with corner gaps (entrances), back walls and roofs
    const steps = 10, sh = 0.75, sd = 1.3, D = steps * sd, gap = 7;
    const zN = pz0 - 5, zS = pz1 + 5, xW = px0 - 5, xE = px1 + 5;
    const H1 = this.stand(px0 + gap, zN - D, px1 - gap, zN, 'z', steps, sh, sd);
    this.stand(px0 + gap, zS, px1 - gap, zS + D, 'Z', steps, sh, sd);
    this.stand(xW - D, pz0 + gap, xW, pz1 - gap, 'x', steps, sh, sd);
    this.stand(xE, pz0 + gap, xE + D, pz1 - gap, 'X', steps, sh, sd);
    const wallC = [0.6, 0.6, 0.62, 0], top = CURB + H1;
    for (const [x0, z0, x1, z1] of [[px0 + gap, zN - D - 1, px1 - gap, zN - D], [px0 + gap, zS + D, px1 - gap, zS + D + 1], [xW - D - 1, pz0 + gap, xW - D, pz1 - gap], [xE + D, pz0 + gap, xE + D + 1, pz1 - gap]]) { A.box(x0, 0, z0, x1, top + 4, z1, { faces: 'xXzZY', cell: CELL.concrete, su: 8, sv: 8, col: wallC }); World.addBox(x0, 0, z0, x1, top + 4, z1, 'bld'); }
    const rc = [0.85, 0.85, 0.88, 0];
    A.cbox(px0 + gap, top + 6, zN - D - 1, px1 - gap, top + 6.4, zN - D * 0.35, rc, 'xXzZYy'); A.cbox(px0 + gap, top + 6, zS + D * 0.35, px1 - gap, top + 6.4, zS + D + 1, rc, 'xXzZYy');
    for (let x = px0 + gap + 4; x < px1 - gap; x += 12) for (const z of [zN - D - 0.5, zS + D + 0.5]) A.tube(x, top + 4, z, x, top + 6, z, 0.15, [0.5, 0.5, 0.52, 0], 5);
    Gl.cbox(px0 + gap + 2, top + 5.9, zN - D * 0.5, px1 - gap - 2, top + 6, zN - D * 0.5 + 0.3, [1, 1, 1.05, 1.5]); Gl.cbox(px0 + gap + 2, top + 5.9, zS + D * 0.5 - 0.3, px1 - gap - 2, top + 6, zS + D * 0.5, [1, 1, 1.05, 1.5]);
    // floodlight towers
    for (const [x, z] of [[px0 - 8, pz0 - 8], [px1 + 8, pz0 - 8], [px0 - 8, pz1 + 8], [px1 + 8, pz1 + 8]]) { A.tube(x, 0, z, x, 40, z, 0.6, [0.5, 0.52, 0.55, 0], 8); A.cbox(x - 3.5, 40, z - 0.6, x + 3.5, 44, z + 0.6, [0.2, 0.2, 0.22, 0]); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) Gl.cbox(x - 3 + c * 1.4, 40.4 + r * 1.2, z - 0.7, x - 2.2 + c * 1.4, 41.2 + r * 1.2, z + 0.7, [1.2, 1.2, 1.3, 4]); World.lightsStatic.push({ x: x + (x < R.cx ? 10 : -10), y: 34, z: z + (z < R.cz ? 10 : -10), r: 4.5, g: 4.5, b: 4.8, range: 60 }); World.addBox(x - 0.7, 0, z - 0.7, x + 0.7, 40, z + 0.7, 'pole', { noray: true }); }
    // giant screen above the north stand
    C.billboard({ x0: R.cx - 12, x1: R.cx + 12, z0: zN - D - 1, z1: zN - D, h: top + 4, streets: 'Z' }, 'Z', 'bb_tide', top + 4);
    this.roofSign(R.cx, top + 4, zS + D + 1, 0, 1, 'stade', 3);
    // parking around
    this.lot(R.lx0 + 2, R.lz0 + 2, R.lx0 + 26, R.lz1 - 2, 0.5); this.lot(R.lx1 - 26, R.lz0 + 2, R.lx1 - 2, R.lz1 - 2, 0.5);
    World.spots.stadium = { x: R.cx, y: CURB, z: R.cz }; World.spots.stadiumGate = { x: px0 + 3, y: CURB, z: zS + 2 };
  }
});

/* ---------- south: suburbs, flea market, hospital, university ---------- */
Object.assign(Districts, {
  g_subs(C, K) {
    const A = C.B.atlas;
    this.ground(K.lx0, K.lz0, K.lx1, K.lz1, GCELL.grass, 6, CURB + 0.011);
    // lots along the four sides: house set back behind a front garden, drive with a parking spot
    const sides = [['z', K.lx0, K.lz0, K.lx1, K.lz0], ['Z', K.lx0, K.lz1, K.lx1, K.lz1], ['x', K.lx0, K.lz0 + 13, K.lx0, K.lz1 - 13], ['X', K.lx1, K.lz0 + 13, K.lx1, K.lz1 - 13]];
    for (const [f, ax, az, bx, bz] of sides) {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / 12.5)); const nx = f === 'x' ? 1 : f === 'X' ? -1 : 0, nz = f === 'z' ? 1 : f === 'Z' ? -1 : 0; const tx = Math.abs(nz), tz = Math.abs(nx);
      for (let k = 0; k < n; k++) {
        const t0 = (k + 0.5) / n, cx = lerp(ax, bx, t0), cz = lerp(az, bz, t0); const w = G.r(8, 10), d = G.r(7.5, 9), set = 3.5;
        const hx = cx + nx * (set + d / 2), hz = cz + nz * (set + d / 2);
        const x0 = hx - (tx * w + Math.abs(nx) * d) / 2, x1 = hx + (tx * w + Math.abs(nx) * d) / 2, z0 = hz - (tz * w + Math.abs(nz) * d) / 2, z1 = hz + (tz * w + Math.abs(nz) * d) / 2;
        const front = f === 'z' ? 'z' : f === 'Z' ? 'Z' : f === 'x' ? 'x' : 'X';
        this.house(x0, z0, x1, z1, front, G.chance(0.75) ? 2 : 1);
        // drive + car spot beside the house
        const dx = cx + tx * (w / 2 + 2.2), dz = cz + tz * (w / 2 + 2.2);
        const dx0 = Math.min(dx - tx * 1.4 + nx * 0.2, dx + tx * 1.4 + nx * (set + d)), dx1 = Math.max(dx - tx * 1.4 + nx * 0.2, dx + tx * 1.4 + nx * (set + d)), dz0 = Math.min(dz - tz * 1.4 + nz * 0.2, dz + tz * 1.4 + nz * (set + d)), dz1 = Math.max(dz - tz * 1.4 + nz * 0.2, dz + tz * 1.4 + nz * (set + d));
        this.ground(dx0, dz0, dx1, dz1, GCELL.asphalt, 6, CURB + 0.015);
        if (G.chance(0.6)) this.park(dx + nx * 4, dz + nz * 4, nz !== 0 ? (nz > 0 ? 0 : Math.PI) : (nx > 0 ? Math.PI / 2 : -Math.PI / 2));
        // low fence along the sidewalk except the drive, a mailbox
        const fx0 = cx - tx * 6, fz0 = cz - tz * 6; const fcol = [0.9, 0.9, 0.88, 0];
        const fence = (x0, z0, x1, z1) => { A.cbox(Math.min(x0, x1) - (tz ? 0.04 : 0), CURB, Math.min(z0, z1) - (tx ? 0.04 : 0), Math.max(x0, x1) + (tz ? 0.04 : 0), CURB + 0.9, Math.max(z0, z1) + (tx ? 0.04 : 0), fcol); World.addBox(Math.min(x0, x1) - 0.05, 0, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, CURB + 0.9, Math.max(z0, z1) + 0.05, 'prop'); };
        fence(fx0 + nx * 0.3, fz0 + nz * 0.3, cx + tx * (w / 2 + 0.6) + nx * 0.3, cz + tz * (w / 2 + 0.6) + nz * 0.3);
        A.tube(cx + tx * (w / 2 + 0.3) + nx * 0.4, CURB, cz + tz * (w / 2 + 0.3) + nz * 0.4, cx + tx * (w / 2 + 0.3) + nx * 0.4, CURB + 1.1, cz + tz * (w / 2 + 0.3) + nz * 0.4, 0.04, [0.2, 0.2, 0.2, 0], 4);
        A.cbox(cx + tx * (w / 2 + 0.3) + nx * 0.4 - 0.2, CURB + 1.1, cz + tz * (w / 2 + 0.3) + nz * 0.4 - 0.2, cx + tx * (w / 2 + 0.3) + nx * 0.4 + 0.2, CURB + 1.4, cz + tz * (w / 2 + 0.3) + nz * 0.4 + 0.2, [0.25, 0.3, 0.5, 0]);
      }
    }
    // back gardens: trees, a pool sometimes
    for (let k = 0; k < 6; k++) { const x = G.r(K.lx0 + 16, K.lx1 - 16), z = G.r(K.lz0 + 16, K.lz1 - 16); if (!World.query(x - 2.5, z - 2.5, x + 2.5, z + 2.5, []).some(b => b.kind === 'bld' || b.kind === 'prop')) this.tree(x, z, G.r(0.9, 1.4)); }
    if (G.chance(0.5)) { const x = K.cx + G.r(-4, 4), z = K.cz + G.r(-4, 4); if (!World.query(x - 4, z - 2.5, x + 4, z + 2.5, []).some(b => b.kind === 'bld' || b.kind === 'prop')) { this.ground(x - 3.5, z - 2, x + 3.5, z + 2, GCELL.pond, 7, CURB + 0.02, [0.3, 1.6, 2.2, 0.3]); World.lightsStatic.push({ x, y: 0.5, z, r: 0.2, g: 0.8, b: 1.2, range: 6 }); } }
    this.curbParking(K, 0.3);
  },
  stall(x, z, along, col) {
    const A = this.C.B.atlas; const hw = along ? 1.8 : 1.2, hd = along ? 1.2 : 1.8;
    A.cbox(x - hw + 0.2, CURB, z - hd + 0.3, x + hw - 0.2, CURB + 0.9, z + hd - 0.3, [0.35, 0.26, 0.18, 0]);
    A.cbox(x - hw, CURB + 2.3, z - hd, x + hw, CURB + 2.42, z + hd, [col[0], col[1], col[2], 0], 'xXzZYy');
    for (const [px, pz] of [[-hw + 0.1, -hd + 0.1], [hw - 0.1, -hd + 0.1], [-hw + 0.1, hd - 0.1], [hw - 0.1, hd - 0.1]]) A.tube(x + px, CURB, z + pz, x + px, CURB + 2.3, z + pz, 0.04, [0.2, 0.2, 0.2, 0], 4);
    for (let k = 0; k < 4; k++) A.cbox(x + G.r(-hw + 0.4, hw - 0.8), CURB + 0.9, z + G.r(-hd + 0.5, hd - 0.9), x + G.r(-hw + 0.4, hw - 0.8) + 0.4, CURB + 0.9 + G.r(0.2, 0.6), z + G.r(-hd + 0.5, hd - 0.9) + 0.4, G.pick([[0.7, 0.3, 0.2, 0], [0.3, 0.4, 0.6, 0], [0.8, 0.7, 0.3, 0], [0.4, 0.6, 0.3, 0]]));
    this.C.B.glow.cbox(x - 0.1, CURB + 2.0, z - 0.1, x + 0.1, CURB + 2.25, z + 0.1, [1, 0.72, 0.35, 2]);
    World.addBox(x - hw + 0.2, 0, z - hd + 0.3, x + hw - 0.2, CURB + 0.9, z + hd - 0.3, 'prop'); World.addBox(x - hw, CURB + 2.3, z - hd, x + hw, CURB + 2.42, z + hd, 'awning');
  },
  shack(x0, z0, x1, z1, h) {
    const A = this.C.B.atlas, c = G.pick([[0.7, 0.45, 0.3], [0.4, 0.5, 0.55], [0.55, 0.55, 0.5], [0.6, 0.35, 0.3]]);
    A.box(x0, CURB, z0, x1, h, z1, { faces: 'xXzZ', cell: CELL.corrugated, su: 3, sv: 3, col: [c[0], c[1], c[2], 0] });
    A.quad(x0 - 0.3, h + 0.5, z0 - 0.3, 0, 0, z1 - z0 + 0.6, x1 - x0 + 0.6, -0.5, 0, [0, 0, (z1 - z0) / 3, (x1 - x0) / 3], CELL.corrugated, [0.5, 0.5, 0.48, 0]);
    World.addBox(x0, 0, z0, x1, h + 0.5, z1, 'bld');
  },
  g_flea(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.gravel, 5);
    const cols = [[0.7, 0.1, 0.12], [0.1, 0.4, 0.3], [0.8, 0.55, 0.1], [0.15, 0.25, 0.55], [0.55, 0.12, 0.35], [0.1, 0.45, 0.55], [0.85, 0.35, 0.15]];
    // aisles of stalls under festoons
    for (let z = R.lz0 + 10; z < R.lz1 - 34; z += 12) {
      for (let x = R.lx0 + 8; x < R.lx1 - 8; x += 5) if (G.chance(0.82)) this.stall(x, z, true, G.pick(cols));
      this.bulbs(R.lx0 + 6, 3.6, z + 6, R.lx1 - 6, 3.6, z + 6, 34, k => [[1, 0.75, 0.35], [1, 0.4, 0.3], [0.5, 0.9, 1]][k % 3], 0.06, 0.5);
      World.lightsStatic.push({ x: R.cx - 25, y: 3, z: z + 6, r: 1.6, g: 1.1, b: 0.6, range: 14 }); World.lightsStatic.push({ x: R.cx + 25, y: 3, z: z + 6, r: 1.6, g: 1.1, b: 0.6, range: 14 });
    }
    // shacks and a scrapyard in the south part
    for (let x = R.lx0 + 6; x < R.cx - 6; x += G.r(6, 9)) this.shack(x, R.lz1 - 16, x + G.r(4, 6), R.lz1 - 10, G.r(2.6, 3.4));
    const sx0 = R.cx + 4, sz0 = R.lz1 - 30;
    for (let k = 0; k < 18; k++) { const x = G.r(sx0, R.lx1 - 6), z = G.r(sz0, R.lz1 - 4); const layers = G.i(1, 3); for (let l = 0; l < layers; l++) { const y = CURB + l * 1.2; const c = G.pick([[0.3, 0.1, 0.1], [0.15, 0.2, 0.3], [0.35, 0.3, 0.25], [0.2, 0.2, 0.2], [0.4, 0.35, 0.1]]); A.obox(x, y + 0.6, z, 2.1, 0.6, 0.9, G.r(-0.4, 0.4) + (l % 2) * 1.5, [c[0], c[1], c[2], 0]); } World.addBox(x - 2, 0, z - 2, x + 2, CURB + layers * 1.2, z + 2, 'prop'); }
    const cx = R.lx1 - 12, cz = sz0 + 4; A.tube(cx, 0, cz, cx, 16, cz, 0.35, [0.8, 0.6, 0.1, 0], 6); A.tube(cx, 16, cz, cx - 14, 13, cz + 6, 0.3, [0.8, 0.6, 0.1, 0], 6); A.tube(cx - 14, 13, cz + 6, cx - 14, 6, cz + 6, 0.04, [0.1, 0.1, 0.1, 0], 3); A.cbox(cx - 15, 5.2, cz + 5, cx - 13, 6, cz + 7, [0.25, 0.25, 0.25, 0]); World.addBox(cx - 0.4, 0, cz - 0.4, cx + 0.4, 16, cz + 0.4, 'pole');
    // corrugated walls around with two openings
    const wh = 2.6, wc = [0.62, 0.6, 0.55, 0];
    const cw = (x0, z0, x1, z1) => { A.box(x0, 0, z0, x1, wh, z1, { faces: 'xXzZY', cell: CELL.corrugated, su: 3, sv: 3, col: wc }); World.addBox(x0, 0, z0, x1, wh, z1, 'wall'); };
    cw(R.lx0, R.lz0, R.cx - 5, R.lz0 + 0.3); cw(R.cx + 5, R.lz0, R.lx1, R.lz0 + 0.3); cw(R.lx0, R.lz1 - 0.3, R.lx1, R.lz1); cw(R.lx0, R.lz0, R.lx0 + 0.3, R.cz - 5); cw(R.lx0, R.cz + 5, R.lx0 + 0.3, R.lz1); cw(R.lx1 - 0.3, R.lz0, R.lx1, R.lz1 - 21); cw(R.lx1 - 0.3, R.lz1 - 11, R.lx1, R.lz1); // east gate by the scrapyard
    this.mast(R.cx, R.lz1 - 22, 12, [1.25, 0.9, 0.5], 24);
    World.spots.flea = { x: R.cx, y: CURB, z: R.lz0 + 16 }; World.spots.scrapyard = { x: (sx0 + R.lx1) / 2, y: CURB, z: R.lz1 - 16 };
  },
  g_hosp(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.grass, 6, CURB + 0.011);
    const a = C.bld(R.lx0 + 8, R.lz0 + 8, R.lx1 - 8, R.lz0 + 28, 27, 'hospital', { streets: 'z', shops: false, signs: false, col: [0.95, 0.96, 0.97], roofProps: false });
    const b = C.bld(R.cx - 11, R.lz0 + 28, R.cx + 11, R.lz1 - 26, 19, 'hospital', { shops: false, signs: false, col: [0.93, 0.94, 0.96] });
    // helipad on the main wing
    const hx = R.lx1 - 22, hz = R.lz0 + 18, hy = 27.02; Gl.addGeo(cylGeo(7, 7, 0.02, 32, true), M4.compose(M4.create(), hx, hy, hz, 0, 0, 0), [0.05, 0.25, 0.1, 0.2]);
    for (let k = 0; k < 16; k++) { const an = k / 16 * TAU; Gl.cbox(hx + Math.cos(an) * 6.6 - 0.12, hy, hz + Math.sin(an) * 6.6 - 0.12, hx + Math.cos(an) * 6.6 + 0.12, hy + 0.15, hz + Math.sin(an) * 6.6 + 0.12, [0.3, 1, 0.4, 3]); }
    Gl.cbox(hx - 2.2, hy + 0.01, hz - 3, hx - 1.4, hy + 0.03, hz + 3, [1, 1, 1, 1.2]); Gl.cbox(hx + 1.4, hy + 0.01, hz - 3, hx + 2.2, hy + 0.03, hz + 3, [1, 1, 1, 1.2]); Gl.cbox(hx - 1.4, hy + 0.01, hz - 0.4, hx + 1.4, hy + 0.03, hz + 0.4, [1, 1, 1, 1.2]);
    World.spots.helipad = { x: hx, y: 27, z: hz };
    this.roofSign(R.lx0 + 30, 27, R.lz0 + 9, 0, -1, 'hopital', 3);
    // big red cross on the facade
    const S = Tex.signs.cross; if (S) { const w = 3.2; C.B.neon.quad(R.lx0 + 14 - w / 2, 18, R.lz0 + 7.9, w, 0, 0, 0, w, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [1, 0.25, 0.3, 0.6]); }
    // emergency entrance
    const ez = R.lz1 - 26; A.cbox(R.cx - 8, 4, ez, R.cx + 8, 4.4, ez + 9, [0.85, 0.85, 0.88, 0], 'xXzZYy'); World.addBox(R.cx - 8, 4, ez, R.cx + 8, 4.4, ez + 9, 'awning');
    for (const [x, z] of [[R.cx - 7.5, ez + 8.5], [R.cx + 7.5, ez + 8.5]]) { A.tube(x, CURB, z, x, 4, z, 0.15, [0.6, 0.6, 0.62, 0], 6); World.addBox(x - 0.2, 0, z - 0.2, x + 0.2, 4, z + 0.2, 'pole'); }
    this.sign(R.cx, 4.6, ez + 9, 0, 1, 'urgences', 1.1); Gl.cbox(R.cx - 7, 3.95, ez + 1, R.cx + 7, 4.0, ez + 8, [0.9, 0.95, 1, -0.45], 'y'); World.lightsStatic.push({ x: R.cx, y: 3.5, z: ez + 5, r: 2, g: 2.1, b: 2.3, range: 14 });
    this.ground(R.cx - 10, ez, R.cx + 10, R.lz1, GCELL.asphalt, 8, CURB + 0.015);
    World.spots.emergency = { x: R.cx, y: CURB, z: ez + 6 };
    for (const x of [R.cx - 4, R.cx + 4]) { const z = ez + 14; A.cbox(x - 1.1, 0.35, z - 2.8, x + 1.1, 2.9, z + 2.8, [0.95, 0.95, 0.95, 0]); A.cbox(x - 1.12, 1.2, z - 2.82, x + 1.12, 1.6, z + 2.82, [0.85, 0.15, 0.15, 0], 'xXzZ'); Gl.cbox(x - 0.8, 2.9, z + 1.6, x + 0.8, 3.1, z + 2, [0.3, 0.5, 1.2, 2]); World.addBox(x - 1.1, 0, z - 2.8, x + 1.1, 2.9, z + 2.8, 'cont'); }
    this.lot(R.lx0 + 4, R.lz0 + 34, R.cx - 16, R.lz1 - 4, 0.55); this.lot(R.cx + 16, R.lz0 + 34, R.lx1 - 4, R.lz1 - 4, 0.55);
  },
  g_univ(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    this.ground(R.lx0, R.lz0, R.lx1, R.lz1, GCELL.grass, 7, CURB + 0.011);
    const qx0 = R.lx0 + 26, qx1 = R.lx1 - 50, qz0 = R.lz0 + 22, qz1 = R.lz1 - 22; // central quad
    const P = (x0, z0, x1, z1) => this.ground(x0, z0, x1, z1, GCELL.tiles, 4, CURB + 0.018);
    P(qx0, (qz0 + qz1) / 2 - 2, qx1, (qz0 + qz1) / 2 + 2); P((qx0 + qx1) / 2 - 2, qz0, (qx0 + qx1) / 2 + 2, qz1); P(R.lx0, (qz0 + qz1) / 2 - 2, qx0, (qz0 + qz1) / 2 + 2);
    // library with columns and a dome on the north side of the quad
    const lx = (qx0 + qx1) / 2; const lib = C.bld(lx - 18, R.lz0 + 4, lx + 18, qz0 - 3, 14, 'stone', { shops: false, signs: false, col: [0.9, 0.87, 0.8], roofProps: false });
    A.addGeo(sphereGeo(7, 16, 8, 1), M4.compose(M4.create(), lx, 14, (R.lz0 + 4 + qz0 - 3) / 2, 0, 0, 0), [0.3, 0.42, 0.4, 0]);
    for (let k = -4; k <= 4; k++) A.tube(lx + k * 3.2, CURB, qz0 - 1.8, lx + k * 3.2, 11, qz0 - 1.8, 0.4, [0.92, 0.9, 0.85, 0], 10);
    A.cbox(lx - 15, 11, qz0 - 3, lx + 15, 12.2, qz0 - 0.5, [0.9, 0.87, 0.8, 0], 'xXzZYy'); World.addBox(lx - 15, 11, qz0 - 3, lx + 15, 12.2, qz0 - 0.5, 'awning');
    this.sign(lx, 12.4, qz0 - 0.5, 0, 1, 'univ', 1.3);
    World.spots.library = { x: lx, y: CURB, z: qz0 + 2 };
    // faculty buildings around the quad
    const b1 = C.bld(qx0, qz1 + 3, qx0 + 34, R.lz1 - 4, 16, 'brick2', { shops: false, signs: false });
    const b2 = C.bld(qx1 - 34, qz1 + 3, qx1, R.lz1 - 4, 18, 'office', { shops: false, signs: false });
    const b3 = C.bld(R.lx0 + 4, qz0, qx0 - 4, (qz0 + qz1) / 2 - 5, 13, 'warehouse', { shops: false, signs: false });
    // clock tower
    const tx = qx0 - 12, tz = qz1 - 4; const tw = C.bld(tx - 3, tz - 3, tx + 3, tz + 3, 30, 'brick', { shops: false, signs: false, roofProps: false }); A.addGeo(cylGeo(4.4, 0.1, 5, 4, true), M4.compose(M4.create(), tx, 30, tz, 0, Math.PI / 4, 0), [0.3, 0.35, 0.35, 0]);
    Gl.addGeo(cylGeo(1.6, 1.6, 0.12, 24, true), M4.compose(M4.create(), tx, 26, tz + 3.05, Math.PI / 2, 0, 0), [1, 0.95, 0.8, 1.8]);
    World.spots.clocktower = { x: tx, y: 30, z: tz };
    // sports ground on the east
    const sx0 = R.lx1 - 46, sx1 = R.lx1 - 4, sz0 = R.lz0 + 6, sz1 = R.lz1 - 6;
    this.ground(sx0, sz0, sx1, sz1, GCELL.runtrack, 8, CURB + 0.014); this.ground(sx0 + 5, sz0 + 5, sx1 - 5, sz1 - 5, GCELL.pitch, 10, CURB + 0.017);
    for (const [x, z] of [[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]]) this.mast(x, z, 16, [1.15, 1.15, 1.2], 30);
    // trees & lamps along the quad
    for (let x = qx0 + 4; x < qx1; x += 9) for (const z of [qz0 + 3, qz1 - 3]) { this.tree(x, z, G.r(0.9, 1.2)); }
    for (let x = qx0 + 8; x < qx1; x += 18) for (const z of [(qz0 + qz1) / 2 - 4, (qz0 + qz1) / 2 + 4]) { C.lampPost(x, z, 4.2, [1.1, 0.95, 0.75]); if (G.chance(0.6)) this.bench(x + 4, z, true); }
    World.spots.campus = { x: lx, y: CURB, z: (qz0 + qz1) / 2 };
  }
});

/* ---------- waterfront: marina, shipyard, ferry terminal, beach + amusement pier ---------- */
Object.assign(Districts, {
  deckPier(x0, z0, x1, z1, rails = true) { // walkable wooden deck over the water
    const A = this.C.B.atlas; A.box(x0, -0.35, z0, x1, 0, z1, { faces: 'xXzZY', cell: CELL.wood, su: 4, sv: 4, col: [0.8, 0.7, 0.6, 0], top: { cell: CELL.wood, su: 4, sv: 4, col: [0.72, 0.62, 0.52, 0] } });
    World.addBox(x0, -0.35, z0, x1, 0, z1, 'pier');
    const along = (z1 - z0) > (x1 - x0);
    if (along) { for (let z = z0 + 3; z < z1; z += 6) for (const x of [x0 + 0.3, x1 - 0.3]) A.tube(x, WATER_Y - 2, z, x, 0, z, 0.18, [0.25, 0.2, 0.16, 0], 5); }
    else { for (let x = x0 + 3; x < x1; x += 6) for (const z of [z0 + 0.3, z1 - 0.3]) A.tube(x, WATER_Y - 2, z, x, 0, z, 0.18, [0.25, 0.2, 0.16, 0], 5); }
    if (rails) { const c = [0.75, 0.75, 0.72, 0]; if (along) for (const x of [x0 + 0.05, x1 - 0.05]) { A.tube(x, 1.0, z0, x, 1.0, z1, 0.04, c, 4); for (let z = z0; z <= z1; z += 3) A.tube(x, 0, z, x, 1.0, z, 0.04, c, 4); World.addBox(x - 0.05, 0, z0, x + 0.05, 1.0, z1, 'wall'); } else for (const z of [z0 + 0.05, z1 - 0.05]) { A.tube(x0, 1.0, z, x1, 1.0, z, 0.04, c, 4); for (let x = x0; x <= x1; x += 3) A.tube(x, 0, z, x, 1.0, z, 0.04, c, 4); World.addBox(x0, 0, z - 0.05, x1, 1.0, z + 0.05, 'wall'); } }
  },
  yacht(x, z, yaw, len, sail) {
    const A = this.C.B.atlas, Gl = this.C.B.glow; const c = G.pick([[0.95, 0.95, 0.95], [0.9, 0.92, 0.95], [0.2, 0.25, 0.4], [0.75, 0.15, 0.12]]);
    const y = WATER_Y + 0.55; A.obox(x, y, z, len * 0.32, 0.7, len / 2, yaw, [c[0], c[1], c[2], 0]); A.obox(x + Math.sin(yaw) * len * 0.45, y + 0.2, z + Math.cos(yaw) * len * 0.45, len * 0.18, 0.5, len * 0.12, yaw, [c[0], c[1], c[2], 0]);
    A.obox(x - Math.sin(yaw) * len * 0.08, y + 1.0, z - Math.cos(yaw) * len * 0.08, len * 0.22, 0.4, len * 0.2, yaw, [0.9, 0.9, 0.88, 0]);
    Gl.cbox(x - Math.sin(yaw) * len * 0.08 - 0.3, y + 1.1, z - Math.cos(yaw) * len * 0.08 - 0.3, x - Math.sin(yaw) * len * 0.08 + 0.3, y + 1.3, z - Math.cos(yaw) * len * 0.08 + 0.3, [1, 0.8, 0.5, G.chance(0.4) ? 1.5 : 0.1]);
    if (sail) { const mh = len * 1.2; A.tube(x, y + 0.7, z, x, y + 0.7 + mh, z, 0.07, [0.8, 0.8, 0.82, 0], 4); Gl.cbox(x - 0.1, y + 0.7 + mh, z - 0.1, x + 0.1, y + 0.9 + mh, z + 0.1, [1, 1, 1, 2.5]); A.tube(x, y + 0.7 + mh, z, x + Math.sin(yaw) * len * 0.45, y + 0.9, z + Math.cos(yaw) * len * 0.45, 0.015, [0.3, 0.3, 0.3, 0], 3); }
    const hx = Math.abs(Math.cos(yaw)) * len * 0.32 + Math.abs(Math.sin(yaw)) * len / 2, hz = Math.abs(Math.sin(yaw)) * len * 0.32 + Math.abs(Math.cos(yaw)) * len / 2;
    World.addBox(x - hx * 0.9, WATER_Y, z - hz * 0.9, x + hx * 0.9, y + 0.7, z + hz * 0.9, 'cont');
  },
  g_marina(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    // yacht club with a lit terrace, restaurants, parking
    const club = C.bld(R.lx0 + 6, R.lz1 - 20, R.lx0 + 40, R.lz1 - 2, 8, 'plaster', { streets: 'Z', col: [0.95, 0.93, 0.88], signs: false });
    A.cbox(R.lx0 + 6, 4, R.lz1 - 2, R.lx0 + 40, 4.3, R.lz1 + 1.5, [0.1, 0.25, 0.45, 0], 'xXzZYy'); World.addBox(R.lx0 + 6, 4, R.lz1 - 2, R.lx0 + 40, 4.3, R.lz1 + 1.5, 'awning');
    this.bulbs(R.lx0 + 6, 4, R.lz1 + 1.4, R.lx0 + 40, 4, R.lz1 + 1.4, 24, [1, 0.8, 0.45], 0.06, 0.3);
    this.sign(R.lx0 + 23, 5.2, R.lz1 - 2, 0, 1, 'marina', 1.3);
    const rest = C.bld(R.lx1 - 30, R.lz1 - 16, R.lx1 - 4, R.lz1 - 2, 7, 'plaster', { streets: 'ZX', col: [0.85, 0.75, 0.6] });
    this.lot(R.lx0 + 4, R.lz0 + 4, R.lx1 - 4, R.lz1 - 26, 0.5);
    for (let x = R.lx0 + 5; x < R.lx1; x += 11) this.palm(x, R.lz1 + 1.5, G.r(6, 8));
    // promenade on the quay and pontoons with boats
    this.ground(R.bx0, 144, R.bx1, WATER_Z, GCELL.deck, 4, 0.012);
    for (let x = R.bx0 + 6; x < R.bx1; x += 16) C.lampPost(x, 150, 4, [1.1, 0.85, 0.55]);
    for (let k = 0; k < 4; k++) {
      const px = R.bx0 + 12 + k * 24; this.deckPier(px - 1.5, WATER_Z - 0.5, px + 1.5, WATER_Z + 58, false);
      for (let z = WATER_Z + 6; z < WATER_Z + 56; z += 8) { if (G.chance(0.8)) this.yacht(px - 4.2, z, 0, G.r(7, 11), G.chance(0.6)); if (G.chance(0.8)) this.yacht(px + 4.2, z + 3, 0, G.r(7, 11), G.chance(0.6)); }
      C.lampPost(px, WATER_Z + 57, 3.2, [1, 0.8, 0.55]);
    }
    // harbour light at the end of a stone jetty
    const jx = R.bx1 - 8; A.box(jx - 3, WATER_Y - 2, WATER_Z, jx + 3, 0.4, WATER_Z + 70, { faces: 'xXzZY', cell: CELL.rough, su: 5, sv: 5, col: [0.55, 0.55, 0.55, 0] }); World.addBox(jx - 3, WATER_Y - 2, WATER_Z - 1, jx + 3, 0.4, WATER_Z + 70, 'pier');
    this.cyl(jx, 0.4, WATER_Z + 67, 1.1, 0.9, 7, 10, CELL.plain, [0.9, 0.2, 0.15, 0]); Gl.cbox(jx - 0.5, 7.4, WATER_Z + 66.5, jx + 0.5, 8.2, WATER_Z + 67.5, [0.2, 1, 0.3, 4]); World.lightsStatic.push({ x: jx, y: 8, z: WATER_Z + 67, r: 0.5, g: 2.5, b: 0.8, range: 20 }); World.addBox(jx - 1.1, 0, WATER_Z + 66, jx + 1.1, 7.4, WATER_Z + 68, 'prop');
    World.spots.marina = { x: R.bx0 + 36, y: 0, z: WATER_Z + 30 }; World.spots.marinaClub = { x: R.lx0 + 23, y: CURB, z: R.lz1 + 3 };
  },
  g_yard(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    for (let k = 0; k < 2; k++) { const x0 = R.lx0 + 6 + k * 70, s = C.bld(x0, R.lz0 + 4, x0 + 58, R.lz1 - 4, 21, 'industrial', { streets: 'Z', shops: false, signs: false, col: [0.55, 0.6, 0.64] }); A.box(x0 + 14, 0, R.lz1 - 3.96, x0 + 44, 16, R.lz1 - 3.9, { faces: 'Z', cell: CELL.shutter, su: 6, sv: 6, col: [0.6, 0.62, 0.66, 0] }); Gl.cbox(x0 + 20, 17, R.lz1 - 3.9, x0 + 38, 17.4, R.lz1 - 3.5, [1, 0.8, 0.5, 2]); World.lightsStatic.push({ x: x0 + 29, y: 16, z: R.lz1 - 1, r: 2, g: 1.5, b: 0.9, range: 18 }); }
    // slipway with a hull under construction, on the quay and out over the water
    const hx = -212, hz0 = 146, hz1 = 236, hw = 11;
    A.box(hx - hw - 4, WATER_Y - 3, hz0, hx + hw + 4, -0.02, WATER_Z + 70, { faces: 'xXY', cell: CELL.concrete, su: 8, sv: 8, col: [0.5, 0.5, 0.5, 0] }); World.addBox(hx - hw - 4, WATER_Y - 3, WATER_Z - 1, hx + hw + 4, 0, WATER_Z + 70, 'pier');
    for (let z = hz0; z < hz1; z += 3) { const t = (z - hz0) / (hz1 - hz0); const taper = t > 0.8 ? 1 - (t - 0.8) * 3.2 : t < 0.08 ? 0.7 + t * 3.75 : 1; const w = hw * Math.max(0.3, taper);
      A.box(hx - w, 1.2, z, hx + w, 5.5, z + 3, { faces: 'xX', cell: CELL.metal, su: 3, sv: 3, col: [0.55, 0.12, 0.1, 0] }); A.box(hx - w, 5.5, z, hx + w, 15, z + 3, { faces: 'xXY', cell: CELL.metal, su: 3, sv: 3, col: [0.42, 0.45, 0.48, 0], top: { cell: CELL.metal, su: 4, sv: 4, col: [0.35, 0.36, 0.38, 0] } }); }
    World.addBox(hx - hw, 0, hz0, hx + hw, 15, hz1 - 10, 'bld'); World.addBox(hx - hw * 0.5, 0, hz1 - 10, hx + hw * 0.5, 15, hz1, 'bld');
    A.box(hx - hw, 1.2, hz0 - 0.1, hx + hw, 15, hz0, { faces: 'z', cell: CELL.metal, su: 3, sv: 3, col: [0.42, 0.45, 0.48, 0] });
    for (let z = hz0 + 4; z < hz1 - 12; z += 6) for (const s of [-1, 1]) { A.tube(hx + s * (hw + 1.5), 0, z, hx + s * (hw + 1.5), 16, z, 0.06, [0.6, 0.55, 0.3, 0], 4); for (let y = 3; y < 16; y += 3.2) A.tube(hx + s * (hw + 1.5), y, z, hx + s * (hw + 1.5), y, z + 6, 0.05, [0.6, 0.55, 0.3, 0], 3); }
    World.spots.hull = { x: hx, y: 15, z: (hz0 + hz1) / 2 };
    C.ladder(hx + 4, hz0, 0, -1, 0, 15, null); World.spots.hullLadder = { x: hx + 4, y: 0, z: hz0 - 1.5 }; // workers' ladder up the stern
    // Goliath gantry crane over the slipway
    const gy = 52, gz = 160, c = [0.95, 0.72, 0.1, 0];
    for (const lx of [hx - 36, hx + 36]) { A.cbox(lx - 1.2, 0, gz - 6, lx + 1.2, gy, gz - 3.6, c); A.cbox(lx - 1.2, 0, gz + 3.6, lx + 1.2, gy, gz + 6, c); World.addBox(lx - 1.2, 0, gz - 6, lx + 1.2, gy, gz - 3.6, 'prop'); World.addBox(lx - 1.2, 0, gz + 3.6, lx + 1.2, gy, gz + 6, 'prop'); }
    A.cbox(hx - 38, gy, gz - 5, hx + 38, gy + 6, gz + 5, c, 'xXzZYy'); A.cbox(hx - 6, gy - 3, gz - 3, hx + 6, gy, gz + 3, [0.9, 0.9, 0.88, 0]);
    Gl.cbox(hx - 30, gy - 0.1, gz - 0.3, hx + 30, gy, gz + 0.3, [1, 0.95, 0.85, 1.6]); World.lightsStatic.push({ x: hx, y: gy - 2, z: gz, r: 1.5, g: 1.4, b: 1.2, range: 34 });
    for (let k = 0; k < 6; k++) C.container(G.r(R.bx0 + 8, hx - hw - 12), 0, G.r(146, 166), G.chance(0.5) ? 0 : Math.PI / 2, G.pick(PAL.container));
    for (let k = 0; k < 4; k++) { const x = G.r(hx + hw + 10, R.bx1 - 8), z = G.r(148, 166); for (let l = 0; l < G.i(3, 8); l++) A.cbox(x - 3, l * 0.25, z - 1.2, x + 3, l * 0.25 + 0.2, z + 1.2, [0.3, 0.3, 0.32, 0]); World.addBox(x - 3, 0, z - 1.2, x + 3, 2, z + 1.2, 'prop'); }
    for (const x of [R.bx0 + 20, R.bx1 - 20]) this.mast(x, 158, 18, [1.3, 0.9, 0.5], 32);
    World.spots.shipyard = { x: R.cx, y: 0, z: 158 };
  },
  g_ferry(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    const t = C.bld(R.lx0 + 10, R.lz0 + 6, R.lx1 - 10, R.lz1 - 8, 12, 'office', { streets: 'Z', shops: true, col: [0.9, 0.95, 1] });
    this.roofSign(R.cx, 12, R.lz1 - 9, 0, 1, 'garemar', 2.6);
    this.ground(R.bx0, 144, R.bx1, WATER_Z, GCELL.tiles, 5, 0.012);
    // queueing lanes
    for (let k = 0; k < 4; k++) { const z = 148 + k * 4.5; this.ground(R.bx0 + 4, z, R.bx0 + 50, z + 0.15, GCELL.plain, 1, 0.02, [0.95, 0.85, 0.25, 0]); this.park(R.bx0 + 12 + k * 6, z + 2.2, Math.PI / 2); }
    // the ferry: hull, promenade deck (walkable) and superstructure, funnel
    const fx0 = R.bx0 + 18, fx1 = R.bx1 + 10, fz0 = WATER_Z + 6, fz1 = WATER_Z + 28, dy = 4;
    A.box(fx0, WATER_Y - 2, fz0, fx1, dy, fz1, { faces: 'xXzZ', cell: CELL.metal, su: 4, sv: 4, col: [0.92, 0.92, 0.94, 0] }); A.cbox(fx0 - 0.02, WATER_Y - 2, fz0 - 0.02, fx1 + 0.02, 0.2, fz1 + 0.02, [0.1, 0.25, 0.5, 0], 'xXzZ');
    A.box(fx0, dy - 0.02, fz0, fx1, dy, fz1, { faces: 'Y', top: { cell: CELL.wood, su: 4, sv: 4, col: [0.6, 0.55, 0.5, 0] } }); World.addBox(fx0, WATER_Y - 2, fz0, fx1, dy, fz1, 'pier');
    const sx0 = fx0 + 10, sx1 = fx1 - 16, sz0 = fz0 + 3, sz1 = fz1 - 3;
    A.box(sx0, dy, sz0, sx1, dy + 9, sz1, { faces: 'xXzZY', cell: CELL.hospital, su: 24, sv: 25.6, uvBase: dy - 1, col: [0.98, 0.98, 1, 0.9], top: { cell: CELL.roof, su: 8, sv: 8, col: [0.7, 0.7, 0.72, 0] } }); World.addBox(sx0, dy, sz0, sx1, dy + 9, sz1, 'bld');
    A.box(sx1 - 16, dy + 9, sz0 + 2, sx1 - 2, dy + 12, sz1 - 2, { faces: 'xXzZY', cell: CELL.office, su: 24, sv: 25.6, col: [1, 1, 1, 0.9] }); World.addBox(sx1 - 16, dy + 9, sz0 + 2, sx1 - 2, dy + 12, sz1 - 2, 'bld');
    this.cyl((sx0 + sx1) / 2, dy + 9, (sz0 + sz1) / 2, 2.6, 2.2, 7, 12, CELL.plain, [0.9, 0.9, 0.9, 0]); A.addGeo(cylGeo(2.4, 2.3, 1.4, 12, false), M4.compose(M4.create(), (sx0 + sx1) / 2, dy + 13.5, (sz0 + sz1) / 2, 0, 0, 0), [0.8, 0.15, 0.12, 0]);
    for (const x of [fx0 + 1, fx1 - 1]) Gl.cbox(x - 0.2, dy + 1, fz0 - 0.2, x + 0.2, dy + 1.4, fz0 + 0.2, x < R.cx + 30 ? [1, 0.1, 0.1, 3] : [0.1, 1, 0.2, 3]);
    this.bulbs(fx0 + 2, dy + 15, (fz0 + fz1) / 2, (sx0 + sx1) / 2, dy + 16, (fz0 + fz1) / 2, 14, [1, 0.9, 0.6], 0.07, 0.3); this.bulbs((sx0 + sx1) / 2, dy + 16, (fz0 + fz1) / 2, fx1 - 2, dy + 15, (fz0 + fz1) / 2, 14, [1, 0.9, 0.6], 0.07, 0.3);
    A.tube((sx0 + sx1) / 2 + 8, dy + 12, (fz0 + fz1) / 2, (sx0 + sx1) / 2 + 8, dy + 17, (fz0 + fz1) / 2, 0.1, [0.8, 0.8, 0.8, 0], 5);
    for (const x of [fx0 + 3, fx1 - 3]) for (const z of [fz0 + 0.1, fz1 - 0.1]) { A.tube(x, dy, z, x + (x < R.cx ? 30 : -30), dy, z, 0.001, [0, 0, 0, 0], 3); }
    // deck rails, open where the gangway lands
    const gx = fx0 + 6;
    for (const z of [fz0 + 0.1, fz1 - 0.1]) {
      const spans = z < fz0 + 1 ? [[fx0, gx - 1.6], [gx + 1.6, fx1]] : [[fx0, fx1]];
      for (const [a, b] of spans) { A.tube(Math.max(a, fx0 + 1), dy + 1.1, z, Math.min(b, fx1 - 1), dy + 1.1, z, 0.04, [0.85, 0.85, 0.85, 0], 4); World.addBox(a, dy, z - 0.08, b, dy + 1.1, z + 0.08, 'wall'); }
    }
    World.lightsStatic.push({ x: (fx0 + fx1) / 2, y: dy + 5, z: fz0 - 3, r: 2, g: 1.8, b: 1.4, range: 22 });
    // gangway: steps from the quay up to the deck
    for (let s = 0; s < 10; s++) { const z0 = WATER_Z - 8 + s * 1.4, y = 0.4 * (s + 1); A.box(gx - 1.5, 0, z0, gx + 1.5, y, z0 + 1.4, { faces: 'xXzZY', cell: CELL.metal, su: 3, sv: 3, col: [0.6, 0.62, 0.65, 0], top: { cell: CELL.metal, su: 2, sv: 2, col: [0.5, 0.52, 0.55, 0] } }); World.addBox(gx - 1.5, 0, z0, gx + 1.5, y, z0 + 1.4, 'slab'); }
    for (const x of [gx - 1.5, gx + 1.5]) A.tube(x, 1.1, WATER_Z - 8, x, dy + 1.1, fz0, 0.04, [0.8, 0.8, 0.8, 0], 4);
    World.spots.ferryDeck = { x: gx + 8, y: dy, z: fz0 + 1.5 }; World.spots.ferryGangway = { x: gx, y: 0, z: WATER_Z - 10 }; World.spots.ferryTerminal = { x: R.cx, y: CURB, z: R.lz1 + 3 };
  },
  ferris(x, z, r, y0) {
    const A = this.C.B.atlas, Gl = this.C.B.glow; const cy = y0 + r + 2, segs = 28, c = [0.85, 0.85, 0.9, 0];
    for (const dz of [-1.2, 1.2]) { for (let k = 0; k < segs; k++) { const a0 = k / segs * TAU, a1 = (k + 1) / segs * TAU; A.tube(x + Math.cos(a0) * r, cy + Math.sin(a0) * r, z + dz, x + Math.cos(a1) * r, cy + Math.sin(a1) * r, z + dz, 0.12, c, 4); } }
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; A.tube(x, cy, z, x + Math.cos(a) * r, cy + Math.sin(a) * r, z - 1.2, 0.05, c, 3); A.tube(x, cy, z, x + Math.cos(a) * r, cy + Math.sin(a) * r, z + 1.2, 0.05, c, 3); const px = x + Math.cos(a) * r, py = cy + Math.sin(a) * r; const col = [[1, 0.3, 0.4], [0.3, 0.7, 1], [1, 0.8, 0.2]][k % 3]; A.cbox(px - 0.8, py - 2.2, z - 0.8, px + 0.8, py - 0.8, z + 0.8, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 0]); }
    for (let k = 0; k < 56; k++) { const a = k / 56 * TAU; const col = [[1, 0.3, 0.7], [0.3, 0.9, 1], [1, 0.85, 0.3], [0.5, 1, 0.5]][k % 4]; Gl.cbox(x + Math.cos(a) * r - 0.1, cy + Math.sin(a) * r - 0.1, z - 1.4, x + Math.cos(a) * r + 0.1, cy + Math.sin(a) * r + 0.1, z - 1.2, [col[0], col[1], col[2], 3]); }
    Gl.addGeo(sphereGeo(0.9, 10, 8), M4.compose(M4.create(), x, cy, z - 1.3, 0, 0, 0), [1, 0.85, 0.5, 3]);
    for (const s of [-1, 1]) for (const dz of [-2.5, 2.5]) A.tube(x + s * r * 0.55, y0, z + dz, x, cy, z + dz * 0.4, 0.3, [0.8, 0.8, 0.82, 0], 6);
    World.addBox(x - r * 0.55, y0, z - 2.8, x + r * 0.55, y0 + 3, z + 2.8, 'prop');
    World.lightsStatic.push({ x, y: cy, z: z - 4, r: 3, g: 1.6, b: 2.4, range: 34 });
  },
  g_beach(C, R) {
    const A = C.B.atlas, Gl = C.B.glow;
    // seaside hotels facing the sea
    for (let x = R.lx0 + 4; x < R.lx1 - 20; x += G.r(34, 42)) { const w = G.r(24, 30); const h = G.r(18, 30); const b = C.bld(x, R.lz0 + 8, x + w, R.lz1 - 8, Math.round(h), G.pick(['plaster', 'stone', 'hlm']), { streets: 'Z', col: G.pick([[0.95, 0.9, 0.8], [0.92, 0.85, 0.75], [0.85, 0.9, 0.95]]) }); if (G.chance(0.6)) this.roofSign(x + w / 2, b.h, R.lz1 - 9, 0, 1, 'hotelsea', 2.2); }
    for (let x = R.lx0 + 3; x < R.lx1; x += 10) this.palm(x, R.lz1 + 1.3, G.r(6, 8.5));
    // the beach on the quay strip
    this.ground(R.bx0, 144, R.bx1, WATER_Z, GCELL.sand, 5, 0.012);
    const pierX = R.cx + 6, pw = 8;
    for (let x = R.bx0 + 6; x < R.bx1 - 4; x += G.r(5, 9)) { if (Math.abs(x - pierX) < pw + 4) continue; const r = G.r();
      if (r < 0.3) { const c = G.pick([[0.9, 0.2, 0.2], [0.2, 0.4, 0.9], [0.95, 0.8, 0.2], [0.2, 0.7, 0.4]]); const z = 146; A.box(x - 1, 0, z, x + 1, 2.2, z + 1.8, { faces: 'xXzZ', cell: CELL.wood, su: 1, sv: 2, col: [c[0], c[1], c[2], 0] }); this.gable(x - 1, z, x + 1, z + 1.8, 2.2, 0.6, 'z', [0.9, 0.9, 0.9, 0], 0.1); World.addBox(x - 1, 0, z, x + 1, 2.6, z + 1.8, 'prop'); }
      else if (r < 0.7) { const z = G.r(152, 166); A.tube(x, 0, z, x, 2.3, z, 0.03, [0.9, 0.9, 0.9, 0], 3); const c = G.pick([[0.9, 0.25, 0.25], [0.2, 0.5, 0.9], [0.95, 0.8, 0.25], [0.95, 0.95, 0.95]]); A.addGeo(cylGeo(1.4, 0.05, 0.5, 8, true), M4.compose(M4.create(), x, 2.1, z, 0, 0, 0), [c[0], c[1], c[2], 0]); }
    }
    // lifeguard tower and a volleyball net
    const lx = R.bx0 + 30; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.tube(lx + dx, 0, 158 + dz, lx + dx * 0.8, 3, 158 + dz * 0.8, 0.08, [0.85, 0.85, 0.85, 0], 4); A.box(lx - 1.3, 3, 156.7, lx + 1.3, 5.2, 159.3, { faces: 'xXzZY', cell: CELL.wood, su: 1.2, sv: 1.2, col: [0.95, 0.35, 0.25, 0] }); World.addBox(lx - 1.3, 0, 156.7, lx + 1.3, 5.2, 159.3, 'prop');
    const vx = R.bx1 - 30; A.tube(vx - 4.5, 0, 158, vx - 4.5, 2.4, 158, 0.05, [0.9, 0.9, 0.9, 0], 4); A.tube(vx + 4.5, 0, 158, vx + 4.5, 2.4, 158, 0.05, [0.9, 0.9, 0.9, 0], 4); A.cbox(vx - 4.5, 1.6, 157.98, vx + 4.5, 2.4, 158.02, [0.9, 0.9, 0.9, 0], 'zZ');
    // the amusement pier: entrance arch, deck, carousel, stalls, Ferris wheel at the end
    const z0 = WATER_Z - 1, z1 = WATER_Z + 96;
    this.deckPier(pierX - pw, z0, pierX + pw, z1 - 30, true);
    this.deckPier(pierX - 26, z1 - 30, pierX + 26, z1, true);
    for (const s of [-1, 1]) { A.tube(pierX + s * (pw - 0.3), 0, WATER_Z - 3, pierX + s * (pw - 0.3), 7, WATER_Z - 3, 0.2, [0.9, 0.9, 0.95, 0], 6); World.addBox(pierX + s * (pw - 0.3) - 0.25, 0, WATER_Z - 3.25, pierX + s * (pw - 0.3) + 0.25, 7, WATER_Z - 2.75, 'pole'); }
    A.cbox(pierX - pw, 6.4, WATER_Z - 3.3, pierX + pw, 7.2, WATER_Z - 2.7, [0.2, 0.2, 0.25, 0], 'xXzZYy');
    this.sign(pierX, 7.4, WATER_Z - 3.3, 0, -1, 'luna', 2.2); this.sign(pierX, 7.4, WATER_Z - 2.7, 0, 1, 'luna', 2.2);
    for (let z = z0 + 4; z < z1 - 32; z += 8) { C.lampPost(pierX - pw + 0.8, z, 4, [1.1, 0.8, 0.9]); C.lampPost(pierX + pw - 0.8, z + 4, 4, [0.8, 0.9, 1.1]); }
    for (let z = z0 + 10; z < z1 - 36; z += 11) for (const s of [-1, 1]) this.stall(pierX + s * (pw - 2.2), z, false, G.pick([[0.8, 0.15, 0.3], [0.15, 0.4, 0.8], [0.9, 0.7, 0.1], [0.3, 0.7, 0.3]]));
    // carousel
    const cx = pierX - 14, cz = z1 - 18; A.addGeo(cylGeo(5, 5, 0.6, 16, true), M4.compose(M4.create(), cx, 0, cz, 0, 0, 0), [0.7, 0.2, 0.2, 0]); A.addGeo(cylGeo(5.6, 0.3, 2.4, 16, true), M4.compose(M4.create(), cx, 4.2, cz, 0, 0, 0), [0.95, 0.85, 0.3, 0]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; A.tube(cx + Math.cos(a) * 3.8, 0.6, cz + Math.sin(a) * 3.8, cx + Math.cos(a) * 3.8, 4.2, cz + Math.sin(a) * 3.8, 0.05, [0.9, 0.8, 0.3, 0], 3); A.cbox(cx + Math.cos(a) * 3.8 - 0.3, 1.2, cz + Math.sin(a) * 3.8 - 0.6, cx + Math.cos(a) * 3.8 + 0.3, 1.9, cz + Math.sin(a) * 3.8 + 0.6, [0.95, 0.95, 0.95, 0]); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; Gl.cbox(cx + Math.cos(a) * 5.5 - 0.08, 4.1, cz + Math.sin(a) * 5.5 - 0.08, cx + Math.cos(a) * 5.5 + 0.08, 4.3, cz + Math.sin(a) * 5.5 + 0.08, [1, 0.85, 0.4, 3]); }
    World.addBox(cx - 5, 0, cz - 5, cx + 5, 0.6, cz + 5, 'slab'); World.lightsStatic.push({ x: cx, y: 3, z: cz, r: 2.6, g: 2, b: 1, range: 14 });
    this.ferris(pierX + 12, z1 - 14, 15, 0);
    World.spots.pier = { x: pierX, y: 0, z: z0 + 30 }; World.spots.ferris = { x: pierX + 12, y: 0, z: z1 - 20 }; World.spots.beach = { x: R.bx0 + 40, y: 0, z: 158 };
  }
});

