/* =====================================================================
   TRAVERSAL — hang, mantle, over-the-top, ladders, chain-link fences
   Moves are laid out in the frame of the edge being climbed (character units):
   l = to the left, y = up from the top edge, f = forward, into the ledge (the wall / fence plane is f = 0).
   Tracks are [u, ...values], interpolated with a monotone cubic (holds stay put, no overshoot).
   ===================================================================== */
function track(K, u, out) {
  const n = K.length, c = K[0].length;
  if (u <= K[0][0]) { for (let j = 1; j < c; j++) out[j - 1] = K[0][j]; return out; }
  if (u >= K[n - 1][0]) { for (let j = 1; j < c; j++) out[j - 1] = K[n - 1][j]; return out; }
  let i = 0; while (i < n - 2 && u > K[i + 1][0]) i++;
  const A = K[i], B = K[i + 1], h = B[0] - A[0], t = (u - A[0]) / h, t2 = t * t, t3 = t2 * t;
  for (let j = 1; j < c; j++) {
    const d = (B[j] - A[j]) / h;
    const dp = i > 0 ? (A[j] - K[i - 1][j]) / (A[0] - K[i - 1][0]) : 0, dn = i + 2 < n ? (K[i + 2][j] - B[j]) / (K[i + 2][0] - B[0]) : 0;
    const m0 = i > 0 && d * dp > 0 ? 2 / (1 / d + 1 / dp) : 0, m1 = i + 2 < n && d * dn > 0 ? 2 / (1 / d + 1 / dn) : 0;
    out[j - 1] = (2 * t3 - 3 * t2 + 1) * A[j] + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * B[j] + (t3 - t2) * h * m1;
  }
  return out;
}
const _tk = [0, 0, 0, 0, 0, 0, 0], _tk2 = [0, 0, 0, 0, 0, 0, 0], _E = [0, 0, 0], _E2 = [0, 0, 0];
const POLE_PULL = [0.4, -1, -0.25], POLE_PRESS = [0.3, 0.55, -1], _pole = [0, 0, 0];
const lerpPole = (a, b, k) => { _pole[0] = lerp(a[0], b[0], k); _pole[1] = lerp(a[1], b[1], k); _pole[2] = lerp(a[2], b[2], k); return _pole; };

