/* =====================================================================
   MEDIEVAL TEXTURES — the city repainted as a drowned medieval town:
   ashlar, rubble stone, half-timbering, leaded windows lit by candles,
   wooden shop fronts, slate and clay roofs, cobbled streets.
   Same atlas cells as before (the geometry does not change): a cell is
   24 m wide and 25.6 m high, 8 columns of 3 m by 8 floors of 3.2 m.
   ===================================================================== */
const MedTex = {
  CANDLE: ['#ffb45e', '#ffc070', '#ffcc80', '#ff9f4a', '#ffd38f', '#ffa850'],
  candle(rnd) { return this.CANDLE[Math.floor(rnd() * this.CANDLE.length)]; },
  // speckles, stains and soot
  grit(a, S, rnd, n, al = 0.22) {
    for (let i = 0; i < n; i++) { const v = rnd() * 70; a.fillStyle = rgba(v, v * 0.92, v * 0.82, rnd() * al); a.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < n / 50; i++) { a.fillStyle = rgba(40, 34, 26, rnd() * 0.12); a.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 5, 20 + rnd() * 90); } // rain streaks
  },
  // regular courses of cut stone (ashlar), light so that the vertex colour tints it
  ashlar(a, S, rnd, base, rows = 40, vary = 0.14, mortar = 'rgba(70,62,52,0.55)') {
    const bh = S / rows; a.fillStyle = mortar; a.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 40;
      while (x < S) {
        const w = bh * (1.6 + rnd() * 2.2), k = 1 + (rnd() - 0.5) * vary * 2;
        a.fillStyle = rgba(base[0] * k, base[1] * k, base[2] * k, 1); a.fillRect(x + 1, r * bh + 1, w - 2, bh - 2);
        a.fillStyle = 'rgba(255,255,255,0.07)'; a.fillRect(x + 1, r * bh + 1, w - 2, 1.5);
        a.fillStyle = 'rgba(0,0,0,0.12)'; a.fillRect(x + 1, r * bh + bh - 2.5, w - 2, 1.5);
        x += w;
      }
    }
  },
  // irregular fieldstone with thick mortar
  rubble(a, S, rnd, base, n = 900) {
    a.fillStyle = rgba(base[0] * 0.62, base[1] * 0.6, base[2] * 0.56, 1); a.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) {
      const x = rnd() * S, y = rnd() * S, r = S / 70 + rnd() * S / 40, k = 0.8 + rnd() * 0.4;
      a.fillStyle = rgba(base[0] * k, base[1] * k, base[2] * k, 1); a.beginPath();
      const m = 6 + Math.floor(rnd() * 3); for (let q = 0; q < m; q++) { const t = q / m * TAU, rr = r * (0.7 + rnd() * 0.35); a.lineTo(x + Math.cos(t) * rr * 1.3, y + Math.sin(t) * rr * 0.8); }
      a.closePath(); a.fill(); a.fillStyle = 'rgba(255,255,255,0.08)'; a.fillRect(x - r * 0.6, y - r * 0.6, r, 1.5);
    }
  },
  plaster(a, S, rnd, base) {
    a.fillStyle = rgba(base[0], base[1], base[2], 1); a.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) { a.fillStyle = rgba(base[0] * 0.7, base[1] * 0.68, base[2] * 0.62, rnd() * 0.16); const w = 20 + rnd() * 90; a.fillRect(rnd() * S, rnd() * S, w, w * (0.3 + rnd())); }
    for (let i = 0; i < 25; i++) { // plaster fallen off: stone underneath
      const x = rnd() * S, y = rnd() * S, w = 8 + rnd() * 26; a.fillStyle = 'rgba(120,104,88,0.55)'; a.beginPath(); a.ellipse(x, y, w, w * 0.6, rnd() * 3, 0, TAU); a.fill();
      a.fillStyle = 'rgba(70,60,50,0.4)'; for (let k = 0; k < 4; k++) a.fillRect(x - w * 0.6 + rnd() * w, y - w * 0.3 + rnd() * w * 0.5, 6 + rnd() * 8, 1.5);
    }
  },
  // half-timbering: sill and head beams at every floor, posts, St Andrew's crosses and braces between the windows
  timber(a, S, rnd, wood = [62, 40, 26], opt = {}) {
    const cw = S / 8, fh = S / 8, bw = Math.max(3, S / 110);
    const beam = (x0, y0, x1, y1, t = bw) => { a.strokeStyle = rgba(wood[0], wood[1], wood[2], 1); a.lineWidth = t; a.beginPath(); a.moveTo(x0, y0); a.lineTo(x1, y1); a.stroke(); a.strokeStyle = 'rgba(0,0,0,0.25)'; a.lineWidth = 1; a.beginPath(); a.moveTo(x0 + 1, y0 + 1); a.lineTo(x1 + 1, y1 + 1); a.stroke(); };
    for (let fy = 0; fy < 8; fy++) {
      const y0 = fy * fh, y1 = y0 + fh;
      beam(0, y0 + bw / 2, S, y0 + bw / 2, bw * 1.5); beam(0, y1 - bw * 1.2, S, y1 - bw * 1.2, bw * 1.2);
      for (let cx = 0; cx <= 8; cx++) beam(cx * cw, y0, cx * cw, y1);
      for (let cx = 0; cx < 8; cx++) {
        const x0 = cx * cw, k = (cx + fy * 3 + (opt.seed || 0)) % 4;
        if (k === 0 && !opt.noCross) { beam(x0 + cw * 0.06, y0 + fh * 0.62, x0 + cw * 0.24, y1 - bw); beam(x0 + cw * 0.24, y0 + fh * 0.62, x0 + cw * 0.06, y1 - bw); }
        else if (k === 2) beam(x0, y1 - bw, x0 + cw * 0.18, y0 + fh * 0.62);
        beam(x0 + cw * 0.76, y0 + fh * 0.62, x0 + cw * 0.94, y1 - bw);
      }
    }
  },
  // a window: flat, round arch or pointed arch; leaded panes; stone or wooden surround; candlelight in the emissive map
  window(a, e, rnd, x, y, w, h, o = {}) {
    const shape = o.shape || 'flat', lit = o.lit !== undefined ? o.lit : 0.3;
    const path = (c, pad = 0) => {
      const X = x - pad, Y = y - pad, W = w + pad * 2, H = h + pad * 2; c.beginPath();
      if (shape === 'round') { const r = W / 2; c.moveTo(X, Y + H); c.lineTo(X, Y + r); c.arc(X + r, Y + r, r, Math.PI, 0); c.lineTo(X + W, Y + H); c.closePath(); }
      else if (shape === 'pointed') { const r = W * 0.85; c.moveTo(X, Y + H); c.lineTo(X, Y + W * 0.62); c.arcTo(X, Y, X + W / 2, Y, r * 0.9); c.lineTo(X + W / 2, Y); c.arcTo(X + W, Y, X + W, Y + W * 0.62, r * 0.9); c.lineTo(X + W, Y + H); c.closePath(); }
      else c.rect(X, Y, W, H);
    };
    // surround
    if (o.frame !== false) { a.fillStyle = o.frame || 'rgba(214,200,176,0.95)'; path(a, Math.max(2, w * 0.12)); a.fill(); }
    if (o.sill !== false) { a.fillStyle = 'rgba(200,186,160,1)'; a.fillRect(x - w * 0.18, y + h, w * 1.36, Math.max(2, h * 0.07)); a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(x - w * 0.18, y + h + Math.max(2, h * 0.07), w * 1.36, 1.5); }
    // dark glass, leaded diamonds
    a.save(); path(a); a.clip();
    const g = a.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2c2620'); g.addColorStop(1, '#100c09'); a.fillStyle = g; a.fillRect(x - 2, y - 2, w + 4, h + 4);
    a.strokeStyle = 'rgba(150,135,110,0.35)'; a.lineWidth = 1; const d = Math.max(4, w / 4);
    for (let k = -h; k < w + h; k += d) { a.beginPath(); a.moveTo(x + k, y); a.lineTo(x + k + h, y + h); a.stroke(); a.beginPath(); a.moveTo(x + k, y + h); a.lineTo(x + k + h, y); a.stroke(); }
    a.fillStyle = 'rgba(40,30,22,0.95)'; if (w > 10) a.fillRect(x + w / 2 - 1, y, 2.2, h); if (h > 14) a.fillRect(x, y + h * 0.45, w, 2.2);
    a.restore();
    if (rnd() < lit) { // candle or hearth behind the panes
      const c = this.candle(rnd); e.save(); path(e); e.clip();
      const gg = e.createRadialGradient(x + w / 2, y + h * 0.7, 1, x + w / 2, y + h * 0.6, Math.max(w, h)); gg.addColorStop(0, c); gg.addColorStop(1, 'rgba(120,50,10,0.5)');
      e.globalAlpha = 0.5 + rnd() * 0.45; e.fillStyle = gg; e.fillRect(x - 2, y - 2, w + 4, h + 4); e.globalAlpha = 1;
      e.strokeStyle = 'rgba(0,0,0,0.55)'; e.lineWidth = 1; for (let k = -h; k < w + h; k += d) { e.beginPath(); e.moveTo(x + k, y); e.lineTo(x + k + h, y + h); e.stroke(); e.beginPath(); e.moveTo(x + k, y + h); e.lineTo(x + k + h, y); e.stroke(); }
      e.fillStyle = 'rgba(0,0,0,0.85)'; if (w > 10) e.fillRect(x + w / 2 - 1, y, 2.2, h); if (h > 14) e.fillRect(x, y + h * 0.45, w, 2.2);
      if (rnd() < 0.3) e.fillRect(x + w * 0.15, y + h * 0.4, w * 0.3, h * 0.6); // someone in the room
      e.restore(); a.save(); path(a); a.clip(); a.fillStyle = c; a.globalAlpha = 0.18; a.fillRect(x, y, w, h); a.restore();
    }
    // wooden shutters (open on the sides or closed with a glimmer between the boards)
    if (o.shutters && shape === 'flat') {
      const sc = o.shutters, r = rnd();
      const boards = (bx, bw) => { a.fillStyle = sc; a.fillRect(bx, y - 1, bw, h + 2); a.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = bx; k < bx + bw; k += Math.max(3, bw / 3)) a.fillRect(k, y - 1, 1, h + 2); a.fillRect(bx, y + h * 0.2, bw, 1.5); a.fillRect(bx, y + h * 0.75, bw, 1.5); };
      if (r < 0.25) { boards(x - 1, w + 2); e.fillStyle = '#000'; e.fillRect(x - 1, y - 1, w + 2, h + 2); if (rnd() < 0.35) { e.fillStyle = 'rgba(255,170,80,0.55)'; for (let k = x + w / 3; k < x + w; k += w / 3) e.fillRect(k - 0.5, y + 1, 1, h - 2); } }
      else { boards(x - w * 0.5 - 2, w * 0.48); boards(x + w + 2, w * 0.48); }
    }
  },
  door(a, e, x, y, w, h, lit) {
    const r = w / 2; a.fillStyle = 'rgba(205,190,165,1)'; a.beginPath(); a.moveTo(x - 3, y + h); a.lineTo(x - 3, y + r); a.arc(x + r, y + r, r + 3, Math.PI, 0); a.lineTo(x + w + 3, y + h); a.fill();
    a.fillStyle = '#4a3020'; a.beginPath(); a.moveTo(x, y + h); a.lineTo(x, y + r); a.arc(x + r, y + r, r, Math.PI, 0); a.lineTo(x + w, y + h); a.fill();
    a.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = x + w / 5; k < x + w; k += w / 5) a.fillRect(k, y + 2, 1.5, h - 2);
    a.fillStyle = '#1e1a16'; a.fillRect(x, y + h * 0.35, w, 2.5); a.fillRect(x, y + h * 0.75, w, 2.5);
    if (lit) { e.fillStyle = 'rgba(255,170,90,0.6)'; e.fillRect(x + w * 0.42, y + h * 0.2, w * 0.16, h * 0.08); }
  }
};

