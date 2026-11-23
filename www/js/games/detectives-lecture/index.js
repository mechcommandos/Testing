/**
 * Les détectives de la lecture (jeu 25) : lire un court texte, toucher les phrases qui donnent les indices,
 * puis choisir la conclusion. « Lire à voix haute » est une aide facultative : l'enquête est alors enregistrée
 * comme aidée (réussie, mais pas en lecture autonome). L'indice surligne une phrase utile.
 */
import { speak } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { choiceQuestion, continueButton, loadJson, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { allFound, makeSeries, tapSentence } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let found;
  let useful; // phrases qui écartent une fausse piste : surlignées, jamais comptées comme erreur
  let question;
  let errors;
  let hints;
  let aided;
  let busy = false;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/detectives-lecture.json');
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
    aided = false;
    ctx.activityStart();
    start();
  }

  const cur = () => series[index];
  const need = () => cur().clues.length;

  function start() {
    found = [];
    useful = [];
    question = null;
    busy = false;
    render();
    // La consigne est dite, pas le texte : l'enfant lit seul, sauf s'il demande la lecture à voix haute.
    ctx.instruct(`${cur().title}. Lis l’enquête, puis touche ${need() > 1 ? `les ${need()} phrases qui donnent des indices` : 'la phrase qui donne l’indice'}.`);
  }

  function render() {
    const c = cur();
    const text = h('div', { class: 'r-text' }, c.sentences.map((s, i) => h('button', {
      class: `r-sentence${found.includes(i) ? ' clue' : ''}${useful.includes(i) ? ' useful' : ''}`, 'data-i': i, disabled: !!question, onclick: () => tap(i),
    }, s)));
    clear(root);
    root.append(h('div', { class: 'c-game reading' },
      seriesDots(series.length, index),
      h('div', { class: 'r-head' }, h('h2', {}, c.title),
        h('button', { class: 'btn ghost small r-audio', onclick: readAloud }, h('span', { 'aria-hidden': 'true', html: icon('sound', 18) }), 'Lire à voix haute')),
      h('p', { class: 'r-step' }, question ? c.question : `Indices trouvés : ${found.length} sur ${need()}`),
      text,
      question ? question.node : null));
  }

  function readAloud() {
    aided = true; // enregistré comme aide : la lecture n'est plus autonome
    speak(cur().sentences.join(' '));
  }

  function tap(i) {
    if (busy || question) return;
    const r = tapSentence(cur(), found, i);
    if (r === 'already') return;
    if (r === 'useful') {
      if (!useful.includes(i)) useful.push(i);
      ctx.sfx('tap');
      ctx.instruct('Bien vu : cette phrase écarte une fausse piste. Cherche maintenant les indices qui montrent la réponse.');
      render();
      return;
    }
    const el = root.querySelector(`.r-sentence[data-i="${i}"]`);
    if (r === 'not-clue') {
      errors += 1;
      ctx.sfx('soft');
      shake(el, ctx.reducedMotion);
      ctx.instruct('Cette phrase n’aide pas à résoudre l’enquête. Cherche encore.');
      if (errors % 3 === 0) ctx.offerHint();
      return;
    }
    found.push(i);
    ctx.sfx('good');
    if (allFound(cur(), found)) {
      question = choiceQuestion(ctx, { choices: cur().choices.map((x) => ({ ...x, aria: x.text, className: 'long' })), correctId: cur().answer, layout: 'list', onCorrect: solved });
      ctx.instruct(`Tu as tous les indices. ${cur().question}`);
    }
    render();
  }

  function solved() {
    busy = true;
    errors += question.errors;
    const why = cur().why;
    ctx.instruct(`Enquête résolue ! ${why}`, { quiet: !aided });
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, h('strong', {}, 'Enquête résolue ! '), why), continueButton(index < series.length ? 'Enquête suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, aided, data: { cases: series.map((c) => c.id), audioAid: aided } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      if (question) return question.hint();
      const next = cur().clues.find((i) => !found.includes(i));
      root.querySelector(`.r-sentence[data-i="${next}"]`)?.classList.add('glow');
    },
    repeat() { if (series) ctx.instruct(question ? cur().question : `Touche ${need() > 1 ? 'les phrases qui donnent des indices' : 'la phrase qui donne l’indice'}.`); },
    destroy() { destroyed = true; clear(root); },
  };
}
