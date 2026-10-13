/* =====================================================================
   FAUNE — le bestiaire du Débordement : bêtes paisibles qui fuient, prédateurs qui chassent.
   Chaque bête est un Actor du jeu (physique, coups, parade, verrouillage de cible restent ceux
   d'Overflow) avec son propre squelette procédural, son IA et ses dépouilles.
   ===================================================================== */

// attaques des bêtes (ajoutées à la table des attaques du jeu ; mêmes règles : télégraphe, parade, esquive)
Object.assign(ATK, {
  fx_bite: { clip: 'bite', dur: 0.72, hit: 0.4, range: 1.55, dmg: 10, knock: 2.5, lunge: 4.6, snd: 'flesh', poise: 14, tele: 0.2 },
  fx_pounce: { clip: 'pounce', dur: 1.05, hit: 0.56, hitEnd: 0.74, range: 1.9, dmg: 15, knock: 6, leap: 0.34, leapV: 10, snd: 'heavy', poise: 30, kd: 0.5, tele: 0.32 },
  fx_claw: { clip: 'claw', dur: 1.0, hit: 0.56, range: 2.1, dmg: 15, knock: 5, lunge: 2.2, snd: 'heavy', poise: 26, tele: 0.3, arc: 1.2 },
  fx_crush: { clip: 'crush', dur: 1.45, hit: 0.88, range: 2.7, dmg: 24, knock: 8, lunge: 1.2, snd: 'slam', poise: 60, kd: 0.8, tele: 0.45, arc: 1.5 },
  fx_sbite: { clip: 'bite', dur: 0.62, hit: 0.32, range: 1.6, dmg: 8, knock: 2, lunge: 4, snd: 'flesh', poise: 10, tele: 0.18, venom: 1 },
  fx_leap: { clip: 'pounce', dur: 1.0, hit: 0.5, hitEnd: 0.68, range: 1.9, dmg: 13, knock: 5, leap: 0.3, leapV: 12, snd: 'heavy', poise: 24, kd: 0.4, tele: 0.3, venom: 1 },
  fx_gswing: { clip: 'swing', dur: 1.35, hit: 0.78, range: 3.2, dmg: 26, knock: 8, lunge: 2, snd: 'heavy', poise: 70, kd: 0.6, tele: 0.42, arc: 1.6 },
  fx_gslam: { clip: 'slam', dur: 1.8, hit: 1.08, range: 5, dmg: 30, knock: 10, lunge: 0, snd: 'slam', poise: 90, kd: 1, tele: 0.6, aoe: true, arc: 3.2 },
  fx_cast: { clip: 'cast', dur: 0.9, hit: 0.55, range: 0, dmg: 0, knock: 0, snd: 'magic', poise: 0, tele: 0.45, cast: true }
});

const FAUNA = {
  cerf: {
    name: 'Cerf d’opale', css: '#9fd8ff', hp: 60, r: 0.55, h: 1.8, poise: 25, walk: 1.3, run: 9, accel: 14, turn: 6, stride: 1.9, sight: 26, shy: 13, roam: 12,
    drops: [['bois_opale', 1, 1, 0.6], ['cuir_opale', 1, 2, 1]], xp: 30, cry: 'bugle',
    codex: {
      latin: 'Cervus opalinus', danger: 'aucune', habitat: 'Parc municipal, cimetière, grandes pelouses. En hardes de deux ou trois.',
      behave: 'Broute la mousse d’écume, la tête basse. Au moindre bruit de course, il brame et détale. Ses bois luisent d’un bleu laiteux.',
      tip: 'Approchez en marchant : il vous laisse venir bien plus près.',
      lore: 'Avant le Débordement, on chassait le cerf pour sa viande. Depuis, ses bois ont poussé en pierre de lune, et les chasseurs se méfient : on dit qu’il porte chance à qui l’épargne.',
      hint: 'Il broute dans les parcs.'
    }
  },
  lievre: {
    name: 'Lièvre-lune', css: '#e8ecff', hp: 14, r: 0.22, h: 0.45, poise: 8, walk: 1.2, run: 8.5, accel: 30, turn: 10, stride: 1.2, sight: 18, shy: 8, roam: 8,
    drops: [['patte_lievre', 1, 1, 1]], xp: 10, cry: 'chirp',
    codex: {
      latin: 'Lepus selenae', danger: 'aucune', habitat: 'Partout : pelouses, ruelles, cours d’immeubles.',
      behave: 'Un petit lièvre au pelage d’argent dont la pointe des oreilles luit. Il bondit en zigzag dès qu’on l’approche.',
      lore: 'Les marins disent que le lièvre-lune est tombé de la lune un soir de grande marée et qu’il cherche encore le chemin du retour.',
      hint: 'Un petit bond argenté, n’importe où.'
    }
  },
  corbeau: {
    name: 'Corbeau-spectre', css: '#a6ffcf', ambient: true, drops: [['plume_spectre', 1, 1, 1]],
    codex: {
      latin: 'Corvus umbrosus', danger: 'aucune', habitat: 'Pelouses, trottoirs, toits : il se pose par petites bandes.',
      behave: 'Picore en silence, les yeux verts allumés. Il s’envole en croassant quand on s’approche ou qu’un coup de feu claque, et laisse parfois tomber une plume.',
      lore: 'Il suit les morts. Quand une bande se pose dans une rue, les habitants des enclaves ferment leurs volets.',
      hint: 'De petites silhouettes noires posées au sol.'
    }
  },
  loup: {
    name: 'Loup de brume', css: '#b9c6dc', hostile: true, hp: 70, r: 0.48, h: 1.05, poise: 28, walk: 1.6, run: 7.6, accel: 22, turn: 9, stride: 1.6, sight: 30, aggro: 22, leash: 70, ring: 4, roam: 10,
    style: 'pack', atk: ['fx_bite', 'fx_pounce'], drops: [['croc_brume', 1, 2, 0.8], ['fourrure_brume', 1, 1, 0.7]], xp: 60, cry: 'howl',
    codex: {
      latin: 'Canis nebulosus', danger: 'moyenne (en meute)', habitat: 'Parcs, cimetière, grandes avenues la nuit. Toujours en meute de deux à quatre.',
      behave: 'La meute encercle sa proie à distance, puis un loup mord pendant que les autres tournent. Le bond se voit venir : il se ramasse avant de sauter.',
      tip: 'Parez la morsure pour riposter. Esquivez le bond sur le côté.',
      lore: 'Ce n’étaient que des chiens errants. La brume de la marée les a pris, et ils ont oublié qu’ils avaient eu des maîtres.',
      hint: 'On entend leur hurlement dans les parcs.'
    }
  },
  tisseuse: {
    name: 'Tisseuse des ruines', css: '#c79bff', hostile: true, hp: 85, r: 0.62, h: 0.95, poise: 24, walk: 2.2, run: 6.6, accel: 26, turn: 10, stride: 1.3, sight: 24, aggro: 16, leash: 55, ring: 5, roam: 8,
    style: 'leaper', atk: ['fx_sbite', 'fx_leap'], drops: [['soie', 1, 3, 1], ['venin', 1, 1, 0.6]], xp: 70, cry: 'hiss',
    codex: {
      latin: 'Arachne ruinarum', danger: 'moyenne (venin)', habitat: 'Ruelles, entrepôts, cours d’immeubles éventrés.',
      behave: 'Une araignée grande comme un chien, aux runes violettes sur l’abdomen. Elle tourne autour de sa proie, bondit de loin et mord. Sa morsure empoisonne.',
      tip: 'Le venin ronge la vie pendant quelques secondes. Bloquez la morsure : le poison ne passe pas.',
      lore: 'Les runes de son dos ne sont pas des marques naturelles. Quelqu’un, quelque part, les a écrites.',
      hint: 'Dans les ruelles et les entrepôts.'
    }
  },
  follet: {
    name: 'Feu follet', css: '#8ff0ff', hostile: true, fly: true, hover: 1.0, hp: 32, r: 0.32, h: 1.2, poise: 12, walk: 2, run: 4.5, accel: 10, turn: 6, stride: 1, sight: 28, aggro: 20, leash: 50, ring: 9, roam: 12,
    style: 'caster', atk: ['fx_cast'], drops: [['essence_follette', 1, 2, 1]], xp: 50, cry: 'chime',
    codex: {
      latin: 'Ignis fatuus', danger: 'faible (à distance)', habitat: 'Partout la nuit, surtout près de l’eau et des tombes.',
      behave: 'Une flamme froide qui flotte à hauteur d’homme. Elle garde ses distances, lance des orbes qui vous suivent, et se dérobe d’un bond quand on l’approche.',
      tip: 'Un orbe se pare : il revient alors sur le follet et l’étourdit. Fragile au corps à corps.',
      lore: 'Les voyageurs perdus suivent les feux follets en croyant voir une lanterne. On ne retrouve que la lanterne.',
      hint: 'Une lueur bleue qui flotte la nuit.'
    }
  },
  crabe: {
    name: 'Crabe-gouffre', css: '#e07a4f', hostile: true, hp: 170, r: 0.95, h: 1.0, poise: 55, armor: true, dmgMul: 0.65, walk: 1.2, run: 3.2, accel: 8, turn: 3.5, stride: 1.4, sight: 18, aggro: 12, leash: 40, ring: 0, roam: 8, getup: 1.1,
    style: 'brute', atk: ['fx_claw', 'fx_crush'], drops: [['chitine', 2, 3, 1], ['pince', 1, 1, 0.45]], xp: 110, cry: 'clack',
    codex: {
      latin: 'Cancer abyssi', danger: 'élevée', habitat: 'Quais, docks, plage, port de plaisance : il sort de l’eau la nuit.',
      behave: 'Lent, cuirassé, il encaisse les coups sans broncher. Il pince à courte portée puis abat ses deux pinces d’un coup qui renverse.',
      tip: 'Sa carapace absorbe une partie des coups. Tournez autour : il pivote lentement.',
      lore: 'Les pêcheurs le remontaient parfois dans leurs filets, petit comme une main. Ceux qui sortent aujourd’hui de la marée font la taille d’une barque.',
      hint: 'Au bord de l’eau, la nuit.'
    }
  },
  golem: {
    name: 'Golem de corail', css: '#ff8a7a', hostile: true, boss: true, hp: 620, r: 1.05, h: 3.3, poise: 130, armor: true, dmgMul: 0.8, walk: 1.2, run: 2.6, accel: 6, turn: 2.6, stride: 2.2, sight: 26, aggro: 18, leash: 50, ring: 0, roam: 10, getup: 1.6,
    style: 'brute', atk: ['fx_gswing', 'fx_gslam'], drops: [['coeur_corail', 1, 1, 1], ['chitine', 2, 4, 1]], xp: 600, cry: 'rumble',
    codex: {
      latin: 'Colossus corallii', danger: 'extrême', habitat: 'Rare. Il remonte de la mer jusqu’aux quais, à la plage ou au port.',
      behave: 'Un colosse de pierre et de corail qui balaie tout d’un revers, puis frappe le sol des deux poings : l’onde de choc renverse tout autour de lui.',
      tip: 'Restez hors de portée pendant le coup au sol, frappez juste après.',
      lore: 'Les prêtres de la Marée disent que les golems sont les gardiens de la ville engloutie, montés à la surface pour réclamer ce qui leur a été pris.',
      hint: 'Rare : une silhouette immense sur les quais.'
    }
  }
};

