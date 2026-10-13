/* =====================================================================
   MEDIEVAL CITY — Port-Saline as a drowned medieval town. Same streets,
   blocks, roofs and routes as before (missions and chases keep working);
   what stands on them changes:
   - every light burns: torches, lanterns, braziers (no neon, no LEDs);
   - roofs: steep tiled or slate roofs where nobody walks, battlements
     where the roofs are reached (ladders, zip ropes, chases), spires on
     the towers, chimneys;
   - street furniture: lantern posts, barrels, crates, bollards, wells,
     market canopies, wooden ladders, rope lines, picket fences;
   - the outer ring is the town wall with its towers, hills and castles
     beyond; the docks are a timber harbour.
   The random sequences of the original generation are kept (G calls in
   the same order), so the layout is the same as Overflow 21.
   ===================================================================== */
const Medieval = {
  on: true,
  // a light of any colour becomes firelight of the same strength (red beacons stay embers)
  warm(r, g, b) {
    const m = Math.max(r, g, b); if (m < 0.004) return [r, g, b];
    if (r > g * 2.2 && r > b * 2.2) return [m * 0.95, m * 0.36, m * 0.1];
    const L = Math.max(m * 0.82, 0.3 * r + 0.59 * g + 0.11 * b);
    return [L * 1.06, L * 0.64, L * 0.28];
  },
  warmBuilder(B) { if (!B) return; const c = B.c; for (let i = 0; i < c.length; i += 4) { const w = this.warm(c[i], c[i + 1], c[i + 2]); c[i] = w[0]; c[i + 1] = w[1]; c[i + 2] = w[2]; } },
  warmAll(B) {
    for (const k of ['glow', 'pools', 'streaks', 'cones']) this.warmBuilder(B[k]);
    for (const l of World.lightsStatic) { const w = this.warm(l.r, l.g, l.b); l.r = w[0]; l.g = w[1]; l.b = w[2]; }
    for (const l of World.coronas) { const w = this.warm(l.r, l.g, l.b); l.r = w[0]; l.g = w[1]; l.b = w[2]; }
    // the neon signs become painted boards: their quads move to the opaque board pass, a little dimmer
    const N = B.neon, Bd = B.boards;
    if (N && N.vc) {
      const keep = new GeoBuilder();
      for (let q = 0; q < N.vc; q += 4) {
        const isTag = N.c[q * 4 + 3] === 0; // graffiti (chalk marks) stay faint and additive
        const T = isTag ? keep : Bd, base = T.vc;
        for (let v = q; v < q + 4; v++) T.vert(N.p[v * 3], N.p[v * 3 + 1], N.p[v * 3 + 2], N.n[v * 3], N.n[v * 3 + 1], N.n[v * 3 + 2], N.u[v * 4], N.u[v * 4 + 1], N.u[v * 4 + 2], N.u[v * 4 + 3],
          isTag ? 0.35 : 0.62, isTag ? 0.36 : 0.56, isTag ? 0.33 : 0.48, 0);
        T.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      B.neon = keep;
    }
  },
  hash(x, z, k = 0) { return Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1; },
  /* ---------- roofs ---------- */
  ROOF_COLS: [[0.34, 0.35, 0.4], [0.62, 0.33, 0.24], [0.5, 0.3, 0.22], [0.28, 0.29, 0.33], [0.56, 0.38, 0.26], [0.62, 0.52, 0.3], [0.55, 0.46, 0.27], [0.66, 0.56, 0.34]], // slate, red and brown tiles, straw thatch
  // village scale: low houses (a storey or two under a steep roof), tall buildings squeezed
  vh(h) { return h <= 8 ? h : 8 + (h - 8) * 0.45; },
  VILLAGE: { brick: k => k < 0.6 ? 'brick2' : 'brick', concrete: k => k < 0.55 ? 'house' : 'concrete', tenement: () => 'brick2', hlm: k => k < 0.5 ? 'plaster' : 'house', office: () => 'plaster', lantern: k => k < 0.5 ? 'brick2' : 'lantern', glass: () => 'stone', tower: () => 'stone' },
  village(fn) { const M = this; return function (...a) { const prev = M._hmap; M._hmap = (h, style, x0, z0) => { const r = M.VILLAGE[style]; return [M.vh(h), r ? r(M.hash(x0, z0, 3)) : style]; }; try { return fn.apply(this, a); } finally { M._hmap = prev; } }; },
  STONE: { brick: 1, concrete: 1, glass: 1, tower: 1, stone: 1, tenement: 1, hospital: 1, office: 1, warehouse: 1, mall: 1, industrial: 0 },
  // a sloped quad with the tile texture (u along the eaves, v up the slope, in metres / 4)
  slope(A, ox, oy, oz, ux, uy, uz, vx, vy, vz, col) {
    const ul = Math.hypot(ux, uy, uz), vl = Math.hypot(vx, vy, vz);
    A.quad(ox, oy, oz, ux, uy, uz, vx, vy, vz, [0, 0, ul / 4, vl / 4], CELL.tiles, col);
  },
  tri(A, a, b, c, col, cell = CELL.plain) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i0 = A.vert(a[0], a[1], a[2], nx, ny, nz, 0, 0, cell[0], cell[1], col[0], col[1], col[2], col[3]);
    A.vert(b[0], b[1], b[2], nx, ny, nz, Math.hypot(ux, uz) / 4, 0, cell[0], cell[1], col[0], col[1], col[2], col[3]);
    A.vert(c[0], c[1], c[2], nx, ny, nz, Math.hypot(ux, uz) / 8, Math.hypot(vx, vy, vz) / 4, cell[0], cell[1], col[0], col[1], col[2], col[3]);
    A.i.push(i0, i0 + 1, i0 + 2);
  },
  // steep gable roof, ridge along the longer side; gable ends in the wall colour
  gable(A, x0, z0, x1, z1, y, rise, roofCol, wallCol, o = 0.45) {
    const along = (x1 - x0) >= (z1 - z0) ? 'x' : 'z', c = [roofCol[0], roofCol[1], roofCol[2], 0], gc = [wallCol[0] * 0.85, wallCol[1] * 0.85, wallCol[2] * 0.85, 0];
    if (along === 'x') {
      const zm = (z0 + z1) / 2, X0 = x0 - o, X1 = x1 + o, hd = zm - z0 + o;
      this.slope(A, X0, y - o * rise / hd * 0.5, z0 - o, X1 - X0, 0, 0, 0, rise + o * rise / hd * 0.5, hd, c);
      this.slope(A, X1, y - o * rise / hd * 0.5, z1 + o, X0 - X1, 0, 0, 0, rise + o * rise / hd * 0.5, -hd, c);
      this.tri(A, [x0, y, z1], [x0, y, z0], [x0, y + rise, zm], gc); this.tri(A, [x1, y, z0], [x1, y, z1], [x1, y + rise, zm], gc);
    } else {
      const xm = (x0 + x1) / 2, Z0 = z0 - o, Z1 = z1 + o, hd = xm - x0 + o;
      this.slope(A, x1 + o, y - o * rise / hd * 0.5, Z0, 0, 0, Z1 - Z0, -hd, rise + o * rise / hd * 0.5, 0, c);
      this.slope(A, x0 - o, y - o * rise / hd * 0.5, Z1, 0, 0, Z0 - Z1, hd, rise + o * rise / hd * 0.5, 0, c);
      this.tri(A, [x0, y, z0], [x1, y, z0], [xm, y + rise, z0], gc); this.tri(A, [x1, y, z1], [x0, y, z1], [xm, y + rise, z1], gc);
    }
    return along;
  },
  // pyramid / spire over a rectangle (towers, turrets)
  spire(A, x0, z0, x1, z1, y, h, col, o = 0.5) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o, top = [cx, y + h, cz], c = [col[0], col[1], col[2], 0];
    this.tri(A, [X0, y, Z1], [X1, y, Z1], top, c, CELL.tiles); this.tri(A, [X1, y, Z1], [X1, y, Z0], top, c, CELL.tiles);
    this.tri(A, [X1, y, Z0], [X0, y, Z0], top, c, CELL.tiles); this.tri(A, [X0, y, Z0], [X0, y, Z1], top, c, CELL.tiles);
  },
  // a parapet on the cornice, with merlons on stone buildings
  battlements(A, b, stone, col) {
    const { x0, z0, x1, z1, h } = b, t = 0.35, c = [col[0], col[1], col[2], 0];
    const run = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      if (!stone) { A.cbox(Math.min(ax, bx) - (dz ? t / 2 : 0), h, Math.min(az, bz) - (dx ? t / 2 : 0), Math.max(ax, bx) + (dz ? t / 2 : 0), h + 0.55, Math.max(az, bz) + (dx ? t / 2 : 0), c); return; }
      A.cbox(Math.min(ax, bx) - (dz ? t / 2 : 0), h, Math.min(az, bz) - (dx ? t / 2 : 0), Math.max(ax, bx) + (dz ? t / 2 : 0), h + 0.45, Math.max(az, bz) + (dx ? t / 2 : 0), c);
      const n = Math.max(1, Math.round(L / 1.7));
      for (let k = 0; k < n; k++) {
        const s0 = (k + 0.2) * L / n, s1 = (k + 0.75) * L / n, px0 = ax + dx * s0, pz0 = az + dz * s0, px1 = ax + dx * s1, pz1 = az + dz * s1;
        A.cbox(Math.min(px0, px1) - (dz ? t / 2 : 0), h + 0.45, Math.min(pz0, pz1) - (dx ? t / 2 : 0), Math.max(px0, px1) + (dz ? t / 2 : 0), h + 1.15, Math.max(pz0, pz1) + (dx ? t / 2 : 0), c);
      }
    };
    run(x0, z0, x1, z0); run(x0, z1, x1, z1); run(x0, z0 + t, x0, z1 - t); run(x1, z0 + t, x1, z1 - t);
  },
  // any four points, tile texture (u along p0->p1, v up the slope)
  quad4(A, p0, p1, p2, p3, col, cell = CELL.tiles) {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const L = Math.hypot(ux, uy, uz) / 4, V = Math.hypot(vx, vy, vz) / 4, i0 = A.vc;
    for (const [p, u, v] of [[p0, 0, 0], [p1, L, 0], [p2, L, V], [p3, 0, V]]) A.vert(p[0], p[1], p[2], nx, ny, nz, u, v, cell[0], cell[1], col[0], col[1], col[2], col[3]);
    A.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  },
  // walkable roofs keep their flat top: a skirt of tiles climbs from the eaves around it (what the street sees is a tiled roof)
  skirt(A, b, col) {
    const o = 0.45, d = Math.min(2.8, (b.x1 - b.x0) * 0.22, (b.z1 - b.z0) * 0.22), up = d * 1.1, ye = b.h - 0.3, yi = b.h + up, c = [col[0], col[1], col[2], 0];
    const O = [[b.x0 - o, b.z0 - o], [b.x1 + o, b.z0 - o], [b.x1 + o, b.z1 + o], [b.x0 - o, b.z1 + o]], I = [[b.x0 + d, b.z0 + d], [b.x1 - d, b.z0 + d], [b.x1 - d, b.z1 - d], [b.x0 + d, b.z1 - d]];
    for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; this.quad4(A, [O[k2][0], ye, O[k2][1]], [O[k][0], ye, O[k][1]], [I[k][0], yi, I[k][1]], [I[k2][0], yi, I[k2][1]], c); }
    A.box(b.x0 + d, b.h, b.z0 + d, b.x1 - d, yi - 0.02, b.z1 - d, { faces: 'xXzZ', cell: CELL.wood, su: 3, sv: 3, col: [0.5, 0.42, 0.34, 0] }); // the inner edge: a low board kerb
  },
  chimney(A, x, z, y0, y1, col) {
    A.box(x - 0.45, y0, z - 0.35, x + 0.45, y1, z + 0.35, { faces: 'xXzZ', cell: CELL.rough, su: 2, sv: 2, col: [col[0], col[1], col[2], 0] });
    A.cbox(x - 0.55, y1, z - 0.45, x + 0.55, y1 + 0.18, z + 0.45, [0.3, 0.28, 0.26, 0], 'xXzZY');
    A.cbox(x - 0.2, y1 + 0.18, z - 0.2, x + 0.2, y1 + 0.45, z + 0.2, [0.45, 0.32, 0.24, 0], 'xXzZY');
  },
  // what crowns a building: called for every building once the ladders and zip ropes are known
  crown(C, b) {
    if (b._crowned) return; b._crowned = true;
    const A = C.B.atlas, w = b.x1 - b.x0, d = b.z1 - b.z0, hh = b.h - (b.y0 || 0); if (hh < 2.5 || w < 2 || d < 2) return;
    const wall = (PAL[b.style] && PAL[b.style][0]) || [0.7, 0.68, 0.64], stone = this.STONE[b.style] !== undefined ? !!this.STONE[b.style] : false;
    const k = this.hash(b.x0, b.z0), roofCol = this.ROOF_COLS[Math.floor(k * this.ROOF_COLS.length)].map(v => v * (0.9 + this.hash(b.z1, b.x1) * 0.2));
    const used = b.ladders.length || (b.reserved && b.reserved.length) || b.zipAnchor || b.walk;
    const S = World.spots && World.spots.skyscraper, fightRoof = S && S.x > b.x0 && S.x < b.x1 && S.z > b.z0 && S.z < b.z1 && Math.abs(S.y - b.h) < 1;
    const tall = !fightRoof && (b.h >= 26 && stone || b.style === 'glass' || b.style === 'tower');
    if (fightRoof) { this.battlements(A, b, true, [wall[0] * 0.85, wall[1] * 0.85, wall[2] * 0.85]); return; } // the campaign fights on this roof: keep it clear
    if (tall) { // tower: corbelled parapet with merlons, a slate spire with a gilded finial, turrets at the corners
      const o = 0.5; A.cbox(b.x0 - o, b.h - 0.9, b.z0 - o, b.x1 + o, b.h, b.z1 + o, [wall[0] * 0.8, wall[1] * 0.8, wall[2] * 0.8, 0], 'xXzZy');
      this.battlements(A, { x0: b.x0 - o, z0: b.z0 - o, x1: b.x1 + o, z1: b.z1 + o, h: b.h }, true, [wall[0] * 0.85, wall[1] * 0.85, wall[2] * 0.85]);
      const sh = Math.min(30, Math.max(w, d) * 0.95), m = Math.min(w, d) * 0.12;
      this.spire(A, b.x0 + m, b.z0 + m, b.x1 - m, b.z1 - m, b.h + 1.1, sh, [0.24, 0.26, 0.31], 0.3);
      A.tube((b.x0 + b.x1) / 2, b.h + 1.1 + sh - 0.3, (b.z0 + b.z1) / 2, (b.x0 + b.x1) / 2, b.h + 1.1 + sh + 2.2, (b.z0 + b.z1) / 2, 0.06, [0.75, 0.58, 0.25, 0], 5);
      if (w > 9 && d > 9) for (const [cx, cz] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) {
        A.addGeo(cylGeo(1.3, 1.3, 3.2, 10), M4.compose(M4.create(), cx, b.h - 2.2, cz, 0, 0, 0), [wall[0] * 0.9, wall[1] * 0.9, wall[2] * 0.9, 0]);
        A.addGeo(cylGeo(1.45, 0.02, 4.2, 10, false), M4.compose(M4.create(), cx, b.h + 1, cz, 0, 0, 0), [0.24, 0.26, 0.31, 0]);
      }
      World.addBox(b.x0, b.h, b.z0, b.x1, b.h + sh * 0.5, b.z1, 'prop', { nowalk: true });
      return;
    }
    if (used || b.noPitch) {
      if (stone && w * d > 700 || b.noPitch || w < 4.5 || d < 4.5) this.battlements(A, b, stone, stone ? [wall[0] * 0.92, wall[1] * 0.9, wall[2] * 0.86] : [0.36, 0.26, 0.18]);
      else this.skirt(A, b, roofCol);
      return;
    }
    // nobody walks there: a steep roof, a chimney or two
    const rise = Math.min(w, d) * (0.42 + k * 0.2), along = this.gable(A, b.x0, b.z0, b.x1, b.z1, b.h, rise, roofCol, wall);
    const nC = 1 + (k > 0.6 ? 1 : 0);
    for (let q = 0; q < nC; q++) {
      const t = 0.25 + q * 0.5, cx = along === 'x' ? lerp(b.x0, b.x1, t) : (b.x0 + b.x1) / 2 + (w / 4), cz = along === 'x' ? (b.z0 + b.z1) / 2 + d / 4 : lerp(b.z0, b.z1, t);
      this.chimney(A, cx, cz, b.h, b.h + rise * 0.75 + 0.9, [0.62, 0.42, 0.34]);
    }
    World.addBox(b.x0, b.h, b.z0, b.x1, b.h + rise * 0.6, b.z1, 'prop', { nowalk: true });
  },
  dress(C) {
    for (const b of World.buildings) this.crown(C, b);
  }
};

