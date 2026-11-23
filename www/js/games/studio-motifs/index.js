/**
 * Le studio des motifs et des symétries (jeu 30) : choisir une couleur, toucher les cases. Les cases données ont un
 * petit point (on ne peut pas les changer). L'axe de symétrie est dessiné. Retoucher une case de la même couleur l'efface.
 * « Création libre » : une grille vide, un miroir à activer, rien n'est vérifié ni enregistré.
 */
import { clear, h } from '../../ui/dom.js';
import { continueButton, seriesDots } from '../choices.js';
import { firstWrong, freeGrid, makeSeries, matches, paint, paintFree, PALETTE } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let grid;
  let color = 0;
  let errors;
  let hints;
  let free = null; // { grid, mirror } en mode libre
  let solved = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    free = null;
    ctx.activityStart();
    start();
  }

  const cur = () => series[index];

  function start() {
    grid = cur().given.map((r) => [...r]);
    solved = false;
    color = 0;
    render();
    ctx.instruct(cur().prompt);
  }

  function palette(count) {
    return h('div', { class: 'sm-palette', role: 'group', 'aria-label': 'Couleurs' }, PALETTE.slice(0, count).map((c, i) => h('button', {
      class: `sm-color${color === i ? ' on' : ''}`, style: { background: c }, 'aria-label': `Couleur ${i + 1}`, 'aria-pressed': color === i ? 'true' : 'false',
      onclick: () => { color = i; ctx.sfx('tap'); free ? renderFree() : render(); },
    })));
  }

  function cells(g, { locked = null, axis = '', onTap }) {
    const rows = g.length;
    const cols = g[0].length;
    return h('div', { class: `sm-grid${axis.includes('v') ? ' axis-v' : ''}${axis.includes('h') ? ' axis-h' : ''}`, style: { gridTemplateColumns: `repeat(${cols}, 1fr)` }, role: 'group', 'aria-label': 'Grille' },
      g.flatMap((row, y) => row.map((c, x) => h('button', {
        class: `sm-cell${locked?.[y]?.[x] ? ' given' : ''}`, 'data-x': x, 'data-y': y, style: c === null ? null : { background: PALETTE[c] },
        'aria-label': `Case ${x + 1}, ${y + 1}${c === null ? ', vide' : `, couleur ${c + 1}`}${locked?.[y]?.[x] ? ', donnée' : ''}`,
        onclick: () => onTap(x, y),
      }))));
  }

  function render(message = '') {
    const ch = cur();
    clear(root);
    root.append(h('div', { class: 'c-game studio' },
      seriesDots(series.length, index),
      h('p', { class: 'sm-prompt' }, ch.prompt),
      cells(grid, { locked: ch.locked, axis: ch.axis ?? '', onTap: tap }),
      palette(ch.colors),
      h('p', { class: 'sm-msg', 'aria-live': 'polite' }, message),
      h('button', { class: 'btn ghost small', onclick: openFree }, 'Création libre (sans modèle)')));
  }

  function tap(x, y) {
    if (solved) return;
    const ch = cur();
    if (ch.locked[y][x]) { ctx.sfx('soft'); return; }
    grid = paint(ch, grid, x, y, color);
    // Une case coloriée autrement que le modèle est comptée comme erreur (mais rien ne se bloque).
    if (grid[y][x] !== null && grid[y][x] !== ch.target[y][x]) { errors += 1; if (errors % 4 === 0) ctx.offerHint(); }
    ctx.sfx('tap');
    render();
    if (matches(ch, grid)) success();
  }

  function success() {
    solved = true;
    ctx.sfx('good');
    root.querySelector('.sm-grid').classList.add('done');
    ctx.instruct('Bravo, le dessin est complet !');
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(continueButton(index < series.length ? 'Dessin suivant' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { kinds: series.map((c) => c.kind) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  // ----- Création libre : jamais vérifiée, jamais enregistrée -----
  function openFree() {
    free = { grid: freeGrid(8), mirror: true };
    color = 0;
    renderFree();
    ctx.instruct('Création libre : dessine ce que tu veux. Avec le miroir, ton dessin se reflète de l’autre côté.');
  }

  function renderFree() {
    clear(root);
    root.append(h('div', { class: 'c-game studio' },
      h('p', { class: 'sm-prompt' }, 'Création libre : rien n’est noté, amuse-toi !'),
      cells(free.grid, { axis: free.mirror ? 'v' : '', onTap: (x, y) => { free.grid = paintFree(free.grid, x, y, color, free.mirror); ctx.sfx('tap'); renderFree(); } }),
      palette(PALETTE.length),
      h('div', { class: 'row center' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: free.mirror, onchange: (e) => { free.mirror = e.target.checked; renderFree(); } }), ' Miroir'),
        h('button', { class: 'btn ghost small', onclick: () => { free.grid = freeGrid(8); renderFree(); } }, 'Tout effacer'),
        h('button', { class: 'btn small', onclick: () => { free = null; render(); ctx.instruct(cur().prompt); } }, 'Revenir aux défis'))));
  }

  newSeries();

  return {
    hint() {
      if (!series || solved || free) return;
      hints += 1;
      const w = firstWrong(cur(), grid);
      if (!w) return;
      color = w.color !== null ? w.color : grid[w.y][w.x]; // case à effacer : on choisit sa couleur, un toucher l'efface
      render(w.color === null ? 'La case qui brille doit rester vide : touche-la avec sa couleur pour l’effacer.' : 'La case qui brille : la bonne couleur est déjà choisie.');
      root.querySelector(`.sm-cell[data-x="${w.x}"][data-y="${w.y}"]`)?.classList.add('glow');
    },
    repeat() { if (series) ctx.instruct(free ? 'Création libre : dessine ce que tu veux.' : cur().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