/* ---------------- la bête ---------------- */
class Creature extends Actor {
  constructor(type, x, z, o = {}) {
    const T = FAUNA[type];
    super({ kind: 'beast', team: T.hostile ? 'beast' : 'faune', appObj: { scale: 1, parts: [], props: [], creature: true, kind: type }, x, z, yaw: o.yaw !== undefined ? o.yaw : R(0, TAU), hp: T.hp });
    this.an = null; this.creature = true; this.T = T; this.type = type; this.hostile = !!T.hostile; this.boss = !!T.boss;
    this.r = T.r; this.h = T.h; this.poiseMax = T.poise || 30; this.superArmor = !!T.armor; this.dmgMul = T.dmgMul || 1; this.lethalOnly = true;
    this.tags.noArrest = true; this.tags.noDrop = true; this.getupDur = T.getup || 0.7; this.koTime = 1;
    this.home = { x, z }; this.ai = 'idle'; this.aiT = R(0.5, 3); this.gait = R(0, 1); this.speedNow = 0; this.atkCd = R(0.6, 1.6);
    this.wx = x; this.wz = z; this.sees = false; this.percT = R(0, 0.25); this.alerted = false; this.deadT = 0; this.pack = o.pack || null;
    this.graze = 0; this.stuckT = 0; this.orbit = chance(0.5) ? 1 : -1; this.blinkCd = 0; this.lastSnd = 0;
    this.releaseToken = () => Combat.release(this);
    if (T.fly) { this.noGravity = true; this.pos.y += T.hover; this.grounded = false; }
  }
  get hittable() { return this.alive && !this.removed; }
  update(dt) {
    if (this.state === 'dead') {
      this.deadT += dt; this.friction(dt, 4); if (this.T.fly) this.vel.y -= 9 * dt;
      this.physics(dt);
      if (this.deadT > 2.4 && !this._dis) { this._dis = true; NSnd.play('dissolve', this.pos, 0.7); }
      if (this.deadT > 2.4) { const c = FAUNA[this.type].css, k = parseInt(c.slice(1), 16); for (let i = 0; i < 2; i++) FX.P(this.pos.x + R(-this.r, this.r), this.pos.y + R(0.1, 0.6), this.pos.z + R(-this.r, this.r), { vy: R(0.6, 1.6), life: R(0.6, 1.2), size: R(0.05, 0.12), r: ((k >> 16) & 255) / 128, g: ((k >> 8) & 255) / 128, b: (k & 255) / 128, cell: 0, drag: 1 }); }
      if (this.deadT > 3.3) this.removed = true;
      return;
    }
    this.blinkCd -= dt; this.atkCd -= dt;
    if (this.T.fly && (this.state === 'down' || this.state === 'getup') && this.st > 0.9) this.setState('move'); // un follet renversé ne touche jamais le sol
    if (this.updateCommon(dt)) { this.hover(dt); this.physics(dt); this.speedNow = Math.hypot(this.vel.x, this.vel.z); this.gait += this.speedNow * dt / this.T.stride; return; }
    const P = Game.player;
    if ((this.percT -= dt) <= 0) {
      this.percT = 0.25;
      const d = P ? dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z) : 1e9;
      this.sees = !!P && P.alive && !P.hidden && P.state !== 'car' && d < this.T.sight && Math.abs(P.pos.y - this.pos.y) < 6 && World.los(this.pos, P.pos, this.T.fly ? 0.4 : 0.7, 1.2);
    }
    if (this.hostile) this.thinkHostile(dt, P); else this.thinkShy(dt, P);
    this.hover(dt);
    this.physics(dt);
    this.speedNow = Math.hypot(this.vel.x, this.vel.z); this.gait += this.speedNow * dt / this.T.stride;
    // bloqué contre un mur : on change de cap
    if (this.nContacts > 0 && this.speedNow < 0.6 && this.want > 1) { this.stuckT += dt; if (this.stuckT > 0.6) { this.stuckT = 0; this.orbit = -this.orbit; this.newWander(); } } else this.stuckT = 0;
  }
  hover(dt) { if (!this.T.fly) return; const g = World.groundAt(this.pos.x, this.pos.z, this.r, this.pos.y + 0.5), ty = g + this.T.hover + Math.sin(this.t * 2.1 + this.seed * 9) * 0.25; this.vel.y = damp(this.vel.y, (ty - this.pos.y) * 3, 6, dt); this.groundY = g; }
  // vers un point, en évitant l'eau ; tête dans le sens de la marche ou vers une cible
  goTo(tx, tz, speed, dt, faceX, faceZ) {
    let dx = tx - this.pos.x, dz = tz - this.pos.z; const L = Math.hypot(dx, dz); this.want = speed;
    if (L < 0.25) { this.steer(0, 0, 0, this.T.accel, dt); this.want = 0; }
    else {
      dx /= L; dz /= L;
      const ax = this.pos.x + dx * 2, az = this.pos.z + dz * 2;
      if (!World.onLand(ax, az) || az > WATER_Z - 1) { const t = dx; dx = -dz * this.orbit; dz = t * this.orbit; }
      this.steer(dx, dz, Math.min(speed, L * 3 + 0.4), this.T.accel, dt);
    }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (faceX !== undefined) this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, faceX, faceZ), this.T.turn, dt);
    else if (sp > 0.3) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), this.T.turn, dt);
    return L;
  }
  newWander() {
    for (let k = 0; k < 6; k++) {
      const a = R(0, TAU), r = R(2, this.T.roam), x = this.home.x + Math.sin(a) * r, z = this.home.z + Math.cos(a) * r;
      if (this.T.fly ? World.onLand(x, z) && z < WATER_Z - 2 : Nature.freeAt(x, z, this.r, true) >= 0) { this.wx = x; this.wz = z; return; }
    }
    this.wx = this.pos.x; this.wz = this.pos.z;
  }
  wander(dt) {
    if (this.ai === 'pause') { this.graze = approach(this.graze, 1, dt * 1.5); this.goTo(this.pos.x, this.pos.z, 0, dt); if ((this.aiT -= dt) <= 0) { this.ai = 'walk'; this.newWander(); } return; }
    this.graze = approach(this.graze, 0, dt * 2.5);
    const L = this.goTo(this.wx, this.wz, this.T.walk, dt);
    if (L < 0.6 || (this.aiT -= dt) <= -8) { this.ai = 'pause'; this.aiT = R(2, 6); }
  }
  /* ---------- bêtes paisibles : broutent, s'enfuient ---------- */
  thinkShy(dt, P) {
    const T = this.T;
    if (this.ai === 'flee') {
      this.fleeT -= dt; this.graze = approach(this.graze, 0, dt * 4);
      let dx = this.pos.x - this.fx, dz = this.pos.z - this.fz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (this.type === 'lievre') { const z = Math.sin(this.t * 5 + this.seed * 10) * 0.6; const ox = dx; dx = dx + dz * z; dz = dz - ox * z; } // zigzags
      this.goTo(this.pos.x + dx * 6, this.pos.z + dz * 6, T.run, dt);
      if (this.fleeT <= 0 && L > T.shy * 1.8) { this.ai = 'pause'; this.aiT = R(1, 3); this.home = { x: this.pos.x, z: this.pos.z }; }
      return;
    }
    this.wander(dt);
    if (P && P.alive && !P.hidden) {
      const d = dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z), loud = (P.speedNow || 0) > 3.2 || P.state !== 'move';
      if (d < T.shy * (loud ? 1.25 : 0.55) && (this.sees || d < T.shy * 0.4)) this.flee(P.pos.x, P.pos.z, true);
    }
  }
  flee(x, z, cry) {
    if (this.ai !== 'flee' && cry && this.t - this.lastSnd > 3) { this.lastSnd = this.t; NSnd.play(this.T.cry, this.pos, 0.55); }
    this.ai = 'flee'; this.fx = x; this.fz = z; this.fleeT = R(3, 5);
    for (const c of Fauna.near(this, 14)) if (!c.hostile && c.ai !== 'flee' && c.alive) { c.ai = 'flee'; c.fx = x; c.fz = z; c.fleeT = R(3, 5); }
  }
  hearNoise(x, z, d) { if (!this.alive) return; if (!this.hostile) { if (d < 40) this.flee(x, z, true); } else if (!this.alerted && d < 35) { this.alert(); this.home = { x, z }; } }
  onHurt(src, dmg) {
    if (!this.alive) return;
    if (!this.hostile) { if (src) this.flee(src.pos.x, src.pos.z, true); return; }
    if (!this.alerted) this.alert();
    if (this.type === 'loup' && this.hp < this.maxHp * 0.5 && this.t - this.lastSnd > 1.5) { this.lastSnd = this.t; NSnd.play('yelp', this.pos, 0.6); }
  }
  /* ---------- prédateurs ---------- */
  alert() {
    if (this.alerted || !this.alive) return;
    this.alerted = true; this.combatT = 6; this.ai = 'hunt'; Game.onAlert(this); FX.exclaim(this);
    if (this.t - this.lastSnd > 2) { this.lastSnd = this.t; const lead = !this.pack || !Fauna.list.some(c => c !== this && c.pack === this.pack && c.alerted); if (lead) NSnd.play(this.T.cry, this.pos, this.type === 'loup' ? 0.9 : 0.7); }
    if (this.pack) for (const c of Fauna.list) if (c !== this && c.pack === this.pack && !c.alerted) { c.alerted = true; c.ai = 'hunt'; c.combatT = 6; }
    if (this.boss && !Game.boss) { Game.boss = this; HUD.big(this.T.name, 'Une bête légendaire', 'bad', 2.4); }
  }
  thinkHostile(dt, P) {
    const T = this.T;
    if (!this.alerted) {
      this.wander(dt);
      if (P && this.sees) { const d = dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z); if (d < T.aggro || (d < T.sight && this.facing(P.pos.x, P.pos.z, 0.3))) this.alert(); }
      return;
    }
    const d = P ? dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z) : 1e9;
    if (!P || !P.alive || d > T.leash || P.state === 'car' || P.hidden) { this.alerted = false; this.ai = 'walk'; Combat.release(this); this.home = { x: this.pos.x, z: this.pos.z }; this.newWander(); if (Game.boss === this) Game.boss = null; return; }
    this.graze = 0;
    const px = P.pos.x, pz = P.pos.z, ang = Math.atan2(this.pos.x - px, this.pos.z - pz);
    if (T.style === 'caster') return this.thinkCaster(dt, P, d, ang);
    const close = T.style === 'brute' ? ATK[T.atk[0]].range + 0.5 : 2.1;
    if (this.atkCd <= 0 && Combat.canAttack(this)) {
      if (T.style === 'brute') {
        if (d < close) { this.startAttack(chance(0.35) ? T.atk[1] : T.atk[0], P); return; }
        this.goTo(px, pz, T.run, dt, px, pz); return;
      }
      if (d < close) { this.startAttack(T.atk[0], P); return; }
      if (d > 3.2 && d < 7 && chance(dt * 1.6) && this.sees) { this.startAttack(T.atk[1], P); return; }
      this.goTo(px, pz, T.run, dt); return;
    }
    if (T.style === 'brute') { if (d > close) this.goTo(px, pz, T.walk * 1.4, dt, px, pz); else this.goTo(this.pos.x, this.pos.z, 0, dt, px, pz); return; }
    // les autres tournent autour, à distance, en attendant leur tour
    const a2 = ang + this.orbit * 0.7, tr = T.ring + Math.sin(this.t * 0.7 + this.seed * 6) * 0.8;
    this.goTo(px + Math.sin(a2) * tr, pz + Math.cos(a2) * tr, d > T.ring + 3 ? T.run : T.walk * 2, dt, px, pz);
  }
  thinkCaster(dt, P, d, ang) {
    const T = this.T;
    if (d < 3.6 && this.blinkCd <= 0) { // se dérobe
      this.blinkCd = R(3.5, 5.5); const a = ang + this.orbit * R(0.8, 1.6), r = R(7, 9), x = P.pos.x + Math.sin(a) * r, z = P.pos.z + Math.cos(a) * r;
      if (World.onLand(x, z) && z < WATER_Z - 2 && !World.raycast(this.pos.x, this.pos.y + 0.5, this.pos.z, x - this.pos.x, 0, z - this.pos.z, 1)) {
        FX.smoke(this.pos.x, this.pos.y + 0.4, this.pos.z, [0.3, 0.8, 1], 6); this.pos.x = x; this.pos.z = z; this.vel.set(0, 0, 0); NSnd.play('chime', this.pos, 0.6); FX.smoke(x, this.pos.y + 0.4, z, [0.3, 0.8, 1], 6); return;
      }
    }
    if (this.atkCd <= 0 && this.sees && d < 18) { this.atkCd = R(2.4, 3.8); this.startAttack('fx_cast', P); return; }
    const a2 = ang + this.orbit * 0.5, tr = T.ring + Math.sin(this.t * 0.5 + this.seed * 5) * 2;
    this.goTo(P.pos.x + Math.sin(a2) * tr, P.pos.z + Math.cos(a2) * tr, d < 5 ? T.run : T.walk, dt, P.pos.x, P.pos.z);
  }
  // déroulé d'une attaque (comme celui du jeu, avec le bond et le sort en plus)
  updateAttack(dt) {
    const A = this.atk; if (!A) { this.setState('move'); return; }
    const d = A.d, tg = A.target; A.t += dt;
    if (tg && A.t < d.hit) this.yaw = dampAngle(this.yaw, angleTo(this.pos.x, this.pos.z, tg.pos.x, tg.pos.z), d.leap && A.t > d.leap ? 2 : 10, dt);
    if (d.leap) {
      if (A.t < d.leap) { this.vel.x = damp(this.vel.x, 0, 10, dt); this.vel.z = damp(this.vel.z, 0, 10, dt); }
      else if (!A.jumped) { A.jumped = true; const dist = tg ? Math.max(1, dist2D(this.pos.x, this.pos.z, tg.pos.x, tg.pos.z) - 1.2) : 4, v = Math.min(d.leapV, dist / Math.max(0.15, d.hit - d.leap)); this.vel.x = this.fwdX() * v; this.vel.z = this.fwdZ() * v; this.vel.y = 4.2; this.grounded = false; Snd.play('whoosh', this.pos, 0.7); }
      else if (this.grounded && A.t > d.hit) { this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt); }
    } else if (d.lunge && A.t < d.hit) {
      let want = d.lunge * 0.45; if (tg) { const dist = dist2D(this.pos.x, this.pos.z, tg.pos.x, tg.pos.z) - tg.r; want = clamp((dist - d.range * 0.6) / Math.max(0.08, d.hit - A.t), 0, 7); }
      this.vel.x = this.fwdX() * want; this.vel.z = this.fwdZ() * want;
    } else { this.vel.x = damp(this.vel.x, 0, 12, dt); this.vel.z = damp(this.vel.z, 0, 12, dt); }
    if (!A.hit && A.t >= d.hit) {
      A.hit = true;
      if (d.cast) Fauna.shoot(this, tg);
      else { Combat.resolveMelee(this, A); this.venomCheck(A); }
    }
    if (A.hit && d.hitEnd && A.t < d.hitEnd && !A.connected) { Combat.resolveMelee(this, A, true); this.venomCheck(A); }
    if (A.t >= d.dur) { this.atk = null; this.setState('move'); Combat.release(this); this.atkCd = this.T.style === 'brute' ? R(1.4, 2.6) : R(1.2, 2.4); this.orbit = chance(0.5) ? 1 : -1; }
  }
  venomCheck(A) { const P = Game.player; if (A.d.venom && A.connected && !A.venomed && P && !P.blocking && dist2D(P.pos.x, P.pos.z, this.pos.x, this.pos.z) < 3) { A.venomed = true; Fauna.poison(4.5); } }
  startAttack(name, target) { super.startAttack(name, target); if (this.T.cry === 'howl' || this.T.cry === 'hiss') NSnd.play(this.type === 'loup' ? 'snarl' : 'hiss', this.pos, 0.6); if (this.type === 'crabe') NSnd.play('clack', this.pos, 0.6); if (this.type === 'golem') NSnd.play('rumble', this.pos, 0.6); }
  draw() { Fauna.drawCreature(this); }
}

