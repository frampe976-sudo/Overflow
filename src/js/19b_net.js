/* =====================================================================
   NETWORK BASICS — binary writer / reader for the multiplayer messages, and a QR-code encoder (the host's
   screen shows one so a phone joins by pointing its camera at it)
   ===================================================================== */
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class WB {
  constructor(n = 2048) { this.buf = new ArrayBuffer(n); this.v = new DataView(this.buf); this.u = new Uint8Array(this.buf); this.o = 0; }
  need(n) { if (this.o + n <= this.buf.byteLength) return; let m = this.buf.byteLength * 2; while (m < this.o + n) m *= 2; const b = new ArrayBuffer(m); new Uint8Array(b).set(this.u.subarray(0, this.o)); this.buf = b; this.v = new DataView(b); this.u = new Uint8Array(b); }
  reset() { this.o = 0; return this; }
  u8(x) { this.need(1); this.v.setUint8(this.o, x); this.o += 1; return this; }
  i8(x) { this.need(1); this.v.setInt8(this.o, clamp(Math.round(x), -128, 127)); this.o += 1; return this; }
  u16(x) { this.need(2); this.v.setUint16(this.o, x, true); this.o += 2; return this; }
  i16(x) { this.need(2); this.v.setInt16(this.o, clamp(Math.round(x) || 0, -32768, 32767), true); this.o += 2; return this; }
  u32(x) { this.need(4); this.v.setUint32(this.o, x >>> 0, true); this.o += 4; return this; }
  f32(x) { this.need(4); this.v.setFloat32(this.o, x, true); this.o += 4; return this; }
  bytes() { return this.u.slice(0, this.o); }
}
class RB {
  constructor(u8, o = 0) { this.u = u8; this.v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.o = o; }
  get left() { return this.u.byteLength - this.o; }
  u8() { const x = this.v.getUint8(this.o); this.o += 1; return x; }
  i8() { const x = this.v.getInt8(this.o); this.o += 1; return x; }
  u16() { const x = this.v.getUint16(this.o, true); this.o += 2; return x; }
  i16() { const x = this.v.getInt16(this.o, true); this.o += 2; return x; }
  u32() { const x = this.v.getUint32(this.o, true); this.o += 4; return x; }
  f32() { const x = this.v.getFloat32(this.o, true); this.o += 4; return x; }
}

