/* =====================================================================
   RÉCIT — la Cité engloutie : dialogues à choix, drapeaux, quêtes, codex
   · les PNJ du récit se tiennent dans la ville ; on leur parle avec Action
   · un dialogue est un arbre de nœuds ; chaque choix peut poser des drapeaux,
     ouvrir ou faire avancer une quête, changer l'approbation d'un personnage
   · tout est sauvegardé dans Save.data.story ; le contenu est dans 19e_recit_data.js
   ===================================================================== */
const STORY_NPCS = {};  // id → { name, title, app, col, at() → {x, z, yaw}, here(S) }
const DIALOGUES = {};   // id → { start(S) → id de nœud, nodes: { id: { t, who, do, opts: [...] } } }
const QUESTS = {};      // id → { title, kind: 'main' | 'side', xp, steps: { id: { text, tag, where(S, rt), start(rt, S), update(rt, S, dt) } } }
const CODEX = {};       // id → { title, cat, text }
const STORY_FOLK = {};  // id → nom affiché, pour la jauge d'approbation
// a requirement on the Destin build, shown on the choice as a coloured tag
const NEED_TREE = { might: ['Puissance', '#ff5a4e'], finesse: ['Finesse', '#3ee08f'], sorcery: ['Sorcellerie', '#6aa8ff'] };

