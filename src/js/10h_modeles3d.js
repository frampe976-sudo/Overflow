/* =====================================================================
   MODÈLES 3D — PNJ et ennemis venus d'un fichier GLB / glTF (Kimi 3D,
   Meshy, Tripo, Blender…). Le modèle est posé sur le squelette du jeu
   (19 os de CharRender) : s'il a déjà un squelette (noms Mixamo, Unreal,
   Blender), ses poids sont repris ; sinon il est « riggé » tout seul à
   partir de sa silhouette (pose en T, en A ou bras le long du corps).
   Il est ensuite allégé (regroupement de sommets), ses couleurs et sa
   texture ramenées à une palette de 14 teintes, puis dessiné avec le
   même programme de peau (skinning GPU) que les habitants de Folk :
   toutes les animations du moteur (combat, PR des animations fantasy,
   marche, chutes…) s'appliquent donc sans rien changer.
   Un rôle (« pnj:anselme », « ennemi:cultist », « apparence:thug »,
   « apparence:hero ») reçoit un modèle ; sans modèle prêt, le personnage
   garde son apparence d'origine.
   ===================================================================== */
const Modeles3D = (() => {
  const CHILD = { hips: 'spine', spine: 'chest', chest: 'neck', neck: 'head', shL: 'elL', elL: 'haL', shR: 'elR', elR: 'haR', hipL: 'knL', knL: 'anL', hipR: 'knR', knR: 'anR' };
  const LIMB = { shL: 1, elL: 1, shR: 1, elR: 1, hipL: 1, knL: 1, hipR: 1, knR: 1 };
  // rayon de chaque os (pour le rig automatique : une distance au segment de l'os, divisée par son épaisseur)
  const RAD = { hips: 0.16, spine: 0.15, chest: 0.17, neck: 0.06, head: 0.11, shL: 0.055, elL: 0.045, haL: 0.045, shR: 0.055, elR: 0.045, haR: 0.045, hipL: 0.085, knL: 0.06, anL: 0.055, hipR: 0.085, knR: 0.06, anR: 0.055 };
  const USED = Object.keys(RAD);
  const SIDE = {}; for (const n of USED) SIDE[n] = /L$/.test(n) ? 1 : /R$/.test(n) ? -1 : 0;
  const HAUTEUR = 1.8, SLOT0 = 2, NPAL = 14;
  const CLE_ROLES = 'overflow-modeles-roles', DB = 'overflow-modeles';

  /* ---------------- squelette du jeu au repos ---------------- */
  let REST = null;
  function repos() {
    if (REST) return REST;
    REST = [];
    for (let i = 0; i < NB; i++) { const b = BONES[i], p = b[1] < 0 ? [0, 0, 0] : REST[b[1]]; REST.push([p[0] + b[2], p[1] + b[3], p[2] + b[4]]); }
    return REST;
  }
  const RP = n => repos()[BI[n]];

  /* ---------------- petite algèbre ---------------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mulS = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // 3x3 (lignes) qui tourne le vecteur unitaire a sur b
  function rotEntre(a, b) {
    const c = dot(a, b);
    if (c > 0.99999) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let v = cross(a, b);
    if (c < -0.99999) { v = nrm(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0])); const [x, y, z] = v; return [2 * x * x - 1, 2 * x * y, 2 * x * z, 2 * x * y, 2 * y * y - 1, 2 * y * z, 2 * x * z, 2 * y * z, 2 * z * z - 1]; }
    const k = 1 / (1 + c), [x, y, z] = v;
    return [1 - k * (y * y + z * z), -z + k * x * y, y + k * x * z, z + k * x * y, 1 - k * (x * x + z * z), -x + k * y * z, -y + k * x * z, x + k * y * z, 1 - k * (x * x + y * y)];
  }
  const mul3 = (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
  function trs(n) {
    if (n.matrix) return Float32Array.from(n.matrix);
    const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q, m = new Float32Array(16);
    m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
    m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
    m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1; return m;
  }
  const tp = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  const tn = (m, x, y, z) => nrm([m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]);

  /* ---------------- lecture GLB / glTF ---------------- */
  function b64bytes(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function lire(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let json = null, bin = null;
    if (u8.length >= 12 && dv.getUint32(0, true) === 0x46546C67) {
      let off = 12;
      while (off + 8 <= u8.length) {
        const cl = dv.getUint32(off, true), ct = dv.getUint32(off + 4, true);
        if (ct === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(u8.subarray(off + 8, off + 8 + cl)));
        else if (ct === 0x004E4942) bin = u8.subarray(off + 8, off + 8 + cl);
        off += 8 + cl;
      }
    } else { try { json = JSON.parse(new TextDecoder().decode(u8)); } catch (e) { throw new Error('ce fichier n’est ni un .glb ni un .gltf'); } }
    if (!json || !json.asset) throw new Error('fichier glTF illisible');
    const ext = json.extensionsRequired || [];
    if (ext.indexOf('KHR_draco_mesh_compression') >= 0) throw new Error('modèle compressé en Draco : réexporte-le sans compression (option « Draco » décochée)');
    if (ext.indexOf('EXT_meshopt_compression') >= 0) throw new Error('modèle compressé meshopt : réexporte-le sans compression');
    const buffers = (json.buffers || []).map((b, i) => {
      if (b.uri === undefined) { if (!bin) throw new Error('données binaires absentes'); return bin; }
      const m = /^data:[^;]*;base64,(.*)$/.exec(b.uri); if (m) return b64bytes(m[1]);
      throw new Error('le .gltf renvoie vers un fichier séparé (' + b.uri + ') : exporte plutôt en .glb');
    });
    return { json, buffers };
  }
  function vue(G, i) { const v = G.json.bufferViews[i], b = G.buffers[v.buffer || 0]; return b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); }
  function acces(G, i) {
    const a = G.json.accessors[i], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type], out = new Float32Array(a.count * n);
    const cs = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType], ct = a.componentType, norm = !!a.normalized;
    const rdAt = (dv, o) => ct === 5126 ? dv.getFloat32(o, true) : ct === 5121 ? (norm ? dv.getUint8(o) / 255 : dv.getUint8(o)) : ct === 5123 ? (norm ? dv.getUint16(o, true) / 65535 : dv.getUint16(o, true))
      : ct === 5125 ? dv.getUint32(o, true) : ct === 5120 ? (norm ? Math.max(dv.getInt8(o) / 127, -1) : dv.getInt8(o)) : (norm ? Math.max(dv.getInt16(o, true) / 32767, -1) : dv.getInt16(o, true));
    if (a.bufferView !== undefined) {
      const by = vue(G, a.bufferView), dv = new DataView(by.buffer, by.byteOffset, by.byteLength), st = G.json.bufferViews[a.bufferView].byteStride || cs * n, base = a.byteOffset || 0;
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = rdAt(dv, base + k * st + c * cs);
    }
    if (a.sparse) {
      const S = a.sparse, ib = vue(G, S.indices.bufferView), idv = new DataView(ib.buffer, ib.byteOffset + (S.indices.byteOffset || 0)), vb = vue(G, S.values.bufferView), vdv = new DataView(vb.buffer, vb.byteOffset + (S.values.byteOffset || 0));
      const ics = { 5121: 1, 5123: 2, 5125: 4 }[S.indices.componentType];
      for (let k = 0; k < S.count; k++) { const at = ics === 1 ? idv.getUint8(k) : ics === 2 ? idv.getUint16(k * 2, true) : idv.getUint32(k * 4, true); for (let c = 0; c < n; c++) out[at * n + c] = rdAt(vdv, (k * n + c) * cs); }
    }
    return out;
  }
  async function image(G, ti, cache, max = 512) {
    if (cache.has(ti)) return cache.get(ti);
    let r = null;
    try {
      const T = G.json.textures[ti], src = T && (T.source !== undefined ? T.source : T.extensions && (T.extensions.EXT_texture_webp || T.extensions.KHR_texture_basisu || {}).source), I = src !== undefined && G.json.images[src];
      let bytes = null, mime = I && I.mimeType;
      if (I && I.bufferView !== undefined) bytes = vue(G, I.bufferView);
      else if (I && I.uri) { const m = /^data:([^;]*);base64,(.*)$/.exec(I.uri); if (m) { bytes = b64bytes(m[2]); mime = mime || m[1]; } }
      if (bytes && typeof createImageBitmap !== 'undefined') {
        const bmp = await createImageBitmap(new Blob([bytes], { type: mime || 'image/png' }));
        const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
        const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
        const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, w, h); r = { w, h, d: cx.getImageData(0, 0, w, h).data };
        // la texture gardée par le jeu : 512 px au plus, en JPEG (PNG si elle a de la transparence)
        let alpha = false; if (/png/.test(mime || '')) for (let q = 3; q < r.d.length; q += 4) if (r.d[q] < 250) { alpha = true; break; }
        const type = alpha ? 'image/png' : 'image/jpeg';
        const blob = cv.convertToBlob ? await cv.convertToBlob({ type, quality: 0.86 }) : await new Promise(ok => cv.toBlob(ok, type, 0.86));
        r.enc = new Uint8Array(await blob.arrayBuffer()); r.mime = type;
      }
    } catch (e) { r = null; }
    cache.set(ti, r); return r;
  }
  const lin2srgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  /* ---------------- noms d'os → os du jeu ---------------- */
  function osDuNom(nom, x) {
    let s = String(nom || '').toLowerCase().replace(/^.*[:|]/, '').replace(/^(mixamorig\d*|bip0?\d*|def|org|mch|j|b|bn|bone|cc_base|rig)[_\s.\-]+/, '');
    if (/(_end|\.end|end$|_tip|top_end|headtop|_nub$|nub$)/.test(s)) return null;
    let side = 0;
    if (/(^|[_\s.\-])(l|left)([_\s.\-]|\d|$)|^left|left(?=[a-z])|[._\-]l$/.test(s)) side = 1;
    else if (/(^|[_\s.\-])(r|right)([_\s.\-]|\d|$)|^right|right(?=[a-z])|[._\-]r$/.test(s)) side = -1;
    const t = s.replace(/left|right/g, '').replace(/(^|[_\s.\-])[lr]([_\s.\-]|\d|$)/g, '$1$2').replace(/[._\-]?[lr]$/, '').replace(/[_\s.\-]/g, '');
    const sd = side || (x > 0.01 ? 1 : x < -0.01 ? -1 : 0), L = sd > 0 ? 'L' : 'R';
    if (/^(hips?|pelvis|cog)$/.test(t)) return 'hips';
    if (/^(upperchest|chest|spine0?[2-9]|spine[2-9])$/.test(t)) return 'chest';
    if (/^(spine0?1?|spine|torso|abdomen|waist|stomach)$/.test(t)) return 'spine';
    if (/^neck\d*$/.test(t)) return 'neck';
    if (/^(head|jaw|eye\w*|skull)$/.test(t)) return 'head';
    if (!sd) return null;
    if (/(shoulder|clavicle|collar)/.test(t)) return 'chest';
    if (/(forearm|lowerarm|elbow|lowarm)/.test(t)) return 'el' + L;
    if (/(upperarm|uparm|arm)/.test(t)) return 'sh' + L;
    if (/(hand|wrist|palm|thumb|index|middle|ring|pinky|finger|little)/.test(t)) return 'ha' + L;
    if (/(upleg|thigh|upperleg|femur)/.test(t)) return 'hip' + L;
    if (/(foot|ankle|toe|ball|heel)/.test(t)) return 'an' + L;
    if (/(leg|calf|shin|knee|lowerleg|crus)/.test(t)) return 'kn' + L;
    return null;
  }

  /* ---------------- collecte de la géométrie ---------------- */
  async function collecter(G, o) {
    const J = G.json, nodes = J.nodes || [], par = new Int32Array(nodes.length).fill(-1);
    nodes.forEach((n, i) => (n.children || []).forEach(c => par[c] = i));
    const world = new Array(nodes.length);
    const visit = (i, pm) => { const m = trs(nodes[i]); const w = new Float32Array(16); if (pm) M4.mul(w, pm, m); else w.set(m); world[i] = w; for (const c of nodes[i].children || []) visit(c, w); };
    const scene = J.scenes && J.scenes[J.scene || 0], roots = scene ? scene.nodes : nodes.map((_, i) => i).filter(i => par[i] < 0);
    for (const r of roots) visit(r, null);
    // os du jeu pour chaque nœud (articulations des peaux et nœuds nommés)
    const nodeBone = new Array(nodes.length).fill(null), jointPos = {}, jointDepth = {};
    const depth = i => { let d = 0; while (par[i] >= 0) { i = par[i]; d++; } return d; };
    let nJoints = 0;
    for (const sk of J.skins || []) {
      const ibm = sk.inverseBindMatrices !== undefined ? acces(G, sk.inverseBindMatrices) : null;
      sk.joints.forEach((ni, k) => {
        let p;
        if (ibm) { const inv = new Float32Array(16); M4.invert(inv, ibm.subarray(k * 16, k * 16 + 16)); p = [inv[12], inv[13], inv[14]]; }
        else p = world[ni] ? [world[ni][12], world[ni][13], world[ni][14]] : [0, 0, 0];
        sk._pos = sk._pos || []; sk._pos[k] = p;
      });
    }
    // côté (x) des articulations : mesuré dans l'espace de liaison du premier skin
    for (const sk of J.skins || []) sk.joints.forEach((ni, k) => {
      if (nodeBone[ni]) return; const b = osDuNom(nodes[ni].name, sk._pos[k][0]); nodeBone[ni] = b; if (!b) return; nJoints++;
      const d = depth(ni); if (jointPos[b] === undefined || d < jointDepth[b]) { jointPos[b] = sk._pos[k]; jointDepth[b] = d; }
    });
    // un nœud sans os reconnu prend celui de son plus proche ancêtre reconnu
    const boneOf = i => { while (i >= 0) { if (nodeBone[i]) return nodeBone[i]; i = par[i]; } return null; };
    const P = [], N = [], C = [], E = [], S = [], VJ = [], VW = [], FIX = [], I = [], U = [], TX = [], DS = [];
    const imgs = new Map(), texSlot = new Map(), textures = [];
    let nv = 0, nPrims = 0;
    for (let ni = 0; ni < nodes.length; ni++) {
      const nd = nodes[ni]; if (nd.mesh === undefined || !world[ni]) continue;
      const skin = nd.skin !== undefined ? J.skins[nd.skin] : null, rigid = skin ? null : boneOf(par[ni]) || boneOf(ni);
      for (const pr of J.meshes[nd.mesh].primitives) {
        if (pr.mode !== undefined && pr.mode !== 4) continue;
        if (pr.extensions && pr.extensions.KHR_draco_mesh_compression) throw new Error('modèle compressé en Draco : réexporte-le sans compression');
        const A = pr.attributes; if (A.POSITION === undefined) continue;
        nPrims++;
        const pos = acces(G, A.POSITION), cnt = pos.length / 3, nor = A.NORMAL !== undefined ? acces(G, A.NORMAL) : null;
        const mat = (J.materials || [])[pr.material] || {}, pbr = mat.pbrMetallicRoughness || {}, bcf = pbr.baseColorFactor || [1, 1, 1, 1];
        const bt = pbr.baseColorTexture, tex = bt ? await image(G, bt.index, imgs, o.texture || 512) : null, uvA = bt && A['TEXCOORD_' + (bt.texCoord || 0)];
        const uv = tex && uvA !== undefined ? acces(G, uvA) : null;
        // texture gardée telle quelle (dessinée par le GPU) ; sans elle, couleur par sommet
        let ts = -1; if (uv && tex.enc) { if (!texSlot.has(bt.index)) { texSlot.set(bt.index, textures.length); textures.push({ mime: tex.mime, bytes: tex.enc }); } ts = texSlot.get(bt.index); }
        const ds = mat.doubleSided ? 1 : 0;
        const colA = A.COLOR_0 !== undefined ? acces(G, A.COLOR_0) : null, cn = colA ? colA.length / cnt : 0;
        let em = mat.emissiveFactor || [0, 0, 0]; const es = mat.extensions && mat.extensions.KHR_materials_emissive_strength; if (es) em = em.map(v => v * (es.emissiveStrength || 1));
        const emv = Math.min(1, Math.max(em[0], em[1], em[2])), rough = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 0.8;
        const spec = clamp(Math.round(30 + 150 * (1 - rough)), 0, 255);
        const jn = skin && A.JOINTS_0 !== undefined ? acces(G, A.JOINTS_0) : null, wt = skin && A.WEIGHTS_0 !== undefined ? acces(G, A.WEIGHTS_0) : null;
        const m = world[ni];
        for (let k = 0; k < cnt; k++) {
          let p, n;
          if (skin) { p = [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]; n = nor ? nrm([nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]]) : [0, 1, 0]; }
          else { p = tp(m, pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); n = nor ? tn(m, nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]) : [0, 1, 0]; }
          P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]);
          let r = lin2srgb(bcf[0]), g = lin2srgb(bcf[1]), b = lin2srgb(bcf[2]);
          if (colA) { r *= lin2srgb(colA[k * cn]); g *= lin2srgb(colA[k * cn + 1]); b *= lin2srgb(colA[k * cn + 2]); }
          if (ts >= 0) { U.push(uv[k * 2], uv[k * 2 + 1]); TX.push(ts); }
          else { U.push(0, 0); TX.push(-1); }
          DS.push(ds);
          if (uv && ts < 0) {
            let u = uv[k * 2] % 1, v = uv[k * 2 + 1] % 1; if (u < 0) u += 1; if (v < 0) v += 1;
            const q = ((Math.min(tex.h - 1, (v * tex.h) | 0) * tex.w) + Math.min(tex.w - 1, (u * tex.w) | 0)) * 4;
            r *= tex.d[q] / 255; g *= tex.d[q + 1] / 255; b *= tex.d[q + 2] / 255;
          }
          C.push(r, g, b); E.push(emv); S.push(spec);
          // poids : ceux de la peau, ramenés aux os du jeu (4 au plus), ou l'os du nœud parent, ou rig automatique
          const w = new Map();
          if (jn && wt) for (let c = 0; c < 4; c++) { const ww = wt[k * 4 + c]; if (ww <= 0) continue; const b2 = boneOf(skin.joints[jn[k * 4 + c]]); if (b2) w.set(b2, (w.get(b2) || 0) + ww); }
          else if (rigid) w.set(rigid, 1);
          const L = [...w.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
          FIX.push(L.length ? 1 : 0);
          for (let c = 0; c < 4; c++) { VJ.push(L[c] ? BI[L[c][0]] : 0); VW.push(L[c] ? L[c][1] : 0); }
        }
        if (pr.indices !== undefined) { const ix = acces(G, pr.indices); for (let k = 0; k < ix.length; k++) I.push(nv + ix[k]); }
        else for (let k = 0; k < cnt; k++) I.push(nv + k);
        nv += cnt;
      }
    }
    if (!nv || !I.length) throw new Error('aucun maillage triangulé dans ce fichier');
    return { P: Float32Array.from(P), N: Float32Array.from(N), C: Float32Array.from(C), E: Float32Array.from(E), S: Float32Array.from(S), VJ: Uint8Array.from(VJ), VW: Float32Array.from(VW), FIX: Uint8Array.from(FIX), I: Uint32Array.from(I), U: Float32Array.from(U), TX: Int16Array.from(TX), DS: Uint8Array.from(DS), textures, nv, jointPos, nJoints, nPrims };
  }

  /* ---------------- mise à l'échelle : 1,80 m, pieds au sol, centré, face à +Z ---------------- */
  function normaliser(D, o) {
    const a = (o.tourner || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const rot = p => [p[0] * ca + p[2] * sa, p[1], -p[0] * sa + p[2] * ca];
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = 0; k < D.nv; k++) { const p = rot([D.P[k * 3], D.P[k * 3 + 1], D.P[k * 3 + 2]]); for (let c = 0; c < 3; c++) { if (p[c] < mn[c]) mn[c] = p[c]; if (p[c] > mx[c]) mx[c] = p[c]; } D.P[k * 3] = p[0]; D.P[k * 3 + 1] = p[1]; D.P[k * 3 + 2] = p[2]; const n = rot([D.N[k * 3], D.N[k * 3 + 1], D.N[k * 3 + 2]]); D.N[k * 3] = n[0]; D.N[k * 3 + 1] = n[1]; D.N[k * 3 + 2] = n[2]; }
    const h = mx[1] - mn[1]; if (!(h > 1e-6)) throw new Error('modèle plat ou vide');
    const k = HAUTEUR / h, cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, f = p => [(p[0] - cx) * k, (p[1] - mn[1]) * k - 0.01, (p[2] - cz) * k];
    for (let i = 0; i < D.nv; i++) { const p = f([D.P[i * 3], D.P[i * 3 + 1], D.P[i * 3 + 2]]); D.P[i * 3] = p[0]; D.P[i * 3 + 1] = p[1]; D.P[i * 3 + 2] = p[2]; }
    for (const b in D.jointPos) D.jointPos[b] = f(rot(D.jointPos[b]));
    D.taille = [(mx[0] - mn[0]) * k, HAUTEUR, (mx[2] - mn[2]) * k];
  }

  /* ---------------- articulations : celles du squelette, sinon devinées sur la silhouette ---------------- */
  function articulations(D) {
    const J = {}; for (const n of USED) J[n] = RP(n).slice();
    const P = D.P, nv = D.nv, known = D.jointPos, pose = { L: 'repos', R: 'repos' };
    // le tronc : centre (z) de la tranche de la poitrine
    let sz = 0, n0 = 0; for (let k = 0; k < nv; k++) { const y = P[k * 3 + 1]; if (y > 1.0 && y < 1.4 && Math.abs(P[k * 3]) < 0.15) { sz += P[k * 3 + 2]; n0++; } }
    const tz = n0 ? sz / n0 : 0; for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'hipL', 'hipR']) J[n][2] = tz;
    for (const sd of [1, -1]) {
      const L = sd > 0 ? 'L' : 'R';
      // la main : les points les plus écartés du haut du corps
      const xs = []; for (let k = 0; k < nv; k++) if (P[k * 3 + 1] > 0.6 && P[k * 3] * sd > 0.12) xs.push(k);
      xs.sort((a, b) => P[b * 3] * sd - P[a * 3] * sd);
      const top = xs.slice(0, Math.max(1, Math.round(xs.length * 0.01)));
      if (top.length && xs.length) {
        let tip = [0, 0, 0]; for (const k of top) tip = add(tip, [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]); tip = mulS(tip, 1 / top.length);
        if (tip[0] * sd > 0.42) { // bras écartés (pose en T ou en A)
          // hauteur de l'épaule : milieu du bras à 0,3–0,45 m de l'axe
          let ya = 0, za = 0, na = 0; for (const k of xs) { const x = P[k * 3] * sd; if (x > 0.3 && x < 0.45) { ya += P[k * 3 + 1]; za += P[k * 3 + 2]; na++; } }
          const sh = J['sh' + L]; if (na) { const yb = ya / na; sh[1] = clamp(yb + (tip[1] < yb - 0.1 ? 0.06 : 0), 1.25, 1.6); sh[2] = za / na; }
          const d = sub(tip, sh), l = len(d), u = nrm(d);
          J['el' + L] = add(sh, mulS(u, l * 0.39)); J['ha' + L] = add(sh, mulS(u, l * 0.74));
          pose[L] = tip[1] > sh[1] - 0.15 ? 'T' : 'A';
        }
      }
      // les pieds : centre des points au ras du sol
      let fx = 0, fz = 0, nf = 0; for (let k = 0; k < nv; k++) if (P[k * 3 + 1] < 0.1 && P[k * 3] * sd > 0.02) { fx += P[k * 3]; fz += P[k * 3 + 2]; nf++; }
      if (nf) { const an = J['an' + L]; an[0] = fx / nf; an[2] = fz / nf - 0.04; const hp = J['hip' + L]; J['kn' + L] = [(hp[0] + an[0]) / 2, (hp[1] + an[1]) / 2, (hp[2] + an[2]) / 2 + 0.02]; }
    }
    let n = 0; for (const b in known) if (J[b]) { J[b] = known[b].slice(); n++; }
    D.pose = pose; D.nConnus = n;
    return J;
  }

  /* ---------------- allègement : regroupement des sommets ---------------- */
  function alleger(D, cible) {
    const nt = D.I.length / 3; if (nt <= cible) return D;
    const P = D.P, nv = D.nv; let cell = 0.012, best = null;
    for (let it = 0; it < 20; it++) {
      const map = new Map(), rep = new Int32Array(nv); let nc = 0;
      for (let k = 0; k < nv; k++) {
        let key = ((Math.floor(P[k * 3] / cell + 512) * 1024 + Math.floor(P[k * 3 + 1] / cell + 64)) * 1024 + Math.floor(P[k * 3 + 2] / cell + 512)) * 32 + (D.FIX[k] ? D.VJ[k * 4] + 1 : 0);
        // les coutures de texture restent séparées : même texture et UV voisins seulement
        if (D.TX[k] >= 0) key = key + '|' + D.TX[k] + '|' + Math.floor(D.U[k * 2] * 24) + '|' + Math.floor(D.U[k * 2 + 1] * 24);
        let c = map.get(key); if (c === undefined) { c = nc++; map.set(key, c); } rep[k] = c;
      }
      const tri = []; const seen = new Set();
      for (let t = 0; t < D.I.length; t += 3) {
        const a = rep[D.I[t]], b = rep[D.I[t + 1]], c = rep[D.I[t + 2]]; if (a === b || b === c || a === c) continue;
        const lo = Math.min(a, b, c), hi = Math.max(a, b, c), key = lo * 4294967296 + hi * 65536 + (a + b + c - lo - hi); if (seen.has(key)) continue; seen.add(key); tri.push(a, b, c);
      }
      best = { rep, nc, tri };
      if (tri.length / 3 <= cible) break;
      cell *= 1.22;
    }
    const { rep, nc, tri } = best, O = { nv: nc, U: new Float32Array(nc * 2), TX: new Int16Array(nc), DS: new Uint8Array(nc), P: new Float32Array(nc * 3), N: new Float32Array(nc * 3), C: new Float32Array(nc * 3), E: new Float32Array(nc), S: new Float32Array(nc), VJ: new Uint8Array(nc * 4), VW: new Float32Array(nc * 4), FIX: new Uint8Array(nc), I: Uint32Array.from(tri) };
    const cntv = new Float32Array(nc), W = new Float32Array(nc * NB);
    for (let k = 0; k < nv; k++) {
      const c = rep[k]; cntv[c]++; O.U[c * 2] += D.U[k * 2]; O.U[c * 2 + 1] += D.U[k * 2 + 1]; O.TX[c] = D.TX[k]; O.DS[c] |= D.DS[k];
      for (let j = 0; j < 3; j++) { O.P[c * 3 + j] += P[k * 3 + j]; O.C[c * 3 + j] += D.C[k * 3 + j]; }
      O.E[c] += D.E[k]; O.S[c] += D.S[k]; if (D.FIX[k]) { O.FIX[c] = 1; for (let j = 0; j < 4; j++) W[c * NB + D.VJ[k * 4 + j]] += D.VW[k * 4 + j]; }
    }
    for (let c = 0; c < nc; c++) {
      const q = cntv[c] || 1; O.U[c * 2] /= q; O.U[c * 2 + 1] /= q; for (let j = 0; j < 3; j++) { O.P[c * 3 + j] /= q; O.C[c * 3 + j] /= q; } O.E[c] /= q; O.S[c] /= q;
      if (O.FIX[c]) poidsDepuis(W, c, O);
    }
    return Object.assign(D, O);
  }
  function poidsDepuis(W, c, O) {
    const L = []; for (let b = 0; b < NB; b++) if (W[c * NB + b] > 0) L.push([b, W[c * NB + b]]);
    L.sort((x, y) => y[1] - x[1]); for (let j = 0; j < 4; j++) { O.VJ[c * 4 + j] = L[j] ? L[j][0] : 0; O.VW[c * 4 + j] = L[j] ? L[j][1] : 0; }
  }

  /* ---------------- rig automatique (os les plus proches, lissé sur le maillage) ---------------- */
  function segments(J) {
    const S = {};
    for (const n of USED) {
      let a = J[n], b;
      if (CHILD[n]) b = J[CHILD[n]];
      else if (n === 'head') b = add(a, [0, 0.24, 0.0]);
      else if (n[0] === 'h' && n[1] === 'a') { const el = J['el' + n[2]]; b = add(a, mulS(nrm(sub(a, el)), 0.17)); }
      else b = add(a, [0, -0.08, 0.15]); // pieds
      if (n === 'hips') a = add(a, [0, -0.1, 0]);
      S[n] = [a, b];
    }
    return S;
  }
  function distSeg(p, s) { const d = sub(s[1], s[0]), l2 = dot(d, d) || 1e-9, t = clamp(dot(sub(p, s[0]), d) / l2, 0, 1); return len(sub(p, add(s[0], mulS(d, t)))); }
  function rigAuto(D, J) {
    const S = segments(J), nv = D.nv, W = new Float32Array(nv * NB);
    let nAuto = 0;
    for (let k = 0; k < nv; k++) {
      if (D.FIX[k]) { for (let j = 0; j < 4; j++) W[k * NB + D.VJ[k * 4 + j]] += D.VW[k * 4 + j]; continue; }
      nAuto++;
      const p = [D.P[k * 3], D.P[k * 3 + 1], D.P[k * 3 + 2]], sx = p[0] > 0.03 ? 1 : p[0] < -0.03 ? -1 : 0, L = [];
      for (const n of USED) { if (sx && SIDE[n] === -sx) continue; L.push([n, distSeg(p, S[n]) / RAD[n]]); }
      L.sort((a, b) => a[1] - b[1]);
      const d0 = Math.max(L[0][1], 0.05);
      for (let j = 0; j < 3; j++) { if (L[j][1] > d0 * 1.5 + 0.25) break; const w = Math.pow(d0 / Math.max(L[j][1], 0.05), 6); W[k * NB + BI[L[j][0]]] += w; }
    }
    // lissage des poids du rig automatique (voisins sur le maillage)
    if (nAuto) {
      const nb = new Array(nv); for (let k = 0; k < nv; k++) nb[k] = [];
      for (let t = 0; t < D.I.length; t += 3) { const a = D.I[t], b = D.I[t + 1], c = D.I[t + 2]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
      for (let pass = 0; pass < 2; pass++) {
        const W2 = W.slice();
        for (let k = 0; k < nv; k++) {
          if (D.FIX[k] || !nb[k].length) continue;
          let s = 0; for (let b = 0; b < NB; b++) s += W[k * NB + b];
          for (let b = 0; b < NB; b++) W2[k * NB + b] = W[k * NB + b] / (s || 1);
          for (const q of nb[k]) { let s2 = 0; for (let b = 0; b < NB; b++) s2 += W[q * NB + b]; for (let b = 0; b < NB; b++) W2[k * NB + b] += 0.5 * W[q * NB + b] / (s2 || 1) / nb[k].length * 2; }
        }
        W.set(W2);
      }
    }
    for (let k = 0; k < nv; k++) { const L = []; for (let b = 0; b < NB; b++) if (W[k * NB + b] > 0.01) L.push([b, W[k * NB + b]]); L.sort((x, y) => y[1] - x[1]); if (!L.length) L.push([BI.chest, 1]); for (let j = 0; j < 4; j++) { D.VJ[k * 4 + j] = L[j] ? L[j][0] : 0; D.VW[k * 4 + j] = L[j] ? L[j][1] : 0; } }
    D.nAuto = nAuto;
  }

  /* ---------------- liaison : chaque os du jeu ↔ son articulation dans le modèle ---------------- */
  function liaison(J) {
    const inv = new Float32Array(NB * 16), Rs = {};
    for (let i = 0; i < NB; i++) {
      const n = BONES[i][0], o = inv.subarray(i * 16, i * 16 + 16);
      if (!RAD[n]) { M4.identity(o); continue; }
      const p = J[n]; let R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      if (LIMB[n]) {
        const c = CHILD[n], de = sub(RP(c), RP(n)), dm = sub(J[c], J[n]), d = nrm(de), s = clamp(len(dm) / (len(de) || 1), 0.5, 2);
        R = rotEntre(d, nrm(dm));
        const Sm = [1 + (s - 1) * d[0] * d[0], (s - 1) * d[0] * d[1], (s - 1) * d[0] * d[2], (s - 1) * d[1] * d[0], 1 + (s - 1) * d[1] * d[1], (s - 1) * d[1] * d[2], (s - 1) * d[2] * d[0], (s - 1) * d[2] * d[1], 1 + (s - 1) * d[2] * d[2]];
        Rs[n] = R; R = mul3(R, Sm);
      } else if (n[0] === 'h' && n[1] === 'a') R = Rs['el' + n[2]] || R;
      const B = new Float32Array([R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, p[0], p[1], p[2], 1]);
      M4.invert(o, B);
    }
    return inv;
  }

  /* ---------------- couleurs → palette de 14 teintes + ombrage par sommet ---------------- */
  function palette(D) {
    const nv = D.nv, C = D.C, k = Math.min(NPAL, nv), cent = [], lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b + 1e-3;
    const order = Array.from({ length: nv }, (_, i) => i).sort((a, b) => lum(C[a * 3], C[a * 3 + 1], C[a * 3 + 2]) - lum(C[b * 3], C[b * 3 + 1], C[b * 3 + 2]));
    for (let j = 0; j < k; j++) { const v = order[Math.floor((j + 0.5) / k * nv)]; cent.push([C[v * 3], C[v * 3 + 1], C[v * 3 + 2]]); }
    const as = new Uint8Array(nv);
    for (let it = 0; it < 10; it++) {
      const acc = cent.map(() => [0, 0, 0, 0]);
      for (let v = 0; v < nv; v++) {
        let bj = 0, bd = 1e9; for (let j = 0; j < k; j++) { const c = cent[j], dr = C[v * 3] - c[0], dg = C[v * 3 + 1] - c[1], db = C[v * 3 + 2] - c[2], d = dr * dr * 0.8 + dg * dg + db * db * 0.6; if (d < bd) { bd = d; bj = j; } }
        as[v] = bj; const A = acc[bj]; A[0] += C[v * 3]; A[1] += C[v * 3 + 1]; A[2] += C[v * 3 + 2]; A[3]++;
      }
      for (let j = 0; j < k; j++) if (acc[j][3]) cent[j] = [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]];
    }
    const pal = new Float32Array(64), emis = new Float32Array(16);
    for (let v = 0; v < nv; v++) emis[as[v]] = Math.max(emis[as[v]], D.E[v]);
    for (let j = 0; j < 16; j++) { const c = cent[j - SLOT0] || [0.5, 0.5, 0.5]; pal[j * 4] = c[0]; pal[j * 4 + 1] = c[1]; pal[j * 4 + 2] = c[2]; pal[j * 4 + 3] = j >= SLOT0 && emis[j - SLOT0] > 0.05 ? 1.6 : 0; }
    const M = new Uint8Array(nv * 4);
    for (let v = 0; v < nv; v++) {
      const c = cent[as[v]], sh = lum(C[v * 3], C[v * 3 + 1], C[v * 3 + 2]) / lum(c[0], c[1], c[2]);
      M[v * 4] = SLOT0 + as[v]; M[v * 4 + 1] = clamp(Math.round(sh * 128), 30, 255); M[v * 4 + 2] = clamp(Math.round(D.S[v]), 0, 255); M[v * 4 + 3] = clamp(Math.round(D.E[v] * 255), 0, 255);
    }
    return { pal, M };
  }
  function normales(D) {
    const N = new Float32Array(D.nv * 3), P = D.P;
    for (let t = 0; t < D.I.length; t += 3) {
      const a = D.I[t] * 3, b = D.I[t + 1] * 3, c = D.I[t + 2] * 3;
      const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]], n = cross(e1, e2);
      for (const q of [a, b, c]) { N[q] += n[0]; N[q + 1] += n[1]; N[q + 2] += n[2]; }
    }
    // les sommets dédoublés par une couture de texture partagent leur normale
    const same = new Map(), key = k => Math.round(P[k * 3] * 1000) + ',' + Math.round(P[k * 3 + 1] * 1000) + ',' + Math.round(P[k * 3 + 2] * 1000);
    for (let k = 0; k < D.nv; k++) { const q = key(k), a = same.get(q); if (a) { a[0] += N[k * 3]; a[1] += N[k * 3 + 1]; a[2] += N[k * 3 + 2]; } else same.set(q, [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]]); }
    for (let k = 0; k < D.nv; k++) { const n = nrm(same.get(key(k))); N[k * 3] = n[0]; N[k * 3 + 1] = n[1]; N[k * 3 + 2] = n[2]; }
    return N;
  }

  /* ---------------- chaîne complète : fichier → modèle prêt à dessiner ---------------- */
  async function traiter(buf, o = {}) {
    const G = lire(buf), D = await collecter(G, o);
    const brut = { sommets: D.nv, triangles: D.I.length / 3, articulations: D.nJoints };
    normaliser(D, o);
    const J = articulations(D);
    // une peau trop peu reconnue ne sert à rien : tout passe au rig automatique
    if (D.nConnus < 8) for (let k = 0; k < D.nv; k++) D.FIX[k] = 0;
    alleger(D, o.triangles || 7000);
    rigAuto(D, J);
    const N = normales(D), { pal, M } = palette(D), inv = liaison(J);
    const Wb = new Uint8Array(D.nv * 4);
    for (let k = 0; k < D.nv; k++) {
      let s = 0; for (let j = 0; j < 4; j++) s += D.VW[k * 4 + j]; s = s || 1; let t = 0;
      for (let j = 0; j < 4; j++) { const w = Math.round(D.VW[k * 4 + j] / s * 255); Wb[k * 4 + j] = w; t += w; }
      Wb[k * 4] += 255 - t;
    }
    // triangles rangés par texture : un appel de dessin par texture
    const tris = []; for (let t = 0; t < D.I.length; t += 3) tris.push(t);
    tris.sort((a, b) => D.TX[D.I[a]] - D.TX[D.I[b]]);
    const I2 = new Uint32Array(D.I.length), groupes = [];
    tris.forEach((t, n) => {
      const tx = D.TX[D.I[t]], g = groupes[groupes.length - 1];
      if (!g || g.tex !== tx) groupes.push({ tex: tx, start: n * 3, count: 0 });
      groupes[groupes.length - 1].count += 3; I2[n * 3] = D.I[t]; I2[n * 3 + 1] = D.I[t + 1]; I2[n * 3 + 2] = D.I[t + 2];
    });
    D.I = I2;
    let ds = 0; for (let k = 0; k < D.nv; k++) ds |= D.DS[k];
    const info = Object.assign(brut, { textures: D.textures.length, final: D.I.length / 3, rig: D.nConnus >= 8 ? 'squelette du modèle (' + D.nConnus + ' os reconnus)' : 'automatique', pose: D.pose, taille: D.taille.map(v => +v.toFixed(2)) });
    return { nom: o.nom || 'modèle', info, nv: D.nv, pos: D.P, nrm: N, m4: M, j: D.VJ, w: Wb, idx: D.nv > 65535 ? D.I : Uint16Array.from(D.I), pal, inv, jp: J, uv: D.U, groupes, textures: D.textures, deuxFaces: !!ds };
  }

  /* ---------------- format compact (stockage sur l'appareil, modèles embarqués) ---------------- */
  function emballer(m) {
    const tx = m.textures || [];
    const head0 = { v: 3, nom: m.nom, info: m.info, nv: m.nv, ni: m.idx.length, i32: m.idx instanceof Uint32Array, pal: Array.from(m.pal), inv: Array.from(m.inv), groupes: m.groupes, deuxFaces: m.deuxFaces, tex: tx.map(t => ({ mime: t.mime, n: t.bytes.length })) };
    const nrm8 = new Int8Array(m.nv * 3); for (let k = 0; k < m.nv * 3; k++) nrm8[k] = clamp(Math.round(m.nrm[k] * 127), -127, 127);
    // positions et UV sur 16 bits, rapportées à leur boîte (1/20 de mm près pour un personnage)
    const q16 = (a, n) => { const mn = [], mx = []; for (let c = 0; c < n; c++) { mn[c] = 1e9; mx[c] = -1e9; } for (let k = 0; k < a.length; k++) { const c = k % n; if (a[k] < mn[c]) mn[c] = a[k]; if (a[k] > mx[c]) mx[c] = a[k]; }
      const o = new Uint16Array(a.length); for (let k = 0; k < a.length; k++) { const c = k % n, r = mx[c] - mn[c] || 1; o[k] = Math.round((a[k] - mn[c]) / r * 65535); } return { o, mn, mx }; };
    const qp = q16(m.pos, 3), qu = q16(m.uv, 2);
    head0.qp = [qp.mn, qp.mx]; head0.qu = [qu.mn, qu.mx];
    let hb = new TextEncoder().encode(JSON.stringify(head0)); const pad = (4 - (hb.length + 8) % 4) % 4;
    const parts = [new Uint8Array(qp.o.buffer), new Uint8Array(nrm8.buffer), m.m4, m.j, m.w, new Uint8Array(m.idx.buffer, m.idx.byteOffset, m.idx.byteLength), new Uint8Array(qu.o.buffer), ...tx.map(t => t.bytes)];
    let size = 8 + hb.length + pad; const offs = []; for (const p of parts) { size = (size + 3) & ~3; offs.push(size); size += p.length; }
    const out = new Uint8Array(size), dv = new DataView(out.buffer);
    out.set([0x4F, 0x46, 0x4D, 0x31]); dv.setUint32(4, hb.length + pad, true); out.set(hb, 8); for (let i = 0; i < pad; i++) out[8 + hb.length + i] = 32;
    parts.forEach((p, i) => out.set(p, offs[i]));
    return out.buffer;
  }
  function deballer(buf) {
    const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    if (dv.getUint32(0, true) !== 0x314D464F) throw new Error('données de modèle illisibles');
    const hl = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(u.subarray(8, 8 + hl)));
    let off = 8 + hl; const take = (Ctor, n, by) => { off = (off + 3) & ~3; const a = new Ctor(n); new Uint8Array(a.buffer).set(u.subarray(off, off + n * by)); off += n * by; return a; };
    const unq = (q, n, mn, mx) => { const o = new Float32Array(q.length); for (let k = 0; k < q.length; k++) { const c = k % n; o[k] = mn[c] + q[k] / 65535 * (mx[c] - mn[c]); } return o; };
    const pos = H.v >= 3 ? unq(take(Uint16Array, H.nv * 3, 2), 3, H.qp[0], H.qp[1]) : take(Float32Array, H.nv * 3, 4), n8 = take(Int8Array, H.nv * 3, 1), m4 = take(Uint8Array, H.nv * 4, 1), j = take(Uint8Array, H.nv * 4, 1), w = take(Uint8Array, H.nv * 4, 1);
    const idx = H.i32 ? take(Uint32Array, H.ni, 4) : take(Uint16Array, H.ni, 2), nrm = new Float32Array(H.nv * 3); for (let k = 0; k < nrm.length; k++) nrm[k] = n8[k] / 127;
    const uv = H.v >= 3 ? unq(take(Uint16Array, H.nv * 2, 2), 2, H.qu[0], H.qu[1]) : H.v >= 2 ? take(Float32Array, H.nv * 2, 4) : new Float32Array(H.nv * 2);
    const textures = (H.tex || []).map(t => ({ mime: t.mime, bytes: take(Uint8Array, t.n, 1) }));
    return { nom: H.nom, info: H.info, nv: H.nv, pos, nrm, m4, j, w, idx, uv, textures, groupes: H.groupes || [{ tex: -1, start: 0, count: H.ni }], deuxFaces: !!H.deuxFaces, pal: Float32Array.from(H.pal), inv: Float32Array.from(H.inv) };
  }
  function versB64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }

  /* ---------------- registre : modèles et rôles ---------------- */
  const modeles = new Map(); // id → { nom, m (données), g (GPU), src: 'embarque' | 'appareil' }
  let roles = {}, rolesEmb = {}, version = 1, statut = '';
  function role(cle) { const id = roles[cle] !== undefined ? roles[cle] : rolesEmb[cle]; return id && modeles.has(id) ? id : null; }
  function ajouter(id, m, src) { const e = { id, nom: m.nom, m, g: null, src }; modeles.set(id, e); if (gl) e.g = upload(m); version++; return e; }
  function lier(cle, id) { if (id) roles[cle] = id; else roles[cle] = ''; version++; sauverRoles(); }
  function sauverRoles() { try { localStorage.setItem(CLE_ROLES, JSON.stringify(roles)); } catch (e) { } }
  function chargerRoles() { try { roles = JSON.parse(localStorage.getItem(CLE_ROLES) || '{}') || {}; } catch (e) { roles = {}; } }
  // modèles importés sur cet appareil : IndexedDB (un modèle compact fait 100 à 300 Ko)
  function idb() { return new Promise((ok, ko) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('m', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); }
  async function idbTx(mode, f) { const db = await idb(); return new Promise((ok, ko) => { const tx = db.transaction('m', mode), st = tx.objectStore('m'), r = f(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => ko(tx.error); }); }
  async function chargerAppareil() {
    try {
      const all = await idbTx('readonly', st => st.getAll());
      for (const rec of all || []) { try { ajouter(rec.id, deballer(rec.data), 'appareil'); } catch (e) { } }
    } catch (e) { }
  }
  // importer un fichier GLB : traité, gardé sur l'appareil, puis donné au rôle demandé
  async function importer(buf, o = {}) {
    statut = 'Préparation du modèle…'; rafraichir();
    try {
      const m = await traiter(buf, o), id = 'm' + Date.now().toString(36), data = emballer(m);
      ajouter(id, deballer(data), 'appareil');
      try { await idbTx('readwrite', st => st.put({ id, nom: m.nom, data })); } catch (e) { }
      if (o.cle) lier(o.cle, id);
      statut = '« ' + m.nom + ' » prêt · ' + m.info.final + ' triangles · rig ' + m.info.rig;
      return { id, info: m.info };
    } catch (e) { statut = 'Échec : ' + (e && e.message || e); throw e; }
    finally { rafraichir(); }
  }
  async function oublier(id) { modeles.delete(id); for (const k in roles) if (roles[k] === id) roles[k] = ''; sauverRoles(); version++; try { await idbTx('readwrite', st => st.delete(id)); } catch (e) { } }
  // modèles livrés avec le jeu (src/js/10i_modeles_data.js, écrit par tools/modeles.js)
  let emb = null;
  function embarquer(E) { emb = E || null; }
  function installerEmbarques() {
    if (!emb) return;
    rolesEmb = Object.assign({}, emb.roles || {});
    // compressés en gzip par tools/modeles.js : décompressés en arrière-plan, l'apparence d'origine sert en attendant
    const ouvrir = async E => { let b = b64bytes(E.b64); if (E.gz) b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); return b.buffer; };
    for (const id in emb.modeles || {}) enCours.push(ouvrir(emb.modeles[id]).then(buf => ajouter(id, deballer(buf), 'embarque')).catch(e => console.warn('modèle embarqué illisible', id, e)));
  }

  /* ---------------- quel modèle pour quel personnage ---------------- */
  function pour(a) {
    if (!a || a.creature || !a.app) return null;
    if (a.__m3v !== version) {
      a.__m3v = version; a.__m3 = null;
      const keys = [];
      if (a.storyId) keys.push('pnj:' + a.storyId);
      if (typeof ETYPES !== 'undefined' && a.kind && ETYPES[a.kind] && a.team !== 'civ') keys.push('ennemi:' + a.kind);
      if (a.appKey) keys.push('apparence:' + a.appKey);
      for (const k of keys) { const id = role(k); if (id) { a.__m3 = modeles.get(id); break; } if (roles[k] === '' && k[0] === 'p') break; }
    }
    const e = a.__m3; return e && e.g ? e : null;
  }

  /* ---------------- GPU : même programme de peau que Folk ---------------- */
  let gl = null, tex = null, instBuf = null, instCap = 0, frame = 0, upFrame = -1, rows = 0, active = [], instData = new Float32Array(1024), dessines = 0;
  const MAXR = 128, TW = NB * 3 + 16, data = new Float32Array(TW * 4 * MAXR), skinM = M4.create();
  function initGPU() {
    if (!Gfx.gl || !Gfx.progs.skin) return false;
    gl = Gfx.gl; tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TW, MAXR, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    instBuf = gl.createBuffer(); instCap = 1024 * 16; gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, instCap, gl.DYNAMIC_DRAW);
    for (const e of modeles.values()) if (!e.g) e.g = upload(e.m);
    return true;
  }
  const enCours = [];
  const attendre = () => Promise.all(enCours.splice(0));
  function upload(M) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (loc, arr, size, type, norm) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); };
    buf(6, M.uv || new Float32Array(M.nv * 2), 2, gl.FLOAT, false); buf(0, M.pos, 3, gl.FLOAT, false); buf(1, M.nrm, 3, gl.FLOAT, false); buf(2, M.m4, 4, gl.UNSIGNED_BYTE, false); buf(3, M.j, 4, gl.UNSIGNED_BYTE, false); buf(4, M.w, 4, gl.UNSIGNED_BYTE, true);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, M.idx, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    const g = { vao, count: M.idx.length, type: M.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, by: M.idx instanceof Uint32Array ? 4 : 2, inst: [], off: 0,
      groupes: M.groupes || [{ tex: -1, start: 0, count: M.idx.length }], tex: (M.textures || []).map(() => null), deuxFaces: !!M.deuxFaces };
    // textures décodées en arrière-plan (blanc en attendant)
    (M.textures || []).forEach((t, i) => {
      if (typeof createImageBitmap === 'undefined') return;
      enCours.push(createImageBitmap(new Blob([t.bytes], { type: t.mime })).then(bmp => {
        const T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        g.tex[i] = T;
      }).catch(() => { }));
    });
    return g;
  }
  // programme : la peau GPU de Folk, plus une texture par groupe de triangles (lumière du décor inchangée)
  let prog = null, progLN = -1;
  function programme() {
    if (prog && progLN === Gfx.LN) return prog;
    const vs = SH.skinVS.replace('layout(location=5) in vec4 iD;', 'layout(location=5) in vec4 iD;\nlayout(location=6) in vec2 aT;')
      .replace(/vUv = vec4\(aM\.z[^;]*;/, 'vUv = vec4(aT, 0.0, 0.0);');
    // pas de salissures de mur sur les personnages
    const fs = SH.litFS.replace('base *= mix(1.0, contact * mix(0.74, 1.08, grime), wall);', '');
    prog = Gfx.program(vs, fs, { LN: Gfx.LN, ATLAS: 1, NBONES: NB }); progLN = Gfx.LN;
    return prog;
  }
  function begin() { rows = 0; for (const g of active) g.inst.length = 0; active.length = 0; frame++; }
  function ajouterInstance(a, W, e) {
    if (rows >= MAXR) return false;
    const row = rows++, o = row * TW * 4, inv = e.m.inv;
    for (let i = 0; i < NB; i++) {
      M4.mul(skinM, W[i], inv.subarray(i * 16, i * 16 + 16)); const q = o + i * 12;
      data[q] = skinM[0]; data[q + 1] = skinM[4]; data[q + 2] = skinM[8]; data[q + 3] = skinM[12];
      data[q + 4] = skinM[1]; data[q + 5] = skinM[5]; data[q + 6] = skinM[9]; data[q + 7] = skinM[13];
      data[q + 8] = skinM[2]; data[q + 9] = skinM[6]; data[q + 10] = skinM[10]; data[q + 11] = skinM[14];
    }
    data.set(e.m.pal, o + NB * 12);
    const g = e.g; if (!g.inst.length) active.push(g); g.inst.push(row, a.tint || 1, a.glow === undefined ? 1 : a.glow);
    return true;
  }
  function dessiner(vp, cam, clipY) {
    if (!gl || !active.length) return;
    if (upFrame !== frame) {
      upFrame = frame; dessines = rows;
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, Math.max(1, rows), gl.RGBA, gl.FLOAT, data, 0);
      let n = 0; for (const g of active) n += g.inst.length / 3;
      if (instData.length < n * 4) instData = new Float32Array(n * 8);
      let i = 0; for (const g of active) { g.off = i * 16; for (let k = 0; k < g.inst.length; k += 3) { instData[i * 4] = g.inst[k]; instData[i * 4 + 1] = g.inst[k + 1]; instData[i * 4 + 2] = g.inst[k + 2]; instData[i * 4 + 3] = 0; i++; } }
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      if (n * 16 > instCap) { instCap = n * 32; gl.bufferData(gl.ARRAY_BUFFER, instCap, gl.DYNAMIC_DRAW); }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, n * 4);
    }
    let pr; try { pr = programme(); } catch (e) { pr = Gfx.progs.skin; }
    Gfx.use(pr); Render.litGlobals(null, vp, cam, clipY); Gfx.f4('uMat', 30, 0.3, 0, 0); Gfx.f2('uCell', 1, 1);
    Gfx.t('uBones', tex); Gfx.t('uEmap', Gfx.black); Gfx.t('uNoise', typeof Tex !== 'undefined' && Tex.noise || Gfx.black);
    const lm = Gfx.cur.u.uMap, unit = Gfx.cur.tex++; if (lm) gl.uniform1i(lm, unit);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (const g of active) {
      gl.bindVertexArray(g.vao); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, g.off);
      if (g.deuxFaces) gl.disable(gl.CULL_FACE);
      for (const q of g.groupes) {
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, (q.tex >= 0 && g.tex[q.tex]) || Gfx.white);
        gl.drawElementsInstanced(gl.TRIANGLES, q.count, g.type, q.start * g.by, g.inst.length / 3);
      }
      if (g.deuxFaces) gl.enable(gl.CULL_FACE);
    }
    gl.bindVertexArray(null);
  }
  // position d'un sommet du modèle porté par un personnage (calculée comme le GPU : pour les tests)
  function sommet(a, k) {
    const e = pour(a); if (!e) return null; const W = CharRender.bones(a), m = e.m, out = [0, 0, 0];
    for (let j = 0; j < 4; j++) {
      const w = m.w[k * 4 + j] / 255; if (!w) continue; const b = m.j[k * 4 + j];
      M4.mul(skinM, W[b], m.inv.subarray(b * 16, b * 16 + 16)); const p = tp(skinM, m.pos[k * 3], m.pos[k * 3 + 1], m.pos[k * 3 + 2]);
      out[0] += p[0] * w; out[1] += p[1] * w; out[2] += p[2] * w;
    }
    return out;
  }

  /* ---------------- branchement dans le rendu des personnages ---------------- */
  function brancher() {
    const init = CharRender.init, beginC = CharRender.begin, draw = CharRender.draw;
    CharRender.init = function () { init.call(this); chargerRoles(); initGPU(); installerEmbarques(); chargerAppareil(); try { ecran(); } catch (e) { console.warn('écran Modèles 3D', e); } };
    CharRender.begin = function () { beginC.call(this); begin(); };
    CharRender.draw = function (a) {
      const e = gl && pour(a); if (!e) return draw.call(this, a);
      // le modèle remplace le corps et ses accessoires d'origine (parapluie, sac) : on garde l'arme et le calcul des mains, de la tête, du canon
      const A = a.app, look = A.look, parts = A.parts; A.look = null; A.parts = [];
      try { draw.call(this, a); } finally { A.look = look; A.parts = parts; }
      ajouterInstance(a, this.bw, e);
    };
    const fd = Folk.draw; Folk.draw = function (vp, cam, clipY) { fd.call(this, vp, cam, clipY); dessiner(vp, cam, clipY); };
  }

  /* ---------------- écran « Modèles 3D » (menu titre et pause) ---------------- */
  const ENNEMIS = [['thug', 'Brigands'], ['cultist', 'Enfants de la Marée'], ['merc', 'Mercenaires de la Sentinelle'], ['forgeron', 'Gang des Forges'], ['thugBoss', 'Chefs de bande (boss)'], ['mercBoss', 'Capitaines mercenaires (boss)'],
    ['colosse', 'Le Colosse (boss)'], ['herald', 'Le Héraut de la Marée (boss)'], ['leviathan', 'Le Léviathan (boss)'], ['drone', 'Golems d’entraînement'], ['hdrone', 'Golems déréglés']];
  let $root = null, $list = null, $stat = null, $rot = null, $tri = null, $file = null, cleImport = null;
  function lignes() {
    const L = [['Le joueur', [['apparence:hero', 'Le golem (joueur)']]]];
    const S = typeof STORY_NPCS !== 'undefined' ? STORY_NPCS : {};
    L.push(['Personnages du récit', Object.keys(S).map(id => ['pnj:' + id, S[id].name + (S[id].title ? ' · ' + S[id].title : '')])]);
    L.push(['Ennemis', ENNEMIS.map(([k, n]) => ['apparence:' + k, n])]);
    L.push(['Habitants', [['apparence:civ', 'Tous les habitants']]]);
    return L;
  }
  function rafraichir() {
    if (!$list) return;
    if ($stat) $stat.textContent = statut || (modeles.size ? modeles.size + ' modèle(s) disponible(s)' : 'Aucun modèle importé pour l’instant');
    if ($root && $root.hidden) return;
    const opts = [['', '— apparence d’origine —'], ...[...modeles.values()].map(e => [e.id, e.nom + (e.src === 'embarque' ? ' (livré)' : '')])];
    $list.textContent = '';
    for (const [titre, rows2] of lignes()) {
      const h = document.createElement('div'); h.className = 'dhead'; h.textContent = titre; $list.appendChild(h);
      for (const [cle, nom] of rows2) {
        const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.08)';
        const n = document.createElement('div'); n.textContent = nom; n.style.cssText = 'flex:1 1 180px;min-width:0';
        const sel = document.createElement('select'); sel.style.cssText = 'flex:0 1 210px;max-width:100%;background:#1b1712;color:#e9d8a6;border:1px solid #6b5a3a;padding:4px';
        const cur = role(cle) || '';
        for (const [v, t] of opts) { const op = document.createElement('option'); op.value = v; op.textContent = t; if (v === cur) op.selected = true; sel.appendChild(op); }
        sel.addEventListener('change', () => { lier(cle, sel.value); statut = ''; rafraichir(); });
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Importer un GLB…';
        b.addEventListener('click', () => { cleImport = cle; $file.value = ''; $file.click(); });
        r.append(n, sel, b); $list.appendChild(r);
      }
    }
    const own = [...modeles.values()].filter(e => e.src === 'appareil');
    if (own.length) {
      const h = document.createElement('div'); h.className = 'dhead'; h.textContent = 'Modèles importés'; $list.appendChild(h);
      for (const e of own) {
        const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:8px;align-items:center;padding:5px 0';
        const n = document.createElement('div'); n.style.cssText = 'flex:1;min-width:0'; n.textContent = e.nom + ' · ' + (e.m.info ? e.m.info.final + ' triangles, rig ' + e.m.info.rig : '');
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Supprimer'; b.addEventListener('click', async () => { await oublier(e.id); statut = ''; rafraichir(); });
        r.append(n, b); $list.appendChild(r);
      }
    }
    if (typeof Menus !== 'undefined' && Menus.cur === 'scr-modeles') Menus.collect($root);
  }
  function ecran() {
    if (typeof document === 'undefined' || !document.body || document.getElementById('scr-modeles')) return;
    $root = document.createElement('div'); $root.className = 'screen scrim-full'; $root.id = 'scr-modeles'; $root.hidden = true;
    $root.innerHTML = '<div class="wrap"><h2 class="sh">Modèles 3D</h2><div class="sub">Un fichier .glb (Kimi 3D, Meshy, Tripo, Blender…) par personnage : il est posé sur le squelette du jeu et reprend toutes ses animations</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0;font-size:.9em">Le modèle regarde <select id="m3-rot" style="background:#1b1712;color:#e9d8a6;border:1px solid #6b5a3a;padding:3px"><option value="0">vers l’avant (+Z, normal)</option><option value="180">vers l’arrière</option><option value="90">vers la gauche</option><option value="-90">vers la droite</option></select>'
      + 'Détail <select id="m3-tri" style="background:#1b1712;color:#e9d8a6;border:1px solid #6b5a3a;padding:3px"><option value="4000">léger (téléphone)</option><option value="7000" selected>normal</option><option value="14000">fin (PC)</option></select></div>'
      + '<div class="sub" id="m3-stat" style="min-height:1.3em"></div><div class="dscroll" id="m3-list"></div>'
      + '<div class="row-btns" style="margin-top:14px"><button class="btn" data-act="back">Retour</button></div></div>';
    const anchor = document.getElementById('scr-gear') || document.getElementById('scr-options');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore($root, anchor.nextSibling); else document.body.appendChild($root);
    $list = $root.querySelector('#m3-list'); $stat = $root.querySelector('#m3-stat'); $rot = $root.querySelector('#m3-rot'); $tri = $root.querySelector('#m3-tri');
    $file = document.createElement('input'); $file.type = 'file'; $file.accept = '.glb,.gltf,model/gltf-binary,model/gltf+json'; $file.hidden = true; $root.appendChild($file);
    $file.addEventListener('change', async () => {
      const f = $file.files && $file.files[0]; if (!f) return;
      try { await importer(await f.arrayBuffer(), { cle: cleImport, nom: f.name.replace(/\.(glb|gltf)$/i, ''), tourner: +$rot.value, triangles: +$tri.value }); } catch (e) { }
    });
    if (typeof Menus !== 'undefined') {
      if (Menus.screens.indexOf('scr-modeles') < 0) Menus.screens.push('scr-modeles');
      const show = Menus.show; Menus.show = function (id, push) { const r = show.call(this, id, push); if (id === 'scr-modeles') { statut = ''; rafraichir(); } return r; };
    }
    for (const [menu, avant] of [['menu-title', 'controls'], ['menu-pause', 'controls']]) {
      const nav = document.getElementById(menu); if (!nav) continue;
      const b = document.createElement('button'); b.className = 'mi'; b.dataset.go = 'modeles'; b.innerHTML = 'Modèles 3D<small>PNJ et ennemis importés (.glb)</small>';
      if (menu === 'menu-pause') b.textContent = 'Modèles 3D';
      const ref = nav.querySelector('[data-go="' + avant + '"]'); nav.insertBefore(b, ref || null);
      b.addEventListener('click', () => { if (typeof Menus !== 'undefined') Menus.show('scr-modeles'); });
    }
  }

  brancher();
  const M3 = { traiter, importer, lier, oublier, role, pour, sommet, embarquer, emballer, deballer, versB64, osDuNom, modeles, get roles() { return roles; }, get statut() { return statut; }, attendre, stats: () => ({ modeles: modeles.size, dessines, version }), ajouterTraite: (id, m, src) => ajouter(id, deballer(emballer(m)), src || 'appareil') };
  if (typeof window !== 'undefined') window.Modeles3D = M3;
  return M3;
})();
