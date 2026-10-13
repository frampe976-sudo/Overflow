/* =====================================================================
   CAR MODELS — lofted bodies with real wheel arches (dark wells), side
   bulge and rounded ends, a glass house with pillars, trim (grille,
   bumpers, plates, mirrors, handles, door seams, exhaust), lamp housings
   lit separately (head / tail) and alloy wheels with tyres.
   One set per type. Car frame: +z forward, +y up, x across (symmetric).
   Paint parts carry white vertex colours (the instance colour paints
   them), trim / lamps / wheels carry their own colours.
   ===================================================================== */
const CarModels = (() => {
  const PAINT = [1, 1, 1, 0], WELL = [0.035, 0.035, 0.04, 0], SKIRT = [0.42, 0.42, 0.43, 0];
  const BLACK = [0.022, 0.023, 0.026, 0], PLAST = [0.05, 0.052, 0.058, 0], CHROME = [0.62, 0.63, 0.66, 0], PLATE = [0.8, 0.8, 0.77, 0], INK = [0.05, 0.06, 0.12, 0],
    RUBBER = [0.03, 0.03, 0.032, 0], ALLOY = [0.52, 0.53, 0.55, 0], STEELW = [0.08, 0.085, 0.09, 0], DISC = [0.16, 0.16, 0.17, 0], MIRROR = [0.1, 0.12, 0.15, 0],
    HEAD = [0.95, 0.93, 0.86, 0], TAIL = [0.8, 0.05, 0.06, 0], AMBER = [0.95, 0.5, 0.06, 0], REV = [0.9, 0.9, 0.88, 0];
  const T4 = (x, y, z, rx = 0, ry = 0, rz = 0) => M4.compose(M4.create(), x, y, z, rx, ry, rz);

  // smooth profile through [t, v] keys (monotone cubic), t ascending
  function prof(keys, t) {
    const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1], h = t1 - t0, s = (t - t0) / h;
    const sl = k => { if (k <= 0 || k >= n - 1) return 0; const a = (keys[k][1] - keys[k - 1][1]) / (keys[k][0] - keys[k - 1][0]), b = (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); };
    const m0 = sl(i) * h, m1 = sl(i + 1) * h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1;
  }
  // loft through closed rings [{ z, pts: [[x, y, col]] }] with smooth normals and flat end caps
  function loft(g, rings, capCol) {
    const m = rings.length, n = rings[0].pts.length, P = [], C = [];
    for (const R of rings) for (const p of R.pts) { P.push([p[0], p[1], R.z]); C.push(p[2]); }
    const N = P.map(() => [0, 0, 0]), tri = [];
    const add = (a, b, c) => {
      const ux = P[b][0] - P[a][0], uy = P[b][1] - P[a][1], uz = P[b][2] - P[a][2], vx = P[c][0] - P[a][0], vy = P[c][1] - P[a][1], vz = P[c][2] - P[a][2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) { N[v][0] += nx; N[v][1] += ny; N[v][2] += nz; } tri.push(a, b, c);
    };
    for (let i = 0; i < m - 1; i++) for (let k = 0; k < n; k++) { const k2 = (k + 1) % n, a = i * n + k, b = i * n + k2, c = (i + 1) * n + k2, d = (i + 1) * n + k; add(a, b, c); add(a, c, d); }
    const base = g.vc;
    for (let v = 0; v < P.length; v++) { const q = N[v], l = Math.hypot(q[0], q[1], q[2]) || 1, c = C[v]; g.vert(P[v][0], P[v][1], P[v][2], q[0] / l, q[1] / l, q[2] / l, 0, 0, CELL.plain[0], CELL.plain[1], c[0], c[1], c[2], c[3]); }
    for (const v of tri) g.i.push(base + v);
    for (const [R, sg] of [[rings[0], -1], [rings[m - 1], 1]]) { // flat caps (the rings are convex at the ends)
      let cx = 0, cy = 0; for (const p of R.pts) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
      const c0 = g.vert(cx, cy, R.z, 0, 0, sg, 0, 0, CELL.plain[0], CELL.plain[1], ...capCol);
      for (const p of R.pts) g.vert(p[0], p[1], R.z, 0, 0, sg, 0, 0, CELL.plain[0], CELL.plain[1], ...capCol);
      for (let k = 0; k < n; k++) { const a = c0 + 1 + k, b = c0 + 1 + (k + 1) % n; if (sg > 0) g.i.push(c0, a, b); else g.i.push(c0, b, a); }
    }
  }
  // thin strip following a list of 2D (x, y) points going up one side of the car, at z, pushed out by `off`: door seams
  function strip(g, pts, z, w, off, col) {
    const base = g.vc, right = pts[0][0] >= 0;
    for (let i = 0; i < pts.length; i++) {
      const o = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
      let tx = q[0] - o[0], ty = q[1] - o[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = right ? ty : -ty, ny = right ? -tx : tx;
      for (const dz of [-w, w]) g.vert(pts[i][0] + nx * off, pts[i][1] + ny * off, z + dz, nx, ny, 0, 0, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
    }
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; if (right) g.i.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else g.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  /* ---------- one car type ---------- */
  function build(type, far) {
    const T = CTYPES[type], S = CAR_SHAPES[type], hl = T.len / 2, hw = T.wid / 2, van = !!T.van, band = !!T.police, BAND = [0.16, 0.3, 1.05, 0];
    const wz = hl - (van ? 0.85 : 0.78), AR = 0.405, AY = 0.34;
    const top = z => prof(S.top.map(([zn, y]) => [zn * hl, y]), z);
    const ybAt = z => 0.29 + 0.06 * Math.pow(Math.abs(z / hl), 6);
    const archAt = z => { for (const c of [wz, -wz]) { const d = Math.abs(z - c); if (d < AR) return AY + Math.sqrt(AR * AR - d * d); } return 0; };
    const wAt = z => { const u = Math.abs(z) / hl, e = van ? 0.9 : 0.84; return hw * (u < e ? 1 : Math.sqrt(Math.max(0.05, 1 - Math.pow((u - e) / (1 - e), 2) * (van ? 0.18 : 0.3)))); };
    // right half of a section, bottom (inside the car) to the crown; the left half mirrors it
    const half = z => {
      const w = wAt(z), yt = top(z), yb = ybAt(z), a = archAt(z), ya = Math.max(yb + 0.035, a), ym = yb + (yt - yb) * 0.45, crown = van ? 0.005 : 0.02;
      const well = a > 0 ? WELL : SKIRT;
      // heights up the side stay in order even where the arch climbs high (the fender above the wheel gets thin)
      const y3 = ya + (a > 0 ? 0.035 : 0.07), y4 = Math.max(ym, y3 + 0.035), y5 = Math.max(yt - 0.13, y4 + 0.03), y6 = Math.max(yt - 0.04, y5 + 0.018), y7 = Math.max(yt - 0.004, y6 + 0.008);
      // a band between the widest point and the shoulder: the police livery (edges doubled so the colour changes sharply)
      const bx = t => lerp(1.012 * w, w, t), by = t => lerp(y4, y5, t), L = band && Math.abs(z) < hl * 0.93 ? BAND : PAINT;
      return [[0.52 * w, yb, WELL], [0.78 * w, a > 0 ? ya : yb + 0.02, well], [0.965 * w, ya, well], [w, y3, a > 0 ? PAINT : SKIRT], [1.012 * w, y4, PAINT],
        [bx(0.18), by(0.18), PAINT], [bx(0.19), by(0.19), L], [bx(0.66), by(0.66), L], [bx(0.67), by(0.67), PAINT], [w, y5, PAINT],
        [0.965 * w, y6, PAINT], [0.86 * w, y7, PAINT], [0.45 * w, y7 + crown * 0.8, PAINT], [0, y7 + crown, PAINT]];
    };
    const ring = z => { const h = half(z), L = []; for (let i = h.length - 2; i >= 0; i--) L.push([-h[i][0], h[i][1], h[i][2]]); return h.concat(L); };
    // sections: dense at the ends (rounded nose / tail) and across the arches
    const zs = new Set(), step = far ? 0.45 : 0.16, na = far ? 3 : 6; for (let z = -hl; z <= hl + 1e-6; z += step) zs.add(+z.toFixed(3));
    for (const f of far ? [0, 0.03, 0.1] : [0, 0.012, 0.03, 0.055, 0.09, 0.14]) { zs.add(+(hl - f).toFixed(3)); zs.add(+(-hl + f).toFixed(3)); }
    for (const c of [wz, -wz]) for (let k = -na; k <= na; k++) zs.add(+(c + AR * Math.sin(k / na * Math.PI / 2) * 0.999).toFixed(4));
    const Z = [...zs].filter(z => z >= -hl && z <= hl).sort((p, q) => p - q);
    const paint = new GeoBuilder(), trim = new Arms.Mech(), glass = new GeoBuilder(), head = new Arms.Mech(), tail = new Arms.Mech();
    trim.seg = 1; head.seg = 1; tail.seg = 1; // small parts: one bevel row is enough
    loft(paint, Z.map(z => ({ z, pts: ring(z) })), PAINT);
    const tg = trim.g;

    /* ----- glass house ----- */
    const [za, zb, zc, zd] = S.cab.map(v => v * hl), wb = hw * 0.93, wt = wb * S.tw, yb = S.belt - 0.02, yr = S.roof;
    const cs = van ? [{ z: zd, h: 1 }, { z: zc, h: 1 }, { z: zb, h: 1 }, { z: za, h: 0 }] : [{ z: zd, h: 0 }, { z: zc, h: 1 }, { z: zb, h: 1 }, { z: za, h: 0 }];
    { // open loft: left side, roof edge, right side (the roof panel is painted on top)
      const R = cs.map(s => { const y = yb + (yr - yb) * s.h, w = wb + (wt - wb) * s.h; return [[-wb, yb], [-w, y], [w, y], [wb, yb]].map(p => [p[0], p[1], s.z]); });
      const base = glass.vc, n = 4;
      for (let i = 0; i < R.length; i++) for (let k = 0; k < n; k++) glass.vert(R[i][k][0], R[i][k][1], R[i][k][2], 0, 1, 0, 0, 0, CELL.plain[0], CELL.plain[1], 1, 1, 1, 0);
      const Nn = []; for (let i = 0; i < R.length * n; i++) Nn.push([0, 0, 0]);
      const tris = [];
      for (let i = 0; i < R.length - 1; i++) for (let k = 0; k < n - 1; k++) {
        const a = i * n + k, b = i * n + k + 1, c = (i + 1) * n + k + 1, d = (i + 1) * n + k;
        for (const [p, q, r] of [[a, c, b], [a, d, c]]) {
          const P = i2 => [glass.p[(base + i2) * 3], glass.p[(base + i2) * 3 + 1], glass.p[(base + i2) * 3 + 2]], A = P(p), B = P(q), Cc = P(r);
          const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const cx = (A[0] + B[0] + Cc[0]) / 3, cy = (A[1] + B[1] + Cc[1]) / 3 - (yb - 0.4), cz = (A[2] + B[2] + Cc[2]) / 3 - (za + zd) / 2;
          if (nx * cx + ny * cy + nz * cz < 0) { tris.push(p, r, q); nx = -nx; ny = -ny; nz = -nz; } else tris.push(p, q, r);
          for (const v of [p, q, r]) { Nn[v][0] += nx; Nn[v][1] += ny; Nn[v][2] += nz; }
        }
      }
      for (let v = 0; v < Nn.length; v++) { const q = Nn[v], l = Math.hypot(q[0], q[1], q[2]) || 1; glass.n[(base + v) * 3] = q[0] / l; glass.n[(base + v) * 3 + 1] = q[1] / l; glass.n[(base + v) * 3 + 2] = q[2] / l; }
      for (const v of tris) glass.i.push(base + v);
    }
    // roof panel (slightly crowned), painted
    const rz0 = van ? -hl + 0.02 : zc - 0.03, rz1 = zb + 0.04;
    { const rr = []; for (let i = 0; i <= 6; i++) { const z = rz0 + (rz1 - rz0) * i / 6, k = Math.sin(Math.PI * i / 6); rr.push({ z, pts: [[wt + 0.02, yr - 0.02, PAINT], [wt * 0.8, yr + 0.03 + 0.015 * k, PAINT], [0, yr + 0.045 + 0.02 * k, PAINT], [-wt * 0.8, yr + 0.03 + 0.015 * k, PAINT], [-wt - 0.02, yr - 0.02, PAINT], [0, yr - 0.03, PAINT]] }); }
      loft(paint, rr, PAINT); }
    if (van) paint.box(-hw * 0.99, S.belt - 0.04, -hl + 0.02, hw * 0.99, yr + 0.02, zc + 0.02, { col: PAINT, faces: 'xXzZ' }); // cargo box
    // pillars: body-coloured strips lying on the glass (A along the windshield, B black, C wide)
    const hAt = z => van ? 1 : z <= zd ? 0 : z < zc ? (z - zd) / (zc - zd) : z <= zb ? 1 : z < za ? (za - z) / (za - zb) : 0;
    const pill = (g, z0, z1, col, dz = 0) => { for (const sx of [-1, 1]) {
      const nx = (yr - yb) * sx, ny = (wb - wt), nl = Math.hypot(nx, ny), ox = nx / nl * 0.012, oy = ny / nl * 0.012;
      const topP = z => { const h = hAt(z); return [sx * (wb + (wt - wb) * h) + ox, yb + (yr - yb) * h + oy]; };
      const A = [sx * wb + ox, yb + oy], T0 = topP(z0 + dz), T1 = topP(z1 + dz); const i0 = g.vc;
      for (const [p, zz] of [[A, z0], [A, z1], [T1, z1], [T0, z0]]) g.vert(p[0], p[1], zz, nx / nl, ny / nl, 0, 0, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
      if (sx > 0) g.i.push(i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2); else g.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    } };
    if (!van) {
      const zm = (zb + zc) / 2; pill(tg, zm - 0.05, zm + 0.05, BLACK);                          // B pillar
      pill(paint, zd, zd + (zc - zd) * (type === 'compact' ? 0.7 : 0.5), PAINT);                 // C pillar
      pill(paint, za - 0.07, za + 0.0, PAINT, 0);                                              // A pillar foot
    } else pill(paint, zc + 0.03, zc + 0.14, PAINT);
    // window trim: chrome line under the side glass, black frame over the windshield edge
    for (const sx of [-1, 1]) trim.rbox([sx * (wb + 0.004), yb + 0.012, (za + zd) / 2 + (van ? (za - zd) * 0.1 : 0)], [0.006, 0.008, (za - zd) / 2 * (van ? 0.8 : 1)], 0.004, CHROME, { shade: 0 });

    /* ----- front: grille, lamps, bumper, plate ----- */
    const zf = hl, ytf = top(hl - 0.03), wf = wAt(hl - 0.03), ybf = ybAt(hl);
    const gy = (ytf + ybf) / 2 + 0.02;
    trim.rbox([0, gy + 0.02, zf - 0.005], [wf * 0.36, (ytf - ybf) * 0.22, 0.02], 0.012, BLACK);                         // grille
    for (let i = 0; i < 4; i++) trim.rbox([0, gy - 0.02 + i * 0.022, zf + 0.012], [wf * 0.34, 0.003, 0.004], 0.002, type === 'taxi' || type === 'sedan' ? CHROME : PLAST, { shade: 0 }); // slats
    trim.rbox([0, ybf + 0.05, zf - 0.01], [wf * 0.5, 0.04, 0.025], 0.015, PLAST);                                  // lower intake / valance
    trim.rbox([0, ybf + 0.08, zf + 0.018], [0.26, 0.055, 0.006], 0.004, PLATE, { shade: 0 }); trim.rbox([0, ybf + 0.08, zf + 0.025], [0.2, 0.022, 0.002], 0.001, INK, { shade: 0 });
    for (const sx of [-1, 1]) {
      const lx = sx * wf * 0.72, ly = ytf - 0.075;
      head.push(T4(lx, ly, zf - 0.03, -0.25, sx * 0.3, 0)).rbox([0, 0, 0], [0.16, 0.045, 0.04], 0.02, HEAD).pop();
      trim.push(T4(sx * wf * 0.72, ly - 0.075, zf - 0.02, 0, sx * 0.3, 0)).rbox([0, 0, 0], [0.08, 0.016, 0.02], 0.01, AMBER).pop();      // turn signal
      trim.push(T4(sx * (wf - 0.06), ybf + 0.1, zf - 0.13, 0, sx * 1.1, 0)).rbox([0, 0, 0], [0.06, 0.02, 0.015], 0.008, BLACK).pop(); // fog lamp recess
    }
    /* ----- rear: tail lamps, reversing lamps, plate, valance, exhaust ----- */
    const zr = -hl, ytr = top(-hl + 0.03), wr = wAt(-hl + 0.03), ybr = ybAt(-hl);
    for (const sx of [-1, 1]) {
      const lx = sx * wr * 0.74, ly = ytr - 0.07;
      tail.push(T4(lx, ly, zr + 0.03, 0.2, -sx * 0.32, 0)).rbox([0, 0, 0], [0.17, 0.05, 0.04], 0.018, TAIL).pop();
      trim.push(T4(sx * wr * 0.46, ly - 0.005, zr + 0.012, 0.2, 0, 0)).rbox([0, 0, 0], [0.05, 0.03, 0.015], 0.01, REV).pop();
    }
    trim.rbox([0, (ytr + ybr) / 2 - 0.02, zr + 0.012], [0.26, 0.055, 0.006], 0.004, PLATE, { shade: 0 }); trim.rbox([0, (ytr + ybr) / 2 - 0.02, zr + 0.005], [0.2, 0.022, 0.002], 0.001, INK, { shade: 0 });
    trim.rbox([0, ybr + 0.05, zr + 0.01], [wr * 0.55, 0.035, 0.03], 0.015, PLAST);
    /* ----- sides: mirrors, handles, door seams, rocker trim ----- */
    const beltZ = za - 0.08;
    for (const sx of [-1, 1]) {
      paint.addGeo((() => { const mm = new Arms.Mech(); mm.seg = 1; mm.push(T4(sx * (hw + 0.07), S.belt + 0.07, beltZ, 0, sx * 0.2, 0)).rbox([0, 0, 0], [0.075, 0.05, 0.035], 0.02, PAINT).pop(); return mm.build(); })(), M4.create());
      trim.push(T4(sx * (hw + 0.09), S.belt + 0.07, beltZ - 0.034, 0, sx * 0.2, 0)).rbox([0, 0, 0], [0.06, 0.038, 0.004], 0.003, MIRROR, { shade: 0 }).pop();
      trim.rbox([sx * (hw - 0.02), S.belt + 0.03, beltZ + 0.05], [0.03, 0.02, 0.05], 0.01, BLACK);                   // mirror arm
    }
    // door seams: thin dark strips on the body side, from the rocker to the belt
    const doors = van ? [za - 0.05, zc + 0.02] : type === 'compact' ? [za - 0.06, zd + 0.15] : [za - 0.06, (zb + zc) / 2, zd + 0.06];
    for (const dz of doors) {
      const h = half(dz), pts = h.slice(3, 11).map(p => [p[0], p[1]]);
      strip(tg, pts, dz, 0.004, 0.003, BLACK); strip(tg, pts.map(p => [-p[0], p[1]]), dz, 0.004, 0.003, BLACK);
    }
    // handles
    const hz = van ? [za - 0.3] : type === 'compact' ? [za - 0.35] : [za - 0.35, (zb + zc) / 2 - 0.3];
    for (const z of hz) for (const sx of [-1, 1]) { const w = wAt(z), y = S.belt - 0.1; trim.rbox([sx * (w * 1.005 + 0.004), y, z], [0.006, 0.012, 0.06], 0.005, type === 'police' ? BLACK : CHROME, { shade: 0 }); }
    // exhaust under the rear bumper, pointing back
    trim.push(T4(wr * 0.52, ybr + 0.025, zr + 0.1, 0, -Math.PI / 2, 0)).cyl(-0.12, 0.14, 0, 0, 0.03, 0.028, CHROME, { segs: 10 }).pop();

    // police: reflective line along the band, light bar base on the roof (its lenses flash, drawn apart)
    if (band) {
      for (const sx of [-1, 1]) { const pts = []; for (const z of Z) if (Math.abs(z) < hl * 0.9) { const h = half(z), y4 = h[4][1], y5 = h[9][1]; pts.push([sx * lerp(h[4][0], h[9][0], 0.7) , lerp(y4, y5, 0.7), z]); }
        const base = tg.vc; for (const p of pts) for (const dy of [-0.008, 0.008]) tg.vert(p[0] + sx * 0.004, p[1] + dy, p[2], sx, 0, 0, 0, 0, CELL.plain[0], CELL.plain[1], 0.5, 0.85, 1.2, 1.4);
        for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; if (sx > 0) tg.i.push(a, a + 1, a + 3, a, a + 3, a + 2); else tg.i.push(a, a + 3, a + 1, a, a + 2, a + 3); } }
      trim.rbox([0, yr + 0.085, (zb + zc) / 2 - 0.05], [0.58, 0.035, 0.14], 0.02, BLACK);
      trim.rbox([0, yr + 0.052, (zb + zc) / 2 - 0.05], [0.4, 0.02, 0.06], 0.01, PLAST);
    }
    const lampF = [wf * 0.72, ytf - 0.075, zf], lampR = [wr * 0.74, ytr - 0.07, zr];
    return { paint: paint.build(), glass: glass.build(), trim: trim.build(), head: head.build(), tail: tail.build(), wz, lampF, lampR, roof: yr, tris: { paint: paint.i.length / 3, trim: trim.g.i.length / 3 } };
  }
  /* ---------- wheel: tyre + alloy (or steel) rim, outer face toward +x ---------- */
  function wheel(rim) {
    const m = new Arms.Mech(), R = 0.34;
    m.push(T4(0, 0, 0, 0, 0, -Math.PI / 2)); // lathe axis y -> +x
    const tyre = [[0.215, -0.11], [0.29, -0.116], [0.333, -0.095], [0.342, -0.06], [R, 0], [0.342, 0.06], [0.333, 0.095], [0.29, 0.116], [0.215, 0.11]];
    const pr = tyre.map(([r, y], i) => { const p = tyre[Math.max(0, i - 1)], q = tyre[Math.min(tyre.length - 1, i + 1)]; const tr = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tr, ty) || 1; return [r, y, ty / l, -tr / l, RUBBER]; });
    m.lathe([0, 0, 0], pr, 16);
    // rim: barrel (dark), face disc, spokes, hub
    m.lathe([0, 0, 0], [[0.212, 0.1, 0, 1, rim], [0.2, 0.09, -1, 0.3, rim], [0.19, 0.03, -1, 0, DISC], [0.19, -0.08, -1, 0, DISC]], 16);
    m.lathe([0, 0, 0], [[0.19, 0.035, 0, 1, DISC], [0.001, 0.035, 0, 1, DISC]], 12);
    for (let k = 0; k < 5; k++) m.push(T4(0, 0.07, 0, 0, k / 5 * TAU, 0)).rbox([0, 0, 0.115], [0.022, 0.012, 0.085], 0.008, rim, { seg: 1 }).pop();
    m.lathe([0, 0, 0], [[0.055, 0.075, 0.7, 0.7, rim], [0.03, 0.09, 0.2, 1, rim], [0.001, 0.092, 0, 1, rim]], 10);
    m.pop();
    return m.build();
  }
  // plain low wheel for distant cars
  function wheelLow() { const m = new Arms.Mech(); m.cyl(-0.11, 0.11, 0, 0, 0.34, 0.34, RUBBER, { segs: 10 }); m.cyl(0.08, 0.115, 0, 0, 0.2, 0.2, ALLOY, { segs: 8, bevel: 0 }); return m.build(); }
  return { build, wheel, wheelLow, ALLOY, STEELW };
})();

