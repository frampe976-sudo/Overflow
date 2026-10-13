/* =====================================================================
   RENDER — frame orchestration
   ===================================================================== */
const Env = {
  // night palette: dark neutral sky light, warm bounce from the sodium-lit streets, a brownish haze
  hemiS: [0.056, 0.055, 0.068], hemiG: [0.05, 0.036, 0.026], moonD: [0.32, 0.82, -0.47], moonC: [0.055, 0.062, 0.09],
  fogC: [0.078, 0.062, 0.062], fogD: 0.0105, horizon: [0.15, 0.092, 0.075], zenith: [0.009, 0.01, 0.02], rim: [0.13, 0.14, 0.19],
  flash: 0, flashT: 0, nextLightning: 12, rainK: 1, time: 0, storm: 0, dawn: 0, dawnTo: 0, base: null,
  // weather: rain (0 dry .. 0.3 drizzle .. 1 downpour .. 1.3 storm), cloud cover, wind, how wet the streets are
  rain: 0, rainTo: 0, cloud: 0.6, cloudTo: 0.6, wind: 0.3, windTo: 0.3, wet: 0.4, fogMul: 1, fogTo: 1, wstate: 'cloudy', wT: 60, lockW: null, palT: 0,
  // the night never ends, but the sky does not stay the same: clear spells, cloud, drizzle, showers
  W: {
    clear: { rain: 0, cloud: 0.12, wind: 0.15, fog: 0.8, dur: [150, 360], next: [['cloudy', 0.75], ['drizzle', 0.25]] },
    cloudy: { rain: 0, cloud: 0.68, wind: 0.3, fog: 0.98, dur: [90, 240], next: [['clear', 0.35], ['drizzle', 0.35], ['shower', 0.3]] },
    drizzle: { rain: 0.3, cloud: 0.86, wind: 0.3, fog: 1.08, dur: [60, 150], next: [['cloudy', 0.45], ['shower', 0.4], ['clear', 0.15]] },
    shower: { rain: 0.9, cloud: 0.96, wind: 0.6, fog: 1.14, dur: [40, 110], next: [['drizzle', 0.45], ['cloudy', 0.55]] },
    storm: { rain: 1.25, cloud: 1, wind: 1, fog: 1.2, dur: [20, 50], next: [['storm', 1]] }
  },
  // the last case ends at daybreak: the night palette slides toward these colours
  DAWN: { hemiS: [0.3, 0.32, 0.4], hemiG: [0.17, 0.135, 0.11], moonC: [0.46, 0.35, 0.25], fogC: [0.36, 0.3, 0.3], horizon: [0.66, 0.41, 0.3], zenith: [0.15, 0.22, 0.38], rim: [0.42, 0.36, 0.32], fogD: 0.0068 },
  STORM: { fogC: [0.8, 0.9, 1.1], horizon: [0.72, 0.8, 0.98], hemiS: [0.9, 0.95, 1.05] },
  // def.storm: the storm of the last chapter (locked); def.weather: how a case starts ('clear', 'cloudy', 'drizzle', 'shower')
  setWeather(def) {
    this.dawn = this.dawnTo = 0; this.lockW = def && def.storm ? 'storm' : null;
    const st = this.lockW || (def && this.W[def.weather] ? def.weather : this.pickW());
    this.enterW(st, true); this.storm = this.lockW ? 1 : 0;
    this.wet = this.rain > 0.1 ? 1 : st === 'cloudy' ? R(0.25, 0.75) : R(0, 0.4); // it may have rained a little earlier
    this.nextLightning = this.storm ? R(3, 6) : R(10, 24); this.applyPalette();
  },
  pickW() { const r = Math.random(); return r < 0.32 ? 'clear' : r < 0.62 ? 'cloudy' : r < 0.82 ? 'drizzle' : 'shower'; },
  enterW(st, snap) {
    const S = this.W[st]; this.wstate = st; this.wT = R(S.dur[0], S.dur[1]);
    this.rainTo = S.rain * (st === 'storm' ? R(0.85, 1.12) : R(0.8, 1.15)); this.cloudTo = S.cloud; this.windTo = S.wind * R(0.8, 1.2); this.fogTo = S.fog;
    if (snap) { this.rain = this.rainTo; this.cloud = this.cloudTo; this.wind = this.windTo; this.fogMul = this.fogTo; }
  },
  toDawn() { this.dawnTo = 1; },
  applyPalette() {
    const K = ['hemiS', 'hemiG', 'moonC', 'fogC', 'horizon', 'zenith', 'rim'];
    if (!this.base) { this.base = { fogD: this.fogD }; for (const k of K) this.base[k] = this[k].slice(); }
    const B = this.base, s = this.storm, d = smoothstep(0, 1, this.dawn), cl = this.cloud;
    // a clear sky lets the moonlight through and shows less of the city's orange glow
    const mul = { moonC: lerp(1.5, 0.75, cl), hemiS: lerp(1.1, 0.97, cl), horizon: lerp(0.78, 1.02, cl), zenith: lerp(1.25, 1, cl) };
    for (const k of K) { const st = this.STORM[k], m = mul[k] || 1; for (let i = 0; i < 3; i++) this[k][i] = lerp(B[k][i] * (st ? lerp(1, st[i], s) : 1) * m, this.DAWN[k][i], d); }
    this.fogD = lerp(B.fogD * (1 + 0.22 * s) * this.fogMul, this.DAWN.fogD, d);
    this.rainK = this.rain * (1 - smoothstep(0, 0.7, this.dawn));
  },
  update(dt) {
    this.time += dt;
    if (this.dawn !== this.dawnTo) this.dawn = approach(this.dawn, this.dawnTo, dt / 24);
    // the weather drifts from one state to the next (the storm of the last chapter stays, in gusts)
    if (this.dawnTo > 0) { this.rainTo = 0; this.cloudTo = 0.3; this.windTo = 0.2; this.fogTo = 0.9; } // the storm blows over at daybreak
    else if ((this.wT -= dt) <= 0) {
      if (this.lockW) this.enterW(this.lockW);
      else { const N = this.W[this.wstate].next; let r = Math.random(), st = N[N.length - 1][0]; for (const [k, p] of N) { if (r < p) { st = k; break; } r -= p; } this.enterW(st); }
    }
    this.rain = approach(this.rain, this.rainTo, dt * (this.rainTo > this.rain ? 1 / 12 : 1 / 20));
    this.cloud = approach(this.cloud, this.cloudTo, dt / 45); this.wind = approach(this.wind, this.windTo, dt / 10); this.fogMul = approach(this.fogMul, this.fogTo, dt / 40);
    this.storm = approach(this.storm, this.lockW === 'storm' && this.dawnTo === 0 ? 1 : 0, dt / 30);
    // the streets: soaked by half a minute of shower, dry again a few minutes after it stops (the puddles last longest)
    if (this.rain > 0.05) this.wet = Math.min(1, this.wet + dt * (0.01 + this.rain * 0.045)); else this.wet = Math.max(0, this.wet - dt / 210);
    if ((this.palT -= dt) <= 0 || this.dawn !== this.dawnTo) { this.palT = 0.25; this.applyPalette(); }
    // lightning: in the storm, now and then in a heavy shower
    this.nextLightning -= dt;
    if (this.nextLightning <= 0 && this.dawn < 0.25) {
      const stormy = this.storm > 0.5, heavy = this.rain > 0.95;
      this.nextLightning = stormy ? R(4, 11) : R(16, 40);
      if (stormy || heavy) { this.flashT = 0.6; const delay = R(0.4, 2.2) + (stormy ? 0 : R(0.5, 2)); setTimeout(() => Snd.play('thunder', null, stormy ? R(0.6, 1) : R(0.35, 0.6)), delay * 1000); }
    }
    if (this.flashT > 0) { this.flashT -= dt; const t = 0.6 - this.flashT; this.flash = (t < 0.1 ? smoothstep(0, 0.1, t) : Math.exp(-(t - 0.1) * 5.5)) * 0.5 * (this.storm > 0.5 ? 1 : 0.7); }
    else this.flash = 0;
  }
};
const Cam = {
  pos: new V3(0, 10, 20), target: new V3(0, 0, 0), fov: 62 * DEG, near: 0.15, far: 900, aspect: 1,
  view: M4.create(), proj: M4.create(), vp: M4.create(), invVP: M4.create(), rvp: M4.create(), rinv: M4.create(), planes: new Float32Array(24), rplanes: new Float32Array(24),
  right: new V3(), up: new V3(), fwd: new V3(), yaw: 0,
  update() {
    this.aspect = Gfx.bw / Gfx.bh;
    M4.lookAt(this.view, this.pos.x, this.pos.y, this.pos.z, this.target.x, this.target.y, this.target.z);
    M4.perspective(this.proj, this.fov, this.aspect, this.near, this.far);
    M4.mul(this.vp, this.proj, this.view); M4.invert(this.invVP, this.vp);
    // mirrored across y=0
    const Rm = M4.create(); Rm[5] = -1; M4.mul(this.rvp, this.vp, Rm); M4.invert(this.rinv, this.rvp);
    const v = this.view; this.right.set(v[0], v[4], v[8]); this.up.set(v[1], v[5], v[9]); this.fwd.set(-v[2], -v[6], -v[10]);
    this.yaw = Math.atan2(this.fwd.x, this.fwd.z);
    // frustum planes (Gribb-Hartmann), for the view and for the mirrored view of the reflections
    this.planesOf(this.vp, this.planes); this.planesOf(this.rvp, this.rplanes);
  },
  planesOf(m, P) {
    const set = (i, a, b, c, d) => { const l = Math.hypot(a, b, c); P[i * 4] = a / l; P[i * 4 + 1] = b / l; P[i * 4 + 2] = c / l; P[i * 4 + 3] = d / l; };
    set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]); set(1, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    set(2, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]); set(3, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    set(4, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]); set(5, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
  },
  sphereVisible(x, y, z, r) { const P = this.planes; for (let i = 0; i < 6; i++) if (P[i * 4] * x + P[i * 4 + 1] * y + P[i * 4 + 2] * z + P[i * 4 + 3] < -r) return false; return true; },
  project(x, y, z, out) { // to CSS pixels; returns false if behind
    const m = this.vp; const w = m[3] * x + m[7] * y + m[11] * z + m[15]; if (w <= 0.05) return false;
    out.x = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * Gfx.W; out.y = (1 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5 + 0.5)) * Gfx.H; out.w = w; return true;
  }
};

