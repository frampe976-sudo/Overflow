/* =====================================================================
   GEOMETRY builders
   ===================================================================== */
class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.vc = 0; }
  vert(x, y, z, nx, ny, nz, u, v, cu, cv, r, g, b, e) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, v, cu, cv); this.c.push(r, g, b, e); return this.vc++;
  }
  // quad from origin o + edge vectors (ux,uy,uz) and (vx,vy,vz); u x v must equal the outward normal
  quad(ox, oy, oz, ux, uy, uz, vx, vy, vz, uvs, cell, col) {
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const [u0, v0, u1, v1] = uvs; const cu = cell ? cell[0] : 0, cv = cell ? cell[1] : 0;
    const [r, g, b, e] = col;
    const a = this.vert(ox, oy, oz, nx, ny, nz, u0, v0, cu, cv, r, g, b, e);
    this.vert(ox + ux, oy + uy, oz + uz, nx, ny, nz, u1, v0, cu, cv, r, g, b, e);
    this.vert(ox + ux + vx, oy + uy + vy, oz + uz + vz, nx, ny, nz, u1, v1, cu, cv, r, g, b, e);
    this.vert(ox + vx, oy + vy, oz + vz, nx, ny, nz, u0, v1, cu, cv, r, g, b, e);
    this.i.push(a, a + 1, a + 2, a, a + 2, a + 3);
  }
  /* box with per-face options. o = { col:[r,g,b,e], cell:[cx,cy], su, sv (meters per uv unit), ou, ov, faces:'xXzZyY' (+ uppercase = positive),
     top:{cell,col,su,sv}, uvBase (y at which v=0) } */
  box(x0, y0, z0, x1, y1, z1, o = {}) {
    const col = o.col || [1, 1, 1, 0], cell = o.cell || [0, 0], su = o.su || 1, sv = o.sv || 1, ou = o.ou || 0, ov = o.ov || 0;
    const faces = o.faces || 'xXzZY';
    const W = x1 - x0, H = y1 - y0, D = z1 - z0; const vb = o.uvBase !== undefined ? o.uvBase : y0;
    const vv0 = (y0 - vb) / sv + ov, vv1 = (y1 - vb) / sv + ov;
    const side = (key, ox, oy, oz, ux, uz, len) => {
      if (faces.indexOf(key) < 0) return;
      const f = (o.face && o.face[key]) || null;
      const c2 = f && f.cell ? f.cell : cell, col2 = f && f.col ? f.col : col, su2 = f && f.su ? f.su : su;
      const uoff = (f && f.ou !== undefined) ? f.ou : ou;
      this.quad(ox, oy, oz, ux, 0, uz, 0, H, 0, [uoff, vv0, uoff + len / su2, vv1], c2, col2);
    };
    side('X', x1, y0, z1, 0, -D, D);
    side('x', x0, y0, z0, 0, D, D);
    side('Z', x0, y0, z1, W, 0, W);
    side('z', x1, y0, z0, -W, 0, W);
    if (faces.indexOf('Y') >= 0) {
      const t = o.top || {}; const tsu = t.su || su, tsv = t.sv || sv;
      this.quad(x0, y1, z1, W, 0, 0, 0, 0, -D, [x0 / tsu, -z1 / tsv, x1 / tsu, -z0 / tsv], t.cell || cell, t.col || col);
    }
    if (faces.indexOf('y') >= 0) this.quad(x0, y0, z0, W, 0, 0, 0, 0, D, [0, 0, W / su, D / sv], cell, col);
  }
  // simple colored box (plain cell), all faces except bottom
  cbox(x0, y0, z0, x1, y1, z1, col, faces) { this.box(x0, y0, z0, x1, y1, z1, { col, cell: CELL.plain, faces: faces || 'xXzZY' }); }
  // oriented box: center, half extents, yaw
  obox(cx, cy, cz, hx, hy, hz, yaw, col, cell) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const base = this.vc;
    const tmp = new GeoBuilder(); tmp.box(-hx, -hy, -hz, hx, hy, hz, { col, cell: cell || CELL.plain, faces: 'xXzZYy' });
    for (let k = 0; k < tmp.vc; k++) {
      const x = tmp.p[k * 3], y = tmp.p[k * 3 + 1], z = tmp.p[k * 3 + 2];
      const nx = tmp.n[k * 3], ny = tmp.n[k * 3 + 1], nz = tmp.n[k * 3 + 2];
      this.p.push(cx + x * c + z * s, cy + y, cz - x * s + z * c);
      this.n.push(nx * c + nz * s, ny, -nx * s + nz * c);
    }
    this.u.push(...tmp.u); this.c.push(...tmp.c);
    for (const ix of tmp.i) this.i.push(ix + base);
    this.vc += tmp.vc;
  }
  // cylinder segment between two points (for poles, rails, cables)
  tube(ax, ay, az, bx, by, bz, r, col, segs = 6) {
    const m = M4.segment(M4.create(), ax, ay, az, bx, by, bz, r);
    const base = this.vc; const tmpP = { x: 0, y: 0, z: 0 };
    for (let s = 0; s <= segs; s++) {
      const a = s / segs * TAU, ca = Math.cos(a), sa = Math.sin(a);
      for (let e = 0; e < 2; e++) {
        M4.transformPoint(m, ca, e, sa, tmpP);
        const nx = m[0] * ca + m[8] * sa, ny = m[1] * ca + m[9] * sa, nz = m[2] * ca + m[10] * sa; const nl = Math.hypot(nx, ny, nz) || 1;
        this.vert(tmpP.x, tmpP.y, tmpP.z, nx / nl, ny / nl, nz / nl, 0, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
      }
    }
    for (let s = 0; s < segs; s++) { const a = base + s * 2; this.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  // append geometry (from lathe etc.) transformed by matrix m with color
  addGeo(g, m, col) {
    const base = this.vc; const P = { x: 0, y: 0, z: 0 };
    const nv = g.pos.length / 3;
    for (let k = 0; k < nv; k++) {
      M4.transformPoint(m, g.pos[k * 3], g.pos[k * 3 + 1], g.pos[k * 3 + 2], P);
      const nx = g.nrm[k * 3], ny = g.nrm[k * 3 + 1], nz = g.nrm[k * 3 + 2];
      let tx = m[0] * nx + m[4] * ny + m[8] * nz, ty = m[1] * nx + m[5] * ny + m[9] * nz, tz = m[2] * nx + m[6] * ny + m[10] * nz; const l = Math.hypot(tx, ty, tz) || 1;
      this.p.push(P.x, P.y, P.z); this.n.push(tx / l, ty / l, tz / l);
      this.u.push(g.uv[k * 4], g.uv[k * 4 + 1], g.uv[k * 4 + 2], g.uv[k * 4 + 3]);
      if (col) this.c.push(col[0], col[1], col[2], col[3]); else this.c.push(g.col[k * 4], g.col[k * 4 + 1], g.col[k * 4 + 2], g.col[k * 4 + 3]);
    }
    for (let k = 0; k < g.idx.length; k++) this.i.push(g.idx[k] + base);
    this.vc += nv;
  }
  build() {
    return {
      pos: new Float32Array(this.p), nrm: new Float32Array(this.n), uv: new Float32Array(this.u), col: new Float32Array(this.c),
      idx: this.vc > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i)
    };
  }
}

// surface of revolution around Y. prof: array of [r, y, nr, ny]
function latheGeo(prof, segs, col = [1, 1, 1, 0]) {
  const g = new GeoBuilder();
  for (let s = 0; s <= segs; s++) {
    const a = s / segs * TAU, ca = Math.cos(a), sa = Math.sin(a);
    for (const [r, y, nr, ny] of prof) g.vert(r * sa, y, r * ca, nr * sa, ny, nr * ca, s / segs, y, 0, 0, col[0], col[1], col[2], col[3]);
  }
  const np = prof.length;
  for (let s = 0; s < segs; s++) for (let k = 0; k < np - 1; k++) {
    const a = s * np + k, b = (s + 1) * np + k;
    g.i.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return g.build();
}
function capsuleGeo(r, len, segs = 10, rings = 4) {
  const prof = [];
  for (let i = 0; i <= rings; i++) { const a = Math.PI / 2 * (1 - i / rings); prof.push([r * Math.cos(a), r * Math.sin(a) * 0.9, Math.cos(a), Math.sin(a)]); }
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 * (i / rings); prof.push([r * Math.cos(a), -len + r * Math.sin(a) * 0.9, Math.cos(a), Math.sin(a)]); }
  return latheGeo(prof, segs); // profile must run top -> bottom for outward winding
}
function sphereGeo(r, segs = 12, rings = 8, sy = 1) {
  const prof = [];
  for (let i = 0; i <= rings; i++) { const a = Math.PI / 2 - Math.PI * i / rings; prof.push([r * Math.cos(a), r * Math.sin(a) * sy, Math.cos(a), Math.sin(a)]); }
  return latheGeo(prof, segs);
}
function cylGeo(r0, r1, h, segs = 10, caps = true) {
  const prof = [];
  const sl = Math.atan2(r0 - r1, h), nr = Math.cos(sl), ny = Math.sin(sl);
  if (caps) { prof.push([0, h, 0, 1], [r1, h, 0, 1]); }
  prof.push([r1, h, nr, ny], [r0, 0, nr, ny]);
  if (caps) { prof.push([r0, 0, 0, -1], [0, 0, 0, -1]); }
  return latheGeo(prof, segs);
}
function boxGeo(w, h, d, cx = 0, cy = 0, cz = 0) {
  const g = new GeoBuilder();
  g.box(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, { faces: 'xXzZYy', col: [1, 1, 1, 0] });
  return g.build();
}
// trapezoid prism (car cabin): bottom w x d, top tw x td, height h, top shifted by tz
function prismGeo(w, d, tw, td, h, tz = 0) {
  const g = new GeoBuilder(); const col = [1, 1, 1, 0];
  const B = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]];
  const T = [[-tw / 2, h, -td / 2 + tz], [tw / 2, h, -td / 2 + tz], [tw / 2, h, td / 2 + tz], [-tw / 2, h, td / 2 + tz]];
  const face = (a, b, c, d2) => { // CCW a,b,c,d
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d2[0] - a[0], vy = d2[1] - a[1], vz = d2[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i0 = g.vert(a[0], a[1], a[2], nx, ny, nz, 0, 0, 0, 0, ...col); g.vert(b[0], b[1], b[2], nx, ny, nz, 1, 0, 0, 0, ...col);
    g.vert(c[0], c[1], c[2], nx, ny, nz, 1, 1, 0, 0, ...col); g.vert(d2[0], d2[1], d2[2], nx, ny, nz, 0, 1, 0, 0, ...col);
    g.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  };
  face(B[3], B[2], T[2], T[3]); // front +z
  face(B[1], B[0], T[0], T[1]); // back -z
  face(B[2], B[1], T[1], T[2]); // +x
  face(B[0], B[3], T[3], T[0]); // -x
  face(T[3], T[2], T[1], T[0]); // top
  return g.build();
}
function transformGeo(g, m) { const b = new GeoBuilder(); b.addGeo(g, m); return b.build(); }
function mergeGeos(list) { const b = new GeoBuilder(); for (const [g, m] of list) b.addGeo(g, m || M4.create()); return b.build(); }
function quadGeoXZ(w, d) { // flat quad on ground, facing up, uv 0..1
  const g = new GeoBuilder(); g.quad(-w / 2, 0, d / 2, w, 0, 0, 0, 0, -d, [0, 0, 1, 1], [0, 0], [1, 1, 1, 0]); return g.build();
}

