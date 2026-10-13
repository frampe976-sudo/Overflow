/* =====================================================================
   ANIMATION — planted feet + two-bone IK locomotion, layered upper body,
   inertialized transitions and spline-interpolated action clips.
   Every actor owns an Anim; Actor.animate() forwards to it.
   ===================================================================== */
const HX = NB * 3 + 2;                  // pelvis lateral offset channel (HY / HZ live next to it)
const NANG = NB * 3;                    // number of angular channels
const ANK_H = 0.102, THIGH = 0.43, SHIN = 0.43, UARM = 0.28, FARM = 0.25;
const PELV_Y = 0.98, HIP_X = 0.1, HIP_Y = -0.03;
const CH = {}; for (const b of BONES) CH[b[0]] = BI[b[0]] * 3;
const frac = x => x - Math.floor(x);
const ease = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const cycl = s => s - Math.sin(TAU * s) / TAU;           // 0..1, zero velocity at both ends
// 0..1 cubic with start / end slopes m0, m1 (relative to the mean speed)
const herm01 = (s, m0, m1) => { const s2 = s * s, s3 = s2 * s; return (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) + (s3 - s2) * m1; };
// smooth lift profile: 0 -> 1 at 'peak' -> 0 ; k0 = 1 gives a brisk (non-zero slope) take-off
function bump(s, peak, k0 = 0) {
  if (s <= 0 || s >= 1) return 0;
  if (s >= peak) { const q = (s - peak) / (1 - peak); return lerp(0.5 + 0.5 * Math.cos(Math.PI * q), Math.cos(Math.PI * 0.5 * q), k0 * 0.8); }
  const q = s / peak; return lerp(0.5 - 0.5 * Math.cos(Math.PI * q), Math.sin(Math.PI * 0.5 * q), k0);
}
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

/* ---------- springs ---------- */
const Spr = {
  // critically damped, exact (halflife in seconds); s = {x, v}
  to(s, t, hl, dt) { const y = 1.3862944 / (hl + 1e-5), j0 = s.x - t, j1 = s.v + j0 * y, e = Math.exp(-y * dt); s.x = e * (j0 + j1 * dt) + t; s.v = e * (s.v - j1 * y * dt); return s.x; },
  angle(s, t, hl, dt) { const y = 1.3862944 / (hl + 1e-5), j0 = wrapAngle(s.x - t), j1 = s.v + j0 * y, e = Math.exp(-y * dt); s.x = wrapAngle(e * (j0 + j1 * dt) + t); s.v = e * (s.v - j1 * y * dt); return s.x; },
  // under-damped (frequency Hz, damping ratio) for bouncy reactions
  osc(s, t, f, z, dt) { const w = TAU * f, k = w * w, c = 2 * z * w; let n = Math.min(10, Math.ceil(dt * 240)); const h = dt / n; while (n--) { s.v += (-(s.x - t) * k - s.v * c) * h; s.x += s.v * h; } return s.x; }
};
const sp = (x = 0) => ({ x, v: 0 });

/* ---------- 3x3 rotation helpers (row-major, v' = M v, euler order Ry*Rx*Rz like M4.compose) ---------- */
const M3 = {
  // ord 0: Ry*Rx*Rz (default), ord 1: Rx*Rz*Ry (hips / shoulders)
  euler(o, x, y, z, ord) {
    if (ord) {
      const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
      o[0] = cz * cy; o[1] = -sz; o[2] = cz * sy;
      o[3] = cx * sz * cy + sx * sy; o[4] = cx * cz; o[5] = cx * sz * sy - sx * cy;
      o[6] = sx * sz * cy - cx * sy; o[7] = sx * cz; o[8] = sx * sz * sy + cx * cy;
      return o;
    }
    const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
    o[0] = cy * cz + sy * sx * sz; o[1] = -cy * sz + sy * sx * cz; o[2] = sy * cx;
    o[3] = cx * sz; o[4] = cx * cz; o[5] = -sx;
    o[6] = -sy * cz + cy * sx * sz; o[7] = sy * sz + cy * sx * cz; o[8] = cy * cx;
    return o;
  },
  mul(o, a, b) {
    for (let r = 0; r < 3; r++) { const a0 = a[r * 3], a1 = a[r * 3 + 1], a2 = a[r * 3 + 2]; o[r * 3] = a0 * b[0] + a1 * b[3] + a2 * b[6]; o[r * 3 + 1] = a0 * b[1] + a1 * b[4] + a2 * b[7]; o[r * 3 + 2] = a0 * b[2] + a1 * b[5] + a2 * b[8]; }
    return o;
  },
  tmul(o, a, b) { // a^T * b
    for (let r = 0; r < 3; r++) { const a0 = a[r], a1 = a[3 + r], a2 = a[6 + r]; o[r * 3] = a0 * b[0] + a1 * b[3] + a2 * b[6]; o[r * 3 + 1] = a0 * b[1] + a1 * b[4] + a2 * b[7]; o[r * 3 + 2] = a0 * b[2] + a1 * b[5] + a2 * b[8]; }
    return o;
  },
  toEuler(m, out, i, ord) {
    if (ord) { out[i + 2] = Math.asin(clamp(-m[1], -1, 1)); out[i] = Math.atan2(m[7], m[4]); out[i + 1] = Math.atan2(m[2], m[0]); return; }
    out[i] = Math.asin(clamp(-m[5], -1, 1)); out[i + 1] = Math.atan2(m[2], m[8]); out[i + 2] = Math.atan2(m[3], m[4]);
  },
  // Euler extraction that stays continuous with a reference (picks the nearer of the two equivalent solutions, handles gimbal lock)
  toEulerNear(m, out, i, ref, ord) {
    if (!ref) return this.toEuler(m, out, i, ord);
    const rx = ref[i], ry = ref[i + 1], rz = ref[i + 2];
    let x, y, z;
    if (ord) { // X*Z*Y : middle angle z
      const z1 = Math.asin(clamp(-m[1], -1, 1));
      if (Math.abs(Math.cos(z1)) < 0.03) { z = z1; y = ry; x = z1 > 0 ? ry + Math.atan2(m[6], m[3]) : Math.atan2(-m[6], -m[3]) - ry; }
      else {
        const x1 = Math.atan2(m[7], m[4]), y1 = Math.atan2(m[2], m[0]);
        if (Math.abs(wrapAngle(y1 - ry)) + Math.abs(wrapAngle(z1 - rz)) < 1.2) { out[i] = rx + wrapAngle(x1 - rx); out[i + 1] = ry + wrapAngle(y1 - ry); out[i + 2] = rz + wrapAngle(z1 - rz); return; }
        const x2 = wrapAngle(x1 + Math.PI), y2 = wrapAngle(y1 + Math.PI), z2 = wrapAngle(Math.PI - z1);
        const d1 = Math.abs(wrapAngle(x1 - rx)) + Math.abs(wrapAngle(y1 - ry)) + Math.abs(wrapAngle(z1 - rz));
        const d2 = Math.abs(wrapAngle(x2 - rx)) + Math.abs(wrapAngle(y2 - ry)) + Math.abs(wrapAngle(z2 - rz));
        if (d1 <= d2) { x = x1; y = y1; z = z1; } else { x = x2; y = y2; z = z2; }
      }
    } else {   // Y*X*Z : middle angle x
      const x1 = Math.asin(clamp(-m[5], -1, 1));
      if (Math.abs(Math.cos(x1)) < 0.03) { x = x1; y = ry; z = x1 < 0 ? Math.atan2(-m[1], m[0]) - ry : ry - Math.atan2(m[1], m[0]); }
      else {
        const y1 = Math.atan2(m[2], m[8]), z1 = Math.atan2(m[3], m[4]);
        if (Math.abs(wrapAngle(y1 - ry)) + Math.abs(wrapAngle(z1 - rz)) < 1.2) { out[i] = rx + wrapAngle(x1 - rx); out[i + 1] = ry + wrapAngle(y1 - ry); out[i + 2] = rz + wrapAngle(z1 - rz); return; }
        const x2 = wrapAngle(Math.PI - x1), y2 = wrapAngle(y1 + Math.PI), z2 = wrapAngle(z1 + Math.PI);
        const d1 = Math.abs(wrapAngle(x1 - rx)) + Math.abs(wrapAngle(y1 - ry)) + Math.abs(wrapAngle(z1 - rz));
        const d2 = Math.abs(wrapAngle(x2 - rx)) + Math.abs(wrapAngle(y2 - ry)) + Math.abs(wrapAngle(z2 - rz));
        if (d1 <= d2) { x = x1; y = y1; z = z1; } else { x = x2; y = y2; z = z2; }
      }
    }
    out[i] = rx + wrapAngle(x - rx); out[i + 1] = ry + wrapAngle(y - ry); out[i + 2] = rz + wrapAngle(z - rz);
  },
  apply(m, x, y, z, o) { o[0] = m[0] * x + m[1] * y + m[2] * z; o[1] = m[3] * x + m[4] * y + m[5] * z; o[2] = m[6] * x + m[7] * y + m[8] * z; return o; },
  applyT(m, x, y, z, o) { o[0] = m[0] * x + m[3] * y + m[6] * z; o[1] = m[1] * x + m[4] * y + m[7] * z; o[2] = m[2] * x + m[5] * y + m[8] * z; return o; }
};
const _Rp = new Float64Array(9), _R1 = new Float64Array(9), _R2 = new Float64Array(9), _R3 = new Float64Array(9), _R4 = new Float64Array(9);
const _v = [0, 0, 0], _c = [0, 0, 0], _fk = [0, 0, 0, 0, 0];

/* ---------- two-bone IK (pole vector) ----------
   Chain hangs along -Y from the root joint. (dx,dy,dz) = target relative to the root joint, in the joint's parent frame.
   (px,py,pz) = pole: the middle joint (knee / elbow) is placed toward it.
   bend +1: knee (shin folds away from the pole, local -Z) / -1: elbow (forearm folds away from the pole, local +Z). */
const _ik = new Float64Array(9);
function ik2(o, iA, iB, dx, dy, dz, a, b, bend, px, py, pz, ref) {
  let L = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (L < 1e-6) { dx = 0; dy = -1; dz = 0; L = 1; }
  const ux = dx / L, uy = dy / L, uz = dz / L;
  const Dmax = (a + b) * 0.999, Ds = (a + b) * 0.965;
  let D = Math.max(L, Math.abs(a - b) + 0.06);
  if (D > Ds) D = Ds + (Dmax - Ds) * (1 - Math.exp(-(D - Ds) / (Dmax - Ds)));
  // pole component perpendicular to the target direction
  let pd = px * ux + py * uy + pz * uz, nx = px - pd * ux, ny = py - pd * uy, nz = pz - pd * uz, nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (nl < 1e-5) { nx = -uy; ny = ux; nz = 0; nl = Math.hypot(nx, ny); if (nl < 1e-5) { nx = 0; ny = uz; nz = -uy; nl = Math.hypot(ny, nz) || 1; } }
  nx /= nl; ny /= nl; nz /= nl;
  const cA = clamp((a * a + D * D - b * b) / (2 * a * D), -1, 1), sA = Math.sqrt(1 - cA * cA);
  const tx = cA * ux + sA * nx, ty = cA * uy + sA * ny, tz = cA * uz + sA * nz;          // upper segment direction
  const kx = D * ux - a * tx, ky = D * uy - a * ty, kz = D * uz - a * tz, kl = Math.sqrt(kx * kx + ky * ky + kz * kz) || 1;
  const k = Math.acos(clamp((tx * kx + ty * ky + tz * kz) / kl, -1, 1)) * bend;         // middle joint flexion
  // local frame of the upper segment: y = -t, z = in-plane toward the pole (knee) or away (elbow)
  const sg = bend > 0 ? 1 : -1;
  const zx = sg * (cA * nx - sA * ux), zy = sg * (cA * ny - sA * uy), zz = sg * (cA * nz - sA * uz);
  const yx = -tx, yy = -ty, yz = -tz;
  const xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
  // rotation matrix columns = (x, y, z) -> row-major
  _ik[0] = xx; _ik[1] = yx; _ik[2] = zx; _ik[3] = xy; _ik[4] = yy; _ik[5] = zy; _ik[6] = xz; _ik[7] = yz; _ik[8] = zz;
  M3.toEulerNear(_ik, o, iA, ref, 1);
  o[iB] = k; o[iB + 1] = 0; o[iB + 2] = 0;
}
// leg IK: ankle target (root space, character units) and desired foot orientation (root-space yaw / pitch / roll)
function legIK(P, side, ax, ay, az, fy, fp, fr = 0, ref = null, pelvisReady = false, poleYaw = null) {
  if (!pelvisReady) M3.euler(_Rp, P[3], P[4], P[5]);
  M3.applyT(_Rp, ax - P[HX], ay - (PELV_Y + P[HY]), az - P[HZ], _v);
  const dx = _v[0] - (side ? -HIP_X : HIP_X), dy = _v[1] - HIP_Y, dz = _v[2];
  const iA = side ? CH.hipR : CH.hipL, iB = side ? CH.knR : CH.knL, iC = side ? CH.anR : CH.anL;
  const ya = clamp(wrapAngle((poleYaw === null ? fy : poleYaw) - P[4]) * 0.8, -1.0, 1.0);
  ik2(P, iA, iB, dx, dy, dz, THIGH, SHIN, 1, Math.sin(ya), 0.35, Math.cos(ya), ref);
  M3.euler(_R1, P[iA], P[iA + 1], P[iA + 2], 1); M3.mul(_R2, _Rp, _R1);
  M3.euler(_R1, P[iB], 0, 0); M3.mul(_R3, _R2, _R1);
  M3.euler(_R1, fp, fy, fr); M3.tmul(_R2, _R3, _R1);
  M3.toEulerNear(_R2, P, iC, ref);
  P[iC] = clamp(P[iC], -0.8, 1.35); P[iC + 1] = clamp(P[iC + 1], -0.7, 0.7); P[iC + 2] = clamp(P[iC + 2], -0.45, 0.45);
}
// forward kinematics: ankle position + foot yaw/pitch in root space
function legFK(P, side, out) {
  M3.euler(_Rp, P[3], P[4], P[5]);
  M3.apply(_Rp, side ? -HIP_X : HIP_X, HIP_Y, 0, _v);
  let x = P[HX] + _v[0], y = PELV_Y + P[HY] + _v[1], z = P[HZ] + _v[2];
  const iA = side ? CH.hipR : CH.hipL, iB = side ? CH.knR : CH.knL, iC = side ? CH.anR : CH.anL;
  M3.euler(_R1, P[iA], P[iA + 1], P[iA + 2], 1); M3.mul(_R2, _Rp, _R1);
  M3.apply(_R2, 0, -THIGH, 0, _v); x += _v[0]; y += _v[1]; z += _v[2];
  M3.euler(_R1, P[iB], P[iB + 1], P[iB + 2]); M3.mul(_R3, _R2, _R1);
  M3.apply(_R3, 0, -SHIN, 0, _v); x += _v[0]; y += _v[1]; z += _v[2];
  M3.euler(_R1, P[iC], P[iC + 1], P[iC + 2]); M3.mul(_R2, _R3, _R1);
  out[0] = x; out[1] = y; out[2] = z; out[3] = Math.atan2(_R2[2], _R2[8]); out[4] = Math.asin(clamp(-_R2[5], -1, 1));
  return out;
}
// chest frame (rotation -> _R4, origin -> _c) in root space
function chestFrame(P) {
  M3.euler(_Rp, P[3], P[4], P[5]);
  M3.apply(_Rp, 0, 0.08, 0, _v); let x = P[HX] + _v[0], y = PELV_Y + P[HY] + _v[1], z = P[HZ] + _v[2];
  M3.euler(_R1, P[CH.spine], P[CH.spine + 1], P[CH.spine + 2]); M3.mul(_R2, _Rp, _R1);
  M3.apply(_R2, 0, 0.22, 0, _v); x += _v[0]; y += _v[1]; z += _v[2];
  M3.euler(_R1, P[CH.chest], P[CH.chest + 1], P[CH.chest + 2]); M3.mul(_R4, _R2, _R1);
  _c[0] = x; _c[1] = y; _c[2] = z;
}
// arm IK toward a wrist target (root space); w blends from the current arm pose
const _armTmp = new Float32Array(PSZ);
let ARM_X = 0.19; // shoulder joint offset of the character being posed (narrower on women)
// pole: optional elbow direction [out, up, forward] in the chest frame (left side; mirrored for the right)
function armIK(P, side, tx, ty, tz, out, w = 1, ref = null, pole = null) {
  if (w <= 0.001) return;
  chestFrame(P);
  M3.apply(_R4, side ? -ARM_X : ARM_X, 0.2, 0, _v);
  const px = _c[0] + _v[0], py = _c[1] + _v[1], pz = _c[2] + _v[2];
  M3.applyT(_R4, tx - px, ty - py, tz - pz, _v);
  const iA = side ? CH.shR : CH.shL, iB = side ? CH.elR : CH.elL;
  const sx = side ? -1 : 1, ox = pole ? sx * pole[0] : sx * Math.abs(out), oy = pole ? pole[1] : -0.35, oz = pole ? pole[2] : -1;
  if (w >= 0.999) { ik2(P, iA, iB, _v[0], _v[1], _v[2], UARM, FARM, -1, ox, oy, oz, ref); return; }
  ik2(_armTmp, iA, iB, _v[0], _v[1], _v[2], UARM, FARM, -1, ox, oy, oz, ref);
  for (const i of [iA, iA + 1, iA + 2, iB, iB + 1, iB + 2]) P[i] += wrapAngle(_armTmp[i] - P[i]) * w;
}
// arm IK toward a wrist target given in the chest frame (x left, y up, z forward); pole = elbow direction, chest frame
function armIKc(P, side, tx, ty, tz, w, ref, px, py, pz) {
  if (w <= 0.001) return;
  const dx = tx - (side ? -ARM_X : ARM_X), dy = ty - 0.2, dz = tz;
  const iA = side ? CH.shR : CH.shL, iB = side ? CH.elR : CH.elL;
  if (w >= 0.999) { ik2(P, iA, iB, dx, dy, dz, UARM, FARM, -1, px, py, pz, ref); return; }
  _armTmp.set(P); ik2(_armTmp, iA, iB, dx, dy, dz, UARM, FARM, -1, px, py, pz, ref);
  for (const i of [iA, iA + 1, iA + 2, iB, iB + 1, iB + 2]) P[i] += wrapAngle(_armTmp[i] - P[i]) * w;
}
// forearm frame (rotation relative to the chest -> _R3) and wrist position (chest frame -> _wr) of an arm pose
const _wr = [0, 0, 0];
function forearmFK(P, side) {
  const iA = side ? CH.shR : CH.shL, iB = side ? CH.elR : CH.elL;
  M3.euler(_R1, P[iA], P[iA + 1], P[iA + 2], 1);
  M3.apply(_R1, 0, -UARM, 0, _v); let x = (side ? -ARM_X : ARM_X) + _v[0], y = 0.2 + _v[1], z = _v[2];
  M3.euler(_R2, P[iB], P[iB + 1], P[iB + 2]); M3.mul(_R3, _R1, _R2);
  M3.apply(_R3, 0, -FARM, 0, _v); _wr[0] = x + _v[0]; _wr[1] = y + _v[1]; _wr[2] = z + _v[2];
}
// turn the hand (wrist joint) so that the hand frame matches Rh (row-major, chest frame), blended by w
const _Rh = new Float64Array(9), _hand = new Float32Array(3);
function wristTo(P, side, Rh, w, ref) {
  if (w <= 0.001) return;
  forearmFK(P, side); M3.tmul(_R2, _R3, Rh);
  const iC = side ? CH.haR : CH.haL; _hand[0] = P[iC]; _hand[1] = P[iC + 1]; _hand[2] = P[iC + 2];
  M3.toEulerNear(_R2, _hand, 0, ref ? [ref[iC], ref[iC + 1], ref[iC + 2]] : null);
  // a wrist bends about 80 degrees at most: past that the forearm has to follow (the IK pole takes care of it)
  const lim = [1.35, 1.1, 0.9];
  for (let k = 0; k < 3; k++) { const v = clamp(_hand[k], -lim[k], lim[k]); P[iC + k] += wrapAngle(v - P[iC + k]) * w; }
}
// 3x3 (row-major) part of a column-major 4x4, times a row-major 3x3
function m4r3(M, R, o) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = M[r] * R[c] + M[4 + r] * R[3 + c] + M[8 + r] * R[6 + c];
  return o;
}
const ap4 = (M, p, o) => { o[0] = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12]; o[1] = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13]; o[2] = M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]; return o; };

