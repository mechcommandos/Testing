/**
 * La planète des bons gestes (jeu 9) : trier des objets selon un référentiel affiché, ou choisir le geste utile.
 * L'explication est donnée après chaque réponse trouvée. L'indice retire un mauvais choix.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, loadJson, pic, seriesDots } from '../choices.js';
import { makeSeries } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let question;
  let errors;
  let hints;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/bons-gestes.json');
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

  function referentialNote() {
    if (difficulty === 2) return null;
    const r = content.referential;
    return h('p', { class: 'small g9-ref' }, `Règles : ${r.label}. ${r.notice}`);
  }

  function ask() {
    const q = series[index];
    const model = q.kind === 'item'
      ? h('div', { class: 'c-model' }, pic(q.item.picto), h('span', { class: 'c-caption' }, q.item.name))
      : h('div', { class: 'c-model' }, pic(q.situation.picto), h('span', { class: 'c-caption' }, q.situation.text));
    question = choiceQuestion(ctx, { model, choices: q.choices, correctId: q.correctId, layout: q.kind === 'situation' ? 'list' : '', onCorrect: () => answered(q) });
    clear(root);
    root.append(h('div', { class: 'c-game gestures' }, seriesDots(series.length, index), referentialNote(), question.node));
    ctx.instruct(q.prompt);
  }

  function answered(q) {
    errors += question.errors;
    const why = q.kind === 'item' ? q.item.why : q.situation.options.find((o) => o.best).why;
    ctx.instruct(why);
    index += 1;
    const next = index < series.length ? ask : finish;
    root.querySelector('.c-question').append(h('p', { class: 'notice c-why' }, why),
      h('button', { class: 'btn big c-continue', onclick: () => { if (!destroyed) next(); } }, index < series.length ? 'Suivant' : 'Terminer'));
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors, attempts: series.length, level: null,
      data: difficulty === 2 ? { situations: series.length } : { items: series.length, referential: content.referential.id },
    });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() { if (question) { hints += 1; question.hint(); } },
    repeat() { if (series) ctx.instruct(series[index]?.prompt ?? ''); },
    destroy() { destroyed = true; clear(root); },
  };
}
