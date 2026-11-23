/**
 * Dessus, dessous, à gauche (jeu 32) : poser un objet au bon endroit d'un décor (table, boîte, boîte et panier).
 * L'objet se pose où l'enfant touche ; une mauvaise place le fait trembler puis il revient. Indice : la consigne
 * redite, puis le bon endroit qui brille.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { LEVELS, makeSeries, SERIES } from './rules.js';

const W = 300;
const H = 220;
const art = (id, x, y, size) => picto(id, size).replace('<svg ', `<svg x="${x}" y="${y}" `);

const TABLE = '<rect x="80" y="104" width="140" height="14" rx="4" fill="#c98a4b"/><rect x="80" y="104" width="140" height="5" rx="3" fill="#dba56d"/><rect x="92" y="118" width="10" height="76" fill="#a8703a"/><rect x="198" y="118" width="10" height="76" fill="#a8703a"/>';
const BOX_BACK = '<path d="M96 82h108l-8 38H104z" fill="#b98a55"/>';
const BOX_FRONT = '<path d="M90 112h120v76H90z" fill="#d9a86a"/><path d="M90 112h120v10H90z" fill="#c4935a"/><path d="M90 112l-14 -18h22zM210 112l14 -18h-22z" fill="#e6bd85"/>';
const BASKET = art('panier', 196, 118, 70);
const BOX_SMALL = '<path d="M64 128h72v66H64z" fill="#d9a86a"/><path d="M64 128h72v9H64z" fill="#c4935a"/>';
const FLOOR = '<rect x="0" y="194" width="300" height="26" fill="#e9dcc2"/>';

function scene(level, object, zone) {
  const obj = zone ? art(object.id, zone.obj[0], zone.obj[1], zone.obj[2]) : '';
  const where = zone?.obj[3];
  if (level.scene === 'table') return `${FLOOR}${TABLE}${obj}`;
  if (level.scene === 'boite') {
    if (where === 'behind') return `${FLOOR}${obj}${BOX_BACK}${BOX_FRONT}`;
    if (where === 'inside') return `${FLOOR}${BOX_BACK}${obj}${BOX_FRONT}`;
    return `${FLOOR}${BOX_BACK}${BOX_FRONT}${obj}`;
  }
  return `${FLOOR}${BOX_SMALL}${BASKET}${obj}`;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  const level = LEVELS[Math.min(difficulty, 2)];
  let series;
  let index;
  let errors;
  let hints;
  let hintStep;
  let busy = false;
  let destroyed = false;
  let stage;
  let zones;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  function ask() {
    const q = series[index];
    hintStep = 0;
    busy = false;
    stage = h('div', { class: 'dd-stage', role: 'img', 'aria-label': 'Le décor', html: `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${scene(level, q.object, null)}</svg>` });
    zones = level.zones.map((z) => h('button', {
      class: 'dd-zone', 'aria-label': z.words, 'data-zone': z.id,
      style: { left: `${(z.rect[0] / W) * 100}%`, top: `${(z.rect[1] / H) * 100}%`, width: `${(z.rect[2] / W) * 100}%`, height: `${(z.rect[3] / H) * 100}%` },
      onclick: (e) => place(z, e.currentTarget),
    }));
    const holder = h('div', { class: 'dd-object', 'aria-hidden': 'true', html: picto(q.object.id, 72) });
    clear(root);
    root.append(h('div', { class: 'c-game dd-game' }, seriesDots(SERIES, index), h('div', { class: 'dd-hand' }, holder), h('div', { class: 'dd-board' }, stage, zones)));
    ctx.instruct(q.prompt);
  }

  function place(zone, btn) {
    if (busy) return;
    const q = series[index];
    stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${scene(level, q.object, zone)}</svg>`;
    if (zone.id !== q.target) {
      errors += 1;
      ctx.sfx('soft');
      shake(btn, ctx.reducedMotion);
      busy = true;
      setTimeout(() => {
        if (destroyed) return;
        stage.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${scene(level, q.object, null)}</svg>`;
        busy = false;
      }, 900);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    busy = true;
    btn.classList.add('ok');
    root.querySelector('.dd-object').classList.add('placed');
    ctx.sfx('good');
    ctx.instruct(`Oui ! ${q.object.name[0].toUpperCase()}${q.object.name.slice(1)} est ${level.zones.find((z) => z.id === q.target).words}.`);
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }, 700);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { positions: series.map((q) => q.target) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const q = series[index];
      if (hintStep === 0) ctx.instruct(q.prompt.replace('.', ' : regarde bien.'));
      else zones.find((z) => z.dataset.zone === q.target)?.classList.add('glow');
      hintStep += 1;
    },
    repeat() { if (series) ctx.instruct(series[index].prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
