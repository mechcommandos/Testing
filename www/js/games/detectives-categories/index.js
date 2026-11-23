/**
 * Les détectives des catégories (jeu 15) : ranger chaque image dans la boîte qui correspond à la règle affichée.
 * La règle reste visible (pictogramme et texte). L'indice rappelle la règle et retire une mauvaise boîte.
 * Difficulté 2 : l'enfant choisit d'abord sa règle ; le classement est corrigé selon la règle choisie.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, loadJson, openChoice, pic, seriesDots } from '../choices.js';
import { makeSeries, questions } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let draw;
  let rule;
  let list;
  let index;
  let question;
  let errors;
  let hints;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/detectives-categories.json');
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries() {
    draw = makeSeries(difficulty, content, random);
    errors = 0;
    hints = 0;
    ctx.activityStart();
    if (draw.choice) chooseRule();
    else begin(draw.rule);
  }

  function preview() {
    return h('div', { class: 'k-preview', 'aria-label': `Les images : ${draw.items.map((i) => i.name).join(', ')}` }, draw.items.map((i) => pic(i.picto, 48, 'c-pic')));
  }

  function chooseRule() {
    const choice = openChoice({
      model: preview(),
      layout: 'list',
      choices: draw.choice.map((r) => ({ id: r.rule, text: `Selon ${content.rules[r.rule].label}`, aria: `Ranger selon ${content.rules[r.rule].label}`, className: 'long' })),
      onPick: (id) => setTimeout(() => { if (!destroyed) begin(draw.choice.find((r) => r.rule === id)); }, ctx.reducedMotion ? 100 : 500),
    });
    clear(root);
    root.append(h('div', { class: 'c-game detectives' }, choice.node));
    ctx.instruct('Tu es le détective : comment veux-tu ranger ces images ? Les deux façons sont justes.');
  }

  function begin(chosen) {
    rule = chosen;
    list = questions(content, rule, draw.items);
    index = 0;
    ask();
  }

  function ruleBanner() {
    return h('p', { class: 'k-rule' }, h('strong', {}, 'La règle : '), `ranger selon ${content.rules[rule.rule].label}.`);
  }

  function ask() {
    const q = list[index];
    const model = h('div', { class: 'c-model' }, pic(q.item.picto), h('span', { class: 'c-caption' }, q.item.name));
    question = choiceQuestion(ctx, { model, choices: q.choices, correctId: q.correctId, onCorrect: next });
    clear(root);
    root.append(h('div', { class: 'c-game detectives' }, seriesDots(list.length, index), ruleBanner(), question.node));
    ctx.instruct(index === 0 ? `${content.rules[rule.rule].prompt} ${q.prompt}` : q.prompt);
  }

  function next() {
    errors += question.errors;
    index += 1;
    if (index < list.length) ask();
    else finish();
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: list.length, level: null, data: { rule: rule.rule, boxes: rule.boxes.map((b) => b.id), chosen: !!draw.choice } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!question || !rule) return;
      hints += 1;
      root.querySelector('.k-rule')?.classList.add('glow');
      ctx.instruct(`Rappel : on range selon ${content.rules[rule.rule].label}.`);
      question.hint();
    },
    repeat() {
      if (!rule) ctx.instruct('Comment veux-tu ranger ces images ?');
      else ctx.instruct(list[index]?.prompt ?? '');
    },
    destroy() { destroyed = true; clear(root); },
  };
}
