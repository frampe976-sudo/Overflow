/* =====================================================================
   CARTS — the cars of the city become horse-drawn vehicles (same physics,
   same types): a farm cart (sedan), a donkey cart (compact), a carriage
   (taxi), the watch's prison wagon (police) and a covered wagon (van).
   Frame as for the cars: +z forward, +y up, x across. The bed sits at the
   back, the animal in front; the wheels are big wooden wheels.
   paint = planks tinted by the instance colour, trim = animal, harness,
   ironwork and canvas (own colours), head = the two lanterns by the bench.
   ===================================================================== */
CarModels.WHEEL_R = 0.5;
CarModels.build = (function () {
  const T4 = (x, y, z, rx = 0, ry = 0, rz = 0) => M4.compose(M4.create(), x, y, z, rx, ry, rz);
  const PAINT = [1, 1, 1, 0], WOOD = [0.36, 0.25, 0.16, 0], DARKW = [0.2, 0.14, 0.09, 0], IRON = [0.12, 0.12, 0.13, 0], LEATHER = [0.17, 0.1, 0.06, 0],
    CANVAS = [0.78, 0.72, 0.6, 0], FLAME = [1, 0.66, 0.3, 0];
  const COATS = { sedan: [0.36, 0.2, 0.1], taxi: [0.07, 0.06, 0.06], police: [0.62, 0.6, 0.58], van: [0.5, 0.27, 0.12], compact: [0.42, 0.4, 0.38] };
  function horse(m, zh, coat, small) {
    const s = small ? 0.78 : 1, C = [coat[0], coat[1], coat[2], 0], D = [coat[0] * 0.45, coat[1] * 0.45, coat[2] * 0.45, 0], H = [0.05, 0.045, 0.04, 0];
    m.push(T4(0, 0, zh, 0, 0, 0));
    m.push(M4.compose(M4.create(), 0, 0, 0, 0, 0, 0, s, s, s));
    m.rbox([0, 1.38, 0], [0.25, 0.3, 0.72], 0.18, C);                                   // barrel
    m.rbox([0, 1.45, -0.62], [0.24, 0.26, 0.2], 0.16, C);                               // croup
    m.push(T4(0, 1.62, 0.62, -0.75, 0, 0)).rbox([0, 0.28, 0], [0.13, 0.36, 0.16], 0.1, C).rbox([0, 0.3, -0.13], [0.04, 0.34, 0.05], 0.03, D).pop(); // neck + mane
    m.push(T4(0, 2.05, 0.98, 0.55, 0, 0)).rbox([0, 0, 0.12], [0.1, 0.12, 0.27], 0.07, C).rbox([0, 0.01, 0.33], [0.085, 0.09, 0.08], 0.05, D).pop(); // head, muzzle
    for (const sx of [1, -1]) m.rbox([sx * 0.06, 2.24, 0.85], [0.025, 0.07, 0.025], 0.02, C);   // ears
    for (const [lx, lz] of [[0.14, 0.5], [-0.14, 0.5], [0.14, -0.55], [-0.14, -0.55]]) {
      m.rbox([lx, 0.82, lz], [0.07, 0.3, 0.08], 0.05, C).rbox([lx, 0.32, lz], [0.05, 0.24, 0.055], 0.04, C).rbox([lx, 0.06, lz + 0.02], [0.065, 0.06, 0.08], 0.03, H); // leg, cannon, hoof
    }
    m.push(T4(0, 1.5, -0.86, 0.5, 0, 0)).rbox([0, -0.3, 0], [0.06, 0.34, 0.06], 0.05, D).pop(); // tail
    m.push(T4(0, 1.7, 0.5, -0.6, 0, 0)).rbox([0, 0, 0], [0.2, 0.06, 0.14], 0.05, LEATHER).pop(); // collar
    m.rbox([0, 1.68, 0.05], [0.26, 0.03, 0.08], 0.02, LEATHER);                         // saddle pad of the harness
    m.pop(); m.pop();
  }
  function wheelPos(T) { const hl = T.len / 2, bed1 = hl - (T.van ? 2.0 : 2.05), bed0 = -hl; return { hl, bed0, bed1, wzo: (bed0 + bed1) / 2 }; }
  return function build(type, far) {
    const T = CTYPES[type], hw = T.wid / 2, P = wheelPos(T), small = type === 'compact';
    const paint = new Arms.Mech(), trim = new Arms.Mech(), head = new Arms.Mech(), glass = new Arms.Mech(), tail = new Arms.Mech();
    if (far) { paint.seg = 1; trim.seg = 1; }
    const bw = hw * 0.8, y0 = 0.78, bz0 = P.bed0, bz1 = P.bed1, bl = (bz1 - bz0) / 2, bc = (bz0 + bz1) / 2;
    // bed: floor, sides of planks (painted), corner posts and an iron band
    paint.rbox([0, y0, bc], [bw, 0.06, bl], 0.02, PAINT);
    const sideH = type === 'police' ? 0.62 : type === 'taxi' ? 0.55 : 0.32;
    for (const sx of [1, -1]) paint.rbox([sx * (bw - 0.03), y0 + sideH, bc], [0.035, sideH, bl], 0.015, PAINT);
    paint.rbox([0, y0 + sideH, bz0 + 0.03], [bw, sideH, 0.035], 0.015, PAINT);
    paint.rbox([0, y0 + sideH * 0.8, bz1 - 0.03], [bw, sideH * 0.8, 0.035], 0.015, PAINT);
    if (!far) for (const sx of [1, -1]) for (const z of [bz0 + 0.05, bc, bz1 - 0.05]) trim.rbox([sx * (bw + 0.01), y0 + sideH, z], [0.03, sideH + 0.02, 0.035], 0.01, DARKW);
    trim.rbox([0, y0 - 0.12, bc], [bw * 0.3, 0.05, bl * 0.95], 0.02, DARKW);                // chassis beam
    for (const z of [bc + 0.7, bc - 0.7]) trim.cyl(-hw + 0.05, hw - 0.05, 0.5, z, 0.045, 0.045, IRON, { segs: 6 }); // axles
    // the bench at the front and the footboard
    trim.rbox([0, 1.3, bz1 - 0.28], [bw * 0.85, 0.05, 0.16], 0.02, WOOD); trim.rbox([0, 1.05, bz1 - 0.18], [bw * 0.85, 0.22, 0.03], 0.01, WOOD);
    trim.rbox([0, 0.98, bz1 + 0.15], [bw * 0.7, 0.03, 0.16], 0.01, WOOD);
    // shafts to the animal
    for (const sx of [1, -1]) { trim.push(T4(sx * 0.36, 1.05, bz1 + 0.75, -0.08, 0, 0)).rbox([0, 0, 0], [0.03, 0.03, 0.85], 0.02, WOOD).pop(); }
    if (type === 'van') { // covered wagon: canvas hood on hoops
      const R = bw + 0.05, zA = bz0 + 0.05, zB = bz1 - 0.45, segs = 8;
      for (let k = 0; k < segs; k++) {
        const a0 = k / segs * Math.PI, a1 = (k + 1) / segs * Math.PI, am = (a0 + a1) / 2, cx = Math.cos(am) * R, cy = y0 + 0.62 + Math.sin(am) * R * 1.05;
        trim.push(T4(cx, cy, (zA + zB) / 2, 0, 0, am - Math.PI / 2)).rbox([0, 0, 0], [0.025, R * Math.sin(Math.PI / segs / 2) * 1.12, (zB - zA) / 2], 0.01, CANVAS).pop();
      }
      for (const z of [zA, (zA + zB) / 2, zB]) trim.ring([0, y0 + 0.62, z], 2, R + 0.02, 0.025, WOOD, 0, Math.PI, 10, 5);
    } else if (type === 'police') { // the watch's prison wagon: a closed box with a barred window and a roof
      paint.rbox([0, y0 + 1.26, bc - 0.15], [bw + 0.02, 0.05, bl - 0.12], 0.02, PAINT);
      for (const sx of [1, -1]) for (let k = -2; k <= 2; k++) trim.rbox([sx * (bw + 0.04), y0 + 0.75, bc + k * 0.12], [0.015, 0.22, 0.015], 0.008, IRON);
      trim.rbox([0, y0 + 1.36, bc - 0.15], [0.16, 0.08, 0.16], 0.04, IRON);                // a bell on the roof
    } else if (type === 'taxi') { // carriage: a cab with a curved roof and windows
      paint.rbox([0, y0 + 1.15, bc - 0.1], [bw + 0.04, 0.1, bl - 0.08], 0.08, PAINT);
      for (const sx of [1, -1]) glass.rbox([sx * (bw + 0.0), y0 + 0.8, bc - 0.1], [0.04, 0.18, 0.3], 0.02, [1, 1, 1, 0]);
      for (const sx of [1, -1]) trim.rbox([sx * (bw + 0.03), y0 + 0.35, bc - 0.1], [0.02, 0.24, 0.32], 0.01, [0.75, 0.6, 0.25, 0]); // gilded door panels
    } else if (!far) { // open carts carry something: barrels, sacks or hay
      if (type === 'sedan') for (const z of [bc - bl * 0.5, bc + bl * 0.1]) trim.cyl(-bw * 0.7, bw * 0.7, y0 + 0.36, z, 0.28, 0.28, [0.42, 0.3, 0.18, 0], { segs: 10 });
      else trim.rbox([0, y0 + 0.3, bc], [bw * 0.7, 0.24, bl * 0.7], 0.18, [0.66, 0.56, 0.3, 0]);
    }
    glass.rbox([0, 0.9, bc], [0.01, 0.01, 0.01], 0, [1, 1, 1, 0]); // keeps the glass set non-empty
    // lanterns on poles by the bench (lit in the head set)
    const lz = bz1 - 0.1, lx = bw + 0.04, ly = 1.75;
    for (const sx of [1, -1]) { trim.rbox([sx * lx, ly - 0.42, lz], [0.016, 0.34, 0.016], 0.006, IRON);
      trim.rbox([sx * lx, ly + 0.11, lz], [0.07, 0.025, 0.07], 0.02, IRON); head.rbox([sx * lx, ly, lz], [0.055, 0.08, 0.055], 0.02, FLAME); }
    tail.rbox([0, y0, bz0], [0.01, 0.01, 0.01], 0, [0.05, 0.05, 0.05, 0]);
    horse(trim, P.hl - 0.95, COATS[type] || COATS.sedan, small);
    const pb = paint.build(), tb = trim.build();
    return { paint: pb, glass: glass.build(), trim: tb, head: head.build(), tail: tail.build(), wz: 0.7, wzo: P.wzo, wy: CarModels.WHEEL_R, lampF: [lx, ly, lz], lampR: [0.3, y0, bz0], roof: y0 + 1.3, cart: true, tris: { paint: pb.idx ? pb.idx.length / 3 : 0, trim: 0 } };
  };
})();
// big wooden wheels: iron tyre, felloe, twelve spokes, a hub (outer face toward +x)
CarModels.wheel = function () {
  const m = new Arms.Mech(), R = CarModels.WHEEL_R, W = [0.4, 0.28, 0.17, 0], I = [0.13, 0.13, 0.14, 0];
  m.ring([0, 0, 0], 0, R - 0.015, 0.03, I, 0, TAU, 24, 6);
  m.ring([0, 0, 0], 0, R - 0.06, 0.045, W, 0, TAU, 24, 6);
  for (let k = 0; k < 12; k++) m.push(T4c(0, 0, 0, k / 12 * TAU)).rbox([0, (R - 0.06) / 2, 0], [0.018, (R - 0.08) / 2, 0.022], 0.008, W, { seg: 1 }).pop();
  m.cyl(-0.1, 0.1, 0, 0, 0.08, 0.07, W, { segs: 10 }); m.cyl(0.1, 0.13, 0, 0, 0.05, 0.04, I, { segs: 8 });
  return m.build();
};
CarModels.wheelLow = function () { const m = new Arms.Mech(), R = CarModels.WHEEL_R; m.ring([0, 0, 0], 0, R - 0.04, 0.05, [0.32, 0.22, 0.14, 0], 0, TAU, 14, 4); for (let k = 0; k < 4; k++) m.push(T4c(0, 0, 0, k / 4 * Math.PI)).rbox([0, 0, 0], [0.02, R - 0.06, 0.02], 0.005, [0.38, 0.27, 0.17, 0], { seg: 1 }).pop(); m.cyl(-0.08, 0.08, 0, 0, 0.07, 0.07, [0.3, 0.2, 0.12, 0], { segs: 6 }); return m.build(); };
function T4c(x, y, z, rx) { return M4.compose(M4.create(), x, y, z, rx, 0, 0); }
// paints and stains of the carts (the instance colour tints the planks)
CAR_COLS.splice(0, CAR_COLS.length, [0.62, 0.44, 0.28], [0.5, 0.34, 0.2], [0.42, 0.18, 0.12], [0.3, 0.36, 0.42], [0.36, 0.42, 0.26], [0.7, 0.58, 0.38], [0.55, 0.22, 0.16], [0.4, 0.3, 0.2], [0.26, 0.3, 0.22]);
// no traffic lights to draw (the crossings keep their turns)
Signals.render = function () { };
