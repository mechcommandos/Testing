/**
 * La pizzeria des fractions (jeu 18) : couper une pizza en parts égales, choisir les parts, servir la commande.
 * La fraction écrite (2/4) n'apparaît qu'à côté des parts choisies : la manipulation vient avant le symbole.
 * L'indice superpose la commande (parts en pointillés) sur la pizza du client.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { goodCuts, makeSeries, served, slicePath, words } from './rules.js';

function pizzaSvg({ n, selected = new Set(), ghost = null, small = false, onSlice = null, label }) {
  const wrap = h('div', { class: `z-pizza${small ? ' small' : ''}`, role: onSlice ? 'group' : 'img', 'aria-label': label });
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.innerHTML = '<circle cx="100" cy="100" r="96" fill="#d9a35b"/><circle cx="100" cy="100" r="88" fill="#f2c14e"/>';
  for (let i = 0; i < n; i++) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', slicePath(i, n, 100, 100, 88));
    path.setAttribute('class', `z-slice${selected.has(i) ? ' on' : ''}`);
    if (onSlice) {
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-pressed', selected.has(i) ? 'true' : 'false');
      path.setAttribute('aria-label', `Part ${i + 1} sur ${n}`);
      path.addEventListener('click', () => onSlice(i));
      path.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSlice(i); } });
    }
    svg.append(path);
  }
  // Garniture décorative (identique sur chaque pizza), sous les traits de coupe.
  svg.insertAdjacentHTML('beforeend', '<g class="z-top" pointer-events="none"><circle cx="70" cy="70" r="9" fill="#e5484d"/><circle cx="130" cy="64" r="9" fill="#e5484d"/><circle cx="140" cy="125" r="9" fill="#e5484d"/><circle cx="68" cy="132" r="9" fill="#e5484d"/><circle cx="100" cy="100" r="7" fill="#3aa65b"/></g>');
  if (ghost) for (let i = 0; i < ghost.num; i++) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', slicePath(i, ghost.den, 100, 100, 88));
    p.setAttribute('class', 'z-ghost');
    p.setAttribute('pointer-events', 'none');
    svg.append(p);
  }
  wrap.append(svg);
  return wrap;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let cut;
  let selected;
  let ghost;
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
    root.append(h('div', { class: 'c-game pizzeria' }, seriesDots(series.length, index), h('p', { class: 'z-order' }, h('strong', {}, 'Commande : '), task().prompt), ...body));
  }

  function ask() {
    const t = task();
    busy = false;
    question = null;
    ghost = null;
    selected = new Set();
    cut = t.kind === 'equivalent' ? t.cut : 0;
    if (t.kind === 'compare') {
      const model = h('div', { class: 'z-compare' }, [t.left, t.right].map(([n, d]) => h('div', { class: 'z-cmp' },
        pizzaSvg({ n: d, selected: new Set(Array.from({ length: n }, (_, i) => i)), small: true, label: `${words(n, d)} de pizza` }),
        h('span', { class: 'z-frac' }, `${n}/${d}`))));
      question = choiceQuestion(ctx, { model, choices: t.choices.map((c) => ({ ...c, aria: c.text, className: 'long' })), correctId: t.correctId, layout: 'list', onCorrect: () => success(`Oui : ${t.choices.find((c) => c.id === t.correctId).text.split(' (')[0]}, c’est plus de pizza.`) });
      frame(question.node);
    } else render();
    ctx.instruct(t.prompt);
  }

  function render() {
    const t = task();
    const parts = selected.size;
    const status = cut ? `Tu sers ${parts} part${parts > 1 ? 's' : ''} sur ${cut}${parts ? ` (${parts}/${cut})` : ''}.` : 'Choisis d’abord en combien de parts égales couper la pizza.';
    const cutBar = t.kind === 'cut'
      ? h('div', { class: 'z-cuts', role: 'group', 'aria-label': 'Couper la pizza' }, h('span', {}, 'Couper en'), t.cuts.map((c) => h('button', { class: `chip${cut === c ? ' on' : ''}`, 'data-cut': c, 'aria-pressed': cut === c ? 'true' : 'false', onclick: () => { if (busy) return; cut = c; selected = new Set(); ghost = null; ctx.sfx('tap'); render(); } }, `${c} parts`)))
      : null;
    frame(cutBar,
      pizzaSvg({ n: cut || 1, selected, ghost, label: cut ? `Pizza coupée en ${cut} parts égales` : 'Pizza entière', onSlice: cut ? toggle : null }),
      h('p', { class: 'z-status', 'aria-live': 'polite' }, status),
      h('button', { class: 'btn big', disabled: !cut || !parts, onclick: serve }, 'Servir'));
  }

  function toggle(i) {
    if (busy) return;
    selected.has(i) ? selected.delete(i) : selected.add(i);
    ctx.sfx('tap');
    render();
  }

  function serve() {
    if (busy) return;
    const t = task();
    if (served(t, cut, selected.size)) return success(`${selected.size} part${selected.size > 1 ? 's' : ''} sur ${cut}, c’est bien ${words(t.num, t.den)} !`);
    errors += 1;
    ctx.sfx('soft');
    shake(root.querySelector('.z-pizza'), ctx.reducedMotion);
    const tooMuch = selected.size * t.den > t.num * cut;
    const reachable = (t.num * cut) % t.den === 0;
    ctx.instruct(!reachable ? `Avec ${cut} parts, on ne peut pas faire exactement ${words(t.num, t.den)}. Essaie un autre découpage.` : tooMuch ? 'C’est trop de pizza. Retire une part.' : 'Ce n’est pas assez. Ajoute une part.');
    if (errors % 2 === 0) ctx.offerHint();
  }

  function success(text) {
    busy = true;
    if (question) errors += question.errors;
    ctx.sfx('good');
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? ask : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Commande suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { orders: series.map((t) => (t.kind === 'compare' ? `${t.left.join('/')} ? ${t.right.join('/')}` : `${t.num}/${t.den}`)) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const t = task();
      if (question) return question.hint();
      if (!cut) {
        const c = goodCuts(t, t.cuts)[0];
        root.querySelector(`[data-cut="${c}"]`)?.classList.add('glow');
        ctx.instruct(`Pour ${words(t.num, t.den)}, on peut couper en ${c} parts.`);
        return;
      }
      ghost = { num: t.num, den: t.den };
      render();
      ctx.instruct(`Les pointillés montrent ${words(t.num, t.den)} de la pizza : choisis les parts qui les recouvrent.`);
    },
    repeat() { if (series) ctx.instruct(task().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