/* ---------- guns in the hands ---------- */
// long gun against the body, in the chest frame: shouldered (aimK = 1) and pointing along the root's forward,
// pitched by `pitch` (the torso is bladed, so the gun is turned back in the chest frame), or at the low ready
// (butt on the right pectoral, muzzle down and across the body); kick = recoil (the gun comes back and up)
const _gA = [0, 0, 0], _R5 = new Float64Array(9), _hw = [0, 0, 0];
function gunCarry(M, T, aimK, runK, pitch, kick) {
  chestFrame(T);
  M3.euler(_R1, -pitch, 0, 0); M3.tmul(_R2, _R4, _R1); M3.toEuler(_R2, _gA, 0);
  const k = aimK * aimK * (3 - 2 * aimK);
  const rx = lerp(0.34 + 0.12 * runK, _gA[0], k), ry = lerp(0.3, _gA[1], k), rz = lerp(-0.15, _gA[2], k);
  return M4.compose(M, lerp(-0.115, -0.108, k), lerp(0.12, 0.205, k) + kick * 0.004, lerp(0.1, 0.05, k) - kick * 0.035, rx - kick * 0.07, ry, rz);
}
// both hands on a long gun (G = Arms.INFO entry, M = carry matrix): wR / wL = weight of each hand
function holdLong(T, G, M, wR, wL, ref) {
  if (wR > 0.001) {
    ap4(M, G.R.w, _hw); m4r3(M, G.R.R, _Rh);
    armIKc(T, 1, _hw[0], _hw[1], _hw[2], wR, ref, -0.8, -0.75, -0.2);   // trigger elbow out and down
    wristTo(T, 1, _Rh, wR, ref);
  }
  if (wL > 0.001) {
    ap4(M, G.L.w, _hw); m4r3(M, G.L.R, _Rh);
    armIKc(T, 0, _hw[0], _hw[1], _hw[2], wL, ref, 0.3, -1, 0.05);       // support elbow under the gun
    wristTo(T, 0, _Rh, wL, ref);
  }
}
// support hand of a two-handed pistol / smg aim: follows the right hand (S = hold in the right hand's frame)
function holdSupport(T, S, w, ref) {
  if (w <= 0.001) return;
  forearmFK(T, 1); const iC = CH.haR; M3.euler(_R1, T[iC], T[iC + 1], T[iC + 2]); M3.mul(_R5, _R3, _R1);
  M3.apply(_R5, S.w[0], S.w[1], S.w[2], _v); const x = _wr[0] + _v[0], y = _wr[1] + _v[1], z = _wr[2] + _v[2];
  M3.mul(_Rh, _R5, S.R);
  armIKc(T, 0, x, y, z, w, ref, 0.5, -1, -0.15);
  wristTo(T, 0, _Rh, w, ref);
}
// overhand throw with the right arm: u = 0 start, 0.3 cocked (held while aiming), 0.45 release, 0.62 follow-through, 1 end
const THROW_K = [[0, -0.22, 1.1, 0.2], [0.3, -0.42, 1.7, -0.14], [0.45, -0.24, 1.84, 0.34], [0.62, -0.06, 1.45, 0.45], [1, 0.04, 1.1, 0.3]];
const THROW_REL = 0.45;
function throwPose(T, u, k, ref) {
  if (k <= 0.001) return;
  // torso: turns away while cocking, then whips through and bends over the throw
  const tw = u < 0.3 ? -0.5 * ease(u / 0.3) : u < 0.62 ? lerp(-0.5, 0.35, ease((u - 0.3) / 0.32)) : 0.35 * (1 - ease((u - 0.62) / 0.38));
  const bend = Math.sin(clamp((u - 0.3) / 0.6, 0, 1) * Math.PI) * 0.22;
  T[CH.spine + 1] += tw * 0.45 * k; T[CH.chest + 1] += tw * 0.55 * k; T[CH.spine] += bend * 0.5 * k; T[CH.chest] += bend * 0.4 * k;
  // right hand along the throwing arc, elbow out and up
  let i = 0; while (i < THROW_K.length - 2 && u > THROW_K[i + 1][0]) i++;
  const A = THROW_K[i], B = THROW_K[i + 1], s = ease((u - A[0]) / (B[0] - A[0]));
  armIK(T, 1, lerp(A[1], B[1], s), lerp(A[2], B[2], s), lerp(A[3], B[3], s), 0, k, ref, [1, 0.15, -0.1]);
  // wrist cocked back, then snapping forward
  T[CH.haR] += (u < THROW_REL ? -0.55 : 0.35) * k;
  // left arm points at the target while cocking, then tucks in
  const pt = (u < 0.35 ? ease(u / 0.3) : 1 - ease((u - 0.35) / 0.3)) * 0.9 * k;
  blendJ(T, 'shL', -1.3, 0.25, 0.3, pt); blendJ(T, 'elL', -0.3, 0, 0, pt);
}

/* ---------- spline clips ----------
   keys: [u, {joint:[x,y,z] | P:[hx,hy,hz]}] ; missing values follow the base pose.
   Joints are absolute; P (pelvis offset) is additive unless clip.pAbs. A key may be 'S' (standing snapshot).
   Interpolation: monotone cubic Hermite (continuous velocity, no overshoot). */
const STAND = new Float32Array(PSZ);
function makeClip(def) {
  const keys = def.keys, n = keys.length, times = new Float32Array(n);
  const names = new Set(); keys.forEach((k, i) => { times[i] = k[0]; if (k[1] !== 'S') for (const nm in k[1]) names.add(nm); });
  const chans = [];
  for (const nm of names) {
    for (let ax = 0; ax < 3; ax++) {
      const idx = nm === 'P' ? [HX, HY, HZ][ax] : CH[nm] + ax;
      if (idx === undefined || isNaN(idx)) continue;
      const vals = new Float32Array(n).fill(NaN); let any = false;
      keys.forEach((k, i) => { const v = k[1] === 'S' ? null : k[1][nm]; if (v && v[ax] !== undefined && v[ax] !== null) { vals[i] = v[ax]; any = true; } });
      if (!any) continue;
      const add = nm === 'P' && !def.pAbs;
      keys.forEach((k, i) => { if (k[1] === 'S') vals[i] = add ? 0 : STAND[idx]; });
      chans.push({ idx, add, vals });
    }
  }
  return Object.assign({}, def, { times, chans, n });
}
function _kv(c, i, bv) { const v = c.vals[i]; return v !== v ? bv : v; }
function _kt(c, t, i, n, bv) {
  if (i <= 0 || i >= n - 1) return 0;
  const h0 = t[i] - t[i - 1], h1 = t[i + 1] - t[i]; if (h0 <= 1e-6 || h1 <= 1e-6) return 0;
  const d0 = (_kv(c, i, bv) - _kv(c, i - 1, bv)) / h0, d1 = (_kv(c, i + 1, bv) - _kv(c, i, bv)) / h1;
  if (d0 * d1 <= 0) return 0;
  return 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
}
// evaluate clip C at normalized time u over base pose B into O (only the clip's channels are written); w blends from B
function clipEval(C, u, B, O, w = 1) {
  const t = C.times, n = C.n; u = clamp(u, 0, 1);
  let k = 0; while (k < n - 2 && t[k + 1] <= u) k++;
  const h = Math.max(1e-5, t[k + 1] - t[k]), s = clamp((u - t[k]) / h, 0, 1), s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  for (let j = 0; j < C.chans.length; j++) {
    const c = C.chans[j], bv = c.add ? 0 : B[c.idx];
    const v = h00 * _kv(c, k, bv) + h10 * h * _kt(c, t, k, n, bv) + h01 * _kv(c, k + 1, bv) + h11 * h * _kt(c, t, k + 1, n, bv);
    const full = c.add ? B[c.idx] + v : v;
    O[c.idx] = w >= 1 ? full : B[c.idx] + (c.idx < NANG ? wrapAngle(full - B[c.idx]) : full - B[c.idx]) * w;
  }
}
// align the clip's impact key with the attack's hit time
function warpU(u, r, hitU) { if (!hitU || !(r > 0 && r < 1)) return u; return u < r ? u / r * hitU : hitU + (u - r) / (1 - r) * (1 - hitU); }

