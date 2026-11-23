/**
 * La rue en sécurité (jeu 35) : une scène de rue dessinée (feu des piétons, passage, voiture) et des cartes.
 * Chaque bonne réponse est expliquée ; la suite arrive quand la voix a fini.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { LABELS, makeSeries, prompt, SERIES } from './rules.js';

const man = (color, y) => `<g fill="${color}"><circle cx="40" cy="${y + 8}" r="6"/><path d="M33 ${y + 16}h14l-2 16h-3v14h-4v-14h-4z"/></g>`;

/** Scène : trottoir, route, passage piéton, feu des piétons (rouge, vert, clignotant), voiture, ballon. */
function street(scene = {}) {
  const red = scene.walker === 'red' ? '#e5484d' : '#4a2326';
  const green = scene.walker === 'green' || scene.walker === 'blink' ? '#3aa65b' : '#1f3a26';
  const light = scene.walker === 'none' ? '' : `<rect x="22" y="14" width="36" height="88" rx="8" fill="#23324d"/>${man(red, 18)}<g class="${scene.walker === 'blink' ? 'rs-blink' : ''}">${man(green, 58)}</g><rect x="37" y="102" width="6" height="56" fill="#5b6b85"/>`;
  const car = scene.car ? `<g transform="translate(${scene.carStopped ? 150 : 230} 128)"><rect x="0" y="12" width="96" height="30" rx="10" fill="#e5484d"/><path d="M18 12l12-16h36l14 16z" fill="#e5484d"/><path d="M32 8l6-8h22l8 8z" fill="#bfe3f3"/><circle cx="22" cy="44" r="10" fill="#23324d"/><circle cx="76" cy="44" r="10" fill="#23324d"/><rect x="0" y="22" width="8" height="6" rx="2" fill="#ffd75e"/></g>` : '';
  const ball = scene.ball ? '<circle cx="230" cy="168" r="16" fill="#1fb3c6"/><path d="M216 160q14 8 28 0M216 176q14-8 28 0" stroke="#fff" stroke-width="3" fill="none"/>' : '';
  return `<svg viewBox="0 0 400 220" aria-hidden="true" focusable="false"><rect width="400" height="220" fill="#e3f0fb"/><rect y="150" width="400" height="20" fill="#cfd6e2"/><rect y="170" width="400" height="50" fill="#5b6472"/>`
    + `${[0, 1, 2, 3, 4].map((i) => `<rect x="${110 + i * 20}" y="174" width="12" height="42" fill="#fff"/>`).join('')}<path d="M0 196h90M330 196h70" stroke="#fff" stroke-width="4" stroke-dasharray="18 14"/>${light}${car}${ball}</svg>`;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
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
    const model = h('div', { class: 'c-model rs-scene', role: 'img', 'aria-label': 'La rue', html: street(q.kind === 'light' ? q.scene : {}) });
    question = choiceQuestion(ctx, {
      model,
      choices: q.options.map((o) => ({ id: o, text: LABELS[o], aria: LABELS[o], className: o === 'oui' ? 'rs-yes' : o === 'non' ? 'rs-no' : 'rs-card' })),
      correctId: q.correctId,
      onCorrect: () => answered(q),
      layout: q.kind === 'light' ? 'rs-two' : 'rs-three',
    });
    clear(root);
    root.append(h('div', { class: 'c-game rs-game' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(prompt(q));
  }

  function answered(q) {
    errors += question.errors;
    ctx.instruct(q.why);
    index += 1;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, q.why),
      continueButton(index < SERIES ? 'Suivant' : 'Terminer', () => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { situations: series.map((q) => q.id ?? q.say) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() { if (question) { hints += 1; question.hint(); } },
    repeat() { if (series) ctx.instruct(prompt(series[index])); },
    destroy() { destroyed = true; clear(root); },
  };
}
