/**
 * Le code secret des espions (jeu 41) : décoder un message (code par décalage), trouver le décalage, puis coder
 * un mot lettre par lettre. Une bande de l'alphabet aide à compter ; l'indice montre la lettre correspondante.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { ALPHABET, decode, makeSeries, SERIES, shiftLetter } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
  let pos;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  const strip = (marks = {}) => h('div', { class: 'cs-strip', 'aria-hidden': 'true' }, [...ALPHABET].map((c) => h('span', { class: marks[c] ?? '' }, c)));
  const tiles = (word, cls = '') => h('div', { class: `cs-word ${cls}` }, [...word].map((c) => h('span', {}, c)));

  function ask() {
    const q = series[index];
    pos = 0;
    question = null;
    clear(root);
    if (q.kind === 'encode') return encodeTask(q);
    const model = h('div', { class: 'c-model cs-model' },
      h('p', { class: 'cs-label' }, q.kind === 'shift' ? 'Mot en clair, puis mot codé' : 'Message secret'),
      q.kind === 'shift' ? tiles(q.word) : null,
      tiles(q.coded, 'cs-coded'),
      strip());
    question = choiceQuestion(ctx, {
      model,
      choices: q.options.map((o) => ({ id: o, text: q.kind === 'shift' ? `${o} lettre${o === '1' ? '' : 's'}` : o, aria: o, className: 'cs-choice' })),
      correctId: q.kind === 'shift' ? String(q.k) : q.word,
      onCorrect: () => solved(q),
    });
    root.append(h('div', { class: 'c-game cs-game' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(q.prompt);
  }

  function solved(q) {
    errors += question.errors;
    const text = q.kind === 'shift'
      ? `Oui : chaque lettre avance de ${q.k}. ${q.word[0]} devient ${q.coded[0]}.`
      : `Bien décodé : le message était ${q.word}. ${q.coded[0]} recule de ${q.k} et redevient ${decode(q.coded[0], q.k)}.`;
    ctx.instruct(text);
    next(text);
  }

  function next(text) {
    index += 1;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < SERIES ? 'Message suivant' : 'Terminer', () => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }));
  }

  function encodeTask(q) {
    const plain = tiles(q.word, 'cs-plain');
    const out = h('div', { class: 'cs-word cs-out' }, [...q.word].map(() => h('span', {}, '')));
    const keys = h('div', { class: 'cs-keys', role: 'group', 'aria-label': 'Alphabet' }, [...ALPHABET].map((c) => h('button', { class: 'cs-key', 'data-letter': c, onclick: (e) => type(q, c, e.currentTarget) }, c)));
    plain.children[0].classList.add('current');
    root.append(h('div', { class: 'c-game cs-game' }, seriesDots(SERIES, index), h('div', { class: 'c-model cs-model' }, h('p', { class: 'cs-label' }, `Décalage : ${q.k}`), plain, out, strip()), keys));
    ctx.instruct(q.prompt);
  }

  function type(q, letter, btn) {
    if (pos >= q.word.length) return;
    const expected = shiftLetter(q.word[pos], q.k);
    if (letter !== expected) {
      errors += 1;
      ctx.sfx('soft');
      shake(btn, ctx.reducedMotion);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    ctx.sfx('tap');
    const plain = root.querySelector('.cs-plain');
    root.querySelector('.cs-out').children[pos].textContent = letter;
    plain.children[pos].classList.remove('current');
    pos += 1;
    root.querySelectorAll('.cs-key.glow').forEach((b) => b.classList.remove('glow'));
    if (pos < q.word.length) { plain.children[pos].classList.add('current'); return; }
    ctx.sfx('good');
    root.querySelector('.cs-keys').remove();
    const text = `Message codé : ${q.coded}. Seul un espion qui connaît le décalage de ${q.k} pourra le lire !`;
    ctx.instruct(text);
    next(text);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { words: series.map((q) => q.word) } });
    if (!destroyed) ctx.celebrate(newSeries, 'Mission d’espion réussie !');
  }

  newSeries();

  return {
    hint() {
      const q = series?.[index];
      if (!q) return;
      hints += 1;
      if (q.kind === 'encode') {
        if (pos >= q.word.length) return;
        const from = q.word[pos];
        const to = shiftLetter(from, q.k);
        root.querySelector('.cs-strip')?.replaceWith(strip({ [from]: 'from', [to]: 'to' }));
        root.querySelector(`.cs-key[data-letter="${to}"]`)?.classList.add('glow');
        ctx.instruct(`${from} avance de ${q.k} : ${to}.`);
        return;
      }
      const from = q.coded[0];
      const to = q.kind === 'shift' ? q.word[0] : decode(from, q.k);
      root.querySelector('.cs-strip')?.replaceWith(strip({ [from]: 'from', [to]: 'to' }));
      if (hints > 1) question.hint();
    },
    repeat() { const q = series?.[index]; if (q) ctx.instruct(q.prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
