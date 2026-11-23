/**
 * Les animaux et leurs sons (jeu 2) : une série de 4 questions à choix. Voir rules.js pour les modes.
 */
import { playClip, soundOn, speechOn, stopClip } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, listenButton, loadClips, loadJson, pic, seriesDots } from '../choices.js';
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
      [content, clips] = await Promise.all([loadJson('content/games/animaux-sons.json'), loadClips()]);
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries(forcedMode = null) {
    mode = forcedMode ?? pickMode(difficulty, { content, clips, soundOn: soundOn(), speechOn: speechOn() });
    series = makeSeries(difficulty, mode, content, random);
    index = 0;
    errors = 0;
    hints = 0;
    if (!forcedMode) ctx.activityStart();
    ask();
  }

  function ask() {
    const q = series[index];
    question = choiceQuestion(ctx, { model: modelFor(q), choices: q.choices, correctId: q.correctId, onCorrect: () => answered(q) });
    clear(root);
    root.append(h('div', { class: 'c-game animals' }, seriesDots(SERIES, index), question.node));
    announce();
  }

  function modelFor(q) {
    if (q.mode === 'cry') return listenButton(announce);
    if (q.mode === 'name') return listenButton(announce);
    return h('div', { class: 'c-model' }, pic(q.target.picto), h('span', { class: 'c-caption' }, q.target.name));
  }

  async function announce() {
    const q = series[index];
    if (q.mode !== 'cry') return ctx.instruct(q.prompt);
    ctx.instruct(q.prompt, { quiet: true });
    const clip = clips[q.target.cry];
    const played = await playClip(clip?.file, { end: clip?.end ?? null });
    if (!played && !destroyed && series[index] === q) {
      // Cri illisible : nouvelle série dans un autre mode, sans rien compter comme une erreur.
      newSeries(fallbackMode(mode, { speechOn: speechOn() }));
    }
  }

  function answered(q) {
    errors += question.errors;
    stopClip();
    ctx.instruct(q.mode === 'habitat' ? `Oui, ${q.target.name} vit dans ${content.habitats.find((x) => x.id === q.target.habitat).label} !` : `Oui, c’est ${q.target.name} !`);
    index += 1;
    if (index < SERIES) ctx.afterSpeech(() => { if (!destroyed) ask(); }, 900);
    else finish();
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors, attempts: SERIES, level: null, skills: SKILLS[mode],
      data: { mode, placeholderAudio: Object.values(clips).some((c) => c.game === 'animaux-sons' && c.placeholder) },
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