const CLIP_DEFS = {
  /* ----- player strikes (authored over the guard stance) ----- */
  jab: { hitU: 0.42, keys: [[0, {}],
    [0.2, { shL: [-0.9, 0.18, 0.32], elL: [-2.05], chest: [0.05, 0.24, -0.03], spine: [0.1, 0.1, 0], hips: [0.02, 0.08, 0], P: [0, -0.02, -0.02] }],   // load: shoulder drawn back, a little sink
    [0.42, { shL: [-1.5, -0.15, 0.0], elL: [-0.2], haL: [0.1], chest: [0.1, -0.44, 0.07], spine: [0.2, -0.16, 0.02], hips: [0.08, -0.14, 0], shR: [-0.62, -0.1, -0.4], elR: [-2.25], P: [0, -0.04, 0.07] }], // impact: hips and shoulders turn behind the fist, weight forward
    [0.56, { shL: [-1.42, -0.12, 0.04], elL: [-0.32], chest: [0.1, -0.38, 0.05], spine: [0.18, -0.14, 0.02], hips: [0.07, -0.12, 0], P: [0, -0.035, 0.06] }],
    [0.8, { shL: [-1.0, 0.1, 0.25], elL: [-1.65], chest: [0.06, -0.06, 0], spine: [0.1, -0.02, 0], hips: [0.03, -0.02, 0], P: [0, -0.015, 0.02] }], [1, {}]] },
  cross: { hitU: 0.45, keys: [[0, {}],
    [0.22, { shR: [-0.6, -0.12, -0.46], elR: [-2.2], chest: [0.04, -0.3, 0.02], spine: [0.1, -0.14, 0], hips: [0.03, -0.3, 0], P: [0, -0.035, -0.03] }],  // wind: the right hip and shoulder drawn back, weight on the rear foot
    [0.45, { shR: [-1.56, 0.12, -0.05], elR: [-0.16], haR: [0.1], chest: [0.14, 0.6, -0.08], spine: [0.22, 0.26, -0.03], hips: [0.1, 0.32, 0], shL: [-0.65, 0.25, 0.42], elL: [-2.1], P: [0, -0.06, 0.1] }], // impact: the whole body turns through the punch
    [0.6, { shR: [-1.46, 0.1, -0.08], elR: [-0.3], chest: [0.13, 0.54, -0.06], spine: [0.2, 0.24, -0.03], hips: [0.09, 0.28, 0], P: [0, -0.05, 0.09] }],
    [0.82, { shR: [-0.75, -0.08, -0.36], elR: [-1.9], chest: [0.06, 0.1, 0], spine: [0.1, 0.04, 0], hips: [0.04, 0.02, 0], P: [0, -0.02, 0.03] }], [1, {}]] },
  hook: { hitU: 0.5, keys: [[0, {}],
    [0.26, { shR: [-0.5, -0.4, -1.1], elR: [-1.7], chest: [0.08, -0.5, 0.04], spine: [0.14, -0.24, 0], hips: [0.05, -0.4, 0], P: [0, -0.08, -0.03] }],   // coil down and to the right
    [0.5, { shR: [-0.35, 0.95, -1.32], elR: [-1.55], chest: [0.1, 0.72, -0.1], spine: [0.16, 0.34, -0.04], hips: [0.08, 0.38, 0], shL: [-0.6, 0.2, 0.45], elL: [-2.1], P: [0, -0.06, 0.06] }], // the hook whips round on the hips
    [0.64, { shR: [-0.3, 1.25, -1.2], elR: [-1.45], chest: [0.1, 0.85, -0.1], spine: [0.15, 0.38, -0.04], hips: [0.07, 0.42, 0], P: [0, -0.06, 0.05] }],
    [0.86, { shR: [-0.55, 0.3, -0.6], elR: [-1.95], chest: [0.05, 0.2, 0], spine: [0.08, 0.08, 0], hips: [0.03, 0.08, 0], P: [0, -0.03, 0.01] }], [1, {}]] },
  kick: { hitU: 0.5, legs: 'R', keys: [[0, {}],
    [0.26, { hipR: [-1.3, 0, -0.08], knR: [2.05], anR: [0.35], spine: [-0.06, 0.08, 0], chest: [0, 0.1, 0], shL: [-0.7, 0.2, 0.55], elL: [-1.6], shR: [-0.45, -0.2, -0.55], elR: [-1.5], hips: [-0.06, -0.1, 0.05], P: [0, -0.05, -0.01] }], // chamber: knee up, body coils back
    [0.5, { hipR: [-1.55, 0, -0.1], knR: [0.15], anR: [0.55], spine: [-0.34, 0.14, 0.02], chest: [-0.1, 0.1, 0], shL: [-0.5, 0.3, 0.85], elL: [-1.1], shR: [-0.25, -0.3, -0.9], elR: [-1.2], hips: [-0.2, -0.16, 0.1], P: [0, -0.06, 0.03] }], // snap: the shin whips out, the trunk leans back to balance
    [0.64, { hipR: [-1.45, 0, -0.1], knR: [0.5], anR: [0.4], spine: [-0.28, 0.12, 0.02], chest: [-0.08, 0.08, 0], hips: [-0.16, -0.14, 0.08], P: [0, -0.06, 0.03] }],
    [0.84, { hipR: [-0.75, 0, -0.02], knR: [1.4], anR: [0.2], spine: [-0.08, 0.04, 0], hips: [-0.04, -0.04, 0.02], P: [0, -0.04, 0.01] }], [1, {}]] },
  spinKick: { hitU: 0.49, legs: 'R', keys: [[0, {}],
    [0.2, { hipR: [-0.55, 0, -0.3], knR: [1.45], spine: [0.1, -0.2, -0.1], chest: [0.05, -0.2, 0], shL: [-0.4, 0, 0.9], shR: [-0.4, 0, -0.9], P: [0, -0.07, 0] }],
    [0.49, { hipR: [-0.3, 0, -1.45], knR: [0.1], anR: [0.4], hips: [0, 0.2, -0.32], spine: [0, 0.3, -0.3], chest: [0, 0.15, -0.12], shL: [-0.3, 0, 1.25], elL: [-0.4], shR: [-0.3, 0, -1.1], elR: [-0.5], P: [0, -0.03, 0] }],
    [0.7, { hipR: [-0.25, 0, -0.9], knR: [0.6], hips: [0, 0.1, -0.18], spine: [0, 0.15, -0.18] }],
    [0.88, { hipR: [-0.3, 0, -0.2], knR: [0.9] }], [1, {}]] },
  flyKick: { hitU: 0.3, legs: 'LR', keys: [[0, { hipR: [-1.2], knR: [1.6], hipL: [0.2], knL: [1.1], spine: [0.1] }],
    [0.3, { hipR: [-1.55, 0, -0.05], knR: [0.05], anR: [0.5], hipL: [0.35, 0, 0.05], knL: [1.9], anL: [0.4], spine: [-0.4, 0, 0], chest: [-0.1], shL: [0.3, 0, 0.7], elL: [-0.6], shR: [0.4, 0, -0.7], elR: [-0.6] }],
    [0.7, { hipR: [-1.5], knR: [0.12], anR: [0.45], hipL: [0.3], knL: [1.8], spine: [-0.35, 0, 0] }],
    [1, { hipR: [-0.6], knR: [0.9], hipL: [-0.25], knL: [0.8] }]] },
  airKick: { hitU: 0.3, legs: 'LR', keys: [[0, {}],
    [0.3, { hipR: [-1.5, 0, -0.05], knR: [0.1], anR: [0.45], hipL: [0.25], knL: [1.6], spine: [-0.3, 0, 0], shL: [0.2, 0, 0.8], shR: [0.25, 0, -0.8] }],
    [0.8, { hipR: [-1.4], knR: [0.2], hipL: [0.2], knL: [1.5], spine: [-0.25] }], [1, {}]] },
  swing: { hitU: 0.55, keys: [[0, {}],
    [0.35, { shR: [-1.05, -0.95, -1.25], elR: [-1.3], shL: [-1.0, -0.5, 0.2], elL: [-1.2], chest: [0.02, -0.85, 0.06], spine: [0.08, -0.4, 0.03], hips: [0.04, -0.55, 0], P: [0, -0.07, -0.04] }],
    [0.55, { shR: [-1.45, 0.3, -0.25], elR: [-0.15], shL: [-1.2, 0.5, 0.3], elL: [-0.5], chest: [0.14, 0.72, -0.08], spine: [0.2, 0.34, -0.04], hips: [0.1, 0.36, 0], P: [0, -0.08, 0.08] }],
    [0.72, { shR: [-1.2, 0.9, -0.5], elR: [-0.4], shL: [-1.0, 0.7, 0.3], elL: [-0.7], chest: [0.12, 0.98, -0.08], spine: [0.16, 0.44, -0.04], hips: [0.07, 0.42, 0], P: [0, -0.07, 0.07] }],
    [1, {}]] },
  overhead: { hitU: 0.6, keys: [[0, {}],
    [0.42, { shR: [-2.9, 0, -0.25], elR: [-0.9], shL: [-2.8, 0, 0.25], elL: [-0.9], spine: [-0.22, 0, 0], chest: [-0.1], P: [0, 0.02, -0.02] }],
    [0.6, { shR: [-1.1, 0, -0.1], elR: [-0.1], shL: [-1.1, 0, 0.1], elL: [-0.2], spine: [0.55, 0, 0], chest: [0.15], P: [0, -0.2, 0.05] }],
    [0.76, { shR: [-0.9, 0, -0.1], elR: [-0.2], shL: [-0.9, 0, 0.1], elL: [-0.25], spine: [0.6], P: [0, -0.22, 0.05] }], [1, {}]] },
  stab: { hitU: 0.47, keys: [[0, {}],
    [0.3, { shR: [-0.3, -0.12, -0.38], elR: [-1.85], chest: [0.04, -0.36, 0.03], spine: [0.08, -0.12, 0], hips: [0.02, -0.18, 0], P: [0, -0.035, -0.03] }],
    [0.47, { shR: [-1.52, 0.1, -0.05], elR: [-0.14], chest: [0.14, 0.44, -0.06], spine: [0.24, 0.18, -0.02], hips: [0.08, 0.22, 0], shL: [-0.3, 0.1, 0.4], elL: [-1.2], P: [0, -0.06, 0.09] }],
    [0.62, { shR: [-1.4, 0.1, -0.08], elR: [-0.28], chest: [0.12, 0.38, -0.05], spine: [0.2, 0.16, -0.02], hips: [0.06, 0.18, 0], P: [0, -0.05, 0.08] }], [1, {}]] },
  shove: { hitU: 0.51, keys: [[0, {}],
    [0.3, { shL: [-0.7, 0, 0.15], elL: [-1.75], shR: [-0.7, 0, -0.15], elR: [-1.75], spine: [-0.04], chest: [-0.04], P: [0, -0.05, -0.05] }],
    [0.51, { shL: [-1.45, 0, 0.1], elL: [-0.15], shR: [-1.45, 0, -0.1], elR: [-0.15], spine: [0.32, 0, 0], chest: [0.08], hips: [0.08, 0, 0], P: [0, -0.07, 0.1] }],
    [0.7, { shL: [-1.35, 0, 0.1], elL: [-0.3], shR: [-1.35, 0, -0.1], elR: [-0.3], spine: [0.27], chest: [0.06], hips: [0.06, 0, 0], P: [0, -0.06, 0.08] }], [1, {}]] },
  slam: { hitU: 0.63, keys: [[0, {}],
    [0.45, { shR: [-3.0, 0, -0.35], elR: [-0.35], shL: [-3.0, 0, 0.35], elL: [-0.35], spine: [-0.28, 0, 0], chest: [-0.1], P: [0, 0.03, -0.02] }],
    [0.63, { shR: [-1.0, 0, -0.12], elR: [-0.1], shL: [-1.0, 0, 0.12], elL: [-0.1], spine: [0.75, 0, 0], chest: [0.2], P: [0, -0.42, 0.06] }],
    [0.8, { shR: [-0.8, 0, -0.1], elR: [-0.2], shL: [-0.8, 0, 0.1], elL: [-0.2], spine: [0.7], P: [0, -0.4, 0.05] }], [1, {}]] },
  arrest: { keys: [[0, {}],
    [0.25, { spine: [0.6, 0, 0], chest: [0.1], shL: [-1.1, 0, 0.1], elL: [-0.7], shR: [-1.1, 0, -0.1], elR: [-0.7], P: [0, -0.42, -0.08] }],
    [0.5, { spine: [0.65], shL: [-1.2, 0, -0.1], elL: [-1.0], shR: [-1.2, 0, 0.1], elR: [-1.0], P: [0, -0.45, -0.08] }],
    [0.75, { spine: [0.62], shL: [-1.15, 0, -0.05], elL: [-0.85], shR: [-1.15, 0, 0.05], elR: [-0.85], P: [0, -0.44, -0.08] }], [1, {}]] },
  /* ----- full-body clips (pelvis offsets absolute) ----- */
  fallBack: { pAbs: true, keys: [
    [0, { hips: [-0.15, 0, 0], spine: [-0.25], chest: [-0.15], head: [0.3], shL: [-0.7, 0, 0.7], elL: [-0.6], shR: [-0.6, 0, -0.7], elR: [-0.6], hipL: [-0.25, 0, 0.05], knL: [0.45], hipR: [0.1, 0, -0.05], knR: [0.35], anL: [0.1], anR: [0.1], P: [0, -0.06, 0] }],
    [0.3, { hips: [-0.6, 0, 0.05], spine: [-0.3], chest: [-0.2], head: [0.4], shL: [-1.7, 0, 0.9], elL: [-0.5], shR: [-1.5, 0, -1.0], elR: [-0.7], hipL: [-0.95, 0, 0.1], knL: [1.3], hipR: [-0.55, 0, -0.1], knR: [1.0], anL: [0.3], anR: [0.3], P: [0, -0.42, -0.12] }],
    [0.62, { hips: [-1.5, 0, 0.08], spine: [0.1], chest: [0.05], head: [0.5], shL: [-2.3, 0, 1.1], elL: [-0.4], shR: [-2.1, 0, -1.15], elR: [-0.6], hipL: [-1.15, 0, 0.12], knL: [0.85], hipR: [-0.75, 0, -0.1], knR: [0.55], anL: [0.3], anR: [0.3], P: [0, -0.8, -0.25] }],
    [0.78, { hips: [-1.55, 0, 0.05], spine: [0.05], head: [0.1], shL: [-0.5, 0, 1.3], elL: [-0.4], shR: [-0.4, 0, -1.25], elR: [-0.6], hipL: [-0.55, 0, 0.12], knL: [0.7], hipR: [-0.3, 0, -0.1], knR: [0.45], P: [0, -0.82, -0.25] }],
    [1, {}]] },
  fallFwd: { pAbs: true, keys: [
    [0, { hips: [0.2, 0, 0], spine: [0.3], chest: [0.1], head: [-0.1], shL: [-0.9, 0, 0.3], elL: [-0.5], shR: [-0.8, 0, -0.3], elR: [-0.5], hipL: [-0.3, 0, 0.05], knL: [0.5], hipR: [0.05, 0, -0.05], knR: [0.4], P: [0, -0.06, 0.02] }],
    [0.3, { hips: [0.55, 0, 0], spine: [0.35], chest: [0.1], head: [-0.2], shL: [-1.4, 0, 0.3], elL: [-0.25], shR: [-1.35, 0, -0.3], elR: [-0.25], hipL: [-1.3, 0, 0.1], knL: [1.75], hipR: [-1.05, 0, -0.1], knR: [1.6], anL: [-0.2], anR: [-0.2], P: [0, -0.45, 0.1] }],
    [0.62, { hips: [1.45, 0, 0], spine: [0.1], chest: [0.05], head: [-0.4], shL: [-2.5, 0, 0.55], elL: [-1.0], shR: [-2.4, 0, -0.55], elR: [-1.0], hipL: [-0.1, 0, 0.1], knL: [0.5], hipR: [0.0, 0, -0.1], knR: [0.4], P: [0, -0.8, 0.25] }],
    [0.78, { hips: [1.55, 0, 0], head: [-0.2], shL: [-1.2, 0, 1.0], elL: [-0.6], shR: [-1.0, 0, -1.0], elR: [-0.7], P: [0, -0.83, 0.25] }],
    [1, {}]] },
  getUpBack: { pAbs: true, keys: [
    [0, { hips: [-1.5708, 0, 0], spine: [0, 0, 0], chest: [0], head: [0.2], shL: [-0.2, 0, 1.1], elL: [-0.4], shR: [0.2, 0, -1.0], elR: [-0.5], hipL: [-0.15, 0, 0.12], knL: [0.5], hipR: [0.05, 0, -0.1], knR: [0.3], anL: [0.5], anR: [0.5], P: [0, -0.8, -0.49] }],
    [0.3, { hips: [-0.95, 0, 0], spine: [0.85], chest: [0.25], head: [0.1], shL: [0.55, 0, 0.35], elL: [-0.25], shR: [0.55, 0, -0.35], elR: [-0.25], hipL: [-1.8, 0, 0.15], knL: [2.2], hipR: [-1.1, 0, -0.1], knR: [1.4], anL: [-0.3], anR: [0.2], P: [0, -0.7, -0.4] }],
    [0.58, { hips: [-0.05, 0, 0], spine: [0.75], chest: [0.15], head: [-0.1], shL: [-0.8, 0, 0.25], elL: [-0.6], shR: [-0.7, 0, -0.25], elR: [-0.6], hipL: [-1.75, 0, 0.12], knL: [2.25], hipR: [-1.35, 0, -0.1], knR: [2.05], anL: [-0.45], anR: [-0.6], P: [0, -0.46, -0.05] }],
    [0.82, { hips: [0.05, 0, 0], spine: [0.3], chest: [0.05], head: [-0.05], shL: [-0.3, 0, 0.2], elL: [-0.5], shR: [-0.3, 0, -0.2], elR: [-0.5], hipL: [-0.75, 0, 0.08], knL: [1.1], hipR: [-0.55, 0, -0.08], knR: [0.9], anL: [-0.3], anR: [-0.3], P: [0, -0.14, 0] }],
    [1, {}]] },
  getUpFront: { pAbs: true, keys: [
    [0, { hips: [1.5708, 0, 0], spine: [0], chest: [0], head: [-0.3], shL: [-0.5, 0, 1.2], elL: [-0.5], shR: [-0.6, 0, -1.1], elR: [-0.5], hipL: [0.05, 0, 0.12], knL: [0.2], hipR: [0.1, 0, -0.1], knR: [0.1], anL: [0.9], anR: [0.9], P: [0, -0.8, 0.49] }],
    [0.28, { hips: [1.2, 0, 0], spine: [-0.15], chest: [-0.1], head: [-0.45], shL: [-1.55, 0, 0.3], elL: [-0.15], shR: [-1.55, 0, -0.3], elR: [-0.15], hipL: [-0.2, 0, 0.1], knL: [1.3], hipR: [-0.1, 0, -0.1], knR: [1.2], anL: [0.2], anR: [0.2], P: [0, -0.6, 0.35] }],
    [0.55, { hips: [0.35, 0, 0], spine: [0.45], chest: [0.1], head: [-0.2], shL: [-0.9, 0, 0.3], elL: [-0.4], shR: [-0.6, 0, -0.3], elR: [-0.6], hipL: [-1.45, 0, 0.1], knL: [1.95], hipR: [0.05, 0, -0.08], knR: [1.85], anL: [-0.3], anR: [0.6], P: [0, -0.5, 0.05] }],
    [0.82, { hips: [0.08, 0, 0], spine: [0.3], head: [-0.05], shL: [-0.3, 0, 0.2], elL: [-0.5], shR: [-0.3, 0, -0.2], elR: [-0.5], hipL: [-0.75, 0, 0.08], knL: [1.1], hipR: [-0.4, 0, -0.08], knR: [0.85], anL: [-0.3], anR: [-0.3], P: [0, -0.14, 0] }],
    [1, {}]] },
  climbUp: { pAbs: true, keys: [
    [0, { hips: [0.05, 0, 0], spine: [0.05], head: [-0.25], hipL: [-0.15, 0, 0.04], knL: [0.3], hipR: [0.05, 0, -0.04], knR: [0.45], anL: [0.4], anR: [0.4], P: [0, 0, 0] }],
    [0.3, { hips: [0.2, 0, 0], spine: [0.3], head: [-0.1], hipL: [-1.0, 0, 0.06], knL: [1.5], hipR: [-0.2, 0, -0.04], knR: [0.7], anL: [0.2], anR: [0.4], P: [0, 0, 0.05] }],
    [0.55, { hips: [0.45, 0, 0], spine: [0.6], head: [0.1], hipL: [-1.75, 0, 0.1], knL: [2.25], hipR: [-0.3, 0, -0.05], knR: [1.0], anL: [-0.3], anR: [0.3], P: [0, -0.2, 0.08] }],
    [0.8, { hips: [0.2, 0, 0], spine: [0.3], head: [0], hipL: [-0.9, 0, 0.08], knL: [1.2], hipR: [-0.1, 0, -0.05], knR: [0.5], anL: [-0.3], anR: [0.1], P: [0, -0.08, 0.03] }],
    [1, {}]] },
  vault: { pAbs: true, keys: [[0, {}],
    [0.3, { hips: [0.35, 0, 0], spine: [0.5], hipL: [-1.55, 0, 0.1], knL: [2.1], hipR: [-1.35, 0, -0.1], knR: [2.0], anL: [0.3], anR: [0.3], P: [0, -0.12, 0] }],
    [0.6, { hips: [0.2, 0, 0], spine: [0.35], hipL: [-1.25, 0, 0.1], knL: [1.3], hipR: [-1.15, 0, -0.1], knR: [1.4], anL: [0.2], anR: [0.2], P: [0, -0.05, 0] }],
    [0.85, { hips: [0.05, 0, 0], spine: [0.15], hipL: [-0.55, 0, 0.06], knL: [0.55], hipR: [-0.35, 0, -0.06], knR: [0.45], P: [0, 0, 0] }],
    [1, {}]] }
};
const CLIPS2 = {};

