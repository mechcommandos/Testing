/**
 * La frise du temps (jeu 43) : cartes illustrées d'événements à comparer, à ranger sur une frise (en les touchant
 * du plus ancien au plus récent), puis des dates et des durées.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { event, makeSeries } from './rules.js';

const ART = {
  dinosaures: '<path d="M14 70q4-24 26-26q8-20 26-18q10 2 10 10q-6 2-10 0q2 10-6 18l14 4q8 2 8 10H60l-4-8-8 8H36l2-10q-14 4-24 12z" fill="#3aa65b"/><circle cx="64" cy="32" r="2.5" fill="#23324d"/>',
  humains: '<path d="M30 80l16-26 16 26z" fill="#8a5a2b"/><path d="M46 56q-14-14 0-32q4 12 10 6q8 16-10 26z" fill="#f5b82e"/><path d="M46 56q-6-8 0-16q2 6 6 4q2 8-6 12z" fill="#e5484d"/>',
  lascaux: '<rect x="10" y="20" width="80" height="60" rx="10" fill="#e9d2a6"/><path d="M26 58q4-16 22-16q16 0 24 8l4 10h-6l-2 8h-6v-6H38v6h-6l-2-8z" fill="#8a3a1c"/><path d="M68 40l8-6M64 40l2-8" stroke="#8a3a1c" stroke-width="3"/>',
  pyramides: '<path d="M10 80l30-46 30 46z" fill="#e9c46a"/><path d="M40 34l30 46H54z" fill="#c9a24d"/><path d="M52 80l20-30 20 30z" fill="#dcb75a"/><circle cx="80" cy="24" r="8" fill="#f5b82e"/>',
  gaule: '<path d="M30 70q20-50 40 0" fill="none" stroke="#3aa65b" stroke-width="6"/><g fill="#3aa65b"><ellipse cx="32" cy="58" rx="5" ry="9" transform="rotate(-30 32 58)"/><ellipse cx="38" cy="42" rx="5" ry="9" transform="rotate(-10 38 42)"/><ellipse cx="62" cy="42" rx="5" ry="9" transform="rotate(10 62 42)"/><ellipse cx="68" cy="58" rx="5" ry="9" transform="rotate(30 68 58)"/></g>',
  charlemagne: '<path d="M22 66l6-34 14 16 8-22 8 22 14-16 6 34z" fill="#f5b82e" stroke="#c98a1f" stroke-width="3"/><circle cx="50" cy="56" r="5" fill="#e5484d"/>',
  chateaux: '<path d="M18 84V40h10v8h8v-8h10v8h8v-8h10v8h8v-8h10v44z" fill="#a3aab8"/><path d="M42 84V66q8-10 16 0v18z" fill="#5b3a1c"/><path d="M50 40V18l14 6-14 6" fill="#e5484d"/>',
  revolution: '<rect x="20" y="22" width="20" height="44" fill="#1a56b8"/><rect x="40" y="22" width="20" height="44" fill="#fff" stroke="#d8e1ec"/><rect x="60" y="22" width="20" height="44" fill="#e5484d"/><rect x="16" y="18" width="4" height="66" fill="#8a5a2b"/>',
  avion: '<path d="M10 52l70-6q10 0 10 6t-10 6l-70-6z" fill="#e9eef6" stroke="#5b6b85" stroke-width="3"/><path d="M40 50l-12-24h8l20 24zM40 54l-12 22h8l20-22zM76 48l6-12h4l-2 14z" fill="#9fc3f3" stroke="#5b6b85" stroke-width="2"/>',
  lune: '<circle cx="46" cy="56" r="30" fill="#d9dde6"/><circle cx="36" cy="48" r="6" fill="#b9c0cd"/><circle cx="56" cy="66" r="7" fill="#b9c0cd"/><path d="M62 30V8" stroke="#5b6b85" stroke-width="3"/><rect x="62" y="8" width="20" height="12" fill="#1a56b8"/>',
  web: '<rect x="16" y="20" width="68" height="46" rx="5" fill="#23324d"/><rect x="21" y="25" width="58" height="36" fill="#bfe3f3"/><path d="M36 76h28l4 8H32z" fill="#5b6b85"/><circle cx="50" cy="43" r="12" fill="none" stroke="#1a56b8" stroke-width="3"/><path d="M38 43h24M50 31q-8 12 0 24q8-12 0-24" stroke="#1a56b8" stroke-width="2.5" fill="none"/>',
};
const PICTO_FOR = { villages: 'maison', imprimerie: 'journal', colomb: 'bateau', locomotive: 'train' };
const art = (id, size = 64) => (ART[id] ? `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${ART[id]}</svg>` : picto(PICTO_FOR[id] ?? 'etoile', size));

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
  let placed;
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
    question = null;
    clear(root);
    if (q.kind === 'order') return order(q);
    const choices = q.kind === 'pair'
      ? q.options.map((id) => ({ id, html: art(id), text: event(id).name, aria: event(id).name, className: 'ft-card' }))
      : q.options.map((n) => ({ id: n, text: q.kind === 'duration' ? `${n} ans` : n, aria: n, className: 'ft-num' }));
    const model = q.kind === 'date' ? h('div', { class: 'c-model ft-model' }, h('span', { html: art(q.id, 80) }), h('strong', {}, event(q.id).name)) : null;
    question = choiceQuestion(ctx, { model, choices, correctId: q.correctId, onCorrect: () => explained(q) });
    root.append(h('div', { class: 'c-game ft-game' }, seriesDots(series.length, index), question.node));
    ctx.instruct(q.say);
  }

  function order(q) {
    placed = 0;
    const line = h('div', { class: 'ft-line', 'aria-label': 'La frise' }, h('span', { class: 'ft-arrow', 'aria-hidden': 'true' }, 'Plus ancien'), h('span', { class: 'ft-slots' }), h('span', { class: 'ft-arrow', 'aria-hidden': 'true' }, 'Plus récent'));
    const pool = h('div', { class: 'ft-pool' }, q.events.map((id) => h('button', {
      class: 'ft-card ft-pick', 'data-id': id, 'aria-label': event(id).name,
      onclick: (e) => tap(q, id, e.currentTarget, line.querySelector('.ft-slots')),
    }, h('span', { html: art(id, 56) }), h('span', {}, event(id).name))));
    root.append(h('div', { class: 'c-game ft-game' }, seriesDots(series.length, index), line, pool));
    ctx.instruct(q.say);
  }

  function tap(q, id, btn, slots) {
    if (id !== q.order[placed]) {
      errors += 1;
      ctx.sfx('soft');
      shake(btn, ctx.reducedMotion);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    placed += 1;
    ctx.sfx('tap');
    btn.remove();
    slots.append(h('span', { class: 'ft-slot' }, h('span', { html: art(id, 40) }), h('small', {}, event(id).name), h('em', {}, event(id).when)));
    if (placed === q.order.length) {
      ctx.sfx('good');
      const text = `Bravo ! ${q.order.map((x) => `${event(x).name}, ${event(x).when}`).join(' ; ')}.`;
      ctx.instruct(text);
      index += 1;
      root.querySelector('.c-game').append(continueButton(index < series.length ? 'Frise suivante' : 'Terminer', () => { if (destroyed) return; if (index < series.length) ask(); else finish(); }));
    }
  }

  function explained(q) {
    errors += question.errors;
    ctx.instruct(q.why);
    index += 1;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, q.why), continueButton(index < series.length ? 'Suivant' : 'Terminer', () => { if (destroyed) return; if (index < series.length) ask(); else finish(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { kinds: series.map((q) => q.kind) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      const q = series?.[index];
      if (!q) return;
      hints += 1;
      if (question) question.hint();
      else root.querySelector(`.ft-pick[data-id="${q.order[placed]}"]`)?.classList.add('glow');
    },
    repeat() { const q = series?.[index]; if (q) ctx.instruct(q.say); },
    destroy() { destroyed = true; clear(root); },
  };
}
