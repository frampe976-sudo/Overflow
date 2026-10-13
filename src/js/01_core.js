'use strict';
/* =====================================================================
   OVERFLOW — core utilities, math, RNG, save
   ===================================================================== */
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoothstep = (a, b, x) => smooth01((x - a) / (b - a));
function wrapAngle(a) { return a > Math.PI || a < -Math.PI ? a - TAU * Math.round(a / TAU) : a; }
function dampAngle(a, b, k, dt) { return a + wrapAngle(b - a) * (1 - Math.exp(-k * dt)); }
function approach(a, b, step) { return a < b ? Math.min(a + step, b) : Math.max(a - step, b); }
function len2(x, z) { return Math.sqrt(x * x + z * z); }
function dist2D(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
function dist3(a, b) { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function angleTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); } // yaw pointing from a to b (forward = +Z)

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// deterministic RNG for world generation (same sequence as mulberry32, with a state that can be saved / restored)
let _gs = 20260927;
function _grng() { _gs |= 0; _gs = _gs + 0x6D2B79F5 | 0; let t = Math.imul(_gs ^ _gs >>> 15, 1 | _gs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const G = { r: (a = 0, b = 1) => a + (b - a) * _grng(), i: (a, b) => Math.floor(a + (b - a + 1) * _grng()), pick: arr => arr[Math.floor(_grng() * arr.length)], chance: p => _grng() < p, reseed: s => { _gs = s; }, save: () => _gs, restore: s => { _gs = s; } };
// runtime RNG
const R = (a = 0, b = 1) => a + (b - a) * Math.random();
const RI = (a, b) => Math.floor(a + (b - a + 1) * Math.random());
const RP = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;

class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  addScaled(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  len() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  norm() { const l = this.len() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  distTo(v) { return dist3(this, v); }
}

/* ---------- 4x4 matrices (column-major, Float32Array) ---------- */
const M4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  identity(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  copy(o, a) { o.set(a); return o; },
  mul(o, a, b) { // o = a*b
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
      o[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      o[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
      o[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
    }
    return o;
  },
  // write a*b into buffer at offset (for instancing)
  mulInto(buf, off, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[4], a11 = a[5], a12 = a[6],
      a20 = a[8], a21 = a[9], a22 = a[10], a30 = a[12], a31 = a[13], a32 = a[14];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      buf[off + i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
      buf[off + i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      buf[off + i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
      buf[off + i * 4 + 3] = b3;
    }
  },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf; return o;
  },
  lookAt(o, ex, ey, ez, tx, ty, tz) {
    let zx = ex - tx, zy = ey - ty, zz = ez - tz; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx; // up(0,1,0) x z
    l = Math.hypot(xx, xy, xz); if (l < 1e-6) { xx = 1; xy = 0; xz = 0; l = 1; } xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  },
  invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null; det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  // T * Ry * Rx * Rz (euler order YXZ) * S
  compose(o, px, py, pz, rx, ry, rz, sx = 1, sy = 1, sz = 1) {
    const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
    // R = Ry*Rx*Rz
    const m00 = cy * cz + syr * sxr * szr, m01 = cx * szr, m02 = -syr * cz + cy * sxr * szr;
    const m10 = -cy * szr + syr * sxr * cz, m11 = cx * cz, m12 = syr * szr + cy * sxr * cz;
    const m20 = syr * cx, m21 = -sxr, m22 = cy * cx;
    // column-major: column0 = (m00,m01,m02) is image of x axis
    o[0] = m00 * sx; o[1] = m01 * sx; o[2] = m02 * sx; o[3] = 0;
    o[4] = m10 * sy; o[5] = m11 * sy; o[6] = m12 * sy; o[7] = 0;
    o[8] = m20 * sz; o[9] = m21 * sz; o[10] = m22 * sz; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  },
  // T * Rx * Rz * Ry (euler order XZY) — used by hip and shoulder joints (no gimbal lock at 90 deg flexion)
  composeXZY(o, px, py, pz, rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    o[0] = cz * cy; o[1] = cx * sz * cy + sx * sy; o[2] = sx * sz * cy - cx * sy; o[3] = 0;
    o[4] = -sz; o[5] = cx * cz; o[6] = sx * cz; o[7] = 0;
    o[8] = cz * sy; o[9] = cx * sz * sy - sx * cy; o[10] = sx * sz * sy + cx * cy; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  },
  // matrix mapping local +Y axis onto segment a->b (for cylinders/cables), radius scale r
  segment(o, ax, ay, az, bx, by, bz, r) {
    let dx = bx - ax, dy = by - ay, dz = bz - az; const L = Math.hypot(dx, dy, dz) || 1e-6;
    const yx = dx / L, yy = dy / L, yz = dz / L;
    // pick a perpendicular
    let tx = 0, ty = 0, tz = 1; if (Math.abs(yz) > 0.9) { tx = 1; tz = 0; }
    // x = t cross y
    let xx = ty * yz - tz * yy, xy = tz * yx - tx * yz, xz = tx * yy - ty * yx; let l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const zx = xy * yz - xz * yy, zy = xz * yx - xx * yz, zz = xx * yy - xy * yx;
    o[0] = xx * r; o[1] = xy * r; o[2] = xz * r; o[3] = 0;
    o[4] = yx * L; o[5] = yy * L; o[6] = yz * L; o[7] = 0;
    o[8] = zx * r; o[9] = zy * r; o[10] = zz * r; o[11] = 0;
    o[12] = ax; o[13] = ay; o[14] = az; o[15] = 1;
    return o;
  },
  transformPoint(m, x, y, z, out) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    out.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
};

/* ---------- service record: every point scored counts toward the next rank (a little sturdier, a little harder-hitting at each) ---------- */
const RANKS = [['Stagiaire', 0], ['Gardien', 800], ['Brigadier', 2000], ['Brigadier-chef', 4000], ['Major', 7000], ['Lieutenant', 11000], ['Capitaine', 16000], ['Commandant', 22000], ['Commissaire', 30000], ['Divisionnaire', 40000], ['Légende de Port-Saline', 55000]];
const rankOf = xp => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i][1]) r = i; return r; };
const rankK = () => (Save.data ? rankOf(Save.data.xp) : 0);
/* ---------- difficulty (options): damage taken, enemy aim, how many gunmen may fire at once, repair speed ---------- */
const DIFF = { easy: { dmg: 0.65, acc: 0.62, shoot: -1, regen: 1.6 }, normal: { dmg: 1, acc: 0.8, shoot: 0, regen: 1 }, hard: { dmg: 1.25, acc: 0.95, shoot: 1, regen: 0.7 } };
const diffK = () => (Save.data && DIFF[Save.data.options.diff]) || DIFF.normal;
/* ---------- save (localStorage, optional) ---------- */
const SAVE_KEY = 'overflow-save-v1';
const Save = {
  data: null,
  defaults() {
    return {
      v: 1,
      options: { quality: 'auto', diff: 'normal', sens: 1, invertY: false, music: 0.55, sfx: 0.85, amb: 0.6, vibration: true, aimAssist: true, dmgNums: true, touchSize: 1, showFps: false, autoCam: true },
      missions: {},
      badges: [],
      stats: { force: 0, endurance: 0, constitution: 0, adresse: 0 },
      best: {}, xp: 0
    };
  },
  load() {
    let d = null;
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') d = def;
    d.options = Object.assign(def.options, d.options || {});
    d.missions = d.missions || {}; d.badges = Array.isArray(d.badges) ? d.badges : []; d.stats = Object.assign(def.stats, d.stats || {}); d.best = d.best || {}; d.xp = +d.xp || 0;
    this.data = d; return d;
  },
  write() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } }
};

/* ---------- tiny event bus ---------- */
const Bus = {
  h: {},
  on(n, f) { (this.h[n] || (this.h[n] = [])).push(f); },
  off(n, f) { const a = this.h[n]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } },
  emit(n, a, b, c) { const l = this.h[n]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); }
};

function fmtTime(s) { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function $(id) { return document.getElementById(id); }