/* ---------------- dessin des bêtes (squelettes procéduraux) ---------------- */
const _B = M4.create(), _H = M4.create(), _X = M4.create(), _K = [0, 0, 0], _F = [0, 0, 0], _W = { x: 0, y: 0, z: 0 };
// une patte à deux os : hanche (locale), pied au sol (local), longueurs, sens du genou
function nLeg(B, hip, foot, l1, l2, bend, r1, r2, mat, col, paw) {
  nIK(hip, foot, l1, l2, bend[0], bend[1], bend[2], _K);
  NR.seg('tap', mat, B, hip, _K, r1, col); NR.seg('tap', mat, B, _K, foot, r2, col);
  if (paw) NR.part('sph', mat, B, foot[0], foot[1] + paw[1] * 0.5, foot[2] + paw[2] * 0.3, 0, 0, 0, paw[0], paw[1], paw[2], col);
}
const atkK = a => { const A = a.atk; if (!A) return { w: 0, s: 0, p: 0 }; const d = A.d, w = clamp(A.t / d.hit, 0, 1), s = A.t < d.hit ? 0 : clamp((A.t - d.hit) / 0.12, 0, 1) * (1 - clamp((A.t - d.hit - 0.15) / Math.max(0.1, d.dur - d.hit - 0.15), 0, 1)); return { w: A.t < d.hit ? smooth01(w) * (1 - s) : 1 - s, s, p: A.t / d.dur, name: d.clip }; };
// couché (renversé) ou mort : la bête roule sur le flanc
const layK = a => a.state === 'dead' ? Math.min(1, a.deadT * 3) : a.state === 'down' ? Math.min(1, a.st * 4) : a.state === 'getup' ? 1 - Math.min(1, a.st / (a.getupDur || 0.7)) : 0;

