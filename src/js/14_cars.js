/* =====================================================================
   VEHICLES — arcade physics, traffic AI, chase AI, instanced rendering
   ===================================================================== */
// police light bar: 0 = blue side lit, 1 = red side lit, sweeping smoothly between them
const sirenK = () => smoothstep(0.3, 0.7, 0.5 + 0.5 * Math.sin(Env.time * 4.4));
const CTYPES = {
  sedan: { len: 4.45, wid: 1.84, body: 0.6, cab: 0.52, max: 33, accel: 10, grip: 9, hp: 100, mass: 1 },
  compact: { len: 3.85, wid: 1.72, body: 0.62, cab: 0.55, max: 29, accel: 9.5, grip: 9, hp: 90, mass: 0.85 },
  police: { len: 4.6, wid: 1.86, body: 0.6, cab: 0.5, max: 41, accel: 12.5, grip: 10.5, hp: 170, mass: 1.1, police: true },
  taxi: { len: 4.5, wid: 1.84, body: 0.6, cab: 0.52, max: 33, accel: 10, grip: 9, hp: 100, mass: 1, taxi: true },
  van: { len: 5.3, wid: 2.02, body: 1.35, cab: 0.0, max: 30, accel: 8.5, grip: 7.8, hp: 150, mass: 1.6, van: true }
};
/* ---------- car bodies: a lofted lower body and a glass house, built once per type ----------
   top: [z (−1 rear … 1 front), height of the body line]; cab: z of windshield base, roof front, roof rear, rear window base; */
const CAR_SHAPES = {
  sedan: { top: [[-1, 0.6], [-0.975, 0.84], [-0.74, 0.93], [-0.56, 0.95], [0.3, 0.94], [0.78, 0.86], [0.975, 0.74], [1, 0.58]], cab: [0.33, 0.06, -0.3, -0.58], roof: 1.42, belt: 0.94, tw: 0.8 },
  taxi: { top: [[-1, 0.6], [-0.975, 0.84], [-0.74, 0.93], [-0.56, 0.95], [0.3, 0.94], [0.78, 0.86], [0.975, 0.74], [1, 0.58]], cab: [0.33, 0.06, -0.3, -0.58], roof: 1.42, belt: 0.94, tw: 0.8 },
  police: { top: [[-1, 0.62], [-0.975, 0.85], [-0.74, 0.94], [-0.56, 0.96], [0.3, 0.95], [0.78, 0.87], [0.975, 0.75], [1, 0.6]], cab: [0.32, 0.05, -0.32, -0.58], roof: 1.44, belt: 0.95, tw: 0.8 },
  compact: { top: [[-1, 0.64], [-0.97, 0.9], [-0.86, 0.93], [0.26, 0.92], [0.76, 0.84], [0.975, 0.73], [1, 0.6]], cab: [0.3, 0.0, -0.74, -0.93], roof: 1.46, belt: 0.93, tw: 0.8 },
  van: { top: [[-1, 1.1], [0.55, 1.1], [0.72, 1.07], [0.88, 1.0], [0.975, 0.9], [1, 0.74]], cab: [0.7, 0.5, 0.14, 0.14], roof: 2.22, belt: 1.1, tw: 0.95, box: true }
};
// seats for the partners of a brigade (multiplayer): front passenger, then the back seats ([to the side, back])
const CAR_SEATS = [[-0.4, 0.25], [0.42, 1.1], [-0.42, 1.1]], DRIVER_SEAT = [0.4, 0.25];
const CAR_COLS = [[0.45, 0.06, 0.08], [0.08, 0.12, 0.3], [0.62, 0.64, 0.66], [0.85, 0.85, 0.83], [0.04, 0.04, 0.05], [0.05, 0.3, 0.32], [0.3, 0.32, 0.2], [0.55, 0.3, 0.08], [0.25, 0.08, 0.3]];

class Car {
  constructor(type, x, z, yaw, o = {}) {
    const T = CTYPES[type]; this.type = type; this.T = T;
    this.pos = new V3(x, o.y || 0, z); this.yaw = yaw; this.vx = 0; this.vz = 0;
    this.len = T.len; this.wid = T.wid; this.hp = T.hp; this.maxHp = T.hp; this.police = !!T.police;
    this.color = o.color || (T.police ? [0.62, 0.64, 0.68] : T.taxi ? [0.95, 0.72, 0.1] : T.van ? RP([[0.8, 0.8, 0.78], [0.2, 0.22, 0.25], [0.15, 0.25, 0.4]]) : RP(CAR_COLS));
    this.driver = null; this.ai = o.ai || null; this.siren = !!o.siren; this.steerA = 0; this.wheelRot = 0; this.roll = 0; this.pitch = 0; this.bounce = 0;
    this.brakeK = 0; this.dead = false; this.stunT = 0; this.wps = []; this.honkT = 0; this.stopT = 0; this.sinking = false; this.id = ++Car.nid;
    this.inp = { throttle: 0, brake: 0, steer: 0, handbrake: false, park: false };
    this.circles = [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }]; this.contacts = [{}, {}, {}, {}];
    this.tags = o.tags || {}; this.lastHitBy = null; this.skid = 0; this.speed = 0;
    if (o.driver) this.setNpcDriver(o.driver);
  }
  get fx() { return Math.sin(this.yaw); } get fz() { return Math.cos(this.yaw); }
  setNpcDriver(kind) {
    const a = kind === 'civ' ? new Civilian(this.pos.x, this.pos.z, { mode: 'script' }) : new Enemy(kind, this.pos.x, this.pos.z, { ai: 'script' });
    a.inCar = this; a.setState('car'); a.umbrella = false; this.driver = a; Game.addActor(a); return a;
  }
}
Car.nid = 0;