const Story = {
  rt: {}, npcs: {}, its: {},
  /* ---------- save data ---------- */
  data() {
    const d = Save.data; if (!d.story || typeof d.story !== 'object') d.story = {};
    const s = d.story;
    if (!s.flags || typeof s.flags !== 'object') s.flags = {};
    if (!s.quests || typeof s.quests !== 'object') s.quests = {};
    if (!Array.isArray(s.codex)) s.codex = [];
    if (!s.approval || typeof s.approval !== 'object') s.approval = {};
    return s;
  },
  flag(k) { return this.data().flags[k]; },
  set(k, v = true) { this.data().flags[k] = v; Save.write(); },
  q(id) { return this.data().quests[id] || null; },
  active(id) { const q = this.q(id); return !!q && q.state === 'active'; },
  done(id) { const q = this.q(id); return !!q && q.state === 'done'; },
  step(id) { const q = this.q(id); return q && q.state === 'active' ? q.step : null; },
  approval(who) { return this.data().approval[who] | 0; },
  // a notice: in the dialogue box while talking (the HUD is hidden then), else a HUD toast
  note(title, sub, cls, quiet) { if (Talk.on) Talk.note(title, sub, cls); else HUD.toast(title, sub, cls, quiet); },
  // something to show once the dialogue is closed (a chapter title)
  later(fn) { if (Talk.on) (this._later = this._later || []).push(fn); else fn(); },
  /* ---------- quests ---------- */
  start(id, step) {
    const Q = QUESTS[id]; if (!Q || this.q(id)) return;
    this.data().quests[id] = { state: 'active', step: step || Object.keys(Q.steps)[0], t: Date.now() };
    this.data().track = id; Save.write();
    this.note('Nouvelle quête', Q.title, 'gold'); Snd.play('objective');
    this.enter(id);
  },
  advance(id, step) {
    const q = this.q(id); if (!q || q.state !== 'active' || q.step === step) return;
    this.leave(id); q.step = step; this.data().track = id; Save.write(); // the quest that just moved is the one followed
    this.note('Journal mis à jour', QUESTS[id].title, ''); Snd.play('objective', null, 0.6);
    this.enter(id);
  },
  finish(id) {
    const q = this.q(id), Q = QUESTS[id]; if (!q || q.state !== 'active') return;
    this.leave(id); q.state = 'done'; q.step = null;
    const S = this.data(); if (S.track === id) S.track = null;
    this.note('Quête terminée', Q.title, 'gold', true); Snd.play('perfect', null, 0.5);
    if (Q.xp) this.xp(Q.xp); Save.write(); this.sync();
  },
  // a step can need things in the world (foes, items): they are (re)made when the step starts, and on every load
  enter(id) {
    const q = this.q(id), Q = QUESTS[id]; if (!q || !Q || !Game.player || !Game.def || !Game.def.story) return;
    this.leave(id, true);
    const st = Q.steps[q.step], rt = this.rt[id] = { t: 0, foes: [], picks: [] };
    if (st && st.start) st.start(rt, this);
    this.sync();
  },
  // a step ends: its items go; when it starts over (the robot was carried back), its foes go too
  leave(id, wipe) { const rt = this.rt[id]; if (rt) { for (const p of rt.picks) if (p.alive) p.alive = false; if (wipe) for (const a of rt.foes) a.removed = true; } delete this.rt[id]; },
  tracked() {
    const S = this.data();
    if (S.track && this.active(S.track)) return S.track;
    const act = Object.keys(S.quests).filter(k => this.active(k) && QUESTS[k]);
    act.sort((a, b) => (QUESTS[a].kind === 'main' ? 0 : 1) - (QUESTS[b].kind === 'main' ? 0 : 1));
    return act[0] || null;
  },
  /* ---------- consequences ---------- */
  approve(who, n) {
    const S = this.data(); S.approval[who] = clamp((S.approval[who] | 0) + n, -100, 100); Save.write();
    this.note(`${STORY_FOLK[who] || who} ${n > 0 ? 'approuve' : 'désapprouve'}`, `${n > 0 ? '+' : ''}${n}`, n > 0 ? 'gold' : 'bad');
  },
  codex(id) {
    const S = this.data(); if (!CODEX[id] || S.codex.indexOf(id) >= 0) return;
    S.codex.push(id); Save.write(); this.note('Codex', CODEX[id].title, '');
  },
  xp(n) {
    const r0 = rankOf(Save.data.xp); Save.data.xp += n; const r1 = rankOf(Save.data.xp); Save.write();
    this.note(`+${n} d’expérience`, r1 > r0 ? `Rang ${RANKS[r1][0]} · +3 points de Destin` : '', r1 > r0 ? 'gold' : '');
    if (r1 > r0) { Destin.refresh(); Snd.play('perfect', null, 0.8); }
  },
  // a Destin requirement on a choice: { might: 2 } → at least 2 points spent in Puissance
  meets(need) { if (!need) return true; if (typeof need === 'function') return !!need(this); for (const k in need) if (Destin.spent(k) < need[k]) return false; return true; },
  /* ---------- the people of the story ---------- */
  // spawn the NPCs who are here now (flags decide who), remove those who are gone
  sync() {
    if (!Game.def || !Game.def.story || !Game.player) return;
    for (const id in STORY_NPCS) {
      const N = STORY_NPCS[id], here = !N.here || N.here(this), a = this.npcs[id];
      if (here && (!a || a.removed)) this.spawn(id);
      else if (here && a && !Talk.on) { const p = N.at(), P = Game.player; if (dist2D(p.x, p.z, a.home.x, a.home.z) > 4 && dist2D(P.pos.x, P.pos.z, a.pos.x, a.pos.z) > 40 && dist2D(P.pos.x, P.pos.z, p.x, p.z) > 40) { this.drop(id); this.spawn(id); } }
      else if (!here && a) this.drop(id);
    }
  },
  drop(id) { const a = this.npcs[id]; if (a) a.removed = true; delete this.npcs[id]; const it = this.its[id]; if (it) { it.active = false; Game.interactables = Game.interactables.filter(x => x !== it); } delete this.its[id]; },
  spawn(id) {
    const N = STORY_NPCS[id], p = N.at();
    const a = Kit.civ(N.app, p.x, p.z, { label: N.name, yaw: p.yaw || 0, hp: 9999, mode: 'script' });
    Object.defineProperty(a, 'hittable', { get: () => false }); // the people of the story never get hurt
    a.storyId = id; a.faceYaw = p.yaw || 0; a.home = { x: a.pos.x, z: a.pos.z, yaw: p.yaw || 0 };
    this.npcs[id] = a;
    const it = { pos: new V3(a.pos.x, a.pos.y, a.pos.z), text: 'Parler · ' + N.name, r: 2.4, active: true, story: id, use: () => Talk.open(id) };
    Game.interactables.push(it); this.its[id] = it;
    return a;
  },
  // what an NPC has for the robot right now: '!' a quest to give, '?' a quest step to close, '' just talk
  mark(id) { const D = DIALOGUES[id]; return D && D.mark ? D.mark(this) || '' : ''; },
  /* ---------- the story mode ---------- */
  play() {
    Story.patch(); Game.startMission(RECIT);
  },
  // the robot dies: no « mission failed » in the story, it is carried back to the guard house
  patch() {
    if (Game._recitPatched) return; Game._recitPatched = true;
    const failed = Game.missionFailed;
    Game.missionFailed = function (why) { if (this.def && this.def.story && this.mode === 'play') return Story.respawn(); return failed.call(this, why); };
  },
  respawn() {
    const P = Game.player; if (!P || P._respawning) return; P._respawning = true; Game.fade(true);
    setTimeout(() => {
      P._respawning = false; if (Game.player !== P) return;
      P.alive = true; P.dead = false; P.inWater = false; P.hp = P.maxHp; P.setState('move');
      const f = World.spots.policeFront, s = World.safeSpot(f.x, f.z + 3, P.r);
      P.pos.set(s.x, s.y, s.z); P.vel.set(0, 0, 0); P.yaw = 0; P.setLock && P.setLock(null); CamCtl.reset(0);
      for (const id in this.rt) this.enter(id); // the fight of the current step starts over
      this.note('Anselme vous a ramené au Corps de garde', 'Votre cœur de sel bat encore', 'bad'); Game.fade(false);
    }, 600);
  },
  begin(M) {
    this.rt = {}; this.npcs = {}; this.its = {}; this.data();
    M.objLabel = 'Récit';
    this.sync();
    for (const id in this.data().quests) if (this.active(id)) this.enter(id);
    if (!this.q('eveil')) this.start('eveil');
  },
  update(M, dt) {
    const P = Game.player;
    if ((this._syncT = (this._syncT || 0) - dt) <= 0) { this._syncT = 1; this.sync(); }
    // quests: the step in progress watches the world
    for (const id in this.rt) {
      const q = this.q(id); if (!q || q.state !== 'active') continue;
      const st = QUESTS[id].steps[q.step], rt = this.rt[id]; rt.t += dt;
      if (st && st.update) st.update(rt, this, dt);
    }
    // the NPCs: turn toward the robot when it comes near, the talk prompt follows them
    for (const id in this.npcs) {
      const a = this.npcs[id]; if (a.removed) continue; const it = this.its[id];
      if (it) it.pos.set(a.pos.x, a.pos.y, a.pos.z);
      const d = dist2D(a.pos.x, a.pos.z, P.pos.x, P.pos.z);
      a.faceYaw = d < 7 ? angleTo(a.pos.x, a.pos.z, P.pos.x, P.pos.z) : a.home.yaw;
    }
    // objective of the tracked quest
    const id = this.tracked();
    if (id) {
      const q = this.q(id), Q = QUESTS[id], st = Q.steps[q.step], rt = this.rt[id] || {};
      M.objLabel = Q.kind === 'main' ? Q.title : 'Quête · ' + Q.title;
      M.objective = typeof st.text === 'function' ? st.text(this, rt) : st.text;
      M.marker = st.where ? () => st.where(this, rt) : null; M.markerTag = st.tag || '';
    } else { M.objLabel = 'Récit'; M.objective = 'Explorez Port-Saline et parlez à ses habitants'; M.marker = null; }
  },
  where(id) { const a = this.npcs[id]; return a && !a.removed ? a.pos : null; },
  // the name tags over the people of the story (drawn with the HUD markers, only while playing)
  render() {
    const box = this._tags || (this._tags = document.getElementById('story-tags')); if (!box) return;
    const P = Game.player, p = this._p || (this._p = {}); const seen = {};
    for (const id in this.npcs) {
      const a = this.npcs[id]; if (a.removed) continue;
      const d = dist3(a.pos, P.pos), mk = this.mark(id); if (d > (mk ? 45 : 14)) continue;
      if (!Cam.project(a.pos.x, a.pos.y + 2.25, a.pos.z, p)) continue;
      let el = box.querySelector(`[data-n="${id}"]`);
      if (!el) { el = document.createElement('div'); el.className = 'stag'; el.dataset.n = id; el.innerHTML = '<i></i><b></b><small></small>'; box.appendChild(el); }
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      const N = STORY_NPCS[id]; el.children[0].textContent = mk; el.children[0].hidden = !mk; el.children[1].textContent = N.name; el.children[2].textContent = d < 14 ? N.title || '' : '';
      el.style.opacity = d < 14 ? 1 : 0.75; seen[id] = 1;
    }
    for (const el of Array.from(box.children)) if (!seen[el.dataset.n]) el.remove();
  },
  clearTags() { const box = document.getElementById('story-tags'); if (box) box.innerHTML = ''; }
};

