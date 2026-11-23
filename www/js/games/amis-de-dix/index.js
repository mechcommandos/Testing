/**
 * Les amis de 10 (jeu 44) : combien manque-t-il pour faire 10, 20 ou 100 ? Le modèle montre les ronds déjà là
 * (cadres de 10) ou une plaque de 100 carreaux ; après la bonne réponse, les cases manquantes se remplissent.
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { makeSeries } from './rules.js';

/** Cadres de 10 (2 rangées de 5) : les `start` premiers ronds sont pleins. */
function frames(total, start) {
  const n = total / 10;
  const cell = 34;
  let svg = '';
  for (let f = 0; f < n; f++) {
    const ox = f * (5 * cell + 18);
    svg += `<rect x="${ox}" y="0" width="${5 * cell}" height="${2 * cell}" rx="8" fill="#fff" stroke="#23324d" stroke-width="2"/>`;
    for (let i = 0; i < 10; i++) {
      const k = f * 10 + i;
      const x = ox + (i % 5) * cell + cell / 2;
      const y = Math.floor(i / 5) * cell + cell / 2;
      svg += `<circle class="${k < start ? 'ad-full' : 'ad-empty'}" cx="${x}" cy="${y}" r="12" fill="${k < start ? '#ef5f95' : '#fff'}" stroke="${k < start ? '#ef5f95' : '#c4cedb'}" stroke-width="2" stroke-dasharray="${k < start ? '' : '4 3'}"/>`;
    }
    if (f < n - 1) svg += `<line x1="${ox + 5 * cell + 9}" x2="${ox + 5 * cell + 9}" y1="4" y2="${2 * cell - 4}" stroke="#c4cedb" stroke-width="2"/>`;
  }
  const width = n * 5 * cell + (n - 1) * 18;
  return `<svg viewBox="-2 -2 ${width + 4} ${2 * cell + 4}" width="${Math.min(360, width + 4)}" aria-hidden="true" focusable="false">${svg}</svg>`;
}

/** Plaque de 100 : 10 rangées de 10 carreaux, les `start` premiers colorés. */
function hundred(start) {
  const c = 16;
  let svg = '';
  for (let i = 0; i < 100; i++) {
    const x = (i % 10) * c;
    const y = Math.floor(i / 10) * c;
    svg += `<rect class="${i < start ? 'ad-full' : 'ad-empty'}" x="${x + 1}" y="${y + 1}" width="${c - 2}" height="${c - 2}" rx="2" fill="${i < start ? '#1fb3c6' : '#fff'}" stroke="${i < start ? '#1fb3c6' : '#c4cedb'}"/>`;
  }
  return `<svg viewBox="0 0 ${10 * c} ${10 * c}" width="200" aria-hidden="true" focusable="false">${svg}</svg>`;
}

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'ad-game',
    data: (series) => ({ total: series[0].total }),
    view: (q) => {
      const art = q.total === 100 ? hundred(q.start) : frames(q.total, q.start);
      return {
        say: `${q.start}, et combien pour faire ${q.total} ?`,
        model: h('div', { class: 'c-model ad-model' },
          h('div', { class: 'ad-art', role: 'img', 'aria-label': `${q.start} sur ${q.total}`, html: art }),
          h('p', { class: 'ad-sum' }, `${q.start} + `, h('span', { class: 'ad-blank' }, '?'), ` = ${q.total}`)),
        choices: q.options.map((n) => ({ id: n, text: n, aria: n, className: 'ad-num' })),
        explain: `Oui : ${q.start} + ${q.answer} = ${q.total}.`,
        hint: q.total === 100 ? 'Compte d’abord les dizaines qui manquent, puis les unités.' : 'Compte les ronds vides.',
        onSolved: (root) => {
          root.querySelectorAll('.ad-empty').forEach((el) => { el.setAttribute('fill', '#ffd75e'); el.setAttribute('stroke', '#f2b705'); el.removeAttribute('stroke-dasharray'); });
          const blank = root.querySelector('.ad-blank');
          if (blank) blank.textContent = q.answer;
        },
      };
    },
  });
}
