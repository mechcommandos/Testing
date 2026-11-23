/**
 * Le voyage des cartes (jeu 21) : tracer un chemin case par case sur une carte fictive, avec sa légende.
 * Toucher une case voisine de la dernière l'ajoute au chemin (on peut repasser par une case : utile pour revenir d'un lieu
 * au fond d'une impasse) ; « Annuler un pas » retire la dernière case ; toucher une case plus ancienne du chemin le raccourcit.
 * Arrivé au but, le chemin est vérifié (lieux de passage, nombre de pas). L'indice montre la prochaine case utile.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { continueButton, loadJson, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { checkPath, find, key, makeSeries, nextHint, promptFor, steps, toPlace, walkable } from './rules.js';

const REASONS = {
  via: (t, L) => `Te voilà au bout, mais il fallait passer par ${t.via.map(L).join(' puis ')}. Raccourcis ton chemin en touchant une de ses cases.`,
  long: (t) => `Ton chemin fait trop de pas : ${t.maxSteps} au plus. Cherche plus court.`,
};

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let path;
  let hintCell;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/voyage-cartes.json');
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

  const task = () => series[index];
  const L = (c) => content.legend[c].label;

  function start() {
    path = [find(task().grid, task().from)];
    hintCell = null;
    busy = false;
    render();
    ctx.instruct(promptFor(content, task()));
  }

  function cellLabel(ch, x, y) {
    const name = content.legend[ch]?.label ?? content.terrain[ch].label;
    return `${name}, colonne ${x + 1}, ligne ${y + 1}`;
  }

  function render() {
    const t = task();
    const onPath = new Map(path.map((c, i) => [key(c), i]));
    const end = find(t.grid, t.to);
    const grid = h('div', { class: 'v-map', role: 'group', 'aria-label': 'Carte', style: { gridTemplateColumns: `repeat(${t.grid[0].length}, 1fr)` } },
      t.grid.flatMap((row, y) => row.map((ch, x) => {
        const k = key({ x, y });
        const cls = ['v-cell', `t-${{ '.': 'grass', '=': 'road', T: 'forest', '~': 'water', B: 'bridge', '^': 'mountain' }[ch] ?? 'place'}`];
        if (onPath.has(k)) cls.push('on');
        if (onPath.get(k) === path.length - 1) cls.push('head');
        if (k === key(end)) cls.push('goal');
        if (hintCell && k === key(hintCell)) cls.push('glow');
        const leg = content.legend[ch];
        return h('button', { class: cls.join(' '), 'aria-label': cellLabel(ch, x, y) + (onPath.has(k) ? ' (sur ton chemin)' : ''), onclick: () => tap({ x, y }) },
          leg ? h('span', { class: 'v-pic', 'aria-hidden': 'true', html: picto(leg.picto, 34) }) : ch === '^' ? h('span', { class: 'v-pic', 'aria-hidden': 'true', html: picto('montagne', 30) }) : null,
          onPath.has(k) && !leg ? h('span', { class: 'v-step', 'aria-hidden': 'true' }, String(onPath.get(k))) : null);
      })));
    const placeIds = [...new Set(t.grid.flat().filter((c) => content.legend[c]))];
    const legend = h('div', { class: 'v-legend', 'aria-label': 'Légende' }, h('strong', {}, 'Légende'),
      placeIds.map((c) => h('span', { class: 'v-key' }, h('span', { class: 'v-pic', 'aria-hidden': 'true', html: picto(content.legend[c].picto, 26) }), content.legend[c].label.replace(/^(la |le |l’)/, ''))),
      [['road', 'route'], ['bridge', 'pont'], ['forest', 'forêt'], ['water', 'rivière']].map(([cls, label]) => h('span', { class: 'v-key' }, h('span', { class: `v-swatch t-${cls}` }), label)));
    const info = t.maxSteps ? `${steps(path)} pas sur ${t.maxSteps} au plus` : `${steps(path)} pas`;
    clear(root);
    root.append(h('div', { class: 'c-game maps' }, seriesDots(series.length, index),
      h('div', { class: 'v-layout' }, grid,
        h('div', { class: 'v-side' }, legend, h('p', { class: 'v-info', 'aria-live': 'polite' }, info))),
      h('div', { class: 'row center' },
        h('button', { class: 'btn ghost', disabled: path.length < 2 || busy, onclick: () => { path = path.slice(0, -1); hintCell = null; render(); } }, '↩ Annuler un pas'),
        h('button', { class: 'btn ghost', disabled: path.length < 2 || busy, onclick: () => { path = path.slice(0, 1); hintCell = null; render(); } }, 'Effacer le chemin'))));
  }

  function tap(cell) {
    if (busy) return;
    const t = task();
    const k = key(cell);
    const last = path[path.length - 1];
    const ch = t.grid[cell.y][cell.x];
    const cellEl = root.querySelectorAll('.v-cell')[cell.y * t.grid[0].length + cell.x];
    const next = Math.abs(last.x - cell.x) + Math.abs(last.y - cell.y) === 1;
    const at = path.findIndex((c) => key(c) === k);
    if (!next && at >= 0) {
      // Case plus ancienne du chemin : on raccourcit jusqu'à elle.
      path = path.slice(0, at + 1);
      render();
      return;
    }
    if (!next) {
      ctx.sfx('soft');
      shake(cellEl, ctx.reducedMotion);
      ctx.instruct('Avance case par case : touche une case juste à côté de la dernière de ton chemin.');
      return;
    }
    if (t.avoid.includes(ch)) {
      errors += 1;
      ctx.sfx('soft');
      shake(cellEl, ctx.reducedMotion);
      ctx.instruct('La consigne dit d’éviter la forêt. Passe ailleurs.');
      return;
    }
    if (!walkable(content, ch)) {
      errors += 1;
      ctx.sfx('soft');
      shake(cellEl, ctx.reducedMotion);
      ctx.instruct(ch === '~' ? 'On ne peut pas traverser la rivière à pied : cherche un pont.' : 'On ne peut pas passer par la montagne.');
      if (errors % 3 === 0) ctx.offerHint();
      return;
    }
    path.push(cell);
    hintCell = null;
    ctx.sfx('tap');
    render();
    if (k === key(find(t.grid, t.to))) check();
  }

  function check() {
    const t = task();
    const result = checkPath(content, t, path);
    if (result.ok) return success();
    errors += 1;
    ctx.sfx('soft');
    ctx.instruct(REASONS[result.reason]?.(t, L) ?? 'Ce chemin ne convient pas encore.');
    if (errors % 2 === 0) ctx.offerHint();
  }

  function success() {
    busy = true;
    ctx.sfx('good');
    root.querySelector('.v-map').classList.add('done');
    const text = `Te voilà ${toPlace(L(task().to))}, en ${steps(path)} pas.`;
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Voyage suivant' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { trips: series.map((t) => `${t.map}:${t.from}-${t.to}`) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      // Si le chemin est déjà trop long ou passe mal, on repart du départ pour l'indice.
      const t = task();
      let cell = nextHint(content, t, path);
      if (!cell || (t.maxSteps && steps(path) >= t.maxSteps)) {
        path = path.slice(0, 1);
        cell = nextHint(content, t, path);
      }
      hintCell = cell;
      render();
      ctx.instruct('La case qui brille est un bon prochain pas.');
    },
    repeat() { if (series) ctx.instruct(promptFor(content, task())); },
    destroy() { destroyed = true; clear(root); },
  };
}
