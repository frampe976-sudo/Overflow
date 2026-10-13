/* =====================================================================
   FOLK — the people of Port-Saline in the game. Every human character
   gets a look (build, outfit, face, hair, colours); its sculpted pieces
   (dressed body, head, hands, eyes, hair, headwear) are generated in the
   background at four levels of detail and cached, then drawn skinned on
   the GPU: bones and palette of every visible person in one float
   texture, one instanced draw per piece and level of detail.
   ===================================================================== */
const Folk = (() => {
  const PP = People, S = Sculpt;
  const { SK, LIP, HAIR, IRIS, EYEW, TOP, TOP2, BOT, SHOE, SOLE, ACC, ACC2, GLOVE, LEGS, GLOW, HAT } = PP;

  /* ---------------- builds (body shape presets per sex) ---------------- */
  const BUILD = {
    m: { slim: { mass: 0.1, musc: 0.28 }, avg: { mass: 0.32, musc: 0.38 }, heavy: { mass: 0.8, musc: 0.3 }, strong: { mass: 0.42, musc: 0.8 }, huge: { mass: 0.62, musc: 1.0 }, old: { mass: 0.42, musc: 0.15, age: 1 } },
    f: { slim: { mass: 0.1, musc: 0.14 }, avg: { mass: 0.3, musc: 0.2 }, curvy: { mass: 0.64, musc: 0.18 }, old: { mass: 0.45, musc: 0.1, age: 1 } }
  };

  /* ---------------- garments (layers over the skin, see People) ---------------- */
  const up = (B, o) => PP.upper(B, o), lo = (B, o) => PP.lower(B, o);
  const jeans = (B, o = {}) => lo(B, Object.assign({ t: 0.006, waist: 1.0, cuff: 0.1 }, o));
  const trousers = (B, o = {}) => lo(B, Object.assign({ t: 0.008, waist: 1.02, cuff: 0.1, vol: PP.trouserLegs(B, (o.r || 0.057) + 0.008 * B.ms) }, o));
  const leggings = (B, o = {}) => lo(B, Object.assign({ t: 0.003, waist: 0.99, cuff: 0.1, slot: LEGS, edge: 0.1 }, o));
  const tee = (B, o = {}) => up(B, Object.assign({ t: 0.006, hem: 0.93, sleeve: 0.14 }, o));
  const longSleeve = (B, o = {}) => up(B, Object.assign({ t: 0.007, hem: 0.92, sleeve: 0.53 }, o));
  const skirt = (B, o = {}) => ({ t: o.t || 0.007, slot: o.slot === undefined ? BOT : o.slot, region: new S.RBox([0, 0.8, 0], [0.34, 0.2, 0.36], 0), vol: PP.skirtVol(B, { y0: o.y0 || 0.97, y1: o.y1 || 0.56, r1: o.r1 || 0.2, stiff: o.stiff }), fade: 0.008 });
  // coat / robe tails: a cone from the waist to the hem, joined to the upper layer
  const tails = (B, y1, r1, o = {}) => PP.skirtVol(B, { y0: o.y0 || 1.02, y1, r0: o.r0 || (B.f ? 0.19 : 0.185), r1, z: -0.012, ez: o.ez || 0.78, stiff: o.stiff === undefined ? 0.45 : o.stiff });
  const collar = (B, o = {}) => PP.collar(B, o);
  // reflective bands painted across a layer (hi-vis vests, work jackets, police)
  const bands = (ys, w, slot) => (x, y, z, T) => { for (const c of ys) if (Math.abs(y - c) < w) { T.m = slot; T.e = 1; T.s = 1; return; } };
  // a stripe around the chest (police)
  const chestBand = (y0, y1, slot) => (x, y, z, T) => { if (y > y0 && y < y1) { T.m = slot; T.e = 1; } };
  const pocket = (B, x, y, z, w, h, slot) => PP.patch([x, y, z], [w, h, 0.012], 0.006, slot);
  const pads = (B, k, slot) => [1, -1].map(sx => { const e = new S.Ell([sx * (B.R.shx + 0.005), 1.465, -0.006], [0.075 * k, 0.05 * k, 0.078 * k], S.euler(0, 0, sx * -0.35), slot); e.on(sx > 0 ? 'shL' : 'shR', 'chest', 0.2, 0.9); return e; });

  /* ---------------- outfits: make(B) -> { layers, extras, shoes } ---------------- */
  const OUTFITS = {
    // ----- men
    m_tee: { sex: 'm', builds: ['slim', 'avg', 'heavy'], shoes: 'sneaker', make: B => ({ layers: [jeans(B), tee(B)] }) },
    m_hoodie: { sex: 'm', builds: ['slim', 'avg'], shoes: 'sneaker', make: B => ({ layers: [trousers(B, { r: 0.056, t: 0.007 }), up(B, { t: 0.013, hem: 0.9, sleeve: 0.54 })], extras: [PP.hoodDown(B, TOP), pocket(B, 0, 1.0, 0.105 + 0.03 * B.ms, 0.085, 0.045, TOP)] }) },
    m_shirt: { sex: 'm', builds: ['avg', 'heavy'], shoes: 'dress', make: B => ({ layers: [trousers(B), longSleeve(B, { t: 0.007, hem: 0.95, sleeve: 0.5 })], extras: [collar(B, { h: 0.03, open: 0.022 })] }) },
    m_coat: { sex: 'm', builds: ['avg', 'slim', 'old'], shoes: 'dress', make: B => ({ layers: [trousers(B), up(B, { t: 0.02, hem: 0.6, sleeve: 0.55, vol: tails(B, 0.58, 0.19, { ez: 0.66, r0: 0.175 }), k: 0.02, fade: 0.01 })], extras: [collar(B, { h: 0.05, y: 1.43, open: 0.05 })] }) },
    m_jacket: { sex: 'm', builds: ['avg', 'strong'], shoes: 'boot', make: B => ({ layers: [jeans(B, { t: 0.007 }), up(B, { t: 0.017, hem: 0.93, sleeve: 0.54 })], extras: [collar(B, { h: 0.035, open: 0.03 })] }) },
    m_suit: { sex: 'm', builds: ['avg', 'slim'], shoes: 'dress', make: B => ({ layers: [trousers(B, { r: 0.055 }), up(B, { t: 0.016, hem: 0.86, sleeve: 0.54, neck: 'deep', paint: (x, y, z, T) => { if (z > 0 && Math.abs(x) < 0.012 && y > 1.2 && y < 1.43) { T.m = ACC; T.s = 1; } } })], extras: [collar(B, { h: 0.028, open: 0.012, slot: TOP2 })] }) },
    m_worker: { sex: 'm', builds: ['heavy', 'strong'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.062, t: 0.01 }), up(B, { t: 0.016, hem: 0.9, sleeve: 0.54, paint: bands([1.06, 1.3], 0.014, ACC2) })], extras: [collar(B, { h: 0.03, open: 0.03 })] }) },
    // ----- women
    f_tee: { sex: 'f', builds: ['slim', 'avg'], shoes: 'sneaker', make: B => ({ layers: [jeans(B, { t: 0.005 }), tee(B, { t: 0.005, hem: 0.96, sleeve: 0.12, vol: bust(B), k: 0.03 })] }) },
    f_blouse: { sex: 'f', builds: ['slim', 'avg', 'curvy'], shoes: 'flat', make: B => ({ layers: [up(B, { t: 0.006, hem: 0.95, sleeve: 0.45, neck: 'v', vol: bust(B), k: 0.03 }), skirt(B)] }) },
    f_dress: { sex: 'f', builds: ['slim', 'avg'], shoes: 'heel', make: B => ({ layers: [leggings(B, { t: 0.0015, cuff: 0.1, waist: 0.6, fade: 0.004 }), up(B, { t: 0.006, hem: 0.9, sleeve: 0.1, neck: 'wide', vol: bust(B), k: 0.03 }), skirt(B, { slot: TOP, y0: 0.99, y1: 0.54, r1: 0.215 })] }) },
    f_coat: { sex: 'f', builds: ['slim', 'avg'], shoes: 'boot', make: B => ({ layers: [leggings(B), up(B, { t: 0.018, hem: 0.52, sleeve: 0.52, vol: U2(tails(B, 0.5, 0.24), bust(B)), k: 0.02, fade: 0.01 })], extras: [collar(B, { h: 0.045, y: 1.43, open: 0.045 })] }) },
    f_hoodie: { sex: 'f', builds: ['slim', 'avg'], shoes: 'sneaker', make: B => ({ layers: [leggings(B, { t: 0.004 }), up(B, { t: 0.012, hem: 0.9, sleeve: 0.52, vol: bust(B), k: 0.03 })], extras: [PP.hoodDown(B, TOP)] }) },
    f_jacket: { sex: 'f', builds: ['avg', 'curvy'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.05, t: 0.006 }), up(B, { t: 0.014, hem: 0.93, sleeve: 0.52, vol: bust(B), k: 0.03 })], extras: [collar(B, { h: 0.03, open: 0.035 })] }) },
    f_old: { sex: 'f', builds: ['old'], shoes: 'flat', make: B => ({ layers: [leggings(B, { t: 0.0015, waist: 0.6 }), up(B, { t: 0.012, hem: 0.88, sleeve: 0.5, vol: bust(B), k: 0.03 }), skirt(B, { y1: 0.3, r1: 0.215, t: 0.008 })], extras: [collar(B, { h: 0.025, open: 0.04, slot: TOP2 })] }) },
    // ----- gangs
    thug: { sex: 'm', builds: ['avg', 'strong'], shoes: 'sneaker', make: B => ({ layers: [jeans(B, { t: 0.008 }), up(B, { t: 0.012, hem: 0.9, sleeve: 0.54 }), vest(B)], extras: [PP.hoodDown(B, TOP)] }) },
    thug2: { sex: 'm', builds: ['avg', 'strong'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.06, t: 0.01 }), up(B, { t: 0.016, hem: 0.92, sleeve: 0.54 }), vest(B)], extras: [collar(B, { h: 0.03, open: 0.03 })] }) },
    thug3: { sex: 'm', builds: ['slim', 'avg'], shoes: 'sneaker', make: B => ({ layers: [trousers(B, { r: 0.056, t: 0.007 }), tee(B, { t: 0.007 }), vest(B)] }) },
    boss: { sex: 'm', builds: ['huge'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.066, t: 0.012 }), up(B, { t: 0.02, hem: 0.88, sleeve: 0.55 }), vest(B, 0.032)], extras: pads(B, 1.1, ACC).concat([collar(B, { h: 0.04, open: 0.04 })]) }) },
    forgeron: { sex: 'm', builds: ['avg', 'strong'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.06, t: 0.01 }), up(B, { t: 0.017, hem: 0.9, sleeve: 0.54, paint: bands([1.12, 1.3], 0.012, ACC2) })], extras: [collar(B, { h: 0.035, open: 0.035 }), pocket(B, 0.07, 1.3, 0.11, 0.03, 0.03, TOP2)] }) },
    // ----- the tide cult: robes, hood and mask (headwear)
    robe: { sex: 'm', builds: ['avg'], shoes: 'boot', make: B => ({ layers: [up(B, { t: 0.012, hem: 0.12, sleeve: 0.56, vol: tails(B, 0.1, 0.3, { y0: 1.05, stiff: 0.6 }), k: 0.025, fade: 0.008, paint: robeTrim(0.14, ACC2) })] }) },
    herald: { sex: 'm', builds: ['strong'], shoes: 'boot', make: B => ({ layers: [up(B, { t: 0.014, hem: 0.1, sleeve: 0.56, vol: tails(B, 0.08, 0.34, { y0: 1.05, stiff: 0.6 }), k: 0.025, fade: 0.008, paint: robeTrim(0.2, GLOW) })], extras: pads(B, 1.05, ACC) }) },
    // ----- Sentinelle: tactical gear
    merc: { sex: 'm', builds: ['avg', 'strong'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.06, t: 0.01 }), longSleeve(B, { t: 0.009, hem: 0.9 }), carrier(B, 0.03), PP.beltRing(B, 1.0, 0.018, ACC2)], extras: kneePads(B).concat(pouches(B)) }) },
    mercBoss: { sex: 'm', builds: ['huge'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.066, t: 0.012 }), longSleeve(B, { t: 0.011, hem: 0.9 }), carrier(B, 0.04), PP.beltRing(B, 1.0, 0.02, ACC2)], extras: pads(B, 1.15, ACC).concat(kneePads(B), pouches(B)) }) },
    armor: { sex: 'm', builds: ['huge'], shoes: 'boot', make: B => ({ layers: [trousers(B, { r: 0.07, t: 0.016 }), longSleeve(B, { t: 0.014, hem: 0.9 }), carrier(B, 0.05), PP.beltRing(B, 1.0, 0.024, ACC2)], extras: pads(B, 1.35, ACC).concat(kneePads(B, 1.3), shinPlates(B)) }) },
    // ----- police
    cop: { sex: 'm', builds: ['avg', 'strong'], shoes: 'boot', make: B => ({ layers: [trousers(B), up(B, { t: 0.012, hem: 0.9, sleeve: 0.54, paint: chestBand(1.3, 1.33, ACC2) }), PP.beltRing(B, 1.0, 0.018, ACC)], extras: [collar(B, { h: 0.03, open: 0.02 })] }) }
  };
  const U2 = (a, b) => S.U([a, b], 0.02);
  // fabric spanning the bust (no tuck between and under the breasts)
  function bust(B) { const m = B.ms; return S.U([new S.Ell([0, 1.285, 0.07 + 0.006 * m], [0.1 + 0.01 * m, 0.055, 0.05 + 0.008 * m]), new S.Ell([0, 1.19, 0.055 + 0.01 * m], [0.1, 0.07, 0.035 + 0.01 * m])], 0.04); }
  // hi-vis safety vest over the top (the gangs' orange), reflective bands across it
  function vest(B, t = 0.026) { return up(B, { t, hem: 0.96, sleeve: 0, neck: 'v', neckGap: 0.028, arms: 'holes', slot: ACC, fade: 0.008, paint: bands([1.09, 1.24], 0.013, ACC2) }); }
  // plate carrier: a thick box-like layer on the torso with a light strip across the chest
  function carrier(B, t) { return up(B, { t, hem: 1.02, sleeve: 0, top: 1.5, neckGap: 0.03, arms: 'holes', slot: ACC, fade: 0.01, edge: 0.3, paint: (x, y, z, T) => { if (z > 0.04 && y > 1.35 && y < 1.375) { T.m = GLOW; T.e = 1; } } }); }
  function kneePads(B, k = 1) { return [0, 1].map(s => { const R = B.R, kn = s ? 'knR' : 'knL'; const e = PP.patch(PP.at(R, kn, 0, 0.0, 0.06 + 0.012 * B.ms), [0.045 * k, 0.05 * k, 0.018 * k], 0.014, ACC, PP.axes(R, kn)); e.a.on(kn); return e; }); }
  function shinPlates(B) { return [0, 1].map(s => { const R = B.R, kn = s ? 'knR' : 'knL'; const e = PP.patch(PP.at(R, kn, 0, -0.2, 0.055 + 0.01 * B.ms), [0.045, 0.13, 0.016], 0.014, ACC, PP.axes(R, kn)); e.a.on(kn); return e; }); }
  function pouches(B) { const z = 0.12 + 0.03 * B.ms; return [-0.07, 0, 0.07].map(x => PP.patch([x, 1.1, z], [0.028, 0.035, 0.018], 0.008, ACC2)); }
  // trims along the hem and the sleeve ends of robes
  function robeTrim(h, slot) { return (x, y, z, T) => { if (y < h && y > h - 0.05) { T.m = slot; T.e = slot === GLOW ? 1 : 0; } }; }

  /* ---------------- colours (linear, lit by the night) ---------------- */
  const COL = {
    skin: [[0.86, 0.6, 0.47], [0.8, 0.54, 0.4], [0.7, 0.46, 0.33], [0.58, 0.37, 0.25], [0.47, 0.29, 0.19], [0.38, 0.23, 0.15], [0.31, 0.19, 0.125]],
    hair: [[0.03, 0.025, 0.02], [0.07, 0.045, 0.028], [0.16, 0.09, 0.045], [0.3, 0.16, 0.07], [0.55, 0.4, 0.2], [0.26, 0.07, 0.03]],
    grey: [[0.5, 0.49, 0.48], [0.68, 0.67, 0.66], [0.82, 0.81, 0.8]],
    iris: [[0.2, 0.11, 0.05], [0.1, 0.06, 0.03], [0.16, 0.26, 0.4], [0.2, 0.28, 0.16], [0.28, 0.2, 0.09]],
    tops: [[0.2, 0.22, 0.26], [0.42, 0.1, 0.09], [0.16, 0.24, 0.2], [0.45, 0.38, 0.28], [0.12, 0.13, 0.18], [0.5, 0.48, 0.45], [0.3, 0.15, 0.3], [0.55, 0.36, 0.1], [0.12, 0.28, 0.42], [0.7, 0.68, 0.62], [0.08, 0.3, 0.3], [0.55, 0.2, 0.3], [0.3, 0.32, 0.14], [0.06, 0.06, 0.07]],
    bright: [[0.72, 0.1, 0.1], [0.8, 0.55, 0.1], [0.12, 0.45, 0.6], [0.75, 0.4, 0.55], [0.2, 0.5, 0.25], [0.85, 0.84, 0.8]],
    bots: [[0.12, 0.16, 0.28], [0.18, 0.23, 0.35], [0.07, 0.07, 0.09], [0.25, 0.23, 0.2], [0.14, 0.14, 0.16], [0.3, 0.26, 0.18], [0.2, 0.18, 0.24]],
    shoes: [[0.05, 0.045, 0.045], [0.18, 0.1, 0.05], [0.7, 0.7, 0.68], [0.3, 0.3, 0.32], [0.3, 0.05, 0.08]],
    coats: [[0.3, 0.22, 0.14], [0.12, 0.13, 0.16], [0.4, 0.34, 0.24], [0.2, 0.22, 0.2], [0.35, 0.08, 0.1], [0.1, 0.12, 0.22], [0.45, 0.42, 0.38]],
    legs: [[0.03, 0.03, 0.035], [0.25, 0.18, 0.14], [0.1, 0.08, 0.1]]
  };
  const vary = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  /* ---------------- looks ---------------- */
  // hair styles, faces and headwear per sex / kind
  const FACE_M = ['m1', 'm2', 'm3', 'm4'], FACE_F = ['f1', 'f2', 'f3', 'f4'];
  const HAIR_M = ['short', 'short', 'buzz', 'crop', 'slick', 'curly', 'afro', 'balding', null], HAIR_F = ['bob', 'long', 'pony', 'bun', 'braids', 'curly', 'afro', 'long', 'pony'];
  function palette(o) {
    const p = new Float32Array(64), set = (i, c, a = 0) => { p[i * 4] = c[0]; p[i * 4 + 1] = c[1]; p[i * 4 + 2] = c[2]; p[i * 4 + 3] = a; };
    const sk = o.skin;
    set(SK, sk, o.stub || 0); set(LIP, o.lips || [sk[0] * 0.8, sk[1] * 0.5, sk[2] * 0.5]); set(HAIR, o.hair); set(IRIS, o.iris); set(EYEW, [0.78, 0.76, 0.74]);
    set(TOP, o.top); set(TOP2, o.top2 || [0.75, 0.74, 0.7]); set(BOT, o.bot); set(SHOE, o.shoe); set(SOLE, o.sole || [0.7, 0.7, 0.68]);
    set(ACC, o.acc || [0.1, 0.1, 0.1], o.accE || 0); set(ACC2, o.acc2 || [0.6, 0.6, 0.6], o.acc2E || 0); set(GLOVE, o.glove || sk); set(LEGS, o.legs || sk);
    set(GLOW, o.glow || [0.2, 1, 0.8], o.glowE === undefined ? 2.2 : o.glowE); set(HAT, o.hat || [0.12, 0.12, 0.14]);
    return p;
  }
  // a look: { sex, build, outfit, face, hair, hat, gear, beard, pal, scale, shX, props }
  function make(kind, rnd = Math.random) {
    const pick = a => a[Math.floor(rnd() * a.length)], ch = k => rnd() < k;
    const L = { kind, sex: 'm', build: 'avg', outfit: 'm_tee', face: 'm1', hair: 'short', hat: null, gear: null, beard: null, scale: 1, age: 0 };
    const C = { skin: pick(COL.skin), iris: pick(COL.iris), hair: pick(COL.hair), top: pick(COL.tops), bot: pick(COL.bots), shoe: pick(COL.shoes) };
    const man = () => { L.sex = 'm'; L.face = pick(FACE_M); L.hair = pick(HAIR_M); if (ch(0.3)) L.beard = pick(['full', 'goatee', 'mustache']); C.stub = ch(0.6) ? 0.15 + 0.5 * rnd() : 0; };
    const woman = () => { L.sex = 'f'; L.face = pick(FACE_F); L.hair = pick(HAIR_F); if (ch(0.7)) C.lips = [0.4 + 0.25 * rnd(), 0.1 + 0.08 * rnd(), 0.13 + 0.08 * rnd()]; };
    const outfit = id => { L.outfit = id; L.build = pick(OUTFITS[id].builds); };
    switch (kind) {
      case 'civ': {
        const old = ch(0.14);
        if (ch(0.5)) {
          woman(); outfit(old ? 'f_old' : pick(['f_tee', 'f_blouse', 'f_dress', 'f_coat', 'f_hoodie', 'f_jacket', 'f_blouse', 'f_coat']));
          if (old) { L.face = 'fo'; L.hair = pick(['bun', 'bob', 'curly', 'curly']); C.hair = pick(COL.grey); L.age = 1; }
          if (ch(0.35)) C.top = pick(COL.bright);
          if (L.outfit === 'f_coat' || L.outfit === 'f_dress') C.legs = pick(COL.legs);
          if (L.outfit === 'f_dress') C.shoe = pick([[0.05, 0.045, 0.045], [0.35, 0.05, 0.08], [0.6, 0.45, 0.3]]);
          if (L.outfit === 'f_coat') C.top = pick(COL.coats.concat([[0.55, 0.1, 0.12], [0.6, 0.45, 0.28]]));
          L.scale = 0.95 + rnd() * 0.05;
        } else {
          man(); outfit(old ? 'm_coat' : pick(['m_tee', 'm_hoodie', 'm_shirt', 'm_coat', 'm_jacket', 'm_suit', 'm_worker', 'm_tee', 'm_shirt']));
          if (old) { L.face = 'mo'; L.build = 'old'; L.hair = pick(['balding', 'short', 'balding', null]); C.hair = pick(COL.grey); L.beard = ch(0.3) ? pick(['full', 'mustache']) : null; L.age = 1; }
          if (L.outfit === 'm_coat') C.top = pick(COL.coats);
          if (L.outfit === 'm_suit') { C.top = pick([[0.08, 0.08, 0.1], [0.14, 0.15, 0.2], [0.3, 0.3, 0.32], [0.25, 0.2, 0.15]]); C.bot = C.top; C.top2 = [0.82, 0.82, 0.8]; C.acc = pick([[0.45, 0.06, 0.08], [0.08, 0.12, 0.35], [0.1, 0.1, 0.1]]); L.hair = pick(['short', 'slick', 'crop', 'balding']); }
          if (L.outfit === 'm_worker') { C.top = pick([[0.12, 0.2, 0.42], [0.4, 0.25, 0.1], [0.2, 0.25, 0.18]]); C.acc2 = [0.8, 0.8, 0.75]; C.acc2E = 0.35; if (ch(0.4)) L.hat = 'cap'; }
          if (L.outfit === 'm_shirt' && ch(0.5)) C.top = pick(COL.bright);
          if (!L.hat && L.hair !== 'afro' && ch(0.12)) L.hat = pick(['cap', 'beanie']);
          L.scale = 0.98 + rnd() * 0.07;
        }
        break;
      }
      case 'thug': case 'thugBoss': {
        man(); outfit(kind === 'thugBoss' ? 'boss' : pick(['thug', 'thug', 'thug2', 'thug3']));
        C.top = pick([[0.08, 0.08, 0.1], [0.18, 0.18, 0.2], [0.22, 0.15, 0.1], [0.1, 0.14, 0.12], [0.25, 0.08, 0.08]]); C.bot = pick([[0.12, 0.14, 0.2], [0.18, 0.16, 0.14], [0.08, 0.08, 0.09], [0.22, 0.24, 0.16]]);
        C.acc = [0.95, 0.42, 0.08]; C.accE = 0.06; C.acc2 = [1.0, 0.85, 0.35]; C.acc2E = 1.2;
        L.hat = ch(0.6) ? 'beanie' : ch(0.4) ? 'cap' : null; C.hat = pick([[0.08, 0.08, 0.1], [0.5, 0.1, 0.08], [0.1, 0.25, 0.15], [0.3, 0.3, 0.3]]);
        if (!L.hat && ch(0.5)) L.hair = pick(['buzz', 'crop', 'short']);
        if (kind === 'thugBoss') { L.face = 'br'; L.scale = 1.28; L.beard = pick(['full', 'goatee', null]); C.stub = 0.6; }
        L.glowCol = [1, 0.54, 0.12];
        break;
      }
      case 'forgeron': {
        man(); outfit('forgeron'); C.top = [0.12, 0.2, 0.42]; C.top2 = [0.1, 0.16, 0.34]; C.bot = pick([[0.12, 0.12, 0.14], [0.2, 0.18, 0.15]]); C.acc2 = [0.35, 0.75, 1]; C.acc2E = 1.3;
        L.hat = ch(0.5) ? 'beanie' : null; C.hat = pick([[0.1, 0.1, 0.12], [0.2, 0.3, 0.5], [0.08, 0.06, 0.05]]); L.glowCol = [0.35, 0.75, 1];
        break;
      }
      case 'cultist': case 'herald': {
        man(); outfit(kind === 'herald' ? 'herald' : 'robe'); L.hair = 'short'; L.beard = null; L.hat = 'hood'; L.gear = 'mask';
        const robe = kind === 'herald' ? [0.03, 0.12, 0.12] : [0.05, 0.06, 0.07];
        C.top = robe; C.hat = robe; C.glove = [0.03, 0.03, 0.03]; C.shoe = [0.03, 0.03, 0.03]; C.acc = [0.05, 0.3, 0.28]; C.acc2 = [0.12, 0.2, 0.2];
        C.glow = [0.18, 0.95, 0.69]; C.glowE = 2.4; L.glowCol = [0.18, 0.95, 0.69];
        if (kind === 'herald') { L.scale = 1.34; C.accE = 0.3; }
        break;
      }
      case 'merc': case 'mercBoss': case 'colosse': case 'leviathan': {
        man(); outfit(kind === 'merc' ? 'merc' : kind === 'mercBoss' ? 'mercBoss' : 'armor'); L.hair = 'buzz'; L.beard = null;
        const lev = kind === 'leviathan', dark = [0.055, 0.06, 0.07], gear = lev ? [0.75, 0.74, 0.7] : [0.13, 0.14, 0.15], glow = lev ? [0.2, 0.85, 1] : [1, 0.14, 0.1];
        C.top = lev ? [0.2, 0.21, 0.23] : dark; C.bot = C.top; C.acc = gear; C.acc2 = lev ? [0.3, 0.32, 0.35] : [0.09, 0.1, 0.1]; C.glove = [0.03, 0.03, 0.035]; C.shoe = [0.03, 0.03, 0.03]; C.sole = [0.06, 0.06, 0.06];
        C.glow = glow; C.glowE = 2.0; C.hat = lev ? [0.8, 0.8, 0.78] : [0.08, 0.085, 0.095]; L.hat = 'helmet'; L.glowCol = glow;
        L.scale = kind === 'mercBoss' ? 1.14 : kind === 'colosse' ? 1.5 : kind === 'leviathan' ? 1.36 : 1;
        if (kind !== 'merc') L.face = 'br';
        break;
      }
      case 'cop': {
        man(); outfit('cop'); C.top = [0.1, 0.14, 0.27]; C.bot = [0.07, 0.08, 0.11]; C.shoe = [0.03, 0.03, 0.04]; C.acc = [0.05, 0.05, 0.06]; C.acc2 = [0.3, 0.72, 1.0]; C.acc2E = 1.4; L.hat = 'kepi'; C.hat = [0.08, 0.1, 0.2];
        break;
      }
      // the recurring characters of the campaign
      case 'nadia': woman(); L.outfit = 'f_coat'; L.build = 'avg'; L.face = 'f2'; L.hair = 'pony'; C.skin = COL.skin[3]; C.top = [0.5, 0.08, 0.1]; C.legs = [0.06, 0.06, 0.08]; C.hair = [0.05, 0.035, 0.025]; C.shoe = [0.05, 0.045, 0.045]; C.lips = [0.45, 0.12, 0.14]; L.scale = 0.96; L.props = ['bag']; break;
      case 'fredo': man(); L.outfit = 'm_hoodie'; L.build = 'slim'; L.face = 'm3'; L.hat = 'beanie'; C.hat = [0.62, 0.1, 0.08]; C.skin = COL.skin[1]; C.top = [0.55, 0.42, 0.12]; C.bot = [0.22, 0.22, 0.28]; C.stub = 0.4; L.beard = null; L.scale = 0.92; break;
      case 'anselme': man(); L.outfit = 'm_coat'; L.build = 'old'; L.face = 'mo'; L.hair = 'balding'; C.hair = [0.78, 0.78, 0.76]; C.skin = COL.skin[0]; C.top = [0.36, 0.3, 0.24]; C.bot = [0.24, 0.21, 0.19]; L.beard = 'mustache'; L.age = 1; L.scale = 0.97; break;
      case 'delorme': man(); L.outfit = 'm_coat'; L.build = 'avg'; L.face = 'm2'; L.hair = 'slick'; C.hair = [0.35, 0.33, 0.32]; C.skin = COL.skin[0]; C.top = [0.14, 0.15, 0.2]; C.bot = [0.1, 0.11, 0.14]; L.beard = null; C.stub = 0.2; L.scale = 1.02; break;
      case 'vasseur': man(); L.outfit = 'm_suit'; L.build = 'avg'; L.face = 'm3'; L.hair = 'slick'; C.hair = [0.05, 0.05, 0.05]; C.skin = COL.skin[1]; C.top = [0.86, 0.85, 0.82]; C.bot = [0.84, 0.83, 0.8]; C.acc = [0.1, 0.1, 0.1]; C.shoe = [0.2, 0.12, 0.08]; L.beard = null; L.scale = 1.03; break;
      case 'petronille': woman(); L.outfit = 'f_old'; L.build = 'old'; L.face = 'fo'; L.hair = 'bun'; C.hair = [0.88, 0.88, 0.9]; C.skin = COL.skin[0]; C.top = [0.45, 0.18, 0.4]; C.bot = [0.3, 0.14, 0.28]; L.age = 1; L.scale = 0.9; L.props = ['umbrella']; break;
      case 'tresorier': man(); L.outfit = 'm_coat'; L.build = 'heavy'; L.face = 'm4'; L.hair = 'balding'; C.hair = [0.22, 0.16, 0.1]; C.skin = COL.skin[4]; C.top = [0.3, 0.33, 0.3]; C.bot = [0.18, 0.19, 0.18]; L.beard = 'mustache'; L.scale = 0.95; L.props = ['bag']; break;
      case 'okafor': man(); L.outfit = 'cop'; L.build = 'avg'; L.face = 'm4'; L.hair = 'short'; C.hair = [0.55, 0.55, 0.55]; C.skin = COL.skin[6]; C.top = [0.09, 0.11, 0.18]; C.bot = [0.07, 0.08, 0.11]; C.acc = [0.05, 0.05, 0.06]; C.acc2 = [0.3, 0.72, 1.0]; C.acc2E = 1.4; L.beard = 'goatee'; C.hair = [0.5, 0.5, 0.5]; L.scale = 1.04; break;
      default: return null;
    }
    if (!OUTFITS[L.outfit].builds.includes(L.build) && !BUILD[L.sex][L.build]) L.build = OUTFITS[L.outfit].builds[0];
    if (L.hair === 'afro' && L.hat && L.hat !== 'hood') L.hat = null;
    if (L.hat === 'hood' || L.hat === 'helmet' || L.hat === 'kepi') { if (L.hair === 'long' || L.hair === 'afro' || L.hair === 'bun' || L.hair === 'braids' || L.hair === 'pony') L.hair = 'short'; }
    L.pal = palette(C); L.shX = PP.rig(L.sex).shx; L.stub = C.stub || 0; L.headK = L.sex === 'f' ? 0.955 : 1;
    return L;
  }

  // walking style from the look (see the ground pose in Anim)
  function gait(L) {
    const g = { sway: 1, arms: 1, armOut: 0, elbow: 0, stoop: 0, width: 1, bounce: 1 };
    if (L.sex === 'f') { g.sway = 1.7; g.arms = 0.8; g.armOut = -0.03; g.elbow = 0.12; g.width = 0.72; }
    if (L.age) { g.stoop += 0.22; g.arms *= 0.55; g.bounce = 0.6; g.width *= 1.08; }
    const b = L.build;
    if (b === 'heavy' || b === 'curvy') { g.width *= 1.2; g.sway *= 1.2; g.armOut += 0.07; }
    if (b === 'strong' || b === 'huge') { g.armOut += b === 'huge' ? 0.14 : 0.08; g.elbow += 0.12; g.width *= 1.12; }
    if (L.kind === 'thug' || L.kind === 'thugBoss') { g.sway *= 1.15; g.armOut += 0.04; }
    return g;
  }

  /* ---------------- pieces: generation at four levels of detail ---------------- */
  const LOD_H = { body: [0.015, 0.026, 0.04, 0.062], head: [0.0062, 0.011, 0.017, 0.026], hand: [0.0065, 0.0105, 0.016, 0], part: [0.005, 0.0085, 0.014, 0.022], eyes: [1, 1, 0, 0] };
  const HEAD_BOX = [-0.11, -0.16, -0.14, 0.11, 0.24, 0.15];
  const neckHole = (x, y, z) => !(y > 1.555 && x * x + (z + 0.01) * (z + 0.01) < 0.075 * 0.075);
  // skirts and coat tails follow the hips more than the legs
  const skirtPost = (v, leaf, w) => { if (leaf && leaf.tag === 'skirt') { for (const [a, b] of [['knL', 'hipL'], ['knR', 'hipR'], ['anL', 'hipL'], ['anR', 'hipR']]) { w[BI[b]] += w[BI[a]]; w[BI[a]] = 0; } let t = 0; for (let i = 0; i < NB; i++) t += w[i]; w[BI.hips] += t * (leaf.wstiff || 0.5); } };
  function* genBody(a, h) {
    const O = OUTFITS[a.outfit], R = PP.rig(O.sex), B = PP.body(R, Object.assign({ f: O.sex === 'f' ? 1 : 0 }, BUILD[O.sex][a.build]));
    const g = O.make(B), shoes = [0, 1].map(s => PP.shoe(B, s, g.shoes || O.shoes || 'sneaker'));
    const sdf = PP.dress(B, g.layers, (g.extras || []).concat(shoes));
    const M = yield* S.mesh(sdf, sdf.bb, h, { keep: neckHole });
    const ao = yield* PP.occlusion(M, sdf, Math.max(0.012, h * 0.8), 0.5);
    PP.pack(M, ao);
    yield* S.weigh(M, B.all, 0.016, { post: skirtPost });
    return PP.strip(M);
  }
  // brows, mouth line, nostrils and the stubble mask, painted on the head in its own frame
  function facePaint(F) {
    const f = F.f, mw = 0.02 * F.mouthW, ny = 0.099 - 0.05 * F.nose;
    return (o, x, y, z) => {
      const ax = Math.abs(x);
      if (o.slot === LIP) { if (Math.abs(y - 0.0242) < 0.001 && z > 0.083) o.shade *= 0.62; return; }
      if (o.slot !== SK) return;
      if (z > 0.045) {
        const bx = ax - 0.034, arch = f ? 0.0035 - bx * bx * 9 : 0.002 - bx * bx * 3.5, by = y - (0.1105 + arch + (bx < -0.012 ? (-0.012 - bx) * (f ? 0.1 : 0.25) : 0));
        const half = f ? 0.021 : 0.023, th = (f ? 0.0028 : 0.0042) * (1 - Math.max(0, bx) / half * 0.55);
        if (bx > -half && bx < half && Math.abs(by) < th) { o.slot = HAIR; o.shade = 0.9; o.spec = 0.25; return; }
      }
      if (z > 0.084 && ax < mw && Math.abs(y - 0.0242) < 0.001) o.shade *= 0.7;
      if (ay(ax, 0.0125 * F.noseW, y, ny + 0.002, 0.005, 0.0035) && z > 0.08) o.shade *= 0.35;
      if (!f) { // where a beard grows: chin, jaw, upper lip and the cheeks below the cheekbones
        const onFace = z > -0.005 && y < 0.075 - Math.max(0, ax - 0.03) * 0.5 && y > -0.045, lip = y > 0.012 && y < 0.034 && ax < mw + 0.004 && z > 0.08;
        const nose = y > ny - 0.004 && ax < 0.02 && z > 0.07;
        if (onFace && !lip && !nose) o.emis = clamp(smoothstep(0.075 - Math.max(0, ax - 0.03) * 0.5, 0.055 - Math.max(0, ax - 0.03) * 0.5, y) * smoothstep(-0.005, 0.02, z + ax * 0.2) * (1 - smoothstep(0.04, 0.062, ax) * smoothstep(0.03, 0.05, y)), 0, 1);
      }
    };
  }
  const ay = (ax, cx, y, cy, rx, ry) => { const dx = (ax - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy < 1; };
  function* genHead(a, h) {
    const F = PP.FACES[a.face], HD = PP.head(F);
    const M = yield* S.mesh(HD.sdf, HEAD_BOX, h, { keep: (x, y, z) => y > -0.1 });
    const ao = yield* PP.occlusion(M, HD.sdf, Math.max(0.005, h * 0.8), 0.42);
    PP.pack(M, ao, facePaint(F));
    yield* S.weigh(M, HD.solids, 0.01, { fallback: BI.head });
    S.transform(M, PP.rig('m').W[BI.head]);
    return PP.strip(M);
  }
  function* genHand(a, h) {
    const hs = PP.hand(a.sex === 'f' ? 1 : 0, a.pose);
    const M = yield* S.mesh(hs, hs.bb, h);
    const ao = yield* PP.occlusion(M, hs, Math.max(0.004, h * 0.7), 0.7);
    PP.pack(M, ao); S.rigid(M, BI.haL); S.transform(M, PP.rig(a.sex).W[BI.haL]);
    const out = PP.strip(M); return a.side ? S.mirror(out) : out;
  }
  // hair, headwear and beards: modelled in the head frame, carried by the head (tails swing, hoods follow the neck)
  function* genPart(a, h) {
    const P = a.kind === 'hair' ? PP.hair(a.style) : a.kind === 'beard' ? PP.beard(a.style, a.face) : PP.hat(a.style);
    const bb = P.sdf.bb || [-0.16, -0.3, -0.2, 0.16, 0.3, 0.2];
    const M = yield* S.mesh(P.sdf, bb, h, { keep: P.keep });
    const ao = yield* PP.occlusion(M, P.sdf, Math.max(0.004, h * 0.8), 0.5);
    PP.pack(M, ao); S.rigid(M, BI.head);
    if (P.tail) for (let v = 0; v < M.n; v++) { const k = P.tail(M.pos[v * 3], M.pos[v * 3 + 1], M.pos[v * 3 + 2]); if (k > 0.01) { M.j[v * 4 + 1] = BI.tail; M.w[v * 4 + 1] = Math.round(k * 255); M.w[v * 4] = 255 - M.w[v * 4 + 1]; } }
    if (P.body) for (let v = 0; v < M.n; v++) { const y = M.pos[v * 3 + 1], kn = smoothstep(0.02, -0.08, y), kc = smoothstep(-0.08, -0.16, y); M.j[v * 4] = BI.head; M.j[v * 4 + 1] = BI.neck; M.j[v * 4 + 2] = BI.chest; const wn = kn * (1 - kc); M.w[v * 4] = Math.round((1 - wn - kc) * 255); M.w[v * 4 + 1] = Math.round(wn * 255); M.w[v * 4 + 2] = 255 - M.w[v * 4] - M.w[v * 4 + 1]; }
    S.transform(M, PP.rig('m').W[BI.head]);
    return PP.strip(M);
  }
  function* genEyes(a, h) { const M = PP.eyes(a.closed, h); S.rigid(M, BI.head); S.transform(M, PP.rig('m').W[BI.head]); return M; }
  const GEN = { body: genBody, head: genHead, hand: genHand, part: genPart, eyes: genEyes };

  const pieces = new Map();
  function piece(type, a) {
    const key = type + '|' + Object.keys(a).map(k => a[k]).join('|');
    let p = pieces.get(key);
    if (!p) { p = { key, type, a, gl: [null, null, null, null], busy: [0, 0, 0, 0], fail: [0, 0, 0, 0], used: 0, list: [null, null, null, null] }; pieces.set(key, p); }
    return p;
  }
  // the pieces of a look (resolved once)
  function resolve(L) {
    if (L.P) return L.P;
    const P = { body: piece('body', { outfit: L.outfit, build: L.build }), head: piece('head', { face: L.face }), parts: [] };
    for (const [kind, style] of [['hair', L.hair], ['hat', L.hat], ['hat', L.gear], ['beard', L.beard]]) if (style) P.parts.push(piece('part', kind === 'beard' ? { kind, style, face: L.face } : { kind, style }));
    return (L.P = P);
  }
  const hands = {}; for (const sx of ['m', 'f']) for (const pose of ['relax', 'fist', 'grip', 'open']) for (const side of [0, 1]) hands[sx + pose + side] = piece('hand', { sex: sx, pose, side });
  const eyesOpen = piece('eyes', { closed: 0 }), eyesShut = piece('eyes', { closed: 1 });

  /* ---------------- generation queue (time sliced, nearest needs first) ---------------- */
  const queue = []; let running = null, genMs = 0, genN = 0;
  function request(p, lod, prio) {
    if (!ready) return;
    if (p.gl[lod] || p.fail[lod] || LOD_H[p.type][lod] === 0 && p.type !== 'eyes') return;
    if (p.busy[lod]) { const q = queue.find(j => j.p === p && j.lod === lod); if (q && prio < q.prio) q.prio = prio; return; }
    p.busy[lod] = 1; queue.push({ p, lod, prio });
  }
  function done(j, M) {
    j.p.busy[j.lod] = 0;
    if (!M || !M.n) { j.p.fail[j.lod] = 1; return; }
    j.p.gl[j.lod] = upload(M);
  }
  // generate a piece right now (a character must not appear without a body)
  function now(p, lod) {
    if (p.gl[lod]) return true; if (p.fail[lod]) return false;
    const t0 = S.now();
    try { done({ p, lod }, S.finish(GEN[p.type](p.a, LOD_H[p.type][lod]))); } catch (e) { console.error(e); p.fail[lod] = 1; }
    const i = queue.findIndex(q => q.p === p && q.lod === lod); if (i >= 0) queue.splice(i, 1);
    genMs += S.now() - t0; genN++;
    return !!p.gl[lod];
  }
  function update(ms) {
    if (!ready) return;
    const t0 = S.now();
    while (S.now() - t0 < ms) {
      if (!running) {
        if (!queue.length) break;
        let bi = 0; for (let i = 1; i < queue.length; i++) if (queue[i].prio < queue[bi].prio) bi = i;
        const j = queue.splice(bi, 1)[0]; if (j.p.gl[j.lod]) { j.p.busy[j.lod] = 0; continue; }
        running = { j, it: GEN[j.p.type](j.p.a, LOD_H[j.p.type][j.lod]), t: 0 };
        S.jobs.length = 0; S.jobs.push({ it: running.it, cb: M => { const r = running; running = null; done(r.j, M); } });
      }
      const r = running, t1 = S.now();
      try { S.run(ms - (t1 - t0)); } catch (e) { console.error(e); S.jobs.length = 0; if (r) { r.j.p.busy[r.j.lod] = 0; r.j.p.fail[r.j.lod] = 1; } running = null; }
      if (r) { r.t += S.now() - t1; if (!running) { genMs += r.t; genN++; } }
    }
  }
  // finish every queued job of a level now (before a mission: no generation hitch when reinforcements arrive)
  function finishLevel(lod, maxMs = 4000) {
    if (!ready) return; const t0 = S.now();
    while (queue.some(j => j.lod >= lod) && S.now() - t0 < maxMs) { for (const j of queue) if (j.lod >= lod) j.prio = Math.min(j.prio, -1000 + j.lod); update(40); }
  }
  // warm the cache: every outfit, face, hand and hair piece at the given level (low priority)
  function warm(lod, prio) {
    for (const id in OUTFITS) for (const b of OUTFITS[id].builds) request(piece('body', { outfit: id, build: b }), lod, prio);
    for (const f in PP.FACES) request(piece('head', { face: f }), lod, prio + 1);
    for (const k in hands) request(hands[k], Math.min(lod, 2), prio + 2);
    for (const s of ['short', 'buzz', 'crop', 'slick', 'curly', 'afro', 'balding', 'bob', 'long', 'pony', 'bun', 'braids']) request(piece('part', { kind: 'hair', style: s }), lod, prio + 3);
    for (const s of ['beanie', 'cap', 'hood', 'mask', 'helmet', 'kepi']) request(piece('part', { kind: 'hat', style: s }), lod, prio + 3);
    for (const f of ['m1', 'm2', 'm3', 'm4', 'mo', 'br']) for (const s of ['full', 'goatee', 'mustache']) request(piece('part', { kind: 'beard', style: s, face: f }), lod, prio + 4);
  }

  /* ---------------- GPU ---------------- */
  let gl = null, ready = false, tex = null, instBuf = null, instCap = 0;
  const MAXR = 192, TW = NB * 3 + 16, data = new Float32Array(TW * 4 * MAXR);
  let rows = 0, frame = 0, uploadedFrame = -1, active = [], instData = new Float32Array(4096), instN = 0;
  const skinM = M4.create();
  function init() {
    if (!Gfx.gl || !Gfx.progs.skin) return false;
    gl = Gfx.gl;
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TW, MAXR, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    instBuf = gl.createBuffer(); instCap = 4096 * 4; gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, instCap, gl.DYNAMIC_DRAW);
    ready = true;
    // what every character needs at once: the lowest level of the shared pieces
    for (const k in hands) now(hands[k], 2);
    for (const e of [eyesOpen, eyesShut]) { now(e, 1); now(e, 2); }
    return true;
  }
  function upload(M) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const bufs = [];
    const buf = (loc, arr, size, type, norm) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); bufs.push(b); };
    buf(0, M.pos, 3, gl.FLOAT, false); buf(1, M.nrm, 3, gl.FLOAT, false); buf(2, M.m4, 4, gl.UNSIGNED_BYTE, false); buf(3, M.j, 4, gl.UNSIGNED_BYTE, false); buf(4, M.w, 4, gl.UNSIGNED_BYTE, true);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, M.idx, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    return { vao, bufs, ib, count: M.idx.length, type: M.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, n: M.n, inst: [], off: 0 };
  }
  function free(g) { if (!g) return; for (const b of g.bufs) gl.deleteBuffer(b); gl.deleteBuffer(g.ib); gl.deleteVertexArray(g.vao); }
  // detail kept: the nearest pieces are big, the rest of the cache stays small (least recently used first out)
  function trim() {
    let n0 = 0; const list = [];
    for (const p of pieces.values()) if (p.gl[0] && (p.type === 'body' || p.type === 'head')) { n0++; list.push(p); }
    if (n0 <= 14) return;
    list.sort((a, b) => a.used - b.used);
    for (let i = 0; i < n0 - 14; i++) { const p = list[i]; if (frame - p.used < 90) break; free(p.gl[0]); p.gl[0] = null; }
  }

  /* ---------------- per frame ---------------- */
  function begin() { rows = 0; for (const g of active) g.inst.length = 0; active.length = 0; frame++; if ((frame & 63) === 0) trim(); }
  // the best level available near the wanted one (asks for the wanted one)
  function pick(p, lod, prio) {
    if (lod > 3) return null;
    p.used = frame;
    if (p.gl[lod]) return p.gl[lod];
    request(p, lod, prio);
    for (let l = lod + 1; l < 4; l++) if (p.gl[l]) return p.gl[l];
    for (let l = lod - 1; l >= 0; l--) if (p.gl[l]) return p.gl[l];
    return null;
  }
  const add1 = (g, row, tint, glow) => { if (!g) return; if (!g.inst.length) active.push(g); g.inst.push(row, tint, glow); };
  // hand pose from what the character is doing
  function handPose(a, side) {
    const w = a.an && a.an.w, st = a.state;
    if (st === 'dead' || st === 'ko' || st === 'down') return 'relax';
    if (w && (w.hands > 0.5 || w.talk > 0.5) || st === 'cower' || st === 'surrender') return 'open';
    if (side) { if (a.weaponPart && !a.weaponPart.hidden) return 'grip'; if (w && w.umb > 0.4) return 'grip'; }
    else { if (w && w.rifle > 0.4) return 'grip'; if (w && w.carry > 0.3) return 'grip'; }
    if (w && (w.guard > 0.35 || w.block > 0.35) || st === 'attack') return 'fist';
    return 'relax';
  }
  // draw one character: false if its body is not available yet (the caller falls back to the part renderer)
  function add(a, W, camD) {
    if (!ready || rows >= MAXR) return false;
    const L = a.app.look, P = resolve(L);
    const k = 900 / Math.max(300, Gfx.bh), e = camD * k;
    const lod = e < 5.5 ? 0 : e < 15 ? 1 : e < 38 ? 2 : 3, prio = lod * 1000 + camD;
    const body = pick(P.body, lod, prio); if (!body) return false;
    const row = rows++, o = row * TW * 4, inv = PP.rig(L.sex).inv, hk = L.headK || 1, hp = W[BI.head];
    for (let i = 0; i < NB; i++) {
      M4.mul(skinM, W[i], inv[i]); const q = o + i * 12;
      if (hk !== 1 && (i === BI.head || i === BI.tail)) { // smaller heads (women): scaled about the head joint
        skinM[0] *= hk; skinM[1] *= hk; skinM[2] *= hk; skinM[4] *= hk; skinM[5] *= hk; skinM[6] *= hk; skinM[8] *= hk; skinM[9] *= hk; skinM[10] *= hk;
        for (let k = 12; k < 15; k++) skinM[k] = hp[k] + hk * (skinM[k] - hp[k]);
      }
      data[q] = skinM[0]; data[q + 1] = skinM[4]; data[q + 2] = skinM[8]; data[q + 3] = skinM[12];
      data[q + 4] = skinM[1]; data[q + 5] = skinM[5]; data[q + 6] = skinM[9]; data[q + 7] = skinM[13];
      data[q + 8] = skinM[2]; data[q + 9] = skinM[6]; data[q + 10] = skinM[10]; data[q + 11] = skinM[14];
    }
    data.set(L.pal, o + NB * 12);
    const tint = a.tint || 1, glow = a.glow === undefined ? 1 : a.glow;
    add1(body, row, tint, glow);
    add1(pick(P.head, lod, prio + 1), row, tint, glow);
    for (const p of P.parts) add1(pick(p, lod, prio + 2), row, tint, glow);
    if (lod < 3) {
      add1(pick(hands[L.sex + handPose(a, 0) + 0], lod, prio + 3), row, tint, glow);
      add1(pick(hands[L.sex + handPose(a, 1) + 1], lod, prio + 3), row, tint, glow);
    }
    if (lod < 2 && !(L.gear === 'mask')) { // eyes blink every few seconds, stay shut when out
      const t = (a.an ? a.an.time : 0) + (a.seed || 0) * 17, ph = t % (3.2 + (a.seed || 0) * 2.5);
      const shut = a.state === 'dead' || a.state === 'ko' || ph < 0.13;
      add1(pick(shut ? eyesShut : eyesOpen, lod, prio), row, tint, glow);
    }
    return true;
  }
  function draw(vp, cam, clipY) {
    if (!ready || !active.length) return;
    if (uploadedFrame !== frame) {
      uploadedFrame = frame;
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, Math.max(1, rows), gl.RGBA, gl.FLOAT, data, 0);
      let n = 0; for (const g of active) n += g.inst.length / 3;
      if (instData.length < n * 4) instData = new Float32Array(n * 8);
      let i = 0; for (const g of active) { g.off = i * 16; for (let k = 0; k < g.inst.length; k += 3) { instData[i * 4] = g.inst[k]; instData[i * 4 + 1] = g.inst[k + 1]; instData[i * 4 + 2] = g.inst[k + 2]; instData[i * 4 + 3] = 0; i++; } }
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      if (n * 16 > instCap) { instCap = n * 32; gl.bufferData(gl.ARRAY_BUFFER, instCap, gl.DYNAMIC_DRAW); }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData, 0, n * 4); instN = n;
    }
    Gfx.use(Gfx.progs.skin); Render.litGlobals(null, vp, cam, clipY); Gfx.f4('uMat', 30, 0.35, 0.85, 0);
    const u = Gfx.cur.u.uBones; if (u) { gl.activeTexture(gl.TEXTURE0 + Gfx.cur.tex); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u, Gfx.cur.tex++); }
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (const g of active) {
      gl.bindVertexArray(g.vao); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, g.off);
      gl.drawElementsInstanced(gl.TRIANGLES, g.count, g.type, 0, g.inst.length / 3);
    }
    gl.bindVertexArray(null);
  }
  const stats = () => { let n = 0, v = 0; for (const p of pieces.values()) for (const g of p.gl) if (g) { n++; v += g.n; } return { pieces: n, verts: v, queue: queue.length, genMs: Math.round(genMs), genN, rows }; };

  return { make, gait, init, update, warm, finishLevel, now, request, piece, resolve, add, begin, draw, stats, OUTFITS, BUILD, COL, get ready() { return ready; }, get queue() { return queue; }, hands, eyesOpen, eyesShut };
})();