Object.assign(Tex, {
  facade(a, e, S, rnd, style) {
    const M = MedTex, cw = S / 8, fh = S / 8;
    if (style === 'brick') { // pierre de taille: warm limestone, round-arched windows, shutters
      M.ashlar(a, S, rnd, [206, 192, 168], 44);
      for (let fy = 0; fy < 8; fy++) {
        a.fillStyle = 'rgba(150,132,108,0.9)'; a.fillRect(0, fy * fh + fh - 4, S, 4); // string course
        for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.32, fy * fh + fh * 0.2, cw * 0.36, fh * 0.56, { shape: (fy + cx) % 3 ? 'flat' : 'round', lit: 0.32, shutters: (fy + cx) % 3 ? '#5a4632' : null });
      }
      M.grit(a, S, rnd, 1500);
    } else if (style === 'brick2') { // ochre half-timbering
      M.plaster(a, S, rnd, [214, 186, 140]); M.timber(a, S, rnd, [58, 36, 22], { seed: 1 });
      for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.33, fy * fh + fh * 0.2, cw * 0.36, fh * 0.42, { frame: '#3a2618', sill: false, lit: 0.34, shutters: '#4f6a5a' });
      M.grit(a, S, rnd, 1200);
    } else if (style === 'plaster') { // white plaster, dark timbers, St Andrew's crosses
      M.plaster(a, S, rnd, [232, 226, 212]); M.timber(a, S, rnd, [52, 34, 22]);
      for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.33, fy * fh + fh * 0.2, cw * 0.36, fh * 0.44, { frame: '#2e1e14', sill: false, lit: 0.34, shutters: (cx + fy) % 2 ? '#7a2f24' : '#3e5a6a' });
      M.grit(a, S, rnd, 1100);
    } else if (style === 'concrete') { // fieldstone, small deep windows
      M.rubble(a, S, rnd, [176, 170, 160], 1100);
      for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) if ((cx + fy) % 2 === 0 || cx % 3 === 1) M.window(a, e, rnd, cx * cw + cw * 0.36, fy * fh + fh * 0.24, cw * 0.28, fh * 0.42, { lit: 0.3, frame: 'rgba(190,180,160,1)' });
      M.grit(a, S, rnd, 1400);
    } else if (style === 'glass' || style === 'tower') { // towers: grey ashlar with lancets, darker keep stone with arrow slits
      const keep = style === 'tower';
      M.ashlar(a, S, rnd, keep ? [150, 148, 146] : [188, 182, 170], 48, 0.2);
      for (let fy = 0; fy < 8; fy++) {
        if (fy % 2 === 0) { a.fillStyle = 'rgba(120,110,96,0.9)'; a.fillRect(0, fy * fh, S, 5); }
        for (let cx = 0; cx < 8; cx++) {
          if (keep) { if ((cx + fy) % 2) { a.fillStyle = '#16120e'; a.fillRect(cx * cw + cw * 0.47, fy * fh + fh * 0.2, cw * 0.06, fh * 0.55); a.fillRect(cx * cw + cw * 0.42, fy * fh + fh * 0.4, cw * 0.16, fh * 0.05); if (rnd() < 0.2) { e.fillStyle = M.candle(rnd); e.fillRect(cx * cw + cw * 0.47, fy * fh + fh * 0.22, cw * 0.06, fh * 0.5); } }
            else if (cx % 4 === 0) M.window(a, e, rnd, cx * cw + cw * 0.38, fy * fh + fh * 0.16, cw * 0.24, fh * 0.6, { shape: 'pointed', lit: 0.4 }); }
          else if (cx % 2 === 0) M.window(a, e, rnd, cx * cw + cw * 0.38, fy * fh + fh * 0.14, cw * 0.26, fh * 0.64, { shape: 'pointed', lit: 0.36 });
        }
      }
      M.grit(a, S, rnd, 1600, 0.25);
    } else if (style === 'industrial') { // barns and workshops: vertical planks over a stone footing
      a.fillStyle = '#7a6450'; a.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += S / 48) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(120 * v, 96 * v, 72 * v, 1); a.fillRect(x + 1, 0, S / 48 - 2, S); a.fillStyle = 'rgba(30,20,12,0.5)'; a.fillRect(x, 0, 1.5, S); }
      for (let i = 0; i < 200; i++) { a.fillStyle = 'rgba(40,26,16,0.25)'; a.fillRect(rnd() * S, rnd() * S, 1, 20 + rnd() * 80); }
      for (let fy = 0; fy < 8; fy += 2) { a.fillStyle = '#3a2a1c'; a.fillRect(0, fy * fh + fh * 0.04, S, fh * 0.06); }
      for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.3, fh * 0.2, cw * 0.4, fh * 0.3, { frame: '#3a2a1c', sill: false, lit: 0.25 });
      M.grit(a, S, rnd, 900);
    }
  },
  shops(a, e, S, rnd) { // one shop = 6 m wide, 4.2 m high: stone piers, an oak lintel, a counter under an open shutter
    const W = S / 4, M = MedTex; this.shopSlots = [];
    M.ashlar(a, S, rnd, [190, 176, 152], 14, 0.16);
    for (let k = 0; k < 4; k++) {
      const x = k * W, open = rnd() >= 0.25; this.shopSlots.push({ open });
      a.fillStyle = '#4a3020'; a.fillRect(x, S * 0.14, W, S * 0.06); // oak lintel (the sign board hangs above it)
      a.fillStyle = 'rgba(0,0,0,0.4)'; a.fillRect(x, S * 0.2, W, 2);
      const ox = x + W * 0.08, oy = S * 0.3, ow = W * 0.48, oh = S * 0.42;
      if (!open) { // closed: plank shutters with iron straps
        a.fillStyle = '#5a4130'; a.fillRect(ox, oy, ow, oh + S * 0.24);
        a.fillStyle = 'rgba(0,0,0,0.35)'; for (let q = ox; q < ox + ow; q += ow / 6) a.fillRect(q, oy, 1.5, oh + S * 0.24);
        a.fillStyle = '#26221e'; a.fillRect(ox, oy + oh * 0.2, ow, 3); a.fillRect(ox, oy + oh * 0.8, ow, 3);
      } else { // open: the shutter folds down into a counter, the shop glows behind
        const g = e.createLinearGradient(0, oy, 0, oy + oh); const c = M.candle(rnd); g.addColorStop(0, c); g.addColorStop(1, 'rgba(90,40,10,0.7)');
        a.fillStyle = '#18120d'; a.fillRect(ox, oy, ow, oh); e.fillStyle = g; e.globalAlpha = 0.55; e.fillRect(ox, oy, ow, oh); e.globalAlpha = 1;
        e.fillStyle = 'rgba(0,0,0,0.55)'; for (let s = 0; s < 2; s++) e.fillRect(ox, oy + oh * (0.35 + s * 0.3), ow, 3);
        for (let s = 0; s < 7; s++) { e.beginPath(); e.ellipse(ox + rnd() * ow, oy + oh * (0.28 + rnd() * 0.5), 3 + rnd() * 6, 4 + rnd() * 8, 0, 0, TAU); e.fill(); } // jars, loaves, bolts of cloth
        if (rnd() < 0.5) { const px = ox + ow * (0.2 + rnd() * 0.5); e.fillRect(px, oy + oh * 0.45, ow * 0.1, oh * 0.55); e.beginPath(); e.arc(px + ow * 0.05, oy + oh * 0.4, ow * 0.05, 0, TAU); e.fill(); }
        a.fillStyle = '#6a4a32'; a.fillRect(ox - 4, oy + oh, ow + 8, S * 0.05); a.fillStyle = 'rgba(0,0,0,0.4)'; a.fillRect(ox - 4, oy + oh + S * 0.05, ow + 8, 2);
        a.fillStyle = '#5a4130'; a.fillRect(ox, oy + oh + S * 0.07, ow, S * 0.17); a.fillStyle = 'rgba(0,0,0,0.3)'; for (let q = ox; q < ox + ow; q += ow / 6) a.fillRect(q, oy + oh + S * 0.07, 1.5, S * 0.17);
      }
      M.door(a, e, x + W * 0.64, S * 0.36, W * 0.26, S * 0.64, open);
    }
    M.grit(a, S, rnd, 700);
  },
  roof(a, S, rnd) { // flat roofs: big stone slabs, moss in the joints
    a.fillStyle = '#4c4842'; a.fillRect(0, 0, S, S); const t = S / 6;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(104 * v, 100 * v, 94 * v, 1); a.fillRect(c * t + 2 + (r % 2) * t / 2, r * t + 2, t - 4, t - 4); }
    for (let i = 0; i < 3000; i++) { const v = 40 + rnd() * 60; a.fillStyle = rgba(v, v, v - 4, 0.4); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
    for (let i = 0; i < 26; i++) { a.fillStyle = rgba(46, 62, 32, 0.35); const r = 6 + rnd() * 30; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, r, r * 0.6, rnd() * 3, 0, TAU); a.fill(); }
  },
  container(a, S, rnd) { // the old shipping containers are now big crates of light planks (the vertex colour stains them)
    a.fillStyle = '#c8b8a0'; a.fillRect(0, 0, S, S); const ph = S / 8;
    for (let k = 0; k < 8; k++) { const v = 0.85 + rnd() * 0.25; a.fillStyle = rgba(214 * v, 196 * v, 168 * v, 1); a.fillRect(0, k * ph + 2, S, ph - 4); for (let i = 0; i < 20; i++) { a.fillStyle = 'rgba(70,50,30,0.25)'; a.fillRect(rnd() * S, k * ph + 3 + rnd() * (ph - 6), 20 + rnd() * 70, 1); } }
    a.strokeStyle = '#6e5a44'; a.lineWidth = S / 40; a.strokeRect(S / 80, S / 80, S - S / 40, S - S / 40);
    a.beginPath(); a.moveTo(0, 0); a.lineTo(S, S); a.stroke();
    a.fillStyle = '#2a2622'; for (const [x, y] of [[0.04, 0.04], [0.96, 0.04], [0.04, 0.96], [0.96, 0.96]]) a.fillRect(S * x - 6, S * y - 6, 12, 12);
    a.save(); a.fillStyle = 'rgba(60,30,20,0.55)'; a.font = `700 ${S * 0.08}px ${FONTS.display}`; a.translate(S * 0.62, S * 0.3); a.rotate(-0.06); a.fillText('SEL', 0, 0); a.restore();
  },
  fence(a, S) { // pickets with gaps (the fence pass uses the alpha)
    a.clearRect(0, 0, S, S); const n = 10, w = S / n;
    for (let k = 0; k < n; k++) { const x = k * w + w * 0.15; a.fillStyle = k % 2 ? '#a08060' : '#8a6c50'; a.beginPath(); a.moveTo(x, S); a.lineTo(x, S * 0.08); a.lineTo(x + w * 0.35, 0); a.lineTo(x + w * 0.7, S * 0.08); a.lineTo(x + w * 0.7, S); a.fill(); a.fillStyle = 'rgba(0,0,0,0.25)'; a.fillRect(x + w * 0.55, S * 0.08, w * 0.15, S * 0.92); }
    a.fillStyle = '#6a5038'; a.fillRect(0, S * 0.22, S, S * 0.05); a.fillRect(0, S * 0.72, S, S * 0.05);
  },
  metal(a, S, rnd) { // iron-bound dark planks
    a.fillStyle = '#5a4634'; a.fillRect(0, 0, S, S); const ph = S / 10;
    for (let k = 0; k < 10; k++) { const v = 0.8 + rnd() * 0.3; a.fillStyle = rgba(130 * v, 104 * v, 80 * v, 1); a.fillRect(0, k * ph + 2, S, ph - 3); }
    a.fillStyle = '#2a2724'; for (let y = 0; y < S; y += S / 3) a.fillRect(0, y + S / 6, S, S / 40);
    for (let i = 0; i < 1500; i++) { a.fillStyle = rgba(40, 30, 20, rnd() * 0.25); a.fillRect(rnd() * S, rnd() * S, 2, 2); }
  },
  shutter(a, S, rnd) { // big plank doors of barns and warehouses, iron straps and studs
    a.fillStyle = '#6a4c34'; a.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += S / 14) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(118 * v, 86 * v, 60 * v, 1); a.fillRect(x + 1.5, 0, S / 14 - 3, S); }
    a.fillStyle = '#26221f'; for (const y of [0.12, 0.5, 0.86]) { a.fillRect(0, S * y, S, S / 36); for (let x = S / 28; x < S; x += S / 14) { a.beginPath(); a.arc(x, S * y + S / 72, S / 140, 0, TAU); a.fill(); } }
    a.strokeStyle = '#3a2a1c'; a.lineWidth = S / 40; a.beginPath(); a.moveTo(0, S * 0.5); a.lineTo(S, S * 0.12); a.stroke();
  },
  tenement(a, e, S, rnd) { // Hanseatic red brick, pointed windows under stone hoods
    this.bricks(a, S, rnd, [150, 74, 52], '#6a5a4c');
    const M = MedTex, cw = S / 8, fh = S / 8;
    for (let fy = 0; fy < 8; fy++) {
      a.fillStyle = 'rgba(200,186,160,0.9)'; a.fillRect(0, fy * fh + fh - 4, S, 3);
      for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.32, fy * fh + fh * 0.18, cw * 0.36, fh * 0.6, { shape: 'pointed', lit: 0.34, frame: 'rgba(206,194,170,1)' });
    }
    this._grit(a, S, rnd, 1600);
  },
  hlm(a, e, S, rnd) { // fishermen's houses: whitewashed rubble, small deep windows, blue shutters
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.rubble(a, S, rnd, [232, 228, 218], 700); a.fillStyle = 'rgba(236,232,222,0.55)'; a.fillRect(0, 0, S, S);
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) if (cx % 2 === 0 || (fy % 2 && cx % 3 === 0)) M.window(a, e, rnd, cx * cw + cw * 0.34, fy * fh + fh * 0.24, cw * 0.32, fh * 0.42, { lit: 0.32, frame: 'rgba(240,236,228,1)', shutters: '#3d5f7a' });
    for (let i = 0; i < 40; i++) { a.fillStyle = rgba(70, 64, 50, rnd() * 0.16); a.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 30 + rnd() * 120); }
    M.grit(a, S, rnd, 900, 0.16);
  },
  stone(a, e, S, rnd) { // fine limestone, tall gothic windows with tracery (guild halls, churches)
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.ashlar(a, S, rnd, [222, 210, 186], 48, 0.1);
    for (let fy = 0; fy < 8; fy++) {
      a.fillStyle = 'rgba(160,144,118,0.9)'; a.fillRect(0, fy * fh + fh - 5, S, 5);
      for (let cx = 0; cx < 8; cx++) {
        const x = cx * cw + cw * 0.3, y = fy * fh + fh * 0.1, w = cw * 0.4, h = fh * 0.72;
        M.window(a, e, rnd, x, y, w, h, { shape: 'pointed', lit: 0.36, frame: 'rgba(200,188,164,1)' });
        a.strokeStyle = 'rgba(206,196,172,0.9)'; a.lineWidth = 2; a.beginPath(); a.arc(x + w / 2, y + w * 0.45, w * 0.2, 0, TAU); a.stroke(); // tracery rose
      }
    }
    this._grit(a, S, rnd, 900, 0.14);
  },
  lanternFacade(a, e, S, rnd) { // painted half-timbered houses (each pair of columns its own colour)
    const M = MedTex, walls = [[196, 96, 74], [222, 186, 104], [126, 150, 112], [214, 204, 178], [166, 82, 96], [120, 142, 168]], cw = S / 8, fh = S / 8;
    for (let cx = 0; cx < 8; cx += 2) { const c = walls[Math.floor(rnd() * walls.length)]; a.fillStyle = rgba(c[0], c[1], c[2], 1); a.fillRect(cx * cw, 0, cw * 2, S); }
    for (let i = 0; i < 60; i++) { a.fillStyle = rgba(60, 50, 40, rnd() * 0.12); const w = 20 + rnd() * 60; a.fillRect(rnd() * S, rnd() * S, w, w * 0.6); }
    M.timber(a, S, rnd, [44, 30, 22], { seed: 2 });
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.33, fy * fh + fh * 0.2, cw * 0.36, fh * 0.42, { frame: '#2a1c12', sill: false, lit: 0.45, shutters: (cx + fy) % 2 ? '#2f4a3a' : '#5a2a22' });
    this._grit(a, S, rnd, 900);
  },
  hospitalFacade(a, e, S, rnd) { // hospice: pale stone, round-arched cloister windows
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.ashlar(a, S, rnd, [228, 222, 206], 40, 0.08);
    for (let fy = 0; fy < 8; fy++) { a.fillStyle = 'rgba(170,158,136,0.9)'; a.fillRect(0, fy * fh + fh - 4, S, 4); for (let cx = 0; cx < 8; cx++) M.window(a, e, rnd, cx * cw + cw * 0.28, fy * fh + fh * 0.16, cw * 0.44, fh * 0.62, { shape: 'round', lit: 0.4 }); }
    M.grit(a, S, rnd, 700, 0.12);
  },
  office(a, e, S, rnd) { // merchants' houses: brick with stone bands, paired windows
    const M = MedTex, cw = S / 8, fh = S / 8;
    this.bricks(a, S, rnd, [170, 108, 74], '#7a6a58');
    for (let fy = 0; fy < 8; fy++) {
      a.fillStyle = 'rgba(214,200,172,1)'; a.fillRect(0, fy * fh, S, fh * 0.08); a.fillRect(0, fy * fh + fh * 0.84, S, fh * 0.06);
      for (let cx = 0; cx < 8; cx++) { M.window(a, e, rnd, cx * cw + cw * 0.16, fy * fh + fh * 0.22, cw * 0.28, fh * 0.52, { shape: 'round', lit: 0.36 }); M.window(a, e, rnd, cx * cw + cw * 0.56, fy * fh + fh * 0.22, cw * 0.28, fh * 0.52, { shape: 'round', lit: 0.36 }); }
    }
    this._grit(a, S, rnd, 1000);
  },
  house(a, e, S, rnd) { // cottages: wattle-and-daub under timbers, a door every 12 m
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.plaster(a, S, rnd, [226, 214, 188]); M.timber(a, S, rnd, [70, 46, 30], { seed: 3 });
    for (let fy = 0; fy < 8; fy++) for (let cx = 0; cx < 8; cx++) {
      if (fy === 7 && cx % 4 === 1) { M.door(a, e, cx * cw + cw * 0.3, fy * fh + fh * 0.22, cw * 0.4, fh * 0.78, rnd() < 0.4); continue; }
      M.window(a, e, rnd, cx * cw + cw * 0.33, fy * fh + fh * 0.22, cw * 0.34, fh * 0.4, { frame: '#3a2618', sill: false, lit: 0.4, shutters: '#4f6a3a' });
    }
    M.grit(a, S, rnd, 800);
  },
  roofTiles(a, S, rnd) { // clay / slate tiles in overlapping rows (tinted by the vertex colour)
    a.fillStyle = '#7a6a60'; a.fillRect(0, 0, S, S); const th = S / 16, tw = S / 12;
    for (let r = 0; r < 16; r++) for (let c = -1; c < 13; c++) {
      const v = 0.8 + rnd() * 0.35, x = c * tw + (r % 2) * tw / 2; a.fillStyle = rgba(196 * v, 184 * v, 172 * v, 1);
      a.beginPath(); a.moveTo(x + 1, r * th); a.lineTo(x + tw - 1, r * th); a.lineTo(x + tw - 1, r * th + th * 0.8); a.quadraticCurveTo(x + tw / 2, r * th + th * 1.15, x + 1, r * th + th * 0.8); a.closePath(); a.fill();
      a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(x + 1, r * th + th * 0.85, tw - 2, 2);
    }
    for (let i = 0; i < 30; i++) { a.fillStyle = rgba(60, 80, 40, 0.25); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 4 + rnd() * 16, 3 + rnd() * 8, 0, 0, TAU); a.fill(); }
  },
  corrugated(a, S, rnd) { // wooden shingles (sheds, stalls, shacks)
    a.fillStyle = '#5a4634'; a.fillRect(0, 0, S, S); const th = S / 14, tw = S / 10;
    for (let r = 0; r < 14; r++) for (let c = -1; c < 11; c++) { const v = 0.75 + rnd() * 0.4, x = c * tw + (r % 2) * tw / 2 + (rnd() - 0.5) * 4; a.fillStyle = rgba(150 * v, 120 * v, 90 * v, 1); a.fillRect(x + 1, r * th, tw * (0.8 + rnd() * 0.2) - 2, th - 2); a.fillStyle = 'rgba(0,0,0,0.35)'; a.fillRect(x + 1, r * th + th - 3, tw - 2, 2); }
  },
  seats(a, S, rnd) { // wooden benches of the lists, in rows
    a.fillStyle = '#3a2c20'; a.fillRect(0, 0, S, S); const rh = S / 8;
    for (let r = 0; r < 8; r++) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(150 * v, 116 * v, 84 * v, 1); a.fillRect(0, r * rh + rh * 0.15, S, rh * 0.45); a.fillStyle = 'rgba(0,0,0,0.4)'; a.fillRect(0, r * rh + rh * 0.6, S, 2); for (let x = 0; x < S; x += S / 6) a.fillRect(x, r * rh + rh * 0.15, 2, rh * 0.45); }
  },
  tankTex(a, S, rnd) { // big vats and cisterns: oak staves, iron hoops
    a.fillStyle = '#6a4e36'; a.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += S / 24) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(140 * v, 104 * v, 72 * v, 1); a.fillRect(x + 1, 0, S / 24 - 2, S); }
    a.fillStyle = '#2a2622'; for (let y = S / 10; y < S; y += S / 5) a.fillRect(0, y, S, S / 40);
  },
  warehouse(a, e, S, rnd) { // stone warehouses: rubble walls, arched loading bays, a hoist door per floor
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.rubble(a, S, rnd, [180, 166, 146], 1000);
    for (let fy = 0; fy < 8; fy++) { a.fillStyle = 'rgba(120,104,84,0.8)'; a.fillRect(0, fy * fh + fh - 3, S, 3);
      for (let cx = 0; cx < 8; cx++) { if (cx % 4 === 2) { a.fillStyle = '#4a3424'; a.fillRect(cx * cw + cw * 0.25, fy * fh + fh * 0.18, cw * 0.5, fh * 0.7); a.fillStyle = 'rgba(0,0,0,0.35)'; for (let q = 0; q < 4; q++) a.fillRect(cx * cw + cw * (0.25 + q * 0.125), fy * fh + fh * 0.18, 1.5, fh * 0.7); }
        else M.window(a, e, rnd, cx * cw + cw * 0.34, fy * fh + fh * 0.22, cw * 0.32, fh * 0.46, { shape: 'round', lit: 0.25 }); } }
    M.grit(a, S, rnd, 1200);
  },
  glassroof(a, e, S, rnd) { // timber roof frames: rafters and purlins over boards
    a.fillStyle = '#5c4632'; a.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += S / 20) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(130 * v, 100 * v, 72 * v, 1); a.fillRect(0, y + 1, S, S / 20 - 2); }
    a.fillStyle = '#2e2218'; for (let x = 0; x < S; x += S / 6) a.fillRect(x, 0, S / 40, S); for (let y = 0; y < S; y += S / 4) a.fillRect(0, y, S, S / 60);
  },
  mallFacade(a, e, S, rnd) { // covered market halls: arcades of round arches on stone piers, a lit stall in each
    const M = MedTex, cw = S / 8, fh = S / 8;
    M.ashlar(a, S, rnd, [204, 190, 164], 40, 0.12);
    for (let fy = 0; fy < 8; fy += 2) for (let cx = 0; cx < 8; cx++) {
      const x = cx * cw + cw * 0.1, y = fy * fh + fh * 0.25, w = cw * 0.8, h = fh * 1.7, r = w / 2;
      a.fillStyle = 'rgba(160,144,118,1)'; a.beginPath(); a.moveTo(x - 4, y + h); a.lineTo(x - 4, y + r); a.arc(x + r, y + r, r + 4, Math.PI, 0); a.lineTo(x + w + 4, y + h); a.fill();
      a.fillStyle = '#1a140f'; a.beginPath(); a.moveTo(x, y + h); a.lineTo(x, y + r); a.arc(x + r, y + r, r, Math.PI, 0); a.lineTo(x + w, y + h); a.fill();
      if (rnd() < 0.55) { const g = e.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, M.candle(rnd)); e.save(); e.beginPath(); e.moveTo(x, y + h); e.lineTo(x, y + r); e.arc(x + r, y + r, r, Math.PI, 0); e.lineTo(x + w, y + h); e.clip(); e.globalAlpha = 0.5; e.fillStyle = g; e.fillRect(x, y, w, h); e.globalAlpha = 1; e.fillStyle = 'rgba(0,0,0,0.6)'; e.fillRect(x + w * 0.2, y + h * 0.6, w * 0.15, h * 0.4); e.restore(); }
    }
    M.grit(a, S, rnd, 1000);
  },
  graffitiWall(a, S, rnd) { // old weathered wall: mossy rubble, ivy
    MedTex.rubble(a, S, rnd, [150, 146, 134], 900);
    for (let i = 0; i < 40; i++) { a.fillStyle = rgba(40 + rnd() * 30, 70 + rnd() * 40, 30, 0.45); const x = rnd() * S, y = rnd() * S * 0.6; for (let k = 0; k < 20; k++) { a.beginPath(); a.ellipse(x + (rnd() - 0.5) * 40, y + k * 6 + rnd() * 6, 3 + rnd() * 4, 2 + rnd() * 3, rnd() * 3, 0, TAU); a.fill(); } }
    MedTex.grit(a, S, rnd, 1200, 0.3);
  }
});

