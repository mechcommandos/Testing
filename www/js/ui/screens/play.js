/**
 * Écran de jeu : charge le module du jeu, ouvre une session liée au profil actif (figé), fournit au jeu
 * les services communs (consigne, sons, indice, fin d'activité) et ferme proprement la session en quittant.
 */
import { cheer, preloadCheer, sfx, speak, speaking, speechDone, stopClip, stopSpeaking } from '../../core/audio.js';
import { newBadges } from '../../core/badges.js';
import { award, newlyUnlocked } from '../../core/world.js';
import { companionSvg } from '../companion.js';
import { gameFinishedAt, LEVEL_PLAYS, levelPlays, suggestion } from '../../core/insights.js';
import { varyPraise } from '../../core/praise.js';
import { rng } from '../../core/random.js';
import { GameSession } from '../../core/tracker.js';
import { track } from '../../core/analytics.js';
import { confirmDialog, h } from '../dom.js';
import { picto } from '../pictos.js';
import { icon } from '../icons.js';
import { allowedHere, app, difficultyLabel, gameById, GAME_MODULES, isPlayable, pausedHere, readingMode, reducedMotion, updateWorld } from '../state.js';
import { pausedScreen, timeUpScreen } from './paused.js';
import { dailyLimit, isFamily, timeLeft } from '../../core/plan.js';
import { goalJustReached } from '../../core/goals.js';
import { companion, confetti, mascot, react } from '../mascot.js';

const TROPHY = '<svg viewBox="0 0 100 100" width="86" height="86" focusable="false"><path d="M30 14h40v22a20 20 0 0 1-40 0z" fill="#f5b82e" stroke="#c99a04" stroke-width="3"/><path d="M30 20H16q0 20 18 22M70 20h14q0 20-18 22" fill="none" stroke="#c99a04" stroke-width="5" stroke-linecap="round"/><path d="M44 56h12v14H44z" fill="#e9a800"/><rect x="30" y="70" width="40" height="12" rx="4" fill="#1a56b8"/><path d="M50 22l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fff"/></svg>';

