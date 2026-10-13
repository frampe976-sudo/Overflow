/* =====================================================================
   MENUS — title, dossiers, options, controls, pause, results, map
   (mouse, touch, keyboard and gamepad navigation)
   ===================================================================== */
const Menus = {
  cur: null, stack: [], items: [], fi: 0, selCase: -1, ctab: null,
  screens: ['scr-loading', 'scr-title', 'scr-missions', 'scr-multi', 'scr-options', 'scr-controls', 'scr-pause', 'scr-map', 'scr-result', 'scr-nogl', 'scr-destin'],
  init() {
    document.querySelectorAll('#menu-title .mi').forEach(b => b.addEventListener('click', () => this.titleAct(b.dataset.go)));
    document.querySelectorAll('#menu-pause .mi').forEach(b => b.addEventListener('click', () => this.pauseAct(b.dataset.go)));
    document.querySelectorAll('[data-act="back"]').forEach(b => b.addEventListener('click', () => this.back()));
    $('ctabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => this.renderControls(b.dataset.tab)));
    this.mpInit();
    $('destin-reset').addEventListener('click', () => { Destin.reset(); this.renderDestin(); });
    document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && this.cur) { const t = e.target.closest && e.target.closest('.mi,.case,.btn,.opt,.ctabs button'); if (t && this.items.indexOf(t) >= 0) this.focus(this.items.indexOf(t), true); } });
    this.updateDevices();
  },
  hideAll() { for (const s of this.screens) $(s).hidden = true; this.cur = null; this.stack = []; },
  // the logo always fits on one line, whatever font the device ended up with (offline: no web fonts)
  fitBrand() {
    for (const el of document.querySelectorAll('.brand')) {
      el.style.fontSize = ''; const box = el.parentElement; if (!box || !el.offsetParent) continue;
      const w = el.scrollWidth, max = box.clientWidth - 4;
      if (w > max && max > 50) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * max / w) + 'px';
    }
  },
  show(id, push = true) {
    if (push && this.cur && this.cur !== id) this.stack.push(this.cur);
    for (const s of this.screens) $(s).hidden = s !== id;
    this.cur = id;
    const root = $(id);
    if (id === 'scr-missions') this.renderMissions();
    if (id === 'scr-options') this.renderOptions();
    if (id === 'scr-controls') this.renderControls(this.ctab || (Input.device === 'touch' ? 'touch' : Input.device));
    if (id === 'scr-pause') this.renderPause();
    if (id === 'scr-destin') this.renderDestin();
    if (id === 'scr-multi') { this.collect(root); this.mpRender(); HUD.updateTouchVisibility(); return; }
    if (id === 'scr-title' || id === 'scr-pause') requestAnimationFrame(() => this.fitBrand());
    if (id === 'scr-title') { const t = $('train-sub'); if (t) t.textContent = Save.data.trained ? 'Terminé · à refaire quand vous voulez' : 'Toutes les actions, pas à pas'; this.renderContinue(); }
    if (id === 'scr-map') { requestAnimationFrame(() => HUD.openMap($('mapcv'))); $('map-sub').textContent = Input.device === 'pad' ? 'Stick gauche : se déplacer · gâchettes : zoom' : Input.device === 'touch' ? 'Glissez pour vous déplacer · pincez pour zoomer' : 'Glissez ou flèches pour vous déplacer · molette pour zoomer'; $('foot-map').innerHTML = `<button class="btn" id="btn-mapclose">Fermer</button><span>${Input.device === 'pad' ? Input.glyphFor('pad', 'kick') : Input.device === 'kbm' ? '<kbd>Échap</kbd> · <kbd>M</kbd>' : ''}</span>`; $('btn-mapclose').addEventListener('click', () => this.back()); }
    this.collect(root); this.focus(this.defaultFocus(id), true);
    HUD.updateTouchVisibility();
  },
  back() {
    Snd.play('back');
    if (this.cur === 'scr-multi') { this.mpBack(); return; }
    if (this.cur === 'scr-map' || this.cur === 'scr-pause') { if (Game.mode === 'pause' || Game.mode === 'map') { if (this.cur === 'scr-map' && this.stack[this.stack.length - 1] === 'scr-pause') { this.show(this.stack.pop(), false); return; } Game.resume(); return; } }
    const prev = this.stack.pop();
    if (prev) this.show(prev, false); else if (Game.mode === 'menu') this.show('scr-title', false);
    if (this.cur === 'scr-options' || prev === 'scr-options') Save.write();
  },
  collect(root) { this.items = Array.from(root.querySelectorAll('.mi, .case, .btn, .opt, .ctabs button')).filter(e => e.offsetParent !== null && !e.disabled); },
  defaultFocus(id) {
    if (id === 'scr-missions') return Math.max(0, this.items.findIndex(e => e.classList.contains('case') && +e.dataset.i === this.selCase));
    if (id === 'scr-title') return Math.max(0, this.items.findIndex(e => e.dataset.go === (Save.data.trained ? 'continue' : 'train')));
    return 0;
  },
  focus(i, silent) {
    if (!this.items.length) return; i = clamp(i, 0, this.items.length - 1);
    this.items.forEach(e => e.classList.remove('focus')); const el = this.items[i]; el.classList.add('focus'); this.fi = i;
    if (!silent) Snd.play('ui'); el.scrollIntoView && el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (el.classList.contains('case')) this.selectCase(+el.dataset.i);
  },
  move(dx, dy) {
    const cur = this.items[this.fi]; if (!cur) return;
    if (cur.classList.contains('opt') && dx) { this.optStep(cur, dx); return; }
    const a = cur.getBoundingClientRect(); const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = -1, bs = 1e9;
    this.items.forEach((e, k) => {
      if (k === this.fi) return; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const vx = x - ax, vy = y - ay; const along = dx ? vx * dx : vy * dy; if (along <= 4) return;
      const perp = dx ? Math.abs(vy) : Math.abs(vx); const s = along + perp * 2.5; if (s < bs) { bs = s; best = k; }
    });
    if (best >= 0) this.focus(best);
  },
  update(dt) {
    if (!this.cur || this.cur === 'scr-loading') return;
    const U = Input.ui;
    if (U.up) this.move(0, -1); if (U.down) this.move(0, 1); if (U.left) this.move(-1, 0); if (U.right) this.move(1, 0);
    if (U.ok) { const el = this.items[this.fi]; if (el) { if (el.classList.contains('opt')) this.optStep(el, 1, true); else { Snd.play('ok'); el.click(); } } }
    if (U.back) { if (this.cur === 'scr-title') { } else this.back(); }
    if (U.start && (this.cur === 'scr-pause' || this.cur === 'scr-map')) Game.resume();
    if (this.cur === 'scr-map') { HUD.mapUpdate(dt); if (Input.pressed.map) Game.resume(); }
  },
  updateDevices() {
    const box = $('devices'); if (!box) return; const pads = (navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []).length > 0;
    box.querySelectorAll('span').forEach(s => { const d = s.dataset.d; s.classList.toggle('on', d === Input.device || (d === 'pad' && pads) || (d === 'touch' && ('ontouchstart' in window))); });
  },
  /* ---------- title ---------- */
  // « Continuer l'histoire »: the first open case of the campaign
  renderContinue() {
    const n = Campaign.nextCase(), done = Campaign.progress(), sub = $('cont-sub'), cs = $('cases-sub'); if (!sub) return;
    $('cont-label').textContent = done ? 'Continuer l’histoire' : 'Commencer l’histoire';
    if (n) { const c = Campaign.chapterOf(n); sub.textContent = `Chapitre ${c ? c.n : ''} · ${n.title}`; }
    else sub.textContent = 'Histoire terminée · rejouez vos dossiers';
    if (cs) cs.textContent = `${done} / ${MISSIONS.length} dossiers classés`;
  },
  titleAct(go) {
    Snd.init(); Snd.resume();
    if (go === 'continue') { const n = Campaign.nextCase(); if (n) Game.startMission(n); else this.show('scr-missions'); }
    else if (go === 'train') Game.startMission(TRAINING);
    else if (go === 'missions') this.show('scr-missions');
    else if (go === 'patrol') Game.startMission(PATROL);
    else if (go === 'multi') this.mpOpen();
    else if (go === 'controls') this.show('scr-controls');
    else if (go === 'destin') this.show('scr-destin');
    else if (go === 'options') this.show('scr-options');
    else if (go === 'fullscreen') this.toggleFullscreen();
  },
  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => HUD.toast('Plein écran indisponible ici', '', 'bad', true)); }
      else document.exitFullscreen && document.exitFullscreen();
    } catch (e) { }
  },
  /* ---------- dossiers ---------- */
  // the training module is also the first file of the case board, so it can be found from « Dossiers » too
  caseList() { return [TRAINING].concat(MISSIONS, [PATROL]); },
  renderMissions() {
    { const r = rankOf(Save.data.xp), nx = RANKS[r + 1]; const e = $('missions-sub'); if (e) e.innerHTML = `Brigade de nuit · grade <b style="color:var(--sodium)">${RANKS[r][0]}</b>${nx ? ` · ${nx[1] - Save.data.xp} XP avant ${nx[0]}` : ' · grade maximal'}`; }
    const box = $('cases'); box.innerHTML = '';
    const all = this.caseList();
    // open on the case just played, or on the next case of the story
    if (this.lastCase && all.indexOf(this.lastCase) >= 0) { let m = this.lastCase; const k = MISSIONS.indexOf(m); if (k >= 0 && Campaign.done(m.id) && MISSIONS[k + 1]) m = MISSIONS[k + 1]; this.selCase = all.indexOf(m); this.lastCase = null; }
    if (this.selCase < 0 || this.selCase >= all.length) { const n = Campaign.nextCase(); this.selCase = !Save.data.trained ? 0 : n ? all.indexOf(n) : 1; }
    let chap = null;
    all.forEach((m, i) => {
      const c = Campaign.chapterOf(m);
      if (c && c !== chap) { chap = c; const h = document.createElement('div'); h.className = 'chap'; h.innerHTML = `<b>Chapitre ${c.n}</b>${c.title}<span>${c.ids.filter(id => Campaign.done(id)).length}/${c.ids.length}</span>`; box.appendChild(h); }
      if (!c && chap && !m.training) { chap = null; const h = document.createElement('div'); h.className = 'chap'; h.innerHTML = '<b>Hors série</b>'; box.appendChild(h); }
      const rec = Save.data.missions[m.id], locked = Campaign.locked(m); const b = document.createElement('button'); b.className = 'case' + (m.training ? ' case-train' : '') + (locked ? ' locked' : ''); b.dataset.i = i;
      const g = m.training ? (Save.data.trained ? '✓' : '') : rec && rec.grade ? rec.grade : '';
      b.innerHTML = `<span class="no">${m.no}</span><span class="t">${m.title}</span><span class="g">${g}</span><span class="d">${m.district}</span>`;
      b.addEventListener('click', () => { if (this.selCase === i && !locked && (Input.device !== 'touch' || this._armed === i)) Game.startMission(all[i]); else { this.selectCase(i); this._armed = i; this.focus(this.items.indexOf(b), true); } });
      box.appendChild(b);
    });
    this.selectCase(this.selCase);
    $('foot-missions').innerHTML = `<span>${Input.device === 'pad' ? Input.glyph('jump') : Input.device === 'touch' ? '' : '<kbd>Entrée</kbd>'} ${Input.device === 'touch' ? 'Touchez un dossier puis « Démarrer »' : 'démarrer'}</span><span>${Input.device === 'pad' ? Input.glyph('kick') : Input.device === 'touch' ? '' : '<kbd>Échap</kbd>'} ${Input.device === 'touch' ? '' : 'retour'}</span>`;
  },
  selectCase(i) {
    const all = this.caseList(); const m = all[i]; if (!m) return; this.selCase = i;
    const rec = Save.data.missions[m.id];
    const goals = m.patrol ? ['Répondre aux appels du PC Radio', 'Faire baisser la criminalité de la ville', 'Trouver les insignes cachés sur les toits'] : m.goals;
    const brief = m.patrol ? "Pas de dossier cette nuit : tu patrouilles en ville. Agressions, rixes, vols de voitures, cambrioleurs sur les toits… Le PC Radio t'envoie là où ça chauffe. Chaque affaire résolue fait baisser la criminalité." : m.brief;
    const locked = Campaign.locked(m), chap = Campaign.chapterOf(m), prev = MISSIONS[MISSIONS.indexOf(m) - 1];
    const body = locked ? `<p class="lock">Dossier verrouillé · terminez « ${prev ? prev.title : ''} » pour l’ouvrir</p>` : `<div class="from">Briefing · ${m.from || OKA}</div><p>${brief}</p><ul>${goals.map(g => `<li>${g}</li>`).join('')}</ul>`;
    $('brief').innerHTML = `<div class="brief-body">${chap ? `<div class="chap-l">Chapitre ${chap.n} · ${chap.title}</div>` : ''}<div class="no">${m.no}</div><h3>${m.title}</h3><div class="dist">${m.district}</div>${body}${rec && rec.grade ? `<div class="dist">Meilleure évaluation : <b style="color:var(--sodium)">${rec.grade}</b></div>` : ''}</div><div class="row-btns"><button class="btn primary" id="btn-start"${locked ? ' disabled' : ''}>Démarrer</button><button class="btn" data-act="back2">Retour</button></div>`;
    $('btn-start').addEventListener('click', () => { if (!Campaign.locked(m)) Game.startMission(m); });
    $('brief').querySelector('[data-act="back2"]').addEventListener('click', () => this.back());
    const keep = this.items[this.fi]; this.collect($('scr-missions')); const k = this.items.indexOf(keep); if (k >= 0) this.fi = k;
  },
  /* ---------- options ---------- */
  optDefs() {
    const o = Save.data.options;
    return [
      { k: 'diff', label: 'Difficulté', sub: 'Dégâts reçus, précision et nombre de tireurs ennemis', type: 'seg', vals: [['easy', 'Facile'], ['normal', 'Normal'], ['hard', 'Difficile']] },
      { k: 'quality', label: 'Qualité graphique', sub: 'Auto adapte la résolution en temps réel', type: 'seg', vals: [['auto', 'Auto'], ['low', 'Basse'], ['medium', 'Moyenne'], ['high', 'Haute']] },
      { k: 'sens', label: 'Sensibilité de la caméra', type: 'range', min: 0.3, max: 2.5, step: 0.1 },
      { k: 'invertY', label: 'Inverser l’axe vertical', type: 'bool' },
      { k: 'autoCam', label: 'Recentrage auto de la caméra', sub: 'Manette et tactile', type: 'bool' },
      { k: 'aimAssist', label: 'Aide à la visée', sub: 'Verrouillage doux sur la cible la plus proche', type: 'bool' },
      { k: 'dmgNums', label: 'Chiffres de dégâts', sub: 'Affiche les dégâts infligés au-dessus des suspects', type: 'bool' },
      { k: 'music', label: 'Volume de la musique', type: 'range', min: 0, max: 1, step: 0.05 },
      { k: 'sfx', label: 'Volume des effets', type: 'range', min: 0, max: 1, step: 0.05 },
      { k: 'amb', label: 'Volume de l’ambiance', sub: 'Pluie, vent, bruits de la ville', type: 'range', min: 0, max: 1, step: 0.05 },
      { k: 'vibration', label: 'Vibrations', type: 'bool' },
      { k: 'touchSize', label: 'Taille des boutons tactiles', type: 'seg', vals: [[0.85, 'Petits'], [1, 'Moyens'], [1.2, 'Grands']] },
      { k: 'showFps', label: 'Afficher les images par seconde', type: 'bool' }
    ];
  },
  renderOptions() {
    const box = $('opts'); box.innerHTML = ''; const o = Save.data.options;
    for (const d of this.optDefs()) {
      const row = document.createElement('div'); row.className = 'opt'; row.dataset.k = d.k; row.tabIndex = -1;
      let ctl = '';
      if (d.type === 'seg') ctl = `<div class="seg">${d.vals.map(([v, l]) => `<button data-v="${v}" class="${String(o[d.k]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
      else if (d.type === 'bool') ctl = `<div class="seg"><button data-v="1" class="${o[d.k] ? 'sel' : ''}">Oui</button><button data-v="0" class="${!o[d.k] ? 'sel' : ''}">Non</button></div>`;
      else ctl = `<div class="slider"><input type="range" id="opt-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${o[d.k]}"><span>${(+o[d.k]).toFixed(d.step < 0.1 ? 2 : 1)}</span></div>`;
      row.innerHTML = `<label>${d.label}${d.sub ? `<small>${d.sub}</small>` : ''}</label>${ctl}`;
      row.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { this.setOpt(d, b.dataset.v); }));
      const inp = row.querySelector('input'); if (inp) inp.addEventListener('input', () => this.setOpt(d, inp.value));
      box.appendChild(row);
    }
  },
  setOpt(d, v) {
    const o = Save.data.options;
    if (d.type === 'bool') o[d.k] = v === '1' || v === true; else if (d.type === 'range') o[d.k] = +v; else o[d.k] = isNaN(+v) || d.k === 'quality' ? v : +v;
    Save.write(); Snd.applyVolumes(); Game.applyQuality();
    const row = $('opts').querySelector(`[data-k="${d.k}"]`);
    if (row) { if (d.type === 'range') { row.querySelector('span').textContent = (+o[d.k]).toFixed(d.step < 0.1 ? 2 : 1); row.querySelector('input').value = o[d.k]; } else row.querySelectorAll('.seg button').forEach(b => b.classList.toggle('sel', d.type === 'bool' ? (b.dataset.v === '1') === !!o[d.k] : String(o[d.k]) === b.dataset.v)); }
    HUD.updateTouchVisibility();
  },
  optStep(row, dir, toggle) {
    const d = this.optDefs().find(x => x.k === row.dataset.k); const o = Save.data.options; if (!d) return;
    if (d.type === 'bool') this.setOpt(d, o[d.k] ? '0' : '1');
    else if (d.type === 'range') this.setOpt(d, clamp(+o[d.k] + dir * d.step, d.min, d.max));
    else { const i = d.vals.findIndex(v => String(v[0]) === String(o[d.k])); const n = (i + (toggle ? 1 : dir) + d.vals.length) % d.vals.length; this.setOpt(d, String(d.vals[n][0])); }
    Snd.play('ui');
  },
  /* ---------- Destin: talents and Destinies ---------- */
  renderDestin() {
    const free = Destin.free(), cur = Destin.destiny();
    $('destin-pts').textContent = `${free} point${free > 1 ? 's' : ''} à répartir · ${Destin.points()} au total (3 de plus à chaque grade)`;
    $('trees').innerHTML = TREES.map(T => `<div class="tree" style="--tc:${T.col}"><h3>${T.name}<b>${Destin.spent(T.id)}</b></h3>` + T.talents.map(t => {
      const r = Destin.rank(t.id), locked = Destin.spent(T.id) < (t.req || 0);
      return `<button class="btn tal${locked ? ' locked' : ''}${r >= 3 ? ' max' : ''}" data-tal="${t.id}"><span class="pips">${'●'.repeat(r)}${'○'.repeat(3 - r)}</span><b>${t.name}</b><small>${t.desc(Math.max(1, r))}${locked ? ` · ${t.req} points en ${T.name} requis` : ''}</small></button>`;
    }).join('') + '</div>').join('');
    $('dcards').innerHTML = DESTINIES.map(D => {
      const ok = Destin.unlocked(D), need = Object.keys(D.need).map(k => `${D.need[k]} ${TREES.find(T => T.id === k).name}`).join(' + ');
      return `<button class="btn dcard${D === cur ? ' sel' : ''}${ok ? '' : ' locked'}" data-dest="${D.id}"><b>${D.name}</b><small>${D.desc}${ok ? '' : ` · requis : ${need}`}</small></button>`;
    }).join('');
    const keep = this.items[this.fi], kt = keep && (keep.dataset.tal || keep.dataset.dest);
    $('trees').querySelectorAll('[data-tal]').forEach(b => b.addEventListener('click', () => { if (Destin.buy(b.dataset.tal)) Snd.play('ok'); else Snd.play('back'); this.renderDestin(); }));
    $('dcards').querySelectorAll('[data-dest]').forEach(b => b.addEventListener('click', () => { if (Destin.choose(b.dataset.dest)) Snd.play('ok'); else Snd.play('back'); this.renderDestin(); }));
    // re-rendering rebuilds the buttons: keep the focus on the one that was used
    this.collect($('scr-destin')); if (kt) { const i = this.items.findIndex(e => (e.dataset.tal || e.dataset.dest) === kt); if (i >= 0) this.focus(i, true); }
  },
  /* ---------- controls ---------- */
  renderControls(tab) {
    this.ctab = tab; $('ctabs').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.tab === tab));
    const mv = Input.moveKeys(); const k = c => `<kbd>${c}</kbd>`;
    const T = {
      kbm: [['À pied'], ['Se déplacer', k(mv)], ['Caméra', 'Souris (cliquez dans la vue)'], ['Sprint', k('Maj')], ['Sauter · s’agripper · escalader un grillage · franchir une voiture', k('Espace')], ['Roulade', k(Input.keyLabel('KeyC'))], ['Frapper (enchaînements)', '<kbd class="mouse">Clic G</kbd> ou ' + k(Input.keyLabel('KeyJ'))], ['Coup de pied', k(Input.keyLabel('KeyF'))], ['Parade · contre', '<kbd class="mouse">Clic D</kbd> ou ' + k(Input.keyLabel('KeyL'))], ['Combo à pause : marquez un temps entre deux coups', 'Frapper, attendre, Frapper'], ['Destin : Jugement, puis Dénouement', Input.glyphFate('kbm')], ['Interpeller · échelle · monter', k(Input.keyLabel('KeyE'))], ['Verrouiller une cible', k(Input.keyLabel('KeyQ')) + ' ou <kbd class="mouse">Clic molette</kbd>'], ['Changer de cible', 'Coup sec de souris'],
        ['Armes'], ['Viser', '<kbd class="mouse">Clic D</kbd>'], ['Tirer', '<kbd class="mouse">Clic G</kbd>'], ['Recharger', k(Input.keyLabel('KeyR'))], ['Changer d’arme', '<kbd class="mouse">Molette</kbd> · 1 à 6'], ['Ranger l’arme', k(Input.keyLabel('KeyX'))], ['Grenade : maintenir pour viser, relâcher pour lancer (appui bref : vers la cible)', k(Input.keyLabel('KeyG'))],
        ['En voiture'], ['Accélérer · freiner', k(Input.keyLabel('KeyW')) + ' ' + k(Input.keyLabel('KeyS'))], ['Tourner', k(Input.keyLabel('KeyA')) + ' ' + k(Input.keyLabel('KeyD'))], ['Frein à main', k('Espace')], ['Tirer par la fenêtre (visée assistée)', '<kbd class="mouse">Clic G</kbd>'], ['Gyrophare · klaxon', k(Input.keyLabel('KeyH'))], ['Sortir', k(Input.keyLabel('KeyE'))],
        ['Général'], ['Carte', k(Input.keyLabel('KeyM')) + ' ou ' + k('Tab')], ['Pause', k('Échap') + ' ou ' + k('P')],
        ['Brigade de nuit (multijoueur)'], ['Signaler « Ici ! »', k(Input.keyLabel('KeyT')) + ' : ce que vise la caméra (un ennemi, un endroit)'], ['Réparer un partenaire', k(Input.keyLabel('KeyE')) + ' près de lui quand il est à terre'], ['Monter en passager', k(Input.keyLabel('KeyE')) + ' près de sa voiture arrêtée · tir par la fenêtre']],
      pad: [['À pied'], ['Se déplacer · sprint', 'Stick gauche · ' + Input.glyphFor('pad', 'sprint')], ['Caméra', 'Stick droit'], ['Verrouiller · changer de cible', 'R3 · coup sec du stick droit'], ['Sauter · s’agripper · escalader un grillage · franchir une voiture', Input.glyphFor('pad', 'jump')], ['Frapper', Input.glyphFor('pad', 'punch')], ['Coup de pied', Input.glyphFor('pad', 'kick')], ['Interpeller · échelle · monter', Input.glyphFor('pad', 'action')], ['Parade · contre', Input.glyphFor('pad', 'block')], ['Roulade', Input.glyphFor('pad', 'dodge')], ['Destin : Jugement, puis Dénouement', Input.glyphFate('pad')],
        ['Armes'], ['Viser (verrouillage)', Input.glyphFor('pad', 'aim')], ['Tirer', Input.glyphFor('pad', 'fire')], ['Changer d’arme', '◀ ▶'], ['Recharger', '▲'], ['Grenade : maintenir pour viser, relâcher pour lancer', '▼'],
        ['En voiture'], ['Accélérer · freiner', Input.glyphFor('pad', 'gas') + ' · ' + Input.glyphFor('pad', 'brake')], ['Frein à main', Input.glyphFor('pad', 'handbrake')], ['Tirer par la fenêtre (visée assistée)', Input.glyphFor('pad', 'carfire')], ['Gyrophare · klaxon', Input.glyphFor('pad', 'siren')], ['Sortir', Input.glyphFor('pad', 'exit')],
        ['Général'], ['Carte', Input.glyphFor('pad', 'map')], ['Pause', Input.glyphFor('pad', 'pause')],
        ['Brigade de nuit (multijoueur)'], ['Signaler « Ici ! »', '▲ maintenu (un appui bref recharge toujours)'], ['Réparer un partenaire', Input.glyphFor('pad', 'action') + ' près de lui quand il est à terre'], ['Monter en passager', Input.glyphFor('pad', 'action') + ' près de sa voiture arrêtée']],
      touch: [['À pied'], ['Se déplacer', 'Joystick : touchez n’importe où à gauche'], ['Caméra', 'Glissez sur la moitié droite'], ['Sprint', 'Bouton Sprint (bascule)'], ['Frapper · Pied · Saut', 'Boutons ronds à droite · face à un grillage, Saut devient Escalader ; le long d’une voiture, Franchir'], ['Action', 'Interpeller, grimper, monter : l’étiquette change selon le contexte'], ['Parade · Roulade', 'Petits boutons à gauche du groupe'], ['Destin', 'Bouton étoile, quand la jauge violette est pleine'], ['Cible', 'Verrouille l’ennemi le plus proche, touchez encore pour passer au suivant puis relâcher'], ['Tir', 'Remplace Frapper et Pied quand une arme à feu est en main · visée assistée'], ['Arme', 'Bouton en haut à droite : touchez pour changer d’arme ; une arme vide est rangée toute seule'], ['Grenade', 'Maintenez pour viser (la trajectoire s’affiche, glissez à droite pour ajuster), relâchez pour lancer ; un appui bref lance vers la cible'],
        ['En voiture'], ['Direction', 'Joystick gauche'], ['Gaz · Frein · Dérapage', 'Boutons à droite'], ['Sirène · Sortir', 'Petits boutons'], ['Tir', 'Bouton rouge en bas à gauche, s’il vous reste une arme chargée'], ['Général'], ['Carte · Pause', 'En haut à droite'], ['Brigade de nuit (multijoueur)'], ['Signaler « Ici ! »', 'Bouton épingle en haut à droite'], ['Réparer un partenaire', 'Action près de lui quand il est à terre'], ['Monter en passager', 'Action près de sa voiture arrêtée']]
    };
    $('ctable').innerHTML = T[tab].map(r => r.length === 1 ? `<div class="cgroup">${r[0]}</div>` : `<div class="crow"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
    this.collect($('scr-controls')); const i = this.items.findIndex(e => e.dataset && e.dataset.tab === tab); if (i >= 0) this.focus(i, true);
  },
  /* ---------- pause ---------- */
  renderPause() {
    const S = Game.stats, M = Game.def;
    $('pause-sub').textContent = M ? `${M.no} · ${M.title}` : '';
    $('pstats').innerHTML = `Temps <b>${fmtTime(Game.mission ? Game.mission.t : 0)}</b><br>Interpellations <b>${S.arrests}</b><br>Suspects neutralisés <b>${S.kos}</b><br>Neutralisations létales <b>${S.kills}</b><br>Bavures <b>${S.civHurt}</b><br>Insignes <b>${Save.data.badges.length} / ${World.badges.length}</b><br><span style="color:var(--dim)">Grade ${RANKS[rankOf(Save.data.xp)][0]} · ${Save.data.xp} XP<br>Force ${Save.data.stats.force} · Endurance ${Save.data.stats.endurance} · Constitution ${Save.data.stats.constitution} · Adresse ${Save.data.stats.adresse}</span>`;
    const mp = MP.on && MP.state === 'play';
    const restart = document.querySelector('#menu-pause [data-go="restart"]'); restart.textContent = mp ? (MP.host ? 'Terminer la patrouille' : 'Quitter la partie') : Game.def && Game.def.patrol ? 'Terminer la patrouille' : Game.def && Game.def.training ? 'Tout recommencer' : 'Recommencer';
    const quit = document.querySelector('#menu-pause [data-go="quit"]'); quit.hidden = mp && !MP.host; quit.textContent = mp ? 'Fermer la partie' : 'Quitter la mission';
    if (mp) $('pause-sub').textContent = `Brigade de nuit · ${MP.host ? MP.count() : MP.roster.length} robots · la ville continue`;
    $('mi-skip').hidden = $('mi-retry').hidden = !(Game.def && Game.def.training);
  },
  pauseAct(go) {
    if (go === 'resume') Game.resume();
    else if (go === 'skip') { Game.resume(); if (Game.mission && Game.def && Game.def.training) Game.mission.next(); }
    else if (go === 'retry') { Game.resume(); if (Game.mission && Game.def && Game.def.restartStep) Game.def.restartStep(Game.mission, Game); }
    else if (go === 'restart') { if (MP.on && MP.state === 'play') { if (MP.host) MP.endGame(); else Game.toMenu(); } else if (Game.def && Game.def.patrol) Game.missionComplete(); else Game.startMission(Game.def); }
    else if (go === 'map') this.show('scr-map');
    else if (go === 'destin') this.show('scr-destin');
    else if (go === 'controls') this.show('scr-controls');
    else if (go === 'options') this.show('scr-options');
    else if (go === 'quit') Game.toMenu();
  },
  /* ---------- multiplayer room ---------- */
  mpView: 'choose',
  mpInit() {
    const nm = $('mp-name'); nm.value = Save.data.mpName || ''; nm.placeholder = 'Saline-17';
    nm.addEventListener('change', () => this.mpSaveName()); nm.addEventListener('keydown', e => { if (e.key === 'Enter') nm.blur(); });
    document.querySelectorAll('#mp-choose .mi').forEach(b => b.addEventListener('click', () => this.mpAct(b.dataset.mp)));
    $('mp-go').addEventListener('click', () => this.mpJoin());
    $('mp-scan').addEventListener('click', () => this.mpScan());
    $('mp-start').addEventListener('click', () => { if (MP.host) MP.startGame(); });
    $('mp-back').addEventListener('click', () => { Snd.play('back'); this.mpBack(); });
    $('mp-addr').addEventListener('keydown', e => { if (e.key === 'Enter') this.mpJoin(); });
  },
  mpOpen(view) { this.mpView = view || (MP.on ? 'lobby' : 'choose'); this.mpMsg(''); this.show('scr-multi'); },
  mpMsg(t, bad) { const m = $('mp-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); },
  mpSaveName() { const v = $('mp-name').value.trim().slice(0, 20); if (v !== (Save.data.mpName || '')) { Save.data.mpName = v; Save.write(); } },
  mpAct(go) {
    Snd.init(); Snd.resume(); this.mpSaveName();
    if (go === 'host') {
      if (!MP.isLauncher()) { this.mpMsg('Héberger demande la version PC d’OVERFLOW (OVERFLOW.exe). Sur cet appareil, choisissez Rejoindre une partie.', true); return; }
      this.mpMsg('Ouverture de la partie sur le réseau local…');
      MP.hostOpen().then(() => { this.mpView = 'lobby'; this.mpMsg('Si Windows le demande, autorisez OVERFLOW sur les réseaux privés.'); this.mpRender(); })
        .catch(e => { MP.close(); this.mpMsg('Impossible d’ouvrir la partie : ' + (e && e.message === 'lan' ? 'le réseau local est indisponible.' : 'le lanceur OVERFLOW ne répond pas.'), true); });
    } else if (go === 'join') { this.mpView = 'join'; this.mpRender(); this.mpFind(); }
  },
  mpJoin(addr) {
    this.mpSaveName(); addr = String(addr || $('mp-addr').value || ''); if (!addr.trim()) { this.mpMsg('Entrez l’adresse affichée sur l’écran de l’hôte.', true); return; }
    this.mpMsg('Connexion…');
    MP.join(addr).then(() => { this.mpView = 'lobby'; this.mpMsg(''); this.mpRender(); })
      .catch(() => { MP.close(); this.mpMsg('Aucune partie trouvée à cette adresse. Même réseau Wi-Fi ? La partie est-elle ouverte sur l’hôte ?', true); });
  },
  mpBack() {
    if (MP.on) { MP.close(); this.mpView = 'choose'; this.mpMsg(''); this.mpRender(); return; }
    if (this.mpView === 'join') { this.mpView = 'choose'; this._scanId = (this._scanId || 0) + 1; this.mpRender(); return; }
    const prev = this.stack.pop(); this.show(prev || 'scr-title', false);
  },
  mpRefresh() { if (this.cur === 'scr-multi') this.mpRender(); },
  mpLost(msg) { this.mpView = 'choose'; if (Game.mode === 'menu') { this.stack = []; this.show('scr-multi'); } this.mpMsg(msg, true); },
  // the page was opened from the host's QR code: straight to joining it
  mpAuto() { if (Game.mode !== 'menu' || MP.on) return; this.mpView = 'join'; this.show('scr-multi'); $('mp-addr').value = location.host; this.mpMsg('Partie trouvée sur ' + location.hostname + ' : choisissez votre indicatif puis Rejoindre.'); this.focus(this.items.indexOf($('mp-go')), true); },
  mpRender() {
    const v = MP.on ? 'lobby' : this.mpView;
    $('mp-choose').hidden = v !== 'choose'; $('mp-join').hidden = v !== 'join'; $('mp-lobby').hidden = v !== 'lobby';
    $('mp-name').disabled = MP.on; $('mp-name').parentElement.hidden = v === 'lobby'; // the call sign is set once in the room
    $('mp-host-sub').textContent = MP.isLauncher() ? 'Les autres robots rejoignent ce PC' : 'Version PC uniquement (OVERFLOW.exe)';
    $('mp-go').hidden = v !== 'join'; $('mp-scan').hidden = v !== 'join'; $('mp-start').hidden = !(MP.host && v === 'lobby');
    $('mp-back').textContent = MP.on ? (MP.host ? 'Fermer la partie' : 'Quitter') : 'Retour';
    if (v === 'join' && !$('mp-addr').value) $('mp-addr').value = MP.servedByHost() ? location.host : Save.data.mpLast ? Save.data.mpLast.replace(/:47818$/, '') : '';
    const qb = $('mp-qrbox'); qb.hidden = !(MP.host && v === 'lobby');
    if (!qb.hidden) {
      const url = MP.joinURL(); if (url !== this._qrU) { this._qrU = url; QR.draw($('mp-qr'), url, 6); }
      const others = (MP.addrs || []).slice(1, 4).map(a => a + ':' + (MP.port || 47818)); // other cards of this PC (if the first is not the Wi-Fi of the others)
      $('mp-url').innerHTML = esc(url.replace(/^http:\/\//, '').replace(/\/\?rejoindre$/, '')) + (others.length ? `<small>Autres adresses : ${others.map(esc).join(' · ')}</small>` : '');
    }
    if (v === 'lobby') {
      const L = MP.roster.length ? MP.roster : [{ slot: MP.slot, name: MP.myName() }];
      let h = '';
      for (let k = 0; k < 6; k++) {
        const r = L.find(x => x.slot === k), A = ROBOT_ACCENTS[k];
        h += r ? `<div class="mp-p" style="color:${A.css}"><i></i><span style="color:#e8ebf4">${esc(r.name)}</span><small>${k === 0 ? 'hôte' : ''}${k === MP.slot && MP.state !== 'joining' ? (k === 0 ? ' · ' : '') + 'vous' : ''}</small>${MP.host && k > 0 ? `<button class="btn mp-kick" data-kick="${k}" aria-label="Exclure ${esc(r.name)}">Exclure</button>` : ''}</div>` : `<div class="mp-p empty" style="color:${A.css}"><i></i><span>${A.n}</span><small>libre</small></div>`;
      }
      $('mp-roster').innerHTML = h;
      $('mp-roster').querySelectorAll('[data-kick]').forEach(btn => btn.addEventListener('click', () => { MP.relayCmd({ t: 'kick', id: +btn.dataset.kick, why: 'L’hôte vous a retiré de la partie.' }); Snd.play('back'); }));
      $('mp-wait').textContent = MP.host ? (L.length > 1 ? 'Tout le monde est là ? Lancez la patrouille. D’autres robots peuvent rejoindre en cours de route.' : 'En attente des autres robots… Ils peuvent aussi rejoindre une fois la patrouille lancée.') : MP.state === 'joining' ? 'Connexion à l’hôte…' : 'Connecté à ' + (MP.hostName || 'l’hôte') + '. En attente du lancement de la patrouille…';
      $('mp-sub').textContent = MP.host ? `Vous hébergez · ${L.length} / 6 robots` : `Brigade de ${MP.hostName || 'l’hôte'} · ${L.length} / 6 robots`;
    } else $('mp-sub').textContent = 'Multijoueur en réseau local · 2 à 6 robots · sans serveur';
    this.collect($('scr-multi')); if (this.items.length) this.focus(Math.min(this.fi || 0, this.items.length - 1), true);
  },
  // games on the network: a PC asks its launcher (UDP broadcast)
  mpFind() {
    const box = $('mp-found'); box.innerHTML = '';
    if (!MP.isLauncher()) return;
    fetch('/__mp/find').then(r => r.json()).then(j => {
      if (this.cur !== 'scr-multi' || this.mpView !== 'join' || MP.on) return;
      const G = (j.games || []).filter(g => !g.self);
      box.innerHTML = G.map(g => `<button class="btn" data-addr="${esc(g.ip)}:${+g.port || 47818}">${esc(g.name || 'Partie')}<small>${esc(g.ip)} · ${+g.players || 1}/${+g.max || 6} robots${g.state === 'play' ? ' · en patrouille' : ''}</small></button>`).join('');
      box.querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => this.mpJoin(b.dataset.addr)));
      this.collect($('scr-multi'));
      this.mpMsg(G.length ? 'Partie trouvée : choisissez-la pour rejoindre.' : 'Aucune partie trouvée pour l’instant. Entrez l’adresse affichée sur l’hôte, ou Rechercher.');
    }).catch(() => { });
  },
  // phone app or browser: look for a game on the network of the address typed, then the usual home networks
  async mpScan() {
    if (MP.isLauncher()) { this.mpFind(); return; }
    const typed = ($('mp-addr').value || '').trim(), m = typed.match(/^(\d+\.\d+\.\d+)\./), nets = [];
    if (m) nets.push(m[1]); for (const n of ['192.168.1', '192.168.0', '192.168.2', '192.168.43', '10.0.0', '192.168.178', '192.168.86', '172.20.10']) if (nets.indexOf(n) < 0) nets.push(n);
    this.mpMsg('Recherche sur le réseau…'); const box = $('mp-found'); box.innerHTML = ''; let found = 0; const t0 = performance.now(), id = this._scanId = (this._scanId || 0) + 1;
    for (const net of nets) {
      if (id !== this._scanId || this.cur !== 'scr-multi' || MP.on || performance.now() - t0 > 30000) break;
      const ips = []; for (let i = 1; i < 255; i++) ips.push(net + '.' + i);
      await this.mpProbe(ips, (ip, j) => { if (id !== this._scanId) return; found++; const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${esc(j.name || 'Partie')}<small>${esc(ip)} · ${+j.players || 1}/${+j.max || 6} robots</small>`; b.addEventListener('click', () => this.mpJoin(ip + ':' + (+j.port || 47818))); box.appendChild(b); this.collect($('scr-multi')); });
      if (found) break;
    }
    if (id === this._scanId) this.mpMsg(found ? 'Partie trouvée : choisissez-la pour rejoindre.' : 'Aucune partie trouvée. Entrez l’adresse affichée sur l’écran de l’hôte.', !found);
  },
  mpProbe(ips, onFound) {
    let i = 0;
    const run = async () => { while (i < ips.length) { const ip = ips[i++], ac = new AbortController(), to = setTimeout(() => ac.abort(), 1200); try { const r = await fetch(`http://${ip}:47818/__mp/info`, { signal: ac.signal, cache: 'no-store' }); const j = await r.json(); if (j && j.game === 'overflow' && j.host) onFound(ip, j); } catch (e) { } clearTimeout(to); } };
    return Promise.all(Array.from({ length: 48 }, run));
  },
  /* ---------- results ---------- */
  result(ok, title, sub, grade, rows, text, buttons, xp) {
    $('res-sub').textContent = sub; $('res-title').textContent = title; $('res-title').style.color = ok ? 'var(--sodium)' : 'var(--siren)';
    $('res-grade').textContent = grade || ''; $('res-grade').hidden = !grade;
    $('res-stats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
    const X = $('res-xp'); X.hidden = !xp;
    if (xp) { X.className = 'resxp' + (xp.up ? ' up' : ''); X.innerHTML = `<div class="rxrow"><span>${xp.up ? 'Nouveau grade · ' : 'Grade · '}<b>${xp.name}</b></span><span>+${xp.gained} XP</span></div><div class="bar"><i style="transform:scaleX(0)"></i></div><small>${xp.left > 0 ? xp.left + ' XP avant le grade suivant' : 'Grade maximal'}</small>`; requestAnimationFrame(() => setTimeout(() => { const i = X.querySelector('i'); if (i) i.style.transform = `scaleX(${clamp(xp.k, 0.02, 1)})`; }, 60)); }
    $('res-text').textContent = text || '';
    const bb = $('res-btns'); bb.innerHTML = '';
    buttons.forEach(([label, fn, primary]) => { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.addEventListener('click', fn); bb.appendChild(b); });
    this.stack = []; this.show('scr-result', false);
  }
};