// a ground atlas of cobbles, flagstones, beaten earth and grass: the roads are paved with big setts, nothing is painted on them
Tex.groundAtlas = (function (orig) {
  return function (S) {
    const C = orig.call(this, S), a = C.getContext('2d'), rnd = mulberry32(4242);
    const at = (cell, fn) => { const x0 = cell[0] * S, y0 = (3 - cell[1]) * S; a.save(); a.beginPath(); a.rect(x0, y0, S, S); a.clip(); a.translate(x0, y0); fn(); a.restore(); };
    const speck = (n, lo, hi, al, w = 1.5) => { for (let i = 0; i < n; i++) { const v = lo + rnd() * (hi - lo); a.fillStyle = rgba(v, v * 0.96, v * 0.9, al); a.fillRect(rnd() * S, rnd() * S, w, w); } };
    const K = S * S / 262144;
    const setts = (rows, base, joint, jitter = 0.18) => { // rows of rectangular stone setts with staggered joints
      a.fillStyle = joint; a.fillRect(0, 0, S, S); const h = S / rows;
      for (let r = 0; r < rows; r++) { let x = -rnd() * h; while (x < S) { const w = h * (1.1 + rnd() * 0.8), v = 1 + (rnd() - 0.5) * jitter * 2; a.fillStyle = rgba(base[0] * v, base[1] * v, base[2] * v, 1);
        a.beginPath(); if (a.roundRect) a.roundRect(x + 1.5, r * h + 1.5, w - 3, h - 3, h * 0.2); else a.rect(x + 1.5, r * h + 1.5, w - 3, h - 3); a.fill();
        a.fillStyle = 'rgba(255,255,255,0.06)'; a.fillRect(x + 3, r * h + 2.5, w - 6, 1.5); x += w; } }
    };
    const earth = (base) => { a.fillStyle = base; a.fillRect(0, 0, S, S); speck(12000 * K, 40, 110, 0.4, 2); for (let i = 0; i < 30; i++) { a.fillStyle = 'rgba(30,22,14,0.2)'; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, TAU); a.fill(); } };
    at(GCELL.asphalt, () => { setts(12, [92, 86, 78], '#2a2622', 0.22); speck(9000 * K, 20, 70, 0.35); for (let i = 0; i < 14; i++) { a.fillStyle = 'rgba(40,30,20,0.22)'; const r = 20 + rnd() * 70; a.beginPath(); a.ellipse(rnd() * S, rnd() * S, r, r * 0.6, rnd() * 3, 0, TAU); a.fill(); } });
    at(GCELL.parking, () => { setts(10, [98, 90, 80], '#2c2824', 0.2); speck(6000 * K, 20, 70, 0.3); });
    at(GCELL.pavers, () => { // flagstones of the sidewalks
      a.fillStyle = '#3e3a35'; a.fillRect(0, 0, S, S); const pv = S / 5;
      for (let r = 0; r < 5; r++) { let x = -rnd() * pv; while (x < S) { const w = pv * (0.7 + rnd() * 0.8), v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(122 * v, 116 * v, 106 * v, 1); a.fillRect(x + 2, r * pv + 2, w - 4, pv - 4); x += w; } }
      speck(6000 * K, 60, 140, 0.3);
    });
    at(GCELL.tracks, () => { // cart track: beaten earth, two ruts, grass in the middle
      earth('#5a4a38'); for (const x of [0.3, 0.7]) { a.fillStyle = 'rgba(30,22,14,0.55)'; a.fillRect(S * x - S * 0.05, 0, S * 0.1, S); a.fillStyle = 'rgba(80,70,55,0.5)'; a.fillRect(S * x - S * 0.02, 0, S * 0.04, S); }
      for (let i = 0; i < 2500 * K; i++) { a.strokeStyle = rgba(50, 80, 30, 0.6); a.beginPath(); const x = S * (0.45 + rnd() * 0.1), y = rnd() * S; a.moveTo(x, y); a.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 4); a.stroke(); }
    });
    at(GCELL.court, () => { earth('#8a7458'); a.strokeStyle = 'rgba(60,44,30,0.35)'; a.lineWidth = 3; for (let k = 0; k < 18; k++) { a.beginPath(); a.arc(rnd() * S, rnd() * S, 10 + rnd() * 40, 0, rnd() * 3); a.stroke(); } }); // sanded ground of the lists
    at(GCELL.runtrack, () => { earth('#6a5440'); for (let y = 0; y < S; y += 9) { a.fillStyle = 'rgba(40,30,20,0.18)'; a.fillRect(0, y, S, 2); } }); // tilt yard: raked earth
    at(GCELL.pitch, () => { // a meadow, not a mown pitch
      a.fillStyle = '#34522c'; a.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) { a.fillStyle = rgba(40 + rnd() * 30, 70 + rnd() * 30, 30, 0.25); a.beginPath(); a.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 60, 15 + rnd() * 40, rnd() * 3, 0, TAU); a.fill(); }
      for (let i = 0; i < 9000 * K; i++) { const g = 60 + rnd() * 70; a.strokeStyle = rgba(g * 0.55, g, g * 0.35, 0.6); a.lineWidth = 1; const x = rnd() * S, y = rnd() * S; a.beginPath(); a.moveTo(x, y); a.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 4); a.stroke(); }
    });
    return C;
  };
})(Tex.groundAtlas);

