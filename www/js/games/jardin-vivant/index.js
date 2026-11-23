/**
 * Le jardin vivant (jeu 23) : choisir un outil (graine, arrosoir), toucher une parcelle, puis « Jour suivant ».
 * Les jours passent en accéléré. L'indice est le conseil du jardinier (la prochaine action utile).
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { continueButton } from '../choices.js';
import { advice, goalReached, GOALS, ladybugs, MAX_STAGE, MAX_WATER, newGarden, nextDay, plant, water } from './rules.js';

const STAGE_ART = { fleur: ['graine', 'pousse', 'pousse', 'fleur'], tomate: ['graine', 'pousse', 'pousse', 'plant-tomate'] };
const EVENT_TEXT = {
  planted: 'Graine plantée.', watered: 'Arrosé !', revived: 'La plante reprend des forces.', 'too-much': 'Elle a déjà assez d’eau : trop d’eau noierait les racines.',
  occupied: 'Il y a déjà une plante ici.', nothing: 'Rien à arroser ici : plante d’abord une graine.', wilted: 'Oh, une plante a fané : elle n’avait plus d’eau.',
  aphids: 'Des pucerons arrivent sur une plante ! Ils l’empêchent de pousser.', 'aphids-eaten': 'Les coccinelles ont mangé les pucerons.', 'no-aphids': 'Il n’y a pas de pucerons pour l’instant.',
  fruit: 'Les abeilles ont butiné : des tomates apparaissent !',
};

export function createGame(ctx) {
  const { root, difficulty } = ctx;
  const goal = GOALS[Math.min(difficulty, 2)];
  let garden;
  let tool;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  function newSeries() {
    garden = newGarden(difficulty);
    tool = `graine-${goal.seeds[0]}`;
    errors = 0;
    hints = 0;
    busy = false;
    ctx.activityStart();
    render();
    ctx.instruct(`${goal.text} Choisis un outil, puis touche la terre.`);
  }

  function plotArt(p) {
    if (!p.plant) return h('span', { class: 'j-empty' }, 'terre');
    const art = p.wilted ? 'fanee' : STAGE_ART[p.plant][p.stage];
    return h('span', { class: `j-plant stage-${p.stage}`, html: picto(art, 72) },
      p.aphids ? h('span', { class: 'j-bug', html: picto('puceron', 30) }) : null,
      p.fruit ? h('span', { class: 'j-fruit', html: picto('tomate', 30) }) : null);
  }

  function render(message = '') {
    const tools = [...goal.seeds.map((k) => [`graine-${k}`, k === 'fleur' ? 'Graine de fleur' : 'Graine de tomate', k === 'fleur' ? 'fleur' : 'tomate']), ['arrosoir', 'Arrosoir', 'arrosoir']];
    clear(root);
    root.append(h('div', { class: 'c-game garden' },
      h('p', { class: 'j-goal' }, h('strong', {}, `Jour ${garden.day}`), ` · ${goal.text}`),
      h('div', { class: 'j-sky' }, h('span', { html: picto('soleil', 44) }), garden.bees ? h('span', { class: 'j-bees', html: picto('abeille', 40), 'aria-label': 'Les abeilles sont là' }) : null),
      h('div', { class: 'j-plots', role: 'group', 'aria-label': 'Parcelles' }, garden.plots.map((p, i) => h('button', {
        class: `j-plot${p.wilted ? ' wilted' : ''}`, 'data-plot': i,
        'aria-label': p.plant ? `${p.plant === 'fleur' ? 'Fleur' : 'Tomates'}, stade ${p.stage + 1} sur ${MAX_STAGE + 1}, ${p.water} goutte${p.water > 1 ? 's' : ''} d’eau${p.wilted ? ', fanée' : ''}${p.aphids ? ', avec des pucerons' : ''}${p.fruit ? ', avec des tomates' : ''}` : 'Parcelle vide',
        onclick: () => use(i),
      }, plotArt(p), h('span', { class: 'j-water', 'aria-hidden': 'true' }, Array.from({ length: MAX_WATER }, (_, k) => h('i', { class: k < p.water ? 'on' : '' })))))),
      h('p', { class: 'j-msg', 'aria-live': 'polite' }, message),
      h('div', { class: 'j-tools', role: 'group', 'aria-label': 'Outils' },
        tools.map(([id, label, art]) => h('button', { class: `j-tool${tool === id ? ' on' : ''}`, 'aria-pressed': tool === id ? 'true' : 'false', 'data-tool': id, onclick: () => { tool = id; ctx.sfx('tap'); render(message); } }, h('span', { html: picto(art, 40) }), label)),
        goal.aphids ? h('button', { class: 'j-tool', 'data-tool': 'coccinelles', onclick: () => apply(ladybugs(garden)) }, h('span', { html: picto('coccinelle', 40) }), 'Coccinelles') : null,
        h('button', { class: 'btn', 'data-tool': 'jour', onclick: () => apply(nextDay(garden)) }, 'Jour suivant'))));
  }

  function use(i) {
    if (busy) return;
    if (tool === 'arrosoir') apply(water(garden, i));
    else apply(plant(garden, i, tool.replace('graine-', '')));
  }

  function apply(next) {
    if (busy) return;
    garden = next;
    const bad = next.events.some((e) => ['too-much', 'occupied', 'nothing', 'wilted'].includes(e));
    if (bad) { errors += 1; ctx.sfx('soft'); if (errors % 3 === 0) ctx.offerHint(); } else ctx.sfx(next.events.includes('fruit') || next.events.includes('aphids-eaten') ? 'good' : 'tap');
    const text = next.events.map((e) => EVENT_TEXT[e]).filter(Boolean).join(' ');
    render(text);
    if (text) ctx.instruct(text, { quiet: !bad && !next.events.includes('aphids') && !next.events.includes('fruit') });
    if (goalReached(garden)) success();
  }

  function success() {
    busy = true;
    ctx.sfx('good');
    const text = `Bravo, jardinier ! Objectif atteint en ${garden.day} jours.`;
    ctx.instruct(text);
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton('Terminer', async () => {
      await ctx.activityDone({ success: true, hints, errors, attempts: 1, level: null, data: { days: garden.day, goal: Math.min(difficulty, 2) } });
      if (!destroyed) ctx.celebrate(newSeries);
    }));
  }

  newSeries();

  return {
    hint() {
      if (!garden || busy) return;
      hints += 1;
      const a = advice(garden);
      ctx.instruct(`Conseil du jardinier : ${a.text}`);
      if (a.action === 'water') { tool = 'arrosoir'; render(); root.querySelector(`[data-plot="${a.plot}"]`)?.classList.add('glow'); }
      else if (a.action === 'plant') { tool = `graine-${a.kind}`; render(); root.querySelector(`[data-plot="${a.plot}"]`)?.classList.add('glow'); }
      else root.querySelector(`[data-tool="${a.action === 'ladybugs' ? 'coccinelles' : 'jour'}"]`)?.classList.add('glow');
    },
    repeat() { ctx.instruct(goal.text); },
    destroy() { destroyed = true; clear(root); },
  };
}
