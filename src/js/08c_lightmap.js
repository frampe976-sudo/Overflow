/* =====================================================================
   LIGHTMAP — every street lamp, shop sign and lit window of Port-Saline baked once into two horizontal
   slices (street level, first floor), with the buildings casting their shadows in the bake.
   The renderer used to light the city with only the eight lamps nearest the camera: pools of light
   popped in and out as the robot walked. Now the whole city glows where it should, and the few live
   light slots are kept for the nearest lamps (their highlights) and for muzzle flashes, sirens, fires.
   ===================================================================== */
const Lightmap = {
  tex: null, ox: 0, oz: 0, w: 0, h: 0, T: 1, k: 0.6, ready: false, ms: 0,
  Y: [0.35, 3.3],       // heights of the two slices
  SCALE: 6,             // texel value 1.0 = this much light (stored as a square root for precision in the dark)
  build() {
    const t0 = performance.now(); const L = World.lightsStatic; if (!L.length) return;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const l of L) { x0 = Math.min(x0, l.x - l.range); x1 = Math.max(x1, l.x + l.range); z0 = Math.min(z0, l.z - l.range); z1 = Math.max(z1, l.z + l.range); }
    const T = this.T; this.ox = Math.floor(x0) - 2; this.oz = Math.floor(z0) - 2;
    const w = this.w = Math.min(2048, Math.ceil((x1 - this.ox) / T) + 3), h = this.h = Math.min(1024, Math.ceil((z1 - this.oz) / T) + 3);
    const ox = this.ox, oz = this.oz, hg = new Float32Array(w * h);
    // tallest solid thing over each texel: what a lamp cannot shine through
    for (const b of World.boxes) {
      if (b.noray || b.y0 > 2.5 || b.y1 < 1.2 || b.kind === 'awning' || b.kind === 'fence' || b.kind === 'pole' || b.kind === 'post' || b.kind === 'bound') continue;
      const i0 = Math.max(0, Math.floor((b.x0 - ox) / T)), i1 = Math.min(w - 1, Math.floor((b.x1 - ox) / T)), j0 = Math.max(0, Math.floor((b.z0 - oz) / T)), j1 = Math.min(h - 1, Math.floor((b.z1 - oz) / T));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * w + i; if (b.y1 > hg[k]) hg[k] = b.y1; }
    }
    const acc = [new Float32Array(w * h * 3), new Float32Array(w * h * 3)], Y = this.Y;
    for (const l of L) {
      const r = l.range, r2 = r * r, lx = l.x, lz = l.z, ly = l.y, lr = l.r, lg = l.g, lb = l.b;
      if (lr + lg + lb <= 0) continue; l.baked = true;
      const i0 = Math.max(0, Math.floor((lx - r - ox) / T)), i1 = Math.min(w - 1, Math.ceil((lx + r - ox) / T)), j0 = Math.max(0, Math.floor((lz - r - oz) / T)), j1 = Math.min(h - 1, Math.ceil((lz + r - oz) / T));
      const li = Math.floor((lx - ox) / T), lj = Math.floor((lz - oz) / T);
      for (let j = j0; j <= j1; j++) {
        const z = oz + (j + 0.5) * T, dz = z - lz;
        for (let i = i0; i <= i1; i++) {
          const x = ox + (i + 0.5) * T, dx = x - lx, d2 = dx * dx + dz * dz; if (d2 > r2) continue;
          const k = j * w + i; if (hg[k] > Y[1] + 0.5) continue; // inside a building
          const dxz = Math.sqrt(d2), n = Math.ceil(dxz / T);
          for (let s = 0; s < 2; s++) {
            const dy = ly - Y[s], d = Math.sqrt(d2 + dy * dy); let a = 1 - d / r; if (a <= 0) continue; a *= a;
            const nl = s === 0 ? Math.max(dy, 0.15) / Math.max(d, 0.3) : 0.6; // the street faces up; a wall faces the lamp half the time
            // march toward the lamp: a wall taller than the ray blocks it (the lamp's own cell and the texel's are skipped)
            let vis = 1;
            if (n > 2) for (let t = 1; t < n - 1; t++) {
              const f = t / n, ci = Math.floor((x - dx * f - ox) / T), cj = Math.floor((z - dz * f - oz) / T);
              if (ci === li && cj === lj) break;
              if (hg[cj * w + ci] > Y[s] + dy * f + 0.25) { vis = 0; break; }
            }
            if (!vis) continue;
            const g = a * nl, o = k * 3, A = acc[s]; A[o] += lr * g; A[o + 1] += lg * g; A[o + 2] += lb * g;
          }
        }
      }
    }
    // ambient occlusion of the street: darker against the foot of a wall (alpha of the street slice)
    const data = new Uint8Array(w * h * 2 * 4), S = this.SCALE;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i; let near = 9;
      for (let dj = -2; dj <= 2; dj++) { const jj = j + dj; if (jj < 0 || jj >= h) continue; for (let di = -2; di <= 2; di++) { const ii = i + di; if (ii < 0 || ii >= w) continue; if (hg[jj * w + ii] > 2.5) { const d = Math.hypot(di, dj); if (d < near) near = d; } } }
      const ao = near >= 9 ? 1 : 0.66 + 0.34 * clamp((near - 0.5) / 2.2, 0, 1);
      for (let s = 0; s < 2; s++) {
        const A = acc[s], o = k * 3, p = ((s * h + j) * w + i) * 4;
        const lum = A[o] * 0.3 + A[o + 1] * 0.59 + A[o + 2] * 0.11, knee = 1 / (1 + lum * 0.35); // right under a lamp the pool is bright, never a white hole
        data[p] = Math.min(255, Math.sqrt(A[o] * knee / S) * 255); data[p + 1] = Math.min(255, Math.sqrt(A[o + 1] * knee / S) * 255); data[p + 2] = Math.min(255, Math.sqrt(A[o + 2] * knee / S) * 255);
        data[p + 3] = s === 0 ? Math.round(ao * 255) : 255;
      }
    }
    const gl = Gfx.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex = t; this.ready = true; this.ms = Math.round(performance.now() - t0);
  },
  // uniforms for the lit shaders: the texture, its placement, how strongly it lights
  bind() {
    if (!this.ready) { Gfx.f1('uLMk', 0); return; }
    Gfx.t('uLM', this.tex); Gfx.f4('uLMo', this.ox, this.oz, 1 / (this.w * this.T), 1 / (this.h * this.T)); Gfx.f1('uLMk', this.k * this.SCALE);
  }
};

