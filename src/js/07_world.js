/* =====================================================================
   WORLD — colliders, spatial grid, raycasts, lights
   ===================================================================== */
// Road grid. The original city ("core", 5×5 blocks between the ROADS lines) sits in the middle of a larger grid
// of 15×9 blocks: road lines along x (RX, north-south streets) and along z (RZ, east-west streets).
const ROADS = [-135, -81, -27, 27, 81, 135];
const RX = [-405, -351, -297, -243, -189, -135, -81, -27, 27, 81, 135, 189, 243, 297, 351, 405];
const RZ = [-351, -297, -243, -189, -135, -81, -27, 27, 81, 135];
const NI = RX.length - 1, NJ = RZ.length - 1;   // 15 × 9 blocks
const CI = 5, CJ = 4;                            // core block (0,0) = grid block (5,4)
const RHW = 6;          // road half width
const SIDEW = 3;        // sidewalk width
const CURB = 0.15;      // sidewalk height
const WATER_Z = 172, WATER_Y = -1.6;
const LANE = 2.75, PARK = 4.9;
const GCELLSZ = 8;
const BOUNDS = { x0: -492, x1: 492, z0: -440, z1: 172 }; // land (the sea starts at WATER_Z)

const World = {
  boxes: [], grid: new Map(), stamp: null, stampId: 1,
  ladders: [], zips: [], lightsStatic: [], coronas: [], buildings: [], blocks: [], badges: [], spots: {}, props: [], mapAreas: [], parkSpots: [],
  nav: { rings: [], nodes: [], cross: [] },
  meshes: {},
  key(ix, iz) { return (ix + 500) * 1000 + (iz + 500); },
  addBox(x0, y0, z0, x1, y1, z1, kind = 'solid', extra) {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (z0 > z1) [z0, z1] = [z1, z0];
    const b = { x0, y0, z0, x1, y1, z1, kind, id: this.boxes.length };
    if (extra) Object.assign(b, extra);
    this.boxes.push(b);
    const ix0 = Math.floor(x0 / GCELLSZ), ix1 = Math.floor(x1 / GCELLSZ), iz0 = Math.floor(z0 / GCELLSZ), iz1 = Math.floor(z1 / GCELLSZ);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) { const k = this.key(ix, iz); let c = this.grid.get(k); if (!c) this.grid.set(k, c = []); c.push(b.id); }
    return b;
  },
  query(x0, z0, x1, z1, out) {
    out.length = 0;
    if (!this.stamp || this.stamp.length < this.boxes.length) this.stamp = new Uint32Array(this.boxes.length + 1024);
    const s = ++this.stampId;
    const ix0 = Math.floor(x0 / GCELLSZ), ix1 = Math.floor(x1 / GCELLSZ), iz0 = Math.floor(z0 / GCELLSZ), iz1 = Math.floor(z1 / GCELLSZ);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const c = this.grid.get(this.key(ix, iz)); if (!c) continue;
      for (let k = 0; k < c.length; k++) { const id = c[k]; if (this.stamp[id] === s) continue; this.stamp[id] = s; const b = this.boxes[id]; if (b.x1 >= x0 && b.x0 <= x1 && b.z1 >= z0 && b.z0 <= z1 && !b.off) out.push(b); }
    }
    return out;
  },
  onLand(x, z) { if (x > BOUNDS.x0 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < WATER_Z) return true; for (const L of this.extraLand) if (x > L[0] && x < L[2] && z > L[1] && z < L[3]) return true; return false; },
  extraLand: [],
  baseGround(x, z) { return this.onLand(x, z) ? 0 : -80; },
  _q: [],
  // highest walkable surface under circle whose top <= maxY
  groundAt(x, z, r, maxY) {
    let g = this.baseGround(x, z);
    const q = this.query(x - r, z - r, x + r, z + r, this._q);
    for (let i = 0; i < q.length; i++) {
      const b = q[i]; if (b.y1 > maxY || b.y1 <= g || b.nowalk) continue;
      const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz <= r * r) g = b.y1;
    }
    return g;
  },
  // ceiling: lowest box bottom above y within circle
  ceilingAt(x, z, r, y) {
    let c = 1e9; const q = this.query(x - r, z - r, x + r, z + r, this._q);
    for (let i = 0; i < q.length; i++) { const b = q[i]; if (b.y0 < y - 0.01 || b.y0 >= c) continue; const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz <= r * r) c = b.y0; }
    return c;
  },
  // push a vertical cylinder out of boxes (horizontal). Returns number of contacts written to contacts[]
  collideCircle(p, r, h, stepH, contacts) {
    let n = 0;
    const q = this.query(p.x - r - 0.1, p.z - r - 0.1, p.x + r + 0.1, p.z + r + 0.1, this._q);
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < q.length; i++) {
        const b = q[i];
        if (b.y1 <= p.y + stepH || b.y0 >= p.y + h) continue;
        const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
        let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        let nx, nz, push;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; push = r - d; }
        else { // center inside box: push to nearest side
          const l = p.x - b.x0, rr = b.x1 - p.x, f = p.z - b.z0, bk = b.z1 - p.z; const m = Math.min(l, rr, f, bk);
          if (m === l) { nx = -1; nz = 0; push = l + r; } else if (m === rr) { nx = 1; nz = 0; push = rr + r; } else if (m === f) { nx = 0; nz = -1; push = f + r; } else { nx = 0; nz = 1; push = bk + r; }
        }
        p.x += nx * push; p.z += nz * push;
        if (contacts && n < contacts.length) { const c = contacts[n++]; c.box = b; c.nx = nx; c.nz = nz; }
      }
    }
    return n;
  },
  // ray vs boxes using 2D DDA over grid. returns {t,nx,ny,nz,box} or null
  raycast(ox, oy, oz, dx, dy, dz, maxT, ignoreKind) {
    let best = maxT, hit = null;
    if (!this.stamp || this.stamp.length < this.boxes.length) this.stamp = new Uint32Array(this.boxes.length + 1024);
    const s = ++this.stampId;
    let ix = Math.floor(ox / GCELLSZ), iz = Math.floor(oz / GCELLSZ);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = Math.abs(dx) > 1e-9 ? Math.abs(GCELLSZ / dx) : 1e9, tDZ = Math.abs(dz) > 1e-9 ? Math.abs(GCELLSZ / dz) : 1e9;
    let tMX = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (ix + 1) * GCELLSZ - ox : ox - ix * GCELLSZ) / Math.abs(dx)) : 1e9;
    let tMZ = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (iz + 1) * GCELLSZ - oz : oz - iz * GCELLSZ) / Math.abs(dz)) : 1e9;
    let tCell = 0;
    for (let guard = 0; guard < 400; guard++) {
      const c = this.grid.get(this.key(ix, iz));
      if (c) for (let k = 0; k < c.length; k++) {
        const id = c[k]; if (this.stamp[id] === s) continue; this.stamp[id] = s; const b = this.boxes[id];
        if (b.off || (ignoreKind && b.kind === ignoreKind) || b.noray) continue;
        // slab test
        const r = this._slab(ox, oy, oz, dx, dy, dz, b, best);
        if (r >= 0 && r < best) { best = r; hit = { t: r, nx: this._n[0], ny: this._n[1], nz: this._n[2], box: b }; }
      }
      // ground plane / water
      const tNext = Math.min(tMX, tMZ);
      if (hit && hit.t <= tNext) break;
      if (tNext > best) break;
      tCell = tNext;
      if (tMX < tMZ) { ix += stepX; tMX += tDX; } else { iz += stepZ; tMZ += tDZ; }
    }
    // ground plane y=0 on land
    if (dy < -1e-6) { const tg = (0 - oy) / dy; if (tg >= 0 && tg < best) { const gx = ox + dx * tg, gz = oz + dz * tg; if (this.onLand(gx, gz)) { best = tg; hit = { t: tg, nx: 0, ny: 1, nz: 0, box: null }; } } }
    return hit;
  },
  _n: [0, 0, 0],
  _slab(ox, oy, oz, dx, dy, dz, b, maxT) {
    let t0 = 0, t1 = maxT, ax = -1, sg = 0;
    // X
    if (Math.abs(dx) < 1e-9) { if (ox < b.x0 || ox > b.x1) return -1; }
    else { let ta = (b.x0 - ox) / dx, tb = (b.x1 - ox) / dx, s = -1; if (ta > tb) { const t = ta; ta = tb; tb = t; s = 1; } if (ta > t0) { t0 = ta; ax = 0; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) return -1; }
    if (Math.abs(dy) < 1e-9) { if (oy < b.y0 || oy > b.y1) return -1; }
    else { let ta = (b.y0 - oy) / dy, tb = (b.y1 - oy) / dy, s = -1; if (ta > tb) { const t = ta; ta = tb; tb = t; s = 1; } if (ta > t0) { t0 = ta; ax = 1; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) return -1; }
    if (Math.abs(dz) < 1e-9) { if (oz < b.z0 || oz > b.z1) return -1; }
    else { let ta = (b.z0 - oz) / dz, tb = (b.z1 - oz) / dz, s = -1; if (ta > tb) { const t = ta; ta = tb; tb = t; s = 1; } if (ta > t0) { t0 = ta; ax = 2; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) return -1; }
    const n = this._n; n[0] = n[1] = n[2] = 0; if (ax >= 0) n[ax] = sg;
    return t0;
  },
  // nearest free spot at street level (road, sidewalk, pier) around (x, z): never on a prop, container, roof or crane,
  // never inside a wall, never in the water. Used for every (re)spawn.
  safeSpot(x, z, r = 0.45, maxR = 30) {
    const q = [];
    for (let rad = 0; rad <= maxR; rad += 0.6) {
      const n = rad === 0 ? 1 : Math.max(8, Math.round(rad * 6));
      for (let k = 0; k < n; k++) {
        const a = k / n * TAU + rad * 0.37, px = x + Math.sin(a) * rad, pz = z + Math.cos(a) * rad;
        const g = this.groundAt(px, pz, r, 0.5); // street level only: canopies and roofs overhead are not "ground"
        if (g < -0.4 || g > CURB + 0.06) continue;
        this.query(px - r - 0.05, pz - r - 0.05, px + r + 0.05, pz + r + 0.05, q);
        let blocked = false;
        for (const b of q) {
          if (b.y1 <= g + 0.05 || b.y0 >= g + 2.0 || b.kind === 'awning') continue;
          const cx = clamp(px, b.x0, b.x1), cz = clamp(pz, b.z0, b.z1);
          if ((px - cx) * (px - cx) + (pz - cz) * (pz - cz) < (r + 0.05) * (r + 0.05)) { blocked = true; break; }
        }
        if (!blocked) return { x: px, y: g, z: pz };
      }
    }
    return { x, y: Math.max(0, this.groundAt(x, z, r, CURB + 0.2)), z };
  },
  los(a, b, h1 = 1.5, h2 = 1.5) {
    const dx = b.x - a.x, dy = (b.y + h2) - (a.y + h1), dz = b.z - a.z; const L = Math.hypot(dx, dy, dz) || 1;
    const hit = this.raycast(a.x, a.y + h1, a.z, dx / L, dy / L, dz / L, L - 0.3);
    return !hit;
  },
  // nearest street name for radio calls
  streetName(x, z) {
    let best = null, bd = 1e9;
    RX.forEach((r, i) => { const d = Math.abs(x - r); if (d < bd) { bd = d; best = { axis: 'x', i }; } });
    RZ.forEach((r, i) => { const d = Math.abs(z - r); if (d < bd) { bd = d; best = { axis: 'z', i }; } });
    return best.axis === 'x' ? Tex.streetX[best.i] : Tex.streetZ[best.i];
  },
  crossName(x, z) {
    let ix = 0, iz = 0, bx = 1e9, bz = 1e9; RX.forEach((r, i) => { if (Math.abs(x - r) < bx) { bx = Math.abs(x - r); ix = i; } }); RZ.forEach((r, i) => { if (Math.abs(z - r) < bz) { bz = Math.abs(z - r); iz = i; } });
    return `angle ${Tex.streetX[ix].toLowerCase()} et ${Tex.streetZ[iz].toLowerCase()}`;
  },
  // district at a position (name shown when entering, map labels)
  districtAt(x, z) {
    const i = RX.findIndex((r, k) => k < NI && x >= r && x < RX[k + 1]), j = RZ.findIndex((r, k) => k < NJ && z >= r && z < RZ[k + 1]);
    if (i >= 0 && j >= 0) return this.blocks[i] && this.blocks[i][j] ? this.blocks[i][j].area : null;
    if (z >= RZ[NJ] && z < WATER_Z + 40 && x > RX[0] && x < RX[NI]) { const i2 = RX.findIndex((r, k) => k < NI && x >= r && x < RX[k + 1]); return i2 >= 0 && this.blocks[i2] ? this.blocks[i2][NJ - 1].area : null; }
    return null;
  },
  coreBlock(i, j) { return this.blocks[i + CI][j + CJ]; }
};

