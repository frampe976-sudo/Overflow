/* =====================================================================
   CHARACTERS — skeleton, instanced parts, procedural animation
   ===================================================================== */
const BONES = [
  ['root', -1, 0, 0, 0], ['hips', 0, 0, 0.98, 0], ['spine', 1, 0, 0.08, 0], ['chest', 2, 0, 0.22, 0], ['neck', 3, 0, 0.24, 0], ['head', 4, 0, 0.07, 0],
  ['shL', 3, 0.19, 0.2, 0], ['elL', 6, 0, -0.28, 0], ['haL', 7, 0, -0.25, 0],
  ['shR', 3, -0.19, 0.2, 0], ['elR', 9, 0, -0.28, 0], ['haR', 10, 0, -0.25, 0],
  ['hipL', 1, 0.1, -0.03, 0], ['knL', 12, 0, -0.43, 0], ['anL', 13, 0, -0.43, 0],
  ['hipR', 1, -0.1, -0.03, 0], ['knR', 15, 0, -0.43, 0], ['anR', 16, 0, -0.43, 0],
  ['tail', 5, 0, 0.13, -0.09]
];
const BI = {}; BONES.forEach((b, i) => BI[b[0]] = i);
const NB = BONES.length, PSZ = NB * 3 + 3, HY = NB * 3, HZ = NB * 3 + 1;
const J = (name, axis) => BI[name] * 3 + axis;
// joints whose euler order is X*Z*Y (flexion first) instead of Y*X*Z: hips and shoulders flex through 90 deg all the time
const XZY = new Uint8Array(BONES.length); for (const n of ['hipL', 'hipR', 'shL', 'shR']) XZY[BI[n]] = 1;

