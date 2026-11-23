/**
 * La boutique des petits budgets (jeu 20) : payer le prix exact, composer un panier dans un budget, rendre la monnaie.
 * Pièces et billets dessinés, argent virtuel. Le total n'est affiché qu'avec l'indice : c'est à l'enfant de compter.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, pic, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { basketOk, coinsFor, euros, makeSeries, sum } from './rules.js';

function moneyArt(value) {
  if (value <= 2) {
    const [outer, inner] = value === 1 ? ['#e8c34a', '#c9ccd1'] : ['#c9ccd1', '#e8c34a'];
    return `<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false"><circle cx="30" cy="30" r="28" fill="${outer}" stroke="#8a7a3a" stroke-width="2"/><circle cx="30" cy="30" r="19" fill="${inner}"/><text x="30" y="37" text-anchor="middle" font-size="20" font-weight="800" fill="#3a3a3a">${value}</text></svg>`;
  }
  const color = { 5: '#8fa3a0', 10: '#d9817a', 20: '#7a9bd9' }[value];
  return `<svg viewBox="0 0 100 56" aria-hidden="true" focusable="false"><rect x="2" y="2" width="96" height="52" rx="6" fill="${color}" stroke="#4a4a4a" stroke-width="2"/><circle cx="74" cy="28" r="14" fill="rgba(255,255,255,.35)"/><text x="30" y="37" text-anchor="middle" font-size="22" font-weight="800" fill="#1f2a3d">${value} €</text></svg>`;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let tray;
  let picked;
  let showTotal;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  const task = () => series[index];

  function frame(...body) {
    clear(root);
    root.append(h('div', { class: 'c-game shop' }, seriesDots(series.length, index), ...body));
  }

  function ask() {
    const t = task();
    busy = false;
    question = null;
    showTotal = false;
    tray = [];
    picked = new Set();
    if (t.kind === 'yesno') {
      const model = h('div', { class: 'c-model s-pair' }, t.items.map((i) => h('div', { class: 's-tag' }, pic(i.picto, 64, 'c-pic'), h('strong', {}, euros(i.price)))), h('p', { class: 's-budget' }, `Budget : ${euros(t.budget)}`));
      question = choiceQuestion(ctx, { model, choices: t.choices.map((c) => ({ ...c, aria: c.text })), correctId: t.correctId, onCorrect: () => success(`${euros(t.items[0].price)} + ${euros(t.items[1].price)} = ${euros(t.total)}. ${t.total < t.budget ? `C’est moins que ${euros(t.budget)} : c’est possible.` : t.total === t.budget ? `C’est exactement ${euros(t.budget)} : c’est possible.` : `C’est plus que ${euros(t.budget)} : ce n’est pas possible.`}`) });
      frame(question.node);
    } else if (t.kind === 'basket') renderBasket();
    else renderPay();
    ctx.instruct(t.prompt);
  }

  // ----- Payer ou rendre la monnaie : poser pièces et billets sur le comptoir -----
  function renderPay() {
    const t = task();
    const head = t.kind === 'pay'
      ? h('div', { class: 'c-model s-pair' }, h('div', { class: 's-tag' }, pic(t.item.picto, 72, 'c-pic'), h('strong', {}, euros(t.item.price))))
      : h('div', { class: 'c-model s-pair' }, h('div', { class: 's-tag' }, pic(t.item.picto, 72, 'c-pic'), h('strong', {}, euros(t.item.price))), h('div', { class: 's-tag' }, h('span', { class: 's-money', html: moneyArt(t.paid) }), h('span', { class: 'small' }, 'donné par le client')));
    const counter = h('div', { class: 's-counter', 'aria-live': 'polite', 'aria-label': `Sur le comptoir : ${tray.length ? tray.map(euros).join(', ') : 'rien'}` },
      tray.length ? tray.map((v, i) => h('button', { class: 's-money', 'aria-label': `Reprendre ${euros(v)}`, html: moneyArt(v), onclick: () => { if (busy) return; tray.splice(i, 1); renderPay(); } })) : h('span', { class: 'small' }, t.kind === 'pay' ? 'Pose ici l’argent pour payer.' : 'Pose ici la monnaie à rendre.'));
    frame(head,
      h('p', { class: 's-label' }, t.kind === 'pay' ? 'Comptoir' : 'Monnaie à rendre', showTotal ? h('strong', { class: 's-total' }, ` · total : ${euros(sum(tray))}`) : null),
      counter,
      h('div', { class: 's-purse', role: 'group', 'aria-label': 'Porte-monnaie' }, t.money.map((v) => h('button', { class: 's-money', 'aria-label': `Poser ${euros(v)}`, html: moneyArt(v), onclick: () => { if (busy) return; tray.push(v); ctx.sfx('tap'); renderPay(); } }))),
      h('button', { class: 'btn big', disabled: !tray.length, onclick: checkPay }, t.kind === 'pay' ? 'Payer' : 'Rendre'));
  }

  function checkPay() {
    if (busy) return;
    const t = task();
    const total = sum(tray);
    if (total === t.amount) return success(t.kind === 'pay' ? `${tray.map(euros).join(' + ')} = ${euros(total)} : c’est le prix exact.` : `${euros(t.item.price)} + ${euros(total)} de monnaie = ${euros(t.paid)}. C’est juste !`);
    errors += 1;
    ctx.sfx('soft');
    shake(root.querySelector('.s-counter'), ctx.reducedMotion);
    ctx.instruct(total < t.amount ? 'Ce n’est pas assez. Ajoute de l’argent.' : 'C’est trop. Reprends de l’argent.');
    if (errors % 2 === 0) ctx.offerHint();
  }

  // ----- Panier dans un budget -----
  function renderBasket() {
    const t = task();
    const chosen = t.shelf.filter((i) => picked.has(i.id));
    frame(h('p', { class: 's-budget big' }, `Budget : ${euros(t.budget)}`),
      h('div', { class: 's-shelf', role: 'group', 'aria-label': 'Rayon' }, t.shelf.map((i) => h('button', {
        class: `s-item${picked.has(i.id) ? ' on' : ''}`, 'aria-pressed': picked.has(i.id) ? 'true' : 'false', 'aria-label': `${i.name}, ${euros(i.price)}`,
        onclick: () => { if (busy) return; picked.has(i.id) ? picked.delete(i.id) : picked.add(i.id); ctx.sfx('tap'); renderBasket(); },
      }, pic(i.picto, 56, 'c-pic'), h('strong', {}, euros(i.price))))),
      h('p', { class: 's-label' }, `Panier : ${chosen.length} article${chosen.length > 1 ? 's' : ''}`, showTotal ? h('strong', { class: 's-total' }, ` · total : ${euros(sum(chosen.map((i) => i.price)))}`) : null),
      h('button', { class: 'btn big', disabled: chosen.length < 2, onclick: checkBasket }, 'Passer à la caisse'));
  }

  function checkBasket() {
    if (busy) return;
    const t = task();
    const chosen = t.shelf.filter((i) => picked.has(i.id));
    const total = sum(chosen.map((i) => i.price));
    if (basketOk(chosen, t.budget)) return success(`${chosen.map((i) => euros(i.price)).join(' + ')} = ${euros(total)}, ce n’est pas plus que ${euros(t.budget)}. Bon panier !`);
    errors += 1;
    ctx.sfx('soft');
    ctx.instruct(`${chosen.map((i) => euros(i.price)).join(' + ')} = ${euros(total)} : c’est plus que ${euros(t.budget)}. Enlève un article ou prends-en un moins cher.`);
    if (errors % 2 === 0) ctx.offerHint();
  }

  function success(text) {
    busy = true;
    if (question) errors += question.errors;
    ctx.sfx('good');
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? ask : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Client suivant' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { tasks: series.map((t) => t.kind) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const t = task();
      if (question) return question.hint();
      showTotal = true;
      if (t.kind === 'basket') {
        renderBasket();
        ctx.instruct('Le total du panier est affiché : il doit rester inférieur ou égal au budget.');
      } else {
        renderPay();
        ctx.instruct(t.kind === 'change' ? `${euros(t.paid)} − ${euros(t.item.price)} : compte de ${t.item.price} jusqu’à ${t.paid}. Par exemple : ${coinsFor(t.amount, t.money).map(euros).join(' + ')}.` : `Le total est affiché. Par exemple : ${coinsFor(t.amount, t.money).map(euros).join(' + ')}.`);
      }
    },
    repeat() { if (series) ctx.instruct(task().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
