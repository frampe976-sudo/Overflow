/* =====================================================================
   GLARE — light coronas, the haze around them in the rain, and their
   long reflections on the wet asphalt
   ===================================================================== */
const Glare = {
  batch: null, K: 0.72, // overall strength (kept gentle for eye comfort)
  init() { this.batch = new Particles(2600); },
  reset() { this.batch.reset(); },
  // camera-facing corona (size in metres, never smaller than minPx pixels); cell 0 corona, 1 horizontal streak, 2 haze
  corona(x, y, z, size, r, g, b, k, minPx = 3, cell = 0, stretch = 1) { k *= this.K; if (k > 0.004) this.batch.push(x, y, z, size, r, g, b, k, minPx, stretch, cell, false); },
  // reflection of a light on the wet ground: centred on the mirror point, stretched toward the viewer
  streak(x, y, z, r, g, b, k, gy = 0) {
    if (k < 0.01) return;
    const C = Cam.pos; const dx = C.x - x, dz = C.z - z; const D = Math.hypot(dx, dz); if (D < 2) return;
    const h = Math.max(0.25, y - gy), hc = Math.max(0.4, C.y - gy);
    const ux = dx / D, uz = dz / D;
    const m = D * h / (h + hc); // distance from the light's foot to the mirror point
    const a = Math.min(m * 0.08, 1.2), e = Math.min(m * 1.12, D - 1.5); if (e - a < 1) return; // from just past the foot to a bit beyond the mirror point
    const len = e - a, mid = (a + e) / 2, w = 0.2 + Math.min(h, 7) * 0.035 + D * 0.006;
    const px = x + ux * mid, pz = z + uz * mid;
    if (!Cam.sphereVisible(px, gy, pz, len * 0.5)) return;
    const graze = clamp(1.25 - hc / (D * 0.3 + hc), 0.25, 1);
    this.batch.push(px, gy + 0.045, pz, w, r, g, b, k * graze * Env.wet * this.K, Math.atan2(-ux, uz), len / w, 3, true);
  },
  // static fixtures registered while the city was built
  collect() {
    const L = World.coronas; if (!L || !L.length) return;
    const C = Cam.pos, q = Game.q || {};
    const maxD = Math.min(q.draw || 210, 240) * 0.92, md2 = maxD * maxD;
    const minPx = Gfx.bh > 900 ? 4 : 3, haze = q.bloom !== false;
    for (let i = 0; i < L.length; i++) {
      const l = L[i]; const dx = l.x - C.x, dy = l.y - C.y, dz = l.z - C.z; const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > md2) continue;
      const d = Math.sqrt(d2) || 1; let k = l.k * clamp((maxD - d) / 30, 0, 1);
      if (l.lamp) k *= clamp(0.75 + dy / d * 2.5, 0.25, 1); // street lamps shine downward: dimmer seen from above
      if (Cam.sphereVisible(l.x, l.y, l.z, l.s * 1.6)) {
        this.corona(l.x, l.y, l.z, l.s, l.r, l.g, l.b, k, minPx);
        if (haze && l.halo && d < 110) this.corona(l.x, l.y, l.z, l.s * 3.4, l.r, l.g, l.b, k * 0.1 * (0.25 + 0.75 * Math.min(1, Env.rainK)), 0, 2);
      }
      if (l.lamp && d < 95) this.streak(l.x, l.y, l.z, l.r, l.g, l.b, 0.3 * l.k * clamp((95 - d) / 25, 0, 1));
    }
  },
  draw(vp, cam, refl) {
    if (!this.batch.count) return;
    const m = refl ? -1 : 1; // in the mirrored pass the sprites are built with mirrored camera axes
    Gfx.use(Gfx.progs.glare); Gfx.m4('uVP', vp); Gfx.f3('uCR', Cam.right.x, Cam.right.y * m, Cam.right.z); Gfx.f3('uCU', Cam.up.x, Cam.up.y * m, Cam.up.z); Gfx.f1('uRefl', refl ? 1 : 0);
    Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f1('uPix', 2 * Math.tan(Cam.fov / 2) / Math.max(1, Gfx.bh)); Gfx.t('uMap', Tex.glare); Gfx.f1('uFogD', Env.fogD);
    this.batch.draw();
  }
};

