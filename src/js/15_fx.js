/* =====================================================================
   FX — particles, tracers, lasers, markers, pickups
   ===================================================================== */
const FX = {
  ps: [], tracers: [], lasers: [], marks: [], rings: [],
  add(p) { if (this.ps.length > 1600) this.ps.shift(); this.ps.push(p); return p; },
  P(x, y, z, o) { return this.add(Object.assign({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0.5, max: 0.5, size: 0.3, grow: 0, r: 1, g: 1, b: 1, a: 1, cell: 0, add: true, drag: 0, grav: 0, rot: 0, rv: 0, st: 1, flat: false }, o)); },
  hit(x, y, z, k) {
    this.P(x, y, z, { life: 0.12, max: 0.12, size: 0.9 * k, grow: 4, r: 1, g: 0.95, b: 0.85, a: 1, cell: 5, rot: R(0, 3) });
    for (let i = 0; i < 6 * k; i++) this.P(x, y, z, { vx: R(-4, 4), vy: R(-1, 4), vz: R(-4, 4), life: R(0.15, 0.3), size: 0.08, r: 1, g: 0.85, b: 0.6, cell: 0, drag: 3 });
  },
  spark(x, y, z, k, n, c) {
    this.P(x, y, z, { life: 0.08, size: 0.5 * k, r: c[0], g: c[1], b: c[2], cell: 5, rot: R(0, 3) });
    for (let i = 0; i < n; i++) this.P(x, y, z, { vx: R(-5, 5) * k, vy: R(-1, 6) * k, vz: R(-5, 5) * k, life: R(0.15, 0.45), size: 0.05, r: c[0] * 2, g: c[1] * 2, b: c[2] * 2, cell: 0, grav: 12, drag: 1 });
  },
  sparkTrail(x, y, z) { this.P(x, y, z, { vx: R(-1, 1), vy: R(-2, 0.5), vz: R(-1, 1), life: R(0.2, 0.4), size: 0.05, r: 2, g: 1.5, b: 0.7, grav: 10 }); },
  dust(x, y, z) { this.P(x, y, z, { vy: 0.4, life: 0.5, max: 0.5, size: 0.3, grow: 1.5, r: 0.5, g: 0.5, b: 0.55, a: 0.4, cell: 3, add: false }); },
  blood(x, y, z, dx, dz) { for (let i = 0; i < 6; i++) this.P(x, y, z, { vx: dx * R(1, 3) + R(-1, 1), vy: R(0, 2.5), vz: dz * R(1, 3) + R(-1, 1), life: R(0.25, 0.5), size: R(0.05, 0.1), r: 0.35, g: 0.02, b: 0.04, a: 0.9, cell: 0, add: false, grav: 12 }); },
  muzzle(x, y, z, yaw) { this.P(x, y, z, { life: 0.05, size: 0.55, r: 2.2, g: 1.6, b: 0.8, cell: 8, rot: R(0, 3) }); this.P(x, y, z, { vy: 0.5, life: 0.5, size: 0.25, grow: 1.2, r: 0.5, g: 0.5, b: 0.5, a: 0.35, cell: 3, add: false }); },
  tracer(ax, ay, az, bx, by, bz, c) { this.tracers.push({ ax, ay, az, bx, by, bz, life: 0.07, c }); },
  casing(x, y, z, yaw, n = 1) { // spent brass thrown out to the right of the gun
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), g = World.groundAt(x, z, 0.1, y);
    for (let i = 0; i < n; i++) this.P(x + rx * 0.1, y, z + rz * 0.1, { vx: rx * R(1.2, 2.4) + Math.sin(yaw) * R(-0.6, 0.3), vy: R(2.2, 3.4), vz: rz * R(1.2, 2.4) + Math.cos(yaw) * R(-0.6, 0.3), life: R(0.9, 1.4), max: 1.2, size: 0.045, r: 1.4, g: 1.0, b: 0.45, a: 0.9, cell: 0, grav: 13, floor: g + 0.02, rot: R(0, 3), rv: R(-12, 12) });
  },
  laser(from, bx, by, bz, t) { this.lasers.push({ ax: from.x, ay: from.y, az: from.z, bx, by, bz, k: clamp(1 - t, 0.25, 1) }); },
  splash(x, y, z) { for (let i = 0; i < 28; i++) this.P(x, y + 0.1, z, { vx: R(-3, 3), vy: R(3, 8), vz: R(-3, 3), life: R(0.5, 1), size: R(0.1, 0.25), r: 0.6, g: 0.7, b: 0.8, a: 0.7, cell: 0, add: false, grav: 14 }); this.P(x, y + 0.05, z, { life: 1.2, size: 1, grow: 5, r: 0.7, g: 0.8, b: 0.9, a: 0.6, cell: 6, flat: true }); },
  smoke(x, y, z, c, n) { for (let i = 0; i < n; i++) this.P(x + R(-0.4, 0.4), y + R(-0.5, 0.8), z + R(-0.4, 0.4), { vx: R(-1, 1), vy: R(0.3, 1.5), vz: R(-1, 1), life: R(0.8, 1.6), size: R(0.5, 1), grow: 1.5, r: c[0], g: c[1], b: c[2], a: 0.8, cell: 3, drag: 1 }); },
  tireSmoke(x, y, z) { this.P(x + R(-0.5, 0.5), y + 0.3, z + R(-0.5, 0.5), { vy: 0.5, life: 1.2, size: 0.6, grow: 1.8, r: 0.55, g: 0.55, b: 0.6, a: 0.35, cell: 3, add: false, drag: 1 }); },
  carSmoke(x, y, z, fire) { this.P(x, y, z, { vx: R(-0.3, 0.3), vy: R(1, 2), vz: R(-0.3, 0.3), life: 1.6, size: 0.4, grow: 1.6, r: 0.1, g: 0.1, b: 0.11, a: 0.55, cell: 3, add: false }); if (fire) this.P(x, y, z, { vy: 1.5, life: 0.4, size: 0.5, grow: 0.5, r: 2, g: 0.8, b: 0.2, cell: 0 }); },
  shockwave(x, y, z, r) { this.P(x, y + 0.05, z, { life: 0.5, max: 0.5, size: 0.5, grow: r * 4.5, r: 0.3, g: 1.2, b: 0.9, a: 1, cell: 1, flat: true }); this.smoke(x, y + 0.3, z, [0.1, 0.5, 0.4], 10); },
  ring(x, y, z, r, c, dur) { this.rings.push({ x, y, z, r, c, life: dur, max: dur }); },
  telegraph(a, t) { this.marks.push({ a, life: Math.max(0.35, t + 0.1), cell: 9, c: [2, 0.25, 0.25], dy: 0.5 }); },
  exclaim(a) { this.marks.push({ a, life: 1.1, cell: 9, c: [2, 1.4, 0.3], dy: 0.55 }); },
  // steam rising from the manholes near the camera
  vents(dt) {
    const V = World.vents; if (!V || !V.length) return;
    this._ventT = (this._ventT || 0) - dt; if (this._ventT > 0) return; this._ventT = 0.1;
    const C = Cam.pos;
    for (const v of V) {
      const dx = v.x - C.x, dz = v.z - C.z; if (dx * dx + dz * dz > 85 * 85) continue;
      const life = R(2.2, 3.4);
      this.P(v.x + R(-0.25, 0.25), 0.15, v.z + R(-0.25, 0.25), { vx: R(-0.15, 0.15) + 0.35, vy: R(1.1, 2), vz: R(-0.15, 0.15) + 0.2, life, max: life, size: R(0.45, 0.7), grow: 1.15, r: 0.4, g: 0.39, b: 0.4, a: 0.2, cell: 3, add: false, drag: 0.5, rot: R(0, 6), rv: R(-0.3, 0.3) });
    }
  },
  update(dt) {
    this.vents(dt);
    const L = this.ps; let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.life -= dt; if (p.life <= 0) continue;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt; p.rot += p.rv * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; if (p.vy < -0.8) { p.vy = -p.vy * 0.3; p.vx *= 0.5; p.vz *= 0.5; p.rv *= 0.4; if (p.life > 0.3 && Math.random() < 0.6) Snd.play('casing', p, 0.25); } else { p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; p.rv = 0; } }
      L[w++] = p;
    }
    L.length = w;
    for (const t of this.tracers) t.life -= dt; this.tracers = this.tracers.filter(t => t.life > 0);
    for (const m of this.marks) m.life -= dt; this.marks = this.marks.filter(m => m.life > 0 && m.a.alive !== false);
    for (const r of this.rings) r.life -= dt; this.rings = this.rings.filter(r => r.life > 0);
  },
  render() {
    const A = Render.addParticles, N = Render.particles, B = Render.beams;
    for (const p of this.ps) {
      const f = clamp(p.life / (p.max || p.life + 1e-3), 0, 1); const a = p.a * (p.max ? f : 1);
      (p.add ? A : N).push(p.x, p.y, p.z, p.size, p.r, p.g, p.b, p.add ? a : a, p.rot, p.st, p.cell, p.flat);
    }
    for (const t of this.tracers) { const k = t.life / 0.07; B.push(t.ax, t.ay, t.az, t.bx, t.by, t.bz, 0.035, t.c[0] * 3, t.c[1] * 3, t.c[2] * 3, k, Cam.pos); }
    for (const l of this.lasers) { B.push(l.ax, l.ay, l.az, l.bx, l.by, l.bz, 0.018, 3, 0.1, 0.15, 0.9 * l.k, Cam.pos); A.push(l.bx, l.by, l.bz, 0.25, 3, 0.2, 0.2, 0.9, 0, 1, 0, false); }
    this.lasers.length = 0;
    for (const m of this.marks) { const a = m.a; if (!a.headPos) continue; const pulse = 0.8 + Math.sin(Env.time * 20) * 0.2; A.push(a.headPos.x, a.headPos.y + m.dy, a.headPos.z, 0.42 * pulse, m.c[0], m.c[1], m.c[2], 1, 0, 1, m.cell, false); }
    for (const r of this.rings) { const k = 1 - r.life / r.max; A.push(r.x, r.y, r.z, r.r * 2 * (0.9 + 0.1 * Math.sin(Env.time * 18)), r.c[0] * 2, r.c[1] * 2, r.c[2] * 2, 0.4 + k * 0.6, 0, 1, 1, true); }
    // rain splashes around camera
    if (Render.rainCount > 0 && Env.rainK > 0.05) {
      for (let i = 0, n = Math.round(6 * Env.rainK); i < n; i++) {
        const x = Cam.pos.x + R(-14, 14), z = Cam.pos.z + R(-14, 14); const g = World.groundAt(x, z, 0.1, Cam.pos.y + 2); if (g < -5) continue;
        this.P(x, g + 0.03, z, { life: 0.25, max: 0.25, size: 0.05, grow: 0.9, r: 0.5, g: 0.55, b: 0.65, a: 0.5, cell: 6, flat: true });
      }
    }
  }
};

