/* =====================================================================
   NPCs — enemies (gangs, cult, bosses), civilians, scripted runners
   ===================================================================== */
const ETYPES = {
  thug: { app: 'thug', hp: 75, speed: 4.3, weapon: null, atk: ['e_punch', 'e_punch', 'e_kick'], aggro: 17, surrender: 0.35, team: 'gang', poiseMax: 22, score: 1 },
  thugBat: { app: 'thug', hp: 85, speed: 4.1, weapon: 'bat', atk: ['e_bat'], aggro: 17, surrender: 0.3, team: 'gang', poiseMax: 26, score: 1 },
  thugKnife: { app: 'thug', hp: 70, speed: 4.6, weapon: 'knife', atk: ['e_knife', 'e_kick'], aggro: 17, surrender: 0.35, team: 'gang', poiseMax: 20, score: 1 },
  gunner: { app: 'thug', hp: 70, speed: 3.8, weapon: 'pistol', alt: [['uzi', 0.35], ['ak', 0.25]], nades: 0.25, ranged: true, rmin: 6, rmax: 16, dmg: 9, aimT: 0.65, burst: 1, rof: [1.0, 1.8], acc: 0.5, aggro: 26, team: 'gang', surrender: 0.5, score: 1 },
  mugger: { app: 'thug', hp: 60, speed: 4.4, weapon: 'knife', atk: ['e_punch', 'e_knife'], aggro: 9, team: 'gang', surrender: 0.5, poiseMax: 18, score: 1 },
  thief: { app: 'thug', hp: 65, speed: 5.4, weapon: null, atk: ['e_punch', 'e_kick'], aggro: 8, team: 'gang', surrender: 0.6, poiseMax: 18, score: 1 },
  grutier: { app: 'thugBoss', hp: 300, speed: 3.7, weapon: 'wrench', atk: ['b_swing', 'b_swing', 'b_overhead'], boss: true, charge: true, team: 'gang', poiseMax: 70, superArmor: true, name: 'Le Grutier', koTime: 90, aggro: 22, armor: 0.3, score: 3 },
  cultist: { app: 'cultist', hp: 85, speed: 4.8, weapon: 'knife', atk: ['e_knife', 'e_kick'], aggro: 22, team: 'cult', noSurrender: true, poiseMax: 25, score: 1 },
  cultShot: { app: 'cultist', hp: 95, speed: 3.6, weapon: 'shotgun', nades: 0.2, ranged: true, rmin: 4, rmax: 11, dmg: 5, pellets: 6, aimT: 0.8, burst: 1, rof: [1.6, 2.4], acc: 0.55, aggro: 24, team: 'cult', noSurrender: true, score: 1 },
  cultRifle: { app: 'cultist', hp: 85, speed: 3.8, weapon: 'ak', nades: 0.35, ranged: true, rmin: 9, rmax: 22, dmg: 6, burst: 3, aimT: 0.75, rof: [1.8, 2.8], acc: 0.42, aggro: 28, team: 'cult', noSurrender: true, score: 1 },
  herald: { app: 'herald', hp: 520, speed: 4.4, weapon: 'staff', atk: ['b_swing', 'b_overhead'], boss: true, team: 'cult', superArmor: true, poiseMax: 95, name: 'Le Héraut de la Marée', herald: true, koTime: 9999, aggro: 40, armor: 0.2, score: 4 },
  courier: { app: 'cultist', hp: 60, speed: 5.2, weapon: null, atk: ['e_punch'], team: 'cult', surrender: 0.9, runner: true, aggro: 10, score: 1 },
  drone: { app: 'drone', hp: 60, speed: 3.3, weapon: null, atk: ['e_punch'], aggro: 40, team: 'gang', noSurrender: true, poiseMax: 16, koTime: 10, getupDur: 0.65, score: 0 },
  driver: { app: 'thug', hp: 65, speed: 4.8, weapon: null, atk: ['e_punch'], team: 'gang', surrender: 0.8, runner: true, aggro: 10, score: 1 },
  // ---- campaign: Sentinelle mercenaries, hacked police robots, the Forges gang, looters, and the bosses
  merc: { app: 'merc', hp: 115, speed: 4.1, weapon: 'rifle', nades: 1.3, ranged: true, rmin: 8, rmax: 24, dmg: 7.5, burst: 3, aimT: 0.7, rof: [1.4, 2.2], acc: 0.42, aggro: 30, team: 'gang', surrender: 0.15, poiseMax: 40, armor: 0.3, score: 1 },
  mercPistol: { app: 'merc', hp: 95, speed: 4.3, weapon: 'pistol', alt: [['uzi', 0.35]], nades: 0.5, ranged: true, rmin: 6, rmax: 17, dmg: 9.5, aimT: 0.6, burst: 1, rof: [1.0, 1.7], acc: 0.5, aggro: 28, team: 'gang', surrender: 0.25, poiseMax: 34, armor: 0.25, score: 1 },
  mercShot: { app: 'merc', hp: 120, speed: 3.9, weapon: 'shotgun', nades: 0.8, ranged: true, rmin: 3, rmax: 11, dmg: 5, pellets: 6, aimT: 0.75, burst: 1, rof: [1.6, 2.4], acc: 0.55, aggro: 26, team: 'gang', surrender: 0.12, poiseMax: 42, armor: 0.3, score: 1 },
  mercBaton: { app: 'merc', hp: 110, speed: 4.6, weapon: 'bat', atk: ['e_bat', 'e_kick'], aggro: 22, team: 'gang', surrender: 0.2, poiseMax: 40, armor: 0.25, score: 1 },
  hdrone: { app: 'hdrone', hp: 80, speed: 4.7, weapon: null, atk: ['e_punch', 'e_kick'], aggro: 34, team: 'gang', noSurrender: true, poiseMax: 18, koTime: 9999, getupDur: 0.6, armor: 0.25, score: 1 },
  forgeron: { app: 'forgeron', hp: 80, speed: 4.4, weapon: 'bat', atk: ['e_bat', 'e_punch'], aggro: 18, surrender: 0.3, team: 'gang', poiseMax: 24, score: 1 },
  forgeronGun: { app: 'forgeron', hp: 70, speed: 3.9, weapon: 'pistol', alt: [['uzi', 0.3], ['ak', 0.15]], nades: 0.15, ranged: true, rmin: 6, rmax: 16, dmg: 9, aimT: 0.65, burst: 1, rof: [1.0, 1.8], acc: 0.5, aggro: 26, team: 'gang', surrender: 0.45, score: 1 },
  looter: { app: 'thug', hp: 55, speed: 4.4, weapon: null, atk: ['e_punch', 'e_kick'], aggro: 12, team: 'gang', surrender: 0.7, poiseMax: 16, score: 1 },
  fredo: { app: 'fredo', hp: 60, speed: 5.5, weapon: null, atk: ['e_punch'], team: 'gang', surrender: 0.95, runner: true, aggro: 10, score: 1 },
  pince: { app: 'thugBoss', hp: 350, speed: 3.8, weapon: 'wrench', atk: ['b_swing', 'b_swing', 'b_overhead'], boss: true, charge: true, team: 'gang', poiseMax: 70, superArmor: true, name: 'La Pince', koTime: 90, aggro: 24, armor: 0.3, score: 3 },
  machoire: { app: 'mercBoss', hp: 460, speed: 3.9, weapon: 'wrench', atk: ['b_swing', 'b_swing', 'b_overhead'], boss: true, charge: true, team: 'gang', poiseMax: 85, superArmor: true, name: 'Mâchoire', koTime: 9999, aggro: 30, armor: 0.4, score: 3 },
  colosse: { app: 'colosse', hp: 620, speed: 3.6, weapon: 'wrench', atk: ['b_swing', 'b_overhead'], boss: true, charge: true, slam: true, team: 'gang', poiseMax: 130, superArmor: true, name: 'Le Colosse', koTime: 9999, aggro: 40, armor: 0.5, score: 4 },
  rook: { app: 'mercBoss', hp: 430, speed: 4.8, weapon: 'rifle', nades: 4, ranged: true, rmin: 6, rmax: 22, dmg: 8, burst: 4, aimT: 0.55, rof: [1.2, 1.9], acc: 0.52, aggro: 40, team: 'gang', noSurrender: true, poiseMax: 70, superArmor: true, name: 'Rook', koTime: 9999, armor: 0.45, score: 4 },
  colosse2: { app: 'colosse', hp: 750, speed: 3.8, weapon: 'wrench', atk: ['b_swing', 'b_overhead'], boss: true, charge: true, slam: true, team: 'gang', poiseMax: 140, superArmor: true, name: 'Le Colosse · Mk II', koTime: 9999, aggro: 40, armor: 0.5, score: 4 },
  delormeRun: { app: 'delorme', hp: 70, speed: 4.7, weapon: null, atk: ['e_punch'], team: 'gang', surrender: 1, runner: true, aggro: 10, score: 1 },
  tresorier: { app: 'tresorier', hp: 80, speed: 4.9, weapon: 'pistol', ranged: true, rmin: 5, rmax: 14, dmg: 7.5, aimT: 0.7, burst: 1, rof: [1.1, 1.8], acc: 0.42, team: 'gang', surrender: 0.9, aggro: 20, score: 1 },
  leviathan: { app: 'leviathan', hp: 800, speed: 4.2, weapon: 'staff', atk: ['b_swing', 'b_overhead'], boss: true, charge: true, slam: true, summon: true, team: 'gang', superArmor: true, poiseMax: 140, name: 'Vasseur · exosquelette Léviathan', koTime: 9999, aggro: 50, armor: 0.55, score: 5 }
};

