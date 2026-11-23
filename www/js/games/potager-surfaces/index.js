/**
 * Le potager des surfaces (jeu 50) : compter les carreaux d'une parcelle (l'aire), comparer deux parcelles, puis
 * compter la clôture qui en fait le tour (le périmètre). Après la bonne réponse, les carreaux sont numérotés, ou la
 * clôture est posée.
 */
import { h } from '../../ui/dom.js';
import { quizGame } from '../quiz.js';
import { COLS, makeSeries, ROWS } from './rules.js';

const C = 46;

function plot(groups, { numbers = false, fence = null } = {}) {
  let svg = '';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) svg += `<rect x="${x * C}" y="${y * C}" width="${C}" height="${C}" fill="#e8f3df" stroke="#c9dcbc"/>`;
  let n = 0;
  for (const { cells, color, label } of groups) {
    for (const [x, y] of cells) {
      n += 1;
      svg += `<rect x="${x * C + 2}" y="${y * C + 2}" width="${C - 4}" height="${C - 4}" rx="5" fill="${color}"/>`;
      svg += numbers ? `<text x="${x * C + C / 2}" y="${y * C + C / 2 + 7}" text-anchor="middle" font-size="18" font-weight="800" fill="#fff" font-family="Verdana, sans-serif">${n}</text>`
        : `<circle cx="${x * C + C / 2 - 8}" cy="${y * C + C / 2 + 4}" r="4" fill="#3aa65b"/><circle cx="${x * C + C / 2 + 8}" cy="${y * C + C / 2 - 4}" r="4" fill="#3aa65b"/>`;
    }
    if (label) {
      const [x, y] = cells[0];
      svg += `<circle cx="${x * C + 12}" cy="${y * C + 12}" r="11" fill="#1a56b8"/><text x="${x * C + 12}" y="${y * C + 17}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="Verdana, sans-serif">${label}</text>`;
    }
  }
  if (fence) {
    const has = new Set(fence.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of fence) {
      const sides = [[0, -1, x * C, y * C, (x + 1) * C, y * C], [0, 1, x * C, (y + 1) * C, (x + 1) * C, (y + 1) * C], [-1, 0, x * C, y * C, x * C, (y + 1) * C], [1, 0, (x + 1) * C, y * C, (x + 1) * C, (y + 1) * C]];
      for (const [dx, dy, x1, y1, x2, y2] of sides) if (!has.has(`${x + dx},${y + dy}`)) svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#a0522d" stroke-width="6" stroke-linecap="round"/>`;
    }
  }
  return `<svg viewBox="-4 -4 ${COLS * C + 8} ${ROWS * C + 8}" aria-hidden="true" focusable="false">${svg}</svg>`;
}

const SOIL = '#a87b4f';

export function createGame(ctx) {
  return quizGame(ctx, {
    makeSeries,
    className: 'ps-game',
    view: (q) => {
      const art = h('div', { class: 'ps-plot' });
      const model = h('div', { class: 'c-model ps-model' }, art, h('p', { class: 'small' }, 'Un carreau = 1 mètre de côté.'));
      if (q.kind === 'compare') {
        art.innerHTML = plot([{ cells: q.a, color: SOIL, label: 'A' }, { cells: q.b, color: '#c98a4b', label: 'B' }]);
        const [big, small] = q.answer === 'A' ? [q.a, q.b] : [q.b, q.a];
        return {
          say: 'Quelle parcelle a le plus de place pour planter : la parcelle A ou la parcelle B ?',
          model,
          choices: q.options.map((l) => ({ id: l, text: l, aria: `Parcelle ${l}`, className: 'letter' })),
          explain: `Oui : la parcelle ${q.answer} a ${big.length} carreaux, l’autre en a ${small.length}.`,
          hint: 'Compte les carreaux de chaque parcelle.',
          onSolved: () => { art.innerHTML = plot([{ cells: q.a, color: SOIL, label: 'A' }, { cells: q.b, color: '#c98a4b', label: 'B' }], { numbers: false }); },
        };
      }
      art.innerHTML = plot([{ cells: q.cells, color: SOIL }]);
      const choices = q.options.map((n) => ({ id: n, text: n, aria: n, className: 'letter' }));
      if (q.kind === 'perimeter') {
        return {
          say: 'Combien de mètres de clôture faut-il pour faire tout le tour de la parcelle ?',
          model,
          choices,
          explain: `Oui : ${q.answer} mètres de clôture. On compte les côtés des carreaux qui touchent l’herbe, tout autour.`,
          hint: 'Suis le bord de la parcelle avec ton doigt et compte chaque côté de carreau.',
          onSolved: () => { art.innerHTML = plot([{ cells: q.cells, color: SOIL }], { fence: q.cells }); },
        };
      }
      return {
        say: q.rect ? 'Combien de carreaux a cette parcelle ? Astuce : compte les rangées.' : 'Combien de carreaux de terre a cette parcelle ?',
        model,
        choices,
        explain: q.rect ? `Oui : ${q.rect[1]} rangées de ${q.rect[0]} carreaux, ${q.rect[1]} × ${q.rect[0]} = ${q.answer}.` : `Oui : ${q.answer} carreaux.`,
        hint: q.rect ? `Il y a ${q.rect[1]} rangées. Combien de carreaux dans une rangée ?` : 'Touche chaque carreau du doigt en comptant.',
        onSolved: () => { art.innerHTML = plot([{ cells: q.cells, color: SOIL }], { numbers: true }); },
      };
    },
  });
}