/* ---------- the city builder, medieval edition ---------- */
const _cityOrig = { roofProps: City.roofProps, bld: City.bld, docks: City.docks };
Object.assign(PAL, {
  brick: [[0.86, 0.82, 0.74], [0.8, 0.76, 0.68], [0.9, 0.86, 0.78], [0.76, 0.74, 0.7]],
  plaster: [[1, 0.98, 0.94], [0.98, 0.94, 0.86], [0.96, 0.9, 0.82], [0.92, 0.94, 0.9], [1, 0.94, 0.8]],
  concrete: [[0.84, 0.82, 0.78], [0.78, 0.76, 0.74], [0.82, 0.78, 0.72]],
  glass: [[0.82, 0.8, 0.76], [0.76, 0.75, 0.73], [0.86, 0.82, 0.76]],
  industrial: [[0.86, 0.78, 0.7], [0.76, 0.66, 0.56], [0.7, 0.62, 0.54]],
  tenement: [[0.92, 0.84, 0.8], [0.84, 0.78, 0.74], [0.96, 0.88, 0.82], [0.8, 0.72, 0.68]],
  hlm: [[1, 1, 0.98], [0.96, 0.95, 0.92], [0.98, 0.96, 0.9], [0.94, 0.96, 0.98]],
  stone: [[0.96, 0.92, 0.86], [0.9, 0.86, 0.8], [0.86, 0.84, 0.8]],
  lantern: [[0.96, 0.92, 0.86], [0.92, 0.86, 0.8], [0.88, 0.9, 0.86]],
  hospital: [[0.98, 0.96, 0.92], [0.94, 0.92, 0.88]],
  office: [[0.9, 0.86, 0.82], [0.86, 0.82, 0.78], [0.92, 0.88, 0.82]],
  house: [[1, 0.98, 0.92], [0.94, 0.94, 0.9], [0.98, 0.92, 0.84]],
  warehouse: [[0.86, 0.8, 0.74], [0.8, 0.76, 0.7], [0.76, 0.7, 0.64]],
  mall: [[0.96, 0.92, 0.86], [0.92, 0.9, 0.86]],
  container: [[0.62, 0.46, 0.32], [0.5, 0.38, 0.28], [0.7, 0.56, 0.38], [0.56, 0.42, 0.3], [0.44, 0.32, 0.22], [0.66, 0.5, 0.34], [0.52, 0.44, 0.36], [0.6, 0.4, 0.26]],
  awning: [[0.52, 0.16, 0.12], [0.22, 0.32, 0.18], [0.26, 0.24, 0.36], [0.6, 0.48, 0.3], [0.56, 0.36, 0.14]]
});
for (const k in SIGN_COL) SIGN_COL[k] = [0.9, 0.6, 0.3];
for (const k of ['g_tide', 'g_rats', 'g_sea']) SIGN_COL[k] = [0.55, 0.6, 0.55];