/* ---------- part geometries ---------- */
const PartGeo = {};
function buildPartGeos() {
  const m = (px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M4.compose(M4.create(), px, py, pz, rx, ry, rz, sx, sy, sz);
  PartGeo.pelvis = boxGeo(0.3, 0.17, 0.2, 0, -0.03, 0);
  PartGeo.abdomen = boxGeo(0.27, 0.26, 0.17, 0, 0.1, 0.005);
  PartGeo.chest = transformGeo(prismGeo(0.29, 0.18, 0.38, 0.21, 0.3, 0.0), m(0, -0.04, 0));
  PartGeo.neck = cylGeo(0.05, 0.048, 0.13, 8, false);
  PartGeo.head = transformGeo(sphereGeo(0.112, 12, 9, 1.12), m(0, 0.1, 0.012));
  PartGeo.nose = boxGeo(0.03, 0.04, 0.03, 0, 0.09, 0.115);
  PartGeo.uarm = capsuleGeo(0.056, 0.25, 8, 3);
  PartGeo.farm = capsuleGeo(0.047, 0.22, 8, 3);
  PartGeo.hand = boxGeo(0.068, 0.09, 0.05, 0, -0.05, 0);
  PartGeo.thigh = capsuleGeo(0.078, 0.4, 8, 3);
  PartGeo.shin = capsuleGeo(0.062, 0.4, 8, 3);
  PartGeo.foot = boxGeo(0.1, 0.075, 0.26, 0, -0.05, 0.05);
  PartGeo.hairCap = transformGeo(sphereGeo(0.12, 12, 8), m(0, 0.14, -0.034, -0.25, 0, 0, 1.04, 0.95, 1.02));
  PartGeo.hairShort = transformGeo(sphereGeo(0.118, 10, 7), m(0, 0.15, -0.03, -0.2, 0, 0, 1.03, 0.78, 1.0));
  PartGeo.eye = boxGeo(0.028, 0.018, 0.012, 0, 0.115, 0.118);
  PartGeo.shoulder = transformGeo(sphereGeo(0.075, 8, 6), m(0, -0.02, 0));
  PartGeo.hem = cylGeo(0.205, 0.19, 0.2, 10, false);
  PartGeo.boot = boxGeo(0.11, 0.15, 0.25, 0, -0.03, 0.04);
  PartGeo.ponytail = transformGeo(capsuleGeo(0.045, 0.2, 6, 3), m(0, 0, 0));
  PartGeo.beanie = transformGeo(sphereGeo(0.125, 10, 6), m(0, 0.155, -0.02, -0.15, 0, 0, 1.03, 0.85, 1.03));
  PartGeo.hood = transformGeo(cylGeo(0.165, 0.06, 0.34, 10, true), m(0, 0.0, -0.02));
  PartGeo.robe = cylGeo(0.38, 0.19, 0.92, 12, true);
  PartGeo.vest = transformGeo(prismGeo(0.33, 0.23, 0.41, 0.25, 0.32, 0), m(0, -0.05, 0));
  PartGeo.stripe = boxGeo(0.42, 0.035, 0.26, 0, 0, 0);
  PartGeo.band = cylGeo(0.062, 0.062, 0.045, 8, false);
  PartGeo.mask = boxGeo(0.17, 0.19, 0.03, 0, 0.1, 0.108);
  PartGeo.eyes = boxGeo(0.12, 0.025, 0.02, 0, 0.12, 0.118);
  PartGeo.badge = boxGeo(0.05, 0.06, 0.012, 0, 0, 0);
  PartGeo.belt = boxGeo(0.31, 0.05, 0.215, 0, 0.02, 0);
  PartGeo.radio = boxGeo(0.05, 0.08, 0.04, 0, 0, 0);
  PartGeo.umbStick = cylGeo(0.012, 0.012, 0.95, 5, false);
  PartGeo.umbTop = transformGeo(cylGeo(0.62, 0.03, 0.26, 12, true), m(0, 0, 0));
  PartGeo.cuffs = boxGeo(0.1, 0.03, 0.07, 0, -0.03, 0);
  PartGeo.halo = cylGeo(0.3, 0.3, 0.035, 16, false);
  PartGeo.pad = transformGeo(sphereGeo(0.12, 8, 6), m(0, 0, 0, 0, 0, 0, 1.2, 0.8, 1.2));
  PartGeo.bag = boxGeo(0.24, 0.18, 0.08, 0, -0.1, 0);
  PartGeo.coat = transformGeo(cylGeo(0.26, 0.2, 0.55, 10, true), m(0, -0.62, 0));
  // weapons: detailed models built by Arms (10e_arms.js); the glowing tip of the herald's staff
  PartGeo.staffTip = sphereGeo(0.07, 8, 6);
  PartGeo.crate = boxGeo(0.9, 0.55, 0.6, 0, 0.275, 0);
  PartGeo.intel = boxGeo(0.3, 0.04, 0.22, 0, 0.02, 0);
  PartGeo.medkit = mergeGeos([[boxGeo(0.4, 0.26, 0.26, 0, 0.13, 0)]]);
  PartGeo.ammo = mergeGeos([[boxGeo(0.32, 0.2, 0.2, 0, 0.1, 0)]]);
  PartGeo.badgeItem = transformGeo(cylGeo(0.22, 0.22, 0.05, 5, true), m(0, 0, 0, Math.PI / 2));
  PartGeo.lamp = sphereGeo(0.09, 10, 6);
  // mission props: a cat (Monsieur Brioche), a black box, a phone, a hard drive
  PartGeo.cat = mergeGeos([[boxGeo(0.16, 0.15, 0.36, 0, 0.16, 0)], [boxGeo(0.13, 0.12, 0.12, 0, 0.27, 0.2)], [boxGeo(0.035, 0.05, 0.03, 0.04, 0.35, 0.21)], [boxGeo(0.035, 0.05, 0.03, -0.04, 0.35, 0.21)],
    [boxGeo(0.04, 0.24, 0.04, 0, 0.3, -0.19)], [boxGeo(0.04, 0.09, 0.04, 0.05, 0.045, 0.12)], [boxGeo(0.04, 0.09, 0.04, -0.05, 0.045, 0.12)], [boxGeo(0.04, 0.09, 0.04, 0.05, 0.045, -0.12)], [boxGeo(0.04, 0.09, 0.04, -0.05, 0.045, -0.12)]]);
  PartGeo.blackbox = mergeGeos([[boxGeo(0.34, 0.24, 0.26, 0, 0.12, 0)], [boxGeo(0.36, 0.03, 0.28, 0, 0.21, 0)], [boxGeo(0.08, 0.05, 0.02, 0, 0.14, 0.135)]]);
  PartGeo.phone = boxGeo(0.09, 0.015, 0.17, 0, 0.01, 0);
  PartGeo.drive = mergeGeos([[boxGeo(0.14, 0.03, 0.2, 0, 0.015, 0)], [boxGeo(0.05, 0.012, 0.03, 0, 0.034, 0.07)]]);
  // ---- police robot (player unit SOLIS / SALINE-17) — limbs hang along -Y from their joint
  const limb = (rTop, rBot, len, segs = 12) => transformGeo(cylGeo(rBot, rTop, len, segs, true), m(0, -len, 0));
  PartGeo.rHead = transformGeo(sphereGeo(0.118, 18, 12), m(0, 0.1, -0.008, 0, 0, 0, 0.97, 1.08, 1.04));
  PartGeo.rFace = transformGeo(sphereGeo(0.1, 16, 10), m(0, 0.088, 0.07, 0, 0, 0, 0.9, 0.66, 0.6));
  // helmet: an open dome a few mm outside the head shell, tilted back so its rim runs brow -> ears -> nape
  const dome = [], rimA = -0.05;
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 - (Math.PI / 2 - rimA) * i / 10; dome.push([Math.cos(a), Math.sin(a), Math.cos(a), Math.sin(a)]); }
  dome.push([Math.cos(rimA), Math.sin(rimA), 0, -1], [0.86 * Math.cos(rimA), Math.sin(rimA), 0, -1]);
  PartGeo.rCap = transformGeo(latheGeo(dome, 22), m(0, 0.1, -0.008, -0.5, 0, 0, 0.122, 0.134, 0.13));
  // hexagonal eye lenses, centred on their own origin so a blink can squash them in place
  PartGeo.rEye = transformGeo(transformGeo(cylGeo(0.021, 0.021, 0.02, 6, true), m(0, -0.01, 0, 0, Math.PI / 6, 0)), m(0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 0.85));
  PartGeo.rChin = boxGeo(0.1, 0.035, 0.07, 0, 0.022, 0.07);
  PartGeo.rEar = transformGeo(cylGeo(0.045, 0.04, 0.035, 14, true), m(0, 0.098, 0, 0, 0, -Math.PI / 2));
  PartGeo.rEarRing = transformGeo(cylGeo(0.028, 0.028, 0.012, 14, true), m(0, 0.098, 0, 0, 0, -Math.PI / 2));
  PartGeo.rLightBase = boxGeo(0.14, 0.032, 0.066, 0, 0.238, -0.014);
  PartGeo.rLight = boxGeo(0.058, 0.024, 0.052, 0, 0.262, -0.014);
  PartGeo.rAntenna = cylGeo(0.006, 0.004, 0.2, 6, true);
  PartGeo.rTip = transformGeo(sphereGeo(0.014, 8, 5), m(0, 0.205, 0));
  PartGeo.rNeck = cylGeo(0.043, 0.04, 0.13, 12, true);
  PartGeo.rNeckRing = transformGeo(cylGeo(0.05, 0.05, 0.02, 14, true), m(0, 0.035, 0));
  PartGeo.rChest = transformGeo(prismGeo(0.32, 0.2, 0.41, 0.23, 0.3, 0.0), m(0, -0.04, 0));
  PartGeo.rPlate = boxGeo(0.22, 0.13, 0.035, 0, 0.1, 0.108);
  PartGeo.rCore = transformGeo(cylGeo(0.036, 0.036, 0.022, 6, true), m(0, 0.1, 0.118, Math.PI / 2));
  PartGeo.rPack = boxGeo(0.22, 0.24, 0.09, 0, 0.08, -0.145);
  PartGeo.rVent = boxGeo(0.15, 0.018, 0.012, 0, 0, 0);
  PartGeo.rAbdo = cylGeo(0.105, 0.11, 0.24, 14, true);
  PartGeo.rAbdoRing = transformGeo(cylGeo(0.128, 0.128, 0.034, 16, true), m(0, -0.017, 0));
  PartGeo.rPelvis = mergeGeos([[boxGeo(0.29, 0.15, 0.2, 0, -0.035, 0)], [boxGeo(0.15, 0.13, 0.03, 0, -0.07, 0.1)], [boxGeo(0.2, 0.1, 0.03, 0, -0.05, -0.1)]]);
  PartGeo.rJointL = sphereGeo(0.074, 12, 8);
  PartGeo.rJointM = sphereGeo(0.056, 12, 8);
  PartGeo.rJointS = sphereGeo(0.04, 10, 6);
  PartGeo.rRing = transformGeo(cylGeo(0.061, 0.061, 0.018, 16, true), m(0, 0, 0, 0, 0, -Math.PI / 2));
  PartGeo.rRingS = transformGeo(cylGeo(0.046, 0.046, 0.014, 14, true), m(0, 0, 0, 0, 0, -Math.PI / 2));
  PartGeo.rPad = transformGeo(sphereGeo(0.096, 14, 8), m(0, 0.012, 0, 0, 0, 0, 1.2, 0.62, 1.1));
  PartGeo.rUArm = limb(0.05, 0.043, 0.24);
  PartGeo.rUArmPlate = boxGeo(0.028, 0.16, 0.07, 0, -0.13, 0);
  PartGeo.rFArm = limb(0.058, 0.046, 0.225);
  PartGeo.rHand = mergeGeos([[boxGeo(0.072, 0.07, 0.046, 0, -0.045, 0)], [boxGeo(0.068, 0.05, 0.04, 0, -0.098, 0.006)]]);
  PartGeo.rThigh = limb(0.08, 0.064, 0.4);
  PartGeo.rThighPlate = boxGeo(0.03, 0.26, 0.1, 0, -0.18, 0);
  PartGeo.rKneeCap = boxGeo(0.09, 0.11, 0.05, 0, -0.03, 0.052);
  PartGeo.rShin = limb(0.068, 0.05, 0.4);
  // same footprint as the boots the foot IK is tuned for: sole at -0.104, heel -0.085, toe +0.165
  PartGeo.rFoot = mergeGeos([[boxGeo(0.112, 0.06, 0.25, 0, -0.074, 0.04)], [boxGeo(0.1, 0.06, 0.15, 0, -0.03, 0.0)], [boxGeo(0.106, 0.04, 0.06, 0, -0.05, 0.13)]]);
}