/* ---------- road network: which segments exist (merged districts swallow their inner roads) ---------- */
const Net = {
  grp(i, j) { const c = World.blocks[i]; const K = c && c[j]; return K ? K.grp : null; },
  // road along x at z = RZ[j], between RX[i] and RX[i+1]
  segX(i, j) { if (i < 0 || i >= NI || j < 0 || j > NJ) return false; const a = j > 0 ? this.grp(i, j - 1) : null, b = j < NJ ? this.grp(i, j) : null; return !(a && a === b); },
  // road along z at x = RX[i], between RZ[j] and RZ[j+1]
  segZ(i, j) { if (j < 0 || j >= NJ || i < 0 || i > NI) return false; const a = i > 0 ? this.grp(i - 1, j) : null, b = i < NI ? this.grp(i, j) : null; return !(a && a === b); },
  node(i, j) { return this.segX(i - 1, j) || this.segX(i, j) || this.segZ(i, j - 1) || this.segZ(i, j); },
  // is (x,z) on a road (asphalt) ?
  onRoad(x, z) {
    for (let j = 0; j <= NJ; j++) if (Math.abs(z - RZ[j]) < RHW) { const i = RX.findIndex((r, k) => k < NI && x >= r && x < RX[k + 1]); if (i >= 0 && this.segX(i, j)) return true; }
    for (let i = 0; i <= NI; i++) if (Math.abs(x - RX[i]) < RHW) { const j = RZ.findIndex((r, k) => k < NJ && z >= r && z < RZ[k + 1]); if (j >= 0 && this.segZ(i, j)) return true; }
    return false;
  }
};

