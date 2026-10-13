/* =====================================================================
   HUD — bars, objective, radar, markers, prompts, radio, toasts
   ===================================================================== */
const HUD = {
  el: {}, radio: { q: [], cur: null, t: 0, shown: 0 }, hintT: 0, bigT: 0, lagHp: 1, mapImg: null, markers: {}, fpsT: 0, fpsN: 0,
  init() {
    for (const id of ['hud', 'hpfill', 'hplag', 'hpbar', 'stfill', 'score', 'hudobj', 'objlabel', 'objtext', 'crime', 'crimeval', 'crimefill', 'crimetarget', 'timer', 'bossbar', 'bossname', 'bossfill', 'combo', 'radar', 'weapon', 'wname', 'wammo', 'markers', 'crosshair', 'hint', 'prompt', 'promptg', 'promptt', 'ringarc', 'radio', 'radiowho', 'radiotxt', 'toasts', 'bigmsg', 'big1', 'big2', 'fps', 'dmgdir', 'touch', 'tset-foot', 'tset-car', 'tb-fire', 'tb-action', 'tb-action-l', 'tb-sprint', 'tb-lock', 'threats', 'tb-weapon', 'tbw-name', 'tbw-ammo', 'tb-punch', 'tb-kick', 'tb-cfire', 'tb-cfire-l', 'area', 'nades', 'nadesn', 'nadewarn', 'tb-nade', 'tb-nade-n', 'tb-jump', 'tb-jump-l', 'pops', 'streak', 'fatebar', 'fatefill', 'tb-fate'])
      this.el[id] = $(id);
    this.el.team = $('team'); this.el.cs2 = document.querySelector('#hud .cs2'); this.el.csb = document.querySelector('#hud .callsign b');
    this.ctx = this.el.radar.getContext('2d');
    this.buildMap();
    Bus.on('device', () => this.deviceChanged());
    window.addEventListener('resize', () => this.updateTouchVisibility());
    this.deviceChanged();
  },
  show(on) { this.el.hud.hidden = !on; this.updateTouchVisibility(); if (!on) this.clearPops(); },
  // radar size, mirrors the CSS (--radar)
  radarSize() { const W = window.innerWidth, H = window.innerHeight; return H <= 420 ? clamp(H * 0.29, 78, 112) : (W <= 760 || H <= 500) ? 112 : 150; },
  updateTouchVisibility() {
    const on = !this.el.hud.hidden && Input.device === 'touch' && Game.mode === 'play';
    this.el.touch.hidden = !on;
    const pb = $('tb-ping'); if (pb) pb.hidden = !(MP.on && MP.state === 'play'); // multiplayer: « Ici ! »
    // on short screens the button clusters shrink so they never climb over the radar (cluster = 246 units tall at scale 1, sprint on top)
    const H = window.innerHeight, room = H - (12 + this.radarSize() + 10) - 12;
    const fit = clamp(room / 246, 0.6, 1);
    document.documentElement.style.setProperty('--tb', String(((Save.data.options.touchSize || 1) * fit).toFixed(3)));
  },
  deviceChanged() { this.updateTouchVisibility(); this.weaponChanged(); if (Game.mode === 'play' && Input.device === 'kbm') Input.requestLock && 0; Menus.updateDevices && Menus.updateDevices(); this.lastPromptKey = null; },
  carMode(on, ride) { this.el['tset-foot'].hidden = on; this.el['tset-car'].hidden = !on; document.body.classList.toggle('incar', !!on); document.body.classList.toggle('ride', !!(on && ride)); this.lastPromptKey = null; },
  weaponChanged() {
    const P = Game.player; if (!P) return;
    const W = WEAPONS[P.cur] || WEAPONS.fists; this.el.wname.textContent = W.name;
    this.el.weapon.classList.toggle('firearm', !!W.firearm);
    // touch: with a gun in hand the fire button takes the place of punch + kick
    this.el['tb-fire'].hidden = !W.firearm; this.el['tb-punch'].hidden = !!W.firearm; this.el['tb-kick'].hidden = !!W.firearm;
    this._twn = null; this._twa = null;
    this.wFlashT = 1.8; // the weapon panel shows briefly after a change, then only while a weapon is in hand
  },
  // grenades left: a chip under the weapon panel (keyboard / pad), a badge on the touch button
  nadesChanged() { const P = Game.player; if (!P) return; const n = String(P.nades || 0); this.el.nadesn.textContent = n; this.el['tb-nade-n'].textContent = n; this._nadeN = -1; },
  // enemy grenade close by: a red marker on it, or on the edge of the screen with an arrow toward it
  nadeWarn() {
    const el = this.el.nadewarn, n = Nades.threat(), P = Game.player;
    if (!n || !P || P.state === 'car') { if (this._nw) { this._nw = false; el.classList.remove('on'); } return; }
    if (!this._nw) { this._nw = true; el.classList.add('on'); }
    const p = this._nwp || (this._nwp = { x: 0, y: 0 }), W = Gfx.W, H = Gfx.H, m = 46;
    const vis = Cam.project(n.x, n.y + 0.25, n.z, p);
    let x = p.x, y = p.y, edge = false;
    if (!vis || x < m || x > W - m || y < m || y > H - m) { // off screen: pin to the border, toward the grenade
      edge = true; const a = Math.atan2(n.x - Cam.pos.x, n.z - Cam.pos.z) - CamCtl.yaw, dx = -Math.sin(a), dy = -Math.cos(a);
      const k = Math.min((W / 2 - m) / Math.max(1e-3, Math.abs(dx)), (H / 2 - m) / Math.max(1e-3, Math.abs(dy)));
      x = W / 2 + dx * k; y = H / 2 + dy * k; el.firstChild.style.transform = `rotate(${Math.atan2(dx, -dy)}rad)`;
    }
    el.classList.toggle('edge', edge); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  },
  buildMap() {
    // the whole city at 2 px per metre (1.25 on small-memory phones); north is up (−z)
    const sc = Tex.lowRes ? 1.25 : 2, MX0 = -500, MZ0 = -452, MX1 = 500, MZ1 = 292;
    const C = mkCanvas(Math.round((MX1 - MX0) * sc), Math.round((MZ1 - MZ0) * sc)), a = C.getContext('2d');
    this.mapScale = sc; this.mapX0 = MX0; this.mapZ0 = MZ0; this.mapW = C.width; this.mapH = C.height;
    const X = x => (x - MX0) * sc, Z = z => (z - MZ0) * sc;
    const R = (x0, z0, x1, z1) => a.fillRect(X(x0), Z(z0), Math.max(1, (x1 - x0) * sc), Math.max(1, (z1 - z0) * sc));
    a.fillStyle = '#0a1522'; a.fillRect(0, 0, C.width, C.height); // the bay
    a.fillStyle = '#121419'; R(MX0, MZ0, MX1, WATER_Z); // outskirts
    a.fillStyle = '#2a2e39'; R(BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, WATER_Z); // streets (blocks are drawn over them)
    a.fillStyle = '#1b1e26'; for (const b of World.boxes) if (b.kind === 'slab') R(b.x0, b.z0, b.x1, b.z1);
    for (const m of World.mapAreas || []) { a.fillStyle = m.c; R(m.x0, m.z0, m.x1, m.z1); }
    for (const b of World.boxes) {
      if (b.kind !== 'bld' && b.kind !== 'cont' && b.kind !== 'pier') continue;
      if (b.kind === 'pier') a.fillStyle = '#3a342c'; else if (b.kind === 'cont') a.fillStyle = '#3a3f4c';
      else { const k = Math.min(1, b.y1 / 70); a.fillStyle = `rgb(${52 + k * 60 | 0},${57 + k * 64 | 0},${70 + k * 78 | 0})`; }
      R(b.x0, b.z0, b.x1, b.z1);
    }
    // road centre lines
    a.strokeStyle = 'rgba(255,255,255,0.07)'; a.lineWidth = 1;
    for (let i = 0; i < NI; i++) for (let j = 0; j <= NJ; j++) if (Net.segX(i, j)) { a.beginPath(); a.moveTo(X(RX[i]), Z(RZ[j])); a.lineTo(X(RX[i + 1]), Z(RZ[j])); a.stroke(); }
    for (let i = 0; i <= NI; i++) for (let j = 0; j < NJ; j++) if (Net.segZ(i, j)) { a.beginPath(); a.moveTo(X(RX[i]), Z(RZ[j])); a.lineTo(X(RX[i]), Z(RZ[j + 1])); a.stroke(); }
    // zip lines
    a.strokeStyle = 'rgba(255,181,71,0.5)'; a.lineWidth = 1.5; for (const zz of World.zips) { a.beginPath(); a.moveTo(X(zz.a.x), Z(zz.a.z)); a.lineTo(X(zz.b.x), Z(zz.b.z)); a.stroke(); }
    this.mapImg = C;
    // names on the full map (core areas + the districts around), most important first
    this.mapLabels = [
      { t: 'Commissariat', x: 0, z: -104, c: '#4da3ff', p: 0 }, { t: 'Marché de nuit', x: -101, z: 2, p: 1 }, { t: 'Place de la Marée', x: 0, z: 8, p: 1 },
      { t: 'Docks', x: -60, z: 104, p: 1 }, { t: 'La Criée', x: 54, z: 96, p: 1 }, { t: 'Vieux phare', x: 95, z: 244, c: '#2ef2b0', p: 1 }, { t: 'Centre', x: 54, z: -54, c: '#c9cfdd', p: 2 },
      { t: 'Vieille ville', x: -81, z: -54, c: '#c9cfdd', p: 2 }, { t: 'Hauts de Saline', x: -81, z: -112, c: '#c9cfdd', p: 2 }, { t: 'Les Entrepôts', x: 108, z: 48, c: '#c9cfdd', p: 2 }
    ].concat((Districts.list || []).map(d => ({ t: d.name, x: d.x, z: d.z, c: '#e7d3a8', p: 3 })));
  },
  toast(title, sub, cls, quiet) {
    const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    this.el.toasts.appendChild(d); while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 2700);
  },
  // short notices go through the toast stack (no panel in the middle of the screen); repeated notices are throttled
  hint(html) { const now = performance.now(); if (this._hintTxt === html && now - (this._hintAt || 0) < 2500) return; this._hintTxt = html; this._hintAt = now; this.toast(html, '', 'gold'); },
  big(l1, l2, cls, t = 3) { this.el.big1.textContent = l1; this.el.big2.textContent = l2 || ''; this.el.bigmsg.className = 'on ' + (cls || ''); this.bigT = t; },
  say(who, text, dur) { this.radio.q.push({ who, text, dur: dur || Math.max(3.2, text.length * 0.055) }); },
  clearRadio() { this.radio.q = []; this.radio.cur = null; this.el.radio.classList.remove('on'); },
  hitmark(k) { const c = this.el.crosshair; c.classList.add('hit'); c.classList.toggle('armor', k === 'armor'); c.classList.toggle('head', k === 'head'); clearTimeout(this._hm); this._hm = setTimeout(() => c.classList.remove('hit', 'armor', 'head'), k === 'head' ? 220 : 120); },
  damage(src) {
    if (!src || !Game.player) return; const P = Game.player;
    const a = Math.atan2(src.pos.x - P.pos.x, src.pos.z - P.pos.z) - CamCtl.yaw; // relative to camera forward
    const el = this.el.dmgdir.children[this._di = ((this._di || 0) + 1) % 4];
    el.style.transform = `rotate(${-a}rad)`; el.style.opacity = 1; el.style.transition = 'none';
    requestAnimationFrame(() => { el.style.transition = 'opacity 0.9s'; el.style.opacity = 0; });
  },
  combo(n) {
    const c = this.el.combo; if (n >= 2) { c.textContent = '×' + n; c.className = 'combo on t' + Math.min(4, Game.comboTier(n)); c.classList.remove('punch'); void c.offsetWidth; c.classList.add('punch'); } else c.classList.remove('on');
  },
  // a short word or number that rises from a point of the world, then fades (score, damage, feats)
  pop(x, y, z, text, cls, sub) {
    const L = this.pops || (this.pops = []);
    let e; if (L.length >= 16) { e = L.shift(); } else { e = document.createElement('div'); this.el.pops.appendChild(e); }
    e.className = 'pop ' + (cls || ''); e.innerHTML = sub ? text + '<span class="pop mult" style="position:static;opacity:1">' + sub + '</span>' : text;
    let stack = 0; for (const o of L) if (o !== e && o._t < 0.6 && Math.abs(o._x - x) < 1.5 && Math.abs(o._z - z) < 1.5) stack++; // several at once: one above the other
    e._x = x + R(-0.25, 0.25) + (stack % 2 ? 0.35 : -0.35) * Math.min(1, stack); e._y = y + stack * 0.32; e._z = z; e._t = 0; e._life = cls === 'feat' ? 1.5 : cls === 'dmg' ? 0.75 : 1.1; e._vy = cls === 'dmg' ? 1.3 : 0.9; e._w = Math.random() * 6.28; L.push(e); e.style.opacity = '0';
    return e;
  },
  updatePops(dt) {
    const L = this.pops; if (!L || !L.length) return; const p = this._pv || (this._pv = {}); const W = Gfx.W, H = Gfx.H;
    for (let i = L.length - 1; i >= 0; i--) {
      const e = L[i]; e._t += dt; const u = e._t / e._life;
      if (u >= 1) { e.style.opacity = '0'; e.remove(); L.splice(i, 1); continue; }
      const vis = Cam.project(e._x, e._y + e._t * e._vy, e._z, p);
      if (!vis || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { e.style.opacity = '0'; continue; }
      const sc = u < 0.12 ? 0.6 + (u / 0.12) * 0.55 : 1.15 - (u - 0.12) * 0.2, al = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      e.style.transform = `translate(${p.x + Math.sin(e._w + e._t * 3) * 4}px, ${p.y}px) translate(-50%, -100%) scale(${sc.toFixed(3)})`; e.style.opacity = al.toFixed(2);
    }
  },
  streak(n) { const s = this.el.streak; if (!s) return; if (n >= 3) { s.textContent = 'Série ×' + n; s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); clearTimeout(this._stk); this._stk = setTimeout(() => s.classList.remove('on'), 1800); } else s.classList.remove('on'); },
  clearPops() { if (this.pops) { for (const e of this.pops) e.remove(); this.pops.length = 0; } const s = this.el.streak; if (s) s.classList.remove('on'); },
  update(dt) {
    const P = Game.player, E = this.el; if (!P) return;
    if ((this._prT = (this._prT || 0) - dt) <= 0) { this._prT = 0.3; const r = E.hudobj.hidden ? E.hpbar.getBoundingClientRect() : E.hudobj.getBoundingClientRect(); this.panelR = { r: r.right, b: r.bottom }; }
    // bars
    const hpk = clamp(P.hp / P.maxHp, 0, 1); this.lagHp = this.lagHp > hpk ? damp(this.lagHp, hpk, 3, dt) : hpk;
    E.hpfill.style.transform = `scaleX(${hpk})`; E.hplag.style.transform = `scaleX(${this.lagHp})`; E.hpbar.classList.toggle('low', hpk < 0.3);
    const carK = P.state === 'car' && P.car ? clamp(P.car.hp / P.car.maxHp, 0, 1) : -1; E.stfill.parentNode.classList.toggle('carhp', carK >= 0); E.stfill.parentNode.classList.toggle('carfire', carK >= 0 && P.car.fireT > 0);
    E.stfill.style.transform = `scaleX(${carK >= 0 ? carK : clamp(P.stamina / P.maxStamina, 0, 1)})`; if (P.lowStamina !== this._tired) { this._tired = P.lowStamina; E.stfill.parentNode.classList.toggle('tired', !!P.lowStamina); }
    // Fate gauge: fills with the blows, drains during the Reckoning; the touch button shows once it can be used
    { const fk = clamp((P.fate || 0) / 100, 0, 1), on = P.reckT > 0, full = fk >= 1 && !on; E.fatefill.style.transform = `scaleX(${fk})`;
      if (full !== this._fateFull) { this._fateFull = full; E.fatebar.classList.toggle('full', full); }
      if (on !== this._fateOn) { this._fateOn = on; E.fatebar.classList.toggle('on', on); }
      const tShow = (full || on) && P.state !== 'car'; if (E['tb-fate'].hidden === tShow) E['tb-fate'].hidden = !tShow; }
    Render.post.dmg = damp(Render.post.dmg, hpk < 0.3 ? 0.35 + Math.sin(Env.time * 5) * 0.08 : 0, 3, dt);
    { const sc = Math.max(0, Math.round(Game.score)); if (sc !== this._score) { if (this._score !== undefined && sc > this._score) { E.score.classList.remove('up'); void E.score.offsetWidth; E.score.classList.add('up'); clearTimeout(this._scT); this._scT = setTimeout(() => E.score.classList.remove('up'), 400); } this._score = sc; E.score.textContent = String(sc).padStart(5, '0'); } }
    this.updatePops(dt);
    // brigade (multiplayer): the partners, their health and how far they are; our own call sign
    if (MP.on && MP.state === 'play') this.updateTeam(P, dt); else if (!E.team.hidden) E.team.hidden = true;
    { const mp = MP.on && MP.state === 'play', A = ROBOT_ACCENTS[P.slot || 0], cs = ' · ' + (mp ? A.n : 'Saline-17').toUpperCase();
      if (cs !== this._cs && E.cs2) { this._cs = cs; E.cs2.textContent = cs; E.csb.textContent = mp ? (MP.myName() || A.n).toUpperCase() : 'SOLIS'; E.csb.style.color = mp ? A.css : ''; } }
    // weapon: panel (keyboard / pad) only with a weapon in hand or right after a change; never in a car
    const inCar = P.state === 'car';
    if (this.wFlashT > 0) this.wFlashT -= dt;
    const ammoTxt = P.isFirearm() ? (P.reloadT > 0 ? 'Recharge…' : `${P.inv[P.cur].mag}/${P.inv[P.cur].res}`) : '';
    const wShow = inCar ? this.wFlashT > 0 && P.isFirearm() : (P.cur !== 'fists' || this.wFlashT > 0);
    if (E.weapon.classList.contains('show') !== wShow) E.weapon.classList.toggle('show', wShow);
    if (ammoTxt !== this._ammo) { this._ammo = ammoTxt; E.wammo.innerHTML = P.isFirearm() && P.reloadT <= 0 ? ammoTxt.replace(/^(\d+)\//, '<b>$1</b> / ') : ammoTxt; }
    // touch: the weapon switch button shows the weapon in hand (hidden in a car or with nothing to switch to)
    if (Input.device === 'touch') {
      const tw = !inCar && P.weaponList().length > 1; if (E['tb-weapon'].hidden === tw) E['tb-weapon'].hidden = !tw;
      // drive-by button: only in a car with a loaded gun; its label carries the ammo count
      const cw = inCar ? P.carWeapon() : null; if (E['tb-cfire'].hidden === !!cw) E['tb-cfire'].hidden = !cw;
      if (cw) { const i = P.inv[cw], cl = P.reloadT > 0 ? 'Recharge' : `Tir ${i.mag}/${i.res}`; if (cl !== this._cfl) { this._cfl = cl; E['tb-cfire-l'].textContent = cl; } }
      if (tw) { const nm = (WEAPONS[P.cur] || WEAPONS.fists).name; if (nm !== this._twn) { this._twn = nm; E['tbw-name'].textContent = nm; } const am = P.isFirearm() ? (P.reloadT > 0 ? '…' : ammoTxt) : ''; if (am !== this._twa) { this._twa = am; E['tbw-ammo'].textContent = am; } }
    }
    // grenades: chip (keyboard / pad) and touch button, shown while some are left
    const nn = P.nades || 0, nShow = nn > 0 && !inCar;
    if (nn !== this._nadeN) { this._nadeN = nn; E.nadesn.textContent = nn; E['tb-nade-n'].textContent = nn; }
    if (E.nades.classList.contains('show') !== nShow) E.nades.classList.toggle('show', nShow);
    E.nades.classList.toggle('aim', !!P.nadeAim);
    if (E['tb-nade'].hidden === nShow) E['tb-nade'].hidden = !nShow;
    this.nadeWarn();
    // mission panel (top-left column): objective, timer, boss / van health, crime meter
    const M = Game.mission;
    const obj = M && M.objective ? M.objective : '';
    if (obj !== this._obj) { this._obj = obj; E.objtext.innerHTML = obj; }
    const lab = M && M.objLabel || 'Objectif'; if (lab !== this._lab) { this._lab = lab; E.objlabel.textContent = lab; }
    if (Game.showCrime) {
      E.crime.hidden = false; const cv = Math.round(Game.crime) + ' %'; if (cv !== this._cv) { this._cv = cv; E.crimeval.textContent = cv; }
      E.crimefill.style.transform = `scaleX(${Game.crime / 100})`; E.crimefill.style.transformOrigin = 'left'; E.crimetarget.style.left = (Game.crimeTarget || 0) + '%'; E.crimetarget.hidden = !Game.crimeTarget;
    } else E.crime.hidden = true;
    const hasT = Game.timer !== null && Game.timer !== undefined;
    if (hasT) { E.timer.hidden = false; const tt = fmtTime(Game.timer); if (tt !== this._tt) { this._tt = tt; E.timer.textContent = tt; } E.timer.classList.toggle('warn', Game.timer < 30); } else E.timer.hidden = true;
    const boss = Game.boss; let bn = '', bk = 0;
    if (M && M.bar) { bn = M.bar.name; bk = M.bar.k(); }
    else if (M && M.vanBar && M.van) { bn = 'Camionnette de la Marée'; bk = M.van.hp / M.van.maxHp; }
    else if (boss && boss.alive && !boss.cuffed && boss.hp > 0) { bn = boss.T.name; bk = boss.hp / boss.maxHp; }
    E.bossbar.hidden = !bn; if (bn) { if (bn !== this._bn) { this._bn = bn; E.bossname.textContent = bn; } E.bossfill.style.transform = `scaleX(${clamp(bk, 0, 1)})`; E.bossfill.style.transformOrigin = 'left'; }
    const panel = !!(obj || hasT || bn || Game.showCrime); if (E.hudobj.hidden === panel) E.hudobj.hidden = !panel;
    // district name, GTA style, when entering a new area (after a short confirmation, so a corner does not flicker it)
    const ar = World.districtAt(P.pos.x, P.pos.z);
    if (ar && ar !== this._area) { if (ar === this._areaC) this._areaT += dt; else { this._areaC = ar; this._areaT = 0; } if (this._areaT > 0.7) { this._area = ar; E.area.textContent = ar; E.area.classList.add('on'); this._areaShow = 3.4; } }
    if (this._areaShow > 0 && (this._areaShow -= dt) <= 0) E.area.classList.remove('on');
    // prompt
    this.updatePrompt(P);
    // crosshair
    const ch = P.isFirearm() && P.state === 'move' && (P.aiming || Input.device === 'kbm');
    E.crosshair.classList.toggle('on', ch); E.crosshair.classList.toggle('lock', !!P.lockT); E.crosshair.classList.toggle('small', !P.aiming);
    // hint / big
    if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) E.bigmsg.classList.remove('on'); }
    this.updateRadio(dt);
    this.updateMarkers(P, M);
    this.drawRadar(P, M);
    // touch labels
    if (Input.device === 'touch') {
      const act = P.state === 'move' ? P.interact : null; const lab = act ? act.text.split(' ')[0] : 'Action';
      if (E['tb-action-l'].textContent !== lab) E['tb-action-l'].textContent = lab;
      E['tb-action'].classList.toggle('hot', !!act);
      const jp = P.state === 'move' ? (P.prompt && P.prompt.a === 'jump' ? P.prompt.t : P.jumpHint) : null; // e.g. a fence to climb, a car to cross
      if (E['tb-jump-l'] && E['tb-jump-l'].textContent !== (jp || 'Saut')) E['tb-jump-l'].textContent = jp || 'Saut';
      if (E['tb-jump']) E['tb-jump'].classList.toggle('hot', !!jp);
      E['tb-sprint'].classList.toggle('toggled', !!Input.touch.sprint);
      if (E['tb-lock']) E['tb-lock'].classList.toggle('toggled', !!(P.lockOk && P.lockOk()));
    }
    // fps
    if (Save.data.options.showFps) { this.fpsN++; this.fpsT += dt; if (this.fpsT > 0.5) { E.fps.hidden = false; E.fps.textContent = Math.round(this.fpsN / this.fpsT) + ' i/s · ' + Gfx.bw + '×' + Gfx.bh; this.fpsN = 0; this.fpsT = 0; } } else E.fps.hidden = true;
  },
  updateTeam(P, dt) {
    if ((this._tmT = (this._tmT || 0) - dt) > 0) return; this._tmT = 0.25;
    const E = this.el, L = MP.robots().filter(r => r !== P);
    E.team.hidden = !L.length; if (!L.length) return;
    let h = '';
    for (const r of L) {
      const A = ROBOT_ACCENTS[r.slot || 0], k = clamp(r.hp / (r.maxHp || 1), 0, 1), out = !r.alive;
      h += `<div class="tm${out ? ' out' : ''}" style="color:${A.css}"><i></i><span>${esc(r.pname || A.n)}</span><b><u style="transform:scaleX(${k.toFixed(2)})"></u></b><em>${out ? 'H.S.' : r.state === 'car' ? 'auto' : Math.round(dist3(r.pos, P.pos)) + ' m'}</em></div>`;
    }
    if (h !== this._tmH) { this._tmH = h; E.team.innerHTML = h; }
  },
  updatePrompt(P) {
    const E = this.el; const pr = P.prompt || (P.state === 'car' && P.car && (Math.abs(P.car.speed) < 1.5 || P.car.fireT > 0) ? { a: 'exit', t: P.car.fireT > 0 ? 'Sortir vite !' : 'Sortir', car: true } : null);
    const key = pr ? pr.a + '|' + pr.t + '|' + Input.device + '|' + Input.padType : '';
    if (key !== this.lastPromptKey) {
      this.lastPromptKey = key;
      if (pr) { E.promptg.innerHTML = Input.glyph(pr.a); E.promptt.textContent = pr.t; E.prompt.classList.add('on'); }
      else E.prompt.classList.remove('on');
    }
    const prog = pr && pr.p !== undefined ? pr.p : 0; E.ringarc.style.strokeDashoffset = String(69.1 * (1 - prog));
    E.prompt.querySelector('.ring').style.display = pr && pr.p !== undefined ? '' : 'none';
    // touch: the action / jump buttons already carry the label, so the pill only appears for hold actions (progress ring)
    if (Input.device === 'touch' && pr && pr.p === undefined && (P.state === 'car' || pr.a === 'jump' || pr.a === 'action')) E.prompt.classList.remove('on');
  },
  // the character on screen who speaks the line (gestures while talking)
  findTalker(who) {
    const P = Game.player; if (!P || !who) return null; const w = who.toLowerCase(), first = w.split(/[\s·]/)[0];
    let best = null, bd = 30;
    for (const a of Game.actors) {
      if (a === P || a.removed || !a.alive || !a.app.look) continue;
      const lb = (a.tags.label || '').toLowerCase(), k = (a.app.kind || '').toLowerCase();
      if (!(lb && (lb === w || lb.split(/[\s·]/)[0] === first) || k.length > 3 && w.indexOf(k) >= 0)) continue;
      const d = dist3(a.pos, P.pos); if (d < bd) { bd = d; best = a; }
    }
    return best;
  },
  updateRadio(dt) {
    const R2 = this.radio, E = this.el;
    if (!R2.cur && R2.q.length) { R2.cur = R2.q.shift(); R2.t = 0; R2.shown = 0; E.radiowho.textContent = R2.cur.who; E.radiowho.style.color = (this.speakerCol && this.speakerCol[R2.cur.who]) || ''; E.radiotxt.textContent = ''; E.radio.classList.add('on'); Snd.play('radio', null, 0.6); Game.talker = this.findTalker(R2.cur.who); }
    if (!R2.cur) Game.talker = null;
    if (R2.cur) {
      R2.t += dt; const n = Math.min(R2.cur.text.length, Math.floor(R2.t * 55));
      if (n !== R2.shown) { R2.shown = n; E.radiotxt.textContent = R2.cur.text.slice(0, n); }
      if (R2.t > R2.cur.dur + R2.cur.text.length / 55) { R2.cur = null; if (!R2.q.length) E.radio.classList.remove('on'); }
    }
  },
  mk(id, cls) { let m = this.markers[id]; if (!m) { m = document.createElement('div'); m.className = 'mk ' + (cls || ''); m.innerHTML = '<div class="tag"></div><div class="dia"></div><div class="dist"></div><div class="hpb" hidden><i></i></div>'; this.el.markers.appendChild(m); this.markers[id] = m; m._tag = m.children[0]; m._dist = m.children[2]; m._hpb = m.children[3]; m._hp = m._hpb.firstChild; } m._used = true; return m; },
  updateMarkers(P, M) {
    for (const k in this.markers) this.markers[k]._used = false;
    const p = { x: 0, y: 0, w: 0 };
    const LK = P.lockOk && P.lockOk() ? P.lock : null;
    if (M && M.marker && !(LK && dist3(M.markerPos(), LK.pos) < 2.2)) {
      const mp = M.markerPos(); const m = this.mk('obj', 'obj');
      let vis = Cam.project(mp.x, mp.y + 2.2, mp.z, p); const W = Gfx.W, H = Gfx.H;
      let edge = false;
      const X0 = Math.max(W * 0.1, 40), X1 = W - X0, Y0 = Math.max(H * 0.2, 70), Y1 = H - Math.max(H * 0.2, 60);
      if (!vis || p.x < X0 || p.x > X1 || p.y < Y0 || p.y > Y1) { // clamp to an inset screen rectangle
        const dx = mp.x - Cam.pos.x, dz = mp.z - Cam.pos.z; const a = Math.atan2(dx, dz) - CamCtl.yaw;
        const sx = -Math.sin(a), sy = -Math.cos(a); const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
        const k = Math.min((X1 - cx) / Math.abs(sx || 1e-6), (Y1 - cy) / Math.abs(sy || 1e-6));
        p.x = cx + sx * k; p.y = cy + sy * k; edge = true;
        // keep off the mission panel (top-left): slide below it or to its right, whichever is closer
        const R = this.panelR; if (R && p.x < R.r + 24 && p.y < R.b + 34) { if (R.b + 34 - p.y < R.r + 24 - p.x) p.y = R.b + 34; else p.x = R.r + 24; }
      }
      m.classList.toggle('edge', edge);
      m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      const d = Math.round(dist3(P.pos, mp)); m._dist.textContent = d + ' m'; m._tag.textContent = edge ? '' : M.markerTag || '';
    }
    // partners (multiplayer): their name over their head, or at the edge of the screen in their direction
    if (MP.on && MP.state === 'play') for (const r of MP.robots()) {
      if (r === P || r.removed) continue; const A = ROBOT_ACCENTS[r.slot || 0], d = dist3(r.pos, P.pos);
      const m = this.mk('mate' + (r.slot || 0), 'mate'); m.style.color = A.css; m._hpb.hidden = true;
      if (P.state === 'car' && d < 3.2) { m.style.transform = 'translate(-999px,-999px)'; continue; } // sitting in the same car
      const W = Gfx.W, H = Gfx.H, X0 = 40, X1 = W - 40, Y0 = Math.max(H * 0.18, 60), Y1 = H - Math.max(H * 0.2, 60);
      let vis = Cam.project(r.pos.x, r.pos.y + 2.3, r.pos.z, p), edge = false;
      if (!vis || p.x < X0 || p.x > X1 || p.y < Y0 || p.y > Y1) {
        if (d < 18) { m.style.transform = 'translate(-999px,-999px)'; continue; }
        const a = Math.atan2(r.pos.x - Cam.pos.x, r.pos.z - Cam.pos.z) - CamCtl.yaw, sx = -Math.sin(a), sy = -Math.cos(a), cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
        const k = Math.min((X1 - cx) / Math.abs(sx || 1e-6), (Y1 - cy) / Math.abs(sy || 1e-6)); p.x = cx + sx * k; p.y = cy + sy * k; edge = true;
      }
      m.classList.toggle('edge', edge); m.classList.toggle('downed', !!r.downed); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      const left = r.downed ? (r === P ? 0 : r.downLeft !== undefined ? r.downLeft : Math.ceil(r.downT || 0)) : 0;
      m._tag.textContent = (r.pname || A.n) + (r.downed ? ` · à réparer${left ? ' ' + left + ' s' : ''}` : r.alive ? '' : ' · H.S.'); m._dist.textContent = d > 12 ? Math.round(d) + ' m' : '';
    }
    // signals of the partners (« Ici ! »): on the enemy or the spot they marked, for a few seconds
    if (MP.on && MP.state === 'play' && MP.pings && MP.pings.length) {
      const now = performance.now(); MP.pings = MP.pings.filter(q => now - q.at < 9000);
      for (const q of MP.pings) {
        const foe = q.a ? (MP.host ? Game.actors.find(a => a.id === q.a && !a.removed) : MP.ents.get(q.a)) : null;
        const x = foe ? foe.pos.x : q.x, y = foe ? foe.pos.y + 2.4 : q.y + 0.7, z = foe ? foe.pos.z : q.z;
        const A = ROBOT_ACCENTS[q.s || 0], m = this.mk('ping' + (q.s || 0), 'ping'); m.style.color = A.css; m._hpb.hidden = true;
        const W = Gfx.W, H = Gfx.H, X0 = 40, X1 = W - 40, Y0 = Math.max(H * 0.18, 60), Y1 = H - Math.max(H * 0.2, 60);
        let edge = false;
        if (!Cam.project(x, y, z, p) || p.x < X0 || p.x > X1 || p.y < Y0 || p.y > Y1) {
          const a = Math.atan2(x - Cam.pos.x, z - Cam.pos.z) - CamCtl.yaw, sx = -Math.sin(a), sy = -Math.cos(a), cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
          const k = Math.min((X1 - cx) / Math.abs(sx || 1e-6), (Y1 - cy) / Math.abs(sy || 1e-6)); p.x = cx + sx * k; p.y = cy + sy * k; edge = true;
        }
        m.classList.toggle('edge', edge); m.classList.toggle('foe', !!foe); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        m._tag.textContent = `${q.n} : ${foe ? 'ennemi !' : 'ici !'}`; m._dist.textContent = Math.round(Math.hypot(x - P.pos.x, z - P.pos.z)) + ' m';
      }
    }
    // locked target: reticle + health bar
    const L = P.lockOk && P.lockOk() ? P.lock : null;
    if (L && Cam.project(L.pos.x, L.aim ? L.aimY : L.pos.y + L.h + 0.42, L.pos.z, p)) {
      const m = this.mk('lock', 'lockon'); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, ${L.aim ? -50 : -100}%)`;
      m._tag.textContent = L.aim ? '' : L.arrestable ? 'À interpeller' : L.boss && L.T ? L.T.name : L.tags.label || ''; m._dist.textContent = '';
      m._hpb.hidden = !!L.aim; if (!L.aim) m._hp.style.transform = `scaleX(${clamp(L.hp / L.maxHp, 0, 1)})`;
      m.classList.toggle('down', !!L.down || L.state === 'surrender');
    }
    // drive-by: ring on what a shot from the car would hit
    const CA = P.state === 'car' ? P.carAim : null;
    if (CA && Cam.project(CA.pos.x, CA.pos.y + (CA.len ? 1.0 : 1.2), CA.pos.z, p)) { const m = this.mk('caraim', 'caraim'); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`; m._tag.textContent = ''; m._dist.textContent = ''; m._hpb.hidden = !!CA.len; if (!CA.len) m._hp.style.transform = `scaleX(${clamp(CA.hp / CA.maxHp, 0, 1)})`; }
    this.updateThreats(P, L);
    // arrestable suspects nearby
    let n = 0;
    for (const a of Game.actors) {
      if (n > 6) break;
      if (a === L) continue;
      if (a.arrestable && dist3(a.pos, P.pos) < 22) { if (Cam.project(a.pos.x, a.pos.y + 1.1, a.pos.z, p)) { const m = this.mk('ar' + a.id, 'arrest'); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`; m._tag.textContent = dist3(a.pos, P.pos) < 2 ? '' : 'À interpeller'; m._dist.textContent = ''; n++; } }
      else if (a.tags.target && a.alive && !a.cuffed && dist3(a.pos, P.pos) < 90) { if (Cam.project(a.pos.x, a.pos.y + 2.3, a.pos.z, p)) { const m = this.mk('tg' + a.id, 'enemy'); m.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`; m._tag.textContent = a.tags.label || ''; m._dist.textContent = Math.round(dist3(a.pos, P.pos)) + ' m'; n++; } }
    }
    for (const k in this.markers) { const m = this.markers[k]; if (!m._used) { m.remove(); delete this.markers[k]; } }
  },
  // engaged enemies outside the view: chevrons on the screen border (hot = about to strike / aiming)
  updateThreats(P, L) {
    const box = this.el.threats; if (!box) return;
    this.thr = this.thr || []; let n = 0; const p = { x: 0, y: 0, w: 0 };
    const W = Gfx.W, H = Gfx.H, cx = W / 2, cy = H / 2, rx = W / 2 - 46, ry = H / 2 - 46;
    if (P.state !== 'car') for (const a of Game.actors) {
      if (n >= 6) break;
      if (a === P || !a.alerted || !a.alive || a.down || a.cuffed || a.removed || a.inCar || a.team === 'civ' || a.state === 'surrender') continue;
      const d = dist2D(a.pos.x, a.pos.z, P.pos.x, P.pos.z); if (d > 18) continue;
      if (Cam.project(a.pos.x, a.pos.y + 1, a.pos.z, p) && p.x > 30 && p.x < W - 30 && p.y > 30 && p.y < H - 30) continue;
      const ang = Math.atan2(a.pos.x - Cam.pos.x, a.pos.z - Cam.pos.z) - CamCtl.yaw, sx = -Math.sin(ang), sy = -Math.cos(ang);
      let el = this.thr[n]; if (!el) { el = document.createElement('div'); el.className = 'threat'; box.appendChild(el); this.thr[n] = el; }
      const hot = (a.state === 'attack' && a.atk && a.atk.t < a.atk.d.hit) || a.aimT > 0 || a.state === 'charge';
      el.hidden = false; el.classList.toggle('hot', !!hot); el.classList.toggle('lock', a === L);
      const k = clamp(1.25 - d / 16, 0.55, 1.15);
      el.style.transform = `translate(${cx + sx * rx}px, ${cy + sy * ry}px) rotate(${Math.atan2(sx, -sy)}rad) scale(${k})`;
      n++;
    }
    for (let i = n; i < this.thr.length; i++) this.thr[i].hidden = true;
  },
  drawRadar(P, M) {
    const c = this.ctx, S = 300, R0 = 146;
    // px per metre: zooms out when driving fast
    const spd = P.state === 'car' && P.car ? Math.abs(P.car.speed) : 0; this.radarSc = lerp(this.radarSc || 2.6, clamp(2.6 - spd * 0.05, 1.3, 2.6), 0.04); const sc = this.radarSc;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, S, S);
    c.save(); c.beginPath(); c.arc(S / 2, S / 2, R0, 0, TAU); c.fillStyle = 'rgba(6,8,14,0.78)'; c.fill(); c.clip();
    const yaw = CamCtl.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const rot = -Math.PI / 2 - Math.atan2(fz, fx);
    c.translate(S / 2, S / 2); c.rotate(rot);
    { // the part of the map around the player (source rect clamped to the image)
      const k = this.mapScale, f = sc / k, rM = R0 / sc + 3;
      let sx = (P.pos.x - rM - this.mapX0) * k, sy = (P.pos.z - rM - this.mapZ0) * k, sw = 2 * rM * k, sh = sw, dx = -rM * sc, dy = -rM * sc, dw = 2 * rM * sc, dh = dw;
      if (sx < 0) { dx -= sx * f; dw += sx * f; sw += sx; sx = 0; } if (sy < 0) { dy -= sy * f; dh += sy * f; sh += sy; sy = 0; }
      if (sx + sw > this.mapW) { const o = sx + sw - this.mapW; sw -= o; dw -= o * f; } if (sy + sh > this.mapH) { const o = sy + sh - this.mapH; sh -= o; dh -= o * f; }
      c.globalAlpha = 0.92; if (sw > 1 && sh > 1) c.drawImage(this.mapImg, sx, sy, sw, sh, dx, dy, dw, dh); c.globalAlpha = 1;
    }
    const dot = (x, z, r, col, ring) => { const X = (x - P.pos.x) * sc, Y = (z - P.pos.z) * sc; if (X * X + Y * Y > (R0 - 6) * (R0 - 6)) return; c.beginPath(); c.arc(X, Y, r, 0, TAU); if (ring) { c.strokeStyle = col; c.lineWidth = 2; c.stroke(); } else { c.fillStyle = col; c.fill(); } };
    for (const a of Game.actors) {
      if (a === P || a.removed) continue;
      if (a.isRobot) { if (a.downed) dot(a.pos.x, a.pos.z, 6 + Math.sin(Env.time * 8) * 1.5, ROBOT_ACCENTS[a.slot || 0].css, true); else if (a.alive && !a.hidden) dot(a.pos.x, a.pos.z, 5.5, ROBOT_ACCENTS[a.slot || 0].css); continue; } // partners
      if (!a.alive) continue;
      if (a.team === 'civ') { if (a.mode === 'victim') dot(a.pos.x, a.pos.z, 5, '#ffb547', true); continue; }
      if (a.cuffed) { dot(a.pos.x, a.pos.z, 3.5, '#6c7a96'); continue; }
      if (a.arrestable) { dot(a.pos.x, a.pos.z, 6 + Math.sin(Env.time * 8) * 1.5, '#ffffff', true); continue; }
      if (a.team === 'gang' || a.team === 'cult') dot(a.pos.x, a.pos.z, a.boss ? 7 : 4.5, a.alerted ? '#ff3b4e' : '#b8434f');
    }
    for (const car of Cars.list) { if (car.tags.target && !car.dead) dot(car.pos.x, car.pos.z, 7, '#ff3b4e', true); else if (car.police && car.driver !== P) dot(car.pos.x, car.pos.z, 4, '#4da3ff'); }
    for (const p of Pickups.list) if (p.type === 'badge' && dist2D(p.pos.x, p.pos.z, P.pos.x, P.pos.z) < 30) dot(p.pos.x, p.pos.z, 3, '#ffcf85');
    if (MP.on && MP.pings) for (const q of MP.pings) { const X = (q.x - P.pos.x) * sc, Y = (q.z - P.pos.z) * sc; if (X * X + Y * Y > (R0 - 8) * (R0 - 8)) continue; c.save(); c.translate(X, Y); c.rotate(Math.PI / 4); c.strokeStyle = ROBOT_ACCENTS[q.s || 0].css; c.lineWidth = 3; c.strokeRect(-6, -6, 12, 12); c.restore(); } // partners' signals
    c.restore();
    // objective marker (clamped to rim)
    if (M && M.marker) {
      const mp = M.markerPos(); let X = (mp.x - P.pos.x) * sc, Y = (mp.z - P.pos.z) * sc;
      const cr = Math.cos(rot), sr = Math.sin(rot); let rx = X * cr - Y * sr, ry = X * sr + Y * cr; const l = Math.hypot(rx, ry);
      const edge = l > R0 - 12; if (edge) { rx *= (R0 - 12) / l; ry *= (R0 - 12) / l; }
      c.save(); c.translate(S / 2 + rx, S / 2 + ry); c.rotate(Math.PI / 4); c.fillStyle = '#ffb547'; c.strokeStyle = '#1a1206'; c.lineWidth = 2; c.fillRect(-7, -7, 14, 14); c.strokeRect(-7, -7, 14, 14); c.restore();
      const dy = mp.y - P.pos.y; if (Math.abs(dy) > 3) { c.fillStyle = '#ffcf85'; c.font = '600 20px ' + FONTS.ui; c.textAlign = 'center'; c.fillText(dy > 0 ? '▲' : '▼', S / 2 + rx, S / 2 + ry - 12); }
    }
    // player arrow (relative to camera)
    c.save(); c.translate(S / 2, S / 2); c.rotate(-(P.yaw - yaw) + Math.PI); c.fillStyle = '#4da3ff'; c.strokeStyle = '#e8f2ff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 11); c.lineTo(8, -8); c.lineTo(0, -4); c.lineTo(-8, -8); c.closePath(); c.fill(); c.stroke(); c.restore();
    // rim + north
    c.beginPath(); c.arc(S / 2, S / 2, R0, 0, TAU); c.strokeStyle = 'rgba(226,232,247,0.35)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e8ebf4'; c.font = '700 22px ' + FONTS.ui; c.textAlign = 'center'; c.textBaseline = 'middle';
    const nx = S / 2 + Math.cos(rot - Math.PI / 2) * (R0 - 16), ny = S / 2 + Math.sin(rot - Math.PI / 2) * (R0 - 16); c.fillText('N', nx, ny);
  },
  /* ---------- full-screen map: drag to pan, pinch / wheel / triggers to zoom ---------- */
  openMap(cv) {
    const P = Game.player; const r = cv.getBoundingClientRect();
    const fit = Math.min(r.width / (this.mapW / this.mapScale), r.height / (this.mapH / this.mapScale));
    this.mapView = { cx: P ? P.pos.x : 0, cz: P ? P.pos.z : -40, z: Math.max(fit, Math.min(r.width, r.height) / 330), fit };
    this.clampMapView(r);
    if (!this._mapUI) this.initMapUI(cv);
    this.drawFullMap(cv);
  },
  clampMapView(r) {
    const v = this.mapView; v.z = clamp(v.z, v.fit * 0.95, 5);
    const x0 = this.mapX0, x1 = this.mapX0 + this.mapW / this.mapScale, z0 = this.mapZ0, z1 = this.mapZ0 + this.mapH / this.mapScale;
    const hw = r.width / 2 / v.z, hh = r.height / 2 / v.z;
    v.cx = hw * 2 >= x1 - x0 ? (x0 + x1) / 2 : clamp(v.cx, x0 + hw, x1 - hw); v.cz = hh * 2 >= z1 - z0 ? (z0 + z1) / 2 : clamp(v.cz, z0 + hh, z1 - hh);
  },
  mapZoomAt(px, py, k) { // zoom by k keeping the point under (px,py) fixed
    const cv = $('mapcv'), r = cv.getBoundingClientRect(), v = this.mapView; if (!v) return;
    const wx = v.cx + (px - r.width / 2) / v.z, wz = v.cz + (py - r.height / 2) / v.z;
    v.z = clamp(v.z * k, v.fit * 0.95, 5); v.cx = wx - (px - r.width / 2) / v.z; v.cz = wz - (py - r.height / 2) / v.z;
    this.clampMapView(r); this.drawFullMap(cv);
  },
  initMapUI(cv) {
    this._mapUI = true; const ptrs = new Map();
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, pos(e)); e.preventDefault(); });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId), v = this.mapView; if (!p || !v) return; const q = pos(e);
      if (ptrs.size === 1) { v.cx -= (q.x - p.x) / v.z; v.cz -= (q.y - p.y) / v.z; p.x = q.x; p.y = q.y; this.clampMapView(cv.getBoundingClientRect()); this.drawFullMap(cv); return; }
      const L = [...ptrs.values()]; const m0 = { x: (L[0].x + L[1].x) / 2, y: (L[0].y + L[1].y) / 2 }, d0 = Math.hypot(L[0].x - L[1].x, L[0].y - L[1].y);
      p.x = q.x; p.y = q.y;
      const L2 = [...ptrs.values()]; const m1 = { x: (L2[0].x + L2[1].x) / 2, y: (L2[0].y + L2[1].y) / 2 }, d1 = Math.hypot(L2[0].x - L2[1].x, L2[0].y - L2[1].y);
      v.cx -= (m1.x - m0.x) / v.z; v.cz -= (m1.y - m0.y) / v.z;
      if (d0 > 8) this.mapZoomAt(m1.x, m1.y, d1 / d0); else this.drawFullMap(cv);
    });
    const up = e => ptrs.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); const q = pos(e); this.mapZoomAt(q.x, q.y, Math.exp(-clamp(e.deltaY, -120, 120) * 0.0022)); }, { passive: false });
  },
  // pad / keyboard: stick or WASD pans, triggers / right stick / + − zoom
  mapUpdate(dt) {
    const v = this.mapView, cv = $('mapcv'); if (!v || !cv) return;
    const mx = Input.move.x, my = Input.move.y; let zk = 0;
    if (Input.pad) { zk += Input.pv(7) - Input.pv(6); const ay = Input.pad.axes[3] || 0; if (Math.abs(ay) > 0.2) zk -= ay; }
    if (Input.k('Equal', 'NumpadAdd', 'KeyE')) zk += 1; if (Input.k('Minus', 'NumpadSubtract', 'KeyQ')) zk -= 1;
    if (!mx && !my && !zk) return;
    const r = cv.getBoundingClientRect();
    v.cx += mx * 420 / v.z * dt; v.cz -= my * 420 / v.z * dt;
    if (zk) this.mapZoomAt(r.width / 2, r.height / 2, Math.exp(zk * 1.8 * dt)); else { this.clampMapView(r); this.drawFullMap(cv); }
  },
  drawFullMap(cv) {
    const P = Game.player, M = Game.mission, v = this.mapView; if (!v) return;
    const r = cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#05060b'; c.fillRect(0, 0, W, H);
    const z = v.z * dpr, ox = W / 2 - v.cx * z, oy = H / 2 - v.cz * z; // screen = world * z + o
    const W2 = (x, zz) => [x * z + ox, zz * z + oy];
    c.imageSmoothingEnabled = v.z < this.mapScale * 1.5;
    const k = z / this.mapScale; c.drawImage(this.mapImg, this.mapX0 * z + ox, this.mapZ0 * z + oy, this.mapW * k, this.mapH * k);
    // labels, greedy: skip one that would cover an earlier one
    const boxes = []; const fs = Math.round(clamp(10 + v.z * 3, 11, 15) * dpr);
    c.font = `700 ${fs}px ${FONTS.ui}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const L of (this.mapLabels || []).slice().sort((p, q) => p.p - q.p)) {
      const [X, Y] = W2(L.x, L.z); if (X < -50 || Y < -20 || X > W + 50 || Y > H + 20) continue;
      const w = c.measureText(L.t).width + 10 * dpr, h = fs + 6 * dpr; const bx = { x0: X - w / 2, y0: Y - h / 2, x1: X + w / 2, y1: Y + h / 2 };
      if (boxes.some(b => b.x0 < bx.x1 && b.x1 > bx.x0 && b.y0 < bx.y1 && b.y1 > bx.y0)) continue; boxes.push(bx);
      c.fillStyle = 'rgba(5,6,11,0.72)'; c.fillRect(bx.x0, bx.y0, w, h); c.fillStyle = L.c || '#ffb547'; c.fillText(L.t, X, Y + dpr);
    }
    for (const b of Pickups.list) if (b.type === 'badge') { const [X, Y] = W2(b.pos.x, b.pos.z); c.fillStyle = 'rgba(255,207,133,0.5)'; c.beginPath(); c.arc(X, Y, 3 * dpr, 0, TAU); c.fill(); }
    if (M && M.marker) { const mp = M.markerPos(); let [X, Y] = W2(mp.x, mp.z); X = clamp(X, 12 * dpr, W - 12 * dpr); Y = clamp(Y, 12 * dpr, H - 12 * dpr); c.save(); c.translate(X, Y); c.rotate(Math.PI / 4); c.fillStyle = '#ffb547'; c.strokeStyle = '#1a1206'; c.lineWidth = 2 * dpr; c.fillRect(-8 * dpr, -8 * dpr, 16 * dpr, 16 * dpr); c.strokeRect(-8 * dpr, -8 * dpr, 16 * dpr, 16 * dpr); c.restore(); }
    if (MP.on && MP.state === 'play') for (const r of MP.robots()) { // the partners, with their call signs
      if (r === P || r.removed) continue; const [X, Y] = W2(r.pos.x, r.pos.z), A = ROBOT_ACCENTS[r.slot || 0];
      c.beginPath(); c.arc(X, Y, 7 * dpr, 0, TAU); c.fillStyle = A.css; c.fill(); c.strokeStyle = r.downed ? '#ff3b4e' : '#fff'; c.lineWidth = 2 * dpr; c.stroke();
      c.font = `700 ${Math.round(13 * dpr)}px ${FONTS.ui}`; c.textAlign = 'center'; c.fillStyle = '#e8ebf4'; c.fillText((r.pname || A.n) + (r.downed ? ' · à réparer' : ''), X, Y - 11 * dpr);
    }
    if (P) { const [X, Y] = W2(P.pos.x, P.pos.z); c.save(); c.translate(X, Y); c.rotate(-P.yaw); c.fillStyle = '#4da3ff'; c.strokeStyle = '#fff'; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(0, 11 * dpr); c.lineTo(8 * dpr, -8 * dpr); c.lineTo(-8 * dpr, -8 * dpr); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.fillStyle = '#e8ebf4'; c.font = `700 ${Math.round(14 * dpr)}px ${FONTS.ui}`; c.textAlign = 'right'; c.fillText('▲ Nord', W - 8 * dpr, 16 * dpr);
  }
};