// braced hang: hands on the edge, feet against the wall, hips pushed off it
const HANG = { pel: [-0.36, -1.03], hand: [0.24, 0.03, -0.03], footL: [0.13, -1.8, -0.15], footR: [-0.13, -1.74, -0.15] };
// from the hang up onto the ledge: pull, press over the hands, lead foot up, trail leg over, stand
const MANTLE = {
  dur: 0.95,
  pel: [[0, -0.36, -1.03], [0.15, -0.36, -0.93], [0.32, -0.3, -0.55], [0.46, -0.2, -0.2], [0.58, -0.08, 0.03], [0.68, 0.02, 0.36], [0.8, 0.2, 0.5], [0.9, 0.36, 0.74], [1, 0.5, 0.975]],
  // hips pitch, spine, chest, neck, head
  tor: [[0, 0.3, 0.1, 0.05, -0.1, -0.38], [0.15, 0.24, 0.08, 0.05, -0.1, -0.32], [0.32, 0.3, 0.15, 0.1, 0, -0.1], [0.46, 0.45, 0.25, 0.1, 0.05, 0.1], [0.58, 0.55, 0.25, 0.1, 0.05, 0.15], [0.68, 0.6, 0.22, 0.08, 0.05, 0.05], [0.8, 0.45, 0.15, 0.05, 0, 0], [0.9, 0.22, 0.08, 0.02, 0, 0], [1, 0, 0.02, 0, 0, 0.03]],
  // ankles: l, y, f, foot pitch, knee direction (yaw, outward for the lead leg coming up past the wall)
  fR: [[0, -0.13, -1.74, -0.15, 0, -0.45], [0.14, -0.13, -1.6, -0.15, -0.1, -0.45], [0.3, -0.13, -1.3, -0.16, 0, -0.6], [0.44, -0.16, -0.72, -0.36, 0.5, -1], [0.56, -0.16, -0.1, -0.32, 0.6, -1], [0.62, -0.14, 0.26, -0.06, 0.3, -0.6], [0.68, -0.12, 0.102, 0.1, 0, -0.3], [0.9, -0.12, 0.102, 0.1, 0, -0.2], [0.95, -0.12, 0.16, 0.3, 0.1, -0.1], [1, -0.12, 0.102, 0.5, 0, -0.1]],
  fL: [[0, 0.13, -1.8, -0.15, 0, 0.45], [0.3, 0.13, -1.52, -0.16, 0, 0.5], [0.48, 0.13, -1.25, -0.2, 0.2, 0.5], [0.64, 0.14, -0.85, -0.3, 0.5, 0.7], [0.74, 0.16, -0.2, -0.34, 0.6, 1], [0.8, 0.15, 0.24, -0.04, 0.3, 0.6], [0.86, 0.13, 0.102, 0.46, 0, 0.2], [1, 0.13, 0.102, 0.46, 0, 0.1]],
  hw: [[0, 1], [0.6, 1], [0.7, 0]], press: [0.3, 0.46]
};
// over a thin wall or the top rail of a fence: press, tuck the legs through above the rail, drop on the far side
const OVER = {
  dur: 0.85,
  pel: [[0, -0.36, -1.03], [0.2, -0.34, -0.72], [0.38, -0.22, -0.2], [0.52, -0.02, 0.28], [0.64, 0.22, 0.32], [0.78, 0.42, 0.05], [1, 0.52, -0.45]],
  tor: [[0, 0.3, 0.1, 0.05, -0.1, -0.38], [0.2, 0.3, 0.12, 0.05, -0.05, -0.25], [0.38, 0.6, 0.3, 0.12, 0.05, 0.1], [0.52, 0.85, 0.35, 0.15, 0.05, 0.2], [0.64, 0.6, 0.3, 0.1, 0, 0.15], [0.78, 0.25, 0.15, 0.05, 0, 0.05], [1, 0.08, 0.05, 0, 0, 0]],
  fR: [[0, -0.13, -1.74, -0.15, 0, -0.45], [0.2, -0.13, -1.45, -0.15, 0, -0.5], [0.36, -0.14, -0.9, -0.3, 0.4, -0.8], [0.5, -0.15, 0.12, -0.2, 0.6, -0.6], [0.6, -0.15, 0.14, 0.12, 0.5, -0.4], [0.72, -0.14, -0.2, 0.42, 0.3, -0.3], [1, -0.13, -1.2, 0.55, 0.1, -0.2]],
  fL: [[0, 0.13, -1.8, -0.15, 0, 0.45], [0.23, 0.13, -1.5, -0.15, 0, 0.5], [0.39, 0.14, -0.95, -0.3, 0.4, 0.8], [0.53, 0.15, 0.1, -0.22, 0.6, 0.6], [0.63, 0.15, 0.12, 0.1, 0.5, 0.4], [0.75, 0.14, -0.25, 0.42, 0.3, 0.3], [1, 0.13, -1.25, 0.55, 0.1, 0.2]],
  hw: [[0, 1], [0.66, 1], [0.78, 0]], press: [0.25, 0.42]
};
// off the top of a ladder onto the roof: two more rungs holding the rails, lead foot onto the roof, stand
const LADTOP = {
  dur: 1.15,
  pel: [[0, -0.42, -0.575], [0.25, -0.42, -0.2], [0.45, -0.38, 0.12], [0.62, -0.18, 0.45], [0.8, 0.12, 0.78], [1, 0.55, 0.975]],
  tor: [[0, 0.08, 0.04, 0, 0, -0.25], [0.3, 0.1, 0.05, 0.02, 0, -0.2], [0.5, 0.25, 0.12, 0.04, 0, -0.05], [0.62, 0.35, 0.15, 0.05, 0, 0.05], [0.8, 0.22, 0.1, 0.03, 0, 0.02], [1, 0, 0.02, 0, 0, 0.03]],
  // feet: y < 0 = on a rung, counted down from the top rung (-1); y >= 0 = height above the roof
  fR: [[0, -0.12, -4, -0.28, 0, -0.35], [0.2, -0.12, -4, -0.28, 0, -0.35], [0.26, -0.12, -2.6, -0.36, 0.3, -0.4], [0.32, -0.12, -2, -0.28, 0, -0.35], [0.48, -0.12, -2, -0.28, 0, -0.3], [0.55, -0.12, 0.24, -0.08, 0.3, -0.3], [0.62, -0.12, 0.102, 0.22, 0, -0.2], [1, -0.12, 0.102, 0.5, 0, -0.1]],
  fL: [[0, 0.12, -5, -0.28, 0, 0.35], [0.06, 0.12, -5, -0.28, 0, 0.35], [0.12, 0.12, -3.6, -0.36, 0.3, 0.4], [0.18, 0.12, -3, -0.28, 0, 0.35], [0.36, 0.12, -3, -0.28, 0, 0.35], [0.42, 0.12, -1.6, -0.36, 0.3, 0.4], [0.48, 0.12, -1, -0.28, 0, 0.35], [0.66, 0.12, -1, -0.3, 0.1, 0.3], [0.76, 0.13, 0.26, 0.12, 0.3, 0.2], [0.86, 0.13, 0.102, 0.52, 0, 0.1], [1, 0.13, 0.102, 0.52, 0, 0.1]],
  // hands on the side rails, height above the roof
  hL: [[0, 0.3], [0.3, 0.3], [0.4, 0.62], [1, 0.62]], hR: [[0, 0.5], [0.12, 0.5], [0.22, 0.72], [1, 0.72]],
  hw: [[0, 1], [0.66, 1], [0.8, 0]]
};
// chain-link fences: mount (jump onto the mesh), climb hand over hand, then OVER at the top
const FENCE = { mount: 0.3, v: 1.5, handY: 1.98, pelF: -0.36, handF: -0.04, footF: -0.11, rung: 0.25 };

