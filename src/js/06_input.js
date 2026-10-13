/* =====================================================================
   INPUT — unified keyboard/mouse, gamepad, touch
   ===================================================================== */
const ACTIONS = ['jump', 'punch', 'kick', 'action', 'block', 'dodge', 'aim', 'fire', 'sprint', 'reload', 'next', 'prev', 'holster', 'pause', 'map', 'siren', 'handbrake', 'lock', 'exit', 'nade', 'ping'];
const Input = {
  device: 'kbm', padType: 'xbox', azerty: false, layoutMap: null,
  keys: {}, mouseBtn: [false, false, false], mdx: 0, mdy: 0, wheel: 0, locked: false, lockWanted: false,
  pad: null, padPrev: [], padIndex: -1, sprintToggle: false,
  touch: { mx: 0, my: 0, ldx: 0, ldy: 0, btn: {}, tap: {}, joyId: null, lookId: null, jx: 0, jy: 0, lookLast: null, sprint: false },
  held: {}, prev: {}, pressed: {}, released: {},
  move: { x: 0, y: 0, mag: 0 }, look: { x: 0, y: 0 }, rstick: { x: 0, y: 0 }, throttle: 0, brake: 0, steer: 0,
  ctx: { firearm: false, car: false, carGun: false },
  ui: { up: false, down: false, left: false, right: false, ok: false, back: false, start: false },
  uiRepeat: {}, enabled: true,
  init() {
    const lang = (navigator.language || '').toLowerCase(); this.azerty = lang.startsWith('fr') || lang.startsWith('be');
    try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { this.layoutMap = m; const w = m.get('KeyW'); if (w) this.azerty = w.toLowerCase() === 'z'; Bus.emit('device'); }).catch(() => { }); } catch (e) { }
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) { if (!(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); }
      if (e.target && e.target.tagName === 'INPUT') return; // typing a name or an address: not game keys
      // hardware keys of phones / remotes (volume, media…) must not switch a touch player to keyboard mode
      if (!e.code || /^(Audio|Media|Launch|Browser|Unidentified|Power|Wake|Sleep)/.test(e.code)) return;
      if (!this.keys[e.code]) this.keys[e.code] = 1;
      this.setDevice('kbm');
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = 0; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouseBtn = [false, false, false]; this.touch.btn = {}; });
    const cv = $('gl');
    // A tap on a touch screen is followed by emulated mouse events (mousedown, click…). They must not be taken for
    // a real mouse: that flipped the game to keyboard mode and hid the touch controls after every menu tap,
    // so the next tap on Pause / Carte (or the joystick) was lost.
    this.lastTouchT = -1e9;
    const touchNow = () => { this.lastTouchT = performance.now(); };
    const fromTouch = e => !!(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) || performance.now() - this.lastTouchT < 1000;
    window.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') touchNow(); }, true);
    window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') touchNow(); }, true);
    window.addEventListener('touchstart', touchNow, { passive: true, capture: true });
    window.addEventListener('touchend', touchNow, { passive: true, capture: true });
    window.addEventListener('mousedown', e => { if (fromTouch(e)) return; if (e.button < 3 && e.target === cv) { this.mouseBtn[e.button] = true; if (e.button === 1) { this.midTap = true; e.preventDefault(); } } this.setDevice('kbm'); });
    window.addEventListener('mouseup', e => { if (e.button < 3) this.mouseBtn[e.button] = false; });
    window.addEventListener('mousemove', e => {
      if (this.locked) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; this.setDevice('kbm'); }
      else if (this.mouseBtn[0] && this.dragLook) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; }
    });
    window.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    window.addEventListener('contextmenu', e => { if (e.target === cv || (e.target.closest && e.target.closest('#touch'))) e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === cv; Bus.emit('lock', this.locked); });
    document.addEventListener('pointerlockerror', () => { this.locked = false; this.dragLook = true; });
    window.addEventListener('gamepadconnected', e => { this.padIndex = e.gamepad.index; this.detectPad(e.gamepad); });
    window.addEventListener('gamepaddisconnected', () => { this.padIndex = -1; this.pad = null; if (this.device === 'pad') this.setDevice(('ontouchstart' in window) ? 'touch' : 'kbm'); });
    this.initTouch();
  },
  requestLock() {
    const cv = $('gl'); if (this.device !== 'kbm' || this.locked) return;
    try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => { this.dragLook = true; }); } catch (e) { this.dragLook = true; }
  },
  releaseLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } },
  detectPad(gp) { const id = (gp.id || '').toLowerCase(); this.padType = /xbox|xinput|045e/.test(id) ? 'xbox' : /054c|playstation|dualshock|dualsense|ps4|ps5|wireless controller/.test(id) ? 'ps' : 'xbox'; },
  setDevice(d) { if (this.device === d) return; this.device = d; document.body.dataset.device = d; Bus.emit('device', d); },
  initTouch() {
    const T = this.touch; const layer = $('touch'); if (!layer) return;
    const joy = $('joy'), knob = $('joy-knob');
    const onDown = e => {
      if (e.pointerType === 'mouse') return;
      this.setDevice('touch');
      const btn = e.target.closest && e.target.closest('[data-b]');
      if (btn) { e.preventDefault(); const b = btn.dataset.b; T.btn[b] = (T.btn[b] || 0) + 1; T.tap[b] = true; btn.classList.add('on'); btn._pid = btn._pid || new Set(); btn._pid.add(e.pointerId); try { btn.setPointerCapture(e.pointerId); } catch (er) { } return; }
      const x = e.clientX, y = e.clientY, W = window.innerWidth;
      if (x < W * 0.42 && T.joyId === null) {
        T.joyId = e.pointerId; T.jx = x; T.jy = y; T.mx = T.my = 0;
        joy.style.left = x + 'px'; joy.style.top = y + 'px'; joy.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
      } else if (T.lookId === null) { T.lookId = e.pointerId; T.lookLast = [x, y]; }
      e.preventDefault();
    };
    const onMove = e => {
      if (e.pointerType === 'mouse') return;
      if (e.pointerId === T.joyId) {
        const R = 56 * (Save.data.options.touchSize || 1); let dx = e.clientX - T.jx, dy = e.clientY - T.jy; const l = Math.hypot(dx, dy);
        if (l > R) { // drag base along
          T.jx += dx * (1 - R / l) * 0.6; T.jy += dy * (1 - R / l) * 0.6; dx = e.clientX - T.jx; dy = e.clientY - T.jy; joy.style.left = T.jx + 'px'; joy.style.top = T.jy + 'px';
        }
        const l2 = Math.min(Math.hypot(dx, dy), R); const a = Math.atan2(dy, dx);
        T.mx = Math.cos(a) * l2 / R; T.my = -Math.sin(a) * l2 / R;
        knob.style.transform = `translate(calc(-50% + ${Math.cos(a) * l2}px), calc(-50% + ${Math.sin(a) * l2}px))`;
      } else if (e.pointerId === T.lookId && T.lookLast) {
        T.ldx += e.clientX - T.lookLast[0]; T.ldy += e.clientY - T.lookLast[1]; T.lookLast = [e.clientX, e.clientY];
      }
    };
    const onUp = e => {
      if (e.pointerType === 'mouse') return;
      if (e.pointerId === T.joyId) { T.joyId = null; T.mx = T.my = 0; joy.classList.remove('on'); }
      if (e.pointerId === T.lookId) { T.lookId = null; T.lookLast = null; }
      document.querySelectorAll('#touch [data-b]').forEach(btn => { if (btn._pid && btn._pid.has(e.pointerId)) { btn._pid.delete(e.pointerId); const b = btn.dataset.b; T.btn[b] = Math.max(0, (T.btn[b] || 1) - 1); if (!T.btn[b]) btn.classList.remove('on'); } });
    };
    layer.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    window.addEventListener('touchstart', () => this.setDevice('touch'), { passive: true });
  },
  k(...codes) { for (const c of codes) if (this.keys[c]) return true; return false; },
  pb(i) { const p = this.pad; return !!(p && p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5)); },
  pv(i) { const p = this.pad; return p && p.buttons[i] ? p.buttons[i].value : 0; },
  // no gameplay input for this step (multiplayer pause menu: the robot stands still while the city goes on);
  // unblank() puts the held buttons back so nothing counts as freshly pressed afterwards
  blank() {
    this._hold = Object.assign({}, this.held);
    for (const k in this.held) this.held[k] = false; for (const k in this.pressed) this.pressed[k] = false; for (const k in this.released) this.released[k] = false;
    this.move.x = this.move.y = this.move.mag = 0; this.look.x = this.look.y = 0; this.rstick.x = this.rstick.y = 0; this.throttle = 0; this.brake = 0; this.steer = 0; this.digit = 0;
  },
  unblank() { if (this._hold) { Object.assign(this.held, this._hold); this._hold = null; } },
  update(dt) {
    // gamepad polling
    let gp = null;
    try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; if (this.padIndex >= 0 && pads[this.padIndex]) gp = pads[this.padIndex]; else for (const p of pads) if (p && p.connected) { gp = p; this.padIndex = p.index; this.detectPad(p); break; } } catch (e) { gp = null; }
    this.pad = gp;
    let ax = [0, 0, 0, 0];
    if (gp) {
      const dz = (x, y) => { const l = Math.hypot(x, y); if (l < 0.16) return [0, 0]; const s = Math.min(1, (l - 0.16) / 0.8) / l; return [x * s, y * s]; };
      const L = dz(gp.axes[0] || 0, gp.axes[1] || 0), Rr = dz(gp.axes[2] || 0, gp.axes[3] || 0); ax = [L[0], L[1], Rr[0], Rr[1]];
      let any = Math.abs(ax[0]) + Math.abs(ax[1]) + Math.abs(ax[2]) + Math.abs(ax[3]) > 0.1;
      for (let i = 0; i < gp.buttons.length; i++) if (gp.buttons[i] && gp.buttons[i].pressed) any = true;
      if (any) this.setDevice('pad');
    }
    const T = this.touch, C = this.ctx, fire = C.firearm;
    const H = this.held, P = this.prev;
    for (const a of ACTIONS) P[a] = H[a];
    const tb = n => !!T.btn[n] || !!T.tap[n];
    const m0 = this.mouseBtn[0] && !this.dragLook, m2 = this.mouseBtn[2];
    H.jump = this.k('Space') || this.pb(0) || tb('jump');
    H.punch = this.k('KeyJ') || (m0 && !fire) || this.pb(2) || tb('punch');
    H.kick = this.k('KeyF', 'KeyK') || this.pb(1) || tb('kick');
    H.action = this.k('KeyE') || this.pb(3) || tb('action');
    H.block = this.k('KeyL') || (m2 && !fire) || this.pb(4) || tb('block');
    H.dodge = this.k('KeyC') || this.pb(5) || tb('dodge');
    H.aim = (m2 && fire) || this.pv(6) > 0.35;
    // in a car RT is the throttle, so a gun fires with RB there (and with the left mouse button / the touch Tir button)
    H.fire = (m0 && (fire || C.carGun)) || (C.car ? C.carGun && this.pb(5) : this.pv(7) > 0.35) || tb('fire');
    // pad ▲ = reload; in multiplayer a tap still reloads (on release) and holding it sends « Ici ! » to the partners
    const dUp = this.pb(12); let padReload = dUp, padPing = false;
    if (dUp) this._dupT = (this._dupT || 0) + dt;
    if (MP.on) { padReload = !dUp && this._dupT > 0 && this._dupT < 0.35; padPing = dUp && this._dupT >= 0.35; }
    if (!dUp) this._dupT = 0;
    H.reload = this.k('KeyR') || padReload;
    H.next = this.pb(15) || tb('weapon');
    H.prev = this.pb(14);
    H.holster = this.k('KeyX');
    H.nade = this.k('KeyG') || (!C.car && this.pb(13)) || tb('nade');
    H.ping = this.k('KeyT') || tb('ping') || padPing; // multiplayer: « Ici ! » for the partners
    H.pause = this.k('Escape', 'KeyP') || this.pb(9) || tb('pause');
    H.map = this.k('KeyM', 'Semicolon', 'Tab') || this.pb(8) || tb('map');
    H.siren = this.k('KeyH') || this.pb(2) || tb('siren');
    H.handbrake = this.k('Space') || this.pb(0) || (this.pb(5) && !C.carGun) || tb('handbrake');
    H.lock = this.k('KeyQ') || this.mouseBtn[1] || !!this.midTap || this.pb(11) || tb('lock'); this.midTap = false;
    H.exit = this.k('KeyE') || this.pb(3) || tb('exit');
    // sprint: shift (kb), L3 toggle (pad), toggle button (touch)
    if (gp && this.pb(10) && !this._l3) this.sprintToggle = !this.sprintToggle; this._l3 = gp ? this.pb(10) : false;
    if (tb('sprint') && !this._ts) T.sprint = !T.sprint; this._ts = tb('sprint');
    // wheel -> weapon switch
    if (this.wheel > 0) { H.next = true; } else if (this.wheel < 0) { H.prev = true; }
    this.wheel = 0;
    for (let d = 1; d <= 6; d++) if (this.k('Digit' + d, 'Numpad' + d)) this.digit = d;
    for (const a of ACTIONS) { this.pressed[a] = !!H[a] && !P[a]; this.released[a] = !H[a] && !!P[a]; }
    // movement
    let mx = 0, my = 0;
    if (this.k('KeyW', 'ArrowUp')) my += 1; if (this.k('KeyS', 'ArrowDown')) my -= 1; if (this.k('KeyD', 'ArrowRight')) mx += 1; if (this.k('KeyA', 'ArrowLeft')) mx -= 1;
    const kbMove = mx || my; const kbl = Math.hypot(mx, my) || 1; mx /= kbl; my /= kbl;
    const walkKey = this.k('AltLeft', 'CapsLock');
    if (kbMove) { const s = walkKey ? 0.45 : 1; mx *= s; my *= s; }
    if (Math.abs(ax[0]) + Math.abs(ax[1]) > 0) { mx = ax[0]; my = -ax[1]; }
    if (T.joyId !== null) { mx = T.mx; my = T.my; }
    this.move.x = mx; this.move.y = my; this.move.mag = Math.min(1, Math.hypot(mx, my));
    H.sprint = this.k('ShiftLeft', 'ShiftRight') || (this.sprintToggle && this.move.mag > 0.2) || (T.sprint && this.move.mag > 0.2);
    if (this.move.mag < 0.15) this.sprintToggle = false;
    this.pressed.sprint = H.sprint && !P.sprint;
    // look
    const o = Save.data.options; const sens = o.sens || 1; const inv = o.invertY ? -1 : 1;
    let lx = this.mdx * 0.0024 * sens, ly = this.mdy * 0.0024 * sens * inv;
    lx += ax[2] * Math.abs(ax[2]) * 3.2 * sens * dt; ly += ax[3] * Math.abs(ax[3]) * 2.2 * sens * dt * inv;
    lx += T.ldx * 0.0065 * sens; ly += T.ldy * 0.0055 * sens * inv;
    this.look.x = lx; this.look.y = ly; this.mdx = this.mdy = 0; T.ldx = T.ldy = 0;
    this.lookActive = Math.abs(ax[2]) + Math.abs(ax[3]) > 0 || T.lookId !== null;
    this.rstick.x = ax[2]; this.rstick.y = ax[3];
    // car
    this.throttle = Math.max(this.k('KeyW', 'ArrowUp') ? 1 : 0, this.pv(7), tb('gas') ? 1 : 0);
    this.brake = Math.max(this.k('KeyS', 'ArrowDown') ? 1 : 0, this.pv(6), tb('brake') ? 1 : 0);
    this.steer = clamp((this.k('KeyD', 'ArrowRight') ? 1 : 0) - (this.k('KeyA', 'ArrowLeft') ? 1 : 0) + ax[0] + (T.joyId !== null ? T.mx : 0), -1, 1);
    // UI navigation edges (with repeat)
    const uiRaw = {
      up: this.k('ArrowUp', 'KeyW') || this.pb(12) || ax[1] < -0.55, down: this.k('ArrowDown', 'KeyS') || this.pb(13) || ax[1] > 0.55,
      left: this.k('ArrowLeft', 'KeyA') || this.pb(14) || ax[0] < -0.55, right: this.k('ArrowRight', 'KeyD') || this.pb(15) || ax[0] > 0.55,
      ok: this.k('Enter', 'NumpadEnter', 'Space') || this.pb(0), back: this.k('Escape', 'Backspace') || this.pb(1), start: this.pb(9)
    };
    for (const k in uiRaw) {
      const r = this.uiRepeat[k] || (this.uiRepeat[k] = { h: false, t: 0 });
      let fire2 = false;
      if (uiRaw[k] && !r.h) { fire2 = true; r.t = 0.38; }
      else if (uiRaw[k] && (k === 'up' || k === 'down' || k === 'left' || k === 'right')) { r.t -= dt; if (r.t <= 0) { fire2 = true; r.t = 0.11; } }
      r.h = uiRaw[k]; this.ui[k] = fire2;
    }
    for (const k in T.tap) T.tap[k] = false;
  },
  rumble(strong, weak, ms) {
    if (!Save.data.options.vibration) return;
    try { const p = this.pad; if (p && p.vibrationActuator && p.vibrationActuator.playEffect) p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => { }); } catch (e) { }
    if (this.device === 'touch') { try { if (navigator.vibrate) navigator.vibrate(Math.min(60, ms * 0.4)); } catch (e) { } }
  },
  keyLabel(code) {
    const special = { Space: 'Espace', ShiftLeft: 'Maj', Escape: 'Échap', Tab: 'Tab', Enter: 'Entrée' };
    if (special[code]) return special[code];
    if (this.layoutMap && this.layoutMap.get(code)) return this.layoutMap.get(code).toUpperCase();
    if (code.startsWith('Key')) { const l = code.slice(3); if (this.azerty) { const az = { W: 'Z', A: 'Q', Q: 'A', Z: 'W', M: ',' }; return az[l] || l; } return l; }
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  },
  moveKeys() { return this.azerty ? 'ZQSD' : 'WASD'; },
  // glyph html for an action on the active device
  glyph(action) { return this.glyphFor(this.device, action); },
  glyphFor(d, action) {
    if (d === 'pad') {
      const ps = this.padType === 'ps';
      const map = {
        jump: 0, punch: 2, kick: 1, action: 3, block: 4, dodge: 5, aim: 6, fire: 7, reload: 12, next: 15, prev: 14, nade: 13, pause: 9, map: 8, siren: 2, handbrake: 0, exit: 3, sprint: 10, gas: 7, brake: 6, lock: 11, carfire: 5
      };
      const i = map[action]; if (i === undefined) return '';
      const face = ps ? ['✕', '○', '□', '△'] : ['A', 'B', 'X', 'Y'];
      const names = ps ? { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'SHARE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: '▲', 13: '▼', 14: '◀', 15: '▶' } : { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'L3', 11: 'R3', 12: '▲', 13: '▼', 14: '◀', 15: '▶' };
      if (i <= 3) return `<span class="gp gp${i}${ps ? ' ps' : ''}">${face[i]}</span>`;
      return `<span class="gp gps">${names[i]}</span>`;
    }
    if (d === 'touch') {
      const lab = { jump: 'Saut', punch: 'Frapper', kick: 'Pied', action: 'Action', block: 'Parade', dodge: 'Roulade', fire: 'Tir', siren: 'Sirène', exit: 'Sortir', handbrake: 'Frein à main', gas: 'Accélérer', brake: 'Freiner', sprint: 'Sprint', map: 'Carte', next: 'Arme', lock: 'Cible', pause: 'Pause', reload: 'Recharge auto', carfire: 'Tir', nade: 'Grenade' };
      return `<span class="tg">${lab[action] || action}</span>`;
    }
    const f = this.ctx.firearm;
    const kb = { jump: 'Space', punch: f ? null : 'M0', fire: 'M0', aim: 'M2', block: f ? 'KeyL' : 'M2', kick: 'KeyF', action: 'KeyE', dodge: 'KeyC', reload: 'KeyR', holster: 'KeyX', pause: 'Escape', map: 'KeyM', siren: 'KeyH', handbrake: 'Space', exit: 'KeyE', sprint: 'ShiftLeft', next: 'WH', lock: 'KeyQ', carfire: 'M0', nade: 'KeyG' };
    const c = kb[action] || (action === 'punch' ? 'KeyJ' : null); if (!c) return '';
    if (c === 'M0') return '<kbd class="mouse">Clic G</kbd>'; if (c === 'M2') return '<kbd class="mouse">Clic D</kbd>'; if (c === 'WH') return '<kbd class="mouse">Molette</kbd>';
    return `<kbd>${this.keyLabel(c)}</kbd>`;
  }
};