Object.assign(City, {
  bld(x0, z0, x1, z1, h, style, o = {}) { // the shops get timber posts between the fronts, the cornice is a stone or oak ledge
    const M = Medieval, h0 = h;
    if (M._hmap) [h, style] = M._hmap(h, style, x0, z0, o);
    M._inBld = (M._inBld || 0) + 1;
    let info; try { info = _cityOrig.bld.call(this, x0, z0, x1, z1, h, style, o); } finally { M._inBld--; }
    info.h0 = h0;
    if (o.walk) info.walk = true;
    return info;
  },
  cornice(x0, z0, x1, z1, h, col) {
    const A = this.B.atlas, o = 0.22, w = 0.35, y0 = h - 0.45, y1 = h + 0.02, c = [0.62, 0.58, 0.52, 0];
    A.cbox(x0 - o, y0, z0 - o, x1 + o, y1, z0 + w, c, 'xXzZYy'); A.cbox(x0 - o, y0, z1 - w, x1 + o, y1, z1 + o, c, 'xXzZYy');
    A.cbox(x0 - o, y0, z0 + w, x0 + w, y1, z1 - w, c, 'xYy'); A.cbox(x1 - w, y0, z0 + w, x1 + o, y1, z1 - w, c, 'XYy');
  },
  groundAndRoads() { // cobbled streets everywhere, no paint; the quay wall in stone
    const g = this.B.ground;
    g.quad(-700, 0, WATER_Z, 1400, 0, 0, 0, 0, -(WATER_Z + 700), [-700 / 9, -WATER_Z / 9, 700 / 9, 700 / 9], GCELL.asphalt, [0.9, 0.88, 0.85, 0]);
    this.B.atlas.box(-500, WATER_Y - 1, WATER_Z - 0.01, 500, 0, WATER_Z, { faces: 'Z', cell: CELL.rough, su: 6, sv: 6, col: [0.55, 0.52, 0.48, 0] });
  },
  roofProps(info) { // chimneys, cisterns, dovecotes, stair huts with a lantern, pennants; nothing on the roofs that get a steep roof
    const A = this.B.atlas; const { x0, z0, x1, z1, h } = info; const w = x1 - x0, d = z1 - z0;
    if (w < 6 || d < 6 || info.noRoof) return;
    const used = info.ladders.length || (info.reserved && info.reserved.length) || info.zipAnchor;
    if (!used && !(info.h >= 26 || info.style === 'glass' || info.style === 'tower')) return; // steep roof (Medieval.crown)
    const n = Math.floor(w * d / 120) + G.i(0, 1);
    if (info.waterTower && w > 7 && d > 7) { // the wooden cistern on stilts stays: it was already a barrel
      const px = G.r(x0 + 3, x1 - 3), pz = G.r(z0 + 3, z1 - 3);
      info.reserved = (info.reserved || []).concat([[px, pz, 2.2]]);
      A.addGeo(cylGeo(1.3, 1.3, 2.4, 12), M4.compose(M4.create(), px, h + 2.4, pz, 0, 0, 0), [0.42, 0.3, 0.2, 0]);
      A.addGeo(cylGeo(1.45, 0.1, 1.1, 12), M4.compose(M4.create(), px, h + 4.8, pz, 0, 0, 0), [0.32, 0.24, 0.18, 0]);
      for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) A.tube(px + lx, h, pz + lz, px + lx, h + 2.45, pz + lz, 0.1, [0.3, 0.22, 0.15, 0]);
      World.addBox(px - 1.3, h + 2.4, pz - 1.3, px + 1.3, h + 4.8, pz + 1.3, 'prop');
      World.addBox(px - 1.0, h, pz - 1.0, px + 1.0, h + 2.4, pz + 1.0, 'prop', { nowalk: true });
    }
    const used2 = [], free = (px, pz, r) => used2.every(u => Math.hypot(u[0] - px, u[1] - pz) > u[2] + r);
    for (const r of info.reserved || []) used2.push(r);
    for (let k = 0; k < n; k++) {
      const type = G.r(), px = G.r(x0 + 2.2, x1 - 2.2), pz = G.r(z0 + 2.2, z1 - 2.2);
      if (type < 0.45) { if (!free(px, pz, 1)) continue; used2.push([px, pz, 1]); Medieval.chimney(A, px, pz, h, h + 1.8, [0.6, 0.4, 0.32]); World.addBox(px - 0.45, h, pz - 0.35, px + 0.45, h + 1.8, pz + 0.35, 'prop'); }
      else if (type < 0.62 && w > 9) { // dovecote on a post
        if (!free(px, pz, 1.2)) continue; used2.push([px, pz, 1.2]);
        A.tube(px, h, pz, px, h + 1.6, pz, 0.08, [0.3, 0.22, 0.15, 0]); A.cbox(px - 0.6, h + 1.6, pz - 0.6, px + 0.6, h + 2.4, pz + 0.6, [0.6, 0.5, 0.38, 0]);
        Medieval.spire(A, px - 0.6, pz - 0.6, px + 0.6, pz + 0.6, h + 2.4, 0.9, [0.5, 0.3, 0.22], 0.15);
        World.addBox(px - 0.6, h + 1.6, pz - 0.6, px + 0.6, h + 2.4, pz + 0.6, 'prop');
      } else if (type < 0.75) { // stair hut with a lantern over its door
        if (!free(px, pz, 2)) continue; used2.push([px, pz, 2]);
        const hh = 2.6; A.box(px - 1.5, h, pz - 1.4, px + 1.5, h + hh, pz + 1.4, { faces: 'xXzZ', cell: CELL.rough, su: 4, sv: 4, col: [0.66, 0.62, 0.56, 0] });
        Medieval.gable(A, px - 1.5, pz - 1.4, px + 1.5, pz + 1.4, h + hh, 1.2, [0.3, 0.3, 0.34], [0.66, 0.62, 0.56], 0.2);
        A.cbox(px - 0.5, h, pz + 1.4, px + 0.5, h + 2.0, pz + 1.45, [0.3, 0.2, 0.12, 0], 'Z');
        this.B.glow.cbox(px - 0.12, h + 2.1, pz + 1.45, px + 0.12, h + 2.35, pz + 1.6, [1, 0.62, 0.28, 1.8]);
        World.lightsStatic.push({ x: px, y: h + 2.2, z: pz + 2, r: 1.2, g: 0.75, b: 0.35, range: 7, flick: 0.9 });
        World.addBox(px - 1.5, h, pz - 1.4, px + 1.5, h + hh, pz + 1.4, 'prop');
      } else if (type < 0.85) { // pennant on a pole
        if (!free(px, pz, 0.6)) continue; used2.push([px, pz, 0.6]);
        const ah = 3.5 + G.r(0, 3); A.tube(px, h, pz, px, h + ah, pz, 0.05, [0.3, 0.22, 0.15, 0]);
        const pc = [[0.55, 0.12, 0.1], [0.12, 0.2, 0.42], [0.6, 0.48, 0.12]][Math.floor(Medieval.hash(px, pz) * 3)];
        Medieval.tri(A, [px, h + ah, pz], [px, h + ah - 0.8, pz], [px + 1.4, h + ah - 0.3, pz + 0.2], [pc[0], pc[1], pc[2], 0]);
        Medieval.tri(A, [px, h + ah - 0.8, pz], [px, h + ah, pz], [px + 1.4, h + ah - 0.3, pz + 0.2], [pc[0], pc[1], pc[2], 0]);
      } else { // trapdoor
        if (!free(px, pz, 1)) continue; used2.push([px, pz, 1]);
        A.cbox(px - 0.7, h, pz - 0.6, px + 0.7, h + 0.3, pz + 0.6, [0.4, 0.3, 0.2, 0]);
      }
    }
  },
  sign(info, f, t, name, kind, y) { // painted boards: flat over the door, or hanging from an iron bracket
    const S = Tex.signs[name]; if (!S) return;
    const [px, pz, nx, nz] = this.facePoint(info, f, t), Bd = this.B.boards, A = this.B.atlas, IRON = [0.1, 0.1, 0.1, 0];
    (World.signsDbg = World.signsDbg || []).push({ name, kind, px, pz, nx, nz, f, y, bx0: info.x0, bx1: info.x1, bz0: info.z0, bz1: info.z1 });
    const lit = [0.62, 0.56, 0.48, 0];
    if (kind === 'flat') {
      const h = name === 'marche' || name === 'police' || name === 'criee' ? 1.2 : 0.9, w = h * S.aspect, off = 0.09, ox = px + nx * off, oz = pz + nz * off, ux = nz * w, uz = -nx * w;
      A.cbox(Math.min(ox - ux / 2, ox + ux / 2) - (nx ? 0.06 : 0.08), y - 0.08, Math.min(oz - uz / 2, oz + uz / 2) - (nz ? 0.06 : 0.08), Math.max(ox - ux / 2, ox + ux / 2) + (nx ? 0 : 0.08), y + h + 0.08, Math.max(oz - uz / 2, oz + uz / 2) + (nz ? 0 : 0.08), [0.2, 0.13, 0.08, 0], 'xXzZYy');
      Bd.quad(ox - ux / 2 + nx * 0.01, y, oz - uz / 2 + nz * 0.01, ux, 0, uz, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], lit);
      this.torch(ox - ux / 2 - nz * 0.4 + nx * 0.25, y + h * 0.4, oz - uz / 2 + nx * 0.4 + nz * 0.25, nx, nz); // a torch beside the board
    } else { // blade sign: a board swinging under a wrought-iron arm
      const w = 0.8, h = w / S.aspect, d0 = 0.3, tx = -nz, tz = nx, bx = px + nx * d0, bz = pz + nz * d0;
      A.tube(px, y + h + 0.25, pz, px + nx * (w + 0.45), y + h + 0.25, pz + nz * (w + 0.45), 0.035, IRON, 4);
      A.tube(px, y + h - 0.35, pz, px + nx * 0.6, y + h + 0.25, pz + nz * 0.6, 0.025, IRON, 4);
      for (const s of [0.12, w - 0.12]) A.tube(bx + nx * s, y + h, bz + nz * s, bx + nx * s, y + h + 0.25, bz + nz * s, 0.012, IRON, 3);
      A.cbox(Math.min(bx - tx * 0.05, bx + nx * w + tx * 0.05), y - 0.05, Math.min(bz - tz * 0.05, bz + nz * w + tz * 0.05), Math.max(bx - tx * 0.05, bx + nx * w + tx * 0.05), y + h + 0.05, Math.max(bz - tz * 0.05, bz + nz * w + tz * 0.05), [0.18, 0.12, 0.07, 0], 'xXzZYy');
      const s1x = bx + tx * 0.06, s1z = bz + tz * 0.06, s2x = bx - tx * 0.06, s2z = bz - tz * 0.06;
      Bd.quad(s1x, y, s1z, nx * w, 0, nz * w, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], lit);
      Bd.quad(s2x + nx * w, y, s2z + nz * w, -nx * w, 0, -nz * w, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], lit);
      World.lightsStatic.push({ x: bx + nx * w / 2, y: y - 0.6, z: bz + nz * w / 2, r: 1.0, g: 0.62, b: 0.28, range: 6 });
    }
  },
  // a torch in an iron bracket on a wall (n = outward normal of the wall)
  torch(x, y, z, nx, nz, big) {
    const A = this.B.detail || this.B.atlas, IRON = [0.08, 0.08, 0.08, 0];
    A.tube(x - nx * 0.25, y - 0.25, z - nz * 0.25, x, y, z, 0.025, IRON, 3);
    A.tube(x, y - 0.35, z, x, y + 0.08, z, 0.035, [0.25, 0.16, 0.1, 0], 4);
    this._noCor = true; this.B.glow.cbox(x - 0.07, y + 0.08, z - 0.07, x + 0.07, y + 0.3, z + 0.07, [1, 0.55, 0.18, 2.2]); this._noCor = false;
    this.corona(x, y + 0.22, z, [1, 0.58, 0.22], big ? 0.9 : 0.6, 0.7, { halo: true });
    World.lightsStatic.push({ x: x + nx * 0.5, y: y + 0.2, z: z + nz * 0.5, r: 1.5, g: 0.82, b: 0.34, range: big ? 10 : 7, flick: 0.92 });
  },
  graffiti(info, f, t, name, h, y) { // chalk marks, faint
    const S = Tex.signs[name]; if (!S) return; const [px, pz, nx, nz] = this.facePoint(info, f, t), w = h * S.aspect;
    const ox = px + nx * 0.04, oz = pz + nz * 0.04, ux = nz * w, uz = -nx * w;
    this.B.neon.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, h, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [0.3, 0.3, 0.28, 0]);
  },
  billboard(info, f, name, h) { // a great painted cloth hung on the roof from a beam, lit by two torches
    const S = Tex.signs[name]; const [px, pz, nx, nz] = this.facePoint(info, f, 0.5); const A = this.B.atlas;
    const w = 10, hh = w / S.aspect; const ox = px - nx * 0.8, oz = pz - nz * 0.8; const y = h + 1.2, ux = nz * w, uz = -nx * w;
    this.B.boards.quad(ox - ux / 2, y, oz - uz / 2, ux, 0, uz, 0, hh, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [0.6, 0.56, 0.5, 0]);
    this.B.boards.quad(ox + ux / 2 - nx * 0.05, y, oz + uz / 2 - nz * 0.05, -ux, 0, -uz, 0, hh, 0, [S.u0, S.v0, S.u1, S.v1], [0, 0], [0.3, 0.28, 0.25, 0]);
    A.tube(ox - ux * 0.55, y + hh + 0.15, oz - uz * 0.55, ox + ux * 0.55, y + hh + 0.15, oz + uz * 0.55, 0.1, [0.3, 0.2, 0.12, 0], 5);
    for (const s of [-0.55, 0.55]) A.tube(ox + ux * s, h, oz + uz * s, ox + ux * s, y + hh + 0.4, oz + uz * s, 0.12, [0.3, 0.2, 0.12, 0], 5);
    for (const s of [-0.45, 0.45]) this.torch(ox + ux * s + nx * 0.5, y - 0.4, oz + uz * s + nz * 0.5, nx, nz, true);
  },
  awning(info, f, t, c) { // canvas awning on two poles
    const [px, pz, nx, nz] = this.facePoint(info, f, t); const w = 2.1, dep = 1.5, y = 3.0;
    const x0 = nx !== 0 ? Math.min(px, px + nx * dep) : px - w, x1 = nx !== 0 ? Math.max(px, px + nx * dep) : px + w;
    const z0 = nz !== 0 ? Math.min(pz, pz + nz * dep) : pz - w, z1 = nz !== 0 ? Math.max(pz, pz + nz * dep) : pz + w;
    const col = [c[0], c[1], c[2], 0], A = this.B.atlas;
    const two = (o, u, v) => { A.quad(o[0], o[1], o[2], u[0], u[1], u[2], v[0], v[1], v[2], [0, 0, 1, 1], CELL.plain, col); A.quad(o[0] + u[0], o[1] + u[1], o[2] + u[2], -u[0], -u[1], -u[2], v[0], v[1], v[2], [0, 0, 1, 1], CELL.plain, col); };
    if (nx) two([px, y + 0.6, z0], [0, 0, z1 - z0], [nx * dep, -0.6, 0]); // sloped canvas, seen from above and below
    else two([x0, y + 0.6, pz], [x1 - x0, 0, 0], [0, -0.6, nz * dep]);
    A.cbox(x0, y - 0.25, z0, x1, y, z1, [c[0] * 1.2, c[1] * 1.2, c[2] * 1.2, 0], nx > 0 ? 'X' : nx < 0 ? 'x' : nz > 0 ? 'Z' : 'z');
    const ex = px + nx * dep, ez = pz + nz * dep, tx = -nz, tz = nx;
    for (const s of [-w + 0.1, w - 0.1]) A.tube(ex + tx * s, CURB, ez + tz * s, ex + tx * s, y, ez + tz * s, 0.04, [0.3, 0.2, 0.12, 0], 4);
    World.addBox(x0, y, z0, x1, y + 0.16, z1, 'awning');
    World.lightsStatic.push({ x: px + nx * 1.2, y: 2.6, z: pz + nz * 1.2, r: 1.0, g: 0.62, b: 0.3, range: 6 });
    this.pool(px + nx * 1.6, pz + nz * 1.6, 2.6, [0.55, 0.36, 0.18]);
  },
  lampPost(x, z, h, c) { // a lantern on a wooden post
    const A = this.B.atlas; A.tube(x, CURB, z, x, CURB + h, z, 0.1, [0.26, 0.18, 0.12, 0], 6);
    A.cbox(x - 0.24, CURB + h, z - 0.24, x + 0.24, CURB + h + 0.06, z + 0.24, [0.1, 0.1, 0.1, 0]);
    this._noCor = true; this.B.glow.cbox(x - 0.16, CURB + h + 0.06, z - 0.16, x + 0.16, CURB + h + 0.46, z + 0.16, [1, 0.62, 0.28, 2]); this._noCor = false;
    Medieval.spire(A, x - 0.24, z - 0.24, x + 0.24, z + 0.24, CURB + h + 0.46, 0.3, [0.1, 0.1, 0.1], 0.02);
    this.corona(x, CURB + h + 0.26, z, [1, 0.62, 0.28], 0.8, 0.9, { lamp: true, halo: true });
    World.lightsStatic.push({ x, y: CURB + h, z, r: 1.6, g: 1.0, b: 0.45, range: 10, flick: 0.95 });
    this.pool(x, z, 4, [0.3, 0.19, 0.08], CURB + 0.03);
    World.addBox(x - 0.15, 0, z - 0.15, x + 0.15, CURB + h, z + 0.15, 'pole', { noray: true });
  },
  lamps() { // lantern posts along the streets (same places as the old lamps), street names on slate plaques at the crossings
    const A = this.B.atlas, WOOD = [0.24, 0.16, 0.1, 0], IRON = [0.09, 0.09, 0.09, 0];
    const one = (x, z, nx, nz) => {
      const h = 4.6; A.tube(x, CURB, z, x, CURB + h, z, 0.11, WOOD, 6); A.cbox(x - 0.16, CURB, z - 0.16, x + 0.16, CURB + 0.5, z + 0.16, [0.4, 0.38, 0.36, 0]);
      const hx = x + nx * 1.1, hz = z + nz * 1.1;
      A.tube(x, CURB + h - 0.1, z, hx, CURB + h - 0.1, hz, 0.04, IRON, 4); A.tube(x, CURB + h - 0.7, z, x + nx * 0.6, CURB + h - 0.1, z + nz * 0.6, 0.025, IRON, 3);
      A.tube(hx, CURB + h - 0.1, hz, hx, CURB + h - 0.35, hz, 0.012, IRON, 3);
      A.cbox(hx - 0.2, CURB + h - 0.42, hz - 0.2, hx + 0.2, CURB + h - 0.35, hz + 0.2, IRON, 'xXzZYy'); A.cbox(hx - 0.2, CURB + h - 1.0, hz - 0.2, hx + 0.2, CURB + h - 0.94, hz + 0.2, IRON, 'xXzZYy');
      this._noCor = true; this.B.glow.cbox(hx - 0.15, CURB + h - 0.94, hz - 0.15, hx + 0.15, CURB + h - 0.42, hz + 0.15, [1.1, 0.66, 0.28, 2.4]); this._noCor = false;
      this.corona(hx, CURB + h - 0.68, hz, [1, 0.62, 0.26], 1.0, 1, { lamp: true, halo: true });
      World.lightsStatic.push({ x: hx, y: CURB + h - 0.8, z: hz, r: 2.2, g: 1.3, b: 0.55, range: 13, lamp: true, flick: 0.95 });
      this.pool(hx, hz, 5, [0.3, 0.18, 0.07]);
      World.addBox(x - 0.15, 0, z - 0.15, x + 0.15, CURB + h, z + 0.15, 'pole', { noray: true });
    };
    let alt = 0;
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) {
      const r = RZ[j], a = RX[i] + RHW + 5, b = RX[i + 1] - RHW - 5;
      for (let s = a; s <= b; s += 22) { alt++; if (alt % 2) one(s, r - RHW - 0.5, 0, 1); else if (j < NJ) one(s + 11, r + RHW + 0.5, 0, -1); }
    }
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) {
      const r = RX[i], a = RZ[j] + RHW + 5, b = RZ[j + 1] - RHW - 5;
      for (let s = a; s <= b; s += 22) { alt++; if (alt % 2) one(r + RHW + 0.5, s + 5, -1, 0); else one(r - RHW - 0.5, s + 16, 1, 0); }
    }
    const Bd = this.B.boards;
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
      if (!Net.node(i, j) || j === NJ) continue; const rx = RX[i], rz = RZ[j];
      const S1 = Tex.signs['sx' + i], S2 = Tex.signs['sz' + j]; if (!S1 || !S2) continue;
      const px = rx + RHW + 1.2, pz = rz + RHW + 1.2;
      A.cbox(px - 0.09, CURB, pz - 0.09, px + 0.09, 3.6, pz + 0.09, WOOD);
      const w = 1.3, h = w / S1.aspect, c = [0.8, 0.78, 0.74, 0];
      Bd.quad(px + 0.1, 2.9, pz, 0, 0, -w, 0, h, 0, [S1.u0, S1.v0, S1.u1, S1.v1], [0, 0], c);
      Bd.quad(px - 0.1, 2.9, pz - w, 0, 0, w, 0, h, 0, [S1.u0, S1.v0, S1.u1, S1.v1], [0, 0], c);
      Bd.quad(px - w, 3.3, pz + 0.1, w, 0, 0, 0, h, 0, [S2.u0, S2.v0, S2.u1, S2.v1], [0, 0], c);
      Bd.quad(px, 3.3, pz - 0.1, -w, 0, 0, 0, h, 0, [S2.u0, S2.v0, S2.u1, S2.v1], [0, 0], c);
    }
  },
  signals() { // no traffic lights: the crossings keep their turns (the carts still wait), a stone milestone marks them
    World.signals = []; World.signalNodes = {};
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
      if (!Net.node(i, j)) continue;
      let n = 0; if (Net.segZ(i, j - 1)) n++; if (Net.segZ(i, j)) n++; if (Net.segX(i - 1, j)) n++; if (Net.segX(i, j)) n++;
      if (n < 3) continue;
      World.signalNodes[i * 100 + j] = { off: (Math.abs(Math.sin(i * 12.9898 + j * 78.233)) * 43758.5453 % 1) * 24 };
    }
  },
  streetFurniture(K) { // same draws as before: benches stay benches, the bus shelters become market canopies
    const A = this.B.atlas;
    const edges = [['z', K.bx0, K.bz0, K.bx1, K.bz0], ['Z', K.bx0, K.bz1, K.bx1, K.bz1], ['x', K.bx0, K.bz0, K.bx0, K.bz1], ['X', K.bx1, K.bz0, K.bx1, K.bz1]];
    for (const [f, ax, az, bx, bz] of edges) {
      if (!G.chance(0.5)) continue;
      const t = G.r(0.3, 0.7); const x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const inward = f === 'z' ? [0, 1] : f === 'Z' ? [0, -1] : f === 'x' ? [1, 0] : [-1, 0];
      const px = x + inward[0] * 0.9, pz = z + inward[1] * 0.9;
      if (G.chance(0.4) && K.d !== 'plaza') {
        const along = inward[0] === 0; const hw = 1.8, hd = 0.7;
        const x0 = along ? px - hw : px - hd, x1 = along ? px + hw : px + hd, z0 = along ? pz - hd : pz - hw, z1 = along ? pz + hd : pz + hw;
        const cc = [[0.55, 0.16, 0.12], [0.2, 0.3, 0.2], [0.6, 0.5, 0.32]][Math.floor(Medieval.hash(px, pz) * 3)];
        Medieval.gable(A, x0, z0, x1, z1, 2.4, 0.7, cc, cc, 0.15);
        for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) A.tube(cx, CURB, cz, cx, 2.4, cz, 0.06, [0.3, 0.2, 0.12, 0], 5);
        A.cbox(x0 + 0.2, CURB, z0 + 0.2, x1 - 0.2, CURB + 0.85, z1 - 0.2, [0.4, 0.28, 0.18, 0]); // a trestle table
        World.addBox(x0, 2.4, z0, x1, 2.55, z1, 'awning');
        World.lightsStatic.push({ x: px, y: 2.2, z: pz, r: 1.1, g: 0.7, b: 0.32, range: 6, flick: 0.9 });
        this._noCor = true; this.B.glow.cbox(px - 0.1, 1.95, pz - 0.1, px + 0.1, 2.2, pz + 0.1, [1, 0.62, 0.28, 2]); this._noCor = false;
      } else {
        const along = inward[0] === 0; const hw = 0.9, hd = 0.25;
        const x0 = along ? px - hw : px - hd, x1 = along ? px + hw : px + hd, z0 = along ? pz - hd : pz - hw, z1 = along ? pz + hd : pz + hw;
        A.cbox(x0, CURB + 0.4, z0, x1, CURB + 0.5, z1, [0.38, 0.27, 0.17, 0], 'xXzZY');
        A.cbox(x0 + 0.05, CURB, z0 + 0.02, x0 + 0.2, CURB + 0.4, z1 - 0.02, [0.3, 0.21, 0.13, 0]);
        A.cbox(x1 - 0.2, CURB, z0 + 0.02, x1 - 0.05, CURB + 0.4, z1 - 0.02, [0.3, 0.21, 0.13, 0]);
        World.addBox(x0, 0, z0, x1, CURB + 0.5, z1, 'prop');
      }
    }
  },
  dumpster(x, z, yaw) { // a big wooden bin (the colour draw is kept)
    const A = this.B.atlas; G.pick([0, 1, 2]);
    const hx = yaw ? 0.75 : 1.2, hz = yaw ? 1.2 : 0.75;
    A.box(x - hx, CURB, z - hz, x + hx, CURB + 1.25, z + hz, { faces: 'xXzZY', cell: CELL.wood, su: 1.2, sv: 1.2, col: [0.62, 0.5, 0.38, 0] });
    A.cbox(x - hx - 0.05, CURB + 1.15, z - hz - 0.05, x + hx + 0.05, CURB + 1.25, z + hz + 0.05, [0.12, 0.12, 0.12, 0], 'xXzZ');
    World.addBox(x - hx, 0, z - hz, x + hx, CURB + 1.35, z + hz, 'prop');
  },
  fence(x0, z0, x1, z1, h) { // picket fence
    const F = this.B.fence; const A = this.B.atlas, L = Math.hypot(x1 - x0, z1 - z0), t = 0.06, c = [0.95, 0.9, 0.85, 0], P = [0.3, 0.22, 0.15, 0];
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) { F.box(Math.min(x0, x1), 0, z0 - 0.01, Math.max(x0, x1), h, z0 + 0.01, { faces: 'zZ', cell: CELL.fence, su: 2, sv: h, col: c }); World.addBox(Math.min(x0, x1), 0, z0 - t, Math.max(x0, x1), h, z0 + t, 'fence').nowalk = true; }
    else { F.box(x0 - 0.01, 0, Math.min(z0, z1), x0 + 0.01, h, Math.max(z0, z1), { faces: 'xX', cell: CELL.fence, su: 2, sv: h, col: c }); World.addBox(x0 - t, 0, Math.min(z0, z1), x0 + t, h, Math.max(z0, z1), 'fence').nowalk = true; }
    const n = Math.max(1, Math.round(L / 3));
    for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n); A.cbox(x - 0.08, 0, z - 0.08, x + 0.08, h + 0.1, z + 0.08, P); }
  },
  ladder(x, z, nx, nz, y0, y1, info) { // wooden ladder
    const A = this.B.atlas; const tx = -nz, tz = nx; const off = 0.2, hw = 0.3, col = [0.36, 0.25, 0.15, 0];
    const bx = x + nx * off, bz = z + nz * off;
    A.tube(bx + tx * hw, y0, bz + tz * hw, bx + tx * hw, y1 + 1.0, bz + tz * hw, 0.05, col, 5);
    A.tube(bx - tx * hw, y0, bz - tz * hw, bx - tx * hw, y1 + 1.0, bz - tz * hw, 0.05, col, 5);
    for (let y = y0 + 0.3; y < y1 + 0.1; y += 0.35) A.tube(bx - tx * hw, y, bz - tz * hw, bx + tx * hw, y, bz + tz * hw, 0.03, col, 4);
    const L = { x, z, nx, nz, y0, y1, info };
    World.ladders.push(L); if (info) { info.ladders.push(L); info.reserved = info.reserved || []; info.reserved.push([x - nx * 0.8, z - nz * 0.8, 1.6]); }
    return L;
  },
  zip(ax, ay, az, bx, by, bz) { // a rope line between two wooden posts, a lantern on the high one
    const A = this.B.atlas; const hA = 2.4, hB = 2.4, W = [0.32, 0.22, 0.14, 0];
    for (const [px, py, pz, hh] of [[ax, ay, az, hA], [bx, by, bz, hB]]) { A.tube(px, py, pz, px, py + hh + 0.3, pz, 0.1, W, 6); A.cbox(px - 0.3, py, pz - 0.3, px + 0.3, py + 0.15, pz + 0.3, [0.4, 0.38, 0.36, 0]); }
    this.B.glow.cbox(ax - 0.12, ay + hA + 0.3, az - 0.12, ax + 0.12, ay + hA + 0.55, az + 0.12, [1, 0.6, 0.25, 2.2]);
    A.tube(ax, ay + hA, az, bx, by + hB, bz, 0.035, [0.5, 0.42, 0.3, 0], 4);
    World.addBox(ax - 0.15, ay, az - 0.15, ax + 0.15, ay + hA, az + 0.15, 'post', { noray: true });
    World.addBox(bx - 0.15, by, bz - 0.15, bx + 0.15, by + hB, bz + 0.15, 'post', { noray: true });
    const a = new V3(ax, ay + hA, az), b = new V3(bx, by + hB, bz); const d = b.clone().sub(a); const len = d.len(); d.scale(1 / len);
    const Z = { a, b, d, len, roofA: ay, roofB: by };
    World.zips.push(Z);
    World.lightsStatic.push({ x: ax, y: ay + hA + 0.4, z: az, r: 1.4, g: 0.8, b: 0.3, range: 6, flick: 0.92 });
    return Z;
  },
  tree(x, z) { // gnarled oak
    const A = this.B.atlas; A.tube(x, CURB, z, x + 0.2, CURB + 2.8, z - 0.1, 0.28, [0.24, 0.17, 0.12, 0], 7);
    const s = sphereGeo(2.2, 8, 6, 0.75); A.addGeo(s, M4.compose(M4.create(), x, CURB + 3.8, z, 0, G.r(0, 3), 0), [0.12, 0.2, 0.1, 0]);
    A.addGeo(sphereGeo(1.4, 7, 5), M4.compose(M4.create(), x + 0.9, CURB + 4.8, z - 0.4, 0, 0, 0), [0.14, 0.24, 0.12, 0]);
    World.addBox(x - 0.3, 0, z - 0.3, x + 0.3, CURB + 2.8, z + 0.3, 'prop');
  },
  downBlock(K) { // the downtown towers become keeps on a stone base (same draws, no light strips)
    const A = this.B.atlas;
    const podH = G.pick([9, 10, 11]);
    const pod = this.bld(K.lx0, K.lz0, K.lx1, K.lz1, podH, 'concrete', { streets: 'xXzZ', col: G.pick(PAL.concrete), roofProps: false });
    K.blds.push(pod);
    const tw = G.r(14, 20), td = G.r(14, 20); const tx = K.cx + G.r(-4, 4), tz = K.cz + G.r(-4, 4);
    const H = G.r(34, 72) * 0.42; // keeps, not skyscrapers
    const tower = this.bld(tx - tw / 2, tz - td / 2, tx + tw / 2, tz + td / 2, H, G.chance(0.5) ? 'tower' : 'glass', { base: podH, roofProps: false, signs: false });
    K.blds.push(tower);
    G.pick([0, 1, 2]);
    pod.reserved = [[tx, tz, Math.max(tw, td) * 0.75]];
    this.pending.push(pod);
    const bb = G.pick(['bb_volt', 'bb_tel', 'bb_cine', 'bb_tide']);
    const faces = pod.streets.split(''); const f = G.pick(faces);
    this.billboard(pod, f, bb, podH);
    this.ladder(...this.facePoint(pod, G.pick(faces), G.r(0.15, 0.3)), CURB, podH, pod);
  },
  container(x, y, z, yaw, c, stackTop) { // stacks of big crates (same footprint as the containers)
    const A = this.B.atlas; const L = 6.06, W = 2.44, H = 2.59;
    const along = Math.abs(Math.sin(yaw)) > 0.5, hx = along ? L / 2 : W / 2, hz = along ? W / 2 : L / 2;
    const q = World.query(x - hx + 0.05, z - hz + 0.05, x + hx - 0.05, z + hz - 0.05, []);
    if (q.some(b => (b.kind === 'bld' || b.kind === 'cont' || b.kind === 'prop') && b.y1 > y + 0.1 && b.y0 < y + H - 0.1)) return null;
    const col = [c[0], c[1], c[2], 0];
    A.box(x - hx, y, z - hz, x + hx, y + H, z + hz, { faces: 'xXzZY', cell: CELL.container, su: along ? L / 2 : W, sv: H, col, top: { cell: CELL.metal, su: 3, sv: 3, col: [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0] } });
    return World.addBox(x - hx, y, z - hz, x + hx, y + H, z + hz, 'cont');
  }
});
Medieval.torchFar = (C, x, y, z) => { C._noCor = true; C.B.glow.cbox(x - 0.3, y, z - 0.3, x + 0.3, y + 0.8, z + 0.3, [1, 0.55, 0.2, 2]); C._noCor = false; C.corona(x, y + 0.4, z, [1, 0.58, 0.22], 1.4, 0.8, {}); };