/* ---------------- pickups ---------------- */
const Pickups = {
  list: [],
  add(type, x, y, z, o = {}) { const p = Object.assign({ type, pos: new V3(x, y, z), t: R(0, 6), alive: true }, o); this.list.push(p); if (MP.host && !o.net) MP.onPickAdd(p); return p; },
  clear() { this.list = []; },
  update(dt) {
    const P = Game.player; if (!P || P.state === 'car' || !P.alive) return;
    for (const p of this.list) {
      if (!p.alive) continue; p.t += dt;
      const d = Math.hypot(P.pos.x - p.pos.x, (P.pos.y + 0.8) - (p.pos.y + 0.4), P.pos.z - p.pos.z);
      if (d < 1.35) {
        // multiplayer guest: the host's pickup is asked for (another robot may have been quicker)
        if (p.net) { if (MP.wantsPick(p, P) && !(p.askT > (Game.simT || 0) - 1)) { p.askT = Game.simT || 0; MP.send({ t: 'pick', id: p.nid }); } }
        else this.collect(p, P);
      }
    }
    this.list = this.list.filter(p => { if (p.alive) return true; if (p.nid && MP.host) MP.onPickGone(p); return false; });
  },
  collect(p, P) {
    const t = p.type;
    if (t === 'health') { if (P.hp >= P.maxHp) return; const v = Math.min(p.heal || 45, P.maxHp - P.hp); P.hp += v; HUD.toast('Cellule de réparation', '+' + Math.round(v) + ' PV', 'gold', true); HUD.pop(P.pos.x, P.pos.y + 2.1, P.pos.z, '+' + Math.round(v) + ' PV', 'heal'); Snd.play('repair', P.pos); FX.ring(P.pos.x, P.pos.y + 0.05, P.pos.z, 1.1, [0.35, 1, 0.55], 0.5); }
    else if (t === 'ammo') { const w = P.isFirearm() ? P.cur : (P.inv.pistol ? 'pistol' : null); if (!w) return; const W = WEAPONS[w]; P.inv[w].res += Math.round(W.mag * 1.5); HUD.toast('Munitions', WEAPONS[w].name, 'gold', true); Snd.play('pickup', P.pos); }
    else if (t === 'weapon') { P.giveWeapon(p.weapon, p.ammo || (WEAPONS[p.weapon].mag ? WEAPONS[p.weapon].mag * 2 : 0)); HUD.toast(WEAPONS[p.weapon].name, 'Arme récupérée', 'gold', true); Snd.play('pickup', P.pos); }
    else if (t === 'nades') { if (P.nades >= 8) return; const n = Math.min(8 - P.nades, p.count || 2); P.nades += n; HUD.nadesChanged(); HUD.toast('Grenades', '+' + n, 'gold', true); Snd.play('pickup', P.pos); }
    else if (t === 'badge') { Game.collectBadge(p); }
    else if (t === 'item') { if (p.onCollect && p.onCollect(p) === false) return; Snd.play('pickup', P.pos); }
    p.alive = false;
  },
  // centre of a part's bounding box (weapons spin about it)
  _c: {},
  centre(geo) {
    if (this._c[geo]) return this._c[geo];
    const P = PartGeo[geo].pos, b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], P[i + k]); b[k + 3] = Math.max(b[k + 3], P[i + k]); }
    return (this._c[geo] = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]);
  },
  render() {
    const I = CharRender.inst; const m = M4.create(), tmp = M4.create();
    for (const p of this.list) {
      if (!p.alive) continue; const d = dist3(p.pos, Cam.pos); if (d > 80) continue;
      const bob = Math.sin(p.t * 2.5) * 0.08; const spin = p.t * 1.6;
      let geo = null, col = [1, 1, 1], e = 0.4, scale = 1, glow = [1, 0.75, 0.3];
      switch (p.type) {
        case 'health': geo = 'medkit'; col = [0.9, 0.9, 0.9]; glow = [0.4, 1, 0.5]; break;
        case 'ammo': geo = 'ammo'; col = [0.3, 0.35, 0.2]; glow = [1, 0.8, 0.3]; break;
        case 'weapon': geo = WEAPONS[p.weapon] && WEAPONS[p.weapon].part; col = [1, 1, 1]; e = 0.25; glow = [1, 0.7, 0.3]; scale = 1.3; break;
        case 'nades': geo = 'nade'; col = [1, 1, 1]; e = 0.2; glow = [1, 0.45, 0.3]; scale = 2; break;
        case 'badge': geo = 'badgeItem'; col = [1, 0.75, 0.25]; e = 2.2; glow = [1, 0.8, 0.3]; break;
        case 'item': geo = p.geo || 'crate'; col = p.col || [0.4, 0.3, 0.2]; e = p.e || 0.3; glow = p.glow || [0.4, 0.9, 1]; scale = p.scale || 1; break;
      }
      if (!geo || !I[geo]) continue;
      const lift = p.type === 'item' ? 0 : 0.55 + bob;
      // weapons turn on themselves, upright (hand weapons are modelled in the hand frame: its +z is the gun's up)
      const hand = p.type === 'weapon' && Arms.INFO[geo] && Arms.INFO[geo].hand, rx = hand ? -Math.PI / 2 : 0;
      M4.compose(m, p.pos.x, p.pos.y + lift, p.pos.z, rx, p.type === 'item' ? 0 : spin, 0, scale, scale, scale);
      if (p.type === 'weapon') { const c = this.centre(geo); M4.compose(tmp, -c[0], -c[1], -c[2], 0, 0, 0); } else M4.identity(tmp);
      I[geo].pushMul(m, tmp, col[0], col[1], col[2], e);
      Render.addParticles.push(p.pos.x, p.pos.y + 0.04, p.pos.z, 1.3 + Math.sin(p.t * 3) * 0.1, glow[0], glow[1], glow[2], 0.7, 0, 1, 1, true);
      if (p.type === 'badge' || p.beam) Render.beams.push(p.pos.x, p.pos.y, p.pos.z, p.pos.x, p.pos.y + 6, p.pos.z, 0.25, glow[0], glow[1], glow[2], 0.35, Cam.pos);
    }
  }
};

