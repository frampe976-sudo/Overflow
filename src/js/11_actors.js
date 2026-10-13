/* =====================================================================
   ACTORS — base humanoid: physics, combat reactions, animation
   ===================================================================== */
const GRAV = 20, STEP = 0.46;
const WEAPONS = {
  fists: { name: 'Poings', melee: true },
  bat: { name: 'Batte', melee: true, part: 'bat' },
  knife: { name: 'Couteau', melee: true, part: 'knife', lethal: true },
  wrench: { name: 'Clé à molette', melee: true, part: 'wrench' },
  staff: { name: 'Bâton rituel', melee: true, part: 'staff' },
  // dmg per bullet (pellet), pen = share of body armour it goes through, fall = [from m, to m, damage lost at the far end],
  // bloom = spread growth per shot when fired without pause (the AK climbs, the carbine stays put)
  pistol: { name: 'Pistolet', firearm: true, part: 'pistol', mag: 12, dmg: 30, rof: 0.24, spread: 0.02, range: 60, snd: 'pistol', reload: 1.1, pellets: 1, auto: false, pen: 0.25, fall: [25, 60, 0.35], bloom: 0.2 },
  shotgun: { name: 'Fusil à pompe', firearm: true, part: 'shotgun', mag: 6, dmg: 14, rof: 0.8, spread: 0.06, range: 28, snd: 'shotgun', reload: 1.9, pellets: 8, auto: false, long: true, pen: 0.2, fall: [6, 24, 0.75] },
  rifle: { name: 'Carabine tactique', firearm: true, part: 'rifle', mag: 30, dmg: 16, rof: 0.1, spread: 0.03, range: 70, snd: 'rifle', reload: 1.7, pellets: 1, auto: true, long: true, pen: 0.35, fall: [30, 70, 0.3], bloom: 0.12 },
  ak: { name: 'AK-47', firearm: true, part: 'ak', mag: 30, dmg: 24, rof: 0.11, spread: 0.034, range: 75, snd: 'ak', reload: 2.0, pellets: 1, auto: true, long: true, kick: 0.9, pen: 0.55, fall: [35, 75, 0.3], bloom: 0.24 },
  uzi: { name: 'Uzi', firearm: true, part: 'uzi', mag: 32, dmg: 13, rof: 0.066, spread: 0.045, range: 40, snd: 'smg', reload: 1.4, pellets: 1, auto: true, kick: 0.45, pen: 0.1, fall: [12, 40, 0.5], bloom: 0.15 }
};
const NADE_FUSE = 2.3; // seconds between the throw and the blast
// attack definitions (times in seconds)
const ATK = {
  jab: { clip: 'jab', dur: 0.34, hit: 0.14, range: 1.35, dmg: 9, knock: 1.6, lunge: 3.4, snd: 'punch', poise: 10, cancel: 0.22 },
  cross: { clip: 'cross', dur: 0.4, hit: 0.18, range: 1.4, dmg: 11, knock: 2.2, lunge: 3.4, snd: 'punch', poise: 14, cancel: 0.26 },
  hook: { clip: 'hook', dur: 0.56, hit: 0.28, range: 1.45, dmg: 17, knock: 5, lunge: 3.6, snd: 'heavy', poise: 30, kd: 0.45, cancel: 0.4 },
  kick: { clip: 'kick', dur: 0.56, hit: 0.28, range: 1.8, dmg: 14, knock: 4.5, lunge: 2.6, snd: 'kick', poise: 22, cancel: 0.36 },
  spinKick: { clip: 'spinKick', dur: 0.7, hit: 0.34, range: 1.95, dmg: 23, knock: 7.5, lunge: 2, snd: 'heavy', poise: 60, kd: 1, arc: 3.2, spin: true, cancel: 0.5 },
  flyKick: { clip: 'flyKick', dur: 0.62, hit: 0.18, hitEnd: 0.42, range: 1.7, dmg: 20, knock: 8, dash: 10, snd: 'heavy', poise: 60, kd: 1, cancel: 0.5 },
  airKick: { clip: 'airKick', dur: 0.46, hit: 0.14, hitEnd: 0.36, range: 1.8, dmg: 16, knock: 6, snd: 'kick', poise: 40, kd: 0.6, air: true, cancel: 0.4 },
  batSwing: { clip: 'swing', dur: 0.62, hit: 0.34, range: 2.15, dmg: 27, knock: 6, lunge: 2.4, snd: 'heavy', poise: 50, kd: 0.6, arc: 1.4, cancel: 0.45 },
  stab: { clip: 'stab', dur: 0.4, hit: 0.19, range: 1.55, dmg: 24, knock: 1.5, lunge: 3.8, snd: 'flesh', poise: 15, lethal: true, cancel: 0.28 },
  butt: { clip: 'cross', dur: 0.45, hit: 0.2, range: 1.45, dmg: 12, knock: 3.5, lunge: 3, snd: 'punch', poise: 25, cancel: 0.3 },
  // NPC attacks (longer windups = readable)
  e_punch: { clip: 'cross', dur: 0.85, hit: 0.46, range: 1.5, dmg: 9, knock: 2.5, lunge: 2.5, snd: 'punch', poise: 12, tele: 0.2 },
  e_bat: { clip: 'swing', dur: 1.0, hit: 0.56, range: 2.1, dmg: 15, knock: 5, lunge: 2.2, snd: 'heavy', poise: 30, kd: 0.35, tele: 0.25, arc: 1.3 },
  e_knife: { clip: 'stab', dur: 0.75, hit: 0.42, range: 1.6, dmg: 13, knock: 1.5, lunge: 3.5, snd: 'flesh', poise: 10, tele: 0.2, lethal: true },
  e_kick: { clip: 'kick', dur: 0.9, hit: 0.48, range: 1.7, dmg: 11, knock: 5, lunge: 2, snd: 'kick', poise: 20, tele: 0.22 },
  e_shove: { clip: 'shove', dur: 0.7, hit: 0.36, range: 1.6, dmg: 4, knock: 7, lunge: 1.5, snd: 'punch', poise: 30, tele: 0.15 },
  b_swing: { clip: 'swing', dur: 1.05, hit: 0.6, range: 2.4, dmg: 22, knock: 7, lunge: 3, snd: 'heavy', poise: 60, kd: 0.6, tele: 0.3, arc: 1.6 },
  b_overhead: { clip: 'overhead', dur: 1.3, hit: 0.78, range: 2.5, dmg: 30, knock: 8, lunge: 2.5, snd: 'heavy', poise: 80, kd: 1, tele: 0.4 },
  b_slam: { clip: 'slam', dur: 1.5, hit: 0.95, range: 4.6, dmg: 26, knock: 9, lunge: 0, snd: 'slam', poise: 80, kd: 1, tele: 0.55, aoe: true, arc: 3.2 }
};

