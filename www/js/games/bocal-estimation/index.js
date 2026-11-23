/**
 * Le bocal d'estimation (jeu 38) : un bocal de billes, trois estimations. On choisit, puis on compte ensemble
 * (le nombre monte jusqu'au vrai total). Aucune estimation n'est fausse ; on note seulement si elle était proche.
 * Indice : un paquet de 10 billes change de couleur, pour estimer par dizaines.
 */
import { clear, h } from '../../ui/dom.js';
import { continueButton, openChoice, seriesDots } from '../choices.js';
import { makeSeries, marbles, packOfTen, SERIES } from './rules.js';

const JAR_SVG = '<path d="M46 40h108v18q16 10 16 30v136q0 14-14 14H44q-14 0-14-14V88q0-20 16-30z" fill="#e8f6fd" stroke="#9fc3dc" stroke-width="4"/><rect x="40" y="26" width="120" height="18" rx="6" fill="#c98a4b"/><path d="M40 92q0-20 14-28" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let hints;
  let close;
  let marks;
  let busy = false;
  let destroyed = false;
  let counter = null;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    hints = 0;
    close = 0;
    ctx.activityStart();
    ask();
  }

  function jar(q, highlight = []) {
    const set = new Set(highlight);
    const balls = marks.map((m, i) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.r}" fill="${set.has(i) ? '#e5484d' : q.colors[0]}" stroke="${set.has(i) ? '#a8282d' : q.colors[1]}" stroke-width="2"/><circle cx="${(m.x - m.r * 0.35).toFixed(1)}" cy="${(m.y - m.r * 0.35).toFixed(1)}" r="${(m.r * 0.3).toFixed(1)}" fill="#fff" opacity=".6"/>`).join('');
    return `<svg viewBox="0 0 200 240" aria-hidden="true" focusable="false">${JAR_SVG}${balls}</svg>`;
  }

  function ask() {
    const q = series[index];
    busy = false;
    marks = marbles(q.count, random);
    const choice = openChoice({
      model: h('div', { class: 'c-model be-jar', role: 'img', 'aria-label': 'Un bocal rempli de billes', html: jar(q) }),
      choices: q.options.map((n) => ({ id: String(n), text: `environ ${n}`, aria: `environ ${n}`, className: 'be-guess' })),
      onPick: (id) => reveal(q, Number(id)),
    });
    clear(root);
    root.append(h('div', { class: 'c-game be-game' }, seriesDots(SERIES, index), choice.node, h('p', { class: 'be-total', 'aria-live': 'polite' })));
    ctx.instruct(`Combien de billes y a-t-il dans le bocal, à ton avis ? Ne compte pas : estime ! Environ ${q.options.join(', environ ')} ?`);
  }

  function reveal(q, guess) {
    busy = true;
    const good = guess === q.best;
    if (good) close += 1;
    const total = root.querySelector('.be-total');
    let n = 0;
    const stepMs = Math.max(20, Math.min(120, 1600 / q.count));
    clearInterval(counter);
    counter = setInterval(() => {
      n += 1;
      total.textContent = `${n} bille${n > 1 ? 's' : ''}`;
      if (n >= q.count) {
        clearInterval(counter);
        const text = good
          ? `Il y en a ${q.count}. Bravo, « environ ${guess} », c’était une très bonne estimation !`
          : `Il y en a ${q.count}. « Environ ${q.best} » était le plus proche. Une estimation, ça s’entraîne !`;
        ctx.sfx(good ? 'good' : 'tap');
        ctx.instruct(text);
        index += 1;
        root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < SERIES ? 'Bocal suivant' : 'Terminer', () => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }));
      }
    }, ctx.reducedMotion ? 10 : stepMs);
  }

  async function finish() {
    // Une estimation n'est jamais une erreur : la série est réussie ; on garde le nombre d'estimations proches.
    await ctx.activityDone({ success: true, hints, errors: 0, attempts: SERIES, level: null, data: { close, counts: series.map((q) => q.count) } });
    if (!destroyed) ctx.celebrate(newSeries, `${close} estimation${close > 1 ? 's' : ''} sur ${SERIES} très proche${close > 1 ? 's' : ''}.`);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const q = series[index];
      if (q.count < 10) { ctx.instruct('Regarde : y en a-t-il plus ou moins que tes dix doigts ?'); return; }
      root.querySelector('.be-jar').innerHTML = jar(q, packOfTen(marks));
      ctx.instruct('Les billes rouges font un paquet de 10. Combien de paquets comme celui-ci tiendraient dans le bocal ?');
    },
    repeat() { if (series && !busy) ctx.instruct(`Combien de billes y a-t-il dans le bocal, à ton avis ? Environ ${series[index].options.join(', environ ')} ?`); },
    destroy() { destroyed = true; clearInterval(counter); clear(root); },
  };
}
