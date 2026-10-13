/* =====================================================================
   GRENADES — thrown grenades (bounce, roll, fuse), explosions (blast
   damage behind cover, knock-down, burning cars, fire / smoke / scorch),
   the throwing arc shown while aiming, and the enemy-grenade warning.
   ===================================================================== */
const Nades = {
  list: [], G: 16, R: 6.5, RAD: 0.05, enemyCd: 0, nid: 0, _m: null, _t: null, _o: null,
  clear() { this.list = []; this.enemyCd = 0; },
  spawn(x, y, z, vx, vy, vz, owner, fuse = NADE_FUSE) {
    // multiplayer guest: our grenade is thrown at the host (which shows it to everyone, ourselves included)
    if (MP.guest && MP.state === 'play' && owner === Game.player && MP.capOff === 0) { MP.send({ t: 'nade', x: MP.r2(x), y: MP.r2(y), z: MP.r2(z), vx: MP.r2(vx), vy: MP.r2(vy), vz: MP.r2(vz), f: MP.r2(fuse) }); return null; }
    const n = { id: ++this.nid, x, y, z, vx, vy, vz, owner, fuse, rest: false, rot: R(0, TAU), rv: R(-12, 12), ax: R(0, TAU), bounces: 0, warnT: 0 };
    this.list.push(n); if (MP.host) MP.onNade(n); return n;
  },
  // one physics step of a grenade (also used for the aiming preview); returns a surface hit (with normal) or null
  step(n, dt) {
    n.vy -= this.G * dt;
    const sp = Math.hypot(n.vx, n.vy, n.vz), d = sp * dt; if (d < 1e-6) return null;
    const dx = n.vx / sp, dy = n.vy / sp, dz = n.vz / sp;
    let hit = World.raycast(n.x, n.y, n.z, dx, dy, dz, d + this.RAD), t = hit ? hit.t : 1e9, nx = 0, ny = 0, nz = 0;
    if (hit) { nx = hit.nx; ny = hit.ny; nz = hit.nz; }
    for (const c of Cars.list) { // cars: bounce off the body
      if (c.sinking || Math.abs(c.pos.x - n.x) > 4 || Math.abs(c.pos.z - n.z) > 4) continue;
      const tc = Cars.rayHit(c, n.x, n.y, n.z, dx, dy, dz, d + this.RAD);
      if (tc !== null && tc < t) { t = tc; hit = { car: c }; const N = Cars.hitNormal(c, n.x + dx * tc, n.y + dy * tc, n.z + dz * tc); nx = N[0]; ny = N[1]; nz = N[2]; }
    }
    if (!hit || t > d + this.RAD) { n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt; return null; }
    const m = Math.max(0, t - this.RAD); n.x += dx * m; n.y += dy * m; n.z += dz * m;
    const vn = n.vx * nx + n.vy * ny + n.vz * nz;
    if (vn < 0) {
      const e = ny > 0.6 ? 0.32 : 0.45; // floors soak up more than walls
      n.vx -= (1 + e) * vn * nx; n.vy -= (1 + e) * vn * ny; n.vz -= (1 + e) * vn * nz;
      const f = ny > 0.6 ? 0.72 : 0.85; n.vx *= f; n.vz *= f; if (ny <= 0.6) n.vy *= f;
    }
    return { nx, ny, nz, vn: -vn, car: hit.car };
  },
  update(dt) {
    if (this.enemyCd > 0) this.enemyCd -= dt;
    const P = Game.player;
    for (const n of this.list) {
      if (n.dead) continue;
      n.fuse -= dt;
      if (!n.rest) {
        const steps = Math.max(1, Math.ceil(Math.hypot(n.vx, n.vy, n.vz) * dt / 0.12));
        for (let k = 0; k < steps; k++) {
          const h = this.step(n, dt / steps);
          if (h) {
            if (h.vn > 1.2) { Snd.play(h.car ? 'clank' : 'bounce', n, clamp(h.vn / 8, 0.25, 0.9)); n.bounces++; n.rv = R(-14, 14) * clamp(h.vn / 6, 0.2, 1); }
            // rolling to a stop on the ground
            if (h.ny > 0.6 && Math.hypot(n.vx, n.vz) < 0.35 && Math.abs(n.vy) < 1.2) { n.rest = true; n.vx = n.vy = n.vz = 0; n.rv = 0; break; }
          }
        }
        n.rot += n.rv * dt; n.rv *= Math.exp(-1.5 * dt);
        // lost in the harbour
        if (n.y < WATER_Y + 0.1 && !World.onLand(n.x, n.z)) { FX.splash(n.x, WATER_Y, n.z); Snd.play('splash', n, 0.5); n.dead = true; MP.onNadeGone(n); continue; }
        if (n.y < -30) { n.dead = true; MP.onNadeGone(n); continue; }
      }
      // the enemy grenades beep near the player (the HUD shows where they are)
      if (P && n.owner && n.owner !== P && n.owner.team !== 'police') { const d = dist3(n, P.pos); n.near = d < 11; if (n.near) { n.warnT -= dt; if (n.warnT <= 0) { n.warnT = clamp(n.fuse * 0.25, 0.12, 0.45); Snd.play('nadewarn', n, 0.55); } } }
      if (MP.guest && MP.state === 'play') { if (n.fuse < -0.5) n.dead = true; } // the host sets it off (its blast arrives as an effect)
      else if (n.fuse <= 0) { n.dead = true; this.explode(n.x, n.y + 0.08, n.z, n.owner); MP.onNadeGone(n); }
    }
    this.list = this.list.filter(n => !n.dead);
  },
  // explosion: damage and knock-down around (walls protect), cars damaged and set on fire, heavy effects
  explode(x, y, z, owner, o = {}) {
    if (MP.guest && MP.state === 'play') { this.explodeGuest(x, y, z, owner, o); return; }
    const rad = o.R || this.R, P = Game.player, from = { x, z };
    // people
    for (const a of Game.actors) {
      if (!a.alive || a.removed || (a.hidden && !a.isRobot) || a.cuffed || (a.inCar && !(a.isRobot && a.state === 'car')) || a === o.skip) continue;
      const cx = a.pos.x - x, cy = a.pos.y + 0.9 - y, cz = a.pos.z - z, d = Math.hypot(cx, cy * 0.8, cz); if (d > rad) continue;
      const L = Math.max(0.3, d), ray = World.raycast(x, y + 0.25, z, cx / L, (cy - 0.25) / L, cz / L, L - 0.2);
      if (ray && ray.box) continue; // behind a wall
      const k = 1 - d / rad; let dmg = (o.dmg || 150) * k * k + 12 * k;
      if (a.isRobot) dmg *= 0.62; // the robot's plating
      else if (a.armor) dmg *= a.boss ? 0.55 : 1 - a.armor * 0.3; // vests and exoskeletons take the edge off
      a.takeHit(owner || null, dmg, { kind: 'blast', knock: 3 + 9 * k, kd: k > 0.3 ? 1 : 0.6, poise: 999, unblockable: true, lethal: true, from });
      if (a.alive && a.state === 'down') a.vel.y = Math.max(a.vel.y, 3 + 4 * k);
    }
    // cars: dented, shoved, and set on fire when wrecked
    for (const c of Cars.list) {
      if (c.sinking || c.removed || (o.skipCar && c.id === o.skipCar)) continue;
      const d = Math.hypot(c.pos.x - x, c.pos.z - z); if (d > rad + 1.5) continue;
      const k = 1 - d / (rad + 1.5); Cars.damage(c, 130 * k, owner || null);
      const l = Math.max(0.5, d); c.vx += (c.pos.x - x) / l * 5 * k / c.T.mass; c.vz += (c.pos.z - z) / l * 5 * k / c.T.mass; c.bump = 0.25 * k;
      if (c.dead && !c.burnt && !(c.fireT > 0) && !o.car && !c.remote) Cars.ignite(c);
    }
    // grenades nearby go off too (a moment later)
    for (const n of this.list) if (!n.dead && dist3(n, { x, y, z }) < 2.5) n.fuse = Math.min(n.fuse, 0.12);
    // noise: the whole block hears it
    Combat.noise(x, z, 70, owner && owner.team === 'police' ? owner : null);
    for (const a of Game.actors) if (a.team === 'civ' && a.panic && a.alive && dist2D(a.pos.x, a.pos.z, x, z) < 40) a.panic(x, z, 5);
    this.boomFx(x, y, z, rad, o);
    // camera and pad feel it
    const dc = dist3(Cam.pos, { x, y, z }), kc = clamp(1.25 - dc / 28, 0, 1);
    if (kc > 0) { CamCtl.shake(0.35 + 0.65 * kc); Input.rumble(0.4 + 0.6 * kc, 0.8 * kc, 380); Render.post.extraFlash = Math.max(Render.post.extraFlash || 0, 0.22 * kc); setTimeout(() => { Render.post.extraFlash = 0; }, 90); }
    Snd.play('explosion', { x, y, z }, 1.2);
  },
  // multiplayer guest: only our own robot feels it here; the host deals the blast to the city and shows it to the others
  explodeGuest(x, y, z, owner, o) {
    const rad = o.R || this.R, P = Game.player;
    if (P && P.alive) {
      const cx = P.pos.x - x, cy = P.pos.y + 0.9 - y, cz = P.pos.z - z, d = Math.hypot(cx, cy * 0.8, cz), L = Math.max(0.3, d);
      const ray = d <= rad ? World.raycast(x, y + 0.25, z, cx / L, (cy - 0.25) / L, cz / L, L - 0.2) : null;
      if (d <= rad && !(ray && ray.box)) { const k = 1 - d / rad; P.takeHit(owner || null, ((o.dmg || 150) * k * k + 12 * k) * 0.62, { kind: 'blast', knock: 3 + 9 * k, kd: k > 0.3 ? 1 : 0.6, poise: 999, unblockable: true, lethal: true, from: { x, z } }); }
    }
    MP.send({ t: 'boom', x: MP.r2(x), y: MP.r2(y), z: MP.r2(z), R: rad, dmg: o.dmg || 150, c: o.carId || 0 });
    MP.capOff++; try { MP.boomHere(x, y, z, rad); Snd.play('explosion', { x, y, z }, 1.2); } finally { MP.capOff--; }
  },
  boomFx(x, y, z, rad, o) {
    const g = World.groundAt(x, z, 0.3, y + 0.3), gy = g > y + 0.5 ? y : Math.max(g, y - 1.2);
    // flash, fireball, sparks and burning bits
    FX.P(x, y + 0.4, z, { life: 0.14, max: 0.14, size: 4.5, grow: 26, r: 3.2, g: 2.4, b: 1.5, cell: 5, rot: R0() });
    for (let i = 0; i < 18; i++) { const a = R0(), e = Math.random(), s = R(3, 8); FX.P(x, y + 0.3, z, { vx: Math.cos(a) * s * (1 - e * 0.5), vy: R(1.5, 7), vz: Math.sin(a) * s * (1 - e * 0.5), life: R(0.35, 0.7), size: R(0.8, 1.6), grow: R(1.5, 3), r: 2.4, g: R(0.9, 1.4), b: 0.25, a: 1, cell: 3, drag: 3.5, rot: R0(), rv: R(-2, 2) }); }
    for (let i = 0; i < 26; i++) FX.P(x, y + 0.2, z, { vx: R(-11, 11), vy: R(2, 12), vz: R(-11, 11), life: R(0.4, 1.1), size: R(0.05, 0.1), r: 2.6, g: 1.6, b: 0.6, cell: 0, grav: 14, drag: 0.6 });
    for (let i = 0; i < 10; i++) FX.P(x, y + 0.2, z, { vx: R(-6, 6), vy: R(4, 10), vz: R(-6, 6), life: R(0.8, 1.5), size: R(0.08, 0.16), r: 0.08, g: 0.07, b: 0.06, a: 1, cell: 0, add: false, grav: 16 });
    // smoke column
    for (let i = 0; i < 16; i++) { const life = R(2.2, 4.2); FX.P(x + R(-0.8, 0.8), y + R(0.2, 1.4), z + R(-0.8, 0.8), { vx: R(-0.9, 0.9), vy: R(1.2, 3.2), vz: R(-0.9, 0.9), life, max: life, size: R(1.1, 2), grow: R(1, 1.8), r: 0.1, g: 0.095, b: 0.09, a: 0.62, cell: 3, add: false, drag: 1.2, rot: R0(), rv: R(-0.4, 0.4) }); }
    // dust ring on the ground and the shock ring
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; FX.P(x + Math.cos(a) * 0.6, gy + 0.2, z + Math.sin(a) * 0.6, { vx: Math.cos(a) * R(6, 9), vy: R(0.2, 0.8), vz: Math.sin(a) * R(6, 9), life: R(0.7, 1.2), size: R(0.6, 1), grow: 2.2, r: 0.36, g: 0.33, b: 0.3, a: 0.45, cell: 3, add: false, drag: 3.5 }); }
    FX.P(x, gy + 0.06, z, { life: 0.35, max: 0.35, size: 1, grow: rad * 7, r: 1.6, g: 1.1, b: 0.6, a: 0.9, cell: 1, flat: true });
    // scorch mark that fades slowly
    if (gy > -5) FX.P(x, gy + 0.025, z, { life: 30, max: 30, size: 3.6, r: 0.02, g: 0.018, b: 0.016, a: 0.85, cell: 0, add: false, flat: true, rot: R0() });
    Lights.add(x, y + 1.2, z, 14, 7, 2.2, 24, 0.28, 'boom' + (++this.nid));
  },
  // flight of a grenade thrown now: where it comes to rest (or where it is when the fuse runs out); draw = dotted arc
  simulate(x, y, z, vx, vy, vz, draw) {
    const n = this._o || (this._o = {}); n.x = x; n.y = y; n.z = z; n.vx = vx; n.vy = vy; n.vz = vz;
    const A = Render.addParticles, dt = 1 / 40; let t = 0, rest = null, first = null;
    for (let i = 0; i < 120; i++) {
      const h = this.step(n, dt); t += dt;
      if (draw) A.push(n.x, n.y, n.z, 0.11, 1.6, 1.1, 0.35, clamp(1 - t / 2.6, 0.25, 0.9), 0, 1, 0, false);
      if (h && !first) first = { x: n.x, y: n.y, z: n.z };
      if ((h && h.ny > 0.6 && Math.hypot(n.vx, n.vz) < 0.6) || t > NADE_FUSE) { rest = { x: n.x, y: n.y, z: n.z }; break; }
      if (n.y < -20) break;
    }
    return rest || first;
  },
  // aiming: the dotted arc and a ring the size of the blast where the grenade will stop
  preview(x, y, z, vx, vy, vz) {
    const p = this.simulate(x, y, z, vx, vy, vz, true); if (!p) return null;
    const A = Render.addParticles, pulse = 0.85 + 0.15 * Math.sin(Env.time * 9);
    A.push(p.x, p.y + 0.06, p.z, this.R * 2 * pulse, 1.4, 0.45, 0.2, 0.55, 0, 1, 1, true);
    A.push(p.x, p.y + 0.07, p.z, 0.55, 2, 1.2, 0.4, 0.9, 0, 1, 1, true);
    return p;
  },
  // velocity to land on (tx, ty, tz) from (x, y, z): a fixed launch angle, a steeper one when the flat one cannot reach
  aimAt(x, y, z, tx, ty, tz, maxV = 19) {
    const dx = tx - x, dz = tz - z, d = Math.max(0.5, Math.hypot(dx, dz)), h = ty - y, g = this.G;
    for (const th of [0.62, 0.85, 1.05]) {
      const c = Math.cos(th), den = 2 * c * c * (d * Math.tan(th) - h); if (den <= 0) continue;
      const v = Math.sqrt(g * d * d / den); if (v > maxV) continue;
      return [dx / d * v * c, v * Math.sin(th), dz / d * v * c];
    }
    const v = maxV, th = 0.72; return [dx / d * v * Math.cos(th), v * Math.sin(th), dz / d * v * Math.cos(th)];
  },
  render() {
    const I = CharRender.inst.nade; if (!I) return;
    const P = Game.player; if (P && P.nadeAim && P.nadeArc) { const a = P.nadeArc; this.preview(a.o.x, a.o.y, a.o.z, a.v[0], a.v[1], a.v[2]); }
    const m = this._m || (this._m = M4.create()), t = this._t || (this._t = M4.create());
    for (const n of this.list) {
      if (dist3(n, Cam.pos) > 90) continue;
      M4.compose(m, n.x, n.y, n.z, n.rot, n.ax, n.rot * 0.6, 1.1, 1.1, 1.1); M4.identity(t);
      I.pushMul(m, t, 1, 1, 1, 0);
      // a hot ring under enemy grenades close to the player (plus the HUD pointer)
      if (n.near && n.rest) Render.addParticles.push(n.x, n.y - 0.02, n.z, 1.2 + 0.3 * Math.sin(Env.time * 14), 2, 0.3, 0.2, 0.7, 0, 1, 1, true);
    }
  },
  // the enemy grenade the player should worry about (closest, still live)
  threat() { let best = null, bd = 1e9; const P = Game.player; if (!P) return null; for (const n of this.list) if (n.near) { const d = dist3(n, P.pos); if (d < bd) { bd = d; best = n; } } return best; }
};
const R0 = () => Math.random() * TAU;