class Actor {
  constructor(o) {
    this.id = ++Actor.nid; this.kind = o.kind || 'npc'; this.team = o.team || 'civ';
    // the look comes from a seed, so the guests of a multiplayer game build the very same passer-by
    this.appKey = o.app || this.kind; this.appSeed = o.appSeed !== undefined ? o.appSeed >>> 0 : (Math.random() * 4294967296) >>> 0;
    this.app = o.appObj || makeAppearance(this.appKey, mulberry32(this.appSeed));
    this.pos = new V3(o.x || 0, o.y !== undefined ? o.y : World.groundAt(o.x || 0, o.z || 0, 0.3, 1.2), o.z || 0); this.vel = new V3();
    this.yaw = o.yaw || 0; this.visYaw = 0; this.visY = 0;
    const s = this.app.scale; this.r = 0.33 * s; this.h = 1.72 * s;
    this.hp = this.maxHp = o.hp || 100;
    this.state = 'move'; this.st = 0; this.alive = true; this.removed = false; this.cuffed = false;
    this.pose = new Float32Array(PSZ);
    this.phase = 0; this.seed = Math.random(); this.t = Math.random() * 10;
    this.tint = 1; this.glow = 1; this.grounded = true; this.groundY = this.pos.y;
    this.contacts = [{}, {}, {}, {}]; this.nContacts = 0;
    this.weapon = null; this.weaponPart = null; this.setWeapon(o.weapon || null);
    this.tags = o.tags || {}; this.faceUp = true; this.downT = 0; this.poise = 0; this.poiseT = 0;
    this.atk = null; this.iframe = 0; this.blocking = false; this.parryT = 0; this.stunT = 0;
    this.hitFlash = 0; this.aimK = 0; this.aimPitch = 0; this.combatT = 0;
    this.dead = false; this.fade = 1; this.inCar = null; this.noCollide = false;
    this.speedMul = 1; this.lastHitBy = null; this.stepSnd = 0; this.throwT = -1; this.thrown = false; this.nadeAim = false; this.nades = 0;
    this.an = new Anim(this);
  }
  setWeapon(w) { this.weapon = w; const d = w && WEAPONS[w]; this.weaponPart = d && d.part ? weaponPart(w) : null; }
  setState(s) { this.state = s; this.st = 0; }
  get down() { return this.state === 'down' || this.state === 'ko' || this.state === 'dead' || this.state === 'getup'; }
  get arrestable() { return this.alive && !this.cuffed && !this.inCar && (this.state === 'down' || this.state === 'ko' || this.state === 'surrender' || this.state === 'getup') && this.team !== 'civ' && this.team !== 'police' && !this.tags.noArrest; }
  get hittable() { return this.alive && !this.cuffed && !this.removed && !this.inCar && this.state !== 'beingCuffed'; }
  fwdX() { return Math.sin(this.yaw); } fwdZ() { return Math.cos(this.yaw); }
  facing(x, z, cosLim) { const dx = x - this.pos.x, dz = z - this.pos.z; const l = Math.hypot(dx, dz) || 1; return (dx * this.fwdX() + dz * this.fwdZ()) / l > cosLim; }
  /* ---------------- physics ---------------- */
  physics(dt) {
    if (this.inCar) return;
    if (!this.noGravity) { this.vel.y -= GRAV * dt; if (this.vel.y < -38) this.vel.y = -38; }
    const oy = this.pos.y;
    // never let a bad velocity (division by zero somewhere upstream) poison positions
    if (!(isFinite(this.vel.x) && isFinite(this.vel.y) && isFinite(this.vel.z))) this.vel.set(0, 0, 0);
    const mx = this.vel.x * dt, mz = this.vel.z * dt, steps = this.noCollide ? 1 : Math.min(8, Math.ceil(Math.hypot(mx, mz) / 0.12) || 1);
    for (let k = 1; k < steps; k++) { this.pos.x += mx / steps; this.pos.z += mz / steps; World.collideCircle(this.pos, this.r, this.h, STEP, null); }
    this.pos.x += mx / steps; this.pos.z += mz / steps; this.pos.y += this.vel.y * dt;
    this.nContacts = this.noCollide ? 0 : World.collideCircle(this.pos, this.r, this.h, STEP, this.contacts);
    let g = World.groundAt(this.pos.x, this.pos.z, this.r * 0.72, Math.max(oy, this.pos.y) + STEP);
    if (Cars.list.length) { const gc = Cars.topAt(this.pos.x, this.pos.z, this.r, Math.max(oy, this.pos.y) + (this.grounded ? 0.3 : this.vel.y <= 0 ? 0.15 : -0.01)); if (gc > g) g = gc; } // on a car's hood or roof
    const wasG = this.grounded;
    if (this.pos.y <= g + 0.001 || (wasG && this.vel.y <= 0.01 && this.pos.y - g < 0.36)) {
      const dy = g - this.pos.y;
      if (wasG && dy > 0.05) this.visY -= dy; // smooth step up
      if (!wasG) this.onLand(this.vel.y);
      this.pos.y = g; if (this.vel.y < 0) this.vel.y = 0; this.grounded = true;
    } else this.grounded = false;
    if (this.vel.y > 0) { const c = World.ceilingAt(this.pos.x, this.pos.z, this.r * 0.6, oy + 0.3); if (this.pos.y + this.h > c) { this.pos.y = c - this.h; this.vel.y = 0; } }
    this.groundY = g;
    this.visY = damp(this.visY, 0, 14, dt);
    if (this.pos.y < WATER_Y + 0.3 && !World.onLand(this.pos.x, this.pos.z)) this.onWater();
    if (this.pos.y < -60) this.onWater();
  }
  onLand(vy) { this.an && this.an.onLand(vy); if (vy < -4) { Snd.play('land', this.pos, Math.min(1, -vy / 14)); if (this.app.robot) Snd.play('clank', this.pos, Math.min(0.5, -vy / 24), 0.8); } if (vy < -17 && this.state !== 'dead') this.fallDamage(vy); }
  fallDamage(vy) { const d = (-vy - 17) * 7; if (d > 0) this.takeHit(null, d, { kind: 'fall', knockdown: -vy > 21 }); }
  onWater() {
    if (this.inWater) return; this.inWater = true;
    FX.splash(this.pos.x, WATER_Y, this.pos.z); Snd.play('splash', this.pos, 1);
    if (this !== Game.player) { this.alive = false; this.removed = true; Game.onNpcLost(this); }
  }
  // where this actor's shots leave from: the gun muzzle when it was placed this frame, else the chest;
  // never from the far side of a wall the barrel pokes through
  shotOrigin(tx, tz, out) {
    const s = this.app.scale || 1, cx = this.pos.x, cy = this.pos.y + 1.3 * s, cz = this.pos.z;
    const m = this.muzzle, fresh = m && m.x !== undefined && (Game.simT || 0) - (this.muzzleT || -9) < 0.2 && Math.hypot(m.x - cx, m.y - cy, m.z - cz) < 1.4 * s;
    if (fresh) {
      const dx = m.x - cx, dy = m.y - cy, dz = m.z - cz, L = Math.hypot(dx, dy, dz) || 1;
      if (!World.raycast(cx, cy, cz, dx / L, dy / L, dz / L, L)) { out.set(m.x, m.y, m.z); return out; }
    }
    let fx = tx - cx, fz = tz - cz; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    const k = World.raycast(cx, cy, cz, fx, 0, fz, 0.45) ? 0 : 0.4; // the gun in front of the chest, unless a wall is there
    out.set(cx + fx * k, cy + 0.08, cz + fz * k); return out;
  }
  /* ---------------- combat ---------------- */
  takeHit(src, dmg, o = {}) {
    if (!this.alive || this.cuffed || this.removed) return false;
    const kind = o.kind || 'melee';
    if (this.iframe > 0 && kind !== 'fall' && kind !== 'blast') return false;
    if (this.inCar) return false;
    let knock = o.knock || 0; let kd = o.kd || 0;
    const fromX = o.from ? o.from.x : src ? src.pos.x : this.pos.x - Math.sin(this.yaw), fromZ = o.from ? o.from.z : src ? src.pos.z : this.pos.z - Math.cos(this.yaw);
    if ((kind === 'melee') && this.blocking && src && this.facing(fromX, fromZ, -0.2) && !o.unblockable) {
      if (this.parryT > 0 && src !== this) { src.stagger(1.3, true); Snd.play('parry', this.pos); FX.spark(this.pos.x, this.pos.y + 1.4, this.pos.z, 1, 18, [0.6, 0.85, 1]); Game.slowmo(0.45, 0.22); Render.post.extraFlash = 0.12; Game.onParry(this, src); return 'parry'; }
      dmg *= o.heavy ? 0.45 : 0.18; knock *= 0.35; kd = 0; Snd.play('block', this.pos); if (this.an && src) { const bx = this.pos.x - src.pos.x, bz = this.pos.z - src.pos.z, bl = Math.hypot(bx, bz) || 1; this.an.impulse(bx / bl, bz / bl, 0.35); } FX.spark(this.pos.x + this.fwdX() * 0.4, this.pos.y + 1.35, this.pos.z + this.fwdZ() * 0.4, 0.6, 6, [1, 0.9, 0.7]);
      this.onBlocked && this.onBlocked(src);
      if (dmg < 2) { this.hitFlash = 0.3; return 'blocked'; }
    }
    if (this.dmgMul) dmg *= this.dmgMul;
    this.hp -= dmg; this.lastHitBy = src; this.hitFlash = 1; this.combatT = 6;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ; const dl = Math.hypot(dx, dz) || 1;
    const kx = dx / dl, kz = dz / dl;
    if (this.an) this.an.impulse(kx, kz, kind === 'bullet' ? 0.6 + dmg / 30 : 0.4 + dmg / 14);
    Game.onHit(this, src, dmg, o);
    if (this.hp <= 0) {
      this.hp = 0;
      if (o.lethal || kind === 'bullet' || kind === 'fall' || kind === 'car' || kind === 'blast' || this.lethalOnly) this.die(kx, kz, knock, src, o);
      else this.ko(kx, kz, knock, src, o);
      return true;
    }
    this.poise += o.poise !== undefined ? o.poise : dmg; this.poiseT = 2;
    const poiseMax = this.poiseMax || 30;
    if (kind === 'bullet') {
      // gunfire: a flinch each time a poise bar's worth of hits piles up (not on every bullet, which pinned every
      // shooter down for good), a fall only under a hail of them (a point-blank buckshot, a long burst)
      const fl = this.poiseFl > this.poise ? 0 : this.poiseFl || 0;
      if (!this.superArmor && this.poise > poiseMax * 3.5) this.knockDown(kx, kz, knock, 1.8 + Math.random());
      else if (this.poise - fl > poiseMax * (this.superArmor ? 1.6 : 1)) { this.poiseFl = this.poise; this.stagger(0.28); this.vel.x += kx * knock * 0.4; this.vel.z += kz * knock * 0.4; }
      return true;
    }
    if ((kd && Math.random() < kd * (this.superArmor ? 0.2 : 1)) || this.poise > poiseMax * 2.2) { this.knockDown(kx, kz, knock, (this.superArmor ? 1.6 : 2.6) + Math.random()); }
    else if (!this.superArmor || this.poise > poiseMax) { this.stagger(kind === 'bullet' ? 0.22 : 0.34 + Math.min(0.3, dmg / 60)); this.vel.x += kx * knock * 0.6; this.vel.z += kz * knock * 0.6; }
    return true;
  }
  stagger(t, parried) {
    if (!this.alive || this.down || this.cuffed) return;
    if (this.superArmor && !parried && this.poise < (this.poiseMax || 30)) return;
    this.atk = null; this.setState('hit'); this.stunT = t; this.blocking = false; this.releaseToken && this.releaseToken();
    if (parried) this.parried = true;
  }
  knockDown(kx, kz, knock, t) {
    this.atk = null; this.blocking = false; this.releaseToken && this.releaseToken();
    this.setState('down'); this.downT = t; this.poise = 0;
    this.faceUp = (kx * this.fwdX() + kz * this.fwdZ()) < 0.2; // knocked backwards -> lands on the back
    this.vel.x = kx * knock; this.vel.z = kz * knock; this.vel.y = Math.min(6, 2 + knock * 0.35);
    this.grounded = false; Game.onDown(this);
  }
  ko(kx, kz, knock, src, o) {
    this.atk = null; this.blocking = false; this.releaseToken && this.releaseToken();
    this.setState('ko'); this.downT = this.koTime || 22; this.faceUp = (kx * this.fwdX() + kz * this.fwdZ()) < 0.2;
    this.vel.x = kx * knock; this.vel.z = kz * knock; this.vel.y = 2 + knock * 0.3; this.grounded = false;
    Game.onKO(this, src, o);
  }
  die(kx, kz, knock, src, o) {
    this.atk = null; this.blocking = false; this.releaseToken && this.releaseToken();
    this.alive = false; this.dead = true; this.setState('dead'); this.faceUp = (kx * this.fwdX() + kz * this.fwdZ()) < 0.2;
    this.vel.x = kx * knock; this.vel.z = kz * knock; this.vel.y = 2 + knock * 0.2; this.grounded = false;
    Game.onDeath(this, src, o);
  }
  /* ---------------- grenades (player and enemies) ---------------- */
  // the throw starts now; the grenade leaves the hand a third of the way through the move with velocity v
  startThrow(vx, vy, vz, fuse = NADE_FUSE) {
    this.throwT = 0; this.throwDur = 0.62; this.thrown = false; this.throwV = [vx, vy, vz]; this.throwFuse = fuse; this.nadeAim = false;
    Snd.play('pin', this.pos, 0.55);
  }
  updateThrow(dt) {
    if (!(this.throwT >= 0)) return;
    this.throwT += dt;
    if (!this.thrown && this.throwT >= this.throwDur * THROW_REL) {
      this.thrown = true; const h = this.handPos && this.an && this.an.w.thr > 0.5 && dist3(this.handPos, this.pos) < 2.5 ? this.handPos : { x: this.pos.x + this.fwdX() * 0.2, y: this.pos.y + 1.75, z: this.pos.z + this.fwdZ() * 0.2 };
      const v = this.throwV; Nades.spawn(h.x, h.y, h.z, v[0], v[1], v[2], this, this.throwFuse); Snd.play('whoosh', this.pos, 0.55);
    }
    if (this.throwT >= this.throwDur) this.throwT = -1;
  }
  // knocked out of a throw: a grenade still in the hand falls at the feet, pin pulled
  dropThrow() {
    if (this.throwT >= 0 && !this.thrown && this.throwT > 0.08) { this.thrown = true; Nades.spawn(this.pos.x + R(-0.3, 0.3), this.pos.y + 1.0, this.pos.z + R(-0.3, 0.3), R(-1, 1), 1, R(-1, 1), this, Math.max(0.9, this.throwFuse - 0.8)); }
    this.throwT = -1; this.nadeAim = false;
  }
  surrender() { if (!this.alive || this.cuffed || this.down) return; this.atk = null; this.releaseToken && this.releaseToken(); this.setState('surrender'); this.vel.x = this.vel.z = 0; Game.onSurrender(this); }
  // melee attack execution (shared by player and NPC)
  startAttack(name, target) {
    const d = ATK[name]; this.atk = { d, name, t: 0, hit: false, target, spin: 0 };
    this.setState('attack');
    if (target) this.yaw = angleTo(this.pos.x, this.pos.z, target.pos.x, target.pos.z);
    if (d.tele) FX.telegraph(this, d.tele);
    if (!d.tele) { Snd.play('whoosh', this.pos, 0.6); if (this.app.robot) Snd.play('servo', this.pos, 0.5, 0.9 + Math.random() * 0.25); }
  }
  updateAttack(dt) {
    const A = this.atk; if (!A) { this.setState('move'); return; }
    const d = A.d; A.t += dt;
    // lunge / dash
    const tg = A.target;
    if (d.dash && A.t < d.hit + 0.12) { const s = d.dash * (1 - A.t / (d.hit + 0.2)); this.vel.x = this.fwdX() * s; this.vel.z = this.fwdZ() * s; }
    else if (d.lunge && A.t < d.hit) {
      let want = d.lunge * 0.45; if (tg) { const dist = dist2D(this.pos.x, this.pos.z, tg.pos.x, tg.pos.z) - tg.r - this.r; want = clamp((dist - d.range * 0.55) / Math.max(0.08, d.hit - A.t), 0, 7); this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, tg.pos.x, tg.pos.z), 20, dt); }
      this.vel.x = this.fwdX() * want; this.vel.z = this.fwdZ() * want;
    } else { this.vel.x = damp(this.vel.x, 0, 12, dt); this.vel.z = damp(this.vel.z, 0, 12, dt); }
    if (d.spin) A.spin = clamp((A.t - d.hit * 0.3) / (d.dur * 0.7), 0, 1) * TAU;
    this.visYaw = d.spin ? -A.spin : 0;
    if (d.tele && A.t < d.hit - 0.12 && A.t > 0.05 && !A.w) { A.w = true; }
    if (!A.hit && A.t >= d.hit) { A.hit = true; if (d.tele) Snd.play('whoosh', this.pos, 0.7); Combat.resolveMelee(this, A); }
    if (A.hit && d.hitEnd && A.t < d.hitEnd && !A.connected) Combat.resolveMelee(this, A, true);
    if (A.t >= d.dur) { this.atk = null; this.visYaw = 0; this.setState(this.grounded ? 'move' : 'air'); this.onAttackEnd && this.onAttackEnd(A); }
  }
  /* ---------------- generic state update ---------------- */
  updateCommon(dt) {
    this.t += dt; this.st += dt;
    if (this.iframe > 0) this.iframe -= dt; if (this.parryT > 0) this.parryT -= dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.poiseT > 0) { this.poiseT -= dt; if (this.poiseT <= 0) this.poise = 0; }
    if (this.combatT > 0) this.combatT -= dt;
    switch (this.state) {
      case 'hit': this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); if (this.st > this.stunT) { this.parried = false; this.setState('move'); } return true;
      case 'down': this.friction(dt, 5); if (this.grounded && this.st > this.downT) this.setState('getup'); return true;
      case 'ko': this.friction(dt, 5); if (this.grounded && this.st > this.downT) { this.hp = this.maxHp * 0.3; this.setState('getup'); this.fleeAfter = true; } return true;
      case 'getup': this.friction(dt, 10); if (this.st > (this.getupDur || 0.85)) { this.setState('move'); this.poise = 0; this.iframe = 0.2; } return true;
      case 'dead': this.friction(dt, 5); return true;
      case 'cuffed': case 'beingCuffed': case 'surrender': this.friction(dt, 10); return true;
      case 'attack': this.updateAttack(dt); return true;
    }
    return false;
  }
  friction(dt, k) { if (this.grounded) { this.vel.x = damp(this.vel.x, 0, k, dt); this.vel.z = damp(this.vel.z, 0, k, dt); } }
  // move toward a horizontal velocity
  steer(dx, dz, speed, accel, dt) {
    const tx = dx * speed, tz = dz * speed;
    const ax = tx - this.vel.x, az = tz - this.vel.z; const al = Math.hypot(ax, az); const m = accel * dt;
    if (al <= m) { this.vel.x = tx; this.vel.z = tz; } else { this.vel.x += ax / al * m; this.vel.z += az / al * m; }
  }
  /* ---------------- animation ---------------- */
  animate(dt) { this.an.update(dt); }
}
Actor.nid = 0;