/* ---------- facades: flower boxes, torches on the street walls (the fire escapes and air conditioners are gone) ---------- */
City.facadeDetails = function () {
  const A = this.B.detail, rnd = mulberry32(8086);
  const TIMBER = { plaster: 1, brick2: 1, house: 1, lantern: 1, hlm: 1, brick: 1 };
  const FLOWERS = [[0.75, 0.12, 0.16], [0.85, 0.7, 0.2], [0.6, 0.2, 0.55], [0.9, 0.9, 0.85], [0.85, 0.35, 0.15]];
  const frame = (b, f) => f === 'X' ? { ox: b.x1, oz: b.z1, tx: 0, tz: -1, nx: 1, nz: 0, len: b.z1 - b.z0 } : f === 'x' ? { ox: b.x0, oz: b.z0, tx: 0, tz: 1, nx: -1, nz: 0, len: b.z1 - b.z0 }
    : f === 'Z' ? { ox: b.x0, oz: b.z1, tx: 1, tz: 0, nx: 0, nz: 1, len: b.x1 - b.x0 } : { ox: b.x1, oz: b.z0, tx: -1, tz: 0, nx: 0, nz: -1, len: b.x1 - b.x0 };
  const fbox = (F, s0, s1, d0, d1, y0, y1, col, faces) => {
    const ax = F.ox + F.tx * s0 + F.nx * d0, az = F.oz + F.tz * s0 + F.nz * d0, bx = F.ox + F.tx * s1 + F.nx * d1, bz = F.oz + F.tz * s1 + F.nz * d1;
    A.box(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), { col, cell: CELL.plain, faces: faces || 'xXzZY' });
  };
  const busy = (F, s0, s1, y0, y1) => {
    for (const l of World.lightsStatic) { if (l.y < y0 || l.y > y1) continue; const u = (l.x - F.ox) * F.tx + (l.z - F.oz) * F.tz, v = (l.x - F.ox) * F.nx + (l.z - F.oz) * F.nz; if (u > s0 - 1 && u < s1 + 1 && v > -0.5 && v < 2.5) return true; }
    for (const L of World.ladders) { const u = (L.x - F.ox) * F.tx + (L.z - F.oz) * F.tz, v = (L.x - F.ox) * F.nx + (L.z - F.oz) * F.nz; if (u > s0 - 1.5 && u < s1 + 1.5 && Math.abs(v) < 1) return true; }
    return false;
  };
  const torches = [];
  for (const b of World.buildings) {
    if (b.y0 || !b.style) continue;
    for (const f of 'xXzZ') {
      const F = frame(b, f); if (F.len < 7) continue;
      const shop = (b.shopFaces || '').indexOf(f) >= 0, street = (b.streets || '').indexOf(f) >= 0;
      const base = shop ? 3.9 : -0.4, first = shop ? 0 : 1, cols = Math.floor(F.len / 3);
      const floors = Math.floor((b.h - 3.1 - (base + first * 3.2)) / 3.2) + 1;
      if (TIMBER[b.style]) for (let k = 0; k < floors; k++) for (let c = 0; c < cols; c++) { // flower boxes under the windows
        if (rnd() > 0.1) continue;
        const y = base + (first + k) * 3.2 + 1.1, s = c * 3 + 1.53; if (y > b.h - 1.5) continue;
        if (busy(F, s - 0.6, s + 0.6, y - 1, y + 0.6)) continue;
        fbox(F, s - 0.6, s + 0.6, 0.01, 0.32, y - 0.24, y, [0.3, 0.2, 0.12, 0]);
        const fc = FLOWERS[Math.floor(rnd() * FLOWERS.length)];
        fbox(F, s - 0.55, s + 0.55, 0.04, 0.3, y, y + 0.12, [0.12, 0.26, 0.1, 0]);
        for (let q = 0; q < 4; q++) { const u = s - 0.45 + q * 0.3 + rnd() * 0.08; fbox(F, u, u + 0.12, 0.08, 0.24, y + 0.1, y + 0.24, [fc[0], fc[1], fc[2], 0]); }
      }
      if (street) for (let s = 6; s < F.len - 2; s += 12) { // torches between the shop fronts
        const y = 2.9; if (busy(F, s - 1, s + 1, 1, 5)) continue;
        const p = [F.ox + F.tx * s + F.nx * 0.25, F.oz + F.tz * s + F.nz * 0.25];
        if (torches.some(t => Math.hypot(t[0] - p[0], t[1] - p[1]) < 6)) continue;
        torches.push(p); this.torch(p[0], y, p[1], F.nx, F.nz);
      }
    }
  }
};

