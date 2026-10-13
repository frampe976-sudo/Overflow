/* =====================================================================
   PLAYER — unité de police robotisée SOLIS (indicatif Saline-17)
   ===================================================================== */
// the robot's hit points: sturdier than a man, and each Constitution badge adds plating
const playerMaxHp = S => 135 + (S.constitution || 0) * 15 + rankK() * 3;
class Player extends Actor {
  constructor(x, z, yaw, slot = 0) {
    super({ kind: 'player', app: slot ? 'hero' + slot : 'hero', team: 'police', hp: 100, x, z, yaw });
    this.isRobot = true; this.slot = slot; // in a brigade (multiplayer), the colour of its strips
    const S = Save.data.stats;
    this.maxHp = this.hp = playerMaxHp(S);
    this.maxStamina = this.stamina = 100 * (1 + S.endurance * 0.15);
    this.dmgOut = 1 + S.force * 0.1 + rankK() * 0.015; this.skill = S.adresse;
    this.inv = { melee: null, pistol: { mag: 12, res: 24 }, shotgun: null, rifle: null, ak: null, uzi: null };
    this.nades = 3; this.nadeT = 0;
    this.cur = 'fists'; this.setWeapon(null);
    this.combo = 0; this.comboT = 0; this.buffer = null; this.bufferT = 0;
    this.coyote = 0; this.jumpBuf = 0; this.airKicked = false; this.rollBuf = 0;
    this.sprinting = false; this.fireCd = 0; this.reloadT = 0; this.firingT = 0; this.staminaCd = 0; this.heat = 0;
    this.prompt = null; this.regenT = 0; this.rollDur = 0.55; this.climbDur = 0.6; this.lockT = null; this.getupDur = 0.6;
    this.hangData = null; this.ladder = null; this.zipD = null; this.car = null; this.arrestT = null;
    this.guardAlways = false; this.lastDir = { x: 0, z: 1 }; this.lowStamina = false;
    this.poiseMax = 60;
    this.lock = null; this.softTarget = null; this.lockSeen = new Set(); this._flick = false; this._mflick = 0; this._flickCd = 0;
  }
  isFirearm() { const w = WEAPONS[this.cur]; return !!(w && w.firearm); }
  knockDown(kx, kz, knock, t) { super.knockDown(kx, kz, knock, Math.min(t, 0.95)); }
  equip(name) {
    if (name === this.cur) return;
    if (name !== 'fists' && name !== this.inv.melee && !this.inv[name]) return;
    this.cur = name; this.setWeapon(name === 'fists' ? null : name); this.reloadT = 0; Snd.play('grab', this.pos, 0.5);
    HUD.weaponChanged();
  }
  hasAmmo(w) { const i = this.inv[w]; return !!i && i.mag + i.res > 0; }
  // firearms with no ammo left drop out of the rotation until more ammo is picked up
  weaponList() { const l = ['fists']; if (this.inv.melee) l.push(this.inv.melee); for (const w of ['pistol', 'uzi', 'shotgun', 'rifle', 'ak']) if (this.hasAmmo(w)) l.push(w); return l; }
  // what to hold once the gun in hand is empty: another loaded gun, else the melee weapon, else fists
  fallbackWeapon() { for (const w of ['ak', 'rifle', 'shotgun', 'uzi', 'pistol']) if (w !== this.cur && this.hasAmmo(w)) return w; return this.inv.melee || 'fists'; }
  dropEmpty() {
    const W = WEAPONS[this.cur]; if (!W || !W.firearm || this.hasAmmo(this.cur)) return;
    const next = this.fallbackWeapon(); this.equip(next);
    HUD.toast(`${W.name} vide`, `→ ${(WEAPONS[next] || WEAPONS.fists).name}`, 'gold');
  }
  cycleWeapon(d) { const l = this.weaponList(); const i = l.indexOf(this.cur); this.equip(l[(i + d + l.length) % l.length]); }
  giveWeapon(w, ammo) {
    const W = WEAPONS[w];
    if (W.melee) { this.inv.melee = w; this.equip(w); return; }
    if (!this.inv[w]) { this.inv[w] = { mag: W.mag, res: Math.max(0, ammo - W.mag) }; if (!this.isFirearm()) this.equip(w); }
    else this.inv[w].res += ammo;
  }
  inputDir() {
    const mx = Input.move.x, my = Input.move.y; const cy = CamCtl.yaw;
    const fx = Math.sin(cy), fz = Math.cos(cy); const rx = -fz, rz = fx;
    let x = fx * my + rx * mx, z = fz * my + rz * mx; const m = Math.hypot(x, z);
    if (m > 1e-3) { x /= m; z /= m; }
    return { x, z, mag: Math.min(1, Input.move.mag) };
  }
  update(dt) {
    const I = Input; Input.ctx.firearm = this.isFirearm(); Input.ctx.car = this.state === 'car'; Input.ctx.carGun = Input.ctx.car && !!this.carWeapon();
    this.fireCd -= dt; this.firingT -= dt; if (this.heat > 0) this.heat = Math.max(0, this.heat - dt * 1.6); if (this.bufferT > 0) this.bufferT -= dt; else this.buffer = null;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.riposteT > 0) this.riposteT -= dt;
    this.prompt = null;
    if (this.inWater) { this.vel.set(0, 0, 0); this.pos.y = Math.max(this.pos.y, WATER_Y - 1.2); this.animate(dt); return; }
    if (this.state === 'car') { this.updateInCar(dt); return; }
    if (this.state === 'dead') { this.updateCommon(dt); this.physics(dt); this.animate(dt); if (this.downed) this.updateDowned(dt); return; }
    // reload
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.finishReload(); }
    // regen out of combat
    // self-repair: quick once the fight is over, slower in cover (nothing hit the robot for 5 s) while it goes on
    if (this.hp < (this._hpPrev === undefined ? this.hp : this._hpPrev) - 0.01) this.hurtT = 0; else this.hurtT = (this.hurtT || 0) + dt;
    if (this.hp < this.maxHp && this.alive) {
      if (this.combatT <= 0) { this.regenT += dt; if (this.regenT > 2.5) this.hp = Math.min(this.maxHp, this.hp + dt * 9 * diffK().regen); }
      else { this.regenT = 0; if (this.hurtT > 5) this.hp = Math.min(this.maxHp, this.hp + dt * 4.5 * diffK().regen); }
    } else this.regenT = 0;
    this._hpPrev = this.hp;
    // stamina: refills whenever the robot is not sprinting (walking, jogging or standing), a bit faster at rest
    if (this.staminaCd > 0) this.staminaCd -= dt;
    else this.stamina = Math.min(this.maxStamina, this.stamina + dt * (this.speedNow > 2.5 ? 26 : 34) * (1 + Save.data.stats.endurance * 0.15));
    if (I.pressed.next) this.cycleWeapon(1); if (I.pressed.prev) this.cycleWeapon(-1);
    if (I.digit) { const l = this.weaponList(); if (l[I.digit - 1]) this.equip(l[I.digit - 1]); I.digit = 0; }
    if (I.pressed.holster) this.equip('fists');
    if (I.pressed.reload) this.startReload();
    if (I.pressed.jump) this.jumpBuf = 0.16; else this.jumpBuf -= dt;
    if (I.pressed.dodge) this.rollBuf = 0.25; else this.rollBuf -= dt;
    this.updateTargeting(dt);
    this.updateThrow(dt); this.updateNade(dt);
    if (this.state === 'down' && this.st > 0.3 && (I.pressed.jump || I.pressed.dodge || I.pressed.punch || I.pressed.kick || I.pressed.block || I.pressed.action)) this.downT = 0; // quick get-up
    const handled = this.updateCommon(dt);
    if (this.state === 'attack') this.attackBuffering(dt);
    if (!handled) {
      switch (this.state) {
        case 'move': this.updateMove(dt); break;
        case 'air': this.updateAir(dt); break;
        case 'hang': this.updateHang(dt); break;
        case 'climb': case 'vault': this.updateClimb(dt); break;
        case 'ladder': this.updateLadder(dt); break;
        case 'fence': this.updateFence(dt); break;
        case 'zip': this.updateZip(dt); break;
        case 'roll': this.updateRoll(dt); break;
        case 'arresting': if (this.reviveTgt) this.updateRevive(dt); else this.updateArrest(dt); break;
      }
    }
    if (this.state === 'down' && this.st > 0.6 && I.pressed.jump) this.st = Math.max(this.st, this.downT); // quick get up
    const noPhys = this.state === 'hang' || this.state === 'climb' || this.state === 'vault' || this.state === 'ladder' || this.state === 'zip' || this.state === 'fence';
    if (!noPhys) this.physics(dt);
    if (this.state === 'move' && !this.grounded && this.vel.y < -1) { this.setState('air'); this.coyote = 0.12; }
    if (this.state === 'air' && this.grounded) this.setState('move');
    this.animate(dt);
    this.updatePrompt();
  }
  onLand(vy) {
    if (this.rollBuf > 0 && vy < -9 && this.state !== 'down') { this.setState('roll'); this.rollDur = 0.5; this.iframe = 0.35; this.rollDirX = this.fwdX(); this.rollDirZ = this.fwdZ(); Snd.play('land', this.pos, 0.6); HUD.toast('Roulade de réception', '', 'gold', true); return; }
    super.onLand(vy);
    if (vy < -12 && this.state !== 'down' && this.state !== 'dead') { this.visY = -0.15; CamCtl.shake(0.2); }
    this.airKicked = false;
  }
  fallDamage(vy) { if (this.state === 'roll') return; super.fallDamage(vy); }
  onWater() {
    if (this.inWater) return; this.inWater = true;
    FX.splash(this.pos.x, WATER_Y, this.pos.z); Snd.play('splash', this.pos, 1);
    Game.playerFellInWater();
  }
  /* ---------------- ground movement ---------------- */
  updateMove(dt) {
    const I = Input, d = this.inputDir();
    const fire = this.isFirearm();
    this.aiming = fire && I.held.aim && !this.nadeAim;
    const wasBlocking = this.blocking;
    this.blocking = !fire && I.held.block && this.grounded;
    if (this.blocking && !wasBlocking) this.parryT = 0.2;
    if (this.blocking) this.combatT = Math.max(this.combatT, 1);
    // sprint
    this.sprinting = I.held.sprint && d.mag > 0.4 && !this.aiming && !this.blocking && this.stamina > 0 && !this.lowStamina;
    if (this.sprinting) {
      this.stamina -= dt * 16; this.staminaCd = 0.45;
      if (this.stamina <= 0) { this.stamina = 0; this.lowStamina = true; this.sprinting = false; Input.sprintToggle = false; Input.touch.sprint = false; } // out of breath: the sprint switches off
    }
    // sprint again once a bit has come back and the sprint input was let go (a held key must be pressed again)
    if (this.lowStamina && this.stamina > 20 && !I.held.sprint) this.lowStamina = false;
    let spd = d.mag < 0.55 ? 2.1 * d.mag / 0.55 : lerp(2.1, 5.1, (d.mag - 0.55) / 0.45);
    if (this.sprinting) spd = 7.4 * (1 + Save.data.stats.endurance * 0.03);
    if (this.aiming || this.nadeAim) spd = Math.min(spd, 2.6); if (this.blocking) spd = Math.min(spd, 1.3); if (this.throwT >= 0) spd = Math.min(spd, 1.6);
    this.steer(d.x, d.z, d.mag > 0.05 ? spd : 0, this.grounded ? 34 : 8, dt);
    // facing
    if (this.aiming || (fire && this.firingT > 0 && Input.device === 'kbm')) { this.yaw = dampAngle(this.yaw, CamCtl.yaw, 22, dt); this.aimPitch = damp(this.aimPitch, clamp(-CamCtl.pitch * 0.8 + 0.1, -0.7, 0.7), 14, dt); }
    else if (this.nadeAim && this.nadeT > 0.2) { this.yaw = dampAngle(this.yaw, CamCtl.yaw, 18, dt); }
    else if (this.throwT >= 0 && this.throwYaw !== undefined) { this.yaw = dampAngle(this.yaw, this.throwYaw, 20, dt); }
    else {
      if (!(fire && this.firingT > 0)) this.aimPitch = damp(this.aimPitch, 0, 6, dt);
      if (this.lockOk() && !this.sprinting) { const L = this.lock; this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, L.pos.x, L.pos.z), 12, dt); if (d.mag > 0.05) this.lastDir = d; }
      else if (d.mag > 0.05) { this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), this.blocking ? 6 : 14, dt); this.lastDir = d; }
    }
    if (this.lockT && fire && this.lockT.alive && !this.lockT.down) { this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, this.lockT.pos.x, this.lockT.pos.z), 18, dt); }
    this.coyote = 0.12;
    // jump / vault
    if (this.jumpBuf > 0) {
      this.jumpBuf = 0;
      const fe = this.findFence(0.9); if (fe) { this.startFence(fe); return; }
      const cv = d.mag > 0.3 ? this.findCarVault(0.9, d.x, d.z) : this.findCarVault(0.9); if (cv) { this.startCarVault(cv); return; }
      const v = this.findVault(0.9);
      if (v) this.startVault(v); else this.jump();
      return;
    }
    // auto-vault when sprinting into a low obstacle
    if (this.sprinting) { const v = this.findVault(0.55); if (v && v.rel > 0.5) { this.startVault(v); return; } const fe = this.findFence(0.3); if (fe) { this.startFence(fe); return; } }
    if (this.rollBuf > 0 && !this.aiming) { this.rollBuf = 0; this.startRoll(d); return; }
    // interactions
    if (I.pressed.action) { if (this.tryInteract()) return; const fe = this.findFence(0.7); if (fe) { this.startFence(fe); return; } }
    // attacks
    if (I.pressed.punch) { this.meleePress('punch'); return; }
    if (I.pressed.kick) { this.meleePress('kick'); return; }
    if (fire && !this.nadeAim && !(this.throwT >= 0)) {
      const W = WEAPONS[this.cur];
      if ((W.auto && I.held.fire) || I.pressed.fire) this.fire();
      // pad lock-on while aiming
      if (this.aiming && Input.device !== 'kbm') { if (this.lockOk() && !this.lock.down) this.lockT = this.lock; else if (!this.lockT || !this.lockT.alive || this.lockT.down || Input.pressed.aim) this.lockT = this.pickShootTarget(CamCtl.yaw, 0.5, 35); }
      else this.lockT = null;
    }
  }
  jump() {
    this.vel.y = 6.5; this.grounded = false; this.setState('air'); this.airKicked = false;
    if (this.sprinting) { // long jump: guarantee a good take-off speed
      const hs = Math.hypot(this.vel.x, this.vel.z), want = Math.max(hs + 0.8, 7.6);
      this.vel.x = this.fwdX() * want; this.vel.z = this.fwdZ() * want;
    }
    Snd.play('jump', this.pos, 0.5);
  }
  startRoll(d) {
    if (this.stamina < 12) return; this.stamina -= 12; this.staminaCd = 0.6;
    const dx = d.mag > 0.1 ? d.x : this.fwdX(), dz = d.mag > 0.1 ? d.z : this.fwdZ();
    this.rollDirX = dx; this.rollDirZ = dz; this.yaw = Math.atan2(dx, dz); this.rollDur = 0.55;
    this.setState('roll'); this.iframe = 0.38; this.blocking = false; this.aiming = false; this._pd = false; Snd.play('whoosh', this.pos, 0.5);
  }
  // rolled out of a blow at the last instant: time slows, the robot gets his breath back and a riposte
  perfectDodge(src) {
    this._pd = true; this.riposteT = 2.5; this.stamina = Math.min(this.maxStamina, this.stamina + 35); this.combatT = 6;
    Game.slowmo(0.55, 0.3); Game.award(100, this.pos, 'ESQUIVE PARFAITE', 'feat'); Snd.play('perfect', this.pos, 0.8); Render.post.extraFlash = 0.07;
    FX.ring(this.pos.x, this.pos.y + 0.05, this.pos.z, 1.3, [0.2, 1, 0.75], 0.45); Input.rumble(0.3, 0.5, 140);
  }
  updateRoll(dt) {
    const u = this.st / this.rollDur; const s = u < 0.75 ? 7.8 : 3;
    this.vel.x = this.rollDirX * s; this.vel.z = this.rollDirZ * s;
    if (this.st >= this.rollDur) { this.setState(this.grounded ? 'move' : 'air'); const P2 = this.pose; P2[J('hips', 0)] = wrapAngle(P2[J('hips', 0)]); }
  }
  /* ---------------- melee ---------------- */
  meleePress(kind) {
    const d = this.inputDir();
    const W = this.cur;
    let name;
    if (kind === 'punch') {
      if (W === 'bat') name = 'batSwing'; else if (W === 'knife') name = 'stab'; else if (this.isFirearm()) name = 'butt';
      else { name = ['jab', 'cross', 'hook'][this.combo % 3]; }
    } else {
      if (!this.grounded) name = 'airKick';
      else if (this.sprinting && this.speedNow > 5.5) name = 'flyKick';
      else if (this.combo >= 2) name = 'spinKick';
      else name = 'kick';
    }
    if (name === 'airKick' && this.airKicked) return;
    const dirX = d.mag > 0.2 ? d.x : this.fwdX(), dirZ = d.mag > 0.2 ? d.z : this.fwdZ();
    const L = this.lockOk() && !this.lock.aim && !this.lock.down && this.lock.state !== 'surrender' ? this.lock : null;
    const reach = name === 'flyKick' ? 8 : 4.6;
    const tg = L && dist2D(this.pos.x, this.pos.z, L.pos.x, L.pos.z) < reach && Math.abs(L.pos.y - this.pos.y) < 1.3 ? L : this.pickTarget(dirX, dirZ, name === 'flyKick' ? 7 : 3.8, 1.2);
    if (!tg && d.mag > 0.2) this.yaw = Math.atan2(dirX, dirZ);
    this.blocking = false; this.aiming = false;
    this.startAttack(name, tg);
    if (name === 'airKick') { this.airKicked = true; this.vel.y = Math.max(this.vel.y, 2.5); this.noGravityT = 0.2; }
    if (name === 'flyKick') { this.vel.y = 3.2; this.grounded = false; }
    if (kind === 'punch' && !WEAPONS[W || 'fists']?.firearm && W !== 'bat' && W !== 'knife') this.combo++;
    else if (kind === 'kick' && name === 'spinKick') this.combo = 0;
    this.comboT = 1.1; this.combatT = 5;
  }
  attackBuffering(dt) {
    const A = this.atk; if (!A) return;
    if (Input.pressed.punch) { this.buffer = 'punch'; this.bufferT = 0.4; }
    if (Input.pressed.kick) { this.buffer = 'kick'; this.bufferT = 0.4; }
    if (Input.pressed.dodge && A.t > A.d.hit) { this.atk = null; this.visYaw = 0; this.startRoll(this.inputDir()); return; }
    if (this.buffer && A.t >= (A.d.cancel || A.d.dur * 0.7) && this.grounded) { const b = this.buffer; this.buffer = null; this.atk = null; this.visYaw = 0; this.setState('move'); this.meleePress(b); }
  }
  onAttackEnd(A) { if (!A.connected && this.combo > 0 && A.name !== 'jab') { /* keep combo */ } }
  pickTarget(dx, dz, maxD, maxAng) {
    let best = null, bs = 1e9; const a0 = Math.atan2(dx, dz);
    for (const a of Game.actors) {
      if (a === this || !a.hittable || a.down || a.team === 'police' || a.team === 'civ' || a.state === 'surrender') continue;
      const ex = a.pos.x - this.pos.x, ez = a.pos.z - this.pos.z, ey = a.pos.y - this.pos.y; if (Math.abs(ey) > 1.3) continue;
      const d = Math.hypot(ex, ez); if (d > maxD) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(ex, ez) - a0)); if (ang > maxAng) continue;
      const s = d + ang * 2.2; if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  pickShootTarget(yaw, maxAng, maxD) {
    let best = null, bs = 1e9;
    for (const a of Game.actors) {
      if (!a.hittable || a.team === 'police' || a.team === 'civ' || a.down || a.state === 'surrender') continue;
      const ex = a.pos.x - this.pos.x, ez = a.pos.z - this.pos.z; const d = Math.hypot(ex, ez); if (d > maxD) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(ex, ez) - yaw)); if (ang > maxAng) continue;
      if (!World.los(this.pos, a.pos, 1.5, 1.2)) continue;
      const s = ang * 12 + d * 0.15 - (a.hostile ? 2 : 0); if (s < bs) { bs = s; best = a; }
    }
    for (const a of Game.aimables) {
      if (!a.alive) continue; const ex = a.pos.x - this.pos.x, ez = a.pos.z - this.pos.z, d = Math.hypot(ex, ez); if (d > maxD) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(ex, ez) - yaw)); if (ang > maxAng) continue;
      if (!World.los(this.pos, a.pos, 1.5, a.aimY - a.pos.y)) continue;
      const s = ang * 12 + d * 0.15; if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  /* ---------------- grenades ---------------- */
  // hold the grenade button: the arc of the throw is drawn; let go: throw. A quick tap throws at the target ahead.
  updateNade(dt) {
    const I = Input, free = this.state === 'move' || this.state === 'air';
    if (this.throwT >= 0 && !this.thrown && !free) { this.throwT = -1; this.nades++; HUD.nadesChanged(); } // knocked out of the throw: keeps it
    if (I.pressed.nade && free && !this.nadeAim && !(this.throwT >= 0)) {
      if (this.nades > 0) { this.nadeAim = true; this.nadeT = 0; this.blocking = false; }
      else if (!this._noNadeT || performance.now() - this._noNadeT > 1500) { this._noNadeT = performance.now(); HUD.toast('Plus de grenades', '', 'bad', true); Snd.play('empty', this.pos); }
    }
    if (!this.nadeAim) return;
    if (!free || this.nades <= 0) { this.nadeAim = false; return; }
    this.nadeT += dt; this.combatT = Math.max(this.combatT, 2);
    const quick = this.nadeT < 0.2, o = this.nadeOrigin(), v = this.nadeVel(quick, o);
    this.nadeArc = quick ? null : { o, v }; // drawn by Nades.render()
    if (!I.held.nade) {
      this.throwYaw = Math.atan2(v[0], v[2]); this.yaw = quick ? this.throwYaw : this.yaw;
      this.startThrow(v[0], v[1], v[2]); this.nades--; HUD.nadesChanged(); Combat.noise(this.pos.x, this.pos.z, 12, this);
    }
  }
  // where the grenade leaves the hand (over the right shoulder, a little forward)
  nadeOrigin() {
    const s = this.app.scale || 1, y = this.nadeT > 0.2 ? CamCtl.yaw : this.yaw, fx = Math.sin(y), fz = Math.cos(y);
    return { x: this.pos.x + (-0.24 * fz + 0.34 * fx) * s, y: this.pos.y + 1.84 * s, z: this.pos.z + (0.24 * fx + 0.34 * fz) * s };
  }
  nadeVel(quick, o) {
    if (quick) { // at the locked / nearest threat ahead, leading a little; else a short lob forward
      const t = this.lockOk() && !this.lock.aim ? this.lock : this.softTarget && this.softTarget.alive ? this.softTarget : this.pickShootTarget(Input.device === 'kbm' ? CamCtl.yaw : this.yaw, 0.7, 24);
      if (t && t.pos && dist2D(t.pos.x, t.pos.z, this.pos.x, this.pos.z) > 2.5) { const lv = t.vel || { x: 0, z: 0 }; return Nades.aimAt(o.x, o.y, o.z, t.pos.x + lv.x * 0.7, t.pos.y, t.pos.z + lv.z * 0.7); }
      const fy = Input.device === 'kbm' ? CamCtl.yaw : this.yaw, p = 0.62, sp = 11;
      return [Math.sin(fy) * Math.cos(p) * sp, Math.sin(p) * sp, Math.cos(fy) * Math.cos(p) * sp];
    }
    // aimed with the camera: looking up throws farther
    const p = clamp(-CamCtl.pitch + 0.52, -0.25, 1.15), sp = 17, y = CamCtl.yaw;
    return [Math.sin(y) * Math.cos(p) * sp, Math.sin(p) * sp, Math.cos(y) * Math.cos(p) * sp];
  }
  /* ---------------- firearms ---------------- */
  fire() {
    const W = WEAPONS[this.cur], inv = this.inv[this.cur]; if (!inv) return;
    if (this.reloadT > 0 || this.fireCd > 0) return;
    if (inv.mag <= 0) { Snd.play('empty', this.pos); this.fireCd = 0.3; if (inv.res > 0) this.startReload(); else this.dropEmpty(); return; }
    inv.mag--; this.fireCd = W.rof; this.firingT = 0.6; this.combatT = 6;
    const mz = this.shotOrigin(this.pos.x + Math.sin(this.yaw) * 10, this.pos.z + Math.cos(this.yaw) * 10, this._so || (this._so = new V3())); // the real gun, never through a wall
    let dx, dy, dz;
    const kbmAim = Input.device === 'kbm';
    let tgt = null;
    if (kbmAim) {
      const c = Cam.pos, f = Cam.fwd;
      // light magnetism: a target very close to the crosshair ray gets the shot
      if (this.lockOk() && !this.lock.down && World.los(this.pos, this.lock.pos, 1.5, this.lock.aim ? this.lock.aimY - this.lock.pos.y : 1.2)) tgt = this.lock;
      else if (Save.data.options.aimAssist) { tgt = this.pickShootTarget(CamCtl.yaw, this.aiming ? 0.05 : 0.08, 40); }
      if (tgt) { const ty = tgt.aim ? tgt.aimY : tgt.pos.y + (tgt.state === 'surrender' ? 0.9 : 1.25); dx = tgt.pos.x - mz.x; dy = ty - mz.y; dz = tgt.pos.z - mz.z; }
      else { const hit = Combat.shootProbe(c.x + f.x * 1.5, c.y + f.y * 1.5, c.z + f.z * 1.5, f.x, f.y, f.z, 90, this); dx = hit.x - mz.x; dy = hit.y - mz.y; dz = hit.z - mz.z; }
      this.yaw = CamCtl.yaw;
    } else {
      tgt = this.lockOk() && !this.lock.down ? this.lock : (this.lockT && this.lockT.alive && !this.lockT.down) ? this.lockT : this.pickShootTarget(Save.data.options.aimAssist ? (Input.device === 'touch' ? this.yaw : CamCtl.yaw) : CamCtl.yaw, Save.data.options.aimAssist ? 0.62 : 0.2, 32);
      if (!tgt && Save.data.options.aimAssist) tgt = this.pickShootTarget(this.yaw, 0.9, 22);
      if (tgt) { const ty = tgt.aim ? tgt.aimY : tgt.pos.y + (tgt.state === 'surrender' ? 0.9 : 1.25); dx = tgt.pos.x - mz.x; dy = ty - mz.y; dz = tgt.pos.z - mz.z; this.yaw = angleTo(this.pos.x, this.pos.z, tgt.pos.x, tgt.pos.z); this.aimPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)) * 0.8, -0.6, 0.6); }
      else { const p = -CamCtl.pitch * 0.5; dx = Math.sin(this.yaw) * Math.cos(p); dy = Math.sin(p); dz = Math.cos(this.yaw) * Math.cos(p); this.aimPitch = clamp(p * 0.6, -0.4, 0.4); }
    }
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const moving = this.speedNow > 2.5;
    // sustained fire climbs: short bursts stay on target (the AK most of all)
    const spread = W.spread * (this.aiming ? 0.55 : 1) * (1 - this.skill * 0.08) * (moving ? 1.4 : 1) * (1 + Math.min(1, this.heat) * 0.75);
    this.heat = Math.min(1.3, this.heat + (W.bloom || 0));
    for (let p = 0; p < W.pellets; p++) {
      const sx = (Math.random() - 0.5) * 2 * spread, sy = (Math.random() - 0.5) * 2 * spread;
      const rx = -dz, rz = dx; // perpendicular horizontal
      let ex = dx + rx * sx, ey = dy + sy, ez = dz + rz * sx; const l2 = Math.hypot(ex, ey, ez); ex /= l2; ey /= l2; ez /= l2;
      const r = Combat.shoot(this, mz.x, mz.y, mz.z, ex, ey, ez, W.range, W.dmg * (1 + this.skill * 0.05), { knock: W.pellets > 1 ? 2.5 : 1.5, pen: W.pen, fall: W.fall });
      FX.tracer(mz.x, mz.y, mz.z, r.x, r.y, r.z, [1, 0.85, 0.55]);
      Game.stats.shots++; if (r.actor) Game.stats.hits++;
    }
    FX.muzzle(mz.x, mz.y, mz.z, this.yaw); Lights.add(mz.x, mz.y, mz.z, 3.5, 2.4, 1.2, 9, 0.06, 'muzzleP'); if (W.part !== 'shotgun' || !W.pellets) FX.casing(mz.x - this.fwdX() * 0.3, mz.y, mz.z - this.fwdZ() * 0.3, this.yaw);
    Snd.play(W.snd, this.pos, 1); CamCtl.shake(W.pellets > 1 ? 0.3 : W.part === 'ak' ? 0.16 : 0.12); CamCtl.kick(W.pellets > 1 ? 0.035 : W.part === 'ak' ? 0.012 : W.auto ? 0.008 : 0.014); Input.rumble(0.35, 0.6, 70);
    this.an.recoil(W.kick || (W.pellets > 1 ? 1.3 : W.long ? 0.8 : 0.6));
    Combat.noise(this.pos.x, this.pos.z, 45, this);
    if (inv.mag === 0 && inv.res > 0) setTimeout(() => { if (this.inv[this.cur] === inv && inv.mag === 0) this.startReload(); }, 250);
    else if (inv.mag === 0) { const w = this.cur; setTimeout(() => { if (this.cur === w && !this.hasAmmo(w) && this.alive) this.dropEmpty(); }, 420); }
  }
  startReload() {
    const inv = this.inv[this.cur]; if (!inv || this.reloadT > 0) return; const W = WEAPONS[this.cur];
    if (inv.mag >= W.mag || inv.res <= 0) return;
    this.reloadT = W.reload * (1 - this.skill * 0.08); Snd.play('reload', this.pos, 0.8); this.reloadWeapon = this.cur;
  }
  finishReload() { const inv = this.inv[this.reloadWeapon]; if (!inv) return; const W = WEAPONS[this.reloadWeapon]; const n = Math.min(W.mag - inv.mag, inv.res); inv.mag += n; inv.res -= n; }
  /* ---------------- air / ledges ---------------- */
  updateAir(dt) {
    const d = this.inputDir();
    if (this.noGravityT > 0) { this.noGravityT -= dt; this.vel.y = Math.max(this.vel.y, 0); }
    const cur = Math.hypot(this.vel.x, this.vel.z); const maxS = Math.max(cur, 4.5);
    if (d.mag > 0.05) { this.steer(d.x, d.z, Math.min(maxS, 5.5 * d.mag + 0.5), 9, dt); this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), 5, dt); }
    this.coyote -= dt;
    if (this.jumpBuf > 0 && this.coyote > 0 && this.vel.y <= 0.5) { this.jumpBuf = 0; this.jump(); return; }
    if (Input.pressed.kick && !this.airKicked) { this.meleePress('kick'); return; }
    // zip line grab
    const z = this.findZip(0.5); if (z) { this.startZip(z.zip, z.t); return; }
    // ledge / mantle from wall contacts
    for (let i = 0; i < this.nContacts; i++) {
      const c = this.contacts[i]; const b = c.box;
      if (b && b.kind === 'fence' && this.vel.y < 4) { const fe = this.findFence(0.5); if (fe) { this.startFence(fe); return; } }
      if (!b || b.kind === 'pole' || b.kind === 'post' || b.kind === 'fence' || b.kind === 'bound') continue;
      const into = -(c.nx * (d.mag > 0.1 ? d.x : this.vel.x) + c.nz * (d.mag > 0.1 ? d.z : this.vel.z));
      if (into <= 0.1) continue;
      const rel = b.y1 - this.pos.y;
      if (rel > 2.65 || rel < 0.3) continue;
      if (this.vel.y > 5.5) continue;
      const g = this.ledgeInfo(b, c.nx, c.nz); if (!g) continue;
      if (rel < 1.15) { this.startVault({ box: b, nx: c.nx, nz: c.nz, top: b.y1, rel, thin: g.thin, over: g.over, wx: g.wx, wz: g.wz }); return; }
      this.startHang(b, c.nx, c.nz, g); return;
    }
  }
  // info about the ledge top: can we stand on it? wall point
  ledgeInfo(b, nx, nz) {
    const wx = clamp(this.pos.x, b.x0, b.x1), wz = clamp(this.pos.z, b.z0, b.z1);
    const depth = nx !== 0 ? (b.x1 - b.x0) : (b.z1 - b.z0);
    const thin = depth < 0.7;
    const inX = wx - nx * (thin ? depth / 2 : 0.45), inZ = wz - nz * (thin ? depth / 2 : 0.45);
    const top = World.groundAt(inX, inZ, 0.25, b.y1 + 0.2);
    if (top > b.y1 + 0.1) return null;
    const ceil = World.ceilingAt(inX, inZ, 0.25, b.y1 + 0.05); if (ceil < b.y1 + 1.8) return null;
    let over = null;
    if (thin) { const ox = wx - nx * (depth + 0.55), oz = wz - nz * (depth + 0.55); const g2 = World.groundAt(ox, oz, 0.3, b.y1 + 0.5); over = { x: ox, z: oz, y: g2 }; }
    return { wx, wz, thin, over };
  }
  findVault(reach) {
    const fx = this.fwdX(), fz = this.fwdZ();
    const q = World.query(this.pos.x - 1.6, this.pos.z - 1.6, this.pos.x + 1.6, this.pos.z + 1.6, []);
    let best = null;
    for (const b of q) {
      if (b.kind === 'pole' || b.kind === 'post' || b.kind === 'slab' || b.kind === 'fence' || b.kind === 'bound') continue;
      const rel = b.y1 - this.pos.y; if (rel < 0.45 || rel > 1.4) continue;
      if (b.y0 > this.pos.y + 0.5) continue;
      // distance along facing to the box
      const px = this.pos.x + fx * (this.r + reach), pz = this.pos.z + fz * (this.r + reach);
      if (px < b.x0 - 0.05 || px > b.x1 + 0.05 || pz < b.z0 - 0.05 || pz > b.z1 + 0.05) continue;
      // wall normal: side we approach from
      const cx = clamp(this.pos.x, b.x0, b.x1), cz = clamp(this.pos.z, b.z0, b.z1);
      let nx = this.pos.x - cx, nz = this.pos.z - cz; const l = Math.hypot(nx, nz); if (l < 1e-4) continue; nx /= l; nz /= l;
      if (Math.abs(nx) > Math.abs(nz)) { nx = Math.sign(nx); nz = 0; } else { nz = Math.sign(nz); nx = 0; }
      const g = this.ledgeInfo(b, nx, nz); if (!g) continue;
      if (!best || rel < best.rel) best = { box: b, nx, nz, top: b.y1, rel, thin: g.thin, over: g.over, wx: g.wx, wz: g.wz };
    }
    return best;
  }
  // a car alongside, crossed from one side to the other: over the hood, the boot or the roof
  findCarVault(reach, fx = this.fwdX(), fz = this.fwdZ()) {
    if (!this.grounded || !Cars.list.length) return null;
    let best = null, bd = 1e9;
    for (const c of Cars.list) {
      if (c.removed || c.sinking || c.T.van || c.driver === this || Math.abs(c.speed || 0) > 4) continue;
      if (Math.abs(c.pos.y - this.pos.y) > 0.7) continue;
      const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z; if (dx * dx + dz * dz > 30) continue;
      const rx = -c.fz, rz = c.fx, lf = dx * c.fx + dz * c.fz, ls = dx * rx + dz * rz, hl = c.len / 2, hw = c.wid / 2;
      const side = ls >= 0 ? 1 : -1, gap = Math.abs(ls) - hw - this.r; // from the robot's body to the car's flank
      if (gap > reach || gap < -0.3 || Math.abs(lf) > hl - 0.3) continue;
      if (-(fx * rx + fz * rz) * side < 0.55) continue; // facing across the car
      const top = c.pos.y + Cars.surfH(c, clamp(lf / hl, -1, 1), 0); if (top - this.pos.y > 1.6) continue;
      const off = hw + this.r + 0.45, ex = c.pos.x + c.fx * lf - rx * side * off, ez = c.pos.z + c.fz * lf - rz * side * off;
      const ey = World.groundAt(ex, ez, this.r * 0.72, top + 0.2); if (ey < this.pos.y - 1.3 || ey > this.pos.y + 0.5) continue;
      const q = World.query(ex - this.r, ez - this.r, ex + this.r, ez + this.r, []);
      if (q.some(b => !b.off && b.kind !== 'awning' && b.y1 > ey + 0.35 && b.y0 < ey + 1.8)) continue; // a wall right behind it
      if (Cars.topAt(ex, ez, this.r + 0.3, 99) > -1e8) continue; // another car right behind it
      if (gap < bd) { bd = gap; best = { car: c, top, ex, ey, ez, nx: rx * side, nz: rz * side, ls: Math.abs(ls), hw }; }
    }
    return best;
  }
  startCarVault(v) {
    this.setState('vault'); this.carVault = v.car;
    const L = Math.hypot(v.ex - this.pos.x, v.ez - this.pos.z) || 1, hi = v.top - this.pos.y > 1.2;
    this.climbDur = clamp(L / 5.2, 0.55, 0.85) * (hi ? 1.12 : 1);
    this.climbS = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
    this.climbE = { x: v.ex, y: v.ey, z: v.ez, over: true, car: v.car, top: v.top, pe: clamp((v.ls - v.hw - this.r * 0.5) / L, 0.12, 0.45), pf: clamp((v.ls + v.hw) / L, 0.55, 0.9) };
    this.yaw = Math.atan2(-v.nx, -v.nz); this.vel.set(0, 0, 0); Snd.play('grab', this.pos, 0.5); Snd.play('clank', this.pos, 0.25, 1.3);
  }
  startVault(v) {
    this.setState('vault'); this.climbDur = v.rel > 0.9 ? 0.5 : 0.38;
    const s = this.climbS = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
    if (v.thin && v.over) this.climbE = { x: v.over.x, y: Math.max(v.over.y, v.top - 3), z: v.over.z, over: true, top: v.top };
    else this.climbE = { x: v.wx - v.nx * 0.5, y: v.top, z: v.wz - v.nz * 0.5, top: v.top };
    this.yaw = Math.atan2(-v.nx, -v.nz); this.vel.set(0, 0, 0); Snd.play('grab', this.pos, 0.6);
  }
  startHang(b, nx, nz, g) {
    const depth = nx !== 0 ? b.x1 - b.x0 : b.z1 - b.z0;
    this.setState('hang'); this.hangData = { box: b, nx, nz, top: b.y1, thin: g.thin, over: g.over, px: g.wx, pz: g.wz, depth: g.thin ? depth : 0 };
    this.pos.x = g.wx + nx * (this.r + 0.04); this.pos.z = g.wz + nz * (this.r + 0.04); this.pos.y = b.y1 - 2.06; this.visY = 0;
    this.yaw = Math.atan2(-nx, -nz); this.vel.set(0, 0, 0); Snd.play('grab', this.pos, 0.8); Input.rumble(0.2, 0.3, 60);
  }
  updateHang(dt) {
    const H = this.hangData, I = Input; const d = this.inputDir();
    const into = -(H.nx * d.x + H.nz * d.z) * d.mag;
    const tx = -H.nz, tz = H.nx; // tangent along wall
    const side = (tx * d.x + tz * d.z) * d.mag;
    if (this.jumpBuf > 0 || into > 0.5) { this.jumpBuf = 0; this.startClimbUp(); return; }
    if (into < -0.6 && this.st > 0.25 || this.rollBuf > 0) { this.rollBuf = 0; this.setState('air'); this.pos.x += H.nx * 0.2; this.pos.z += H.nz * 0.2; this.vel.set(H.nx * 1.5, 0, H.nz * 1.5); return; }
    if (Math.abs(side) > 0.3) {
      const b = H.box; const nx = this.pos.x + tx * Math.sign(side) * 1.4 * dt, nz = this.pos.z + tz * Math.sign(side) * 1.4 * dt;
      const along = H.nx !== 0 ? clamp(nz, b.z0 + 0.3, b.z1 - 0.3) : clamp(nx, b.x0 + 0.3, b.x1 - 0.3);
      if (H.nx !== 0) this.pos.z = along; else this.pos.x = along;
      this.shimmy = Math.sign(side);
    } else this.shimmy = 0;
    this.prompt = { a: 'jump', t: 'Se hisser' };
  }
  startClimbUp() {
    const H = this.hangData; this.setState('climb'); this.visY = 0;
    this.climbS = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
    if (H.thin && H.over) { // a thin wall: over it and down the other side
      const K = OVER.pel[OVER.pel.length - 1], s = this.app.scale || 1;
      this.climbMode = 'over'; this.climbDur = OVER.dur; this.climbE = { f: K[1] * s + H.depth, y: H.top + (K[2] - 0.975) * s };
    } else { this.climbMode = 'mantle'; this.climbDur = MANTLE.dur; this.climbE = { f: 0.5, y: H.top }; }
    Snd.play('grab', this.pos, 0.6);
  }
  // hang -> top (mantle), over a thin wall, on and off the top of a ladder: the root follows the pelvis of the move
  updateClimb(dt) {
    if (this.state === 'vault') { this.updateVault(dt); return; }
    const H = this.hangData, S = this.climbS, E = this.climbE, s = this.app.scale || 1, mode = this.climbMode;
    const u = clamp(this.st / this.climbDur, 0, 1), rev = mode === 'ladDown';
    const K = mode === 'over' ? OVER : mode === 'mantle' ? MANTLE : LADTOP;
    const dep = mode === 'over' ? H.depth || 0 : 0, sh = f => f + dep * smoothstep(-0.25 * s, 0.25 * s, f);
    const d0 = (S.x - H.px) * H.nx + (S.z - H.pz) * H.nz, bx = S.x - H.nx * d0, bz = S.z - H.nz * d0;
    const k0 = track(K.pel, rev ? 1 : 0, [0, 0]), k1 = track(K.pel, rev ? 0 : 1, [0, 0]); track(K.pel, rev ? 1 - u : u, _tk);
    const w = smooth01(u);
    const offF = lerp(sh(k0[0] * s) + d0, sh(k1[0] * s) - E.f, w), offY = lerp(k0[1] * s - (S.y - H.top), k1[1] * s - (E.y - H.top), w);
    const f = sh(_tk[0] * s) - offF, y = H.top + _tk[1] * s - offY;
    let lx = bx, lz = bz; if (rev) { const L = H.ladder, k = smoothstep(0, 0.45, u); lx = lerp(bx, L.x, k); lz = lerp(bz, L.z, k); }
    this.pos.set(lx - H.nx * f, y, lz - H.nz * f);
    if (u < 1) return;
    if (mode === 'over') { this.setState('air'); this.vel.set(-H.nx * 1.3, -0.6, -H.nz * 1.3); this.grounded = false; this.coyote = 0; }
    else if (rev) { const L = H.ladder; this.ladder = L; this.pos.set(L.x + L.nx * 0.42, L.y1 - 1.55, L.z + L.nz * 0.42); this.setState('ladder'); this.climbDir = -1; }
    else { this.pos.y = H.top; this.grounded = true; this.vel.set(0, 0, 0); this.setState('move'); }
  }
  // low obstacles: vault over (or onto) them
  updateVault(dt) {
    const u = clamp(this.st / this.climbDur, 0, 1), S = this.climbS, E = this.climbE;
    if (E.car) { // up onto the car's flank, legs tucked across its top, down the far side
      const T = E.top - 0.2; let y;
      if (u < E.pe) y = lerp(S.y, T, Math.sin(u / E.pe * Math.PI / 2));
      else if (u < E.pf) y = T + Math.sin((u - E.pe) / (E.pf - E.pe) * Math.PI) * 0.08;
      else { const k = (u - E.pf) / (1 - E.pf); y = lerp(T, E.y, k * k); }
      this.pos.set(lerp(S.x, E.x, u), y, lerp(S.z, E.z, u));
      if (u >= 1) {
        const L = Math.hypot(E.x - S.x, E.z - S.z) || 1; this.pos.set(E.x, E.y, E.z); this.grounded = true; this.carVault = null;
        this.vel.set((E.x - S.x) / L * 2.5, 0, (E.z - S.z) / L * 2.5); this.setState('move'); Snd.play('land', this.pos, 0.45);
      }
      return;
    }
    if (E.over) {
      // up to top, then over and let gravity finish
      if (u < 0.6) { const k = smooth01(u / 0.6); this.pos.set(S.x + (E.x - S.x) * 0.35 * k, lerp(S.y, E.top + 0.15, k), S.z + (E.z - S.z) * 0.35 * k); }
      else { const k = smooth01((u - 0.6) / 0.4); this.pos.set(lerp(S.x + (E.x - S.x) * 0.35, E.x, k), E.top + 0.15 - k * 0.1, lerp(S.z + (E.z - S.z) * 0.35, E.z, k)); }
      if (u >= 1) { this.setState('air'); this.vel.set(0, 0, 0); this.grounded = false; }
    } else {
      const ku = smooth01(Math.min(1, u / 0.7)), kf = smooth01(clamp((u - 0.35) / 0.65, 0, 1));
      this.pos.set(lerp(S.x, E.x, kf), lerp(S.y, E.y, ku), lerp(S.z, E.z, kf));
      if (u >= 1) { this.pos.set(E.x, E.y, E.z); this.grounded = true; this.vel.set(0, 0, 0); this.setState('move'); }
    }
  }
  /* ---------------- ladders ---------------- */
  findLadder() {
    let best = null, bd = 1e9;
    for (const L of World.ladders) {
      const bx = L.x + L.nx * 0.45, bz = L.z + L.nz * 0.45;
      const d = dist2D(this.pos.x, this.pos.z, bx, bz);
      if (d < 1.1 && this.pos.y > L.y0 - 0.6 && this.pos.y < L.y1 - 1.2 && d < bd) { bd = d; best = { L, top: false }; }
      const tx = L.x - L.nx * 0.5, tz = L.z - L.nz * 0.5; const dt2 = dist2D(this.pos.x, this.pos.z, tx, tz);
      if (dt2 < 1.3 && Math.abs(this.pos.y - L.y1) < 0.4 && dt2 < bd) { bd = dt2; best = { L, top: true }; }
    }
    return best;
  }
  startLadder(f) {
    const L = f.L; this.ladder = L; this.climbDir = 1; this.visY = 0; this.vel.set(0, 0, 0);
    this.yaw = Math.atan2(-L.nx, -L.nz);
    if (f.top) { // from the roof: back onto it, the way off it played backwards
      this.hangData = { box: L.info ? L.info.box : null, nx: L.nx, nz: L.nz, top: L.y1, px: L.x, pz: L.z, ladder: L };
      this.setState('climb'); this.climbMode = 'ladDown'; this.climbDur = LADTOP.dur;
      this.climbS = { x: this.pos.x, y: this.pos.y, z: this.pos.z }; this.climbE = { f: -0.42, y: L.y1 - 1.55 };
      Snd.play('grab', this.pos, 0.5); return;
    }
    this.setState('ladder'); this.ladEnter = { x: this.pos.x, z: this.pos.z, t: 0 };
    this.pos.y = Math.max(this.pos.y, L.y0); this.ladderPh = 0; Snd.play('grab', this.pos, 0.6);
  }
  updateLadder(dt) {
    const L = this.ladder, I = Input; const my = Input.move.y;
    const spd = (I.held.sprint ? 3.3 : 2.3);
    if (this.ladEnter) { // step onto the ladder line
      const e = this.ladEnter; e.t += dt; const k = smooth01(e.t / 0.22);
      this.pos.x = lerp(e.x, L.x + L.nx * 0.42, k); this.pos.z = lerp(e.z, L.z + L.nz * 0.42, k); if (k >= 1) this.ladEnter = null;
    }
    if (Math.abs(my) > 0.2) {
      this.climbDir = Math.sign(my); this.pos.y += Math.sign(my) * spd * dt;
      const rs = Math.floor((this.pos.y - L.y0) / 0.35); if (rs !== this._lstep) { this._lstep = rs; Snd.play('step', this.pos, 0.3, 1.4); if (rs % 2) Snd.play('clank', this.pos, 0.08, 1.8); }
    }
    if (this.pos.y >= L.y1 - 1.55 && my > 0.2) { // off the top, onto the roof
      this.pos.y = L.y1 - 1.55; this.ladEnter = null;
      this.hangData = { box: L.info ? L.info.box : null, nx: L.nx, nz: L.nz, top: L.y1, thin: false, px: L.x, pz: L.z, ladder: L };
      this.setState('climb'); this.climbMode = 'ladTop'; this.climbDur = LADTOP.dur;
      this.climbS = { x: this.pos.x, y: this.pos.y, z: this.pos.z }; this.climbE = { f: 0.55, y: L.y1 };
      return;
    }
    if (this.pos.y <= L.y0 && my < -0.2) { this.pos.y = L.y0; this.setState('move'); return; }
    if (this.jumpBuf > 0) { this.jumpBuf = 0; this.setState('air'); this.vel.set(L.nx * 3.5, 4, L.nz * 3.5); this.yaw = Math.atan2(L.nx, L.nz); return; }
    if (I.pressed.action) { this.setState('air'); this.vel.set(L.nx * 1, 0, L.nz * 1); return; }
    this.prompt = { a: 'jump', t: 'Sauter' };
  }
  /* ---------------- chain-link fences ---------------- */
  // a fence straight ahead that can be climbed, with room to land on the far side
  findFence(reach) {
    if (this.state === 'car') return null;
    const fx = this.fwdX(), fz = this.fwdZ(), q = World.query(this.pos.x - 1.6, this.pos.z - 1.6, this.pos.x + 1.6, this.pos.z + 1.6, []);
    let best = null;
    for (const b of q) {
      if (b.kind !== 'fence' || b.off) continue;
      const rel = b.y1 - this.pos.y; if (rel < 1.2 || rel > 3.4) continue;
      const alongX = b.x1 - b.x0 > b.z1 - b.z0, mid = alongX ? (b.z0 + b.z1) / 2 : (b.x0 + b.x1) / 2;
      const nx = alongX ? 0 : Math.sign(this.pos.x - mid) || 1, nz = alongX ? Math.sign(this.pos.z - mid) || 1 : 0;
      const d = alongX ? (this.pos.z - mid) * nz : (this.pos.x - mid) * nx;
      if (d < 0 || d > this.r + reach) continue;
      const lat = alongX ? this.pos.x : this.pos.z, lo = alongX ? b.x0 : b.z0, hi = alongX ? b.x1 : b.z1;
      if (lat < lo + 0.35 || lat > hi - 0.35) continue;
      if (-(fx * nx + fz * nz) < 0.55) continue; // must face it
      const px = alongX ? lat : mid, pz = alongX ? mid : lat;
      const lx = px - nx * 0.8, lz = pz - nz * 0.8, ly = World.groundAt(lx, lz, 0.3, b.y1 + 0.5);
      if (ly < b.y1 - 4.5 || ly > b.y1 - 1 || !World.onLand(lx, lz)) continue;
      if (World.ceilingAt(px, pz, 0.3, b.y1 + 0.05) < b.y1 + 1.6) continue;
      if (World.raycast(px - nx * 0.12, b.y1 + 0.5, pz - nz * 0.12, -nx, 0, -nz, 1.1) || World.raycast(px - nx * 0.12, ly + 1, pz - nz * 0.12, -nx, 0, -nz, 1.1)) continue;
      if (!best || d < best.d) best = { box: b, nx, nz, px, pz, d, top: b.y1 };
    }
    return best;
  }
  startFence(fe) {
    this.setState('fence'); this.visY = 0; this.vel.set(0, 0, 0); this.sprinting = false; this.climbDir = 1;
    this.yaw = Math.atan2(-fe.nx, -fe.nz);
    this.fenceD = { nx: fe.nx, nz: fe.nz, px: fe.px, pz: fe.pz, top: fe.top, gy: this.pos.y, ph: 'mount', u: 0, t: 0, d0: fe.d, hands: null, feet: null };
    Snd.play('grab', this.pos, 0.6); Snd.play('clank', this.pos, 0.2, 1.7); Input.rumble(0.15, 0.2, 50);
  }
  updateFence(dt) {
    const D = this.fenceD, s = this.app.scale || 1; if (!D) { this.setState('air'); return; }
    D.t += dt;
    const place = (f, y) => this.pos.set(D.px - D.nx * f, y, D.pz - D.nz * f);
    if (D.ph === 'mount') { // jump onto the mesh
      D.u = D.t / FENCE.mount; const k = smooth01(D.u);
      place(lerp(-D.d0, -0.37 * s, k), D.gy + 0.32 * s * k + Math.sin(Math.PI * clamp(D.u, 0, 1)) * 0.06);
      if (D.u >= 1) { D.ph = 'climb'; D.u = 1; }
    } else if (D.ph === 'climb') { // hand over hand up to the top rail
      const d = this.inputDir();
      if ((d.mag > 0.5 && (d.x * D.nx + d.z * D.nz) > 0.6) || this.rollBuf > 0) { // let go
        this.rollBuf = 0; this.fenceD = null; this.setState('air'); this.vel.set(D.nx * 1.6, 0.5, D.nz * 1.6); return;
      }
      this.pos.y += FENCE.v * s * dt;
      const rs = Math.floor((this.pos.y - D.gy) / 0.25); if (rs !== D.rs) { D.rs = rs; Snd.play('clank', this.pos, 0.12, 1.5 + Math.random() * 0.4); }
      if (this.pos.y >= D.top - 2.0 * s) { D.ph = 'over'; D.u = 0; D.t = 0; D.S = { f: -((this.pos.x - D.px) * D.nx + (this.pos.z - D.pz) * D.nz), y: this.pos.y }; Snd.play('grab', this.pos, 0.5); }
    } else { // over the top rail and down the other side
      D.u = D.t / OVER.dur; const u = clamp(D.u, 0, 1), P = OVER.pel, k0 = P[0], w = smooth01(u);
      track(P, u, _tk);
      place(_tk[0] * s - lerp(k0[1] * s - D.S.f, 0, w), D.top + _tk[1] * s - lerp(k0[2] * s - (D.S.y - D.top), 0.975 * s, w));
      if (u > 0.55 && !D.rattled) { D.rattled = true; Snd.play('clank', this.pos, 0.2, 1.3); }
      if (u >= 1) { this.fenceD = null; this.setState('air'); this.vel.set(-D.nx * 1.3, -0.6, -D.nz * 1.3); this.grounded = false; this.coyote = 0; }
    }
  }
  /* ---------------- zip lines ---------------- */
  findZip(maxD) {
    const hx = this.pos.x, hy = this.pos.y + 2.0, hz = this.pos.z;
    for (const Z of World.zips) {
      const ax = hx - Z.a.x, ay = hy - Z.a.y, az = hz - Z.a.z; const t = clamp((ax * Z.d.x + ay * Z.d.y + az * Z.d.z) / Z.len, 0, 1);
      if (t > 0.92) continue;
      const px = Z.a.x + Z.d.x * Z.len * t, py = Z.a.y + Z.d.y * Z.len * t, pz = Z.a.z + Z.d.z * Z.len * t;
      const d = Math.hypot(hx - px, hy - py, hz - pz); if (d < maxD) return { zip: Z, t };
    }
    return null;
  }
  findZipStart() {
    for (const Z of World.zips) { if (dist2D(this.pos.x, this.pos.z, Z.a.x, Z.a.z) < 2.2 && Math.abs(this.pos.y - Z.roofA) < 0.6) return Z; }
    return null;
  }
  startZip(Z, t) { this.zipD = { Z, t: Math.max(0.01, t), v: Math.max(5, Math.hypot(this.vel.x, this.vel.z) * 0.6) }; this.setState('zip'); this.vel.set(0, 0, 0); this.yaw = Math.atan2(Z.d.x, Z.d.z); Snd.play('grab', this.pos, 0.8); }
  updateZip(dt) {
    const D = this.zipD, Z = D.Z;
    const slope = -Z.d.y; D.v = clamp(D.v + (GRAV * slope * 0.9 - D.v * 0.08) * dt, 6, 17);
    D.t += D.v * dt / Z.len;
    const px = Z.a.x + Z.d.x * Z.len * D.t, py = Z.a.y + Z.d.y * Z.len * D.t, pz = Z.a.z + Z.d.z * Z.len * D.t;
    this.pos.set(px, py - 2.05, pz);
    const L = Snd.loop('zip'); if (L) L.set(D.v / 17);
    if (Math.random() < 0.5) FX.sparkTrail(px, py, pz);
    if (D.t >= 0.985) { this.endZip(); this.vel.set(Z.d.x * D.v * 0.4, 0, Z.d.z * D.v * 0.4); return; }
    if (this.jumpBuf > 0) { this.jumpBuf = 0; this.endZip(); this.vel.set(Z.d.x * D.v * 0.7, 3.5, Z.d.z * D.v * 0.7); return; }
    this.prompt = { a: 'jump', t: 'Lâcher' };
  }
  endZip() { this.setState('air'); this.grounded = false; const L = Snd.loop('zip'); if (L) L.set(0); }
  /* ---------------- interactions ---------------- */
  interactCandidate() {
    // 0) a partner out of service (multiplayer): repair it
    if (MP.on) for (const r of MP.robots()) { if (r === this || !r.downed || r.removed) continue; if (dist3(this.pos, r.pos) < 2.3) return { type: 'revive', target: r, text: 'Réparer ' + (r.pname || 'le partenaire') }; }
    // 1) arrest
    let best = null, bd = 2.0;
    for (const a of Game.actors) { if (!a.arrestable) continue; const d = dist3(this.pos, a.pos); if (d < bd) { bd = d; best = a; } }
    if (best) return { type: 'arrest', target: best, text: 'Interpeller' };
    // 2) mission interactables
    for (const it of Game.interactables) { if (it.active === false) continue; if (dist3(this.pos, it.pos) < (it.r || 1.8)) return { type: 'use', target: it, text: it.text }; }
    // 3) car
    const car = Cars.nearestEnterable(this.pos, 2.8); if (car) return { type: 'car', target: car, text: car.police ? 'Prendre la voiture' : (car.driver ? 'Réquisitionner' : 'Monter') };
    // 3b) a partner's car (multiplayer): ride along
    const ride = MP.on ? Cars.nearestRide(this.pos, 2.8, this) : null; if (ride) return { type: 'ride', target: ride, text: 'Monter (passager)' };
    // 4) ladder
    const L = this.findLadder(); if (L) return { type: 'ladder', target: L, text: L.top ? 'Descendre l’échelle' : 'Grimper' };
    // 5) zip start
    const Z = this.findZipStart(); if (Z) return { type: 'zip', target: Z, text: 'Tyrolienne' };
    return null;
  }
  tryInteract() {
    const c = this.interactCandidate(); if (!c) return false;
    if (c.type === 'revive') { this.startRevive(c.target); return true; }
    if (c.type === 'ride') { this.startRide(c.target); return true; }
    if (c.type === 'arrest') { this.startArrest(c.target); return true; }
    if (c.type === 'use') { c.target.use(this); return true; }
    if (c.type === 'car') { Cars.enter(c.target, this); return true; }
    if (c.type === 'ladder') { this.startLadder(c.target); return true; }
    if (c.type === 'zip') { this.startZip(c.target, 0.02); return true; }
    return false;
  }
  startArrest(t) {
    if (t.puppet && MP.guest) MP.send({ t: 'arrest', id: t.net }); // the host checks nobody else is cuffing him
    this.arrestT = t; this.setState('arresting'); this.vel.set(0, 0, 0); this.yaw = angleTo(this.pos.x, this.pos.z, t.pos.x, t.pos.z);
    t.prevState = t.state; t.prevLeft = Math.max(3, (t.downT || 0) - t.st); t.setState('beingCuffed'); t.vel.set(0, 0, 0); t.yaw = this.yaw; t.releaseToken && t.releaseToken();
    Snd.play('grab', this.pos, 0.8);
  }
  updateArrest(dt) {
    const t = this.arrestT;
    this.prompt = { a: 'action', t: 'Interpellation…', p: clamp(this.st / 1.1, 0, 1) };
    // stay next to the target
    const tx = t.pos.x - this.fwdX() * 0.75, tz = t.pos.z - this.fwdZ() * 0.75; this.pos.x = damp(this.pos.x, tx, 10, dt); this.pos.z = damp(this.pos.z, tz, 10, dt);
    if (this.st > 0.55 && !this._cuffSnd) { this._cuffSnd = true; Snd.play('cuff', t.pos, 1); }
    if (this.st >= 1.1) { this._cuffSnd = false; t.cuffed = true; t.setState('cuffed'); Game.onArrest(t); this.arrestT = null; this.setState('move'); }
  }
  /* ---------------- brigade (multiplayer): a partner on the ground, a seat in a partner's car ---------------- */
  // out of service: lying there, a partner can come and repair the robot; else back to the station after a while
  updateDowned(dt) {
    this.downT -= dt;
    this.prompt = { a: 'action', t: `Retour au commissariat · ${Math.max(0, Math.ceil(this.downT))} s`, p: clamp(this.downT / 30, 0, 1) };
    if ((this.dRingT = (this.dRingT || 0) - dt) <= 0) { this.dRingT = 1.2; MP.capOff++; FX.ring(this.pos.x, this.pos.y + 0.05, this.pos.z, 1.4, [1, 0.3, 0.3], 0.9); MP.capOff--; }
    if (this.downT <= 0 || (Input.pressed.action && this.st > 1.5)) { this.downed = false; Game.respawnPatrol(); }
  }
  startRevive(t) {
    this.reviveTgt = t; this.setState('arresting'); this.vel.set(0, 0, 0); this.yaw = angleTo(this.pos.x, this.pos.z, t.pos.x, t.pos.z); this.blocking = false;
    Snd.play('grab', this.pos, 0.8);
  }
  updateRevive(dt) {
    const t = this.reviveTgt, dur = 2.4;
    if (!t || t.removed || !t.downed || dist3(this.pos, t.pos) > 3.2) { this.reviveTgt = null; this.setState('move'); return; }
    this.prompt = { a: 'action', t: 'Réparation…', p: clamp(this.st / dur, 0, 1) };
    if (Math.random() < 0.35) FX.sparkTrail(t.pos.x + R(-0.35, 0.35), t.pos.y + 0.35, t.pos.z + R(-0.35, 0.35));
    if (this.st > 0.4 && !this._revSnd) { this._revSnd = true; Snd.play('servo', t.pos, 0.6, 1.2); }
    if (this.st >= dur) { this.reviveTgt = null; this._revSnd = false; this.setState('move'); MP.revive(t); Game.award(100, t.pos, 'RÉPARATION', 'feat'); Snd.play('repair', t.pos); }
  }
  startRide(c) {
    if (MP.host) { const k = Cars.seatTake(c, this); if (k < 0) { HUD.toast('Plus de place dans ce véhicule', '', 'bad', true); return; } this.enterSeat(c, k); }
    else if (MP.guest) { if (this._rideAsk && performance.now() - this._rideAsk < 2000) return; this._rideAsk = performance.now(); MP.send({ t: 'ride', id: c.id }); }
  }
  enterSeat(c, k) {
    this._rideAsk = 0; this.car = c; this.inCar = c; this.seat = k; this.ride = true; this.setState('car'); this.vel.set(0, 0, 0); this.blocking = false; this.aiming = false;
    Snd.play('door', c.pos, 0.8); Input.ctx.car = true; HUD.carMode(true, true);
  }
  leaveSeat(force) {
    const c = this.car; if (!c) { this.ride = false; return; }
    if (!force && Math.abs(c.speed) > 8) { HUD.hint('Ralentissez pour sortir'); return; }
    const k = this.seat; Cars.placeOut(c, this, CAR_SEATS[k] ? Math.sign(CAR_SEATS[k][0]) : 1);
    this.car = null; this.inCar = null; this.ride = false; this.seat = -1; this.setState('move'); this.yaw = c.yaw; this.vel.set(c.vx * 0.3, 0, c.vz * 0.3);
    Snd.play('door', c.pos, 0.8); Input.ctx.car = false; HUD.carMode(false);
    if (MP.host) Cars.seatLeave(c, this); else if (MP.guest) MP.send({ t: 'unride', id: c.id });
  }
  cancelArrest() {
    this.reviveTgt = null;
    const t = this.arrestT; if (t && t.puppet && MP.guest) MP.send({ t: 'uncuff', id: t.net });
    if (t && t.state === 'beingCuffed') { const ps = t.prevState === 'surrender' || t.prevState === 'ko' ? t.prevState : 'down'; t.setState(ps); t.downT = ps === 'down' ? Math.max(1.5, t.prevLeft) : t.prevLeft; }
    this.arrestT = null; this._cuffSnd = false; if (this.state === 'arresting') this.setState('move');
  }
  takeHit(src, dmg, o) {
    if (this.state === 'car' && this.car) { // at the wheel: shots through the windows, blows through the door, blasts — 60 % gets through
      if (!this.alive || o.kind === 'fall' || o.kind === 'car') return false;
      const K = 0.6 * Game.dmgTaken * diffK().dmg;
      this.hp -= dmg * K; this.hitFlash = 1; this.combatT = 6; HUD.damage(src); Game.onHit(this, src, dmg, o);
      CamCtl.shake(o.kind === 'blast' ? 0.5 : 0.12); Input.rumble(0.4, 0.4, 90);
      if (this.hp <= 0) { this.hp = 0; const c = this.car; if (this.ride) this.leaveSeat(true); else Cars.exit(c, this, true); this.die(0, 0, 0, src, o); }
      return true;
    }
    if (this.state === 'arresting') this.cancelArrest();
    if (this.state === 'hang' || this.state === 'ladder' || this.state === 'zip' || this.state === 'climb' || this.state === 'vault' || this.state === 'fence') {
      // no stagger while climbing: damage only
      if (!this.alive || this.iframe > 0) return false;
      this.hp -= dmg * Game.dmgTaken * diffK().dmg * (o.kind === 'melee' ? 0.5 : 1); this.hitFlash = 1; this.combatT = 6; HUD.damage(src); Game.onHit(this, src, dmg, o);
      if (this.hp <= 0) { this.hp = 0; this.setState('air'); this.die(0, 0, 0, src, o); }
      return true;
    }
    if (this.iframe > 0 && this.state === 'roll' && this.st < 0.24 && !this._pd && src && src !== this && (o.kind === 'melee' || o.kind === 'bullet') && !(Game.def && Game.def.training)) this.perfectDodge(src);
    const K = Game.dmgTaken * (o.kind === 'fall' ? 1 : diffK().dmg);
    if (Game.def && Game.def.training) dmg = Math.min(dmg, Math.max(0, (this.hp - 14) / Math.max(0.05, K)));
    const r = super.takeHit(src, dmg * K, o);
    if (r === true) HUD.damage(src);
    return r;
  }
  ko(kx, kz, knock, src, o) { this.die(kx, kz, knock, src, o); }
  /* ---------------- target lock (lock-on) ---------------- */
  onBlocked(src) { Game.onPlayerBlocked && Game.onPlayerBlocked(src); }
  lockable(a) { if (a && a.aim) return !!a.alive; return !!a && a !== this && a.alive && !a.removed && !a.cuffed && !a.inCar && a.team !== 'police' && a.team !== 'civ' && a.state !== 'beingCuffed'; }
  lockOk() { return !!this.lock && this.lockable(this.lock); }
  lockCandidates(maxD = 17) {
    const out = [];
    for (const a of Game.actors) {
      if (!this.lockable(a) || a.state === 'surrender') continue;
      const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > maxD || Math.abs(a.pos.y - this.pos.y) > 6) continue;
      const rel = wrapAngle(Math.atan2(dx, dz) - CamCtl.yaw);
      if (d > 6 && Math.abs(rel) > 1.3) continue; // far targets only when roughly in view
      out.push({ a, d, rel, s: d * 0.3 + Math.abs(rel) * 2.4 + (a.down ? 2.5 : 0) - (a.alerted ? 0.8 : 0) });
    }
    for (const a of Game.aimables) { // static aim points (training targets)
      if (!a.alive) continue; const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z, d = Math.hypot(dx, dz); if (d > 26) continue;
      const rel = wrapAngle(Math.atan2(dx, dz) - CamCtl.yaw); if (Math.abs(rel) > 1.4) continue;
      out.push({ a, d, rel, s: d * 0.3 + Math.abs(rel) * 2.4 });
    }
    return out.sort((p, q) => p.s - q.s);
  }
  setLock(a) {
    const was = this.lock; this.lock = a || null;
    if (a && a !== was) { this.lockSeen.add(a); Snd.play('lockon', null, 0.5); Input.rumble(0.15, 0.1, 40); }
    if (!a && was) { this.lockSeen.clear(); Snd.play('lockoff', null, 0.4); }
  }
  // lock button: touch cycles through the nearby targets then releases; pad / keyboard toggle (switch with a flick)
  pressLock() {
    const C = this.lockCandidates();
    if (!this.lockOk()) { this.lockSeen.clear(); if (C.length) this.setLock(C[0].a); else CamCtl.recenter = true; return; }
    if (Input.device === 'touch') { const n = C.find(c => !this.lockSeen.has(c.a)); if (n) this.setLock(n.a); else this.setLock(null); return; }
    this.setLock(null);
  }
  // flick toward a side: the next target to the right (dir > 0) or left of the current one, on screen
  switchLock(dir) {
    if (!this.lockOk()) return;
    const rel0 = wrapAngle(angleTo(this.pos.x, this.pos.z, this.lock.pos.x, this.lock.pos.z) - CamCtl.yaw);
    let best = null, bd = 1e9;
    for (const c of this.lockCandidates(20)) {
      if (c.a === this.lock) continue;
      const d = (rel0 - c.rel) * dir; // > 0: on the requested side
      if (d > 0.02 && d < bd) { bd = d; best = c.a; }
    }
    if (best) this.setLock(best);
  }
  updateTargeting(dt) {
    const I = Input;
    // lost target: move on to the closest threat, or release
    if (this.lock && (!this.lockable(this.lock) || dist3(this.lock.pos, this.pos) > 28)) {
      const C = this.lockCandidates(12).filter(c => c.a.alerted);
      this.setLock(C.length ? C[0].a : null);
    }
    if (I.pressed.lock && this.state !== 'car') this.pressLock();
    // switching while locked: right-stick flick (pad), quick mouse flick (keyboard / mouse)
    this._flickCd -= dt;
    if (this.lockOk() && I.device === 'pad') { const rx = I.rstick.x; if (Math.abs(rx) > 0.72 && !this._flick) { this._flick = true; this.switchLock(Math.sign(rx)); } else if (Math.abs(rx) < 0.3) this._flick = false; }
    if (this.lockOk() && I.device === 'kbm') { this._mflick = this._mflick * Math.exp(-9 * dt) + I.look.x; if (Math.abs(this._mflick) > 0.2 && this._flickCd <= 0) { this.switchLock(Math.sign(this._mflick)); this._mflick = 0; this._flickCd = 0.35; } }
    // nearest engaged threat: used by the combat camera and the HUD
    let st = null, sd = 10;
    for (const a of Game.actors) {
      if (a === this || !a.alerted || !this.lockable(a) || a.down || a.state === 'surrender') continue;
      const d = dist2D(a.pos.x, a.pos.z, this.pos.x, this.pos.z); if (d < sd && Math.abs(a.pos.y - this.pos.y) < 3) { sd = d; st = a; }
    }
    this.softTarget = st;
  }
  die(kx, kz, knock, src, o) { if (this.state === 'car') return; super.die(kx, kz, knock, src, o); Game.playerDied(); }
  updatePrompt() {
    // what the jump button does here (its label on touch screens): climb a fence, cross a car
    this.jumpHint = this.state === 'move' && this.grounded ? (this.findFence(0.7) ? 'Escalader' : this.findCarVault(0.9) ? 'Franchir' : null) : null;
    if (this.prompt) return;
    if (this.state !== 'move') return;
    const c = this.interactCandidate();
    if (c) this.prompt = { a: 'action', t: c.text, target: c.target };
    else if (this.jumpHint) this.prompt = { a: 'jump', t: this.jumpHint };
    this.interact = c;
  }
  /* ---------------- in car ---------------- */
  updateInCar(dt) {
    const car = this.car; if (!car) { this.setState('move'); return; }
    if (this.ride && (car.removed || car.sinking || car.burnt)) { this.leaveSeat(true); return; } // a passenger: the car is gone or a wreck
    this.pos.set(car.pos.x, car.pos.y, car.pos.z); this.yaw = car.yaw;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.finishReload(); }
    // drive-by: the robot leans out of the window and fires at the best target in front of the camera
    const w = this.carWeapon();
    this.carAim = w ? this.carAimTarget() : null;
    if (w) { const W = WEAPONS[w]; if ((W.auto && Input.held.fire) || Input.pressed.fire) this.carFire(w); }
    this.animate(dt);
    if (Input.pressed.exit) { if (this.ride) this.leaveSeat(); else Cars.exit(car, this); }
  }
  // gun used from the car: the one in hand if loaded, else the first loaded one (pistol first: one hand on the wheel)
  carWeapon() { if (this.isFirearm() && this.hasAmmo(this.cur)) return this.cur; for (const w of ['pistol', 'uzi', 'rifle', 'ak', 'shotgun']) if (this.hasAmmo(w)) return w; return null; }
  // best target for a shot from the car: hostile people and wanted vehicles, near the camera axis, in sight
  carAimTarget() {
    const car = this.car, yaw = CamCtl.yaw, eye = { x: car.pos.x, y: car.pos.y + 0.8, z: car.pos.z }; const C = [];
    for (const a of Game.actors) {
      if (!a.hittable || a === this || a.inCar || a.team === 'police' || a.team === 'civ' || a.down || a.cuffed || a.state === 'surrender' || !a.alive) continue;
      const ex = a.pos.x - car.pos.x, ez = a.pos.z - car.pos.z, d = Math.hypot(ex, ez); if (d > 38 || d < 1.5) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(ex, ez) - yaw)); if (ang > 0.62) continue;
      C.push({ a, s: ang * 12 + d * 0.12 - (a.alerted ? 1.5 : 0), y: 1.2 });
    }
    for (const c of Cars.list) {
      if (c === car || c.dead || !c.tags || !c.tags.target) continue;
      const ex = c.pos.x - car.pos.x, ez = c.pos.z - car.pos.z, d = Math.hypot(ex, ez); if (d > 45) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(ex, ez) - yaw)); if (ang > 0.7) continue;
      C.push({ c, s: ang * 10 + d * 0.1 - 2, y: 0.9 });
    }
    C.sort((p, q) => p.s - q.s);
    for (let i = 0; i < Math.min(3, C.length); i++) { const t = C[i], o = t.a || t.c; if (World.los(eye, o.pos, 0, t.y)) return t.a || t.c; }
    return null;
  }
  carFire(w) {
    const W = WEAPONS[w], inv = this.inv[w]; if (!inv || this.reloadT > 0 || this.fireCd > 0) return;
    if (this.cur !== w) { this.equip(w); this.reloadT = 0; }
    if (inv.mag <= 0) { Snd.play('empty', this.pos); this.fireCd = 0.3; if (inv.res > 0) this.startReload(); else this.dropEmpty(); return; }
    const car = this.car, t = this.carAim; inv.mag--; this.fireCd = W.rof * 1.15; this.combatT = 6;
    let tx, ty, tz;
    if (t) { tx = t.pos.x; ty = t.pos.y + (t.len ? 0.9 : t.state === 'surrender' ? 0.9 : 1.2); tz = t.pos.z; }
    else { const f = Cam.fwd; tx = car.pos.x + f.x * 40; ty = car.pos.y + 1.1 + f.y * 20; tz = car.pos.z + f.z * 40; }
    // muzzle: out of the window on the side of the target
    const rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw); const side = ((tx - car.pos.x) * rx + (tz - car.pos.z) * rz) >= 0 ? 1 : -1;
    const mz = { x: car.pos.x + rx * side * 1.05 + Math.sin(car.yaw) * 0.3, y: car.pos.y + 1.3, z: car.pos.z + rz * side * 1.05 + Math.cos(car.yaw) * 0.3 };
    let dx = tx - mz.x, dy = ty - mz.y, dz = tz - mz.z; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const spread = W.spread * 1.6 * (1 - this.skill * 0.08) * (Math.abs(car.speed) > 12 ? 1.3 : 1);
    for (let p = 0; p < W.pellets; p++) {
      const sx = (Math.random() - 0.5) * 2 * spread, sy = (Math.random() - 0.5) * 2 * spread; const qx = -dz, qz = dx;
      let ex = dx + qx * sx, ey = dy + sy, ez = dz + qz * sx; const l2 = Math.hypot(ex, ey, ez); ex /= l2; ey /= l2; ez /= l2;
      const r = Combat.shoot(this, mz.x, mz.y, mz.z, ex, ey, ez, W.range, W.dmg * (1 + this.skill * 0.05), { knock: W.pellets > 1 ? 2.5 : 1.5, ignoreCar: car, carMul: 0.45 });
      FX.tracer(mz.x, mz.y, mz.z, r.x, r.y, r.z, [1, 0.85, 0.55]);
      Game.stats.shots++; if (r.actor || r.car) Game.stats.hits++;
    }
    FX.muzzle(mz.x, mz.y, mz.z, Math.atan2(dx, dz)); Lights.add(mz.x, mz.y, mz.z, 3.5, 2.4, 1.2, 9, 0.06, 'muzzleP');
    Snd.play(W.snd, this.pos, 1); CamCtl.shake(W.pellets > 1 ? 0.25 : 0.1); Input.rumble(0.3, 0.5, 60);
    Combat.noise(car.pos.x, car.pos.z, 45, this); HUD.wFlashT = 3; Game.onCarShot && Game.onCarShot();
    if (inv.mag === 0 && inv.res > 0) setTimeout(() => { if (this.inv[w] === inv && inv.mag === 0 && this.reloadT <= 0) { this.reloadWeapon = w; this.startReload(); } }, 250);
    else if (inv.mag === 0) setTimeout(() => { if (this.cur === w && !this.hasAmmo(w) && this.alive) this.dropEmpty(); }, 420);
  }
}