const Render = {
  inst: [],        // Instanced meshes drawn lit (both passes)
  glowInst: [],    // instanced unlit (glow) meshes
  particles: null, addParticles: null, shadows: null, beams: null, rain: null, rainCount: 0,
  post: { bloomK: 0.6, thr: 1.0, expo: 1.16, sat: 0.94, vig: 0.6, dmg: 0, flash: 0, time: 0, grain: 0.02, tint: [1, 1, 1],
    // film grade: cool shadows, warm highlights, lifted blacks, gentle S-curve (GTA-like night)
    grade: { shadow: [0.9, 1.0, 1.1], hi: [1.08, 1.0, 0.85], lift: [0.012, 0.01, 0.014], contrast: 0.3, ca: 0.0035, bloom: [1.06, 0.95, 0.82] } },
  init() {
    this.particles = new Particles(1400); this.addParticles = new Particles(2400); this.shadows = new Particles(400); this.beams = new Beams(160); Glare.init();
    this.buildRain(5000);
  },
  buildRain(n) {
    const gl = Gfx.gl; const pos = new Float32Array(n * 6), nrm = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = Math.random(), y = Math.random(), z = Math.random(), sv = Math.random(), lv = Math.random(); pos.set([x, y, z, x, y, z], i * 6); nrm.set([0, sv, lv, 1, sv, lv], i * 6); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b1 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b1); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const b2 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b2); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null); this.rain = { vao, n };
  },
  litGlobals(pr, vp, cam, clipY) {
    Gfx.m4('uVP', vp); Gfx.f3('uCam', cam.x, cam.y, cam.z);
    const k = 1 + Env.flash * 5;
    Gfx.f3('uHemiS', Env.hemiS[0] * k, Env.hemiS[1] * k, Env.hemiS[2] * k); Gfx.f3('uHemiG', Env.hemiG[0], Env.hemiG[1], Env.hemiG[2]);
    const md = Env.moonD, ml = Math.hypot(md[0], md[1], md[2]); Gfx.f3('uMoonD', md[0] / ml, md[1] / ml, md[2] / ml);
    const mk = 1 + Env.flash * 8; Gfx.f3('uMoonC', Env.moonC[0] * mk, Env.moonC[1] * mk, Env.moonC[2] * mk);
    Gfx.v4('uLP', Lights.arrP.subarray(0, Gfx.LN * 4)); Gfx.v3('uLC', Lights.arrC.subarray(0, Gfx.LN * 3)); { const l = Gfx.cur.u.uLD; if (l) Gfx.gl.uniform1fv(l, Lights.arrD.subarray(0, Gfx.LN)); } Lightmap.bind();
    Gfx.f3('uFogC', Env.fogC[0] + Env.flash * 0.08, Env.fogC[1] + Env.flash * 0.08, Env.fogC[2] + Env.flash * 0.1); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uClipY', clipY);
    Gfx.f3('uRimC', Env.rim[0], Env.rim[1], Env.rim[2]);
    Gfx.f3('uEnvH', Env.horizon[0] + Env.flash * 0.3, Env.horizon[1] + Env.flash * 0.3, Env.horizon[2] + Env.flash * 0.35); Gfx.f3('uEnvZ', Env.zenith[0], Env.zenith[1], Env.zenith[2]);
  },
  drawSky(vp, inv, cam) {
    const gl = Gfx.gl; gl.depthMask(false); gl.disable(gl.CULL_FACE);
    Gfx.use(Gfx.progs.sky); Gfx.m4('uInvVP', inv); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f1('uTime', Env.time); Gfx.f1('uFlash', Env.flash); Gfx.f1('uMirror', 0);
    Gfx.f3('uHorizon', Env.horizon[0], Env.horizon[1], Env.horizon[2]); Gfx.f3('uZenith', Env.zenith[0], Env.zenith[1], Env.zenith[2]); Gfx.t('uNoise', Tex.noise);
    Gfx.f1('uCloud', Env.cloud); Gfx.f3('uMoonDir', Env.moonD[0], Env.moonD[1], Env.moonD[2]); Gfx.f1('uClear', 1 - smoothstep(0, 0.6, Env.dawn));
    Gfx.quad(); gl.depthMask(true); gl.enable(gl.CULL_FACE);
  },
  drawWorld(vp, cam, clipY, refl) {
    const gl = Gfx.gl, M = World.meshes;
    // atlas (buildings/props)
    let p = Gfx.use(Gfx.progs.atlas); this.litGlobals(p, vp, cam, clipY); Gfx.m4('uModel', M4.create());
    Gfx.t('uMap', Tex.atlas); Gfx.t('uEmap', Tex.eatlas); Gfx.t('uNoise', Tex.noise); Gfx.t('uNmap', Tex.natlas); Gfx.f2('uCell', 1 / ACOLS, 1 / AROWS); Gfx.f4('uMat', 22, 0.3, 0.0, 0.9);
    M.atlas.draw();
    if (M.detail) { // small street and facade details: only drawn near the camera
      const P = Cull.pass, m = P ? P.maxD : 0; if (P) P.maxD = Math.min(m, refl ? 60 : (Game.q && Game.q.detail) || 130); M.detail.draw(); if (P) P.maxD = m;
    }
    if (M.fence) { gl.disable(gl.CULL_FACE); p = Gfx.use(Gfx.progs.atlasA); this.litGlobals(p, vp, cam, clipY); Gfx.m4('uModel', M4.create()); Gfx.t('uMap', Tex.atlas); Gfx.t('uEmap', Gfx.black); Gfx.t('uNoise', Tex.noise); Gfx.f2('uCell', 1 / ACOLS, 1 / AROWS); Gfx.f4('uMat', 30, 0.5, 0, 0); M.fence.draw(); gl.enable(gl.CULL_FACE); }
    if (!refl) {
      p = Gfx.use(Gfx.progs.wet); this.litGlobals(p, vp, cam, clipY); Gfx.m4('uModel', M4.create());
      Gfx.t('uMap', Tex.ground); Gfx.t('uEmap', Gfx.black); Gfx.t('uNmap', Tex.nground); Gfx.f2('uCell', 0.25, 0.25); Gfx.f4('uMat', 40, 0.55, 0, 0);
      const rt = Gfx.rt.refl; Gfx.t('uNoise', Tex.noise); Gfx.t('uRefl', rt ? rt.tex : Gfx.black); Gfx.f2('uRes', Gfx.bw, Gfx.bh); Gfx.f1('uRefK', rt ? 0.85 : 0.0); Gfx.f1('uTime', Env.time); Gfx.f1('uWet', Env.wet); Gfx.f1('uRain', Math.min(1, Env.rainK));
      Gfx.f3('uEnvC', Env.horizon[0] * 0.9 + Env.flash * 0.3, Env.horizon[1] * 0.9 + Env.flash * 0.3, Env.horizon[2] * 0.9 + Env.flash * 0.35); // sky glow mirrored when there is no reflection pass
      M.ground.draw();
    }
    // glow (opaque emissive)
    p = Gfx.use(Gfx.progs.glow); Gfx.m4('uVP', vp); Gfx.m4('uModel', M4.create()); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f3('uFogC', Env.fogC[0], Env.fogC[1], Env.fogC[2]); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uClipY', clipY); Gfx.f1('uAdd', 0);
    Gfx.t('uMap', Gfx.white); Gfx.f1('uGain', 1.0); if (M.glow) M.glow.draw();
    if (M.boards) { Gfx.use(Gfx.progs.glow); Gfx.m4('uVP', vp); Gfx.m4('uModel', M4.create()); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f3('uFogC', Env.fogC[0], Env.fogC[1], Env.fogC[2]); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uClipY', clipY); Gfx.f1('uAdd', 0); Gfx.t('uMap', Tex.neonTex); Gfx.f1('uGain', 0.74); M.boards.draw(); }
    // dynamic lit instanced
    if (this.inst.length) {
      p = Gfx.use(Gfx.progs.litI); this.litGlobals(p, vp, cam, clipY);
      for (const it of this.inst) { if (!it.count) continue; Gfx.f4('uMat', it.mat[0], it.mat[1], it.mat[2], it.mat[3] || 0); it.draw(); }
    }
    Folk.draw(vp, cam, clipY);
    if (this.glowInst.length) {
      Gfx.use(Gfx.progs.glowI); Gfx.m4('uVP', vp); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f3('uFogC', Env.fogC[0], Env.fogC[1], Env.fogC[2]); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uClipY', clipY); Gfx.f1('uAdd', 0); Gfx.t('uMap', Gfx.white); Gfx.f1('uGain', 1);
      for (const it of this.glowInst) it.draw();
    }
  },
  drawAdditive(vp, cam, clipY, refl) {
    const gl = Gfx.gl, M = World.meshes;
    gl.disable(gl.CULL_FACE); Gfx.blendMode('add');
    const g = () => { Gfx.use(Gfx.progs.glow); Gfx.m4('uVP', vp); Gfx.m4('uModel', M4.create()); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f3('uFogC', 0, 0, 0); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uClipY', clipY); Gfx.f1('uAdd', 1); };
    if (!refl) {
      if (M.pools) { g(); Gfx.t('uMap', Tex.radial); Gfx.f1('uGain', 0.55); M.pools.draw(); }
      if (M.streaks && !Gfx.rt.refl) { g(); Gfx.t('uMap', Tex.streak); Gfx.f1('uGain', 0.8 * (0.1 + 0.9 * Env.wet)); M.streaks.draw(); }
      if (M.cones) { g(); Gfx.t('uMap', Tex.cone); Gfx.f1('uGain', 0.9 * Env.rainK + 0.12 + 0.18 * Env.fogMul); M.cones.draw(); }
    }
    if (M.neon) { g(); Gfx.t('uMap', Tex.neonTex); Gfx.f1('uGain', 1.1); gl.enable(gl.CULL_FACE); M.neon.draw(); gl.disable(gl.CULL_FACE); } // signs are one-sided (a two-sided sign is two quads)
    if (refl) Glare.draw(vp, cam, true); // coronas mirrored in the wet street
    if (!refl) {
      // particles
      Gfx.use(Gfx.progs.part); Gfx.m4('uVP', vp); Gfx.f3('uCR', Cam.right.x, Cam.right.y, Cam.right.z); Gfx.f3('uCU', Cam.up.x, Cam.up.y, Cam.up.z); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.t('uMap', Tex.parts); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uAdd', 1);
      this.addParticles.draw();
      Glare.draw(vp, cam, false);
      // beams
      Gfx.use(Gfx.progs.beam); Gfx.m4('uVP', vp); this.beams.draw();
      // rain
      if (this.rainCount > 0 && Env.rainK > 0.02) {
        Gfx.use(Gfx.progs.rain); Gfx.m4('uVP', vp); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f1('uTime', Env.time); Gfx.f3('uBox', 36, 22, 36); Gfx.f2('uWind', 1.2 + Env.wind * 6.5, 0.6 + Env.wind * 2.9); Gfx.f1('uLen', 0.55 + Math.min(1.3, Env.rain) * 0.5);
        const fl = 1 + Env.flash * 3; Gfx.f3('uColor', 0.1 * fl, 0.115 * fl, 0.155 * fl);
        gl.bindVertexArray(this.rain.vao); gl.drawArrays(gl.LINES, 0, Math.min(this.rain.n, Math.round(this.rainCount * Math.min(1.35, Env.rainK))) * 2);
      }
    }
    Gfx.blendMode('none'); gl.enable(gl.CULL_FACE);
  },
  drawAlpha(vp, cam) {
    const gl = Gfx.gl; gl.disable(gl.CULL_FACE); Gfx.blendMode('alpha');
    Gfx.use(Gfx.progs.part); Gfx.m4('uVP', vp); Gfx.f3('uCR', Cam.right.x, Cam.right.y, Cam.right.z); Gfx.f3('uCU', Cam.up.x, Cam.up.y, Cam.up.z); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.t('uMap', Tex.parts); Gfx.f1('uFogD', Env.fogD); Gfx.f1('uAdd', 0);
    this.shadows.draw(); this.particles.draw();
    Gfx.blendMode('none'); gl.enable(gl.CULL_FACE);
  },
  drawWater(vp, cam) {
    const M = World.meshes; if (!M.water) return;
    Gfx.use(Gfx.progs.water); Gfx.m4('uVP', vp); Gfx.f3('uCam', cam.x, cam.y, cam.z); Gfx.f1('uTime', Env.time); Gfx.t('uNoise', Tex.noise);
    const rt = Gfx.rt.refl; Gfx.t('uRefl', rt ? rt.tex : Gfx.black); Gfx.f2('uRes', Gfx.bw, Gfx.bh); Gfx.f1('uRefK', rt ? 1 : 0);
    Gfx.v4('uLP', Lights.arrP.subarray(0, Gfx.LN * 4)); Gfx.v3('uLC', Lights.arrC.subarray(0, Gfx.LN * 3)); Gfx.f3('uFogC', Env.fogC[0], Env.fogC[1], Env.fogC[2]); Gfx.f1('uFogD', Env.fogD); Gfx.f3('uHorizon', Env.horizon[0], Env.horizon[1], Env.horizon[2]); Gfx.f1('uFlash', Env.flash);
    M.water.draw();
  },
  frame() {
    const gl = Gfx.gl, r = Gfx.rt; const cam = Cam.pos;
    for (const it of this.inst) it.upload(); for (const it of this.glowInst) it.upload();
    const dd = (Game.q && Game.q.draw) || 230; Cull.stats = { parts: 0, drawn: 0, tris: 0 };
    Glare.collect();
    // reflection pass
    Cull.pass = { planes: Cam.rplanes, x: cam.x, z: cam.z, maxD: dd * 0.55 };
    if (r.refl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, r.refl.fb); gl.viewport(0, 0, r.refl.w, r.refl.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const mc = { x: cam.x, y: -cam.y, z: cam.z };
      gl.frontFace(gl.CW);
      this.drawSky(Cam.rvp, Cam.rinv, mc);
      this.drawWorld(Cam.rvp, mc, -0.05, true);
      this.drawAdditive(Cam.rvp, mc, -0.05, true);
      gl.frontFace(gl.CCW);
      gl.bindTexture(gl.TEXTURE_2D, r.refl.tex); gl.generateMipmap(gl.TEXTURE_2D);
    }
    // main
    Cull.pass = { planes: Cam.planes, x: cam.x, z: cam.z, maxD: dd };
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.ms ? r.ms.fb : r.scene.fb); gl.viewport(0, 0, Gfx.bw, Gfx.bh);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawSky(Cam.vp, Cam.invVP, cam);
    this.drawWorld(Cam.vp, cam, -1e9, false);
    this.drawWater(Cam.vp, cam);
    this.drawAlpha(Cam.vp, cam);
    this.drawAdditive(Cam.vp, cam, -1e9, false);
    this.post.flash = Env.flash * 0.05 + (this.post.extraFlash || 0); if (this.post.extraFlash) this.post.extraFlash = Math.max(0, this.post.extraFlash - (Game.rawDt || 0.016) * 0.6);
    this.post.time = Env.time;
    Gfx.post(this.post);
  }
};