const DRAW = {
  loup(a, t) {
    const sp = a.speedNow, run = clamp(sp / a.T.run, 0, 1), g = a.gait * TAU, K = atkK(a), lay = layK(a), alert = a.alerted ? 1 : 0;
    const fur = [0.2, 0.22, 0.27], dark = [0.11, 0.12, 0.15], belly = [0.42, 0.45, 0.5];
    const bodyY = 0.6 - K.w * 0.1 * (K.name === 'pounce' ? 1.5 : 0.6), bob = Math.abs(Math.sin(g)) * 0.06 * run + Math.sin(t * 2) * 0.008;
    const pitch = (K.name === 'pounce' ? -0.18 * K.w + 0.25 * K.s : -0.06 * K.w + 0.08 * K.s) + (a.grounded ? 0 : clamp(-a.vel.y * 0.05, -0.3, 0.3)) + (a.state === 'hit' ? -0.15 : 0);
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + bodyY * (1 - lay * 0.55) + bob, a.pos.z, pitch, a.yaw, lay * 1.45, 1, 1, 1);
    NR.part('sph', 'fur', _B, 0, 0.04, 0.24, 0, 0, 0, 0.25, 0.26, 0.36, fur);
    NR.part('sph', 'fur', _B, 0, 0.0, -0.28, 0, 0, 0, 0.21, 0.22, 0.32, fur);
    NR.part('sph', 'fur', _B, 0, -0.1, 0.0, 0, 0, 0, 0.17, 0.12, 0.4, belly);
    NR.part('sph', 'fur', _B, 0, 0.14, 0.34, -0.3, 0, 0, 0.26, 0.24, 0.24, dark);
    // tête : renifle au repos, se baisse avant de mordre, se jette en avant
    const sniff = a.alerted ? 0 : (Math.sin(t * 0.7 + a.seed * 9) > 0.6 ? 1 : 0) * 0.5 + a.graze * 0.5;
    const hy = 0.3 - sniff * 0.42 - K.w * 0.12 + K.s * 0.05, hz = 0.7 + K.s * 0.18 - K.w * 0.05;
    M4.compose(_X, 0, hy, hz, 0.15 + sniff * 0.5 + K.w * 0.1 - K.s * 0.25, Math.sin(t * 0.9 + a.seed) * 0.25 * (1 - alert), 0, 1, 1, 1); M4.mul(_H, _B, _X);
    NR.seg('tap', 'fur', _B, [0, 0.12, 0.42], [0, hy - 0.02, hz - 0.08], 0.13, dark);
    NR.part('sph', 'fur', _H, 0, 0, 0, 0, 0, 0, 0.13, 0.12, 0.15, fur);
    NR.seg('tap', 'fur', _H, [0, -0.01, 0.08], [0, -0.04, 0.33], 0.065, fur);
    const jaw = K.name === 'bite' || K.name === 'pounce' ? 0.15 + K.w * 0.45 - K.s * 0.55 : 0.05 + (a.alerted ? Math.max(0, Math.sin(t * 6)) * 0.12 : 0);
    NR.seg('tap', 'fur', _H, [0, -0.07, 0.06], [0, -0.07 - Math.sin(jaw) * 0.22, 0.06 + Math.cos(jaw) * 0.24], 0.045, dark);
    NR.part('sph', 'flesh', _H, 0, -0.03, 0.33, 0, 0, 0, 0.025, 0.02, 0.02, [0.02, 0.02, 0.02]);
    for (const sx of [-1, 1]) {
      NR.seg('cone', 'fur', _H, [sx * 0.06, 0.08, -0.03], [sx * 0.09, 0.23 - alert * 0.04, -0.08 - alert * 0.04], 0.04, dark);
      NR.glow(_H, sx * 0.055, 0.035, 0.12, 0.021, alert ? [1, 0.45, 0.35] : [0.55, 0.95, 1], 1.4 + alert);
    }
    // queue
    const tw = Math.sin(t * (3 + run * 4) + a.seed) * 0.12;
    NR.seg('tap', 'fur', _B, [0, 0.08, -0.52], [tw, 0.0 + run * 0.12 - (1 - alert) * 0.12, -0.84], 0.07, fur);
    NR.seg('tap', 'fur', _B, [tw, 0.0 + run * 0.12 - (1 - alert) * 0.12, -0.84], [tw * 2, -0.12 + run * 0.18 - (1 - alert) * 0.2, -1.05], 0.05, dark);
    // pattes : trot, puis galop ; ramassées pendant le bond
    const air = !a.grounded && a.state === 'attack', st = 0.24 + run * 0.32, lift = 0.1 + run * 0.08, fy = -bodyY - bob;
    const ph = run > 0.6 ? [0, 0.35, Math.PI, Math.PI + 0.35] : [0, Math.PI, Math.PI, 0];
    const L = [[0.12, -0.05, 0.3, 0.28, 0.32, [0, 0, 1]], [-0.12, -0.05, 0.3, 0.28, 0.32, [0, 0, 1]], [0.12, -0.03, -0.3, 0.3, 0.34, [0, 0, -1]], [-0.12, -0.03, -0.3, 0.3, 0.34, [0, 0, -1]]];
    for (let i = 0; i < 4; i++) {
      const l = L[i], p = g + ph[i], mv = sp > 0.15 ? 1 : 0, hip = [l[0], l[1], l[2]];
      _F[0] = l[0] * 1.1; _F[2] = l[2] + Math.sin(p) * st * mv + (air ? (i < 2 ? 0.35 : -0.35) : 0); _F[1] = fy + Math.max(0, Math.cos(p)) * lift * mv + (air ? 0.3 : 0) + K.w * 0.08 * (i < 2 ? 0 : 1);
      if (lay > 0.5) { _F[0] = l[0] * 3.5; _F[1] = -0.25; _F[2] = l[2] * 1.4; }
      nLeg(_B, hip, _F, l[3], l[4], l[5], 0.055, 0.04, 'fur', i < 2 ? fur : dark, [0.045, 0.03, 0.065]);
    }
    // brume qui s'accroche aux pattes
    if (a.alive && Fauna.camD < 40) { const N = Render.particles; for (let i = 0; i < 3; i++) { NR.world(_B, Math.sin(t * 1.3 + i * 2.1 + a.seed * 7) * 0.35, -0.4, -0.35 + i * 0.3 + Math.sin(t + i) * 0.2, _W); N.push(_W.x, _W.y, _W.z, 0.55 + 0.25 * Math.sin(t * 2 + i), 0.5, 0.55, 0.66, 0.16 + run * 0.1, t * 0.3 + i, 1, 3, false); } }
    NR.world(_H, 0, 0.1, 0.05, _W); return _W;
  },
  cerf(a, t) {
    const sp = a.speedNow, run = clamp(sp / a.T.run, 0, 1), g = a.gait * TAU, lay = layK(a);
    const coat = [0.56, 0.6, 0.68], back = [0.36, 0.4, 0.5], white = [0.85, 0.88, 0.92];
    const bodyY = 1.02, bob = Math.abs(Math.sin(g)) * 0.09 * run + Math.sin(t * 1.6) * 0.008;
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + bodyY * (1 - lay * 0.6) + bob, a.pos.z, (a.grounded ? 0 : -0.15) + Math.sin(g) * 0.05 * run, a.yaw, lay * 1.45, 1, 1, 1);
    NR.part('sph', 'fur', _B, 0, 0.02, 0.28, 0, 0, 0, 0.27, 0.3, 0.42, coat);
    NR.part('sph', 'fur', _B, 0, 0.04, -0.3, 0, 0, 0, 0.26, 0.28, 0.38, coat);
    NR.part('sph', 'fur', _B, 0, 0.18, 0, 0, 0, 0, 0.2, 0.12, 0.6, back);
    NR.part('sph', 'fur', _B, 0, -0.12, 0, 0, 0, 0, 0.18, 0.12, 0.42, white);
    NR.part('sph', 'fur', _B, 0, 0.08, -0.62, 0.4, 0, 0, 0.08, 0.12, 0.05, white);
    const gz = a.graze, wary = a.ai === 'flee' ? 1 : 0, hy = 0.78 - gz * 1.55 + wary * 0.1, hz = 0.78 + gz * 0.25 + run * 0.15;
    M4.compose(_X, 0, hy, hz, gz * 0.9 - run * 0.2, Math.sin(t * 0.6 + a.seed * 5) * 0.3 * (1 - gz) * (1 - run), 0, 1, 1, 1); M4.mul(_H, _B, _X);
    NR.seg('tap', 'fur', _B, [0, 0.22, 0.5], [0, hy - 0.05, hz - 0.06], 0.12, coat);
    NR.part('sph', 'fur', _H, 0, 0, 0, 0, 0, 0, 0.1, 0.11, 0.16, coat);
    NR.seg('tap', 'fur', _H, [0, -0.02, 0.1], [0, -0.08, 0.32], 0.06, back);
    NR.part('sph', 'flesh', _H, 0, -0.08, 0.32, 0, 0, 0, 0.03, 0.025, 0.025, [0.05, 0.05, 0.06]);
    const ae = 0.9 + 0.35 * Math.sin(t * 1.4 + a.seed * 3), ac = [0.62, 0.86, 1];
    for (const sx of [-1, 1]) {
      NR.seg('cone', 'fur', _H, [sx * 0.07, 0.07, -0.04], [sx * 0.2, 0.12, -0.1], 0.035, back);
      NR.glow(_H, sx * 0.065, 0.03, 0.1, 0.017, [0.1, 0.12, 0.2], 0.3);
      const b0 = [sx * 0.05, 0.1, -0.02], b1 = [sx * 0.17, 0.36, -0.1], b2 = [sx * 0.27, 0.6, -0.04], b3 = [sx * 0.24, 0.82, 0.08];
      NR.seg('tap', 'shell', _H, b0, b1, 0.03, ac, ae); NR.seg('tap', 'shell', _H, b1, b2, 0.024, ac, ae); NR.seg('tap', 'shell', _H, b2, b3, 0.018, ac, ae);
      NR.seg('cone', 'shell', _H, b1, [sx * 0.12, 0.5, 0.12], 0.018, ac, ae); NR.seg('cone', 'shell', _H, b2, [sx * 0.4, 0.74, -0.14], 0.016, ac, ae); NR.seg('cone', 'shell', _H, b2, [sx * 0.18, 0.76, 0.1], 0.014, ac, ae);
      if (Fauna.camD < 35) { NR.world(_H, b3[0], b3[1], b3[2], _W); Render.addParticles.push(_W.x, _W.y, _W.z, 0.25, ac[0], ac[1], ac[2], 0.35 * ae, 0, 1, 0, false); }
    }
    const st = 0.3 + run * 0.5, lift = 0.14 + run * 0.12, fy = -bodyY - bob;
    const ph = run > 0.5 ? [0, 0.4, Math.PI, Math.PI + 0.4] : [0, Math.PI, Math.PI, 0];
    const L = [[0.13, -0.08, 0.34, 0.5, 0.56, [0, 0, 1]], [-0.13, -0.08, 0.34, 0.5, 0.56, [0, 0, 1]], [0.13, -0.05, -0.34, 0.52, 0.56, [0, 0, -1]], [-0.13, -0.05, -0.34, 0.52, 0.56, [0, 0, -1]]];
    for (let i = 0; i < 4; i++) {
      const l = L[i], p = g + ph[i], mv = sp > 0.15 ? 1 : 0;
      _F[0] = l[0] * 1.05; _F[2] = l[2] + Math.sin(p) * st * mv; _F[1] = fy + Math.max(0, Math.cos(p)) * lift * mv + (a.grounded ? 0 : 0.35);
      if (lay > 0.5) { _F[0] = l[0] * 5; _F[1] = -0.3; _F[2] = l[2] * 1.5; }
      nLeg(_B, [l[0], l[1], l[2]], _F, l[3], l[4], l[5], 0.05, 0.03, 'fur', i < 2 ? coat : back, [0.035, 0.04, 0.05]);
    }
    NR.world(_H, 0, 0.15, 0, _W); return _W;
  },
  lievre(a, t) {
    const sp = a.speedNow, run = clamp(sp / a.T.run, 0, 1), g = a.gait * TAU, lay = layK(a), hop = Math.max(0, Math.sin(g)) * (0.08 + run * 0.28) * (sp > 0.2 ? 1 : 0);
    const fur = [0.78, 0.8, 0.88], dark = [0.55, 0.57, 0.66];
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + 0.17 * (1 - lay * 0.5) + hop, a.pos.z, Math.cos(g) * 0.3 * run * (sp > 0.2 ? 1 : 0), a.yaw, lay * 1.4, 1, 1, 1);
    NR.part('sph', 'fur', _B, 0, 0.02, -0.05, 0, 0, 0, 0.13, 0.13, 0.19, fur, 0.12);
    NR.part('sph', 'fur', _B, 0, 0.0, 0.1, 0, 0, 0, 0.1, 0.1, 0.12, fur, 0.12);
    NR.part('sph', 'fur', _B, 0, 0.07, -0.24, 0, 0, 0, 0.05, 0.05, 0.05, [0.95, 0.96, 1], 0.4);
    const twitch = Math.sin(t * 9 + a.seed * 20) * 0.03;
    M4.compose(_X, 0, 0.12 - a.graze * 0.08, 0.19, 0.2 + a.graze * 0.4, 0, 0, 1, 1, 1); M4.mul(_H, _B, _X);
    NR.part('sph', 'fur', _H, 0, 0, 0, 0, 0, 0, 0.065, 0.065, 0.085, fur, 0.12);
    for (const sx of [-1, 1]) {
      const e0 = [sx * 0.03, 0.05, -0.02], e1 = [sx * 0.05 + twitch, 0.2 - run * 0.08, -0.08 - run * 0.1];
      NR.seg('tap', 'fur', _H, e0, e1, 0.022, dark, 0.1); NR.glow(_H, e1[0], e1[1], e1[2], 0.018, [0.85, 0.9, 1], 1);
      NR.glow(_H, sx * 0.04, 0.02, 0.05, 0.012, [0.15, 0.1, 0.2], 0.2);
    }
    // pattes : arrière puissantes, avant courtes
    const st = Math.cos(g) * (0.08 + run * 0.12) * (sp > 0.2 ? 1 : 0);
    for (const sx of [-1, 1]) {
      NR.part('sph', 'fur', _B, sx * 0.08, -0.05, -0.1, 0, 0, 0, 0.05, 0.08, 0.09, fur);
      NR.part('sph', 'fur', _B, sx * 0.08, -0.15 - hop + Math.max(0, -st) * 0.1, -0.05 - st, 0, 0, 0, 0.03, 0.02, 0.08, dark);
      NR.seg('tap', 'fur', _B, [sx * 0.05, -0.04, 0.12], [sx * 0.05, -0.16 - hop * 0.5, 0.16 + st * 0.6], 0.022, fur);
    }
    NR.world(_H, 0, 0.06, 0, _W); return _W;
  },
  tisseuse(a, t) {
    const sp = a.speedNow, run = clamp(sp / a.T.run, 0, 1), g = a.gait * TAU, K = atkK(a), lay = layK(a);
    const chit = [0.11, 0.08, 0.13], leg = [0.16, 0.12, 0.18], rune = [0.72, 0.32, 1];
    const air = !a.grounded, bodyY = 0.48 - K.w * 0.12 + (air ? 0.05 : 0), bob = Math.abs(Math.sin(g * 2)) * 0.03 * run;
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + bodyY * (1 - lay * 0.4) + bob, a.pos.z, -K.w * 0.15 + K.s * 0.2, a.yaw, lay * Math.PI * 0.95, 1, 1, 1);
    NR.part('sph', 'shell', _B, 0, 0, 0.22, 0, 0, 0, 0.24, 0.17, 0.27, chit);
    NR.part('sph', 'shell', _B, 0, 0.14 + Math.sin(t * 2) * 0.01, -0.36, 0.25, 0, 0, 0.42, 0.34, 0.5, chit);
    const rk = 1.4 + 0.6 * Math.sin(t * 2.5 + a.seed * 4) + (a.alerted ? 0.8 : 0);
    NR.part('sph', 'shell', _B, 0, 0.45, -0.36, 0.25, 0, 0, 0.05, 0.02, 0.2, rune, rk);
    for (const sx of [-1, 1]) { NR.part('sph', 'shell', _B, sx * 0.14, 0.4, -0.3, 0.3, sx * 0.4, 0, 0.035, 0.015, 0.14, rune, rk); NR.part('sph', 'shell', _B, sx * 0.1, 0.33, -0.6, 0.6, -sx * 0.3, 0, 0.03, 0.015, 0.1, rune, rk); }
    for (let i = 0; i < 4; i++) NR.glow(_B, (i - 1.5) * 0.045, 0.08 + (i % 2) * 0.03, 0.47, 0.018, a.alerted ? [1, 0.25, 0.3] : [0.8, 0.3, 0.5], 1.2 + a.alerted);
    const fang = K.name === 'bite' ? K.w * 0.4 - K.s * 0.5 : 0.05;
    for (const sx of [-1, 1]) NR.seg('cone', 'shell', _B, [sx * 0.06, -0.05, 0.44], [sx * (0.07 + fang * 0.15), -0.22, 0.5 - fang * 0.1], 0.03, [0.3, 0.25, 0.28]);
    // huit pattes en tétrapode alterné, genoux hauts
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? 1 : -1, k = i % 4, hz = 0.36 - k * 0.12, p = g + ((k + (side > 0 ? 0 : 1)) % 2) * Math.PI, mv = sp > 0.15 ? 1 : 0;
      const spread = 0.95 + (k === 0 || k === 3 ? 0.1 : 0), fz = hz * 2.1 + (k < 2 ? 0.15 : -0.15);
      _F[0] = side * spread; _F[2] = fz + Math.sin(p) * (0.18 + run * 0.12) * mv; _F[1] = -bodyY - bob + Math.max(0, Math.cos(p)) * 0.14 * mv;
      if (air) { _F[0] = side * 0.75; _F[1] = -0.25; _F[2] = fz * 0.6 + (k < 2 ? 0.35 : -0.3); }
      if (K.name === 'bite' && k === 0) { _F[1] += K.w * 0.35; _F[2] += K.w * 0.2; }
      if (lay > 0.5) { _F[0] = side * 0.5; _F[1] = 0.35 + Math.sin(t * 9 + i) * 0.08 * (a.state === 'dead' ? 0 : 1); _F[2] = fz * 0.5; }
      nLeg(_B, [side * 0.16, 0.0, hz], _F, 0.55, 0.68, [0, 1, 0], 0.035, 0.024, 'shell', leg, null);
    }
    NR.world(_B, 0, 0.2, 0.3, _W); return _W;
  },
  follet(a, t) {
    const K = atkK(a), dying = a.state === 'dead' ? Math.min(1, a.deadT) : 0, cast = K.name === 'cast' ? K.w : 0;
    M4.compose(_B, a.pos.x, a.pos.y + 0.55, a.pos.z, 0, a.yaw, 0, 1, 1, 1);
    const pul = 0.85 + 0.15 * Math.sin(t * 7 + a.seed * 9), s = (0.17 + cast * 0.09) * pul * (1 - dying), c = cast > 0.2 ? [0.9, 1, 1] : [0.45, 0.92, 1];
    NR.glow(_B, 0, 0, 0, s, c, 2.2 + cast * 2); NR.glow(_B, 0, 0, 0, s * 1.6, [0.15, 0.45, 0.7], 0.5);
    if (dying < 1) {
      NR.world(_B, 0, 0, 0, _W); const A = Render.addParticles, k = 1 - dying;
      A.push(_W.x, _W.y, _W.z, (1.2 + cast * 1.5) * k, 0.35, 0.8, 1.1, 0.5 * k, 0, 1, 0, false);
      for (let i = 0; i < 7; i++) { const u = (t * 1.6 + i / 7) % 1, sw = Math.sin(t * 3 + i * 1.7) * 0.12, wx = _W.x - a.fwdX() * (0.1 + u * 0.3) + Math.cos(t * 3 + i) * 0.12, wz = _W.z - a.fwdZ() * (0.1 + u * 0.3) + sw; A.push(wx, _W.y + u * 0.55, wz, (0.22 - u * 0.16) * k, 0.4 + u * 0.4, 0.9, 1.2, (1 - u) * 0.8 * k, 0, 1, 0, false); }
      if (Fauna.camD < 26) Lights.add(_W.x, _W.y, _W.z, 0.35 * k, 0.9 * k, 1.3 * k, 7, 0.05, 'wisp' + a.id);
      return { x: _W.x, y: _W.y + 0.15, z: _W.z };
    }
    NR.world(_B, 0, 0.2, 0, _W); return _W;
  },
  crabe(a, t) {
    const sp = a.speedNow, g = a.gait * TAU, K = atkK(a), lay = layK(a);
    const shell = [0.42, 0.13, 0.09], dark = [0.22, 0.07, 0.06], pale = [0.75, 0.68, 0.58];
    const bodyY = 0.62, bob = Math.abs(Math.sin(g * 2)) * 0.04 * Math.min(1, sp);
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + bodyY * (1 - lay * 0.3) + bob, a.pos.z, -K.w * 0.12 + K.s * 0.14, a.yaw, lay * Math.PI * 0.9 + Math.sin(g) * 0.04 * Math.min(1, sp), 1, 1, 1);
    NR.part('sph', 'shell', _B, 0, 0, 0, 0, 0, 0, 0.78, 0.33, 0.62, shell);
    NR.part('sph', 'shell', _B, 0, -0.12, 0, 0, 0, 0, 0.68, 0.18, 0.55, dark);
    for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.22; NR.seg('cone', 'shell', _B, [x, 0.22, 0.1 - Math.abs(x) * 0.3], [x * 1.1, 0.42 - Math.abs(x) * 0.25, 0.0], 0.06, dark); }
    for (let i = 0; i < 7; i++) NR.part('sph', 'shell', _B, Math.sin(i * 2.4) * 0.5, 0.2, Math.cos(i * 2.4) * 0.35 - 0.1, 0, 0, 0, 0.06, 0.04, 0.06, pale);
    for (const sx of [-1, 1]) {
      NR.seg('cyl', 'shell', _B, [sx * 0.16, 0.18, 0.45], [sx * 0.2, 0.42, 0.55], 0.025, dark);
      NR.glow(_B, sx * 0.2, 0.45, 0.56, 0.045, [1, 0.85, 0.3], 1.4 + (a.alerted ? 1 : 0));
    }
    // six pattes arquées
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? 1 : -1, k = i % 3, hz = 0.28 - k * 0.28, p = g + ((k + (side > 0 ? 0 : 1)) % 2) * Math.PI, mv = sp > 0.1 ? 1 : 0;
      _F[0] = side * 1.2; _F[2] = hz * 1.4 + Math.sin(p) * 0.22 * mv; _F[1] = -bodyY - bob + Math.max(0, Math.cos(p)) * 0.15 * mv;
      if (lay > 0.5) { _F[0] = side * 0.8; _F[1] = 0.6 + Math.sin(t * 7 + i) * 0.1 * (a.state === 'dead' ? 0 : 1); }
      nLeg(_B, [side * 0.6, -0.05, hz], _F, 0.6, 0.75, [0, 1, 0], 0.07, 0.045, 'shell', i % 2 ? shell : dark, null);
    }
    // pinces : levées avant le coup, abattues ensuite
    for (const sx of [-1, 1]) {
      const both = K.name === 'crush', act = both || (K.name === 'claw' && sx > 0) ? 1 : 0, up = act * K.w, down = act * K.s;
      const sh = [sx * 0.55, 0.05, 0.42], hand = [sx * (0.62 - up * 0.1), 0.15 + up * 0.75 - down * 0.85, 0.95 + up * 0.05 + down * 0.45 + Math.sin(t * 1.5 + sx) * 0.03];
      nIK(sh, hand, 0.5, 0.5, sx, 0.6, 0, _K);
      NR.seg('tap', 'shell', _B, sh, _K, 0.11, shell); NR.seg('tap', 'shell', _B, _K, hand, 0.09, shell);
      const open = 0.15 + up * 0.5 - down * 0.6 + (a.alerted ? Math.max(0, Math.sin(t * 4 + sx)) * 0.15 : 0);
      M4.compose(_X, hand[0], hand[1], hand[2], -0.2 - up * 0.6 + down * 0.6, sx * 0.25, 0, 1, 1, 1); M4.mul(_H, _B, _X);
      NR.part('sph', 'shell', _H, 0, 0, 0.18, 0, 0, 0, 0.17, 0.13, 0.3, shell);
      NR.part('sph', 'shell', _H, 0, 0.06, 0.3, -open, 0, 0, 0.09, 0.06, 0.24, dark);
      NR.part('cone', 'shell', _H, 0, -0.04, 0.4, Math.PI / 2, 0, 0, 0.07, 0.25, 0.05, pale);
    }
    NR.world(_B, 0, 0.35, 0.3, _W); return _W;
  },
  golem(a, t) {
    const sp = a.speedNow, run = clamp(sp / a.T.run, 0, 1), g = a.gait * TAU, K = atkK(a), lay = layK(a);
    const stone = [0.4, 0.3, 0.3], dark = [0.22, 0.17, 0.18], coral = [1, 0.45, 0.36], teal = [0.3, 1, 0.85];
    const hipY = 1.55, bob = Math.abs(Math.sin(g)) * 0.1 * Math.min(1, sp) - K.w * (K.name === 'slam' ? 0.25 : 0.1) + K.s * (K.name === 'slam' ? -0.15 : 0);
    const sway = Math.sin(g) * 0.06 * Math.min(1, sp), twist = K.name === 'swing' ? -K.w * 0.6 + K.s * 1.1 : 0;
    M4.compose(_B, a.pos.x, a.pos.y + a.visY + hipY * (1 - lay * 0.75) + bob, a.pos.z, lay * -1.4 + (K.name === 'slam' ? -0.2 * K.w + 0.45 * K.s : 0.05), a.yaw, sway, 1, 1, 1);
    // jambes (dans le repère du bassin)
    for (const sx of [-1, 1]) {
      const p = g + (sx > 0 ? 0 : Math.PI), mv = sp > 0.1 ? 1 : 0;
      _F[0] = sx * 0.42; _F[2] = Math.sin(p) * 0.45 * mv; _F[1] = -hipY - bob + Math.max(0, Math.cos(p)) * 0.22 * mv;
      if (lay > 0.5) { _F[1] = -0.3; _F[2] = 1.4; }
      nLeg(_B, [sx * 0.35, -0.05, 0], _F, 0.85, 0.85, [0, 0, 1], 0.24, 0.2, 'shell', stone, [0.22, 0.12, 0.3]);
    }
    NR.part('sph', 'shell', _B, 0, 0, 0, 0, 0, 0, 0.48, 0.32, 0.38, dark);
    M4.compose(_X, 0, 0.2, 0, 0.1, twist, 0, 1, 1, 1); M4.mul(_H, _B, _X); // torse
    NR.part('sph', 'shell', _H, 0, 0.8, 0, 0, 0, 0, 0.78, 0.72, 0.56, stone);
    NR.part('sph', 'shell', _H, 0, 0.55, 0.3, 0, 0, 0, 0.5, 0.4, 0.3, dark);
    const ce = 1.2 + 0.6 * Math.sin(t * 2 + a.seed * 3) + (a.alerted ? 0.8 : 0);
    NR.glow(_H, 0, 0.75, 0.52, 0.12, [1, 0.5, 0.35], ce);
    for (let i = 0; i < 9; i++) { const ax = Math.sin(i * 2.2) * 0.55, az = -0.25 - Math.abs(Math.cos(i * 1.7)) * 0.25, ay = 1.1 + (i % 3) * 0.15; const tip = [ax * 1.25, ay + 0.45 + (i % 2) * 0.25, az - 0.3]; NR.seg('tap', 'shell', _H, [ax, ay, az], tip, 0.07, coral, 0.6); NR.glow(_H, tip[0], tip[1], tip[2], 0.05, coral, 1.5 * ce * 0.6); }
    // tête
    NR.part('sph', 'shell', _H, 0, 1.6, 0.28, 0.2, 0, 0, 0.26, 0.22, 0.26, dark);
    for (const sx of [-1, 1]) NR.glow(_H, sx * 0.1, 1.62, 0.5, 0.045, teal, 1.6 + (a.alerted ? 1 : 0));
    // bras : pendants et balancés, puis revers (droit) ou frappe au sol (les deux)
    for (const sx of [-1, 1]) {
      const sh = [sx * 0.82, 1.2, 0]; NR.part('sph', 'shell', _H, sh[0], sh[1], sh[2], 0, 0, 0, 0.36, 0.32, 0.32, stone);
      const p = g + (sx > 0 ? Math.PI : 0), mv = sp > 0.1 ? 1 : 0;
      let hx = sx * 1.0, hy = -0.25, hz = 0.15 + Math.sin(p) * 0.35 * mv;
      if (K.name === 'slam') { hx = sx * lerp(1.0, 0.45, K.w); hy = lerp(-0.25, 2.4, K.w); hz = lerp(0.15, 0.3, K.w); if (K.s > 0) { hx = sx * 0.45; hy = lerp(2.4, -1.25, K.s); hz = lerp(0.3, 1.5, K.s); } }
      if (K.name === 'swing' && sx > 0) { hx = lerp(1.0, 1.6, K.w); hy = lerp(-0.25, 1.4, K.w); hz = lerp(0.15, -0.6, K.w); if (K.s > 0) { hx = lerp(1.6, -1.1, K.s); hy = lerp(1.4, 0.6, K.s); hz = lerp(-0.6, 1.5, K.s); } }
      const hand = [hx, hy, hz]; nIK(sh, hand, 0.85, 0.9, 0, 0, -1, _K);
      NR.seg('tap', 'shell', _H, sh, _K, 0.22, stone); NR.seg('tap', 'shell', _H, _K, hand, 0.19, stone);
      NR.part('sph', 'shell', _H, hx, hy - 0.05, hz, 0, 0, 0, 0.3, 0.28, 0.3, dark);
      NR.part('cone', 'shell', _H, _K[0], _K[1] + 0.05, _K[2] - 0.12, -0.6, 0, sx * 0.4, 0.07, 0.35, 0.07, coral, 0.5);
    }
    NR.world(_H, 0, 1.7, 0.3, _W); return _W;
  }
};

