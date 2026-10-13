/* =====================================================================
   PEOPLE — anatomy, faces, hands, hair and clothes, sculpted with the
   kit of 10b_sculpt.js on the rig posed in an A-pose, then skinned.
   A person is drawn as a few skinned pieces sharing one bone/palette row:
   body (clothes included), head, hands, eyes, hair, headwear.
   ===================================================================== */
const People = (() => {
  const S = Sculpt, U = S.U, Cut = S.S, Clip = S.I, Grow = S.O, Paint = S.M;
  const { RCone, Ell, RBox, Cone, Torus } = S;

  /* ---------- palette slots (one colour each per person) ---------- */
  const SK = 0, LIP = 1, HAIR = 2, IRIS = 3, EYEW = 4, TOP = 5, TOP2 = 6, BOT = 7, SHOE = 8, SOLE = 9, ACC = 10, ACC2 = 11, GLOVE = 12, LEGS = 13, GLOW = 14, HAT = 15;
  const NPAL = 16;
  // default specular strength per slot (0..2)
  const SPEC = [0.32, 0.55, 0.6, 1.6, 1.3, 0.22, 0.25, 0.22, 0.7, 0.18, 0.4, 0.9, 0.4, 0.35, 0.2, 0.25];

  /* ---------- the rig in its modelling pose (arms 34 deg out, legs 4 deg apart) ---------- */
  const A_POSE = { shL: [0, 0, 0.6], shR: [0, 0, -0.6], hipL: [0, 0, 0.07], hipR: [0, 0, -0.07] };
  const SHX = { m: 0.19, f: 0.172 };      // shoulder joints (women: narrower)
  const rigs = {};
  function rig(v) {
    if (rigs[v]) return rigs[v];
    const W = [], inv = [], shx = SHX[v];
    for (let i = 0; i < NB; i++) {
      const b = BONES[i], a = A_POSE[b[0]] || [0, 0, 0], m = M4.create();
      let ox = b[2]; if (b[0] === 'shL') ox = shx; if (b[0] === 'shR') ox = -shx;
      if (i > 0) { const t = M4.create(); if (XZY[i]) M4.composeXZY(t, ox, b[3], b[4], a[0], a[1], a[2]); else M4.compose(t, ox, b[3], b[4], a[0], a[1], a[2]); M4.mul(m, W[b[1]], t); }
      W.push(m); inv.push(M4.invert(M4.create(), m));
    }
    return (rigs[v] = { v, W, inv, shx });
  }
  // a point given in a bone's frame, in model space
  const at = (R, bone, x, y, z) => { const m = R.W[BI[bone]]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; };
  // axes of a bone's frame (optionally turned further by euler angles in that frame)
  const axes = (R, bone, rx = 0, ry = 0, rz = 0) => S.fromM4(rx || ry || rz ? M4.mul(M4.create(), R.W[BI[bone]], M4.compose(M4.create(), 0, 0, 0, rx, ry, rz)) : R.W[BI[bone]]);
  const W = (f, m, w) => m + (w - m) * f;   // male value -> female value

  /* =====================================================================
     BODY — lofted cross-sections for the trunk and the limbs (from adult
     measurements), a few muscles and bones on top, skinned by proximity.
     b: { f (0 man, 1 woman), mass (0 thin .. 1 heavy), musc (0..1), age (0..1) }
     ===================================================================== */
  // trunk slices: [y, half width, front depth, back depth, z centre]
  const TRUNK = {
    m: [[0.855, 0.118, 0.068, 0.082, 0], [0.88, 0.158, 0.077, 0.106, -0.004], [0.94, 0.158, 0.084, 0.103, -0.005], [1.0, 0.149, 0.089, 0.088, -0.005], [1.07, 0.141, 0.093, 0.08, -0.004],
      [1.14, 0.144, 0.096, 0.08, -0.004], [1.21, 0.151, 0.102, 0.086, -0.006], [1.28, 0.158, 0.11, 0.094, -0.008], [1.34, 0.161, 0.112, 0.1, -0.01], [1.4, 0.158, 0.103, 0.1, -0.012],
      [1.45, 0.146, 0.082, 0.09, -0.014], [1.49, 0.104, 0.06, 0.074, -0.018], [1.53, 0.064, 0.05, 0.06, -0.012]],
    f: [[0.855, 0.124, 0.068, 0.086, 0], [0.88, 0.172, 0.078, 0.114, -0.007], [0.94, 0.17, 0.081, 0.108, -0.007], [1.0, 0.149, 0.083, 0.09, -0.005], [1.07, 0.121, 0.082, 0.074, -0.002],
      [1.14, 0.124, 0.085, 0.074, 0], [1.21, 0.132, 0.089, 0.079, 0], [1.28, 0.137, 0.093, 0.084, 0], [1.34, 0.14, 0.094, 0.088, -0.004], [1.4, 0.138, 0.089, 0.088, -0.009],
      [1.45, 0.128, 0.074, 0.079, -0.012], [1.49, 0.088, 0.052, 0.064, -0.015], [1.53, 0.055, 0.044, 0.051, -0.01]]
  };
  // limb slices in the bone frame: [y, half width (x: outward), front (+z), back, x centre (outward), z centre]
  const UPPER_ARM = [[0.03, 0.043, 0.045, 0.045, 0.004, 0], [-0.01, 0.054, 0.051, 0.053, 0.008, 0], [-0.06, 0.051, 0.046, 0.048, 0.007, 0], [-0.115, 0.043, 0.042, 0.041, 0.002, 0],
    [-0.16, 0.04, 0.044, 0.039, 0, 0.001], [-0.21, 0.037, 0.04, 0.036, 0, -0.002], [-0.25, 0.035, 0.033, 0.035, 0, -0.004], [-0.295, 0.033, 0.03, 0.034, 0, -0.006]];
  const FOREARM = [[0.025, 0.034, 0.03, 0.036, 0, -0.006], [-0.03, 0.039, 0.039, 0.036, 0.002, 0], [-0.08, 0.036, 0.037, 0.031, 0, 0], [-0.14, 0.029, 0.031, 0.025, 0, 0],
    [-0.2, 0.021, 0.027, 0.021, 0, 0], [-0.252, 0.018, 0.025, 0.019, 0, 0]];
  const THIGH = [[0.06, 0.07, 0.066, 0.078, 0, -0.01], [0, 0.083, 0.074, 0.084, 0.005, -0.005], [-0.06, 0.084, 0.077, 0.077, 0.004, 0], [-0.14, 0.077, 0.075, 0.067, 0, 0],
    [-0.22, 0.069, 0.071, 0.059, -0.002, 0], [-0.3, 0.06, 0.065, 0.051, -0.004, 0], [-0.37, 0.052, 0.057, 0.045, -0.004, 0], [-0.44, 0.048, 0.05, 0.045, -0.003, 0]];
  const SHIN = [[0.035, 0.048, 0.048, 0.045, 0, 0], [-0.03, 0.047, 0.044, 0.049, 0, -0.004], [-0.1, 0.048, 0.039, 0.058, -0.003, -0.006], [-0.16, 0.045, 0.035, 0.056, -0.004, -0.006],
    [-0.24, 0.037, 0.031, 0.043, -0.003, -0.004], [-0.32, 0.03, 0.029, 0.033, -0.002, -0.002], [-0.4, 0.026, 0.029, 0.029, 0, 0], [-0.445, 0.027, 0.031, 0.031, 0, 0]];
  const bump = (y, c, w) => Math.exp(-((y - c) / w) * ((y - c) / w));
  function body(R, b) {
    const f = b.f || 0, ms = b.mass === undefined ? 0.3 : b.mass, mu = b.musc === undefined ? 0.3 : b.musc, ag = b.age || 0, sex = f ? 'f' : 'm';
    const T = [], N = [], A = [[], []], L = [[], []], F = [[], []];
    const on = (s, bone, b2, t0, t1) => s.on(bone, b2, t0, t1);
    // ---- trunk: one loft, weighted hips -> spine -> chest -> neck by height
    const trunk = new S.Loft(TRUNK[sex].map(([y, a, zf, zb, zc]) => {
      const belly = bump(y, 1.08, 0.1), chest = bump(y, 1.33, 0.08), up = smoothstep(1.3, 1.44, y) * (1 - smoothstep(1.46, 1.5, y)), hip = bump(y, 0.92, 0.07);
      return [y, a + 0.03 * ms * belly + 0.012 * ms + 0.016 * mu * up + 0.012 * ms * hip, zf + 0.06 * ms * belly * (1 - 0.3 * f) + 0.012 * mu * chest * (1 - f) + 0.006 * ms + 0.02 * ag * belly, zb + 0.014 * ms + 0.01 * mu * chest + 0.012 * ms * hip, 0, zc + 0.01 * ms * belly];
    }), null, 0, [0.45, 0.5]).as('trunk');
    trunk.bone = BI.hips;
    trunk.wfn = (x, y, z, w, u) => { const a = smoothstep(0.96, 1.1, y), c = smoothstep(1.15, 1.3, y), n = smoothstep(1.47, 1.54, y); w[BI.hips] += u * (1 - a); w[BI.spine] += u * a * (1 - c); w[BI.chest] += u * c * (1 - n); w[BI.neck] += u * n; };
    T.push(trunk);
    const det = [];
    for (const sx of [1, -1]) {
      if (!f) det.push(on(new Ell([sx * 0.064, 1.328 - 0.012 * ag, 0.074 + 0.006 * mu + 0.004 * ms], [0.066 + 0.01 * mu, 0.044, 0.03 + 0.012 * mu + 0.008 * ms], S.euler(0.15 + 0.3 * ag, sx * 0.28, 0)), 'chest'));
      else det.push(on(new Ell([sx * 0.056, 1.282 - 0.018 * ag, 0.071 + 0.006 * ms], [0.058 + 0.008 * ms, 0.056 + 0.006 * ms, 0.05 + 0.01 * ms], S.euler(0.3 + 0.2 * ag, sx * 0.32, 0)), 'chest'));
      det.push(on(new Ell([sx * W(f, 0.062, 0.066), W(f, 0.895, 0.892), W(f, -0.072, -0.076)], [W(f, 0.068, 0.074) + 0.01 * ms, W(f, 0.076, 0.08), W(f, 0.045, 0.048) + 0.008 * ms], S.euler(0, sx * 0.2, 0)), 'hips'));
      det.push(on(new RCone([sx * 0.02, 1.463, 0.057], [sx * (R.shx - 0.04), 1.474, 0.016], 0.011, 0.011), 'chest'));
      det.push(on(new RCone([sx * 0.035, W(f, 1.513, 1.507), -0.03], [sx * (R.shx - 0.03), 1.468, -0.017], W(f, 0.038, 0.031) + 0.012 * mu, W(f, 0.034, 0.028) + 0.004 * mu), 'chest'));
      det.push(on(new Ell([sx * (R.shx - 0.004), 1.458, -0.004], [0.046 + 0.006 * mu, 0.045, 0.05 + 0.004 * mu], S.euler(0, 0, sx * -0.35)), sx > 0 ? 'shL' : 'shR', 'chest', 0.4, 1.0)); // deltoid: follows the arm, its top stays on the shoulder
      det.push(on(new Ell([sx * 0.1, 1.3, -0.032], [0.045 + 0.016 * mu, 0.11, 0.048]), 'chest'));
    }
    T.push(...det);
    // neck stub (the head piece wraps it)
    const nr = NECK_R[sex] - 0.003;
    N.push(on(new RCone([0, 1.44, -0.014], [0, 1.575, -0.009], nr, nr * 0.93), 'neck', 'head', 0.7, 1));
    // ---- limbs: lofts in the bone frames; x of the right side is mirrored
    // limb lofts: the end toward the body is only slightly rounded (a full cap would stand out of the shoulder or the hip)
    const loft = (tab, R0, bone, sx, k, cap = 0.9) => new S.Loft(tab.map(([y, a, zf, zb, xc, zc]) => [y, a * k.a, zf * k.z, zb * k.b, sx * xc, zc]), R0.W[BI[bone]], 0, [0.9, cap]).on(bone);
    for (let s = 0; s < 2; s++) {
      const sx = s ? -1 : 1, sh = s ? 'shR' : 'shL', el = s ? 'elR' : 'elL', hp = s ? 'hipR' : 'hipL', kn = s ? 'knR' : 'knL', an = s ? 'anR' : 'anL';
      const ka = { a: W(f, 1, 0.86) + 0.28 * ms + 0.22 * mu, z: W(f, 1, 0.86) + 0.22 * ms + 0.26 * mu, b: W(f, 1, 0.86) + 0.3 * ms + 0.2 * mu };
      A[s].push(loft(UPPER_ARM, R, sh, sx, ka, 0.25).as('uarm'));
      A[s].push(loft(FOREARM, R, el, sx, { a: W(f, 1, 0.87) + 0.16 * ms + 0.2 * mu, z: W(f, 1, 0.87) + 0.14 * ms + 0.2 * mu, b: W(f, 1, 0.87) + 0.14 * ms + 0.16 * mu }).as('farm'));
      A[s].push(on(new Ell(at(R, el, 0, 0.002, -0.022), [0.022, 0.024, 0.016], axes(R, el)), el));
      const kt = { a: W(f, 1, 1.02) + 0.24 * ms + 0.1 * mu, z: W(f, 1, 1.0) + 0.22 * ms + 0.12 * mu, b: W(f, 1, 1.06) + 0.26 * ms + 0.1 * mu };
      L[s].push(loft(THIGH, R, hp, sx, kt, 0.4).as('thigh'));
      if (f) L[s].push(on(new Ell(at(R, hp, sx * 0.036, -0.055, -0.014), [0.056 + 0.01 * ms, 0.085, 0.064], axes(R, hp)), hp, 'hips', 0, 0.3));
      L[s].push(loft(SHIN, R, kn, sx, { a: W(f, 1, 0.94) + 0.16 * ms + 0.08 * mu, z: W(f, 1, 0.95) + 0.1 * ms, b: W(f, 1, 0.94) + 0.18 * ms + 0.1 * mu }).as('shin'));
      L[s].push(on(new Ell(at(R, kn, 0, 0.004, 0.043), [0.029, 0.033, 0.016], axes(R, kn)), kn));
      L[s].push(on(new Ell(at(R, an, 0, 0.004, -0.004), [0.029, 0.034, 0.03], axes(R, an)), an));
      const fk = W(f, 1, 0.9);
      F[s].push(on(new Ell(at(R, an, 0, -0.066, -0.043 * fk), [0.031 * fk, 0.034, 0.037 * fk], axes(R, an)), an));
      F[s].push(on(new RBox(at(R, an, 0, -0.072, 0.04 * fk), [0.035 * fk, 0.027, 0.07 * fk], 0.022, axes(R, an)), an));
      F[s].push(on(new Ell(at(R, an, 0, -0.088, 0.133 * fk), [0.039 * fk, 0.016, 0.034 * fk], axes(R, an)), an));
    }
    const all = T.concat(N, A[0], A[1], L[0], L[1], F[0], F[1]);
    const pick = (list, tag) => list.find(x => x.tag === tag);
    return { R, T, N, A, L, F, all, f, ms, mu, ag, trunk, sex, uarm: A.map(l => pick(l, 'uarm')), farm: A.map(l => pick(l, 'farm')), thigh: L.map(l => pick(l, 'thigh')), shin: L.map(l => pick(l, 'shin')) };
  }
  // bare skin of a body (joins between regions blend)
  function skin(B, o = {}) {
    const parts = [U([B.T[0], U(B.T.slice(1), 0.02)], 0.035), U(B.N, 0)];
    for (let s = 0; s < 2; s++) { parts.push(U(B.A[s], 0.03), U(B.L[s], 0.03)); if (!o.noFeet) parts.push(U(B.F[s], 0.012)); }
    return Paint(U(parts, 0.03), SK);
  }

  /* =====================================================================
     HEAD — cranium + a lofted face (horizontal slices from chin to brow)
     + nose, lips, brow, cheekbones, jaw line, ears; eyes sit in cut sockets.
     Head frame: origin on the top of the neck, face toward +z.
     ===================================================================== */
  const FACES = {
    m1: { f: 0, jaw: 1, chinW: 1, chinH: 1, chinD: 1, nose: 1, noseW: 1, lips: 1, mouthW: 1, cheek: 1, cheeks: 1, brow: 0.0065, len: 1 },
    m2: { f: 0, jaw: 1.08, chinW: 1.2, chinH: 1.05, chinD: 1.1, nose: 1.08, noseW: 1.1, lips: 0.9, mouthW: 1.05, cheek: 1.05, cheeks: 0.95, brow: 0.011, len: 1.02 },  // square
    m3: { f: 0, jaw: 0.93, chinW: 0.9, chinH: 1.1, chinD: 0.95, nose: 1.1, noseW: 0.92, lips: 0.92, mouthW: 0.95, cheek: 1.1, cheeks: 0.9, brow: 0.006, len: 1.04 }, // long, thin
    m4: { f: 0, jaw: 1.04, chinW: 1.05, chinH: 0.92, chinD: 0.95, nose: 0.95, noseW: 1.28, lips: 1.25, mouthW: 1.08, cheek: 1, cheeks: 1.12, brow: 0.007, len: 0.98 }, // broad nose, full lips
    f1: { f: 1, jaw: 0.9, chinW: 0.85, chinH: 0.92, chinD: 0.9, nose: 0.8, noseW: 0.88, lips: 1.2, mouthW: 0.95, cheek: 1.05, cheeks: 1, brow: 0.003, len: 0.97 },
    f2: { f: 1, jaw: 0.94, chinW: 0.9, chinH: 0.95, chinD: 0.92, nose: 0.84, noseW: 1.18, lips: 1.38, mouthW: 1.05, cheek: 1.1, cheeks: 1.05, brow: 0.003, len: 0.97 }, // full lips
    f3: { f: 1, jaw: 0.87, chinW: 0.8, chinH: 1.02, chinD: 0.88, nose: 0.84, noseW: 0.85, lips: 1.1, mouthW: 0.92, cheek: 1.15, cheeks: 0.92, brow: 0.003, len: 0.99 }, // heart-shaped
    f4: { f: 1, jaw: 0.97, chinW: 0.95, chinH: 0.9, chinD: 0.9, nose: 0.8, noseW: 0.95, lips: 1.14, mouthW: 1, cheek: 1, cheeks: 1.14, brow: 0.003, len: 0.95 }, // round
    mo: { f: 0, jaw: 1, chinW: 1, chinH: 0.95, chinD: 0.9, nose: 1.12, noseW: 1.08, lips: 0.82, mouthW: 1, cheek: 0.92, cheeks: 0.84, brow: 0.01, len: 1, old: 1 },
    fo: { f: 1, jaw: 0.92, chinW: 0.88, chinH: 0.92, chinD: 0.88, nose: 0.95, noseW: 0.95, lips: 0.9, mouthW: 0.95, cheek: 0.95, cheeks: 0.86, brow: 0.003, len: 0.98, old: 1 },
    br: { f: 0, jaw: 1.15, chinW: 1.3, chinH: 1.08, chinD: 1.15, nose: 1.05, noseW: 1.2, lips: 0.95, mouthW: 1.08, cheek: 1.1, cheeks: 1, brow: 0.012, len: 1.03 }   // brute
  };
  const EYE = { x: 0.031, y: 0.093, z: 0.0642, r: 0.0122 };
  const NECK_R = { m: 0.058, f: 0.049 };
  /* One lofted volume from the mouth to the crown: horizontal slices [y, half width, front z, back z, front exponent,
     back exponent] (the front of the slices is flatter across the face, V-shaped toward the jaw). Above the brow the
     slices are the same for every face, so hair and hats fit everyone; below, they follow the face preset. The jaw is
     a U of round cones under the loft (a clean jaw line, hollow under it where the neck comes in). */
  const HEAD = [[0.122, 0.0765, 0.087, -0.109, 2.5, 2.2], [0.106, 0.0755, 0.084, -0.106, 2.6, 2.2], [0.092, 0.074, 0.08, -0.1, 2.7, 2.25],
    [0.075, 0.072, 0.082, -0.092, 2.7, 2.3], [0.058, 0.068, 0.086, -0.082, 2.5, 2.3], [0.042, 0.063, 0.089, -0.074, 2.2, 2.3], [0.027, 0.06, 0.089, -0.07, 2.0, 2.3],
    [0.014, 0.057, 0.088, -0.067, 1.85, 2.3], [0.002, 0.05, 0.086, -0.064, 1.7, 2.3], [-0.01, 0.038, 0.083, -0.06, 1.6, 2.3], [-0.021, 0.025, 0.077, -0.05, 1.6, 2.2], [-0.03, 0.012, 0.066, -0.03, 1.8, 2]];
  const DEF_FACE = { f: 0, jaw: 1, chinW: 1, chinH: 1, chinD: 1, nose: 1, noseW: 1, lips: 1, mouthW: 1, cheek: 1, cheeks: 1, brow: 0.009, len: 1 };
  function headLoft(F) {
    F = F || DEF_FACE; const f = F.f || 0, L = F.len || 1;
    const rings = HEAD.map(([y, w, zf, zb, pf, pb]) => {
      const low = 1 - smoothstep(0.02, 0.1, y), mid = smoothstep(0.02, 0.05, y) * (1 - smoothstep(0.06, 0.09, y)), chin = 1 - smoothstep(-0.02, 0.01, y);
      let ya = y < 0.1 ? 0.1 - (0.1 - y) * L : y; if (y < 0) ya += y * (F.chinH - 1);
      const W = w * (1 + (F.jaw - 1) * low * 0.9) * (1 + (F.chinW - 1) * chin) * (1 + (F.cheeks - 1) * mid * 0.5) * (f ? 1 - 0.07 * low : 1);
      const Zf = zf + (f ? 0.003 * smoothstep(0.13, 0.17, y) * (1 - smoothstep(0.19, 0.21, y)) : 0) + (F.chinD - 1) * 0.02 * low;
      const zc = (Zf + zb) / 2, e = (Zf - zb) / 2;  // centred between the front and back of the slice
      return [ya, W, e, e, 0, zc, pf + (f ? 0.25 * low : 0) + (F.chinW - 1) * chin, pb];
    });
    // the top of the skull: an ellipsoid over the loft (a loft cannot close a dome without a rim)
    return U([new S.Loft(rings, null, 0, [0.35, 0.9]), new Ell([0, 0.13, -0.012], [0.0762, 0.088, 0.097])], 0.012);
  }
  // cranium shared by all faces (hair, hats, masks are built on it)
  let _skull = null;
  function skull() { return [_skull || (_skull = headLoft(null))]; }
  function head(F) {
    const f = F.f, L = F.len || 1, dy = -0.02 * (L - 1);
    const base = headLoft(F), feat = [], jawS = [];
    // chin pad and (men) the corners of the jaw
    jawS.push(new Ell([0, -0.014 * F.chinH + dy, 0.068 * F.chinD], [0.018 * F.chinW, 0.013 * F.chinH, 0.012 * F.chinD]));
    if (!f) for (const sx of [1, -1]) jawS.push(new Ell([sx * 0.05 * F.jaw, 0.02 + dy * 0.5, -0.004], [0.011, 0.016, 0.02], S.euler(0.5, 0, 0)));
    if (F.old) for (const sx of [1, -1]) jawS.push(new Ell([sx * 0.047, 0.012 + dy, 0.035], [0.014, 0.018, 0.02])); // jowls
    for (const sx of [1, -1]) {
      if (F.brow > 0.004) feat.push(new RCone([sx * 0.047, 0.108, 0.071 - F.brow * 0.3], [sx * 0.011, 0.11, 0.084 - F.brow * 0.35], F.brow * 0.8, F.brow));
      feat.push(new Ell([sx * 0.054, 0.077, 0.05], [0.014 * F.cheek, 0.01, 0.013], S.euler(0.1, sx * 0.6, 0)));           // cheekbones
      if (F.cheeks > 1.05) feat.push(new Ell([sx * 0.042, 0.055 + dy * 0.5, 0.064], [0.015 * F.cheeks, 0.015, 0.012]));  // round cheeks
      feat.push(new Ell([sx * 0.0125 * F.noseW, 0.1 - 0.05 * F.nose, 0.083 + 0.007 * F.nose], [0.0074 * F.noseW, 0.0068 * F.nose, 0.0074 * F.nose])); // nostril wings
    }
    // nose: bridge from between the eyes to the tip, rounded tip
    feat.push(new RCone([0, 0.101, 0.081], [0, 0.101 - 0.043 * F.nose, 0.083 + 0.017 * F.nose], 0.006 * Math.sqrt(F.noseW), 0.0092 * F.noseW * Math.sqrt(F.nose)));
    feat.push(new Ell([0, 0.1 - 0.047 * F.nose, 0.083 + 0.0145 * F.nose], [0.0112 * F.noseW, 0.0098 * F.nose, 0.0105 * F.nose]));
    const lips = [new Ell([0, 0.0295 + dy * 0.3, 0.0875], [0.0205 * F.mouthW, 0.0056 * F.lips, 0.0074 * Math.sqrt(F.lips)], S.euler(-0.25, 0, 0), LIP),
      new Ell([0, 0.0187 + dy * 0.3, 0.0855], [0.0178 * F.mouthW, 0.0066 * F.lips, 0.0078 * Math.sqrt(F.lips)], S.euler(0.3, 0, 0), LIP)];
    const ears = [];
    for (const sx of [1, -1]) ears.push(new Ell([sx * 0.074, 0.086, -0.015], [0.0075, 0.027, 0.0155], S.euler(0.12, sx * 0.35, 0)), new Ell([sx * 0.077, 0.069, -0.012], [0.0055, 0.01, 0.0075]));
    const nk = NECK_R[f ? 'f' : 'm'];
    const neck = [new RCone([0, -0.15, -0.016], [0, 0.02, -0.018], nk + 0.001, nk * 0.95)];
    if (!f) neck.push(new Ell([0, -0.036, 0.042], [0.01, 0.015, 0.009]));
    let h = U([base, U(jawS, 0.01)], 0.012);
    h = U([h, U(feat, 0.006)], 0.01);
    h = U([h, U(lips, 0.004), ...ears], 0.006);
    h = U([h, U(neck, 0.01)], 0.022);
    for (const sx of [1, -1]) h = Cut(h, new Ell([sx * EYE.x, EYE.y - 0.0013, 0.0748], [0.016, 0.0051, 0.012], S.euler(0, 0, sx * 0.08)), 0.0026); // lids: the upper one covers the top of the iris
    const all = [...base.c, ...jawS, ...feat, ...lips, ...neck, ...ears];
    for (const s of all) s.on('head');
    neck[0].on('neck', 'head', 0.55, 0.95);
    return { sdf: Paint(h, SK), F, solids: all, base };
  }

  /* =====================================================================
     HANDS — five fingers; poses: relax, fist, grip, open (left hand, in the
     hand bone's frame: fingers toward -y, palm toward -x, thumb toward +z)
     ===================================================================== */
  // per pose: flexion of each finger at its three joints (index, middle, ring, little), spread, and the thumb's joints
  const POSES = {
    relax: { mcp: [0.28, 0.32, 0.38, 0.45], pip: [0.4, 0.48, 0.52, 0.56], dip: [0.22, 0.26, 0.28, 0.3], spread: 0.05,
      th: [[-0.008, -0.02, 0.024], [-0.016, -0.051, 0.04], [-0.025, -0.073, 0.046], [-0.032, -0.092, 0.046]] },
    fist: { mcp: [1.45, 1.5, 1.52, 1.52], pip: [1.72, 1.75, 1.75, 1.72], dip: [0.9, 0.95, 0.95, 0.95], spread: 0,
      th: [[-0.008, -0.02, 0.024], [-0.023, -0.05, 0.036], [-0.044, -0.068, 0.024], [-0.054, -0.076, 0.004]] },
    grip: { mcp: [1.05, 1.1, 1.15, 1.2], pip: [1.22, 1.26, 1.3, 1.3], dip: [0.62, 0.66, 0.68, 0.7], spread: 0.02,
      th: [[-0.008, -0.02, 0.024], [-0.024, -0.049, 0.036], [-0.043, -0.066, 0.03], [-0.052, -0.079, 0.016]] },
    open: { mcp: [0.06, 0.04, 0.06, 0.1], pip: [0.1, 0.08, 0.1, 0.12], dip: [0.06, 0.05, 0.06, 0.08], spread: 0.15,
      th: [[-0.006, -0.02, 0.025], [-0.009, -0.05, 0.051], [-0.011, -0.073, 0.065], [-0.013, -0.092, 0.074]] }
  };
  function hand(f, pose) {
    const k = f ? 0.9 : 1, Pz = POSES[pose], parts = [];
    const v = p => [p[0] * k, p[1] * k, p[2] * k];
    // wrist, palm, thenar and hypothenar pads, knuckle ridge
    parts.push(new Ell(v([0, 0.004, 0]), [0.019 * k, 0.022 * k, 0.027 * k]));
    parts.push(new RBox(v([-0.002, -0.052, -0.002]), [0.0135 * k, 0.047 * k, 0.04 * k], 0.012 * k));
    parts.push(new Ell(v([-0.009, -0.036, 0.019]), [0.013 * k, 0.03 * k, 0.018 * k]));
    parts.push(new Ell(v([-0.008, -0.052, -0.024]), [0.011 * k, 0.034 * k, 0.014 * k]));
    // fingers (index, middle, ring, little): each bends toward the palm (-x); spread turns it in the palm plane
    const base = [[0.028, -0.097], [0.009, -0.101], [-0.01, -0.099], [-0.027, -0.092]];
    const len = [[0.043, 0.026, 0.02], [0.047, 0.029, 0.021], [0.044, 0.028, 0.02], [0.034, 0.021, 0.018]];
    const rad = [0.0092, 0.0095, 0.009, 0.008];
    for (let i = 0; i < 4; i++) {
      const s = (1.5 - i) * Pz.spread, ang = [Pz.mcp[i], Pz.pip[i], Pz.dip[i]];
      let p = [0, base[i][1], base[i][0]], flex = 0;
      for (let j = 0; j < 3; j++) {
        flex += ang[j];
        const d = [-Math.sin(flex), -Math.cos(flex) * Math.cos(s), Math.cos(flex) * Math.sin(s)];
        const q = [p[0] + d[0] * len[i][j], p[1] + d[1] * len[i][j], p[2] + d[2] * len[i][j]];
        const r0 = rad[i] * (1 - j * 0.1), r1 = rad[i] * (1 - (j + 1) * 0.1) * (j === 2 ? 0.9 : 1);
        parts.push(new RCone(v(p), v(q), r0 * k, r1 * k));
        p = q;
      }
    }
    // thumb through its four key points
    const th = Pz.th, R3 = [0.0128, 0.0112, 0.0098, 0.0085];
    for (let j = 0; j < 3; j++) parts.push(new RCone(v(th[j]), v(th[j + 1]), R3[j] * k, R3[j + 1] * k));
    return Paint(U(parts, 0.007 * k), GLOVE);
  }

  /* =====================================================================
     CLOTHES — shells grown from the body solids, clipped at hems and cuffs
     ===================================================================== */
  const above = y => S.plane([0, y, 0], [0, -1, 0]);   // keeps y > y0
  const below = y => S.plane([0, y, 0], [0, 1, 0]);    // keeps y < y0
  const boneY = (R, bone) => { const m = R.W[BI[bone]]; return S.norm3([m[4], m[5], m[6]]); };
  // keeps the part of a limb between its root and local height y (a cuff / hem across the bone)
  const across = (R, bone, y) => { const d = boneY(R, bone); return S.plane(at(R, bone, 0, y, 0), [-d[0], -d[1], -d[2]]); };
  const frame = (R, bone, rx, ry, rz) => M4.mul(M4.create(), R.W[BI[bone]], M4.compose(M4.create(), 0, 0, 0, rx || 0, ry || 0, rz || 0));
  /* garments are layers: the skin grown by t, kept inside a bounded region (the modelling pose keeps the limbs apart,
     so boxes and capsules can tell the trunk from the arms and legs); extras are joined on top */
  function region(B, r) {
    const R = B.R, parts = [], top = r.top || 1.66;
    if (r.torso !== false) parts.push(new RBox([0, (r.hem + top) / 2, 0], [R.shx + 0.035, (top - r.hem) / 2, 0.36], 0));
    for (let s = 0; s < 2 && r.sleeve; s++) {
      const sh = s ? 'shR' : 'shL', el = s ? 'elR' : 'elL', len = r.sleeve;
      if (len <= 0.28) parts.push(Clip(new RCone(at(R, sh, 0, 0.1, 0), at(R, sh, 0, -len - 0.03, 0), 0.12, 0.1), across(R, sh, -len)));
      else parts.push(new RCone(at(R, sh, 0, 0.1, 0), at(R, sh, 0, -0.29, 0), 0.12, 0.1), Clip(new RCone(at(R, el, 0, 0.04, 0), at(R, el, 0, -(len - 0.28) - 0.03, 0), 0.1, 0.09), across(R, el, -(len - 0.28))));
    }
    let g = parts.length > 1 ? U(parts, 0) : parts[0];
    const nr = NECK_R[B.sex] + (r.neckGap || 0.012);
    if (r.neck !== 'high') g = Cut(g, new RCone([0, 1.36, -0.012], [0, 1.8, -0.008], nr, nr), 0);
    if (r.neck === 'v') g = Cut(g, new RBox([0, 1.465, 0.13], [0.05, 0.05, 0.11], 0, S.euler(0, 0, Math.PI / 4)), 0);
    if (r.neck === 'deep') g = Cut(g, new RBox([0, 1.42, 0.13], [0.06, 0.06, 0.11], 0, S.euler(0, 0, Math.PI / 4)), 0);
    if (r.neck === 'wide') g = Cut(g, new Ell([0, 1.52, 0.0], [0.13, 0.06, 0.13]), 0);
    if (r.arms === 'holes') for (const sx of [1, -1]) g = Cut(g, new Ell([sx * (R.shx + 0.01), 1.38, -0.005], [0.075, 0.11, 0.085]), 0);
    if (r.open) g = Cut(g, new RBox([0, (r.hem + 1.4) / 2, 0.2], [r.open, (1.4 - r.hem) / 2 + 0.01, 0.13], 0), 0);
    return g;
  }
  // upper garment layer: o = { t, hem, sleeve (length from the shoulder), neck, slot, vol (loose volume), arms }
  const upper = (B, o) => ({ t: o.t || 0.006, slot: o.slot === undefined ? TOP : o.slot, region: region(B, o), vol: o.vol || null, k: o.k || 0, fade: o.fade, edge: o.edge, paint: o.paint || null });
  // lower garment layer: o = { t, waist, cuff (height of the leg ends), slot }
  const lower = (B, o) => ({ t: o.t || 0.006, slot: o.slot === undefined ? BOT : o.slot, region: new RBox([0, ((o.cuff || 0.1) + (o.waist || 1.0)) / 2, 0], [0.33, ((o.waist || 1.0) - (o.cuff || 0.1)) / 2, 0.36], 0), vol: o.vol || null, k: o.k || 0, fade: o.fade, edge: o.edge, paint: o.paint || null });
  // straight trouser legs (roomy from the knee down): a volume joined to a pants layer
  const trouserLegs = (B, r) => U([0, 1].map(s => new S.Loft([[0.05, r + 0.006, r + 0.006, r + 0.006], [-0.2, r, r, r], [-0.44, r - 0.004, r, r]], B.R.W[BI[s ? 'knR' : 'knL']], 0, [0.5, 0.2])), 0);
  // skirt / coat tail: an elliptic cone from the hips down to the hem, joined to a layer
  function skirtVol(B, o) {
    const y0 = o.y0 || 0.93, y1 = o.y1 || 0.55, r0 = (o.r0 || (B.f ? 0.178 : 0.165)) + 0.024 * B.ms, r1 = (o.r1 || 0.2) + 0.02 * B.ms, h = (y0 - y1) / 2;
    const c = new Cone([0, (y0 + y1) / 2, o.z || -0.012], h, r1, r0, o.ez || 0.78, null, 0, 0.005);
    c.tag = 'skirt'; c.wstiff = o.stiff === undefined ? 0.5 : o.stiff;
    return c;
  }
  // collar standing around the neck (shirts, jackets, coats); h: height, open: gap at the front
  function collar(B, o) {
    const nr = NECK_R[B.sex] + 0.017, h = o.h || 0.035, y = o.y || 1.44;
    const ring = new S.Loft([[y, nr + 0.012, nr + 0.012, nr + 0.012, 0, -0.012], [y + h * 0.6, nr + 0.006, nr + 0.004, nr + 0.008, 0, -0.012], [y + h, nr + 0.004, nr, nr + 0.007, 0, -0.01]], null, 0, [0.4, 0.4]);
    let c = Cut(ring, new RCone([0, 1.38, -0.012], [0, 1.65, -0.008], nr - 0.004, nr - 0.004), 0.002);
    if (o.open) c = Cut(c, new RBox([0, y + 0.05, 0.07], [o.open, 0.08, 0.04], 0.004), 0.003);
    return Paint(c, o.slot === undefined ? TOP : o.slot);
  }
  // hood hanging down the back of the neck (hoodies)
  const hoodDown = (B, slot) => Paint(U([new Ell([0, 1.5, -0.085], [0.11, 0.055, 0.06]), new Ell([0, 1.455, -0.1], [0.085, 0.05, 0.045])], 0.02), slot);
  // belt ring at the waist
  const beltRing = (B, y, t, slot) => ({ t: t || 0.013, slot, region: new RBox([0, y, 0], [0.33, 0.018, 0.36], 0) });
  // a flat patch on the skin (pockets, plates, pouches): rounded box in model space
  const patch = (c, h, r, slot, R0) => Paint(new RBox(c, h, r, R0 || null), slot);
  // the dressed body: skin + garment layers (inner first) + extras
  function dress(B, layers, extras) { return S.L(skin(B, { noFeet: true }), layers.filter(Boolean), extras && extras.length ? U(extras.filter(Boolean), 0.004) : null); }

  /* ---------- shoes: lofts along the foot (frame: local y forward, local z down) ---------- */
  const SHOES = {
    sneaker: { up: [[-0.092, 0.035, 0.034, 0.036, 0, 0.056], [-0.045, 0.043, 0.047, 0.05, 0, 0.047], [0.02, 0.047, 0.038, 0.038, 0, 0.057], [0.085, 0.05, 0.026, 0.026, 0, 0.07], [0.14, 0.048, 0.019, 0.02, 0, 0.076], [0.172, 0.037, 0.014, 0.015, 0, 0.08], [0.188, 0.02, 0.008, 0.009, 0, 0.084]],
      sole: [[-0.096, 0.036, 0.011, 0.011, 0, 0.093], [-0.05, 0.046, 0.011, 0.011, 0, 0.093], [0.02, 0.049, 0.011, 0.011, 0, 0.093], [0.09, 0.054, 0.011, 0.011, 0, 0.093], [0.15, 0.051, 0.01, 0.011, 0, 0.092], [0.183, 0.036, 0.009, 0.01, 0, 0.089], [0.197, 0.018, 0.007, 0.008, 0, 0.086]] },
    boot: { up: [[-0.09, 0.037, 0.036, 0.04, 0, 0.056], [-0.045, 0.045, 0.048, 0.056, 0, 0.045], [0.02, 0.048, 0.04, 0.04, 0, 0.056], [0.085, 0.051, 0.028, 0.028, 0, 0.068], [0.14, 0.049, 0.021, 0.022, 0, 0.074], [0.172, 0.039, 0.016, 0.017, 0, 0.078], [0.19, 0.022, 0.009, 0.01, 0, 0.083]],
      sole: [[-0.095, 0.038, 0.012, 0.012, 0, 0.092], [-0.05, 0.047, 0.012, 0.012, 0, 0.092], [0.02, 0.05, 0.012, 0.012, 0, 0.092], [0.09, 0.055, 0.012, 0.012, 0, 0.092], [0.15, 0.052, 0.012, 0.012, 0, 0.092], [0.185, 0.038, 0.01, 0.011, 0, 0.09], [0.198, 0.02, 0.008, 0.009, 0, 0.087]], shaft: 0.17 },
    dress: { up: [[-0.09, 0.033, 0.03, 0.03, 0, 0.066], [-0.045, 0.04, 0.036, 0.04, 0, 0.06], [0.02, 0.044, 0.03, 0.03, 0, 0.066], [0.085, 0.046, 0.021, 0.022, 0, 0.076], [0.14, 0.042, 0.015, 0.016, 0, 0.082], [0.175, 0.03, 0.011, 0.011, 0, 0.086], [0.195, 0.014, 0.006, 0.006, 0, 0.09]],
      sole: [[-0.094, 0.034, 0.006, 0.006, 0, 0.098], [-0.05, 0.042, 0.006, 0.006, 0, 0.098], [0.02, 0.045, 0.006, 0.006, 0, 0.098], [0.09, 0.049, 0.006, 0.006, 0, 0.098], [0.15, 0.045, 0.006, 0.006, 0, 0.098], [0.182, 0.031, 0.005, 0.005, 0, 0.097], [0.2, 0.012, 0.004, 0.004, 0, 0.095]], heel: 0.018 },
    heel: { up: [[-0.085, 0.028, 0.02, 0.028, 0, 0.03], [-0.04, 0.034, 0.022, 0.03, 0, 0.05], [0.02, 0.038, 0.018, 0.022, 0, 0.074], [0.08, 0.042, 0.014, 0.016, 0, 0.088], [0.13, 0.04, 0.012, 0.012, 0, 0.09], [0.165, 0.026, 0.009, 0.008, 0, 0.092], [0.182, 0.01, 0.005, 0.004, 0, 0.094]],
      sole: [[0.04, 0.036, 0.004, 0.004, 0, 0.1], [0.09, 0.043, 0.004, 0.004, 0, 0.1], [0.14, 0.04, 0.004, 0.004, 0, 0.1], [0.168, 0.026, 0.004, 0.004, 0, 0.1], [0.184, 0.01, 0.003, 0.003, 0, 0.099]], spike: true },
    flat: { up: [[-0.088, 0.032, 0.026, 0.02, 0, 0.074], [-0.045, 0.038, 0.03, 0.022, 0, 0.072], [0.02, 0.042, 0.024, 0.014, 0, 0.082], [0.085, 0.045, 0.017, 0.016, 0, 0.083], [0.14, 0.042, 0.014, 0.014, 0, 0.086], [0.172, 0.03, 0.01, 0.01, 0, 0.089], [0.188, 0.014, 0.006, 0.006, 0, 0.092]],
      sole: [[-0.09, 0.033, 0.004, 0.004, 0, 0.1], [-0.045, 0.04, 0.004, 0.004, 0, 0.1], [0.02, 0.043, 0.004, 0.004, 0, 0.1], [0.09, 0.047, 0.004, 0.004, 0, 0.1], [0.15, 0.043, 0.004, 0.004, 0, 0.1], [0.178, 0.028, 0.004, 0.004, 0, 0.099], [0.192, 0.012, 0.003, 0.003, 0, 0.098]] }
  };
  function shoe(B, s, kind) {
    const R = B.R, an = s ? 'anR' : 'anL', D = SHOES[kind] || SHOES.sneaker, F = frame(R, an, Math.PI / 2, 0, 0), k = B.f ? 0.91 : 1;
    const sc = r => [r[0] * k, r[1] * k, r[2], r[3], r[4], r[5]];
    const parts = [Paint(new S.Loft(D.up.map(sc), F, 0, [0.7, 0.8], [2.6, 2.4]), SHOE), Paint(new S.Loft(D.sole.map(sc), F, 0, [0.6, 0.6], [4, 4]), SOLE)];
    if (D.shaft) parts.push(Paint(new S.Loft([[-0.035, 0.047, 0.052, 0.052, 0, 0], [0.06, 0.045, 0.048, 0.047, 0, -0.002], [D.shaft, 0.047, 0.049, 0.048, 0, -0.004]], R.W[BI[an]], 0, [0.3, 0.2]), SHOE));
    if (D.heel) parts.push(Paint(new RBox(at(R, an, 0, -0.098 + D.heel / 2, -0.07 * k), [0.03 * k, D.heel / 2 + 0.004, 0.028 * k], 0.004, axes(R, an)), SOLE));
    if (D.spike) parts.push(Paint(new RCone(at(R, an, 0, -0.03, -0.074 * k), at(R, an, 0, -0.1, -0.068 * k), 0.012, 0.006), SOLE));
    for (const q of parts) q.a && (q.a.tag = 'shoe');
    return U(parts, 0.004);
  }

  /* =====================================================================
     HAIR & HEADWEAR (head frame), built on the shared skull
     ===================================================================== */
  // height of the hairline around the head (angle 0 = front, pi = back)
  const HL = [[0, 0.162], [0.35, 0.158], [0.6, 0.142], [0.85, 0.122], [1.0, 0.09], [1.12, 0.085], [1.25, 0.118], [1.65, 0.118], [1.95, 0.07], [2.4, 0.028], [Math.PI, 0.02]];
  function hairlineY(x, z, lower) {
    const a = Math.abs(Math.atan2(x, z + 0.01)); let i = 0; while (i < HL.length - 2 && HL[i + 1][0] < a) i++;
    const t = smoothstep(HL[i][0], HL[i + 1][0], a); return HL[i][1] + (HL[i + 1][1] - HL[i][1]) * t - (lower || 0);
  }
  const hairRegion = (lower, top) => new S.Fn((x, y, z) => (hairlineY(x, z, lower) - y) * 0.8 + (top !== undefined ? Math.max(0, (top - y) * 0.8) * 0 : 0), null);
  const skullU = () => U(skull(), 0.03);
  // hair styles: returns { sdf, keep, tail } (tail: parts weighted to the swinging tail bone)
  function hair(style) {
    const sk = skullU(), reg = hairRegion(0), R0 = [];
    const thick = (t0, t1) => S.D(sk, (x, y, z) => t0 + (t1 - t0) * smoothstep(0.1, 0.2, y), t1 + 0.01);
    let h, tail = null;
    switch (style) {
      case 'buzz': h = Clip(Grow(sk, 0.0028), reg); break;
      case 'short': h = Clip(U([thick(0.006, 0.016), new Ell([0, 0.168, 0.05], [0.058, 0.03, 0.04])], 0.03), reg); break;
      case 'crop': h = Clip(U([thick(0.007, 0.014), new Ell([0, 0.158, 0.068], [0.06, 0.022, 0.03])], 0.02), hairRegion(-0.012)); break;
      case 'slick': h = Clip(U([thick(0.006, 0.012), new Ell([0, 0.175, 0.03], [0.064, 0.035, 0.06])], 0.03), reg); break;
      case 'curly': h = Clip(S.D(thick(0.012, 0.024), (x, y, z) => 0.0035 * Math.sin(x * 180) * Math.sin(y * 170) * Math.sin(z * 160), 0.005), reg); break;
      case 'afro': h = Clip(S.D(new Ell([0, 0.145, -0.012], [0.112, 0.108, 0.122]), (x, y, z) => 0.004 * Math.sin(x * 150) * Math.sin(y * 140) * Math.sin(z * 130), 0.006), hairRegion(0.01)); break;
      case 'balding': h = Clip(Clip(thick(0.005, 0.008), reg), below(0.15)); break;
      case 'bob': h = Cut(Clip(U([thick(0.012, 0.02), new Ell([0, 0.075, -0.02], [0.088, 0.105, 0.1])], 0.03), above(-0.02)), U([new Ell([0, 0.055, 0.105], [0.064, 0.1, 0.085]), new RBox([0, -0.05, 0.1], [0.07, 0.07, 0.1], 0.02)], 0.02), 0.008); break;
      case 'long': {
        const back = new S.Loft([[0.12, 0.078, 0.03, 0.05, 0, -0.05], [0.0, 0.085, 0.035, 0.045, 0, -0.07], [-0.12, 0.08, 0.025, 0.035, 0, -0.085], [-0.25, 0.07, 0.018, 0.022, 0, -0.09]], null, 0, [0.6, 0.3]);
        h = U([Clip(thick(0.01, 0.018), hairRegion(0)), Clip(back, S.plane([0, 0, 0.0], [0, 0, 1])), ...[1, -1].map(sx => new Ell([sx * 0.071, 0.03, -0.012], [0.022, 0.095, 0.05]))], 0.025);
        tail = (x, y, z) => smoothstep(0.03, -0.2, y);
        break;
      }
      case 'pony': {
        const tie = new Torus([0, 0.13, -0.1], 0.012, 0.007, S.euler(1.3, 0, 0));
        const pony = new S.Loft([[0.13, 0.02, 0.02, 0.02, 0, -0.112], [0.07, 0.028, 0.026, 0.026, 0, -0.125], [-0.03, 0.024, 0.022, 0.022, 0, -0.13], [-0.13, 0.012, 0.012, 0.012, 0, -0.128]], null, 0, [0.4, 0.9]);
        h = U([Clip(thick(0.006, 0.01), reg), tie, pony], 0.012);
        tail = (x, y, z) => smoothstep(0.12, 0.06, y) * (z < -0.08 ? 1 : 0);
        break;
      }
      case 'bun': h = U([Clip(thick(0.009, 0.016), reg), new Ell([0, 0.188, -0.078], [0.038, 0.034, 0.036])], 0.014); break;
      case 'braids': {
        const br = [1, -1].map(sx => U([0, 1, 2, 3, 4].map(i => new Ell([sx * 0.035, 0.07 - i * 0.045, -0.1 - i * 0.004], [0.017, 0.028, 0.016])), 0.012));
        h = U([Clip(thick(0.005, 0.008), reg), ...br], 0.012);
        tail = (x, y, z) => smoothstep(0.06, -0.08, y);
        break;
      }
      default: return null;
    }
    return { sdf: Paint(h, HAIR), keep: (x, y, z) => sk.ev(x, y, z) > -0.009, tail };
  }
  // headwear: returns { sdf, keep, slot } (head frame); hood and scarf reach the neck and shoulders
  function hat(kind) {
    const sk = skullU();
    switch (kind) {
      case 'beanie': return { sdf: U([Paint(Clip(S.D(Grow(sk, 0.012), (x, y, z) => 0.0015 * Math.sin(Math.atan2(x, z) * 30), 0.002), hairRegion(0.035)), HAT), Paint(Clip(Clip(Grow(sk, 0.017), hairRegion(0.035)), S.Fn ? new S.Fn((x, y, z) => y - hairlineY(x, z, 0.035) - 0.03, null) : null), HAT)], 0.004), keep: (x, y, z) => sk.ev(x, y, z) > -0.01 };
      case 'cap': return { sdf: U([Paint(Clip(Grow(sk, 0.012), hairRegion(0.012)), HAT), Paint(new RBox([0, 0.158, 0.1], [0.07, 0.004, 0.05], 0.003, S.euler(-0.12, 0, 0)), HAT), Paint(new Ell([0, 0.228, -0.01], [0.009, 0.005, 0.009]), HAT)], 0.006), keep: (x, y, z) => sk.ev(x, y, z) > -0.01 };
      case 'hardhat': return { sdf: U([Paint(Clip(new Ell([0, 0.15, -0.012], [0.098, 0.085, 0.112]), above(0.13)), ACC), Paint(Clip(new Ell([0, 0.132, -0.012], [0.112, 0.012, 0.13]), above(0.126)), ACC), Paint(new Ell([0, 0.225, -0.012], [0.02, 0.012, 0.09]), ACC)], 0.006), keep: (x, y, z) => sk.ev(x, y, z) > -0.012 };
      case 'kepi': return { sdf: U([Paint(new S.Loft([[0.13, 0.08, 0.1, 0.105, 0, -0.012], [0.19, 0.084, 0.108, 0.11, 0, -0.012], [0.21, 0.084, 0.108, 0.11, 0, -0.012]], null, 0, [0.1, 0.25]), HAT), Paint(Clip(new S.Loft([[0.13, 0.081, 0.102, 0.106, 0, -0.012], [0.155, 0.083, 0.105, 0.108, 0, -0.012]], null, 0, [0.1, 0.1]), above(0.128)), ACC), Paint(new RBox([0, 0.132, 0.1], [0.062, 0.004, 0.035], 0.003, S.euler(-0.3, 0, 0)), SOLE)], 0.004), keep: (x, y, z) => sk.ev(x, y, z) > -0.012 };
      case 'helmet': return { sdf: U([Paint(Clip(new Ell([0, 0.14, -0.015], [0.098, 0.1, 0.115]), U([above(0.09), new S.Fn((x, y, z) => z < 0.02 ? -1 : y < 0.12 ? 1 : -1, null)], 0)), HAT), Paint(Clip(new Ell([0, 0.098, 0.035], [0.084, 0.018, 0.074]), above(0.08)), GLOW), ...[1, -1].map(sx => Paint(new Ell([sx * 0.088, 0.09, -0.01], [0.018, 0.03, 0.03]), HAT))], 0.006), keep: (x, y, z) => sk.ev(x, y, z) > -0.012 };
      case 'hood': {
        const shell = U([Grow(sk, 0.03), new S.Loft([[-0.2, 0.15, 0.09, 0.12, 0, -0.03], [-0.1, 0.11, 0.08, 0.1, 0, -0.03], [0.02, 0.095, 0.085, 0.11, 0, -0.02]], null, 0, [0.5, 0.2])], 0.05);
        const face = new Ell([0, 0.06, 0.1], [0.07, 0.11, 0.08]);
        return { sdf: Paint(Clip(Cut(shell, face, 0.02), above(-0.22)), TOP), keep: (x, y, z) => sk.ev(x, y, z) > -0.012 && y > -0.2, body: true };
      }
      case 'scarf': { // headscarf wrapping hair, ears and neck, face open
        const shell = U([Grow(sk, 0.014), new S.Loft([[-0.14, 0.13, 0.1, 0.1, 0, -0.012], [-0.05, 0.075, 0.075, 0.08, 0, -0.012], [0.04, 0.078, 0.07, 0.08, 0, -0.012]], null, 0, [0.4, 0.2])], 0.04);
        return { sdf: Paint(Cut(shell, new Ell([0, 0.07, 0.085], [0.058, 0.085, 0.07]), 0.012), HAT), keep: (x, y, z) => sk.ev(x, y, z) > -0.012, body: true };
      }
      case 'mask': { // tide cult: a smooth glowing face plate
        const plate = Clip(Clip(Grow(U([headLoft(null), new Ell([0, -0.01, 0.07], [0.03, 0.025, 0.02])], 0.02), 0.008), S.plane([0, 0, 0.045], [0, 0, -1])), below(0.14));
        return { sdf: Paint(plate, GLOW), keep: (x, y, z) => true, glowEyes: true };
      }
    }
    return null;
  }
  // beards (head frame): full, goatee, mustache — grown from the face they belong to
  function beard(kind, face) {
    const HD = head(FACES[face] || DEF_FACE), base = HD.sdf;
    const noLips = new Ell([0, 0.024, 0.095], [0.026, 0.012, 0.03]);
    let region;
    if (kind === 'full') region = new S.Fn((x, y, z) => Math.max(y - 0.058 + Math.abs(x) * 0.25, -z + 0.0, -y - 0.05 + Math.max(0, -z) * 0.2), null);
    else if (kind === 'goatee') region = new S.Fn((x, y, z) => Math.max(y - 0.042, Math.abs(x) - 0.026, -z + 0.05), null);
    else region = new S.Fn((x, y, z) => Math.max(Math.abs(y - 0.039) - 0.0065, Math.abs(x) - 0.027, -z + 0.07), null);
    return { sdf: Paint(Clip(Cut(S.D(Grow(base, 0.004), (x, y, z) => 0.0012 * Math.sin(x * 400) * Math.sin(y * 380), 0.002), noLips, 0.004), region), HAIR), keep: (x, y, z) => HD.sdf.ev(x, y, z) > -0.006 };
  }

  /* ---------- eyes: two spheres around the z axis (pupil, iris, white), or closed lids ---------- */
  function eyes(closed, detail = 1) {
    const segs = detail ? 18 : 10, th = detail ? [0, 0.14, 0.17, 0.3, 0.46, 0.52, 0.8, 1.15, 1.6, 2.2, 2.8, Math.PI] : [0, 0.17, 0.5, 1.1, 1.9, 2.8, Math.PI];
    const P = [], Nn = [], M4a = [], I = [];
    for (const sx of [1, -1]) {
      const cx = sx * EYE.x, cy = EYE.y, cz = EYE.z, r = closed ? EYE.r + 0.0014 : EYE.r, lim = closed ? 1.25 : Math.PI;
      const base = P.length / 3, rows = th.filter(t => t <= lim + 1e-6); if (closed && rows[rows.length - 1] < lim) rows.push(lim);
      for (let i = 0; i < rows.length; i++) for (let j = 0; j < segs; j++) {
        const t = rows[i], p = j / segs * TAU, nx = Math.sin(t) * Math.cos(p), ny = Math.sin(t) * Math.sin(p), nz = Math.cos(t);
        P.push(cx + nx * r, cy + ny * r * (closed ? 0.8 : 1), cz + nz * r); Nn.push(nx, ny, nz);
        let slot = EYEW, shade = 1, spec = 1.4;
        if (closed) { slot = SK; shade = Math.abs(ny * r - (-0.0022)) < 0.0012 && t > 0.5 ? 0.4 : 0.95; spec = 0.4; }
        else if (t < 0.155) { slot = IRIS; shade = 0.07; spec = 2; }
        else if (t < 0.5) { slot = IRIS; shade = t > 0.42 ? 0.55 : 1 - (t - 0.155) * 0.6; spec = 2; }
        else shade = t > 1.6 ? 0.55 : 0.95;
        M4a.push(slot, Math.round(shade * 128), Math.round(spec * 128), 0);
      }
      for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < segs; j++) {
        const a = base + i * segs + j, b = base + i * segs + (j + 1) % segs, c = a + segs, d = b + segs;
        I.push(a, c, b, b, c, d);
      }
    }
    const n = P.length / 3;
    return { n, pos: new Float32Array(P), nrm: new Float32Array(Nn), idx: new Uint16Array(I), m4: new Uint8Array(M4a) };
  }

  /* =====================================================================
     piece building: mesh + paint + occlusion + weights, all spread over frames
     ===================================================================== */
  // occlusion from the distance field along the normal (creases, armpits, under the chin, between fingers)
  function* occlusion(M, f, d0, k) {
    const ao = new Float32Array(M.n);
    for (let v = 0; v < M.n; v++) {
      const x = M.pos[v * 3], y = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2], nx = M.nrm[v * 3], ny = M.nrm[v * 3 + 1], nz = M.nrm[v * 3 + 2];
      let occ = 0, w = 1;
      for (let i = 1; i <= 4; i++) { const d = d0 * i; occ += w * Math.max(0, d - f.ev(x + nx * d, y + ny * d, z + nz * d)) / d; w *= 0.6; }
      ao[v] = clamp(1 - occ * k, 0.3, 1);
      if ((v & 255) === 0 && S.deadline !== Infinity && S.now() > S.deadline) yield 0;
    }
    return ao;
  }
  // m4 per vertex: slot, shade (x128), specular (x128), emission / stubble mask (x255)
  function pack(M, ao, paint) {
    const n = M.n, m4 = new Uint8Array(n * 4), o = { slot: 0, shade: 1, spec: 0, emis: 0 };
    for (let v = 0; v < n; v++) {
      o.slot = M.mat[v]; o.shade = (ao ? ao[v] : 1) * (M.shade ? M.shade[v] : 1); o.spec = SPEC[o.slot] || 0.3; o.emis = o.slot === GLOW ? 1 : M.mask ? M.mask[v] : 0;
      if (paint) paint(o, M.pos[v * 3], M.pos[v * 3 + 1], M.pos[v * 3 + 2], M.nrm[v * 3], M.nrm[v * 3 + 1], M.nrm[v * 3 + 2], M.leaf[v]);
      m4[v * 4] = o.slot; m4[v * 4 + 1] = clamp(Math.round(o.shade * 128), 0, 255); m4[v * 4 + 2] = clamp(Math.round(o.spec * 128), 0, 255); m4[v * 4 + 3] = clamp(Math.round(o.emis * 255), 0, 255);
    }
    M.m4 = m4; return M;
  }
  const strip = M => ({ n: M.n, pos: M.pos, nrm: M.nrm, idx: M.idx, m4: M.m4, j: M.j, w: M.w });

  return { SK, LIP, HAIR, IRIS, EYEW, TOP, TOP2, BOT, SHOE, SOLE, ACC, ACC2, GLOVE, LEGS, GLOW, HAT, NPAL, SPEC, rig, at, axes, body, skin, head, headLoft, hand, eyes, region, upper, lower, trouserLegs, skirtVol, collar, hoodDown, beltRing, patch, dress, shoe, hair, hat, beard, hairlineY, frame, across, above, below, FACES, EYE, NECK_R, skull, DEF_FACE, occlusion, pack, strip, POSES };
})();

