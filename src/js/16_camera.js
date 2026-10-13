/* =====================================================================
   CAMERA — third-person orbit, aim, car chase, cinematic
   ===================================================================== */
const CamCtl = {
  yaw: 0, pitch: 0.22, dist: 4.3, curDist: 4.3, trauma: 0, kickV: 0, kickOff: 0, fov: 62, mode: 'foot', pivot: new V3(), noLookT: 0, shoulder: 0.45,
  carYawOff: 0, carLookT: 0, cine: 0, _p: new V3(), _t: new V3(),
  reset(yaw) { this.yaw = yaw; this.pitch = 0.16; this.carYawOff = 0; this.recenter = false; this.lockDist = 0; this.combatWide = 0; const P = Game.player; if (P) this.pivot.set(P.pos.x, P.pos.y + 1.55, P.pos.z); this.curDist = this.dist; },
  shake(t) { this.trauma = Math.min(1, this.trauma + t); },
  kick(k) { this.kickV += k; },
  update(dt) {
    if (this.override) { const v = this.override; Cam.pos.set(v[0], v[1], v[2]); Cam.target.set(v[3], v[4], v[5]); Cam.fov = (v[6] || 60) * DEG; return; }
    const P = Game.player; const I = Input; const o = Save.data.options;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    if (this.mode === 'menu') return this.cinematic(dt);
    if (!P) return;
    const car = P.state === 'car' ? P.car : null;
    const lx = I.look.x, ly = I.look.y;
    const looking = Math.abs(lx) + Math.abs(ly) > 1e-4;
    if (looking) this.noLookT = 0; else this.noLookT += dt;
    if (car) return this.carCam(dt, car, lx, ly, looking);
    const L = P.lockOk && P.lockOk() ? P.lock : null;
    const nade = P.nadeAim && P.nadeT > 0.2, aiming = P.aiming || nade || (P.isFirearm() && P.firingT > 0 && I.device === 'kbm');
    // while locked, horizontal look input is used to switch targets instead of turning the camera
    if (!L || aiming) this.yaw -= lx;
    this.pitch = clamp(this.pitch + ly, -0.62, 1.25);
    // recoil: a brief upward flick of the view that settles back by itself (the aim itself does not move)
    this.kickOff = Math.min(0.09, this.kickOff + this.kickV); this.kickV = 0; this.kickOff = damp(this.kickOff, 0, 10, dt);
    const soft = !L && P.softTarget && P.softTarget.alive ? P.softTarget : null;
    if (this.recenter) { const diff = wrapAngle(P.yaw - this.yaw); this.yaw += diff * (1 - Math.exp(-10 * dt)); this.pitch = damp(this.pitch, 0.18, 8, dt); if (Math.abs(diff) < 0.02) this.recenter = false; if (looking) this.recenter = false; }
    if (L && !aiming && P.state !== 'hang' && P.state !== 'ladder' && P.state !== 'zip' && P.state !== 'fence' && P.state !== 'climb') {
      // lock-on: look from behind the robot toward the target, and frame both
      const dx = L.pos.x - P.pos.x, dz = L.pos.z - P.pos.z, dd = Math.hypot(dx, dz);
      if (dd > 0.7) this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * (1 - Math.exp(-6.5 * dt));
      if (this.noLookT > 0.35) this.pitch = damp(this.pitch, clamp(0.3 - dd * 0.012 - (L.pos.y - P.pos.y) * 0.06, 0.1, 0.44), 3, dt);
      this.lockDist = damp(this.lockDist || 0, clamp((dd - 3) * 0.16, 0, 1.5), 3, dt);
    } else {
      this.lockDist = damp(this.lockDist || 0, 0, 3, dt);
      if (soft && !aiming && I.device !== 'kbm' && o.autoCam && this.noLookT > 0.5 && (P.state === 'move' || P.state === 'attack' || P.state === 'hit' || P.state === 'roll')) {
        // fight on pad / touch: keep the nearest threat inside the view (dead zone), without stealing the camera
        const want = Math.atan2(soft.pos.x - P.pos.x, soft.pos.z - P.pos.z), diff = wrapAngle(want - this.yaw), dz0 = 0.45;
        if (Math.abs(diff) > dz0) this.yaw += (diff - Math.sign(diff) * dz0) * (1 - Math.exp(-2.6 * dt));
        this.pitch = damp(this.pitch, 0.26, 1.2, dt);
      } else if (o.autoCam && I.device !== 'kbm' && this.noLookT > 1.2 && P.speedNow > 2 && (P.state === 'move' || P.state === 'air') && !P.aiming) {
        // auto-recenter behind the player when moving (pad/touch)
        const diff = wrapAngle(P.yaw - this.yaw); if (Math.abs(diff) < 2.4) this.yaw += diff * (1 - Math.exp(-1.1 * dt));
        this.pitch = damp(this.pitch, 0.16, 0.8, dt);
      }
    }
    const tDist = nade ? 2.9 : aiming ? 2.1 : (P.sprinting ? 3.9 : 3.4) + (P.state === 'zip' ? 1.2 : 0) + (P.state === 'down' || P.state === 'dead' ? 0.8 : 0) + (this.combatWide || 0) + (this.lockDist || 0);
    const tSh = nade ? 0.55 : aiming ? 0.66 : 0.4;
    // pull back a little when several enemies are close
    let near = 0; for (const a of Game.actors) if (a.alerted && a.alive && !a.down && dist2D(a.pos.x, a.pos.z, P.pos.x, P.pos.z) < 7) near++;
    this.combatWide = damp(this.combatWide || 0, near >= 2 ? 1.1 : near === 1 ? 0.45 : 0, 2, dt); this.shoulder = damp(this.shoulder, tSh, 10, dt);
    this.dist = damp(this.dist, tDist, 8, dt);
    const tfov = (nade ? 56 : aiming ? 48 : 62) + (P.sprinting ? 4 : 0);
    this.fov = damp(this.fov, tfov, 8, dt);
    // pivot follows player (vertical smoothing hides step-ups)
    const py = P.pos.y + P.visY + (P.state === 'hang' ? 1.9 : P.state === 'down' || P.state === 'dead' || P.state === 'ko' ? 0.6 : P.state === 'roll' ? 1.1 : 1.5);
    this.pivot.x = damp(this.pivot.x, P.pos.x, 22, dt); this.pivot.z = damp(this.pivot.z, P.pos.z, 22, dt); this.pivot.y = damp(this.pivot.y, py, 12, dt);
    this.place(dt, this.pivot, this.dist, this.shoulder);
  },
  place(dt, pv, dist, sh) {
    const pch = this.pitch - (this.mode === 'foot' ? this.kickOff : 0);
    const cy = Math.cos(pch), sy = Math.sin(pch);
    const fx = Math.sin(this.yaw) * cy, fy = -sy, fz = Math.cos(this.yaw) * cy;
    const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
    const ox = pv.x + rx * sh, oy = pv.y, oz = pv.z + rz * sh;
    // collision from pivot to camera
    let d = dist;
    const hit = World.raycast(ox, oy, oz, -fx, -fy, -fz, dist + 0.3, 'pole');
    if (hit) d = Math.max(0.5, hit.t - 0.3);
    // also avoid going under ground
    if (d < this.curDist) this.curDist = d; else this.curDist = damp(this.curDist, d, 4, dt);
    let px = ox - fx * this.curDist, py = oy - fy * this.curDist, pz = oz - fz * this.curDist;
    const g = World.groundAt(px, pz, 0.2, py + 0.2); if (py < g + 0.3) py = g + 0.3;
    const s = this.trauma * this.trauma; const t = Env.time;
    const shx = (Math.sin(t * 37.1) + Math.sin(t * 23.7)) * 0.5 * s * 0.25, shy = (Math.sin(t * 41.3) + Math.sin(t * 17.9)) * 0.5 * s * 0.25;
    Cam.pos.set(px + rx * shx, py + shy, pz + rz * shx);
    Cam.target.set(ox + fx * 6, oy + fy * 6, oz + fz * 6);
    Cam.fov = this.fov * DEG;
  },
  carCam(dt, car, lx, ly, looking) {
    if (looking) { this.carYawOff -= lx; this.pitch = clamp(this.pitch + ly, -0.3, 0.9); this.carLookT = 1.6; }
    else { this.carLookT -= dt; if (this.carLookT <= 0) { this.carYawOff = damp(this.carYawOff, 0, 2.5, dt); this.pitch = damp(this.pitch, 0.2, 2, dt); } }
    const back = car.speed < -2; const tgtYaw = car.yaw + (back ? Math.PI : 0) + this.carYawOff;
    this.yaw = dampAngle(this.yaw, tgtYaw, 4.5, dt);
    const sp = Math.abs(car.speed);
    this.fov = damp(this.fov, 62 + Math.min(16, sp * 0.45), 4, dt);
    const dist = (car.T.van ? 8.5 : 7.2) + sp * 0.06;
    this.pivot.x = damp(this.pivot.x, car.pos.x, 20, dt); this.pivot.z = damp(this.pivot.z, car.pos.z, 20, dt); this.pivot.y = damp(this.pivot.y, car.pos.y + 1.9, 10, dt);
    this.place(dt, this.pivot, dist, 0);
  },
  cinematic(dt) {
    // slow drone flight above the avenue, looking across the city toward the harbour and the lighthouse
    this.cine += dt;
    const u = (this.cine * 1.4) % 220; const x = -120 + u;
    Cam.pos.set(x, 27 + Math.sin(this.cine * 0.1) * 2, -27 + Math.sin(this.cine * 0.07) * 4);
    Cam.target.set(x + 55, 6, 60);
    Cam.fov = 60 * DEG; this.yaw = Math.atan2(55, 87);
  }
};