// how the enemies fire each gun (overrides of their type's numbers): smg in long bursts, the AK in short hard ones
const EW = {
  uzi: { burst: 5, gap: 0.08, dmg: 4.5, acc: 0.38, rmin: 4, rmax: 15, aimT: 0.55, rof: [1.4, 2.2] },
  ak: { burst: 3, gap: 0.13, dmg: 8, acc: 0.44, rmin: 7, rmax: 26, aimT: 0.75, rof: [1.6, 2.4] },
  rifle: { gap: 0.12 }
};
class Enemy extends Actor {
  constructor(type, x, z, o = {}) {
    const T = ETYPES[type];
    // some gunmen carry an Uzi or an AK instead of their type's gun
    let wpn = o.weapon !== undefined ? o.weapon : T.weapon;
    if (o.weapon === undefined && T.alt) { let r = Math.random(); for (const [w, p] of T.alt) { if (r < p) { wpn = w; break; } r -= p; } }
    super({ kind: type, app: T.app, team: T.team, hp: T.hp * (1 + ((o.hpMul || 1) - 1) * 0.5), x, z, y: o.y, yaw: o.yaw || 0, weapon: wpn, tags: o.tags });
    this.T = T; this.ai = o.ai || 'idle';
    this.nades = o.nades !== undefined ? o.nades : T.nades ? Math.floor(T.nades) + (Math.random() < T.nades % 1 ? 1 : 0) : 0; this.nadeCd = R(3, 7); this.home = new V3(x, this.pos.y, z); this.homeR = o.homeR || 5;
    if (!T.boss && this.app.look && chance(0.65)) this.idleKind = RP(['crossed', 'hips', 'back', 'crossed']); // waiting guards
    this.poiseMax = T.poiseMax || 25; this.superArmor = !!T.superArmor; this.armor = T.armor || 0; this.koTime = T.koTime || 22; if (T.getupDur) this.getupDur = T.getupDur;
    this.atkCd = R(0.4, 1.6); this.thinkT = R(0, 0.3); this.alerted = !!o.alerted; this.seesPlayer = false;
    this.strafeDir = chance(0.5) ? 1 : -1; this.strafeT = R(1, 3); this.wanderT = R(0, 3); this.wanderTo = null;
    this.hostile = true; this.stuckT = 0; this.detourT = 0; this.detourX = 0; this.detourZ = 0; this.aimT = 0; this.burstLeft = 0; this.fireCd = R(0.5, 1.5);
    this.speed = T.speed; this.checkPos = new V3().copy(this.pos); this.checkT = 0; this.tokenT = 0; this.boss = !!T.boss;
    this.path = o.path || null; this.pi = 0; this.chargeCd = 3; this.slamCd = 5; this.tpCd = 8; this.summoned = 0;
    this.guardAlways = false; this.fleeT = 0; this.surrT = 0; this.escapeT = 0;
    if (T.runner && !this.path) this.ai = o.ai || 'idle';
  }
  releaseToken() { Combat.release(this); this.tokenT = 0; }
  // the robot he goes after: the only one in solo; in a brigade (multiplayer host) the nearest one, a bit stickier
  // for the current one and for the one that just hit him (a fight does not flip from robot to robot each second)
  pickP() {
    const P0 = Game.player; if (!MP.host) { this.P = P0; return P0; }
    const L = MP.robots(); let best = this.P && !this.P.removed ? this.P : P0, bs = 1e9;
    for (const r of L) {
      if (!r.alive || r.removedFromPlay || r.removed) continue;
      let sc = dist3(r.pos, this.pos); if (r === this.P) sc -= 5; if (r === this.lastHitBy) sc -= 6; if (r.state === 'car') sc += 4;
      if (sc < bs) { bs = sc; best = r; }
    }
    if (best !== this.P) { const was = this.P; this.P = best; if (was && this.alerted) { this.lkx = best.pos.x; this.lkz = best.pos.z; this.lostT = 0; this.releaseToken(); Combat.releaseShot(this); } }
    return best;
  }
  // where to head for: the robot while he is in sight (or just out of it), else where he was last seen or heard
  chase(P) {
    if (this.seesPlayer || (this.lostT || 0) < 1.2 || this.lkx === undefined || dist2D(P.pos.x, P.pos.z, this.pos.x, this.pos.z) < 2.5) return P.pos;
    if (dist2D(this.lkx, this.lkz, this.pos.x, this.pos.z) < 1.6) { // nothing there: look around it
      if ((this.searchT = (this.searchT || 0) - 1) <= 0) { this.searchT = 1; const a = R(0, TAU), r = R(3, 8); this.lkx += Math.sin(a) * r; this.lkz += Math.cos(a) * r; }
    }
    this._ck = this._ck || { x: 0, z: 0 }; this._ck.x = this.lkx; this._ck.z = this.lkz; return this._ck;
  }
  // fire pattern value for the gun in hand
  ws(k) { const e = EW[this.weapon]; return e && e[k] !== undefined ? e[k] : this.T[k]; }
  // throw a grenade at the player when he is at a good distance, no mate stands near where it will land, one at a time
  tryNade(P, dist, dy) {
    if (Nades.enemyCd > 0 || (P.state === 'car' && (!P.car || Math.abs(P.car.speed) > 5)) || !P.alive || dist < 7 || dist > 22 || Math.abs(dy) > 5 || (Game.def && Game.def.training)) return false;
    if (!this.seesPlayer && (this.lostT || 0) > 2) return false; // only at a robot seen a moment ago
    for (const n of Nades.list) if (n.owner && n.owner.team !== 'police') return false;
    const err = (1.1 + P.speedNow * 0.22) / Math.max(0.5, Game.enemyAcc * diffK().acc / 0.8), see = this.seesPlayer || this.lkx === undefined; // out of sight: where it was last seen
    const tx = (see ? P.pos.x + P.vel.x * 0.8 : this.lkx) + R(-err, err), tz = (see ? P.pos.z + P.vel.z * 0.8 : this.lkz) + R(-err, err);
    for (const a of Game.actors) if (a !== this && a.team === this.team && a.alive && !a.down && dist2D(a.pos.x, a.pos.z, tx, tz) < 5.5) return false;
    const yaw = angleTo(this.pos.x, this.pos.z, tx, tz), fx = Math.sin(yaw), fz = Math.cos(yaw), s = this.app.scale || 1;
    const hx = this.pos.x + (-0.24 * fz + 0.34 * fx) * s, hy = this.pos.y + 1.84 * s, hz = this.pos.z + (0.24 * fx + 0.34 * fz) * s;
    const v = Nades.aimAt(hx, hy, hz, tx, P.pos.y, tz, 17), land = Nades.simulate(hx, hy, hz, v[0], v[1], v[2]);
    if (!land || dist2D(land.x, land.z, this.pos.x, this.pos.z) < 6) return false; // it would bounce back
    this.yaw = yaw; this.aimT = 0; this.aiming = false; this.burstLeft = 0; this.releaseToken();
    this.startThrow(v[0], v[1], v[2], NADE_FUSE + 0.25); this.nades--; Nades.enemyCd = R(5, 8);
    return true;
  }
  // allies still able to fight around (courage in numbers)
  matesNear() { let n = 0; for (const a of Game.actors) if (a !== this && a instanceof Enemy && a.team === this.team && a.alive && !a.down && !a.cuffed && a.state !== 'surrender' && dist3(a.pos, this.pos) < 14) n++; return n; }
  alert() {
    if (this.alerted) return; this.alerted = true; this.combatT = 4; this.atkCd = R(0.6, 1.4);
    FX.exclaim(this); if (this.ai === 'idle' || this.ai === 'patrol' || this.ai === 'guard') this.ai = 'engage';
    const P = this.P || this.pickP(); if (this.lkx === undefined) { this.lkx = P.pos.x; this.lkz = P.pos.z; this.lostT = 0; }
    for (const a of Game.actors) if (a !== this && a instanceof Enemy && a.team === this.team && !a.alerted && dist3(a.pos, this.pos) < 14) { a.alerted = true; a.combatT = 4; a.lkx = this.lkx; a.lkz = this.lkz; a.lostT = 2; if (a.ai === 'idle' || a.ai === 'patrol' || a.ai === 'guard') a.ai = 'engage'; } // a shout: "over there!"
    Game.onAlert(this);
  }
  hearNoise(x, z, d, src) { if ((src && src.isRobot) || src === null) { if (d < 32 && this.ai !== 'path' && this.ai !== 'script') { this.alert(); if (!this.seesPlayer) { this.lkx = x; this.lkz = z; this.lostT = Math.min(this.lostT || 0, 4); this.searchT = 0; } } } }
  takeHit(src, dmg, o) {
    if (this.ai === 'path' && src && src.isRobot && o.kind === 'melee') { this.ai = 'engage'; this.alerted = true; this.path = null; this.noPhys = false; if (this.state === 'ladder' || this.state === 'zip' || this.state === 'air') this.setState('move'); }
    const r = super.takeHit(src, dmg, o);
    if (r === true && src && src.isRobot) this.alert();
    // a badly hurt enemy may give up, rarely while its mates are still fighting
    if (r === true && this.alive && !this.down && this.state !== 'surrender' && this.hp < this.maxHp * 0.3 && !this.T.noSurrender && !this.boss && Math.random() < (this.T.surrender || 0.3) * (this.matesNear() >= 2 ? 0.25 : 0.7)) this.surrender();
    if (r === true && this.boss) this.bossHit();
    return r;
  }
  update(dt) {
    this.updateThrow(dt);
    if (this.throwT >= 0 && !this.thrown && this.state !== 'move' && this.state !== 'air') this.dropThrow(); // knocked out of the throw: the grenade falls
    if (this.state === 'surrender') this.updateSurrender(dt);
    if (this.aimT > 0 && this.state !== 'move' && this.state !== 'hit') { this.aimT = 0; this.burstLeft = 0; this.aiming = false; Combat.releaseShot(this); } // a flinch only delays the shot
    if (this.noPhys) { this.updatePathKinematic(dt); this.animate(dt); return; }
    if (this.updateCommon(dt)) { if (this.state === 'getup' && this.fleeAfter) this.ai = 'flee'; this.physics(dt); this.animate(dt); return; }
    if (this.state === 'charge') this.updateCharge(dt);
    else if (this.state === 'move') this.think(dt);
    else if (this.state === 'air') { if (this.grounded) this.setState('move'); }
    this.physics(dt);
    if (this.state === 'move' && !this.grounded && this.vel.y < -2.5) this.setState('air');
    if (this.state === 'air' && this.grounded) this.setState('move');
    this.animate(dt);
  }
  updateSurrender(dt) {
    const d = MP.host ? MP.distToRobots(this.pos.x, this.pos.z) : dist3(this.pos, Game.player.pos);
    if (d > 26) { this.surrT += dt; if (this.surrT > 9) { this.setState('getup'); this.fleeAfter = true; this.surrT = 0; } } else this.surrT = 0;
  }
  think(dt) {
    if (!this.P || this.P.removed || this.thinkT - dt <= 0) this.pickP();
    const P = this.P; this.thinkT -= dt;
    let V = P; const H = this.hunt; // someone the robot protects: the closer of the two gets the attention
    if (H && H.alive && !H.removed && !H.inCar && !H.hidden && this.alerted && (this.huntAll || dist3(H.pos, this.pos) < dist3(P.pos, this.pos) * 0.85)) V = H;
    const tgt = V === P && P.state === 'car' && P.car ? P.car : V;
    const dx = tgt.pos.x - this.pos.x, dz = tgt.pos.z - this.pos.z, dist = Math.max(1e-3, Math.hypot(dx, dz)), dy = tgt.pos.y - this.pos.y;
    this.aiming = false; this.blocking = false;
    if (this.thinkT <= 0) {
      this.thinkT = 0.25 + Math.random() * 0.1;
      if (!this.alerted && this.ai !== 'path' && this.ai !== 'script' && this.ai !== 'flee' && P.alive) { if (dist < (this.T.aggro || 16) && Math.abs(dy) < 6 && (dist < 2.2 || World.los(this.pos, P.pos, 1.5, 1.2))) { this.lkx = P.pos.x; this.lkz = P.pos.z; this.lostT = 0; this.alert(); } }
      if (this.alerted) {
        this.seesPlayer = dist < 50 && World.los(this.pos, tgt === P.car && P.car ? P.car.pos : P.pos, 1.5, P.state === 'car' ? 0.8 : 1.2);
        if (this.seesPlayer) {
          this.lkx = P.pos.x; this.lkz = P.pos.z; this.lostT = 0; this.searchT = 0;
          if ((this.shareT = (this.shareT || 0) - 0.25) <= 0) { this.shareT = 1.5; for (const a of Game.actors) if (a !== this && a instanceof Enemy && a.team === this.team && a.alerted && !a.seesPlayer && dist3(a.pos, this.pos) < 22) { a.lkx = P.pos.x; a.lkz = P.pos.z; a.lostT = Math.min(a.lostT || 0, 2); } }
        } else {
          this.lostT = (this.lostT || 0) + 0.3;
          if (this.lkx === undefined || this.lostT > 24) { this.lkx = P.pos.x; this.lkz = P.pos.z; this.lostT = 10; } // after a long while the squad radios a fresh position
        }
      }
      // only the cowards (muggers, thieves, runners) or the badly hurt give up when a gun is pointed at them, alone,
      // and each decides once in a while (not four times a second)
      this.gunCheckT = (this.gunCheckT || 0) - 0.25;
      if (P.isFirearm && P.isFirearm() && (P.aiming || P.firingT > 0) && !this.T.noSurrender && !this.boss && !this.T.ranged && dist < 10 && this.state === 'move' && this.gunCheckT <= 0) {
        this.gunCheckT = R(2.5, 4);
        const ang = Math.abs(wrapAngle(angleTo(P.pos.x, P.pos.z, this.pos.x, this.pos.z) - P.yaw)), hurt = 1 - this.hp / this.maxHp;
        const coward = (this.T.surrender || 0) >= 0.5 || hurt > 0.6;
        if (ang < 0.22 && coward && this.matesNear() < 2 && Math.random() < 0.08 + hurt * 0.25) { this.surrender(); return; }
      }
    }
    if (this.fleeAfter && this.ai !== 'flee') this.ai = 'flee';
    // throwing: stand and face the target until the grenade has left the hand
    if (this.throwT >= 0) { this.friction(dt, 10); this.faceTo(tgt.pos.x, tgt.pos.z, dt, 12); this.combatT = 3; return; }
    if (this.nades > 0 && this.alerted && V === P && this.ai !== 'path' && this.ai !== 'script' && this.ai !== 'flee' && this.ai !== 'mug') {
      this.nadeCd -= dt; if (this.nadeCd <= 0) { this.nadeCd = R(1.2, 2.6); if (this.tryNade(P, dist, dy)) return; }
    }
    switch (this.ai) {
      case 'path': return this.followPath(dt);
      case 'flee': return this.flee(dt, P, dist);
      case 'script': this.friction(dt, 8); return;
      case 'mug': this.mug(dt); return;
    }
    if (!this.alerted || !P.alive || P.removedFromPlay) { this.idle(dt); return; }
    if (this.T.runner && this.ai !== 'engage') { this.ai = 'flee'; return; }
    this.combatT = 3;
    if (this.boss && !this.T.ranged) return this.engageBoss(dt, V, dx, dz, dist, dy);
    if (this.T.ranged) return this.engageRanged(dt, V, tgt, dx, dz, dist, dy);
    return this.engageMelee(dt, V, dx, dz, dist, dy);
  }
  idle(dt) {
    this.combatT = 0;
    if (this.ai === 'patrol') {
      this.wanderT -= dt;
      if (!this.wanderTo || this.wanderT <= 0) { const a = R(0, TAU), r = R(1, this.homeR); this.wanderTo = { x: this.home.x + Math.sin(a) * r, z: this.home.z + Math.cos(a) * r }; this.wanderT = R(4, 8); }
      const d = dist2D(this.pos.x, this.pos.z, this.wanderTo.x, this.wanderTo.z);
      if (d > 0.6 && this.wanderT > 2) this.moveTo(this.wanderTo.x, this.wanderTo.z, 1.4, dt); else this.friction(dt, 8);
    } else { this.friction(dt, 8); if (this.faceYaw !== undefined) this.yaw = dampAngle(this.yaw, this.faceYaw, 3, dt); }
  }
  faceTo(x, z, dt, k = 10) { this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, x, z), k, dt); }
  moveDir(dx, dz, speed, dt, face = true) {
    // don't walk off roofs/ledges
    const ax = this.pos.x + dx * 0.9, az = this.pos.z + dz * 0.9;
    if (World.groundAt(ax, az, 0.25, this.pos.y + STEP) < this.pos.y - 2.0) speed = 0;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 2.5 && speed > 2.5) { const c = (this.vel.x * dx + this.vel.z * dz) / hs; if (c < 0.5) speed *= Math.max(0.45, 0.5 + c * 0.5); } // a sharp turn at a run: brake into it
    this.steer(dx, dz, speed, hs > 3 ? 13 : 20, dt);
    if (face && speed > 0.3) this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 7.5, dt);
  }
  moveTo(x, z, speed, dt, face = true) {
    let dx = x - this.pos.x, dz = z - this.pos.z; const d = Math.hypot(dx, dz); if (d < 0.05) { this.friction(dt, 10); return; }
    dx /= d; dz /= d;
    this.checkT += dt;
    if (this.checkT > 0.7) { const moved = dist2D(this.pos.x, this.pos.z, this.checkPos.x, this.checkPos.z); if (moved < 0.35 * speed * 0.7 && speed > 1) { const side = chance(0.5) ? 1 : -1; this.detourX = -dz * side; this.detourZ = dx * side; this.detourT = 0.9; } this.checkPos.copy(this.pos); this.checkT = 0; }
    if (this.detourT > 0) { this.detourT -= dt; dx = dx * 0.35 + this.detourX; dz = dz * 0.35 + this.detourZ; const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
    this.moveDir(dx, dz, speed, dt, face);
  }
  engageMelee(dt, P, dx, dz, dist, dy) {
    if (P.state === 'car' && P.car) { if (this.attackCar(dt, P, P.car, dist)) return; }
    if (Math.abs(dy) > 1.6) { // unreachable (player on roof / below)
      this.releaseToken();
      if (dist > 5) { const C = this.chase(P); this.moveTo(C.x, C.z, 3.2, dt); } else { this.friction(dt, 8); this.faceTo(P.pos.x, P.pos.z, dt); }
      return;
    }
    if (!this.seesPlayer && (this.lostT || 0) >= 1.2 && dist > 2.5) { this.releaseToken(); const C = this.chase(P); this.moveTo(C.x, C.z, this.speed * 0.85, dt); return; } // searching
    this.atkCd -= dt;
    const want = this.atkCd <= 0 && dist < 7 && P.alive && P.state !== 'dead';
    const tok = want && Combat.canAttack(this);
    if (tok) {
      this.tokenT += dt;
      const name = RP(this.T.atk); const range = ATK[name].range;
      if (dist - P.r < range * 0.8) { this.startAttack(name, P); this.atkCd = R(1.1, 2.4); this.tokenT = 0; return; }
      this.moveTo(P.pos.x, P.pos.z, this.speed, dt);
      if (this.tokenT > 3.5) { this.releaseToken(); this.atkCd = 1; }
    } else {
      const desired = 3.2 + this.seed * 1.4;
      this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = R(1.2, 3); if (chance(0.5)) this.strafeDir *= -1; }
      const rx = dx / dist, rz = dz / dist; const tx = -rz * this.strafeDir, tz = rx * this.strafeDir;
      const radial = clamp((dist - desired) * 0.8, -1, 1);
      let mx = rx * radial + tx * 0.7, mz = rz * radial + tz * 0.7; const ml = Math.hypot(mx, mz) || 1;
      this.moveDir(mx / ml, mz / ml, dist > 9 ? this.speed : 1.7, dt, false);
      this.faceTo(P.pos.x, P.pos.z, dt);
    }
  }
  onAttackEnd() { this.releaseToken(); }
  // the robot at the wheel: jump out of the way of a moving car, go for the window of a slow one
  attackCar(dt, P, c, dist) {
    const sp = Math.abs(c.speed);
    if (sp > 4.5) { // coming at speed: get out of its way, then come back
      this.releaseToken();
      const rel = (this.pos.x - c.pos.x) * c.fx + (this.pos.z - c.pos.z) * c.fz, side = (this.pos.x - c.pos.x) * -c.fz + (this.pos.z - c.pos.z) * c.fx;
      if (dist < 10 && rel * Math.sign(c.speed) > -1) { const s = side >= 0 ? 1 : -1; this.moveDir(-c.fz * s, c.fx * s, this.speed, dt, false); } else this.friction(dt, 6);
      this.faceTo(c.pos.x, c.pos.z, dt); return true;
    }
    // the side of the car he is on: the window there
    const side = ((this.pos.x - c.pos.x) * -c.fz + (this.pos.z - c.pos.z) * c.fx) >= 0 ? 1 : -1, off = c.wid / 2 + 0.6;
    const wx = c.pos.x - c.fz * side * off - c.fx * 0.25, wz = c.pos.z + c.fx * side * off - c.fz * 0.25;
    const dw = dist2D(this.pos.x, this.pos.z, wx, wz);
    this.atkCd -= dt;
    if (dw > 0.8) { this.moveTo(wx, wz, dist > 9 ? this.speed : this.speed * 0.85, dt); return true; }
    this.friction(dt, 10); this.faceTo(c.pos.x, c.pos.z, dt, 12);
    if (this.atkCd <= 0 && P.alive && Combat.canAttack(this)) { this.startAttack(RP(this.T.atk), null); this.atk.carHit = c; this.atkCd = R(1.0, 1.9); }
    return true;
  }
  engageRanged(dt, P, tgt, dx, dz, dist, dy) {
    this.aiming = true;
    if (this.aimT > 0) {
      this.aimT -= dt; this.faceTo(tgt.pos.x, tgt.pos.z, dt, 14); this.friction(dt, 12);
      this.aimPitch = clamp(Math.atan2(dy, dist) * 0.8, -0.6, 0.6);
      const o = this.shotOrigin(tgt.pos.x, tgt.pos.z, this._so || (this._so = new V3()));
      if (this.seesPlayer && this.aimT > 0.08 && this.burstLeft === (this.ws('burst') || 1)) FX.laser(o, tgt.pos.x, tgt.pos.y + (tgt === P || tgt === P.car ? 1.2 : 0.8), tgt.pos.z, this.aimT);
      if (this.aimT <= 0) {
        if (this.seesPlayer) this.shootAt(tgt, dist); else this.burstLeft = 1; // lost sight: the burst stops
        this.burstLeft--; if (this.burstLeft > 0) this.aimT = this.ws('gap') || 0.12; else { const rf = this.ws('rof'); this.fireCd = R(rf[0], rf[1]); Combat.releaseShot(this); }
      }
      return;
    }
    this.fireCd -= dt; this.coverCd = (this.coverCd || 0) - dt;
    if (dist < 2.3 && P.state !== 'car') { this.atkCd -= dt; if (this.atkCd <= 0) { this.startAttack('e_shove', P); this.atkCd = 2; return; } }
    const rx = dx / dist, rz = dz / dist;
    // behind cover: wait there, out of the robot's sight, then come back out (sooner if he closes in)
    if (this.cover) {
      const C = this.cover; C.t -= dt; const dc = dist2D(this.pos.x, this.pos.z, C.x, C.z);
      if (dc > 0.6) { this.moveTo(C.x, C.z, this.speed, dt); this.aiming = false; }
      else { this.friction(dt, 10); this.faceTo(tgt.pos.x, tgt.pos.z, dt); this.aiming = false; if (!C.in) { C.in = true; C.t = Math.min(C.t, R(1.4, 2.8)); } }
      if (C.t <= 0 || dist < 4.5 || (C.in && this.seesPlayer && Math.random() < 0.02)) { this.cover = null; this.coverCd = R(6, 11); }
      return;
    }
    // flanking: no turn to fire yet, so go round the side instead of standing in the open
    if (this.flank) {
      const F = this.flank; F.t -= dt; const df = dist2D(this.pos.x, this.pos.z, F.x, F.z);
      if (df > 0.7 && F.t > 0) { this.moveTo(F.x, F.z, this.speed * 0.9, dt, false); this.faceTo(tgt.pos.x, tgt.pos.z, dt); this.aiming = true; }
      else { this.flank = null; this.fireCd = Math.min(this.fireCd, 0.15); }
      if (this.flank) return;
    }
    if (!this.seesPlayer) { const C = tgt === P ? this.chase(P) : tgt.pos; this.moveTo(C.x, C.z, this.speed, dt); }
    else if (dist > this.ws('rmax')) this.moveTo(tgt.pos.x, tgt.pos.z, this.speed, dt);
    else if (dist < this.ws('rmin')) this.moveDir(-rx, -rz, this.speed * 0.8, dt, false);
    else { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = R(1.5, 3); this.strafeDir *= -1; } this.moveDir(-rz * this.strafeDir, rx * this.strafeDir, 1.4, dt, false); }
    this.faceTo(tgt.pos.x, tgt.pos.z, dt);
    // badly hurt, or just emptied a burst: some duck behind the nearest wall or car for a moment
    if (tgt === P && !this.boss && this.coverCd <= 0 && this.seesPlayer && dist > 5 && (this.hp < this.maxHp * 0.45 ? Math.random() < 0.012 : (this.fireCd > 0.9 && Math.random() < 0.004))) { const c = this.findCover(P); if (c) { this.cover = { x: c.x, z: c.z, t: 5, in: false }; this.coverCd = 4; return; } }
    if (this.seesPlayer && dist <= this.ws('rmax') + 4 && this.fireCd <= 0 && P.alive && this.weapon) {
      if ((tgt !== P && tgt !== P.car) || Combat.canShoot(this)) { this.aimT = this.ws('aimT'); this.burstLeft = this.ws('burst') || 1; }
      else { this.fireCd = R(0.4, 0.9); if (!this.boss && Math.random() < 0.5) { const f = this.findFlank(P, dist); if (f) this.flank = { x: f.x, z: f.z, t: R(2, 3.2) }; } }
    }
  }
  // a spot a few steps away, out of the robot's line of sight, roughly between here and away from him
  findCover(P) {
    const ax = angleTo(P.pos.x, P.pos.z, this.pos.x, this.pos.z); let best = null, bd = 1e9; const q = [];
    for (let i = 0; i < 10; i++) {
      const a = ax + R(-1.6, 1.6), r = R(2.5, 6.5), x = this.pos.x + Math.sin(a) * r, z = this.pos.z + Math.cos(a) * r;
      const g = World.groundAt(x, z, 0.3, this.pos.y + STEP); if (Math.abs(g - this.pos.y) > 0.5) continue;
      if (dist2D(x, z, P.pos.x, P.pos.z) < 4.5) continue;
      World.query(x - 0.45, z - 0.45, x + 0.45, z + 0.45, q); if (q.some(b => !b.off && b.y1 > g + 0.3 && b.y0 < g + 1.8)) continue;
      const S = { x, y: g, z }; if (World.los(S, P.pos, 1.5, 1.2)) continue; // still in view
      if (Cars.topAt(x, z, 0.4, 99) > -1e8) continue;
      const d = r + (this.hp < this.maxHp * 0.45 ? 0 : dist2D(x, z, P.pos.x, P.pos.z) * 0.2); if (d < bd) { bd = d; best = S; }
    }
    return best;
  }
  // a point on the robot's side, at shooting range
  findFlank(P, dist) {
    const base = angleTo(P.pos.x, P.pos.z, this.pos.x, this.pos.z), side = this.seed > 0.5 ? 1 : -1, rr = clamp(dist, this.ws('rmin') + 1, this.ws('rmax') - 1); const q = [];
    for (let i = 0; i < 4; i++) {
      const a = base + side * R(0.9, 1.5), x = P.pos.x + Math.sin(a) * rr, z = P.pos.z + Math.cos(a) * rr;
      const g = World.groundAt(x, z, 0.3, this.pos.y + STEP); if (Math.abs(g - this.pos.y) > 0.6) continue;
      World.query(x - 0.45, z - 0.45, x + 0.45, z + 0.45, q); if (q.some(b => !b.off && b.y1 > g + 0.3 && b.y0 < g + 1.8)) continue;
      return { x, z };
    }
    return null;
  }
  shootAt(tgt, dist) {
    const P = this.P || Game.player; const mz = this.shotOrigin(tgt.pos.x, tgt.pos.z, this._so || (this._so = new V3()));
    const atCar = !!P.car && tgt === P.car;
    { const ty = tgt.pos.y + (tgt === P || atCar ? 1.15 : 0.9), dx = tgt.pos.x - mz.x, dy = ty - mz.y, dz = tgt.pos.z - mz.z, L = Math.hypot(dx, dy, dz) || 1;
      if (World.raycast(mz.x, mz.y, mz.z, dx / L, dy / L, dz / L, L - 0.4)) return; } // a wall between the gun and the robot: no shot
    let tx = tgt.pos.x, ty = tgt.pos.y + (tgt === P || atCar ? 1.15 : 0.9), tz = tgt.pos.z;
    let chanceHit = this.ws('acc') * clamp(1.15 - dist / 45, 0.2, 1) * Game.enemyAcc * diffK().acc;
    if (tgt === P) { if (P.speedNow > 5) chanceHit *= 0.55; else if (P.speedNow > 2.2) chanceHit *= 0.8; if (P.state === 'roll' || P.iframe > 0) chanceHit = 0; if (P.blocking) chanceHit *= 0.8; }
    if (atCar) { const s = Math.abs(P.car.speed); chanceHit *= s > 16 ? 0.45 : s > 7 ? 0.7 : 1; } // a car going fast is hard to hit
    const pellets = this.ws('pellets') || 1;
    if (pellets > 1) chanceHit *= clamp(1.3 - dist / 12, 0.25, 1); // buckshot spreads: deadly up close, a sting at range
    for (let p = 0; p < pellets; p++) {
      let ax = tx, ay = ty, az = tz;
      if (atCar) { ax += P.car.vx * 0.12; az += P.car.vz * 0.12; }
      if (Math.random() > chanceHit) { // a miss is a miss: the bullet whizzes past, beside or over the robot
        const qx = tz - mz.z, qz = -(tx - mz.x), ql = Math.hypot(qx, qz) || 1, sd = (Math.random() < 0.5 ? -1 : 1) * R(0.75, 1.5);
        ax += qx / ql * sd; az += qz / ql * sd; ay += R(-0.4, 0.9);
      }
      else { ax += R(-0.12, 0.12); ay += R(-0.2, 0.2); az += R(-0.12, 0.12); }
      let dx = ax - mz.x, dy = ay - mz.y, dz = az - mz.z; const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
      const r = Combat.shoot(this, mz.x, mz.y, mz.z, dx, dy, dz, 70, this.ws('dmg'), { knock: pellets > 1 ? 1.2 : 0.8 });
      FX.tracer(mz.x, mz.y, mz.z, r.x, r.y, r.z, [1, 0.5, 0.35]);
    }
    FX.muzzle(mz.x, mz.y, mz.z, this.yaw); Lights.add(mz.x, mz.y, mz.z, 3, 1.8, 0.9, 8, 0.06, 'muzzleE' + (this.id % 2)); this.an.recoil(pellets > 1 ? 1.1 : 0.6); if (pellets === 1) FX.casing(mz.x, mz.y, mz.z, this.yaw);
    Snd.play(WEAPONS[this.weapon] ? WEAPONS[this.weapon].snd : 'pistol', this.pos, 0.9);
    Combat.noise(this.pos.x, this.pos.z, 35, this);
  }
  flee(dt, P, dist) {
    this.fleeT += dt;
    let dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const sp = this.T.runner ? this.speed * (this.fleeT > 22 ? 0.72 : 1) : this.speed * 0.95;
    this.moveTo(this.pos.x + dx * 6, this.pos.z + dz * 6, sp, dt);
    if (dist > 70) { this.escapeT += dt; if (this.escapeT > 2) { this.removed = true; this.alive = false; Game.onEscape(this); } }
  }
  mug(dt) { // threatening a victim
    const v = this.victim; if (!v || !v.alive) { this.ai = 'engage'; return; }
    this.faceTo(v.pos.x, v.pos.z, dt); this.friction(dt, 10); this.combatT = 2;
    const P = MP.host ? MP.nearestRobot(this.pos.x, this.pos.z) || Game.player : Game.player; if (dist3(P.pos, this.pos) < 9 || (this.lastHitBy && this.lastHitBy.isRobot)) { this.alert(); this.ai = chance(0.4) ? 'flee' : 'engage'; if (this.ai === 'flee') this.fleeAfter = false; v.release && v.release(); }
  }
  /* ---------------- bosses ---------------- */
  bossHit() {
    if (this.T.herald || this.T.summon) {
      const f = this.hp / this.maxHp;
      if (f < 0.66 && this.summoned === 0) { this.summoned = 1; Game.onBossPhase(this, 1); }
      if (f < 0.33 && this.summoned === 1) { this.summoned = 2; Game.onBossPhase(this, 2); }
      if (this.hp <= 0) return;
      if (this.T.herald && Math.random() < 0.18 && this.tpCd <= 0) this.teleportSoon = true;
    }
  }
  engageBoss(dt, P, dx, dz, dist, dy) {
    this.chargeCd -= dt; this.slamCd -= dt; this.tpCd -= dt; this.atkCd -= dt;
    if (P.state === 'car' && P.car) { if (this.T.charge && this.chargeCd <= 0 && dist > 6 && dist < 22 && Math.abs(P.car.speed) < 6) { this.startCharge(P); return; } if (this.attackCar(dt, P, P.car, dist)) return; }
    if (this.T.herald && !this.T.noTp && (this.teleportSoon || (dist > 14 && this.tpCd <= 0))) { this.teleportSoon = false; this.tpCd = R(7, 11); this.startTeleport(); return; }
    if (this.T.charge && this.chargeCd <= 0 && dist > 6 && dist < 22 && Math.abs(dy) < 1) { this.startCharge(P); return; }
    if ((this.T.herald || this.T.slam) && this.slamCd <= 0 && dist > 2.5 && dist < 9) { this.slamCd = R(5, 8); this.startAttack('b_slam', null); this.yaw = angleTo(this.pos.x, this.pos.z, P.pos.x, P.pos.z); this.slamTarget = { x: P.pos.x, z: P.pos.z }; FX.ring(P.pos.x, P.pos.y + 0.05, P.pos.z, 4.6, [0.2, 1, 0.75], 0.9); return; }
    if (this.atkCd <= 0 && dist < 2.6) { const name = RP(this.T.atk); this.startAttack(name, P); this.atkCd = R(0.9, 1.8); return; }
    if (dist > 2.0) this.moveTo(P.pos.x, P.pos.z, dist > 8 ? this.speed * 1.15 : this.speed, dt); else { this.friction(dt, 8); this.faceTo(P.pos.x, P.pos.z, dt); }
  }
  startCharge(P) { this.setState('charge'); this.chargeCd = R(6, 9); this.chargeYaw = angleTo(this.pos.x, this.pos.z, P.pos.x, P.pos.z); this.yaw = this.chargeYaw; FX.telegraph(this, 0.5); Snd.play('alarm', this.pos, 0.5); this.chargeHit = false; }
  updateCharge(dt) {
    const t = this.st; this.combatT = 3;
    if (t < 0.5) { this.friction(dt, 10); this.phase += dt * 20; return; }
    const sp = 9; this.vel.x = Math.sin(this.chargeYaw) * sp; this.vel.z = Math.cos(this.chargeYaw) * sp;
    const P = this.P || Game.player;
    if (!this.chargeHit && P.car && P.state === 'car' && dist2D(P.car.pos.x, P.car.pos.z, this.pos.x, this.pos.z) < P.car.len * 0.5 + 0.9) { // rams the car
      this.chargeHit = true; const c = P.car; Cars.damage(c, 30, this); c.vx += Math.sin(this.chargeYaw) * 4 / c.T.mass; c.vz += Math.cos(this.chargeYaw) * 4 / c.T.mass; c.bump = 0.4;
      P.takeHit(this, 14, { kind: 'melee', knock: 0 }); Snd.play('crash', c.pos, 0.9); CamCtl.shake(0.6); this.vel.x *= -0.2; this.vel.z *= -0.2;
    }
    if (!this.chargeHit && dist3(P.pos, this.pos) < 1.5) { this.chargeHit = true; P.takeHit(this, 22, { kind: 'melee', knock: 9, kd: 1, heavy: true, poise: 80 }); Snd.play('heavy', P.pos); CamCtl.shake(0.6); }
    if (this.nContacts > 0 && t > 0.7) { // hit a wall -> dazed
      Snd.play('crash', this.pos, 0.8); CamCtl.shake(0.5); FX.spark(this.pos.x + Math.sin(this.chargeYaw), this.pos.y + 1.2, this.pos.z + Math.cos(this.chargeYaw), 1.2, 14, [1, 0.8, 0.5]);
      this.superArmor = false; this.stagger(2.2, true); setTimeout(() => { this.superArmor = true; }, 2300); return;
    }
    if (t > 2.2 || (this.chargeHit && t > 1)) { this.setState('move'); }
  }
  startTeleport() {
    FX.smoke(this.pos.x, this.pos.y + 1, this.pos.z, [0.2, 0.9, 0.7], 18); Snd.play('magic', this.pos);
    const P = this.P || Game.player; const a = P.yaw + Math.PI + R(-0.8, 0.8);
    let nx = P.pos.x + Math.sin(a) * 3.2, nz = P.pos.z + Math.cos(a) * 3.2;
    const A = this.arena || (World.spots.lighthouse ? { x0: 81, x1: 109, z0: 234, z1: 247 } : null); if (A) { nx = clamp(nx, A.x0, A.x1); nz = clamp(nz, A.z0, A.z1); }
    this.pos.x = nx; this.pos.z = nz; this.pos.y = World.groundAt(nx, nz, 0.3, P.pos.y + 1);
    FX.smoke(this.pos.x, this.pos.y + 1, this.pos.z, [0.2, 0.9, 0.7], 18);
    this.yaw = angleTo(nx, nz, P.pos.x, P.pos.z); this.atkCd = 0.25;
  }
  /* ---------------- scripted path (rooftop chase) ---------------- */
  followPath(dt) {
    const n = this.path[this.pi]; if (!n) { this.path = null; this.ai = 'engage'; this.alerted = true; this.combatT = 4; return; }
    const P = MP.host ? MP.nearestRobot(this.pos.x, this.pos.z) || Game.player : Game.player; const dp = dist3(this.pos, P.pos);
    let mul = dp > 30 ? 0 : dp > 20 ? 0.62 : dp < 7 ? 1.18 : 0.95;
    if (mul === 0) { this.friction(dt, 8); this.faceTo(P.pos.x, P.pos.z, dt); this.waiting = true; return; }
    this.waiting = false;
    if (n.m === 'run') {
      const d = dist2D(this.pos.x, this.pos.z, n.x, n.z);
      if (d < 0.5) { this.pi++; return; }
      let dx = (n.x - this.pos.x) / d, dz = (n.z - this.pos.z) / d;
      this.steer(dx, dz, this.speed * mul, 24, dt); this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 12, dt);
    } else { this.noPhys = true; this.kin = { m: n.m, sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, t: 0, n }; if (n.m === 'ladder') this.setState('ladder'); else if (n.m === 'zip') this.setState('zip'); else this.setState('air'); }
  }
  updatePathKinematic(dt) {
    const K = this.kin; if (!K) { this.noPhys = false; return; } const n = K.n; this.t += dt; this.st += dt;
    const P = MP.host ? MP.nearestRobot(this.pos.x, this.pos.z) || Game.player : Game.player; const dp = dist3(this.pos, P.pos); const mul = dp > 30 ? 0.35 : dp < 7 ? 1.2 : 1;
    if (K.m === 'ladder') {
      this.pos.y = Math.min(n.y, this.pos.y + 3.2 * mul * dt); this.ladderPh = (this.ladderPh || 0) + dt * 14 * mul; this.yaw = Math.atan2(1, 0) + Math.PI; // face -x (wall)
      const L = World.ladders.find(l => dist2D(l.x, l.z, n.x, n.z) < 1.5); if (L) this.yaw = Math.atan2(-L.nx, -L.nz);
      if (this.pos.y >= n.y - 0.01) { this.pi++; this.noPhys = false; this.kin = null; const nx = this.path[this.pi]; if (nx) { this.pos.x = lerp(this.pos.x, nx.x, 0.5); this.pos.z = lerp(this.pos.z, nx.z, 0.5); } this.pos.y = n.y; this.vel.set(0, 0, 0); this.setState('move'); this.grounded = true; }
    } else if (K.m === 'jump') {
      const D = Math.hypot(n.x - K.sx, n.z - K.sz); const dur = clamp(D / 7.5, 0.4, 0.95);
      K.t += dt * mul; const u = clamp(K.t / dur, 0, 1);
      this.pos.set(lerp(K.sx, n.x, u), lerp(K.sy, n.y, u) + Math.sin(u * Math.PI) * (1.1 + Math.max(0, n.y - K.sy)), lerp(K.sz, n.z, u));
      this.vel.y = u < 0.5 ? 4 : -4; this.yaw = angleTo(K.sx, K.sz, n.x, n.z);
      if (u >= 1) { this.pi++; this.noPhys = false; this.kin = null; this.vel.set(0, 0, 0); this.setState('move'); this.grounded = true; Snd.play('land', this.pos, 0.6); }
    } else if (K.m === 'zip') {
      const Z = World.spots.heroZip; K.t += dt * 12 * Math.max(0.5, mul) / Z.len; const u = clamp(K.t, 0, 1);
      this.pos.set(Z.a.x + Z.d.x * Z.len * u, Z.a.y + Z.d.y * Z.len * u - 2.05, Z.a.z + Z.d.z * Z.len * u); this.yaw = Math.atan2(Z.d.x, Z.d.z);
      if (Math.random() < 0.5) FX.sparkTrail(this.pos.x, this.pos.y + 2.05, this.pos.z);
      if (u >= 1) { this.pi++; this.noPhys = false; this.kin = null; this.vel.set(Z.d.x * 3, 0, Z.d.z * 3); this.setState('air'); this.grounded = false; }
    }
  }
}