export async function play(gameId) {
  const main = document.getElementById('main');
  const game = gameById(gameId);
  if (pausedHere()) return pausedScreen(main);
  if (game && isPlayable(game) && !allowedHere(gameId)) {
    main.replaceChildren(h('section', { class: 'narrow' }, h('h1', {}, 'Ce jeu est désactivé sur cet appareil'), h('p', {}, 'Un parent l’a désactivé depuis l’espace parent. Choisis un autre jeu !'), h('a', { class: 'btn', href: '#/' }, 'Retour à l’île')));
    return { destroy() {} };
  }
  if (!game || !isPlayable(game)) {
    main.replaceChildren(h('section', { class: 'narrow' }, h('h1', {}, 'Ce jeu n’est pas encore disponible'), h('p', {}, 'Il est en préparation. Reviens bientôt !'), h('a', { class: 'btn', href: '#/' }, 'Retour à l’île')));
    return { destroy() {} };
  }

  main.replaceChildren(h('section', { class: 'narrow loading' }, h('p', { class: 'lead', role: 'status' }, `Chargement : ${game.name}…`)));
  const profileId = app.activeProfile.id; // figé : un changement de profil ne peut pas réattribuer ces résultats
  const store = app.store;
  // Temps de jeu du jour (offre gratuite : 1 h sur l'appareil ; Famille : limite choisie pour l'enfant, s'il y en a une).
  const limitOf = () => ({ family: isFamily(app.device?.policy()), profile: app.activeProfile });
  const remaining = async (current = null) => {
    const { family, profile } = limitOf();
    const limit = dailyLimit({ family, profile });
    if (!limit) return Infinity;
    const all = limit.scope === 'profile' ? await store.sessionsForProfile(profileId) : await store.db.getAll('sessions');
    // La session en cours est comptée avec son temps à jour (sa copie enregistrée peut dater de 15 s).
    const sessions = current ? [...all.filter((x) => x.id !== current.id), current] : all;
    return timeLeft({ family, profile, sessions, now: Date.now() });
  };
  if ((await remaining()) <= 0) return timeUpScreen(main, dailyLimit(limitOf()));
  const progress = await store.getProgress(profileId, gameId);
  let difficulty = progress.difficulty ?? 0;
  const maxDifficulty = game.difficulties.length - 1;
  // Jeu terminé : une activité réussie au dernier niveau (calculé depuis les résultats, donc aussi après une synchronisation).
  let finishedAt = gameFinishedAt(await store.resultsForGame(profileId, gameId), game);
  // Parties réussies au niveau en cours : il en faut LEVEL_PLAYS pour passer au niveau suivant.
  let plays = levelPlays(await store.resultsForGame(profileId, gameId), difficulty);
  let autoTimer = null;
  let session = null;
  let instance = null;
  let activityOpen = false;
  let saveTimer = null;
  let limitTimer = null;
  let breakTimer = null;
  const pendingBadges = [];
  const moduleLoad = GAME_MODULES[gameId]();
  preloadCheer(); // son de victoire décodé à l'avance
  new Image().src = 'assets/img/mascot-bravo.png'; // image du « Bravo » déjà chargée au moment de gagner

  const instruction = h('p', { class: 'instruction', 'aria-live': 'polite' });
  const guide = companion({ size: 70, tappable: true }); // le compagnon de l'enfant, habillé comme dans son album
  const area = h('div', { class: 'game-area' });
  const hintBtn = h('button', { class: 'tool', 'aria-label': 'Indice', onclick: () => { hintBtn.classList.remove('pulse'); instance?.hint(); } }, h('span', { 'aria-hidden': 'true', html: icon('bulb', 26) }), h('span', {}, 'Indice'));
  const difficultyBar = h('div', { class: 'difficulty', role: 'group', 'aria-label': 'Difficulté' });
  const overlay = h('div', { class: 'celebrate', hidden: true });
  const finishedTag = h('span', { class: 'play-finished', hidden: !finishedAt, title: 'Les 3 niveaux sont réussis' }, h('span', { 'aria-hidden': 'true', html: icon('check', 16) }), ' Jeu terminé');
  const playsTag = h('span', { class: 'play-count', 'aria-live': 'polite' });
  const showPlays = () => {
    const done = Math.min(plays, LEVEL_PLAYS);
    playsTag.textContent = done >= LEVEL_PLAYS ? `Niveau réussi (${LEVEL_PLAYS} parties)` : `Partie ${done + 1} sur ${LEVEL_PLAYS}`;
  };
  showPlays();
  const stopAuto = () => { clearTimeout(autoTimer); autoTimer = null; };

  function renderDifficulty() {
    difficultyBar.replaceChildren(...game.difficulties.map((_, i) => h('button', {
      class: `chip${i === difficulty ? ' on' : ''}`, 'aria-pressed': i === difficulty ? 'true' : 'false', 'aria-label': difficultyLabel(game, i),
      // Sans lecture, les niveaux sont des points (1, 2, 3) : le nom du niveau est dit au toucher.
      onclick: () => { if (readingMode()) speak(difficultyLabel(game, i)); changeDifficulty(i); },
    }, difficultyLabel(game, i))));
  }

  async function changeDifficulty(next) {
    stopAuto();
    if (next === difficulty) return;
    // Changer de difficulté abandonne l'activité en cours sans la compter comme un échec.
    difficulty = next;
    await store.setDifficulty(profileId, gameId, difficulty);
    plays = levelPlays(await store.resultsForGame(profileId, gameId), difficulty);
    showPlays();
    renderDifficulty();
    await startSession();
  }

  /** Quitter le jeu : retour direct à l'île (ou vers l'album des autocollants). */
  async function quit(to = '#/') {
    if (activityOpen && !(await confirmDialog({ title: 'Quitter le jeu ?', text: 'L’activité en cours ne sera pas comptée, mais tout ce que tu as déjà terminé est gardé.', confirm: 'Quitter', cancel: 'Continuer à jouer' }))) return;
    location.hash = to;
  }

  // Bouton « Album » : les autocollants gagnés ; une pastille compte ceux qui attendent d'être collés.
  const albumCount = h('span', { class: 'isl-count', hidden: true });
  const albumBtn = h('button', { class: 'tool play-album', onclick: () => quit('#/album') }, h('span', { 'aria-hidden': 'true', html: icon('book', 26) }), h('span', {}, 'Album'), albumCount);
  const refreshAlbum = () => {
    const pocket = app.world?.stickers.filter((s) => !s.placed).length ?? 0;
    albumCount.hidden = !pocket;
    albumCount.textContent = String(pocket);
    albumBtn.setAttribute('aria-label', pocket ? `Mon album : ${pocket} autocollant${pocket > 1 ? 's' : ''} à coller` : 'Mon album d’autocollants');
  };
  refreshAlbum();

  main.replaceChildren(h('section', { class: 'play' },
    h('div', { class: 'play-bar' },
      h('button', { class: 'tool', 'aria-label': 'Retour à l’île', onclick: () => quit() }, h('span', { 'aria-hidden': 'true', html: icon('back', 26) }), h('span', {}, 'L’île')),
      h('div', { class: 'play-title' }, h('h1', {}, game.name), playsTag, finishedTag),
      h('div', { class: 'tools' },
        h('button', { class: 'tool', 'aria-label': 'Répéter la consigne', onclick: () => { stopSpeaking(); instance?.repeat(); } }, h('span', { 'aria-hidden': 'true', html: icon('sound', 26) }), h('span', {}, 'Répéter')),
        hintBtn,
        albumBtn)),
    difficultyBar,
    h('div', { class: 'coach' }, guide, instruction),
    area,
    overlay));
  renderDifficulty();

  let instructSeq = 0;
  let shownSeq = 0;
  const ctx = {
    root: area,
    get reducedMotion() { return reducedMotion(); },
    /**
     * Consigne affichée et lue. La voix ne coupe pas la phrase en cours : la consigne attend son tour,
     * et le texte change au moment où elle commence à être lue (jamais un texte plus ancien par-dessus un plus récent).
     */
    // display : texte affiché quand il doit différer du texte lu (ex. une phrase à trou qu'on entend en entier).
    instruct(rawText, { quiet = false, display: rawDisplay = null } = {}) {
      const { text, display } = varyPraise(rawText, rawDisplay); // « Oui » → Oui, Bien, Très bien ou Parfait
      const seq = ++instructSeq;
      const show = () => { if (seq > shownSeq) { shownSeq = seq; instruction.textContent = display ?? text; } };
      if (quiet) { if (speaking()) speechDone().then(show); else show(); return; }
      if (!speak(text, { onStart: show })) show();
    },
    /** Passer à la suite après un petit délai, et seulement quand la voix a fini de parler. */
    afterSpeech(fn, ms = 0) {
      setTimeout(() => speechDone().then(fn), ms);
    },
    /** Sons du jeu ; la mascotte réagit en même temps (saut de joie, petit « non » de la tête). */
    sfx(name) {
      sfx(name);
      if (name === 'good' || name === 'win') react(guide, 'happy');
      else if (name === 'soft') react(guide, 'oops');
    },
    offerHint() { hintBtn.classList.add('pulse'); },
    /** Reprise d'une partie en cours (plateau du memory…) : gardée dans la progression du profil pour ce jeu. */
    saveResume(value) { return store.saveResume(profileId, gameId, value); },
    activityStart() {
      activityOpen = true;
      session?.beginActivity();
    },
    async activityDone(payload) {
      activityOpen = false;
      ctx.lastSuccess = !!payload.success;
      const owner = session;
      if (payload.success && owner) owner.successes = (owner.successes ?? 0) + 1;
      // Compétences précisées par le jeu : seulement parmi celles déclarées pour ce jeu dans games.json.
      const skills = Array.isArray(payload.skills) ? payload.skills.filter((s) => game.skills.includes(s)) : null;
      const before = await store.resultsForProfile(owner.profileId);
      const result = await owner.recordActivity({ ...payload, skills });
      // Badges gagnés par cette activité : annoncés ici même, l'enfant ne passe pas forcément par « Mon aventure ».
      const after = await store.resultsForProfile(owner.profileId);
      const won = newBadges(before, after);
      // Offre Famille : l'objectif de la semaine vient d'être atteint → carte de récompense.
      const kid = app.activeProfile;
      if (payload.success && kid?.id === owner.profileId && isFamily(app.device?.policy()) && goalJustReached(kid.goal, before, after, app.catalogue.games, Date.now())) {
        pendingBadges.push({ kind: 'goal', reward: kid.goal.reward.trim() });
      }
      // Activité réussie : un autocollant pour l'album (ou une étoile dorée), et peut-être un accessoire débloqué.
      if (payload.success && app.world && app.activeProfile?.id === owner.profileId) {
        const { world, gained } = award(app.world, gameId, Date.now());
        if (gained) {
          const unlocked = newlyUnlocked(app.world, world);
          await updateWorld(world);
          refreshAlbum();
          pendingBadges.push(gained, ...unlocked.map((o) => ({ kind: 'outfit', ...o })));
        }
      }
      if (won.length) pendingBadges.push(...won.map((b) => ({ kind: 'badge', ...b })));
      const history = (await store.resultsForGame(owner.profileId, gameId)).filter((r) => r.difficulty === owner.difficulty).sort((a, b) => a.createdAt - b.createdAt);
      ctx.lastSuggestion = suggestion(history, { difficulty: owner.difficulty, maxDifficulty: game.difficulties.length - 1 });
      if (owner.difficulty === difficulty) { plays = history.filter((r) => r.success).length; showPlays(); }
      return result;
    },
    /**
     * Fin d'une activité. Activité réussie : le niveau est terminé, et on passe tout seul au niveau suivant (après
     * la fête et la voix ; « Rejouer ce niveau » l'empêche). Au dernier niveau : « Tu as terminé le jeu ! », noté pour
     * l'espace parent. levelDone : false quand le niveau a encore des étapes (plateaux du robot des labyrinthes).
     */
    celebrate(next, note = null, { levelDone = true } = {}) {
      stopAuto();
      const success = ctx.lastSuccess !== false;
      // Un niveau est réussi après LEVEL_PLAYS parties gagnées ; avant, on enchaîne la partie suivante.
      const levelComplete = success && levelDone && plays >= LEVEL_PLAYS;
      const again = success && levelDone && !levelComplete;
      const advance = levelComplete && difficulty < maxDifficulty;
      const gameDone = levelComplete && difficulty === maxDifficulty;
      const firstTime = gameDone && !finishedAt;
      if (gameDone && !finishedAt) {
        finishedAt = Date.now();
        finishedTag.hidden = false;
      }
      const close = (fn) => () => { stopAuto(); overlay.hidden = true; fn(); };
      const advice = !success && ctx.lastSuggestion === 'help' && difficulty > 0
        ? h('div', { class: 'advice' }, h('p', {}, 'Tu peux utiliser l’indice, ou t’entraîner sur un niveau plus doux.'),
          h('button', { class: 'btn ghost', onclick: close(() => changeDifficulty(difficulty - 1)) }, `Revenir à « ${difficultyLabel(game, difficulty - 1)} »`))
        : null;
      const party = mascot({ size: 130, pose: 'bravo' }); // (ne pas l'appeler « cheer » : ce nom est la fonction du son de victoire)
      let title = 'Bravo !';
      let text = note;
      let buttons;
      let say = null;
      if (gameDone) {
        title = firstTime ? 'Tu as terminé le jeu !' : 'Bravo, encore réussi !';
        text = `Tu as réussi les ${game.difficulties.length} niveaux de « ${game.name} ».`;
        say = firstTime ? `Bravo ! Tu as terminé tout le jeu : ${game.name} !` : null;
        buttons = [
          h('button', { class: 'btn big', onclick: close(() => { location.hash = '#/'; }) }, 'Choisir un autre jeu'),
          h('button', { class: 'btn ghost', onclick: close(next) }, 'Rejouer ce niveau'),
          h('button', { class: 'btn ghost', onclick: close(() => changeDifficulty(0)) }, 'Recommencer au niveau 1'),
        ];
      } else if (advance) {
        const nextName = difficultyLabel(game, difficulty + 1);
        text = note ?? `Niveau « ${difficultyLabel(game, difficulty)} » terminé !`;
        const go = h('button', { class: 'btn big level-next', onclick: close(() => changeDifficulty(difficulty + 1)) }, h('span', {}, `Niveau suivant : « ${nextName} »`), h('span', { class: 'level-bar', 'aria-hidden': 'true' }));
        buttons = [go, h('button', { class: 'btn ghost', onclick: close(next) }, 'Rejouer ce niveau')];
      } else if (again) {
        title = ['Bravo !', 'Super !', 'Génial !', 'Très bien !'][plays % 4];
        text = note ?? `Partie ${plays} sur ${LEVEL_PLAYS} du niveau « ${difficultyLabel(game, difficulty)} ».`;
        buttons = [h('button', { class: 'btn big level-next', onclick: close(next) }, h('span', {}, 'Partie suivante'), h('span', { class: 'level-bar', 'aria-hidden': 'true' }))];
      } else {
        buttons = [h('button', { class: 'btn big', onclick: close(next) }, levelDone ? 'Encore !' : 'Continuer')];
      }
      overlay.replaceChildren(h('div', { class: `celebrate-card${gameDone ? ' game-done' : ''}`, role: 'dialog', 'aria-label': 'Bravo' },
        party,
        gameDone ? h('span', { class: 'trophy', 'aria-hidden': 'true', html: TROPHY }) : null,
        h('p', { class: 'bravo' }, title),
        text ? h('p', {}, text) : null,
        advice,
        h('div', { class: 'celebrate-actions' }, buttons)));
      overlay.hidden = false;
      react(party, 'cheer');
      react(guide, 'happy');
      confetti(document.body);
      if (gameDone && firstTime && !ctx.reducedMotion) setTimeout(() => { if (!overlay.hidden) confetti(document.body); }, 900);
      // La dernière phrase (« Oui : chat ! ») se termine avant la musique de victoire.
      speechDone().then(() => {
        if (overlay.hidden) return;
        cheer();
        if (say) setTimeout(() => { if (!overlay.hidden) speak(say); }, 1600);
        if (advance || again) {
          // Passage automatique au niveau (ou à la partie) suivant, une fois la fête finie (barre de progression dans le bouton).
          const wait = advance ? 7000 : 4000;
          overlay.querySelector('.level-bar')?.style.setProperty('--wait', `${wait}ms`);
          overlay.querySelector('.level-next')?.classList.add('counting');
          autoTimer = setTimeout(() => { if (!overlay.hidden) overlay.querySelector('.level-next')?.click(); }, wait);
        }
      });
      overlay.querySelector('.btn.big').focus();
      if (pendingBadges.length) setTimeout(showBadges, ctx.reducedMotion ? 600 : 1800);
    },
  };

  /** Notification « Nouveau badge » : le badge, son nom, ce qui l'a fait gagner, et une petite fanfare. */
  /**
   * Récompenses de la partie, l'une après l'autre en haut de l'écran : autocollant gagné (ou étoile dorée),
   * accessoire du compagnon débloqué, badge. Chacune avec une petite fanfare ; la voix attend la fin du « Oh Yeah ! ».
   */
  function showBadges() {
    const won = pendingBadges.splice(0);
    if (!won.length || !main.isConnected) return;
    won.forEach((r, i) => setTimeout(() => {
      const card = rewardCard(r);
      const note = h('div', { class: `badge-pop reward-${r.kind}`, role: 'status', 'aria-live': 'polite' },
        h('span', { class: 'badge-pop-icon', 'aria-hidden': 'true', html: card.art }),
        h('div', {}, h('p', { class: 'badge-pop-title' }, card.title), h('p', { class: 'badge-pop-name' }, card.name), card.text ? h('p', { class: 'small' }, card.text) : null),
        h('button', { class: 'badge-pop-close', 'aria-label': 'Fermer', onclick: () => note.remove() }, '×'));
      document.body.append(note);
      sfx('badge');
      setTimeout(() => note.classList.add('leaving'), 4600);
      setTimeout(() => note.remove(), 5200);
    }, i * 2200));
    // Pas de voix pour un autocollant, une étoile dorée ou un accessoire (la carte et la fanfare suffisent) :
    // seuls les badges et l'objectif de la semaine sont lus.
    const spokenText = won.filter((r) => !['sticker', 'star', 'outfit'].includes(r.kind)).map((r) => rewardCard(r).say).join(' ');
    if (spokenText) setTimeout(() => speak(spokenText), 2600);
  }

  function rewardCard(r) {
    if (r.kind === 'goal') return { art: picto('cadeau', 64), title: 'Objectif de la semaine atteint !', name: r.reward ? `Ta récompense : ${r.reward}` : 'Bravo, champion !', text: r.reward ? 'Montre-le à ton parent.' : null, say: r.reward ? `Bravo ! Tu as atteint ton objectif de la semaine. Ta récompense : ${r.reward}. Montre-le à ton parent !` : 'Bravo ! Tu as atteint ton objectif de la semaine !' };
    if (r.kind === 'sticker') return { art: picto(r.picto, 64), title: 'Nouvel autocollant !', name: 'Pour ton album', text: 'Va le coller dans « Mon album ».', say: 'Un nouvel autocollant pour ton album !' };
    if (r.kind === 'star') return { art: picto('etoile', 64), title: 'Étoile dorée !', name: `${r.count} étoile${r.count > 1 ? 's' : ''} pour ce jeu`, text: 'Tu as tous les autocollants de ce jeu.', say: 'Une étoile dorée !' };
    if (r.kind === 'outfit') return { art: companionSvg({ outfit: { [r.slot]: r.id }, size: 64 }), title: 'Nouvel accessoire !', name: r.label.replace(/^./, (c) => c.toUpperCase()), text: `Pour habiller ${app.world?.companion.name ?? 'ton compagnon'}.`, say: `${app.world?.companion.name ?? 'Ton compagnon'} a gagné ${r.label} !` };
    return { art: picto(r.icon, 64), title: 'Nouveau badge !', name: r.label, text: r.description, say: `Nouveau badge : ${r.label} !` };
  }

  /** Termine la session locale et le signale à la mesure d'audience (sans identifiant d'enfant). */
  function endSession(s, reason) {
    if (!s || s.ended) return Promise.resolve();
    const p = s.end(reason);
    track('game_end', {
      gameId, difficulty: Number.isInteger(s.difficulty) ? s.difficulty : undefined, sessionRef: s.id, endReason: reason,
      activities: s.activities, activeMs: Math.round(s.activeMs), success: s.successes ?? 0,
    });
    return p;
  }

  async function startSession() {
    stopAuto();
    stopSpeaking();
    stopClip();
    instance?.destroy();
    if (session) await endSession(session, activityOpen ? 'difficulty-change' : 'completed');
    activityOpen = false;
    overlay.hidden = true;
    session = await new GameSession({ store, profileId, gameId, difficulty, skills: game.difficultySkills?.[difficulty] ?? game.skills, contentVersion: app.catalogue.version }).attach().start();
    track('game_start', { gameId, difficulty: Number.isInteger(difficulty) ? difficulty : undefined, sessionRef: session.id });
    const freshProgress = await store.getProgress(profileId, gameId);
    const { createGame } = await moduleLoad;
    instance = createGame({ ...ctx, difficulty, progress: freshProgress, random: rng((Date.now() ^ (Math.random() * 1e9)) >>> 0) });
  }

  await startSession();

  // Le temps actif est sauvegardé régulièrement (une fermeture brutale perd au plus 15 s).
  saveTimer = setInterval(() => { if (!session) return; session.tick(); store.saveSession(session.record()); }, 15_000);
  // Limite du jour : prévenir 5 minutes avant, puis arrêter le jeu (l'activité en cours n'est pas comptée).
  let warned = false;
  limitTimer = setInterval(async () => {
    if (!session) return;
    session.tick();
    const left = await remaining(session.record());
    if (left === Infinity) return;
    if (left <= 0) {
      clearInterval(limitTimer);
      stopAuto();
      stopSpeaking();
      instance?.destroy();
      instance = null;
      await endSession(session, 'time-limit');
      session = null;
      activityOpen = false;
      speak('Tu as bien joué aujourd’hui ! On se retrouve demain.');
      timeUpScreen(main, dailyLimit(limitOf()));
    } else if (left <= 5 * 60_000 && !warned) {
      warned = true;
      speak('Encore cinq minutes de jeu aujourd’hui.');
      const note = h('div', { class: 'badge-pop', role: 'status' }, h('p', { class: 'badge-pop-name' }, 'Encore 5 minutes de jeu aujourd’hui'));
      document.body.append(note);
      setTimeout(() => note.remove(), 6000);
    }
  }, 20_000);
  const breakMinutes = app.settings.breakReminderMin;
  if (breakMinutes > 0) {
    let reminded = false;
    breakTimer = setInterval(() => {
      if (!reminded && session && session.activeMs >= breakMinutes * 60_000) {
        reminded = true;
        overlay.replaceChildren(h('div', { class: 'celebrate-card' }, h('p', { class: 'bravo' }, 'Et si on faisait une pause ?'), h('p', {}, 'Tu peux revenir plus tard : tout est gardé.'), h('button', { class: 'btn', onclick: () => { overlay.hidden = true; } }, 'D’accord')));
        overlay.hidden = false;
        speak('Et si on faisait une pause ?');
      }
    }, 30_000);
  }
  const onPageHide = () => { endSession(session, 'closed'); };
  window.addEventListener('pagehide', onPageHide);

  return {
    async destroy() {
      stopAuto();
      clearInterval(saveTimer);
      clearInterval(limitTimer);
      clearInterval(breakTimer);
      window.removeEventListener('pagehide', onPageHide);
      stopSpeaking();
      stopClip();
      instance?.destroy();
      await endSession(session, activityOpen ? 'quit' : 'completed');
    },
  };
}
