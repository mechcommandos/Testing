/**
 * L'île des lettres et des mots (jeu 4) : une série de 5 questions à choix. Voir rules.js pour les modes.
 */
import { playClip, soundOn, speak, speechOn, stopClip } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { choiceQuestion, isRealClip, listenButton, loadClips, loadJson, pic, seriesDots } from '../choices.js';
import { fallbackMode, makeSeries, pickMode, SERIES, SKILLS } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let clips = {};
  let mode;
  let series;
  let index;
  let question;
  let errors;
  let hints;
  let destroyed = false;

  async function boot() {
    try {
      [content, clips] = await Promise.all([loadJson('content/games/ile-lettres.json'), loadClips()]);
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries(forcedMode = null) {
    mode = forcedMode ?? pickMode(difficulty, { content, clips, soundOn: soundOn() });
    series = makeSeries(difficulty, mode, content, random);
    index = 0;
    errors = 0;
    hints = 0;
    if (!forcedMode) ctx.activityStart();
    ask();
  }

  function modelFor(q) {
    if (q.mode === 'sound') return listenButton(announce);
    if (q.mode === 'visual') return h('div', { class: 'c-model' }, h('span', { class: 'c-letter', 'aria-hidden': 'true' }, q.target.upper));
    if (q.mode === 'combine') {
      return h('div', { class: 'c-model' }, h('span', { class: 'c-letter small', 'aria-hidden': 'true' }, `${q.target.consonant} + ${q.target.vowel}`));
    }
    return h('div', { class: 'c-model word' },
      pic(q.target.picto),
      h('span', { class: 'c-word', 'aria-label': `mot à compléter : ${q.word}` }, q.display.map((s) => (s ? h('span', {}, s) : h('span', { class: 'gap' }, '＿')))),
      h('button', { class: 'c-listen small', 'aria-label': 'Écouter le mot', onclick: () => sayWord(q) }, h('span', { 'aria-hidden': 'true', html: icon('sound', 26) })));
  }

  function ask() {
    const q = series[index];
    question = choiceQuestion(ctx, { model: modelFor(q), choices: q.choices, correctId: q.correctId, onCorrect: () => answered(q) });
    clear(root);
    root.append(h('div', { class: 'c-game letters' }, seriesDots(SERIES, index), question.node));
    announce();
  }

  /** Mot : vrai enregistrement s'il existe, sinon la voix de synthèse (l'image reste le repère principal). */
  async function sayWord(q) {
    if (isRealClip(clips, q.sound) && (await playClip(clips[q.sound].file))) return;
    if (speechOn()) speak(q.word);
  }

  async function announce() {
    const q = series[index];
    if (q.mode === 'word') {
      ctx.instruct(q.prompt, { quiet: true });
      return sayWord(q);
    }
    if (q.mode !== 'sound') return ctx.instruct(q.prompt);
    ctx.instruct(q.prompt, { quiet: true });
    const played = await playClip(clips[q.sound]?.file);
    if (!played && !destroyed && series[index] === q) newSeries(fallbackMode(difficulty));
  }

  function answered(q) {
    errors += question.errors;
    stopClip();
    ctx.instruct(q.mode === 'word' ? `Oui : ${q.word} !` : 'Oui !', { quiet: q.mode === 'sound' });
    index += 1;
    if (index < SERIES) ctx.afterSpeech(() => { if (!destroyed) ask(); }, 900);
    else finish();
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors, attempts: SERIES, level: null, skills: SKILLS[mode],
      data: { mode, placeholderAudio: Object.values(clips).some((c) => c.game === 'ile-lettres' && c.placeholder) },
    });
    if (!destroyed) ctx.celebrate(() => newSeries());
  }

  boot();

  return {
    hint() { if (question) { hints += 1; question.hint(); } },
    repeat() { if (series) announce(); },
    destroy() { destroyed = true; stopClip(); clear(root); },
  };
}