// the shops get trades of a medieval town (same number of boards, so every front keeps its place)
SHOP_BOARDS.splice(0, SHOP_BOARDS.length, ...[
  'BOULANGERIE', 'LA MIE DU PORT', 'APOTHICAIRE', 'HERBORISTE', 'TAVERNE DU PORT', 'AUX AMARRES', 'ÉPICERIE', 'PRIMEUR', 'BOUCHERIE', 'POISSONNERIE', 'L’HAMEÇON D’OR', 'FLEURISTE',
  'ENLUMINEUR', 'TEINTURIER', 'LAVANDIÈRES', 'BARBIER-CHIRURGIEN', 'BARBIER', 'LUNETIER', 'ORFÈVRE', 'CORDONNIER', 'FORGERON', 'CHANDELIER', 'TISSERAND', 'ARMURIER',
  'RÔTISSEUR DU QUAI', 'FOURNIL', 'CERVOISERIE', 'BRASSERIE', 'CRÊPES & GALETTES', 'CAVE À VINS', 'FROMAGER', 'MERCIER', 'SELLIER', 'NOTAIRE', 'CHANGEUR', 'CARTOGRAPHE',
  'TONNELIER', 'MERCERIE', 'ANTIQUAIRE', 'LUTHIER', 'PÂTISSIER', 'HYDROMEL', 'ALCHIMISTE', 'PRÊTEUR SUR GAGES', 'CHAUSSES & BOTTES', 'AU PHARE DE L’OUEST', 'MARÉE BASSE · TAVERNE', 'PARFUMEUR'
].map((t, i) => [t, i % 3 ? 'L' : 'D', '#f0d79a', ['#3a2416', '#2a3a2a', '#3a1c1c', '#1e2a3a'][i % 4]]));