/* ---------- appearance presets ---------- */
const SKIN = [[0.93, 0.76, 0.64], [0.8, 0.6, 0.47], [0.65, 0.46, 0.33], [0.47, 0.32, 0.23], [0.33, 0.22, 0.16]];
const CLOTH = [[0.2, 0.22, 0.26], [0.35, 0.18, 0.15], [0.16, 0.24, 0.2], [0.42, 0.36, 0.28], [0.12, 0.13, 0.18], [0.45, 0.42, 0.4], [0.3, 0.15, 0.3], [0.5, 0.3, 0.12], [0.15, 0.3, 0.42]];
const UMB = [[0.8, 0.12, 0.2], [0.1, 0.35, 0.7], [0.95, 0.75, 0.1], [0.1, 0.1, 0.12], [0.2, 0.6, 0.35], [0.85, 0.4, 0.7]];
function P(type, bone, col, e = 0, om = null) { return { type, bone: BI[bone], col, e, m: om || M4.create(), dyn: null }; }
const pm = (px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M4.compose(M4.create(), px, py, pz, rx, ry, rz, sx, sy, sz);
function bodyParts(skin, top, bottom, shoes, o = {}) {
  const L = [];
  L.push(P('pelvis', 'hips', bottom), P('abdomen', 'spine', top), P('chest', 'chest', top), P('neck', 'neck', skin), P('head', 'head', skin), P('nose', 'head', skin));
  L.push(P('eye', 'head', [0.03, 0.03, 0.035], 0, pm(0.042, 0, 0)), P('eye', 'head', [0.03, 0.03, 0.035], 0, pm(-0.042, 0, 0)));
  L.push(P('shoulder', 'shL', o.sleeve || top), P('shoulder', 'shR', o.sleeve || top));
  if (o.hem) L.push(P('hem', 'hips', o.hem, 0, pm(0, -0.06, 0)));
  L.push(P('uarm', 'shL', o.sleeve || top), P('farm', 'elL', o.forearm || top), P('hand', 'haL', o.gloves || skin), P('uarm', 'shR', o.sleeve || top), P('farm', 'elR', o.forearm || top), P('hand', 'haR', o.gloves || skin));
  L.push(P('thigh', 'hipL', bottom), P('shin', 'knL', bottom), P(o.boots ? 'boot' : 'foot', 'anL', shoes), P('thigh', 'hipR', bottom), P('shin', 'knR', bottom), P(o.boots ? 'boot' : 'foot', 'anR', shoes));
  return L;
}
// the recurring characters of the campaign
const NAMED_APPS = {
  nadia: { skin: SKIN[2], top: [0.52, 0.08, 0.1], bottom: [0.1, 0.11, 0.16], hair: 'hairCap', hairC: [0.06, 0.04, 0.03], tail: true, coat: [0.5, 0.08, 0.1], bag: [0.12, 0.12, 0.13], scale: 0.96 },
  fredo: { skin: SKIN[1], top: [0.55, 0.42, 0.12], bottom: [0.22, 0.22, 0.28], beanie: [0.62, 0.1, 0.08], scale: 0.92 },
  anselme: { skin: SKIN[0], top: [0.38, 0.31, 0.24], bottom: [0.24, 0.21, 0.19], hair: 'hairShort', hairC: [0.78, 0.78, 0.76], coat: [0.36, 0.3, 0.24], scale: 0.97 },
  delorme: { skin: SKIN[0], top: [0.12, 0.13, 0.17], bottom: [0.1, 0.11, 0.14], hair: 'hairShort', hairC: [0.35, 0.33, 0.32], coat: [0.14, 0.15, 0.2], stripe: [0.9, 0.75, 0.3], scale: 1.02 },
  vasseur: { skin: SKIN[1], top: [0.86, 0.85, 0.82], bottom: [0.84, 0.83, 0.8], hair: 'hairShort', hairC: [0.05, 0.05, 0.05], coat: [0.85, 0.84, 0.8], shoes: [0.2, 0.12, 0.08], scale: 1.03 },
  petronille: { skin: SKIN[0], top: [0.45, 0.18, 0.4], bottom: [0.3, 0.14, 0.28], hair: 'hairCap', hairC: [0.88, 0.88, 0.9], umb: [0.9, 0.45, 0.7], scale: 0.9 },
  tresorier: { skin: SKIN[3], top: [0.3, 0.33, 0.3], bottom: [0.18, 0.19, 0.18], hair: 'hairShort', hairC: [0.22, 0.16, 0.1], coat: [0.28, 0.31, 0.27], bag: [0.36, 0.22, 0.1], scale: 0.95 },
  okafor: { skin: SKIN[4], top: [0.1, 0.14, 0.27], bottom: [0.07, 0.08, 0.11], hair: 'hairShort', hairC: [0.55, 0.55, 0.55], stripe: [0.3, 0.72, 1.0], coat: [0.09, 0.11, 0.18], scale: 1.04 }
};
const PHONE_M = M4.compose(M4.create(), 0.024, -0.085, 0.004, Math.PI / 2, Math.PI / 2, 0, 0.8, 1, 0.85);
// parts still drawn next to a sculpted person (carried things)
const PROPS = { umbStick: 1, umbTop: 1, bag: 1, halo: 1 };
// the light strips of the robots of a brigade (multiplayer): the first is the original Solis, the others only
// change the colour of their strips, eyes and core, so each partner is told apart at a glance
const ROBOT_ACCENTS = [
  { n: 'Saline-17', css: '#4da3ff', light: [0.22, 0.3, 0.46] },
  { n: 'Saline-18', css: '#ffb23d', glow: [1.0, 0.58, 0.12], eye: [1.0, 0.74, 0.28], light: [0.46, 0.3, 0.12] },
  { n: 'Saline-19', css: '#47e08a', glow: [0.2, 1.0, 0.45], eye: [0.42, 1.0, 0.62], light: [0.14, 0.42, 0.22] },
  { n: 'Saline-20', css: '#ff5cc8', glow: [1.0, 0.26, 0.78], eye: [1.0, 0.5, 0.88], light: [0.44, 0.14, 0.36] },
  { n: 'Saline-21', css: '#ff6a4d', glow: [1.0, 0.32, 0.2], eye: [1.0, 0.55, 0.4], light: [0.46, 0.18, 0.12] },
  { n: 'Saline-22', css: '#b07cff', glow: [0.62, 0.4, 1.0], eye: [0.78, 0.62, 1.0], light: [0.3, 0.2, 0.46] }
];
function makeAppearance(kind, rnd = Math.random) {
  const A = makeParts(kind, rnd);
  // humans: a sculpted, skinned look (the part list stays as a fallback while the pieces are generated)
  const L = !A.robot && typeof Folk !== 'undefined' ? Folk.make(kind, rnd) : null;
  if (L) {
    A.look = L; A.scale = L.scale; A.shX = L.shX; A.gait = Folk.gait(L); A.props = A.parts.filter(p => PROPS[p.type]); if (L.glowCol) A.glowCol = L.glowCol;
    if (Folk.ready) { const P = Folk.resolve(L); Folk.now(P.body, 3); Folk.now(P.head, 3); Folk.request(P.body, 2, 500); Folk.request(P.head, 2, 501); for (const p of P.parts) { Folk.now(p, 3); Folk.request(p, 2, 502); } }
  }
  return A;
}
function makeParts(kind, rnd) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const A = { kind, scale: 1, parts: [], hasTail: false, glowCol: null };
  if (kind === 'hero') { robotParts(A); A.parts = CharRender.bake(A.parts, 'rb'); A.hasTail = true; A.robot = true; }
  else if (/^hero[1-5]$/.test(kind)) { const k = +kind[4], S = ROBOT_ACCENTS[k]; robotParts(A, { glow: S.glow, eye: S.eye }); A.parts = CharRender.bake(A.parts, 'rb' + k); A.hasTail = true; A.robot = true; A.slot = k; }
  else if (kind === 'drone') { // training robot (orange / graphite, no badge)
    robotParts(A, { body: [0.78, 0.4, 0.06], plate: [0.2, 0.21, 0.23], steel: [0.3, 0.31, 0.33], dark: [0.05, 0.05, 0.06], glow: [1.0, 0.52, 0.1], eye: [1.0, 0.68, 0.2], red: [1.0, 0.52, 0.1], noBadge: true });
    A.parts = CharRender.bake(A.parts, 'rd'); A.hasTail = true; A.robot = true; A.scale = 0.97;
  }
  else if (kind === 'cop') {
    const skin = pick(SKIN); A.parts = bodyParts(skin, [0.1, 0.14, 0.27], [0.07, 0.08, 0.11], [0.03, 0.03, 0.04]);
    A.parts.push(P('hairShort', 'head', [0.08, 0.06, 0.05]), P('stripe', 'chest', [0.3, 0.72, 1.0], 1.6, pm(0, 0.07, 0, 0, 0, 0, 0.92, 0.7, 0.9)));
  } else if (kind === 'civ') {
    const skin = pick(SKIN), top = pick(CLOTH), bottom = pick(CLOTH.slice(0, 5)), shoes = [0.06, 0.05, 0.05];
    const female = rnd() < 0.5;
    A.parts = bodyParts(skin, top, bottom, shoes);
    const hairC = pick([[0.05, 0.04, 0.03], [0.25, 0.15, 0.08], [0.55, 0.4, 0.2], [0.35, 0.33, 0.32]]);
    A.parts.push(P(female ? 'hairCap' : 'hairShort', 'head', hairC));
    if (female && rnd() < 0.5) { A.parts.push(P('ponytail', 'tail', hairC)); A.hasTail = true; }
    if (rnd() < 0.5) A.parts.push(P('coat', 'hips', top));
    if (rnd() < 0.55) { const c = pick(UMB); A.umbrella = true; A.parts.push(P('umbStick', 'haR', [0.1, 0.1, 0.1], 0, pm(0, -0.02, 0, 1.9)), P('umbTop', 'haR', c, 0.12, pm(0, -0.3, 0.85, 1.9))); }
    else if (rnd() < 0.3) { A.parts.push(P('bag', 'haL', pick(CLOTH))); A.bag = true; }
    A.scale = female ? 0.95 + rnd() * 0.05 : 1 + rnd() * 0.06;
  } else if (kind === 'thug' || kind === 'thugBoss') {
    const skin = pick(SKIN); const vest = [0.95, 0.42, 0.08];
    A.parts = bodyParts(skin, pick([[0.1, 0.1, 0.12], [0.2, 0.2, 0.22], [0.25, 0.18, 0.12]]), pick([[0.12, 0.14, 0.2], [0.18, 0.16, 0.14]]), [0.05, 0.05, 0.05]);
    A.parts.push(P('vest', 'chest', vest, 0.15));
    A.parts.push(P('stripe', 'chest', [1.0, 0.85, 0.35], 1.6, pm(0, 0.02, 0, 0, 0, 0, 1.0, 1, 0.98)), P('stripe', 'chest', [1.0, 0.85, 0.35], 1.6, pm(0, 0.16, 0, 0, 0, 0, 1.02, 1, 1.0)));
    A.parts.push(P(rnd() < 0.6 ? 'beanie' : 'hairShort', 'head', pick([[0.08, 0.08, 0.1], [0.5, 0.1, 0.08], [0.1, 0.25, 0.15]])));
    A.glowCol = [1, 0.54, 0.12];
    if (kind === 'thugBoss') { A.scale = 1.28; A.parts.push(P('pad', 'shL', [0.9, 0.4, 0.08], 0.2, pm(0.02, 0.02, 0)), P('pad', 'shR', [0.9, 0.4, 0.08], 0.2, pm(-0.02, 0.02, 0))); }
  } else if (kind === 'cultist' || kind === 'herald') {
    const skin = pick(SKIN); const robe = kind === 'herald' ? [0.03, 0.12, 0.12] : [0.05, 0.06, 0.07];
    A.parts = bodyParts(skin, robe, robe, [0.03, 0.03, 0.03], { gloves: [0.03, 0.03, 0.03] });
    A.parts.push(P('robe', 'hips', robe, 0, pm(0, -0.95, 0)), P('hood', 'head', robe), P('mask', 'head', [0.18, 0.95, 0.69], 2.4));
    A.glowCol = [0.18, 0.95, 0.69];
    if (kind === 'herald') {
      A.scale = 1.34; A.parts.push(P('halo', 'head', [0.18, 0.95, 0.69], 3, pm(0, 0.36, -0.05, 0.35)), P('pad', 'shL', [0.05, 0.3, 0.28], 0.3), P('pad', 'shR', [0.05, 0.3, 0.28], 0.3));
    }
  } else if (kind === 'merc' || kind === 'mercBoss' || kind === 'colosse' || kind === 'leviathan') {
    // Sentinelle: black tactical gear, a red visor, a red light strip on the vest
    const skin = pick(SKIN), dark = [0.055, 0.06, 0.07], gear = kind === 'leviathan' ? [0.75, 0.74, 0.7] : [0.13, 0.14, 0.15], glow = kind === 'leviathan' ? [0.2, 0.85, 1] : [1, 0.14, 0.1];
    A.parts = bodyParts(skin, dark, dark, [0.03, 0.03, 0.03], { boots: true, gloves: [0.03, 0.03, 0.035], sleeve: kind === 'merc' ? dark : gear });
    A.parts.push(P('vest', 'chest', gear, 0.05), P('stripe', 'chest', glow, 1.6, pm(0, 0.09, 0, 0, 0, 0, 1.01, 0.6, 1.0)));
    A.parts.push(P('beanie', 'head', [0.08, 0.085, 0.095]), P('mask', 'head', glow, 1.9));
    A.glowCol = glow;
    if (kind !== 'merc') {
      A.scale = kind === 'mercBoss' ? 1.14 : kind === 'colosse' ? 1.5 : 1.36;
      A.parts.push(P('pad', 'shL', gear, 0.1, pm(0.02, 0.02, 0, 0, 0, 0, 1.2, 1.1, 1.2)), P('pad', 'shR', gear, 0.1, pm(-0.02, 0.02, 0, 0, 0, 0, 1.2, 1.1, 1.2)));
      if (kind !== 'mercBoss') A.parts.push(P('pad', 'hipL', gear, 0, pm(0.02, -0.08, 0)), P('pad', 'hipR', gear, 0, pm(-0.02, -0.08, 0)), P('stripe', 'chest', glow, 2.2, pm(0, 0.2, 0, 0, 0, 0, 1.03, 0.4, 1.02)));
    }
  } else if (kind === 'forgeron') { // the Forges gang: blue work jackets
    const skin = pick(SKIN);
    A.parts = bodyParts(skin, [0.12, 0.2, 0.42], pick([[0.12, 0.12, 0.14], [0.2, 0.18, 0.15]]), [0.05, 0.05, 0.05], { forearm: skin });
    A.parts.push(P('vest', 'chest', [0.1, 0.16, 0.34], 0.05), P('stripe', 'chest', [0.35, 0.75, 1], 1.4, pm(0, 0.02, 0, 0, 0, 0, 1.0, 1, 0.98)));
    A.parts.push(P(rnd() < 0.5 ? 'beanie' : 'hairShort', 'head', pick([[0.1, 0.1, 0.12], [0.2, 0.3, 0.5], [0.08, 0.06, 0.05]])));
    A.glowCol = [0.35, 0.75, 1];
  } else if (kind === 'hdrone') { // hacked police robot: graphite, red lights
    robotParts(A, { body: [0.1, 0.1, 0.12], plate: [0.32, 0.33, 0.36], steel: [0.2, 0.2, 0.22], dark: [0.04, 0.04, 0.05], glow: [1, 0.1, 0.08], eye: [1, 0.2, 0.15], red: [1, 0.1, 0.08], noBadge: true });
    A.parts = CharRender.bake(A.parts, 'rh'); A.hasTail = true; A.robot = true; A.scale = 0.97;
  } else if (NAMED_APPS[kind]) { // named characters of the story
    const N = NAMED_APPS[kind];
    A.parts = bodyParts(N.skin, N.top, N.bottom, N.shoes || [0.05, 0.04, 0.04], { sleeve: N.sleeve, gloves: N.gloves });
    if (N.hair) A.parts.push(P(N.hair, 'head', N.hairC));
    if (N.tail) { A.parts.push(P('ponytail', 'tail', N.hairC)); A.hasTail = true; }
    if (N.beanie) A.parts.push(P('beanie', 'head', N.beanie));
    if (N.coat) A.parts.push(P('coat', 'hips', N.coat));
    if (N.stripe) A.parts.push(P('stripe', 'chest', N.stripe, 1.4, pm(0, 0.07, 0, 0, 0, 0, 0.92, 0.7, 0.9)));
    if (N.bag) { A.parts.push(P('bag', 'haL', N.bag)); A.bag = true; }
    if (N.umb) { A.umbrella = true; A.parts.push(P('umbStick', 'haR', [0.1, 0.1, 0.1], 0, pm(0, -0.02, 0, 1.9)), P('umbTop', 'haR', N.umb, 0.12, pm(0, -0.3, 0.85, 1.9))); }
    A.scale = N.scale || 1;
  }
  return A;
}
// police robot: navy armour, white plates, steel joints, blue light
function robotParts(A, o = {}) {
  const NAVY = o.body || [0.07, 0.12, 0.27], WHITE = o.plate || [0.7, 0.73, 0.78], STEEL = o.steel || [0.19, 0.2, 0.23], DARK = o.dark || [0.028, 0.03, 0.038], GLOW = o.glow || [0.12, 0.5, 1.0], EYE = o.eye || [0.2, 0.75, 1.0], GOLD = [1.0, 0.72, 0.25];
  const L = A.parts;
  L.push(P('rPelvis', 'hips', NAVY), P('belt', 'hips', DARK), P('rAbdo', 'spine', STEEL), P('rAbdoRing', 'spine', NAVY, 0, pm(0, 0.06, 0)), P('rAbdoRing', 'spine', NAVY, 0, pm(0, 0.15, 0)));
  L.push(P('rChest', 'chest', NAVY), P('rPlate', 'chest', WHITE), P('rCore', 'chest', GLOW, 2.2), P('rPack', 'chest', DARK), P('rVent', 'chest', GLOW, 1.5, pm(0, 0.12, -0.19)), P('rVent', 'chest', GLOW, 1.5, pm(0, 0.05, -0.19)));
  L.push(P('stripe', 'chest', GLOW, 1.2, pm(0, 0.21, 0, 0, 0, 0, 0.96, 0.4, 0.96)));
  if (!o.noBadge) L.push(P('badge', 'chest', GOLD, 0.7, pm(0.14, 0.12, 0.112, 0, 0.12, 0)));
  L.push(P('rNeck', 'neck', STEEL), P('rNeckRing', 'neck', GLOW, 1.5));
  L.push(P('rHead', 'head', WHITE), P('rCap', 'head', NAVY), P('rFace', 'head', DARK), P('rChin', 'head', STEEL), P('rLightBase', 'head', STEEL));
  for (const sx of [1, -1]) {
    const ry = sx > 0 ? 0 : Math.PI; // mirror by rotation (a negative scale would flip the winding)
    L.push(P('rEye', 'head', EYE, 1.8, pm(sx * 0.037, 0.1, 0.122, 0, sx * 0.28, 0)), P('rEar', 'head', STEEL, 0, pm(sx * 0.108, 0, 0, 0, ry, 0)), P('rEarRing', 'head', GLOW, 1.4, pm(sx * 0.14, 0, 0, 0, ry, 0)));
    const lt = P('rLight', 'head', GLOW, 2.2, pm(sx * 0.032, 0, 0)); lt.side = sx; L.push(lt);
  }
  L.push(P('rAntenna', 'tail', STEEL), P('rTip', 'tail', [1, 0.25, 0.3], 2.6));
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    L.push(P('rJointL', 'sh' + s, STEEL), P('rPad', 'sh' + s, NAVY, 0, pm(sx * 0.012, 0.018, 0)), P('rUArm', 'sh' + s, STEEL), P('rUArmPlate', 'sh' + s, WHITE, 0, pm(sx * 0.045, 0, 0)));
    L.push(P('rJointM', 'el' + s, STEEL), P('rRing', 'el' + s, GLOW, 1.5), P('rFArm', 'el' + s, WHITE));
    L.push(P('rJointS', 'ha' + s, STEEL), P('rHand', 'ha' + s, DARK));
    L.push(P('rJointL', 'hip' + s, STEEL), P('rThigh', 'hip' + s, NAVY), P('rThighPlate', 'hip' + s, WHITE, 0, pm(sx * 0.072, 0, 0)));
    L.push(P('rJointM', 'kn' + s, STEEL), P('rRing', 'kn' + s, GLOW, 1.5), P('rKneeCap', 'kn' + s, WHITE), P('rShin', 'kn' + s, WHITE));
    L.push(P('rJointS', 'an' + s, STEEL), P('rRingS', 'an' + s, GLOW, 1.2), P('rFoot', 'an' + s, DARK));
  }
  // life: the eyes blink and narrow in a fight, flicker when knocked down and go dark when the unit is out;
  // the head light breathes on patrol and flashes blue/red in a fight; the antenna tip beacons
  const OFF = [0.05, 0.06, 0.07], RED = o.red || [1.0, 0.18, 0.26];
  const out = robotOut;
  const stunned = a => a.state === 'down' || a.state === 'ko';
  for (const pt of L) {
    if (pt.type === 'rEye') {
      const base = pt.m.slice();
      pt.dyn = (a, m) => {
        const t = (a.an ? a.an.time : 0) + (a.seed || 0) * 7, ph = t % 4.3;
        let k = ph < 0.14 ? 0.1 + 0.9 * Math.abs(ph - 0.07) / 0.07 : 1;
        if (a.combatT > 0) k *= 0.7;
        m.set(base); m[4] *= k; m[5] *= k; m[6] *= k;
        if (out(a)) { pt.col = OFF; pt.e = 0; }
        else { pt.col = EYE; pt.e = stunned(a) ? (Math.sin(t * 29) > 0.1 || Math.sin(t * 6.1) > 0.7 ? 1.8 : 0.2) : 1.8; }
      };
    }
    if (pt.type === 'rLight') {
      pt.dyn = a => {
        const t = a.an ? a.an.time : 0;
        if (out(a)) { pt.col = OFF; pt.e = 0; return; }
        pt.col = pt.side > 0 ? GLOW : RED;
        if (a.combatT > 0) pt.e = Math.sin(t * 15 + (pt.side > 0 ? 0 : Math.PI)) > 0 ? 2.8 : 0.12;
        else pt.e = 0.55 + 0.45 * Math.sin(t * 2.1 + (pt.side > 0 ? 0 : Math.PI));
      };
    }
    if (pt.type === 'rTip') pt.dyn = a => { const t = a.an ? a.an.time : 0; pt.e = out(a) ? 0 : (t % 1.6 < 0.12 ? 3.2 : 0.5); };
  }
}
const robotOut = a => a.state === 'dead' || a.dead;
function weaponPart(w) {
  const d = WEAPONS[w]; if (!d || !d.part) return null;
  // long guns ride on the chest (their matrix follows the carry computed by the animation), the rest in the right hand
  const long = !!d.long, pt = P(d.part, long ? 'chest' : 'haR', [1, 1, 1], 0, long ? pm(-0.11, 0.12, 0.1, 0.34, 0.3, -0.15) : M4.create());
  if (long) pt.dyn = (a, m) => { if (a.gunM) m.set(a.gunM); };
  return pt;
}
// parts that are weapons (shiny materials, drawn with vertex colours)
const WEAPON_GEOS = { pistol: 1, uzi: 1, rifle: 1, ak: 1, shotgun: 1, bat: 1, knife: 1, wrench: 1, staff: 1, grenade: 1, nade: 1 };

