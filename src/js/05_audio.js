/* =====================================================================
   AUDIO — procedural WebAudio (sfx, loops, adaptive music)
   ===================================================================== */
const Snd = {
  ctx: null, ok: false, master: null, sfx: null, mus: null, amb: null, rev: null, noiseBuf: null, brownBuf: null,
  listener: { x: 0, y: 0, z: 0, yaw: 0 },
  loops: {},
  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master);
      this.mus = c.createGain(); this.mus.connect(this.master);
      this.amb = c.createGain(); this.amb.gain.value = 0.7; this.amb.connect(this.master);
      // noise buffers
      const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.brownBuf = c.createBuffer(1, len, c.sampleRate); const b = this.brownBuf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
      // reverb (urban slap + tail)
      this.rev = c.createConvolver(); const rl = c.sampleRate * 1.6, ir = c.createBuffer(2, rl, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < rl; i++) { const t = i / rl; x[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < c.sampleRate * 0.012 ? 0 : 1) + (Math.abs(i - c.sampleRate * 0.09) < 40 ? 0.6 : 0); } }
      this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = 0.35; this.revIn.connect(this.rev); this.rev.connect(this.sfx);
      this.ok = true; this.applyVolumes();
      Amb.init(); Music.init();
    } catch (e) { this.ok = false; }
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => { }); },
  applyVolumes() { if (!this.ok) return; const o = Save.data.options; this.sfx.gain.value = o.sfx; this.mus.gain.value = o.music * 0.9; this.ambVol = o.amb === undefined ? 0.6 : o.amb; this.amb.gain.value = this.ambVol * 0.9; },
  // output node for a positional sound
  out(pos, vol) {
    const c = this.ctx; const g = c.createGain(); let gain = vol;
    let pan = null;
    if (pos) {
      const L = this.listener; const dx = pos.x - L.x, dy = pos.y - L.y, dz = pos.z - L.z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      gain *= 1 / (1 + Math.max(0, d - 3) * 0.09); if (d > 80) gain *= Math.max(0, 1 - (d - 80) / 60);
      const ang = Math.atan2(dx, dz) - L.yaw; pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) pan.pan.value = clamp(-Math.sin(ang) * 0.8, -1, 1);
    }
    g.gain.value = gain;
    if (pan) { g.connect(pan); pan.connect(this.sfx); } else g.connect(this.sfx);
    return { g, gain };
  },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  noise(t, dur, filtType, f0, f1, q, peak, dest, buf) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = buf || this.noiseBuf; s.playbackRate.value = 1;
    const f = c.createBiquadFilter(); f.type = filtType; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.003, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return g;
  },
  tone(t, type, f0, f1, dur, peak, dest, attack = 0.003) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this.env(g, t, attack, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + attack + dur + 0.05);
    return g;
  },
  play(name, pos, vol = 1, pitch = 1) {
    if (!this.ok || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime + 0.005; const O = this.out(pos, vol); const D = O.g; if (O.gain < 0.004) return;
    const p = pitch * (0.94 + Math.random() * 0.12);
    switch (name) {
      case 'whoosh': this.noise(t, 0.16, 'bandpass', 500 * p, 2200 * p, 1.2, 0.35, D); break;
      case 'punch': this.tone(t, 'sine', 140 * p, 45, 0.13, 0.9, D); this.noise(t, 0.05, 'bandpass', 1900 * p, 1200, 0.9, 0.55, D); break;
      case 'kick': this.tone(t, 'sine', 110 * p, 38, 0.2, 1.0, D); this.noise(t, 0.09, 'lowpass', 1400 * p, 300, 0.7, 0.6, D); break;
      case 'heavy': this.tone(t, 'sine', 90 * p, 30, 0.3, 1.1, D); this.noise(t, 0.16, 'lowpass', 900, 200, 0.7, 0.8, D); this.noise(t, 0.3, 'bandpass', 300, 150, 1, 0.3, this.revIn); break;
      case 'block': this.tone(t, 'square', 950 * p, 900, 0.07, 0.18, D); this.tone(t, 'square', 1420 * p, 1300, 0.05, 0.1, D); this.noise(t, 0.03, 'highpass', 3000, 3000, 0.7, 0.3, D); break;
      case 'parry': this.tone(t, 'sine', 1760 * p, 1760, 0.6, 0.35, D); this.tone(t, 'sine', 2637 * p, 2637, 0.4, 0.2, D); this.noise(t, 0.3, 'bandpass', 3000, 800, 2, 0.25, D); break;
      case 'pistol': this.noise(t, 0.14, 'lowpass', 5000, 900, 0.6, 1.0, D); this.tone(t, 'sine', 190, 55, 0.12, 0.8, D); this.noise(t, 0.12, 'lowpass', 3000, 600, 0.6, 0.7, this.revIn); break;
      case 'shotgun': this.noise(t, 0.32, 'lowpass', 3200, 500, 0.6, 1.2, D); this.tone(t, 'sine', 120, 40, 0.25, 1.0, D); this.noise(t, 0.3, 'lowpass', 2200, 400, 0.6, 0.9, this.revIn); break;
      case 'rifle': this.noise(t, 0.08, 'highpass', 900, 700, 0.6, 0.9, D); this.tone(t, 'sine', 220, 70, 0.07, 0.6, D); this.noise(t, 0.08, 'lowpass', 2500, 600, 0.6, 0.5, this.revIn); break;
      case 'ak': this.noise(t, 0.11, 'lowpass', 4200, 700, 0.6, 1.05, D); this.tone(t, 'sine', 160, 48, 0.1, 0.8, D); this.noise(t, 0.03, 'highpass', 2500, 2500, 0.7, 0.5, D); this.noise(t, 0.16, 'lowpass', 2000, 450, 0.6, 0.6, this.revIn); break;
      case 'smg': this.noise(t, 0.055, 'bandpass', 2600, 1200, 0.8, 0.8, D); this.tone(t, 'sine', 260, 90, 0.05, 0.45, D); this.noise(t, 0.06, 'lowpass', 2600, 700, 0.6, 0.35, this.revIn); break;
      case 'explosion': { const g = this.noise(t, 1.7, 'lowpass', 1400, 55, 0.7, 1.6, D, this.brownBuf); this.tone(t, 'sine', 70, 24, 0.9, 1.4, D); this.noise(t, 0.22, 'lowpass', 5000, 800, 0.6, 1.1, D); this.noise(t + 0.02, 2.2, 'lowpass', 900, 60, 0.6, 1.0, this.revIn, this.brownBuf); break; }
      case 'bounce': this.tone(t, 'triangle', 1350 * p, 1100 * p, 0.06, 0.22, D); this.tone(t, 'sine', 2900 * p, 2700 * p, 0.04, 0.08, D); this.noise(t, 0.03, 'bandpass', 3200, 2400, 1.2, 0.18, D); break;
      case 'pin': this.tone(t, 'triangle', 2400 * p, 2300, 0.03, 0.14, D); this.tone(t + 0.07, 'square', 1700 * p, 1650, 0.025, 0.06, D); this.noise(t + 0.06, 0.04, 'bandpass', 4000, 3000, 2, 0.12, D); break;
      case 'nadewarn': this.tone(t, 'square', 1900, 1900, 0.05, 0.07, D); break;
      case 'glass': this.noise(t, 0.09, 'highpass', 5200, 3800, 1.2, 0.5, D); this.tone(t + 0.01, 'triangle', 3900 * p, 3500, 0.05, 0.12, D); this.tone(t + 0.05, 'triangle', 5200 * p, 4800, 0.06, 0.08, D); break;
      case 'casing': this.tone(t, 'triangle', 4200 * p, 3600 * p, 0.03, 0.09, D); this.tone(t + 0.04, 'sine', 5600 * p, 5200, 0.02, 0.04, D); break;
      case 'score': this.tone(t, 'sine', 1320 * p, 1320 * p, 0.09, 0.12, D); this.tone(t + 0.06, 'sine', 1760 * p, 1760 * p, 0.12, 0.1, D); break;
      case 'perfect': this.tone(t, 'sine', 880, 880, 0.3, 0.2, D); this.tone(t + 0.05, 'sine', 1320, 1320, 0.3, 0.16, D); this.tone(t + 0.1, 'sine', 1760, 1760, 0.45, 0.14, D); this.noise(t, 0.25, 'bandpass', 2600, 900, 2, 0.12, D); break;
      case 'headshot': this.tone(t, 'square', 620 * p, 300, 0.07, 0.16, D); this.noise(t, 0.05, 'highpass', 2400, 2400, 1, 0.3, D); this.tone(t + 0.03, 'sine', 1480, 1400, 0.1, 0.1, D); break;
      case 'rank': this.tone(t, 'sine', 523, 523, 0.25, 0.18, D); this.tone(t + 0.12, 'sine', 659, 659, 0.25, 0.18, D); this.tone(t + 0.24, 'sine', 784, 784, 0.3, 0.18, D); this.tone(t + 0.36, 'sine', 1047, 1047, 0.6, 0.2, D); break;
      case 'repair': this.tone(t, 'triangle', 660, 990, 0.18, 0.12, D); this.tone(t + 0.1, 'sine', 1320, 1760, 0.25, 0.1, D); this.noise(t, 0.12, 'bandpass', 3200, 1600, 1.5, 0.06, D); break;
      case 'empty': this.tone(t, 'square', 2200, 2000, 0.02, 0.12, D); break;
      case 'reload': this.tone(t, 'square', 1500, 1400, 0.025, 0.1, D); this.tone(t + 0.18, 'square', 1100, 1000, 0.03, 0.12, D); this.noise(t + 0.3, 0.05, 'bandpass', 2500, 2500, 2, 0.2, D); break;
      case 'ricochet': this.tone(t, 'sine', 2600 * p, 800, 0.16, 0.2, D); this.noise(t, 0.03, 'highpass', 4000, 4000, 1, 0.25, D); break;
      case 'impact': this.noise(t, 0.06, 'bandpass', 1200 * p, 600, 1, 0.4, D); break;
      case 'flesh': this.noise(t, 0.07, 'lowpass', 900, 300, 1, 0.6, D); this.tone(t, 'sine', 100, 50, 0.08, 0.5, D); break;
      case 'step': this.noise(t, 0.045, 'bandpass', 900 * p, 700, 1.4, 0.16, D); break;
      case 'mstep': this.noise(t, 0.05, 'bandpass', 650 * p, 420, 1.3, 0.2, D); this.tone(t, 'sine', 120 * p, 55, 0.07, 0.24, D); this.tone(t + 0.004, 'triangle', 1850 * p, 1800 * p, 0.045, 0.028, D); break;
      case 'clank': this.tone(t, 'triangle', 540 * p, 515 * p, 0.24, 0.26, D); this.tone(t, 'sine', 1390 * p, 1360 * p, 0.17, 0.16, D); this.noise(t, 0.04, 'bandpass', 2600 * p, 2000, 1.2, 0.35, D); break;
      case 'lockon': this.tone(t, 'square', 1250 * p, 1650 * p, 0.045, 0.07, D); this.tone(t + 0.055, 'square', 1650 * p, 1650 * p, 0.05, 0.055, D); break;
      case 'lockoff': this.tone(t, 'square', 1500 * p, 950 * p, 0.07, 0.05, D); break;
      case 'servo': this.tone(t, 'sawtooth', 380 * p, 620 * p, 0.12, 0.035, D, 0.02); break;
      case 'land': this.noise(t, 0.14, 'lowpass', 700, 200, 0.7, 0.55, D); this.tone(t, 'sine', 80, 40, 0.12, 0.4, D); break;
      case 'jump': this.noise(t, 0.1, 'bandpass', 600, 1400, 1, 0.12, D); break;
      case 'grab': this.noise(t, 0.05, 'bandpass', 1500, 1000, 1.5, 0.3, D); this.tone(t, 'sine', 300, 200, 0.05, 0.2, D); break;
      case 'cuff': for (let k = 0; k < 4; k++) this.tone(t + k * 0.06, 'square', 2300 - k * 150, 2100, 0.018, 0.12, D); this.tone(t + 0.3, 'triangle', 1200, 1200, 0.1, 0.12, D); break;
      case 'pickup': [880, 1175, 1480].forEach((f, k) => this.tone(t + k * 0.05, 'sine', f, f, 0.12, 0.22, D)); break;
      case 'badge': [784, 988, 1175, 1568, 1976].forEach((f, k) => this.tone(t + k * 0.07, 'triangle', f, f, 0.35, 0.18, D)); break;
      case 'ui': this.tone(t, 'sine', 700 * p, 700, 0.05, 0.12, D); break;
      case 'ping': this.tone(t, 'sine', 1480, 1480, 0.09, 0.16, D); this.tone(t + 0.11, 'sine', 1975, 1975, 0.16, 0.13, D); break; // a partner's signal
      case 'down': this.tone(t, 'triangle', 660, 440, 0.32, 0.16, D); this.tone(t + 0.2, 'triangle', 520, 330, 0.42, 0.14, D); break; // a partner out of service
      case 'ok': this.tone(t, 'sine', 880, 880, 0.08, 0.16, D); this.tone(t + 0.06, 'sine', 1320, 1320, 0.1, 0.14, D); break;
      case 'back': this.tone(t, 'sine', 520, 380, 0.08, 0.14, D); break;
      case 'radio': this.noise(t, 0.1, 'bandpass', 2600, 2600, 2, 0.25, D); this.tone(t + 0.02, 'square', 1050, 1050, 0.05, 0.06, D); break;
      case 'objective': [523, 659, 784].forEach((f, k) => this.tone(t + k * 0.09, 'triangle', f, f, 0.5, 0.2, D)); this.tone(t + 0.3, 'sine', 1046, 1046, 0.9, 0.12, D); break;
      case 'fail': [392, 330, 262].forEach((f, k) => this.tone(t + k * 0.16, 'triangle', f, f * 0.98, 0.5, 0.22, D)); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, k) => this.tone(t + k * 0.1, 'triangle', f, f, 0.7, 0.2, D)); break;
      case 'thunder': { const g = this.noise(t, 4.5, 'lowpass', 900, 70, 0.8, 1.4, D, this.brownBuf); this.noise(t + 0.2, 3.5, 'lowpass', 300, 60, 0.5, 1.0, this.revIn, this.brownBuf); break; }
      case 'crash': this.noise(t, 0.5, 'lowpass', 2400, 300, 0.7, 1.1, D); [311, 587, 913, 1402].forEach(f => this.tone(t, 'triangle', f * p, f * 0.97, 0.45, 0.12, D)); this.tone(t, 'sine', 80, 35, 0.3, 0.9, D); break;
      case 'bump': this.noise(t, 0.12, 'lowpass', 900, 200, 0.7, 0.5, D); this.tone(t, 'sine', 90, 40, 0.1, 0.4, D); break;
      case 'horn': this.tone(t, 'square', 349 * p, 349, 0.35, 0.12, D, 0.01); this.tone(t, 'square', 440 * p, 440, 0.35, 0.1, D, 0.01); break;
      case 'splash': this.noise(t, 0.9, 'lowpass', 2500, 300, 0.7, 1.0, D); this.noise(t + 0.1, 1.2, 'bandpass', 800, 300, 0.8, 0.4, D); break;
      case 'door': this.noise(t, 0.08, 'lowpass', 1500, 400, 1, 0.5, D); this.tone(t, 'sine', 200, 120, 0.1, 0.4, D); break;
      case 'engineStart': this.tone(t, 'sawtooth', 60, 110, 0.5, 0.25, D, 0.05); break;
      case 'slam': this.tone(t, 'sine', 70, 25, 0.6, 1.3, D); this.noise(t, 0.6, 'lowpass', 600, 60, 0.6, 1.1, D, this.brownBuf); this.noise(t, 0.5, 'lowpass', 1500, 300, 0.6, 0.6, this.revIn); break;
      case 'magic': this.noise(t, 0.8, 'bandpass', 400, 3000, 4, 0.35, D); this.tone(t, 'sine', 220, 880, 0.8, 0.2, D); break;
      case 'alarm': for (let k = 0; k < 3; k++) this.tone(t + k * 0.25, 'square', 880, 880, 0.12, 0.08, D); break;
      case 'coin': this.tone(t, 'square', 1318, 1318, 0.06, 0.12, D); this.tone(t + 0.06, 'square', 1760, 1760, 0.12, 0.12, D); break;
      case 'meow': this.tone(t, 'triangle', 520 * p, 840 * p, 0.16, 0.22, D); this.tone(t + 0.13, 'triangle', 840 * p, 430 * p, 0.34, 0.24, D); this.tone(t + 0.02, 'sawtooth', 1040 * p, 900 * p, 0.4, 0.035, D); break;
    }
  },
  /* ----- loops ----- */
  loop(name) {
    if (!this.ok) return null; if (this.loops[name]) return this.loops[name];
    const c = this.ctx; let L = null;
    if (name === 'engine') {
      const g = c.createGain(); g.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 3;
      const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square'; o2.detune.value = -1200 + 7;
      const g2 = c.createGain(); g2.gain.value = 0.5; o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.sfx); o1.start(); o2.start();
      L = { g, lp, o1, o2, set: (rpm, load, vol) => { const t = c.currentTime; const f = 38 + rpm * 110; o1.frequency.setTargetAtTime(f, t, 0.05); o2.frequency.setTargetAtTime(f, t, 0.05); lp.frequency.setTargetAtTime(400 + load * 1600 + rpm * 900, t, 0.08); g.gain.setTargetAtTime(vol * (0.05 + load * 0.07), t, 0.08); } };
    } else if (name === 'siren') {
      const g = c.createGain(); g.gain.value = 0; const o = c.createOscillator(); o.type = 'triangle'; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
      const o2 = c.createOscillator(); o2.type = 'square'; const g2 = c.createGain(); g2.gain.value = 0.15; o2.connect(g2); g2.connect(lp);
      o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(); o2.start();
      L = { g, o, o2, on: false, next: 0, hi: false, set: (on, vol) => { L.on = on; g.gain.setTargetAtTime(on ? 0.1 * vol : 0, c.currentTime, 0.05); },
        tick: () => { if (!L.on) return; const t = c.currentTime; if (t >= L.next - 0.1) { const f = L.hi ? 488 : 435; const at = Math.max(t, L.next); o.frequency.setValueAtTime(f, at); o2.frequency.setValueAtTime(f, at); L.hi = !L.hi; L.next = at + 0.5; } } };
    } else if (name === 'screech') {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 6;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.sfx); s.start();
      L = { g, f, set: (k) => { g.gain.setTargetAtTime(k * 0.22, c.currentTime, 0.05); f.frequency.setTargetAtTime(1500 + k * 900, c.currentTime, 0.1); } };
    } else if (name === 'zip') {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
      const o = c.createOscillator(); o.type = 'sawtooth'; const og = c.createGain(); og.gain.value = 0.05;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.sfx); s.start(); o.start();
      L = { g, set: (k) => { const t = c.currentTime; g.gain.setTargetAtTime(k > 0 ? 0.12 + k * 0.1 : 0, t, 0.05); f.frequency.setTargetAtTime(600 + k * 1800, t, 0.1); o.frequency.setTargetAtTime(80 + k * 200, t, 0.1); } };
    }
    this.loops[name] = L; return L;
  },
  silenceLoops() { const L = this.loops; if (L.engine) L.engine.set(0, 0, 0); if (L.siren) L.siren.set(false, 0); if (L.screech) L.screech.set(0); if (L.zip) L.zip.set(0); }
};


