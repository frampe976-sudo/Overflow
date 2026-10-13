/* =====================================================================
   SCULPT — signed-distance modelling kit for the people of Port-Saline.
   Solids (round cones, ellipsoids, rounded boxes, cones, tori, planes)
   are combined with smooth unions, cuts and clips, meshed by surface nets
   at load time (narrow band, vertices projected on the true surface,
   analytic normals) and skinned to the rig from the distances to the
   body solids. Every step is a generator, so the work can be spread over
   several frames (see Sculpt.run).
   ===================================================================== */
const Sculpt = (() => {
  let _m = 0, _l = null;                  // material and solid of the closest surface, set by every evaluation
  // paint channels (shade multiplier, mask 0..1: emission or stubble), only computed in the final evaluation of a vertex
  let _s = 1, _e = 0, _fin = false;
  const T = { m: 0, s: 1, e: 0 };
  const PAD = 0.1;                         // farther than this from its box, a solid answers with the distance to the box
  const smin = (a, b, k) => { const h = k - Math.abs(a - b); return h > 0 ? Math.min(a, b) - h * h * 0.25 / k : (a < b ? a : b); };
  const smax = (a, b, k) => { const h = k - Math.abs(a - b); return h > 0 ? Math.max(a, b) + h * h * 0.25 / k : (a > b ? a : b); };
  const bbd = (b, x, y, z) => { const dx = Math.max(b[0] - x, x - b[3], 0), dy = Math.max(b[1] - y, y - b[4], 0), dz = Math.max(b[2] - z, z - b[5], 0); return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  const grow = (b, t) => b && [b[0] - t, b[1] - t, b[2] - t, b[3] + t, b[4] + t, b[5] + t];
  const merge = list => { if (list.some(c => !c.bb)) return null; const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (const c of list) for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], c.bb[i]); b[i + 3] = Math.max(b[i + 3], c.bb[i + 3]); } return b; };
  // bounding box of a box (or ellipsoid) with half extents h, turned by R (rows = local axes in world space)
  const rotBB = (c, h, R) => { if (!R) return [c[0] - h[0], c[1] - h[1], c[2] - h[2], c[0] + h[0], c[1] + h[1], c[2] + h[2]]; const e = [0, 0, 0]; for (let i = 0; i < 3; i++) e[i] = Math.abs(R[i]) * h[0] + Math.abs(R[3 + i]) * h[1] + Math.abs(R[6 + i]) * h[2]; return [c[0] - e[0], c[1] - e[1], c[2] - e[2], c[0] + e[0], c[1] + e[1], c[2] + e[2]]; };

  /* ---------- rotations (row-major 3x3, rows = local axes expressed in model space) ---------- */
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // local y along dir, local z as close as possible to hint (default: forward)
  function along(dir, hint) {
    const y = norm3(dir); let z = hint || [0, 0, 1]; const d = z[0] * y[0] + z[1] * y[1] + z[2] * y[2];
    z = [z[0] - y[0] * d, z[1] - y[1] * d, z[2] - y[2] * d]; if (Math.hypot(z[0], z[1], z[2]) < 1e-4) z = Math.abs(y[0]) < 0.9 ? cross3([1, 0, 0], y) : cross3([0, 0, 1], y);
    z = norm3(z); const x = cross3(y, z); return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
  }
  // from euler angles (radians) applied as Ry * Rx * Rz like M4.compose
  function euler(rx, ry, rz) {
    const m = M4.compose(M4.create(), 0, 0, 0, rx, ry, rz); // columns = images of the local axes
    return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  }
  // rotation part of a 4x4 matrix as rows = local axes
  const fromM4 = m => { const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]); return [m[0] / sx, m[1] / sx, m[2] / sx, m[4] / sy, m[5] / sy, m[6] / sy, m[8] / sz, m[9] / sz, m[10] / sz]; };

  /* ---------- solids ---------- */
  let nid = 0;
  class Solid {
    constructor(mat) { this.id = nid++; this.mat = mat | 0; this.bone = -1; this.bone2 = -1; this.t0 = 0; this.t1 = 1; this.bb = null; this.tag = null; }
    // skinning: bone (and a second bone the weight slides to along the axis, between t0 and t1)
    on(b, b2, t0 = 0, t1 = 1) { this.bone = typeof b === 'string' ? BI[b] : b; if (b2 !== undefined) { this.bone2 = typeof b2 === 'string' ? BI[b2] : b2; this.t0 = t0; this.t1 = t1; } return this; }
    as(tag) { this.tag = tag; return this; }
    tAt() { return 0; }
  }
  class RCone extends Solid { // round cone: spheres of radius ra at a and rb at b, and their tangent cone
    constructor(a, b, ra, rb, mat) {
      super(mat); if (Math.abs(ra - rb) >= Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.98) { const big = ra > rb; if (big) rb = ra - Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.97; else ra = rb - Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.97; }
      this.ax = a[0]; this.ay = a[1]; this.az = a[2]; this.ra = ra; this.rb = rb;
      this.bx = b[0] - a[0]; this.by = b[1] - a[1]; this.bz = b[2] - a[2];
      this.l2 = Math.max(1e-10, this.bx * this.bx + this.by * this.by + this.bz * this.bz); this.rr = ra - rb; this.a2 = this.l2 - this.rr * this.rr; this.il2 = 1 / this.l2;
      this.bb = [Math.min(a[0] - ra, b[0] - rb), Math.min(a[1] - ra, b[1] - rb), Math.min(a[2] - ra, b[2] - rb), Math.max(a[0] + ra, b[0] + rb), Math.max(a[1] + ra, b[1] + rb), Math.max(a[2] + ra, b[2] + rb)];
    }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      const px = x - this.ax, py = y - this.ay, pz = z - this.az, l2 = this.l2, rr = this.rr, a2 = this.a2, il2 = this.il2;
      const yy = px * this.bx + py * this.by + pz * this.bz, zz = yy - l2;
      const qx = px * l2 - this.bx * yy, qy = py * l2 - this.by * yy, qz = pz * l2 - this.bz * yy;
      const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = (rr > 0 ? 1 : rr < 0 ? -1 : 0) * rr * rr * x2;
      if ((zz > 0 ? 1 : zz < 0 ? -1 : 0) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - this.rb;
      if ((yy > 0 ? 1 : yy < 0 ? -1 : 0) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - this.ra;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - this.ra;
    }
    tAt(x, y, z) { const t = ((x - this.ax) * this.bx + (y - this.ay) * this.by + (z - this.az) * this.bz) * this.il2; return t < 0 ? 0 : t > 1 ? 1 : t; }
  }
  class Ell extends Solid { // ellipsoid (approximate distance, exact surface)
    constructor(c, r, R, mat) { super(mat); this.cx = c[0]; this.cy = c[1]; this.cz = c[2]; this.rx = r[0]; this.ry = r[1]; this.rz = r[2]; this.R = R || null; this.bb = rotBB(c, r, R); this.ay = 1; }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, b = R[3] * px + R[4] * py + R[5] * pz, c = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = c; }
      const ax = px / this.rx, ay = py / this.ry, az = pz / this.rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
      const bx = ax / this.rx, by = ay / this.ry, bz = az / this.rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz);
      return k1 > 1e-12 ? k0 * (k0 - 1) / k1 : -Math.min(this.rx, this.ry, this.rz);
    }
    tAt(x, y, z) { // along the local y axis, 0 at the bottom, 1 at the top
      let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R;
      const ly = R ? R[3] * px + R[4] * py + R[5] * pz : py; const t = (ly / this.ry + 1) * 0.5; return t < 0 ? 0 : t > 1 ? 1 : t;
    }
  }
  class RBox extends Solid { // rounded box: half extents h (including the rounding r)
    constructor(c, h, r, R, mat) { super(mat); this.cx = c[0]; this.cy = c[1]; this.cz = c[2]; this.hx = h[0] - r; this.hy = h[1] - r; this.hz = h[2] - r; this.r = r; this.R = R || null; this.bb = rotBB(c, h, R); }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, b = R[3] * px + R[4] * py + R[5] * pz, c = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = c; }
      const qx = Math.abs(px) - this.hx, qy = Math.abs(py) - this.hy, qz = Math.abs(pz) - this.hz;
      const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - this.r;
    }
  }
  class Cone extends Solid { // capped cone along local y: radius r1 at y = -h, r2 at y = +h; cross-section squashed by ez along z; edges rounded by rd
    constructor(c, h, r1, r2, ez, R, mat, rd = 0) {
      super(mat); this.cx = c[0]; this.cy = c[1]; this.cz = c[2]; this.h = h - rd; this.r1 = r1 - rd; this.r2 = r2 - rd; this.ez = ez || 1; this.R = R || null; this.rd = rd;
      const m = Math.max(r1, r2); this.bb = rotBB(c, [m, h, m * (ez || 1)], R);
    }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, b = R[3] * px + R[4] * py + R[5] * pz, c = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = c; }
      const ez = this.ez, h = this.h, r1 = this.r1, r2 = this.r2;
      const qx = Math.sqrt(px * px + (pz / ez) * (pz / ez)), qy = py;
      const k2x = r2 - r1, k2y = 2 * h;
      const cax = qx - Math.min(qx, qy < 0 ? r1 : r2), cay = Math.abs(qy) - h;
      let t = ((r2 - qx) * k2x + (h - qy) * k2y) / (k2x * k2x + k2y * k2y); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cbx = qx - r2 + k2x * t, cby = qy - h + k2y * t;
      const s = cbx < 0 && cay < 0 ? -1 : 1;
      return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby)) * (ez < 1 ? ez : 1) - this.rd;
    }
    tAt(x, y, z) { let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R; const ly = R ? R[3] * px + R[4] * py + R[5] * pz : py; const t = (ly / (this.h + this.rd) + 1) * 0.5; return t < 0 ? 0 : t > 1 ? 1 : t; }
  }
  class Torus extends Solid { // ring around local y: major radius a (squashed by ez along z), tube radius r
    constructor(c, a, r, R, mat, ez = 1) { super(mat); this.cx = c[0]; this.cy = c[1]; this.cz = c[2]; this.a = a; this.r = r; this.ez = ez; this.R = R || null; this.bb = rotBB(c, [a + r, r, (a + r) * ez], R); }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      let px = x - this.cx, py = y - this.cy, pz = z - this.cz; const R = this.R;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, b = R[3] * px + R[4] * py + R[5] * pz, c = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = c; }
      const q = Math.sqrt(px * px + (pz / this.ez) * (pz / this.ez)) - this.a; return Math.sqrt(q * q + py * py) - this.r;
    }
  }
  // lofted solid: horizontal (local y) slices, each an ellipse with its own half width ax, front depth zf (+z),
  // back depth zb (-z) and centre (xc, zc); the profile between slices is a monotone cubic, the ends are flat
  // (they are meant to sink into other solids). M: frame (local -> model), rings: [y, ax, zf, zb, xc, zc]
  class Loft extends Solid {
    // caps: rounding of the bottom and top ends (0 flat .. 1 half-ellipsoid as deep as the end slice is thin)
    // pw: [front, back] exponents of the slices (2 = ellipse, higher = squarer: broad faces, flat chests)
    constructor(rings, M, mat, caps = [0.9, 0.9], pw = null) {
      super(mat);
      // rings may carry their own exponents [.., front, back] (interpolated like the rest)
      this.np = rings.some(r => r.length > 6) ? 8 : 6; this.pf = pw ? pw[0] : 2; this.pb = pw ? pw[1] : 2;
      const R = rings.map(r => this.np === 8 ? [r[0], r[1], r[2], r[3], r[4] || 0, r[5] || 0, r[6] || this.pf, r[7] || this.pb] : [r[0], r[1], r[2], r[3], r[4] || 0, r[5] || 0]).sort((a, b) => a[0] - b[0]);
      const e0 = R[0], e1 = R[R.length - 1];
      this.c0 = caps[0] * Math.min(e0[1], (e0[2] + e0[3]) / 2); this.c1 = caps[1] * Math.min(e1[1], (e1[2] + e1[3]) / 2);
      this.r = R; this.n = R.length; this.I = M ? M4.invert(M4.create(), M) : null; this.M = M || null;
      // monotone tangents for each parameter (Fritsch-Butland: no overshoot between slices)
      const n = R.length, NP = this.np, T = R.map(() => new Array(NP).fill(0));
      for (let p = 1; p < NP; p++) {
        const d = []; for (let i = 0; i < n - 1; i++) d.push((R[i + 1][p] - R[i][p]) / (R[i + 1][0] - R[i][0]));
        for (let i = 0; i < n; i++) {
          if (i === 0) T[i][p] = n > 1 ? d[0] : 0; else if (i === n - 1) T[i][p] = d[n - 2];
          else { const d0 = d[i - 1], d1 = d[i], h0 = R[i][0] - R[i - 1][0], h1 = R[i + 1][0] - R[i][0]; T[i][p] = d0 * d1 <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1); }
        }
      }
      this.T = T; this.q = new Float64Array(8); this.q[6] = this.pf; this.q[7] = this.pb;
      let mx = 0, mz = 0; for (const r of R) { mx = Math.max(mx, r[1] + Math.abs(r[4])); mz = Math.max(mz, Math.max(r[2], r[3]) + Math.abs(r[5])); }
      const y0 = R[0][0] - this.c0, y1 = R[n - 1][0] + this.c1;
      if (!M) this.bb = [-mx, y0, -mz, mx, y1, mz];
      else { const o = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (let i = 0; i < 8; i++) { const x = i & 1 ? mx : -mx, y = i & 2 ? y1 : y0, z = i & 4 ? mz : -mz; const w = [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]]; for (let k = 0; k < 3; k++) { o[k] = Math.min(o[k], w[k]); o[k + 3] = Math.max(o[k + 3], w[k]); } } this.bb = o; }
    }
    // slice parameters at local height y (clamped to the ends)
    slice(y) {
      const R = this.r, n = this.n, q = this.q, NP = this.np;
      if (y <= R[0][0]) { for (let p = 1; p < NP; p++) q[p] = R[0][p]; return q; }
      if (y >= R[n - 1][0]) { for (let p = 1; p < NP; p++) q[p] = R[n - 1][p]; return q; }
      let i = 0; while (i < n - 2 && R[i + 1][0] <= y) i++;
      const a = R[i], b = R[i + 1], h = b[0] - a[0], t = (y - a[0]) / h, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2, ta = this.T[i], tb = this.T[i + 1];
      for (let p = 1; p < NP; p++) q[p] = h00 * a[p] + h10 * h * ta[p] + h01 * b[p] + h11 * h * tb[p];
      return q;
    }
    local(x, y, z, o) { const I = this.I; if (!I) { o[0] = x; o[1] = y; o[2] = z; return o; } o[0] = I[0] * x + I[4] * y + I[8] * z + I[12]; o[1] = I[1] * x + I[5] * y + I[9] * z + I[13]; o[2] = I[2] * x + I[6] * y + I[10] * z + I[14]; return o; }
    ev(x, y, z) {
      _m = this.mat; _l = this;
      const I = this.I; let lx = x, ly = y, lz = z;
      if (I) { lx = I[0] * x + I[4] * y + I[8] * z + I[12]; ly = I[1] * x + I[5] * y + I[9] * z + I[13]; lz = I[2] * x + I[6] * y + I[10] * z + I[14]; }
      const q = this.slice(ly), px = lx - q[4], pz = lz - q[5];
      const y0 = this.r[0][0], y1 = this.r[this.n - 1][0];
      let sc = 1, c = 0, dy = 0;
      if (ly < y0) { dy = y0 - ly; c = this.c0; } else if (ly > y1) { dy = ly - y1; c = this.c1; }
      if (dy > 0) { // rounded end: the slice shrinks like a half ellipsoid, then the tip
        if (dy >= c) { const r = Math.sqrt(px * px + pz * pz); return Math.sqrt(r * r + (dy - c) * (dy - c)); }
        sc = Math.sqrt(1 - (dy / c) * (dy / c)); if (sc < 0.05) sc = 0.05;
      }
      const ax = q[1] * sc, bz = (pz >= 0 ? q[2] : q[3]) * sc, p = pz >= 0 ? q[6] : q[7];
      if (p === 2) {
        const u = px / ax, v = pz / bz, k0 = Math.sqrt(u * u + v * v), u2 = u / ax, v2 = v / bz, k1 = Math.sqrt(u2 * u2 + v2 * v2);
        return k1 > 1e-12 ? k0 * (k0 - 1) / k1 : -Math.min(ax, bz);
      }
      // superellipse |u|^p + |v|^p = 1: first-order distance (k - 1) / |grad k|
      const u = Math.abs(px) / ax, v = Math.abs(pz) / bz, up = Math.pow(u, p), vp = Math.pow(v, p), k = Math.pow(up + vp, 1 / p);
      if (k < 1e-9) return -Math.min(ax, bz);
      const kp = Math.pow(k, 1 - p), gx = kp * (u > 0 ? up / u : 0) / ax, gz = kp * (v > 0 ? vp / v : 0) / bz, g = Math.sqrt(gx * gx + gz * gz);
      return g > 1e-12 ? (k - 1) / g : -Math.min(ax, bz);
    }
    tAt(x, y, z) { const I = this.I; const ly = I ? I[1] * x + I[5] * y + I[9] * z + I[13] : y; const y0 = this.r[0][0], y1 = this.r[this.n - 1][0]; return clamp((ly - y0) / (y1 - y0), 0, 1); }
  }
  class Fn extends Solid { // any field f(x, y, z) (negative inside); bb: where it can be non-positive (null: everywhere)
    constructor(f, bb, mat) { super(mat); this.f = f; this.bb = bb || null; }
    ev(x, y, z) { _m = this.mat; _l = this; return this.f(x, y, z); }
  }
  class Disp { // a branch pushed outward by g(x, y, z) metres (bumps, curls, knit)
    constructor(a, g, amp) { this.a = a; this.g = g; this.bb = grow(a.bb, amp || 0.01); }
    ev(x, y, z) { return this.a.ev(x, y, z) - this.g(x, y, z); }
  }
  class Plane extends Solid { // solid on the side n·p < d
    constructor(n, d, mat) { super(mat); const v = norm3(n); this.nx = v[0]; this.ny = v[1]; this.nz = v[2]; this.d = d; this.bb = null; }
    ev(x, y, z) { _m = this.mat; _l = this; return this.nx * x + this.ny * y + this.nz * z - this.d; }
  }
  // plane through point p with outward normal n
  const plane = (p, n, mat) => { const v = norm3(n); return new Plane(v, v[0] * p[0] + v[1] * p[1] + v[2] * p[2], mat); };

  /* ---------- operations ---------- */
  class Union {
    constructor(list, k) { this.c = list.filter(Boolean); this.k = k || 0; this.bb = grow(merge(this.c), this.k * 0.3); this.mat = 0; }
    ev(x, y, z) {
      let d = 1e9, bd = 1e9, bm = 0, bl = null, bs = 1, be = 0; const k = this.k, C = this.c;
      for (let i = 0; i < C.length; i++) {
        const c = C[i], b = c.bb; let e;
        if (b !== null) {
          e = bbd(b, x, y, z);
          if (e >= d + k) continue;                     // cannot change the result (exact)
          if (e > PAD) { if (e < d) d = e; continue; }   // far away: the box distance is enough
        }
        if (_fin) { _s = 1; _e = 0; }
        e = c.ev(x, y, z);
        if (e < bd) { bd = e; bm = _m; bl = _l; bs = _s; be = _e; }
        d = k > 0 ? smin(d, e, k) : (e < d ? e : d);
      }
      _m = bm; _l = bl; if (_fin) { _s = bs; _e = be; } return d;
    }
  }
  class Sub { // a minus b; the cut surface can take its own material
    constructor(a, b, k, cutMat) { this.a = a; this.b = b; this.k = k || 0; this.cm = cutMat === undefined ? -1 : cutMat; this.bb = a.bb; }
    ev(x, y, z) {
      const da = this.a.ev(x, y, z), ma = _m, la = _l, sa = _s, ea = _e, b = this.b.bb;
      if (b !== null && bbd(b, x, y, z) >= this.k - da) { _m = ma; _l = la; return da; } // the cut cannot reach this point
      const db = this.b.ev(x, y, z);
      const d = this.k > 0 ? smax(da, -db, this.k) : Math.max(da, -db);
      _m = (-db > da && this.cm >= 0) ? this.cm : ma; _l = la; _s = sa; _e = ea; return d;
    }
  }
  class Int { // a clipped by b (material of a)
    constructor(a, b, k) { this.a = a; this.b = b; this.k = k || 0; this.bb = a.bb; }
    ev(x, y, z) { const da = this.a.ev(x, y, z), ma = _m, la = _l, sa = _s, ea = _e; const db = this.b.ev(x, y, z); _m = ma; _l = la; _s = sa; _e = ea; return this.k > 0 ? smax(da, db, this.k) : Math.max(da, db); }
  }
  class Off { // grown by t (negative: shrunk)
    constructor(a, t) { this.a = a; this.t = t; this.bb = grow(a.bb, Math.max(0, t)); }
    ev(x, y, z) { return this.a.ev(x, y, z) - this.t; }
  }
  class Mat { // paint a whole branch with one material (the solids underneath are kept for the weights)
    constructor(a, m) { this.a = a; this.m = m; this.bb = a.bb; }
    ev(x, y, z) { const d = this.a.ev(x, y, z); _m = this.m; return d; }
  }
  // paint a branch point by point in the final evaluation of each vertex: f(x, y, z, T) may change T.m (slot), T.s (shade), T.e (mask)
  class Tint {
    constructor(a, f) { this.a = a; this.f = f; this.bb = a.bb; }
    ev(x, y, z) { const d = this.a.ev(x, y, z); if (_fin) { T.m = _m; T.s = _s; T.e = _e; this.f(x, y, z, T); _m = T.m; _s = T.s; _e = T.e; } return d; }
  }
  class Xf { // a branch modelled in its own frame (M: local -> model, rigid)
    constructor(a, M) {
      this.a = a; this.M = M; const I = M4.invert(M4.create(), M); this.I = I;
      const b = a.bb; if (!b) { this.bb = null; return; }
      const o = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      for (let i = 0; i < 8; i++) { const x = i & 1 ? b[3] : b[0], y = i & 2 ? b[4] : b[1], z = i & 4 ? b[5] : b[2]; const w = [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]]; for (let k = 0; k < 3; k++) { o[k] = Math.min(o[k], w[k]); o[k + 3] = Math.max(o[k + 3], w[k]); } }
      this.bb = o;
    }
    ev(x, y, z) { const I = this.I; return this.a.ev(I[0] * x + I[4] * y + I[8] * z + I[12], I[1] * x + I[5] * y + I[9] * z + I[13], I[2] * x + I[6] * y + I[10] * z + I[14]); }
  }

  /* clothes over a base: each layer is the base grown by t (optionally joined with a volume), inside its region;
     the thickness fades to nothing over the last `fade` metres of the region, so hems, cuffs and necklines are
     smooth ramps (a step thinner than a cell cannot be meshed cleanly) darkened a little to read as an edge.
     L = { t, slot, region, fade, vol, k, paint(x, y, z, T, r) }. Extra solids (collars, pockets, shoes) are joined on
     top. The base is evaluated once per point. */
  class Layers {
    constructor(base, layers, extra) {
      this.base = base; this.L = layers; this.x = extra || null; let t = 0; for (const L of layers) t = Math.max(t, L.t + (L.vol ? 0.05 : 0));
      this.bb = grow(extra ? merge([base, extra].filter(v => v.bb !== undefined)) || base.bb : base.bb, t + 0.01);
    }
    ev(x, y, z) {
      const d0 = this.base.ev(x, y, z); let d = d0, m = _m, l = _l, s = _s, ee = _e, wi = -1, wr = 0; const leaf0 = _l;
      for (let i = 0; i < this.L.length; i++) {
        const L = this.L[i], f = L.fade === undefined ? 0.012 : L.fade;
        let r = -1;
        if (L.region) { r = L.region.ev(x, y, z); if (r >= 0 && !L.vol) continue; }
        let k = r >= 0 ? 0 : r <= -f ? 1 : -r / f; k = k * k * (3 - 2 * k);
        let e = d0 - L.t * k, lf = leaf0;
        if (L.vol) {
          let v = L.vol.ev(x, y, z); const vl = _l;
          if (L.region) v = smax(v, r, 0.004);
          if (L.k) e = smin(e, v, L.k); else if (v < e) { e = v; lf = vl; }
        }
        if (e < d - 1e-7) { d = e; m = L.slot; l = lf; wi = i; wr = r; }
      }
      if (_fin && wi >= 0) { // edge shading on the ramp, then the layer's own paint
        const L = this.L[wi], f = L.fade === undefined ? 0.012 : L.fade, u = (wr + f) / f;
        s = u > 0 && u < 1 ? 1 - (L.edge === undefined ? 0.22 : L.edge) * Math.sin(u * Math.PI) : 1; ee = 0;
        if (L.paint) { T.m = m; T.s = s; T.e = ee; L.paint(x, y, z, T, wr); m = T.m; s = T.s; ee = T.e; }
      }
      if (this.x) { const b = this.x.bb; if (b === null || bbd(b, x, y, z) < d + 0.001) { if (_fin) { _s = 1; _e = 0; } const f = this.x.ev(x, y, z); if (f < d) { d = f; m = _m; l = _l; s = _s; ee = _e; } } }
      _m = m; _l = l; _s = s; _e = ee; return d;
    }
  }
  /* ---------- time slicing ---------- */
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let deadline = Infinity;
  const late = () => deadline !== Infinity && now() > deadline;
  const jobs = [];
  // run queued generation jobs for up to ms milliseconds
  function run(ms) {
    if (!jobs.length) return false;
    deadline = now() + ms;
    try {
      while (jobs.length && now() < deadline) {
        const J = jobs[0], r = J.it.next();
        if (r.done) { jobs.shift(); J.cb && J.cb(r.value); }
      }
    } finally { deadline = Infinity; }
    return jobs.length > 0;
  }
  // run a generator to its end at once
  const finish = it => { let r; do r = it.next(); while (!r.done); return r.value; };

  /* ---------- surface nets ----------
     f: solid tree; box: [x0,y0,z0,x1,y1,z1]; h: cell size. opt.keep(x,y,z): cells kept (an open border where they stop).
     Returns { n, pos, nrm, idx, mat, leaf } in the frame of f. */
  function* mesh(f, box, h, opt = {}) {
    const x0 = box[0] - 2 * h, y0 = box[1] - 2 * h, z0 = box[2] - 2 * h;
    const nx = Math.ceil((box[3] - box[0]) / h) + 5, ny = Math.ceil((box[4] - box[1]) / h) + 5, nz = Math.ceil((box[5] - box[2]) / h) + 5;
    const C = 4, cnx = Math.ceil((nx - 1) / C) + 1, cny = Math.ceil((ny - 1) / C) + 1, cnz = Math.ceil((nz - 1) / C) + 1, H = C * h;
    const cv = new Float32Array(cnx * cny * cnz);
    for (let k = 0; k < cnz; k++) { for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) cv[i + cnx * (j + cny * k)] = f.ev(x0 + i * H, y0 + j * H, z0 + k * H); if (late()) yield 0; }
    // fine grid: a point is evaluated only if the coarse corners cannot prove it is more than 1.25 cells away from the
    // surface (|f(p)| >= |f(c)| - |p - c|); otherwise it keeps that bound, signed like the corner that gives it
    const N = nx * ny * nz, F = new Float32Array(N), E = new Uint8Array(N), band = H * 1.9, lim = h * 1.25;
    const cvals = new Float64Array(8);
    for (let ck = 0; ck < cnz - 1; ck++) {
      for (let cj = 0; cj < cny - 1; cj++) for (let ci = 0; ci < cnx - 1; ci++) {
        let mn = 1e9;
        for (let c = 0; c < 8; c++) { const v = cv[(ci + (c & 1)) + cnx * ((cj + (c >> 1 & 1)) + cny * (ck + (c >> 2 & 1)))]; cvals[c] = v; const a = v < 0 ? -v : v; if (a < mn) mn = a; }
        if (mn > band) continue;
        const i1 = Math.min(nx - 1, ci * C + C), j1 = Math.min(ny - 1, cj * C + C), k1 = Math.min(nz - 1, ck * C + C);
        for (let k = ck * C; k <= k1; k++) for (let j = cj * C; j <= j1; j++) for (let i = ci * C; i <= i1; i++) {
          const q = i + nx * (j + ny * k); if (E[q]) continue; E[q] = 1;
          const fx = (i - ci * C) * h, fy = (j - cj * C) * h, fz = (k - ck * C) * h;
          let lb = -1, sv = 1;
          for (let c = 0; c < 8; c++) {
            const dx = fx - (c & 1) * H, dy = fy - (c >> 1 & 1) * H, dz = fz - (c >> 2 & 1) * H, v = cvals[c];
            const b = (v < 0 ? -v : v) - Math.sqrt(dx * dx + dy * dy + dz * dz); if (b > lb) { lb = b; sv = v < 0 ? -1 : 1; }
          }
          F[q] = lb > lim ? sv * lb : f.ev(x0 + i * h, y0 + j * h, z0 + k * h);
        }
      }
      if (late()) yield 0;
    }
    // points left out of the band: sign from the coarse grid (trilinear)
    for (let k = 0; k < nz; k++) {
      const ck = Math.min(cnz - 2, (k / C) | 0), fk = k / C - ck;
      for (let j = 0; j < ny; j++) {
        const cj = Math.min(cny - 2, (j / C) | 0), fj = j / C - cj;
        for (let i = 0; i < nx; i++) {
          const q = i + nx * (j + ny * k); if (E[q]) continue;
          const ci = Math.min(cnx - 2, (i / C) | 0), fi = i / C - ci, b = ci + cnx * (cj + cny * ck), s = cnx, t = cnx * cny;
          const v00 = cv[b] + (cv[b + 1] - cv[b]) * fi, v10 = cv[b + s] + (cv[b + s + 1] - cv[b + s]) * fi, v01 = cv[b + t] + (cv[b + t + 1] - cv[b + t]) * fi, v11 = cv[b + s + t] + (cv[b + s + t + 1] - cv[b + s + t]) * fi;
          const a = v00 + (v10 - v00) * fj, c = v01 + (v11 - v01) * fj; F[q] = a + (c - a) * fk;
        }
      }
    }
    if (late()) yield 0;
    // one vertex per cell crossed by the surface
    const cx = nx - 1, cy = ny - 1, cz = nz - 1, cell = new Int32Array(cx * cy * cz).fill(-1);
    const P = [], keep = opt.keep;
    const EDG = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
    const val = new Float64Array(8);
    for (let k = 0; k < cz; k++) {
      for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) { const v = F[(i + (c & 1)) + nx * ((j + (c >> 1 & 1)) + ny * (k + (c >> 2 & 1)))]; val[c] = v; if (v < 0) mask |= 1 << c; }
        if (mask === 0 || mask === 255) continue;
        if (keep && !keep(x0 + (i + 0.5) * h, y0 + (j + 0.5) * h, z0 + (k + 0.5) * h)) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 24; e += 2) {
          const a = EDG[e], b = EDG[e + 1], va = val[a], vb = val[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; n++;
        }
        cell[i + cx * (j + cy * k)] = P.length / 3;
        P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
      }
      if (late()) yield 0;
    }
    // quads around every grid edge crossed by the surface
    const I = [];
    const cid = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz) ? -1 : cell[i + cx * (j + cy * k)];
    const quad = (a, b, c, d, flip) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) { const t = b; b = d; d = t; }
      const dac = (P[a * 3] - P[c * 3]) ** 2 + (P[a * 3 + 1] - P[c * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[c * 3 + 2]) ** 2;
      const dbd = (P[b * 3] - P[d * 3]) ** 2 + (P[b * 3 + 1] - P[d * 3 + 1]) ** 2 + (P[b * 3 + 2] - P[d * 3 + 2]) ** 2;
      if (dac <= dbd) I.push(a, b, c, a, c, d); else I.push(a, b, d, b, c, d);
    };
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const q = i + nx * (j + ny * k), in0 = F[q] < 0;
        if (i < nx - 1 && in0 !== (F[q + 1] < 0)) quad(cid(i, j - 1, k - 1), cid(i, j, k - 1), cid(i, j, k), cid(i, j - 1, k), !in0);
        if (j < ny - 1 && in0 !== (F[q + nx] < 0)) quad(cid(i - 1, j, k - 1), cid(i - 1, j, k), cid(i, j, k), cid(i, j, k - 1), !in0);
        if (k < nz - 1 && in0 !== (F[q + nx * ny] < 0)) quad(cid(i - 1, j - 1, k), cid(i, j - 1, k), cid(i, j, k), cid(i - 1, j, k), !in0);
      }
      if (late()) yield 0;
    }
    // vertices onto the true surface (Newton), normals from the gradient, material of the closest solid
    const nv = P.length / 3, pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), mat = new Uint8Array(nv), leaf = new Array(nv), shade = new Float32Array(nv), mask = new Float32Array(nv), e = h * 0.15;
    for (let v = 0; v < nv; v++) {
      let px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2]; const ox = px, oy = py, oz = pz;
      let gx = 0, gy = 1, gz = 0, d = f.ev(px, py, pz);
      for (let it = 0; it < 4; it++) {
        gx = f.ev(px + e, py, pz) - d; gy = f.ev(px, py + e, pz) - d; gz = f.ev(px, py, pz + e) - d; // forward differences
        if (d < h * 0.01 && d > -h * 0.01) break;
        const g2 = gx * gx + gy * gy + gz * gz; if (g2 < 1e-16) break;
        const s = d * e / g2; px -= gx * s; py -= gy * s; pz -= gz * s;
        const dx = px - ox, dy = py - oy, dz = pz - oz, dl = Math.sqrt(dx * dx + dy * dy + dz * dz); if (dl > h) { px = ox + dx * h / dl; py = oy + dy * h / dl; pz = oz + dz * h / dl; }
        d = f.ev(px, py, pz);
      }
      _fin = true; _s = 1; _e = 0; f.ev(px, py, pz); _fin = false; // material, solid and paint at the final point
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz; nrm[v * 3] = gx / gl; nrm[v * 3 + 1] = gy / gl; nrm[v * 3 + 2] = gz / gl; mat[v] = _m; leaf[v] = _l; shade[v] = _s; mask[v] = _e;
      if ((v & 127) === 0 && late()) yield 0;
    }
    return { n: nv, pos, nrm, idx: nv > 65535 ? new Uint32Array(I) : new Uint16Array(I), mat, leaf, shade, mask };
  }

  /* ---------- skin weights ----------
     For every vertex, each body solid pulls with exp(-(d - dmin) / sigma) (d: distance to that solid), summed per bone,
     four strongest bones kept. opt.post(v, leaf, w) can reshape the per-bone weights (w: Float32Array(NB)) before that. */
  function* weigh(M, solids, sigma, opt = {}) {
    const n = M.n, J = new Uint8Array(n * 4), W = new Uint8Array(n * 4), w = new Float32Array(NB), d = new Float64Array(solids.length);
    for (let v = 0; v < n; v++) {
      const x = M.pos[v * 3], y = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2];
      let dmin = 1e9;
      for (let i = 0; i < solids.length; i++) { const s = solids[i]; const b = bbd(s.bb, x, y, z); if (b > 0.25) { d[i] = 1e9; continue; } const e = s.ev(x, y, z); d[i] = e; if (e < dmin) dmin = e; }
      w.fill(0);
      if (dmin > 1e8) { w[opt.fallback || 0] = 1; }
      else for (let i = 0; i < solids.length; i++) {
        if (d[i] > 1e8) continue; const s = solids[i], u = Math.exp(-(d[i] - dmin) / (s.sig || sigma)); if (u < 1e-4) continue;
        if (s.wfn) s.wfn(x, y, z, w, u);
        else if (s.bone2 >= 0) { const t = s.tAt(x, y, z), k = smoothstep(s.t0, s.t1, t); w[s.bone] += u * (1 - k); w[s.bone2] += u * k; } else w[s.bone] += u;
      }
      if (opt.post) opt.post(v, M.leaf ? M.leaf[v] : null, w, x, y, z);
      // four strongest
      const top = [-1, -1, -1, -1];
      for (let b = 0; b < NB; b++) { if (w[b] <= 0) continue; for (let s = 0; s < 4; s++) { if (top[s] < 0 || w[b] > w[top[s]]) { for (let t = 3; t > s; t--) top[t] = top[t - 1]; top[s] = b; break; } } }
      let sum = 0; for (let s = 0; s < 4; s++) if (top[s] >= 0) { if (w[top[s]] < 0.012 * w[top[0]]) top[s] = -1; else sum += w[top[s]]; }
      let acc = 0;
      for (let s = 0; s < 4; s++) {
        const b = top[s]; J[v * 4 + s] = b < 0 ? 0 : b;
        const q = b < 0 ? 0 : Math.round(w[b] / sum * 255); W[v * 4 + s] = q; acc += q;
      }
      W[v * 4] += 255 - acc; // exact sum
      if ((v & 255) === 0 && late()) yield 0;
    }
    M.j = J; M.w = W; return M;
  }
  // every vertex on one bone
  function rigid(M, bone) { const n = M.n; M.j = new Uint8Array(n * 4); M.w = new Uint8Array(n * 4); for (let v = 0; v < n; v++) { M.j[v * 4] = bone; M.w[v * 4] = 255; } return M; }

  /* ---------- mesh helpers ---------- */
  // apply a 4x4 (rigid or uniformly scaled) matrix to positions and normals
  function transform(M, m) {
    const p = M.pos, q = M.nrm;
    for (let v = 0; v < M.n; v++) {
      const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2], a = q[v * 3], b = q[v * 3 + 1], c = q[v * 3 + 2];
      p[v * 3] = m[0] * x + m[4] * y + m[8] * z + m[12]; p[v * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]; p[v * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      let nx = m[0] * a + m[4] * b + m[8] * c, ny = m[1] * a + m[5] * b + m[9] * c, nz = m[2] * a + m[6] * b + m[10] * c; const l = Math.hypot(nx, ny, nz) || 1;
      q[v * 3] = nx / l; q[v * 3 + 1] = ny / l; q[v * 3 + 2] = nz / l;
    }
    return M;
  }
  // mirror across x = 0 (left <-> right), winding flipped, bones swapped
  const SWAP = (() => { const s = new Uint8Array(64); for (let i = 0; i < 64; i++) s[i] = i; if (typeof BONES !== 'undefined') for (const b of BONES) { const n = b[0]; const o = /L$/.test(n) ? n.replace(/L$/, 'R') : /R$/.test(n) ? n.replace(/R$/, 'L') : null; if (o && BI[o] !== undefined) s[BI[n]] = BI[o]; } return s; })();
  function mirror(M) {
    const o = { n: M.n, pos: M.pos.slice(), nrm: M.nrm.slice(), idx: M.idx.slice(), mat: M.mat && M.mat.slice(), m4: M.m4 && M.m4.slice(), leaf: M.leaf };
    for (let v = 0; v < M.n; v++) { o.pos[v * 3] = -o.pos[v * 3]; o.nrm[v * 3] = -o.nrm[v * 3]; }
    for (let t = 0; t < o.idx.length; t += 3) { const a = o.idx[t + 1]; o.idx[t + 1] = o.idx[t + 2]; o.idx[t + 2] = a; }
    if (M.j) { o.j = M.j.slice(); o.w = M.w.slice(); for (let i = 0; i < o.j.length; i++) o.j[i] = SWAP[o.j[i]]; }
    return o;
  }
  // concatenate meshes (same attributes)
  function concat(list) {
    list = list.filter(m => m && m.n); let n = 0, ni = 0; for (const m of list) { n += m.n; ni += m.idx.length; }
    const o = { n, pos: new Float32Array(n * 3), nrm: new Float32Array(n * 3), idx: n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), m4: new Uint8Array(n * 4), j: new Uint8Array(n * 4), w: new Uint8Array(n * 4) };
    let v0 = 0, i0 = 0;
    for (const m of list) {
      o.pos.set(m.pos, v0 * 3); o.nrm.set(m.nrm, v0 * 3); if (m.m4) o.m4.set(m.m4, v0 * 4); if (m.j) { o.j.set(m.j, v0 * 4); o.w.set(m.w, v0 * 4); }
      for (let i = 0; i < m.idx.length; i++) o.idx[i0 + i] = m.idx[i] + v0;
      v0 += m.n; i0 += m.idx.length;
    }
    return o;
  }

  return {
    RCone, Ell, RBox, Cone, Torus, Plane, Loft, Fn, plane, Union, Sub, Int, Off, Mat, Xf,
    D: (a, g, amp) => new Disp(a, g, amp), L: (base, layers, extra) => new Layers(base, layers, extra), P: (a, f) => new Tint(a, f), U: (list, k) => new Union(list, k), S: (a, b, k, cm) => new Sub(a, b, k, cm), I: (a, b, k) => new Int(a, b, k), O: (a, t) => new Off(a, t), M: (a, m) => new Mat(a, m), X: (a, M) => new Xf(a, M),
    along, euler, fromM4, norm3, cross3, smin, smax, mesh, weigh, rigid, transform, mirror, concat, run, finish, jobs, now,
    get deadline() { return deadline; }
  };
})();