const Cars = {
  list: [], inst: {}, tmp: M4.create(), M: M4.create(), graph: null,
  init() {
    const m = (px, py, pz, rx = 0, ry = 0, rz = 0) => M4.compose(M4.create(), px, py, pz, rx, ry, rz);
    const G2 = { cLamp: boxGeo(1, 1, 1), cWheel: CarModels.wheel(CarModels.ALLOY), cWheelS: CarModels.wheel(CarModels.STEELW), cWheelLo: CarModels.wheelLow() };
    for (const k in G2) { const it = new Instanced(G2[k], k === 'cLamp' ? 400 : 220); it.mat = k === 'cLamp' ? [20, 0.2, 0.3] : [34, 0.55, 0.2, 0.25]; this.inst[k] = it; Render.inst.push(it); }
    // one model per type: paint (the instance colour paints it; glossy, mirrors the sky), glass, trim, head and tail lamps
    this.models = {}; this.modelsFar = {};
    for (const t in CTYPES) for (const far of [false, true]) { // a detailed model for the cars near the camera, a light one for the others
      const G = CarModels.build(t, far), R = { lampF: G.lampF, lampR: G.lampR, wz: G.wz, wzo: G.wzo || 0, wy: G.wy || 0.34, cart: !!G.cart };
      for (const [k, mat] of G.cart ? [['paint', [12, 0.12, 0.3, 0]], ['glass', [40, 0.4, 0.3, 0.2]], ['trim', [14, 0.15, 0.3, 0]], ['head', [20, 0.3, 0.2, 0]], ['tail', [20, 0.3, 0.2, 0]]] : [['paint', [70, 1.0, 0.45, 0.55]], ['glass', [110, 1.6, 0.35, 1.0]], ['trim', [40, 0.6, 0.3, 0.25]], ['head', [20, 0.3, 0.2, 0]], ['tail', [20, 0.3, 0.2, 0]]]) { if (far && k === 'trim' && !G.cart) continue; const it = new Instanced(G[k], 48); it.mat = mat; R[k] = it; Render.inst.push(it); }
      (far ? this.modelsFar : this.models)[t] = R;
    }
    this.buildGraph();
  },
  // road graph: one node per crossing, edges along the road segments that exist
  buildGraph() {
    const nodes = [], id = new Map();
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) if (Net.node(i, j)) { id.set(i * 100 + j, nodes.length); nodes.push({ i, j, x: RX[i], z: RZ[j], nb: [] }); }
    const idx = (i, j) => { const k = id.get(i * 100 + j); return k === undefined ? -1 : k; };
    const link = (a, b) => { if (a < 0 || b < 0) return; nodes[a].nb.push(b); nodes[b].nb.push(a); };
    for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) { if (Net.segX(i, j)) link(idx(i, j), idx(i + 1, j)); if (Net.segZ(i, j)) link(idx(i, j), idx(i, j + 1)); }
    this.graph = { nodes, idx };
  },
  // shortest chain of crossings between two graph nodes (breadth first)
  pathTo(a, b) {
    const N = this.graph.nodes, prev = new Map([[a, -1]]), q = [a];
    while (q.length) { const k = q.shift(); if (k === b) break; for (const n of N[k].nb) if (!prev.has(n)) { prev.set(n, k); q.push(n); } }
    if (!prev.has(b)) return null; const path = []; for (let k = b; k !== -1; k = prev.get(k)) path.unshift(k); return path;
  },
  // put a car on a route of crossings (starts on the first edge)
  route(c, nodes) { c.route = nodes; c.ai = 'route'; c.arrived = false; c.wps = []; c.from = nodes[0]; c.to = nodes[1]; this.planEdge(c, nodes[0], nodes[1], true); },
  nearestNode(x, z) { let b = 0, bd = 1e9; this.graph.nodes.forEach((n, k) => { const d = dist2D(x, z, n.x, n.z); if (d < bd) { bd = d; b = k; } }); return b; },
  add(c) { this.list.push(c); return c; },
  clear() { for (const c of this.list) if (c.driver && !c.driver.isRobot) c.driver.removed = true; this.list = []; },
  /* ---------------- traffic spawning ---------------- */
  spawnTraffic(n) {
    const G2 = this.graph;
    for (let k = 0; k < n; k++) {
      const P = Game.player.pos, near = [];
      G2.nodes.forEach((nd, k) => { const d = dist2D(nd.x, nd.z, P.x, P.z); if (d > 30 && d < 175 && nd.nb.length) near.push(k); });
      if (!near.length) return;
      for (let tries = 0; tries < 20; tries++) {
        const a = RP(near), nb = G2.nodes[a].nb; const b = RP(nb);
        const A = G2.nodes[a], B = G2.nodes[b];
        const dx = Math.sign(B.x - A.x), dz = Math.sign(B.z - A.z); const rx = -dz, rz = dx;
        const t = R(0.3, 0.7); const x = lerp(A.x, B.x, t) + rx * LANE, z = lerp(A.z, B.z, t) + rz * LANE;
        if (dist2D(x, z, Game.player.pos.x, Game.player.pos.z) < 25) continue;
        if (this.list.some(c => dist2D(c.pos.x, c.pos.z, x, z) < 12)) continue;
        const c = this.add(new Car(RP(['sedan', 'sedan', 'compact', 'taxi', 'van', 'compact']), x, z, Math.atan2(dx, dz), { ai: 'traffic', driver: 'civ' }));
        c.ambient = true; c.from = a; c.to = b; this.planEdge(c, a, b, true); break;
      }
    }
  },
  laneP(A, B, t) { const dx = Math.sign(B.x - A.x), dz = Math.sign(B.z - A.z); return { x: lerp(A.x, B.x, t) - dz * LANE, z: lerp(A.z, B.z, t) + dx * LANE, dx, dz }; },
  // waypoints: straight lane on edge a->b, then a turn into the next edge
  planEdge(c, a, b, fromMiddle) {
    const N = this.graph.nodes, A = N[a], B = N[b];
    const dx = Math.sign(B.x - A.x), dz = Math.sign(B.z - A.z); const rx = -dz, rz = dx;
    const endX = B.x + rx * LANE - dx * (RHW + 1.5), endZ = B.z + rz * LANE - dz * (RHW + 1.5);
    c.wps.push({ x: endX, z: endZ, turn: false });
    const key = B.i * 100 + B.j; // traffic lights: the front bumper waits behind the crosswalk
    c.stopAt = World.signalNodes && World.signalNodes[key] ? { key, ax: dx !== 0 ? 'x' : 'z', x: B.x + rx * LANE - dx * (RHW + 3 + c.len / 2), z: B.z + rz * LANE - dz * (RHW + 3 + c.len / 2) } : null;
    // choose next node (no U-turn unless dead end), chase cars prefer away from player
    let opts = B.nb.filter(k => k !== a); if (!opts.length) opts = B.nb;
    let nxt;
    if (c.route) { // convoy: the next crossing is given; at the last one, stop just before it
      const k = c.route.indexOf(b); if (k < 0 || k + 1 >= c.route.length) { c.wps[c.wps.length - 1].last = true; return; }
      nxt = c.route[k + 1];
      if (N[nxt]) { const C = N[nxt]; const ex = Math.sign(C.x - B.x), ez = Math.sign(C.z - B.z); const r2x = -ez, r2z = ex; const sx = B.x + r2x * LANE + ex * (RHW + 1.5), sz = B.z + r2z * LANE + ez * (RHW + 1.5);
        if (ex !== dx || ez !== dz) { const ctrlX = dx !== 0 ? sx : endX, ctrlZ = dz !== 0 ? sz : endZ; for (let t = 0.25; t < 1; t += 0.25) { const u = 1 - t; c.wps.push({ x: u * u * endX + 2 * u * t * ctrlX + t * t * sx, z: u * u * endZ + 2 * u * t * ctrlZ + t * t * sz, turn: true }); } }
        c.wps.push({ x: sx, z: sz, turn: false, edge: [b, nxt] }); }
      return;
    }
    if (c.ai === 'chase') { const P = Game.player; opts.sort((p, q) => dist2D(N[q].x, N[q].z, P.pos.x, P.pos.z) - dist2D(N[p].x, N[p].z, P.pos.x, P.pos.z)); nxt = chance(0.7) ? opts[0] : RP(opts); }
    else nxt = RP(opts.filter(k => { const C = N[k]; return Math.sign(C.x - B.x) === dx && Math.sign(C.z - B.z) === dz; }).concat(opts));
    const C = N[nxt]; const ex = Math.sign(C.x - B.x), ez = Math.sign(C.z - B.z); const r2x = -ez, r2z = ex;
    const sx = B.x + r2x * LANE + ex * (RHW + 1.5), sz = B.z + r2z * LANE + ez * (RHW + 1.5);
    if (ex !== dx || ez !== dz) { // turn: quadratic bezier with control at lane lines intersection
      const ctrlX = dx !== 0 ? sx : endX, ctrlZ = dz !== 0 ? sz : endZ;
      for (let t = 0.25; t < 1; t += 0.25) { const u = 1 - t; c.wps.push({ x: u * u * endX + 2 * u * t * ctrlX + t * t * sx, z: u * u * endZ + 2 * u * t * ctrlZ + t * t * sz, turn: true }); }
    }
    c.wps.push({ x: sx, z: sz, turn: false, edge: [b, nxt] });
  },
  /* ---------------- per-frame ---------------- */
  update(dt) {
    const P = Game.player;
    for (const c of this.list) {
      if (c.net || c.remote) { this.netCar(c, dt); continue; } // driven on another page (multiplayer)
      if (c.driver === P) this.playerInput(c, dt);
      else if (c.ai && !c.dead && c.driver && c.driver.alive && c.stunT <= 0) this.aiDrive(c, dt);
      else { c.inp.throttle = 0; c.inp.brake = 0; c.inp.steer = 0; c.inp.handbrake = false; c.inp.park = true; }
      if (c.stunT > 0) c.stunT -= dt;
      if (c.fireT > 0 || c.burnT > 0) this.burn(c, dt);
      if (c.bump > 0) c.bump = Math.max(0, c.bump - dt * 1.5);
      this.physics(c, dt);
    }
    this.collideCars(dt);
    this.collideActors(dt);
    // player car audio & lights
    const pc = P && P.car;
    const eng = Snd.loop('engine');
    if (pc) {
      const sp = Math.abs(pc.speed); if (eng) eng.set(clamp(sp / pc.T.max, 0, 1) + pc.inp.throttle * 0.15, pc.inp.throttle, pc.dead ? 0 : 1);
      const sc = Snd.loop('screech'); if (sc) sc.set(clamp(pc.skid, 0, 1));
      if (Input.pressed.siren && pc.driver === P) { if (pc.police) { pc.siren = !pc.siren; HUD.toast(pc.siren ? 'Gyrophare activé' : 'Gyrophare coupé', '', 'gold', true); } else Snd.play('horn', pc.pos, 1); }
      const sl = Snd.loop('siren'); if (sl) { sl.set(pc.siren, 1); sl.tick(); }
    } else { if (eng) eng.set(0, 0, 0); const sc = Snd.loop('screech'); if (sc) sc.set(0); const sl = Snd.loop('siren'); if (sl) sl.set(false, 0); }
    // siren light
    // (a smooth red / blue sweep, about 1.4 swaps a second: no hard strobe)
    for (const c of this.list) if (c.siren && dist3(c.pos, Cam.pos) < 60) { const k = sirenK(); Lights.add(c.pos.x, c.pos.y + 2.2, c.pos.z, 1.2 + 1.2 * k, 0.6 + 0.5 * k, 0.18, 12, 0.05, 'siren' + c.id); }
    // headlights of player car
    if (pc && !pc.dead) Lights.add(pc.pos.x + pc.fx * 1.5, pc.pos.y + 1.8, pc.pos.z + pc.fz * 1.5, 1.5, 0.95, 0.45, 9, 0.05, 'headP');
    { // the nearest moving car's headlights sweep the street too
      const F = Game.player ? Game.player.pos : Cam.pos; let best = null, bd = 32 * 32;
      for (const c of this.list) { if (c === pc || c.dead || c.removed || c.sinking || Math.abs(c.speed) < 2) continue; const d = (c.pos.x - F.x) ** 2 + (c.pos.z - F.z) ** 2; if (d < bd) { bd = d; best = c; } }
      if (best) Lights.add(best.pos.x + best.fx * 1.5, best.pos.y + 1.8, best.pos.z + best.fz * 1.5, 1.1, 0.7, 0.32, 8, 0.05, 'headN');
    }
  },
  // a car simulated on another page: placed between the states received, its smoke and flames drawn here
  netCar(c, dt) {
    MP.carInterp(c, dt);
    if (c.fireT > 0 || c.burnT > 0) this.burn(c, dt, true);
    if (c.bump > 0) c.bump = Math.max(0, c.bump - dt * 1.5);
    if (!c.burnt && c.hp < c.maxHp * 0.4 && dist3(c.pos, Cam.pos) < 90 && Math.random() < (c.dead ? 0.6 : 0.25)) FX.carSmoke(c.pos.x + c.fx * c.len * 0.35, c.pos.y + 1.0, c.pos.z + c.fz * c.len * 0.35, c.hp < c.maxHp * 0.12 || c.fireT > 0);
    if (c.skid > 0.2 && Math.abs(c.speed) > 5 && Math.random() < c.skid) FX.tireSmoke(c.pos.x - c.fx * c.len * 0.4, c.pos.y, c.pos.z - c.fz * c.len * 0.4);
  },
  playerInput(c, dt) {
    const I = Input;
    c.inp.throttle = c.dead ? 0 : I.throttle; c.inp.brake = I.brake; c.inp.steer = I.steer; c.inp.handbrake = I.held.handbrake; c.inp.park = false;
  },
  aiDrive(c, dt) {
    if (c.arrived) { c.inp.throttle = 0; c.inp.brake = 1; c.inp.park = true; return; }
    if (c.ai === 'ram') return this.ramDrive(c, dt);
    if (!c.wps.length) { if (c.from !== undefined) { const e = [c.from, c.to]; this.planEdge(c, e[0], e[1]); } else { c.inp.throttle = 0; c.inp.brake = 0; c.inp.park = true; return; } }
    // pop reached waypoints
    while (c.wps.length && dist2D(c.pos.x, c.pos.z, c.wps[0].x, c.wps[0].z) < (c.ai === 'chase' ? 5 : 3.5)) { const w = c.wps.shift(); if (w.last) { c.arrived = true; c.wps.length = 0; break; } if (w.edge) { c.from = w.edge[0]; c.to = w.edge[1]; this.planEdge(c, w.edge[0], w.edge[1]); } }
    if (c.arrived) { c.inp.throttle = 0; c.inp.brake = 1; c.inp.park = true; return; }
    if (!c.wps.length) return;
    let tgt = c.wps[0]; if (c.wps.length > 1 && dist2D(c.pos.x, c.pos.z, tgt.x, tgt.z) < 6) tgt = c.wps[1];
    const dx = tgt.x - c.pos.x, dz = tgt.z - c.pos.z;
    const fwd = dx * c.fx + dz * c.fz, side = dx * (-c.fz) + dz * c.fx; // side > 0 => target on the right
    const ang = Math.atan2(side, fwd);
    c.inp.steer = clamp(ang * 2.2, -1, 1);
    let turning = false; for (let k = 0; k < Math.min(4, c.wps.length); k++) { const w = c.wps[k]; if (w.turn && dist2D(c.pos.x, c.pos.z, w.x, w.z) < (c.ai === 'chase' ? 22 : 16)) { turning = true; break; } }
    let desired = c.ai === 'chase' ? (turning ? 12 : 23) * (c.hp < c.maxHp * 0.3 ? 0.75 : 1) : c.ai === 'route' ? (turning ? 7 : c.cruise || 12) : (turning ? 6.5 : 11.5);
    if (c.hold) desired = 0; // told to wait (ambush ahead)
    if (c.ai === 'chase' && Math.abs(ang) > 0.6) desired = Math.min(desired, 9);
    // obstacle avoidance
    const ahead = Math.abs(c.speed) * 1.3 + 7; let obs = 1e9; let obsPlayer = false;
    const look = (x, z, w, isP) => { const lx = x - c.pos.x, lz = z - c.pos.z; const f = lx * c.fx + lz * c.fz, s = lx * (-c.fz) + lz * c.fx; if (f > 0 && f < ahead && Math.abs(s) < 1.25 + w) { if (f < obs) { obs = f; obsPlayer = isP; } } };
    if (c.ai !== 'chase') {
      for (const o of this.list) if (o !== c && dist2D(o.pos.x, o.pos.z, c.pos.x, c.pos.z) < ahead + 4) look(o.pos.x, o.pos.z, o.wid * 0.5, !!(o.driver && o.driver.isRobot));
      for (const a of Game.actors) if (a.alive && !a.inCar && dist2D(a.pos.x, a.pos.z, c.pos.x, c.pos.z) < ahead + 2 && a.pos.y < 1.5) look(a.pos.x, a.pos.z, 0.4, !!a.isRobot);
      // yield to police sirens behind
      for (const r of MP.robots()) { const pc = r.car; if (pc && pc.siren && pc !== c) { const lx = pc.pos.x - c.pos.x, lz = pc.pos.z - c.pos.z; if (lx * c.fx + lz * c.fz < 0 && Math.hypot(lx, lz) < 30) { desired *= 0.35; break; } } }
    }
    if (obs < 1e9) { desired = Math.min(desired, Math.max(0, (obs - 5.5) * 0.9)); }
    if (c.ai === 'traffic' && c.stopAt) { // red (or amber with room to stop): wait at the line
      const S = c.stopAt, f = (S.x - c.pos.x) * c.fx + (S.z - c.pos.z) * c.fz;
      if (f < -1.5) c.stopAt = null;
      else { const st = Signals.state(S.key, S.ax); if (st === 'R' || (st === 'A' && f > c.speed * c.speed / 10 + 2)) desired = Math.min(desired, Math.max(0, (f - 0.3) * 0.9)); }
    }
    if (desired < 0.5 && Math.abs(c.speed) < 0.5) { c.stopT += dt; if (obsPlayer && c.stopT > 2.5 && c.honkT <= 0) { Snd.play('horn', c.pos, 0.8); c.honkT = R(3, 6); } } else c.stopT = 0;
    c.honkT -= dt;
    const sp = c.speed;
    if (sp < desired) { c.inp.throttle = clamp((desired - sp) * 0.4, 0.15, 1); c.inp.brake = 0; } else { c.inp.throttle = 0; c.inp.brake = clamp((sp - desired) * 0.35, 0, 1); }
    c.inp.handbrake = false; c.inp.park = false;
    // stuck recovery for chase cars: reverse briefly
    if (c.ai === 'chase') { if (Math.abs(sp) < 1.5 && c.inp.throttle > 0.5) { c.stuckT = (c.stuckT || 0) + dt; if (c.stuckT > 1.2) { c.revT = 0.9; c.stuckT = 0; } } else c.stuckT = 0; if (c.revT > 0) { c.revT -= dt; c.inp.throttle = 0; c.inp.brake = 1; c.inp.steer = -c.inp.steer; } }
  },
  // pursuers: drive straight at the target car (a little ahead of it) and ram it; back up when stuck
  ramDrive(c, dt) {
    const P = MP.host ? MP.nearestRobot(c.pos.x, c.pos.z) || Game.player : Game.player, T = c.ramTarget || (P.car || P); if (!T || T.removed) { c.inp.throttle = 0; c.inp.brake = 1; return; }
    const tvx = T.vx !== undefined ? T.vx : T.vel ? T.vel.x : 0, tvz = T.vz !== undefined ? T.vz : T.vel ? T.vel.z : 0;
    const d = dist2D(c.pos.x, c.pos.z, T.pos.x, T.pos.z), lead = clamp(d / 30, 0, 0.8);
    const tx = T.pos.x + tvx * lead - c.pos.x, tz = T.pos.z + tvz * lead - c.pos.z;
    const ang = Math.atan2(tx * (-c.fz) + tz * c.fx, tx * c.fx + tz * c.fz);
    c.inp.steer = clamp(ang * 2.4, -1, 1);
    let desired = d > 45 ? 25 : 19; if (Math.abs(ang) > 1.1) desired = 8; if (!T.vx && d < 5) desired = 6;
    const sp = c.speed;
    if (sp < desired) { c.inp.throttle = clamp((desired - sp) * 0.4, 0.2, 1); c.inp.brake = 0; } else { c.inp.throttle = 0; c.inp.brake = clamp((sp - desired) * 0.3, 0, 1); }
    c.inp.handbrake = false; c.inp.park = false;
    if (Math.abs(sp) < 1.5 && c.inp.throttle > 0.5) { c.stuckT = (c.stuckT || 0) + dt; if (c.stuckT > 1.1) { c.revT = 1.0; c.stuckT = 0; } } else c.stuckT = 0;
    if (c.revT > 0) { c.revT -= dt; c.inp.throttle = 0; c.inp.brake = 1; c.inp.steer = -c.inp.steer; }
  },
  physics(c, dt) {
    const T = c.T, I = c.inp;
    if (c.sinking) { c.pos.y -= dt * 1.2; c.vx *= 0.95; c.vz *= 0.95; c.pos.x += c.vx * dt; c.pos.z += c.vz * dt; if (c.pos.y < WATER_Y - 3) c.removed = true; return; }
    const fx = c.fx, fz = c.fz, rx = -fz, rz = fx;
    let vf = c.vx * fx + c.vz * fz, vs = c.vx * rx + c.vz * rz;
    const maxS = T.max * (c.dead ? 0 : c.hp < c.maxHp * 0.3 ? 0.7 : 1);
    if (I.throttle > 0.01) { if (vf < -0.5) vf += I.throttle * 20 * dt; else vf += I.throttle * T.accel * Math.max(0, 1 - vf / Math.max(1, maxS)) * dt * 1.4; }
    if (I.brake > 0.01) { if (vf > 0.5) vf -= I.brake * 24 * dt; else if (c.dead) vf = approach(vf, 0, I.brake * 24 * dt); else vf = Math.max(-11, vf - I.brake * 8 * dt); } // dead engine: the brake stops it, nothing backs it up
    vf -= vf * 0.06 * dt; if (I.throttle < 0.01 && I.brake < 0.01) vf = approach(vf, 0, 2.2 * dt);
    if (I.handbrake) vf = approach(vf, 0, 7 * dt);
    if (I.park) vf = approach(vf, 0, 9 * dt);
    const grip = I.handbrake ? 1.6 : T.grip; const vs0 = vs; vs *= Math.exp(-grip * dt);
    c.skid = Math.abs(vs0) > 3.5 ? clamp((Math.abs(vs0) - 3.5) / 8, 0, 1) : 0;
    const sp = Math.abs(vf);
    const steerMax = lerp(0.62, 0.2, clamp(sp / 38, 0, 1));
    c.steerA = damp(c.steerA, I.steer * steerMax, 7, dt);
    const wb = c.len * 0.62; let yawRate = vf / wb * Math.tan(c.steerA); if (I.handbrake) yawRate *= 1.45;
    c.yaw -= yawRate * dt;
    const nfx = Math.sin(c.yaw), nfz = Math.cos(c.yaw); const nrx = -nfz, nrz = nfx;
    c.vx = nfx * vf + nrx * vs; c.vz = nfz * vf + nrz * vs;
    c.pos.x += c.vx * dt; c.pos.z += c.vz * dt;
    c.speed = vf;
    // ground / water
    const g = World.groundAt(c.pos.x, c.pos.z, 0.6, c.pos.y + 0.4);
    if (g < -5) { if (!c.sinking) { c.sinking = true; FX.splash(c.pos.x, WATER_Y, c.pos.z); Snd.play('splash', c.pos, 1); if (c.driver === Game.player) Game.playerFellInWater(); else if (c.driver) { c.driver.removed = true; c.driver.alive = false; } } }
    else c.pos.y = damp(c.pos.y, g, 18, dt);
    // static collisions using 3 circles
    const r = c.wid * 0.5 + 0.02; let impact = 0;
    const offs = [-(c.len * 0.5 - r), 0, c.len * 0.5 - r];
    for (let k = 0; k < 3; k++) {
      const P = { x: c.pos.x + nfx * offs[k], y: c.pos.y, z: c.pos.z + nfz * offs[k] }; const ox = P.x, oz = P.z;
      const n = World.collideCircle(P, r, 1.3, 0.5, c.contacts);
      if (n) {
        const px = P.x - ox, pz = P.z - oz; c.pos.x += px; c.pos.z += pz; const pl = Math.hypot(px, pz) || 1; const nx = px / pl, nz = pz / pl;
        const vn = c.vx * nx + c.vz * nz; if (vn < 0) { c.vx -= 1.35 * vn * nx; c.vz -= 1.35 * vn * nz; impact = Math.max(impact, -vn); c.yaw += (k === 0 ? 1 : k === 2 ? -1 : 0) * clamp(-vn * 0.004, 0, 0.06) * Math.sign(nx * nrx + nz * nrz); }
      }
    }
    if (impact > 4) this.impact(c, impact, null);
    // visuals
    c.wheelRot += vf * dt / 0.34;
    const latAcc = vf * yawRate; c.roll = damp(c.roll, clamp(-latAcc * 0.012, -0.08, 0.08), 6, dt);
    c.pitch = damp(c.pitch, clamp((I.brake > 0.1 && vf > 1 ? 0.035 : 0) - (I.throttle > 0.5 && vf < 15 ? 0.025 : 0), -0.05, 0.05), 6, dt);
    c.brakeK = damp(c.brakeK, I.brake > 0.1 || I.handbrake ? 1 : 0, 12, dt);
    if (c.skid > 0.2 && sp > 5 && Math.random() < c.skid) FX.tireSmoke(c.pos.x - nfx * c.len * 0.4, c.pos.y, c.pos.z - nfz * c.len * 0.4);
    if (c.hp < c.maxHp * 0.4 && !c.burnt && Math.random() < (c.dead ? 0.6 : 0.25)) FX.carSmoke(c.pos.x + nfx * c.len * 0.35, c.pos.y + 1.0, c.pos.z + nfz * c.len * 0.35, c.hp < c.maxHp * 0.12 || c.fireT > 0);
  },
  impact(c, v, other) {
    if (c.net || c.remote) return; // its own page feels the crash
    if (v > 6) { Snd.play('crash', c.pos, clamp(v / 20, 0.3, 1)); FX.spark(c.pos.x + c.fx * c.len * 0.5, c.pos.y + 0.7, c.pos.z + c.fz * c.len * 0.5, 1, 10, [1, 0.8, 0.5]); } else Snd.play('bump', c.pos, 0.6);
    const mul = c.driver && c.driver.isRobot ? 0.55 : c.police ? 1.4 : 2.4;
    this.damage(c, (v - 4) * mul, other && other.driver);
    if (c.driver === Game.player) { CamCtl.shake(clamp(v / 25, 0.1, 0.7)); Input.rumble(clamp(v / 20, 0.2, 1), 0.5, 180); }
  },
  // outward normal of the body at a point near its surface (world), for things bouncing off a car
  hitNormal(c, x, y, z) {
    const fx = c.fx, fz = c.fz, lx = x - c.pos.x, lz = z - c.pos.z;
    const s = lx * (-fz) + lz * fx, f = lx * fx + lz * fz, h = y - c.pos.y;
    const ds = c.wid / 2 - Math.abs(s), df = c.len / 2 - Math.abs(f), dh = (c.T.van ? 2.3 : 1.45) - h;
    if (dh < ds && dh < df) return [0, 1, 0];
    if (ds < df) { const sg = Math.sign(s) || 1; return [-fz * sg, 0, fx * sg]; }
    const sg = Math.sign(f) || 1; return [fx * sg, 0, fz * sg];
  },
  // engine on fire (health run out, or a wreck caught in a blast): burns a few seconds, then the tank goes up
  ignite(c, t) {
    if (c.burnt || c.fireT > 0 || c.sinking) return;
    c.fireT = t || (c.driver === Game.player ? R(5.5, 6.5) : R(4.5, 6)); c.fireMax = c.fireT; c.dead = true; c.siren = false; c.hp = 0;
    Snd.play('crash', c.pos, 0.7); FX.smoke(c.pos.x, c.pos.y + 1, c.pos.z, [0.25, 0.22, 0.2], 10);
    if (c.driver === Game.player) { HUD.big('Moteur en feu', 'Sortez du véhicule !', 'bad', 2.6); Input.rumble(0.6, 0.6, 300); }
  },
  // the tank goes up: whoever is still inside is thrown out into the blast, the wreck stays
  explode(c) {
    c.fireT = 0; c.burnt = true; c.burnT = 30; c.dead = true; c.hp = 0;
    const P = Game.player;
    if (c.driver === P) this.exit(c, P, true);
    else if (c.driver) { const d = c.driver; c.driver = null; d.inCar = null; d.hidden = false; d.pos.set(c.pos.x - c.fz * (c.wid / 2 + 0.6), c.pos.y, c.pos.z + c.fx * (c.wid / 2 + 0.6)); d.setState('move'); }
    for (const a of Game.actors) if (a.inCar === c && a !== P) { a.inCar = null; a.hidden = false; a.pos.set(c.pos.x + c.fz * (c.wid / 2 + 0.6), c.pos.y, c.pos.z - c.fx * (c.wid / 2 + 0.6)); a.setState && a.setState('move'); }
    Nades.explode(c.pos.x, c.pos.y + 0.8, c.pos.z, c.lastHitBy || null, { car: true, R: 7, dmg: 170, carId: c.id });
    c.bump = 0.6; c.vx *= 0.3; c.vz *= 0.3; c.vy = 0;
    Game.onCarExploded && Game.onCarExploded(c);
  },
  burn(c, dt, vis) {
    const fx = c.fx, fz = c.fz, ex = c.pos.x + fx * c.len * 0.3, ez = c.pos.z + fz * c.len * 0.3, near = dist3(c.pos, Cam.pos) < 90;
    if (c.fireT > 0) {
      if (!vis) c.fireT -= dt;
      if (c.driver === Game.player) { c.warnT = (c.warnT || 0) - dt; if (c.warnT <= 0) { c.warnT = c.fireT < 2 ? 0.22 : 0.5; Snd.play('nadewarn', null, 0.55); } }
      if (near && Math.random() < 0.35 + 0.5 * (1 - c.fireT / (c.fireMax || 5))) FX.P(ex + R(-0.4, 0.4), c.pos.y + 0.95, ez + R(-0.4, 0.4), { vx: R(-0.4, 0.4), vy: R(2, 3.5), vz: R(-0.4, 0.4), life: R(0.5, 0.9), size: R(0.6, 1.0), grow: 1.2, r: 0.12, g: 0.1, b: 0.09, a: 0.6, cell: 3, add: false, drag: 0.6 });
      if (near && Math.random() < 0.7) { FX.P(ex + R(-0.5, 0.5), c.pos.y + 1.0, ez + R(-0.5, 0.5), { vx: R(-0.3, 0.3), vy: R(1.5, 3), vz: R(-0.3, 0.3), life: R(0.35, 0.6), size: R(0.5, 0.9), grow: 0.8, r: 2.2, g: R(0.8, 1.2), b: 0.2, cell: 3, rot: R(0, 6) }); FX.carSmoke(ex, c.pos.y + 1.4, ez, false); }
      Lights.add(ex, c.pos.y + 1.4, ez, 2.4 + Math.random(), 1.1, 0.35, 11, 0.1, 'carfire' + c.id);
      if (c.fireT <= 0 && !vis) this.explode(c);
    } else if (c.burnT > 0) { // the wreck smoulders
      c.burnT -= dt;
      if (near && Math.random() < 0.35) { FX.carSmoke(c.pos.x + R(-0.6, 0.6), c.pos.y + 1.2, c.pos.z + R(-0.6, 0.6), c.burnT > 18); }
      if (c.burnT > 12) Lights.add(c.pos.x, c.pos.y + 1.2, c.pos.z, 1.4, 0.55, 0.18, 8, 0.1, 'carfire' + c.id);
    }
  },
  // health: smoke under 40 %, flames licking out under 15 %; a suspect's or a passer-by's car stalls at 20 %
  // (immobilized: the objective of a chase); at zero the engine catches fire and the tank goes up a few seconds later.
  // The robot's own car is armoured: it takes 40 % less.
  damage(c, d, by) {
    if (d <= 0 || c.burnt || c.fireT > 0 || c.sinking) return;
    if (by && by.isRobot && ((c.driver && c.driver.isRobot) || c.netDrv >= 10)) return; // a partner's car (multiplayer)
    if (c.net) { if (MP.guest && by === Game.player) MP.send({ t: 'cdmg', id: c.id, d: MP.r2(d) }); return; } // the host's car: the host applies it
    if (c.remote) { const p = MP.peers.get(c.remote); if (p) MP.sendTo(p.id, { t: 'carhit', id: c.id, d: MP.r2(d), s: by ? by.id : 0 }); return; } // a guest's car: its driver's page applies it
    if (c.driver && c.driver.isRobot) d *= 0.6;
    c.hp -= d; if (by) c.lastHitBy = by;
    const stall = c.driver !== Game.player && (c.tags.target || c.ai === 'traffic' || c.ai === 'chase' || c.ai === 'ram') ? 0.2 : 0;
    if (!c.dead && c.hp <= c.maxHp * stall) { c.dead = true; c.siren = false; Snd.play('crash', c.pos, 1); FX.smoke(c.pos.x, c.pos.y + 1, c.pos.z, [0.3, 0.3, 0.3], 14); Game.onCarDisabled(c); }
    if (c.hp <= 0) { c.hp = 0; if (!c.dead) { c.dead = true; Game.onCarDisabled(c); } this.ignite(c); }
  },
  collideCars(dt) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.sinking || b.sinking) continue;
      const la = !(a.net || a.remote), lb = !(b.net || b.remote); if (!la && !lb) continue; // both driven on other pages
      if (dist2D(a.pos.x, a.pos.z, b.pos.x, b.pos.z) > (a.len + b.len) * 0.55 + 0.5) continue;
      const ra = a.wid * 0.5, rb = b.wid * 0.5;
      const oa = [-(a.len * 0.5 - ra), 0, a.len * 0.5 - ra], ob = [-(b.len * 0.5 - rb), 0, b.len * 0.5 - rb];
      let hit = false, nxS = 0, nzS = 0, depth = 0;
      for (const p of oa) for (const q of ob) {
        const ax = a.pos.x + a.fx * p, az = a.pos.z + a.fz * p, bx = b.pos.x + b.fx * q, bz = b.pos.z + b.fz * q;
        const dx = bx - ax, dz = bz - az; const d = Math.hypot(dx, dz); const m = ra + rb;
        if (d < m && d > 1e-4) { hit = true; nxS += dx / d * (m - d); nzS += dz / d * (m - d); depth = Math.max(depth, m - d); }
      }
      if (!hit) continue;
      const nl = Math.hypot(nxS, nzS) || 1; const nx = nxS / nl, nz = nzS / nl;
      const ma = la ? a.T.mass : 1e6, mb = lb ? b.T.mass : 1e6; const wa = mb / (ma + mb), wb = ma / (ma + mb); // a car driven elsewhere does not give way here
      a.pos.x -= nx * depth * wa; a.pos.z -= nz * depth * wa; b.pos.x += nx * depth * wb; b.pos.z += nz * depth * wb;
      const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rv < 0) {
        const j2 = -1.3 * rv / (1 / ma + 1 / mb);
        a.vx -= j2 / ma * nx; a.vz -= j2 / ma * nz; b.vx += j2 / mb * nx; b.vz += j2 / mb * nz;
        const v = -rv; if (v > 3) { this.impact(a, v, b); this.impact(b, v, a); if (a.ai === 'traffic') a.stunT = 1.5; if (b.ai === 'traffic') b.stunT = 1.5; Game.onCarHit(a, b, v); }
      }
    }
  },
  // height of a car's upper surface above its origin: u along the length (−1 rear … 1 front), w across (0 centre … 1 side)
  surfH(c, u, w) {
    const S = CAR_SHAPES[c.type] || CAR_SHAPES.sedan, T = S.top, C = S.cab; let h = T[T.length - 1][1];
    for (let i = 1; i < T.length; i++) { const a = T[i - 1], b = T[i]; if (u <= b[0]) { h = a[1] + (b[1] - a[1]) * clamp((u - a[0]) / Math.max(1e-4, b[0] - a[0]), 0, 1); break; } }
    if (u < T[0][0]) h = T[0][1];
    let k = 0; // how far up the glass house (0 belt … 1 roof)
    if (S.box) k = u <= C[1] ? 1 : u < C[0] ? (C[0] - u) / (C[0] - C[1]) : 0;
    else if (u < C[0] && u > C[3]) k = u > C[1] ? (C[0] - u) / (C[0] - C[1]) : u < C[2] ? (u - C[3]) / (C[2] - C[3]) : 1;
    if (k > 0 && w < 0.93) { const side = clamp((0.93 - w) / (0.93 * (1 - S.tw) + 1e-3), 0, 1); h = Math.max(h, lerp(S.belt, S.belt + (S.roof - S.belt) * clamp(k, 0, 1), side)); }
    return h;
  },
  // the highest car surface under a circle at (x, z), not above maxY (so one can land on a car, not step onto it)
  topAt(x, z, r, maxY) {
    let best = -1e9;
    for (const c of this.list) {
      if (c.removed || c.sinking) continue;
      const dx = x - c.pos.x, dz = z - c.pos.z; if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
      const lf = dx * c.fx + dz * c.fz, ls = -dx * c.fz + dz * c.fx, hl = c.len / 2, hw = c.wid / 2;
      if (Math.abs(lf) > hl - 0.12 + r * 0.4 || Math.abs(ls) > hw - 0.1 + r * 0.4) continue;
      const y = c.pos.y + this.surfH(c, clamp(lf / hl, -1, 1), clamp(Math.abs(ls) / hw, 0, 1));
      if (y <= maxY && y > best) { best = y; this.topCar = c; }
    }
    return best;
  },
  collideActors(dt) {
    for (const c of this.list) {
      if (c.sinking) continue; const fx = c.fx, fz = c.fz, rx = -fz, rz = fx; const hl = c.len / 2, hw = c.wid / 2;
      for (const a of Game.actors) {
        if (a.inCar || a.removed || a.noPhys) continue;
        const dx = a.pos.x - c.pos.x, dz = a.pos.z - c.pos.z; if (Math.abs(dx) > 6 || Math.abs(dz) > 6) continue;
        if (a.pos.y > c.pos.y + (c.T.van ? 2.2 : 1.45)) continue;
        if (a.state === 'vault' && a.carVault === c) continue; // sliding across it
        const lf = dx * fx + dz * fz, ls = dx * rx + dz * rz;
        const px = hl + a.r - Math.abs(lf), ps = hw + a.r - Math.abs(ls); if (px <= 0 || ps <= 0) continue;
        if (a.pos.y > c.pos.y + this.surfH(c, clamp(lf / hl, -1, 1), clamp(Math.abs(ls) / hw, 0, 1)) - 0.15) { // on it (or jumping onto it): rides along
          if (a.grounded && a.groundY > c.pos.y + 0.4) { a.pos.x += c.vx * dt; a.pos.z += c.vz * dt; }
          continue;
        }
        let nx, nz, push; if (px < ps) { nx = fx * Math.sign(lf); nz = fz * Math.sign(lf); push = px; } else { nx = rx * Math.sign(ls); nz = rz * Math.sign(ls); push = ps; }
        a.pos.x += nx * push; a.pos.z += nz * push;
        const vn = c.vx * nx + c.vz * nz, avn = a.vel.x * nx + a.vel.z * nz; const rel = vn - avn;
        // impact speed = how fast the CAR comes at the person (someone running into a parked car is only stopped)
        const imp = vn - Math.max(0, avn);
        if (vn > 4.5 && imp > 4.5 && a.alive && a.state !== 'dead') {
          const dmg = imp * imp * 0.32;
          const kd = imp > 6;
          a.takeHit(c.driver || null, dmg, { kind: imp > 13 ? 'car' : 'melee', knock: imp * 0.7, kd: kd ? 1 : 0, poise: 999, unblockable: true });
          a.vel.x = c.vx * 0.7 + nx * 2; a.vel.z = c.vz * 0.7 + nz * 2; a.vel.y = Math.min(7, rel * 0.35); a.grounded = false;
          Snd.play('bump', a.pos, 0.8); FX.hit(a.pos.x, a.pos.y + 1, a.pos.z, 1);
          c.vx *= 0.85; c.vz *= 0.85;
          if (c.driver && c.driver.isRobot) Game.onRunOver(a, imp, c.driver);
        } else if (rel > 0) { a.vel.x += nx * rel; a.vel.z += nz * rel; }
        // civilians dive away from fast player cars
      }
    }
    for (const r of MP.robots()) {
      const pc = r.car; if (!pc || !(Math.abs(pc.speed) > 8)) continue;
      for (const a of Game.actors) {
        if (a.team !== 'civ' || !a.alive || a.inCar || a.dove) continue;
        const dx = a.pos.x - pc.pos.x, dz = a.pos.z - pc.pos.z; const f = dx * pc.fx + dz * pc.fz, s = dx * (-pc.fz) + dz * pc.fx;
        if (f > 0 && f < Math.abs(pc.speed) * 0.9 && Math.abs(s) < 2.5 && chance(0.08)) { a.dove = true; const side = s > 0 ? 1 : -1; a.vel.x += (-pc.fz) * side * 6; a.vel.z += pc.fx * side * 6; a.vel.y = 3; a.grounded = false; a.panic && a.panic(pc.pos.x, pc.pos.z, 5); setTimeout(() => { a.dove = false; }, 1500); }
      }
    }
  },
  /* ---------------- passengers (multiplayer) ---------------- */
  seatCount(c) { return c.T.van ? 1 : 3; },
  // the host knows who sits where; the guests only which seats are taken (sent with the car)
  seatMask(c) { let m = 0; const S = c.seats; if (S) for (let i = 0; i < S.length; i++) if (S[i] && !S[i].removed) m |= 1 << i; return m; },
  seatOpen(c) { const n = this.seatCount(c), m = c.net ? (c.seatMask || 0) : this.seatMask(c); for (let i = 0; i < n; i++) if (!(m & (1 << i))) return true; return false; },
  seatTake(c, who) { const n = this.seatCount(c); c.seats = c.seats || []; for (let i = 0; i < n; i++) if (!c.seats[i] || c.seats[i].removed) { c.seats[i] = who; return i; } return -1; },
  seatLeave(c, who) { if (c && c.seats) for (let i = 0; i < c.seats.length; i++) if (c.seats[i] === who) c.seats[i] = null; },
  // a partner's car (stopped or nearly) with a free seat
  nearestRide(p, maxD, P) {
    if (!MP.on) return null; let best = null, bd = maxD;
    for (const c of this.list) {
      if (c.removed || c.sinking || c.burnt || c.fireT > 0 || Math.abs(c.speed) > 3) continue;
      const mate = c.net ? c.netDrv >= 10 : !!(c.driver && c.driver.isRobot && c.driver !== P);
      if (!mate || !this.seatOpen(c)) continue;
      const d = dist2D(p.x, p.z, c.pos.x, c.pos.z) - c.wid * 0.5; if (d < bd && Math.abs(p.y - c.pos.y) < 1.2) { bd = d; best = c; }
    }
    return best;
  },
  // where someone sits (seat -1: the driver)
  seatPos(c, seat, out) { const S = seat >= 0 ? CAR_SEATS[seat] || CAR_SEATS[0] : DRIVER_SEAT; out.set(c.pos.x + c.fz * S[0] - c.fx * S[1], c.pos.y, c.pos.z - c.fx * S[0] - c.fz * S[1]); return out; },
  // out of the car on a side that is clear (the seat's own side first)
  placeOut(c, P, prefer = 1) {
    const sides = prefer < 0 ? [[c.fz, -c.fx], [-c.fz, c.fx]] : [[-c.fz, c.fx], [c.fz, -c.fx]];
    for (const [sx, sz] of sides) {
      const x = c.pos.x - sx * (c.wid / 2 + 0.75), z = c.pos.z - sz * (c.wid / 2 + 0.75);
      const q = World.query(x - 0.35, z - 0.35, x + 0.35, z + 0.35, []); const blocked = q.some(b => b.y1 > c.pos.y + 0.5 && b.y0 < c.pos.y + 1.7);
      if (!blocked) { P.pos.set(x, World.groundAt(x, z, 0.3, c.pos.y + 1), z); return; }
    }
    P.pos.set(c.pos.x, c.pos.y + 1.6, c.pos.z);
  },
  nearestEnterable(p, maxD) {
    let best = null, bd = maxD;
    for (const c of this.list) { if (c.sinking || c.burnt || c.fireT > 0 || c.driver === Game.player || c.tags.noEnter) continue; if (c.driver && !(c.driver instanceof Civilian) && c.driver.alive) continue; if (c.net && c.netDrv >= 2) continue; const d = dist2D(p.x, p.z, c.pos.x, c.pos.z) - c.wid * 0.5; if (d < bd && Math.abs(p.y - c.pos.y) < 1.2 && Math.abs(c.speed) < 3) { bd = d; best = c; } }
    return best;
  },
  enter(c, P) {
    if (c.net && MP.guest) MP.claimCar(c); // the host's car: we drive it from now on (the host may still say no)
    if (c.driver && c.driver !== P) { const d = c.driver; d.inCar = null; d.setState('move'); d.pos.set(c.pos.x - c.fz * (c.wid / 2 + 0.7), c.pos.y, c.pos.z + c.fx * (c.wid / 2 + 0.7)); if (d.panic) d.panic(P.pos.x, P.pos.z, 3); if (d.mode !== undefined) { d.mode = 'flee'; d.panicT = 8; } c.driver = null; HUD.toast('Véhicule réquisitionné', '', 'gold', true); }
    c.driver = P; P.car = c; P.inCar = c; P.setState('car'); P.vel.set(0, 0, 0); P.blocking = false; P.aiming = false; c.ai = null; c.stunT = 0;
    Snd.play('door', c.pos, 0.8); Snd.play('engineStart', c.pos, 0.6); Input.ctx.car = true; HUD.carMode(true); Game.onEnterCar(c);
  },
  exit(c, P, force) {
    if (Math.abs(c.speed) > 6 && !force && !(c.fireT > 0)) { HUD.hint('Ralentissez pour sortir'); return; }
    this.placeOut(c, P);
    c.driver = null; P.car = null; P.inCar = null; P.setState('move'); P.yaw = c.yaw; P.vel.set(c.vx * 0.3, 0, c.vz * 0.3); c.inp.throttle = 0; c.inp.brake = 1;
    Snd.play('door', c.pos, 0.8); Input.ctx.car = false; HUD.carMode(false); Game.onExitCar(c);
    if (c.mine && MP.guest) MP.releaseCar(c); // back to the host
  },
  rayHit(c, ox, oy, oz, dx, dy, dz, maxT) {
    if (c.sinking) return null;
    const fx = c.fx, fz = c.fz; const lx = ox - c.pos.x, lz = oz - c.pos.z;
    const o1 = lx * (-fz) + lz * fx, o2 = oy - c.pos.y, o3 = lx * fx + lz * fz; const d1 = dx * (-fz) + dz * fx, d2 = dy, d3 = dx * fx + dz * fz;
    const hw = c.wid / 2, hh = c.T.van ? 2.3 : 1.45, hl = c.len / 2;
    let t0 = 0, t1 = maxT;
    const slab = (o, d, lo, hi) => { if (Math.abs(d) < 1e-9) return o >= lo && o <= hi; let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); return t0 <= t1; };
    if (!slab(o1, d1, -hw, hw) || !slab(o2, d2, 0.25, hh) || !slab(o3, d3, -hl, hl)) return null;
    return t0;
  },
  /* ---------------- rendering ---------------- */
  render() {
    for (const k in this.inst) this.inst[k].reset();
    for (const set of [this.models, this.modelsFar]) for (const t in set) { const R = set[t]; for (const k of ['paint', 'glass', 'trim', 'head', 'tail']) if (R[k]) R[k].reset(); }
    const M = this.M, tmp = this.tmp;
    for (const c of this.list) {
      if (c.removed) continue;
      const d = dist3(c.pos, Cam.pos); if (d > 170) continue;
      if (!Cam.sphereVisible(c.pos.x, c.pos.y + 0.8, c.pos.z, c.len * 0.7)) continue;
      const T = c.T, L = c.len, W = c.wid, near = d < 38, G = (near ? this.models : this.modelsFar)[c.type], burnt = !!c.burnt, bp = c.bump || 0;
      M4.compose(M, c.pos.x, c.pos.y + 0.02 + bp * 0.45, c.pos.z, c.pitch + bp * 0.25, c.yaw, c.roll + bp * 0.18);
      const col = burnt ? [0.05, 0.045, 0.04] : c.color, dmgK = burnt ? 1 : 0.55 + 0.45 * (c.hp / c.maxHp);
      const cr = col[0] * dmgK, cg = col[1] * dmgK, cb = col[2] * dmgK, tk = burnt ? 0.2 : 1;
      const pushBox = (inst, x, y, z, sx, sy, sz, r, g, b, e, rx = 0) => { M4.compose(tmp, x, y, z, rx, 0, 0, sx, sy, sz); inst.pushMul(M, tmp, r, g, b, e); };
      const Lm = this.inst.cLamp, Sh = CAR_SHAPES[c.type];
      G.paint.push(M, cr, cg, cb, 0); if (near || G.cart) G.trim.push(M, tk, tk, tk, 0);
      if (!burnt) G.cart ? G.glass.push(M, 0.25, 0.2, 0.12, 0.6) : G.glass.push(M, 0.05, 0.06, 0.075, 0);
      G.head.push(M, tk, tk, tk, c.dead ? 0 : G.cart ? 2.2 : 1.6); G.tail.push(M, tk, tk, tk, c.dead || G.cart ? 0 : 0.8 + c.brakeK * 2.4);
      if (T.taxi && !G.cart) pushBox(Lm, 0, Sh.roof + 0.12, -0.15, 0.55, 0.17, 0.24, 1, 0.85, 0.3, c.dead ? 0 : 1.8);
      if ((c.police || c.siren) && !G.cart) {
        const sk = sirenK(); const on = c.siren && !c.dead;
        const ry = Sh.roof + 0.135, rz = (Sh.cab[1] + Sh.cab[2]) / 2 * L / 2 - 0.05;
        pushBox(Lm, 0.27, ry, rz, 0.48, 0.07, 0.22, 1, 0.1, 0.12, on ? 0.35 + 2.6 * sk : 0.2);
        pushBox(Lm, -0.27, ry, rz, 0.48, 0.07, 0.22, 0.15, 0.35, 1, on ? 0.35 + 2.6 * (1 - sk) : 0.2);
      }
      // wheels: detailed near the camera, plain far away
      const wx = W / 2 - 0.1, wz = G.wz, WI = !near ? this.inst.cWheelLo : T.police ? this.inst.cWheelS : this.inst.cWheel, wk = burnt ? 0.15 : 1;
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const steer = sz > 0 ? -c.steerA : 0;
        M4.compose(tmp, sx * wx, G.wy, sz * wz + G.wzo, (sx > 0 ? c.wheelRot : -c.wheelRot) * 0.34 / G.wy, steer + (sx > 0 ? 0 : Math.PI), 0); // turned around, not mirrored (keeps the faces outward)
        WI.pushMul(M, tmp, wk, wk, wk, 0);
      }
      const hy = G.lampF[1], ty = G.lampR[1], hx = G.lampF[0], tx = G.lampR[0];
      // headlight beams + ground pools
      if (G.cart) { if (!c.dead && d < 120) for (const s of [-1, 1]) { // the lanterns by the bench: a warm halo, a little light on the ground
          const lx = G.lampF[0] * s, lz = G.lampF[2], px = c.pos.x + c.fx * lz + c.fz * lx, pz = c.pos.z + c.fz * lz - c.fx * lx;
          Glare.corona(px, c.pos.y + G.lampF[1], pz, 0.5, 1, 0.66, 0.3, 0.55, 2); if (d < 70) Render.addParticles.push(px, c.pos.y + 0.05, pz, 2.4, 0.5, 0.32, 0.12, 0.3, 0, 1, 0, true);
          if (c.siren) Glare.corona(c.pos.x, c.pos.y + 2.25, c.pos.z, 1.6, 1, 0.6, 0.2, 0.3 + 0.4 * sirenK(), 2);
        } }
      else if (!c.dead && d < 90) {
        for (const s of [-1, 1]) {
          const bx = c.pos.x + c.fx * (L / 2 + 0.1) - c.fz * s * hx, bz = c.pos.z + c.fz * (L / 2 + 0.1) + c.fx * s * hx;
          Render.beams.push(bx, c.pos.y + hy, bz, bx + c.fx * 11, c.pos.y + 0.2, bz + c.fz * 11, 0.9, 0.5, 0.46, 0.38, 0.18, Cam.pos);
        }
        Render.addParticles.push(c.pos.x + c.fx * (L / 2 + 5.5), c.pos.y + 0.05, c.pos.z + c.fz * (L / 2 + 5.5), 5.5, 0.5, 0.46, 0.36, 0.32, -c.yaw, 1.8, 0, true);
        Render.addParticles.push(c.pos.x - c.fx * (L / 2 + 1), c.pos.y + 0.05, c.pos.z - c.fz * (L / 2 + 1), 2.2, 0.6, 0.05, 0.05, 0.3 + c.brakeK * 0.5, -c.yaw, 0.6, 0, true);
      }
      // coronas on the lamps, and their long reflections on the wet road
      if (!c.dead && d < 140 && !G.cart) {
        const tcx = Cam.pos.x - c.pos.x, tcz = Cam.pos.z - c.pos.z, tl = Math.hypot(tcx, tcz) || 1;
        const facing = (c.fx * tcx + c.fz * tcz) / tl; // 1 = seen from the front
        const fh = Math.pow(clamp((facing + 0.2) / 1.2, 0, 1), 1.6), ft = Math.pow(clamp((0.2 - facing) / 1.2, 0, 1), 1.6);
        const br = 0.55 + c.brakeK * 1.3, y = c.pos.y + hy, y2 = c.pos.y + ty;
        for (const s of [-1, 1]) {
          const lx = -c.fz * s, lz = c.fx * s;
          const px = c.pos.x + c.fx * (L / 2 + 0.03) + lx * hx, pz = c.pos.z + c.fz * (L / 2 + 0.03) + lz * hx;
          Glare.corona(px, y, pz, 0.5, 1, 0.92, 0.78, 0.12 + fh * 1.15, 2);
          if (fh > 0.35) Glare.corona(px, y, pz, 0.8, 1, 0.9, 0.78, (fh - 0.35) * 0.3, 0, 1, 7);
          if (d < 90) Glare.streak(px, y, pz, 1, 0.9, 0.74, 0.08 + fh * 0.55);
          const qx = c.pos.x - c.fx * (L / 2 + 0.03) + lx * tx, qz = c.pos.z - c.fz * (L / 2 + 0.03) + lz * tx;
          Glare.corona(qx, y2, qz, 0.42, 1, 0.1, 0.07, (0.1 + ft) * br, 2);
          if (d < 90) Glare.streak(qx, y2, qz, 1, 0.1, 0.07, (0.04 + ft * 0.45) * br);
        }
        if (c.siren) {
          const Sh2 = CAR_SHAPES[c.type], sk = sirenK(), ry = c.pos.y + Sh2.roof + 0.14, bz = (Sh2.cab[1] + Sh2.cab[2]) / 2 * L / 2 - 0.05;
          const px = c.pos.x + c.fx * bz, pz = c.pos.z + c.fz * bz, ox = -c.fz * 0.3, oz = c.fx * 0.3;
          Glare.corona(px + ox, ry, pz + oz, 0.8, 1, 0.12, 0.14, 0.95 * sk, 3); Glare.corona(px - ox, ry, pz - oz, 0.8, 0.2, 0.4, 1, 0.95 * (1 - sk), 3);
          Glare.corona(px, ry, pz, 3.2, 0.6 + 0.4 * sk, 0.26, 1 - 0.8 * sk, 0.16, 0, 2);
          if (d < 90) Glare.streak(px, ry, pz, 0.2 + 0.8 * sk, 0.2, 1 - 0.8 * sk, 0.35);
        }
        if (T.taxi) Glare.corona(c.pos.x - c.fx * 0.15, c.pos.y + CAR_SHAPES.taxi.roof + 0.12, c.pos.z - c.fz * 0.15, 0.45, 1, 0.82, 0.35, 0.35, 1);
      }
      Render.shadows.push(c.pos.x, c.pos.y + 0.03, c.pos.z, W * 1.35, 0, 0, 0, 0.6, -c.yaw, L / W, 0, true);
    }
  }
};

