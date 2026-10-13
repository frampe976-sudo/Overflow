/* =====================================================================
   MULTIPLAYER — « Brigade de nuit » : 2 to 6 robots on the local network, no server.
   The host's page simulates the city (suspects, passers-by, traffic, crimes, score); each page simulates its own
   robot, so one's own moves never wait for the network. At the host, a guest's robot is a stand-in the gangs
   fight (blows that land on it go to its owner); on a guest's screen everything else is a puppet driven by the
   host's snapshots, poses included. The PC launcher relays the WebSocket frames (tools/pc/launcher/mp.go).
   Messages: JSON for the events (reliable), binary for the states (a late one may be skipped).
   ===================================================================== */
const MP_VER = 'coop-21.0';
const MP_STATES = ['move', 'air', 'attack', 'hit', 'down', 'ko', 'getup', 'dead', 'cuffed', 'beingCuffed', 'surrender', 'car', 'roll', 'hang', 'climb', 'vault', 'ladder', 'fence', 'zip', 'arresting', 'charge', 'cower', 'victim'];
const MP_SI = {}; MP_STATES.forEach((s, i) => { MP_SI[s] = i; });
const MP_WPN = [null, 'bat', 'knife', 'wrench', 'staff', 'pistol', 'shotgun', 'rifle', 'ak', 'uzi'];
const MP_WI = {}; MP_WPN.forEach((w, i) => { if (w) MP_WI[w] = i; });
const MP_SNAP = 3, MP_ME = 4, MP_SNAP_DT = 0.04, MP_ME_DT = 1 / 30;
const MP_FXK = ['hit', 'spark', 'dust', 'blood', 'muzzle', 'tracer', 'casing', 'splash', 'smoke', 'shockwave', 'ring'];
const COOP = Object.assign({}, PATROL, { id: 'coop', no: 'BRIGADE DE NUIT', title: 'Patrouille en équipe', coop: true, civs: 32, traffic: 14 });

// clock of the other side: remote time -> local time of the least delayed message (slowly following drift)
class NetClock {
  constructor() { this.off = null; }
  sample(remoteMs) { const s = performance.now() - remoteMs; if (this.off === null || s < this.off) this.off = s; else this.off += (s - this.off) * 0.0015; }
  local(remoteMs) { return remoteMs + (this.off || 0); }
}

/* ---------------- an actor moved by the network: a puppet (guest side) or a guest's robot (host side) ---------------- */
class NetActor extends Actor {
  constructor(info, rec) {
    super({ kind: info.k || 'npc', app: info.app || info.k, appSeed: info.seed, team: info.team || 'civ', hp: info.hp || 100, x: rec ? rec.x : 0, z: rec ? rec.z : 0, y: rec ? rec.y : 0, yaw: rec ? rec.yaw : 0, weapon: MP_WPN[info.wp || 0] || null, tags: info.tags || {} });
    this.net = info.id || 0; this.puppet = true; this.noPhys = true; this.nb = []; this.pb = []; this.clk = null;
    this.boss = !!info.boss; this.armor = info.armor || 0; this.T = info.T && ETYPES[info.T] ? ETYPES[info.T] : null; this.idleKind = info.idle || null;
    this.isRobot = !!info.robot; this.slot = info.slot || 0; this.pname = info.name || ''; this.speedNow = 0; this.f2 = 0;
    if (this.isRobot) { this.kind = 'player'; this.team = 'police'; }
    this.renderYaw = this.yaw; this.mult = 1;
    if (rec) this.netPush(performance.now(), rec);
  }
  // a state received at local time t (ms)
  netPush(t, r) {
    const nb = this.nb; if (nb.length && t <= nb[nb.length - 1].t) t = nb[nb.length - 1].t + 1;
    nb.push({ t, x: r.x, y: r.y, z: r.z, yaw: r.yaw, vx: r.vx, vz: r.vz, st: r.st, fl: r.fl, f2: r.f2, wp: r.wp, hf: r.hf, hp: r.hp });
    if (nb.length > 30) nb.shift();
    if (r.pose) { this.pb.push({ t, p: r.pose }); if (this.pb.length > 12) this.pb.shift(); }
  }
  update(dt) {
    this.t += dt; this.an.time += dt;
    const nb = this.nb; if (!nb.length) { this.hidden = true; return; }
    const rt = performance.now() - (MP.host ? 70 : 95);
    let i = nb.length - 1; while (i > 0 && nb[i].t > rt) i--;
    const a = nb[i], b = nb[i + 1];
    let k = 0; if (b) k = clamp((rt - a.t) / Math.max(1, b.t - a.t), 0, 1);
    if (b) { this.pos.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k)); this.renderYaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k; this.vel.set(lerp(a.vx, b.vx, k), 0, lerp(a.vz, b.vz, k)); }
    else { const e = clamp((rt - a.t) / 1000, 0, 0.12); this.pos.set(a.x + a.vx * e, a.y, a.z + a.vz * e); this.renderYaw = a.yaw; this.vel.set(a.vx, 0, a.vz); }
    this.yaw = this.renderYaw; this.visYaw = 0; this.visY = 0; this.groundY = this.pos.y; this.speedNow = Math.hypot(this.vel.x, this.vel.z);
    const s = b && k > 0.5 ? b : a; // discrete fields: the nearer sample
    const st = MP_STATES[s.st] || 'move'; if (st !== this.state) { this.state = st; this.st = 0; } else this.st += dt;
    const fl = s.fl; this.alive = !!(fl & 1); this.dead = !this.alive; this.cuffed = !!(fl & 2); this.hidden = !!(fl & 8); this.blocking = !!(fl & 16); this.umbrella = !!(fl & 32);
    this.an.w.idle = fl & 64 ? 1 : 0; this.nadeAim = !!(fl & 128); this.f2 = s.f2;
    this.aiming = !!(s.f2 & 1); this.firingT = s.f2 & 2 ? 0.2 : 0; this.iframe = s.f2 & 4 ? 0.1 : 0; this.alerted = !!(s.f2 & 8); this.seesPlayer = this.alerted;
    this.downed = !!(s.f2 & 16); this.ride = !!(s.f2 & 64); this.downLeft = this.downed ? s.hp : 0;
    this.inCar = this.state === 'car' ? (this.car || true) : null; if (this.state === 'car' && this.isRobot) this.hidden = true;
    if ((MP_WPN[s.wp] || null) !== this.weapon) this.setWeapon(MP_WPN[s.wp] || null);
    this.hitFlash = Math.max(this.hitFlash - dt * 4, s.hf / 255); this.hp = this.downed ? 0 : this.maxHp * s.hp / 255;
    // footsteps near the camera (the steps themselves are not sent: each page plays those it can hear)
    if (this.speedNow > 0.9 && this.alive && !this.hidden && this.state !== 'car' && (this.pos.x - Cam.pos.x) ** 2 + (this.pos.z - Cam.pos.z) ** 2 < 484) {
      this.stepT = (this.stepT || 0) - dt * (1.2 + this.speedNow * 0.3);
      if (this.stepT <= 0) { this.stepT = 1; Snd.play(this.app.robot ? 'mstep' : 'step', { x: this.pos.x, y: this.pos.y, z: this.pos.z }, 0.28 + Math.min(0.3, this.speedNow * 0.05)); }
    }
    // pose: between the two pose samples around the render time
    const pb = this.pb; if (pb.length) {
      let j = pb.length - 1; while (j > 0 && pb[j].t > rt) j--;
      const A = pb[j], B = pb[j + 1], P = this.pose;
      if (B && rt > A.t) { const q = clamp((rt - A.t) / Math.max(1, B.t - A.t), 0, 1); for (let n = 0; n < PSZ; n++) P[n] = n < NANG ? A.p[n] + wrapAngle(B.p[n] - A.p[n]) * q : lerp(A.p[n], B.p[n], q); }
      else P.set(A.p);
    }
  }
  isFirearm() { const w = WEAPONS[this.weapon]; return !!(w && w.firearm); }
  physics() { } stagger() { } knockDown() { } ko() { } die() { } surrender() { } alert() { }
  // a blow or a shot: the host forwards it to the robot's owner; a guest forwards its own hits to the host
  takeHit(src, dmg, o = {}) {
    if (!this.alive || this.cuffed || this.removed) return false;
    const kind = o.kind || 'melee';
    if (this.iframe > 0 && kind !== 'fall' && kind !== 'blast') return MP.host && this.peer ? (MP.hitPeer(this, src, dmg, o), false) : false;
    const fromX = o.from ? o.from.x : src ? src.pos.x : this.pos.x, fromZ = o.from ? o.from.z : src ? src.pos.z : this.pos.z;
    const blocked = kind === 'melee' && this.blocking && src && this.facing(fromX, fromZ, -0.2) && !o.unblockable;
    if (MP.host && this.peer) MP.hitPeer(this, src, dmg, o);
    else if (MP.guest) MP.hitHost(this, src, dmg, o);
    if (blocked) { this.hitFlash = 0.3; return 'blocked'; }
    this.hitFlash = 1; this.lastHitBy = src;
    if (MP.guest && src === Game.player && this.team !== 'civ' && !(kind === 'blast')) { const A = Game.dmgAcc || (Game.dmgAcc = new Map()); const e = A.get(this.id); if (e) { e.dmg += dmg; e.head = e.head || !!o.head; } else A.set(this.id, { t: this, dmg, head: !!o.head }); Music.target = Math.max(Music.target, 0.9); }
    return true;
  }
}