/* =====================================================================
   AMBIENCE — the weather and the city around the robot: rain that follows the showers (single drops,
   a soft wash, the roar of a downpour, drips once it stops), far traffic, wind, the sea along the quays,
   and what each district sounds like (a club thumping behind a wall, crickets, dogs, machines, ships, trains)
   ===================================================================== */
const AMB_DEF = { traffic: 1, club: 0, crickets: 0, dogs: 0.4, hum: 0, ship: 0, train: 0, rigging: 0 };
const AMB_PROF = {
  'Boulevard des Néons': { traffic: 1.1, club: 1 }, 'Quartier des Lanternes': { traffic: 0.9, club: 0.7, dogs: 0.2 }, 'Marché de nuit': { traffic: 0.9, club: 0.4 },
  'Parc municipal': { traffic: 0.55, crickets: 1, dogs: 0.5 }, 'Cimetière de l’Ouest': { traffic: 0.45, crickets: 0.9 }, 'Les Glycines': { traffic: 0.7, crickets: 0.5, dogs: 1 },
  'Cité des Tilleuls': { traffic: 0.8, dogs: 1.2 }, 'Hauts de Saline': { traffic: 0.8, dogs: 0.8, crickets: 0.3 }, 'Université': { traffic: 0.8, crickets: 0.4 }, 'Hôpital Saint-Roch': { traffic: 1 },
  'Zone industrielle': { traffic: 0.8, hum: 1 }, 'Dépôt pétrolier': { traffic: 0.6, hum: 0.8 }, 'Centrale électrique': { traffic: 0.6, hum: 1.4 }, 'Les Entrepôts': { traffic: 0.8, hum: 0.5, ship: 0.3 },
  'Faubourg des Forges': { traffic: 0.8, hum: 0.6, dogs: 0.6 }, 'Marché aux puces': { traffic: 0.8, dogs: 0.7 },
  'Gare de triage': { traffic: 0.6, train: 1, hum: 0.4 }, 'Gare centrale': { traffic: 1.2, train: 0.6 },
  'Les Docks': { traffic: 0.7, ship: 1 }, 'La Criée': { traffic: 0.7, ship: 0.8 }, 'Port de plaisance': { traffic: 0.6, ship: 0.5, rigging: 1 }, 'Chantier naval': { traffic: 0.6, ship: 0.7, hum: 0.5 },
  'Gare maritime': { traffic: 0.8, ship: 1 }, 'Plage des Sables': { traffic: 0.5, ship: 0.3 },
  'Centre': { traffic: 1.3 }, 'Cité financière': { traffic: 1.2 }, 'Hôtel de ville': { traffic: 1.1 }, 'Place de la Marée': { traffic: 1.1 }, 'Les Arcades': { traffic: 1.1 }, 'Commissariat central': { traffic: 1 }
};
const Amb = {
  on: false, b: null, prof: Object.assign({}, AMB_DEF), next: {}, acc: 0, gust: 0.5, trW: 1, crk: null, clubN: 0, clubStep: 0,
  init() {
    const c = Snd.ctx;
    const loopSrc = buf => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 1.8); return s; };
    const F = (type, f, q = 0.7) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const Gn = v => { const g = c.createGain(); g.gain.value = v; return g; };
    const link = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    this.bus = Gn(1); this.bus.connect(Snd.amb);                                   // sits under the music
    this.far = F('lowpass', 1500, 0.5); this.far.connect(this.bus);               // distant events
    this.clubBus = link(F('lowpass', 190, 0.8), F('highpass', 38, 0.7), Gn(1)); this.clubBus.connect(this.bus); // a club behind a wall
    const b = this.b = {};
    // rain: a soft wash (no bright hiss) and the low roar of a downpour
    b.washLP = F('lowpass', 2200, 0.4); b.wash = link(loopSrc(Snd.noiseBuf), b.washLP, F('highpass', 380, 0.5), Gn(0)); b.wash.connect(this.bus);
    b.roar = link(loopSrc(Snd.brownBuf), F('lowpass', 320, 0.6), Gn(0)); b.roar.connect(this.bus);
    // the city far away, and the wind
    b.traffic = link(loopSrc(Snd.brownBuf), F('lowpass', 165, 0.7), F('highpass', 38, 0.7), Gn(0)); b.traffic.connect(this.bus);
    b.windF = F('bandpass', 420, 0.9); b.wind = link(loopSrc(Snd.noiseBuf), b.windF, Gn(0)); b.wind.connect(this.bus);
    // waves against the quays
    b.seaF = F('lowpass', 500, 0.6); b.sea = link(loopSrc(Snd.brownBuf), b.seaF, Gn(0)); b.sea.connect(this.bus);
    // machines humming in the industrial districts
    b.hum = Gn(0); const hf = F('lowpass', 240, 1); const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50; const o2 = c.createOscillator(); o2.frequency.value = 100.4;
    o1.connect(hf); o2.connect(hf); hf.connect(b.hum); b.hum.connect(this.bus); o1.start(); o2.start();
    this.on = true;
  },
  // a gain node for a one-shot: panned, far ones muffled and sent to the reverb
  outNode(pan, vol, far = true) {
    const c = Snd.ctx, g = c.createGain(); g.gain.value = vol;
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(far ? this.far : this.bus); } else g.connect(far ? this.far : this.bus);
    if (far) { const r = c.createGain(); r.gain.value = 0.5; g.connect(r); r.connect(Snd.revIn); }
    return g;
  },
  update(dt, paused) {
    if (!this.on || !Snd.ok) return;
    const c = Snd.ctx; if (c.state !== 'running') return;
    const t = c.currentTime, L = Snd.listener, E = Env, b = this.b;
    const rain = Math.min(1.3, E.rainK || 0), wet = E.wet || 0, wind = E.wind || 0;
    // what the district sounds like (blended while walking from one to the next)
    const area = World.districtAt ? World.districtAt(L.x, L.z) : null, want = AMB_PROF[area] || AMB_DEF;
    for (const k in this.prof) this.prof[k] = damp(this.prof[k], want[k] !== undefined ? want[k] : AMB_DEF[k], 0.6, dt);
    const P = this.prof, set = (g, v, tau) => g.gain.setTargetAtTime(v, t, tau);
    set(this.bus, (1 - 0.32 * Music.level) * (paused ? 0.45 : 1), 0.6);
    // rain
    set(b.wash, 0.085 * Math.pow(rain, 0.85), 1.4); b.washLP.frequency.setTargetAtTime(1500 + rain * 1500, t, 1.5);
    set(b.roar, 0.08 * smoothstep(0.55, 1.25, rain), 1.6);
    // the city, the wind
    this.trW = clamp(this.trW + (Math.random() - 0.5) * dt * 0.5, 0.7, 1.25);
    set(b.traffic, 0.05 * P.traffic * this.trW * (1 - 0.35 * Math.min(1, rain)), 1.5);
    this.gust = clamp(this.gust + (Math.random() - 0.5) * dt * 1.4, 0, 1);
    set(b.wind, 0.003 + 0.028 * wind * (0.35 + 0.65 * this.gust), 0.8); b.windF.frequency.setTargetAtTime(240 + 420 * this.gust + 220 * wind, t, 1.2);
    // the sea, near the quays: slow waves
    const near = clamp(1 - (WATER_Z - L.z - 4) / 50, 0, 1) * (L.y < 20 ? 1 : 0.35), T = E.time;
    const wave = 0.55 + 0.3 * Math.sin(T * 0.55) * Math.sin(T * 0.21 + 1.3) + 0.15 * Math.sin(T * 1.3);
    set(b.sea, 0.07 * near * wave, 0.4); b.seaF.frequency.setTargetAtTime(260 + 380 * wave, t, 0.5);
    set(b.hum, 0.011 * P.hum, 1.5);
    if (paused) return;
    // single raindrops ticking around, and drips from the gutters once the rain eases on wet streets
    const drops = rain > 0.02 ? 30 * rain : 0, drips = wet > 0.25 && rain < 0.45 ? 2.2 * wet * (1 - rain * 2) : 0;
    this.acc += dt * drops; while (this.acc >= 1) { this.acc -= 1; this.drop(t + Math.random() * 0.06); }
    if (drips > 0 && Math.random() < dt * drips) this.drip(t);
    this.events(T, t, rain);
    this.crickets(t, P.crickets * (rain < 0.06 && wind < 0.7 ? 1 : 0));
    this.club(t, P.club * (1 - 0.3 * Math.min(1, rain)));
  },
  // far sounds now and then
  events(T, t, rain) {
    const N = this.next, P = this.prof;
    const due = (k, a, b) => { if (N[k] === undefined) N[k] = T + R(a * 0.25, b); if (T < N[k]) return false; N[k] = T + R(a, b); return true; };
    if (due('siren', 55, 150)) this.siren(t);
    if (due('horn', 22, 70) && P.traffic > 0.55) this.horn(t);
    if (due('dog', 30, 100) && rain < 0.5 && Math.random() < P.dogs) this.dog(t);
    if (due('ship', 55, 140) && P.ship > 0.25) this.ship(t, P.ship);
    if (due('train', 80, 190) && P.train > 0.25) this.train(t);
    if (due('heli', 180, 380)) this.heli(t);
    if (due('rig', 1.5, 5) && P.rigging > 0.3 && rain < 0.8) this.clink(t);
  },
  noiseBurst(t, dur, type, f, q, vol, dest) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.004, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 1.8); s.stop(t + dur + 0.02);
  },
  osc(t, type, f0, f1, dur, vol, dest, atk = 0.005, rel = 0) {
    const c = Snd.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    if (rel) { g.gain.setValueAtTime(vol, t + dur - rel); g.gain.linearRampToValueAtTime(0.0001, t + dur); } else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  drop(t) { this.noiseBurst(t, R(0.004, 0.012), 'bandpass', R(2400, 7000), 1.6, R(0.009, 0.03), this.outNode(R(-1, 1), 1, false)); },
  drip(t) { const d = this.outNode(R(-0.9, 0.9), R(0.015, 0.03), false), f = R(1300, 2600); this.osc(t, 'sine', f, f * 0.55, 0.06, 1, d); this.noiseBurst(t, 0.012, 'bandpass', f * 1.6, 3, 0.25, d); },
  siren(t) {
    const c = Snd.ctx, dur = R(6, 10), d = this.outNode(R(-0.9, 0.9), 0.03), o = c.createOscillator(); o.type = 'triangle';
    const hi = R(1000, 1250), lo = hi * 0.56; let tt = t; o.frequency.setValueAtTime(lo, t);
    while (tt < t + dur) { o.frequency.linearRampToValueAtTime(hi, tt + 1.1); o.frequency.linearRampToValueAtTime(lo, tt + 2.3); tt += 2.3; }
    o.detune.setValueAtTime(R(20, 50), t); o.detune.linearRampToValueAtTime(-R(40, 80), t + dur); // passing by: the pitch drops
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 2.2); g.gain.setValueAtTime(1, t + dur - 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.1);
  },
  horn(t) { const d = this.outNode(R(-0.9, 0.9), 0.022), k = R(0.9, 1.15), n = chance(0.4) ? 2 : 1; for (let i = 0; i < n; i++) { const tt = t + i * 0.28; this.osc(tt, 'square', 349 * k, 349 * k, 0.22 + (n === 1 ? 0.25 : 0), 1, d, 0.01, 0.05); this.osc(tt, 'square', 440 * k, 440 * k, 0.22 + (n === 1 ? 0.25 : 0), 0.8, d, 0.01, 0.05); } },
  dog(t) { const d = this.outNode(R(-0.9, 0.9), 0.05), n = 2 + Math.floor(Math.random() * 3), p = R(0.85, 1.2); for (let i = 0; i < n; i++) { const tt = t + i * R(0.32, 0.5); this.noiseBurst(tt, 0.08, 'bandpass', 850 * p, 3, 0.6, d); this.osc(tt, 'sawtooth', 470 * p, 300 * p, 0.1, 0.35, d); } },
  ship(t, k) { const d = this.outNode(R(-0.7, 0.7), 0.07 * Math.min(1, k)), dur = R(2.6, 3.8); this.osc(t, 'sawtooth', 65, 64, dur, 1, d, 0.35, 1.1); this.osc(t, 'sawtooth', 97.5, 96.5, dur, 0.7, d, 0.35, 1.1); },
  train(t) { const d = this.outNode(R(-0.8, 0.8), 0.045); this.noiseBurst(t, 9, 'lowpass', 170, 0.7, 0.9, d); this.osc(t + 3, 'square', 311, 311, 1.4, 0.35, d, 0.05, 0.3); this.osc(t + 3, 'square', 370, 370, 1.4, 0.3, d, 0.05, 0.3); },
  heli(t) {
    const c = Snd.ctx, dur = 12, s = c.createBufferSource(); s.buffer = Snd.brownBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 230; f.Q.value = 0.8;
    const am = c.createGain(); am.gain.value = 0.55; const lfo = c.createOscillator(); lfo.frequency.value = 16.5; const lg = c.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = c.createStereoPanner ? c.createStereoPanner() : null, dir = chance(0.5) ? 1 : -1;
    s.connect(f); f.connect(am); am.connect(g);
    const v = c.createGain(); v.gain.value = 0.09; g.connect(v);
    if (p) { p.pan.setValueAtTime(-0.9 * dir, t); p.pan.linearRampToValueAtTime(0.9 * dir, t + dur); v.connect(p); p.connect(this.far); } else v.connect(this.far);
    s.start(t, Math.random()); lfo.start(t); s.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  clink(t) { const d = this.outNode(R(-0.8, 0.8), 0.012, false), f = R(1900, 2700); this.osc(t, 'triangle', f, f * 0.99, 0.25, 1, d); this.osc(t, 'sine', f * 2.7, f * 2.7, 0.12, 0.3, d); },
  // two crickets, answering each other
  crickets(t, k) {
    if (k < 0.05) { this.crk = null; return; }
    if (!this.crk) this.crk = [{ n: t + R(0.2, 1), f: R(4300, 4500), pan: -0.55 }, { n: t + R(0.6, 1.6), f: R(4650, 4900), pan: 0.6 }];
    for (const cr of this.crk) {
      if (cr.n < t) cr.n = t + R(0.1, 0.5);
      while (cr.n < t + 0.25) { const np = chance(0.5) ? 3 : 4, d = this.outNode(cr.pan, 0.009 * k, false); for (let i = 0; i < np; i++) this.osc(cr.n + i * 0.045, 'sine', cr.f, cr.f, 0.028, 1, d, 0.004); cr.n += R(0.7, 1.5) * (chance(0.08) ? 3 : 1); }
    }
  },
  // music thumping behind a club door (124 bpm): kick on the beat, bass off the beat
  club(t, k) {
    if (k < 0.03) { this.clubN = 0; return; }
    const e = 60 / 124 / 2; if (!this.clubN || this.clubN < t) this.clubN = t + 0.05;
    while (this.clubN < t + 0.25) {
      const tt = this.clubN, s = this.clubStep++;
      if (s % 2 === 0) this.osc(tt, 'sine', 95, 42, 0.16, 0.16 * k, this.clubBus);
      else { const bar = Math.floor(s / 32) % 4, f = [55, 49, 43.65, 58.27][bar]; this.osc(tt, 'sawtooth', f, f, 0.17, 0.08 * k, this.clubBus, 0.005, 0.05); }
      this.clubN += e;
    }
  }
};