/* ---------- docks: a timber harbour (same draws as the original) ---------- */
City.docks = function () {
  const A = this.B.atlas, WOOD = [0.34, 0.24, 0.16, 0], DW = [0.24, 0.17, 0.11, 0];
  this.slab(-260, 141, 260, 144, GCELL.pavers);
  const craneX = [-100, -40, 40];
  craneX.forEach((cx) => { // timber cranes: the same gantry, in oak, with a treadwheel instead of the cab
    for (const lx of [-5, 5]) for (const lz of [150, 168]) { A.cbox(cx + lx - 0.6, 0, lz - 0.6, cx + lx + 0.6, 27, lz + 0.6, WOOD); World.addBox(cx + lx - 0.6, 0, lz - 0.6, cx + lx + 0.6, 27, lz + 0.6, 'prop'); }
    A.cbox(cx - 6, 25, 148, cx + 6, 28, 170, WOOD, 'xXzZYy');
    A.cbox(cx - 1.2, 26.3, 150, cx + 1.2, 28.2, 225, DW, 'xXzZYy');
    A.addGeo(cylGeo(2.6, 2.6, 2.2, 14), M4.compose(M4.create(), cx, 23.7, 162, 0, 0, Math.PI / 2), [0.4, 0.3, 0.2, 0]);
    this.torch(cx + 2.2, 23.6, 164.1, 0, 1, true);
    for (const lz of [150, 168]) A.cbox(cx - 5.5, 1.5, lz - 0.3, cx + 5.5, 2.0, lz + 0.3, WOOD, 'xXzZYy');
    for (const lz of [150, 168]) for (const s of [-1, 1]) A.tube(cx + s * 5, 2, lz, cx - s * 5, 24, lz, 0.12, DW, 5); // cross bracing
    A.tube(cx, 26, 212, cx, 12, 212, 0.05, [0.5, 0.42, 0.3, 0]);
  });
  World.spots.crane = { x: -40, y: 0, z: 158 };
  for (const mx of [-120, -70, -10, 60, 120]) { // braziers on stone pillars instead of the light masts
    const mz = 156; A.box(mx - 0.8, 0, mz - 0.8, mx + 0.8, 6, mz + 0.8, { faces: 'xXzZ', cell: CELL.rough, su: 2, sv: 2, col: [0.6, 0.58, 0.54, 0] });
    A.addGeo(cylGeo(0.7, 1.1, 0.8, 10), M4.compose(M4.create(), mx, 6, mz, 0, 0, 0), [0.12, 0.11, 0.1, 0]);
    this.B.glow.cbox(mx - 0.7, 6.7, mz - 0.7, mx + 0.7, 7.6, mz + 0.7, [1, 0.5, 0.15, 2.4]);
    World.lightsStatic.push({ x: mx, y: 7.5, z: mz, r: 3.2, g: 1.7, b: 0.6, range: 22, flick: 0.9 });
    this.pool(mx, mz, 10, [0.4, 0.22, 0.08]);
    World.addBox(mx - 0.8, 0, mz - 0.8, mx + 0.8, 7, mz + 0.8, 'pole', { noray: true });
  }
  for (let x = -140; x <= 140; x += 9) { A.addGeo(cylGeo(0.25, 0.3, 0.6, 8), M4.compose(M4.create(), x, 0, WATER_Z - 0.8, 0, 0, 0), [0.3, 0.22, 0.15, 0]); }
  for (let k = 0; k < 10; k++) { const x = G.r(-135, 130), z = G.r(146, 164); if (Math.abs(x - 95) < 12 || craneX.some(c => Math.abs(x - c) < 8)) continue; for (let s = 0; s < G.i(1, 2); s++) this.container(x, s * 2.59, z, G.chance(0.5) ? 0 : Math.PI / 2, G.pick(PAL.container)); }
  // the ship: a carrack with a wooden hull, castles fore and aft, three masts
  const hull = [0.3, 0.2, 0.13, 0];
  A.cbox(-132, WATER_Y - 3, 176, -60, 3.5, 196, hull, 'xXzZY'); World.addBox(-132, WATER_Y - 3, 176, -60, 3.5, 196, 'bld');
  A.cbox(-132.05, 1.5, 175.95, -59.95, 2.1, 196.05, [0.16, 0.11, 0.07, 0], 'xXzZ');
  const sup = this.bld(-126, 177.5, -114, 194.5, 14, 'industrial', { base: 3.5, roofProps: false, signs: false, col: [0.6, 0.48, 0.36] }); sup.noPitch = true;
  for (let k = 0; k < 5; k++) for (let s = 0; s < 2; s++) this.container(-108 + k * 8.5, 3.5 + s * 2.59, 186, Math.PI / 2, G.pick(PAL.container));
  for (const mx of [-100, -82, -66]) { A.tube(mx, 3.5, 186, mx, 34, 186, 0.35, DW, 8); A.tube(mx, 28, 179, mx, 28, 193, 0.15, DW, 5); A.cbox(mx - 0.1, 14, 179.5, mx + 0.1, 27.5, 192.5, [0.78, 0.72, 0.6, 0], 'xX'); }
  this.torch(-120, 17.5, 186, 1, 0, true);
  this.pier(-20, -12, WATER_Z, 214);
  this.B.atlas.box(91, WATER_Y - 2, WATER_Z, 99, 0, 234, { faces: 'xXzZY', cell: CELL.rough, su: 6, sv: 6, col: [0.55, 0.53, 0.5, 0], top: { cell: CELL.rough, su: 6, sv: 6, col: [0.6, 0.58, 0.55, 0] } });
  World.addBox(91, WATER_Y - 2, WATER_Z - 1, 99, 0, 234, 'pier');
  for (let z = 180; z < 232; z += 10) { this.lampPost(91.5, z, 3.5, [1, 0.8, 0.55]); }
  this.B.atlas.box(79, WATER_Y - 2, 232, 111, 0, 264, { faces: 'xXzZY', cell: CELL.rough, su: 6, sv: 6, col: [0.5, 0.49, 0.47, 0], top: { cell: CELL.rough, su: 5, sv: 5, col: [0.62, 0.6, 0.58, 0] } });
  World.addBox(79, WATER_Y - 2, 232, 111, 0, 264, 'pier');
  const pc = [0.5, 0.48, 0.45, 0];
  for (const [x0, z0, x1, z1] of [[79, 263.4, 111, 264], [79, 232, 79.6, 264], [110.4, 232, 111, 264], [79, 232, 90.5, 232.6], [99.5, 232, 111, 232.6]]) { A.cbox(x0, 0, z0, x1, 0.75, z1, pc); World.addBox(x0, 0, z0, x1, 0.75, z1, 'wall'); }
  // the lighthouse: a stone tower, a fire at the top
  const tx = 95, tz = 252;
  for (let k = 0; k < 6; k++) { const y0 = k * 3.7; const c = k % 2 ? [0.56, 0.54, 0.5, 0] : [0.62, 0.6, 0.56, 0]; A.addGeo(cylGeo(3.4 - k * 0.12, 3.4 - (k + 1) * 0.12, 3.7, 16, false), M4.compose(M4.create(), tx, y0, tz, 0, 0, 0), c); }
  World.addBox(tx - 3.2, 0, tz - 3.2, tx + 3.2, 22, tz + 3.2, 'bld');
  A.cbox(tx - 4.2, 21.7, tz - 4.2, tx + 4.2, 22.0, tz + 4.2, [0.4, 0.38, 0.35, 0], 'xXzZYy');
  World.addBox(tx - 4.2, 21.7, tz - 3.2, tx + 4.2, 22.0, tz + 4.2, 'bld');
  for (const [x0, z0, x1, z1] of [[tx - 4.2, tz + 4.1, tx + 4.2, tz + 4.2], [tx - 4.2, tz - 3.2, tx - 4.1, tz + 4.2], [tx + 4.1, tz - 3.2, tx + 4.2, tz + 4.2]]) { A.cbox(x0, 22, z0, x1, 23.1, z1, [0.45, 0.43, 0.4, 0]); World.addBox(x0, 22, z0, x1, 23.1, z1, 'wall'); }
  A.cbox(tx - 1.8, 22, tz - 1.2, tx + 1.8, 22.6, tz + 2.4, [0.4, 0.38, 0.35, 0]);
  World.addBox(tx - 1.8, 22, tz - 1.2, tx + 1.8, 26.2, tz + 2.4, 'bld');
  for (const [dx, dz] of [[-1.6, -1], [1.6, -1], [-1.6, 2.2], [1.6, 2.2]]) A.tube(tx + dx, 22.6, tz + dz, tx + dx * 0.4, 25.8, tz + 0.6 + (dz - 0.6) * 0.4, 0.1, [0.4, 0.38, 0.35, 0], 4);
  A.addGeo(cylGeo(2.0, 0.3, 1.6, 12), M4.compose(M4.create(), tx, 25.8, tz + 0.6, 0, 0, 0), [0.25, 0.26, 0.3, 0]);
  this.ladder(tx, tz - 3.2, 0, -1, 0, 22, null);
  World.spots.lighthouse = { x: tx, z: tz, top: 22, lamp: { x: tx, y: 24, z: tz + 0.6 }, arena: { x: 95, z: 243 }, breakwaterStart: { x: 95, z: 176 } };
  World.spots.braziers = [[85, 240], [105, 240], [85, 258], [105, 258]];
  for (const [bx, bz] of World.spots.braziers) { A.addGeo(cylGeo(0.5, 0.7, 1.0, 8), M4.compose(M4.create(), bx, 0, bz, 0, 0, 0), [0.2, 0.18, 0.16, 0]); World.addBox(bx - 0.6, 0, bz - 0.6, bx + 0.6, 1.0, bz + 0.6, 'prop'); }
};
City.pier = function (x0, x1, z0, z1) {
  const A = this.B.atlas;
  A.box(x0, -0.35, z0, x1, 0, z1, { faces: 'xXzZY', cell: CELL.wood, su: 4, sv: 4, col: [0.8, 0.7, 0.6, 0], top: { cell: CELL.wood, su: 4, sv: 4, col: [0.75, 0.65, 0.55, 0] } });
  World.addBox(x0, -0.35, z0 - 1, x1, 0, z1, 'pier');
  for (let z = z0 + 3; z < z1; z += 6) for (const x of [x0 + 0.4, x1 - 0.4]) A.tube(x, WATER_Y - 2, z, x, 0, z, 0.2, [0.25, 0.2, 0.16, 0], 6);
  this.lampPost(x1 - 0.5, z1 - 2, 3.2, [1, 0.75, 0.5]);
  for (let k = 0; k < 3; k++) { const bz = z0 + 8 + k * 11; const bx = k % 2 ? x1 + 2.5 : x0 - 2.5; A.obox(bx, WATER_Y + 0.4, bz, 1.2, 0.6, 3.5, 0, [0.42, 0.3, 0.2, 0]); A.tube(bx, WATER_Y + 1, bz - 0.5, bx, WATER_Y + 6, bz - 0.5, 0.08, [0.3, 0.22, 0.15, 0], 5); A.cbox(bx - 0.04, WATER_Y + 2.2, bz - 0.4, bx + 0.04, WATER_Y + 5.6, bz + 2.2, [0.75, 0.68, 0.55, 0], 'xX'); }
};