/* ---------------- le bestiaire vivant : apparition, oiseaux, butin, projectiles ---------------- */
const Fauna = {
  list: [], birds: [], loot: [], shots: [], camD: 0, spawnT: 3, hostT: 14, packN: 0, golemT: 0, venomT: 0, venomTick: 0,
  init() {
    const n = Combat.noise; Combat.noise = function (x, z, radius, src) { n.call(this, x, z, radius, src); Fauna.noise(x, z, radius); };
  },
  clear() { this.list = []; this.birds = []; this.loot = []; this.shots = []; this.venomT = 0; this.spawnT = 3; this.hostT = R(12, 18); },
  near(c, r) { return this.list.filter(o => o !== c && dist2D(o.pos.x, o.pos.z, c.pos.x, c.pos.z) < r); },
  allowed() { const D = Game.def; return !!D && !MP.on && !D.training && Game.mode === 'play'; },
  noise(x, z, r) { for (const b of this.birds) if (b.st === 'perch' && dist2D(b.x, b.z, x, z) < r + 10) this.takeOff(b); },
  spawn(type, x, z, o) { const c = new Creature(type, x, z, o); Game.addActor(c); this.list.push(c); return c; },
  // un point au sol, hors de la vue proche, entre r0 et r1 du joueur
  spot(P, r0, r1, rad) {
    for (let k = 0; k < 10; k++) {
      const a = R(0, TAU), r = R(r0, r1), x = P.pos.x + Math.sin(a) * r, z = P.pos.z + Math.cos(a) * r;
      if (r < 70 && Cam.sphereVisible(x, 1, z, 2) && World.los(P.pos, { x, y: 0, z }, 1.5, 1)) continue;
      if (Nature.freeAt(x, z, rad || 0.7, true) < 0) continue;
      return { x, z, b: Nature.biome(x, z) };
    }
    return null;
  },
  update(dt) {
    const P = Game.player; if (!P) return;
    this.list = this.list.filter(c => !c.removed);
    if (this.allowed()) this.populate(dt, P);
    for (const c of this.list) {
      const d = dist2D(c.pos.x, c.pos.z, P.pos.x, P.pos.z);
      if (d > 175 && !(c.alerted && d < c.T.leash)) { c.removed = true; if (Game.boss === c) Game.boss = null; continue; }
      if (c.alive && !NSave.d.seen['faune:' + c.type] && d < 30 && Cam.sphereVisible(c.pos.x, c.pos.y + 0.6, c.pos.z, 1)) Nature.discover('faune', c.type, c.T.name);
    }
    this.updateBirds(dt, P); this.updateLoot(dt, P); this.updateShots(dt, P);
    if (this.venomT > 0) {
      this.venomT -= dt; this.venomTick -= dt;
      if (this.venomTick <= 0 && P.alive) { this.venomTick = 0.6; P.hp = Math.max(1, P.hp - 2.2); P.hitFlash = Math.max(P.hitFlash, 0.25); for (let i = 0; i < 4; i++) FX.P(P.pos.x + R(-0.3, 0.3), P.pos.y + R(0.5, 1.6), P.pos.z + R(-0.3, 0.3), { vy: R(0.3, 0.9), life: 0.6, size: 0.08, r: 0.5, g: 1.6, b: 0.4, cell: 0 }); }
    }
  },
  populate(dt, P) {
    if (P.state === 'car') return;
    // paisibles : quelques bêtes dans les parcs et les pelouses (des lièvres partout)
    if ((this.spawnT -= dt) <= 0) {
      this.spawnT = 1.6;
      const shy = this.list.filter(c => !c.hostile).length;
      if (shy < 6) {
        const s = this.spot(P, 40, 105, 0.7);
        if (s) {
          if (s.b === 'wild' || (s.b === 'garden' && chance(0.4))) { if (chance(0.55)) { const n = RI(2, 3); for (let i = 0; i < n; i++) this.spawn('cerf', s.x + R(-3, 3), s.z + R(-3, 3)); } else for (let i = 0, n = RI(1, 2); i < n; i++) this.spawn('lievre', s.x + R(-2, 2), s.z + R(-2, 2)); }
          else if (s.b !== 'shore' && chance(0.35)) this.spawn('lievre', s.x, s.z);
        }
      }
      if (this.birds.length < 10 && chance(0.5)) { const s = this.spot(P, 22, 60, 1); if (s && s.b !== 'shore') { const n = RI(3, 5); for (let i = 0; i < n; i++) { const x = s.x + R(-2.5, 2.5), z = s.z + R(-2.5, 2.5), g = Nature.freeAt(x, z, 0.2, true); if (g >= 0) this.birds.push({ x, y: g, z, yaw: R(0, TAU), st: 'perch', t: R(0, 9), vx: 0, vy: 0, vz: 0, peck: 0 }); } } }
    }
    // prédateurs : seulement en patrouille libre (les dossiers restent tels quels)
    if (!Game.def.patrol) return;
    this.golemT -= dt;
    if ((this.hostT -= dt) <= 0) {
      this.hostT = R(28, 48);
      const hostile = this.list.filter(c => c.hostile && c.alive).length; if (hostile >= 7) return;
      const s = this.spot(P, 45, 85, 1.1); if (!s) { this.hostT = 4; return; }
      const r = Math.random(), pk = ++this.packN; let type, n = 1;
      if (s.b === 'shore') { if (r < 0.1 && this.golemT <= 0 && !this.list.some(c => c.type === 'golem')) { type = 'golem'; this.golemT = 300; } else if (r < 0.72) { type = 'crabe'; n = RI(1, 2); } else { type = 'follet'; n = RI(1, 3); } }
      else if (s.b === 'wild') { type = r < 0.5 ? 'loup' : r < 0.75 ? 'tisseuse' : 'follet'; }
      else if (s.b === 'garden') { type = r < 0.4 ? 'loup' : r < 0.7 ? 'tisseuse' : 'follet'; }
      else type = r < 0.4 ? 'tisseuse' : r < 0.75 ? 'follet' : 'loup';
      if (type === 'loup') n = RI(2, 4); else if (type === 'tisseuse') n = RI(1, 2); else if (type === 'follet' && n === 1) n = RI(1, 3);
      for (let i = 0; i < n; i++) this.spawn(type, s.x + R(-2.5, 2.5), s.z + R(-2.5, 2.5), { pack: pk });
    }
  },
  onDeath(a, src) {
    Combat.release(a); a.deadT = 0; if (Game.boss === a) Game.boss = null;
    const T = a.T; NSave.d.kills[a.type] = (NSave.d.kills[a.type] || 0) + 1; NSave.write();
    Nature.discover('faune', a.type, T.name);
    if (a.type === 'loup') NSnd.play('yelp', a.pos, 0.8); else if (a.type === 'follet') { NSnd.play('chime', a.pos, 0.8); FX.smoke(a.pos.x, a.pos.y + 0.5, a.pos.z, [0.3, 0.8, 1], 10); }
    else if (a.type === 'golem') { NSnd.play('rumble', a.pos, 1); NSnd.play('crack', a.pos, 0.8); CamCtl.shake(0.6); }
    for (const [id, n0, n1, p] of T.drops || []) if (Math.random() < p) this.dropLoot(id, RI(n0, n1), a.pos);
    if (src && src === Game.player) Game.award(T.xp || 20, a.pos, T.name.toUpperCase(), 'feat');
    // le butin d'armes (branche « loot ») tombe aussi sur les prédateurs, quand il est présent
    if (a.hostile && typeof Loot !== 'undefined' && Loot.onFoeDown) { try { Loot.onFoeDown(a, src); } catch (e) { console.error(e); } }
  },
  dropLoot(id, n, pos) {
    const a = R(0, TAU); this.loot.push({ id, n, x: pos.x, y: pos.y + 0.6, z: pos.z, vx: Math.sin(a) * R(1, 2.5), vy: R(3, 5), vz: Math.cos(a) * R(1, 2.5), t: 0, g: false });
  },
  updateLoot(dt, P) {
    for (const L of this.loot) {
      L.t += dt;
      const d = Math.hypot(L.x - P.pos.x, L.z - P.pos.z), y0 = L.y;
      if (L.t > 0.6 && d < 3.5 && P.alive && P.state !== 'car') { const k = Math.min(1, dt * 8); L.x += (P.pos.x - L.x) * k; L.z += (P.pos.z - L.z) * k; L.y += (P.pos.y + 0.9 - L.y) * k; if (d < 0.7) { L.done = true; Satchel.add(L.id, L.n, P.pos); Snd.play('pickup', P.pos, 0.5); } continue; }
      if (!L.g) { L.vy -= 14 * dt; L.x += L.vx * dt; L.z += L.vz * dt; L.y += L.vy * dt; const g = World.groundAt(L.x, L.z, 0.1, y0 + 0.3) + 0.2; if (L.y <= g) { L.y = g; if (L.vy < -2) { L.vy *= -0.35; L.vx *= 0.5; L.vz *= 0.5; } else L.g = true; } }
      if (L.t > 120) L.done = true;
    }
    this.loot = this.loot.filter(L => !L.done);
  },
  // orbe de feu follet : lent, tête chercheuse, se pare (et revient alors sur le lanceur)
  shoot(a, tg) {
    if (!tg) return; const y = a.pos.y + 0.55, dx = tg.pos.x - a.pos.x, dy = tg.pos.y + 1.2 - y, dz = tg.pos.z - a.pos.z, L = Math.hypot(dx, dy, dz) || 1, v = 7.5;
    this.shots.push({ x: a.pos.x, y, z: a.pos.z, vx: dx / L * v, vy: dy / L * v, vz: dz / L * v, t: 0, owner: a, back: false });
    NSnd.play('orb', a.pos, 0.7);
  },
  updateShots(dt, P) {
    for (const s of this.shots) {
      s.t += dt; const tg = s.back ? s.owner : P;
      if (tg && tg.alive && s.t < 3.2) { const ty = s.back ? tg.pos.y + 0.55 : tg.pos.y + 1.2, dx = tg.pos.x - s.x, dy = ty - s.y, dz = tg.pos.z - s.z, L = Math.hypot(dx, dy, dz) || 1, v = Math.hypot(s.vx, s.vy, s.vz), k = Math.min(1, dt * (s.back ? 6 : 1.6)); s.vx += (dx / L * v - s.vx) * k; s.vy += (dy / L * v - s.vy) * k; s.vz += (dz / L * v - s.vz) * k; }
      const step = Math.hypot(s.vx, s.vy, s.vz) * dt, w = World.raycast(s.x, s.y, s.z, s.vx * dt / step, s.vy * dt / step, s.vz * dt / step, step);
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (w || s.t > 4.5) { s.done = true; this.burst(s); continue; }
      if (s.back) { const o = s.owner; if (o && o.alive && Math.hypot(o.pos.x - s.x, o.pos.y + 0.55 - s.y, o.pos.z - s.z) < 0.7) { s.done = true; this.burst(s); o.takeHit(P, 18, { kind: 'blast', knock: 4, poise: 99 }); o.stagger(1.4, true); } continue; }
      if (P.alive && P.state !== 'car' && Math.hypot(P.pos.x - s.x, P.pos.y + 1.15 - s.y, P.pos.z - s.z) < 0.75) {
        const r = P.takeHit(s.owner, 11, { kind: 'melee', knock: 3, poise: 18, from: { x: s.x - s.vx, z: s.z - s.vz } });
        if (r === 'parry' || r === 'blocked') { s.back = true; s.t = 0; s.vx = -s.vx; s.vy = Math.abs(s.vy) * 0.2; s.vz = -s.vz; Snd.play('parry', P.pos, 0.5); continue; }
        s.done = true; this.burst(s);
      }
    }
    this.shots = this.shots.filter(s => !s.done);
  },
  burst(s) { NSnd.play('orbhit', s, 0.6); for (let i = 0; i < 12; i++) FX.P(s.x, s.y, s.z, { vx: R(-3, 3), vy: R(-1, 3), vz: R(-3, 3), life: R(0.3, 0.6), size: R(0.06, 0.14), r: 0.6, g: 1.6, b: 2.2, cell: 0, drag: 2 }); },
  poison(t) { if (this.venomT <= 0) HUD.toast('Empoisonné', 'Le venin ronge vos points de vie', 'bad', true); this.venomT = Math.max(this.venomT, t); },
  /* ---------- corbeaux-spectres : posés, picorent, s'envolent ---------- */
  takeOff(b) {
    if (b.st !== 'perch') return; b.st = 'fly'; b.t = 0; const a = R(0, TAU); b.vx = Math.sin(a) * R(3, 6); b.vz = Math.cos(a) * R(3, 6); b.vy = R(3, 5); b.yaw = a;
    if (!this._cawT || Nature.t - this._cawT > 1.5) { this._cawT = Nature.t; NSnd.play('caw', b, 0.7); NSnd.play('flap', b, 0.6); }
    if (chance(0.22)) this.dropLoot('plume_spectre', 1, { x: b.x, y: b.y - 0.5, z: b.z });
  },
  updateBirds(dt, P) {
    for (const b of this.birds) {
      b.t += dt;
      if (b.st === 'perch') {
        const d = dist2D(b.x, b.z, P.pos.x, P.pos.z);
        if (d < ((P.speedNow || 0) > 3.2 ? 9 : 5)) { this.takeOff(b); for (const o of this.birds) if (o !== b && dist2D(o.x, o.z, b.x, b.z) < 6) this.takeOff(o); }
        if ((b.peck -= dt) <= -R(0.8, 3)) b.peck = 0.35;
        if (chance(dt * 0.15)) b.yaw += R(-1, 1);
        if (d > 120) b.gone = true;
        if (!NSave.d.seen['faune:corbeau'] && d < 16 && Cam.sphereVisible(b.x, b.y + 0.2, b.z, 0.5)) Nature.discover('faune', 'corbeau', FAUNA.corbeau.name);
      } else { b.vy += dt * 1.5; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.t > 8) b.gone = true; }
    }
    this.birds = this.birds.filter(b => !b.gone);
  },
  render() {
    const t = Nature.t, C = Cam.pos, A = Render.addParticles;
    for (const b of this.birds) {
      const d = dist3(b, C); if (d > 80 || !Cam.sphereVisible(b.x, b.y + 0.2, b.z, 0.6)) continue;
      const fly = b.st === 'fly', fl = fly ? Math.sin(b.t * 22) : 0, pk = b.peck > 0 ? Math.sin(b.peck / 0.35 * Math.PI) : 0;
      M4.compose(_B, b.x, b.y + 0.13, b.z, fly ? -0.25 : pk * 0.6, b.yaw, 0, 1, 1, 1);
      NR.tint = 1; NR.fade = 1;
      const blk = [0.05, 0.06, 0.07];
      NR.part('sph', 'fur', _B, 0, 0, 0, 0, 0, 0, 0.07, 0.07, 0.13, blk);
      NR.part('sph', 'fur', _B, 0, 0.06 - pk * 0.05, 0.11 + pk * 0.03, 0, 0, 0, 0.05, 0.05, 0.055, blk);
      NR.seg('cone', 'shell', _B, [0, 0.055 - pk * 0.05, 0.15 + pk * 0.03], [0, 0.03 - pk * 0.09, 0.24 + pk * 0.03], 0.016, [0.15, 0.15, 0.16]);
      for (const sx of [-1, 1]) {
        NR.glow(_B, sx * 0.03, 0.075 - pk * 0.05, 0.14 + pk * 0.03, 0.01, [0.5, 1, 0.75], 1.5);
        NR.part('sph', 'fur', _B, sx * (fly ? 0.18 : 0.06), fly ? fl * 0.12 : 0.02, -0.02, 0, 0, sx * (fly ? fl * 0.9 : 0.1), fly ? 0.18 : 0.03, 0.012, 0.09, blk);
      }
      NR.part('sph', 'fur', _B, 0, 0.0, -0.17, 0.2, 0, 0, 0.04, 0.01, 0.09, blk);
      if (!fly) { NR.seg('cyl', 'fur', _B, [0.025, -0.05, 0], [0.025, -0.13, 0.01], 0.006, [0.2, 0.2, 0.2]); NR.seg('cyl', 'fur', _B, [-0.025, -0.05, 0], [-0.025, -0.13, 0.01], 0.006, [0.2, 0.2, 0.2]); }
    }
    for (const L of this.loot) {
      const I = NITEMS[L.id], k = parseInt(I.col.slice(1), 16), c = [((k >> 16) & 255) / 255, ((k >> 8) & 255) / 255, (k & 255) / 255], y = L.y + (L.g ? Math.sin(L.t * 3) * 0.06 : 0);
      M4.compose(_B, L.x, y, L.z, 0, L.t * 2, 0, 1, 1, 1); NR.glow(_B, 0, 0, 0, 0.09, c, 1.6);
      A.push(L.x, y, L.z, 0.55, c[0], c[1], c[2], 0.55, L.t, 1, 5, false);
    }
    for (const s of this.shots) {
      M4.compose(_B, s.x, s.y, s.z, 0, 0, 0, 1, 1, 1); NR.glow(_B, 0, 0, 0, 0.13, s.back ? [1, 0.9, 0.5] : [0.5, 0.95, 1], 2.5);
      A.push(s.x, s.y, s.z, 0.9, 0.35, 0.8, 1.2, 0.6, 0, 1, 0, false);
      for (let i = 1; i < 6; i++) A.push(s.x - s.vx * i * 0.025, s.y - s.vy * i * 0.025, s.z - s.vz * i * 0.025, 0.2 - i * 0.025, 0.4, 0.9, 1.3, 0.7 - i * 0.1, 0, 1, 0, false);
    }
  },
  // les prédateurs sur le radar (rouge orangé quand ils chassent)
  radar(H, P) {
    const c = H.ctx, S = 300, R0 = 146, sc = H.radarSc || 2.6, yaw = CamCtl.yaw; if (!c || !this.list.length) return;
    c.save(); c.translate(S / 2, S / 2); c.rotate(-Math.PI / 2 - Math.atan2(Math.cos(yaw), Math.sin(yaw)));
    for (const a of this.list) {
      if (!a.alive || !a.hostile) continue; const X = (a.pos.x - P.pos.x) * sc, Y = (a.pos.z - P.pos.z) * sc; if (X * X + Y * Y > (R0 - 6) * (R0 - 6)) continue;
      c.beginPath(); c.arc(X, Y, a.boss ? 7 : 4.5, 0, TAU); c.fillStyle = a.alerted ? '#ff7a3d' : '#9a5a3c'; c.fill();
    }
    c.restore();
  },
  drawCreature(a) {
    const t = Nature.t, Dr = DRAW[a.type]; if (!Dr) return;
    this.camD = dist3(a.pos, Cam.pos);
    NR.tint = a.tint || 1; NR.fade = a.state === 'dead' && a.deadT > 2.4 ? Math.max(0.05, 1 - (a.deadT - 2.4) / 0.9) : 1;
    const hp = Dr(a, t);
    a.headPos = a.headPos || new V3(); a.headPos.set(hp.x, hp.y, hp.z);
    a.chestPos = a.chestPos || new V3(); a.chestPos.set(a.pos.x, a.pos.y + a.h * 0.6, a.pos.z);
    NR.tint = 1; NR.fade = 1;
  }
};