/* ---------- renderer for all characters ---------- */
const CharRender = {
  inst: {}, bw: [], tmp: M4.create(), tmp2: M4.create(), list: [], ready: false,
  // Merge the static parts of an appearance into one mesh per bone, paint and glow carried by vertex colours,
  // so a 60-part robot costs about as many draw calls as a human. Parts with a dyn() stay separate.
  // Each merged mesh has a dark variant used once the unit is out of service.
  bake(parts, key) {
    if (!this.ready) return parts; // headless (no GL): keep the plain part list
    const byBone = new Map(), out = [];
    for (const pt of parts) { if (pt.dyn) { out.push(pt); continue; } if (!byBone.has(pt.bone)) byBone.set(pt.bone, []); byBone.get(pt.bone).push(pt); }
    for (const [bone, list] of byBone) {
      const on = key + '_' + bone, off = on + '_off';
      if (!this.inst[on]) {
        const b1 = new GeoBuilder(), b0 = new GeoBuilder();
        for (const pt of list) {
          const g = PartGeo[pt.type], c = pt.col, k = pt.e > 0.5 ? 0.3 : 1;
          b1.addGeo(g, pt.m, [c[0], c[1], c[2], pt.e]); b0.addGeo(g, pt.m, [c[0] * k, c[1] * k, c[2] * k, 0]);
        }
        const mat = /^r[A-Z]/.test(list[0].type) || key === 'rb' ? [70, 1.0, 1.1, 1.0] : [26, 0.35, 0.9];
        for (const [name, geo] of [[on, b1.build()], [off, b0.build()]]) { const it = new Instanced(geo, key === 'rb' ? 4 : 28); it.mat = mat; this.inst[name] = it; Render.inst.push(it); }
      }
      const mp = { type: on, bone, col: [1, 1, 1], e: 0, m: M4.create(), dyn: null };
      mp.dyn = a => { mp.type = robotOut(a) ? off : on; };
      out.push(mp);
    }
    return out;
  },
  init() {
    buildPartGeos(); Arms.build(); Folk.init();
    for (const k in PartGeo) {
      const robot = /^r[A-Z]/.test(k);
      const it = new Instanced(PartGeo[k], robot ? 48 : k === 'thigh' || k === 'shin' || k === 'uarm' || k === 'farm' || k === 'hand' || k === 'foot' ? 260 : 150);
      it.mat = robot ? [70, 1.0, 1.1, 1.0] : WEAPON_GEOS[k] ? [58, 0.85, 0.55, 0.3] : [26, 0.35, 0.9]; this.inst[k] = it; Render.inst.push(it);
    }
    for (let i = 0; i < NB; i++) this.bw.push(M4.create());
    this.ready = true;
  },
  begin() { for (const k in this.inst) this.inst[k].reset(); Folk.begin(); },
  // compute world matrices of bones for an actor
  bones(a) {
    const p = a.pose, W = this.bw, s = a.app.scale, shx = a.app.shX || 0.19;
    M4.compose(W[0], a.pos.x, a.pos.y + a.visY, a.pos.z, p[0], (a.renderYaw !== undefined ? a.renderYaw : a.yaw) + (a.visYaw || 0) + p[1], p[2], s, s, s);
    for (let i = 1; i < NB; i++) {
      const b = BONES[i]; let ox = b[2], oy = b[3], oz = b[4];
      if (i === 1) { ox += p[HX]; oy += p[HY]; oz += p[HZ]; }
      else if (i === 6) ox = shx; else if (i === 9) ox = -shx;
      if (XZY[i]) M4.composeXZY(this.tmp, ox, oy, oz, p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      else M4.compose(this.tmp, ox, oy, oz, p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      M4.mul(W[i], W[b[1]], this.tmp);
    }
    return W;
  },
  draw(a) {
    const W = this.bones(a);
    a.handPos = a.handPos || new V3(); const hw = W[BI.haR]; a.handPos.set(hw[12], hw[13], hw[14]);
    const hd = W[BI.head]; a.headPos = a.headPos || new V3(); a.headPos.set(hd[12], hd[13], hd[14]);
    const ch = W[BI.chest]; a.chestPos = a.chestPos || new V3(); a.chestPos.set(ch[12], ch[13], ch[14]);
    const parts = a.app.look && Folk.add(a, W, dist3(a.pos, Cam.pos)) ? a.app.props : a.app.parts;
    for (let i = 0; i < parts.length; i++) {
      const pt = parts[i]; if (pt.hidden) continue;
      if (pt.dyn) pt.dyn(a, pt.m);
      const it = this.inst[pt.type];
      it.pushMul(W[pt.bone], pt.m, pt.col[0] * a.tint, pt.col[1] * a.tint, pt.col[2] * a.tint, pt.e * a.glow);
    }
    const throwing = a.an && a.an.w.thr > 0.35;
    if (a.weaponPart && !a.weaponPart.hidden && !(throwing && a.weaponPart.bone === BI.haR)) {
      const pt = a.weaponPart; if (pt.dyn) pt.dyn(a, pt.m);
      this.inst[pt.type].pushMul(W[pt.bone], pt.m, pt.col[0], pt.col[1], pt.col[2], pt.e);
      if (pt.type === 'staff') { const t = Arms.INFO.staff.tip; this.inst.staffTip.pushMul(W[pt.bone], M4.compose(this.tmp2, t[0], t[1], t[2], 0, 0, 0), 0.18, 0.95, 0.69, 3); }
      // muzzle of a firearm (where the shots and the flash come from)
      const I = Arms.INFO[pt.type];
      if (I && I.muzzle) { a.muzzle = a.muzzle || new V3(); M4.mul(this.tmp2, W[pt.bone], pt.m); M4.transformPoint(this.tmp2, I.muzzle[0], I.muzzle[1], I.muzzle[2], a.muzzle); a.muzzleT = Game.simT || 0; }
    }
    // a grenade in the hand, from the moment it is taken until it leaves the hand
    if (a.nadeAim || (a.throwT >= 0 && !a.thrown)) this.inst.grenade.pushMul(W[BI.haR], M4.identity(this.tmp2), 1, 1, 1, 0);
    if (a.cuffed) this.inst.cuffs.pushMul(W[BI.haR], M4.identity(this.tmp2), 0.6, 0.85, 1, 2.5);
    // a phone in the hand while waiting (its screen lights up the night)
    if (a.idleKind === 'phone' && a.an && a.an.w.idle > 0.35) this.inst.phone.pushMul(W[BI.haR], PHONE_M, 0.35, 0.55, 0.85, 2.2 * a.an.w.idle);
  }
};