/* =====================================================================
   SESSION
   ===================================================================== */
const MP = {
  on: false, host: false, guest: false, state: 'off', ws: null, slot: 0, name: '', hostName: '',
  peers: new Map(), roster: [], ents: new Map(), cars: new Map(), picks: new Map(), nadeMap: new Map(),
  clock: new NetClock(), wb: new WB(16384), wb2: new WB(1024), te: new TextEncoder(), td: new TextDecoder(),
  fxOut: [], capOff: 0, relay: 0, snapT: 0, meT: 0, seq: 0, pickN: 0, evT: 0, worldHash: 0, lastMsg: 0,
  dbg: { tx: {}, rx: {}, snaps: 0, mes: 0 }, // message counters (tests, diagnostics)
  get players() { return this.robots(); },
  /* ---------------- helpers ---------------- */
  slotInfo(s) { return ROBOT_ACCENTS[s] || ROBOT_ACCENTS[0]; },
  isLauncher() { return /^https?:$/.test(location.protocol) && (location.hostname === '127.0.0.1' || location.hostname === 'localhost'); },
  servedByHost() { return /^https?:$/.test(location.protocol) && !this.isLauncher(); },
  count() { return this.on ? 1 + Array.from(this.peers.values()).filter(p => p.ok).length : 1; },
  // every robot in the game (the local one first)
  robots() {
    const out = []; const P = Game.player; if (P && !P.removed) out.push(P);
    if (this.host) { for (const p of this.peers.values()) if (p.proxy && !p.proxy.removed) out.push(p.proxy); }
    else if (this.guest) { for (const a of this.ents.values()) if (a.isRobot && !a.removed) out.push(a); }
    return out;
  },
  // nearest robot in play to a point (the gangs pick their target among them)
  nearestRobot(x, z, alive = true) { let best = null, bd = 1e18; for (const r of this.robots()) { if (alive && (!r.alive || r.removedFromPlay)) continue; const d = (r.pos.x - x) ** 2 + (r.pos.z - z) ** 2; if (d < bd) { bd = d; best = r; } } return best; },
  distToRobots(x, z) { let bd = 1e18; for (const r of this.robots()) { const d = (r.pos.x - x) ** 2 + (r.pos.z - z) ** 2; if (d < bd) bd = d; } return Math.sqrt(bd); },
  computeWorldHash() { let h = World.boxes.length | 0; for (let i = 0; i < World.boxes.length; i += 7) { const b = World.boxes[i]; h = (Math.imul(h, 31) + Math.round(b.x0 * 8) + Math.round(b.z1 * 8) * 3 + Math.round(b.y1 * 8) * 7) | 0; } return h; },
  json(o) { if (o.t) this.dbg.tx[o.t] = (this.dbg.tx[o.t] || 0) + 1; const b = this.te.encode(JSON.stringify(o)); const u = new Uint8Array(b.length + 1); u[0] = 1; u.set(b, 1); return u; },
  /* ---------------- connection ---------------- */
  connect(url) {
    return new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(url); } catch (e) { rej(e); return; }
      ws.binaryType = 'arraybuffer'; let opened = false;
      const to = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { } rej(new Error('timeout')); } }, 6000);
      ws.onopen = () => { opened = true; clearTimeout(to); this.ws = ws; this.lastMsg = performance.now(); res(ws); };
      ws.onerror = () => { if (!opened) { clearTimeout(to); rej(new Error('refused')); } };
      ws.onclose = () => { if (this.ws === ws) this.onClosed(); };
      ws.onmessage = e => { this.lastMsg = performance.now(); try { this.onFrame(new Uint8Array(e.data)); } catch (err) { console.error(err); } };
    });
  },
  raw(u8) { const ws = this.ws; if (ws && ws.readyState === 1) { try { ws.send(u8); } catch (e) { } } },
  // host -> guest(s): [target 0 = all][flags bit0 = may be skipped][all but]
  sendTo(target, o, except = 0, drop = false) {
    const p = o instanceof Uint8Array ? o : this.json(o); const u = new Uint8Array(p.length + 3); u[0] = target; u[1] = drop ? 1 : 0; u[2] = except; u.set(p, 3); this.raw(u);
  },
  // guest -> host
  send(o) { this.raw(o instanceof Uint8Array ? o : this.json(o)); },
  relayCmd(o) { if (this.host) this.sendTo(255, o); },
  close(why) {
    const ws = this.ws; this.ws = null; if (ws) { try { ws.close(); } catch (e) { } }
    this.reset(); if (why) this.why = why;
  },
  // forget the puppets of a finished game (a new one, or the room)
  clearEnts() { for (const a of this.ents.values()) a.removed = true; for (const c of this.cars.values()) c.removed = true; this.ents.clear(); this.cars.clear(); this.picks.clear(); this.nadeMap.clear(); this.events = []; this.pings = []; },
  reset() {
    for (const a of this.ents.values()) a.removed = true; for (const c of this.cars.values()) c.removed = true;
    this.on = this.host = this.guest = false; this.state = 'off'; this.peers.clear(); this.ents.clear(); this.cars.clear(); this.picks.clear(); this.nadeMap.clear(); this.roster = []; this.fxOut = []; this.clock = new NetClock();
    if (Game.player) Game.player.slot = 0;
  },
  onClosed() {
    const was = this.state, guest = this.guest; this.ws = null; this.reset();
    if (guest && (was === 'play' || was === 'salon')) { if (Game.mode === 'play' || Game.mode === 'pause') Game.toMenu(); Menus.mpLost(this.why || 'La connexion avec l’hôte a été perdue.'); }
    else if (was !== 'off') Menus.mpRefresh();
    this.why = null;
  },
  /* ---------------- hosting ---------------- */
  async hostOpen() {
    const r = await fetch('/__mp/host', { method: 'POST' }).then(x => x.json());
    if (!r || !r.ok) throw new Error(r && r.err || 'lan');
    this.addrs = r.addrs || []; this.port = r.port;
    await this.connect(`ws://${location.host}/__mp/ws?role=host`);
    this.on = true; this.host = true; this.guest = false; this.state = 'salon'; this.slot = 0; this.name = this.myName(); this.worldHash = this.computeWorldHash();
    this.installCapture(); this.rosterUpdate(); this.infoUpdate();
  },
  joinURL() { const ip = (this.addrs || [])[0] || location.hostname; return `http://${ip}:${this.port || 47818}/?rejoindre`; },
  myName() { const n = (Save.data.mpName || '').trim(); return n || this.slotInfo(this.slot).n; },
  infoUpdate() { if (this.host) this.relayCmd({ t: 'info', name: this.name, state: this.state, v: MP_VER, players: this.count() }); },
  rosterUpdate() {
    const L = [{ slot: 0, name: this.name, host: true }];
    for (const p of this.peers.values()) if (p.ok) L.push({ slot: p.id, name: p.name });
    this.roster = L; if (this.host) { this.sendTo(0, { t: 'roster', roster: L }); this.infoUpdate(); }
    Menus.mpRefresh();
  },
  onRelay(m) {
    if (m.t === 'join') {
      const p = { id: m.id, name: m.name || this.slotInfo(m.id).n, ip: m.ip, ok: false, proxy: null, known: new Map(), carKnown: new Set(), seen: new Set(), seenC: new Set(), clock: new NetClock(), cam: null, pts: 0, stats: this.newStats(), joinT: performance.now(), snapN: 0, car: null };
      this.peers.set(m.id, p);
      setTimeout(() => { if (this.peers.get(m.id) === p && !p.ok) this.relayCmd({ t: 'kick', id: m.id, why: 'Pas de réponse.' }); }, 8000);
    } else if (m.t === 'leave') {
      const p = this.peers.get(m.id); if (!p) return; this.peers.delete(m.id);
      if (p.proxy) { if (p.car) this.carRelease(p.car, null); for (const c of Cars.list) Cars.seatLeave(c, p.proxy); p.proxy.removed = true; }
      if (p.ok) { HUD.toast(p.name + ' a quitté la brigade', '', 'bad', true); this.rosterUpdate(); }
    } else if (m.t === 'busy') { this.close('Une partie est déjà hébergée sur ce PC.'); Menus.mpLost('Une partie est déjà hébergée sur ce PC (autre fenêtre ?).'); }
  },
  newStats() { return { arrests: 0, kos: 0, kills: 0, civHurt: 0, pts: 0 }; },
  startGame() {
    if (!this.host) return; this.state = 'play'; this.infoUpdate();
    for (const p of this.peers.values()) { p.known.clear(); p.carKnown.clear(); p.proxy = null; p.car = null; p.pts = 0; p.stats = this.newStats(); }
    this.myStats = this.newStats();
    Game.startMission(COOP);
    this.sendTo(0, { t: 'start', roster: this.roster, diff: Save.data.options.diff });
    this.sendPickups(0);
  },
  // the end of the shift for everyone: each one's result screen
  endGame() {
    if (!this.host || this.state !== 'play') return;
    const rows = [[this.name, this.myStats]]; for (const p of this.peers.values()) if (p.ok) rows.push([p.name, p.stats]);
    const team = { score: Math.round(Game.score), crime: Math.round(Game.crime), t: Game.mission ? Game.mission.t : 0, rows: rows.map(([n, s]) => [n, s.arrests, s.kos, Math.round(s.pts)]) };
    this.state = 'salon'; this.infoUpdate();
    this.sendTo(0, { t: 'end', team });
    Game.coopResult(team, this.myStats.pts);
  },
  /* ---------------- joining ---------------- */
  async join(addr) {
    addr = String(addr || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); if (!addr) throw new Error('addr');
    if (!/:\d+$/.test(addr)) addr += ':47818';
    const nm = (Save.data.mpName || '').trim(); // no name chosen: the host gives the call sign of the free slot
    await this.connect(`ws://${addr}/__mp/ws?name=${encodeURIComponent(nm)}`);
    this.on = true; this.guest = true; this.host = false; this.state = 'joining'; this.addr = addr; this.worldHash = this.computeWorldHash();
    this.installCapture();
    this.send({ t: 'hello', v: MP_VER, wh: this.worldHash, name: nm });
    Save.data.mpLast = addr; Save.write();
  },
  /* ---------------- incoming frames ---------------- */
  onFrame(u) {
    if (this.host) { const from = u[0], p = u.subarray(1); if (from === 255) { if (p[0] === 1) this.onRelay(JSON.parse(this.td.decode(p.subarray(1)))); return; } const peer = this.peers.get(from); if (!peer) return; if (p[0] === 1) this.onGuestMsg(peer, JSON.parse(this.td.decode(p.subarray(1)))); else if (p[0] === 2 && p[1] === MP_ME) this.onMe(peer, new RB(p, 2)); return; }
    if (u[0] === 1) this.onHostMsg(JSON.parse(this.td.decode(u.subarray(1)))); else if (u[0] === 2 && u[1] === MP_SNAP) this.onSnap(new RB(u, 2));
  },
  /* ---------------- records (actors, cars) ---------------- */
  writeActor(w, a, id, pose) {
    const an = a.an, phone = a.idleKind === 'phone' && an && an.w.idle > 0.35, nade = a.nadeAim || (a.throwT >= 0 && !a.thrown);
    const fl = (a.alive ? 1 : 0) | (a.cuffed ? 2 : 0) | (pose ? 4 : 0) | (a.hidden || (a.inCar && !a.isRobot) ? 8 : 0) | (a.blocking ? 16 : 0) | (a.umbrella && a.app.umbrella ? 32 : 0) | (phone ? 64 : 0) | (nade ? 128 : 0);
    // the people of the city send their pose on 8 bits (1.4°: plenty at a few metres), the robots on 16
    const p8 = pose && !(a.isRobot || a === Game.player);
    const f2 = (a.aiming ? 1 : 0) | (a.firingT > 0 ? 2 : 0) | (a.iframe > 0 ? 4 : 0) | (a.alerted ? 8 : 0) | (a.downed ? 16 : 0) | (p8 ? 32 : 0) | (a.ride ? 64 : 0);
    const yaw = wrapAngle((a.renderYaw !== undefined ? a.renderYaw : a.yaw) + (a.visYaw || 0));
    // health byte: a robot out of service sends instead the seconds left before it is sent back to the station
    const hb = a.downed ? clamp(Math.ceil(a.downT || 0), 0, 255) : clamp(a.hp / (a.maxHp || 1), 0, 1) * 255;
    w.u32(id).u8(fl).u8(MP_SI[a.state] || 0).u8(MP_WI[a.weapon] || 0).u8(clamp(a.hitFlash || 0, 0, 1) * 255).u8(hb).u8(f2);
    w.i16(a.pos.x * 32).i16((a.pos.y + (a.visY || 0)) * 128).i16(a.pos.z * 32).i16(yaw * 10000).i16(a.vel.x * 100).i16(a.vel.z * 100);
    if (pose) { const P = a.pose; if (p8) for (let n = 0; n < PSZ; n++) w.i8(n < NANG ? wrapAngle(P[n]) * 40.4 : P[n] * 80); else for (let n = 0; n < PSZ; n++) w.i16(n < NANG ? wrapAngle(P[n]) * 10000 : P[n] * 10000); }
  },
  readActor(r) {
    const o = { id: r.u32(), fl: r.u8(), st: r.u8(), wp: r.u8(), hf: r.u8(), hp: r.u8(), f2: r.u8() };
    o.x = r.i16() / 32; o.y = r.i16() / 128; o.z = r.i16() / 32; o.yaw = r.i16() / 10000; o.vx = r.i16() / 100; o.vz = r.i16() / 100; o.pose = null;
    if (o.fl & 4) { const P = new Float32Array(PSZ); if (o.f2 & 32) for (let n = 0; n < PSZ; n++) P[n] = n < NANG ? r.i8() / 40.4 : r.i8() / 80; else for (let n = 0; n < PSZ; n++) P[n] = r.i16() / 10000; o.pose = P; }
    return o;
  },
  carDrv(c) { const d = c.driver; if (!d) return 0; if (d.isRobot) return 10 + (d.slot || 0); return d.team === 'civ' ? 1 : 2; },
  writeCar(w, c) {
    const fl = (c.dead ? 1 : 0) | (c.siren ? 2 : 0) | (c.burnt ? 4 : 0) | (c.fireT > 0 ? 8 : 0) | (c.sinking ? 16 : 0) | (c.tags.target ? 32 : 0) | (c.inp.throttle > 0.1 ? 64 : 0);
    w.u32(c.id).u8(fl).u8(clamp(c.hp / c.maxHp, 0, 1) * 255).u8(this.carDrv(c)).u8(clamp(c.brakeK || 0, 0, 1) * 255);
    w.i16(c.pos.x * 32).i16(c.pos.y * 128).i16(c.pos.z * 32).i16(wrapAngle(c.yaw) * 10000);
    w.i8(c.pitch * 600).i8(c.roll * 600).i8(c.steerA * 200).u8(clamp(c.bump || 0, 0, 1) * 255);
    w.i16(c.speed * 100).i16(c.vx * 100).i16(c.vz * 100).u8(clamp(c.skid || 0, 0, 1) * 255).u8(clamp((c.fireT || 0) * 20, 0, 255)).u8(Cars.seatMask(c));
  },
  readCar(r) {
    const o = { id: r.u32(), fl: r.u8(), hp: r.u8(), drv: r.u8(), brake: r.u8() / 255 };
    o.x = r.i16() / 32; o.y = r.i16() / 128; o.z = r.i16() / 32; o.yaw = r.i16() / 10000; o.pitch = r.i8() / 600; o.roll = r.i8() / 600; o.steer = r.i8() / 200; o.bump = r.u8() / 255;
    o.speed = r.i16() / 100; o.vx = r.i16() / 100; o.vz = r.i16() / 100; o.skid = r.u8() / 255; o.fire = r.u8() / 20; o.seats = r.u8();
    return o;
  },
  carPush(c, t, o) {
    const nb = c.nb || (c.nb = []); if (nb.length && t <= nb[nb.length - 1].t) t = nb[nb.length - 1].t + 1;
    o.t = t; nb.push(o); if (nb.length > 30) nb.shift();
  },
  // a car moved by the network: between its two states around the render time
  carInterp(c, dt) {
    const nb = c.nb; if (!nb || !nb.length) return;
    const rt = performance.now() - (this.host ? 70 : 95);
    let i = nb.length - 1; while (i > 0 && nb[i].t > rt) i--;
    const a = nb[i], b = nb[i + 1]; let k = 0; if (b) k = clamp((rt - a.t) / Math.max(1, b.t - a.t), 0, 1);
    if (b) { c.pos.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k)); c.yaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k; c.vx = lerp(a.vx, b.vx, k); c.vz = lerp(a.vz, b.vz, k); c.speed = lerp(a.speed, b.speed, k); c.steerA = lerp(a.steer, b.steer, k); }
    else { const e = clamp((rt - a.t) / 1000, 0, 0.15); c.pos.set(a.x + a.vx * e, a.y, a.z + a.vz * e); c.yaw = a.yaw; c.vx = a.vx; c.vz = a.vz; c.speed = a.speed; c.steerA = a.steer; }
    const s = b && k > 0.5 ? b : a;
    c.pitch = s.pitch; c.roll = s.roll; c.bump = s.bump; c.brakeK = s.brake; c.skid = s.skid; c.hp = c.maxHp * s.hp / 255;
    c.dead = !!(s.fl & 1); c.siren = !!(s.fl & 2); c.burnt = !!(s.fl & 4); c.sinking = !!(s.fl & 16); c.tags.target = !!(s.fl & 32); c.inp.throttle = s.fl & 64 ? 1 : 0;
    c.fireT = s.fl & 8 ? Math.max(0.05, s.fire) : 0; if (c.fireT > 0 && !c.fireMax) c.fireMax = 6; if (c.burnt && !(c.burnT > 0) && !c._bt) { c._bt = true; c.burnT = 30; }
    c.netDrv = s.drv; c.wheelRot += c.speed * dt / 0.34; if (!this.host) c.seatMask = s.seats || 0;
  },
  /* =====================================================================
     HOST SIDE
     ===================================================================== */
  onGuestMsg(p, m) {
    this.dbg.rx[m.t] = (this.dbg.rx[m.t] || 0) + 1;
    switch (m.t) {
      case 'hello':
        if (m.v !== MP_VER) { this.relayCmd({ t: 'kick', id: p.id, why: 'Versions différentes : mettez OVERFLOW à jour sur les deux appareils.' }); return; }
        if (m.wh !== this.worldHash) { this.relayCmd({ t: 'kick', id: p.id, why: 'La ville de cet appareil diffère de celle de l’hôte (version différente).' }); return; }
        p.ok = true; p.name = String(m.name || p.name).slice(0, 20);
        this.sendTo(p.id, { t: 'welcome', slot: p.id, host: this.name, state: this.state, diff: Save.data.options.diff });
        this.rosterUpdate();
        if (this.state === 'play') {
          const H = Game.player, at = H && H.alive && World.onLand(H.pos.x, H.pos.z) ? { x: this.r2(H.pos.x), z: this.r2(H.pos.z) } : null;
          this.sendTo(p.id, { t: 'start', roster: this.roster, diff: Save.data.options.diff, late: true, at }); this.sendPickups(p.id); HUD.toast(p.name + ' rejoint la brigade', '', 'gold', true);
        }
        return;
      case 'mhit': { // a guest's blow or shot on someone of the city
        const t = this.byId(m.id); if (!t || t.isRobot || !p.proxy) return;
        p.proxy.mult = m.m || 1; const o = this.unpackO(m.o);
        t.takeHit(p.proxy, m.d, o);
        return;
      }
      case 'cdmg': { const c = Cars.list.find(x => x.id === m.id); if (c && !c.remote && p.proxy) Cars.damage(c, m.d, p.proxy); return; }
      case 'arrest': {
        const t = this.byId(m.id); if (!t || !p.proxy) return;
        if (!t.arrestable) { this.sendTo(p.id, { t: 'arrestNo', id: m.id }); return; }
        t.prevState = t.state; t.prevLeft = Math.max(3, (t.downT || 0) - t.st); t.setState('beingCuffed'); t.vel.set(0, 0, 0); t.yaw = angleTo(p.proxy.pos.x, p.proxy.pos.z, t.pos.x, t.pos.z); t.releaseToken && t.releaseToken(); t.cuffBy = p.proxy;
        return;
      }
      case 'uncuff': { const t = this.byId(m.id); if (t && t.state === 'beingCuffed') { const ps = t.prevState === 'surrender' || t.prevState === 'ko' ? t.prevState : 'down'; t.setState(ps); t.downT = ps === 'down' ? Math.max(1.5, t.prevLeft || 2) : (t.prevLeft || 3); } return; }
      case 'cuffed': { const t = this.byId(m.id); if (!t || t.cuffed || !t.alive) return; t.cuffed = true; t.setState('cuffed'); Game.onArrest(t, p.proxy); return; }
      case 'pick': {
        const k = this.picks.get(m.id); if (!k || !k.alive) return;
        k.alive = false; Pickups.list = Pickups.list.filter(x => x !== k); this.picks.delete(m.id);
        this.sendTo(0, { t: 'pick-', id: m.id });
        this.sendTo(p.id, { t: 'got', p: this.pickInfo(k) });
        return;
      }
      case 'nade': { if (!p.proxy) return; Nades.spawn(m.x, m.y, m.z, m.vx, m.vy, m.vz, p.proxy, m.f); return; }
      case 'noise': if (p.proxy) Combat.noise(m.x, m.z, m.r, p.proxy); return;
      case 'parried': { const a = this.byId(m.id); if (a && a.stagger && p.proxy) a.stagger(1.3, true); return; }
      case 'enter': return this.carClaim(p, m.id);
      case 'exit': { const c = Cars.list.find(x => x.id === m.id); if (c && c.remote === p.id) this.carRelease(c, m.c); return; }
      case 'boom': { // the guest's car blew up (or one of its local things): the blast hits the city
        if (!p.proxy) return; this.relay = p.id;
        Nades.explode(m.x, m.y, m.z, p.proxy, { car: true, R: m.R || 7, dmg: m.dmg || 170, skip: p.proxy, skipCar: m.c });
        this.relay = 0; return;
      }
      case 'fx': this.applyFx(m.e, p.id); return;
      case 'pts': { const v = +m.v || 0; Game.score += v; p.pts += v; p.stats.pts += v; return; }
      case 'ouch': if (p.proxy && p.proxy.streakN) { p.proxy.streakN = 0; this.tell(p.proxy, 'streak', [0]); } return;
      case 'crime': Game.addCrime(+m.d || 0); return;
      case 'died': { const a = [p.name + ' est hors service', 'Allez le réparer : Action près de lui', 'bad']; this.hud('down', a); this.sendTo(0, { t: 'hud', k: 'down', a }, p.id); return; }
      case 'revive': { // a guest repaired a partner on the ground: our own robot, or another guest's
        const t = this.byId(m.id); if (!t) return;
        if (t === Game.player) Game.revived(p.name); else if (t.peer) this.sendTo(t.peer.id, { t: 'revived', by: p.name });
        return;
      }
      case 'ride': { // a seat in a partner's car
        const c = Cars.list.find(x => x.id === m.id), D = c && c.driver;
        if (!c || !p.proxy || c.burnt || c.removed || c.fireT > 0 || !(D && D.isRobot && D !== p.proxy)) { this.sendTo(p.id, { t: 'rideNo', id: m.id }); return; }
        const k = Cars.seatTake(c, p.proxy); if (k < 0) { this.sendTo(p.id, { t: 'rideNo', id: m.id }); return; }
        p.proxy.car = c; this.sendTo(p.id, { t: 'rideOk', id: m.id, seat: k }); return;
      }
      case 'unride': { const c = Cars.list.find(x => x.id === m.id); if (c && p.proxy) { Cars.seatLeave(c, p.proxy); if (p.proxy.car === c && p.car !== c) p.proxy.car = null; } return; }
      case 'ping': this.addPing(m); this.sendTo(0, m, p.id); return;
      case 'bavure': { Game.stats.civHurt++; p.stats.civHurt++; Game.score -= 100; Game.addCrime(2); return; }
    }
  },
  byId(id) { for (const a of Game.actors) if (a.id === id && !a.removed) return a; return null; },
  packO(o) { const r = { k: o.kind || 'melee' }; for (const f of ['knock', 'kd', 'poise', 'lethal', 'heavy', 'unblockable', 'head']) if (o[f] !== undefined && o[f] !== false) r[f] = typeof o[f] === 'number' ? Math.round(o[f] * 100) / 100 : o[f]; if (o.from) r.from = { x: Math.round(o.from.x * 100) / 100, z: Math.round(o.from.z * 100) / 100 }; return r; },
  unpackO(r) { const o = Object.assign({}, r || {}); o.kind = o.k || 'melee'; delete o.k; return o; },
  // a blow at a guest's robot (decided here, on its stand-in): its owner applies it to the robot it drives
  hitPeer(proxy, src, dmg, o) {
    const p = proxy.peer; if (!p) return;
    this.sendTo(p.id, { t: 'hit', s: src ? src.id : 0, d: Math.round(dmg * 100) / 100, o: this.packO(o) });
  },
  carClaim(p, id) {
    const c = Cars.list.find(x => x.id === id);
    const ok = c && p.proxy && !c.remote && !c.burnt && !(c.fireT > 0) && !c.sinking && !(c.driver && c.driver.isRobot) && !(c.driver && !(c.driver instanceof Civilian) && c.driver.alive);
    if (!ok) { this.sendTo(p.id, { t: 'enterNo', id }); return; }
    if (c.driver) { const d = c.driver; d.inCar = null; d.hidden = false; d.setState('move'); d.pos.set(c.pos.x - c.fz * (c.wid / 2 + 0.7), c.pos.y, c.pos.z + c.fx * (c.wid / 2 + 0.7)); if (d.panic) d.panic(p.proxy.pos.x, p.proxy.pos.z, 3); if (d.mode !== undefined) { d.mode = 'flee'; d.panicT = 8; } }
    c.driver = p.proxy; c.remote = p.id; c.ai = null; c.stunT = 0; c.nb = []; p.car = c; p.proxy.car = c;
    this.sendTo(p.id, { t: 'enterOk', id });
  },
  // a guest leaves a car (or leaves the game): the host drives its physics again
  carRelease(c, rec) {
    if (rec) { c.pos.set(rec.x, rec.y, rec.z); c.yaw = rec.yaw; c.vx = rec.vx; c.vz = rec.vz; c.speed = rec.speed; c.hp = rec.hp; if (rec.fire > 0 && !(c.fireT > 0) && !c.burnt) { c.fireT = rec.fire; c.fireMax = 6; c.dead = true; } if (rec.burnt) { c.burnt = true; c.dead = true; c.fireT = 0; c.burnT = c.burnT || 25; } if (rec.dead) c.dead = true; }
    const p = this.peers.get(c.remote); if (p) { p.car = null; if (p.proxy) p.proxy.car = null; }
    c.remote = 0; c.driver = null; c.nb = null; c.inp.throttle = 0; c.inp.brake = 1; c.ambient = true;
  },
  onMe(p, r) {
    if (!p.ok) return; this.dbg.mes++;
    r.u16(); const T = r.u32(); p.clock.sample(T); const t = p.clock.local(T);
    const rec = this.readActor(r); const cam = { x: r.i16() / 32, z: r.i16() / 32, yaw: r.i16() / 10000 }; p.cam = cam;
    const hasCar = r.u8(); const car = hasCar ? this.readCar(r) : null;
    if (this.state !== 'play') return;
    if (!p.proxy) {
      const pr = new NetActor({ k: 'player', app: 'hero' + p.id, team: 'police', robot: true, slot: p.id, name: p.name, hp: 100 }, rec);
      pr.peer = p; pr.isRobot = true; pr.id = pr.id; pr.removedFromPlay = false; p.proxy = pr; Game.addActor(pr);
    }
    p.proxy.netPush(t, rec);
    if (car && p.car && car.id === p.car.id) this.carPush(p.car, t, car);
  },
  // things on the ground (weapons dropped, repair cells, grenades): all of them for a guest who arrives
  pickInfo(k) { return { id: k.nid, type: k.type, x: Math.round(k.pos.x * 100) / 100, y: Math.round(k.pos.y * 100) / 100, z: Math.round(k.pos.z * 100) / 100, weapon: k.weapon, ammo: k.ammo, count: k.count, heal: k.heal }; },
  sendPickups(target) { const L = []; for (const k of Pickups.list) { if (!k.alive || k.type === 'badge' || k.type === 'item') continue; if (!k.nid) { k.nid = ++this.pickN; this.picks.set(k.nid, k); } L.push(this.pickInfo(k)); } this.sendTo(target, { t: 'picks', l: L }); },
  onPickAdd(k) { if (!this.host || this.state !== 'play' || k.type === 'badge' || k.type === 'item') return; k.nid = ++this.pickN; this.picks.set(k.nid, k); this.sendTo(0, { t: 'pick+', p: this.pickInfo(k) }); },
  onPickGone(k) { if (this.host && k.nid && this.picks.has(k.nid)) { this.picks.delete(k.nid); this.sendTo(0, { t: 'pick-', id: k.nid }); } },
  entInfo(a) {
    const robot = a.isRobot || a === Game.player;
    const o = { t: 'ent', id: a.id, k: robot ? 'player' : a.kind, app: robot ? (a.slot ? 'hero' + a.slot : 'hero') : a.appKey, seed: a.appSeed, team: a.team, hp: a.maxHp, tags: { label: a.tags.label, target: a.tags.target, noArrest: a.tags.noArrest } };
    if (a.T && ETYPES[a.kind]) o.T = a.kind; if (a.boss) o.boss = 1; if (a.armor) o.armor = a.armor; if (a.idleKind) o.idle = a.idleKind;
    if (robot) { o.robot = 1; o.slot = a.slot || 0; o.name = a === Game.player ? this.name : a.pname; }
    return o;
  },
  tagSig(a) { return (a.tags.target ? 'T' : '') + (a.tags.label || '') + (a.tags.noArrest ? 'N' : '') + (a.team || ''); },
  sendSnap(p) {
    const me = p.proxy; if (!me) return;
    const px = me.pos.x, pz = me.pos.z, cam = p.cam || { x: px, z: pz, yaw: me.yaw }, w = this.wb.reset(), now = performance.now(), simT = Game.simT || 0;
    p.snapN++;
    w.u8(2).u8(MP_SNAP).u32(now).f32(Env.time).u8(clamp(Math.round(Game.crime), 0, 100)).u32(Math.max(0, Math.round(Game.score))).i16(Game.timer === null || Game.timer === undefined ? -1 : Game.timer * 10);
    const nAt = w.o; w.u16(0); let n = 0; const seen = p.seen; seen.clear();
    for (const a of Game.actors) {
      if (a.removed || a === me) continue;
      if (a.inCar && !a.isRobot && a !== Game.player) continue; // a driver is seen once he steps out
      const dx = a.pos.x - px, dz = a.pos.z - pz, d2 = dx * dx + dz * dz, robot = a.isRobot || a === Game.player;
      if (d2 > 135 * 135 && !robot) continue;
      const sig = this.tagSig(a);
      if (!p.known.has(a)) { this.sendTo(p.id, this.entInfo(a)); p.known.set(a, sig); }
      else if (p.known.get(a) !== sig) { p.known.set(a, sig); this.sendTo(p.id, { t: 'tag', id: a.id, tags: { label: a.tags.label, target: a.tags.target, noArrest: a.tags.noArrest }, team: a.team }); }
      seen.add(a); n++;
      // the pose: every time near and in view, now and then otherwise
      const cx = a.pos.x - cam.x, cz = a.pos.z - cam.z, cd2 = cx * cx + cz * cz;
      const inView = cd2 < 225 || Math.abs(wrapAngle(Math.atan2(cx, cz) - cam.yaw)) < 1.25;
      const pose = d2 < 140 * 140 && ((inView && (cd2 < 25 * 25 || (robot && cd2 < 55 * 55))) || (inView && cd2 < 55 * 55 && (p.snapN + a.id) % 2 === 0) || (p.snapN + a.id) % 4 === 0);
      if (pose) a.mpSeenT = simT;
      this.writeActor(w, a, a.id, pose);
    }
    w.v.setUint16(nAt, n, true);
    const gone = [];
    for (const a of p.known.keys()) if (!seen.has(a)) { gone.push(a.id); p.known.delete(a); }
    // cars
    const cAt = w.o; w.u16(0); let nc = 0; const seenC = p.seenC; seenC.clear();
    for (const c of Cars.list) {
      if (c.removed || c.remote === p.id) continue;
      const dx = c.pos.x - px, dz = c.pos.z - pz; if (dx * dx + dz * dz > 175 * 175) continue;
      if (!p.carKnown.has(c)) { this.sendTo(p.id, { t: 'car', id: c.id, type: c.type, col: c.color.map(v => Math.round(v * 1000) / 1000), tags: { target: c.tags.target, noEnter: c.tags.noEnter } }); p.carKnown.add(c); }
      seenC.add(c); nc++; this.writeCar(w, c);
    }
    w.v.setUint16(cAt, nc, true);
    const goneC = []; for (const c of p.carKnown) if (!seenC.has(c)) { goneC.push(c.id); p.carKnown.delete(c); }
    if (gone.length || goneC.length) this.sendTo(p.id, { t: 'gone', a: gone, c: goneC });
    this.dbg.bytes = (this.dbg.bytes || 0) + w.o; this.dbg.snapsOut = (this.dbg.snapsOut || 0) + 1;
    this.sendTo(p.id, w.bytes(), 0, true);
  },
  // the crimes in progress, for each guest to pick the nearest as its objective
  sendEvents() {
    const L = []; for (const e of Patrol.events) if (!e.done) { const q = e.pos(); L.push({ l: e.label, g: e.tag, x: Math.round(q.x * 10) / 10, y: Math.round((q.y || 0) * 10) / 10, z: Math.round(q.z * 10) / 10, r: Math.round(e.limit - e.t) }); }
    this.sendTo(0, { t: 'ev', l: L });
  },
  hostTick(raw) {
    if (this.state !== 'play') return;
    this.snapT -= raw; if (this.snapT <= 0) { this.snapT += MP_SNAP_DT; if (this.snapT < 0) this.snapT = 0; for (const p of this.peers.values()) if (p.ok && p.proxy) this.sendSnap(p); }
    this.evT -= raw; if (this.evT <= 0) { this.evT = 0.4; this.sendEvents(); }
    this.flushFx();
  },
  /* =====================================================================
     GUEST SIDE
     ===================================================================== */
  onHostMsg(m) {
    this.dbg.rx[m.t] = (this.dbg.rx[m.t] || 0) + 1;
    switch (m.t) {
      case 'welcome': this.slot = m.slot; this.hostName = m.host; this.state = 'salon'; if (m.diff) Save.data.options.diff = m.diff; Menus.mpRefresh(); return;
      case 'roster': this.roster = m.roster || []; Menus.mpRefresh(); return;
      case 'nohost': this.why = 'Aucune partie n’est hébergée à cette adresse.'; return;
      case 'full': this.why = 'La brigade est complète (6 robots).'; return;
      case 'kicked': this.why = m.why || 'L’hôte a fermé la connexion.'; return;
      case 'hostgone': this.why = 'L’hôte a terminé la partie.'; return;
      case 'start': this.roster = m.roster || this.roster; if (m.diff) Save.data.options.diff = m.diff; this.state = 'play'; Game.startCoopGuest(m.at || null); return;
      case 'end': if (this.state === 'play') { this.state = 'salon'; Game.coopResult(m.team, this.myPts || 0); } return;
      case 'ent': {
        if (this.ents.has(m.id)) return;
        const a = new NetActor(m, null); a.net = m.id; a.id = m.id; a.clk = this.clock; this.ents.set(m.id, a); Game.addActor(a);
        return;
      }
      case 'tag': { const a = this.ents.get(m.id); if (a) { a.tags.label = m.tags.label; a.tags.target = m.tags.target; a.tags.noArrest = m.tags.noArrest; if (m.team) a.team = m.team; } return; }
      case 'car': {
        if (this.cars.has(m.id)) return;
        const c = new Car(m.type, 0, 0, 0, { color: m.col, tags: m.tags || {}, y: -1000 }); c.id = m.id; c.net = true; c.nb = []; this.cars.set(m.id, c); Cars.add(c);
        return;
      }
      case 'gone': {
        for (const id of m.a || []) { const a = this.ents.get(id); if (a) { a.removed = true; this.ents.delete(id); } }
        for (const id of m.c || []) { const c = this.cars.get(id); if (c && c.net) { c.removed = true; this.cars.delete(id); Cars.list = Cars.list.filter(x => x !== c); } }
        return;
      }
      case 'hit': { // our robot is struck (decided at the host)
        const P = Game.player; if (!P || Game.mode !== 'play' && Game.mode !== 'pause') return;
        const src = this.ents.get(m.s) || null; const o = this.unpackO(m.o);
        if (o.kind === 'blast' && !o.from) o.from = src ? { x: src.pos.x, z: src.pos.z } : null;
        if (P.state === 'car' && P.car && o.kind === 'car') return;
        P.takeHit(src, m.d, o);
        return;
      }
      case 'carhit': { const P = Game.player, c = P && P.car; if (c && c.id === m.id) Cars.damage(c, m.d, this.ents.get(m.s) || null); return; }
      case 'enterOk': return;
      case 'revived': Game.revived(m.by || 'un partenaire'); return;
      case 'rideOk': { const P = Game.player, c = this.cars.get(m.id); if (P && c && !c.removed && P.state === 'move' && !P.car) P.enterSeat(c, m.seat); else this.send({ t: 'unride', id: m.id }); return; }
      case 'rideNo': { if (Game.player) Game.player._rideAsk = 0; HUD.toast('Plus de place dans ce véhicule', '', 'bad', true); return; }
      case 'ping': this.addPing(m); return;
      case 'enterNo': { const P = Game.player, c = this.cars.get(m.id); if (P && c && P.car === c) { Cars.exit(c, P, true); } if (c) { c.net = true; c.mine = false; } HUD.toast('Véhicule indisponible', '', 'bad', true); return; }
      case 'arrestNo': { const P = Game.player; if (P && P.arrestT && P.arrestT.net === m.id) P.cancelArrest(); return; }
      case 'picks': for (const q of m.l) this.addPick(q); return;
      case 'pick+': this.addPick(m.p); return;
      case 'pick-': { const k = this.picks.get(m.id); if (k) { k.alive = false; this.picks.delete(m.id); } return; }
      case 'got': this.gotPick(m.p); return;
      case 'nade': { const o = this.ents.get(m.o) || (m.o === -1 ? Game.player : null); this.capOff++; const n = Nades.spawn(m.x, m.y, m.z, m.vx, m.vy, m.vz, o, m.f); this.capOff--; if (n) { n.nid = m.id; this.nadeMap.set(m.id, n); } return; }
      case 'nadeX': { const n = this.nadeMap.get(m.id); if (n) { n.dead = true; this.nadeMap.delete(m.id); } return; }
      case 'fx': this.applyFx(m.e, 0); return;
      case 'hud': this.hud(m.k, m.a); return;
      case 'ev': this.events = m.l || []; return;
      case 'pts': this.myPts = (this.myPts || 0) + (m.v || 0); return;
    }
  },
  hud(k, a) {
    a = a || [];
    if (k === 'pop') { HUD.pop(a[0], a[1], a[2], a[3], a[4], a[5]); if (a[6] > 0) Snd.play('score', { x: a[0], y: a[1], z: a[2] }, 0.45); }
    else if (k === 'toast') HUD.toast(a[0], a[1], a[2], a[3]);
    else if (k === 'big') HUD.big(a[0], a[1], a[2], a[3]);
    else if (k === 'say') HUD.say(a[0], a[1], a[2]);
    else if (k === 'streak') HUD.streak(a[0]);
    else if (k === 'hitmark') HUD.hitmark(a[0]);
    else if (k === 'rumble') Input.rumble(a[0], a[1], a[2]);
    else if (k === 'down') { HUD.toast(a[0], a[1], a[2]); Snd.play('down', null, 0.8); }
  },
  addPick(q) {
    if (!q || this.picks.has(q.id)) return;
    const k = Pickups.add(q.type, q.x, q.y, q.z, { weapon: q.weapon, ammo: q.ammo, count: q.count, heal: q.heal }); k.nid = q.id; k.net = true; this.picks.set(q.id, k);
  },
  // can our robot use this pickup (asked before claiming it)
  wantsPick(k, P) {
    if (k.type === 'health') return P.hp < P.maxHp; if (k.type === 'nades') return (P.nades || 0) < 8;
    if (k.type === 'ammo') return !!(P.isFirearm() || P.inv.pistol); return true;
  },
  gotPick(q) { const P = Game.player; if (!P) return; const k = { type: q.type, pos: new V3(q.x, q.y, q.z), weapon: q.weapon, ammo: q.ammo, count: q.count, heal: q.heal, alive: true }; Pickups.collect(k, P); },
  onSnap(r) {
    this.dbg.snaps++; const T = r.u32(); this.clock.sample(T); const t = this.clock.local(T);
    const envT = r.f32(); const crime = r.u8(), score = r.u32(), timer = r.i16();
    if (Math.abs(Env.time - envT) > 0.5) Env.time = envT; else Env.time += (envT - Env.time) * 0.05;
    Game.crime = crime; Game.score = score; Game.timer = timer < 0 ? null : timer / 10;
    const n = r.u16();
    for (let i = 0; i < n; i++) { const rec = this.readActor(r); const a = this.ents.get(rec.id); if (a) a.netPush(t, rec); }
    const nc = r.u16();
    for (let i = 0; i < nc; i++) { const rec = this.readCar(r); const c = this.cars.get(rec.id); if (c && c.net) this.carPush(c, t, rec); }
  },
  guestTick(raw) {
    if (this.state !== 'play') return;
    const P = Game.player; if (!P) return;
    this.meT -= raw;
    if (this.meT <= 0) {
      this.meT += MP_ME_DT; if (this.meT < 0) this.meT = 0;
      const w = this.wb2.reset(); w.u8(2).u8(MP_ME).u16(++this.seq & 0xffff).u32(performance.now());
      this.writeActor(w, P, 0, true);
      w.i16(Cam.pos.x * 32).i16(Cam.pos.z * 32).i16(wrapAngle(CamCtl.yaw) * 10000);
      const c = P.state === 'car' && P.car && P.car.mine ? P.car : null; w.u8(c ? 1 : 0); if (c) this.writeCar(w, c);
      this.send(w.bytes());
    }
    // the objective: the nearest crime in progress
    const M = Game.mission; if (M) {
      const L = this.events || []; let best = null, bd = 1e18;
      for (const e of L) { const d = (e.x - P.pos.x) ** 2 + (e.z - P.pos.z) ** 2; if (d < bd) { bd = d; best = e; } }
      if (best) { M.objective = best.l + ` <small>${fmtTime(Math.max(0, best.r))}</small>`; M.markerTag = best.g; const mp = M._mp || (M._mp = new V3()); mp.set(best.x, best.y, best.z); M.marker = mp; }
      else { M.objective = 'Patrouillez. Restez à l’écoute de la radio.'; M.marker = null; }
    }
    this.flushFx();
  },
  // our blow or shot reached someone of the city: the host applies it
  hitHost(t, src, dmg, o) {
    if (src !== Game.player) return;
    this.send({ t: 'mhit', id: t.net, d: Math.round(dmg * 100) / 100, o: this.packO(o), m: Game.mult() });
  },
  claimCar(c) { c.net = false; c.mine = true; const L = c.nb && c.nb[c.nb.length - 1]; if (L) { c.vx = L.vx; c.vz = L.vz; c.speed = L.speed; } c.nb = []; this.send({ t: 'enter', id: c.id }); },
  releaseCar(c) {
    const rec = { x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, vx: c.vx, vz: c.vz, speed: c.speed, hp: c.hp, fire: c.fireT > 0 ? c.fireT : 0, burnt: !!c.burnt, dead: !!c.dead };
    this.send({ t: 'exit', id: c.id, c: rec }); c.mine = false; c.net = true; c.nb = []; this.carPush(c, performance.now() - 200, { x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, vx: 0, vz: 0, speed: 0, steer: 0, pitch: 0, roll: 0, bump: 0, brake: 1, skid: 0, hp: clamp(c.hp / c.maxHp, 0, 1) * 255, fl: (c.dead ? 1 : 0) | (c.burnt ? 4 : 0) | (c.fireT > 0 ? 8 : 0), fire: c.fireT || 0, drv: 0 });
  },
  /* =====================================================================
     EFFECTS: what one page shows (shots, sparks, sounds, blasts) is replayed on the others
     ===================================================================== */
  capturing() { return this.on && this.state === 'play' && this.capOff === 0 && (Game.mode === 'play' || Game.mode === 'pause'); },
  r2(v) { return typeof v === 'number' ? Math.round(v * 100) / 100 : v; },
  cap(e, x, z) { this.fxOut.push([e, x, z, this.relay]); },
  installCapture() {
    if (this._cap) return; this._cap = true; const M = this;
    for (const k of MP_FXK) { const f = FX[k]; FX[k] = function (...a) { if (M.capturing()) M.cap([k].concat(a.map(v => Array.isArray(v) ? v.map(M.r2) : M.r2(v))), a[0], a[2]); return f.apply(FX, a); }; }
    const tel = FX.telegraph; FX.telegraph = function (a, t) { if (M.capturing() && a && a.id) M.cap(['tel', a.id, M.r2(t)], a.pos.x, a.pos.z); return tel.call(FX, a, t); };
    const exc = FX.exclaim; FX.exclaim = function (a) { if (M.capturing() && a && a.id) M.cap(['exc', a.id], a.pos.x, a.pos.z); return exc.call(FX, a); };
    const las = FX.laser; FX.laser = function (o, bx, by, bz, t) { if (M.capturing()) M.cap(['las', M.r2(o.x), M.r2(o.y), M.r2(o.z), M.r2(bx), M.r2(by), M.r2(bz), M.r2(t)], o.x, o.z); return las.call(FX, o, bx, by, bz, t); };
    const play = Snd.play; Snd.play = function (name, pos, vol, pitch) { if (pos && name !== 'step' && name !== 'mstep' && M.capturing()) M.cap(['snd', name, M.r2(pos.x), M.r2(pos.y), M.r2(pos.z), M.r2(vol === undefined ? 1 : vol), M.r2(pitch === undefined ? 1 : pitch)], pos.x, pos.z); return play.call(Snd, name, pos, vol, pitch); };
    const add = Lights.add; Lights.add = function (x, y, z, r, g, b, range, ttl, id) { if (M.capturing() && typeof id === 'string' && /^muzzle/.test(id)) M.cap(['lt', M.r2(x), M.r2(y), M.r2(z), M.r2(r), M.r2(g), M.r2(b), M.r2(range), M.r2(ttl)], x, z); return add.call(Lights, x, y, z, r, g, b, range, ttl, id); };
    const boom = Nades.boomFx; Nades.boomFx = function (x, y, z, rad, o) { if (M.capturing()) M.cap(['boom', M.r2(x), M.r2(y), M.r2(z), M.r2(rad)], x, z); M.capOff++; try { return boom.call(Nades, x, y, z, rad, o); } finally { M.capOff--; } };
    const say = HUD.say; HUD.say = function (who, text, dur) { if (M.host && M.state === 'play' && M.capOff === 0) M.sendTo(0, { t: 'hud', k: 'say', a: [who, text, dur] }); return say.call(HUD, who, text, dur); };
  },
  flushFx() {
    const L = this.fxOut; if (!L.length) return; this.fxOut = [];
    if (this.guest) { this.send({ t: 'fx', e: L.map(x => x[0]) }); return; }
    for (const p of this.peers.values()) {
      if (!p.ok || !p.proxy) continue; const me = p.proxy.pos, E = [];
      for (const [e, x, z, ex] of L) { if (ex === p.id) continue; if ((x - me.x) ** 2 + (z - me.z) ** 2 < 130 * 130) E.push(e); }
      if (E.length) this.sendTo(p.id, { t: 'fx', e: E });
    }
  },
  applyFx(E, from) {
    if (!Array.isArray(E)) return;
    const host = this.host; if (host) this.relay = from; else this.capOff++;
    try {
      for (const e of E) {
        const k = e[0];
        if (MP_FXK.indexOf(k) >= 0) FX[k].apply(FX, e.slice(1));
        else if (k === 'snd') Snd.play(e[1], { x: e[2], y: e[3], z: e[4] }, e[5], e[6]);
        else if (k === 'lt') Lights.add(e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], 'muzzleN' + (this._lt = ((this._lt || 0) + 1) % 4));
        else if (k === 'tel' || k === 'exc') { const a = host ? this.byId(e[1]) : this.ents.get(e[1]); if (a) k === 'tel' ? FX.telegraph(a, e[2]) : FX.exclaim(a); }
        else if (k === 'las') FX.laser({ x: e[1], y: e[2], z: e[3] }, e[4], e[5], e[6], e[7]);
        else if (k === 'boom') this.boomHere(e[1], e[2], e[3], e[4]);
      }
    } finally { if (host) this.relay = 0; else this.capOff--; }
  },
  // a blast seen from here (its damage is dealt at the host): fire, sound, the camera feels it
  boomHere(x, y, z, rad) {
    Nades.boomFx(x, y, z, rad, {});
    const dc = dist3(Cam.pos, { x, y, z }), kc = clamp(1.25 - dc / 28, 0, 1);
    if (kc > 0) { CamCtl.shake(0.35 + 0.65 * kc); Input.rumble(0.4 + 0.6 * kc, 0.8 * kc, 380); Render.post.extraFlash = Math.max(Render.post.extraFlash || 0, 0.22 * kc); setTimeout(() => { Render.post.extraFlash = 0; }, 90); }
    for (const n of Nades.list) if (!n.dead && dist3(n, { x, y, z }) < 2.5 && !n.nid) n.fuse = Math.min(n.fuse, 0.12);
  },
  // the host tells the guests about a grenade thrown (by anyone) and when it goes off
  onNade(n) {
    if (!this.host || this.state !== 'play') return;
    n.nid = n.id; const o = n.owner; const msg = { t: 'nade', id: n.id, x: this.r2(n.x), y: this.r2(n.y), z: this.r2(n.z), vx: this.r2(n.vx), vy: this.r2(n.vy), vz: this.r2(n.vz), f: this.r2(n.fuse), o: o ? o.id : 0 };
    for (const p of this.peers.values()) if (p.ok) { msg.o = o === p.proxy ? -1 : o ? o.id : 0; this.sendTo(p.id, msg); }
  },
  onNadeGone(n) { if (this.host && this.state === 'play' && n.nid) this.sendTo(0, { t: 'nadeX', id: n.nid }); },
  /* ---------------- the brigade: partners on the ground, signals ---------------- */
  // our robot is out of service: the partners are told (a sound, and where it lies on their screens)
  onDowned() {
    if (this.host) { const a = [this.name + ' est hors service', 'Allez le réparer : Action près de lui', 'bad']; this.sendTo(0, { t: 'hud', k: 'down', a }); }
    else if (this.guest) this.send({ t: 'died' });
  },
  // we repaired partner t: its owner puts it back on its feet
  revive(t) {
    if (this.host) { if (t.peer) this.sendTo(t.peer.id, { t: 'revived', by: this.name }); }
    else if (this.guest) this.send({ t: 'revive', id: t.net });
  },
  // « Ici ! »: a marker on what the camera points at (an enemy, a spot), shown to every partner a few seconds
  ping() {
    const P = Game.player, now = performance.now(); if (!P || now - (this._pingAt || 0) < 1200) return; this._pingAt = now;
    const f = Cam.fwd, c = Cam.pos, hit = Combat.shootProbe(c.x + f.x * 1.2, c.y + f.y * 1.2, c.z + f.z * 1.2, f.x, f.y, f.z, 140, P);
    let foe = null, bd = 2.4;
    for (const a of Game.actors) { if (!a.alive || a.removed || a.isRobot || a.cuffed || (a.team !== 'gang' && a.team !== 'cult')) continue; const d = Math.hypot(a.pos.x - hit.x, a.pos.y + 1 - hit.y, a.pos.z - hit.z); if (d < bd) { bd = d; foe = a; } }
    const q = hit.t >= 139 ? P.pos : hit;
    const e = { t: 'ping', x: this.r2(q.x), y: this.r2(q.y), z: this.r2(q.z), a: foe ? foe.id : 0, s: P.slot || 0, n: this.myName() };
    this.addPing(e);
    if (this.host) this.sendTo(0, e); else this.send(e);
  },
  addPing(e) { this.pings = (this.pings || []).filter(q => q.s !== e.s); e.at = performance.now(); this.pings.push(e); Snd.play('ping', null, 0.75); },
  /* ---------------- feedback for the robot who did something (score, toasts) ---------------- */
  // HUD feedback meant for robot `who`: here if it is ours, else on its owner's screen
  tell(who, k, args) {
    if (!who || who === Game.player || !who.peer) { this.hud(k, args); return; }
    this.sendTo(who.peer.id, { t: 'hud', k, a: args });
  },
  /* ---------------- the network stays alive while the window is hidden (host) ---------------- */
  // a hidden page gets no animation frames: a worker keeps ticking so the city goes on for the guests
  metronome() {
    if (this._met) return; this._met = true;
    try {
      const src = 'let t=null;onmessage=e=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      let last = performance.now();
      w.onmessage = () => { const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now; if (document.hidden && this.host && this.state === 'play' && Game.mode !== 'menu') Game.hiddenTick(dt); };
      document.addEventListener('visibilitychange', () => { last = performance.now(); w.postMessage(document.hidden && this.host ? 33 : 0); });
      this._worker = w;
    } catch (e) { }
  }
};

