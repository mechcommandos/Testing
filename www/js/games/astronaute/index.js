/**
 * L'astronaute du système solaire (jeu 39) : astres dessinés à choisir, planètes à ranger en les touchant dans l'ordre,
 * puis questions sur le jour, la nuit et les saisons. Une fusée avance d'une étape à chaque réponse.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { makeSeries, NAMES, SERIES } from './rules.js';

const ART = {
  terre: '<circle cx="50" cy="50" r="40" fill="#2f7fd0"/><path d="M28 30q12-8 20 2t-4 16q-12 2-16-6t0-12zM56 58q12-6 18 4t-8 18q-10-2-12-10t2-12zM60 18q10 2 12 10q-8 2-12-4z" fill="#3aa65b"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>',
  lune: '<circle cx="50" cy="50" r="36" fill="#d9dde6"/><circle cx="38" cy="40" r="7" fill="#b9c0cd"/><circle cx="62" cy="58" r="9" fill="#b9c0cd"/><circle cx="56" cy="32" r="4" fill="#b9c0cd"/>',
  mercure: '<circle cx="50" cy="50" r="22" fill="#a7a19a"/><circle cx="44" cy="44" r="4" fill="#8a847d"/>',
  venus: '<circle cx="50" cy="50" r="30" fill="#e9c46a"/><path d="M24 44q26-8 52 0M26 58q24 6 48 0" stroke="#d6a94a" stroke-width="4" fill="none"/>',
  mars: '<circle cx="50" cy="50" r="26" fill="#d0533a"/><circle cx="42" cy="44" r="5" fill="#a83c27"/><circle cx="58" cy="58" r="4" fill="#a83c27"/>',
  jupiter: '<circle cx="50" cy="50" r="44" fill="#d9a27a"/><path d="M8 38h84M8 52h84M10 64h80" stroke="#b9774a" stroke-width="6"/><ellipse cx="64" cy="62" rx="9" ry="5" fill="#c4473a"/>',
  saturne: '<ellipse cx="50" cy="52" rx="48" ry="12" fill="none" stroke="#c9a96a" stroke-width="6"/><circle cx="50" cy="50" r="30" fill="#e9cf8a"/><path d="M2 52q48 22 96 0" stroke="#c9a96a" stroke-width="6" fill="none"/>',
  uranus: '<circle cx="50" cy="50" r="32" fill="#8fd6e0"/><path d="M50 12v76" stroke="#d6f2f6" stroke-width="3" opacity=".8"/>',
  neptune: '<circle cx="50" cy="50" r="32" fill="#3b5fd9"/><path d="M22 46q28-8 56 0" stroke="#6b8bef" stroke-width="5" fill="none"/>',
};
const art = (id, size = 72) => (ART[id] ? `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${ART[id]}</svg>` : picto(id, size));
const ROCKET = '<svg viewBox="0 0 40 60" width="30" height="45" aria-hidden="true" focusable="false"><path d="M20 2q14 14 12 38H8Q6 16 20 2z" fill="#fff" stroke="#1a56b8" stroke-width="3"/><circle cx="20" cy="22" r="6" fill="#9fd3f5" stroke="#1a56b8" stroke-width="2"/><path d="M8 40l-6 12 10-4zM32 40l6 12-10-4z" fill="#ef5f95"/><path d="M14 44q6 14 12 0z" fill="#f5b82e"/></svg>';

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

  function track() {
    return h('div', { class: 'as-track', role: 'img', 'aria-label': `Étape ${index + 1} sur ${SERIES}` },
      h('span', { class: 'as-rocket', style: { left: `${(index / SERIES) * 100}%` }, html: ROCKET }), h('span', { class: 'as-goal', html: art('lune', 30) }));
  }

  function ask() {
    const q = series[index];
    question = null;
    clear(root);
    if (q.kind === 'order') return order(q);
    question = choiceQuestion(ctx, {
      model: null,
      choices: q.options.map((o) => (q.kind === 'astre' ? { id: o, html: art(o, 72), text: NAMES[o], aria: NAMES[o] } : { id: o, text: o, aria: o, className: 'as-text' })),
      correctId: q.correctId,
      onCorrect: () => explained(q),
      layout: q.kind === 'text' ? 'as-column' : '',
    });
    root.append(h('div', { class: 'c-game as-game' }, track(), seriesDots(SERIES, index), question.node));
    ctx.instruct(q.kind === 'text' ? `${q.say} ${q.options.join(' ; ')} ?` : q.say);
  }

  function order(q) {
    placed = 0;
    const row = h('div', { class: 'as-row', 'aria-label': 'Les planètes rangées' }, h('span', { class: 'as-sun', html: picto('soleil', 56) }));
    const pool = h('div', { class: 'as-pool' }, random.shuffle(q.planets).map((p) => h('button', {
      class: 'as-planet', 'data-planet': p, 'aria-label': NAMES[p],
      onclick: (e) => tap(q, p, e.currentTarget, row),
    }, h('span', { html: art(p, 64) }), h('span', {}, NAMES[p]))));
    root.append(h('div', { class: 'c-game as-game' }, track(), seriesDots(SERIES, index), row, pool, h('p', { class: 'small as-note' }, 'Les tailles et les distances ne sont pas respectées sur ce dessin.')));
    ctx.instruct(q.say);
  }

  function tap(q, planet, btn, row) {
    if (planet !== q.planets[placed]) {
      errors += 1;
      ctx.sfx('soft');
      shake(btn, ctx.reducedMotion);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    placed += 1;
    ctx.sfx('tap');
    btn.remove();
    row.append(h('span', { class: 'as-placed' }, h('span', { html: art(planet, 48) }), h('small', {}, NAMES[planet])));
    if (placed === q.planets.length) {
      ctx.sfx('good');
      ctx.instruct(`Bravo ! ${q.planets.map((p) => NAMES[p]).join(', ')}.`);
      index += 1;
      ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }, 800);
    }
  }

  function explained(q) {
    errors += question.errors;
    ctx.instruct(q.why);
    index += 1;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, q.why), continueButton(index < SERIES ? 'Étape suivante' : 'Terminer la mission', () => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { steps: series.map((q) => q.kind) } });
    if (!destroyed) ctx.celebrate(newSeries, 'Mission accomplie, astronaute !');
  }

  newSeries();

  return {
    hint() {
      const q = series?.[index];
      if (!q) return;
      hints += 1;
      if (question) question.hint();
      else root.querySelector(`.as-planet[data-planet="${q.planets[placed]}"]`)?.classList.add('glow');
    },
    repeat() { const q = series?.[index]; if (q) ctx.instruct(q.say); },
    destroy() { destroyed = true; clear(root); },
  };
}