/* =====================================================================
   COMBAT helpers
   ===================================================================== */
const Combat = {
  tokens: new Set(), maxTokens: 2, shooters: new Set(), maxShooters: 2,
  // a few gunmen at a time take aim at the robot; the others move, take position, wait their turn
  // (counted per robot: in a brigade, each robot has its own few gunmen at a time)
  canShoot(a) { if (this.shooters.has(a)) return true; for (const t of this.shooters) if (!t.alive || t.down || t.removed || t.cuffed || t.state === 'surrender' || !(t.aimT > 0 || t.burstLeft > 0)) this.shooters.delete(t); let n = 0; for (const t of this.shooters) if (t.P === a.P) n++; if (n < Math.max(1, this.maxShooters + diffK().shoot)) { this.shooters.add(a); return true; } return false; },
  releaseShot(a) { this.shooters.delete(a); },
  canAttack(a) { if (this.tokens.has(a)) return true; for (const t of this.tokens) if (!t.alive || t.down || t.state === 'hit' || t.removed) this.tokens.delete(t); let n = 0; for (const t of this.tokens) if (t.P === a.P) n++; if (n < this.maxTokens) { this.tokens.add(a); return true; } return false; },
  release(a) { this.tokens.delete(a); },
  resolveMelee(att, A, late) {
    if (A.carHit) { // a blow at the robot's car: the bodywork takes some, the window gives, the driver takes the rest (60 %)
      const c = A.carHit, D = c.driver, d = A.d; if (c.removed || c.sinking || c.burnt) return false;
      const lx = att.pos.x - c.pos.x, lz = att.pos.z - c.pos.z, side = Math.abs(lx * -c.fz + lz * c.fx), along = Math.abs(lx * c.fx + lz * c.fz);
      if (side > c.wid / 2 + 1.4 || along > c.len / 2 + 0.6) return false;
      const dmg = d.dmg * (att.dmgOut || 1); Cars.damage(c, dmg * 0.5, att); c.bump = Math.max(c.bump || 0, 0.12); A.connected = true;
      if (D && D.isRobot && D.state === 'car') D.takeHit(att, dmg, { kind: 'melee', knock: 0 });
      const hx = c.pos.x + (att.pos.x - c.pos.x) * 0.55, hz = c.pos.z + (att.pos.z - c.pos.z) * 0.55;
      Snd.play('glass', { x: hx, y: c.pos.y + 1.1, z: hz }, 0.7); Snd.play(d.snd === 'flesh' ? 'clank' : d.snd || 'punch', { x: hx, y: c.pos.y + 1, z: hz }, 0.7); FX.spark(hx, c.pos.y + 1.1, hz, 0.6, 8, [0.8, 0.9, 1]);
      return true;
    }
    const d = A.d; let best = null, bestD = 1e9; const hits = [];
    const arc = d.arc || 0.95; // radians half-angle
    for (const t of Game.actors) {
      if (t === att || !t.hittable || (t.down && !d.aoe) || (t.state === 'surrender' && att.isRobot)) continue;
      if (att.team !== 'police' && t.team === att.team) continue; // no friendly fire among gangs
      if (att.team === 'police' && t.team === 'police') continue;
      const dx = t.pos.x - att.pos.x, dz = t.pos.z - att.pos.z, dy = t.pos.y - att.pos.y;
      if (Math.abs(dy) > 1.3) continue;
      const dist = Math.hypot(dx, dz) - t.r;
      if (dist > d.range) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - att.yaw));
      if (!d.aoe && ang > arc && dist > 0.35) continue;
      if (d.arc || d.aoe) hits.push(t); else if (dist + ang * 0.8 < bestD) { bestD = dist + ang * 0.8; best = t; }
    }
    if (best) hits.push(best);
    let any = false;
    const rip = att === Game.player && att.riposteT > 0; // the blow that follows a parry or a perfect dodge lands harder
    if (!late) A.fk = Destin.dmgK(att, A); // talents, Destinée, Jugement, critiques (rolled once per blow)
    const fm = att === Game.player ? att.fm : null, fk = A.fk || 1;
    const ripK = rip ? 1.7 * (fm ? fm.rip : 1) : 1, kdFin = fm && fm.finKd && d.fin ? 1 : 0;
    for (const t of hits) {
      const dmg = d.dmg * (att.dmgOut || 1) * ripK * fk;
      const r = t.takeHit(att, dmg, { kind: 'melee', knock: d.knock * (rip ? 1.5 : 1), kd: Math.max(rip ? Math.max(d.kd || 0, 0.5) : d.kd || 0, kdFin), poise: d.poise * (rip ? 1.6 : 1) * (fm ? fm.poise : 1), lethal: d.lethal, heavy: d.dmg > 18 || rip, unblockable: d.aoe });
      if (r) {
        any = true; A.connected = true;
        if (r === true && rip && t.team !== 'civ') { att.riposteT = 0; Game.award(50, t.pos, 'RIPOSTE', 'feat'); Game.hitstop(0.1); CamCtl.shake(0.4); Render.post.extraFlash = 0.05; }
        if (r === true) {
          Destin.onHit(att, t, A);
          if (A.crit && att === Game.player) HUD.pop(t.pos.x, t.pos.y + 2.3, t.pos.z, 'CRITIQUE', 'feat');
          Snd.play(d.snd === 'flesh' && t.app.robot ? 'clank' : d.snd || 'punch', t.pos, 0.9);
          const hx = (att.pos.x + t.pos.x) / 2, hz = (att.pos.z + t.pos.z) / 2;
          FX.hit(hx, t.pos.y + 1.2, hz, d.dmg > 18 ? 1.3 : 0.9);
          if (t.app.robot) { Snd.play('clank', t.pos, 0.55); FX.spark(hx, t.pos.y + 1.2, hz, 0.7, 8, [1, 0.85, 0.55]); }
          if (att === Game.player) { Game.hitstop(d.dmg > 18 ? 0.075 : 0.045); CamCtl.shake(d.dmg > 18 ? 0.35 : 0.18); Input.rumble(0.5, 0.3, 90); Game.combo(); }
          else if (t === Game.player) { CamCtl.shake(0.4); Input.rumble(0.8, 0.5, 160); }
        }
      }
    }
    if (d.aoe) { FX.shockwave(att.pos.x + att.fwdX() * 1.5, att.pos.y + 0.05, att.pos.z + att.fwdZ() * 1.5, d.range); CamCtl.shake(0.6); }
    if (d.pause && !late && att === Game.player) { if (any) HUD.pop(att.pos.x, att.pos.y + 2.4, att.pos.z, 'COMBO À PAUSE', 'feat'); Destin.onFinisher(att, A); }
    return any;
  },
  // hitscan shot. returns {x,y,z, actor, car}
  shoot(shooter, ox, oy, oz, dx, dy, dz, range, dmg, opts = {}) {
    let best = range, hitA = null, hitCar = null;
    const w = World.raycast(ox, oy, oz, dx, dy, dz, range);
    if (w) best = w.t;
    for (const t of Game.actors) {
      if (t === shooter || !t.hittable || t.inCar) continue;
      if (shooter && shooter.team !== 'police' && t.team === shooter.team) continue;
      if (shooter && shooter.isRobot && t.isRobot) continue; // no friendly fire between the robots of a brigade
      const tt = rayCapsule(ox, oy, oz, dx, dy, dz, t, best); if (tt !== null && tt < best) { best = tt; hitA = t; }
    }
    for (const c of Cars.list) { if (c === opts.ignoreCar) continue; const tt = Cars.rayHit(c, ox, oy, oz, dx, dy, dz, best); if (tt !== null && tt < best) { best = tt; hitA = null; hitCar = c; } }
    const hx = ox + dx * best, hy = oy + dy * best, hz = oz + dz * best;
    if (hitA) {
      const headshot = hy > hitA.pos.y + hitA.h * 0.86;
      let d = dmg;
      if (opts.fall) { const F = opts.fall, f = clamp((best - F[0]) / (F[1] - F[0]), 0, 1); d *= 1 - f * F[2]; } // spent at range
      const arm = headshot ? 0 : hitA.armor || 0; // vests and plating soak body hits, never the head
      if (arm > 0) d *= 1 - arm * (1 - (opts.pen || 0));
      if (headshot) d *= 1.8;
      const r = hitA.takeHit(shooter, d, { kind: 'bullet', knock: opts.knock || 1.2, lethal: true, poise: d * 0.8, head: headshot });
      if (r) {
        if (hitA.app.robot) { FX.spark(hx, hy, hz, 0.8, 12, [1, 0.85, 0.55]); Snd.play('ricochet', { x: hx, y: hy, z: hz }, 0.6); Snd.play('clank', { x: hx, y: hy, z: hz }, 0.35); }
        else { if (arm > 0.15) { FX.spark(hx, hy, hz, 0.4, 5, [0.8, 0.9, 1]); Snd.play('ricochet', { x: hx, y: hy, z: hz }, 0.22); } FX.blood(hx, hy, hz, dx, dz); Snd.play('flesh', { x: hx, y: hy, z: hz }, 0.7); }
        if (shooter === Game.player) { HUD.hitmark(headshot ? 'head' : arm > 0.15 ? 'armor' : ''); if (headshot && !hitA.app.robot) { Game.hitstop(0.04); Snd.play('headshot', { x: hx, y: hy, z: hz }, 0.55); } }
      }
    } else if (hitCar) {
      Cars.damage(hitCar, dmg * (opts.carMul || 0.3), shooter); if (shooter === Game.player) HUD.hitmark(); FX.spark(hx, hy, hz, 0.7, 8, [1, 0.8, 0.5]); Snd.play('ricochet', { x: hx, y: hy, z: hz }, 0.5);
      const D = hitCar.driver, S = CAR_SHAPES[hitCar.type];
      if (D && D.isRobot && D.state === 'car' && !(shooter && shooter.isRobot) && S && hy > hitCar.pos.y + S.belt - 0.08) { D.takeHit(shooter, dmg, { kind: 'bullet', knock: 0 }); Snd.play('glass', { x: hx, y: hy, z: hz }, 0.45); } // through the window
    }
    else if (best < range) { FX.spark(hx, hy, hz, 0.6, 7, [1, 0.85, 0.6]); FX.dust(hx, hy, hz); if (Math.random() < 0.3) Snd.play('ricochet', { x: hx, y: hy, z: hz }, 0.4); if (w && w.box && w.box.onHit && Math.abs(w.t - best) < 1e-6) w.box.onHit(shooter, hx, hy, hz); }
    return { x: hx, y: hy, z: hz, actor: hitA, car: hitCar, t: best };
  },
  // camera probe: first hit point along a ray (no damage)
  shootProbe(ox, oy, oz, dx, dy, dz, range, ignore) {
    let best = range; const w = World.raycast(ox, oy, oz, dx, dy, dz, range); if (w) best = w.t;
    for (const t of Game.actors) { if (t === ignore || !t.hittable || t.inCar) continue; const tt = rayCapsule(ox, oy, oz, dx, dy, dz, t, best); if (tt !== null && tt < best) best = tt; }
    for (const c of Cars.list) { const tt = Cars.rayHit(c, ox, oy, oz, dx, dy, dz, best); if (tt !== null && tt < best) best = tt; }
    // skip hits too close to the camera (behind the player)
    return { x: ox + dx * best, y: oy + dy * best, z: oz + dz * best, t: best };
  },
  noise(x, z, radius, src) { if (MP.guest && src === Game.player) { MP.send({ t: 'noise', x: MP.r2(x), z: MP.r2(z), r: radius }); return; } for (const a of Game.actors) { if (a.hearNoise && a !== src) { const d = dist2D(a.pos.x, a.pos.z, x, z); if (d < radius) a.hearNoise(x, z, d, src); } } }
};
// ray vs vertical capsule approximated as cylinder (actor standing) or low box (lying)
function rayCapsule(ox, oy, oz, dx, dy, dz, a, maxT) {
  const lying = a.state === 'down' || a.state === 'ko' || a.state === 'dead';
  const r = lying ? 0.45 : a.r * 1.05, y0 = a.pos.y, y1 = a.pos.y + (lying ? 0.4 : a.state === 'cuffed' || a.state === 'surrender' || a.state === 'cower' ? 1.2 : a.h);
  const px = ox - a.pos.x, pz = oz - a.pos.z;
  const A = dx * dx + dz * dz, Bq = 2 * (px * dx + pz * dz), C = px * px + pz * pz - r * r;
  if (A < 1e-9) return null;
  const disc = Bq * Bq - 4 * A * C; if (disc < 0) return null;
  const s = Math.sqrt(disc); let t = (-Bq - s) / (2 * A); if (t < 0) t = (-Bq + s) / (2 * A); if (t < 0 || t > maxT) return null;
  const y = oy + dy * t; if (y < y0 || y > y1) return null;
  return t;
}

