/* =====================================================================
   FLORE — les plantes que la marée du Débordement a fait pousser dans Port-Saline.
   Elles naissent d'une graine déterministe par case de 24 m (le même monde à chaque partie),
   luisent la nuit, se récoltent (touche d'action) et repoussent quelques minutes plus tard.
   ===================================================================== */
const NCELL = 24, NREGROW = 6 * 60 * 1000;
const _fc = (x, y, z, rx, ry, rz, sx, sy, sz) => M4.compose(M4.create(), x, y, z, rx, ry, rz, sx, sy, sz);
const _fs = (a, b, r) => M4.segment(M4.create(), a[0], a[1], a[2], b[0], b[1], b[2], r);
const _fa = (g, geo, m, c) => g.addGeo(NG[geo], m, [c[0], c[1], c[2], 0]);

const FLORA = {
  lys: {
    name: 'Lys des marées', css: '#6fe6ff', item: 'petale_lys', n: [1, 3], glow: 2.2, gc: [0.35, 0.9, 1], halo: 0.55, pulse: 0.9, glowTxt: 'Luit en bleu',
    w: { shore: 4, wild: 0.6, garden: 0.6, urban: 0.1 },
    codex: {
      latin: 'Lilium refluxum', habitat: 'Quais, berges, bords des bassins : partout où l’eau du Débordement s’est retirée.',
      behave: 'Trois hampes recourbées portent chacune une cloche qui pend et luit d’un bleu froid. Les cloches se balancent même sans vent.',
      lore: '« Là où la marée a reculé, elle laisse ses lys comme on laisse une bougie sur une tombe. » Dicton des pêcheurs de Port-Saline.',
      hint: 'Cherchez au bord de l’eau.'
    },
    build(B, G) {
      const r = mulberry32(11), st = [0.13, 0.3, 0.2];
      for (let k = 0; k < 3; k++) {
        const yw = k * 2.1 + r() * 0.6, h = 0.5 + r() * 0.35, ln = 0.14 + r() * 0.12, dx = Math.sin(yw), dz = Math.cos(yw);
        const P = [[0, 0, 0], [dx * ln * 0.3, h * 0.5, dz * ln * 0.3], [dx * ln * 0.85, h * 0.9, dz * ln * 0.85], [dx * ln * 1.35, h * 0.92, dz * ln * 1.35]];
        for (let i = 0; i < 3; i++) _fa(B, 'cyl', _fs(P[i], P[i + 1], 0.013 - i * 0.002), st);
        const t = P[3];
        _fa(G, 'cone', _fc(t[0], t[1] - 0.15, t[2], 0, 0, 0, 0.075, 0.15, 0.075), [0.35, 0.88, 1]);
        _fa(G, 'sph', _fc(t[0], t[1] - 0.16, t[2], 0, 0, 0, 0.022, 0.03, 0.022), [0.85, 1, 1]);
        _fa(B, 'sph', _fc(dx * 0.1, 0.06, dz * 0.1, -0.75, yw, 0, 0.035, 0.008, 0.2), [0.1, 0.26, 0.17]);
      }
    }
  },
  lanterne: {
    name: 'Champignon-lanterne', css: '#5dffc0', item: 'chapeau_lanterne', n: [1, 2], glow: 2.4, gc: [0.25, 1, 0.7], halo: 0.25, pulse: 1.4, glowTxt: 'Luit en vert',
    w: { wild: 4, garden: 2, urban: 2.2, shore: 0.8 },
    codex: {
      latin: 'Lucerna fungi', habitat: 'Pied des murs, pelouses, ruelles humides. Le plus commun des champignons de la marée.',
      behave: 'Des touffes de quatre ou cinq chapeaux qui respirent : leur lueur verte enfle et retombe lentement.',
      lore: 'Les enfants des enclaves en mettent dans des bocaux pour se faire des veilleuses. Les vieux disent qu’il ne faut pas les regarder trop longtemps.',
      hint: 'Il en pousse presque partout, au pied des murs.'
    },
    build(B, G) {
      const r = mulberry32(23);
      for (let k = 0; k < 5; k++) {
        const a = r() * TAU, d = k ? 0.06 + r() * 0.14 : 0, x = Math.sin(a) * d, z = Math.cos(a) * d, h = 0.1 + r() * 0.22 * (k ? 0.8 : 1.3), rc = h * 0.42 + 0.035, tl = (r() - 0.5) * 0.3;
        _fa(B, 'tap', _fs([x, 0, z], [x + tl * h, h, z], 0.018 + h * 0.06), [0.72, 0.76, 0.66]);
        _fa(B, 'sph', _fc(x + tl * h, h - 0.012, z, 0, 0, 0, rc * 0.92, rc * 0.18, rc * 0.92), [0.2, 0.34, 0.3]);
        _fa(G, 'sph', _fc(x + tl * h, h, z, 0, 0, 0, rc, rc * 0.48, rc), [0.25, 1, 0.72]);
      }
    }
  },
  ronce: {
    name: 'Ronce sanguine', css: '#ff4058', item: 'baie_sanguine', n: [2, 4], glow: 1.3, gc: [1, 0.12, 0.2], halo: 0.45, pulse: 0.6, hurt: 4, glowTxt: 'Baies rougeoyantes',
    w: { wild: 3, garden: 2, urban: 0.5, shore: 0.2 },
    codex: {
      latin: 'Rubus cruoris', habitat: 'Parcs et cimetières, contre les grilles et les tombes.',
      behave: 'Un buisson noir aux épines longues comme des clous, chargé de baies qui rougeoient comme des braises.',
      tip: 'Les épines piquent : la cueillette coûte parfois quelques points de vie. Les baies se mangent depuis la sacoche.',
      lore: 'On raconte qu’elle ne pousse que là où le sang a coulé. À Port-Saline, il en pousse beaucoup.',
      hint: 'Elle aime les parcs et le cimetière.'
    },
    build(B, G) {
      const r = mulberry32(37), br = [0.2, 0.05, 0.06], lf = [0.12, 0.13, 0.08];
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * TAU + r() * 0.5, R0 = 0.32 + r() * 0.18, h = 0.32 + r() * 0.3, dx = Math.sin(a), dz = Math.cos(a);
        const P = [[dx * 0.05, 0, dz * 0.05], [dx * R0 * 0.45, h * 0.75, dz * R0 * 0.45], [dx * R0, h, dz * R0], [dx * R0 * 1.25, h * 0.78, dz * R0 * 1.25]];
        for (let i = 0; i < 3; i++) _fa(B, 'tap', _fs(P[i], P[i + 1], 0.024 - i * 0.006), br);
        for (let i = 1; i < 3; i++) { const p = P[i]; _fa(B, 'cone', _fs(p, [p[0] + dx * 0.07 + dz * 0.03, p[1] + 0.04, p[2] + dz * 0.07 - dx * 0.03], 0.01), [0.5, 0.42, 0.36]); }
        _fa(B, 'sph', _fc(P[1][0], P[1][1] + 0.02, P[1][2], -0.4, a + 0.6, 0, 0.05, 0.01, 0.09), lf);
        const t = P[2]; for (let i = 0; i < 3; i++) _fa(G, 'sph', _fc(t[0] + (r() - 0.5) * 0.07, t[1] - 0.03 + (r() - 0.5) * 0.05, t[2] + (r() - 0.5) * 0.07, 0, 0, 0, 0.028, 0.028, 0.028), [1, 0.1, 0.18]);
      }
    }
  },
  mousse: {
    name: 'Mousse d’écume', css: '#7dd8c8', item: 'mousse_ecume', n: [1, 3], glow: 1.6, gc: [0.4, 1, 0.85], halo: 0.05, pulse: 0.5, glowTxt: 'Scintille',
    w: { urban: 3, shore: 2, wild: 2, garden: 2 },
    codex: {
      latin: 'Bryum spumae', habitat: 'Pavés, trottoirs, marches : là où l’eau a stagné longtemps.',
      behave: 'Des plaques spongieuses semées de points de lumière, comme de l’écume restée prise dans la pierre.',
      lore: 'Les guérisseurs des enclaves l’appliquent sur les plaies : elle boit le sang et ne laisse qu’une cicatrice pâle, légèrement lumineuse.',
      hint: 'Regardez par terre, dans les rues.'
    },
    build(B, G) {
      const r = mulberry32(41);
      for (let k = 0; k < 5; k++) { const a = r() * TAU, d = r() * 0.3; _fa(B, 'sph', _fc(Math.sin(a) * d, 0.0, Math.cos(a) * d, 0, r() * 3, 0, 0.22 + r() * 0.25, 0.035, 0.18 + r() * 0.2), [0.08, 0.2, 0.18]); }
      for (let k = 0; k < 16; k++) { const a = r() * TAU, d = r() * 0.42; _fa(G, 'sph', _fc(Math.sin(a) * d, 0.03, Math.cos(a) * d, 0, 0, 0, 0.018, 0.018, 0.018), [0.4, 1, 0.85]); }
    }
  },
  larme: {
    name: 'Larme d’argent', css: '#e6f2ff', item: 'larme_argent', n: [1, 1], rare: true, glow: 3.2, gc: [0.8, 0.9, 1], halo: 0.44, pulse: 2.2, glowTxt: 'Éclat argenté',
    w: { wild: 0.6, garden: 0.4, shore: 0.3, urban: 0.04 },
    codex: {
      latin: 'Lacrima argentea', habitat: 'Rare. Parcs, pelouses, parfois une plage. Toujours seule.',
      behave: 'Une fleur blanche à six pétales ; en son cœur pend une goutte de lumière qui palpite comme une étoile.',
      lore: 'Les alchimistes la paient au poids de l’argent. Les veuves de marins disent que chaque fleur est une larme versée pour un noyé.',
      hint: 'Rare : une lueur blanche, seule dans l’herbe.'
    },
    build(B, G) {
      _fa(B, 'cyl', _fs([0, 0, 0], [0.02, 0.38, 0], 0.009), [0.5, 0.62, 0.55]);
      _fa(B, 'sph', _fc(0.03, 0.08, 0, -0.6, 1.4, 0, 0.025, 0.006, 0.12), [0.25, 0.4, 0.33]); _fa(B, 'sph', _fc(-0.03, 0.12, 0, -0.6, -1.8, 0, 0.025, 0.006, 0.11), [0.25, 0.4, 0.33]);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, dx = Math.sin(a), dz = Math.cos(a); _fa(B, 'sph', _fc(0.02 + dx * 0.05, 0.4, dz * 0.05, -0.5, a, 0, 0.03, 0.007, 0.06), [0.88, 0.92, 1]); }
      _fa(G, 'sph', _fc(0.02, 0.43, 0, 0, 0, 0, 0.022, 0.04, 0.022), [0.85, 0.95, 1]);
    }
  },
  fougere: {
    name: 'Fougère spectrale', css: '#b59cff', item: 'fronde_spectrale', n: [1, 2], glow: 0.7, gc: [0.55, 0.42, 1], halo: 0.35, pulse: 0.35, glowTxt: 'Translucide',
    w: { wild: 3, garden: 1, urban: 0.6, shore: 0.2 },
    codex: {
      latin: 'Pteris umbrarum', habitat: 'Coins d’ombre des parcs, allées du cimetière, cours abandonnées.',
      behave: 'Des frondes violettes à demi transparentes, qui semblent onduler à contretemps du vent.',
      lore: 'Sous la fougère spectrale, on dit qu’on entend parler les morts de la marée. Personne n’a jamais pu répéter ce qu’ils disent.',
      hint: 'Elle aime l’ombre du cimetière.'
    },
    build(B, G) {
      const r = mulberry32(53), c = [0.52, 0.42, 0.95];
      _fa(B, 'sph', _fc(0, 0.02, 0, 0, 0, 0, 0.07, 0.05, 0.07), [0.18, 0.12, 0.1]);
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * TAU + r() * 0.4, L = 0.45 + r() * 0.25, dx = Math.sin(a), dz = Math.cos(a); let px = 0, py = 0.03, pz = 0, el = 1.25;
        for (let i = 0; i < 4; i++) {
          const nx = px + dx * L / 4 * Math.cos(el), ny = py + L / 4 * Math.sin(el), nz = pz + dz * L / 4 * Math.cos(el);
          _fa(G, 'cyl', _fs([px, py, pz], [nx, ny, nz], 0.006), c);
          const ls = 0.07 * (1 - i * 0.18); _fa(G, 'sph', _fc((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, -el + 0.2, a + Math.PI / 2, 0, ls, 0.005, 0.022), c);
          px = nx; py = ny; pz = nz; el -= 0.42;
        }
      }
    }
  },
  racine: {
    name: 'Racine-cœur', css: '#ff9a3c', item: 'racine_coeur', n: [1, 1], rare: true, glow: 2.6, gc: [1, 0.45, 0.12], halo: 0.18, pulse: 1.1, heart: true, glowTxt: 'Bat comme un cœur',
    w: { wild: 0.45, urban: 0.15, garden: 0.2, shore: 0.05 },
    codex: {
      latin: 'Radix cordis', habitat: 'Rare. Sous les vieux arbres, entre les pavés défoncés, près des tombes.',
      behave: 'Un bulbe noueux d’où partent des racines tordues. Ses veines orange battent lentement, deux coups puis un silence.',
      lore: 'Les forgerons runiques en glissent une dans la braise avant de tremper une lame : l’acier, disent-ils, se souvient alors d’avoir été vivant.',
      hint: 'Rare : une lueur orange qui bat au ras du sol.'
    },
    build(B, G) {
      const r = mulberry32(61), bk = [0.2, 0.12, 0.08];
      _fa(B, 'sph', _fc(0, 0.12, 0, 0.2, 0, 0.1, 0.2, 0.16, 0.19), bk);
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r() * 0.5, L = 0.35 + r() * 0.3, dx = Math.sin(a), dz = Math.cos(a); _fa(B, 'tap', _fs([dx * 0.12, 0.1, dz * 0.12], [dx * L * 0.6, 0.06, dz * L * 0.6], 0.035), bk); _fa(B, 'tap', _fs([dx * L * 0.6, 0.06, dz * L * 0.6], [dx * L + dz * 0.1, 0.01, dz * L - dx * 0.1], 0.02), bk); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.3; _fa(G, 'sph', _fc(Math.sin(a) * 0.17, 0.13 + (k % 2) * 0.04, Math.cos(a) * 0.16, 0.3, a, 0.4, 0.025, 0.07, 0.025), [1, 0.45, 0.12]); }
      _fa(G, 'sph', _fc(0, 0.27, 0, 0, 0, 0, 0.05, 0.03, 0.05), [1, 0.55, 0.15]);
    }
  },
  roseau: {
    name: 'Roseau de brume', css: '#e8e0a8', item: 'fibre_roseau', n: [2, 4], glow: 1.8, gc: [1, 0.92, 0.6], halo: 1.25, pulse: 0.7, glowTxt: 'Pointes lumineuses',
    w: { shore: 4, wild: 0.6, garden: 0.2 },
    codex: {
      latin: 'Phragmites nebulae', habitat: 'Bords de mer, plage, bassins du parc.',
      behave: 'Une touffe de grands roseaux gris dont chaque épi porte une petite flamme pâle qui ne brûle pas.',
      lore: 'Les passeurs du Débordement s’en servaient pour baliser les gués. Une ligne de flammes pâles : on peut traverser. Pas de flamme : la marée attend.',
      hint: 'Au bord de la mer.'
    },
    build(B, G) {
      const r = mulberry32(71);
      for (let k = 0; k < 11; k++) {
        const a = r() * TAU, d = r() * 0.22, x = Math.sin(a) * d, z = Math.cos(a) * d, h = 0.85 + r() * 0.6, lx = (r() - 0.5) * 0.25, lz = (r() - 0.5) * 0.25;
        _fa(B, 'tap', _fs([x, 0, z], [x + lx, h, z + lz], 0.013), [0.42, 0.46, 0.36]);
        _fa(B, 'sph', _fc(x + lx * 0.95, h - 0.08, z + lz * 0.95, 0, 0, 0, 0.022, 0.085, 0.022), [0.35, 0.26, 0.18]);
        _fa(G, 'sph', _fc(x + lx * 1.02, h + 0.04, z + lz * 1.02, 0, 0, 0, 0.016, 0.03, 0.016), [1, 0.92, 0.62]);
      }
    }
  },
  lucioles: {
    name: 'Lucioles d’âme', css: '#fff08a', item: 'essence_lumineuse', n: [1, 2], swarm: true, gc: [1, 0.95, 0.45], glowTxt: 'Essaim',
    w: { wild: 0.9, garden: 0.35, shore: 0.2 },
    codex: {
      latin: 'Lampyris animarum', habitat: 'Au-dessus des pelouses et des tombes, la nuit.',
      behave: 'Un essaim qui tourne lentement sur lui-même à hauteur d’homme. On peut en capturer quelques-unes à mains nues.',
      lore: 'Chaque luciole serait une âme que la marée n’a pas réussi à emporter. On ne les garde jamais plus d’une nuit : on les distille.',
      hint: 'Des points jaunes qui tournent au-dessus de l’herbe.'
    },
    build() { }
  }
};