/* =====================================================================
   CIVILIANS
   ===================================================================== */
class Civilian extends Actor {
  constructor(x, z, o = {}) {
    super({ kind: 'civ', app: o.app || 'civ', team: 'civ', hp: o.hp || 40, x, z, yaw: o.yaw || 0, tags: o.tags });
    this.umbrella = !!this.app.umbrella; this.mode = o.mode || 'walk'; this.walkSpeed = R(1.15, 1.6) * (this.app.look && this.app.look.age ? 0.7 : 1); this.panicT = 0; this.waitT = 0;
    this.idleKind = RP([null, 'crossed', 'hips', 'phone', 'back', 'phone', 'crossed']);
    this.ring = null; this.ri = 0; this.rdir = chance(0.5) ? 1 : -1; this.target = null; this.lethalOnly = false; this.koTime = 12;
    if (this.mode === 'walk') this.pickRing();
  }
  pickRing(i, j) {
    const rings = World.nav.rings; let r;
    if (i !== undefined) r = rings.find(q => q.i === i && q.j === j); else { let bd = 1e9; for (const q of rings) { const d = dist2D(this.pos.x, this.pos.z, q.cx, q.cz); if (d < bd) { bd = d; r = q; } } }
    if (!r) return; this.ring = r; let bd = 1e9; r.pts.forEach((p, k) => { const d = dist2D(this.pos.x, this.pos.z, p[0], p[1]); if (d < bd) { bd = d; this.ri = k; } });
    this.target = { x: r.pts[this.ri][0], z: r.pts[this.ri][1] };
  }
  hearNoise(x, z, d, src) {
    if (this.mode === 'follow') { if (d < 14 && this.state === 'move' && !this.inCar) this.cowerT = 1.1; return; }
    if (this.mode === 'victim' || this.mode === 'script' || this.mode === 'hide' || !this.alive) return; if (d < 26) this.panic(x, z, d);
  }
  panic(x, z, d) {
    if (this.state !== 'move' && this.state !== 'cower') return;
    this.umbrella = false; this.panicFrom = { x, z };
    if (this.mode !== 'flee' && this.mode !== 'cower') { if (d < 7 && chance(0.35)) { this.mode = 'cower'; this.setState('cower'); } else this.mode = 'flee'; }
    this.panicT = R(6, 11);
  }
  release() { if (this.mode === 'victim') { this.mode = 'flee'; this.panicFrom = { x: this.pos.x - Math.sin(this.yaw), z: this.pos.z - Math.cos(this.yaw) }; this.panicT = 6; this.victim = false; if (this.state === 'victim') this.setState('move'); } }
  takeHit(src, dmg, o) {
    const r = super.takeHit(src, dmg, o);
    if (r === true && (this.mode === 'follow' || this.mode === 'hide' || this.tags.escort)) { this.cowerT = 1.4; return r; }
    if (r === true) { this.mode = 'flee'; this.panicT = 10; this.panicFrom = src ? { x: src.pos.x, z: src.pos.z } : { x: this.pos.x, z: this.pos.z }; this.umbrella = false; } return r;
  }
  // escort: stays a few steps behind the robot, ducks when shots ring out, gets in its car
  follow(dt) {
    const P = Game.player; if (!P) return;
    if (P.car && P.car.driver === P) {
      const c = P.car;
      if (this.inCar === c) { this.pos.set(c.pos.x + c.fz * 0.45, c.pos.y, c.pos.z - c.fx * 0.45); this.vel.set(0, 0, 0); return; }
      if (dist2D(this.pos.x, this.pos.z, c.pos.x, c.pos.z) < 7.5 && Math.abs(c.speed) < 4) { this.inCar = c; this.hidden = true; this.setState('move'); return; }
    } else if (this.inCar) {
      const c = this.inCar; this.inCar = null; this.hidden = false;
      const s = World.safeSpot(c.pos.x + c.fz * (c.wid / 2 + 0.8), c.pos.z - c.fx * (c.wid / 2 + 0.8), 0.35); this.pos.set(s.x, s.y, s.z); this.vel.set(0, 0, 0);
    }
    if (this.cowerT > 0) { this.cowerT -= dt; this.friction(dt, 10); if (this.state !== 'cower') this.setState('cower'); return; }
    if (this.state === 'cower') this.setState('move');
    const d = dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z);
    if (d > 2.8 && d < 80) this.goTo(P.pos.x, P.pos.z, clamp((d - 2) * 1.1, 1.3, 5.4), dt);
    else { this.friction(dt, 9); this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, P.pos.x, P.pos.z), 6, dt); }
  }
  goTo(x, z, speed, dt) { // walk toward a point, stepping aside when stuck
    let dx = x - this.pos.x, dz = z - this.pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    this.chkT = (this.chkT || 0) + dt; this.chkP = this.chkP || { x: this.pos.x, z: this.pos.z };
    if (this.chkT > 0.7) { if (dist2D(this.pos.x, this.pos.z, this.chkP.x, this.chkP.z) < 0.25 * speed && speed > 1) { const s = chance(0.5) ? 1 : -1; this.detX = -dz * s; this.detZ = dx * s; this.detT = 0.9; } this.chkP.x = this.pos.x; this.chkP.z = this.pos.z; this.chkT = 0; }
    if (this.detT > 0) { this.detT -= dt; dx = dx * 0.35 + this.detX; dz = dz * 0.35 + this.detZ; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    this.steer(dx, dz, speed, 14, dt); this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 9, dt);
  }
  update(dt) {
    if (this.updateCommon(dt)) { this.physics(dt); this.animate(dt); return; }
    switch (this.mode) {
      case 'walk': this.walk(dt); break;
      case 'flee': {
        this.panicT -= dt; const f = this.panicFrom || this.pos;
        let dx = this.pos.x - f.x, dz = this.pos.z - f.z; const l = Math.hypot(dx, dz) || 1;
        this.steer(dx / l, dz / l, 4.8, 16, dt); this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 10, dt);
        if (this.panicT <= 0) { this.mode = 'walk'; this.pickRing(); this.umbrella = !!this.app.umbrella; }
        break;
      }
      case 'cower': this.friction(dt, 10); this.panicT -= dt; if (this.state !== 'cower') this.setState('cower'); if (this.panicT <= 0) { this.mode = 'flee'; this.panicT = 5; this.setState('move'); } break;
      case 'victim': this.friction(dt, 10); if (this.state !== 'victim') this.setState('victim'); break;
      case 'script': this.friction(dt, 10); if (this.faceYaw !== undefined) this.yaw = dampAngle(this.yaw, this.faceYaw, 4, dt); break;
      case 'follow': this.follow(dt); break;
      case 'goto': if (this.dest && dist2D(this.pos.x, this.pos.z, this.dest.x, this.dest.z) > 0.8) this.goTo(this.dest.x, this.dest.z, this.destSpeed || 3.2, dt); else { this.friction(dt, 10); this.arrived = true; } break;
      case 'hide': this.friction(dt, 10); if (this.state !== 'cower') this.setState('cower'); break;
      case 'wait': this.friction(dt, 10); this.waitT -= dt; if (this.waitT <= 0) this.mode = 'walk'; break;
    }
    if (this.state === 'cower' && this.mode !== 'cower' && this.mode !== 'hide' && !(this.mode === 'follow' && this.cowerT > 0)) this.setState('move');
    if (this.inCar) { this.animate(dt); return; }
    this.physics(dt);
    this.animate(dt);
  }
  walk(dt) {
    if (!this.target) { this.pickRing(); if (!this.target) { this.friction(dt, 8); return; } }
    const d = dist2D(this.pos.x, this.pos.z, this.target.x, this.target.z);
    if (d < 0.6) {
      if (this.crossing) { this.crossing = false; this.pickRing(this.crossTo.i, this.crossTo.j); }
      else if (chance(0.22) && this.tryCross()) { /* crossing */ }
      else { this.ri = (this.ri + this.rdir + 4) % 4; const p = this.ring.pts[this.ri]; this.target = { x: p[0], z: p[1] }; if (chance(0.15)) { this.mode = 'wait'; this.waitT = R(1, 4); } }
      return;
    }
    const dx = (this.target.x - this.pos.x) / d, dz = (this.target.z - this.pos.z) / d;
    // avoid bumping into the player or others ahead
    let sp = this.walkSpeed; const P = Game.player;
    if (P && dist2D(P.pos.x, P.pos.z, this.pos.x + dx, this.pos.z + dz) < 0.9) sp *= 0.3;
    this.steer(dx, dz, sp, 8, dt); this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 6, dt);
  }
  tryCross() {
    const r = this.ring; const k = this.ri; const p = r.pts[k]; const opts = [];
    const cand = [[r.i + 1, r.j], [r.i - 1, r.j], [r.i, r.j + 1], [r.i, r.j - 1]];
    for (const [i, j] of cand) {
      const q = World.nav.rings.find(z => z.i === i && z.j === j); if (!q) continue;
      let best = null, bd = 1e9; q.pts.forEach(pp => { const d = dist2D(p[0], p[1], pp[0], pp[1]); if (d < bd) { bd = d; best = pp; } });
      if (bd < 20) opts.push({ i, j, x: best[0], z: best[1] });
    }
    if (!opts.length) return false;
    const o = RP(opts); this.crossing = true; this.crossTo = o; this.target = { x: o.x, z: o.z }; return true;
  }
}