/* ---------- static poses ---------- */
const APose = {
  set(o, n, x, y, z) { const i = CH[n]; if (x !== undefined) o[i] = x; if (y !== undefined) o[i + 1] = y; if (z !== undefined) o[i + 2] = z; },
  flatFeet(o, k = 1) { o[CH.anL] += (-(o[CH.hipL] + o[CH.knL] + o[3]) - o[CH.anL]) * k; o[CH.anR] += (-(o[CH.hipR] + o[CH.knR] + o[3]) - o[CH.anR]) * k; },
  stand(o) {
    o.fill(0); const s = this.set;
    s(o, 'shL', 0.05, 0, 0.1); s(o, 'elL', -0.2); s(o, 'shR', 0.05, 0, -0.1); s(o, 'elR', -0.2); s(o, 'haL', 0.1); s(o, 'haR', 0.1);
    s(o, 'hipL', -0.06, 0.1, 0.03); s(o, 'knL', 0.12); s(o, 'hipR', -0.06, -0.1, -0.03); s(o, 'knR', 0.12); s(o, 'spine', 0.02); s(o, 'head', 0.03);
    o[HY] = -0.005; this.flatFeet(o); return o;
  },
  lying(o, faceUp, seed, dead) {
    o.fill(0); const s = this.set; const sd = seed || 0, d = faceUp ? 1 : -1;
    s(o, 'hips', faceUp ? -Math.PI / 2 : Math.PI / 2, 0, (sd - 0.5) * 0.1); o[HY] = -0.8; o[HZ] = faceUp ? -0.49 : 0.49;
    if (faceUp) {
      s(o, 'shL', -0.35 - sd * 0.3, 0, 1.25 + sd * 0.25); s(o, 'elL', -0.35); s(o, 'shR', -0.2, 0, -1.1 - sd * 0.3); s(o, 'elR', -0.3 - 0.6 * sd);
      s(o, 'hipL', -0.28 - sd * 0.25, 0.25, 0.12); s(o, 'knL', 0.45 + sd * 0.5); s(o, 'hipR', -0.08, -0.2, -0.1); s(o, 'knR', 0.15 + sd * 0.2);
      s(o, 'anL', 0.55); s(o, 'anR', 0.6); s(o, 'head', 0.12, (sd - 0.5) * (dead ? 1.4 : 0.8), 0);
    } else {
      s(o, 'shL', -2.3 - sd * 0.3, 0, 0.6 + sd * 0.3); s(o, 'elL', -1.1); s(o, 'shR', -0.6, 0, -1.2 - sd * 0.2); s(o, 'elR', -0.5 - sd * 0.5);
      s(o, 'hipL', -0.1, 0.1, 0.14); s(o, 'knL', 0.1 + sd * 0.2); s(o, 'hipR', -0.08, -0.1, -0.1); s(o, 'knR', 0.05);
      s(o, 'anL', 0.9); s(o, 'anR', 0.95); s(o, 'head', -0.35, (sd - 0.5) * (dead ? 1.6 : 1.1), 0);
    }
    s(o, 'spine', 0.02 * d); return o;
  },
  kneel(o, hands) { // hands: 'up' | 'back' | 'down'
    o.fill(0); const s = this.set; o[HY] = -0.47;
    s(o, 'hipL', -0.05, 0, 0.06); s(o, 'knL', 1.6); s(o, 'hipR', -0.05, 0, -0.06); s(o, 'knR', 1.6); s(o, 'anL', 0.5); s(o, 'anR', 0.5);
    s(o, 'spine', 0.12); s(o, 'head', 0.3);
    if (hands === 'up') { s(o, 'shL', -2.45, 0, 0.85); s(o, 'elL', -2.1); s(o, 'shR', -2.45, 0, -0.85); s(o, 'elR', -2.1); s(o, 'head', 0.05); s(o, 'spine', 0.05); }
    else if (hands === 'back') { s(o, 'shL', 0.55, 0, -0.25); s(o, 'elL', -0.95); s(o, 'shR', 0.55, 0, 0.25); s(o, 'elR', -0.95); }
    else { s(o, 'shL', -0.2, 0, 0.1); s(o, 'elL', -0.5); s(o, 'shR', -0.2, 0, -0.1); s(o, 'elR', -0.5); }
    return o;
  },
  cower(o, t) {
    o.fill(0); const s = this.set; o[HY] = -0.42;
    s(o, 'hipL', -1.55, 0, 0.15); s(o, 'knL', 2.2); s(o, 'hipR', -1.55, 0, -0.15); s(o, 'knR', 2.2);
    s(o, 'spine', 0.65 + Math.sin(t * 9) * 0.02); s(o, 'chest', 0.1); s(o, 'head', 0.3);
    s(o, 'shL', -2.6, 0, 0.3); s(o, 'elL', -1.7); s(o, 'shR', -2.6, 0, -0.3); s(o, 'elR', -1.7);
    this.flatFeet(o, 0.8); return o;
  },
  sit(o) {
    o.fill(0); const s = this.set; o[HY] = -0.4;
    s(o, 'hipL', -1.45, 0, 0.08); s(o, 'knL', 1.35); s(o, 'hipR', -1.45, 0, -0.08); s(o, 'knR', 1.35);
    s(o, 'shL', -1.05, 0, -0.12); s(o, 'elL', -0.7); s(o, 'shR', -1.05, 0, 0.12); s(o, 'elR', -0.7); s(o, 'spine', -0.1); return o;
  }
};
// upper-body overlays: [joint, x, y, z]
const LAYERS = {
  guard: [['spine', 0.1, 0.1, 0], ['chest', 0.05, 0.12, 0], ['shL', -0.75, 0.15, 0.34], ['elL', -1.9, 0, 0], ['haL', 0.1, 0, 0], ['shR', -0.5, -0.1, -0.36], ['elR', -2.15, 0, 0], ['haR', 0.15, 0, 0]],
  ready: [['spine', 0.08, 0.05, 0], ['shR', -0.55, 0, -0.25], ['elR', -1.35, 0, 0], ['shL', -0.55, 0.1, 0.3], ['elL', -1.5, 0, 0]],
  holdPistol: [['shR', -0.42, 0, -0.06], ['elR', -0.75, 0, 0]],
  holdRifle: [['shR', -0.35, 0, -0.2], ['elR', -1.3, 0, 0], ['shL', -0.85, 0, -0.35], ['elL', -0.7, 0, 0]],
  umbrella: [['shR', -0.7, 0, -0.1], ['elR', -1.2, 0, 0]],
  handsUp: [['shL', -2.8, 0, 0.45], ['elL', -0.45, 0, 0], ['shR', -2.8, 0, -0.45], ['elR', -0.45, 0, 0]],
  block: [['shL', -1.35, 0, -0.3], ['elL', -1.95, 0, 0], ['shR', -1.3, 0, 0.32], ['elR', -1.95, 0, 0], ['spine', 0.18, 0, 0], ['chest', 0.05, 0, 0]],
  carry: [['shL', -0.15, 0, 0.12], ['elL', -0.35, 0, 0]]
};
function applyLayer(T, L, w) { if (w < 0.002) return; for (let k = 0; k < L.length; k++) { const e = L[k], i = CH[e[0]]; T[i] += (e[1] - T[i]) * w; T[i + 1] += (e[2] - T[i + 1]) * w; T[i + 2] += (e[3] - T[i + 2]) * w; } }
function blendJ(T, n, x, y, z, w) { const i = CH[n]; T[i] += (x - T[i]) * w; T[i + 1] += (y - T[i + 1]) * w; T[i + 2] += (z - T[i + 2]) * w; }

// idle attitudes of people standing around: wrist targets (root space) and elbow direction, solved once by IK
const IDLE_DEFS = {
  crossed: { L: [-0.05, 1.235, 0.135], R: [0.06, 1.215, 0.15], pole: [1, -0.25, 0.45] },
  hips: { L: [0.2, 1.0, 0.0], R: [-0.2, 1.0, 0.0], pole: [1, 0.1, -0.6] },
  phone: { R: [-0.02, 1.23, 0.24], L: [0.05, 1.12, 0.2], pole: [0.35, -1, 0.1] },
  back: { L: [0.03, 0.98, -0.14], R: [-0.03, 0.98, -0.14], pole: [0.7, -0.4, -1] }
};
// walking styles (see Folk.gait): pelvis sway, arm swing and carriage, stoop, stance width, bounce
const GAIT0 = { sway: 1, arms: 1, armOut: 0, elbow: 0, stoop: 0, width: 1, bounce: 1 };
function initAnim() {
  APose.stand(STAND);
  for (const k in CLIP_DEFS) CLIPS2[k] = makeClip(CLIP_DEFS[k]);
  for (const k in IDLE_DEFS) {
    const D = IDLE_DEFS[k], p = new Float32Array(STAND), L = [];
    armIK(p, 0, D.L[0], D.L[1], D.L[2], 0, 1, null, D.pole); armIK(p, 1, D.R[0], D.R[1], D.R[2], 0, 1, null, D.pole);
    for (const j of ['shL', 'elL', 'shR', 'elR']) L.push([j, p[CH[j]], p[CH[j] + 1], p[CH[j] + 2]]);
    LAYERS['idle_' + k] = L;
  }
}

/* =====================================================================
   per-actor animation state
   ===================================================================== */