/* =====================================================================
   MUSIC — adaptive and generated. Patrolling: short quiet pieces now and then, with silence in between.
   Enemies on alert nearby: a pulse. A fight: the full track from the next beat, and when it is over an
   ending chord and a fade. Bosses get a heavier layer; the title screen has its own quiet theme;
   the pause menu muffles it; radio messages duck it.
   ===================================================================== */
const MSCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
const MPROG = {
  calm: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 6, 0, 0], [0, 6, 5, 6], [3, 4, 0, 5], [0, 2, 5, 6]],
  tension: [[0, 0, 5, 5], [0, 1, 0, 6], [0, 0, 3, 4], [0, 5, 0, 1]],
  action: [[0, 0, 5, 6], [0, 5, 3, 4], [0, 6, 5, 4], [5, 3, 0, 6], [0, 3, 6, 5], [0, 5, 6, 4]]
};
const MMIX = {
  silent: {}, calm: { pad: 0.5, arp: 0.32, bass: 0.35, lead: 0.42 }, menu: { pad: 0.55, arp: 0.3, bass: 0.3, lead: 0.35 },
  tension: { pad: 0.45, arp: 0.3, bass: 0.6, kick: 0.5, hat: 0.3, perc: 0.4 },
  action: { pad: 0.36, arp: 0.3, bass: 0.75, lead: 0.42, kick: 0.9, snare: 0.7, hat: 0.5, perc: 0.45 },
  boss: { pad: 0.36, arp: 0.3, bass: 0.8, lead: 0.46, kick: 1, snare: 0.8, hat: 0.58, perc: 0.5, dark: 0.6 },
  outro: { pad: 0.5, arp: 0.2, bass: 0.4, perc: 0.35 }, result: { pad: 0.5, arp: 0.3, bass: 0.3, lead: 0.36 }
};
const MBASS = {
  calm: [[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  tension: [[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]],
  action: [[1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 2, 1, 0, 1, 3, 0], [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 2, 0, 1, 3], [1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 3, 0, 2, 0], [1, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 3, 1, 0]]
};
const MKICK = [[0, 7, 8, 10], [0, 4, 8, 12], [0, 6, 8, 11, 14], [0, 3, 8, 10], [0, 8, 10]];
// lead rhythms over two bars: [start (16ths), length]
const MRHY = [[[0, 6], [8, 4], [12, 4], [16, 12]], [[0, 4], [4, 4], [8, 8], [16, 6], [24, 8]], [[0, 12], [12, 4], [16, 4], [20, 4], [24, 8]], [[2, 6], [8, 6], [14, 2], [16, 16]], [[0, 3], [3, 3], [6, 10], [16, 3], [19, 3], [22, 10]]];
const Music = {
  on: false, bpm: 100, nextT: 0, step: 0, target: 0, danger: 0, mode: 'silent', level: 0, pending: null,
  quietT: 10, holdT: 0, tenseT: 0, epBars: 0, secBar: 0, fadeT: 0, afterQuiet: 20, muteT: 0,
  root: 50, pA: null, pB: null, bassP: null, kickP: null, motif: null,
  init() {
    const c = Snd.ctx, G = v => { const g = c.createGain(); g.gain.value = v; return g; };
    this.out = G(0); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 16000; this.lp.Q.value = 0.5; this.duck = G(1);
    this.out.connect(this.lp); this.lp.connect(this.duck); this.duck.connect(Snd.mus);
    // a hall for the pads and the lead, a dotted-eighth echo for the plucks
    const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; x[i] = lp * Math.pow(1 - i / len, 2.6); } }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.verbIn = G(0.6); this.verbIn.connect(this.verb); this.verb.connect(this.out);
    this.dly = c.createDelay(1.5); this.dly.delayTime.value = 60 / this.bpm * 0.75; const fb = G(0.32), dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    this.dly.connect(dlp); dlp.connect(fb); fb.connect(this.dly); dlp.connect(this.out);
    const mk = (wet, echo) => { const g = G(0); g.connect(this.out); if (wet) { const s = G(wet); g.connect(s); s.connect(this.verbIn); } if (echo) { const e = G(echo); g.connect(e); e.connect(this.dly); } return g; };
    this.L = { pad: mk(0.55), arp: mk(0.2, 0.45), bass: mk(0), lead: mk(0.45, 0.35), kick: mk(0), snare: mk(0.15), hat: mk(0), perc: mk(0.3), dark: mk(0.4) };
    this.on = true; this.nextT = c.currentTime + 0.1; this.newKey();
  },
  newKey() { this.root = RP([50, 52, 53, 55, 57]); },
  note(d) { return this.root + MSCALE[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); },
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  // fade out, then stay quiet for a while
  fade(sec, quiet) { if (!this.on) return; const t = Snd.ctx.currentTime; this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(0, t, sec / 3.5); this.fadeT = sec; this.afterQuiet = quiet; this.pending = null; },
  stop(sec = 2.5) { this.fade(sec, 14); this.muteT = sec + 3; },
  update(dt) {
    if (!this.on || !Snd.ok || Snd.ctx.state !== 'running') return;
    const c = Snd.ctx, t = c.currentTime, G = Game;
    this.target = Math.max(0, this.target - dt * 0.12); if (this.muteT > 0) this.muteT -= dt;
    // what the moment wants: -1 title screen, -2 case solved, 0 calm, 1 enemies on alert, 2 fight, 3 boss
    let w = G.mode === 'menu' ? -1 : G.mode === 'result' ? -2 : this.muteT > 0 ? 0 : this.danger || 0;
    if (w >= 0 && this.muteT <= 0) { if (this.target > 0.85) w = Math.max(w, 2); else if (this.target > 0.55) w = Math.max(w, 1); }
    // pause menu: muffled and softer; radio messages: ducked
    const paused = G.mode === 'pause';
    this.lp.frequency.setTargetAtTime(paused ? 650 : 16000, t, 0.25);
    this.duck.gain.setTargetAtTime((paused ? 0.6 : 1) * (typeof HUD !== 'undefined' && HUD.radio && HUD.radio.cur ? 0.62 : 1), t, 0.3);
    if (this.fadeT > 0) { this.fadeT -= dt; if (this.fadeT <= 0) { this.mode = 'silent'; this.quietT = this.afterQuiet; for (const k in this.L) this.L[k].gain.setTargetAtTime(0, t, 0.3); } }
    const M = this.mode, fighting = M === 'action' || M === 'boss', fading = this.fadeT > 0;
    if (w === -1) { if (M !== 'menu' && this.pending !== 'menu') { if (M === 'silent' || fading) { this.fadeT = 0; this.enter('menu', t); } else this.pending = 'menu'; } }
    else if (w === -2) { if (M !== 'result' && this.pending !== 'result' && !(M === 'silent' && this.quietT > 0 && this.doneResult)) { this.doneResult = true; if (M === 'silent' || fading) { this.fadeT = 0; this.enter('result', t); } else this.pending = 'result'; } }
    else {
      this.doneResult = false;
      if (w >= 2) {
        this.holdT = 6.5; const want = w >= 3 ? 'boss' : 'action';
        if (M !== want && !(M === 'boss' && want === 'action') && this.pending !== want) { if (M === 'silent' || fading || M === 'menu') { this.fadeT = 0; this.enter(want, t); } else this.pending = want; }
      } else if (fighting) {
        this.holdT -= dt; if (this.holdT <= 0 && !this.pending) this.pending = w === 1 ? 'tension' : 'outro';
      } else if (w === 1) {
        this.tenseT = 8;
        if (M !== 'tension' && M !== 'outro' && this.pending !== 'tension') { if (M === 'silent' || fading) { this.fadeT = 0; this.enter('tension', t); } else this.pending = 'tension'; }
      } else if (M === 'tension') { this.tenseT -= dt; if (this.tenseT <= 0 && !fading) this.fade(5, R(15, 35)); }
      else if (M === 'menu' || M === 'result') { if (!fading) this.fade(3.5, R(8, 20)); }
      else if (M === 'silent') { this.quietT -= dt; if (this.quietT <= 0) this.enter('calm', t); }
    }
    this.level = damp(this.level, M === 'silent' || fading ? 0 : fighting ? 1 : 0.6, 1.2, dt);
    // 16th-note scheduler (100 bpm), a third of a second ahead so a slow frame never leaves a hole
    const spb = 60 / this.bpm / 4;
    if (this.nextT < t - 0.5) this.nextT = t + 0.05; // after a suspended context
    while (this.nextT < t + 0.35) { this.sched(this.nextT, this.step); this.nextT += spb; this.step++; }
  },
  enter(mode, t) {
    const prev = this.mode; this.pending = null; this.mode = mode; this.secBar = -1; this.entered = true;
    const O = this.out.gain; O.cancelScheduledValues(t);
    if (mode === 'action' || mode === 'boss') {
      if (prev !== 'action' && prev !== 'boss') { if (prev === 'silent' || prev === 'menu') this.newKey(); this.pA = RP(MPROG.action); this.pB = RP(MPROG.action.filter(p => p !== this.pA)); this.bassP = RP(MBASS.action); this.kickP = RP(MKICK); this.motif = this.mkMotif(); }
      O.setTargetAtTime(1, t, prev === 'silent' ? 0.05 : 0.12); this.crash(t, 0.9); this.boom(t);
    } else if (mode === 'tension') {
      if (prev === 'silent' || prev === 'menu') this.newKey();
      this.pA = RP(MPROG.tension); this.pB = this.pA; this.bassP = RP(MBASS.tension); O.setTargetAtTime(1, t, 0.9);
    } else if (mode === 'calm' || mode === 'menu') {
      this.newKey(); this.pA = RP(MPROG.calm); this.pB = RP(MPROG.calm); this.bassP = MBASS.calm[0]; this.motif = this.mkMotif();
      this.epBars = mode === 'menu' ? 0 : RP([16, 20, 24]); O.setTargetAtTime(1, t, 1.8);
    } else if (mode === 'outro') { this.epBars = 2; this.crash(t, 0.6); O.setTargetAtTime(1, t, 0.3); }
    else if (mode === 'result') { this.pA = [5, 6, 0, 0]; this.pB = this.pA; this.epBars = 4; this.motif = this.mkMotif(); O.setTargetAtTime(1, t, 0.4); }
    const X = MMIX[mode] || {}, tau = mode === 'action' || mode === 'boss' ? 0.04 : 0.7;
    for (const k in this.L) this.L[k].gain.setTargetAtTime(X[k] || 0, t, tau);
  },
  mkMotif() {
    const notes = []; let d = RP([0, 2, 4, 7]);
    for (const [st, len] of RP(MRHY)) { notes.push({ st, len, d }); d = clamp(d + RP([-2, -1, 1, 2, 2, -3, 1, 3]), -2, 9); }
    return notes;
  },
  sched(t, s) {
    const pos = s % 16, beat = pos % 4 === 0;
    // changes wait for the bar line (a fight or a solved case only for the next beat)
    if (this.pending && (pos === 0 || (beat && (this.pending === 'action' || this.pending === 'boss' || this.pending === 'result')))) this.enter(this.pending, t);
    const m = this.mode; if (m === 'silent') return;
    if (pos === 0 || this.secBar < 0) {
      this.secBar = this.secBar < 0 ? 0 : this.secBar + 1;
      if (this.epBars > 0 && this.secBar > 0 && --this.epBars === 0) {
        if (m === 'calm') this.fade(7, R(25, 60));
        else if (m === 'outro') this.fade(4.5, R(15, 35));
        else if (m === 'result') this.fade(6, 30);
      }
    }
    const fast = m === 'action' || m === 'boss' || m === 'tension', chordLen = fast ? 1 : 2, e16 = 60 / this.bpm / 4;
    const sb = Math.max(0, this.secBar), prog = (Math.floor(sb / 8) % 2) ? this.pB : this.pA;
    let deg = prog[Math.floor(sb / chordLen) % 4]; if (m === 'outro' || (m === 'result' && sb >= 3)) deg = 0;
    const chord = [this.note(deg), this.note(deg + 2), this.note(deg + 4)].map(n => n > this.root + 13 ? n - 12 : n);
    const L = this.L, first = this.entered; this.entered = false;
    // pads: a chord per harmonic step (and straight away when a new part starts off the bar line)
    if ((pos === 0 && sb % chordLen === 0) || first) {
      const dur = e16 * 16 * chordLen, atk = fast ? 0.2 : 1.1;
      for (const n of chord) this.pad(t, n, dur + (m === 'outro' ? e16 * 16 : 0), atk);
      if (!fast && m !== 'outro') this.pad(t, this.note(deg + 6) > this.root + 13 ? this.note(deg + 6) - 12 : this.note(deg + 6), dur, atk, 0.6); // a 7th on the calm pieces
      if (m === 'boss') this.dark(t, this.note(deg) - 12, e16 * 16);
    }
    // bass
    const bp = m === 'outro' || m === 'result' ? (pos === 0 ? 1 : 0) : (this.bassP || MBASS.calm[0])[pos];
    if (bp) {
      const n = bp === 2 ? this.note(deg) : bp === 3 ? this.note(deg + 4) - 12 : this.note(deg) - 12;
      const len = fast ? e16 * (m === 'tension' ? 1.6 : 1.8) : e16 * 16 * chordLen * 0.9;
      if (!fast && sb % chordLen !== 0 && pos === 0 && !first) { /* calm: one long note per chord */ } else this.bass(t, n - 12, len, fast);
    }
    // plucked arpeggio
    const arpOn = m === 'action' || m === 'boss' ? pos % 2 === 0 : m === 'tension' ? pos % 2 === 0 : pos % 4 === 0;
    if (arpOn && m !== 'outro') {
      const i = (fast ? pos / 2 : pos / 4 + sb * 4) % 4, seq = [0, 1, 2, 1];
      this.arp(t, chord[seq[i | 0]] + (fast ? 24 : 12) + (m === 'tension' ? -12 : 0), fast ? 0.18 : 0.5, m === 'tension' ? 900 : fast ? 1800 : 1400);
    }
    // lead: the motif on bars 4-5 of each 8-bar stretch (the calm pieces every other time)
    const ph = sb % 8;
    if (this.motif && (m === 'calm' || m === 'menu' || m === 'action' || m === 'boss' || m === 'result') && (ph === 4 || ph === 5 || m === 'result') && (m !== 'calm' || Math.floor(sb / 8) % 2 === 1)) {
      const at = ((m === 'result' ? sb % 2 : ph - 4)) * 16 + pos;
      for (const n of this.motif) if (n.st === at) this.lead(t, this.note(prog[Math.floor(sb / chordLen) % 4] + n.d) + 12, n.len * e16 * 0.95);
    }
    // drums
    if (m === 'action' || m === 'boss') {
      const fill = sb % 4 === 3 && pos >= 12;
      if (this.kickP.includes(pos) || (m === 'boss' && pos % 4 === 0)) this.kick(t, pos === 0 ? 1 : 0.8);
      if ((pos === 4 || pos === 12) && !fill) this.snare(t, 1);
      if (fill) { this.snare(t, 0.45 + (pos - 12) * 0.15); if (pos === 12 || pos === 14) this.tom(t, pos === 12 ? 110 : 82, 0.8); }
      if (m === 'boss' ? true : pos % 2 === 0) this.hat(t, pos % 4 === 2 ? 0.9 : 0.55, pos === 14 && !fill);
      else this.hat(t, 0.25, false);
      if (pos === 0 && sb > 0 && sb % 8 === 0) this.crash(t, 0.7);
    } else if (m === 'tension') {
      if (pos === 0 || pos === 3 || pos === 8 || pos === 11) this.kick(t, pos % 8 === 0 ? 0.7 : 0.45); // a heartbeat
      this.hat(t, pos % 2 === 0 ? 0.4 : 0.18, false);
      if (pos === 12 && sb % 2 === 1) this.tom(t, 70, 0.6);
    }
  },
  // ---- instruments
  env(g, t, atk, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.setValueAtTime(peak, t + Math.max(atk, dur - rel)); g.gain.linearRampToValueAtTime(0.0001, t + dur + rel); },
  pad(t, m, dur, atk, k = 1) {
    const c = Snd.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1150, t + dur * 0.5); f.frequency.linearRampToValueAtTime(800, t + dur); f.Q.value = 0.6;
    // legato: each chord holds to its end and fades over the next one's attack (no gap between chords)
    const rel = atk > 0.5 ? 1.7 : 0.5, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022 * k, t + atk); g.gain.setValueAtTime(0.022 * k, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    f.connect(g); g.connect(this.L.pad);
    for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(m); o.detune.value = det + R(-2, 2); o.connect(f); o.start(t); o.stop(t + dur + rel + 0.1); }
  },
  bass(t, m, len, fast) {
    const c = Snd.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = fast ? 5 : 1;
    f.frequency.setValueAtTime(fast ? 1300 : 520, t); f.frequency.exponentialRampToValueAtTime(fast ? 230 : 380, t + Math.min(len, 0.25));
    const g = c.createGain(); this.env(g, t, 0.006, 0.15, len, fast ? 0.04 : 0.5); f.connect(g); g.connect(this.L.bass);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(m); o.connect(f);
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = this.hz(m); const sg = c.createGain(); sg.gain.value = 0.9; sub.connect(sg); sg.connect(g);
    o.start(t); sub.start(t); o.stop(t + len + 0.6); sub.stop(t + len + 0.6);
  },
  arp(t, m, dec, cut) {
    const c = Snd.ctx, o = c.createOscillator(); o.type = 'square'; o.frequency.value = this.hz(m);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(f); f.connect(g); g.connect(this.L.arp); o.start(t); o.stop(t + dec + 0.05);
  },
  lead(t, m, len) {
    const c = Snd.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2300; f.Q.value = 0.8;
    const g = c.createGain(); this.env(g, t, 0.04, 0.045, len, 0.3); f.connect(g); g.connect(this.L.lead);
    const vib = c.createOscillator(); vib.frequency.value = 5.3; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(11, t + Math.min(0.35, len)); vib.connect(vg);
    for (const [type, det, k] of [['sawtooth', -5, 0.7], ['triangle', 4, 1]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = this.hz(m); o.detune.value = det; vg.connect(o.detune); const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(f); o.start(t); o.stop(t + len + 0.4); }
    vib.start(t); vib.stop(t + len + 0.4);
  },
  dark(t, m, dur) {
    const c = Snd.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(180, t); f.frequency.linearRampToValueAtTime(420, t + dur * 0.6); f.Q.value = 3;
    const g = c.createGain(); this.env(g, t, 0.1, 0.05, dur, 0.2); f.connect(g); g.connect(this.L.dark);
    for (const det of [-12, 12]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.3); }
  },
  kick(t, v) { const c = Snd.ctx, o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12); const g = c.createGain(); g.gain.setValueAtTime(0.62 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36); o.connect(g); g.connect(this.L.kick); o.start(t); o.stop(t + 0.4); },
  snare(t, v) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.26 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17); s.connect(f); f.connect(g); g.connect(this.L.snare); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07); const og = c.createGain(); og.gain.setValueAtTime(0.18 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(og); og.connect(this.L.snare); o.start(t); o.stop(t + 0.1);
  },
  hat(t, v, open) { const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200; const g = c.createGain(); const d = open ? 0.22 : 0.035; g.gain.setValueAtTime(0.075 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(this.L.hat); s.start(t, Math.random()); s.stop(t + d + 0.02); },
  tom(t, f0, v) { const c = Snd.ctx, o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.28); const g = c.createGain(); g.gain.setValueAtTime(0.3 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(this.L.perc); o.start(t); o.stop(t + 0.35); },
  crash(t, v) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = Snd.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + 1.9);
  },
  boom(t) { const c = Snd.ctx, o = c.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.9); const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 1.3); }
};

