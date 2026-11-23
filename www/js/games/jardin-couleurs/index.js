/**
 * Le jardin des couleurs et des formes (jeu 1) : vue et interactions.
 * Toucher l'objet puis sa destination ; le glisser-déposer est une alternative, jamais une obligation.
 */
import { h, clear } from '../../ui/dom.js';
import { enableDrag, outlineSvg, shake, shapeSvg } from '../shared.js';
import { COLORS, fitsPot, isSolvable, isTarget, makeRound, nextInOrder, SHAPES, targetsLeft } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let round;
  let state;
  let destroyed = false;

  function newRound() {
    do { round = makeRound(difficulty, random); } while (!isSolvable(round));
    state = { picked: new Set(), placed: new Set(), selected: null, errors: 0, hints: 0 };
    ctx.activityStart();
    render();
    ctx.instruct(round.prompt);
  }

  function itemButton(item) {
    const label = item.kind === 'fleur' ? `fleur ${COLORS[item.color].feminine}` : `${SHAPES[item.shape].label} ${COLORS[item.color].label}`;
    const btn = h('button', { class: 'g-item', 'data-id': item.id, 'aria-label': label, html: shapeSvg(item.shape, COLORS[item.color].hex, item.size) });
    btn.addEventListener('click', () => { if (!btn.dataset.dragged) onItem(item, btn); });
    if (round.mode === 'sort') {
      enableDrag(btn, { targetSelector: '.g-pot', onStart: () => select(item, btn), onDrop: (pot) => pot && onPot(round.pots.find((p) => p.id === pot.dataset.id), pot) });
    }
    return btn;
  }

  function render() {
    clear(root);
    const model = round.mode === 'pick'
      ? h('div', { class: 'g-model', 'aria-hidden': 'true', html: shapeSvg('fleur', COLORS[round.target.color].hex, 0.8) })
      : round.mode === 'order'
        ? h('div', { class: 'g-model order', 'aria-hidden': 'true', html: `${shapeSvg(round.items[0].shape, '#c9c2b4', 0.35)}<span>→</span>${shapeSvg(round.items[0].shape, '#c9c2b4', 0.7)}` })
        : null;

    const field = h('div', { class: `g-field mode-${round.mode}` }, round.items
      .filter((i) => !state.placed.has(i.id))
      .map((item) => {
        const btn = itemButton(item);
        if (state.picked.has(item.id)) btn.classList.add('done');
        if (state.selected === item.id) btn.classList.add('selected');
        return btn;
      }));

    const pots = round.mode === 'sort'
      ? h('div', { class: 'g-pots' }, round.pots.map((pot) => h('button', {
        class: 'g-pot', 'data-id': pot.id, 'aria-label': `pot ${SHAPES[pot.shape].label}`, onclick: (e) => onPot(pot, e.currentTarget),
      }, h('span', { html: outlineSvg(pot.shape) }), h('span', { class: 'g-pot-content' }, round.items.filter((i) => state.placed.has(i.id) && i.shape === pot.shape).map((i) => h('span', { class: 'mini', html: shapeSvg(i.shape, COLORS[i.color].hex, 0.35) }))))))
      : null;

    const line = round.mode === 'order'
      ? h('div', { class: 'g-line', 'aria-label': 'rangées de la plus petite à la plus grande' }, round.items.filter((i) => state.placed.has(i.id)).sort((a, b) => a.rank - b.rank).map((i) => h('span', { html: shapeSvg(i.shape, COLORS[i.color].hex, i.size * 0.7) })))
      : null;

    root.append(h('div', { class: 'g-garden' }, model, field, pots, line));
  }

  function select(item, btn) {
    state.selected = item.id;
    root.querySelectorAll('.g-item.selected').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    ctx.sfx('tap');
  }

  function mistake(el) {
    state.errors += 1;
    shake(el, ctx.reducedMotion);
    ctx.sfx('soft');
    if (state.errors === 3) ctx.offerHint();
  }

  function onItem(item, btn) {
    if (round.mode === 'pick') {
      if (state.picked.has(item.id)) return;
      if (!isTarget(round, item)) return mistake(btn);
      state.picked.add(item.id);
      btn.classList.add('done');
      ctx.sfx('good');
      if (targetsLeft(round, state.picked) === 0) finish();
      return;
    }
    if (round.mode === 'sort') return select(item, btn);
    // order
    if (nextInOrder(round, state.placed) !== item.id) return mistake(btn);
    state.placed.add(item.id);
    ctx.sfx('good');
    render();
    if (state.placed.size === round.items.length) finish();
  }

  function onPot(pot, potEl) {
    if (!state.selected) {
      ctx.instruct('Touche d’abord une forme, puis son pot.', { quiet: true });
      return;
    }
    const item = round.items.find((i) => i.id === state.selected);
    if (!fitsPot(item, pot)) {
      mistake(root.querySelector(`.g-item[data-id="${item.id}"]`) ?? potEl);
      return;
    }
    state.placed.add(item.id);
    state.selected = null;
    ctx.sfx('good');
    render();
    if (state.placed.size === round.items.length) finish();
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints: state.hints, errors: state.errors, attempts: 1, level: null, data: { mode: round.mode, items: round.items.length } });
    if (!destroyed) ctx.celebrate(newRound);
  }

  newRound();

  return {
    hint() {
      state.hints += 1;
      let id = null;
      if (round.mode === 'pick') id = round.items.find((i) => isTarget(round, i) && !state.picked.has(i.id))?.id;
      if (round.mode === 'order') id = nextInOrder(round, state.placed);
      if (round.mode === 'sort') {
        const item = round.items.find((i) => i.id === state.selected) ?? round.items.find((i) => !state.placed.has(i.id));
        const btn = root.querySelector(`.g-item[data-id="${item.id}"]`);
        select(item, btn);
        root.querySelector(`.g-pot[data-id="pot-${item.shape}"]`)?.classList.add('glow');
        return;
      }
      root.querySelector(`.g-item[data-id="${id}"]`)?.classList.add('glow');
    },
    repeat() { ctx.instruct(round.prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
