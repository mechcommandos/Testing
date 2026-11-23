/**
 * Série de questions à choix, partagée par les jeux 44 à 53. Chaque question : une consigne lue à voix haute, un
 * modèle (dessin, phrase, carte) et 2 à 4 cartes. Une erreur fait trembler la carte ; une bonne réponse est expliquée,
 * puis la question suivante arrive quand la voix a fini (bouton « Continuer » pour aller plus vite).
 * Indice : une mauvaise carte disparaît, puis la bonne brille.
 *
 * view(q) → { say, show?, model?, choices, layout?, explain, hint?, onSolved?(root) } (show : texte affiché si différent de say)
 */
import { clear, h } from '../ui/dom.js';
import { choiceQuestion, continueButton, seriesDots } from './choices.js';

export function quizGame(ctx, { makeSeries, view, className = '', nextLabel = 'Question suivante', data = () => ({}) }) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
  let current;
  let solved = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  function ask() {
    const q = series[index];
    solved = false;
    current = view(q);
    question = choiceQuestion(ctx, { model: current.model ?? null, choices: current.choices, correctId: q.answer, layout: current.layout ?? '', onCorrect: () => answered() });
    clear(root);
    root.append(h('div', { class: `c-game quiz ${className}` }, seriesDots(series.length, index), question.node));
    ctx.instruct(current.say, { display: current.show ?? null });
  }

  function answered() {
    if (destroyed) return;
    solved = true;
    errors += question.errors;
    index += 1;
    const last = index >= series.length;
    current.onSolved?.(root);
    ctx.instruct(current.explain);
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, current.explain),
      continueButton(last ? 'Terminer' : nextLabel, () => { if (destroyed) return; if (last) finish(); else ask(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: data(series) });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!question || solved) return;
      hints += 1;
      question.hint();
      if (current.hint) ctx.instruct(current.hint);
    },
    repeat() { if (current && !solved) ctx.instruct(current.say, { display: current.show ?? null }); },
    destroy() { destroyed = true; clear(root); },
  };
}

/** Choix de nombres : la bonne réponse et des voisins plausibles, sans doublon, dans [min, max]. */
export function numberOptions(answer, random, candidates, { min = 0, max = Infinity, count = 3 } = {}) {
  const set = [answer];
  for (const c of candidates) if (c >= min && c <= max && !set.includes(c) && set.length < count) set.push(c);
  for (let d = 1; set.length < count; d++) for (const c of [answer + d, answer - d]) if (c >= min && c <= max && !set.includes(c) && set.length < count) set.push(c);
  return random.shuffle(set);
}