/* ---------- sidewalk clutter: stone bollards, barrels, crates, wells, hitching posts, sacks; drain grates ---------- */
City.streetProps = function () {
  const A = this.B.detail, rnd = mulberry32(31337), r = (a, b) => a + (b - a) * rnd(); World.vents = [];
  const M = (x, y, z, ry) => M4.compose(M4.create(), x, y, z, 0, ry || 0, 0);
  const free = (x, z, rad) => {
    if (Math.abs(World.groundAt(x, z, 0.05, 3) - CURB) > 0.02) return false;
    for (const b of World.query(x - rad, z - rad, x + rad, z + rad, [])) if (b.kind !== 'slab') return false;
    return true;
  };
  const wallBehind = (x, z, nx, nz) => World.query(x + nx * 0.9 - 0.2, z + nz * 0.9 - 0.2, x + nx * 0.9 + 0.2, z + nz * 0.9 + 0.2, []).some(b => b.kind === 'bld');
  const BOL = cylGeo(0.16, 0.2, 0.7, 8, true), BAR = cylGeo(0.3, 0.3, 0.9, 10, true), HOOP = cylGeo(0.315, 0.315, 0.06, 10, false), SACK = sphereGeo(1, 6, 4, 0.8), WELL = cylGeo(0.9, 0.9, 0.85, 12, true);
  const bollard = (x, z) => { A.addGeo(BOL, M(x, CURB, z), [0.5, 0.48, 0.45, 0]); World.addBox(x - 0.2, 0, z - 0.2, x + 0.2, CURB + 0.7, z + 0.2, 'prop'); };
  const barrel = (x, z) => {
    A.addGeo(BAR, M(x, CURB, z), [0.42, 0.3, 0.19, 0]); for (const y of [0.15, 0.7]) A.addGeo(HOOP, M(x, CURB + y, z), [0.12, 0.12, 0.12, 0]);
    World.addBox(x - 0.3, 0, z - 0.3, x + 0.3, CURB + 0.9, z + 0.3, 'prop');
  };
  const crates = (x, z, tx, tz) => { // two or three crates, one on top sometimes
    const n = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 0.62, cx = x + tx * o, cz = z + tz * o, s = 0.26 + rnd() * 0.06; A.box(cx - s, CURB, cz - s, cx + s, CURB + s * 2, cz + s, { faces: 'xXzZY', cell: CELL.container, su: s * 2, sv: s * 2, col: [0.62, 0.5, 0.36, 0] }); }
    if (rnd() < 0.5) { const s = 0.24; A.box(x - s, CURB + 0.55, z - s, x + s, CURB + 0.55 + s * 2, z + s, { faces: 'xXzZY', cell: CELL.container, su: s * 2, sv: s * 2, col: [0.55, 0.44, 0.32, 0] }); }
    World.addBox(x - (tx ? 0.3 + 0.31 * (n - 1) : 0.3), 0, z - (tz ? 0.3 + 0.31 * (n - 1) : 0.3), x + (tx ? 0.3 + 0.31 * (n - 1) : 0.3), CURB + 1.05, z + (tz ? 0.3 + 0.31 * (n - 1) : 0.3), 'prop');
  };
  const well = (x, z) => { // a stone well with a little roof and a bucket
    A.addGeo(WELL, M(x, CURB, z), [0.55, 0.52, 0.48, 0]); A.addGeo(cylGeo(0.72, 0.72, 0.02, 12, true), M(x, CURB + 0.84, z), [0.03, 0.05, 0.06, 0]);
    for (const s of [-0.8, 0.8]) A.tube(x + s, CURB + 0.85, z, x + s, CURB + 2.3, z, 0.06, [0.3, 0.2, 0.12, 0], 5);
    A.tube(x - 0.85, CURB + 1.9, z, x + 0.85, CURB + 1.9, z, 0.05, [0.3, 0.2, 0.12, 0], 5);
    Medieval.gable(A, x - 1, z - 0.7, x + 1, z + 0.7, CURB + 2.3, 0.55, [0.36, 0.26, 0.18], [0.36, 0.26, 0.18], 0.1);
    A.addGeo(cylGeo(0.14, 0.12, 0.22, 8, true), M(x, CURB + 1.35, z), [0.35, 0.25, 0.16, 0]);
    World.addBox(x - 0.9, 0, z - 0.9, x + 0.9, CURB + 2.6, z + 0.9, 'prop');
  };
  const post = (x, z, tx, tz) => { // hitching post: two stakes and a rail
    for (const s of [-0.6, 0.6]) A.cbox(x + tx * s - 0.06, CURB, z + tz * s - 0.06, x + tx * s + 0.06, CURB + 1.0, z + tz * s + 0.06, [0.32, 0.22, 0.14, 0]);
    A.tube(x - tx * 0.65, CURB + 0.9, z - tz * 0.65, x + tx * 0.65, CURB + 0.9, z + tz * 0.65, 0.04, [0.36, 0.25, 0.16, 0], 4);
    World.addBox(x - (tx ? 0.66 : 0.07), 0, z - (tz ? 0.66 : 0.07), x + (tx ? 0.66 : 0.07), CURB + 1.0, z + (tz ? 0.66 : 0.07), 'prop');
  };
  const sacks = (x, z) => { const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const s = r(0.26, 0.38); A.addGeo(SACK, M4.compose(M4.create(), x + r(-0.6, 0.6), CURB + s * 0.6, z + r(-0.6, 0.6), 0, r(0, 3), 0, s, s * 1.1, s), rnd() < 0.7 ? [0.62, 0.52, 0.36, 0] : [0.48, 0.4, 0.28, 0]); } };
  const side = (ax, az, bx, bz, nx, nz) => {
    const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
    for (let s = r(2, 6); s < L - 2; s += r(6, 13)) {
      const k = rnd(), cx = ax + tx * s, cz = az + tz * s, x = cx + nx * 0.5, z = cz + nz * 0.5;
      if (k < 0.2) { if (free(x, z, 0.5)) bollard(x, z); }
      else if (k < 0.42) { if (free(x, z, 0.6)) barrel(x, z); }
      else if (k < 0.52) { if (free(x, z, 1.1)) crates(x, z, tx, tz); }
      else if (k < 0.57) { const px = cx + nx * 1.2, pz = cz + nz * 1.2; if (free(px, pz, 1.1)) well(px, pz); }
      else if (k < 0.63) { if (free(x, z, 0.8)) post(x, z, tx, tz); }
      else if (k < 0.75) { const wx = cx + nx * (SIDEW - 0.55), wz = cz + nz * (SIDEW - 0.55); if (free(wx, wz, 0.7) && wallBehind(wx, wz, nx, nz)) sacks(wx, wz); }
    }
  };
  for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) { const a = RX[i] + RHW + 4, b = RX[i + 1] - RHW - 4, z = RZ[j]; side(a, z - RHW, b, z - RHW, 0, -1); side(a, z + RHW, b, z + RHW, 0, 1); }
  for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) { const a = RZ[j] + RHW + 4, b = RZ[j + 1] - RHW - 4, x = RX[i]; side(x - RHW, a, x - RHW, b, -1, 0); side(x + RHW, a, x + RHW, b, 1, 0); }
  // drain grates in the gutters, a few breathing the sewer's damp
  const hole = (x, z) => { A.cbox(x - 0.35, 0.005, z - 0.35, x + 0.35, 0.02, z + 0.35, [0.09, 0.085, 0.08, 0], 'Y'); if (rnd() < 0.14) World.vents.push({ x, z }); };
  for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j) && rnd() < 0.8) hole(r(RX[i] + RHW + 6, RX[i + 1] - RHW - 6), RZ[j] + (rnd() < 0.5 ? -1 : 1) * r(0.8, 3.6));
  for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j) && rnd() < 0.8) hole(RX[i] + (rnd() < 0.5 ? -1 : 1) * r(0.8, 3.6), r(RZ[j] + RHW + 6, RZ[j + 1] - RHW - 6));
};

