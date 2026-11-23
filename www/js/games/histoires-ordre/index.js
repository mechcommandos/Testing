/**
 * Les histoires à remettre en ordre (jeu 16) : toucher les images dans l'ordre de l'histoire.
 * Chaque image touchée va dans la case suivante et sa phrase est lue. Toucher une image posée la remet dans la réserve.
 * Quand toutes les cases sont pleines : un ordre accepté → l'histoire est racontée ; sinon les images bien placées
 * restent, les autres reviennent dans la réserve. L'indice pose la prochaine bonne image.
 */
import { speak } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { continueButton, loadJson, pic, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { isValidOrder, makeSeries, nextCard, validPrefix } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let placed;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/histoires-ordre.json');
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
    start();
  }

  const current = () => series[index];
  const stepOf = (id) => current().story.steps.find((s) => s.id === id);

  function start() {
    placed = [];
    busy = false;
    render();
    ctx.instruct(`${current().story.title} : remets les images dans l’ordre de l’histoire.`);
  }

  function card(step, where) {
    return h('button', {
      class: `o-card${where === 'slot' ? ' placed' : ''}`, 'data-id': step.id,
      'aria-label': where === 'slot' ? `${step.text} (toucher pour l’enlever)` : step.text,
      onclick: () => (where === 'slot' ? unplace(step.id) : place(step.id)),
    }, pic(step.picto, 72, 'c-pic'), h('span', { class: 'o-text' }, step.text));
  }

  function render() {
    const { story, cards } = current();
    const slots = h('ol', { class: 'o-slots', 'aria-label': 'L’histoire' }, story.steps.map((_, i) => {
      const id = placed[i];
      return h('li', { class: `o-slot${id ? ' full' : ''}` }, h('span', { class: 'o-num', 'aria-hidden': 'true' }, String(i + 1)), id ? card(stepOf(id), 'slot') : null);
    }));
    const tray = h('div', { class: 'o-tray', role: 'group', 'aria-label': 'Images à placer' }, cards.filter((s) => !placed.includes(s.id)).map((s) => card(s, 'tray')));
    clear(root);
    root.append(h('div', { class: 'c-game story-order' }, seriesDots(series.length, index), h('p', { class: 'o-title' }, story.title), slots, tray));
  }

  function place(id) {
    if (busy || placed.includes(id)) return;
    placed.push(id);
    ctx.sfx('tap');
    speak(stepOf(id).text);
    render();
    if (placed.length === current().story.steps.length) check();
  }

  function unplace(id) {
    if (busy) return;
    placed = placed.filter((x) => x !== id);
    render();
  }

  function check() {
    const { story } = current();
    if (isValidOrder(story, placed)) return success();
    errors += 1;
    ctx.sfx('soft');
    const keep = validPrefix(story, placed);
    busy = true;
    root.querySelectorAll('.o-slot').forEach((slot, i) => { if (i >= keep) shake(slot, ctx.reducedMotion); });
    ctx.instruct(keep ? `Presque ! Les ${keep} premières images sont bien placées. Cherche la suite.` : 'Ce n’est pas encore le bon ordre. Par quoi commence l’histoire ?');
    if (errors % 2 === 0) ctx.offerHint();
    setTimeout(() => {
      if (destroyed) return;
      placed = placed.slice(0, keep);
      busy = false;
      render();
    }, ctx.reducedMotion ? 300 : 900);
  }

  function success() {
    busy = true;
    ctx.sfx('good');
    const { story } = current();
    const told = placed.map((id) => stepOf(id).text).join(' ');
    root.querySelector('.o-slots').classList.add('done');
    ctx.instruct(story.why ? `${told} ${story.why}` : told);
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(
      story.why ? h('p', { class: 'notice c-why' }, story.why) : null,
      continueButton(index < series.length ? 'Histoire suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { stories: series.map((s) => s.story.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const { story } = current();
      placed = placed.slice(0, validPrefix(story, placed));
      const id = nextCard(story, placed);
      render();
      if (id) place(id);
    },
    repeat() { if (series) ctx.instruct(`${current().story.title} : remets les images dans l’ordre de l’histoire.`); },
    destroy() { destroyed = true; clear(root); },
  };
}
