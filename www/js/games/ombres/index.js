/**
 * Les ombres mystérieuses (jeu 12) : une série de 5 ombres. L'ombre est l'image de l'objet noircie ;
 * l'indice la colore légèrement, puis retire un mauvais choix.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, loadJson, seriesDots } from '../choices.js';
import { makeSeries, SERIES } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let question;
  let shadow;
  let errors;
  let hints;
  let destroyed = false;
  const state = { hintStep: 0 };

  async function boot() {
    try {
      content = await loadJson('content/games/ombres.json');
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries() {
    series = makeSeries(difficulty, content, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  function ask() {
    const q = series[index];
    shadow = h('span', { class: `o-shadow ${q.orientation ? `o-${q.orientation}` : ''}`, role: 'img', 'aria-label': 'une ombre', html: picto(q.target.picto, 120) });
    question = choiceQuestion(ctx, { model: h('div', { class: 'c-model o-wall' }, shadow), choices: q.choices, correctId: q.correctId, onCorrect: () => answered(q) });
    clear(root);
    root.append(h('div', { class: 'c-game shadows' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(q.prompt);
    state.hintStep = 0;
  }

  function answered(q) {
    errors += question.errors;
    shadow.classList.add('revealed');
    ctx.instruct(`Oui, c’est ${q.target.name} !`);
    index += 1;
    if (index < SERIES) ctx.afterSpeech(() => { if (!destroyed) ask(); }, 1100);
    else ctx.afterSpeech(finish, 900);
  }

  async function finish() {
    if (destroyed) return;
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { questions: SERIES } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!question) return;
      hints += 1;
      // Premier indice : l'ombre se colore légèrement ; ensuite, un mauvais choix disparaît.
      if (state.hintStep === 0) shadow.classList.add('tinted');
      else question.hint();
      state.hintStep += 1;
    },
    repeat() { if (series) ctx.instruct(series[index].prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