const Flora = {
  cells: new Map(), list: [], inst: {}, gen: [], cx: 1e9, cz: 1e9,
  init() {
    for (const k in FLORA) {
      const S = FLORA[k]; if (S.swarm) continue;
      const B = new GeoBuilder(), Gb = new GeoBuilder(); S.build(B, Gb);
      const b = new Instanced(B.build(), 1600); b.mat = k === 'racine' ? NMAT.bark : NMAT.plant; Render.inst.push(b);
      const g = new Instanced(Gb.build(), 1600); g.mat = NMAT.plant; Render.inst.push(g);
      this.inst[k] = { b, g };
    }
  },
  // les plantes d'une case de 24 m (toujours les mêmes : graine tirée des coordonnées)
  makeCell(ci, cj) {
    const out = [], rnd = mulberry32((ci * 73856093) ^ (cj * 19349663) ^ 0x5eed);
    const x0 = ci * NCELL, z0 = cj * NCELL, bi = Nature.biome(x0 + NCELL / 2, z0 + NCELL / 2);
    const tries = { wild: 15, shore: 10, garden: 7, urban: 3 }[bi] || 3;
    const keys = Object.keys(FLORA).filter(k => !FLORA[k].swarm);
    let wsum = 0; for (const k of keys) wsum += FLORA[k].w[bi] || 0;
    for (let n = 0; n < tries; n++) {
      const x = x0 + rnd() * NCELL, z = z0 + rnd() * NCELL; let u = rnd() * wsum, sp = keys[0];
      for (const k of keys) { u -= FLORA[k].w[bi] || 0; if (u <= 0) { sp = k; break; } }
      const yaw = rnd() * TAU, s = 0.8 + rnd() * 0.5, ph = rnd() * TAU;
      if (Nature.biome(x, z) !== bi && rnd() < 0.5) continue;
      const g = Nature.freeAt(x, z, sp === 'ronce' ? 0.55 : 0.3, sp === 'mousse' && rnd() < 0.4);
      if (g < 0) continue;
      out.push({ id: ci + ',' + cj + ',' + n, sp, x, y: g, z, yaw, s, ph });
    }
    // un essaim de lucioles de temps en temps au-dessus de l'herbe
    const sw = FLORA.lucioles.w[bi] || 0;
    if (rnd() < sw * 0.45) { const x = x0 + 4 + rnd() * (NCELL - 8), z = z0 + 4 + rnd() * (NCELL - 8), g = Nature.freeAt(x, z, 1.2, false); if (g >= 0) out.push({ id: ci + ',' + cj + ',s', sp: 'lucioles', x, y: g, z, yaw: 0, s: 1, ph: rnd() * TAU }); }
    return out;
  },
  // les cases autour du point d'intérêt : quelques-unes générées par image, les lointaines oubliées
  update(dt) {
    const P = Game.player, c = P && !P.hidden ? P.pos : Cam.target, ci = Math.floor(c.x / NCELL), cj = Math.floor(c.z / NCELL), RAD = 4;
    if (ci !== this.cx || cj !== this.cz) {
      this.cx = ci; this.cz = cj; this.gen.length = 0;
      for (let i = -RAD; i <= RAD; i++) for (let j = -RAD; j <= RAD; j++) { const k = (ci + i) + ':' + (cj + j); if (!this.cells.has(k)) this.gen.push([ci + i, cj + j, i * i + j * j]); }
      this.gen.sort((a, b) => a[2] - b[2]);
      for (const [k, v] of this.cells) { const [a, b] = k.split(':').map(Number); if (Math.abs(a - ci) > RAD + 2 || Math.abs(b - cj) > RAD + 2) this.cells.delete(k); }
      this.dirty = true;
    }
    for (let n = 0; n < 3 && this.gen.length; n++) { const [a, b] = this.gen.shift(); this.cells.set(a + ':' + b, this.makeCell(a, b)); this.dirty = true; }
    if (this.dirty) { this.dirty = false; this.list = []; for (const v of this.cells.values()) for (const p of v) this.list.push(p); }
    // le carnet note chaque espèce croisée de près
    if (P && !P.hidden && (this._dT = (this._dT || 0) - dt) <= 0) {
      this._dT = 0.4;
      for (const p of this.list) { if (NSave.d.seen['flore:' + p.sp]) continue; if (dist2D(p.x, p.z, P.pos.x, P.pos.z) < 9 && Cam.sphereVisible(p.x, p.y + 0.4, p.z, 0.6)) Nature.discover('flore', p.sp, FLORA[p.sp].name); }
    }
  },
  picked(p) { const t = NSave.d.picked[p.id]; if (!t) return false; if (Date.now() - t > NREGROW) { delete NSave.d.picked[p.id]; NSave.write(); return false; } return true; },
  harvestCandidate(pos) {
    let best = null, bd = 1e9;
    for (const p of this.list) {
      const S = FLORA[p.sp], r = S.swarm ? 2.6 : 1.5, d = dist2D(p.x, p.z, pos.x, pos.z); if (d > r || d >= bd || Math.abs(p.y - pos.y) > 1.2 || this.picked(p)) continue;
      bd = d; best = p;
    }
    if (!best) return null;
    const S = FLORA[best.sp];
    return { type: 'use', target: { pos: { x: best.x, y: best.y, z: best.z }, use: P => this.harvest(best, P) }, text: (S.swarm ? 'Capturer · ' : 'Cueillir · ') + S.name };
  },
  harvest(p, P) {
    const S = FLORA[p.sp]; if (this.picked(p)) return;
    NSave.d.picked[p.id] = Date.now(); NSave.write();
    Nature.discover('flore', p.sp, S.name);
    const n = RI(S.n[0], S.n[1]); Satchel.add(S.item, n, { x: p.x, y: p.y + 0.4, z: p.z });
    NSnd.play('harvest', p); if (S.swarm) NSnd.play('chime', p, 0.6);
    const c = S.gc; for (let i = 0; i < 14; i++) FX.P(p.x + R(-0.25, 0.25), p.y + (S.swarm ? 1.3 : 0.3) + R(0, 0.4), p.z + R(-0.25, 0.25), { vx: R(-0.6, 0.6), vy: R(0.5, 1.8), vz: R(-0.6, 0.6), life: R(0.6, 1.3), size: R(0.05, 0.11), r: c[0] * 2, g: c[1] * 2, b: c[2] * 2, cell: 0, drag: 1.5 });
    if (P) { P.yaw = angleTo(P.pos.x, P.pos.z, p.x, p.z); }
    if (S.hurt && P && Math.random() < 0.45) { P.hp = Math.max(1, P.hp - S.hurt); P.hitFlash = 0.6; HUD.toast('Les épines piquent', '−' + S.hurt + ' PV', 'bad', true); }
  },
  render() {
    const C = Cam.pos, t = Nature.t, wind = 0.6 + Env.wind * 1.4, A = Render.addParticles, M = this._m || (this._m = M4.create());
    const near = Game.mode === 'play' ? 72 : 60;
    for (const p of this.list) {
      const dx = p.x - C.x, dz = p.z - C.z, d2 = dx * dx + dz * dz; if (d2 > near * near) continue;
      if (!Cam.sphereVisible(p.x, p.y + 0.5, p.z, 1.6)) continue;
      const S = FLORA[p.sp], pk = this.picked(p), d = Math.sqrt(d2);
      if (S.swarm) { if (!pk) this.swarm(p, t, d); continue; }
      const sw = Math.sin(t * 1.3 + p.ph) * 0.045 * wind, sw2 = Math.cos(t * 1.1 + p.ph * 1.7) * 0.04 * wind, s = p.s * (pk ? 0.45 : 1);
      M4.compose(M, p.x, p.y, p.z, sw, p.yaw, sw2, s, s, s);
      const I = this.inst[p.sp]; I.b.push(M, 1, 1, 1, 0);
      if (pk) continue;
      let k = 0.75 + 0.25 * Math.sin(t * S.pulse * 2 + p.ph);
      if (S.heart) { const u = (t * 1.1 + p.ph) % 1.6; k = 0.45 + 0.7 * (Math.exp(-((u - 0.1) ** 2) / 0.004) + 0.7 * Math.exp(-((u - 0.38) ** 2) / 0.004)); }
      I.g.push(M, 1, 1, 1, S.glow * k);
      // halo dans le bloom (pas de lumière réelle : la ville en a déjà beaucoup)
      if (d < 32) { const c = S.gc, a = (1 - d / 32) * 0.3 * k * (S.rare ? 1.6 : 1); A.push(p.x, p.y + S.halo * s, p.z, (0.7 + (S.rare ? 0.5 : 0)) * s, c[0], c[1], c[2], a, 0, 1, 0, false); }
    }
  },
  // essaim de lucioles : une trentaine de points qui tournent et clignotent
  swarm(p, t, d) {
    const A = Render.addParticles, c = FLORA.lucioles.gc, n = d < 40 ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + t * (0.25 + (i % 5) * 0.05), r = 0.6 + ((i * 37) % 11) / 11 * 1.6, y = p.y + 0.7 + ((i * 13) % 7) / 7 * 1.3 + Math.sin(t * 1.3 + i) * 0.25;
      const bl = Math.max(0, Math.sin(t * (2 + (i % 3)) + i * 1.7)); if (bl < 0.15) continue;
      A.push(p.x + Math.sin(a) * r, y, p.z + Math.cos(a) * r, 0.09 + bl * 0.06, c[0] * 2.4, c[1] * 2.4, c[2] * 2.4, bl, 0, 1, 0, false);
    }
    if (d < 30) A.push(p.x, p.y + 1.3, p.z, 2.8, c[0], c[1], c[2], 0.08, 0, 1, 0, false);
  }
};
