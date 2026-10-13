/* =====================================================================
   PROCEDURAL TEXTURES (canvas)
   ===================================================================== */
// main atlas cells (col,row) — row counted from the bottom (textures are uploaded flipped)
// 8 × 4 cells: the original 16 in columns 0-3, the new district materials in columns 4-7
const CELL = {
  plain: [0, 0], brick: [1, 0], plaster: [2, 0], concrete: [3, 0],
  glass: [0, 1], industrial: [1, 1], shop: [2, 1], roof: [3, 1],
  container: [0, 2], rough: [1, 2], fence: [2, 2], metal: [3, 2],
  wood: [0, 3], shutter: [1, 3], brick2: [2, 3], tower: [3, 3],
  tenement: [4, 0], hlm: [5, 0], stone: [6, 0], lantern: [7, 0],
  hospital: [4, 1], office: [5, 1], house: [6, 1], tiles: [7, 1],
  corrugated: [4, 2], seats: [5, 2], tank: [6, 2], marble: [7, 2],
  warehouse: [4, 3], glassroof: [5, 3], mall: [6, 3], graffiti: [7, 3]
};
const ACOLS = 8, AROWS = 4;
// shop sign boxes: text, L = lit panel with dark letters / D = dark board with glowing letters, letter colour, panel colour
const SHOP_BOARDS = [
  ['BOULANGERIE', 'L', '#6b3f1d', '#f3e2c0'], ['LA MIE DU PORT', 'L', '#7a2c1a', '#f6e7cf'], ['PHARMACIE', 'L', '#12894a', '#eef6ef'], ['TABAC · PRESSE', 'D', '#ff5a4a', '#1a0f10'],
  ['BAR DU PORT', 'D', '#ffb04a', '#1b120c'], ['CAFÉ DES AMARRES', 'D', '#ffd27a', '#20160e'], ['ÉPICERIE FINE', 'L', '#2d4a2a', '#e8e4cf'], ['PRIMEUR', 'L', '#2e6b1f', '#eef3dc'],
  ['BOUCHERIE', 'L', '#9a1b1b', '#f4e9e4'], ['POISSONNERIE', 'L', '#16507a', '#e3eef5'], ['L’HAMEÇON D’OR', 'D', '#ffd34a', '#0f1a24'], ['FLEURISTE', 'L', '#a8326e', '#f7e8ef'],
  ['LIBRAIRIE', 'L', '#2b2b5a', '#efe9da'], ['PRESSING', 'L', '#1f5fa8', '#eaf2fb'], ['LAVERIE', 'D', '#5ab8ff', '#0c1522'], ['TIF’ANNIE COIFFURE', 'D', '#ff7ac8', '#1c0f18'],
  ['BARBIER', 'D', '#e8e8e8', '#101012'], ['OPTIQUE', 'L', '#1d3f6e', '#f0f3f6'], ['BIJOUTERIE', 'D', '#ffd98a', '#141014'], ['CORDONNERIE', 'L', '#5a3b22', '#eee2cc'],
  ['QUINCAILLERIE', 'L', '#2a2a2a', '#f0c94a'], ['TÉLÉPHONIE', 'L', '#f4f4f8', '#c8262c'], ['PHOTO EXPRESS', 'L', '#1a1a1a', '#ffd23a'], ['TATOUAGE', 'D', '#ff4a4a', '#0e0e10'],
  ['KEBAB DU QUAI', 'D', '#ffd23f', '#2a0e0a'], ['À L’EAU PIZZA', 'L', '#b3261e', '#f5ecd8'], ['SUSHI BAR', 'D', '#7dffb0', '#0b1612'], ['BRASSERIE', 'D', '#ffe0a0', '#231a10'],
  ['CRÊPERIE', 'L', '#1f4f8a', '#f7eed9'], ['CAVE À VINS', 'D', '#e0a0c8', '#1e0c16'], ['FROMAGERIE', 'L', '#6a4e12', '#f6ecc6'], ['SUPÉRETTE 24/24', 'L', '#ffffff', '#1f8a3a'],
  ['AUTO-ÉCOLE', 'L', '#ffffff', '#1f55b0'], ['AGENCE IMMOBILIÈRE', 'L', '#243a5a', '#f2f2ee'], ['BANQUE DU LITTORAL', 'L', '#ffffff', '#1c3f66'], ['ASSURANCES', 'L', '#2a2a2a', '#dfe6ea'],
  ['CYCLES', 'L', '#1a1a1a', '#f2b33a'], ['MERCERIE', 'L', '#7a2d5a', '#f5eef0'], ['ANTIQUAIRE', 'D', '#e6d2a0', '#15110c'], ['DISQUAIRE', 'D', '#ff8a3d', '#101014'],
  ['PÂTISSERIE', 'L', '#b04a7a', '#fbeff3'], ['SALON DE THÉ', 'D', '#ffc85a', '#1a120a'], ['CYBER-CAFÉ', 'D', '#3dffcf', '#081414'], ['PRÊTEUR SUR GAGES', 'D', '#ffcf3a', '#16120a'],
  ['CHAUSSURES', 'L', '#222222', '#e9e4dc'], ['LE PHARE OUEST', 'D', '#ff9a3a', '#170c08'], ['MARÉE BASSE · BAR', 'D', '#4fd8ff', '#0a1218'], ['PARFUMERIE', 'L', '#6a3a8a', '#f4eef8']
];
// ground atlas 4 × 4
const GCELL = { asphalt: [0, 0], pavers: [1, 0], cobble: [0, 1], plain: [1, 1], grass: [2, 0], sand: [3, 0], gravel: [2, 1], parking: [3, 1], tracks: [0, 2], deck: [1, 2], tiles: [2, 2], soil: [3, 2], court: [0, 3], runtrack: [1, 3], pitch: [2, 3], pond: [3, 3] };
const FONTS = {
  display: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif',
  ui: '"Barlow Semi Condensed", "Arial Narrow", Arial, sans-serif',
  neon: '"Tilt Neon", "Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
  tag: '"Permanent Marker", "Comic Sans MS", "Marker Felt", cursive',
  mono: '"IBM Plex Mono", Menlo, Consolas, monospace'
};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgba(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }

function tileNoise(size, period, rnd) {
  const lat = new Float32Array(period * period); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * period, fy = y / size * period; const ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const x0 = ix % period, y0 = iy % period, x1 = (ix + 1) % period, y1 = (iy + 1) % period;
    const a = lat[y0 * period + x0], b = lat[y0 * period + x1], c = lat[y1 * period + x0], d = lat[y1 * period + x1];
    out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  }
  return out;
}
function fbmNoise(size, basePeriod, oct, rnd) {
  const out = new Float32Array(size * size); let amp = 0.5, tot = 0, p = basePeriod;
  for (let o = 0; o < oct; o++) { const n = tileNoise(size, p, rnd); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; amp *= 0.5; p *= 2; if (p > size) break; }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

const Tex = {
  lowRes: false,
  async fontsReady() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = ['700 40px "Big Shoulders Display"', '900 40px "Big Shoulders Display"', '600 30px "Barlow Semi Condensed"', '400 40px "Tilt Neon"', '400 40px "Permanent Marker"', '400 20px "IBM Plex Mono"']
      .map(f => document.fonts.load(f).catch(() => null));
    await Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 2500))]);
  },
  build() {
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent) || ('ontouchstart' in window);
    const S = this.lowRes ? 256 : mobile ? 384 : 512;
    this.S = S;
    // albedo at full resolution, lit windows (emissive) at half resolution
    const A = mkCanvas(S * ACOLS, S * AROWS), E = mkCanvas(S * ACOLS / 2, S * AROWS / 2);
    const a = A.getContext('2d'), e = E.getContext('2d');
    e.fillStyle = '#000'; e.fillRect(0, 0, E.width, E.height); e.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const rnd = mulberry32(777);
    const cellXY = (c) => [c[0] * S, (AROWS - 1 - c[1]) * S];
    const draw = (cell, fn) => { const [x, y] = cellXY(cell); a.save(); e.save(); a.beginPath(); a.rect(x, y, S, S); a.clip(); e.beginPath(); e.rect(x, y, S, S); e.clip(); a.translate(x, y); e.translate(x, y); fn(a, e, S, rnd); a.restore(); e.restore(); };
    draw(CELL.plain, (a) => { a.fillStyle = '#fff'; a.fillRect(0, 0, S, S); });
    draw(CELL.brick, (a, e) => this.facade(a, e, S, rnd, 'brick'));
    draw(CELL.brick2, (a, e) => this.facade(a, e, S, rnd, 'brick2'));
    draw(CELL.plaster, (a, e) => this.facade(a, e, S, rnd, 'plaster'));
    draw(CELL.concrete, (a, e) => this.facade(a, e, S, rnd, 'concrete'));
    draw(CELL.glass, (a, e) => this.facade(a, e, S, rnd, 'glass'));
    draw(CELL.tower, (a, e) => this.facade(a, e, S, rnd, 'tower'));
    draw(CELL.industrial, (a, e) => this.facade(a, e, S, rnd, 'industrial'));
    draw(CELL.shop, (a, e) => this.shops(a, e, S, rnd));
    draw(CELL.roof, (a) => this.roof(a, S, rnd));
    draw(CELL.container, (a) => this.container(a, S, rnd));
    draw(CELL.rough, (a) => this.rough(a, S, rnd, '#9a9a96'));
    draw(CELL.fence, (a) => this.fence(a, S));
    draw(CELL.metal, (a) => this.metal(a, S, rnd));
    draw(CELL.wood, (a) => this.wood(a, S, rnd));
    draw(CELL.shutter, (a) => this.shutter(a, S, rnd));
    // new district materials (separate random stream: the original cells stay identical)
    const rnd2 = mulberry32(9090);
    const draw2 = (cell, fn) => draw(cell, (a, e) => fn(a, e, S, rnd2));
    draw2(CELL.tenement, (a, e, S, r) => this.tenement(a, e, S, r));
    draw2(CELL.hlm, (a, e, S, r) => this.hlm(a, e, S, r));
    draw2(CELL.stone, (a, e, S, r) => this.stone(a, e, S, r));
    draw2(CELL.lantern, (a, e, S, r) => this.lanternFacade(a, e, S, r));
    draw2(CELL.hospital, (a, e, S, r) => this.hospitalFacade(a, e, S, r));
    draw2(CELL.office, (a, e, S, r) => this.office(a, e, S, r));
    draw2(CELL.house, (a, e, S, r) => this.house(a, e, S, r));
    draw2(CELL.tiles, (a, e, S, r) => this.roofTiles(a, S, r));
    draw2(CELL.corrugated, (a, e, S, r) => this.corrugated(a, S, r));
    draw2(CELL.seats, (a, e, S, r) => this.seats(a, S, r));
    draw2(CELL.tank, (a, e, S, r) => this.tankTex(a, S, r));
    draw2(CELL.marble, (a, e, S, r) => this.marble(a, S, r));
    draw2(CELL.warehouse, (a, e, S, r) => this.warehouse(a, e, S, r));
    draw2(CELL.glassroof, (a, e, S, r) => this.glassroof(a, e, S, r));
    draw2(CELL.mall, (a, e, S, r) => this.mallFacade(a, e, S, r));
    draw2(CELL.graffiti, (a, e, S, r) => this.graffitiWall(a, S, r));
    this.atlas = Gfx.texCanvas(A, { aniso: true });
    this.eatlas = Gfx.texCanvas(E, {});
    const GA = this.groundAtlas(S);
    this.ground = Gfx.texCanvas(GA, { aniso: true });
    // relief + gloss maps (half resolution) for the medium / high settings
    this.natlas = Gfx.bakeNormals(this.atlas, A.width >> 1, A.height >> 1, 1.3, 1);
    this.nground = Gfx.bakeNormals(this.ground, GA.width >> 1, GA.height >> 1, 1.0, 1);
    this.noise = Gfx.texCanvas(this.noiseTex(), { mips: true });
    this.parts = Gfx.texCanvas(this.particleAtlas(), { clamp: true });
    this.radial = Gfx.texCanvas(this.radialTex(), { clamp: true });
    this.cone = Gfx.texCanvas(this.coneTex(), { clamp: true });
    this.streak = Gfx.texCanvas(this.streakTex(), { clamp: true });
    this.glare = Gfx.texCanvas(this.glareTex(), { clamp: true });
    this.buildNeon();
  },
  facade(a, e, S, rnd, style) {
    const cw = S / 8, fh = S / 8; // column width (3 m), floor height (3.2 m)
    const noise = (col, amt, n) => { for (let i = 0; i < n; i++) { a.fillStyle = rgba(col, col, col, rnd() * amt); a.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); } };
    const warm = ['#ffcc80', '#ffd79a', '#ffe2b0', '#ffc070', '#ffb45e'], cool = ['#cfe0ff', '#b9d0ff', '#e6f0ff'], odd = ['#7fb2ff', '#ff9ad0', '#9affd8'];
    const litColor = () => { const r = rnd(); return r < 0.72 ? warm[Math.floor(rnd() * warm.length)] : r < 0.93 ? cool[Math.floor(rnd() * cool.length)] : odd[Math.floor(rnd() * odd.length)]; };
    const litWin = (x, y, w, h, prob) => {
      if (rnd() > prob) return;
      const c = litColor(); e.fillStyle = c; e.globalAlpha = 0.4 + rnd() * 0.4; e.fillRect(x, y, w, h);
      // curtains / blinds
      const k = rnd();
      e.globalAlpha = 1; e.fillStyle = 'rgba(0,0,0,0.55)';
      if (k < 0.3) { e.fillRect(x, y, w * (0.15 + rnd() * 0.25), h); e.fillRect(x + w * (0.75 - rnd() * 0.2), y, w, h); }
      else if (k < 0.5) { for (let yy = y; yy < y + h; yy += 4) e.fillRect(x, yy, w, 1.5); }
      else if (k < 0.6) { e.fillRect(x, y, w, h * (0.3 + rnd() * 0.5)); }
      e.globalAlpha = 1;
      // albedo gets a light tint too
      a.fillStyle = c; a.globalAlpha = 0.25; a.fillRect(x, y, w, h); a.globalAlpha = 1;
    };
    const glassFill = (x, y, w, h) => { const g = a.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2a3446'); g.addColorStop(1, '#0d111a'); a.fillStyle = g; a.fillRect(x, y, w, h); };
    if (style === 'brick' || style === 'brick2') {
      a.fillStyle = style === 'brick' ? '#b9aca0' : '#a7a19a'; a.fillRect(0, 0, S, S);
      const bh = S / 64; a.fillStyle = 'rgba(40,30,25,0.35)';
      for (let row = 0; row < 64; row++) { a.fillRect(0, row * bh, S, 1); const off = (row % 2) * (S / 64); for (let x = off; x < S; x += S / 32) a.fillRect(x, row * bh, 1, bh); }
      for (let i = 0; i < 900; i++) { const v = 90 + rnd() * 80; a.fillStyle = rgba(v, v * 0.85, v * 0.75, 0.18); a.fillRect(Math.floor(rnd() * 32) * S / 32, Math.floor(rnd() * 64) * bh, S / 32, bh); }
      for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) {
        const x = cx * cw + cw * 0.24, y = fy * fh + fh * 0.18, w = cw * 0.52, h = fh * 0.6;
        a.fillStyle = '#d8d0c4'; a.fillRect(x - 3, y - 6, w + 6, 6); a.fillRect(x - 4, y + h, w + 8, 4);
        glassFill(x, y, w, h); a.fillStyle = 'rgba(200,190,170,0.5)'; a.fillRect(x + w / 2 - 1, y, 2, h); a.fillRect(x, y + h * 0.4, w, 2);
        litWin(x + 1, y + 1, w - 2, h - 2, style === 'brick' ? 0.36 : 0.3);
        if (style === 'brick2' && fy % 2 === 1 && rnd() < 0.5) { a.fillStyle = '#2b2b2e'; a.fillRect(x - 8, y + h + 4, w + 16, 3); for (let bx = x - 8; bx < x + w + 8; bx += 4) a.fillRect(bx, y + h - 10, 1.5, 14); }
      }
      noise(0, 0.25, 1400);
    } else if (style === 'plaster') {
      a.fillStyle = '#d6cfc4'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) { a.fillStyle = rgba(120, 110, 100, rnd() * 0.12); const w = 20 + rnd() * 80; a.fillRect(rnd() * S, rnd() * S, w, w * (0.3 + rnd())); }
      for (let fy = 0; fy < 8; fy++) {
        a.fillStyle = 'rgba(90,80,70,0.25)'; a.fillRect(0, fy * fh + fh - 3, S, 3);
        for (let cx = 0; cx < 8; cx++) {
          const x = cx * cw + cw * 0.3, y = fy * fh + fh * 0.14, w = cw * 0.4, h = fh * 0.7;
          glassFill(x, y, w, h);
          a.fillStyle = 'rgba(230,225,215,0.7)'; a.fillRect(x + w / 2 - 1, y, 2, h);
          litWin(x + 1, y + 1, w - 2, h - 2, 0.34);
          const shut = rnd();
          if (shut < 0.35) { // closed shutters (volets)
            a.fillStyle = '#6f7d73'; a.fillRect(x - 1, y, w + 2, h); a.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy = y; yy < y + h; yy += 3) a.fillRect(x - 1, yy, w + 2, 1);
            e.fillStyle = '#000'; e.fillRect(x - 1, y, w + 2, h);
            if (rnd() < 0.3) { e.fillStyle = 'rgba(255,190,110,0.5)'; for (let yy = y; yy < y + h; yy += 3) e.fillRect(x, yy + 1, w, 1); }
          } else { // open shutters on the sides
            a.fillStyle = '#6f7d73'; a.fillRect(x - w * 0.5 - 2, y, w * 0.5, h); a.fillRect(x + w + 2, y, w * 0.5, h);
            a.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy = y; yy < y + h; yy += 3) { a.fillRect(x - w * 0.5 - 2, yy, w * 0.5, 1); a.fillRect(x + w + 2, yy, w * 0.5, 1); }
          }
          if (fy > 0 && rnd() < 0.25) { a.fillStyle = '#2a2a2c'; a.fillRect(x - 4, y + h - 12, w + 8, 2); for (let bx = x - 4; bx <= x + w + 4; bx += 3) a.fillRect(bx, y + h - 12, 1, 12); }
        }
      }
      noise(60, 0.2, 1200);
    } else if (style === 'concrete') {
      a.fillStyle = '#b4b3ae'; a.fillRect(0, 0, S, S);
      a.fillStyle = 'rgba(60,60,60,0.35)'; for (let cx = 0; cx <= 8; cx += 2) a.fillRect(cx * cw, 0, 1.5, S);
      for (let fy = 0; fy < 8; fy++) {
        const y = fy * fh + fh * 0.3, h = fh * 0.46;
        a.fillStyle = 'rgba(40,40,40,0.4)'; a.fillRect(0, fy * fh, S, 2);
        glassFill(0, y, S, h);
        a.fillStyle = 'rgba(160,160,160,0.8)'; for (let cx = 0; cx < 16; cx++) a.fillRect(cx * cw / 2, y, 3, h);
        for (let cx = 0; cx < 16; cx++) litWin(cx * cw / 2 + 3, y + 1, cw / 2 - 4, h - 2, 0.3);
      }
      noise(40, 0.25, 1600);
    } else if (style === 'glass' || style === 'tower') {
      const g = a.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#34425a'); g.addColorStop(0.5, '#1c2433'); g.addColorStop(1, '#2d3950'); a.fillStyle = g; a.fillRect(0, 0, S, S);
      for (let fy = 0; fy < 8; fy++) {
        const floorLit = rnd();
        for (let cx = 0; cx < 16; cx++) {
          const x = cx * cw / 2, y = fy * fh;
          if (floorLit < (style === 'tower' ? 0.55 : 0.45)) {
            if (rnd() < 0.8) { const c = rnd() < 0.8 ? '#dfe9ff' : '#ffe8c4'; e.fillStyle = c; e.globalAlpha = 0.5 + rnd() * 0.4; e.fillRect(x + 2, y + fh * 0.12, cw / 2 - 3, fh * 0.7); e.globalAlpha = 1; }
          } else if (rnd() < 0.08) { e.fillStyle = '#bcd2ff'; e.globalAlpha = 0.6; e.fillRect(x + 2, y + fh * 0.12, cw / 2 - 3, fh * 0.7); e.globalAlpha = 1; }
        }
        a.fillStyle = style === 'tower' ? '#0e1219' : '#5d6878'; a.fillRect(0, fy * fh, S, fh * 0.1);
        e.fillStyle = '#000'; e.fillRect(0, fy * fh, S, fh * 0.1);
      }
      a.fillStyle = style === 'tower' ? '#566273' : '#6d7888'; for (let cx = 0; cx < 16; cx++) a.fillRect(cx * cw / 2, 0, 2, S);
      if (style === 'tower') { e.fillStyle = 'rgba(120,200,255,0.35)'; for (let fy = 0; fy < 8; fy++) e.fillRect(0, fy * fh, S, 1.5); }
    } else if (style === 'industrial') {
      a.fillStyle = '#8f9396'; a.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 8) { a.fillStyle = 'rgba(255,255,255,0.12)'; a.fillRect(x, 0, 3, S); a.fillStyle = 'rgba(0,0,0,0.18)'; a.fillRect(x + 4, 0, 2, S); }
      for (let i = 0; i < 40; i++) { a.fillStyle = rgba(110, 70, 40, rnd() * 0.25); a.fillRect(rnd() * S, rnd() * S, 3 + rnd() * 10, 10 + rnd() * 60); }
      for (let cx = 0; cx < 8; cx++) { const x = cx * cw + cw * 0.15, y = fh * 0.2, w = cw * 0.7, h = fh * 0.35; glassFill(x, y, w, h); litWin(x, y, w, h, 0.25); }
      noise(30, 0.2, 900);
    }
  },
  shops(a, e, S, rnd) {
    const W = S / 4; // one shop = 6 m wide, cell height = 4.2 m (the lit sign boxes above the fronts are separate boards)
    const pal = ['#ffb35a', '#7fb8ff', '#ff7fc0', '#6fffb0', '#ffd36a', '#ff7a4a', '#ffe0a0', '#8fd8ff'];
    a.fillStyle = '#6d6862'; a.fillRect(0, 0, S, S); this.shopSlots = [];
    for (let k = 0; k < 4; k++) {
      const x = k * W; const kind = rnd();
      a.fillStyle = '#2a2826'; a.fillRect(x, 0, W, S * 0.2); // sign band
      a.fillStyle = '#403c38'; a.fillRect(x, S * 0.2, 4, S); a.fillRect(x + W - 4, S * 0.2, 4, S);
      this.shopSlots.push({ open: kind >= 0.25 });
      if (kind < 0.25) { // rolling shutter (closed)
        a.fillStyle = '#8b8e90'; a.fillRect(x + 6, S * 0.22, W - 12, S * 0.78);
        a.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = S * 0.22; y < S; y += 7) a.fillRect(x + 6, y, W - 12, 2);
        a.save(); a.font = `${S * 0.07}px ${FONTS.tag}`; a.fillStyle = ['#2ef2b0', '#ff8a1f', '#e0e0e0', '#ff4f8a'][Math.floor(rnd() * 4)]; a.globalAlpha = 0.85;
        a.translate(x + W / 2, S * 0.62); a.rotate(-0.12); a.textAlign = 'center'; a.fillText(['MARÉE', 'RATS', 'ZK', 'NOX', 'ÉCUME'][Math.floor(rnd() * 5)], 0, 0); a.restore();
      } else {
        const c = pal[Math.floor(rnd() * pal.length)];
        const gx = x + 8, gy = S * 0.26, gw = W - 16, gh = S * 0.6;
        a.fillStyle = '#141820'; a.fillRect(gx, gy, gw, gh);
        const g = e.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0.7)');
        e.fillStyle = g; e.globalAlpha = 0.5; e.fillRect(gx, gy, gw, gh); e.globalAlpha = 1;
        // shelves, displays, a few silhouettes
        e.fillStyle = 'rgba(0,0,0,0.45)'; for (let s = 0; s < 3; s++) e.fillRect(gx, gy + gh * (0.3 + s * 0.22), gw, 3);
        for (let s = 0; s < 6; s++) e.fillRect(gx + rnd() * gw, gy + gh * (0.3 + rnd() * 0.5), 6 + rnd() * 10, 10 + rnd() * 20);
        if (rnd() < 0.5) { e.fillStyle = 'rgba(0,0,0,0.55)'; const px = gx + gw * (0.1 + rnd() * 0.4); e.fillRect(px, gy + gh * 0.45, gw * 0.07, gh * 0.55); e.beginPath(); e.arc(px + gw * 0.035, gy + gh * 0.4, gw * 0.035, 0, TAU); e.fill(); }
        // window lettering (hours) and the door
        a.fillStyle = 'rgba(255,255,255,0.35)'; a.fillRect(gx + gw * 0.08, gy + gh * 0.08, gw * 0.3, 2); a.fillRect(gx + gw * 0.08, gy + gh * 0.12, gw * 0.22, 2);
        a.fillStyle = '#23262c'; a.fillRect(x + W * 0.62, S * 0.3, W * 0.26, S * 0.7);
        e.fillStyle = 'rgba(0,0,0,1)'; e.fillRect(x + W * 0.62, S * 0.3, W * 0.26, S * 0.7);
        e.fillStyle = c; e.globalAlpha = 0.35; e.fillRect(x + W * 0.64, S * 0.33, W * 0.22, S * 0.35); e.globalAlpha = 1;
      }
    }
    for (let i = 0; i < 800; i++) { a.fillStyle = rgba(0, 0, 0, rnd() * 0.2); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
  },
  roof(a, S, rnd) {
    a.fillStyle = '#4a4a4c'; a.fillRect(0, 0, S, S);
    for (let i = 0; i < 6000; i++) { const v = 40 + rnd() * 60; a.fillStyle = rgba(v, v, v + 4, 0.6); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
    a.fillStyle = 'rgba(20,20,22,0.5)'; for (let x = 0; x < S; x += S / 4) a.fillRect(x, 0, 3, S);
    for (let i = 0; i < 20; i++) { a.fillStyle = rgba(15, 15, 18, 0.35); const r = 10 + rnd() * 40; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, r, r * 0.6, rnd() * 3, 0, TAU); a.fill(); }
  },
  container(a, S, rnd) {
    a.fillStyle = '#c9c9c9'; a.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += S / 24) { a.fillStyle = 'rgba(255,255,255,0.35)'; a.fillRect(x, 0, S / 60, S); a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(x + S / 40, 0, S / 80, S); }
    a.fillStyle = 'rgba(0,0,0,0.45)'; a.fillRect(0, 0, S, S * 0.04); a.fillRect(0, S * 0.96, S, S * 0.04);
    for (let i = 0; i < 80; i++) { a.fillStyle = rgba(90, 50, 20, rnd() * 0.3); a.fillRect(rnd() * S, rnd() * S, 4 + rnd() * 20, 2 + rnd() * 30); }
    a.save(); a.fillStyle = 'rgba(255,255,255,0.8)'; a.font = `700 ${S * 0.09}px ${FONTS.ui}`; a.fillText('SALINE LINES', S * 0.08, S * 0.2);
    a.font = `600 ${S * 0.045}px ${FONTS.mono}`; a.fillText('SLNU 407 226 1', S * 0.08, S * 0.28); a.restore();
  },
  rough(a, S, rnd, base) {
    a.fillStyle = base; a.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) { const v = 100 + rnd() * 100; a.fillStyle = rgba(v, v, v, 0.25); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
    for (let i = 0; i < 30; i++) { a.fillStyle = rgba(30, 30, 30, rnd() * 0.2); const r = 20 + rnd() * 60; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, r, r * 0.5, rnd() * 3, 0, TAU); a.fill(); }
  },
  fence(a, S) {
    a.clearRect(0, 0, S, S);
    a.strokeStyle = 'rgba(200,205,210,1)'; a.lineWidth = Math.max(1.5, S / 256);
    const step = S / 12;
    for (let k = -12; k <= 24; k++) { a.beginPath(); a.moveTo(k * step, 0); a.lineTo(k * step + S, S); a.stroke(); a.beginPath(); a.moveTo(k * step, S); a.lineTo(k * step + S, 0); a.stroke(); }
  },
  metal(a, S, rnd) {
    a.fillStyle = '#6b6f73'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 16) { a.fillStyle = 'rgba(255,255,255,0.12)'; a.fillRect(0, y, S, 2); }
    for (let i = 0; i < 2000; i++) { a.fillStyle = rgba(40, 30, 20, rnd() * 0.25); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
  },
  wood(a, S, rnd) {
    a.fillStyle = '#6a5440'; a.fillRect(0, 0, S, S);
    const ph = S / 10;
    for (let k = 0; k < 10; k++) {
      const v = 80 + rnd() * 40; a.fillStyle = rgba(v * 1.1, v * 0.85, v * 0.6, 1); a.fillRect(0, k * ph + 2, S, ph - 4);
      for (let i = 0; i < 30; i++) { a.fillStyle = rgba(40, 25, 15, 0.25); a.fillRect(rnd() * S, k * ph + 2 + rnd() * (ph - 6), 20 + rnd() * 80, 1); }
      a.fillStyle = 'rgba(10,8,6,0.9)'; a.fillRect(0, k * ph, S, 2);
    }
  },
  shutter(a, S, rnd) {
    a.fillStyle = '#9ea3a6'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 40) { a.fillStyle = 'rgba(0,0,0,0.28)'; a.fillRect(0, y, S, 2); a.fillStyle = 'rgba(255,255,255,0.15)'; a.fillRect(0, y + 3, S, 1); }
    for (let i = 0; i < 50; i++) { a.fillStyle = rgba(120, 70, 30, rnd() * 0.25); a.fillRect(rnd() * S, rnd() * S, 3, 10 + rnd() * 50); }
  },
  /* ---------- new district materials ---------- */
  _litColor(rnd) { const warm = ['#ffcc80', '#ffd79a', '#ffe2b0', '#ffc070', '#ffb45e'], cool = ['#cfe0ff', '#b9d0ff', '#e6f0ff'], odd = ['#7fb2ff', '#ff9ad0', '#9affd8']; const r = rnd(); return r < 0.7 ? warm[Math.floor(rnd() * warm.length)] : r < 0.93 ? cool[Math.floor(rnd() * cool.length)] : odd[Math.floor(rnd() * odd.length)]; },
  _lit(a, e, rnd, x, y, w, h, prob, col) {
    if (rnd() > prob) return false;
    const c = col || this._litColor(rnd); e.fillStyle = c; e.globalAlpha = 0.45 + rnd() * 0.45; e.fillRect(x, y, w, h); e.globalAlpha = 1;
    const k = rnd(); e.fillStyle = 'rgba(0,0,0,0.6)';
    if (k < 0.3) { e.fillRect(x, y, w * (0.12 + rnd() * 0.25), h); e.fillRect(x + w * (0.72 - rnd() * 0.2), y, w, h); }
    else if (k < 0.45) { for (let yy = y; yy < y + h; yy += 4) e.fillRect(x, yy, w, 1.5); }
    else if (k < 0.55) e.fillRect(x, y, w, h * (0.3 + rnd() * 0.5));
    else if (k < 0.65) { e.fillRect(x + w * 0.2, y + h * 0.45, w * 0.25, h * 0.55); } // someone in the room
    a.fillStyle = c; a.globalAlpha = 0.22; a.fillRect(x, y, w, h); a.globalAlpha = 1; return true;
  },
  _glass(a, x, y, w, h, c0 = '#2a3446', c1 = '#0d111a') { const g = a.createLinearGradient(x, y, x + w * 0.6, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1); a.fillStyle = g; a.fillRect(x, y, w, h); a.fillStyle = 'rgba(255,255,255,0.06)'; a.beginPath(); a.moveTo(x, y + h * 0.7); a.lineTo(x + w * 0.5, y); a.lineTo(x + w * 0.8, y); a.lineTo(x, y + h); a.fill(); },
  _grit(a, S, rnd, n, dark = 0.25) { for (let i = 0; i < n; i++) { const v = rnd() * 60; a.fillStyle = rgba(v, v * 0.9, v * 0.8, rnd() * dark); a.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); } for (let i = 0; i < n / 60; i++) { a.fillStyle = rgba(20, 15, 10, rnd() * 0.12); a.fillRect(rnd() * S, rnd() * S * 0.3 + rnd() * S, 2 + rnd() * 4, 20 + rnd() * 80); } },
  bricks(a, S, rnd, base, mortar, rows = 64, cols = 32, vary = 0.2) {
    a.fillStyle = mortar; a.fillRect(0, 0, S, S); const bh = S / rows, bw = S / cols;
    for (let r = 0; r < rows; r++) { const off = (r % 2) * bw / 2; for (let c = -1; c < cols + 1; c++) { const k = 1 + (rnd() - 0.5) * vary * 2; a.fillStyle = rgba(base[0] * k, base[1] * k, base[2] * k, 1); a.fillRect(c * bw + off + 0.6, r * bh + 0.6, bw - 1.2, bh - 1.2); } }
  },
  tenement(a, e, S, rnd) { // New-York style red brick walk-up, stone lintels and sills
    this.bricks(a, S, rnd, [150, 72, 52], '#6c5a50');
    const cw = S / 8, fh = S / 8;
    for (let fy = 0; fy < 8; fy++) {
      a.fillStyle = 'rgba(40,25,20,0.35)'; a.fillRect(0, fy * fh + fh - 2, S, 2);
      for (let cx = 0; cx < 8; cx++) {
        const x = cx * cw + cw * 0.28, y = fy * fh + fh * 0.2, w = cw * 0.44, h = fh * 0.58;
        a.fillStyle = '#cbbfae'; a.fillRect(x - 5, y - 7, w + 10, 6); a.fillRect(x - 4, y + h, w + 8, 4); // lintel + sill
        a.fillStyle = 'rgba(0,0,0,0.35)'; a.fillRect(x - 4, y + h + 4, w + 8, 2);
        this._glass(a, x, y, w, h); a.fillStyle = '#e8e2d6'; a.fillRect(x - 2, y, 2, h); a.fillRect(x + w, y, 2, h); a.fillRect(x, y + h * 0.48, w, 2.5);
        this._lit(a, e, rnd, x + 1, y + 1, w - 2, h - 2, 0.34);
        if (rnd() < 0.12 && fy < 7) { a.fillStyle = '#9da3a6'; a.fillRect(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.4); a.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) a.fillRect(x + w * 0.2, y + h * (0.6 + k * 0.08), w * 0.6, 1); }
      }
    }
    this._grit(a, S, rnd, 1600);
  },
  hlm(a, e, S, rnd) { // concrete slab housing: panel grid, loggias with coloured spandrels
    a.fillStyle = '#b9b3a8'; a.fillRect(0, 0, S, S);
    const cw = S / 8, fh = S / 8; const spand = ['#c9763c', '#4f7fa6', '#6c9a5a', '#c9a13c', '#a45b6a'];
    const col = spand[Math.floor(rnd() * spand.length)];
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) {
      const x = cx * cw, y = fy * fh;
      a.fillStyle = 'rgba(60,55,50,0.4)'; a.fillRect(x, y, cw, 1.5); a.fillRect(x, y, 1.5, fh);
      const loggia = cx % 2 === 0;
      if (loggia) {
        a.fillStyle = '#56524c'; a.fillRect(x + cw * 0.06, y + fh * 0.1, cw * 0.88, fh * 0.8);
        this._glass(a, x + cw * 0.14, y + fh * 0.16, cw * 0.72, fh * 0.46, '#39424f', '#12161d'); this._lit(a, e, rnd, x + cw * 0.15, y + fh * 0.17, cw * 0.7, fh * 0.44, 0.38);
        a.fillStyle = col; a.fillRect(x + cw * 0.06, y + fh * 0.62, cw * 0.88, fh * 0.28); a.fillStyle = 'rgba(255,255,255,0.12)'; a.fillRect(x + cw * 0.06, y + fh * 0.62, cw * 0.88, 2);
        if (rnd() < 0.15) { a.fillStyle = '#ddd'; a.beginPath(); a.arc(x + cw * 0.75, y + fh * 0.4, cw * 0.1, 0, TAU); a.fill(); }
      } else {
        this._glass(a, x + cw * 0.25, y + fh * 0.22, cw * 0.5, fh * 0.5); this._lit(a, e, rnd, x + cw * 0.26, y + fh * 0.23, cw * 0.48, fh * 0.48, 0.3);
      }
    }
    for (let i = 0; i < 40; i++) { a.fillStyle = rgba(60, 50, 40, rnd() * 0.18); a.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 30 + rnd() * 120); }
    this._grit(a, S, rnd, 1200, 0.18);
  },
  stone(a, e, S, rnd) { // cut limestone, tall French windows, wrought-iron balconies
    a.fillStyle = '#d7ccb6'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 48) { a.fillStyle = 'rgba(120,105,85,0.35)'; a.fillRect(0, y, S, 1); }
    for (let i = 0; i < 300; i++) { const v = rnd() * 30; a.fillStyle = rgba(180 + v, 170 + v, 150 + v, 0.25); a.fillRect(rnd() * S, Math.floor(rnd() * 48) * S / 48, 20 + rnd() * 40, S / 48); }
    const cw = S / 8, fh = S / 8;
    for (let fy = 0; fy < 8; fy++) {
      a.fillStyle = 'rgba(150,135,112,0.9)'; a.fillRect(0, fy * fh + fh - 5, S, 5); a.fillStyle = 'rgba(70,60,50,0.35)'; a.fillRect(0, fy * fh + fh, S, 2);
      for (let cx = 0; cx < 8; cx++) {
        const x = cx * cw + cw * 0.27, y = fy * fh + fh * 0.1, w = cw * 0.46, h = fh * 0.74;
        a.fillStyle = '#c4b69c'; a.fillRect(x - 6, y - 8, w + 12, 8); a.beginPath(); a.moveTo(x - 6, y - 8); a.lineTo(x + w / 2, y - 16); a.lineTo(x + w + 6, y - 8); a.fill();
        this._glass(a, x, y, w, h); a.fillStyle = '#efe9dd'; a.fillRect(x + w / 2 - 1.5, y, 3, h); a.fillRect(x, y + h * 0.3, w, 2);
        this._lit(a, e, rnd, x + 1, y + 1, w - 2, h - 2, 0.36);
        if (fy === 1 || fy === 4 || rnd() < 0.2) { a.fillStyle = '#1d1d20'; a.fillRect(x - 6, y + h * 0.62, w + 12, 2.5); for (let bx = x - 6; bx < x + w + 6; bx += 3) a.fillRect(bx, y + h * 0.62, 1, h * 0.38); a.fillRect(x - 6, y + h - 2, w + 12, 3); }
      }
    }
    this._grit(a, S, rnd, 900, 0.14);
  },
  lanternFacade(a, e, S, rnd) { // painted walls, dark frames, green balconies
    const walls = ['#b84a3e', '#d8b25a', '#6f8f6a', '#c8c0a8', '#9a3b4a'];
    const cw = S / 8, fh = S / 8;
    for (let cx = 0; cx < 8; cx += 2) { a.fillStyle = walls[Math.floor(rnd() * walls.length)]; a.fillRect(cx * cw, 0, cw * 2, S); }
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) {
      const x = cx * cw + cw * 0.2, y = fy * fh + fh * 0.18, w = cw * 0.6, h = fh * 0.56;
      a.fillStyle = '#2a211c'; a.fillRect(x - 3, y - 3, w + 6, h + 6); this._glass(a, x, y, w, h, '#3a2e2a', '#140f0c');
      for (let k = 1; k < 4; k++) { a.fillStyle = '#2a211c'; a.fillRect(x + w * k / 4 - 1, y, 2, h); }
      this._lit(a, e, rnd, x + 1, y + 1, w - 2, h - 2, 0.42, rnd() < 0.5 ? '#ff9a5a' : '#ffcf7a');
      if (fy % 2 === 1 && rnd() < 0.6) { a.fillStyle = '#2f6a4a'; a.fillRect(x - 6, y + h + 2, w + 12, 3); for (let bx = x - 6; bx < x + w + 6; bx += 4) a.fillRect(bx, y + h - 12, 1.5, 14); }
      if (rnd() < 0.2) { a.fillStyle = rgba(200, 60, 40, 0.9); a.fillRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.25); }
    }
    this._grit(a, S, rnd, 1400, 0.25);
  },
  hospitalFacade(a, e, S, rnd) { // white panels, ribbon windows, blue band
    a.fillStyle = '#e4e6e8'; a.fillRect(0, 0, S, S); const fh = S / 8;
    for (let fy = 0; fy < 8; fy++) {
      const y = fy * fh; a.fillStyle = 'rgba(80,90,100,0.35)'; a.fillRect(0, y, S, 1.5);
      this._glass(a, 0, y + fh * 0.28, S, fh * 0.44, '#2e3d4d', '#101820');
      for (let cx = 0; cx < 16; cx++) { a.fillStyle = '#c9ced4'; a.fillRect(cx * S / 16, y + fh * 0.28, 3, fh * 0.44); this._lit(a, e, rnd, cx * S / 16 + 3, y + fh * 0.29, S / 16 - 4, fh * 0.42, 0.5, rnd() < 0.8 ? '#e8f2ff' : '#ffe9c8'); }
      a.fillStyle = '#3f7fc4'; a.fillRect(0, y + fh * 0.2, S, fh * 0.05);
    }
    this._grit(a, S, rnd, 700, 0.1);
  },
  office(a, e, S, rnd) { // blue-green curtain wall
    const g = a.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#2c5566'); g.addColorStop(0.5, '#173341'); g.addColorStop(1, '#2a4d60'); a.fillStyle = g; a.fillRect(0, 0, S, S);
    const fh = S / 8;
    for (let fy = 0; fy < 8; fy++) {
      const lit = rnd(); for (let cx = 0; cx < 12; cx++) { const x = cx * S / 12, y = fy * fh; if (lit < 0.5 ? rnd() < 0.85 : rnd() < 0.1) { e.fillStyle = rnd() < 0.85 ? '#e6f4ff' : '#fff0d0'; e.globalAlpha = 0.45 + rnd() * 0.4; e.fillRect(x + 2, y + fh * 0.1, S / 12 - 3, fh * 0.8); e.globalAlpha = 1; if (rnd() < 0.3) { e.fillStyle = 'rgba(0,0,0,0.5)'; e.fillRect(x + 4, y + fh * 0.5, S / 24, fh * 0.4); } } }
      a.fillStyle = '#0c1a22'; a.fillRect(0, fy * fh, S, fh * 0.1); e.fillStyle = '#000'; e.fillRect(0, fy * fh, S, fh * 0.1);
    }
    a.fillStyle = '#8fb0bf'; for (let cx = 0; cx <= 12; cx++) a.fillRect(cx * S / 12, 0, 2, S);
  },
  house(a, e, S, rnd) { // clapboard siding, framed windows with shutters, a door every 12 m
    a.fillStyle = '#e9e4da'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 90) { a.fillStyle = 'rgba(0,0,0,0.13)'; a.fillRect(0, y, S, 1.2); a.fillStyle = 'rgba(255,255,255,0.2)'; a.fillRect(0, y + 1.2, S, 1); }
    const cw = S / 8, fh = S / 8;
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) {
      const door = fy % 4 === 0 && cx % 4 === 1;
      if (door) { const x = cx * cw + cw * 0.3, y = fy * fh + fh * 0.12, w = cw * 0.4, h = fh * 0.88; a.fillStyle = ['#6b2f2a', '#2f4a6b', '#3b5a3a'][Math.floor(rnd() * 3)]; a.fillRect(x, y, w, h); a.fillStyle = '#f4f1ea'; a.fillRect(x - 3, y - 3, w + 6, 3); a.fillRect(x - 3, y, 3, h); a.fillRect(x + w, y, 3, h); e.fillStyle = '#ffcf8a'; e.globalAlpha = 0.5; e.fillRect(x + w * 0.3, y + h * 0.15, w * 0.4, h * 0.2); e.globalAlpha = 1; continue; }
      if (cx % 2 === 1) continue;
      const x = cx * cw + cw * 0.3, y = fy * fh + fh * 0.25, w = cw * 0.4, h = fh * 0.5;
      a.fillStyle = '#f7f5f0'; a.fillRect(x - 4, y - 4, w + 8, h + 8); this._glass(a, x, y, w, h); a.fillStyle = '#f7f5f0'; a.fillRect(x + w / 2 - 1.5, y, 3, h); a.fillRect(x, y + h / 2 - 1.5, w, 3);
      const sh = ['#3b5b45', '#2f4260', '#6a2f2f', '#4a4a4a'][Math.floor(rnd() * 4)]; a.fillStyle = sh; a.fillRect(x - 4 - w * 0.45, y - 4, w * 0.42, h + 8); a.fillRect(x + w + 6, y - 4, w * 0.42, h + 8);
      this._lit(a, e, rnd, x + 1, y + 1, w - 2, h - 2, 0.45);
    }
    this._grit(a, S, rnd, 500, 0.1);
  },
  roofTiles(a, S, rnd) {
    a.fillStyle = '#7a3a2a'; a.fillRect(0, 0, S, S); const th = S / 24, tw = S / 16;
    for (let r = 0; r < 24; r++) for (let c = -1; c < 17; c++) { const x = c * tw + (r % 2) * tw / 2, y = r * th; const v = 0.8 + rnd() * 0.35; a.fillStyle = rgba(150 * v, 70 * v, 50 * v, 1); a.beginPath(); a.moveTo(x, y); a.lineTo(x + tw, y); a.lineTo(x + tw, y + th * 0.7); a.quadraticCurveTo(x + tw / 2, y + th * 1.15, x, y + th * 0.7); a.fill(); a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(x, y + th * 0.95, tw, 2); }
    for (let i = 0; i < 40; i++) { a.fillStyle = rgba(40, 50, 30, rnd() * 0.25); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 30, 5 + rnd() * 10, 0, 0, TAU); a.fill(); }
  },
  corrugated(a, S, rnd) {
    a.fillStyle = '#b8b8b4'; a.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += S / 48) { const g = a.createLinearGradient(x, 0, x + S / 48, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); a.fillStyle = g; a.fillRect(x, 0, S / 48, S); }
    for (let i = 0; i < 70; i++) { a.fillStyle = rgba(120, 60, 25, rnd() * 0.35); a.fillRect(rnd() * S, rnd() * S * 0.8, 2 + rnd() * 5, 20 + rnd() * 90); }
    for (let y = 0; y < S; y += S / 4) { a.fillStyle = 'rgba(0,0,0,0.35)'; a.fillRect(0, y, S, 2); }
  },
  seats(a, S, rnd) { // stadium seating rows (the stand slope maps v across the rows)
    a.fillStyle = '#5a5d62'; a.fillRect(0, 0, S, S); const rows = 20, rh = S / rows; const cols = ['#2a4fa0', '#b0282c', '#2a4fa0', '#e0e0e0'];
    for (let r = 0; r < rows; r++) { a.fillStyle = '#44474c'; a.fillRect(0, r * rh, S, rh * 0.35); for (let c = 0; c < 48; c++) { const k = Math.floor(c / 12) % cols.length; a.fillStyle = cols[(k + Math.floor(r / 5)) % cols.length]; a.fillRect(c * S / 48 + 1, r * rh + rh * 0.38, S / 48 - 2, rh * 0.5); } }
    a.fillStyle = '#d8d8d0'; for (let c = 0; c < 4; c++) a.fillRect(c * S / 4, 0, 3, S);
  },
  tankTex(a, S, rnd) {
    a.fillStyle = '#dcdcd6'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 8) { a.fillStyle = 'rgba(0,0,0,0.25)'; a.fillRect(0, y, S, 2); }
    for (let x = 0; x < S; x += S / 16) { a.fillStyle = 'rgba(0,0,0,0.12)'; a.fillRect(x, 0, 2, S); }
    for (let i = 0; i < 60; i++) { a.fillStyle = rgba(130, 70, 30, rnd() * 0.3); a.fillRect(rnd() * S, S * 0.5 + rnd() * S * 0.5, 2 + rnd() * 4, 20 + rnd() * 60); }
    a.save(); a.fillStyle = '#b8302c'; a.fillRect(0, S * 0.18, S, S * 0.08); a.fillStyle = '#1d3f7a'; a.font = `900 ${S * 0.09}px ${FONTS.display}`; a.textBaseline = 'middle'; a.fillText('SALINE PÉTROLE', S * 0.1, S * 0.36); a.restore();
  },
  marble(a, S, rnd) {
    a.fillStyle = '#b9b7b2'; a.fillRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) { a.strokeStyle = rgba(90, 88, 85, 0.25 + rnd() * 0.2); a.lineWidth = 0.5 + rnd() * 1.5; a.beginPath(); let x = rnd() * S, y = rnd() * S; a.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.3) * 50; a.lineTo(x, y); } a.stroke(); }
    for (let i = 0; i < 3000; i++) { const v = 150 + rnd() * 60; a.fillStyle = rgba(v, v, v - 4, 0.25); a.fillRect(rnd() * S, rnd() * S, 1.5, 1.5); }
    for (let i = 0; i < 20; i++) { a.fillStyle = rgba(50, 70, 40, rnd() * 0.2); a.beginPath(); a.ellipse(rnd() * S, S - rnd() * S * 0.3, 8 + rnd() * 20, 4 + rnd() * 10, 0, 0, TAU); a.fill(); }
  },
  warehouse(a, e, S, rnd) { // old brick warehouse with big arched multi-pane windows
    this.bricks(a, S, rnd, [128, 80, 60], '#5e5048', 48, 24);
    const cw = S / 4, fh = S / 4;
    for (let fy = 0; fy < 4; fy++) for (let cx = 0; cx < 4; cx++) {
      const x = cx * cw + cw * 0.18, y = fy * fh + fh * 0.18, w = cw * 0.64, h = fh * 0.66;
      a.fillStyle = '#3c3a38'; a.beginPath(); a.moveTo(x, y + h); a.lineTo(x, y + w / 2); a.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); a.lineTo(x + w, y + h); a.fill();
      a.save(); a.clip(); this._glass(a, x, y, w, h, '#33404a', '#141a20'); a.fillStyle = '#2b2927'; for (let k = 1; k < 6; k++) a.fillRect(x + w * k / 6 - 1, y, 2, h); for (let k = 1; k < 7; k++) a.fillRect(x, y + h * k / 7, w, 2);
      if (rnd() < 0.3) { // lit: the light shows through the small panes (glazing bars stay dark, a few panes dirty or boarded)
        const c = this._litColor(rnd); e.save(); e.beginPath(); e.moveTo(x, y + h); e.lineTo(x, y + w / 2); e.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); e.lineTo(x + w, y + h); e.clip();
        e.fillStyle = c; e.globalAlpha = 0.42; e.fillRect(x, y, w, h); e.globalAlpha = 1;
        e.fillStyle = 'rgba(0,0,0,0.9)'; for (let k = 1; k < 6; k++) e.fillRect(x + w * k / 6 - 1.5, y, 3, h); for (let k = 1; k < 7; k++) e.fillRect(x, y + h * k / 7 - 1.5, w, 3);
        for (let q = 0; q < 9; q++) { e.fillStyle = `rgba(0,0,0,${0.35 + rnd() * 0.5})`; e.fillRect(x + w * Math.floor(rnd() * 6) / 6, y + h * Math.floor(rnd() * 7) / 7, w / 6, h / 7); }
        e.restore();
      }
      a.restore(); a.fillStyle = '#b8ad9c'; a.fillRect(x - 4, y + h, w + 8, 5);
    }
    a.save(); a.fillStyle = 'rgba(235,225,200,0.35)'; a.font = `900 ${S * 0.08}px ${FONTS.display}`; a.fillText('MANUFACTURE SALINE', S * 0.06, S * 0.12); a.restore();
    this._grit(a, S, rnd, 1400, 0.22);
  },
  glassroof(a, e, S, rnd) { // glazed canopy with a steel lattice
    a.fillStyle = '#26303a'; a.fillRect(0, 0, S, S); const n = 8;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const g = a.createLinearGradient(c * S / n, r * S / n, (c + 1) * S / n, (r + 1) * S / n); g.addColorStop(0, '#4a5c6c'); g.addColorStop(1, '#1c2530'); a.fillStyle = g; a.fillRect(c * S / n + 3, r * S / n + 3, S / n - 6, S / n - 6); }
    a.fillStyle = '#15191e'; for (let k = 0; k <= n; k++) { a.fillRect(k * S / n - 3, 0, 6, S); a.fillRect(0, k * S / n - 3, S, 6); }
    e.fillStyle = 'rgba(150,180,220,0.12)'; e.fillRect(0, 0, S, S);
  },
  mallFacade(a, e, S, rnd) { // cladding panels, brand posters, sign band
    a.fillStyle = '#d4cfc6'; a.fillRect(0, 0, S, S); const fh = S / 8;
    for (let y = 0; y < S; y += S / 16) { a.fillStyle = 'rgba(80,75,70,0.25)'; a.fillRect(0, y, S, 1.5); }
    for (let x = 0; x < S; x += S / 12) { a.fillStyle = 'rgba(80,75,70,0.2)'; a.fillRect(x, 0, 1.5, S); }
    const ads = [['#e8322c', 'SOLDES -50%'], ['#1f64c8', 'MÉGA ÉLECTRO'], ['#f2b01e', 'BURGER NUIT'], ['#26a36a', 'BIO & CO'], ['#8a2fb8', 'CINÉ 12']];
    for (let k = 0; k < 3; k++) {
      const [c, t] = ads[Math.floor(rnd() * ads.length)]; const x = S * (0.05 + k * 0.32), y = fh * (1 + Math.floor(rnd() * 5)), w = S * 0.26, h = fh * 1.6;
      a.fillStyle = c; a.fillRect(x, y, w, h); a.fillStyle = '#fff'; a.font = `900 ${S * 0.035}px ${FONTS.display}`; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText(t, x + w / 2, y + h / 2); a.textAlign = 'left';
      e.fillStyle = c; e.globalAlpha = 0.55; e.fillRect(x, y, w, h); e.fillStyle = '#fff'; e.globalAlpha = 0.8; e.font = `900 ${S * 0.035}px ${FONTS.display}`; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillText(t, x + w / 2, y + h / 2); e.globalAlpha = 1; e.textAlign = 'left';
    }
    this._grit(a, S, rnd, 600, 0.12);
  },
  graffitiWall(a, S, rnd) {
    a.fillStyle = '#8c8a86'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 8) { a.fillStyle = 'rgba(0,0,0,0.2)'; a.fillRect(0, y, S, 2); }
    const words = ['MARÉE', 'RATS', 'ZK', 'NOX', 'ÉCUME', 'SALINE', 'KRAK', 'DOCK', 'VOLT', 'ONDE'];
    const cols = ['#2ef2b0', '#ff8a1f', '#ff4f8a', '#4fa3ff', '#ffe14f', '#c070ff', '#ffffff'];
    for (let i = 0; i < 16; i++) { a.save(); a.translate(rnd() * S, rnd() * S); a.rotate((rnd() - 0.5) * 0.4); const sz = S * (0.06 + rnd() * 0.12); a.font = `400 ${sz}px ${FONTS.tag}`; a.fillStyle = cols[Math.floor(rnd() * cols.length)]; a.strokeStyle = '#111'; a.lineWidth = sz * 0.08; a.textAlign = 'center'; const w = words[Math.floor(rnd() * words.length)]; a.strokeText(w, 0, 0); a.fillText(w, 0, 0); a.restore(); }
    for (let i = 0; i < 60; i++) { a.fillStyle = rgba(30, 30, 30, rnd() * 0.25); a.fillRect(rnd() * S, rnd() * S, 2, 10 + rnd() * 40); }
  },
  groundAtlas(S) {
    // 4 × 4 cells; the original four keep their places (asphalt, pavers, cobble, plain)
    const C = mkCanvas(S * 4, S * 4), a = C.getContext('2d'); const rnd = mulberry32(99);
    const at = (cell, fn) => { const x0 = cell[0] * S, y0 = (3 - cell[1]) * S; a.save(); a.beginPath(); a.rect(x0, y0, S, S); a.clip(); a.translate(x0, y0); fn(); a.restore(); };
    const speck = (n, lo, hi, al, w = 1.5) => { for (let i = 0; i < n; i++) { const v = lo + rnd() * (hi - lo); a.fillStyle = rgba(v, v, v, al); a.fillRect(rnd() * S, rnd() * S, w, w); } };
    at(GCELL.asphalt, () => {
      a.fillStyle = '#3a3c42'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 20000 * S * S / 262144; i++) { const v = 30 + rnd() * 70; a.fillStyle = rgba(v, v, v + 5, 0.5); a.fillRect(rnd() * S, rnd() * S, 1.5, 1.5); }
      for (let i = 0; i < 25; i++) { a.strokeStyle = 'rgba(15,15,18,0.5)'; a.lineWidth = 1 + rnd() * 1.5; a.beginPath(); let px = rnd() * S, py = rnd() * S; a.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd() - 0.5) * 40; py += (rnd() - 0.5) * 40; a.lineTo(px, py); } a.stroke(); }
      for (let i = 0; i < 12; i++) { a.fillStyle = 'rgba(20,20,24,0.25)'; const r = 20 + rnd() * 70; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, r, r * 0.6, rnd() * 3, 0, TAU); a.fill(); }
    });
    at(GCELL.pavers, () => {
      a.fillStyle = '#6c6a66'; a.fillRect(0, 0, S, S); const pv = S / 8;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const v = 95 + rnd() * 30; a.fillStyle = rgba(v, v * 0.98, v * 0.95, 1); a.fillRect(c * pv + 2, r * pv + 2, pv - 4, pv - 4); }
      speck(6000 * S * S / 262144, 60, 140, 0.3);
    });
    at(GCELL.cobble, () => {
      a.fillStyle = '#3e3b38'; a.fillRect(0, 0, S, S); const cb = S / 16;
      for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const v = 80 + rnd() * 50; a.fillStyle = rgba(v, v * 0.95, v * 0.9, 1); a.beginPath(); a.ellipse(c * cb + cb / 2 + (r % 2) * cb / 2, r * cb + cb / 2, cb * 0.45, cb * 0.4, 0, 0, TAU); a.fill(); }
    });
    at(GCELL.plain, () => { a.fillStyle = '#ffffff'; a.fillRect(0, 0, S, S); });
    at(GCELL.grass, () => {
      a.fillStyle = '#2f4a26'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) { a.fillStyle = rgba(40 + rnd() * 30, 70 + rnd() * 30, 30, 0.25); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 60, 15 + rnd() * 40, rnd() * 3, 0, TAU); a.fill(); }
      for (let i = 0; i < 9000 * S * S / 262144; i++) { const g = 60 + rnd() * 70; a.strokeStyle = rgba(g * 0.55, g, g * 0.35, 0.6); a.lineWidth = 1; const x = rnd() * S, y = rnd() * S; a.beginPath(); a.moveTo(x, y); a.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 4); a.stroke(); }
      for (let i = 0; i < 30; i++) { a.fillStyle = rgba(90, 70, 40, 0.3); a.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 2 + rnd() * 3); }
    });
    at(GCELL.sand, () => {
      a.fillStyle = '#b6a27c'; a.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 6) { a.strokeStyle = rgba(150, 130, 95, 0.35); a.lineWidth = 2; a.beginPath(); for (let x = 0; x <= S; x += 16) a.lineTo(x, y + Math.sin(x * 0.04 + y * 0.3) * 3); a.stroke(); }
      speck(8000 * S * S / 262144, 120, 220, 0.3);
      for (let i = 0; i < 25; i++) { a.fillStyle = rgba(70, 60, 45, 0.35); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
    });
    at(GCELL.gravel, () => {
      a.fillStyle = '#5b5750'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 9000 * S * S / 262144; i++) { const v = 60 + rnd() * 90; a.fillStyle = rgba(v, v * 0.95, v * 0.88, 0.9); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 1 + rnd() * 2.5, 1 + rnd() * 2, rnd() * 3, 0, TAU); a.fill(); }
    });
    at(GCELL.parking, () => { // asphalt with painted bays (one bay = 2.5 m, 1 cell = 10 m)
      a.fillStyle = '#34363b'; a.fillRect(0, 0, S, S); speck(12000 * S * S / 262144, 30, 90, 0.45);
      a.fillStyle = 'rgba(230,230,225,0.85)'; for (let k = 0; k <= 4; k++) a.fillRect(k * S / 4 - 2, 0, 4, S * 0.46); for (let k = 0; k <= 4; k++) a.fillRect(k * S / 4 - 2, S * 0.54, 4, S * 0.46);
      for (let i = 0; i < 10; i++) { a.fillStyle = 'rgba(10,10,12,0.25)'; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 15 + rnd() * 25, 8 + rnd() * 12, 0, 0, TAU); a.fill(); }
    });
    at(GCELL.tracks, () => { // ballast + sleepers + two rails along v (1 cell = 4 m wide gauge strip)
      a.fillStyle = '#4c4843'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 12000 * S * S / 262144; i++) { const v = 50 + rnd() * 80; a.fillStyle = rgba(v, v * 0.95, v * 0.9, 0.9); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
      for (let y = 0; y < S; y += S / 8) { a.fillStyle = '#3b2e24'; a.fillRect(S * 0.12, y + 4, S * 0.76, S / 8 * 0.42); a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(S * 0.12, y + 4 + S / 8 * 0.42, S * 0.76, 2); }
      for (const x of [0.32, 0.68]) { a.fillStyle = '#6d6f73'; a.fillRect(S * x - 5, 0, 10, S); a.fillStyle = '#b8bcc2'; a.fillRect(S * x - 2, 0, 4, S); }
    });
    at(GCELL.deck, () => {
      a.fillStyle = '#5a4634'; a.fillRect(0, 0, S, S); const ph = S / 12;
      for (let k = 0; k < 12; k++) { const v = 90 + rnd() * 40; a.fillStyle = rgba(v * 1.05, v * 0.8, v * 0.58, 1); a.fillRect(0, k * ph + 1.5, S, ph - 3); for (let i = 0; i < 20; i++) { a.fillStyle = 'rgba(30,20,12,0.25)'; a.fillRect(rnd() * S, k * ph + 2 + rnd() * (ph - 5), 20 + rnd() * 60, 1); } a.fillStyle = 'rgba(20,14,8,0.9)'; for (let x = (k % 3) * S / 3; x < S; x += S) a.fillRect(x, k * ph, 2, ph); }
    });
    at(GCELL.tiles, () => { // large stone slabs of a plaza
      a.fillStyle = '#5d5b57'; a.fillRect(0, 0, S, S); const t = S / 4;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = 120 + rnd() * 30; a.fillStyle = rgba(v, v * 0.97, v * 0.92, 1); a.fillRect(c * t + 2, r * t + 2, t - 4, t - 4); }
      speck(5000 * S * S / 262144, 90, 170, 0.25);
    });
    at(GCELL.soil, () => { a.fillStyle = '#3a2c20'; a.fillRect(0, 0, S, S); speck(9000 * S * S / 262144, 30, 80, 0.5, 2); for (let i = 0; i < 200; i++) { a.fillStyle = rgba(60 + rnd() * 40, 80 + rnd() * 50, 30, 0.7); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 3 + rnd() * 6, 2 + rnd() * 4, rnd() * 3, 0, TAU); a.fill(); } });
    at(GCELL.court, () => { // basketball court (1 cell = 28 m)
      a.fillStyle = '#9a5a3a'; a.fillRect(0, 0, S, S); speck(3000 * S * S / 262144, 120, 190, 0.2);
      a.strokeStyle = 'rgba(240,240,235,0.9)'; a.lineWidth = Math.max(2, S / 160);
      a.strokeRect(S * 0.05, S * 0.12, S * 0.9, S * 0.76); a.beginPath(); a.moveTo(S / 2, S * 0.12); a.lineTo(S / 2, S * 0.88); a.stroke();
      a.beginPath(); a.arc(S / 2, S / 2, S * 0.08, 0, TAU); a.stroke();
      for (const x of [0.05, 0.95]) { a.beginPath(); a.arc(S * x, S / 2, S * 0.24, x < 0.5 ? -Math.PI / 2 : Math.PI / 2, x < 0.5 ? Math.PI / 2 : Math.PI * 1.5); a.stroke(); a.strokeRect(x < 0.5 ? S * 0.05 : S * 0.77, S * 0.4, S * 0.18, S * 0.2); }
    });
    at(GCELL.runtrack, () => { a.fillStyle = '#8f3b2e'; a.fillRect(0, 0, S, S); speck(6000 * S * S / 262144, 90, 170, 0.25); a.fillStyle = 'rgba(245,245,240,0.85)'; for (let k = 0; k <= 8; k++) a.fillRect(k * S / 8 - 1.5, 0, 3, S); });
    at(GCELL.pitch, () => { // mown stripes
      for (let k = 0; k < 8; k++) { a.fillStyle = k % 2 ? '#2d5a2a' : '#356a31'; a.fillRect(0, k * S / 8, S, S / 8); }
      speck(5000 * S * S / 262144, 20, 90, 0.25);
    });
    at(GCELL.pond, () => { // still dark water with a few lily pads (the wet shader adds the reflections)
      a.fillStyle = '#0c1a1c'; a.fillRect(0, 0, S, S); for (let i = 0; i < 25; i++) { a.fillStyle = rgba(40, 80, 40, 0.8); const r = 6 + rnd() * 10; const x = rnd() * S, y = rnd() * S; a.beginPath(); a.arc(x, y, r, 0.3, TAU); a.lineTo(x, y); a.fill(); }
    });
    return C;
  },
  noiseTex() {
    const N = 256; const C = mkCanvas(N, N), a = C.getContext('2d'); const img = a.createImageData(N, N); const rnd = mulberry32(4242);
    const r = fbmNoise(N, 8, 4, rnd), g = fbmNoise(N, 8, 4, rnd), b = fbmNoise(N, 4, 5, rnd), w = fbmNoise(N, 4, 3, rnd);
    for (let i = 0; i < N * N; i++) { img.data[i * 4] = r[i] * 255; img.data[i * 4 + 1] = g[i] * 255; img.data[i * 4 + 2] = b[i] * 255; img.data[i * 4 + 3] = w[i] * 255; }
    a.putImageData(img, 0, 0);
    return C;
  },
  particleAtlas() {
    const S = 128, C = mkCanvas(S * 4, S * 4), a = C.getContext('2d');
    const at = (k, fn) => { const cx = (k % 4) * S, cy = (3 - Math.floor(k / 4)) * S; a.save(); a.translate(cx, cy); fn(); a.restore(); };
    const radial = (stops) => { const g = a.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); stops.forEach(([o, c]) => g.addColorStop(o, c)); a.fillStyle = g; a.fillRect(0, 0, S, S); };
    at(0, () => radial([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]));
    at(1, () => { a.strokeStyle = 'white'; a.lineWidth = 6; a.shadowColor = 'white'; a.shadowBlur = 8; a.beginPath(); a.arc(S / 2, S / 2, S * 0.38, 0, TAU); a.stroke(); });
    at(2, () => { const g = a.createLinearGradient(0, 0, S, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(S * 0.42, 0, S * 0.16, S); });
    at(3, () => { const rnd = mulberry32(5); for (let i = 0; i < 14; i++) { const x = S * (0.3 + rnd() * 0.4), y = S * (0.3 + rnd() * 0.4), r = S * (0.12 + rnd() * 0.2); const g = a.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(0, 0, S, S); } });
    at(4, () => { a.fillStyle = 'white'; a.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? S * 0.2 : S * 0.46, an = -Math.PI / 2 + i * Math.PI / 5; a.lineTo(S / 2 + Math.cos(an) * r, S / 2 + Math.sin(an) * r); } a.closePath(); a.fill(); });
    at(5, () => { radial([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,0.6)'], [0.5, 'rgba(255,255,255,0)']]); a.globalCompositeOperation = 'lighter'; const g = a.createLinearGradient(0, 0, S, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(0, S * 0.48, S, S * 0.04); a.fillRect(S * 0.48, 0, S * 0.04, S); });
    at(6, () => { a.strokeStyle = 'rgba(255,255,255,0.9)'; a.lineWidth = 3; a.beginPath(); a.arc(S / 2, S / 2, S * 0.42, 0, TAU); a.stroke(); });
    at(7, () => { a.fillStyle = 'white'; a.beginPath(); a.moveTo(S * 0.5, S * 0.15); a.lineTo(S * 0.85, S * 0.75); a.lineTo(S * 0.5, S * 0.6); a.lineTo(S * 0.15, S * 0.75); a.closePath(); a.fill(); });
    at(8, () => { for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; a.strokeStyle = 'rgba(255,255,255,0.9)'; a.lineWidth = 4; a.beginPath(); a.moveTo(S / 2 + Math.cos(an) * S * 0.08, S / 2 + Math.sin(an) * S * 0.08); a.lineTo(S / 2 + Math.cos(an) * S * (0.3 + (i % 2) * 0.18), S / 2 + Math.sin(an) * S * (0.3 + (i % 2) * 0.18)); a.stroke(); } radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.3)'], [0.6, 'rgba(255,255,255,0)']]); });
    at(9, () => { a.fillStyle = 'white'; a.font = `900 ${S * 0.8}px ${FONTS.display}`; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('!', S / 2, S / 2 + 4); });
    at(10, () => { a.fillStyle = 'white'; a.beginPath(); a.moveTo(S / 2, S * 0.1); a.lineTo(S * 0.9, S / 2); a.lineTo(S / 2, S * 0.9); a.lineTo(S * 0.1, S / 2); a.closePath(); a.fill(); a.globalCompositeOperation = 'destination-out'; a.beginPath(); a.moveTo(S / 2, S * 0.28); a.lineTo(S * 0.72, S / 2); a.lineTo(S / 2, S * 0.72); a.lineTo(S * 0.28, S / 2); a.closePath(); a.fill(); });
    at(11, () => { const g = a.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(0, 0, S, S); });
    return C;
  },
  radialTex() { const S = 128, C = mkCanvas(S, S), a = C.getContext('2d'); const g = a.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(0.75, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(0, 0, S, S); return C; },
  coneTex() { // u across (soft edges), v along cone: v=1 at apex (top) bright, v=0 at base faded
    const W = 64, H = 128, C = mkCanvas(W, H), a = C.getContext('2d'); const img = a.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / (W - 1), v = 1 - y / (H - 1); const edge = Math.pow(Math.sin(u * Math.PI), 1.5); const along = Math.pow(v, 1.6) * (0.25 + 0.75 * smooth01(v * 3));
      const val = edge * along; const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = val * 255;
    }
    a.putImageData(img, 0, 0); return C;
  },
  streakTex() { // vertical reflection streak: bright at v=1 fading to 0
    const W = 64, H = 256, C = mkCanvas(W, H), a = C.getContext('2d'); const img = a.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / (W - 1) - 0.5, v = 1 - y / (H - 1); const val = Math.exp(-u * u * 18) * Math.pow(v, 1.4) * Math.min(1, (1 - v) * 12 + 0.35);
      const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = clamp(val, 0, 1) * 255;
    }
    a.putImageData(img, 0, 0); return C;
  },
  glareTex() { // 2 × 2 cells: 0 corona, 1 horizontal streak, 2 wide haze, 3 reflection streak on the ground
    const S = 128, N = S * 2, C = mkCanvas(N, N), a = C.getContext('2d'); const img = a.createImageData(N, N), D = img.data;
    const put = (k, fn) => {
      const cx = (k % 2) * S, cy = (1 - Math.floor(k / 2)) * S;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const u = (x + 0.5) / S * 2 - 1, v = (y + 0.5) / S * 2 - 1; const i = ((cy + y) * N + cx + x) * 4; D[i] = D[i + 1] = D[i + 2] = 255; D[i + 3] = Math.round(clamp(fn(u, v), 0, 1) * 255); }
    };
    put(0, (u, v) => { const r = Math.hypot(u, v); if (r >= 1) return 0; const e = 1 - r; return Math.exp(-r * r * 70) + Math.exp(-r * r * 10) * 0.3 + e * e * 0.06 + Math.exp(-Math.pow((r - 0.64) / 0.05, 2)) * 0.04 * e; });
    put(1, (u, v) => { const fx = Math.pow(Math.max(0, 1 - Math.abs(u)), 2.4); return fx * (Math.exp(-v * v * 700) * 0.9 + Math.exp(-v * v * 50) * 0.15); });
    put(2, (u, v) => { const r = Math.hypot(u, v); return r >= 1 ? 0 : Math.exp(-r * r * 4) * (1 - r); });
    // (bottom of the cell = the light's end, top = the viewer's end)
    put(3, (u, v) => { const t = (v + 1) / 2; const along = Math.min(1, (1 - t) * 7) * Math.min(1, t * 2.5) * (0.55 + 0.45 * t); const across = Math.exp(-u * u * 14) * 0.6 + Math.exp(-u * u * 70) * 0.5; return along * across; });
    a.putImageData(img, 0, 0); return C;
  },
  /* ---------- neon sign atlas ---------- */
  buildNeon() {
    // every sign is painted on its own small canvas, then all are packed (tallest first) into one atlas
    const W = 2048; this.signs = {};
    const NK = (this.S || 512) >= 512 ? 0.75 : this.S >= 384 ? 0.6 : 0.45; // atlas pixels per design pixel
    const items = []; let a = null;
    const alloc = (w, h) => { const c = mkCanvas(Math.ceil(w * NK), Math.ceil(h * NK)); a = c.getContext('2d'); a.setTransform(NK, 0, 0, NK, 0, 0); return { x: 0, y: 0, w, h, c }; };
    const reg = (name, r, aspect) => { items.push({ name, r, aspect }); };
    const glowText = (txt, x, y, font, color, blur, align = 'center') => {
      a.font = font; a.textAlign = align; a.textBaseline = 'middle';
      a.shadowColor = color; a.shadowBlur = blur * NK; a.fillStyle = color; a.fillText(txt, x, y); a.shadowBlur = blur * 0.4 * NK; a.fillText(txt, x, y);
      a.shadowBlur = 0; a.fillStyle = 'rgba(255,255,255,0.8)'; a.globalAlpha = 0.24; a.fillText(txt, x, y); a.globalAlpha = 1;
    };
    const neonH = (name, txt, color, w = 512, h = 128, fontSize = 84, font = FONTS.neon) => {
      const r = alloc(w, h); a.save(); a.beginPath(); a.rect(r.x, r.y, r.w, r.h); a.clip();
      glowText(txt, r.x + w / 2, r.y + h / 2 + 4, `400 ${fontSize}px ${font}`, color, 22); a.restore(); reg(name, r);
    };
    const neonV = (name, txt, color, w = 128, h = 512) => {
      const r = alloc(w, h); a.save(); a.beginPath(); a.rect(r.x, r.y, r.w, r.h); a.clip();
      const n = txt.length; const step = h / (n + 0.4);
      for (let i = 0; i < n; i++) glowText(txt[i], r.x + w / 2, r.y + step * (i + 0.7), `400 ${Math.min(step * 0.85, w * 0.72)}px ${FONTS.neon}`, color, 18);
      a.restore(); reg(name, r);
    };
    neonV('hotel', 'HÔTEL', '#ff4fa3');
    neonV('bar', 'BAR', '#4fd8ff', 128, 320);
    neonV('club', 'CLUB', '#b36bff', 128, 400);
    neonV('ramen', 'RAMEN', '#ff8a3d');
    neonH('lephare', 'Le Phare', '#58e1ff');
    neonH('laverie', 'Laverie 24/24', '#5aa2ff', 640, 128, 70);
    neonH('kebab', 'KEBAB', '#ffd23f');
    neonH('cinema', 'CINÉMA', '#ff3b4e');
    neonH('karaoke', 'Karaoké', '#ff5fd2');
    neonH('ouvert', 'OUVERT', '#ff4b4b', 384, 110, 72);
    neonH('pizza', 'Pizza', '#ff9b3d');
    neonH('sushi', 'SUSHI', '#7dffb0');
    neonH('garage', 'GARAGE', '#ffb547', 512, 128, 80);
    neonH('police', 'POLICE', '#4da3ff', 640, 150, 110, FONTS.display);
    neonH('criee', 'LA CRIÉE', '#8fe6ff', 640, 140, 90);
    neonH('marche', 'Marché de nuit', '#ffb547', 768, 150, 88);
    neonH('motel', 'MOTEL MARÉE', '#ff6a5a', 640, 128, 76);
    neonH('tabacTxt', 'TABAC', '#ff3b3b', 384, 110, 76);
    // pharmacie cross
    { const r = alloc(256, 256); a.save(); a.translate(r.x + 128, r.y + 128); a.shadowColor = '#3dff7a'; a.shadowBlur = 30; a.fillStyle = '#3dff7a';
      a.fillRect(-30, -95, 60, 190); a.fillRect(-95, -30, 190, 60); a.shadowBlur = 0; a.fillStyle = 'rgba(220,255,230,0.7)'; a.fillRect(-18, -83, 36, 166); a.fillRect(-83, -18, 166, 36); a.restore(); reg('cross', r); }
    // tabac "carotte" (red lozenge)
    { const r = alloc(160, 320); a.save(); a.translate(r.x + 80, r.y + 160); a.shadowColor = '#ff2d3b'; a.shadowBlur = 24; a.fillStyle = '#ff2d3b';
      a.beginPath(); a.moveTo(0, -150); a.lineTo(62, 0); a.lineTo(0, 150); a.lineTo(-62, 0); a.closePath(); a.fill(); a.shadowBlur = 0; a.fillStyle = 'rgba(255,220,220,0.9)'; a.font = `700 34px ${FONTS.ui}`; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('TABAC', 0, 2); a.restore(); reg('carotte', r); }
    // billboards (opaque art)
    const board = (name, fn, w = 1024, h = 384) => { const r = alloc(w, h); a.save(); a.beginPath(); a.rect(r.x, r.y, w, h); a.clip(); a.translate(r.x, r.y); fn(w, h); a.restore(); reg(name, r); };
    board('bb_volt', (w, h) => {
      const g = a.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1a3a'); g.addColorStop(1, '#2a0b3a'); a.fillStyle = g; a.fillRect(0, 0, w, h);
      a.fillStyle = '#d7ff3a'; a.shadowColor = '#d7ff3a'; a.shadowBlur = 30; a.font = `900 190px ${FONTS.display}`; a.textBaseline = 'middle'; a.fillText('VOLT', 60, h * 0.45);
      a.shadowBlur = 0; a.fillStyle = '#ffffff'; a.font = `600 44px ${FONTS.ui}`; a.fillText("L'énergie qui ne dort jamais.", 64, h * 0.8);
      a.fillStyle = '#d7ff3a'; a.beginPath(); a.moveTo(w - 250, 40); a.lineTo(w - 330, h * 0.55); a.lineTo(w - 250, h * 0.55); a.lineTo(w - 300, h - 40); a.lineTo(w - 170, h * 0.4); a.lineTo(w - 250, h * 0.4); a.closePath(); a.fill();
    });
    board('bb_tide', (w, h) => {
      a.fillStyle = '#021512'; a.fillRect(0, 0, w, h);
      a.strokeStyle = '#2ef2b0'; a.lineWidth = 6; a.shadowColor = '#2ef2b0'; a.shadowBlur = 25;
      for (let k = 0; k < 4; k++) { a.beginPath(); for (let x = 0; x <= w; x += 16) a.lineTo(x, h * 0.78 + k * 18 + Math.sin(x * 0.02 + k) * 10); a.stroke(); }
      a.fillStyle = '#2ef2b0'; a.font = `900 150px ${FONTS.display}`; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('LA MARÉE VIENT', w / 2, h * 0.38);
      a.shadowBlur = 0; a.fillStyle = 'rgba(200,255,235,0.8)'; a.font = `500 36px ${FONTS.mono}`; a.fillText('REPENTEZ-VOUS AVANT LA GRANDE CRUE', w / 2, h * 0.6);
    });
    board('bb_tel', (w, h) => {
      a.fillStyle = '#f2f2f2'; a.fillRect(0, 0, w, h); a.fillStyle = '#ff3b4e'; a.fillRect(0, 0, 26, h);
      a.fillStyle = '#111'; a.font = `900 120px ${FONTS.display}`; a.textBaseline = 'middle'; a.fillText('SALINE TÉLÉCOM', 70, h * 0.4);
      a.fillStyle = '#ff3b4e'; a.font = `700 56px ${FONTS.ui}`; a.fillText('La fibre jusqu’au port. 19,99 €', 74, h * 0.75);
    });
    board('bb_cine', (w, h) => {
      const g = a.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a0610'); g.addColorStop(1, '#0d0204'); a.fillStyle = g; a.fillRect(0, 0, w, h);
      a.fillStyle = '#ffcf5a'; a.font = `900 64px ${FONTS.display}`; a.textBaseline = 'middle'; a.fillText('CINÉMA LE RIVAGE — CE SOIR', 50, 70);
      a.fillStyle = '#fff'; a.font = `900 150px ${FONTS.display}`; a.fillText('BRUME', 50, h * 0.55);
      a.fillStyle = '#ffcf5a'; a.font = `600 40px ${FONTS.ui}`; a.fillText('Séances 21h · 23h40 · 02h10', 54, h * 0.85);
    });
    // graffiti tags
    const tag = (name, txt, color, w = 1024, h = 256, size = 110) => { const r = alloc(w, h); a.save(); a.beginPath(); a.rect(r.x, r.y, w, h); a.clip(); a.translate(r.x + w / 2, r.y + h / 2); a.rotate(-0.05); a.font = `400 ${size}px ${FONTS.tag}`; a.textAlign = 'center'; a.textBaseline = 'middle'; a.shadowColor = color; a.shadowBlur = 12; a.fillStyle = color; a.fillText(txt, 0, 0); a.globalAlpha = 0.5; a.fillStyle = color; for (let i = 0; i < 12; i++) a.fillRect(-w * 0.4 + Math.random() * w * 0.8, 20 + Math.random() * 40, 3, 20 + Math.random() * 60); a.restore(); reg(name, r); };
    tag('g_tide', 'LA MARÉE VIENT', '#2ef2b0');
    tag('g_rats', 'RATS DE QUAI', '#ff8a1f', 900, 256, 120);
    tag('g_sea', 'LA MER REPRENDRA TOUT', '#2ef2b0', 1024, 200, 84);
    // street names: the original twelve keep their streets (core roads), the new roads get new names
    this.streetNames = ['RUE DES CORDIERS', 'AVENUE DU PHARE', 'RUE BASSE', 'QUAI DE LA SALINE', 'RUE DES FILETS', 'BD DE LA MARÉE', 'RUE DU MARCHÉ', 'ALLÉE DES BRUMES', 'RUE DES CALFATS', 'RUE DU PHARE', 'AVENUE DES DOCKS', 'RUE DES AMARRES'];
    const O = this.streetNames;
    this.streetX = ['RUE DES FORGES', 'AVENUE DES USINES', 'RUE DU GAZOMÈTRE', 'BD OUVRIER', 'RUE DES TILLEULS', O[0], O[1], O[2], O[3], O[4], O[5], 'AVENUE DU STADE', 'RUE DES LANTERNES', 'BD DE L’UNIVERSITÉ', 'RUE DES PLAISANCIERS', 'AVENUE DE LA PLAGE'];
    this.streetZ = ['BD DU NORD', 'RUE DE LA GARE', 'AVENUE DE LA RÉPUBLIQUE', 'RUE DU PARC', O[6], O[7], O[8], O[9], O[10], O[11]];
    const plaque = (key, n) => {
      const r = alloc(336, 88); a.save(); a.translate(r.x, r.y);
      a.fillStyle = '#1f4f9e'; a.fillRect(0, 0, 336, 88); a.strokeStyle = '#2f8f5a'; a.lineWidth = 6; a.strokeRect(5, 5, 326, 78); a.strokeStyle = '#fff'; a.lineWidth = 2; a.strokeRect(11, 11, 314, 66);
      a.fillStyle = '#fff'; let fs = 38; a.font = `700 ${fs}px ${FONTS.ui}`; const mw = a.measureText(n).width; if (mw > 300) { fs *= 300 / mw; a.font = `700 ${fs}px ${FONTS.ui}`; }
      a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText(n, 168, 46); a.restore(); reg(key, r);
    };
    this.streetX.forEach((n, i) => plaque('sx' + i, n)); this.streetZ.forEach((n, j) => plaque('sz' + j, n));
    // district signs
    neonH('gare', 'GARE CENTRALE', '#ffe7b0', 768, 150, 96, FONTS.display);
    neonH('hopital', 'HÔPITAL SAINT-ROCH', '#dff2ff', 768, 128, 76, FONTS.display);
    neonH('urgences', 'URGENCES', '#ff3b4e', 512, 128, 84, FONTS.display);
    neonH('stade', 'STADE DE LA MARÉE', '#7fd4ff', 768, 140, 84, FONTS.display);
    neonH('casino', 'CASINO', '#ffcf3a', 512, 150, 110);
    neonH('theatre', 'THÉÂTRE', '#ff5a8c', 512, 128, 88);
    neonH('cabaret', 'Cabaret', '#c070ff', 512, 128, 88);
    neonH('arcades', 'LES ARCADES', '#ff7a3a', 768, 150, 110, FONTS.display);
    neonH('univ', 'UNIVERSITÉ', '#e8e0c8', 640, 128, 80, FONTS.display);
    neonH('mairie', 'HÔTEL DE VILLE', '#ffe2a8', 768, 128, 80, FONTS.display);
    neonH('pompiers', 'POMPIERS', '#ff4b3b', 512, 128, 88, FONTS.display);
    neonH('garemar', 'GARE MARITIME', '#8fe6ff', 768, 140, 88, FONTS.display);
    neonH('luna', 'Luna Park', '#ff6ad5', 640, 150, 110);
    neonH('marina', 'Marina', '#5ad8ff', 512, 128, 92);
    neonH('dimsum', 'DIM SUM', '#ff6a3a', 512, 128, 88);
    neonH('the', 'Maison du Thé', '#ffc85a', 640, 128, 76);
    neonH('bowling', 'BOWLING', '#5aff9a', 512, 128, 88);
    neonH('hotelsea', 'Hôtel de la Plage', '#ffb05a', 640, 128, 72);
    neonV('dragon', 'DRAGON', '#ff3b3b', 128, 560);
    neonV('lotus', 'LOTUS', '#ffcf3a', 128, 480);
    // lit sign boxes above the shop fronts (one per shop, picked by position)
    const fit = (txt, maxW, size, weight, family) => { let fs = size; a.font = `${weight} ${fs}px ${family}`; const mw = a.measureText(txt).width; if (mw > maxW) { fs *= maxW / mw; a.font = `${weight} ${fs}px ${family}`; } return fs; };
    SHOP_BOARDS.forEach(([txt, st, tc, bc], i) => {
      const w = 400, h = 60; const r = alloc(w, h); a.save(); a.textAlign = 'center'; a.textBaseline = 'middle';
      if (st === 'L') { // backlit panel, dark letters
        const g = a.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bc); g.addColorStop(0.5, bc); g.addColorStop(1, 'rgba(0,0,0,0.25)'); a.fillStyle = bc; a.fillRect(0, 0, w, h); a.fillStyle = g; a.fillRect(0, 0, w, h);
        a.fillStyle = 'rgba(255,255,255,0.35)'; a.fillRect(0, 2, w, 2); a.strokeStyle = 'rgba(0,0,0,0.5)'; a.lineWidth = 4; a.strokeRect(2, 2, w - 4, h - 4);
        fit(txt, w * 0.86, 40, 800, FONTS.ui); a.fillStyle = tc; a.fillText(txt, w / 2, h / 2 + 2);
      } else { // dark board, glowing letters
        a.fillStyle = bc; a.fillRect(0, 0, w, h); a.strokeStyle = 'rgba(255,255,255,0.12)'; a.lineWidth = 3; a.strokeRect(3, 3, w - 6, h - 6);
        const fs = fit(txt, w * 0.84, 38, 700, FONTS.ui); glowText(txt, w / 2, h / 2 + 2, `700 ${fs}px ${FONTS.ui}`, tc, 8);
      }
      a.restore(); reg('shop' + i, r);
    });
    // skyline bottom-left packing, tallest first
    items.sort((p, q) => q.r.c.height - p.r.c.height || q.r.c.width - p.r.c.width);
    let sky = [{ x: 0, y: 0, w: W }];
    for (const it of items) {
      const w = it.r.c.width + 4, h = it.r.c.height + 4; let bx = 0, by = Infinity;
      for (let i = 0; i < sky.length; i++) {
        const x = sky[i].x; if (x + w > W) break;
        let y = 0, rem = w, j = i; while (rem > 0 && j < sky.length) { y = Math.max(y, sky[j].y); rem -= sky[j].w; j++; }
        if (rem <= 0 && y < by) { by = y; bx = x; }
      }
      it.x = bx; it.y = by;
      const out = [];
      for (const q of sky) { const q1 = q.x + q.w; if (q1 <= bx || q.x >= bx + w) { out.push(q); continue; } if (q.x < bx) out.push({ x: q.x, y: q.y, w: bx - q.x }); if (q1 > bx + w) out.push({ x: bx + w, y: q.y, w: q1 - bx - w }); }
      out.push({ x: bx, y: by + h, w }); out.sort((p, q) => p.x - q.x);
      sky = []; for (const q of out) { const l = sky[sky.length - 1]; if (l && l.y === q.y) l.w += q.w; else sky.push(q); }
    }
    this.neonUsedH = Math.max(...items.map(it => it.y + it.r.c.height));
    const H = Math.max(1024, Math.ceil(this.neonUsedH / 512) * 512);
    const C = mkCanvas(W, H), g = C.getContext('2d');
    for (const it of items) {
      const cw = it.r.c.width, ch = it.r.c.height; g.drawImage(it.r.c, it.x, it.y);
      this.signs[it.name] = { u0: it.x / W, u1: (it.x + cw) / W, v0: 1 - (it.y + ch) / H, v1: 1 - it.y / H, aspect: it.aspect || it.r.w / it.r.h };
    }
    this.neonTex = Gfx.texCanvas(C, { clamp: true });
  }
};