Object.assign(Anim.prototype, {
  // root-space edge point straight ahead of the root (character units)
  edgeLocal(out, H) {
    const a = this.a, s = a.app.scale || 1; H = H || a.hangData;
    const d = H && H.px !== undefined ? (a.pos.x - H.px) * H.nx + (a.pos.z - H.pz) * H.nz : a.r + 0.04;
    out[0] = 0; out[1] = ((H ? H.top : a.pos.y + 2.06) - a.pos.y - a.visY) / s; out[2] = d / s; return out;
  },
  pelvisAt(T, E, l, y, f) { T[HX] = E[0] + l; T[HY] = E[1] + y - PELV_Y; T[HZ] = E[2] + f; },
  torsoAt(T, k) { T[3] = k[0]; T[CH.spine] = k[1]; T[CH.chest] = k[2]; T[CH.neck] = k[3]; T[CH.head] = k[4]; },
  // leg IK blended with the current leg pose
  legIKw(T, side, x, y, z, fy, fp, w, poleYaw) {
    if (w <= 0.001) return;
    if (w >= 0.999) { legIK(T, side, x, y, z, fy, fp, 0, this.prev, false, poleYaw); return; }
    _armTmp.set(T); legIK(_armTmp, side, x, y, z, fy, fp, 0, this.prev, false, poleYaw);
    const iA = side ? CH.hipR : CH.hipL, iB = side ? CH.knR : CH.knL, iC = side ? CH.anR : CH.anL;
    for (const i of [iA, iA + 1, iA + 2, iB, iB + 1, iB + 2, iC, iC + 1, iC + 2]) T[i] += wrapAngle(_armTmp[i] - T[i]) * w;
  },
  // a keyframed ledge move (MANTLE / OVER / LADTOP) at u, in the edge frame E; o.depth = thickness of a thin wall
  ledgeMove(T, K, u, E, o = {}) {
    const dep = o.depth || 0, sh = f => f + dep * smoothstep(-0.25, 0.25, f); // spread the far side of a thick wall
    track(K.pel, u, _tk); this.pelvisAt(T, E, 0, _tk[1], sh(_tk[0]));
    track(K.tor, u, _tk); this.torsoAt(T, _tk);
    // feet (ladder rungs are given as rung counts below the top rung until the roof)
    for (let i = 0; i < 2; i++) {
      track(i ? K.fR : K.fL, u, _tk);
      let y = _tk[1]; if (o.rungs && y < 0) y = o.rungs(y);
      const b = o.fromFeet ? o.fromFeet[i] : null, bw = b ? 1 - smoothstep(0, o.fromU || 0.16, u) : 0;
      const x = E[0] + _tk[0], yy = E[1] + y, z = E[2] + sh(_tk[2]);
      this.legIKw(T, i, b ? lerp(x, E[0] + b[0], bw) : x, b ? lerp(yy, E[1] + b[1], bw) : yy, b ? lerp(z, E[2] + b[2], bw) : z, 0, _tk[3], 1, _tk[4]);
    }
    // hands: on the edge (or the rails), from pulling to pressing
    track(K.hw, u, _tk2); const hw = _tk2[0];
    if (hw > 0.001) {
      const pole = K.press ? lerpPole(POLE_PULL, POLE_PRESS, smoothstep(K.press[0], K.press[1], u)) : [0.45, -1, -0.3];
      for (let i = 0; i < 2; i++) {
        const sd = i ? -1 : 1; let hx = E[0] + sd * (o.handL || 0.24), hy = E[1] + 0.03, hz = E[2] + sh(o.handF !== undefined ? o.handF : -0.03);
        if (K.hL) { track(i ? K.hR : K.hL, u, _tk2); hy = E[1] + _tk2[0]; }
        const b = o.fromHands ? o.fromHands[i] : null; if (b) { const bw = 1 - smoothstep(0, o.fromU || 0.14, u); hx = lerp(hx, E[0] + b[0], bw); hy = lerp(hy, E[1] + b[1], bw); hz = lerp(hz, E[2] + b[2], bw); }
        armIK(T, i, hx, hy, hz, 0, hw, this.prev, pole);
      }
    }
    // arms out a little for balance once they let go
    const bal = smoothstep(K.hw[K.hw.length - 1][0] - 0.08, K.hw[K.hw.length - 1][0] + 0.04, u) * (1 - smoothstep(0.9, 1, u));
    if (bal > 0.001) { blendJ(T, 'shL', -0.45, 0, 0.3, bal * (1 - hw)); blendJ(T, 'shR', -0.45, 0, -0.3, bal * (1 - hw)); blendJ(T, 'elL', -0.7, 0, 0, bal * (1 - hw)); blendJ(T, 'elR', -0.7, 0, 0, bal * (1 - hw)); }
  },
  hangPose(dt, T) {
    const a = this.a, sh = a.shimmy || 0; this.hangPh += dt * 7 * Math.abs(sh);
    APose.stand(T);
    const E = this.edgeLocal(_E), t = this.time, br = Math.sin(t * 2.2) * 0.012, sw = Math.sin(t * 1.3);
    const ph = this.hangPh, mvL = sh ? Math.sin(ph) : 0, mvR = sh ? Math.sin(ph + Math.PI) : 0;
    // hips pushed off the wall by the braced feet, chest toward it, looking up at the ledge
    this.pelvisAt(T, E, sh * 0.03 * Math.sin(ph), HANG.pel[1] + br, HANG.pel[0] + sw * 0.012);
    T[3] = 0.3 + sw * 0.02; T[5] = sh * 0.05; T[CH.spine] = 0.1; T[CH.chest] = 0.05 + br; T[CH.neck] = -0.1; T[CH.head] = -0.38;
    for (let i = 0; i < 2; i++) { // hands on the edge, shuffling along when moving sideways
      const sd = i ? -1 : 1, mv = i ? mvR : mvL, up = Math.max(0, mv) * Math.abs(sh);
      armIK(T, i, E[0] + sd * HANG.hand[0] + sh * 0.09 * mv, E[1] + HANG.hand[1] + up * 0.05, E[2] + HANG.hand[2] - up * 0.03, 0, 1, this.prev, POLE_PULL);
    }
    for (let i = 0; i < 2; i++) { // feet braced on the wall, stepping along too
      const F = i ? HANG.footR : HANG.footL, sd = i ? -1 : 1, mv = i ? mvL : mvR, up = Math.max(0, mv) * Math.abs(sh);
      legIK(T, i, E[0] + F[0] + sh * 0.06 * mv, E[1] + F[1] + up * 0.06 + (i ? 0 : Math.sin(t * 0.9) * 0.01), E[2] + F[2] - up * 0.05, sd * 0.1, -0.1, 0, this.prev, false, sd * 0.45);
    }
  },
  climbPose(dt, T) {
    const a = this.a, u = clamp(a.st / (a.climbDur || 0.9), 0, 1), H = a.hangData;
    APose.stand(T);
    if (!H) return;
    const E = this.edgeLocal(_E);
    if (a.climbMode === 'ladTop' || a.climbMode === 'ladDown') {
      const L = H.ladder, s = a.app.scale || 1, rTop = L.y0 + 0.3 + Math.floor((L.y1 - 0.05 - L.y0 - 0.3) / 0.35) * 0.35;
      const up = a.climbMode === 'ladTop', F = up && this.ladFrom;
      this.ledgeMove(T, LADTOP, up ? u : 1 - u, E, { handL: 0.28, handF: -0.2, rungs: k => (rTop + (k + 1) * 0.35 - H.top) / s + ANK_H * 0.9, fromHands: F ? F.h : null, fromFeet: F ? F.f : null, fromU: 0.1 });
    } else this.ledgeMove(T, a.climbMode === 'over' ? OVER : MANTLE, u, E, { depth: a.climbMode === 'over' ? (H.depth || 0) / (a.app.scale || 1) : 0 });
  },
  // hand-over-hand gait on rungs (ladder) or on a mesh (fence): world rung heights y0 + n * gap; root-space plane z
  climbLimbs(T, y0, gap, zPlane, o) {
    const a = this.a, s = a.app.scale || 1, dn = a.climbDir < 0;
    const rp = (a.pos.y - y0) / gap, c = rp / 2;
    const limb = (shift, base) => { const cc = c - shift, fl = Math.floor(cc), m = clamp(frac(cc) / 0.5, 0, 1); const n = 2 * fl + base + 2 * ease(m); return { n, mv: m > 0 && m < 1 ? Math.sin(Math.PI * m) : 0, m }; };
    const rY = n => (y0 + n * gap - a.pos.y - a.visY) / s;
    // left hand + right foot move together, then right hand + left foot
    const hL = limb(0, o.hand), hR = limb(0.5, o.hand + 1), fR = limb(0, o.foot), fL = limb(0.5, o.foot + 1);
    const sway = Math.sin(TAU * (c + 0.25)) * 0.035;
    T[HX] += sway; T[5] = -sway * 1.2; T[CH.chest + 2] = sway * 0.8; T[CH.chest + 1] = (hL.mv - hR.mv) * 0.06;
    const lim = this._lim || (this._lim = { h: [[0, 0, 0], [0, 0, 0]], f: [[0, 0, 0], [0, 0, 0]] });
    for (let i = 0; i < 2; i++) {
      const h = i ? hR : hL, sd = i ? -1 : 1, H = lim.h[i];
      H[0] = sd * o.handX; H[1] = rY(h.n) + o.handUp + h.mv * 0.07; H[2] = zPlane + o.handZ - h.mv * 0.1;
      armIK(T, i, H[0], H[1], H[2], 0, o.w === undefined ? 1 : o.w, this.prev, o.pole);
      const f = i ? fR : fL, F = lim.f[i];
      F[0] = sd * o.footX; F[1] = rY(f.n) + ANK_H * 0.9 + f.mv * 0.07; F[2] = zPlane + o.footZ - f.mv * 0.12;
      this.legIKw(T, i, F[0], F[1], F[2], sd * 0.12, 0.05 + f.mv * 0.35, o.wf === undefined ? 1 : o.wf, sd * 0.35);
    }
    // look at the hands going up, at the feet going down
    T[CH.head] = dn ? 0.4 : -0.28; T[CH.neck] = dn ? 0.12 : -0.05;
  },
  ladderRef() {
    const a = this.a; if (a.ladder && a.state === 'ladder') return a.ladder;
    if (this._lad && dist2D(this._lad.x, this._lad.z, a.pos.x, a.pos.z) < 1.5) return this._lad;
    let best = null, bd = 2; for (const L of World.ladders) { const d = dist2D(L.x, L.z, a.pos.x, a.pos.z); if (d < bd) { bd = d; best = L; } }
    this._lad = best; return best;
  },
  ladderPose(dt, T) {
    const a = this.a, s = a.app.scale || 1, L = this.ladderRef();
    APose.stand(T);
    T[CH.spine] = 0.04; T[3] = 0.06; T[HZ] = -0.03;
    if (!L) return;
    const d = (a.pos.x - L.x) * L.nx + (a.pos.z - L.z) * L.nz; // root distance from the wall
    const zr = (d - 0.18) / s;                                   // rung line in front of the root
    this.climbLimbs(T, L.y0 + 0.3, 0.35, zr, { hand: 4, foot: 0, handX: 0.21, handUp: 0.04, handZ: -0.05, footX: 0.12, footZ: -0.1, pole: [0.45, -1, -0.35] });
    // where the limbs are, in the frame of the ladder top (the move onto the roof starts from there)
    if (a === Game.player) {
      const E = this.edgeLocal(_E2, { px: L.x, pz: L.z, nx: L.nx, nz: L.nz, top: L.y1 }), lim = this._lim, F = this.ladFrom || (this.ladFrom = { h: [[0, 0, 0], [0, 0, 0]], f: [[0, 0, 0], [0, 0, 0]] });
      for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) { F.h[i][k] = lim.h[i][k] - E[k]; F.f[i][k] = lim.f[i][k] - E[k]; }
    }
  },
  fencePose(dt, T) {
    const a = this.a, D = a.fenceD, s = a.app.scale || 1;
    APose.stand(T);
    if (!D) return;
    const E = this.edgeLocal(_E, D);
    if (D.ph === 'over') {
      this.ledgeMove(T, OVER, clamp(D.u, 0, 1), E, { handF: 0, fromHands: D.hands, fromFeet: D.feet });
      return;
    }
    // on the mesh: body close to it, hands and feet poked through the links
    const k = D.ph === 'mount' ? clamp(D.u, 0, 1) : 1;
    T[3] = 0.12 * k; T[CH.spine] = 0.06 * k; T[HZ] = E[2] + FENCE.pelF;
    T[HZ] = lerp(0, T[HZ], smoothstep(0.1, 0.8, k));
    T[HY] = -0.02 + (1 - k) * Math.sin(k * Math.PI) * 0.05;
    this.climbLimbs(T, D.gy, FENCE.rung, E[2], { hand: 6, foot: 0, handX: 0.22, handUp: 0, handZ: FENCE.handF, footX: 0.12, footZ: FENCE.footF, pole: [0.45, -1, -0.3], w: smoothstep(0.05, 0.6, k), wf: smoothstep(0.3, 0.95, k) });
    // remember where the limbs are, the move over the top starts from there
    const lim = this._lim; D.hands = lim.h.map(p => [p[0] - E[0], p[1] - E[1], p[2] - E[2]]); D.feet = lim.f.map(p => [p[0] - E[0], p[1] - E[1], p[2] - E[2]]);
  },
  // root-space wrist / ankle of a pose (checks)
  limbEnd(T, side, arm) {
    if (!arm) { legFK(T, side, _fk); return [_fk[0], _fk[1], _fk[2]]; }
    chestFrame(T); forearmFK(T, side); M3.apply(_R4, _wr[0], _wr[1], _wr[2], _v); return [_c[0] + _v[0], _c[1] + _v[1], _c[2] + _v[2]];
  }
});