/* ---------- districts: strip the last modern touches (same G calls, so the layout and spots stay put) ---------- */
(() => {
  // run fn with the glow builder muted, and glazing turned to unlit timber
  const quiet = (fn, muteGlow) => function (C, R) {
    const A = C.B.atlas, Gl = C.B.glow, box = A.box, quad = A.quad, cb = Gl.cbox;
    const dim = c => c && c.length === 4 && c[3] > 0 ? [c[0] * 0.55, c[1] * 0.45, c[2] * 0.36, 0] : c;
    A.box = function (x0, y0, z0, x1, y1, z1, o) { if (o && o.cell === CELL.glassroof) { o = Object.assign({}, o, { col: dim(o.col) }); if (o.top) o.top = Object.assign({}, o.top, { col: dim(o.top.col) }); } return box.call(this, x0, y0, z0, x1, y1, z1, o); };
    A.quad = function (...a) { if (a[10] === CELL.glassroof) a[11] = dim(a[11]); return quad.apply(this, a); };
    if (muteGlow) Gl.cbox = function () { };
    try { return fn.call(this, C, R); } finally { A.box = box; A.quad = quad; Gl.cbox = cb; }
  };
  Districts.g_fin = quiet(Districts.g_fin, true);   // no LED edges, crown rings or aviation beacons on the keeps
  Districts.g_mall = quiet(Districts.g_mall, true); // covered market hall, no strip lights in the barn
  Districts.g_gare = quiet(Districts.g_gare, false);
  // cooling towers become great round towers with a slate cone (same footprint and collision)
  Districts.coolingTower = function (x, z, r0, rw, r1, h) {
    const A = this.C.B.atlas, r = rw * 1.05, H = h * 0.82;
    this.cyl(x, 0, z, r * 1.08, r, H, 20, CELL.rough, [0.5, 0.47, 0.42, 0], 8, 6);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; A.obox(x + Math.cos(a) * r, H + 0.7, z + Math.sin(a) * r, 0.9, 0.7, 0.5, -a, [0.47, 0.44, 0.4, 0]); }
    A.addGeo(cylGeo(r * 0.92, 0.3, h - H + 10, 20, false), M4.compose(M4.create(), x, H, z, 0, 0, 0), [0.17, 0.18, 0.22, 0]);
    World.lightsStatic.push({ x: x + r + 1, y: 5, z, r: 2.6, g: 1.5, b: 0.6, range: 12, flick: 1 });
    World.addBox(x - rw * 0.9, 0, z - rw * 0.9, x + rw * 0.9, h, z + rw * 0.9, 'bld'); World.addBox(x - r0 * 0.7, 0, z - r0 * 0.7, x + r0 * 0.7, h * 0.3, z + r0 * 0.7, 'bld');
  };
  // steel pylons become tall timber poles with a crossbar
  Districts.pylon = function (x, z, h) {
    const A = this.C.B.atlas, c = [0.3, 0.21, 0.13, 0];
    A.tube(x, 0, z, x, h, z, 0.28, c, 6); A.cbox(x - 5.6, h - 4.4, z - 0.15, x + 5.6, h - 3.9, z + 0.15, c); A.cbox(x - 5.6, h - 8.4, z - 0.15, x + 5.6, h - 7.9, z + 0.15, c);
    World.addBox(x - 0.3, 0, z - 0.3, x + 0.3, h, z + 0.3, 'pole', { noray: true });
  };
})();

