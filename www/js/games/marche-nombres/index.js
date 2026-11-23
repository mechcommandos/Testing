/** Le petit marché des nombres (jeu 3) : vue et interactions. */
import { h, clear } from '../../ui/dom.js';
import { fruitSvg, shake } from '../shared.js';
import { checkBasket, compareAnswer, feedback, isValidOrder, makeOrder, name, prompt } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let order;
  let state;
  let destroyed = false;

  function newOrder() {
    do { order = makeOrder(difficulty, random); } while (!isValidOrder(order));
    state = { count: order.start ?? 0, errors: 0, hints: 0, attempts: 0, message: '' };
    ctx.activityStart();
    render();
    ctx.instruct(prompt(order));
  }

  /** Quantité montrée en points (sans chiffre au niveau 1), puis chiffre et points. */
  function quantity(n, withDigit) {
    return h('div', { class: 'm-qty', 'aria-label': String(n) },
      withDigit ? h('strong', {}, String(n)) : null,
      h('span', { class: 'dots' }, Array.from({ length: n }, () => h('i'))));
  }

  function basket(n, { removable = false, highlightFrom = null } = {}) {
    return h('div', { class: 'm-basket' },
      h('div', { class: 'm-fruits' }, Array.from({ length: n }, (_, i) => h(removable && (order.kind !== 'complete' || i >= order.start) ? 'button' : 'span', {
        class: `m-fruit${highlightFrom !== null && i >= highlightFrom ? ' glow' : ''}`,
        'aria-label': removable ? `retirer ${name(order.fruit, 1)}` : name(order.fruit, 1),
        html: fruitSvg(order.fruit),
        onclick: removable ? () => change(-1) : null,
      }))),
      h('div', { class: 'm-basket-art', 'aria-hidden': 'true' }));
  }

  function render() {
    clear(root);
    if (order.kind === 'compare') {
      root.append(h('div', { class: 'm-compare' },
        h('button', { class: 'm-choice', 'aria-label': 'le panier de gauche', onclick: (e) => answer('left', e.currentTarget) }, basket(order.left)),
        h('button', { class: 'm-choice equal', onclick: (e) => answer('equal', e.currentTarget) }, h('span', { class: 'big' }, '='), h('span', {}, 'Autant')),
        h('button', { class: 'm-choice', 'aria-label': 'le panier de droite', onclick: (e) => answer('right', e.currentTarget) }, basket(order.right))),
      state.message ? h('p', { class: 'm-message', role: 'status' }, state.message) : null);
      return;
    }

    const goal = order.kind === 'count'
      ? h('div', { class: 'm-order' }, h('span', { html: fruitSvg(order.fruit, 36) }), quantity(order.target, false))
      : h('div', { class: 'm-order equation', 'aria-label': `${order.start} plus combien égale ${order.target}` },
        h('strong', {}, String(order.start)), h('span', {}, '+'), h('strong', { class: 'q' }, state.count > order.start ? String(state.count - order.start) : '?'), h('span', {}, '='), h('strong', {}, String(order.target)));

    root.append(h('div', { class: 'm-market' },
      goal,
      basket(state.count, { removable: true }),
      h('div', { class: 'm-actions' },
        h('button', { class: 'm-add', 'aria-label': `ajouter ${name(order.fruit, 1)}`, disabled: state.count >= order.max, onclick: () => change(1) },
          h('span', { html: fruitSvg(order.fruit, 52) }), h('span', {}, '+1')),
        h('button', { class: 'btn big', onclick: verify }, 'Vérifier')),
      state.message ? h('p', { class: 'm-message', role: 'status' }, state.message) : null));
  }

  function change(delta) {
    const min = order.start ?? 0;
    state.count = Math.max(min, Math.min(order.max, state.count + delta));
    state.message = '';
    ctx.sfx('tap');
    render();
  }

  async function verify() {
    state.attempts += 1;
    const { ok } = checkBasket(order, state.count);
    if (ok) return finish(true);
    state.errors += 1;
    state.message = feedback(order, state.count);
    ctx.sfx('soft');
    ctx.instruct(state.message, { quiet: false });
    render();
    shake(root.querySelector('.m-basket'), ctx.reducedMotion);
    if (state.errors === 2) ctx.offerHint();
  }

  async function answer(choice, el) {
    state.attempts += 1;
    if (choice === compareAnswer(order)) return finish(true);
    state.errors += 1;
    state.message = 'Regarde bien chaque panier. Tu peux compter les fruits.';
    ctx.sfx('soft');
    shake(el, ctx.reducedMotion);
    render();
    if (state.errors === 2) ctx.offerHint();
  }

  async function finish() {
    ctx.sfx('good');
    await ctx.activityDone({
      success: true, hints: state.hints, errors: state.errors, attempts: state.attempts, level: null,
      data: { kind: order.kind, target: order.target ?? null, left: order.left ?? null, right: order.right ?? null },
    });
    if (!destroyed) ctx.celebrate(newOrder);
  }

  newOrder();

  return {
    hint() {
      state.hints += 1;
      if (order.kind === 'compare') {
        state.message = `À gauche : ${order.left}. À droite : ${order.right}.`;
        ctx.instruct(state.message);
        render();
        root.querySelectorAll('.m-choice:not(.equal)').forEach((el, i) => el.append(h('span', { class: 'm-count' }, String(i === 0 ? order.left : order.right))));
        return;
      }
      state.message = `Il y a ${state.count} ${name(order.fruit, state.count)} dans le panier. ${feedback(order, state.count)}`;
      ctx.instruct(state.message);
      render();
    },
    repeat() { ctx.instruct(prompt(order)); },
    destroy() { destroyed = true; clear(root); },
  };
}
