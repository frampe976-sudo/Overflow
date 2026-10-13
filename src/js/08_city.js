/* =====================================================================
   CITY GENERATION — Port-Saline
   ===================================================================== */
const PAL = {
  brick: [[0.62, 0.36, 0.28], [0.46, 0.32, 0.26], [0.56, 0.47, 0.42], [0.5, 0.28, 0.24]],
  plaster: [[0.86, 0.78, 0.64], [0.8, 0.77, 0.74], [0.78, 0.63, 0.56], [0.62, 0.7, 0.72], [0.84, 0.72, 0.52]],
  concrete: [[0.72, 0.72, 0.7], [0.6, 0.62, 0.64], [0.7, 0.66, 0.6]],
  glass: [[0.8, 0.86, 0.96], [0.7, 0.8, 0.9], [0.86, 0.8, 0.9]],
  industrial: [[0.55, 0.6, 0.62], [0.62, 0.5, 0.4], [0.45, 0.5, 0.46]],
  tenement: [[0.66, 0.4, 0.32], [0.56, 0.42, 0.36], [0.7, 0.54, 0.44], [0.52, 0.34, 0.3]],
  hlm: [[0.9, 0.88, 0.84], [0.84, 0.82, 0.76], [0.88, 0.84, 0.74], [0.8, 0.84, 0.86]],
  stone: [[0.9, 0.86, 0.78], [0.82, 0.78, 0.7], [0.76, 0.74, 0.7]],
  lantern: [[0.9, 0.84, 0.74], [0.82, 0.7, 0.6], [0.72, 0.78, 0.74]],
  hospital: [[0.95, 0.96, 0.97], [0.9, 0.92, 0.94]],
  office: [[0.8, 0.86, 0.92], [0.74, 0.8, 0.86], [0.86, 0.84, 0.8]],
  house: [[0.92, 0.88, 0.8], [0.8, 0.86, 0.9], [0.86, 0.8, 0.72]],
  warehouse: [[0.66, 0.46, 0.36], [0.6, 0.5, 0.42], [0.56, 0.4, 0.34]],
  mall: [[0.95, 0.93, 0.9], [0.9, 0.9, 0.92]],
  container: [[0.64, 0.25, 0.17], [0.16, 0.36, 0.61], [0.18, 0.49, 0.31], [0.85, 0.85, 0.84], [0.85, 0.47, 0.17], [0.12, 0.48, 0.48], [0.48, 0.5, 0.52], [0.84, 0.69, 0.17]],
  awning: [[0.55, 0.08, 0.1], [0.08, 0.3, 0.18], [0.1, 0.14, 0.3], [0.35, 0.08, 0.2], [0.6, 0.4, 0.08]]
};
const SIGN_COL = {
  hotel: [1, 0.31, 0.64], bar: [0.31, 0.85, 1], club: [0.7, 0.42, 1], ramen: [1, 0.54, 0.24], lephare: [0.35, 0.88, 1], laverie: [0.35, 0.64, 1], kebab: [1, 0.82, 0.25], cinema: [1, 0.23, 0.3],
  karaoke: [1, 0.37, 0.82], ouvert: [1, 0.3, 0.3], pizza: [1, 0.6, 0.24], sushi: [0.49, 1, 0.69], garage: [1, 0.71, 0.28], police: [0.3, 0.64, 1], criee: [0.56, 0.9, 1], marche: [1, 0.71, 0.28],
  motel: [1, 0.42, 0.35], tabacTxt: [1, 0.23, 0.23], cross: [0.24, 1, 0.48], carotte: [1, 0.18, 0.23], g_tide: [0.18, 0.95, 0.69], g_rats: [1, 0.54, 0.12], g_sea: [0.18, 0.95, 0.69],
  gare: [1, 0.9, 0.69], hopital: [0.87, 0.95, 1], urgences: [1, 0.23, 0.3], stade: [0.5, 0.83, 1], casino: [1, 0.81, 0.23], theatre: [1, 0.35, 0.55], cabaret: [0.75, 0.44, 1],
  arcades: [1, 0.48, 0.23], univ: [0.91, 0.88, 0.78], mairie: [1, 0.89, 0.66], pompiers: [1, 0.29, 0.23], garemar: [0.56, 0.9, 1], luna: [1, 0.42, 0.84], marina: [0.35, 0.85, 1],
  dimsum: [1, 0.42, 0.23], the: [1, 0.78, 0.35], bowling: [0.35, 1, 0.6], hotelsea: [1, 0.69, 0.35], dragon: [1, 0.23, 0.23], lotus: [1, 0.81, 0.23]
};
const City = {
  B: null,
  build() {
    G.reseed(20260927);
    this.pending = [];
    const B = this.B = { atlas: new GeoBuilder(), detail: new GeoBuilder(), fence: new GeoBuilder(), ground: new GeoBuilder(), glow: new GeoBuilder(), boards: new GeoBuilder(), neon: new GeoBuilder(), pools: new GeoBuilder(), cones: new GeoBuilder(), streaks: new GeoBuilder(), far: new GeoBuilder() };
    // every small, bright emissive fixture (beacons, door lights, floodlights…) also gets a corona
    World.coronas = []; this._noCor = false;
    const gcb = B.glow.cbox.bind(B.glow);
    B.glow.cbox = (x0, y0, z0, x1, y1, z1, col, faces) => {
      gcb(x0, y0, z0, x1, y1, z1, col, faces);
      if (this._noCor || !(col[3] >= 1.5)) return; const m = Math.max(x1 - x0, y1 - y0, z1 - z0); if (m > 1.6) return;
      this.corona((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, col, clamp(m * 1.7, 0.35, 1.6), Math.min(1, col[3] / 3.2));
    };
    World.blocks = [];
    for (let i = 0; i < NI; i++) { World.blocks[i] = []; for (let j = 0; j < NJ; j++) World.blocks[i][j] = this.blockInfo(i, j); }
    Districts.assign();
    this.groundAndRoads();
    // the original city first, in the same order and with the same random sequence as before (missions rely on it)
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) this.genBlock(i + CI, j + CJ);
    this.docks();
    // the new districts and the outer ring use their own random sequences
    const keep = G.save();
    G.reseed(90210); Districts.generate(this);
    G.reseed(4711); this.backdrop();
    G.restore(keep);
    const tri = () => { let n = 0; for (const k in B) n += B[k].i.length / 3; return n; }, st = World.buildStats = {}; let t0 = tri();
    const step = (name, fn) => { fn(); const t = tri(); st[name] = t - t0; t0 = t; };
    st.city = t0;
    step('lamps', () => this.lamps());
    step('signals', () => this.signals());
    step('props', () => this.streetProps());
    step('zips', () => this.proceduralZips());
    step('roofs', () => { for (const info of this.pending) this.roofProps(info); });
    step('facades', () => this.facadeDetails());
    this.placeBadges();
    this.navData();
    const M = World.meshes;
    for (const k in B) if (B[k].vc) M[k] = ChunkMesh.split(B[k].build(), k);
    M.water = this.waterMesh();
    this.B = null;
  },
  blockInfo(i, j) {
    const bx0 = RX[i] + RHW, bx1 = RX[i + 1] - RHW, bz0 = RZ[j] + RHW, bz1 = RZ[j + 1] - RHW;
    return { i, j, ci: i - CI, cj: j - CJ, d: null, grp: null, area: '', bx0, bx1, bz0, bz1, lx0: bx0 + SIDEW, lx1: bx1 - SIDEW, lz0: bz0 + SIDEW, lz1: bz1 - SIDEW, cx: (bx0 + bx1) / 2, cz: (bz0 + bz1) / 2, blds: [] };
  },
  /* ---------------- ground ---------------- */
  groundAndRoads() {
    const g = this.B.ground;
    // asphalt everywhere on land
    g.quad(-700, 0, WATER_Z, 1400, 0, 0, 0, 0, -(WATER_Z + 700), [-700 / 9, -WATER_Z / 9, 700 / 9, 700 / 9], GCELL.asphalt, [0.9, 0.9, 0.95, 0]);
    // lane markings (dashed centre lines) on every existing road segment + crosswalks at the crossings
    const mk = [0.85, 0.85, 0.8, 0.05], yel = [0.95, 0.72, 0.2, 0.05];
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) {
      const a = RX[i] + RHW + 2, b = RX[i + 1] - RHW - 2, r = RZ[j];
      for (let s = a; s < b - 2; s += 6) g.quad(s, 0.02, r + 0.08, 3, 0, 0, 0, 0, -0.16, [0, 0, 1, 1], GCELL.plain, mk);
    }
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) {
      const a = RZ[j] + RHW + 2, b = RZ[j + 1] - RHW - 2, r = RX[i];
      for (let s = a; s < b - 2; s += 6) g.quad(r - 0.08, 0.02, s + 3, 0.16, 0, 0, 0, 0, -3, [0, 0, 1, 1], GCELL.plain, mk);
    }
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
      if (!Net.node(i, j)) continue; const rx = RX[i], rz = RZ[j];
      const N = Net.segZ(i, j - 1), S = Net.segZ(i, j), W = Net.segX(i - 1, j), E = Net.segX(i, j);
      for (let s = -RHW + 0.6; s < RHW - 0.4; s += 1.2) {
        if (N) g.quad(rx + s, 0.021, rz - RHW - 0.4, 0.6, 0, 0, 0, 0, -2.4, [0, 0, 1, 1], GCELL.plain, mk);
        if (S) g.quad(rx + s, 0.021, rz + RHW + 2.8, 0.6, 0, 0, 0, 0, -2.4, [0, 0, 1, 1], GCELL.plain, mk);
        if (W) g.quad(rx - RHW - 2.8, 0.021, rz + s + 0.6, 2.4, 0, 0, 0, 0, -0.6, [0, 0, 1, 1], GCELL.plain, mk);
        if (E) g.quad(rx + RHW + 0.4, 0.021, rz + s + 0.6, 2.4, 0, 0, 0, 0, -0.6, [0, 0, 1, 1], GCELL.plain, mk);
      }
    }
    // quay edge yellow line
    g.quad(-411, 0.02, WATER_Z - 0.6, 822, 0, 0, 0, 0, -0.25, [0, 0, 1, 1], GCELL.plain, yel);
    // quay wall face into the water
    this.B.atlas.box(-500, WATER_Y - 1, WATER_Z - 0.01, 500, 0, WATER_Z, { faces: 'Z', cell: CELL.rough, su: 6, sv: 6, col: [0.5, 0.5, 0.5, 0] });
  },
  slab(x0, z0, x1, z1, cell) {
    World.addBox(x0, 0, z0, x1, CURB, z1, 'slab');
    this.B.ground.box(x0, 0, z0, x1, CURB, z1, { faces: 'xXzZY', cell: GCELL.plain, col: [0.55, 0.55, 0.56, 0], top: { cell: cell || GCELL.pavers, su: 2.4, sv: 2.4, col: [0.85, 0.85, 0.85, 0] } });
  },
  /* ---------------- building ---------------- */
  // faces: which faces face a street (get shops, signs). ladder: face letter or null
  bld(x0, z0, x1, z1, h, style, o = {}) {
    const A = this.B.atlas;
    const cell = CELL[style] || CELL.concrete;
    const pal = PAL[style === 'brick2' ? 'brick' : style === 'tower' ? 'glass' : style] || PAL.concrete;
    const c = o.col || G.pick(pal);
    const col = [c[0], c[1], c[2], 0];
    const y0 = o.base || 0;
    const b = World.addBox(x0, 0, z0, x1, h, z1, 'bld');
    const info = { x0, z0, x1, z1, h, style, y0, box: b, streets: o.streets || '', ladders: [], zipAnchor: null };
    World.buildings.push(info);
    const shopH = 4.2; const ou = G.i(0, 7) / 8, ov = G.i(0, 7) / 8;
    for (const f of 'xXzZ') {
      const street = info.streets.indexOf(f) >= 0 && o.shops !== false && h > 6 && y0 === 0;
      if (street) info.shopFaces = (info.shopFaces || '') + f;
      if (street) {
        const o4 = G.i(0, 3); A.box(x0, y0, z0, x1, shopH, z1, { faces: f, cell: CELL.shop, su: 24, sv: shopH, uvBase: 0, ou: o4 / 4, col: [1, 1, 1, 0] });
        this.shopBoards(x0, z0, x1, z1, f, o4);
        A.box(x0, shopH, z0, x1, h, z1, { faces: f, cell, su: 24, sv: 25.6, uvBase: shopH - 0.3, ou, ov, col });
        // ground floor ledge trim
        this.trimFace(x0, z0, x1, z1, f, shopH - 0.1, shopH + 0.25, 0.18, [0.3, 0.3, 0.32, 0]);
      } else A.box(x0, y0, z0, x1, h, z1, { faces: f, cell, su: 24, sv: 25.6, uvBase: y0 - 0.4, ou, ov, col });
    }
    // roof + cornice
    A.box(x0, h - 0.02, z0, x1, h, z1, { faces: 'Y', top: { cell: CELL.roof, su: 12, sv: 12, col: [0.7, 0.7, 0.72, 0] } });
    const tc = style === 'glass' || style === 'tower' || style === 'office' ? [0.25, 0.28, 0.32, 0] : style === 'hlm' || style === 'hospital' || style === 'mall' ? [0.86, 0.86, 0.84, 0] : [0.78, 0.76, 0.72, 0];
    this.cornice(x0, z0, x1, z1, h, tc);
    if (o.roofProps !== false) this.pending.push(info);
    if (info.streets && o.signs !== false && h > 6 && y0 === 0) this.shopDressing(info, o);
    return info;
  },
  // one lit sign box above each open shop front (the fronts repeat every 6 m along the face)
  shopBoards(x0, z0, x1, z1, f, o4) {
    const slots = Tex.shopSlots, n = SHOP_BOARDS.length; if (!slots) return;
    let ox, oz, dx, dz, nx, nz, len;
    if (f === 'X') { ox = x1; oz = z1; dx = 0; dz = -1; nx = 1; nz = 0; len = z1 - z0; } else if (f === 'x') { ox = x0; oz = z0; dx = 0; dz = 1; nx = -1; nz = 0; len = z1 - z0; }
    else if (f === 'Z') { ox = x0; oz = z1; dx = 1; dz = 0; nx = 0; nz = 1; len = x1 - x0; } else { ox = x1; oz = z0; dx = -1; dz = 0; nx = 0; nz = -1; len = x1 - x0; }
    const Bd = this.B.boards, w = 4.3, hgt = w * 60 / 400, y = 3.44;
    for (let m = 0; (m + 1) * 6 <= len + 0.01; m++) {
      if (!slots[(m + o4) % 4].open) continue;
      const s = m * 6 + 3, cx = ox + dx * s + nx * 0.05, cz = oz + dz * s + nz * 0.05;
      const k = Math.floor(Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453)) % n, S = Tex.signs['shop' + k]; if (!S) continue;
      const ux = nz * w, uz = -nx * w, lit = SHOP_BOARDS[k][1] === 'L' ? [0.66, 0.66, 0.66, 0] : [1, 1, 1, 0.12];
      Bd.quad(cx - ux / 2, y, cz - uz / 2, ux, 0, uz, 0, hgt, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], lit);
    }
  },
  trimFace(x0, z0, x1, z1, f, ya, yb, d, col) {
    const A = this.B.atlas;
    if (f === 'x') A.cbox(x0 - d, ya, z0, x0, yb, z1, col, 'xzZY'); else if (f === 'X') A.cbox(x1, ya, z0, x1 + d, yb, z1, col, 'XzZY');
    else if (f === 'z') A.cbox(x0, ya, z0 - d, x1, yb, z0, col, 'zxXY'); else A.cbox(x0, ya, z1, x1, yb, z1 + d, col, 'ZxXY');
  },
  cornice(x0, z0, x1, z1, h, col) {
    const A = this.B.atlas, o = 0.14, w = 0.3, y0 = h - 0.5, y1 = h + 0.05;
    A.cbox(x0 - o, y0, z0 - o, x1 + o, y1, z0 + w, col, 'xXzZY');
    A.cbox(x0 - o, y0, z1 - w, x1 + o, y1, z1 + o, col, 'xXzZY');
    A.cbox(x0 - o, y0, z0 + w, x0 + w, y1, z1 - w, col, 'xY');
    A.cbox(x1 - w, y0, z0 + w, x1 + o, y1, z1 - w, col, 'XY');
  },
  roofProps(info) {
    const A = this.B.atlas; const { x0, z0, x1, z1, h } = info; const w = x1 - x0, d = z1 - z0;
    if (w < 6 || d < 6 || info.noRoof) return;
    const n = Math.floor(w * d / 90) + G.i(0, 2);
    if (info.waterTower && w > 7 && d > 7) { // old walk-ups: a wooden water tank on stilts is the landmark of the roof
      const px = G.r(x0 + 3, x1 - 3), pz = G.r(z0 + 3, z1 - 3);
      info.reserved = (info.reserved || []).concat([[px, pz, 2.2]]);
      const tk = cylGeo(1.3, 1.3, 2.4, 12); A.addGeo(tk, M4.compose(M4.create(), px, h + 2.4, pz, 0, 0, 0), [0.4, 0.3, 0.22, 0]);
      const roofc = cylGeo(1.38, 0.1, 0.8, 12); A.addGeo(roofc, M4.compose(M4.create(), px, h + 4.8, pz, 0, 0, 0), [0.28, 0.22, 0.18, 0]);
      for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) A.tube(px + lx, h, pz + lz, px + lx, h + 2.45, pz + lz, 0.08, [0.18, 0.18, 0.18, 0]);
      A.tube(px - 0.9, h + 1.2, pz - 0.9, px + 0.9, h + 1.2, pz + 0.9, 0.04, [0.18, 0.18, 0.18, 0]);
      World.addBox(px - 1.3, h + 2.4, pz - 1.3, px + 1.3, h + 4.8, pz + 1.3, 'prop');
      World.addBox(px - 1.0, h, pz - 1.0, px + 1.0, h + 2.4, pz + 1.0, 'prop', { nowalk: true });
    }
    const used = [];
    const free = (px, pz, r) => used.every(u => Math.hypot(u[0] - px, u[1] - pz) > u[2] + r);
    info.reserved = info.reserved || [];
    for (const r of info.reserved) used.push(r);
    for (let k = 0; k < n; k++) {
      const type = G.r();
      const px = G.r(x0 + 2.2, x1 - 2.2), pz = G.r(z0 + 2.2, z1 - 2.2);
      if (type < 0.45) { // AC unit
        if (!free(px, pz, 1.2)) continue; used.push([px, pz, 1.2]);
        A.cbox(px - 0.7, h, pz - 0.55, px + 0.7, h + 1.0, pz + 0.55, [0.62, 0.64, 0.66, 0]);
        A.cbox(px - 0.45, h + 1.0, pz - 0.45, px + 0.45, h + 1.08, pz + 0.45, [0.2, 0.2, 0.22, 0]);
        World.addBox(px - 0.7, h, pz - 0.55, px + 0.7, h + 1.0, pz + 0.55, 'prop');
      } else if (type < 0.62 && w > 9) { // water tank
        if (!free(px, pz, 2)) continue; used.push([px, pz, 2]);
        const tk = cylGeo(1.3, 1.3, 2.4, 12); A.addGeo(tk, M4.compose(M4.create(), px, h + 1.2, pz, 0, 0, 0), [0.38, 0.28, 0.2, 0]);
        const roofc = cylGeo(1.35, 0.1, 0.7, 12); A.addGeo(roofc, M4.compose(M4.create(), px, h + 3.6, pz, 0, 0, 0), [0.3, 0.22, 0.16, 0]);
        for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) A.tube(px + lx, h, pz + lz, px + lx, h + 1.25, pz + lz, 0.08, [0.2, 0.2, 0.2, 0]);
        World.addBox(px - 1.3, h + 1.2, pz - 1.3, px + 1.3, h + 3.6, pz + 1.3, 'prop');
        World.addBox(px - 1.0, h, pz - 1.0, px + 1.0, h + 1.2, pz + 1.0, 'prop', { nowalk: true });
      } else if (type < 0.75) { // stair hut with door light
        if (!free(px, pz, 2)) continue; used.push([px, pz, 2]);
        const hh = 2.6; A.box(px - 1.5, h, pz - 1.4, px + 1.5, h + hh, pz + 1.4, { faces: 'xXzZ', cell: CELL.rough, su: 4, sv: 4, col: [0.65, 0.63, 0.6, 0] });
        A.cbox(px - 1.6, h + hh, pz - 1.5, px + 1.6, h + hh + 0.12, pz + 1.5, [0.3, 0.3, 0.3, 0]);
        A.cbox(px - 0.5, h, pz + 1.4, px + 0.5, h + 2.0, pz + 1.45, [0.25, 0.22, 0.2, 0], 'Z');
        this.B.glow.cbox(px - 0.15, h + 2.15, pz + 1.4, px + 0.15, h + 2.3, pz + 1.55, [1, 0.8, 0.5, 1.5]);
        World.lightsStatic.push({ x: px, y: h + 2.2, z: pz + 2, r: 1.2, g: 0.85, b: 0.5, range: 7 });
        World.addBox(px - 1.5, h, pz - 1.4, px + 1.5, h + hh, pz + 1.4, 'prop');
      } else if (type < 0.85) { // antenna with red light
        if (!free(px, pz, 0.6)) continue; used.push([px, pz, 0.6]);
        const ah = G.r(4, 9); A.tube(px, h, pz, px, h + ah, pz, 0.06, [0.3, 0.3, 0.32, 0]);
        A.tube(px - 0.8, h + ah * 0.7, pz, px + 0.8, h + ah * 0.7, pz, 0.03, [0.3, 0.3, 0.32, 0]);
        this.B.glow.cbox(px - 0.1, h + ah, pz - 0.1, px + 0.1, h + ah + 0.2, pz + 0.1, [1, 0.1, 0.08, 2]);
      } else { // vents / skylight
        if (!free(px, pz, 1)) continue; used.push([px, pz, 1]);
        A.cbox(px - 0.8, h, pz - 0.6, px + 0.8, h + 0.45, pz + 0.6, [0.4, 0.42, 0.44, 0]);
        this.B.glow.cbox(px - 0.65, h + 0.46, pz - 0.45, px + 0.65, h + 0.47, pz + 0.45, [0.5, 0.6, 0.8, 0.5]);
      }
    }
  },
  /* shops dressing: awnings, neon signs, lights */
  shopDressing(info, o) {
    const { x0, z0, x1, z1, streets } = info;
    const flatSigns = ['lephare', 'laverie', 'kebab', 'cinema', 'karaoke', 'ouvert', 'pizza', 'sushi', 'tabacTxt', 'motel', 'garage'];
    const bladeSigns = ['hotel', 'bar', 'club', 'ramen', 'carotte', 'cross'];
    for (const f of streets) {
      const along = (f === 'x' || f === 'X') ? z1 - z0 : x1 - x0;
      const nShops = Math.max(1, Math.floor(along / 6));
      for (let s = 0; s < nShops; s++) {
        const t = (s + 0.5) / nShops;
        const r = G.r();
        if (r < 0.35) this.awning(info, f, t, G.pick(PAL.awning));
        if (r > 0.3 && r < 0.62) this.sign(info, f, t, G.pick(flatSigns), 'flat', 4.6);
        else if (r > 0.8 && along > 8) this.sign(info, f, t, G.pick(bladeSigns), 'blade', 4.6);
      }
    }
  },
  // point on face f at parameter t, returns [x,z,nx,nz]
  facePoint(info, f, t) {
    const { x0, z0, x1, z1 } = info;
    if (f === 'x') return [x0, lerp(z0, z1, t), -1, 0]; if (f === 'X') return [x1, lerp(z1, z0, t), 1, 0];
    if (f === 'z') return [lerp(x1, x0, t), z0, 0, -1]; return [lerp(x0, x1, t), z1, 0, 1];
  },
  awning(info, f, t, c) {
    const [px, pz, nx, nz] = this.facePoint(info, f, t); const w = 2.1, dep = 1.4, y = 3.25;
    const x0 = nx !== 0 ? Math.min(px, px + nx * dep) : px - w, x1 = nx !== 0 ? Math.max(px, px + nx * dep) : px + w;
    const z0 = nz !== 0 ? Math.min(pz, pz + nz * dep) : pz - w, z1 = nz !== 0 ? Math.max(pz, pz + nz * dep) : pz + w;
    this.B.atlas.cbox(x0, y, z0, x1, y + 0.16, z1, [c[0], c[1], c[2], 0], 'xXzZYy');
    // valance stripes
    this.B.atlas.cbox(nx > 0 ? x1 - 0.02 : nx < 0 ? x0 : x0, y - 0.35, nz > 0 ? z1 - 0.02 : nz < 0 ? z0 : z0, nx > 0 ? x1 : nx < 0 ? x0 + 0.02 : x1, y, nz > 0 ? z1 : nz < 0 ? z0 + 0.02 : z1, [c[0] * 1.3, c[1] * 1.3, c[2] * 1.3, 0], 'xXzZ');
    World.addBox(x0, y, z0, x1, y + 0.16, z1, 'awning');
    World.lightsStatic.push({ x: px + nx * 1.2, y: 2.8, z: pz + nz * 1.2, r: 1.0, g: 0.75, b: 0.45, range: 6 });
    this.pool(px + nx * 1.6, pz + nz * 1.6, 2.6, [0.55, 0.4, 0.25]);
  },
  sign(info, f, t, name, kind, y) {
    const S = Tex.signs[name]; if (!S) return;
    const [px, pz, nx, nz] = this.facePoint(info, f, t); const c = SIGN_COL[name] || [1, 1, 1];
    const N = this.B.neon;
    let cx = px, cz = pz, h, w;
    (World.signsDbg = World.signsDbg || []).push({ name, kind, px, pz, nx, nz, f, y, bx0: info.x0, bx1: info.x1, bz0: info.z0, bz1: info.z1 });
    if (kind === 'flat') {
      h = name === 'marche' || name === 'police' || name === 'criee' ? 1.4 : 1.05; w = h * S.aspect;
      const off = 0.07; const ox = px + nx * off, oz = pz + nz * off;
      // u direction so that text reads left->right from outside: u = (-nz, 0, nx)
      const ux = nz * w, uz = -nx * w;
      N.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
      cx = ox + nx * 1.2; cz = oz + nz * 1.2;
      World.lightsStatic.push({ x: cx, y: y + h / 2, z: cz, r: c[0] * 2.2, g: c[1] * 2.2, b: c[2] * 2.2, range: 10, flick: 0 });
      if (y < 12) this.streak(ox, oz, nx, nz, w * 0.9, 6.5, c);
    } else {
      w = 0.85; h = w / S.aspect; const d0 = 0.25;
      // blade plane perpendicular to wall; its normal is (−nz, nx) (along the wall)
      const tx = -nz, tz = nx; // along wall
      const bx = px + nx * d0, bz = pz + nz * d0;
      this.B.atlas.cbox(Math.min(bx - tx * 0.1, bx + nx * w + tx * 0.1), y - 0.1, Math.min(bz - tz * 0.1, bz + nz * w + tz * 0.1), Math.max(bx - tx * 0.1, bx + nx * w + tx * 0.1), y + h + 0.1, Math.max(bz - tz * 0.1, bz + nz * w + tz * 0.1), [0.08, 0.08, 0.1, 0], 'xXzZYy');
      // two faces
      const s1x = bx + tx * 0.11, s1z = bz + tz * 0.11, s2x = bx - tx * 0.11, s2z = bz - tz * 0.11;
      // face looking toward +t: u must go from far end back toward the wall: u = -n*w  (cross(u,up) consistent)
      N.quad(s1x, y, s1z, nx * w, 0, nz * w, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
      N.quad(s2x + nx * w, y, s2z + nz * w, -nx * w, 0, -nz * w, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
      cx = bx + nx * w / 2; cz = bz + nz * w / 2;
      World.lightsStatic.push({ x: cx, y: y + h / 2, z: cz, r: c[0] * 2.2, g: c[1] * 2.2, b: c[2] * 2.2, range: 11 });
      this.streak(bx + nx * 0.4, bz + nz * 0.4, nx, nz, 0.9, 7, c);
    }
  },
  corona(x, y, z, c, s, k, o) { World.coronas.push(Object.assign({ x, y, z, r: c[0], g: c[1], b: c[2], s, k }, o || {})); },
  pool(x, z, r, c, y = 0.03) { this.B.pools.quad(x - r, y, z + r, 2 * r, 0, 0, 0, 0, -2 * r, [0, 0, 1, 1], [0, 0], [c[0], c[1], c[2], 0]); },
  streak(x, z, nx, nz, w, len, c, y = 0.035) {
    // quad on ground, starting at wall (v=1) extending outward (v=0)
    const tx = -nz, tz = nx;
    const ox = x + nx * len - tx * w / 2, oz = z + nz * len - tz * w / 2;
    // u along tangent, v toward the wall: u x v must be +y
    const ux = tx * w, uz = tz * w, vx = -nx * len, vz = -nz * len;
    const up = uz * vx - ux * vz; // y component of u x v
    if (up > 0) this.B.streaks.quad(ox, y, oz, ux, 0, uz, vx, 0, vz, [0, 0, 1, 1], [0, 0], [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 0]);
    else this.B.streaks.quad(ox + ux, y, oz + uz, -ux, 0, -uz, vx, 0, vz, [1, 0, 0, 1], [0, 0], [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 0]);
  },
  cone(x, y, z, r, c) { // two crossed trapezoid quads (additive), apex at top
    const C = this.B.cones; const top = 0.25;
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      // quad from bottom (-r) to (r) at ground, top narrower; build as 2 triangles via quad with trapezoid by using 4 verts manually
      const i0 = C.vert(x - ax * r, 0.05, z - az * r, 0, 0, 1, 0, 0, 0, 0, c[0], c[1], c[2], 0);
      C.vert(x + ax * r, 0.05, z + az * r, 0, 0, 1, 1, 0, 0, 0, c[0], c[1], c[2], 0);
      C.vert(x + ax * top, y, z + az * top, 0, 0, 1, 1, 1, 0, 0, c[0], c[1], c[2], 0);
      C.vert(x - ax * top, y, z - az * top, 0, 0, 1, 0, 1, 0, 0, c[0], c[1], c[2], 0);
      C.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    }
  },
  ladder(x, z, nx, nz, y0, y1, info) {
    const A = this.B.atlas; const tx = -nz, tz = nx; const off = 0.18, hw = 0.3;
    const col = [0.22, 0.23, 0.25, 0];
    const bx = x + nx * off, bz = z + nz * off;
    A.tube(bx + tx * hw, y0, bz + tz * hw, bx + tx * hw, y1 + 1.0, bz + tz * hw, 0.035, col, 5);
    A.tube(bx - tx * hw, y0, bz - tz * hw, bx - tx * hw, y1 + 1.0, bz - tz * hw, 0.035, col, 5);
    for (let y = y0 + 0.3; y < y1 + 0.1; y += 0.35) A.tube(bx - tx * hw, y, bz - tz * hw, bx + tx * hw, y, bz + tz * hw, 0.025, col, 4);
    // hoops at the top
    A.tube(bx + tx * hw, y1 + 1.0, bz + tz * hw, bx - nx * 0.3 + tx * hw, y1 + 1.0, bz - nz * 0.3 + tz * hw, 0.03, col, 4);
    A.tube(bx - tx * hw, y1 + 1.0, bz - tz * hw, bx - nx * 0.3 - tx * hw, y1 + 1.0, bz - nz * 0.3 - tz * hw, 0.03, col, 4);
    const L = { x, z, nx, nz, y0, y1, info };
    World.ladders.push(L); if (info) { info.ladders.push(L); info.reserved = info.reserved || []; info.reserved.push([x - nx * 0.8, z - nz * 0.8, 1.6]); }
    return L;
  },
  zip(ax, ay, az, bx, by, bz) { // anchors are roof points; cable at +2.3
    const A = this.B.atlas; const hA = 2.4, hB = 2.4;
    for (const [px, py, pz, hh] of [[ax, ay, az, hA], [bx, by, bz, hB]]) {
      A.tube(px, py, pz, px, py + hh + 0.3, pz, 0.08, [0.3, 0.3, 0.33, 0], 6);
      A.cbox(px - 0.3, py, pz - 0.3, px + 0.3, py + 0.15, pz + 0.3, [0.3, 0.3, 0.33, 0]);
    }
    this.B.glow.cbox(ax - 0.12, ay + hA + 0.3, az - 0.12, ax + 0.12, ay + hA + 0.5, az + 0.12, [1, 0.62, 0.15, 2.5]);
    A.tube(ax, ay + hA, az, bx, by + hB, bz, 0.03, [0.15, 0.15, 0.16, 0], 4);
    World.addBox(ax - 0.15, ay, az - 0.15, ax + 0.15, ay + hA, az + 0.15, 'post', { noray: true });
    World.addBox(bx - 0.15, by, bz - 0.15, bx + 0.15, by + hB, bz + 0.15, 'post', { noray: true });
    const a = new V3(ax, ay + hA, az), b = new V3(bx, by + hB, bz); const d = b.clone().sub(a); const len = d.len(); d.scale(1 / len);
    const Z = { a, b, d, len, roofA: ay, roofB: by };
    World.zips.push(Z);
    World.lightsStatic.push({ x: ax, y: ay + hA + 0.4, z: az, r: 1.4, g: 0.8, b: 0.2, range: 6 });
    return Z;
  },
  /* ---------------- blocks ---------------- */
  genBlock(i, j) {
    const K = World.blocks[i][j]; const d = K.d;
    if (d === 'docks') return this.dockBlock(K);
    this.slab(K.bx0, K.bz0, K.bx1, K.bz1, d === 'plaza' ? GCELL.cobble : GCELL.pavers);
    this.streetFurniture(K);
    if (d === 'police') return this.policeBlock(K);
    if (d === 'market') return this.marketBlock(K);
    if (d === 'old2') return this.oldtownHero(K);
    if (d === 'plaza') return this.plazaBlock(K);
    if (d === 'down') return this.downBlock(K);
    if (d === 'indus') return this.indusBlock(K);
    return this.genericBlock(K);
  },
  streets(K, x0, z0, x1, z1) { let s = ''; if (Math.abs(x0 - K.lx0) < 0.1) s += 'x'; if (Math.abs(x1 - K.lx1) < 0.1) s += 'X'; if (Math.abs(z0 - K.lz0) < 0.1) s += 'z'; if (Math.abs(z1 - K.lz1) < 0.1) s += 'Z'; return s; },
  genericBlock(K) {
    const old = K.d === 'old';
    const styles = old ? ['plaster', 'plaster', 'brick', 'brick2'] : ['brick', 'brick2', 'concrete', 'plaster'];
    const hmin = old ? 6.5 : 9, hmax = old ? 13 : 18;
    const mx = K.cx + G.r(-3, 3), mz = K.cz + G.r(-3, 3); const al = 2;
    const lots = [];
    const pat = G.r();
    if (pat < 0.55) { // 2x2 with alleys
      lots.push([K.lx0, K.lz0, mx - al, mz - al], [mx + al, K.lz0, K.lx1, mz - al], [K.lx0, mz + al, mx - al, K.lz1], [mx + al, mz + al, K.lx1, K.lz1]);
    } else if (pat < 0.8) { // 3 buildings
      lots.push([K.lx0, K.lz0, K.lx1, mz - al], [K.lx0, mz + al, mx - al, K.lz1], [mx + al, mz + al, K.lx1, K.lz1]);
    } else { // courtyard ring
      K.court = true;
      lots.push([K.lx0, K.lz0, K.lx1, K.lz0 + 11], [K.lx0, K.lz1 - 11, K.lx1, K.lz1], [K.lx0, K.lz0 + 11, K.lx0 + 11, K.lz1 - 11], [K.lx1 - 11, K.lz0 + 11, K.lx1, K.lz1 - 11]);
    }
    for (const [x0, z0, x1, z1] of lots) {
      // split long lots into row houses with varied heights
      const W = x1 - x0, D = z1 - z0; const parts = [];
      if (Math.max(W, D) > 15 && G.chance(0.7)) {
        const n = Math.max(2, Math.floor(Math.max(W, D) / 8)); let prev = 0;
        for (let k = 1; k <= n; k++) { const t = k === n ? 1 : k / n + G.r(-0.05, 0.05); if (W >= D) parts.push([x0 + W * prev, z0, x0 + W * t, z1]); else parts.push([x0, z0 + D * prev, x1, z0 + D * t]); prev = t; }
      } else parts.push([x0, z0, x1, z1]);
      let lastH = G.r(hmin, hmax);
      parts.forEach((p, k) => {
        const h = k === 0 ? lastH : clamp(lastH + G.r(-3.5, 3.5), hmin, hmax); lastH = h;
        const info = this.bld(p[0], p[1], p[2], p[3], Math.round(h * 2) / 2, G.pick(styles), { streets: this.streets(K, p[0], p[1], p[2], p[3]) });
        K.blds.push(info);
      });
    }
    this.addLadders(K);
    this.alleyDressing(K, mx, mz, al);
  },
  addLadders(K) {
    for (const info of K.blds) {
      if (info.h > 22 || info.ladders.length) continue;
      if (G.chance(0.35) && K.blds.length > 3) continue;
      // prefer a face that is not a street (alley) else street
      const faces = K.court ? info.streets.split('') : 'xXzZ'.split('').filter(f => info.streets.indexOf(f) < 0);
      const f = faces.length ? G.pick(faces) : G.pick('xXzZ'.split(''));
      const t = G.r(0.25, 0.75);
      const [px, pz, nx, nz] = this.facePoint(info, f, t);
      // check the base is free (not inside another building)
      const q = World.query(px + nx * 0.8 - 0.3, pz + nz * 0.8 - 0.3, px + nx * 0.8 + 0.3, pz + nz * 0.8 + 0.3, []);
      if (q.some(b => b.kind === 'bld' && b !== info.box)) continue;
      this.ladder(px, pz, nx, nz, CURB, info.h, info);
    }
  },
  alleyDressing(K, mx, mz, al) {
    const A = this.B.atlas;
    // dumpster and bins in alleys
    const spots = [[mx, K.lz0 + 6], [mx, K.lz1 - 6], [K.lx0 + 6, mz], [K.lx1 - 6, mz]];
    for (const [x, z] of spots) {
      if (!G.chance(0.6)) continue;
      const q = World.query(x - 1.5, z - 1, x + 1.5, z + 1, []); if (q.some(b => b.kind === 'bld')) continue;
      this.dumpster(x, z, Math.abs(x - mx) < 0.1 ? Math.PI / 2 : 0);
    }
    // an alley light
    if (K.blds.length >= 3) { World.lightsStatic.push({ x: mx, y: 4, z: mz, r: 0.9, g: 0.7, b: 0.45, range: 9 }); this.B.glow.cbox(mx - 0.2, 4, mz - 0.2, mx + 0.2, 4.15, mz + 0.2, [1, 0.8, 0.5, 1.5]); this.pool(mx, mz, 3.5, [0.35, 0.26, 0.15], CURB + 0.03); }
  },
  dumpster(x, z, yaw) {
    const A = this.B.atlas; const c = G.pick([[0.15, 0.35, 0.22], [0.2, 0.25, 0.4], [0.4, 0.3, 0.12]]);
    const hx = yaw ? 0.75 : 1.2, hz = yaw ? 1.2 : 0.75;
    A.cbox(x - hx, CURB, z - hz, x + hx, CURB + 1.25, z + hz, [c[0], c[1], c[2], 0]);
    A.cbox(x - hx - 0.05, CURB + 1.25, z - hz - 0.05, x + hx + 0.05, CURB + 1.35, z + hz + 0.05, [0.1, 0.1, 0.1, 0]);
    World.addBox(x - hx, 0, z - hz, x + hx, CURB + 1.35, z + hz, 'prop');
  },
  streetFurniture(K) {
    const A = this.B.atlas;
    // benches & bins along sidewalks (curb side), a bus shelter on some blocks
    const edges = [['z', K.bx0, K.bz0, K.bx1, K.bz0], ['Z', K.bx0, K.bz1, K.bx1, K.bz1], ['x', K.bx0, K.bz0, K.bx0, K.bz1], ['X', K.bx1, K.bz0, K.bx1, K.bz1]];
    for (const [f, ax, az, bx, bz] of edges) {
      if (!G.chance(0.5)) continue;
      const t = G.r(0.3, 0.7); const x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const inward = f === 'z' ? [0, 1] : f === 'Z' ? [0, -1] : f === 'x' ? [1, 0] : [-1, 0];
      const px = x + inward[0] * 0.9, pz = z + inward[1] * 0.9;
      if (G.chance(0.4) && K.d !== 'plaza') { // bus shelter
        const along = inward[0] === 0; const hw = 1.8, hd = 0.7;
        const x0 = along ? px - hw : px - hd, x1 = along ? px + hw : px + hd, z0 = along ? pz - hd : pz - hw, z1 = along ? pz + hd : pz + hw;
        A.cbox(x0, 2.4, z0, x1, 2.55, z1, [0.2, 0.22, 0.25, 0], 'xXzZYy');
        this.B.glow.cbox(along ? x0 + 0.2 : (inward[0] > 0 ? x0 + 1.3 : x1 - 1.35), 0.5 + CURB, along ? (inward[1] > 0 ? z0 + 1.3 : z1 - 1.35) : z0 + 0.2, along ? x1 - 0.2 : (inward[0] > 0 ? x0 + 1.35 : x1 - 1.3), 2.2, along ? (inward[1] > 0 ? z0 + 1.35 : z1 - 1.3) : z1 - 0.2, [0.58, 0.62, 0.7, 0.22]);
        for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) A.tube(cx, CURB, cz, cx, 2.4, cz, 0.04, [0.2, 0.2, 0.22, 0]);
        World.addBox(x0, 2.4, z0, x1, 2.55, z1, 'awning');
        World.lightsStatic.push({ x: px, y: 2.2, z: pz, r: 0.8, g: 0.9, b: 1.1, range: 6 });
      } else { // bench
        const along = inward[0] === 0; const hw = 0.9, hd = 0.25;
        const x0 = along ? px - hw : px - hd, x1 = along ? px + hw : px + hd, z0 = along ? pz - hd : pz - hw, z1 = along ? pz + hd : pz + hw;
        A.cbox(x0, CURB + 0.4, z0, x1, CURB + 0.48, z1, [0.35, 0.25, 0.16, 0], 'xXzZY');
        A.cbox(x0 + 0.05, CURB, z0 + 0.05, x0 + 0.12, CURB + 0.4, z1 - 0.05, [0.15, 0.15, 0.15, 0]);
        A.cbox(x1 - 0.12, CURB, z0 + 0.05, x1 - 0.05, CURB + 0.4, z1 - 0.05, [0.15, 0.15, 0.15, 0]);
        World.addBox(x0, 0, z0, x1, CURB + 0.48, z1, 'prop');
      }
    }
  },
  /* ---------------- special blocks ---------------- */
  policeBlock(K) {
    const A = this.B.atlas;
    const info = this.bld(-16, -106, 16, K.lz1, 11, 'concrete', { streets: 'Z', col: [0.66, 0.68, 0.72], shops: false, signs: false });
    K.blds.push(info);
    // entrance: glowing doors + canopy
    A.cbox(-4, 3.2, K.lz1, 4, 3.4, K.lz1 + 2.2, [0.12, 0.14, 0.2, 0], 'xXzZYy'); World.addBox(-4, 3.2, K.lz1, 4, 3.4, K.lz1 + 2.2, 'awning');
    this.B.glow.cbox(-2.2, CURB, K.lz1, 2.2, 2.8, K.lz1 + 0.05, [0.3, 0.36, 0.45, 0.2]);
    this.sign(info, 'Z', 0.5, 'police', 'flat', 6.2);
    for (const x of [-5.5, 5.5]) { this.B.glow.cbox(x - 0.25, 2.6, K.lz1, x + 0.25, 3.1, K.lz1 + 0.3, [0.3, 0.55, 1, 3]); World.lightsStatic.push({ x, y: 2.9, z: K.lz1 + 1.2, r: 0.4, g: 0.8, b: 2.4, range: 9 }); }
    this.ladder(16, -98, 1, 0, CURB, 11, info);
    // antenna mast
    A.tube(10, 11, -100, 10, 21, -100, 0.1, [0.3, 0.3, 0.32, 0]); this.B.glow.cbox(9.85, 21, -100.15, 10.15, 21.3, -99.85, [1, 0.1, 0.08, 3]);
    // yard fence with gate + parked cars area
    const fz0 = K.lz0, fz1 = -107;
    this.fence(-18, fz0, 18, fz0, 3); this.fence(18, fz0, 18, fz1, 3); this.fence(-18, fz0, -18, -120, 3);
    this.trainingYard(info);
    World.spots.policeFront = { x: 0, y: CURB, z: K.lz1 + 1.6, yaw: 0 };
    World.spots.policeCar = { x: 9, z: -81 - PARK, yaw: -Math.PI / 2 };
    World.spots.policeYard = [{ x: -8, z: -115, yaw: Math.PI / 2 }, { x: 6, z: -115, yaw: Math.PI / 2 }];
  },
  // training course in the station yard (Entraînement): low wall, climbing block, zip line from the roof, shooting range.
  // Fixed geometry only (no random draws), so the rest of the city is unchanged.
  trainingYard(station) {
    const A = this.B.atlas, T = World.spots.train = {};
    // low wall to vault over
    A.box(12.5, CURB, -113, 12.9, CURB + 1.0, -108, { faces: 'xXzZY', cell: CELL.concrete, su: 3, sv: 3, col: [0.72, 0.72, 0.74, 0], top: { cell: CELL.plain, col: [0.95, 0.72, 0.12, 0] } });
    World.addBox(12.5, 0, -113, 12.9, CURB + 1.0, -108, 'prop');
    T.wall = { x0: 12.5, x1: 12.9, z0: -113, z1: -108, top: CURB + 1.0 };
    // climbing block: a stack of wooden crates with a yellow edge on the grip side
    A.box(11, CURB, -124.5, 14, CURB + 2.5, -121.5, { faces: 'xXzZY', cell: CELL.wood, su: 1.25, sv: 1.25, col: [0.86, 0.74, 0.58, 0], top: { cell: CELL.wood, su: 1.5, sv: 1.5, col: [0.8, 0.68, 0.52, 0] } });
    A.cbox(11, CURB + 2.36, -121.53, 14, CURB + 2.5, -121.5, [0.95, 0.72, 0.12, 0], 'Z');
    World.addBox(11, 0, -124.5, 14, CURB + 2.5, -121.5, 'prop');
    T.block = { x0: 11, x1: 14, z0: -124.5, z1: -121.5, top: CURB + 2.5 };
    // zip line from the station roof down onto the block
    station.reserved = (station.reserved || []).concat([[8, -105.4, 2.4]]);
    T.zip = this.zip(8, 11, -105.4, 12.5, CURB + 2.5, -123.8);
    // shooting range: three targets in front of the back fence
    T.targets = [];
    for (const x of [-4, 0, 4]) {
      const z = -125.55, y = 1.55;
      A.tube(x, CURB, z - 0.07, x, y - 0.4, z - 0.07, 0.045, [0.2, 0.2, 0.22, 0], 5);
      A.cbox(x - 0.42, y - 0.42, z - 0.04, x + 0.42, y + 0.42, z + 0.04, [0.9, 0.9, 0.88, 0], 'xXzZY');
      A.cbox(x - 0.3, y - 0.3, z + 0.04, x + 0.3, y + 0.3, z + 0.05, [0.82, 0.1, 0.1, 0], 'Z');
      A.cbox(x - 0.18, y - 0.18, z + 0.05, x + 0.18, y + 0.18, z + 0.06, [0.9, 0.9, 0.88, 0], 'Z');
      A.cbox(x - 0.07, y - 0.07, z + 0.06, x + 0.07, y + 0.07, z + 0.07, [0.82, 0.1, 0.1, 0], 'Z');
      const b = World.addBox(x - 0.42, y - 0.42, z - 0.05, x + 0.42, y + 0.42, z + 0.07, 'target');
      T.targets.push({ x, y, z: z + 0.07, box: b, hit: false });
    }
    // painted lines on the yard: shooting line and parking bay
    const G = this.B.ground, paint = [0.9, 0.75, 0.2, 0.05];
    G.quad(-6, CURB + 0.012, -110.9, 12, 0, 0, 0, 0, -0.12, [0, 0, 1, 1], GCELL.plain, paint);
    G.quad(-13.8, CURB + 0.012, -111.2, 5.6, 0, 0, 0, 0, -0.1, [0, 0, 1, 1], GCELL.plain, paint);
    G.quad(-13.8, CURB + 0.012, -115.8, 5.6, 0, 0, 0, 0, -0.1, [0, 0, 1, 1], GCELL.plain, paint);
    T.start = { x: -13, z: -109, yaw: Math.PI / 2 };
    T.car = { x: -11, z: -113.5, yaw: -Math.PI / 2 };
    T.shootLine = { x: 0, y: CURB, z: -111.2 };
    T.botSpot = { x: 0, z: -117 };
  },
  fence(x0, z0, x1, z1, h) {
    const F = this.B.fence; const A = this.B.atlas;
    const L = Math.hypot(x1 - x0, z1 - z0); const t = 0.06;
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) { F.box(Math.min(x0, x1), 0, z0 - 0.01, Math.max(x0, x1), h, z0 + 0.01, { faces: 'zZ', cell: CELL.fence, su: 2, sv: 2, col: [0.75, 0.78, 0.8, 0] }); World.addBox(Math.min(x0, x1), 0, z0 - t, Math.max(x0, x1), h, z0 + t, 'fence').nowalk = true; }
    else { F.box(x0 - 0.01, 0, Math.min(z0, z1), x0 + 0.01, h, Math.max(z0, z1), { faces: 'xX', cell: CELL.fence, su: 2, sv: 2, col: [0.75, 0.78, 0.8, 0] }); World.addBox(x0 - t, 0, Math.min(z0, z1), x0 + t, h, Math.max(z0, z1), 'fence').nowalk = true; }
    const n = Math.max(1, Math.round(L / 3));
    for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n); A.tube(x, 0, z, x, h + 0.05, z, 0.045, [0.35, 0.36, 0.38, 0], 5); }
    A.tube(x0, h, z0, x1, h, z1, 0.035, [0.35, 0.36, 0.38, 0], 5);
  },
  marketBlock(K) {
    const A = this.B.atlas;
    // MA, MB (west row), MC (north strip)
    const MA = this.bld(-126, -18, -113, -2, 9, 'plaster', { streets: 'xzX', col: [0.84, 0.72, 0.52] });
    const MB = this.bld(-126, 2, -113, 18, 12.5, 'brick', { streets: 'xZX', col: [0.6, 0.36, 0.28] });
    const MC = this.bld(-109, -18, -90, -10, 10, 'plaster', { streets: 'zXZ', col: [0.78, 0.63, 0.56] });
    K.blds.push(MA, MB, MC);
    this.ladder(-113, 12, 1, 0, CURB, 12.5, MB);
    this.ladder(-126, -10, -1, 0, CURB, 9, MA);
    this.sign(MB, 'X', 0.3, 'cross', 'blade', 4.2);
    this.sign(MC, 'Z', 0.5, 'lephare', 'flat', 4.6);
    // plaza cobble + stalls + fountain
    A.box(-112.5, CURB, -9.5, -90.5, CURB + 0.02, 17.5, { faces: 'Y', top: { cell: CELL.rough, su: 4, sv: 4, col: [0.35, 0.33, 0.32, 0] } });
    const stallCols = [[0.7, 0.1, 0.12], [0.1, 0.4, 0.3], [0.8, 0.55, 0.1], [0.15, 0.25, 0.55], [0.55, 0.12, 0.35], [0.1, 0.45, 0.55]];
    let k = 0;
    for (const sx of [-108, -100.5]) for (const sz of [-5, 3, 11]) {
      const c = stallCols[k++ % stallCols.length];
      A.cbox(sx - 1.6, CURB, sz - 0.9, sx + 1.6, CURB + 0.95, sz + 0.9, [0.35, 0.26, 0.18, 0]);
      A.cbox(sx - 1.9, CURB + 2.3, sz - 1.25, sx + 1.9, CURB + 2.42, sz + 1.25, [c[0], c[1], c[2], 0], 'xXzZYy');
      for (const [px, pz] of [[-1.7, -1.1], [1.7, -1.1], [-1.7, 1.1], [1.7, 1.1]]) A.tube(sx + px, CURB, sz + pz, sx + px, CURB + 2.3, sz + pz, 0.04, [0.2, 0.2, 0.2, 0]);
      // goods glowing (lanterns)
      this.B.glow.cbox(sx - 0.1, CURB + 1.9, sz - 0.1, sx + 0.1, CURB + 2.15, sz + 0.1, [1, 0.72, 0.35, 2]);
      World.lightsStatic.push({ x: sx, y: 2.0, z: sz, r: 1.6, g: 1.05, b: 0.5, range: 7 });
      this.pool(sx, sz, 3, [0.45, 0.3, 0.14], CURB + 0.05);
      World.addBox(sx - 1.6, 0, sz - 0.9, sx + 1.6, CURB + 0.95, sz + 0.9, 'prop');
      World.addBox(sx - 1.9, CURB + 2.3, sz - 1.25, sx + 1.9, CURB + 2.42, sz + 1.25, 'awning');
    }
    // string lights over plaza (glow dots)
    for (let t = 0; t <= 1; t += 1 / 14) { const x = lerp(-112.8, -90.5, t), z = lerp(-9.6, 17.5, t) , y = 5.2 - Math.sin(t * Math.PI) * 1.4; this.B.glow.cbox(x - 0.07, y, z - 0.07, x + 0.07, y + 0.14, z + 0.07, [1, 0.8, 0.45, 3]); }
    for (let t = 0; t <= 1; t += 1 / 14) { const x = lerp(-90.5, -112.8, t), z = lerp(-9.6, 17.5, t), y = 5.2 - Math.sin(t * Math.PI) * 1.4; this.B.glow.cbox(x - 0.07, y, z - 0.07, x + 0.07, y + 0.14, z + 0.07, [1, 0.55, 0.7, 3]); }
    // fountain
    const fx = -96, fz = 13;
    A.cbox(fx - 2, CURB, fz - 2, fx + 2, CURB + 0.6, fz + 2, [0.55, 0.53, 0.5, 0]); World.addBox(fx - 2, 0, fz - 2, fx + 2, CURB + 0.6, fz + 2, 'prop');
    A.tube(fx, CURB + 0.6, fz, fx, CURB + 1.9, fz, 0.25, [0.5, 0.48, 0.45, 0], 8);
    this.B.glow.cbox(fx - 1.8, CURB + 0.55, fz - 1.8, fx + 1.8, CURB + 0.56, fz + 1.8, [0.2, 0.5, 0.6, 0.6]);
    // arch sign "Marché de nuit" over the plaza entrance (south side)
    A.tube(-111, CURB, 19.2, -111, 7.2, 19.2, 0.12, [0.2, 0.2, 0.22, 0]); A.tube(-92, CURB, 19.2, -92, 7.2, 19.2, 0.12, [0.2, 0.2, 0.22, 0]);
    A.cbox(-111.2, 6.2, 19.05, -91.8, 6.35, 19.35, [0.15, 0.15, 0.17, 0], 'xXzZYy');
    World.addBox(-111.2, 0, 19.08, -110.8, 7.2, 19.32, 'prop'); World.addBox(-92.2, 0, 19.08, -91.8, 7.2, 19.32, 'prop');
    const S = Tex.signs.marche; const w = 1.6 * S.aspect; const c = SIGN_COL.marche;
    this.B.neon.quad(-101.5 - w / 2, 6.4, 19.4, w, 0, 0, 0, 1.6, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
    this.B.neon.quad(-101.5 + w / 2, 6.4, 19.0, -w, 0, 0, 0, 1.6, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0], c[1], c[2], 0.6]);
    World.lightsStatic.push({ x: -101.5, y: 6.5, z: 20.5, r: 2.2, g: 1.5, b: 0.6, range: 12 });
    this.streak(-101.5, 19.3, 0, 1, 6, 8, c);
    this.graffiti(MA, 'x', 0.5, 'g_tide', 2.2, 1.2);
    // keep the rooftop chase route clear of props
    MB.reserved = [[-114.6, 12, 2.2], [-117, 8, 2.2], [-120, 4, 2.2]];
    MA.reserved = [[-120, -3.6, 2.2], [-118, -7, 2.2], [-116, -10.5, 2.2], [-114.4, -13, 2.2]];
    MC.reserved = [[-91.5, -14, 1.8], [-107, -13.5, 2.2], [-102, -13.8, 2.2], [-97, -13.9, 2.2]];
    World.spots.market = { x: -101, y: CURB, z: 6 };
    World.spots.marketVictim = { x: -103, z: 7.5 };
  },
  oldtownHero(K) {
    const OA = this.bld(-72, -18, -56, -3, 6.5, 'brick', { streets: 'xz', col: [0.5, 0.3, 0.25] });
    const OB = this.bld(-52, -18, -36, -3, 8, 'plaster', { streets: 'zX', col: [0.62, 0.7, 0.72] });
    const OC = this.bld(-72, 1, -56, 18, 11, 'plaster', { streets: 'xZ', col: [0.86, 0.78, 0.64] });
    const OD = this.bld(-52, 1, -36, 18, 9.5, 'brick2', { streets: 'XZ', col: [0.46, 0.32, 0.26] });
    K.blds.push(OA, OB, OC, OD);
    OA.reserved = [[-70, -14, 1.8], [-66, -12.5, 2.2], [-61.5, -10.3, 2.2], [-58, -8.2, 2]];
    const Z = this.zip(-91.5, 10, -14, -70, 6.5, -14);
    World.spots.heroZip = Z;
    this.ladder(-56, 10, 1, 0, CURB, 11, OC);
    this.ladder(-36, -10, 1, 0, CURB, 8, OB);
    this.dumpster(-54, -8, Math.PI / 2);
    this.fence(-56, 18, -52, 18, 2.8);
    this.graffiti(OD, 'x', 0.3, 'g_rats', 2.8, 0.8);
    World.lightsStatic.push({ x: -54, y: 4.5, z: 6, r: 0.9, g: 0.7, b: 0.45, range: 10 }); this.B.glow.cbox(-54.2, 4.5, 5.8, -53.8, 4.65, 6.2, [1, 0.8, 0.5, 1.5]); this.pool(-54, 6, 3.5, [0.35, 0.26, 0.15], CURB + 0.03);
    // thief route (M1): list of path nodes
    World.spots.thiefPath = [
      { x: -101, y: CURB, z: 8, m: 'run' },
      { x: -112.4, y: CURB, z: 12, m: 'run' },
      { x: -112.4, y: 12.5, z: 12, m: 'ladder' },
      { x: -114.6, y: 12.5, z: 12, m: 'run' },
      { x: -120, y: 12.5, z: 3.6, m: 'run' },
      { x: -120, y: 9, z: -3.6, m: 'jump' },
      { x: -114.4, y: 9, z: -13, m: 'run' },
      { x: -107.8, y: 10, z: -13.5, m: 'jump' },
      { x: -92.2, y: 10, z: -14, m: 'run' },
      { x: -69.3, y: 6.5, z: -14, m: 'zip' },
      { x: -57.6, y: 6.5, z: -8, m: 'run' },
      { x: -54, y: CURB + 1.35, z: -8, m: 'jump' },
      { x: -54, y: CURB, z: -5.8, m: 'jump' },
      { x: -54, y: CURB, z: 16.5, m: 'run' }
    ];
  },
  graffiti(info, f, t, name, h, y) {
    const S = Tex.signs[name]; if (!S) return; const [px, pz, nx, nz] = this.facePoint(info, f, t); const c = SIGN_COL[name]; const w = h * S.aspect;
    const ox = px + nx * 0.04, oz = pz + nz * 0.04; const ux = nz * w, uz = -nx * w;
    this.B.neon.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 0]);
  },
  plazaBlock(K) {
    const A = this.B.atlas; const cx = K.cx, cz = K.cz;
    // monument: a stylised wave on a pedestal
    A.cbox(cx - 3, CURB, cz - 3, cx + 3, CURB + 1.2, cz + 3, [0.5, 0.49, 0.47, 0]); World.addBox(cx - 3, 0, cz - 3, cx + 3, CURB + 1.2, cz + 3, 'prop');
    for (let k = 0; k < 9; k++) { const a = k / 8; const y = CURB + 1.2 + a * 5.5; const r = 1.6 - a * 1.0; A.obox(cx + Math.sin(a * 3) * 1.2, y, cz, r, 0.35, 0.4, a * 0.9, [0.3, 0.42, 0.45, 0]); }
    World.addBox(cx - 1.8, CURB + 1.2, cz - 0.6, cx + 2.2, CURB + 6.8, cz + 0.6, 'prop', { nowalk: true });
    this.B.glow.cbox(cx - 3, CURB + 1.2, cz - 3.05, cx + 3, CURB + 1.26, cz - 2.99, [0.2, 0.9, 0.7, 1]);
    for (const [dx, dz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) this.tree(cx + dx, cz + dz);
    for (const [dx, dz, yaw] of [[-6, 0, 0], [6, 0, 0], [0, -6, Math.PI / 2], [0, 6, Math.PI / 2]]) {
      const hw = yaw ? 0.25 : 0.9, hd = yaw ? 0.9 : 0.25;
      A.cbox(cx + dx - hd, CURB + 0.4, cz + dz - hw, cx + dx + hd, CURB + 0.48, cz + dz + hw, [0.35, 0.25, 0.16, 0], 'xXzZY');
      World.addBox(cx + dx - hd, 0, cz + dz - hw, cx + dx + hd, CURB + 0.48, cz + dz + hw, 'prop');
    }
    for (const [dx, dz] of [[-14, 0], [14, 0], [0, -14], [0, 14]]) this.lampPost(cx + dx, cz + dz, 4.5, [0.85, 0.92, 1.1]);
    World.spots.plaza = { x: cx, y: CURB, z: cz + 8 };
  },
  tree(x, z) {
    const A = this.B.atlas; A.tube(x, CURB, z, x, CURB + 2.6, z, 0.18, [0.22, 0.16, 0.12, 0], 6);
    const s = sphereGeo(1.8, 8, 6, 0.8); A.addGeo(s, M4.compose(M4.create(), x, CURB + 3.6, z, 0, G.r(0, 3), 0), [0.1, 0.2, 0.13, 0]);
    A.addGeo(sphereGeo(1.2, 7, 5), M4.compose(M4.create(), x + 0.6, CURB + 4.6, z - 0.3, 0, 0, 0), [0.12, 0.24, 0.15, 0]);
    World.addBox(x - 0.25, 0, z - 0.25, x + 0.25, CURB + 2.6, z + 0.25, 'prop');
  },
  lampPost(x, z, h, c) {
    const A = this.B.atlas; A.tube(x, CURB, z, x, CURB + h, z, 0.08, [0.15, 0.15, 0.17, 0], 6);
    this.B.glow.addGeo(sphereGeo(0.28, 8, 6), M4.compose(M4.create(), x, CURB + h + 0.2, z, 0, 0, 0), [c[0], c[1], c[2], 2]);
    World.lightsStatic.push({ x, y: CURB + h, z, r: c[0] * 1.6, g: c[1] * 1.6, b: c[2] * 1.6, range: 10 });
    this.pool(x, z, 4, [c[0] * 0.3, c[1] * 0.3, c[2] * 0.3], CURB + 0.03);
    World.addBox(x - 0.15, 0, z - 0.15, x + 0.15, CURB + h, z + 0.15, 'pole', { noray: true });
  },
  downBlock(K) {
    const A = this.B.atlas;
    const podH = G.pick([9, 10, 11]);
    const pod = this.bld(K.lx0, K.lz0, K.lx1, K.lz1, podH, 'concrete', { streets: 'xXzZ', col: G.pick(PAL.concrete), roofProps: false });
    K.blds.push(pod);
    const tw = G.r(14, 20), td = G.r(14, 20); const tx = K.cx + G.r(-4, 4), tz = K.cz + G.r(-4, 4);
    const H = G.r(34, 72);
    const tower = this.bld(tx - tw / 2, tz - td / 2, tx + tw / 2, tz + td / 2, H, G.chance(0.5) ? 'tower' : 'glass', { base: podH, roofProps: false, signs: false });
    K.blds.push(tower);
    // tower corner light strips
    const lc = G.pick([[0.3, 0.8, 1], [1, 0.4, 0.7], [0.9, 0.9, 1]]);
    for (const [x, z] of [[tx - tw / 2, tz - td / 2], [tx + tw / 2, tz - td / 2], [tx - tw / 2, tz + td / 2], [tx + tw / 2, tz + td / 2]]) this.B.glow.cbox(x - 0.12, podH, z - 0.12, x + 0.12, H, z + 0.12, [lc[0], lc[1], lc[2], 1.2]);
    this.B.glow.cbox(tx - 0.2, H, tz - 0.2, tx + 0.2, H + 0.5, tz + 0.2, [1, 0.1, 0.1, 3]);
    // podium roof: props, billboard
    pod.reserved = [[tx, tz, Math.max(tw, td) * 0.75]];
    this.pending.push(pod);
    const bb = G.pick(['bb_volt', 'bb_tel', 'bb_cine', 'bb_tide']);
    const faces = pod.streets.split(''); const f = G.pick(faces);
    this.billboard(pod, f, bb, podH);
    this.ladder(...this.facePoint(pod, G.pick(faces), G.r(0.15, 0.3)), CURB, podH, pod);
  },
  billboard(info, f, name, h) {
    const S = Tex.signs[name]; const [px, pz, nx, nz] = this.facePoint(info, f, 0.5); const A = this.B.atlas;
    const w = 12, hh = w / S.aspect; const ox = px - nx * 1.2, oz = pz - nz * 1.2; const y = h + 1.4;
    const ux = nz * w, uz = -nx * w;
    this.B.boards.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, hh, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [1, 1, 1, 0.3]);
    A.cbox(Math.min(ox - ux / 2, ox + ux / 2) - (nx ? 0.2 : 0.1), y - 0.2, Math.min(oz - uz / 2, oz + uz / 2) - (nz ? 0.2 : 0.1), Math.max(ox - ux / 2, ox + ux / 2) + (nx ? 0 : 0.1), y + hh + 0.2, Math.max(oz - uz / 2, oz + uz / 2) + (nz ? 0 : 0.1), [0.1, 0.1, 0.12, 0], 'xXzZY');
    for (const s of [-0.35, 0.35]) A.tube(ox + ux * s - nx * 0.6, h, oz + uz * s - nz * 0.6, ox + ux * s - nx * 0.2, y, oz + uz * s - nz * 0.2, 0.1, [0.2, 0.2, 0.22, 0]);
    World.lightsStatic.push({ x: ox + nx * 4, y: y + hh / 2, z: oz + nz * 4, r: 1.5, g: 1.5, b: 1.6, range: 16 });
  },
  indusBlock(K) {
    const A = this.B.atlas;
    const split = K.lx0 + (K.lx1 - K.lx0) * G.r(0.45, 0.6);
    const w1 = this.bld(K.lx0, K.lz0, split - 3, K.lz1 - 12, G.r(8, 11), 'industrial', { streets: this.streets(K, K.lx0, K.lz0, split - 3, K.lz1 - 12), shops: false, signs: false });
    const w2 = this.bld(split + 1, K.lz0, K.lx1, K.lz0 + 16, G.r(7, 10), 'industrial', { streets: this.streets(K, split + 1, K.lz0, K.lx1, K.lz0 + 16), shops: false, signs: false });
    K.blds.push(w1, w2);
    // loading doors (shutter texture) + door lights
    for (const w of [w1, w2]) {
      const f = w.streets.indexOf('Z') >= 0 ? 'Z' : w.streets.indexOf('z') >= 0 ? 'z' : 'X';
      const [px, pz, nx, nz] = this.facePoint(w, f, 0.5);
      const tx = -nz, tz = nx; const hw = 2.5;
      const gx0 = Math.min(px - tx * hw, px + tx * hw) + nx * 0.02, gx1 = Math.max(px - tx * hw, px + tx * hw) + nx * 0.06, gz0 = Math.min(pz - tz * hw, pz + tz * hw) + nz * 0.02, gz1 = Math.max(pz - tz * hw, pz + tz * hw) + nz * 0.06;
      A.box(gx0, 0, gz0, gx1, 4.5, gz1, { faces: 'xXzZ', cell: CELL.shutter, su: 5, sv: 4.5, col: [0.8, 0.8, 0.8, 0] });
      this.B.glow.cbox(px + nx * 0.1 - 0.3, 5, pz + nz * 0.1 - 0.3, px + nx * 0.1 + 0.3, 5.2, pz + nz * 0.1 + 0.3, [1, 0.75, 0.4, 2]);
      World.lightsStatic.push({ x: px + nx * 1.5, y: 5, z: pz + nz * 1.5, r: 1.6, g: 1.1, b: 0.6, range: 11 }); this.pool(px + nx * 2.5, pz + nz * 2.5, 4, [0.5, 0.36, 0.18]);
      this.ladder(...this.facePoint(w, 'xXzZ'.replace(f, '')[G.i(0, 2)], G.r(0.2, 0.8)), CURB, w.h, w);
    }
    // yard: fence + containers + smokestack
    this.fence(split + 1, K.lz1, K.lx1, K.lz1, 3);
    for (let k = 0; k < 4; k++) this.container(G.r(split + 4, K.lx1 - 4), CURB, G.r(K.lz0 + 20, K.lz1 - 4), G.chance(0.5) ? 0 : Math.PI / 2, G.pick(PAL.container));
    const sx = K.lx0 + 4, sz = K.lz1 - 5; A.addGeo(cylGeo(1.4, 1.0, 28, 10), M4.compose(M4.create(), sx, CURB, sz, 0, 0, 0), [0.4, 0.36, 0.34, 0]);
    this.B.glow.cbox(sx - 1.05, 26, sz - 1.05, sx + 1.05, 26.4, sz + 1.05, [1, 0.1, 0.08, 1.5]);
    World.addBox(sx - 1.4, 0, sz - 1.4, sx + 1.4, 28, sz + 1.4, 'prop');
  },
  container(x, y, z, yaw, c, stackTop) {
    const A = this.B.atlas; const L = 6.06, W = 2.44, H = 2.59;
    const along = Math.abs(Math.sin(yaw)) > 0.5; // yaw=pi/2 -> along x
    const hx = along ? L / 2 : W / 2, hz = along ? W / 2 : L / 2;
    // overlap check with existing boxes at that level
    const q = World.query(x - hx + 0.05, z - hz + 0.05, x + hx - 0.05, z + hz - 0.05, []);
    if (q.some(b => (b.kind === 'bld' || b.kind === 'cont' || b.kind === 'prop') && b.y1 > y + 0.1 && b.y0 < y + H - 0.1)) return null;
    const col = [c[0], c[1], c[2], 0];
    A.box(x - hx, y, z - hz, x + hx, y + H, z + hz, { faces: along ? 'zZ' : 'xX', cell: CELL.container, su: L, sv: H, col });
    A.box(x - hx, y, z - hz, x + hx, y + H, z + hz, { faces: along ? 'xXY' : 'zZY', cell: CELL.metal, su: 2.6, sv: 2.6, col: [c[0] * 0.85, c[1] * 0.85, c[2] * 0.85, 0], top: { cell: CELL.metal, su: 3, sv: 3, col: [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0] } });
    return World.addBox(x - hx, y, z - hz, x + hx, y + H, z + hz, 'cont');
  },
  /* ---------------- docks ---------------- */
  dockBlock(K) {
    const A = this.B.atlas;
    this.slab(K.bx0, K.bz0, K.bx1, K.bz1, GCELL.asphalt);
    if (K.ci <= 1) { // container yards
      const rows = [K.lz0 + 2.5, K.lz0 + 10, K.lz0 + 17.5, K.lz0 + 25, K.lz0 + 32.5];
      const xs = []; for (let x = K.lx0 + 3.2; x < K.lx1 - 3; x += 6.5) xs.push(x);
      rows.forEach((rz, ri) => {
        xs.forEach((x, xi) => {
          if (!(K.ci === 1 && ri === 2) && G.chance(0.18)) return; // gaps for passages
          let hN = G.i(1, 3);
          if (K.ci === 1 && ri === 2) hN = [1, 2, 3, 3, 2, 1][xi % 6];
          for (let s = 0; s < hN; s++) this.container(x, CURB + s * 2.59, rz, Math.PI / 2, G.pick(PAL.container));
        });
      });
      this.fence(K.bx0 + 0.5, K.bz0 + 0.5, K.bx1 - 0.5, K.bz0 + 0.5, 2.8);
      if (K.ci === 1) {
        World.spots.crate = { x: xs[2], y: CURB + 3 * 2.59, z: rows[2] };
        World.spots.yard = { x: K.cx, y: CURB, z: K.cz };
        // gang hideout cabin
        const cab = this.bld(K.lx1 - 7, K.lz1 - 5, K.lx1, K.lz1, 3.2, 'industrial', { roofProps: false, signs: false, shops: false });
        this.graffiti(cab, 'z', 0.5, 'g_rats', 1.4, 0.8);
        World.lightsStatic.push({ x: K.lx1 - 3.5, y: 3, z: K.lz1 - 6, r: 1.6, g: 0.8, b: 0.3, range: 9 });
      }
    } else if (K.ci === 2) { // Entrepot 7
      const w = this.bld(K.lx0, K.lz0, K.lx1, K.lz0 + 24, 11, 'industrial', { streets: 'xXz', shops: false, signs: false, col: [0.6, 0.52, 0.42] });
      this.ladder(K.lx1, K.lz0 + 12, 1, 0, CURB, 11, w);
      this.graffiti(w, 'Z', 0.3, 'g_sea', 1.8, 2.4);
      for (let k = 0; k < 5; k++) this.container(G.r(K.lx0 + 4, K.lx1 - 4), CURB, G.r(K.lz0 + 28, K.lz1 - 2), 0, G.pick(PAL.container));
    } else if (K.ci === 3) { // La Criee (fish market) + warehouse
      const cr = this.bld(K.lx0, K.lz0, K.lx1, K.lz0 + 16, 8.5, 'brick2', { streets: 'xXzZ', col: [0.55, 0.48, 0.42], signs: false });
      this.sign(cr, 'Z', 0.5, 'criee', 'flat', 5);
      this.sign(cr, 'z', 0.5, 'criee', 'flat', 5);
      const w = this.bld(K.lx0, K.lz1 - 14, K.lx0 + 20, K.lz1, 9, 'industrial', { streets: 'xZ', shops: false, signs: false });
      this.ladder(K.lx0 + 20, K.lz1 - 7, 1, 0, CURB, 9, w);
    } else { // capitainerie
      const cp = this.bld(K.lx0 + 4, K.lz0 + 4, K.lx1 - 10, K.lz0 + 20, 13, 'plaster', { streets: 'x', col: [0.84, 0.82, 0.78] });
      this.ladder(K.lx1 - 10, K.lz0 + 12, 1, 0, CURB, 13, cp);
      this.sign(cp, 'x', 0.5, 'motel', 'flat', 5);
      A.tube(K.lx1 - 14, 13, K.lz0 + 8, K.lx1 - 14, 22, K.lz0 + 8, 0.08, [0.3, 0.3, 0.3, 0]);
      this.B.glow.cbox(K.lx1 - 14.2, 22, K.lz0 + 7.8, K.lx1 - 13.8, 22.3, K.lz0 + 8.2, [0.2, 1, 0.4, 3]);
    }
  },
  docks() {
    const A = this.B.atlas;
    // sidewalk strip south of the quay road
    this.slab(-260, 141, 260, 144, GCELL.pavers);
    // cranes
    const craneX = [-100, -40, 40];
    craneX.forEach((cx, k) => {
      const col = k === 1 ? [0.85, 0.55, 0.12, 0] : [0.7, 0.18, 0.12, 0];
      for (const lx of [-5, 5]) for (const lz of [150, 168]) { A.cbox(cx + lx - 0.6, 0, lz - 0.6, cx + lx + 0.6, 27, lz + 0.6, col); World.addBox(cx + lx - 0.6, 0, lz - 0.6, cx + lx + 0.6, 27, lz + 0.6, 'prop'); }
      A.cbox(cx - 6, 25, 148, cx + 6, 28, 170, col, 'xXzZYy');
      A.cbox(cx - 1.4, 26, 150, cx + 1.4, 28.5, 225, col, 'xXzZYy');
      A.cbox(cx - 2, 22.5, 160, cx + 2, 25, 164, [0.8, 0.8, 0.78, 0], 'xXzZYy');
      this.B.glow.cbox(cx - 1.9, 23.2, 164, cx + 1.9, 24.4, 164.05, [1, 0.85, 0.6, 1.2]);
      this.B.glow.cbox(cx - 0.2, 28.5, 224.5, cx + 0.2, 28.9, 224.9, [1, 0.1, 0.08, 3]);
      for (const lz of [150, 168]) A.cbox(cx - 5.5, 1.5, lz - 0.3, cx + 5.5, 2.0, lz + 0.3, col, 'xXzZYy');
      A.tube(cx, 26, 212, cx, 12, 212, 0.04, [0.1, 0.1, 0.1, 0]);
    });
    World.spots.crane = { x: -40, y: 0, z: 158 };
    // light masts on the quay
    for (const mx of [-120, -70, -10, 60, 120]) {
      const mz = 156; A.tube(mx, 0, mz, mx, 20, mz, 0.25, [0.35, 0.35, 0.37, 0], 8);
      A.cbox(mx - 1.2, 20, mz - 0.5, mx + 1.2, 20.4, mz + 0.5, [0.25, 0.25, 0.27, 0]);
      this.B.glow.cbox(mx - 1.1, 19.9, mz - 0.4, mx + 1.1, 20.0, mz + 0.4, [1, 0.72, 0.4, 3]);
      World.lightsStatic.push({ x: mx, y: 19, z: mz, r: 3.2, g: 2.2, b: 1.2, range: 28 });
      this.pool(mx, mz, 14, [0.4, 0.28, 0.14]); this.cone(mx, 19.8, mz, 9, [0.12, 0.085, 0.05]);
      World.addBox(mx - 0.3, 0, mz - 0.3, mx + 0.3, 20, mz + 0.3, 'pole', { noray: true });
    }
    // bollards
    for (let x = -140; x <= 140; x += 9) { A.addGeo(cylGeo(0.25, 0.2, 0.55, 8), M4.compose(M4.create(), x, 0, WATER_Z - 0.8, 0, 0, 0), [0.15, 0.15, 0.16, 0]); }
    // quay containers near cranes
    for (let k = 0; k < 10; k++) { const x = G.r(-135, 130), z = G.r(146, 164); if (Math.abs(x - 95) < 12 || craneX.some(c => Math.abs(x - c) < 8)) continue; for (let s = 0; s < G.i(1, 2); s++) this.container(x, s * 2.59, z, G.chance(0.5) ? 0 : Math.PI / 2, G.pick(PAL.container)); }
    // ship
    const hull = [0.12, 0.15, 0.22, 0];
    A.cbox(-132, WATER_Y - 3, 176, -60, 3.5, 196, hull, 'xXzZY'); World.addBox(-132, WATER_Y - 3, 176, -60, 3.5, 196, 'bld');
    A.cbox(-132.05, 1.5, 175.95, -59.95, 2.1, 196.05, [0.55, 0.12, 0.1, 0], 'xXzZ');
    const sup = this.bld(-126, 177.5, -114, 194.5, 14, 'glass', { base: 3.5, roofProps: false, signs: false, col: [0.9, 0.9, 0.92] });
    for (let k = 0; k < 5; k++) for (let s = 0; s < 2; s++) this.container(-108 + k * 8.5, 3.5 + s * 2.59, 186, Math.PI / 2, G.pick(PAL.container));
    this.B.glow.cbox(-120.2, 17.5, 185.8, -119.8, 18, 186.2, [1, 1, 1, 3]);
    // pier A (wood)
    this.pier(-20, -12, WATER_Z, 214);
    // breakwater + lighthouse
    this.B.atlas.box(91, WATER_Y - 2, WATER_Z, 99, 0, 234, { faces: 'xXzZY', cell: CELL.rough, su: 6, sv: 6, col: [0.55, 0.55, 0.55, 0], top: { cell: CELL.rough, su: 6, sv: 6, col: [0.6, 0.6, 0.6, 0] } });
    World.addBox(91, WATER_Y - 2, WATER_Z - 1, 99, 0, 234, 'pier');
    for (let z = 180; z < 232; z += 10) { this.lampPost(91.5, z, 3.5, [1, 0.8, 0.55]); }
    this.B.atlas.box(79, WATER_Y - 2, 232, 111, 0, 264, { faces: 'xXzZY', cell: CELL.rough, su: 6, sv: 6, col: [0.5, 0.5, 0.5, 0], top: { cell: CELL.rough, su: 5, sv: 5, col: [0.62, 0.6, 0.58, 0] } });
    World.addBox(79, WATER_Y - 2, 232, 111, 0, 264, 'pier');
    // parapet around platform (gap at breakwater)
    const pc = [0.45, 0.45, 0.45, 0];
    for (const [x0, z0, x1, z1] of [[79, 263.4, 111, 264], [79, 232, 79.6, 264], [110.4, 232, 111, 264], [79, 232, 90.5, 232.6], [99.5, 232, 111, 232.6]]) { A.cbox(x0, 0, z0, x1, 0.75, z1, pc); World.addBox(x0, 0, z0, x1, 0.75, z1, 'wall'); }
    // lighthouse tower
    const tx = 95, tz = 252;
    for (let k = 0; k < 6; k++) { const y0 = k * 3.7; const c = k % 2 ? [0.75, 0.12, 0.12, 0] : [0.9, 0.9, 0.88, 0]; A.addGeo(cylGeo(3.4 - k * 0.12, 3.4 - (k + 1) * 0.12, 3.7, 16, false), M4.compose(M4.create(), tx, y0, tz, 0, 0, 0), c); }
    World.addBox(tx - 3.2, 0, tz - 3.2, tx + 3.2, 22, tz + 3.2, 'bld');
    A.cbox(tx - 4.2, 21.7, tz - 4.2, tx + 4.2, 22.0, tz + 4.2, [0.2, 0.2, 0.22, 0], 'xXzZYy');
    World.addBox(tx - 4.2, 21.7, tz - 3.2, tx + 4.2, 22.0, tz + 4.2, 'bld');
    // railings (leave the ladder side open)
    for (const [x0, z0, x1, z1] of [[tx - 4.2, tz + 4.1, tx + 4.2, tz + 4.2], [tx - 4.2, tz - 3.2, tx - 4.1, tz + 4.2], [tx + 4.1, tz - 3.2, tx + 4.2, tz + 4.2]]) { A.cbox(x0, 22, z0, x1, 23.1, z1, [0.2, 0.2, 0.22, 0]); World.addBox(x0, 22, z0, x1, 23.1, z1, 'wall'); }
    // lantern room
    A.cbox(tx - 1.8, 22, tz - 1.2, tx + 1.8, 22.6, tz + 2.4, [0.2, 0.2, 0.22, 0]);
    World.addBox(tx - 1.8, 22, tz - 1.2, tx + 1.8, 26.2, tz + 2.4, 'bld');
    A.addGeo(cylGeo(2.0, 0.3, 1.6, 12), M4.compose(M4.create(), tx, 25.8, tz + 0.6, 0, 0, 0), [0.25, 0.25, 0.27, 0]);
    this.ladder(tx, tz - 3.2, 0, -1, 0, 22, null);
    World.spots.lighthouse = { x: tx, z: tz, top: 22, lamp: { x: tx, y: 24, z: tz + 0.6 }, arena: { x: 95, z: 243 }, breakwaterStart: { x: 95, z: 176 } };
    // braziers on the platform (cult ritual)
    World.spots.braziers = [[85, 240], [105, 240], [85, 258], [105, 258]];
    for (const [bx, bz] of World.spots.braziers) { A.addGeo(cylGeo(0.5, 0.7, 1.0, 8), M4.compose(M4.create(), bx, 0, bz, 0, 0, 0), [0.2, 0.18, 0.16, 0]); World.addBox(bx - 0.6, 0, bz - 0.6, bx + 0.6, 1.0, bz + 0.6, 'prop'); }
  },
  pier(x0, x1, z0, z1) {
    const A = this.B.atlas;
    A.box(x0, -0.35, z0, x1, 0, z1, { faces: 'xXzZY', cell: CELL.wood, su: 4, sv: 4, col: [0.8, 0.7, 0.6, 0], top: { cell: CELL.wood, su: 4, sv: 4, col: [0.75, 0.65, 0.55, 0] } });
    World.addBox(x0, -0.35, z0 - 1, x1, 0, z1, 'pier');
    for (let z = z0 + 3; z < z1; z += 6) for (const x of [x0 + 0.4, x1 - 0.4]) A.tube(x, WATER_Y - 2, z, x, 0, z, 0.2, [0.25, 0.2, 0.16, 0], 6);
    this.lampPost(x1 - 0.5, z1 - 2, 3.2, [1, 0.75, 0.5]);
    // moored boats
    for (let k = 0; k < 3; k++) { const bz = z0 + 8 + k * 11; const bx = k % 2 ? x1 + 2.5 : x0 - 2.5; A.obox(bx, WATER_Y + 0.4, bz, 1.2, 0.6, 3.5, 0, [0.8, 0.8, 0.78, 0]); A.obox(bx, WATER_Y + 1.1, bz - 0.5, 0.8, 0.4, 1.2, 0, [0.2, 0.3, 0.5, 0]); }
  },
  /* ---------------- backdrop & skyline ---------------- */
  // closed ring of tall buildings around the playable area, far towers and the far shore across the bay
  backdrop() {
    const X0 = RX[0] - RHW - SIDEW, X1 = RX[NI] + RHW + SIDEW, Z0 = RZ[0] - RHW - SIDEW; // outer sidewalk edges
    this.slab(BOUNDS.x0, BOUNDS.z0, X0, 141, GCELL.pavers); this.slab(X1, BOUNDS.z0, BOUNDS.x1, 141, GCELL.pavers); this.slab(X0, BOUNDS.z0, X1, Z0, GCELL.pavers);
    const ring = [];
    for (let z = Z0 - 36; z < 138; ) { const d = G.r(18, 34); const z1 = Math.min(z + d, 138); ring.push([X0 - G.r(26, 34), z, X0, z1]); ring.push([X1, z, X1 + G.r(26, 34), z1]); z = z1 + G.r(0, 1.5); }
    for (let x = X0; x < X1; ) { const d = G.r(18, 36); const x1 = Math.min(x + d, X1); ring.push([x, Z0 - G.r(26, 36), x1, Z0]); x = x1 + G.r(0, 1.5); }
    for (const [x0, z0, x1, z1] of ring) {
      const h = G.r(16, 52); const style = G.pick(['brick', 'concrete', 'glass', 'plaster', 'brick2', 'tenement', 'office', 'stone']);
      this.bld(x0, z0, x1, z1, h, style, { roofProps: false, signs: false, shops: false });
    }
    // invisible limits of the playable area (nobody walks or drives out into the void)
    const BW = 3, BH = 60, bo = { noray: true, nowalk: true };
    World.addBox(BOUNDS.x0 - BW, -5, BOUNDS.z0 - BW, BOUNDS.x0, BH, WATER_Z, 'bound', bo); World.addBox(BOUNDS.x1, -5, BOUNDS.z0 - BW, BOUNDS.x1 + BW, BH, WATER_Z, 'bound', bo);
    World.addBox(BOUNDS.x0 - BW, -5, BOUNDS.z0 - BW, BOUNDS.x1 + BW, BH, BOUNDS.z0, 'bound', bo);
    // quay ends beyond the city
    this.bld(BOUNDS.x0, 144, X0 - 2, WATER_Z, 14, 'industrial', { roofProps: false, signs: false, shops: false });
    this.bld(X1 + 2, 144, BOUNDS.x1, WATER_Z, 14, 'industrial', { roofProps: false, signs: false, shops: false });
    // far skyline towers (no colliders)
    const A = this.B.atlas;
    for (let k = 0; k < 70; k++) {
      const a = k / 70 * TAU + G.r(-0.03, 0.03); const r = G.r(600, 820); const x = Math.sin(a) * r * 1.1, z = -Math.cos(a) * r * 0.75 - 120;
      if (z > WATER_Z - 20) continue;
      const w = G.r(22, 48), h = G.r(50, 190), st = G.pick([CELL.glass, CELL.tower, CELL.concrete, CELL.office]);
      A.box(x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, { faces: 'xXzZ', cell: st, su: 24, sv: 25.6, col: [0.6, 0.65, 0.75, 0] });
      if (G.chance(0.5)) this.B.glow.cbox(x - 0.4, h, z - 0.4, x + 0.4, h + 0.8, z + 0.4, [1, 0.1, 0.1, 3]);
    }
    // far shore across the bay
    for (let x = -900; x < 900; x += G.r(20, 60)) {
      const w = G.r(15, 45), h = G.r(8, 70), z = G.r(620, 700);
      A.box(x, -2, z, x + w, h, z + w * 0.6, { faces: 'xXzZ', cell: G.pick([CELL.glass, CELL.tower, CELL.concrete, CELL.brick]), su: 24, sv: 25.6, col: [0.5, 0.55, 0.65, 0] });
    }
  },
  /* ---------------- facade details: iron fire escapes on the old brick buildings, air conditioners under windows ---------------- */
  facadeDetails() {
    const A = this.B.detail, rnd = mulberry32(8086), IRON = [0.09, 0.09, 0.1, 0];
    const OLD = { tenement: 1, brick: 1, brick2: 1 }, AC = { tenement: 1, brick: 1, brick2: 1, plaster: 1, concrete: 1, hlm: 1, house: 1 };
    const frame = (b, f) => f === 'X' ? { ox: b.x1, oz: b.z1, tx: 0, tz: -1, nx: 1, nz: 0, len: b.z1 - b.z0 } : f === 'x' ? { ox: b.x0, oz: b.z0, tx: 0, tz: 1, nx: -1, nz: 0, len: b.z1 - b.z0 }
      : f === 'Z' ? { ox: b.x0, oz: b.z1, tx: 1, tz: 0, nx: 0, nz: 1, len: b.x1 - b.x0 } : { ox: b.x1, oz: b.z0, tx: -1, tz: 0, nx: 0, nz: -1, len: b.x1 - b.x0 };
    // a box given in face coordinates: s along the face, d out from the wall, y up
    const fbox = (F, s0, s1, d0, d1, y0, y1, col, faces) => {
      const ax = F.ox + F.tx * s0 + F.nx * d0, az = F.oz + F.tz * s0 + F.nz * d0, bx = F.ox + F.tx * s1 + F.nx * d1, bz = F.oz + F.tz * s1 + F.nz * d1;
      A.box(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), { col, cell: CELL.plain, faces: faces || 'xXzZY' });
    };
    const P = (F, s, d, y) => [F.ox + F.tx * s + F.nx * d, y, F.oz + F.tz * s + F.nz * d];
    const busy = (F, s0, s1, y0, y1) => { // signs, lamps or ladders on this stretch of wall?
      for (const l of World.lightsStatic) { if (l.y < y0 || l.y > y1) continue; const u = (l.x - F.ox) * F.tx + (l.z - F.oz) * F.tz, v = (l.x - F.ox) * F.nx + (l.z - F.oz) * F.nz; if (u > s0 - 1 && u < s1 + 1 && v > -0.5 && v < 2.5) return true; }
      for (const L of World.ladders) { const u = (L.x - F.ox) * F.tx + (L.z - F.oz) * F.tz, v = (L.x - F.ox) * F.nx + (L.z - F.oz) * F.nz; if (u > s0 - 1.5 && u < s1 + 1.5 && Math.abs(v) < 1) return true; }
      return false;
    };
    const escape = (F, c0, yb, floors) => { // landings over two window columns, zig-zag flights, drop ladder
      const s0 = c0 * 3 + 0.2, s1 = s0 + 5.6, D = 1.15, OUT = F.nx > 0 ? 'X' : F.nx < 0 ? 'x' : F.nz > 0 ? 'Z' : 'z', ENDS = F.nx ? 'zZ' : 'xX';
      for (let k = 0; k < floors; k++) {
        const y = yb + k * 3.2;
        fbox(F, s0, s1, 0.02, D, y - 0.05, y, IRON, 'Yy' + OUT);
        fbox(F, s0, s1, D - 0.04, D, y + 0.93, y + 0.97, IRON, 'Yy' + OUT); fbox(F, s0, s1, D - 0.03, D, y + 0.48, y + 0.51, IRON, OUT);
        for (const e of [s0, s1 - 0.04]) { fbox(F, e, e + 0.04, 0.02, D, y + 0.93, y + 0.97, IRON, 'Y' + ENDS); fbox(F, e, e + 0.04, 0.02, D, y, y + 0.97, IRON, ENDS); }
        for (let u = s0 + 0.45; u < s1 - 0.2; u += 0.5) fbox(F, u, u + 0.03, D - 0.03, D, y, y + 0.95, IRON, OUT);
        if (k < floors - 1) { // flight up to the next landing, alternating sides
          const left = k % 2 === 0, lo = left ? s1 - 0.35 : s0 + 0.35, hi = left ? s0 + 3.1 : s1 - 3.1, y2 = y + 3.2;
          for (let q = 1; q < 8; q++) { const t = q / 8, u = lerp(lo, hi, t), yy = lerp(y, y2, t); fbox(F, Math.min(u, u + (left ? 0.3 : -0.3)), Math.max(u, u + (left ? 0.3 : -0.3)), 0.3, 0.95, yy - 0.03, yy, IRON, 'Yy'); }
          for (const d of [0.28, 0.97]) { const a = P(F, lo, d, y - 0.02), b = P(F, hi, d, y2 - 0.02); A.tube(a[0], a[1], a[2], b[0], b[1], b[2], 0.03, IRON, 3); }
          const a = P(F, lo, 0.97, y + 0.9), b = P(F, hi, 0.97, y2 + 0.9); A.tube(a[0], a[1], a[2], b[0], b[1], b[2], 0.02, IRON, 3);
        }
      }
      // drop ladder under the first landing
      const lu = s0 + 0.5; for (const o of [0, 0.42]) { const a = P(F, lu + o, 0.75, yb - 0.05), b = P(F, lu + o, 0.75, yb - 2.0); A.tube(a[0], a[1], a[2], b[0], b[1], b[2], 0.022, IRON, 3); }
      for (let yy = yb - 1.9; yy < yb - 0.1; yy += 0.35) fbox(F, lu, lu + 0.42, 0.74, 0.76, yy - 0.02, yy, IRON, OUT);
    };
    const acUnit = (F, s, y) => { // box under a window, grille on its face
      const OUT = F.nx > 0 ? 'X' : F.nx < 0 ? 'x' : F.nz > 0 ? 'Z' : 'z', ENDS = F.nx ? 'zZ' : 'xX';
      fbox(F, s - 0.33, s + 0.33, 0.01, 0.42, y - 0.42, y, [0.7, 0.7, 0.68, 0], 'Yy' + ENDS);
      fbox(F, s - 0.33, s + 0.33, 0.42, 0.425, y - 0.42, y, [0.3, 0.31, 0.32, 0], OUT);
    };
    for (const b of World.buildings) {
      if (b.y0 || !b.style) continue;
      const old = OLD[b.style], ac = AC[b.style]; if (!old && !ac) continue;
      for (const f of 'xXzZ') {
        const F = frame(b, f); if (F.len < 7) continue;
        const shop = (b.shopFaces || '').indexOf(f) >= 0, street = (b.streets || '').indexOf(f) >= 0;
        const base = shop ? 3.9 : -0.4, first = shop ? 0 : 1, cols = Math.floor(F.len / 3);
        const floors = Math.floor((b.h - 3.1 - (base + first * 3.2)) / 3.2) + 1; // window bands fully under the cornice
        let used = -1;
        if (old && floors >= 2 && cols >= 3 && rnd() < (street ? (b.style === 'tenement' ? 0.7 : 0.35) : 0.25)) {
          const c0 = 1 + Math.floor(rnd() * (cols - 2)), yb = base + first * 3.2 + 0.62;
          if (c0 + 2 <= cols && !busy(F, c0 * 3, c0 * 3 + 6, yb - 2.5, yb + floors * 3.2)) { escape(F, c0, yb, floors); used = c0; (World.escapes = World.escapes || []).push(P(F, c0 * 3 + 3, 0, yb)); }
        }
        if (ac) for (let k = 0; k < floors; k++) for (let c = 0; c < cols; c++) {
          if (used >= 0 && (c === used || c === used + 1)) continue; if (rnd() > 0.04) continue;
          const y = base + (first + k) * 3.2 + 0.64, s = c * 3 + 1.5; if (shop && y < 4.6) continue;
          if (!busy(F, s - 0.5, s + 0.5, y - 1, y + 0.6)) acUnit(F, s, y);
        }
      }
    }
  },
  /* ---------------- traffic lights: a mast arm on the far right corner of every approach ---------------- */
  signals() {
    const A = this.B.detail, Gl = this.B.glow; World.signals = []; World.signalNodes = {};
    const H = [0.5, 0.42, 0.1, 0], P = [0.16, 0.17, 0.18, 0], dim = [[0.35, 0.05, 0.04, 0.12], [0.35, 0.22, 0.03, 0.12], [0.04, 0.3, 0.14, 0.12]];
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
      if (!Net.node(i, j)) continue; const rx = RX[i], rz = RZ[j];
      const app = []; if (Net.segZ(i, j - 1)) app.push([0, 1]); if (Net.segZ(i, j)) app.push([0, -1]); if (Net.segX(i - 1, j)) app.push([1, 0]); if (Net.segX(i, j)) app.push([-1, 0]);
      if (app.length < 3) continue;
      const key = i * 100 + j; World.signalNodes[key] = { off: (Math.abs(Math.sin(i * 12.9898 + j * 78.233)) * 43758.5453 % 1) * 24 };
      for (const [dx, dz] of app) {
        const sx = -dz, sz = dx; // side on which this approach drives
        const px = rx + dx * (RHW + 2.9) + sx * (RHW + 0.6), pz = rz + dz * (RHW + 2.9) + sz * (RHW + 0.6);
        const ax = px - sx * 3.9, az = pz - sz * 3.9, top = CURB + 5.9;
        A.tube(px, CURB, pz, px, top + 0.1, pz, 0.1, P, 6); A.tube(px, top - 0.15, pz, ax - sx * 0.2, top, az - sz * 0.2, 0.06, P, 5);
        A.tube(px, top - 1.1, pz, px - sx * 1.4, top - 0.12, pz - sz * 1.4, 0.035, P, 3); // brace
        // head hanging under the arm, lenses facing the cars that come (direction −d)
        const hx = ax, hz = az, hy = top - 0.75, fx = -dx, fz = -dz;
        A.tube(hx, top - 0.1, hz, hx, hy + 0.5, hz, 0.03, P, 3);
        const hw = 0.19, hd = 0.15;
        A.cbox(hx - (dz ? hw : hd), hy - 0.5, hz - (dx ? hw : hd), hx + (dz ? hw : hd), hy + 0.5, hz + (dx ? hw : hd), H, 'xXzZYy');
        const bx = hx - fx * (hd + 0.02), bz = hz - fz * (hd + 0.02); // backplate behind the head
        A.cbox(bx - (dz ? 0.34 : 0.012), hy - 0.62, bz - (dx ? 0.34 : 0.012), bx + (dz ? 0.34 : 0.012), hy + 0.62, bz + (dx ? 0.34 : 0.012), [0.05, 0.05, 0.05, 0], dz ? 'zZ' : 'xX');
        const heads = [];
        for (let k = 0; k < 3; k++) {
          const ly = hy + 0.3 - k * 0.3, lx = hx + fx * (hd + 0.012), lz = hz + fz * (hd + 0.012);
          Gl.cbox(lx - (dz ? 0.11 : 0.012), ly - 0.11, lz - (dx ? 0.11 : 0.012), lx + (dz ? 0.11 : 0.012), ly + 0.11, lz + (dx ? 0.11 : 0.012), dim[k], fx > 0 ? 'X' : fx < 0 ? 'x' : fz > 0 ? 'Z' : 'z');
          const v1x = lx + fx * 0.2, v1z = lz + fz * 0.2, wX = dz ? 0.13 : 0, wZ = dx ? 0.13 : 0; // visor
          A.cbox(Math.min(lx, v1x) - wX, ly + 0.115, Math.min(lz, v1z) - wZ, Math.max(lx, v1x) + wX, ly + 0.14, Math.max(lz, v1z) + wZ, H, 'Yy');
          heads.push([lx + fx * 0.02, ly, lz + fz * 0.02]);
        }
        World.signals.push({ key, ax: dx !== 0 ? 'x' : 'z', x: hx, y: hy, z: hz, fx, fz, lens: heads });
        World.addBox(px - 0.14, 0, pz - 0.14, px + 0.14, top, pz + 0.14, 'pole', { noray: true });
      }
    }
  },
  /* ---------------- sidewalk clutter: hydrants, bins, newspaper boxes, phone booths, bin bags; manholes and steam vents ---------------- */
  streetProps() {
    const A = this.B.detail, Gl = this.B.glow, rnd = mulberry32(31337), r = (a, b) => a + (b - a) * rnd(); World.vents = [];
    const M = (x, y, z, ry) => M4.compose(M4.create(), x, y, z, 0, ry || 0, 0);
    const free = (x, z, rad) => { // on a bare sidewalk, nothing standing there already
      if (Math.abs(World.groundAt(x, z, 0.05, 3) - CURB) > 0.02) return false;
      for (const b of World.query(x - rad, z - rad, x + rad, z + rad, [])) if (b.kind !== 'slab') return false;
      return true;
    };
    const wallBehind = (x, z, nx, nz) => World.query(x + nx * 0.9 - 0.2, z + nz * 0.9 - 0.2, x + nx * 0.9 + 0.2, z + nz * 0.9 + 0.2, []).some(b => b.kind === 'bld');
    const HB = cylGeo(0.12, 0.12, 0.5, 6, false), HC = cylGeo(0.14, 0.05, 0.16, 6, true), HR = cylGeo(0.17, 0.17, 0.06, 6, false);
    const BB = cylGeo(0.26, 0.28, 0.86, 8, false), BL = cylGeo(0.29, 0.2, 0.1, 8, true), BAG = sphereGeo(1, 5, 3, 0.75);
    const hydrant = (x, z) => {
      const c = [0.58, 0.07, 0.05, 0];
      A.addGeo(HR, M(x, CURB, z), c); A.addGeo(HB, M(x, CURB, z), c); A.addGeo(HC, M(x, CURB + 0.5, z), c);
      A.cbox(x - 0.2, CURB + 0.3, z - 0.05, x + 0.2, CURB + 0.39, z + 0.05, c); A.cbox(x - 0.05, CURB + 0.28, z - 0.18, x + 0.05, CURB + 0.4, z + 0.18, [0.5, 0.5, 0.52, 0]);
      World.addBox(x - 0.17, 0, z - 0.17, x + 0.17, CURB + 0.66, z + 0.17, 'prop');
    };
    const bin = (x, z) => {
      A.addGeo(BB, M(x, CURB, z), [0.12, 0.2, 0.15, 0]); A.addGeo(BL, M(x, CURB + 0.86, z), [0.08, 0.12, 0.09, 0]);
      World.addBox(x - 0.28, 0, z - 0.28, x + 0.28, CURB + 0.96, z + 0.28, 'prop');
    };
    const news = (x, z, tx, tz, nx, nz) => { // two or three boxes side by side, windows toward the passers-by
      const n = 2 + (rnd() < 0.5 ? 1 : 0), cols = [[0.1, 0.25, 0.55], [0.6, 0.1, 0.1], [0.85, 0.7, 0.12], [0.85, 0.85, 0.82], [0.12, 0.4, 0.2]];
      for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * 0.55, cx = x + tx * o, cz = z + tz * o, c = cols[Math.floor(rnd() * cols.length)];
        const hx = tx ? 0.24 : 0.2, hz = tz ? 0.24 : 0.2;
        A.cbox(cx - hx, CURB + 0.35, cz - hz, cx + hx, CURB + 1.05, cz + hz, [c[0], c[1], c[2], 0], 'xXzZY');
        A.cbox(cx - hx * 0.9, CURB, cz - hz * 0.9, cx + hx * 0.9, CURB + 0.35, cz + hz * 0.9, [0.1, 0.1, 0.11, 0], 'xXzZ');
        const wx = cx - nx * 0.205, wz = cz - nz * 0.205; // little window on the sidewalk side
        A.cbox(wx - (tx ? 0.16 : 0.01), CURB + 0.72, wz - (tz ? 0.16 : 0.01), wx + (tx ? 0.16 : 0.01), CURB + 0.95, wz + (tz ? 0.16 : 0.01), [0.75, 0.75, 0.72, 0.05], 'xXzZ');
      }
      World.addBox(x - (tx ? 0.25 + 0.28 * (n - 1) : 0.22), 0, z - (tz ? 0.25 + 0.28 * (n - 1) : 0.22), x + (tx ? 0.25 + 0.28 * (n - 1) : 0.22), CURB + 1.05, z + (tz ? 0.25 + 0.28 * (n - 1) : 0.22), 'prop');
    };
    const booth = (x, z) => {
      const h = 0.45, fr = [0.18, 0.2, 0.22, 0];
      for (const [cx, cz] of [[x - h, z - h], [x + h, z - h], [x - h, z + h], [x + h, z + h]]) A.tube(cx, CURB, cz, cx, CURB + 2.3, cz, 0.04, fr, 5);
      A.cbox(x - h - 0.05, CURB + 2.3, z - h - 0.05, x + h + 0.05, CURB + 2.45, z + h + 0.05, fr, 'xXzZYy');
      Gl.cbox(x - h + 0.02, CURB + 2.12, z - h + 0.02, x + h - 0.02, CURB + 2.28, z + h - 0.02, [0.3, 0.6, 1, 2.2], 'xXzZ');
      A.cbox(x - h + 0.03, CURB + 0.3, z - h + 0.03, x + h - 0.03, CURB + 2.05, z + h - 0.03, [0.06, 0.08, 0.1, 0.15], 'xXzZ'); // glass
      A.cbox(x - 0.12, CURB + 1.1, z - 0.12, x + 0.12, CURB + 1.5, z + 0.12, [0.25, 0.25, 0.27, 0]);
      World.lightsStatic.push({ x, y: CURB + 1.9, z, r: 0.5, g: 0.75, b: 1.1, range: 5 });
      World.addBox(x - h - 0.05, 0, z - h - 0.05, x + h + 0.05, CURB + 2.45, z + h + 0.05, 'prop');
    };
    const mailbox = (x, z, tx, tz) => {
      A.tube(x, CURB, z, x, CURB + 0.9, z, 0.04, [0.2, 0.2, 0.2, 0], 5);
      A.cbox(x - (tx ? 0.2 : 0.16), CURB + 0.9, z - (tz ? 0.2 : 0.16), x + (tx ? 0.2 : 0.16), CURB + 1.45, z + (tz ? 0.2 : 0.16), [0.88, 0.68, 0.08, 0]);
      World.addBox(x - 0.2, 0, z - 0.2, x + 0.2, CURB + 1.45, z + 0.2, 'prop');
    };
    const bags = (x, z) => { const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const s = r(0.26, 0.4); A.addGeo(BAG, M4.compose(M4.create(), x + r(-0.6, 0.6), CURB + s * 0.6, z + r(-0.6, 0.6), 0, r(0, 3), 0, s, s, s), rnd() < 0.8 ? [0.04, 0.04, 0.05, 0] : [0.2, 0.35, 0.18, 0]); } };
    const side = (ax, az, bx, bz, nx, nz) => { // walk one sidewalk from a to b; n = direction from the curb into the sidewalk
      const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
      for (let s = r(2, 6); s < L - 2; s += r(6, 13)) {
        const k = rnd(), cx = ax + tx * s, cz = az + tz * s;
        const x = cx + nx * 0.5, z = cz + nz * 0.5;
        if (k < 0.2) { if (free(x, z, 0.5)) hydrant(x, z); }
        else if (k < 0.42) { if (free(x, z, 0.6)) bin(x, z); }
        else if (k < 0.52) { if (free(x, z, 1.1)) news(x, z, tx, tz, nx, nz); }
        else if (k < 0.57) { const px = cx + nx * 0.75, pz = cz + nz * 0.75; if (free(px, pz, 0.9)) booth(px, pz); }
        else if (k < 0.63) { if (free(x, z, 0.5)) mailbox(x, z, tx, tz); }
        else if (k < 0.75) { const wx = cx + nx * (SIDEW - 0.55), wz = cz + nz * (SIDEW - 0.55); if (free(wx, wz, 0.7) && wallBehind(wx, wz, nx, nz)) bags(wx, wz); }
      }
    };
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) {
      const a = RX[i] + RHW + 4, b = RX[i + 1] - RHW - 4, z = RZ[j];
      side(a, z - RHW, b, z - RHW, 0, -1); side(a, z + RHW, b, z + RHW, 0, 1);
    }
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) {
      const a = RZ[j] + RHW + 4, b = RZ[j + 1] - RHW - 4, x = RX[i];
      side(x - RHW, a, x - RHW, b, -1, 0); side(x + RHW, a, x + RHW, b, 1, 0);
    }
    // manhole covers in the lanes, a few breathing steam
    const DISC = (() => { const g = new GeoBuilder(), n = 10; const c = g.vert(0, 0.02, 0, 0, 1, 0, 0, 0, CELL.plain[0], CELL.plain[1], 1, 1, 1, 0); for (let k = 0; k <= n; k++) { const a = k / n * TAU; g.vert(Math.sin(a) * 0.42, 0.02, Math.cos(a) * 0.42, 0, 1, 0, 0, 0, CELL.plain[0], CELL.plain[1], 1, 1, 1, 0); } for (let k = 0; k < n; k++) g.i.push(c, c + 1 + k, c + 2 + k); return g.build(); })();
    const hole = (x, z) => { A.addGeo(DISC, M(x, 0, z), [0.11, 0.105, 0.1, 0]); if (rnd() < 0.14) World.vents.push({ x, z }); };
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j) && rnd() < 0.8) hole(r(RX[i] + RHW + 6, RX[i + 1] - RHW - 6), RZ[j] + (rnd() < 0.5 ? -1 : 1) * r(0.8, 3.6));
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j) && rnd() < 0.8) hole(RX[i] + (rnd() < 0.5 ? -1 : 1) * r(0.8, 3.6), r(RZ[j] + RHW + 6, RZ[j + 1] - RHW - 6));
  },
  /* ---------------- street lamps ---------------- */
  lamps() {
    const A = this.B.atlas;
    const LED = new Set(['down', 'plaza', 'police', 'fin', 'civic', 'mall', 'hosp', 'univ', 'gare', 'stad', 'ferry']);
    const isDown = (x, z) => { const i = RX.findIndex((r, k) => k < NI && x >= r && x < RX[k + 1]); const j = RZ.findIndex((r, k) => k < NJ && z >= r && z < RZ[k + 1]); if (i < 0 || j < 0) return false; return LED.has(World.blocks[i][j].d); };
    const one = (x, z, nx, nz) => { // nx,nz: direction toward road centre
      const led = isDown(x, z); const c = led ? [0.85, 0.92, 1.1] : [1.25, 0.78, 0.4];
      const h = 6.6; A.tube(x, CURB, z, x, CURB + h, z, 0.09, [0.13, 0.13, 0.15, 0], 6);
      const hx = x + nx * 1.6, hz = z + nz * 1.6;
      A.tube(x, CURB + h, z, hx, CURB + h + 0.15, hz, 0.06, [0.13, 0.13, 0.15, 0], 5);
      A.cbox(hx - 0.35, CURB + h - 0.05, hz - 0.35, hx + 0.35, CURB + h + 0.2, hz + 0.35, [0.12, 0.12, 0.14, 0], 'xXzZY');
      this._noCor = true; this.B.glow.cbox(hx - 0.3, CURB + h - 0.1, hz - 0.3, hx + 0.3, CURB + h - 0.05, hz + 0.3, [c[0], c[1], c[2], 3]); this._noCor = false;
      this.corona(hx, CURB + h - 0.16, hz, [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9], 1.25, 1, { lamp: true, halo: true });
      World.lightsStatic.push({ x: hx, y: CURB + h - 0.4, z: hz, r: c[0] * 2.2, g: c[1] * 2.2, b: c[2] * 2.2, range: 15, lamp: true });
      this.pool(hx, hz, 5.5, [c[0] * 0.22, c[1] * 0.22, c[2] * 0.22]);
      this.cone(hx, CURB + h - 0.1, hz, 2.8, [c[0] * 0.06, c[1] * 0.06, c[2] * 0.06]);
      World.addBox(x - 0.15, 0, z - 0.15, x + 0.15, CURB + h, z + 0.15, 'pole', { noray: true });
    };
    let alt = 0;
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) { // road along x at z = RZ[j]
      const r = RZ[j], a = RX[i] + RHW + 5, b = RX[i + 1] - RHW - 5;
      for (let s = a; s <= b; s += 22) { alt++; if (alt % 2) one(s, r - RHW - 0.5, 0, 1); else if (j < NJ) one(s + 11, r + RHW + 0.5, 0, -1); }
    }
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) { // road along z at x = RX[i]
      const r = RX[i], a = RZ[j] + RHW + 5, b = RZ[j + 1] - RHW - 5;
      for (let s = a; s <= b; s += 22) { alt++; if (alt % 2) one(r + RHW + 0.5, s + 5, -1, 0); else one(r - RHW - 0.5, s + 16, 1, 0); }
    }
    // street name plaques at the crossings
    const Bd = this.B.boards;
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
      if (!Net.node(i, j) || j === NJ) continue; const rx = RX[i], rz = RZ[j];
      const S1 = Tex.signs['sx' + i], S2 = Tex.signs['sz' + j]; if (!S1 || !S2) continue;
      const px = rx + RHW + 1.2, pz = rz + RHW + 1.2;
      A.tube(px, CURB, pz, px, 3.6, pz, 0.05, [0.2, 0.3, 0.25, 0], 5);
      const w = 1.3, h = w / S1.aspect;
      Bd.quad(px + 0.06, 2.9, pz, 0, 0, -w, 0, h, 0, [S1.u0, S1.v0, S1.u1, S1.v1], [0, 0], [0.9, 0.9, 0.9, 0]);
      Bd.quad(px - 0.06, 2.9, pz - w, 0, 0, w, 0, h, 0, [S1.u0, S1.v0, S1.u1, S1.v1], [0, 0], [0.9, 0.9, 0.9, 0]);
      Bd.quad(px - w, 3.3, pz + 0.06, w, 0, 0, 0, h, 0, [S2.u0, S2.v0, S2.u1, S2.v1], [0, 0], [0.9, 0.9, 0.9, 0]);
      Bd.quad(px, 3.3, pz - 0.06, -w, 0, 0, 0, h, 0, [S2.u0, S2.v0, S2.u1, S2.v1], [0, 0], [0.9, 0.9, 0.9, 0]);
    }
  },
  proceduralZips() {
    // connect building roofs across streets, downhill, with clear anchor spots
    const blds = World.buildings.filter(b => b.h >= 7 && b.h <= 24 && b.x1 - b.x0 > 7 && b.z1 - b.z0 > 7 && b.x0 > RX[0] && b.x1 < RX[NI] && b.z1 < RZ[NJ] && b.z0 > RZ[0]);
    const cands = [];
    for (const a of blds) for (const b of blds) {
      if (a === b || a.h - b.h < 2.5) continue;
      const ax = clamp((b.x0 + b.x1) / 2, a.x0 + 1.1, a.x1 - 1.1), az = clamp((b.z0 + b.z1) / 2, a.z0 + 1.1, a.z1 - 1.1);
      const bx = clamp(ax, b.x0 + 1.6, b.x1 - 1.6), bz = clamp(az, b.z0 + 1.6, b.z1 - 1.6);
      const L = Math.hypot(bx - ax, bz - az); if (L < 16 || L > 36) continue;
      const slope = (a.h - b.h) / L; if (slope < 0.08 || slope > 0.45) continue;
      // must cross a road (not an alley inside a block)
      const crossesRoad = RX.some(r => Math.min(ax, bx) < r && Math.max(ax, bx) > r) || RZ.some(r => Math.min(az, bz) < r && Math.max(az, bz) > r);
      if (!crossesRoad) continue;
      cands.push({ a, b, ax, az, bx, bz, L, key: G.r() });
    }
    cands.sort((p, q) => p.key - q.key);
    const used = new Set(); let made = 0;
    const near = (info, x, z) => (info.reserved || []).some(r => Math.hypot(r[0] - x, r[1] - z) < r[2] + 1.5);
    for (const c of cands) {
      if (made >= 34) break;
      const { a, b, ax, az, bx, bz, L } = c; if (used.has(a) || used.has(b)) continue;
      const hA = a.h + 2.4, hB = b.h + 2.4; const dx = bx - ax, dy = hB - hA, dz = bz - az;
      let blocked = false; for (let t = 0.08; t < 0.96; t += 0.04) { const px = ax + dx * t, py = hA + dy * t - 2.2, pz = az + dz * t; if (World.groundAt(px, pz, 0.35, 999) > py - 0.1) { blocked = true; break; } }
      if (blocked || near(a, ax, az) || near(b, bx, bz)) continue;
      this.zip(ax, a.h, az, bx, b.h, bz); used.add(a); used.add(b); made++;
      (a.reserved = a.reserved || []).push([ax, az, 1.6]); (b.reserved = b.reserved || []).push([bx, bz, 1.8]);
    }
  },
  placeBadges() {
    const stats = ['force', 'endurance', 'constitution', 'adresse'];
    const cand = World.buildings.filter(b => b.ladders.length && b.h > 5 && b.h < 20);
    const picks = []; const rnd = mulberry32(31337);
    while (picks.length < 26 && cand.length) { const k = Math.floor(rnd() * cand.length); const b = cand.splice(k, 1)[0]; if (picks.some(p => Math.hypot(p.x - (b.x0 + b.x1) / 2, p.z - (b.z0 + b.z1) / 2) < 40)) continue; picks.push({ x: (b.x0 + b.x1) / 2, y: b.h, z: (b.z0 + b.z1) / 2 }); }
    // a few special spots
    picks.push({ x: World.spots.crate.x - 6.5, y: CURB + 2.59 * 2, z: World.spots.crate.z });
    picks.push({ x: 98.3, y: 22, z: 254.5 });
    World.badges = picks.map((p, i) => ({ id: 'b' + i, x: p.x, y: p.y + 0.9, z: p.z, stat: stats[i % 4] }));
  },
  navData() {
    // sidewalk rings for pedestrians: one per block, one around each merged district
    const rings = []; World.nav.rings = rings; const done = new Set();
    for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
      const K = World.blocks[i][j]; const o = 1.5;
      if (K.noWalk || (K.d === 'docks')) continue;
      let R0 = K; if (K.grp) { if (done.has(K.grp)) continue; done.add(K.grp); R0 = Districts.groups[K.grp].rect; }
      const cx = (R0.bx0 + R0.bx1) / 2, cz = (R0.bz0 + R0.bz1) / 2;
      rings.push({ i, j, cx, cz, pts: [[R0.bx0 + o, R0.bz0 + o], [R0.bx1 - o, R0.bz0 + o], [R0.bx1 - o, R0.bz1 - o], [R0.bx0 + o, R0.bz1 - o]] });
    }
    World.nav.nodes = [];
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) if (Net.node(i, j)) World.nav.nodes.push({ i, j, x: RX[i], z: RZ[j] });
  },
  waterMesh() {
    const g = new GeoBuilder(); g.quad(-1200, WATER_Y, 1400, 2400, 0, 0, 0, 0, -(1400 - WATER_Z + 0.5), [0, 0, 1, 1], [0, 0], [1, 1, 1, 0]);
    return new Mesh(g.build());
  }
};