/* ---------------- QR code (byte mode, error correction level M, versions 1 to 10) ---------------- */
const QR = {
  // per version (level M): [error-correction codewords per block, blocks of group 1, data codewords per block of group 1, blocks of group 2]
  M: [null, [10, 1, 16, 0], [16, 1, 28, 0], [26, 1, 44, 0], [18, 2, 32, 0], [24, 2, 43, 0], [16, 4, 27, 0], [18, 4, 31, 0], [22, 2, 38, 2], [22, 3, 36, 2], [26, 4, 43, 1]],
  gf: null,
  initGF() {
    const exp = new Uint8Array(512), log = new Uint8Array(256); let x = 1;
    for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    this.gf = { exp, log };
  },
  mul(a, b) { return a && b ? this.gf.exp[this.gf.log[a] + this.gf.log[b]] : 0; },
  // Reed-Solomon remainder of data by the generator of degree n
  rs(data, n) {
    let g = [1];
    for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= this.mul(g[j], this.gf.exp[i]); } g = ng; }
    const r = new Array(n).fill(0);
    for (const d of data) { const f = d ^ r[0]; r.shift(); r.push(0); if (f) for (let j = 0; j < n; j++) r[j] ^= this.mul(g[j + 1], f); }
    return r;
  },
  make(text) {
    if (!this.gf) this.initGF();
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 0, T = null;
    for (let v = 1; v <= 10; v++) { const t = this.M[v], cap = t[1] * t[2] + t[3] * (t[2] + 1); if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) { ver = v; T = t; break; } }
    if (!ver) return null;
    const [ecn, b1, d1, b2] = T, cap = b1 * d1 + b2 * (d1 + 1);
    // bit stream: mode 0100, length, data, terminator, padding
    const bits = []; const put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push((x >>> i) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); for (const b of bytes) put(b, 8);
    put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }
    for (let p = 0; data.length < cap; p++) data.push(p & 1 ? 0x11 : 0xec);
    // blocks, error correction, interleaving
    const blocks = []; let o = 0;
    for (let i = 0; i < b1 + b2; i++) { const n = d1 + (i >= b1 ? 1 : 0); const d = data.slice(o, o + n); o += n; blocks.push({ d, e: this.rs(d, ecn) }); }
    const cw = [];
    for (let i = 0; i < d1 + 1; i++) for (const b of blocks) if (i < b.d.length) cw.push(b.d[i]);
    for (let i = 0; i < ecn; i++) for (const b of blocks) cw.push(b.e[i]);
    // modules
    const N = ver * 4 + 17, mod = new Uint8Array(N * N), fn = new Uint8Array(N * N);
    const set = (x, y, d) => { mod[y * N + x] = d ? 1 : 0; fn[y * N + x] = 1; };
    for (let i = 0; i < N; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(N - 4, 3); finder(3, N - 4);
    if (ver > 1) {
      const na = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (let p = N - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      for (const ax of pos) for (const ay of pos) {
        if ((ax === 6 && ay === 6) || (ax === 6 && ay === N - 7) || (ax === N - 7 && ay === 6)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const fmt = mask => { const f = (0 << 3) | mask; let r = f; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((f << 10) | r) ^ 0x5412; };
    const drawFmt = mask => {
      const b = fmt(mask), g = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(N - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) set(8, N - 15 + i, g(i));
      set(8, N - 8, true);
    };
    drawFmt(0); // reserve the format areas
    if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const d = (b >>> i) & 1, a = N - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); } }
    // data in the zigzag
    let bi = 0; const nb = cw.length * 8;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < N; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? N - 1 - vert : vert;
        if (fn[y * N + x]) continue;
        mod[y * N + x] = bi < nb ? (cw[bi >>> 3] >>> (7 - (bi & 7))) & 1 : 0; bi++;
      }
    }
    const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const apply = m => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!fn[y * N + x] && masks[m](x, y)) mod[y * N + x] ^= 1; };
    const penalty = () => {
      let p = 0, dark = 0; const at = (x, y) => mod[y * N + x];
      for (let k = 0; k < 2; k++) for (let a = 0; a < N; a++) { // runs
        let run = 1; for (let b = 1; b <= N; b++) { const same = b < N && (k ? at(a, b) === at(a, b - 1) : at(b, a) === at(b - 1, a)); if (same) run++; else { if (run >= 5) p += run - 2; run = 1; } }
        for (let b = 0; b + 6 < N; b++) { // finder-like 1011101 with light space on a side
          let ok = true; const pat = [1, 0, 1, 1, 1, 0, 1]; for (let i = 0; i < 7 && ok; i++) ok = (k ? at(a, b + i) : at(b + i, a)) === pat[i];
          if (!ok) continue; const light = (s, e) => { for (let i = s; i < e; i++) { if (i < 0 || i >= N) continue; if (k ? at(a, i) : at(i, a)) return false; } return true; };
          if (light(b - 4, b) || light(b + 7, b + 11)) p += 40;
        }
      }
      for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) { const c = at(x, y); if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) p += 3; }
      for (let i = 0; i < N * N; i++) dark += mod[i];
      return p + Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    };
    let best = 0, bp = 1e9;
    for (let m = 0; m < 8; m++) { apply(m); drawFmt(m); const p = penalty(); if (p < bp) { bp = p; best = m; } apply(m); }
    apply(best); drawFmt(best);
    return { n: N, mod };
  },
  // draws the code on a canvas (dark modules on white, with the quiet zone)
  draw(cv, text, px) {
    const q = this.make(text); if (!q) return false;
    const s = px || Math.max(2, Math.floor(Math.min(cv.width, cv.height) / (q.n + 8))), W = (q.n + 8) * s;
    cv.width = cv.height = W; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, W); c.fillStyle = '#0a0d14';
    for (let y = 0; y < q.n; y++) for (let x = 0; x < q.n; x++) if (q.mod[y * q.n + x]) c.fillRect((x + 4) * s, (y + 4) * s, s, s);
    return true;
  }
};