class Anim {
  constructor(a) {
    this.a = a;
    this.T = new Float32Array(PSZ); this.B = new Float32Array(PSZ); this.L = new Float32Array(PSZ); this.Tp = new Float32Array(PSZ);
    this.off = new Float32Array(PSZ); this.offV = new Float32Array(PSZ); this.hl = 0.1; this.fixV = false;
    this.prev = new Float32Array(PSZ); this.prev2 = new Float32Array(PSZ); this.lastDt = 1 / 60;
    this.pst = null; this.atkRef = null; this.mode = null; this.time = R(0, 10);
    this.feet = [this.newFoot(0), this.newFoot(1)]; this.feetOK = false; this.ft = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
    this.phase = R(0, 1); this.cycle = false; this.cw = 0; this.lastTouch = 0; this.gaitF = 2; this.beta = 0.6;
    this.yaw = sp(a.yaw); this.yawRate = sp(); this.rootYaw = a.yaw;
    this.spd = sp(); this.vf = sp(); this.vl = sp(); this.af = sp(); this.al = sp();
    this.runK = 0; this.moveK = 0; this.steer = sp(); this.shift = sp(); this.shiftT = R(2, 6); this.shiftTgt = 0;
    this.land = sp(); this.rp = sp(); this.rr = sp(); this.ry = sp(); this.pushF = 0; this.pushL = 0;
    this.lookY = sp(); this.lookP = sp(); this.lookT = R(1, 4); this.lookTY = 0; this.lookTP = 0;
    this.w = { guard: 0, ready: 0, hold: 0, rifle: 0, aim: 0, block: 0, umb: 0, hands: 0, carry: 0, stag: 0, idle: 0, talk: 0, thr: 0 }; this.stillT = 0; this.kick = 0;
    this.wl = sp(1); this.free = [sp(), sp()];
    this.airT = 0; this.airLead = 0; this.hangPh = 0; this.zsw = sp(); this.zipV = 0; this.hands = null;
    this.tail = { a: -0.25, v: 0 };
    APose.stand(a.pose); this.prev.set(a.pose); this.prev2.set(a.pose); this.T.set(a.pose);
    a.renderYaw = a.yaw;
  }
  newFoot(side) { return { side, swing: false, cyc: false, s: 0, s0: 0, dur: 0.3, x: 0, y: 0, z: 0, yaw: 0, pk: sp(), pitch: 0, sx: 0, sy: 0, sz: 0, syaw: 0, spitch: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, lift: 0.08, peak: 0.4, pu: 0, liftCyc: -1, pmid: 0.3, pc: -0.2 }; }
  // ---------------------------------------------------------------- main
  update(dt) {
    const a = this.a; if (!(dt > 0)) dt = 1e-4; if (dt > 0.1) dt = 0.1;
    this.time += dt; ARM_X = a.app.shX || 0.19;
    const P = a.pose, T = this.T;
    let camD2 = 0;
    { const cp = Cam.pos, dx = a.pos.x - cp.x, dz = a.pos.z - cp.z; camD2 = dx * dx + dz * dz; a.animNear = camD2 < 1225; }
    // off-screen actors only keep their kinematics up to date; the pose is rebuilt when they come back into view
    const vis = a === Game.player || !Cam.sphereVisible || (camD2 < 125 * 125 && Cam.sphereVisible(a.pos.x, a.pos.y + 1, a.pos.z, 2.5)) || (a.mpSeenT !== undefined && (Game.simT || 0) - a.mpSeenT < 0.5); // (multiplayer host: also posed when a guest sees it)
    if (!vis) { this.hidden(dt); return; }
    // distant characters animate at half rate (they are a few pixels tall)
    if (camD2 > 42 * 42 && a !== Game.player && !this.wasHidden) { this.accDt = (this.accDt || 0) + dt; this.half = !this.half; if (this.half) return; dt = this.accDt; this.accDt = 0; }
    else this.accDt = 0;
    if (this.wasHidden) { this.wasHidden = false; this.feetOK = false; this.pst = null; this.off.fill(0); this.offV.fill(0); }
    // kinematics
    const vx = a.vel.x, vz = a.vel.z, hs = Math.hypot(vx, vz); a.speedNow = hs;
    const py = this.yaw.x;
    Spr.angle(this.yaw, a.yaw, this.yawHL(), dt);
    a.renderYaw = this.yaw.x; this.rootYaw = this.yaw.x + (a.visYaw || 0);
    const dvis = wrapAngle((a.visYaw || 0) - (this.pvis || 0)); this.pvis = a.visYaw || 0;
    if (dvis) for (const F of this.feet) if (!F.swing) F.yaw += dvis; // pivot the support foot during spins
    Spr.to(this.yawRate, clamp(wrapAngle(this.yaw.x - py) / dt, -14, 14), 0.06, dt);
    const cy = Math.cos(this.yaw.x), sy = Math.sin(this.yaw.x);
    const pvf = this.vf.x, pvl = this.vl.x;
    Spr.to(this.vf, vx * sy + vz * cy, 0.04, dt); Spr.to(this.vl, vx * cy - vz * sy, 0.04, dt);
    Spr.to(this.af, clamp((this.vf.x - pvf) / dt, -25, 25), 0.09, dt); Spr.to(this.al, clamp((this.vl.x - pvl) / dt, -25, 25), 0.09, dt);
    Spr.to(this.spd, hs, 0.05, dt);
    if (!a.grounded) this.airT += dt; else this.airT = 0;
    // mode & target pose
    const st = a.state, mode = this.modeFor(st);
    const changed = this.pst !== null && (st !== this.pst || mode !== this.mode || (st === 'attack' && a.atk !== this.atkRef));
    if (changed && st === 'air') this.pickAirLead();
    if (mode === 'ground') this.groundPose(dt); else { this.feetOK = false; this.fullPose(dt, st); }
    this.reactions(dt);
    // inertialized transition
    if (changed) this.inertialize(this.transHL(this.pst, st, mode));
    else if (this.fixV) { this.fixV = false; for (let i = 0; i < PSZ; i++) { const d = i < NANG ? wrapAngle(T[i] - this.Tp[i]) : T[i] - this.Tp[i]; this.offV[i] -= clamp(d / dt, -30, 30); } }
    this.pst = st; this.mode = mode; this.atkRef = a.atk;
    this.Tp.set(T);
    const y = 1.3862944 / (this.hl + 1e-5), e = Math.exp(-y * dt);
    for (let i = 3; i < PSZ; i++) {
      const x0 = this.off[i], v0 = this.offV[i];
      if (x0 === 0 && v0 === 0) { P[i] = T[i]; continue; }
      const j1 = v0 + x0 * y; let x1 = e * (x0 + j1 * dt), v1 = e * (v0 - j1 * y * dt);
      if (Math.abs(x1) < 1e-5 && Math.abs(v1) < 1e-4) { x1 = 0; v1 = 0; }
      this.off[i] = x1; this.offV[i] = v1; P[i] = T[i] + x1;
    }
    P[0] = P[1] = P[2] = 0;
    // keep planted feet exactly on their marks
    Spr.to(this.wl, mode === 'ground' ? 1 : 0, 0.035, dt);
    if ((mode === 'ground' || this.wl.x > 0.01) && camD2 < 45 * 45) this.postIK();
    this.tailSpring(dt, hs);
    const tmp = this.prev2; this.prev2 = this.prev; this.prev = tmp; tmp.set(P); this.lastDt = dt;
  }
  hidden(dt) {
    const a = this.a; this.wasHidden = true; this.time += dt;
    a.speedNow = Math.hypot(a.vel.x, a.vel.z); this.yaw.x = a.yaw; this.yaw.v = 0; a.renderYaw = a.yaw; this.rootYaw = a.yaw + (a.visYaw || 0);
    this.spd.x = a.speedNow; this.spd.v = 0; this.feetOK = false;
  }
  yawHL() {
    const a = this.a, st = a.state;
    if (st === 'attack') return 0.035; if (st === 'roll' || st === 'hang' || st === 'ladder' || st === 'zip' || st === 'climb' || st === 'vault' || st === 'fence') return 0.03;
    if (st === 'down' || st === 'ko' || st === 'dead' || st === 'getup') return 0.02;
    return a === Game.player ? 0.05 : 0.085;
  }
  modeFor(st) {
    const a = this.a;
    switch (st) {
      case 'move': case 'talk': case 'victim': case 'arresting': case 'hit': case 'charge': return 'ground';
      case 'surrender': return a.st < 0.35 ? 'ground' : 'full';
      case 'attack': { const A = a.atk; if (!A) return 'ground'; const C = CLIPS2[A.d.clip]; if (A.d.air || (C && C.legs === 'LR') || !a.grounded) return 'full'; return 'ground'; }
    }
    return 'full';
  }
  transHL(from, to, mode) {
    if (to === 'attack') return 0.045;
    if (from === 'attack') return 0.09;
    if (to === 'down' || to === 'ko' || to === 'dead') return 0.045;
    if (to === 'hit') return 0.04;
    if (from === 'hit') return 0.1;
    if (to === 'air') return from === 'move' ? 0.06 : 0.08;
    if (from === 'air') return 0.05;
    if (to === 'roll' || from === 'roll') return 0.05;
    if (to === 'hang' || to === 'ladder' || to === 'zip') return 0.07;
    if (to === 'fence') return 0.08;
    if (from === 'climb' || from === 'vault' || from === 'ladder' || from === 'fence') return 0.07;
    if (from === 'getup') return 0.1;
    if (to === 'surrender' || to === 'cower' || to === 'cuffed' || to === 'beingCuffed') return mode === 'full' ? 0.16 : 0.1;
    return 0.09;
  }
  inertialize(hl) {
    const P = this.a.pose, T = this.T;
    const A = this.prev, B2 = this.prev2, idt = 0.6 / this.lastDt;
    for (let i = 3; i < PSZ; i++) {
      this.off[i] = i < NANG ? wrapAngle(P[i] - T[i]) : P[i] - T[i];
      this.offV[i] = clamp((i < NANG ? wrapAngle(A[i] - B2[i]) : A[i] - B2[i]) * idt, -15, 15);
    }
    this.hl = hl; this.fixV = true;
  }
  // ---------------------------------------------------------------- helpers
  toLocal(wx, wy, wz, out) { // world -> root space (character units)
    const a = this.a, s = a.app.scale || 1, c = Math.cos(this.rootYaw), n = Math.sin(this.rootYaw);
    const dx = wx - a.pos.x, dy = wy - (a.pos.y + a.visY), dz = wz - a.pos.z;
    out[0] = (c * dx - n * dz) / s; out[1] = dy / s; out[2] = (n * dx + c * dz) / s; return out;
  }
  toWorld(lx, ly, lz, out) {
    const a = this.a, s = a.app.scale || 1, c = Math.cos(this.rootYaw), n = Math.sin(this.rootYaw);
    out[0] = a.pos.x + (c * lx + n * lz) * s; out[1] = a.pos.y + a.visY + ly * s; out[2] = a.pos.z + (-n * lx + c * lz) * s; return out;
  }
  groundY(x, z) {
    const a = this.a;
    if (!a.animNear) return a.groundY !== undefined ? a.groundY : a.pos.y;
    const g = World.groundAt(x, z, 0.06 * (a.app.scale || 1), a.pos.y + 0.45);
    return clamp(g, a.pos.y - 0.45, a.pos.y + 0.45);
  }
  // rest stance (root space): [x, z, yaw]
  rest(i, gw) {
    const sd = this.a.seed || 0.5, wdt = (0.1 + sd * 0.02) * (this.a.app.gait ? this.a.app.gait.width : 1);
    const nx = i ? -wdt : wdt, nz = i ? -0.01 : 0.02, ny = i ? -0.1 : 0.1;
    if (gw < 0.01) return [nx, nz, ny];
    const gx = i ? -0.13 : 0.12, gz = i ? -0.12 : 0.13, gyw = i ? -0.55 : -0.15;
    return [lerp(nx, gx, gw), lerp(nz, gz, gw), lerp(ny, gyw, gw)];
  }
  // ankle offset when the foot rolls over the ball (p > 0, heel up) or rocks on the heel (p < 0, toes up)
  pivotY(p) { return p >= 0 ? ANK_H * (Math.cos(p) - 1) + 0.14 * Math.sin(p) : ANK_H * (Math.cos(p) - 1) - 0.085 * Math.sin(p); }
  pivotZ(p) { return p >= 0 ? ANK_H * Math.sin(p) + 0.14 * (1 - Math.cos(p)) : ANK_H * Math.sin(p) + 0.085 * (Math.cos(p) - 1); }
  // ---------------------------------------------------------------- feet
  initFeet() {
    const a = this.a, s = a.app.scale || 1, W = [0, 0, 0];
    for (let i = 0; i < 2; i++) {
      const F = this.feet[i];
      legFK(a.pose, i, _fk);
      this.toWorld(_fk[0], _fk[1], _fk[2], W);
      const g = this.groundY(W[0], W[2]) + ANK_H * s;
      F.x = W[0]; F.z = W[2]; F.yaw = this.rootYaw + _fk[3]; F.pk.x = F.pitch = clamp(_fk[4], -0.6, 1.0); F.pk.v = 0; F.liftCyc = -1;
      if (W[1] - g > 0.12 * s) { F.y = W[1]; this.lift(F, false, 0, 0.12); F.lift = 0; F.pmid = F.pitch * 0.5; F.pc = 0; }
      else { F.y = g; F.swing = false; }
    }
    this.feetOK = true; this.cycle = false; this.lastTouch = this.time;
  }
  lift(F, cyc, s, dur, s0 = 0) {
    F.swing = true; F.cyc = cyc; F.s = s; F.s0 = Math.min(0.9, s0); F.dur = dur;
    F.sx = F.x; F.sy = F.y; F.sz = F.z; F.syaw = F.yaw; F.spitch = F.pitch;
    F.tx = F.x; F.ty = F.y; F.tz = F.z; F.tyaw = F.yaw; F.tInit = false;
  }
  rebase(F, sNew) {
    const a = this.a, sc = a.app.scale || 1;
    const sn = clamp((F.s - F.s0) / (1 - F.s0), 0, 1), rk = F.cyc ? this.runK : 0, bb = 1 - this.beta;
    const h = rk > 0.001 ? lerp(cycl(sn), herm01(sn, 0.22 * bb, 0.12 * bb), rk) : cycl(sn);
    F.sx = F.sx + (F.tx - F.sx) * h; F.sz = F.sz + (F.tz - F.sz) * h; F.sy = F.sy + (F.ty - F.sy) * h + F.lift * sc * bump(sn, F.peak, rk) * (1 - F.s0 * 0.5);
    F.syaw = F.syaw + wrapAngle(F.tyaw - F.syaw) * h; F.spitch = F.pitch;
    F.s = F.s0 = clamp(sNew, 0, 0.95);
  }
  touch(F) {
    F.swing = false; F.s = 1; F.x = F.tx; F.y = F.ty; F.z = F.tz; F.yaw = F.tyaw; this.lastTouch = this.time;
    const a = this.a;
    if (a.speedNow > 0.9 && (a === Game.player || (a.animNear && dist3(a.pos, Cam.pos) < 22))) Snd.play(a.app.robot ? 'mstep' : 'step', { x: F.x, y: F.y, z: F.z }, 0.28 + this.runK * 0.42);
  }
  startCycle(vx, vz) {
    const a = this.a, sc = a.app.scale || 1, F0 = this.feet[0], F1 = this.feet[1];
    const hv = Math.hypot(vx, vz) || 1, ux = vx / hv, uz = vz / hv;
    // the foot further back along the direction of travel steps first
    let lead;
    if (F0.swing && !F1.swing) lead = 0; else if (F1.swing && !F0.swing) lead = 1;
    else if (F0.swing && F1.swing) lead = F0.s <= F1.s ? 0 : 1;
    else { const d0 = (F0.x - a.pos.x) * ux + (F0.z - a.pos.z) * uz, d1 = (F1.x - a.pos.x) * ux + (F1.z - a.pos.z) * uz; lead = d0 <= d1 ? 0 : 1; }
    const F = this.feet[lead], O = this.feet[1 - lead];
    const b = this.beta, Tc = 2 / this.gaitF, v = Math.max(this.spd.x, hv) / sc, travel = Math.max(0.12, v * b * Tc), lam = lerp(0.5, 0.5, this.runK);
    // where is the stance foot inside its stance? (0 = just landed ahead, 1 = about to push off behind)
    const dO = ((O.x - a.pos.x) * ux + (O.z - a.pos.z) * uz) / sc - this.rest(1 - lead, 0)[1];
    const sig = clamp((lam * travel - dO) / travel, 0.05, 0.85);
    let uO = sig * b, uF = frac(uO + 0.5);
    // keep at least ~45% of the first swing so the opening step is never a snap
    if (uF >= b && (uF - b) / (1 - b) > 0.55) { uF = b + 0.55 * (1 - b); uO = frac(uF - 0.5); }
    const oldPhase = this.phase;
    this.phase = Math.floor(this.phase) + 1 + frac(lead ? uF - 0.5 : uF);
    if (F.swing) { this.rebase(F, uF >= b ? (uF - b) / (1 - b) : 0); F.cyc = true; }
    else if (uF >= b) { const s0 = (uF - b) / (1 - b); this.lift(F, true, s0, 0.3, s0); }
    F.liftCyc = uF >= b ? Math.floor(this.phase + (lead ? 0.5 : 0)) : -1;
    if (O.swing) O.cyc = false;
    O.liftCyc = -1;
    F0.pu = frac(this.phase); F1.pu = frac(this.phase + 0.5);
    if (this.cw > 0.15 && Math.abs(frac(this.phase - oldPhase + 0.5) - 0.5) > 0.05) this.inertialize(0.08);
  }
  swingTarget(F, i, tRem, Tst, lam, gw) {
    const a = this.a, s = a.app.scale || 1;
    const r = this.rest(i, gw);
    let lx = r[0] + (this.vl.x / s) * Tst * lam, lz = r[1] + (this.vf.x / s) * Tst * lam;
    if (i === 0) lx = Math.max(lx, 0.04); else lx = Math.min(lx, -0.04);
    const dx = lx - r[0], dz = lz - r[1], d = Math.hypot(dx, dz); if (d > 0.62) { lx = r[0] + dx * 0.62 / d; lz = r[1] + dz * 0.62 / d; }
    const pyaw = this.rootYaw + clamp(this.yawRate.x * tRem * 0.7, -1, 1);
    const px = a.pos.x + a.vel.x * tRem, pz = a.pos.z + a.vel.z * tRem;
    const c = Math.cos(pyaw), n = Math.sin(pyaw);
    F.tx = px + (c * lx + n * lz) * s; F.tz = pz + (-n * lx + c * lz) * s;
    F.tyaw = pyaw + r[2] + this.steer.x * 0.6;
    F.ty = this.groundY(F.tx, F.tz) + ANK_H * s;
  }
  settleTarget(F, i, gw, dt) {
    const ox = F.tx, oz = F.tz, oy = F.ty, oyaw = F.tyaw;
    this.swingTarget(F, i, Math.min(0.15, Math.max(0, (1 - F.s) * F.dur)), 0, 0, gw);
    if (F.tInit) { const k = 1 - Math.exp(-18 * dt); F.tx = ox + (F.tx - ox) * k; F.tz = oz + (F.tz - oz) * k; F.ty = oy + (F.ty - oy) * k; F.tyaw = oyaw + wrapAngle(F.tyaw - oyaw) * k; }
    F.tInit = true;
  }
  updateFeet(dt, gw) {
    const a = this.a, s = a.app.scale || 1, rk = this.runK;
    const v = this.spd.x / s, f = this.gaitF, b = this.beta, Tc = 2 / f, Tst = b * Tc, Tsw = (1 - b) * Tc, lam = lerp(0.5, 0.5, rk);
    const psiC = lerp(-0.26, -0.06, rk), psiT = lerp(0.55, 1.3, rk), heelOff = lerp(0.5, 0.1, rk);
    // cycle on / off (hysteresis)
    const burst = (a.state === 'attack' || a.state === 'hit') && v < 2.6;
    const vNow = (a.speedNow || 0) / s;
    const want = !burst && (this.cycle ? v > 0.22 && vNow > 0.12 : v > 0.5 && vNow > 0.45);
    if (want && !this.cycle) { this.cycle = true; this.startCycle(a.vel.x, a.vel.z); }
    else if (!want && this.cycle) {
      this.cycle = false;
      // a foot still in the air finishes with a short, low step to its resting place
      for (const F of this.feet) if (F.swing && F.cyc) { this.rebase(F, 0); F.cyc = false; F.dur = clamp((1 - F.s) * Tsw, 0.14, 0.24); F.s = F.s0 = 0; F.lift = 0.05; F.peak = 0.35; F.pmid = 0.2; F.pc = -0.05; F.tInit = false; }
    }
    this.cw = damp(this.cw, this.cycle ? 1 : 0, 7, dt);
    if (this.cycle) this.phase += dt * f / 2;
    for (let i = 0; i < 2; i++) {
      const F = this.feet[i];
      if (this.cycle) {
        const u = frac(this.phase + (i ? 0.5 : 0)), cyc = Math.floor(this.phase + (i ? 0.5 : 0));
        if (F.swing) {
          // follow the phase, but never stall when the duty factor shifts under a speed change
          if (F.cyc) { const sn = (u - b) / (1 - b); if (u < F.pu - 0.5 || sn >= 0.999) F.s = 1; else F.s = Math.min(1, Math.max(F.s + dt * f * 0.5 / (1 - b) * 0.6, sn)); }
          else F.s += dt / F.dur;
        } else if (u >= b && u < b + 0.45 * (1 - b) && F.liftCyc !== cyc) {
          const O = this.feet[1 - i];
          if (!O.swing || !O.cyc || b < 0.5 || O.s > 0.85) { this.lift(F, true, (u - b) / (1 - b), Tsw); F.liftCyc = cyc; }
        }
        // planted foot pitch follows the stance roll-over (heel strike -> flat -> toe-off)
        if (!F.swing) {
          const sg = clamp(u / b, 0, 1);
          const pt = u > b ? psiT : sg < 0.14 ? lerp(psiC, 0, ease(sg / 0.14)) : sg < heelOff ? 0 : lerp(0, psiT, ease((sg - heelOff) / (1 - heelOff)));
          Spr.to(F.pk, pt, 0.02, dt); F.pitch = F.pk.x;
          // safety: forced step when over-stretched or twisted
          const L = this.toLocal(F.x, F.y, F.z, _v), r = this.rest(i, gw);
          if (Math.hypot(L[0] - r[0], L[2] - r[1]) > 0.95 || Math.abs(wrapAngle(F.yaw - this.rootYaw - r[2])) > 1.3) { this.lift(F, false, 0, 0.16); F.lift = 0.06; F.pmid = 0.3; F.pc = -0.05; F.liftCyc = cyc; }
        }
        F.pu = u;
        if (F.swing && F.cyc) { F.lift = clamp(lerp(0.065 + 0.02 * v, 0.17 + 0.05 * (v - 2.5), rk), 0.05, 0.46); F.peak = lerp(0.42, 0.4, rk); F.pmid = lerp(0.3, 0.9, rk); F.pc = psiC; }
      } else {
        if (F.swing) F.s += dt / F.dur;
        if (!F.swing) {
          // a fighter's rear foot rides up on its toes when it is left behind (a lunge, a long stance): the knee bends instead of locking
          let pt = 0;
          if (gw > 0.3 || a.state === 'attack') { const L = this.toLocal(F.x, F.y, F.z, _v), r = this.rest(i, gw); pt = clamp((-(L[2] - r[1]) - 0.22) * 2.2, 0, 0.9) * Math.max(gw, a.state === 'attack' ? 1 : 0); }
          Spr.to(F.pk, pt, 0.06, dt); F.pitch = F.pk.x;
        }
      }
      if (F.swing) {
        if (F.cyc) { this.swingTarget(F, i, Math.max(0, (1 - F.s) * Tsw), Tst, lam, gw); F.tInit = false; } else this.settleTarget(F, i, gw, dt);
        const s2 = clamp((F.s - F.s0) / (1 - F.s0), 0, 1);
        F.pitch = s2 < 0.4 ? lerp(F.spitch, F.pmid, ease(s2 / 0.4)) : lerp(F.pmid, F.pc, ease((s2 - 0.4) / 0.6));
        F.pk.x = F.pitch; F.pk.v = 0;
        if (F.s >= 1) this.touch(F);
      }
    }
    // a planted foot left too far behind (lunges, shoves) is dragged along instead of stretching the leg
    for (let i = 0; i < 2; i++) {
      const F = this.feet[i]; if (F.swing) continue;
      const L = this.toLocal(F.x, F.y, F.z, _v), r = this.rest(i, gw), dx = L[0] - r[0], dz = L[2] - r[1], d = Math.hypot(dx, dz), lim = this.cycle ? 0.8 : 0.62;
      if (d > lim) { const k = (d - lim) / d; const c = Math.cos(this.rootYaw), n = Math.sin(this.rootYaw); const wx = (c * dx + n * dz) * k * s, wz = (-n * dx + c * dz) * k * s; F.x -= wx; F.z -= wz; }
    }
    // idle / settle stepping: move the foot that is furthest from its rest mark
    const fight = gw > 0.5 || a.state === 'attack' || a.state === 'hit';
    if (!this.cycle && !this.feet[0].swing && !this.feet[1].swing && this.time - this.lastTouch > (fight ? 0.03 : 0.07)) {
      let best = -1, be = 0;
      for (let i = 0; i < 2; i++) {
        const F = this.feet[i], r = this.rest(i, gw);
        const L = this.toLocal(F.x, F.y, F.z, _v);
        const pvx = this.vl.x * 0.18 / s, pvz = this.vf.x * 0.18 / s;
        const err = Math.hypot(L[0] - r[0] - pvx, L[2] - r[1] - pvz) + Math.abs(wrapAngle(F.yaw - this.rootYaw - r[2])) * 0.22;
        if (err > be) { be = err; best = i; }
      }
      if (best >= 0 && be > (fight ? 0.09 : 0.14)) {
        const F = this.feet[best];
        // quick shuffle steps in a fight, calmer repositioning otherwise
        this.lift(F, false, 0, fight ? clamp(0.21 - (be - 0.1) * 0.1, 0.13, 0.21) : clamp(0.2 + be * 0.25, 0.2, 0.34));
        F.lift = (fight ? 0.03 : 0.045) + Math.min(0.06, be * 0.1); F.peak = 0.4; F.pmid = 0.22; F.pc = -0.04;
      }
    }
  }
  // current foot (ankle) pose in world: returns [x,y,z,yaw,pitch]
  footNow(F, out) {
    const a = this.a, s = a.app.scale || 1;
    let x, y, z, yw;
    if (!F.swing) { x = F.x; y = F.y; z = F.z; yw = F.yaw; }
    else {
      const sn = clamp((F.s - F.s0) / (1 - F.s0), 0, 1), rk = F.cyc ? this.runK : 0, bb = 1 - this.beta;
      // walking: foot at rest in the world at both ends; running: leaves the ground already moving and paws back before landing
      const h = rk > 0.001 ? lerp(cycl(sn), herm01(sn, 0.22 * bb, 0.12 * bb), rk) : cycl(sn);
      x = F.sx + (F.tx - F.sx) * h; z = F.sz + (F.tz - F.sz) * h; y = F.sy + (F.ty - F.sy) * h + F.lift * s * bump(sn, F.peak, rk) * (1 - F.s0 * 0.5);
      yw = F.syaw + wrapAngle(F.tyaw - F.syaw) * h;
    }
    const p = F.pitch, dz = this.pivotZ(p) * s, dy = this.pivotY(p) * s;
    out[0] = x + Math.sin(yw) * dz; out[1] = y + dy; out[2] = z + Math.cos(yw) * dz; out[3] = yw; out[4] = p;
    return out;
  }
  // ---------------------------------------------------------------- ground (planted feet) pose
  groundPose(dt) {
    const a = this.a, T = this.T, s = a.app.scale || 1, w = this.w;
    if (!this.feetOK) this.initFeet();
    for (const F of this.feet) if (!F.swing && dist2D(F.x, F.z, a.pos.x, a.pos.z) > 1.6 * s) { this.initFeet(); break; }
    const Wp = a.weapon ? WEAPONS[a.weapon] : null, fire = !!(Wp && Wp.firearm), melee = !!(Wp && Wp.melee);
    const combat = (a.combatT > 0 || a.guardAlways || a.state === 'attack') && a.team !== 'civ' && !a.umbrella && a.state !== 'surrender';
    w.guard = damp(w.guard, combat && !fire && !melee ? 1 : 0, combat ? 7 : 2.5, dt);
    w.ready = damp(w.ready, combat && melee ? 1 : 0, combat ? 7 : 2.5, dt);
    w.hold = damp(w.hold, fire && !Wp.long ? 1 : 0, 10, dt); w.rifle = damp(w.rifle, fire && Wp.long ? 1 : 0, 10, dt);
    a.aimK = w.aim = damp(w.aim, fire && (a.aiming || a.firingT > 0) ? 1 : 0, 16, dt);
    w.block = damp(w.block, a.blocking ? 1 : 0, 18, dt);
    w.umb = damp(w.umb, a.app.umbrella && a.umbrella ? 1 : 0, 6, dt);
    // hands up: a civilian held up by a mugger (a mugger's own `victim` field points at that civilian: not him)
    w.hands = damp(w.hands, a.state === 'victim' || a.state === 'surrender' || (a.state === 'move' && a.victim === true && a.team === 'civ') ? 1 : 0, 9, dt);
    w.carry = damp(w.carry, a.app.bag && a.state === 'move' ? 0.65 : 0, 5, dt);
    // gait parameters
    const v = this.spd.x / s, vf = this.vf.x / s, vl = this.vl.x / s;
    const runFade = 1 - smoothstep(2.6, 4.2, v); w.guardK = damp(w.guardK === undefined ? 1 : w.guardK, runFade, 8, dt);
    const gw = Math.max(w.guard, w.ready * 0.8) * w.guardK;
    this.moveK = damp(this.moveK, smoothstep(0.08, 0.75, v), 9, dt);
    this.runK = damp(this.runK, smoothstep(2.0, 3.6, v), 6, dt);
    const rk = this.runK, mk = this.moveK;
    const lat = v > 0.05 ? Math.abs(vl) / v : 0;
    let f = lerp(clamp(1.95 + 0.3 * v, 2.0, 2.9), clamp(2.85 + 0.09 * v, 2.9, 3.6), rk);
    f *= 1 + 0.3 * lat * (1 - rk);
    this.gaitF = f;
    this.beta = lerp(0.56, clamp((0.78 + 0.01 * v) / Math.max(0.5, v * 2 / f), 0.2, 0.46), rk);
    // hip steering toward the direction of travel (strafing / backing up)
    let steerT = 0;
    if (v > 0.3 && a.state !== 'attack') { let ang = Math.atan2(vl, vf); if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI; steerT = clamp(ang, -0.9, 0.9) * 0.6 * mk; }
    Spr.to(this.steer, steerT, 0.12, dt);
    this.updateFeet(dt, gw);
    // ---- pelvis
    const cyk = this.cw * mk, ph = this.phase, b = this.beta;
    const cMid = Math.cos(TAU * (ph - b / 2)), c2 = Math.cos(2 * TAU * (ph - b / 2)), cL = Math.cos(TAU * ph);
    const G = a.app.gait || GAIT0, gs = lerp(G.sway, 1, rk * 0.6);
    const gYaw = -lerp(0.12, 0.2, rk) * cL * cyk * (0.8 + 0.2 * gs), gRoll = lerp(0.07, 0.075, rk) * cMid * cyk * gs, gHX = lerp(0.026, 0.01, rk) * cMid * cyk * gs;
    const bob = lerp(0.022 * Math.min(1, v / 1.4), -0.04 - 0.004 * v, rk) * c2 * cyk * G.bounce;
    const bank = -clamp(Math.atan(this.spd.x * this.yawRate.x / 9.81) * 0.9, -0.35, 0.35) * mk;
    const accLean = clamp(this.af.x * 0.03 / s, -0.1, 0.25) * mk * (a.state === 'attack' || a.state === 'hit' ? 0.15 : 1);
    this.shiftT -= dt; if (this.shiftT <= 0) { this.shiftT = R(3, 7); this.shiftTgt = RP([-1, -0.6, 0, 0.5, 1]); }
    Spr.to(this.shift, this.shiftTgt * (1 - mk) * (1 - gw), 0.45, dt);
    const breath = Math.sin(this.time * TAU / 3.6 + (a.seed || 0) * 6);
    const bounce = Math.sin(this.time * TAU * 1.7) * 0.012 * w.guard * (1 - mk);
    T.fill(0);
    T[3] = lerp(0.05, 0.12 + 0.02 * v, rk) * mk + accLean * 0.5 + gw * 0.04;
    T[4] = gYaw + this.steer.x - (0.3 * w.guard + 0.15 * w.ready) * w.guardK;
    T[5] = gRoll + bank * 0.6 + this.shift.x * 0.04;
    T[HX] = gHX + this.shift.x * 0.03 - bank * 0.06;
    T[HY] = lerp(-0.005, lerp(-0.02, -0.035 - 0.008 * Math.max(0, v - 4.5), rk), mk) - 0.07 * gw + bob + bounce - 0.02 * G.stoop;
    T[HZ] = -0.01 * mk * rk;
    // ---- torso
    const lean = lerp(0.04, 0.06 + 0.012 * v, rk) * mk + accLean * 0.6;
    T[CH.spine] = 0.02 + lean + breath * 0.006 + G.stoop * 0.45; T[CH.spine + 1] = -0.9 * gYaw - this.steer.x * 0.5; T[CH.spine + 2] = -0.5 * gRoll + bank * 0.3;
    T[CH.chest] = 0.02 * mk + 0.01 * rk * mk - breath * 0.012 + G.stoop * 0.3; T[CH.chest + 1] = -0.9 * gYaw - this.steer.x * 0.5; T[CH.chest + 2] = -0.35 * gRoll + bank * 0.2; // the shoulders swing against the hips
    // ---- arms: swing against the legs, bent more when running; idle arms hang and react to acceleration
    const cA = Math.cos(TAU * (ph - 0.03));
    const ga = lerp(G.arms, 1, rk * 0.5), aF = lerp(0.38, 0.95 + 0.05 * Math.max(0, v - 3), rk) * cyk * ga, aB = lerp(0.3, 0.75 + 0.04 * Math.max(0, v - 3), rk) * cyk * ga;
    const swL = cA > 0 ? aB * cA : aF * cA, swR = -cA > 0 ? aB * -cA : aF * -cA;
    const elb = lerp(0.22, 1.55, rk) * mk + 0.2 * (1 - mk) + G.elbow * (1 - rk);
    const armAcc = clamp(-this.af.x * 0.02, -0.25, 0.25) * (1 - 0.5 * mk);
    const fwd = lerp(0.05, -0.1, rk * mk), fkL = Math.max(0, -swL) / Math.max(0.05, aF), fkR = Math.max(0, -swR) / Math.max(0.05, aF), bkL = Math.max(0, swL) / Math.max(0.05, aB), bkR = Math.max(0, swR) / Math.max(0.05, aB);
    T[CH.shL] = fwd + swL + armAcc + breath * 0.01; T[CH.shL + 1] = -(0.15 + 0.3 * fkL) * rk * mk; T[CH.shL + 2] = 0.1 + 0.1 * rk * mk - breath * 0.01 + G.armOut;
    T[CH.shR] = fwd + swR + armAcc + breath * 0.01; T[CH.shR + 1] = (0.15 + 0.3 * fkR) * rk * mk; T[CH.shR + 2] = -0.1 - 0.1 * rk * mk + breath * 0.01 - G.armOut;
    T[CH.elL] = -(elb + Math.max(0, -swL) * lerp(0.3, 0.4, rk) - bkL * 0.25 * rk * mk); T[CH.elR] = -(elb + Math.max(0, -swR) * lerp(0.3, 0.4, rk) - bkR * 0.25 * rk * mk);
    T[CH.haL] = 0.1 + 0.4 * rk * mk; T[CH.haR] = 0.1 + 0.4 * rk * mk; // fists
    // ---- overlays
    applyLayer(T, LAYERS.guard, w.guard * w.guardK);
    applyLayer(T, LAYERS.ready, w.ready * w.guardK);
    applyLayer(T, LAYERS.holdPistol, w.hold * (1 - w.aim));
    applyLayer(T, LAYERS.holdRifle, w.rifle * (1 - w.aim));
    if (w.aim > 0.002) {
      const p = a.aimPitch || 0;
      // shouldered long gun: bladed stance (left shoulder forward); the hands are put on the gun by holdLong()
      if (w.rifle > 0.5) { T[4] -= 0.18 * w.aim; T[CH.spine] -= p * 0.4 * w.aim; T[CH.spine + 1] -= 0.16 * w.aim; T[CH.chest] -= p * 0.6 * w.aim; T[CH.chest + 1] -= 0.16 * w.aim; }
      else { // pistol / smg: right arm at the target, the left hand closes over it (holdSupport)
        const kick = this.kick;
        blendJ(T, 'shR', -1.52 - p - kick * 0.1, 0.05, 0.06, w.aim); blendJ(T, 'elR', -0.04 - kick * 0.12, 0, 0, w.aim); blendJ(T, 'haR', -kick * 0.25, 0, 0, w.aim);
        blendJ(T, 'shL', -1.36 - p, 0, -0.42, w.aim); blendJ(T, 'elL', -0.42, 0, 0, w.aim); T[CH.chest + 1] += 0.1 * w.aim;
      }
    }
    // idle attitude (arms crossed, hands on hips, phone...) after a few seconds standing still, out of any fight
    this.stillT = mk < 0.08 && a.state === 'move' && gw < 0.05 && !fire && !melee && w.umb < 0.05 && w.carry < 0.05 && w.hands < 0.05 && w.thr < 0.05 ? this.stillT + dt : 0;
    const talking = a === Game.talker && a.state === 'move' && gw < 0.05 && w.umb < 0.05;
    w.talk = damp(w.talk, talking ? 1 : 0, 4, dt);
    w.idle = damp(w.idle, a.idleKind && this.stillT > 1.2 && !talking ? 1 : 0, this.stillT > 1.2 && !talking ? 2.2 : 7, dt);
    if (w.idle > 0.002) applyLayer(T, LAYERS['idle_' + a.idleKind], w.idle);
    if (w.talk > 0.002) { // speaking: forearms up in front, hands moving with the words
      const t = this.time, k = w.talk;
      blendJ(T, 'shL', -0.32 + 0.12 * Math.sin(t * 2.3), 0.1, 0.16 + 0.04 * Math.sin(t * 1.3), k); blendJ(T, 'elL', -1.2 - 0.28 * Math.sin(t * 3.1 + 1), 0, 0, k);
      blendJ(T, 'shR', -0.26 + 0.1 * Math.sin(t * 1.9 + 2), -0.1, -0.18, k * 0.8); blendJ(T, 'elR', -1.1 - 0.3 * Math.sin(t * 2.7), 0, 0, k * 0.8);
    }
    applyLayer(T, LAYERS.umbrella, w.umb);
    applyLayer(T, LAYERS.carry, w.carry);
    applyLayer(T, LAYERS.handsUp, w.hands);
    applyLayer(T, LAYERS.block, w.block);
    // ---- hit stagger (stumbling steps come from the knock-back velocity)
    const stag = a.state === 'hit' ? ease(clamp(1 - a.st / Math.max(0.05, a.stunT), 0, 1)) * (a.parried ? 1.25 : 1) : 0;
    w.stag = stag;
    if (stag > 0.001) {
      const fb = this.pushF < -0.2 ? 1 : this.pushF > 0.2 ? -1 : 0.5;
      T[HY] -= 0.07 * stag; T[CH.spine] -= 0.3 * stag * fb; T[CH.chest] -= 0.15 * stag * fb;
      blendJ(T, 'shL', -0.3, 0, 0.65, stag * 0.8); blendJ(T, 'shR', -0.3, 0, -0.65, stag * 0.8); blendJ(T, 'elL', -0.7, 0, 0, stag * 0.8); blendJ(T, 'elR', -0.7, 0, 0, stag * 0.8);
    }
    // ---- landing absorption (pelvis dips, knees fold through IK)
    T[HY] += this.land.x; T[CH.spine] -= this.land.x * 1.1; T[CH.shL] += this.land.x * 1.2; T[CH.shR] += this.land.x * 1.2;
    // ---- where the feet are, and how low the pelvis must go to reach them
    this.footTargets(); this.limitPelvis(T);
    // ---- action clips
    let freeL = 0, freeR = 0;
    if (a.state === 'attack' && a.atk) {
      const A = a.atk, C = CLIPS2[A.d.clip];
      if (C) {
        if (C.legs) this.legsIK(T);   // the kick blends from / back to the planted leg pose
        this.B.set(T); clipEval(C, warpU(clamp(A.t / A.d.dur, 0, 1), A.d.hit / A.d.dur, C.hitU), this.B, T); if (C.legs === 'R') freeR = 1; if (C.legs === 'L') freeL = 1;
      }
    } else if (a.state === 'arresting') { this.B.set(T); clipEval(CLIPS2.arrest, clamp(a.st / 1.1, 0, 1), this.B, T); }
    const newAtk = a.atk !== this.atkRef;
    if (newAtk && a.state === 'attack' && a.atk && a.atk.d.lunge && !freeL && !freeR) {
      const Fl = this.feet[w.guard > 0.3 ? 0 : (this.feet[0].z < this.feet[1].z ? 0 : 1)];
      if (!Fl.swing && !this.feet[Fl.side ? 0 : 1].swing) { this.lift(Fl, false, 0, clamp(a.atk.d.hit * 1.15, 0.14, 0.4)); Fl.lift = 0.035; Fl.peak = 0.45; Fl.pmid = 0.15; Fl.pc = -0.05; }
    }
    if (freeR && newAtk) { const F = this.feet[1]; this.lift(F, false, 0, Math.max(0.2, a.atk.d.dur * 0.92)); F.lift = 0; F.pmid = 0.3; F.pc = -0.04; }
    if (freeL && newAtk) { const F = this.feet[0]; this.lift(F, false, 0, Math.max(0.2, a.atk.d.dur * 0.92)); F.lift = 0; F.pmid = 0.3; F.pc = -0.04; }
    if (a.state === 'attack') { Spr.to(this.free[0], freeL, 0.05, dt); Spr.to(this.free[1], freeR, 0.05, dt); }
    else { this.free[0].x = this.free[1].x = 0; this.free[0].v = this.free[1].v = 0; }
    // ---- hands on the weapon, grenade throw
    this.weapons(T, dt, stag);
    // ---- head: stabilize + look
    this.headLook(dt, T);
    // ---- feet targets (root space) + pelvis reach limit + leg IK (a kicking leg keeps the clip's angles)
    const fl = this.free[0].x, fr = this.free[1].x;
    if (fl > 0.001 || fr > 0.001) { const K = this.L; K.set(T); this.legsIK(T); this.keepFree(T, K); this.groundClamp(T); }
    else this.legsIK(T);
  }
  // hands on the weapon (long guns: both hands on the gun wherever it is carried; pistol / smg: two-handed aim)
  // and the grenade throw (held cocked while aiming it, then thrown)
  weapons(T, dt, stag) {
    const a = this.a, w = this.w, Wp = a.weapon ? WEAPONS[a.weapon] : null;
    this.kick = damp(this.kick, 0, 13, dt);
    const thr = !!a.nadeAim || (a.throwT >= 0 && a.throwT < (a.throwDur || 0.7));
    w.thr = damp(w.thr, thr ? 1 : 0, thr ? 16 : 7, dt);
    const free = (1 - stag) * (a.state === 'attack' ? 0.25 : 1);
    const G = Wp && a.weaponPart && typeof Arms !== 'undefined' ? Arms.INFO[Wp.part] : null;
    if (G && G.long) {
      gunCarry(a.gunM || (a.gunM = M4.create()), T, w.aim, this.runK, a.aimPitch || 0, this.kick);
      holdLong(T, G, a.gunM, w.rifle * free * (1 - w.thr), w.rifle * free, this.prev);
    } else if (G && G.sup && Wp.firearm) holdSupport(T, G.sup, w.aim * free * (1 - w.thr), this.prev);
    if (w.thr > 0.002) throwPose(T, a.nadeAim ? 0.3 : clamp(a.throwT / (a.throwDur || 0.7), 0, 1), w.thr, this.prev);
  }
  recoil(k) { this.kick = Math.min(1.6, this.kick + k); }
  keepFree(Q, K) {
    for (let i = 0; i < 2; i++) {
      const f = this.free[i].x; if (f <= 0.001) continue;
      for (const base of i ? [CH.hipR, CH.knR, CH.anR] : [CH.hipL, CH.knL, CH.anL]) for (let j = 0; j < 3; j++) { const q = base + j; Q[q] += wrapAngle(K[q] - Q[q]) * f; }
    }
  }
  // foot targets in root space (from the planted / swinging feet)
  footTargets() {
    const W = this._w || (this._w = [0, 0, 0, 0, 0]);
    for (let i = 0; i < 2; i++) {
      this.footNow(this.feet[i], W);
      const L = this.toLocal(W[0], W[1], W[2], _v), ft = this.ft[i];
      ft[0] = L[0]; ft[1] = L[1]; ft[2] = L[2]; ft[3] = wrapAngle(W[3] - this.rootYaw); ft[4] = W[4];
    }
  }
  // lower the pelvis (softly) when a supporting leg could not reach its foot
  limitPelvis(Q) {
    M3.euler(_Rp, Q[3], Q[4], Q[5]);
    const Dmax = (THIGH + SHIN) * 0.985; let hy = Q[HY], lim = 1e9;
    for (let i = 0; i < 2; i++) {
      const F = this.feet[i];
      const sn = F.swing ? clamp((F.s - F.s0) / (1 - F.s0), 0, 1) : 0;
      const wgt = F.swing ? (F.cyc ? Math.max(1 - smoothstep(0, 0.25, sn), smoothstep(0.72, 1, F.s)) : 1 - smoothstep(0, 0.3, sn)) : 1;
      if (wgt <= 0 || this.free[i].x > 0.5) continue;
      M3.apply(_Rp, i ? -HIP_X : HIP_X, HIP_Y, 0, _v);
      const hx = Q[HX] + _v[0], hz = Q[HZ] + _v[2], ft = this.ft[i];
      const rh = Math.hypot(ft[0] - hx, ft[2] - hz);
      const maxHip = rh < Dmax ? ft[1] + Math.sqrt(Dmax * Dmax - rh * rh) : ft[1];
      const l = maxHip - PELV_Y - _v[1];
      lim = smin(lim, lerp(hy + 0.3, l, wgt), 0.035);
    }
    Q[HY] = Math.max(smin(hy, lim, 0.04), hy - 0.12);
  }
  legsIK(Q) {
    M3.euler(_Rp, Q[3], Q[4], Q[5]);
    for (let i = 0; i < 2; i++) { const ft = this.ft[i]; legIK(Q, i, ft[0], ft[1], ft[2], ft[3], ft[4], 0, this.prev, true); }
    // relax the ankle of a swinging foot mid-flight
    // (only once the foot is clear of the ground, so the toes never dig in)
    const gy = ((this.a.groundY !== undefined ? this.a.groundY : this.a.pos.y) - this.a.pos.y - this.a.visY) / (this.a.app.scale || 1);
    for (let i = 0; i < 2; i++) {
      const F = this.feet[i]; if (!F.swing) continue;
      const sn = clamp((F.s - F.s0) / (1 - F.s0), 0, 1), clear = smoothstep(0.1, 0.22, this.ft[i][1] - gy);
      const wr = Math.pow(Math.sin(Math.PI * sn), 2) * 0.8 * clear, ci = i ? CH.anR : CH.anL; Q[ci] += (lerp(0.2, 0.1, this.runK) - Q[ci]) * wr;
    }
  }
  // kept for callers that want everything at once
  solveLegs(Q, limitPelvis) { this.footTargets(); if (limitPelvis) this.limitPelvis(Q); this.legsIK(Q); }
  postIK() {
    const P = this.a.pose, wl = this.wl.x;
    if (!this.feetOK) return;
    const L = this.L; L.set(P);
    this.legsIK(L);
    for (let i = 0; i < 2; i++) {
      const k = wl * (1 - this.free[i].x); if (k <= 0.001) continue;
      const A = i ? CH.hipR : CH.hipL, Bk = i ? CH.knR : CH.knL, C = i ? CH.anR : CH.anL;
      for (const base of [A, Bk, C]) for (let j = 0; j < 3; j++) { const q = base + j; P[q] += wrapAngle(L[q] - P[q]) * k; }
    }
  }
  headLook(dt, T) {
    const a = this.a;
    let ly = 0, lp = 0;
    const P = Game.player, Q = a.P && !a.P.removed ? a.P : P; // (in a brigade: the robot he is after)
    if (a === P) {
      const d = wrapAngle(CamCtl.yaw - this.rootYaw);
      if (Math.abs(d) < 1.7 && a.state !== 'attack') { ly = clamp(d * 0.65, -0.95, 0.95) * (1 - smoothstep(1.2, 1.7, Math.abs(d))); lp = clamp(-CamCtl.pitch * 0.35, -0.3, 0.3); }
    } else if (Q && a.alerted && a.alive) {
      const d = wrapAngle(angleTo(a.pos.x, a.pos.z, Q.pos.x, Q.pos.z) - this.rootYaw);
      ly = clamp(d, -1.1, 1.1); lp = clamp(-(Q.pos.y - a.pos.y) * 0.1, -0.3, 0.3);
    } else {
      this.lookT -= dt;
      if (this.lookT <= 0) {
        this.lookT = R(1.5, 5);
        if (P && dist2D(a.pos.x, a.pos.z, P.pos.x, P.pos.z) < 5 && chance(0.6)) { const d = wrapAngle(angleTo(a.pos.x, a.pos.z, P.pos.x, P.pos.z) - this.rootYaw); this.lookTY = Math.abs(d) < 1.6 ? d * 0.8 : 0; this.lookTP = 0; }
        else { this.lookTY = chance(0.5) ? 0 : R(-0.6, 0.6); this.lookTP = R(-0.12, 0.1); }
      }
      ly = this.lookTY * (1 - this.moveK * 0.5); lp = this.lookTP;
      if (a.idleKind === 'phone' && this.w.idle > 0.01) { const k = this.w.idle; ly *= 1 - k; lp = lerp(lp, 0.5, k); } // eyes on the phone
      if (this.w.talk > 0.01 && P) { const d = wrapAngle(angleTo(a.pos.x, a.pos.z, P.pos.x, P.pos.z) - this.rootYaw); ly = lerp(ly, Math.abs(d) < 1.6 ? d * 0.8 : 0, this.w.talk); lp += 0.07 * Math.sin(this.time * 4.3) * this.w.talk; }
    }
    const sk = this.w.rifle * this.w.aim; if (sk > 0.01) { lp += 0.14 * sk; ly -= 0.1 * sk; } // cheek on the stock
    Spr.to(this.lookY, ly, 0.12, dt); Spr.to(this.lookP, lp, 0.15, dt);
    const tP = T[3] + T[CH.spine] + T[CH.chest], tY = T[4] + T[CH.spine + 1] + T[CH.chest + 1], tR = T[5] + T[CH.spine + 2] + T[CH.chest + 2];
    T[CH.neck] = -0.35 * tP + 0.3 * this.lookP.x; T[CH.neck + 1] = -0.4 * tY + 0.4 * this.lookY.x; T[CH.neck + 2] = -0.35 * tR;
    T[CH.head] = 0.03 - 0.45 * tP + 0.7 * this.lookP.x; T[CH.head + 1] = -0.5 * tY + 0.6 * this.lookY.x; T[CH.head + 2] = -0.45 * tR;
  }
  // additive reactions (all modes)
  reactions(dt) {
    const T = this.T;
    Spr.osc(this.rp, 0, 2.2, 0.42, dt); Spr.osc(this.rr, 0, 2.2, 0.42, dt); Spr.osc(this.ry, 0, 1.9, 0.45, dt); Spr.osc(this.land, 0, 3.0, 0.6, dt);
    if (Math.abs(this.rp.x) + Math.abs(this.rr.x) + Math.abs(this.ry.x) < 1e-4) return;
    T[CH.spine] += this.rp.x * 0.5; T[CH.chest] += this.rp.x * 0.4; T[CH.head] += this.rp.x * 0.55;
    T[CH.spine + 2] += this.rr.x * 0.5; T[CH.chest + 2] += this.rr.x * 0.4; T[CH.head + 2] += this.rr.x * 0.3;
    T[CH.chest + 1] += this.ry.x; T[CH.head + 1] -= this.ry.x * 0.5;
  }
  impulse(kx, kz, strength) { // push direction (world) from the hit
    const c = Math.cos(this.rootYaw), n = Math.sin(this.rootYaw);
    const f = kx * n + kz * c, l = kx * c - kz * n;
    this.pushF = f; this.pushL = l;
    const k = clamp(strength, 0.2, 2.2);
    this.rp.v += -f * 5.5 * k; this.rr.v += -l * 4.5 * k; this.ry.v += (Math.random() < 0.5 ? -1 : 1) * 3 * k;
  }
  onLand(vy) { const d = clamp((-vy - 1) * 0.55, 0, 7); this.land.v -= d; }
  pickAirLead() { // leading leg in the air = the one furthest forward
    const P = this.a.pose; legFK(P, 0, _fk); const zl = _fk[2]; legFK(P, 1, _fk); this.airLead = zl >= _fk[2] ? 0 : 1;
  }
  // ---------------------------------------------------------------- full-body poses
  fullPose(dt, st) {
    const a = this.a, T = this.T, B = this.B;
    this.free[0].x = this.free[1].x = 0;
    switch (st) {
      case 'air': this.airPose(dt, T); this.weapons(T, dt, 0); break;
      case 'attack': {
        this.airPose(dt, T); const A = a.atk;
        if (A) { const C = CLIPS2[A.d.clip]; if (C) { B.set(T); clipEval(C, warpU(clamp(A.t / A.d.dur, 0, 1), A.d.hit / A.d.dur, C.hitU), B, T); } }
        break;
      }
      case 'roll': this.rollPose(T); break;
      case 'down': case 'ko': case 'dead': this.fallPose(T, clamp(a.st / 0.62, 0, 1.6), a.faceUp, st === 'dead'); break;
      case 'getup': {
        APose.stand(B); T.set(B); const u = clamp(a.st / (a.getupDur || 0.85), 0, 1);
        clipEval(CLIPS2[a.faceUp ? 'getUpBack' : 'getUpFront'], u, B, T);
        APose.flatFeet(T, smoothstep(0.3, 0.55, u) * 0.9);
        break;
      }
      case 'cuffed': APose.kneel(T, 'back'); T[CH.spine] += Math.sin(this.time * 2) * 0.015; break;
      case 'beingCuffed': APose.kneel(T, 'back'); T[CH.head] = 0.45; T[CH.spine] = 0.25; break;
      case 'surrender': APose.kneel(T, 'up'); T[CH.chest] += Math.sin(this.time * 2.3) * 0.02; break;
      case 'cower': APose.cower(T, this.time); break;
      case 'hang': this.hangPose(dt, T); break;
      case 'climb': this.climbPose(dt, T); break;
      case 'vault': this.vaultPose(dt, T); break;
      case 'ladder': this.ladderPose(dt, T); break;
      case 'fence': this.fencePose(dt, T); break;
      case 'zip': this.zipPose(dt, T); break;
      case 'car': APose.sit(T); break;
      default: APose.stand(T);
    }
    if (st !== 'getup' && st !== 'down' && st !== 'ko' && st !== 'dead' && st !== 'hang' && st !== 'ladder' && st !== 'climb' && st !== 'zip' && st !== 'fence') this.headStab(T);
    if (st === 'down' || st === 'ko' || st === 'dead' || st === 'getup' || st === 'roll') this.groundClamp(T);
  }
  fallPose(T, u, faceUp, dead) {
    const a = this.a, d = faceUp ? -1 : 1, B = this.B;
    APose.lying(B, faceUp, a.seed, dead);
    if (!dead) { const br = Math.sin(this.time * 2.4) * 0.018; B[CH.chest] += br; B[CH.spine] += br * 0.4; }
    if (u >= 1.55) { T.set(B); return; }
    const buck = smoothstep(0, 0.28, u), tn = Math.pow(clamp((u - 0.06) / 0.56, 0, 1), 1.6), tilt = tn * Math.PI / 2;
    const land = smoothstep(0.55, 0.7, u), bounce = u > 0.62 ? Math.sin(clamp((u - 0.62) / 0.22, 0, 1) * Math.PI) * 0.045 * (1 - smoothstep(0.84, 1, u)) : 0;
    const r = 0.95 - 0.28 * buck;
    APose.stand(T);
    T[3] = d * tilt; T[HY] = r * Math.cos(tilt) - 0.95 + 0.15 * tn + bounce; T[HZ] = d * r * Math.sin(tilt) * 0.72;
    // legs buckle, then lie out
    const hx = lerp(-0.55 * buck, faceUp ? -0.25 : -0.1, tn), kx = lerp(0.95 * buck, faceUp ? 0.4 : 0.08, tn);
    APose.set(T, 'hipL', hx - 0.05, 0.1, 0.1); APose.set(T, 'knL', kx + 0.1); APose.set(T, 'hipR', hx + 0.08, -0.1, -0.08); APose.set(T, 'knR', kx - 0.05);
    APose.set(T, 'anL', lerp(0.1, 0.6, tn)); APose.set(T, 'anR', lerp(0.1, 0.6, tn));
    // torso: whiplash then flat; head tucks on a backward fall, lifts on a forward one
    T[CH.spine] = faceUp ? lerp(-0.3 * buck, 0, land) : lerp(0.35 * buck, 0.05, land); T[CH.chest] = faceUp ? -0.15 * buck * (1 - land) : 0.1 * buck * (1 - land);
    T[CH.head] = faceUp ? 0.45 * buck : -0.3 * buck; T[CH.neck] = faceUp ? 0.15 * buck : -0.1 * buck;
    // arms: fling up on the way down (backward) or reach out to brace (forward)
    if (faceUp) { APose.set(T, 'shL', -1.7 * buck, 0, 0.9 * buck); APose.set(T, 'shR', -1.5 * buck, 0, -1.0 * buck); APose.set(T, 'elL', -0.5); APose.set(T, 'elR', -0.7); }
    else { APose.set(T, 'shL', -1.9 * buck - 0.5 * tn, 0, 0.35); APose.set(T, 'shR', -1.8 * buck - 0.5 * tn, 0, -0.35); APose.set(T, 'elL', -0.3 - 0.6 * land); APose.set(T, 'elR', -0.3 - 0.6 * land); }
    // settle into the lying pose after the impact
    const k = smoothstep(0.62, 1.5, u);
    for (let i = 3; i < PSZ; i++) T[i] += ((i < NANG ? T[i] + wrapAngle(B[i] - T[i]) : B[i]) - T[i]) * k;
  }
  // push feet / hands that ended up under the ground back onto it (full-body poses)
  groundClamp(T) {
    const a = this.a, s = a.app.scale || 1;
    const gy = ((a.groundY !== undefined ? a.groundY : a.pos.y) - a.pos.y - a.visY) / s;
    for (let i = 0; i < 2; i++) {
      legFK(T, i, _fk); const minY = gy + ANK_H * 0.85 + 0.17 * Math.max(0, Math.sin(_fk[4]));   // keep the toes above ground too
      if (_fk[1] < minY) legIK(T, i, _fk[0], minY, _fk[2], _fk[3], _fk[4], 0, this.prev, false, T[4]);
    }
  }
  headStab(T) {
    const tP = T[3] + T[CH.spine] + T[CH.chest], tY = T[4] + T[CH.spine + 1] + T[CH.chest + 1], tR = T[5] + T[CH.spine + 2] + T[CH.chest + 2];
    T[CH.neck] += -0.3 * tP; T[CH.neck + 1] += -0.35 * tY; T[CH.neck + 2] += -0.3 * tR;
    T[CH.head] += -0.35 * tP; T[CH.head + 1] += -0.45 * tY; T[CH.head + 2] += -0.4 * tR;
  }
  airPose(dt, T) {
    const a = this.a, s = a.app.scale || 1, vy = a.vel.y;
    const hsp = this.spd.x / s;
    const rise = smoothstep(-2.5, 3, vy), fall = 1 - rise, big = smoothstep(-9, -15, vy);
    const run = smoothstep(2.5, 5, hsp);
    const push = 1 - smoothstep(0, 0.16, this.airT);
    const hAbove = a.pos.y - (a.groundY !== undefined ? a.groundY : a.pos.y);
    const prep = vy < 0 ? smoothstep(0.3, 0.08, hAbove / Math.max(1, -vy)) : 0;
    const leadH = lerp(lerp(-0.95, -1.05, run), -0.4 - 0.1 * run, fall), leadK = lerp(lerp(1.5, 1.15, run), 0.5, fall);
    const trailH = lerp(lerp(-0.8, 0.45, run), -0.2 + 0.25 * run, fall), trailK = lerp(lerp(1.4, 1.0, run), 0.65, fall);
    let hL = this.airLead ? trailH : leadH, kL = this.airLead ? trailK : leadK, hR = this.airLead ? leadH : trailH, kR = this.airLead ? leadK : trailK;
    // push-off: trailing leg still extended right after take-off
    if (this.airLead) { hL = lerp(hL, 0.35, push * run); kL = lerp(kL, 0.25, push); } else { hR = lerp(hR, 0.35, push * run); kR = lerp(kR, 0.25, push); }
    // landing prep: legs reach for the ground
    hL = lerp(hL, -0.42, prep); kL = lerp(kL, 0.4, prep); hR = lerp(hR, -0.3, prep); kR = lerp(kR, 0.35, prep);
    // long fall: pedal
    const pd = Math.sin(this.time * 7) * big; hL += pd * 0.35; hR -= pd * 0.35; kL += Math.max(0, pd) * 0.4; kR += Math.max(0, -pd) * 0.4;
    T.fill(0);
    APose.set(T, 'hipL', hL, 0.05, 0.06 + 0.1 * fall); APose.set(T, 'knL', kL); APose.set(T, 'hipR', hR, -0.05, -0.06 - 0.1 * fall); APose.set(T, 'knR', kR);
    APose.set(T, 'anL', lerp(0.45, 0.2, prep)); APose.set(T, 'anR', lerp(0.45, 0.2, prep));
    // arms: up and forward on the way up, out for balance on the way down, windmill on long falls
    const fl = Math.sin(this.time * 9) * big;
    const armL = this.airLead ? 1 : -1; // arm opposite to the lead leg swings forward
    APose.set(T, 'shL', lerp(-1.1 + 0.5 * run * armL, -0.7, fall) + fl * 0.7, 0, lerp(0.3, 0.75, fall) + Math.abs(fl) * 0.4);
    APose.set(T, 'shR', lerp(-1.1 - 0.5 * run * armL, -0.7, fall) - fl * 0.7, 0, -lerp(0.3, 0.75, fall) - Math.abs(fl) * 0.4);
    APose.set(T, 'elL', -lerp(0.9, 0.5, fall)); APose.set(T, 'elR', -lerp(0.9, 0.5, fall));
    T[3] = 0.1 * run * rise + 0.05; T[CH.spine] = lerp(0.12, 0.04, fall) + 0.08 * run - prep * 0.05; T[CH.chest] = 0.03;
    T[4] = (this.airLead ? 0.12 : -0.12) * run;
    T[CH.spine + 1] = -T[4] * 0.6; T[CH.chest + 1] = -T[4] * 0.6;
  }
  rollPose(T) {
    const a = this.a, u = clamp(a.st / (a.rollDur || 0.55), 0, 1);
    APose.stand(T);
    const tuck = smoothstep(0.02, 0.2, u) * (1 - smoothstep(0.72, 0.98, u));
    const rot = TAU * ease(clamp((u - 0.08) / 0.7, 0, 1));
    T[3] = 0.35 * smoothstep(0, 0.15, u) * (1 - smoothstep(0.1, 0.3, u)) + rot;
    T[HY] = -0.52 * tuck - 0.2 * smoothstep(0, 0.1, u) * (1 - tuck) - 0.25 * smoothstep(0.7, 0.85, u) * (1 - smoothstep(0.85, 1, u));
    blendJ(T, 'hipL', -1.9, 0, 0.1, tuck); blendJ(T, 'knL', 2.25, 0, 0, tuck); blendJ(T, 'hipR', -1.9, 0, -0.1, tuck); blendJ(T, 'knR', 2.25, 0, 0, tuck);
    blendJ(T, 'shL', -1.3, 0, 0.25, tuck); blendJ(T, 'elL', -1.6, 0, 0, tuck); blendJ(T, 'shR', -1.3, 0, -0.25, tuck); blendJ(T, 'elR', -1.6, 0, 0, tuck);
    T[CH.spine] = lerp(0.02, 0.65, tuck); T[CH.chest] = lerp(0, 0.2, tuck); T[CH.head] = lerp(0.03, 0.55, tuck);
    // come up into a crouch, feet flat
    const up = smoothstep(0.72, 1, u) * (1 - smoothstep(0.92, 1, u));
    blendJ(T, 'hipL', -1.1, 0, 0.08, up); blendJ(T, 'knL', 1.6, 0, 0, up); blendJ(T, 'hipR', -0.9, 0, -0.08, up); blendJ(T, 'knR', 1.4, 0, 0, up);
    APose.flatFeet(T, smoothstep(0.75, 0.95, u));
  }
  // wrist targets on a ledge for hang / climb: returns root-space points of both hands
  ledgeHands(out, spread, shimmy) {
    const a = this.a, s = a.app.scale || 1, H = a.hangData;
    let edge = (a.r + 0.04) / s, top = H ? (H.top - a.pos.y - a.visY) / s : 2.06 / s;
    const ph = this.hangPh, sw = shimmy || 0;
    for (let i = 0; i < 2; i++) {
      const side = i ? -1 : 1; const mv = sw !== 0 ? Math.sin(ph + (i ? Math.PI : 0)) : 0;
      out[i][0] = side * spread + sw * 0.1 * mv; out[i][1] = top + 0.02 + Math.max(0, mv) * 0.04 * Math.abs(sw); out[i][2] = edge - 0.05;
    }
    return out;
  }
  vaultPose(dt, T) {
    const a = this.a, u = clamp(a.st / (a.climbDur || 0.45), 0, 1);
    APose.stand(this.B); T.set(this.B);
    clipEval(CLIPS2.vault, u, this.B, T);
    const E = a.climbE, S = a.climbS;
    const wIK = smoothstep(0.08, 0.25, u) * (1 - smoothstep(0.5, 0.68, u));
    if (wIK > 0.001 && E && S) {
      if (!this._vHands || this._vRef !== E) { // plant the hands on the obstacle top where it was touched
        const mx = lerp(S.x, E.x, 0.45), mz = lerp(S.z, E.z, 0.45), c = Math.cos(this.rootYaw), n = Math.sin(this.rootYaw), sc = a.app.scale || 1;
        this._vHands = [[mx + c * 0.2 * sc, E.top + 0.05, mz - n * 0.2 * sc], [mx - c * 0.2 * sc, E.top + 0.05, mz + n * 0.2 * sc]]; this._vRef = E;
      }
      for (let i = 0; i < 2; i++) { const h = this._vHands[i]; const L = this.toLocal(h[0], h[1], h[2], _v); armIK(T, i, L[0], L[1], L[2], 0.6, wIK, this.prev); }
    }
    this.headStab(T);
  }
  zipPose(dt, T) {
    const a = this.a, s = a.app.scale || 1;
    const D = a.zipD; const v = D ? D.v : 10;
    const acc = (v - this.zipV) / Math.max(1e-3, dt); this.zipV = v;
    Spr.osc(this.zsw, clamp(-acc * 0.02, -0.35, 0.35), 0.8, 0.18, dt);
    const th = this.zsw.x + Math.sin(this.time * 1.7) * 0.03, R0 = 1.02;
    APose.stand(T);
    T[3] = th; T[HZ] = -Math.sin(th) * R0; T[HY] = (1 - Math.cos(th)) * R0;
    APose.set(T, 'hipL', -0.55, 0, 0.04); APose.set(T, 'knL', 0.7); APose.set(T, 'hipR', -0.45, 0, -0.04); APose.set(T, 'knR', 0.8);
    APose.set(T, 'anL', 0.5); APose.set(T, 'anR', 0.5); T[CH.spine] = -0.1; T[CH.head] = -0.15 - th;
    const hy = 2.05 / s + 0.02;
    armIK(T, 0, 0.03, hy, 0.07, 0.6, 1, this.prev); armIK(T, 1, -0.03, hy, -0.07, 0.6, 1, this.prev);
  }
  tailSpring(dt, hs) {
    // tl.a: world pitch of the dangling part, negative = trailing behind. A ponytail hangs along -Y and an
    // antenna stands along +Y, so the sign of the bone angle differs; the antenna is also stiffer and springier.
    const P = this.a.pose, tl = this.tail, ant = !!this.a.app.robot;
    const target = -0.25 - (ant ? Math.min(0.5, hs * 0.07) : Math.min(0.9, hs * 0.1)) + (this.a.state === 'air' ? clamp(this.a.vel.y * 0.08, -0.6, 0.6) : 0) - this.land.v * 0.02;
    tl.v += ((target - tl.a) * (ant ? 150 : 60) - tl.v * (ant ? 4.5 : 7)) * dt; tl.a += tl.v * dt;
    P[CH.tail] = (ant ? tl.a : -tl.a) - P[CH.head] - P[CH.neck] - P[CH.chest] - P[CH.spine] - P[3]; P[CH.tail + 1] = 0; P[CH.tail + 2] = -P[5] * 0.5;
  }
}
initAnim();

