/* =====================================================================
   ARMS — detailed weapon models: rounded boxes, cylinders, swept
   profiles (curved magazines) and lathes with per-vertex materials
   (blued steel, polymer, wood, chrome), built once at load into the part
   geometries, plus where the hands hold each weapon.
   Guns are modelled in a gun frame (+x toward the muzzle, +y up, +z the
   gun's right side; origin at the grip or at the butt) then turned into
   the frame of the bone that carries them: the right hand (pistol, uzi,
   melee, grenade) or the chest (long guns, held against the shoulder).
   ===================================================================== */
const Arms = (() => {
  /* ---------- materials (linear colours, emission in the 4th component) ---------- */
  const STEEL = [0.075, 0.08, 0.09, 0], BLACK = [0.04, 0.042, 0.047, 0], POLY = [0.055, 0.056, 0.058, 0], BOLT = [0.4, 0.41, 0.43, 0],
    WOOD = [0.3, 0.12, 0.05, 0], WOOD2 = [0.36, 0.17, 0.07, 0], CHROME = [0.62, 0.63, 0.66, 0], OLIVE = [0.15, 0.18, 0.09, 0], BRASS = [0.5, 0.4, 0.16, 0],
    RUBBER = [0.03, 0.03, 0.03, 0], LENS = [0.9, 0.2, 0.15, 0.6], ASH = [0.6, 0.44, 0.27, 0], TAPE = [0.04, 0.04, 0.045, 0], MARK = [0.55, 0.45, 0.08, 0];
  const dim = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3]];

  /* ---------- builder: every primitive is placed by a matrix (gun frame) ---------- */
  class Mech {
    constructor() { this.g = new GeoBuilder(); this.M = M4.create(); this.stack = []; }
    push(m) { this.stack.push(this.M.slice()); M4.mul(this.M, this.M, m); return this; }
    pop() { this.M.set(this.stack.pop()); return this; }
    // a vertex through the current matrix
    v(x, y, z, nx, ny, nz, col) {
      const m = this.M, px = m[0] * x + m[4] * y + m[8] * z + m[12], py = m[1] * x + m[5] * y + m[9] * z + m[13], pz = m[2] * x + m[6] * y + m[10] * z + m[14];
      let tx = m[0] * nx + m[4] * ny + m[8] * nz, ty = m[1] * nx + m[5] * ny + m[9] * nz, tz = m[2] * nx + m[6] * ny + m[10] * nz; const l = Math.hypot(tx, ty, tz) || 1;
      return this.g.vert(px, py, pz, tx / l, ty / l, tz / l, 0, 0, CELL.plain[0], CELL.plain[1], col[0], col[1], col[2], col[3]);
    }
    /* rounded box: centre c, half extents h, edge radius r (a subdivided cube pushed out of its inner box);
       shade darkens the lower half a little (baked light), taper scales the +x end in y and z */
    rbox(c, h, r, col, o = {}) {
      const n = o.seg || this.seg || 2, N = 2 * n + 1, ta = o.taper || [1, 1], sh = o.shade === undefined ? 0.18 : o.shade;
      r = Math.min(r, h[0] * 0.98, h[1] * 0.98, h[2] * 0.98);
      const ih = [h[0] - r, h[1] - r, h[2] - r];
      // grid rows on a cube face: bevel rows at both ends, one flat span in the middle
      const stepOf = (i, hk) => i <= n ? -hk + r * (i / n) : hk - r * ((N - i) / n);
      for (const [au, av, an] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) for (const sg of [1, -1]) {
        const base = this.g.vc, M = N + 1;
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
          const p = [0, 0, 0]; p[au] = stepOf(i, h[au]); p[av] = stepOf(j, h[av]); p[an] = sg * h[an];
          const q = [clamp(p[0], -ih[0], ih[0]), clamp(p[1], -ih[1], ih[1]), clamp(p[2], -ih[2], ih[2])];
          let dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
          const x = q[0] + dx * r; let y = q[1] + dy * r, z = q[2] + dz * r;
          const k = (x / h[0] + 1) / 2, sy = 1 + (ta[0] - 1) * k, sz = 1 + (ta[1] - 1) * k; y *= sy; z *= sz;
          const s = 1 - sh * clamp(0.5 - y / Math.max(1e-6, h[1]) * 0.5, 0, 1) * 0.6;
          this.v(c[0] + x, c[1] + y, c[2] + z, dx, dy / sy, dz / sz, [col[0] * s, col[1] * s, col[2] * s, col[3]]);
        }
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const a = base + j * M + i, b = a + 1, d = a + M, e = d + 1;
          if (sg > 0) this.g.i.push(a, b, e, a, e, d); else this.g.i.push(a, e, b, a, d, e);
        }
      }
      return this;
    }
    // cylinder along +x from x0 to x1 at (y, z), radii r0 -> r1, with rounded rims (bevel b)
    cyl(x0, x1, y, z, r0, r1, col, o = {}) {
      const segs = o.segs || 14, b = o.bevel === undefined ? Math.min(r0, r1) * 0.25 : o.bevel, caps = o.caps !== false;
      const prof = []; // [x, r, nx, nr]
      if (caps) prof.push([x0, 0, -1, 0], [x0, Math.max(0, r0 - b), -1, 0]);
      if (b > 0) prof.push([x0 + b * 0.3, r0 - b * 0.3, -0.7, 0.7]);
      const sl = Math.atan2(r0 - r1, x1 - x0), nx = Math.sin(sl), nr = Math.cos(sl);
      prof.push([x0 + b, r0, nx, nr], [x1 - b, r1, nx, nr]);
      if (b > 0) prof.push([x1 - b * 0.3, r1 - b * 0.3, 0.7, 0.7]);
      if (caps) prof.push([x1, Math.max(0, r1 - b), 1, 0], [x1, 0, 1, 0]);
      const base = this.g.vc, np = prof.length;
      for (let s = 0; s <= segs; s++) {
        const a = s / segs * TAU + (o.rot || 0), ca = Math.cos(a), sa = Math.sin(a);
        for (const [px, pr, pnx, pnr] of prof) this.v(px, y + ca * pr, z + sa * pr, pnx, ca * pnr, sa * pnr, col);
      }
      for (let s = 0; s < segs; s++) for (let k = 0; k < np - 1; k++) { const a = base + s * np + k, c = base + (s + 1) * np + k; this.g.i.push(a, c, a + 1, a + 1, c, c + 1); }
      return this;
    }
    // torus in the plane perpendicular to axis (0 x, 1 y, 2 z), centre c, major radius R, tube r, arc a0..a1
    ring(c, axis, R, r, col, a0 = 0, a1 = TAU, segs = 16, sides = 8) {
      const base = this.g.vc;
      for (let i = 0; i <= segs; i++) {
        const u = a0 + (a1 - a0) * i / segs, cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= sides; j++) {
          const w = j / sides * TAU, cw = Math.cos(w), sw = Math.sin(w);
          const d = [cu * cw, su * cw, sw]; // local: ring in (e0, e1) plane, e2 = axis
          const map = axis === 0 ? [d[2], d[0], d[1]] : axis === 1 ? [d[0], d[2], d[1]] : [d[0], d[1], d[2]];
          const pl = axis === 0 ? [0, cu * R, su * R] : axis === 1 ? [cu * R, 0, su * R] : [cu * R, su * R, 0];
          this.v(c[0] + pl[0] + map[0] * r, c[1] + pl[1] + map[1] * r, c[2] + pl[2] + map[2] * r, map[0], map[1], map[2], col);
        }
      }
      for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) { const a = base + i * (sides + 1) + j, b = a + sides + 1; this.g.i.push(a, b, a + 1, a + 1, b, b + 1); }
      return this;
    }
    /* rounded-rectangle profile swept down an arc in the x-y plane (a banana magazine):
       starts at `top`, heading down and tilted forward by a0, turning forward by `bend` over `len`;
       hu = half depth (front-back), hv = half width (z), rc = corner radius; colAt(s) paints the rings */
    sweep(top, a0, bend, len, hu, hv, rc, colAt, segs = 10) {
      const prof = [], k = 3, cu = hu - rc, cv = hv - rc;
      for (const [sx, sy, st] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]]) for (let i = 0; i <= k; i++) {
        const a = (st + i / k) * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
        prof.push([sx * cu + c * rc, sy * cv + s * rc, c, s]);
      }
      const np = prof.length, rings = [];
      let px = top[0], py = top[1];
      for (let i = 0; i <= segs; i++) {
        const s = i / segs, th = a0 + bend * s, tx = Math.sin(th), ty = -Math.cos(th);
        if (i > 0) { const thm = a0 + bend * (s - 0.5 / segs); px += Math.sin(thm) * len / segs; py -= Math.cos(thm) * len / segs; }
        const nx = Math.cos(th), ny = Math.sin(th), col = colAt(s), base = this.g.vc;
        for (const [u, v, nu, nv] of prof) this.v(px + nx * u, py + ny * u, top[2] + v, nx * nu, ny * nu, nv, col);
        rings.push({ base, px, py, tx, ty, col });
      }
      for (let i = 0; i < segs; i++) for (let j = 0; j < np; j++) {
        const j2 = (j + 1) % np, a = rings[i].base + j, b = rings[i].base + j2, c = rings[i + 1].base + j2, d = rings[i + 1].base + j;
        this.g.i.push(a, b, c, a, c, d);
      }
      for (const [R, sg] of [[rings[0], -1], [rings[segs], 1]]) { // flat end caps
        const th = Math.atan2(R.tx, -R.ty), nx = Math.cos(th), ny = Math.sin(th);
        const c0 = this.v(R.px, R.py, top[2], R.tx * sg, R.ty * sg, 0, R.col);
        for (const [u, v] of prof) this.v(R.px + nx * u, R.py + ny * u, top[2] + v, R.tx * sg, R.ty * sg, 0, R.col);
        for (let j = 0; j < np; j++) { const a = c0 + 1 + j, b = c0 + 1 + (j + 1) % np; if (sg > 0) this.g.i.push(c0, a, b); else this.g.i.push(c0, b, a); }
      }
      return this;
    }
    // solid of revolution about +y: prof = [[r, y, nr, ny, col], ...] from the bottom up
    lathe(c, prof, segs = 16) {
      const base = this.g.vc, np = prof.length;
      for (let s = 0; s <= segs; s++) {
        const a = s / segs * TAU, ca = Math.cos(a), sa = Math.sin(a);
        for (const [r, y, nr, ny, col] of prof) this.v(c[0] + ca * r, c[1] + y, c[2] + sa * r, ca * nr, ny, sa * nr, col);
      }
      for (let s = 0; s < segs; s++) for (let k = 0; k < np - 1; k++) { const a = base + s * np + k, b = base + (s + 1) * np + k; this.g.i.push(a, a + 1, b, a + 1, b + 1, b); }
      return this;
    }
    build() { return this.g.build(); }
  }
  const T = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => M4.compose(M4.create(), x, y, z, rx, ry, rz, s, s, s);

  /* ---------- weapons (gun frame: +x muzzle, +y up, +z the gun's right side) ----------
     grip: where the trigger hand closes (centre of the fist) and the rake of the grip (its axis leans forward
     at the top by `rake`); fore: where the support hand closes on long guns (hand = { c, th: thumb, pa: palm }) */
  function pistol() {
    const m = new Mech();
    m.rbox([0.045, 0.035, 0], [0.093, 0.016, 0.0135], 0.004, STEEL);                      // slide
    for (let i = 0; i < 6; i++) for (const sz of [1, -1]) m.rbox([-0.03 + i * 0.006, 0.037, sz * 0.0138], [0.0012, 0.011, 0.0008], 0.0005, BLACK, { shade: 0 }); // serrations
    m.rbox([0.06, 0.037, 0.0138], [0.02, 0.005, 0.0008], 0.0005, BLACK, { shade: 0 });    // ejection port
    m.rbox([0.05, 0.011, 0], [0.085, 0.009, 0.012], 0.004, POLY);                         // frame
    m.cyl(0.135, 0.142, 0.037, 0, 0.0055, 0.0055, BLACK, { segs: 10 });                   // muzzle
    m.rbox([0.13, 0.054, 0], [0.003, 0.004, 0.0025], 0.001, BLACK); m.rbox([-0.04, 0.054, 0], [0.003, 0.004, 0.009], 0.001, BLACK); // sights
    m.push(T(-0.014, -0.045, 0, 0, 0, -0.26)).rbox([0, 0, 0], [0.021, 0.052, 0.0145], 0.007, POLY);                   // grip (bottom toward the rear)
    for (let i = 0; i < 4; i++) m.rbox([0.021, 0.02 - i * 0.016, 0], [0.0012, 0.005, 0.0125], 0.001, BLACK, { shade: 0 }); // finger grooves
    m.rbox([0, -0.054, 0], [0.019, 0.004, 0.0135], 0.002, BLACK).pop();                                                  // magazine base
    m.ring([0.028, -0.002, 0], 2, 0.019, 0.0025, POLY, Math.PI * 1.05, Math.PI * 1.95, 10, 6);                         // trigger guard
    m.push(T(0.022, -0.004, 0, 0, 0, 0.2)).rbox([0, 0, 0], [0.003, 0.009, 0.003], 0.0015, BLACK).pop();                 // trigger
    return { geo: m.build(), muzzle: [0.145, 0.037, 0], grip: { c: [-0.009, -0.034, 0], rake: 0.26 },
      sup: { c: [-0.02, -0.05, -0.028], th: [0.85, 0.5, 0.1], pa: [0.1, -0.2, 1] } };
  }
  function uzi() {
    const m = new Mech();
    m.rbox([0.06, 0.03, 0], [0.13, 0.026, 0.021], 0.006, STEEL);                          // receiver
    for (let i = 0; i < 5; i++) for (const sz of [1, -1]) m.rbox([0.1 + i * 0.014, 0.012, sz * 0.0212], [0.004, 0.009, 0.0008], 0.0008, BLACK, { shade: 0 }); // side grooves
    m.rbox([0.06, 0.058, 0], [0.12, 0.004, 0.017], 0.003, BLACK);                          // top cover
    m.cyl(-0.005, 0.015, 0.06, 0, 0.007, 0.007, STEEL, { segs: 8 });                      // cocking knob
    m.cyl(0.19, 0.25, 0.028, 0, 0.012, 0.012, STEEL, { segs: 12 });                       // barrel nut
    m.cyl(0.25, 0.275, 0.028, 0, 0.0065, 0.0065, BLACK, { segs: 10 });                    // barrel
    m.rbox([0.17, 0.066, 0], [0.004, 0.007, 0.012], 0.002, BLACK); m.rbox([-0.04, 0.066, 0], [0.004, 0.007, 0.012], 0.002, BLACK);
    m.push(T(0.03, -0.055, 0, 0, 0, -0.1)).rbox([0, 0, 0], [0.019, 0.07, 0.017], 0.006, POLY).rbox([0, -0.078, 0], [0.018, 0.012, 0.016], 0.004, STEEL).pop(); // grip + magazine base
    m.ring([0.06, 0.002, 0], 2, 0.022, 0.0028, STEEL, Math.PI * 1.02, Math.PI * 1.98, 10, 6);                          // trigger guard
    m.rbox([0.058, -0.004, 0], [0.003, 0.009, 0.003], 0.0015, BLACK);
    // folded wire stock under the receiver
    m.cyl(-0.07, 0.15, 0.002, 0.018, 0.0028, 0.0028, STEEL, { segs: 6, bevel: 0 }); m.cyl(-0.07, 0.15, 0.002, -0.018, 0.0028, 0.0028, STEEL, { segs: 6, bevel: 0 });
    m.rbox([-0.072, 0.002, 0], [0.004, 0.012, 0.021], 0.003, STEEL);
    return { geo: m.build(), muzzle: [0.28, 0.028, 0], grip: { c: [0.034, -0.045, 0], rake: 0.1 },
      sup: { c: [0.16, 0.012, 0], th: [1, 0.05, 0], pa: [0, 1, 0.35] } };
  }
  // AK: wooden stock, handguard and grip, curved magazine, gas tube, sights, muzzle brake (origin: butt plate)
  function ak() {
    const m = new Mech();
    m.push(T(0.13, -0.012, 0, 0, 0, 0.1)).rbox([0, 0, 0], [0.13, 0.035, 0.018], 0.01, WOOD, { taper: [0.55, 0.85] }).pop(); // stock
    m.rbox([0.003, -0.022, 0], [0.004, 0.04, 0.019], 0.003, STEEL);                        // butt plate
    m.rbox([0.39, 0.033, 0], [0.135, 0.028, 0.017], 0.005, STEEL);                          // receiver
    m.push(T(0.39, 0.058, 0)).cyl(-0.12, 0.12, 0, 0, 0.018, 0.018, STEEL, { segs: 14 }).pop(); // dust cover (rounded top)
    m.rbox([0.475, 0.04, 0.0185], [0.012, 0.004, 0.003], 0.0015, BOLT);                     // charging handle (right side)
    m.rbox([0.43, 0.02, 0.0178], [0.04, 0.005, 0.0015], 0.001, STEEL);                      // selector lever
    m.rbox([0.39, 0.033, -0.0172], [0.05, 0.012, 0.0008], 0.0006, BLACK, { shade: 0 });     // side rail
    m.push(T(0.3, -0.035, 0, 0, 0, -0.35)).rbox([0, 0, 0], [0.018, 0.045, 0.014], 0.007, WOOD2).pop(); // pistol grip
    m.ring([0.35, 0.002, 0], 2, 0.024, 0.003, STEEL, Math.PI * 1.02, Math.PI * 1.98, 10, 6);  // trigger guard
    m.rbox([0.345, -0.006, 0], [0.003, 0.01, 0.003], 0.0015, BLACK);
    // the banana magazine: a swept rounded rectangle bending forward, ribbed
    m.sweep([0.44, 0.008, 0], 0.12, 0.62, 0.2, 0.026, 0.0135, 0.006, s => (s > 0.3 && s < 0.36) || (s > 0.62 && s < 0.68) ? dim(STEEL, 0.55) : STEEL, 12);
    // handguard (lower + upper), barrel, gas block, gas tube, front sight, muzzle brake
    m.rbox([0.6, 0.02, 0], [0.085, 0.022, 0.021], 0.009, WOOD);
    for (let i = 0; i < 3; i++) for (const sz of [1, -1]) m.rbox([0.56 + i * 0.035, 0.018, sz * 0.021], [0.009, 0.01, 0.0008], 0.0008, dim(WOOD, 0.6), { shade: 0 }); // finger grooves
    m.cyl(0.52, 0.7, 0.052, 0, 0.014, 0.013, WOOD2, { segs: 12 });
    m.cyl(0.52, 0.93, 0.028, 0, 0.0095, 0.0085, STEEL, { segs: 12 });
    m.rbox([0.715, 0.043, 0], [0.012, 0.02, 0.012], 0.004, STEEL);
    m.cyl(0.52, 0.72, 0.052, 0, 0.009, 0.009, STEEL, { segs: 10 });
    m.rbox([0.86, 0.045, 0], [0.012, 0.018, 0.011], 0.004, STEEL); m.rbox([0.862, 0.072, 0], [0.002, 0.012, 0.002], 0.001, BLACK); // front sight
    m.rbox([0.53, 0.063, 0], [0.02, 0.008, 0.011], 0.003, STEEL);                            // rear sight
    m.cyl(0.92, 0.965, 0.028, 0, 0.012, 0.011, BLACK, { segs: 10 });                        // muzzle brake
    return { geo: m.build(), muzzle: [0.97, 0.028, 0], grip: { c: [0.31, -0.024, 0], rake: 0.35 },
      fore: { c: [0.56, 0.024, 0], th: [1, 0.12, 0], pa: [0, 1, 0.35] } };
  }
  // tactical carbine (Sentinelle): collapsible stock, flat top with a red dot, railed handguard, magazine
  function carbine() {
    const m = new Mech();
    m.rbox([0.07, 0.01, 0], [0.07, 0.034, 0.019], 0.008, POLY, { taper: [0.8, 0.9] });     // stock
    m.cyl(0.08, 0.3, 0.03, 0, 0.014, 0.014, BLACK, { segs: 10 });                           // buffer tube
    m.rbox([0.37, 0.03, 0], [0.11, 0.027, 0.018], 0.005, BLACK);                             // receiver
    m.rbox([0.37, 0.063, 0], [0.11, 0.006, 0.012], 0.002, POLY);                             // top rail
    m.rbox([0.38, 0.09, 0], [0.028, 0.018, 0.016], 0.006, POLY); m.cyl(0.35, 0.41, 0.093, 0, 0.012, 0.012, BLACK, { segs: 12 }); // red dot sight
    m.rbox([0.411, 0.093, 0], [0.001, 0.009, 0.009], 0.0005, LENS, { shade: 0 });
    m.push(T(0.29, -0.035, 0, 0, 0, -0.35)).rbox([0, 0, 0], [0.017, 0.045, 0.014], 0.006, POLY).pop();              // grip
    m.ring([0.34, 0.002, 0], 2, 0.022, 0.003, BLACK, Math.PI * 1.02, Math.PI * 1.98, 10, 6);
    m.sweep([0.415, 0.006, 0], 0.08, 0.2, 0.15, 0.022, 0.012, 0.004, () => BLACK, 6);                                // magazine
    m.rbox([0.6, 0.035, 0], [0.12, 0.024, 0.022], 0.006, POLY);                              // handguard
    for (let i = 0; i < 7; i++) for (const sz of [1, -1]) m.rbox([0.5 + i * 0.03, 0.035, sz * 0.0225], [0.008, 0.012, 0.0012], 0.001, BLACK, { shade: 0 }); // vents
    m.cyl(0.72, 0.86, 0.035, 0, 0.0075, 0.0075, BLACK, { segs: 10 });
    m.cyl(0.86, 0.9, 0.035, 0, 0.0105, 0.0105, BLACK, { segs: 8 });                          // flash hider
    return { geo: m.build(), muzzle: [0.9, 0.035, 0], grip: { c: [0.3, -0.024, 0], rake: 0.35 },
      fore: { c: [0.54, 0.03, 0], th: [1, 0.12, 0], pa: [0, 1, 0.35] } };
  }
  // pump shotgun: wooden stock and pump, barrel over the magazine tube
  function shotgun() {
    const m = new Mech();
    m.push(T(0.13, -0.015, 0, 0, 0, 0.12)).rbox([0, 0, 0], [0.13, 0.036, 0.02], 0.01, WOOD, { taper: [0.6, 0.85] }).pop();
    m.rbox([0.003, -0.03, 0], [0.005, 0.045, 0.021], 0.004, RUBBER);
    m.rbox([0.36, 0.028, 0], [0.1, 0.03, 0.019], 0.006, STEEL);
    m.cyl(0.44, 0.98, 0.045, 0, 0.011, 0.0105, STEEL, { segs: 12 });                        // barrel
    m.cyl(0.44, 0.9, 0.018, 0, 0.0105, 0.0105, STEEL, { segs: 12 });                        // magazine tube
    m.rbox([0.63, 0.02, 0], [0.085, 0.02, 0.021], 0.009, WOOD2);                              // pump
    for (let i = 0; i < 6; i++) m.rbox([0.575 + i * 0.022, 0.02, 0], [0.003, 0.0205, 0.0215], 0.002, BLACK, { shade: 0 });
    m.rbox([0.975, 0.062, 0], [0.004, 0.004, 0.003], 0.002, CHROME);                         // bead sight
    m.ring([0.33, -0.002, 0], 2, 0.022, 0.003, STEEL, Math.PI * 1.02, Math.PI * 1.98, 10, 6);
    return { geo: m.build(), muzzle: [0.99, 0.045, 0], grip: { c: [0.25, -0.012, 0], rake: 0.95 },
      fore: { c: [0.62, 0.02, 0], th: [1, 0.12, 0], pa: [0, 1, 0.35] } };
  }
  function bat() { // gun frame: +x away from the hand
    const m = new Mech();
    m.cyl(-0.03, 0.2, 0, 0, 0.016, 0.018, TAPE, { segs: 12 });
    m.cyl(0.2, 0.78, 0, 0, 0.018, 0.034, ASH, { segs: 14 });
    m.cyl(-0.045, -0.03, 0, 0, 0.024, 0.024, ASH, { segs: 12 });
    return { geo: m.build(), grip: { c: [0.03, 0, 0], rake: 0.9 } };
  }
  function knife() {
    const m = new Mech();
    m.rbox([0.02, 0, 0], [0.055, 0.012, 0.009], 0.005, BLACK);
    m.rbox([0.078, 0, 0], [0.004, 0.018, 0.011], 0.002, CHROME);                             // guard
    const b = m.g.vc; m.rbox([0.16, 0.002, 0], [0.08, 0.013, 0.0018], 0.0012, CHROME, { taper: [0.25, 1] });
    for (let v = b; v < m.g.vc; v++) { const x = m.g.p[v * 3]; m.g.p[v * 3 + 1] += Math.max(0, x - 0.18) * 0.12; } // clip point
    return { geo: m.build(), grip: { c: [0.02, 0, 0], rake: 0.75 } };
  }
  function wrench() {
    const m = new Mech();
    m.rbox([0.3, 0, 0], [0.3, 0.018, 0.007], 0.005, CHROME);
    m.rbox([0.03, 0, 0], [0.04, 0.02, 0.01], 0.006, RUBBER);
    m.ring([0.64, 0, 0], 2, 0.045, 0.015, CHROME, -1.2, 1.2, 10, 8);
    m.rbox([0.62, 0.045, 0], [0.025, 0.012, 0.012], 0.004, CHROME);
    return { geo: m.build(), grip: { c: [0.03, 0, 0], rake: 0.8 } };
  }
  function staff() {
    const m = new Mech();
    m.cyl(-0.9, 1.0, 0, 0, 0.022, 0.018, [0.05, 0.07, 0.07, 0], { segs: 10 });
    for (const x of [-0.5, 0.2, 0.8]) m.ring([x, 0, 0], 0, 0.024, 0.005, [0.1, 0.35, 0.3, 0.8], 0, TAU, 12, 6);
    return { geo: m.build(), grip: { c: [0, 0, 0], rake: 0.35 } };
  }
  // hand grenade (M67-like): smooth olive body with a yellow marking band, fuze, spoon lever, pin ring
  function grenade() {
    const m = new Mech(), prof = [];
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 12, c = Math.cos(a), s = Math.sin(a);
      prof.push([Math.max(0, c * 0.032), s * 0.034, c, s, i === 9 ? MARK : i === 6 ? dim(OLIVE, 0.75) : OLIVE]);
    }
    m.lathe([0, 0, 0], prof, 16);
    m.push(T(0, 0.03, 0, 0, 0, Math.PI / 2)).cyl(0, 0.02, 0, 0, 0.0105, 0.0095, STEEL, { segs: 12 }).pop();                // fuze
    m.push(T(0.027, 0.026, 0, 0, 0, 0.32)).rbox([0, 0, 0], [0.0035, 0.026, 0.0065], 0.002, STEEL).pop();                 // spoon
    m.ring([-0.016, 0.052, 0], 2, 0.009, 0.0018, BRASS, 0, TAU, 12, 5);                                                   // pin ring
    return { geo: m.build(), grip: { c: [0, -0.004, 0], rake: 0 } };
  }

  /* ---------- hand frames ----------
     Folk hands (bone frame): fingers toward -y, thumb toward +z, palm toward -x (left hand) / +x (right hand).
     A closed hand ('grip' pose) wraps a bar along its z axis centred at HC (x mirrored for the right hand). */
  const HC = [0.033, -0.097, 0];
  const n3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cr3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dt3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // hand axes (in gun coordinates) from the thumb direction and the palm normal; side 1 = right hand (palm = +x)
  function handAxes(th, pa, side) {
    const Z = n3(th); let P = n3(pa); const d = dt3(P, Z); P = n3([P[0] - d * Z[0], P[1] - d * Z[1], P[2] - d * Z[2]]);
    const X = side ? P : [-P[0], -P[1], -P[2]], Y = cr3(Z, X);
    return [X, Y, Z];
  }
  // trigger hand on a grip raked by r: thumb along the grip axis, palm against the right side of the grip (normal -z)
  const gripAxes = r => handAxes([Math.sin(r), Math.cos(r), 0], [0, 0, -1], 1);
  // wrist (hand bone origin) for a fist closed on point c with axes A (gun coordinates)
  function wristAt(c, A, side) { const hx = side ? HC[0] : -HC[0]; return [c[0] - A[0][0] * hx - A[1][0] * HC[1], c[1] - A[0][1] * hx - A[1][1] * HC[1], c[2] - A[0][2] * hx - A[1][2] * HC[1]]; }
  // 4x4 (column-major) taking gun coordinates into the hand frame: gun point c lands in the fist
  function toHand(A, c) {
    const m = M4.create(); // rows = hand axes
    m[0] = A[0][0]; m[4] = A[0][1]; m[8] = A[0][2];
    m[1] = A[1][0]; m[5] = A[1][1]; m[9] = A[1][2];
    m[2] = A[2][0]; m[6] = A[2][1]; m[10] = A[2][2];
    const w = wristAt(c, A, 1);
    m[12] = -(m[0] * w[0] + m[4] * w[1] + m[8] * w[2]); m[13] = -(m[1] * w[0] + m[5] * w[1] + m[9] * w[2]); m[14] = -(m[2] * w[0] + m[6] * w[1] + m[10] * w[2]);
    return m;
  }
  // chest frame: forward +z, up +y, left +x -> gun +x = chest +z, gun +y = chest +y, gun +z (right) = chest -x
  const TO_CHEST = (() => { const m = M4.create(); m.set([0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1]); return m; })();
  const ap3 = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const av3 = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
  // a hand hold expressed in part space: wrist position + hand rotation (3x3, row-major like the animation code)
  function hold(M, c, A, side) {
    const w = ap3(M, wristAt(c, A, side)), X = av3(M, A[0]), Y = av3(M, A[1]), Z = av3(M, A[2]);
    return { w, R: [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]], c: ap3(M, c) };
  }
  const INFO = {}; // per part: muzzle, hand holds (part space), kind
  function build() {
    const LONG = 0.92; // long guns a little shorter than life: the rig's arms are short
    const H = (mdl, key) => {
      const A = gripAxes(mdl.grip.rake), M = toHand(A, mdl.grip.c);
      PartGeo[key] = transformGeo(mdl.geo, M);
      const I = INFO[key] = { hand: true, muzzle: mdl.muzzle && ap3(M, mdl.muzzle) };
      if (mdl.sup) { // support hand for a two-handed aim (pistol, uzi), in the right hand's frame
        const B = handAxes(mdl.sup.th, mdl.sup.pa, 0); I.sup = hold(M, mdl.sup.c, B, 0);
      }
    };
    const C = (mdl, key) => {
      const M = M4.mul(M4.create(), TO_CHEST, M4.compose(M4.create(), 0, 0, 0, 0, 0, 0, LONG, LONG, LONG));
      PartGeo[key] = transformGeo(mdl.geo, M);
      const A = gripAxes(mdl.grip.rake), B = handAxes(mdl.fore.th, mdl.fore.pa, 0);
      // hand holds: positions scale with the gun, the hand axes do not
      const Ms = M4.mul(M4.create(), TO_CHEST, M4.compose(M4.create(), 0, 0, 0, 0, 0, 0, 1, 1, 1));
      const sc = p => [p[0] * LONG, p[1] * LONG, p[2] * LONG];
      const R = hold(Ms, sc(mdl.grip.c), A, 1), L = hold(Ms, sc(mdl.fore.c), B, 0);
      INFO[key] = { long: true, muzzle: ap3(M, mdl.muzzle), R, L };
    };
    H(pistol(), 'pistol'); H(uzi(), 'uzi'); H(bat(), 'bat'); H(knife(), 'knife'); H(wrench(), 'wrench'); H(staff(), 'staff'); H(grenade(), 'grenade');
    INFO.staff.tip = ap3(toHand(gripAxes(0.35), [0, 0, 0]), [1.05, 0, 0]);
    PartGeo.nade = grenade().geo; // a thrown grenade, centred on its own origin
    C(carbine(), 'rifle'); C(ak(), 'ak'); C(shotgun(), 'shotgun');
  }
  return { build, INFO, Mech, HC };
})();

