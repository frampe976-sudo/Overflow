// Fabrique de petits GLB de test (un humanoïde en blocs, en pose en T) pour tools/test-modeles.js.
// skin=false : maillage seul (rig automatique) ; skin=true : squelette aux noms Mixamo et poids.
const zlib = require('zlib');
function png(w, h, f) { // PNG RGBA minimal (texture de test)
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const c = f(x, y); c.forEach((v, i) => raw[y * (w * 4 + 1) + 1 + x * 4 + i] = v); } }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function humanoide(o = {}) {
  const S = o.echelle || 100; // en centimètres, comme beaucoup d'exports
  const P = [], N = [], UV = [], I = [], J = [], W = [];
  const JN = ['Hips', 'Spine', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
  const JP = { Hips: [0, 0.95, 0], Spine: [0, 1.05, 0], Spine2: [0, 1.28, 0], Neck: [0, 1.5, 0], Head: [0, 1.58, 0], LeftArm: [0.2, 1.43, 0], LeftForeArm: [0.48, 1.43, 0], LeftHand: [0.73, 1.43, 0], RightArm: [-0.2, 1.43, 0], RightForeArm: [-0.48, 1.43, 0], RightHand: [-0.73, 1.43, 0], LeftUpLeg: [0.1, 0.92, 0], LeftLeg: [0.1, 0.5, 0], LeftFoot: [0.1, 0.09, 0], RightUpLeg: [-0.1, 0.92, 0], RightLeg: [-0.1, 0.5, 0], RightFoot: [-0.1, 0.09, 0] };
  const PARENT = { Spine: 'Hips', Spine2: 'Spine', Neck: 'Spine2', Head: 'Neck', LeftArm: 'Spine2', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm', RightArm: 'Spine2', RightForeArm: 'RightArm', RightHand: 'RightForeArm', LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg' };
  // un bloc subdivisé le long de son axe ; jf(p) donne l'articulation qui le porte ; v = rangée de la texture
  function bloc(x0, y0, z0, x1, y1, z1, axe, n, v, jf) {
    const base = P.length / 3, d = [x1 - x0, y1 - y0, z1 - z0];
    const faces = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
    for (const [ax, sg] of faces) {
      const u = (ax + 1) % 3, w = (ax + 2) % 3, segU = u === axe ? n : 1, segW = w === axe ? n : 1, st = P.length / 3;
      for (let i = 0; i <= segU; i++) for (let j = 0; j <= segW; j++) {
        const p = [0, 0, 0]; p[ax] = sg > 0 ? [x1, y1, z1][ax] : [x0, y0, z0][ax]; p[u] = [x0, y0, z0][u] + d[u] * i / segU; p[w] = [x0, y0, z0][w] + d[w] * j / segW;
        const nn = [0, 0, 0]; nn[ax] = sg; P.push(p[0] * S, p[1] * S, p[2] * S); N.push(...nn); UV.push(0.5, (v + 0.5) / 4);
        const jj = jf(p); J.push(JN.indexOf(jj), 0, 0, 0); W.push(1, 0, 0, 0);
      }
      for (let i = 0; i < segU; i++) for (let j = 0; j < segW; j++) {
        const a = st + i * (segW + 1) + j, b = a + segW + 1, c = b + 1, e = a + 1;
        if (sg > 0) I.push(a, b, c, a, c, e); else I.push(a, c, b, a, e, c);
      }
    }
  }
  const arm = (sd, p) => { const x = Math.abs(p[0]); return (sd > 0 ? 'Left' : 'Right') + (x < 0.48 ? 'Arm' : x < 0.73 ? 'ForeArm' : 'Hand'); };
  const leg = (sd, p) => (sd > 0 ? 'Left' : 'Right') + (p[1] > 0.5 ? 'UpLeg' : p[1] > 0.09 ? 'Leg' : 'Foot');
  bloc(-0.17, 0.9, -0.1, 0.17, 1.5, 0.1, 1, 8, 1, p => p[1] < 1.05 ? 'Hips' : p[1] < 1.28 ? 'Spine' : 'Spine2'); // tronc (tunique)
  bloc(-0.1, 1.5, -0.1, 0.1, 1.8, 0.12, 1, 4, 0, p => p[1] < 1.58 ? 'Neck' : 'Head'); // tête (peau)
  for (const sd of [1, -1]) {
    const xa = sd > 0 ? [0.17, 0.85] : [-0.85, -0.17];
    bloc(xa[0], 1.38, -0.05, xa[1], 1.48, 0.05, 0, 12, 2, p => arm(sd, p)); // bras en T
    bloc(sd * 0.1 - 0.065, 0, -0.07, sd * 0.1 + 0.065, 0.9, 0.07, 1, 12, 3, p => leg(sd, p)); // jambes (chausses)
    bloc(sd * 0.1 - 0.06, 0, 0.07, sd * 0.1 + 0.06, 0.08, 0.2, 2, 2, 3, p => sd > 0 ? 'LeftFoot' : 'RightFoot'); // pied vers l'avant
  }
  const tex = png(4, 4, (x, y) => [[230, 190, 160, 255], [120, 40, 30, 255], [90, 70, 50, 255], [40, 35, 30, 255]][y]);
  // binaire
  const f32 = a => Buffer.from(new Float32Array(a).buffer), u16 = a => Buffer.from(new Uint16Array(a).buffer), u8 = a => Buffer.from(new Uint8Array(a));
  const parts = [], views = [], acc = [];
  let off = 0; const push = (buf, target) => { const pad = (4 - off % 4) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; } views.push(Object.assign({ buffer: 0, byteOffset: off, byteLength: buf.length }, target ? { target } : {})); parts.push(buf); off += buf.length; return views.length - 1; };
  const nv = P.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let k = 0; k < nv; k++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[k * 3 + c]); mx[c] = Math.max(mx[c], P[k * 3 + c]); }
  acc.push({ bufferView: push(f32(P), 34962), componentType: 5126, count: nv, type: 'VEC3', min: mn, max: mx });
  acc.push({ bufferView: push(f32(N), 34962), componentType: 5126, count: nv, type: 'VEC3' });
  acc.push({ bufferView: push(f32(UV), 34962), componentType: 5126, count: nv, type: 'VEC2' });
  acc.push({ bufferView: push(u16(I), 34963), componentType: 5123, count: I.length, type: 'SCALAR' });
  const attrs = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 };
  const img = push(tex);
  const json = { asset: { version: '2.0', generator: 'overflow glb-test' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Corps', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: attrs, indices: 3, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, roughnessFactor: 0.9, metallicFactor: 0 } }],
    textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9728, minFilter: 9728 }], images: [{ bufferView: img, mimeType: 'image/png' }], accessors: acc, bufferViews: views, buffers: [] };
  if (o.skin) {
    acc.push({ bufferView: push(u8(J), 34962), componentType: 5121, count: nv, type: 'VEC4' }); attrs.JOINTS_0 = acc.length - 1;
    acc.push({ bufferView: push(f32(W), 34962), componentType: 5126, count: nv, type: 'VEC4' }); attrs.WEIGHTS_0 = acc.length - 1;
    const ibm = []; for (const n of JN) { const p = JP[n]; ibm.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0] * S, -p[1] * S, -p[2] * S, 1); }
    acc.push({ bufferView: push(f32(ibm)), componentType: 5126, count: JN.length, type: 'MAT4' });
    const first = json.nodes.length;
    JN.forEach(n => { const p = JP[n], q = PARENT[n] ? JP[PARENT[n]] : [0, 0, 0]; json.nodes.push({ name: 'mixamorig:' + n, translation: [(p[0] - q[0]) * S, (p[1] - q[1]) * S, (p[2] - q[2]) * S], children: [] }); });
    JN.forEach((n, i) => { if (PARENT[n]) json.nodes[first + JN.indexOf(PARENT[n])].children.push(first + i); });
    json.nodes.forEach(n => { if (n.children && !n.children.length) delete n.children; });
    json.skins = [{ joints: JN.map((_, i) => first + i), inverseBindMatrices: acc.length - 1, skeleton: first }];
    json.nodes[0].skin = 0; json.scenes[0].nodes.push(first);
  }
  const bin = Buffer.concat(parts); const binP = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  json.buffers.push({ byteLength: binP.length });
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binP.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4E4F534A, 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(binP.length, 0); c2.writeUInt32LE(0x004E4942, 4);
  return Buffer.concat([head, c1, js, c2, binP]);
}
module.exports = { humanoide };
if (require.main === module) { require('fs').writeFileSync(process.argv[2] || 'humanoide.glb', humanoide({ skin: process.argv[3] === 'skin' })); }