/* ---------- light sources: pick the nearest few each frame ---------- */
const Lights = {
  dyn: [], arrP: new Float32Array(NL * 4), arrC: new Float32Array(NL * 3), arrD: new Float32Array(NL), _cand: [],
  add(x, y, z, r, g, b, range, ttl, id) { // dynamic
    if (id) { const e = this.dyn.find(d => d.id === id); if (e) { Object.assign(e, { x, y, z, r, g, b, range, ttl }); return e; } }
    const d = { x, y, z, r, g, b, range, ttl, id }; this.dyn.push(d); return d;
  },
  update(dt, fx, fy, fz) {
    for (let i = this.dyn.length - 1; i >= 0; i--) { this.dyn[i].ttl -= dt; if (this.dyn[i].ttl <= 0) this.dyn.splice(i, 1); }
    const P = this.arrP, C = this.arrC, D = this.arrD; P.fill(0); C.fill(0); D.fill(1);
    let n = 0;
    const dyn = this.dyn.slice().sort((a, b) => ((a.x - fx) ** 2 + (a.z - fz) ** 2) - ((b.x - fx) ** 2 + (b.z - fz) ** 2));
    for (const d of dyn) { if (n >= Math.min(3, Gfx.LN - 1)) break; P[n * 4] = d.x; P[n * 4 + 1] = d.y; P[n * 4 + 2] = d.z; P[n * 4 + 3] = d.range; C[n * 3] = d.r; C[n * 3 + 1] = d.g; C[n * 3 + 2] = d.b; n++; }
    const cand = this._cand; cand.length = 0;
    const L = World.lightsStatic;
    for (let i = 0; i < L.length; i++) { const l = L[i]; const d2 = (l.x - fx) ** 2 + (l.y - fy) ** 2 * 0.3 + (l.z - fz) ** 2; if (d2 < 2500) { l._d = d2; cand.push(l); } }
    cand.sort((a, b) => a._d - b._d);
    const slots = Gfx.LN - n; const cut = cand.length > slots ? Math.sqrt(cand[slots]._d) : 50;
    for (let k = 0; k < slots && k < cand.length; k++) {
      const l = cand[k]; const d = Math.sqrt(l._d); const f = clamp((cut - d) / Math.max(4, cut * 0.35), 0, 1) * (l.flick ? l.flick : 1);
      P[n * 4] = l.x; P[n * 4 + 1] = l.y; P[n * 4 + 2] = l.z; P[n * 4 + 3] = l.range; C[n * 3] = l.r * f; C[n * 3 + 1] = l.g * f; C[n * 3 + 2] = l.b * f; D[n] = l.baked ? 0.35 : 1; n++; // a baked lamp keeps only its highlights and some relief
    }
  }
};

