/**
 * La bulle de calme (jeu 36) : une bulle qui grossit (inspirer) et rétrécit (souffler), ou un point qui fait le tour
 * d'un carré. Niveau 3 : on choisit d'abord sa météo intérieure (aucune réponse fausse, rien n'est enregistré).
 */
import { clear, h } from '../../ui/dom.js';
import { openChoice } from '../choices.js';
import { steps, WEATHERS } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty } = ctx;
  let timer = null;
  let destroyed = false;
  let hints = 0;
  let plan = [];
  let at = 0;
  let intro = '';

  function setup() {
    clearTimeout(timer);
    clear(root);
    ctx.activityStart();
    if (difficulty === 2) return weather();
    intro = difficulty === 0
      ? 'Installe-toi bien. Regarde la bulle : quand elle grossit, tu inspires ; quand elle rétrécit, tu souffles. Touche « Commencer ».'
      : 'Le carré de calme : suis le point qui fait le tour. Un côté pour inspirer, un pour garder l’air, un pour souffler, un pour attendre. Touche « Commencer ».';
    ready(intro);
  }

  function weather() {
    intro = 'Comment est ta météo à l’intérieur, maintenant ? Il n’y a pas de mauvaise réponse.';
    const q = openChoice({
      choices: WEATHERS.map((w) => ({ id: w.id, picto: w.id, text: w.label, aria: `${w.label} : ${w.feel}` })),
      onPick: (id) => {
        const w = WEATHERS.find((x) => x.id === id);
        ctx.instruct(w.reply);
        ctx.afterSpeech(() => { if (!destroyed) ready(null); }, 300);
      },
    });
    root.append(h('div', { class: 'c-game bc-game' }, q.node));
    ctx.instruct(`${intro} Soleil, nuages, pluie ou tempête ?`);
  }

  function ready(say) {
    plan = steps(difficulty);
    at = 0;
    const shape = difficulty === 1
      ? h('div', { class: 'bc-square', 'aria-hidden': 'true' }, h('span', { class: 'bc-dot' }))
      : h('div', { class: 'bc-bubble', 'aria-hidden': 'true' });
    const label = h('p', { class: 'bc-label', 'aria-live': 'polite' }, '');
    const startBtn = h('button', { class: 'btn big', onclick: () => { startBtn.remove(); run(); } }, 'Commencer');
    clear(root);
    root.append(h('div', { class: `c-game bc-game${ctx.reducedMotion ? ' bc-still' : ''}` }, h('div', { class: 'bc-stage' }, shape), label, startBtn));
    if (say) ctx.instruct(say);
    else { startBtn.remove(); run(); }
  }

  function run() {
    if (destroyed) return;
    if (at >= plan.length) return done();
    const s = plan[at];
    const stage = root.querySelector('.bc-stage');
    stage.dataset.phase = s.phase;
    stage.style.setProperty('--bc-time', `${s.seconds}s`);
    if (s.side !== undefined) stage.dataset.side = String(s.side);
    root.querySelector('.bc-label').textContent = s.say.replace('…', '');
    ctx.instruct(s.say);
    at += 1;
    timer = setTimeout(run, s.seconds * 1000);
  }

  async function done() {
    root.querySelector('.bc-stage')?.removeAttribute('data-phase');
    await ctx.activityDone({ success: true, hints, errors: 0, attempts: 1, level: null, data: { breaths: plan.length } });
    if (!destroyed) ctx.celebrate(setup, 'Tu as pris un moment rien que pour toi.');
  }

  setup();

  return {
    hint() { hints += 1; ctx.instruct(at ? plan[Math.max(0, at - 1)].say : intro); },
    repeat() { ctx.instruct(at ? plan[Math.max(0, at - 1)].say : intro); },
    destroy() { destroyed = true; clearTimeout(timer); clear(root); },
  };
}