// the story mode: the whole city, no traffic (a medieval town), a light drizzle; one endless stage driven by the quests
const RECIT = {
  id: 'recit', no: 'Récit · Port-Saline', title: 'La Cité engloutie', district: 'Port-Saline', story: true,
  start: { x: 0, z: -85, yaw: 0 }, traffic: 0, parked: 0, civs: 22, weather: 'drizzle',
  setup(M) { Story.begin(M); },
  stages: [{ update(M, G, dt) { Story.update(M, dt); return false; } }],
  render() { Story.render(); }
};

/* =====================================================================
   TALK — the dialogue screen
   ===================================================================== */
const Talk = {
  on: false, id: null, D: null, node: null, nid: null, page: 0, shown: 0, full: '', opts: [], sel: 0, t: 0,
  open(id) {
    const D = DIALOGUES[id], a = Story.npcs[id], P = Game.player; if (!D || !a || Game.mode !== 'play') return false;
    this.on = true; this.id = id; this.D = D; this.npc = a;
    Game.mode = 'talk'; HUD.show(false); Story.clearTags(); Input.releaseLock();
    P.vel.set(0, 0, 0); P.blocking = false; P.yaw = angleTo(P.pos.x, P.pos.z, a.pos.x, a.pos.z); a.yaw = a.faceYaw = angleTo(a.pos.x, a.pos.z, P.pos.x, P.pos.z);
    this.frame();
    const N = STORY_NPCS[id]; this.$name.textContent = N.name; this.$name.style.color = N.col || '#e9d8a6'; this.$title.textContent = N.title || '';
    this.$root.hidden = false; this.goto(typeof D.start === 'function' ? D.start(Story) : D.start || 'start');
    Snd.play('ui'); return true;
  },
  // over-the-shoulder shot: from behind the robot, looking at the face of the one it talks to
  frame() {
    const P = Game.player, a = this.npc; if (!P || !a) return;
    const dx = a.pos.x - P.pos.x, dz = a.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, rx = -uz, rz = ux;
    const hy = a.pos.y + 1.5 * (a.app && a.app.scale || 1);
    const cx = P.pos.x - ux * 2.1 - rx * 1.15, cz = P.pos.z - uz * 2.1 - rz * 1.15, cy = Math.max(P.pos.y + 1.95, World.groundAt(cx, cz, 0.2, P.pos.y + 3) + 0.5);
    // the face sits in the upper half of the view, above the dialogue box; a warm light on it
    CamCtl.override = [cx, cy, cz, a.pos.x - rx * 0.3, hy - 0.42, a.pos.z - rz * 0.3, 42];
    Lights.add(a.pos.x - ux * 1.2 - rx * 0.6, hy + 0.5, a.pos.z - uz * 1.2 - rz * 0.6, 0.55, 0.45, 0.32, 6, 0.2, 'talk');
  },
  goto(nid) {
    if (!nid) { this.close(); return; }
    const n = this.D.nodes[nid]; if (!n) { console.error('Récit : nœud inconnu', this.id, nid); this.close(); return; }
    this.nid = nid; this.node = n; this.page = 0;
    if (n.do) n.do(Story);
    Story.sync();
    if (n.goto) { this.goto(typeof n.goto === 'function' ? n.goto(Story) : n.goto); return; } // a pure redirect: no text
    this.show();
  },
  pages() { const n = this.node, t = typeof n.t === 'function' ? n.t(Story) : n.t; return Array.isArray(t) ? t : [t]; },
  show() {
    const pg = this.pages(), txt = pg[this.page] || '', who = this.node.who;
    this.$who.textContent = who || ''; this.$who.hidden = !who;
    this.full = txt; this.shown = 0; this.t = 0; this.$text.textContent = ''; this.$text.classList.toggle('narr', who === '');
    // last page: the choices of the node; before that, « Continuer »
    const last = this.page >= pg.length - 1;
    this.opts = last ? (this.node.opts || (this.node.next ? [{ t: 'Continuer', go: this.node.next }] : [{ t: '(Partir)' }])).filter(o => !o.if || o.if(Story)).filter(o => !o.once || !Story.flag(o.once)) : [{ t: 'Continuer', cont: true }];
    if (!this.opts.length) this.opts = [{ t: '(Partir)' }];
    this.sel = 0; this.$opts.innerHTML = ''; this.$opts.classList.remove('on');
    this.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'tk-opt'; const ok = Story.meets(o.need); o.locked = !ok;
      if (o.locked) b.classList.add('locked'); if (o.cont) b.classList.add('cont'); if (!o.go && !o.cont && !o.do) b.classList.add('leave');
      let tag = '';
      if (o.need && typeof o.need === 'object') for (const k in o.need) { const T = NEED_TREE[k]; tag += `<span class="tk-tag" style="--c:${T[1]}">${T[0]} ${o.need[k]}</span>`; }
      if (o.tag) tag += `<span class="tk-tag" style="--c:${o.tagCol || '#e9c46a'}">${o.tag}</span>`;
      b.innerHTML = `<em>${i + 1}</em>${tag}<span>${o.t}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); if (this.shown < this.full.length) { this.skip(); return; } this.choose(i); });
      b.addEventListener('pointerenter', () => { this.sel = i; this.paintSel(); });
      this.$opts.appendChild(b);
    });
    this.paintSel();
  },
  paintSel() { Array.from(this.$opts.children).forEach((b, i) => b.classList.toggle('sel', i === this.sel)); },
  skip() { this.shown = this.full.length; this.$text.textContent = this.full; this.$opts.classList.add('on'); },
  choose(i) {
    const o = this.opts[i]; if (!o || !this.on) return;
    if (o.locked) { Snd.play('back'); HUD.toast('Destin insuffisant', 'Investissez des points dans cet arbre', 'bad'); return; }
    Snd.play('ok');
    if (o.cont) { this.page++; this.show(); return; }
    if (o.once) Story.set(o.once);
    if (o.do) o.do(Story);
    const go = typeof o.go === 'function' ? o.go(Story) : o.go;
    if (!this.on) return; // a choice may close the talk itself (a fight starts)
    if (go) this.goto(go); else this.close();
  },
  note(title, sub, cls) {
    const d = document.createElement('div'); d.className = 'tk-note ' + (cls || ''); d.innerHTML = `${title}${sub ? ` <small>${sub}</small>` : ''}`;
    this.$notes.appendChild(d); while (this.$notes.children.length > 4) this.$notes.firstChild.remove(); setTimeout(() => d.remove(), 3600);
  },
  close() {
    if (!this.on) return; this.on = false; this.$root.hidden = true; CamCtl.override = null; this.$notes.innerHTML = '';
    const P = Game.player; Game.mode = 'play'; HUD.show(true); Input.digit = 0;
    if (P) CamCtl.reset(P.yaw); if (Input.device === 'kbm') Input.requestLock();
    Story.sync(); Save.write();
    const L = Story._later; Story._later = null; if (L) for (const f of L) f();
  },
  // runs on its own animation frame while the dialogue is open (the game loop only ticks 'play')
  tick(raw) {
    if (!this.on) return;
    const U = Input.ui; this.t += raw;
    // the text writes itself; a press shows it all
    if (this.shown < this.full.length) { this.shown = Math.min(this.full.length, this.shown + raw * 70); this.$text.textContent = this.full.slice(0, Math.floor(this.shown)); if (this.shown >= this.full.length) this.$opts.classList.add('on'); }
    if (U.up) { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; this.paintSel(); Snd.play('ui'); }
    if (U.down) { this.sel = (this.sel + 1) % this.opts.length; this.paintSel(); Snd.play('ui'); }
    if (U.ok || this._key === 'ok') { if (this.shown < this.full.length) this.skip(); else this.choose(this.sel); }
    else if (typeof this._key === 'number') { if (this.shown < this.full.length) this.skip(); else this.choose(this._key); }
    else if (U.back) this.close();
    this._key = null;
    if (!this.on) return;
    // the world holds its breath; the two speakers keep breathing
    Input.blank();
    try { const P = Game.player; P.update(raw); this.npc.update(raw); } catch (e) { console.error(e); }
    Input.unblank();
    this.frame(); Env.update(raw); Game.renderScene(raw);
  },
  init() {
    const root = document.createElement('div'); root.id = 'talk'; root.hidden = true;
    root.innerHTML = '<div class="tk-notes" id="tk-notes"></div><div class="tk-box"><div class="tk-head"><b id="tk-name"></b><span id="tk-title"></span></div><div class="tk-who" id="tk-who"></div><div class="tk-text" id="tk-text"></div><div class="tk-opts" id="tk-opts"></div></div>';
    document.body.appendChild(root);
    this.$root = root; this.$name = root.querySelector('#tk-name'); this.$title = root.querySelector('#tk-title'); this.$who = root.querySelector('#tk-who'); this.$text = root.querySelector('#tk-text'); this.$opts = root.querySelector('#tk-opts'); this.$notes = root.querySelector('#tk-notes');
    root.addEventListener('click', () => { if (this.on && this.shown < this.full.length) this.skip(); });
    window.addEventListener('keydown', e => {
      if (!this.on || e.repeat) return;
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code); if (m) { this._key = +m[1] - 1; e.preventDefault(); return; }
      if (e.code === 'KeyE') this._key = 'ok';
    });
    let last = 0;
    const loop = now => { requestAnimationFrame(loop); const raw = Math.min(0.05, Math.max(0.0005, (now - last) / 1000 || 0.016)); last = now; if (this.on && !Game.hold) { try { this.tick(raw); } catch (e) { console.error(e); this.close(); } } };
    requestAnimationFrame(loop);
  }
};

/* =====================================================================
   JOURNAL — quests, codex, relations (pause menu, or N while playing)
   ===================================================================== */
const Journal = {
  tab: 'quests',
  open() {
    if (Game.mode === 'play') { Game.mode = 'pause'; Input.releaseLock(); Snd.silenceLoops(); HUD.show(false); Menus.show('scr-journal', false); }
    else Menus.show('scr-journal');
  },
  render() {
    const S = Story.data(), box = $('jbody'); if (!box) return;
    document.querySelectorAll('#jtabs .btn').forEach(b => b.classList.toggle('sel', b.dataset.tab === this.tab));
    let h = '';
    if (this.tab === 'quests') {
      const ids = Object.keys(S.quests).filter(k => QUESTS[k]);
      const act = ids.filter(k => S.quests[k].state === 'active'), done = ids.filter(k => S.quests[k].state === 'done');
      if (!ids.length) h += '<p class="jempty">Aucune quête. Lancez « La Cité engloutie » depuis le menu principal.</p>';
      const row = (k, on) => { const Q = QUESTS[k], q = S.quests[k], st = on ? Q.steps[q.step] : null, txt = st ? (typeof st.text === 'function' ? st.text(Story, Story.rt[k] || {}) : st.text) : ''; return `<div class="jq ${on ? '' : 'done'} ${Q.kind}"><b>${Q.title}</b><small>${Q.kind === 'main' ? 'Quête principale' : 'Quête secondaire'}${on ? '' : ' · terminée'}</small>${on ? `<p>${txt}</p>` : Q.sum ? `<p>${Q.sum(Story)}</p>` : ''}</div>`; };
      if (act.length) h += '<div class="dhead">En cours</div>' + act.map(k => row(k, true)).join('');
      if (done.length) h += '<div class="dhead">Terminées</div>' + done.map(k => row(k, false)).join('');
    } else if (this.tab === 'codex') {
      const cats = {}; for (const id of S.codex) { const C = CODEX[id]; if (C) (cats[C.cat] = cats[C.cat] || []).push(C); }
      const n = Object.keys(CODEX).length; h += `<div class="dhead">${S.codex.length} / ${n} entrées</div>`;
      if (!S.codex.length) h += '<p class="jempty">Parlez aux habitants pour remplir le codex.</p>';
      for (const c in cats) h += `<div class="dhead">${c}</div>` + cats[c].map(C => `<div class="jq codex"><b>${C.title}</b><p>${C.text}</p></div>`).join('');
    } else {
      for (const who in STORY_FOLK) {
        const v = Story.approval(who), met = Story.flag('met_' + who);
        if (!met) continue;
        const word = v >= 40 ? 'Amitié' : v >= 15 ? 'Bienveillance' : v > -15 ? 'Neutre' : v > -40 ? 'Méfiance' : 'Hostilité';
        h += `<div class="jq rel"><b>${STORY_FOLK[who]}</b><small>${word} · ${v > 0 ? '+' : ''}${v}</small><div class="jbar"><i style="left:${50 + Math.min(0, v) / 2}%;width:${Math.abs(v) / 2}%;background:${v >= 0 ? '#e9c46a' : '#ff5a4e'}"></i></div></div>`;
      }
      if (!h) h = '<p class="jempty">Personne ne vous connaît encore.</p>';
    }
    box.innerHTML = h;
  },
  init() {
    const scr = document.createElement('div'); scr.className = 'screen scrim-full'; scr.id = 'scr-journal'; scr.hidden = true;
    scr.innerHTML = `<div class="wrap"><h2 class="sh">Journal</h2><div class="sub" id="jsub">La Cité engloutie</div>
      <div class="row-btns" id="jtabs"><button class="btn" data-tab="quests">Quêtes</button><button class="btn" data-tab="codex">Codex</button><button class="btn" data-tab="rel">Relations</button></div>
      <div class="dscroll" id="jbody"></div>
      <div class="row-btns" style="margin-top:14px"><button class="btn" data-act="back">Retour</button></div></div>`;
    document.body.appendChild(scr);
    scr.querySelectorAll('#jtabs .btn').forEach(b => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
    Menus.screens.push('scr-journal');
    // render when shown; « back » from a journal opened while playing goes back to the game
    const show0 = Menus.show, back0 = Menus.back;
    Menus.show = function (id, push) { if (id === 'scr-journal') Journal.render(); return show0.call(this, id, push); };
    Menus.back = function () { if (this.cur === 'scr-journal' && !this.stack.length && Game.mode === 'pause') { Snd.play('back'); Game.resume(); return; } return back0.call(this); };
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyN' || (e.target && e.target.tagName === 'INPUT')) return;
      if (Game.mode === 'play' && Game.def && Game.def.story) this.open();
      else if (Menus.cur === 'scr-journal' && Game.mode === 'pause') Menus.back();
    });
  }
};

/* ---------- medieval names of the districts (display only) ----------
   The district names stay the keys of the ambience, the map and the campaign (08b, 05, 17, 18b);
   only what the player reads is renamed: the area banner and the labels of the map. */
const MEDIEVAL_NAMES = {
  'Commissariat central': 'Corps de garde', 'Commissariat': 'Corps de garde', 'Vieille ville': 'Vieille Cité', 'Marché de nuit': 'Marché aux Sels',
  'Place de la Marée': 'Place des Lanternes', 'Centre': 'Cœur de Saline', 'Les Entrepôts': 'Les Greniers', 'Les Docks': 'Quai des Grues', 'Docks': 'Quai des Grues', 'Vieux phare': 'Phare noir',
  'Zone industrielle': 'Faubourg des Tanneurs', 'Dépôt pétrolier': 'Les Huileries', 'Gare de triage': 'Relais des Diligences', 'Gare centrale': 'Grand Relais',
  'Centrale électrique': 'Moulins de la Marée', 'Les Arcades': 'Halles couvertes', 'Caserne des pompiers': 'Tour du Guet-Feu', 'Parc municipal': 'Jardin des Pendus',
  'Hôtel de ville': 'Hôtel des Échevins', 'Cité financière': 'Quartier des Changeurs', 'Boulevard des Néons': 'Rue des Lanternes de sel', 'Cimetière de l’Ouest': 'Cimetière des Noyés',
  'Cité des Tilleuls': 'Clos des Tilleuls', 'Stade de la Marée': 'Lices de la Marée', 'Marché aux puces': 'Foire aux Hardes', 'Hôpital Saint-Roch': 'Hospice Saint-Roch',
  'Université': 'Collège des Lampistes', 'Port de plaisance': 'Port des Barques', 'Chantier naval': 'Ventre de la Baleine', 'Gare maritime': 'Embarcadère royal'
};
const medievalName = n => MEDIEVAL_NAMES[n] || n;

/* ---------- the doors into the story: title menu, pause menu ---------- */
(function recitInit() {
  const css = document.createElement('style');
  css.textContent = `
#talk { position: fixed; inset: 0; z-index: 18; pointer-events: none; display: flex; align-items: flex-end; justify-content: center; background: linear-gradient(180deg, rgba(3,4,8,0.55), transparent 16%, transparent 52%, rgba(3,4,8,0.82)); }
#talk[hidden] { display: none; }
#talk .tk-box { pointer-events: auto; width: min(860px, calc(100vw - 32px)); margin: 0 16px calc(18px + var(--safe-b)); padding: 16px 20px 14px; background: linear-gradient(180deg, rgba(14,13,18,0.94), rgba(8,8,12,0.96)); border: 1px solid rgba(233,196,106,0.35); border-top: 2px solid rgba(233,196,106,0.7); border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif; }
#talk .tk-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
#talk #tk-name { font-family: var(--f-display); font-size: 26px; letter-spacing: 0.04em; text-transform: uppercase; }
#talk #tk-title { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
#talk .tk-who { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #8fe3ff; margin-bottom: 2px; }
#talk .tk-who[hidden] { display: none; }
#talk .tk-text { font-size: 21px; line-height: 1.38; color: #f1e9d8; min-height: 3.2em; white-space: pre-wrap; }
#talk .tk-text.narr { font-style: italic; color: #c9c1b0; }
#talk .tk-opts { display: flex; flex-direction: column; gap: 3px; margin-top: 10px; opacity: 0; transition: opacity 0.15s; }
#talk .tk-opts.on { opacity: 1; }
#talk .tk-opt { display: flex; align-items: baseline; gap: 8px; text-align: left; background: transparent; border: 0; border-left: 2px solid transparent; padding: 5px 10px; font-family: var(--f-ui); font-size: 17px; color: #d8d2c4; cursor: pointer; border-radius: 3px; }
#talk .tk-opt em { font-style: normal; font-family: var(--f-mono); font-size: 12px; color: #e9c46a; min-width: 1em; }
#talk .tk-opt.sel { background: rgba(233,196,106,0.12); border-left-color: #e9c46a; color: #fff; }
#talk .tk-opt.leave span { color: var(--muted); }
#talk .tk-opt.cont span { color: #e9c46a; }
#talk .tk-opt.locked { opacity: 0.45; }
#talk .tk-notes { position: absolute; right: calc(16px + var(--safe-r)); top: calc(16px + var(--safe-t)); display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
#talk .tk-note { font-family: var(--f-display); font-size: 17px; letter-spacing: 0.04em; text-transform: uppercase; padding: 6px 12px; background: rgba(8,8,12,0.88); border-left: 3px solid #8b93aa; border-radius: 3px; animation: tkin 0.25s ease-out; }
#talk .tk-note small { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--muted); margin-left: 6px; }
#talk .tk-note.gold { border-left-color: #e9c46a; color: #ffe2a0; } #talk .tk-note.bad { border-left-color: #ff5a4e; color: #ffb4ab; }
@keyframes tkin { from { opacity: 0; transform: translateX(14px); } }
#talk .tk-tag { flex: none; font-family: var(--f-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 1px 6px; border-radius: 3px; border: 1px solid var(--c); color: var(--c); }
@media (max-height: 600px) { #talk .tk-box { padding: 10px 16px 8px; margin-bottom: 8px; } #talk .tk-text { font-size: 18px; min-height: 2.4em; } #talk .tk-opt { font-size: 15px; padding: 3px 10px; } #talk #tk-name { font-size: 21px; } #talk .tk-opts { margin-top: 6px; gap: 1px; } }
@media (max-width: 720px) { #talk .tk-text { font-size: 18px; } #talk .tk-opt { font-size: 15.5px; padding: 6px 8px; } #talk #tk-name { font-size: 21px; } }
#story-tags { position: fixed; inset: 0; pointer-events: none; z-index: 4; }
#story-tags .stag { position: absolute; left: 0; top: 0; text-align: center; white-space: nowrap; text-shadow: 0 1px 3px #000, 0 0 8px #000; }
#story-tags .stag i { display: block; font-style: normal; font-family: var(--f-display); font-weight: 900; font-size: 30px; color: #ffcf5a; line-height: 1; animation: pulse 1.2s infinite; }
#story-tags .stag i[hidden] { display: none; }
#story-tags .stag b { display: block; font-family: var(--f-display); font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: #f3e6c4; }
#story-tags .stag small { display: block; font-family: var(--f-mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #b9b0a0; }
body:not(.story-on) #story-tags { display: none; }
#jtabs { margin-bottom: 10px; } #jtabs .btn.sel { border-color: #e9c46a; background: rgba(233,196,106,0.14); }
#jbody { max-width: 860px; }
#jbody .jq { border: 1px solid var(--line); border-radius: 5px; padding: 9px 12px; margin-bottom: 6px; background: rgba(255,255,255,0.03); }
#jbody .jq b { font-family: var(--f-display); font-size: 18px; letter-spacing: 0.03em; text-transform: uppercase; }
#jbody .jq.main b { color: #e9c46a; } #jbody .jq.done { opacity: 0.6; }
#jbody .jq small { display: block; font-family: var(--f-mono); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
#jbody .jq p { margin: 5px 0 0; font-size: 15px; color: #d7d3ca; line-height: 1.4; }
#jbody .jempty { color: var(--muted); }
#jbody .jbar { position: relative; height: 6px; margin-top: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; }
#jbody .jbar::after { content: ""; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: var(--line-2); }
#jbody .jbar i { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
`;
  document.head.appendChild(css);
  const font = document.createElement('link'); font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap'; document.head.appendChild(font);
  const tags = document.createElement('div'); tags.id = 'story-tags'; document.body.appendChild(tags);
  // title menu: the story, right under « Continuer »
  const cont = document.querySelector('#menu-title [data-go="continue"]');
  if (cont) {
    const b = document.createElement('button'); b.className = 'mi'; b.dataset.go = 'recit'; b.id = 'mi-recit';
    b.innerHTML = 'La Cité engloutie<small id="recit-sub">Récit · parlez aux habitants, faites vos choix</small>';
    cont.after(b); b.addEventListener('click', () => { Snd.init(); Snd.resume(); Story.play(); });
  }
  const pd = document.querySelector('#menu-pause [data-go="destin"]');
  if (pd) { const b = document.createElement('button'); b.className = 'mi'; b.dataset.go = 'journal'; b.textContent = 'Journal'; pd.after(b); b.addEventListener('click', () => Journal.open()); }
  Talk.init(); Journal.init();
  // district names: the banner shown when entering an area, and the labels of the map once built
  const area = document.getElementById('area');
  if (area) new MutationObserver(() => { const t = medievalName(area.textContent); if (t !== area.textContent) area.textContent = t; }).observe(area, { childList: true, characterData: true, subtree: true });
  const build0 = HUD.buildMap; HUD.buildMap = function () { const r = build0.apply(this, arguments); if (this.mapLabels) for (const l of this.mapLabels) l.t = medievalName(l.t); return r; };
  // the name tags only exist while the story is played
  setInterval(() => document.body.classList.toggle('story-on', !!(Game.def && Game.def.story && Game.mode === 'play')), 250);
  queueMicrotask(() => { if (window.__OF) Object.assign(window.__OF, { MEDIEVAL_NAMES, Story, Talk, Journal, RECIT, QUESTS, DIALOGUES, STORY_NPCS, CODEX }); });
})();