// signs, banners and plaques: painted and carved wood instead of neon tubes (same names and sizes)
Tex.buildNeon = function () {
  const W = 2048; this.signs = {};
  const NK = (this.S || 512) >= 512 ? 0.75 : this.S >= 384 ? 0.6 : 0.45;
  const items = []; let a = null;
  const alloc = (w, h) => { const c = mkCanvas(Math.ceil(w * NK), Math.ceil(h * NK)); a = c.getContext('2d'); a.setTransform(NK, 0, 0, NK, 0, 0); return { x: 0, y: 0, w, h, c }; };
  const reg = (name, r, aspect) => { items.push({ name, r, aspect }); };
  const rnd = mulberry32(1313);
  const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
  // a weathered board: planks, a dark frame, gilded or painted letters (the board mesh is drawn self-lit, a little dim)
  const plank = (w, h, wood = [104, 72, 46]) => {
    a.fillStyle = rgba(wood[0] * 0.6, wood[1] * 0.6, wood[2] * 0.6, 1); a.fillRect(0, 0, w, h); const n = Math.max(2, Math.round(h / 34));
    for (let k = 0; k < n; k++) { const v = 0.85 + rnd() * 0.3; a.fillStyle = rgba(wood[0] * v, wood[1] * v, wood[2] * v, 1); a.fillRect(2, k * h / n + 1.5, w - 4, h / n - 3); for (let i = 0; i < w / 12; i++) { a.fillStyle = 'rgba(30,18,10,0.22)'; a.fillRect(rnd() * w, k * h / n + 3 + rnd() * (h / n - 6), 10 + rnd() * 50, 1); } }
    a.strokeStyle = '#24170e'; a.lineWidth = Math.max(4, h * 0.06); a.strokeRect(a.lineWidth / 2, a.lineWidth / 2, w - a.lineWidth, h - a.lineWidth);
    a.fillStyle = '#2a2622'; for (const [x, y] of [[0.04, 0.2], [0.96, 0.2], [0.04, 0.8], [0.96, 0.8]]) { a.beginPath(); a.arc(w * x, h * y, Math.max(2, h * 0.03), 0, TAU); a.fill(); }
  };
  const letters = (txt, x, y, size, color, family = SERIF, weight = 700) => {
    a.font = `${weight} ${size}px ${family}`; a.textAlign = 'center'; a.textBaseline = 'middle';
    a.fillStyle = 'rgba(0,0,0,0.6)'; a.fillText(txt, x + size * 0.04, y + size * 0.05); a.fillStyle = color; a.fillText(txt, x, y);
  };
  const fitSize = (txt, maxW, size, family = SERIF, weight = 700) => { a.font = `${weight} ${size}px ${family}`; const mw = a.measureText(txt).width; return mw > maxW ? size * maxW / mw : size; };
  const boardH = (name, txt, color, w = 512, h = 128, fontSize = 84) => {
    const r = alloc(w, h); plank(w, h); letters(txt, w / 2, h / 2 + 3, fitSize(txt, w * 0.84, fontSize * 0.86), color); reg(name, r);
  };
  const boardV = (name, txt, color, w = 128, h = 512) => { // a hanging blade sign: an emblem then the word, read downward
    const r = alloc(w, h); plank(w, h, [96, 64, 40]); const n = txt.length, step = h / (n + 0.4);
    for (let i = 0; i < n; i++) letters(txt[i], w / 2, step * (i + 0.7), Math.min(step * 0.8, w * 0.66), color); reg(name, r);
  };
  const GOLD = '#e8c070', CREAM = '#efe2c0', RED = '#c8463a';
  boardV('hotel', 'AUBERGE', GOLD); boardV('bar', 'TAVERNE', CREAM, 128, 420); boardV('club', 'HYDROMEL', GOLD, 128, 460); boardV('ramen', 'RÔTISSERIE', CREAM, 128, 560);
  boardH('lephare', 'Au Phare', GOLD); boardH('laverie', 'Lavoir', CREAM, 640, 128, 70); boardH('kebab', 'RÔTISSEUR', GOLD); boardH('cinema', 'MYSTÈRES', RED);
  boardH('karaoke', 'Ménestrels', GOLD); boardH('ouvert', 'OUVERT', CREAM, 384, 110, 72); boardH('pizza', 'Fournil', GOLD); boardH('sushi', 'POISSONS', CREAM);
  boardH('garage', 'CHARRON', GOLD, 512, 128, 80); boardH('police', 'CORPS DE GARDE', GOLD, 640, 150, 100); boardH('criee', 'LA CRIÉE', CREAM, 640, 140, 90);
  boardH('marche', 'Marché de nuit', GOLD, 768, 150, 88); boardH('motel', 'RELAIS DE LA MARÉE', CREAM, 640, 128, 76); boardH('tabacTxt', 'HERBES', GOLD, 384, 110, 76);
  { const r = alloc(256, 256); a.save(); a.translate(128, 128); a.fillStyle = '#2a1c12'; a.beginPath(); a.arc(0, 0, 120, 0, TAU); a.fill(); a.fillStyle = '#e8dcc0'; a.beginPath(); a.arc(0, 0, 108, 0, TAU); a.fill(); // apothecary: a red cross on a round board
    a.fillStyle = '#a8322a'; a.fillRect(-26, -84, 52, 168); a.fillRect(-84, -26, 168, 52); a.restore(); reg('cross', r); }
  { const r = alloc(160, 320); a.save(); a.translate(80, 160); a.fillStyle = '#5a2a1a'; a.beginPath(); a.moveTo(0, -150); a.lineTo(62, 0); a.lineTo(0, 150); a.lineTo(-62, 0); a.closePath(); a.fill(); // spices: a lozenge board
    a.strokeStyle = GOLD; a.lineWidth = 6; a.stroke(); a.restore(); letters('ÉPICES', 80, 162, 30, GOLD); reg('carotte', r); }
  // the great posters become painted cloth banners and heralds' notices
  const cloth = (name, fn, w = 1024, h = 384) => { const r = alloc(w, h); a.save(); a.beginPath(); a.rect(0, 0, w, h); a.clip(); fn(w, h); a.restore(); reg(name, r); };
  const parchment = (w, h, c0 = '#d8c49a', c1 = '#a88a5a') => { const g = a.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7); g.addColorStop(0, c0); g.addColorStop(1, c1); a.fillStyle = g; a.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { a.fillStyle = rgba(90, 60, 30, rnd() * 0.12); a.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 2 + rnd() * 8); } a.strokeStyle = '#5a3a1c'; a.lineWidth = 10; a.strokeRect(14, 14, w - 28, h - 28); };
  cloth('bb_volt', (w, h) => { a.fillStyle = '#26324e'; a.fillRect(0, 0, w, h); a.fillStyle = '#c8a050'; a.fillRect(0, 0, w, 18); a.fillRect(0, h - 18, w, 18); // guild of mages: a star on blue cloth
    a.save(); a.translate(w - 170, h / 2); a.fillStyle = '#e8c070'; a.beginPath(); for (let k = 0; k < 10; k++) { const t = k / 10 * TAU - Math.PI / 2, r = k % 2 ? 40 : 110; a.lineTo(Math.cos(t) * r, Math.sin(t) * r); } a.closePath(); a.fill(); a.restore();
    letters('GUILDE DES MAGES', w * 0.42, h * 0.42, fitSize('GUILDE DES MAGES', w * 0.7, 96), '#efe2c0'); letters('Sorts, philtres & talismans', w * 0.42, h * 0.75, 44, '#c8a050', SERIF, 400); });
  cloth('bb_tide', (w, h) => { parchment(w, h, '#c8d0b0', '#7a8a6a'); letters('LA MARÉE VIENT', w / 2, h * 0.4, fitSize('LA MARÉE VIENT', w * 0.8, 130), '#2a4a3a'); letters('Repentez-vous avant la Grande Crue', w / 2, h * 0.68, 40, '#3a2a1a', SERIF, 400);
    a.strokeStyle = '#2a4a3a'; a.lineWidth = 6; for (let k = 0; k < 3; k++) { a.beginPath(); for (let x = 60; x <= w - 60; x += 16) a.lineTo(x, h * 0.84 + k * 12 + Math.sin(x * 0.03 + k) * 6); a.stroke(); } });
  cloth('bb_tel', (w, h) => { parchment(w, h); letters('MESSAGERIE DU PORT', w / 2, h * 0.4, fitSize('MESSAGERIE DU PORT', w * 0.8, 110), '#4a2a14'); letters('Pigeons voyageurs · plis scellés · 2 sols', w / 2, h * 0.72, 44, '#6a3a1a', SERIF, 400); });
  cloth('bb_cine', (w, h) => { a.fillStyle = '#4a1418'; a.fillRect(0, 0, w, h); a.fillStyle = '#c8a050'; for (let x = 0; x < w; x += 64) { a.beginPath(); a.moveTo(x, h); a.lineTo(x + 32, h - 30); a.lineTo(x + 64, h); a.fill(); }
    letters('MYSTÈRE DE LA NOYADE', w / 2, h * 0.3, fitSize('MYSTÈRE DE LA NOYADE', w * 0.86, 84), '#e8c070'); letters('CE SOIR SUR LE PARVIS', w / 2, h * 0.6, 60, '#efe2c0'); });
  // chalk marks of the cult and of the gangs, faint (drawn additively)
  const tag = (name, txt, color, w = 1024, h = 256, size = 110) => { const r = alloc(w, h); a.save(); a.translate(w / 2, h / 2); a.rotate(-0.04); a.globalAlpha = 0.55; letters(txt, 0, 0, fitSize(txt, w * 0.9, size), color, SERIF, 400); a.restore(); reg(name, r); };
  tag('g_tide', 'LA MARÉE VIENT', '#b8d0b8'); tag('g_rats', 'RATS DE QUAI', '#d0b090', 900, 256, 120); tag('g_sea', 'LA MER REPRENDRA TOUT', '#b8d0b8', 1024, 200, 84);
  // street names on dark slate plaques; the original twelve stay, the new streets get old names
  this.streetNames = ['RUE DES CORDIERS', 'AVENUE DU PHARE', 'RUE BASSE', 'QUAI DE LA SALINE', 'RUE DES FILETS', 'BD DE LA MARÉE', 'RUE DU MARCHÉ', 'ALLÉE DES BRUMES', 'RUE DES CALFATS', 'RUE DU PHARE', 'AVENUE DES DOCKS', 'RUE DES AMARRES'];
  const O = this.streetNames;
  this.streetX = ['RUE DES FORGES', 'RUE DES TANNEURS', 'RUE DES CHANDELIERS', 'RUE DES COMPAGNONS', 'RUE DES TILLEULS', O[0], O[1], O[2], O[3], O[4], O[5], 'RUE DES LICES', 'RUE DES LANTERNES', 'RUE DU COLLÈGE', 'RUE DES PASSEURS', 'CHEMIN DES GRÈVES'];
  this.streetZ = ['CHEMIN DU NORD', 'RUE DE LA HALLE', 'RUE DU ROY', 'RUE DU JARDIN', O[6], O[7], O[8], O[9], O[10], O[11]];
  const plaque = (key, n) => { const r = alloc(336, 88); a.fillStyle = '#2a2c30'; a.fillRect(0, 0, 336, 88); a.strokeStyle = '#8a7a5a'; a.lineWidth = 5; a.strokeRect(6, 6, 324, 76); letters(n, 168, 46, fitSize(n, 300, 36, SERIF, 700), '#e8dcc0'); reg(key, r); };
  this.streetX.forEach((n, i) => plaque('sx' + i, n)); this.streetZ.forEach((n, j) => plaque('sz' + j, n));
  // district signs
  boardH('gare', 'GRANDE HALLE', GOLD, 768, 150, 96); boardH('hopital', 'HÔTEL-DIEU SAINT-ROCH', CREAM, 768, 128, 76); boardH('urgences', 'INFIRMERIE', RED, 512, 128, 84);
  boardH('stade', 'LICES DE LA MARÉE', GOLD, 768, 140, 84); boardH('casino', 'TRIPOT', GOLD, 512, 150, 110); boardH('theatre', 'THÉÂTRE', RED, 512, 128, 88); boardH('cabaret', 'Cabaret', GOLD, 512, 128, 88);
  boardH('arcades', 'LES HALLES', GOLD, 768, 150, 110); boardH('univ', 'COLLÈGE DES MAGES', CREAM, 640, 128, 80); boardH('mairie', 'HÔTEL DE VILLE', GOLD, 768, 128, 80); boardH('pompiers', 'GUET DU FEU', RED, 512, 128, 88);
  boardH('garemar', 'CAPITAINERIE', CREAM, 768, 140, 88); boardH('luna', 'Foire aux Lunes', GOLD, 640, 150, 110); boardH('marina', 'Port des Barques', CREAM, 512, 128, 92); boardH('dimsum', 'BOUILLONS', GOLD, 512, 128, 88);
  boardH('the', 'Maison du Thé', CREAM, 640, 128, 76); boardH('bowling', 'Jeu de Quilles', GOLD, 512, 128, 88); boardH('hotelsea', 'Auberge de la Grève', CREAM, 640, 128, 72);
  boardV('dragon', 'DRAGON', RED, 128, 560); boardV('lotus', 'LOTUS', GOLD, 128, 480);
  // the boards above the shops
  SHOP_BOARDS.forEach(([txt, , tc], i) => { const w = 400, h = 60, r = alloc(w, h); plank(w, h, i % 2 ? [110, 76, 48] : [86, 58, 38]); letters(txt, w / 2, h / 2 + 2, fitSize(txt, w * 0.84, 36), tc); reg('shop' + i, r); });
  // skyline packing, tallest first (same as the original atlas)
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
};