/* ---------------- traffic lights: shared cycle per crossing, lit lenses drawn each frame ---------------- */
const Signals = {
  lens: null,
  init() { this.lens = new Instanced(boxGeo(1, 1, 1), 800); Render.glowInst.push(this.lens); },
  // 24 s cycle: the x axis has green first, then the z axis, with a short all-red between them
  state(key, ax) {
    const n = World.signalNodes && World.signalNodes[key]; if (!n) return 'G';
    const t = (Env.time + n.off) % 24;
    if (ax === 'x') return t < 9 ? 'G' : t < 11.5 ? 'A' : 'R';
    return t >= 12 && t < 21 ? 'G' : t >= 21 && t < 23.5 ? 'A' : 'R';
  },
  render() {
    const L = World.signals; if (!L || !this.lens) return; this.lens.reset();
    const C = Cam.pos, T = this.tmp || (this.tmp = M4.create()), md = ((Game.q && Game.q.detail) || 130) + 10;
    const cols = { R: [1, 0.1, 0.06], A: [1, 0.55, 0.08], G: [0.15, 1, 0.45] }, idx = { R: 0, A: 1, G: 2 };
    for (const s of L) {
      const dx = s.x - C.x, dz = s.z - C.z, d2 = dx * dx + dz * dz; if (d2 > md * md) continue;
      if (!Cam.sphereVisible(s.x, s.y, s.z, 1.2)) continue;
      const st = this.state(s.key, s.ax), c = cols[st], p = s.lens[idx[st]], d = Math.sqrt(d2);
      M4.compose(T, p[0], p[1], p[2], 0, s.fx ? Math.PI / 2 : 0, 0, 0.23, 0.23, 0.03); this.lens.push(T, c[0], c[1], c[2], 2.5);
      // how much of the lens faces us
      const f = clamp(((C.x - p[0]) * s.fx + (C.z - p[2]) * s.fz) / (d || 1) * 1.4, 0, 1);
      Glare.corona(p[0], p[1], p[2], 0.55, c[0], c[1], c[2], 0.25 + f * 0.9, 2);
      if (f > 0.2 && d < 80) Glare.streak(p[0], p[1], p[2], c[0], c[1], c[2], 0.3 * f);
    }
  }
};