/* ---------- a village, not a city: low timber houses, squat guild towers, a palisade and windmills ---------- */
City.genericBlock = Medieval.village(City.genericBlock);
Districts.rowBlock = Medieval.village(Districts.rowBlock);
Districts.g_hlm = Medieval.village(Districts.g_hlm);
// same draws as the original; the height test reads the height the generator asked for, so the sequence holds
City.addLadders = function (K) {
  for (const info of K.blds) {
    if ((info.h0 || info.h) > 22 || info.ladders.length) continue;
    if (G.chance(0.35) && K.blds.length > 3) continue;
    const faces = K.court ? info.streets.split('') : 'xXzZ'.split('').filter(f => info.streets.indexOf(f) < 0);
    const f = faces.length ? G.pick(faces) : G.pick('xXzZ'.split(''));
    const t = G.r(0.25, 0.75);
    const [px, pz, nx, nz] = this.facePoint(info, f, t);
    const q = World.query(px + nx * 0.8 - 0.3, pz + nz * 0.8 - 0.3, px + nx * 0.8 + 0.3, pz + nz * 0.8 + 0.3, []);
    if (q.some(b => b.kind === 'bld' && b !== info.box)) continue;
    this.ladder(px, pz, nx, nz, CURB, info.h, info);
  }
};
// the financial towers become squat guild towers; their setbacks and masts (drawn outside bld) are dropped
(() => {
  const fin = Districts.g_fin;
  Districts.g_fin = function (C, K) {
    const M = Medieval, A = C.B.atlas, box = A.box, tube = A.tube, prev = M._hmap;
    M._hmap = (h, style, x0, z0, o) => o.base ? [18 + Math.max(0, h - 55) * 0.15, 'stone'] : [h, style];
    A.box = function (...a) { return M._inBld ? box.apply(this, a) : undefined; };
    A.tube = function (...a) { return M._inBld ? tube.apply(this, a) : undefined; };
    const S0 = World.spots.skyscraper;
    try { fin.call(this, C, K); } finally { A.box = box; A.tube = tube; M._hmap = prev; }
    const S = World.spots.skyscraper;
    if (S && S !== S0) { const b = World.buildings.find(q => S.x > q.x0 && S.x < q.x1 && S.z > q.z0 && S.z < q.z1 && q.h0 === S.y); if (b) S.y = b.h; }
  };
})();
// backdrop: cottages along the edge, a palisade of sharpened stakes with watchtowers, windmills on the rise beyond
City.backdrop = function () {
  const X0 = RX[0] - RHW - SIDEW, X1 = RX[NI] + RHW + SIDEW, Z0 = RZ[0] - RHW - SIDEW;
  this.slab(BOUNDS.x0, BOUNDS.z0, X0, 141, GCELL.pavers); this.slab(X1, BOUNDS.z0, BOUNDS.x1, 141, GCELL.pavers); this.slab(X0, BOUNDS.z0, X1, Z0, GCELL.pavers);
  const ring = [];
  for (let z = Z0 - 36; z < 138;) { const d = G.r(12, 22); const z1 = Math.min(z + d, 138); ring.push([X0 - G.r(14, 26), z, X0, z1]); ring.push([X1, z, X1 + G.r(14, 26), z1]); z = z1 + G.r(1, 4); }
  for (let x = X0; x < X1;) { const d = G.r(12, 24); const x1 = Math.min(x + d, X1); ring.push([x, Z0 - G.r(14, 26), x1, Z0]); x = x1 + G.r(1, 4); }
  let k = 0;
  for (const [x0, z0, x1, z1] of ring) { // cottages and barns, now and then a stone chapel tower
    const chapel = k++ % 9 === 0, h = chapel ? G.r(20, 26) : G.r(6, 11);
    const style = chapel ? 'stone' : G.pick(['brick2', 'plaster', 'house', 'house', 'concrete', 'brick2']);
    this.bld(x0, z0, x1, z1, h, style, { roofProps: false, signs: false, shops: false });
  }
  const BW = 3, BH = 60, bo = { noray: true, nowalk: true };
  World.addBox(BOUNDS.x0 - BW, -5, BOUNDS.z0 - BW, BOUNDS.x0, BH, WATER_Z, 'bound', bo); World.addBox(BOUNDS.x1, -5, BOUNDS.z0 - BW, BOUNDS.x1 + BW, BH, WATER_Z, 'bound', bo);
  World.addBox(BOUNDS.x0 - BW, -5, BOUNDS.z0 - BW, BOUNDS.x1 + BW, BH, BOUNDS.z0, 'bound', bo);
  this.bld(BOUNDS.x0, 144, X0 - 2, WATER_Z, 9, 'warehouse', { roofProps: false, signs: false, shops: false });
  this.bld(X1 + 2, 144, BOUNDS.x1, WATER_Z, 9, 'warehouse', { roofProps: false, signs: false, shops: false });
  const A = this.B.atlas, M = Medieval, PH = 9, wood = [0.42, 0.31, 0.2, 0], dark = [0.3, 0.22, 0.14, 0];
  // palisade: a plank wall faced with stakes, a sawtooth of sharpened points along the top
  const palisade = (ax, az, bx, bz) => {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz), alongX = x1 - x0 > z1 - z0, L = alongX ? x1 - x0 : z1 - z0;
    A.box(x0, 0, z0, x1, PH, z1, { faces: 'xXzZY', cell: CELL.industrial, su: 6, sv: 6, col: wood });
    const n = Math.floor(L / 0.9), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let i = 0; i < n; i++) {
      const s0 = (alongX ? x0 : z0) + i * 0.9, s1 = s0 + 0.9, sm = s0 + 0.45, tip = PH + 1.1 + M.hash(s0, cx + cz) * 0.5;
      if (alongX) for (const z of [z0 - 0.02, z1 + 0.02]) M.tri(A, [s0, PH, z], [s1, PH, z], [sm, tip, z], dark);
      else for (const x of [x0 - 0.02, x1 + 0.02]) M.tri(A, [x, PH, s0], [x, PH, s1], [x, tip, sm], dark);
    }
  };
  palisade(X0 - 34, Z0 - 34, X0 - 32, 160); palisade(X1 + 32, Z0 - 34, X1 + 34, 160); palisade(X0 - 34, Z0 - 34, X1 + 34, Z0 - 32);
  // timber watchtowers on four legs, a shingled pyramid roof and a brazier
  for (const [x, z] of [[X0 - 33, Z0 - 33], [X1 + 33, Z0 - 33], [X0 - 33, 150], [X1 + 33, 150], [X0 - 33, -120], [X1 + 33, -120], [-200, Z0 - 33], [0, Z0 - 33], [200, Z0 - 33]]) {
    for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) A.tube(x + dx, 0, z + dz, x + dx * 0.8, 14, z + dz * 0.8, 0.3, dark, 6);
    A.box(x - 2.8, 14, z - 2.8, x + 2.8, 16.8, z + 2.8, { faces: 'xXzZYy', cell: CELL.industrial, su: 6, sv: 6, col: wood });
    A.addGeo(cylGeo(4.4, 0.2, 4.5, 4, false), M4.compose(M4.create(), x, 18.6, z, 0, Math.PI / 4, 0), [0.32, 0.24, 0.17, 0]);
    for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) A.tube(x + dx, 16.8, z + dz, x + dx, 18.6, z + dz, 0.12, dark, 4);
    M.torchFar(this, x, 17.2, z);
  }
  // windmills on the rise beyond the stakes: stone tower, conical cap, four lattice sails
  const mill = (x, z, yaw) => {
    A.addGeo(cylGeo(4.2, 3.2, 13, 12), M4.compose(M4.create(), x, 0, z, 0, 0, 0), [0.62, 0.6, 0.55, 0]);
    A.addGeo(cylGeo(3.7, 0.2, 4.2, 12, false), M4.compose(M4.create(), x, 13, z, 0, 0, 0), [0.4, 0.3, 0.2, 0]);
    const hx = x + Math.sin(yaw) * 4, hz = z + Math.cos(yaw) * 4, hy = 13.5, tx = Math.cos(yaw), tz = -Math.sin(yaw);
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2 + 0.4, ux = Math.cos(a), uy = Math.sin(a), ex = hx + tx * ux * 11, ey = hy + uy * 11, ez = hz + tz * ux * 11;
      A.tube(hx, hy, hz, ex, ey, ez, 0.16, dark, 4);
      const px = -uy, py = ux; // the sail cloth: a narrow quad beside the arm
      M.quad4(A, [hx + tx * ux * 2.5, hy + uy * 2.5, hz + tz * ux * 2.5], [ex, ey, ez], [ex + tx * px * 2, ey + py * 2, ez + tz * px * 2], [hx + tx * (ux * 2.5 + px * 2), hy + uy * 2.5 + py * 2, hz + tz * (ux * 2.5 + px * 2)], [0.78, 0.72, 0.6, 0], CELL.plain);
    }
    World.lightsStatic.push({ x: hx, y: 3, z: hz, r: 1.6, g: 0.9, b: 0.4, range: 10, flick: 1 });
  };
  mill(X0 - 70, -60, Math.PI / 2 + 0.3); mill(X1 + 75, 30, -Math.PI / 2 - 0.2); mill(-120, Z0 - 80, 0.2); mill(150, Z0 - 95, -0.3); mill(X0 - 90, Z0 - 60, 0.8);
  // fields between the stakes and the hills: strips of tilled earth and green
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * TAU, r = 320 + M.hash(i, 7) * 60, x = Math.sin(a) * r * 1.1, z = -Math.cos(a) * r * 0.7 - 120; if (z > 120) continue;
    const c = M.hash(i, 9) < 0.5 ? [0.18, 0.22, 0.12, 0] : [0.24, 0.18, 0.12, 0];
    A.cbox(x - 40, 0.02, z - 18, x + 40, 0.05, z + 18, c, 'Y');
  }
  // hills and castles beyond (no colliders) — the lord's castle still watches over the village
  for (let k2 = 0; k2 < 46; k2++) {
    const a = k2 / 46 * TAU + G.r(-0.03, 0.03); const r = G.r(560, 760); const x = Math.sin(a) * r * 1.1, z = -Math.cos(a) * r * 0.75 - 120;
    if (z > WATER_Z - 20) continue;
    const w = G.r(140, 260), h = G.r(40, 110);
    A.addGeo(cylGeo(w * 0.5, w * 0.12, h, 9, false), M4.compose(M4.create(), x, -2, z, 0, G.r(0, 3), 0), [0.1, 0.13, 0.11, 0]);
    if (G.chance(0.16)) {
      const cy = h - 6, cs = G.r(18, 30);
      A.box(x - cs / 2, cy, z - cs / 2, x + cs / 2, cy + cs * 0.9, z + cs / 2, { faces: 'xXzZ', cell: CELL.tower, su: 24, sv: 25.6, col: [0.45, 0.46, 0.5, 0] });
      M.spire(A, x - cs / 2, z - cs / 2, x + cs / 2, z + cs / 2, cy + cs * 0.9, cs * 0.7, [0.16, 0.17, 0.2], 1);
      if (G.chance(0.6)) this.B.glow.cbox(x - 1, cy + cs * 0.5, z + cs / 2, x + 1, cy + cs * 0.5 + 2, z + cs / 2 + 0.2, [1, 0.6, 0.25, 1.2]);
    }
  }
  // the far shore across the bay: a fishing hamlet and its chapel
  for (let x = -900; x < 900; x += G.r(24, 70)) {
    const w = G.r(10, 22), h = G.r(5, 9), z = G.r(620, 700);
    A.box(x, -2, z, x + w, h, z + w * 0.6, { faces: 'xXzZ', cell: G.pick([CELL.plaster, CELL.house, CELL.house, CELL.stone]), su: 24, sv: 25.6, col: [0.5, 0.52, 0.58, 0] });
    M.gable(A, x, z, x + w, z + w * 0.6, h, Math.min(w, w * 0.6) * 0.6, [0.34, 0.3, 0.22], [0.5, 0.52, 0.58], 0.5);
    if (G.chance(0.06)) { A.box(x + w / 2 - 3, h, z + 2, x + w / 2 + 3, h + 14, z + 8, { faces: 'xXzZ', cell: CELL.stone, su: 24, sv: 25.6, col: [0.5, 0.52, 0.58, 0] }); M.spire(A, x + w / 2 - 3, z + 2, x + w / 2 + 3, z + 8, h + 14, 9, [0.2, 0.2, 0.24], 1); }
  }
};
