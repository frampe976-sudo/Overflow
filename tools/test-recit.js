// Test du Récit (dialogues, drapeaux, quêtes) dans le vrai jeu, simulation pas à pas sans rendu.
// Usage : node tools/build.js && node tools/test-recit.js [dossier-captures]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const ok = [], ko = [];
const check = (name, cond, info) => (cond ? ok : ko).push(name + (cond ? '' : ' → ' + JSON.stringify(info)));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__TEST_HOLD = true; try { localStorage.clear(); } catch (e) { } });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForSelector('#scr-title:not([hidden])', { timeout: 120000 });
  const E = f => p.evaluate(f);
  const shot = async name => { if (!process.argv[2]) return; await E(() => { if (__OF.Talk.on) { __OF.Talk.frame(); __OF.Talk.skip(); } __OF.test.render(); }); await p.screenshot({ path: path.join(process.argv[2], name + '.png'), timeout: 120000 }); };
  check('le menu titre propose « La Cité engloutie »', await E(() => !!document.querySelector('#menu-title [data-go="recit"]')), null);
  await p.click('#menu-title [data-go="recit"]');
  await E(() => { const T = __OF.test; for (let i = 0; i < 20 && __OF.Game.mode !== 'play'; i++) T.step(10); T.step(30); });
  // helpers: talk to someone, pick a choice by its words, run frames
  await E(() => {
    __OF.Game._noPauseOnUnlock = true; // headless: the pointer lock comes and goes
    window.S = __OF.Story; window.TK = __OF.Talk; window.run = n => __OF.test.step(n);
    window.talk = id => { const a = S.npcs[id], P = __OF.Game.player; P.pos.set(a.pos.x - 1.6, a.pos.y, a.pos.z - 1.6); return TK.open(id); };
    window.pick = w => { const i = TK.opts.findIndex(o => o.t.indexOf(w) >= 0); if (i < 0) throw new Error('choix introuvable : ' + w + ' on=' + TK.on + ' mode=' + __OF.Game.mode + ' dans ' + TK.nid + ' [' + TK.opts.map(o => o.t).join(' | ') + ']'); TK.choose(i); return TK.nid; };
    window.cont = () => { let n = 0; while (TK.on && TK.opts.length === 1 && TK.opts[0].t === 'Continuer' && n++ < 10) TK.choose(0); };
    window.go = (x, z) => { const P = __OF.Game.player, s = __OF.World.safeSpot(x, z, P.r); P.pos.set(s.x, s.y, s.z); P.vel.set(0, 0, 0); run(2); };
  });
  const st = await E(() => ({ mode: __OF.Game.mode, story: !!__OF.Game.def.story, npcs: Object.keys(S.npcs).sort().join(), eveil: S.step('eveil'), obj: __OF.Game.mission.objective }));
  check('le récit démarre avec le prologue', st.mode === 'play' && st.story && st.eveil === 'anselme', st);
  check('les PNJ du chapitre I sont dans la ville', ['anselme', 'okafor', 'fredo', 'nadia', 'petronille', 'bastien', 'margot', 'corentin'].every(k => st.npcs.indexOf(k) >= 0) && st.npcs.indexOf('vasseur') < 0, st.npcs);
  check('les PNJ ne prennent pas de coups', await E(() => S.npcs.anselme.hittable === false), null);
  check('« Parler » apparaît près d’un PNJ', await E(() => { talk('anselme'); TK.close(); run(3); const c = __OF.Game.player.interactCandidate(); return c && c.text; }) === 'Parler · Anselme Roux', await E(() => { const c = __OF.Game.player.interactCandidate(); return c && c.text; }));
  // prologue: Anselme, then Okafor
  const a1 = await E(() => { const op = talk('anselme'); const r = { op, m0: __OF.Game.mode, mode: __OF.Game.mode, name: document.getElementById('tk-name').textContent, nid: TK.nid }; cont(); r.hub = TK.nid; pick('Qui êtes-vous'); cont(); r.codex = S.data().codex.slice(); return r; });
  check('le dialogue s’ouvre (mode talk, nom affiché)', a1.mode === 'talk' && a1.name === 'Anselme Roux' && a1.nid === 'eveil' && a1.hub === 'hub', a1);
  check('une réponse débloque une entrée du codex', a1.codex.indexOf('lampistes') >= 0, a1.codex);
  await shot('1-dialogue-anselme');
  const a2 = await E(() => { const hidden = !TK.opts.some(o => o.t.indexOf('Qui êtes-vous') >= 0); pick('Que dois-je faire'); cont(); pick('J’y vais'); return { hidden, step: S.step('eveil'), mode: __OF.Game.mode }; });
  check('une question déjà posée disparaît', a2.hidden, a2);
  check('fin du dialogue : retour au jeu, quête avancée', a2.mode === 'play' && a2.step === 'okafor', a2);
  const lock = await E(() => { talk('okafor'); cont(); const o = TK.opts.find(x => x.need && x.need.might); const r = { locked: o && o.locked, n: TK.opts.length }; TK.choose(TK.opts.indexOf(o)); r.still = TK.nid; return r; });
  check('un choix [Puissance 2] est verrouillé sans points de Destin', lock.locked === true && lock.still === 'intro', lock);
  const o1 = await E(() => { pick('désolé'); cont(); pick('Par où'); cont(); const r = { eveil: S.q('eveil').state, cloche: S.step('cloche'), appr: S.approval('okafor') }; pick('J’y vais'); return r; });
  check('Okafor : prologue terminé, « La Cloche engloutie » commence', o1.eveil === 'done' && o1.cloche === 'rumeurs', o1);
  check('approbation d’Okafor +10', o1.appr === 10, o1);
  const sk = await E(() => { const c = __OF.World.spots.cemetery, P = __OF.Game.player, p0 = P.pos.clone ? P.pos.clone() : { x: P.pos.x, z: P.pos.z }; go(c.x + 20, c.z); run(3); const r = S.step('cloche'); S.data().quests.cloche.step = 'rumeurs'; S.enter('cloche'); go(p0.x, p0.z); run(3); return r; });
  check('aller au cimetière sans enquêter lance quand même le combat', sk === 'combat', sk);
  // a Destin point opens the locked choices: Fredo, with Finesse
  const f1 = await E(() => { const D = __OF.Destin; D.buy('breath'); D.buy('breath'); talk('fredo'); cont(); const o = TK.opts.find(x => x.need && x.need.finesse); const r = { locked: o.locked }; pick('mains vertes'); cont(); r.nid = TK.nid; r.step = S.step('cloche'); r.flag = S.flag('fredo_respect'); TK.close(); D.reset(); return r; });
  check('avec 2 points en Finesse, le choix s’ouvre et fait avancer la quête', f1.locked === false && f1.flag === true && f1.step === 'cimetiere', f1);
  // Nadia gives the side quest
  const n1 = await E(() => { talk('nadia'); cont(); pick('Qui êtes-vous'); cont(); pick('chance'); cont(); pick('Je m’en occupe'); return { sel: S.step('sel'), appr: S.approval('nadia') }; });
  check('Nadia confie « Le Sel volé » (+10 d’approbation)', n1.sel === 'quai' && n1.appr === 10, n1);
  // the cemetery: going there starts the fight
  const c1 = await E(() => { const c = __OF.World.spots.cemetery; go(c.x + 20, c.z); run(5); const rt = S.rt.cloche; return { step: S.step('cloche'), foes: rt && rt.foes.length, obj: __OF.Game.mission.objective }; });
  check('au cimetière, les Enfants de la Marée attaquent', c1.step === 'combat' && c1.foes === 5, c1);
  const c2 = await E(() => { for (const a of S.rt.cloche.foes) { a.alive = false; a.removed = true; } run(3); return { step: S.step('cloche'), maelle: !!S.npcs.maelle }; });
  check('les cultistes vaincus, Sœur Maelle se rend', c2.step === 'maelle' && c2.maelle, c2);
  const m1 = await E(() => { talk('maelle'); cont(); pick('Qui est le Héraut'); cont(); pick('Pars.'); const r = { flag: S.flag('maelle'), lettre: S.flag('lettre'), step: S.step('cloche'), nadia: S.approval('nadia'), okafor: S.approval('okafor') }; TK.close(); return r; });
  check('épargner Maelle : drapeau, lettre, approbations', m1.flag === 'epargnee' && m1.lettre === true && m1.step === 'lettre' && m1.nadia === 20 && m1.okafor === 5, m1);
  await shot('2-quete-cimetiere');
  // the letter, Vasseur, the report
  const l1 = await E(() => { talk('okafor'); cont(); pick('Lui tendre'); cont(); pick('lui parler moi-même'); cont(); pick('Partir'); S.sync(); return { step: S.step('cloche'), vasseur: !!S.npcs.vasseur }; });
  check('la lettre de Vasseur : l’échevin apparaît à l’Hôtel des Échevins', l1.step === 'vasseur' && l1.vasseur, l1);
  const v1 = await E(() => { talk('vasseur'); cont(); pick('Montrer la lettre'); cont(); pick('Pourquoi le Phare'); cont(); pick('Feindre'); cont(); TK.close(); return { flag: S.flag('vasseur'), step: S.step('cloche') }; });
  check('Vasseur : feindre le marché', v1.flag === 'feint' && v1.step === 'rapport', v1);
  const r1 = await E(() => { const xp0 = __OF.Save.data.xp; talk('anselme'); cont(); pick('déjà ça'); cont(); pick('Partir'); return { cloche: S.q('cloche').state, fin: S.flag('chap1_fin'), xp: __OF.Save.data.xp - xp0, big: document.getElementById('big1').textContent }; });
  check('rapport à Anselme : fin du chapitre I, expérience gagnée', r1.cloche === 'done' && r1.fin === true && r1.xp === 500 && r1.big === 'Fin du chapitre I', r1);
  // the stolen salt: fight at the docks, the crate, then the choice (give it back to Nadia)
  const s1 = await E(() => { S.enter('sel'); const rt = S.rt.sel; const crate = rt.crate; go(crate.pos.x, crate.pos.z); run(10); return { step: S.step('sel'), caisse: S.flag('sel_caisse'), foes: rt.foes.length }; });
  check('Quai des Grues : trois lames, la caisse ramassée', s1.step === 'choix' && s1.caisse === true && s1.foes === 3, s1);
  const s2 = await E(() => { talk('nadia'); cont(); pick('Elle est à vous'); cont(); TK.close(); return { sel: S.q('sel').state, flag: S.flag('sel'), nadia: S.approval('nadia') }; });
  check('rendre la caisse à Nadia : quête terminée, Nadia +15', s2.sel === 'done' && s2.flag === 'nadia' && s2.nadia === 35, s2);
  // the Weaver: three tears of salt
  const p1 = await E(() => { talk('petronille'); cont(); pick('Tendre la main'); cont(); pick('Vous pouvez essayer'); cont(); pick('J’irai'); const r = { fils: S.step('fils'), picks: S.rt.fils.picks.length }; for (const k of S.rt.fils.picks) { go(k.pos.x, k.pos.z); run(6); } r.after = S.step('fils'); r.n = S.flag('larmes'); return r; });
  check('Pétronille : trois larmes de sel à ramasser', p1.fils === 'larmes' && p1.picks === 3 && p1.after === 'retour' && p1.n === 3, p1);
  const p2 = await E(() => { talk('petronille'); cont(); pick('Merci'); return { fils: S.q('fils').state, ret: S.flag('retissage'), seize: S.data().codex.indexOf('seize') >= 0 }; });
  check('la lecture révèle Seize et débloque le re-tissage du Destin', p2.fils === 'done' && p2.ret === true && p2.seize, p2);
  const p3 = await E(() => { const D = __OF.Destin; D.buy('brute'); talk('petronille'); pick('Dénouez'); pick('Oui'); TK.close(); return D.spent(); });
  check('Pétronille dénoue le Destin (talents remis à zéro)', p3 === 0, p3);
  // rumours of the square
  const q1 = await E(() => { for (const k of ['bastien', 'margot', 'corentin']) { talk(k); cont(); TK.close(); } return { q: S.q('rumeurs').state, codex: S.data().codex.length }; });
  check('les trois habitants écoutés : quête des rumeurs terminée', q1.q === 'done', q1);
  // the journal
  await E(() => { __OF.Game.pause(); });
  await p.click('#menu-pause [data-go="journal"]');
  const j = await E(() => ({ shown: !document.getElementById('scr-journal').hidden, quests: document.querySelectorAll('#jbody .jq').length }));
  check('le journal liste les quêtes', j.shown && j.quests === 5, j);
  await p.click('#jtabs [data-tab="codex"]');
  const jc = await E(() => document.querySelectorAll('#jbody .jq').length);
  check('le codex se remplit', jc >= 12, jc);
  await p.click('#jtabs [data-tab="rel"]');
  await shot('3-journal');
  check('relations : Nadia et Okafor', await E(() => document.querySelectorAll('#jbody .jq.rel').length) === 2, null);
  // the save keeps everything: a new run of the story mode starts where we left it
  const sv = await E(() => { __OF.Game.startMission(__OF.RECIT); run(5); const d = JSON.parse(localStorage.getItem(Object.keys(localStorage)[0])); return { quests: Object.keys(d.story.quests).length, maelle: !!S.npcs.maelle, mp: S.npcs.maelle && Math.round(S.npcs.maelle.pos.x), chapel: Math.round(__OF.World.spots.chapel.x) }; });
  check('sauvegarde : tout est gardé, Maelle épargnée prie à la chapelle', sv.quests === 5 && sv.maelle && Math.abs(sv.mp - sv.chapel) < 8, sv);
  check('aucune erreur JavaScript', errs.length === 0, errs);
  console.log(ok.map(s => '✓ ' + s).concat(ko.map(s => '✗ ' + s)).join('\n'));
  await b.close(); process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
