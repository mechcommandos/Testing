/**
 * Mission météo et saisons (jeu 22) : habiller le compagnon selon la météo, la saison ou le lieu.
 * Toucher un objet le met (ou l'enlève) ; « C'est prêt » vérifie. Chaque objet inutile est expliqué ; l'indice
 * montre un élément de la météo et un objet utile.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { companion } from '../../ui/mascot.js';
import { continueButton, loadJson, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { check, makeSeries } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let chosen;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/meteo-saisons.json');
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

  const sit = () => series[index];
  const name = (id) => content.items[id].name;

  function start() {
    chosen = new Set();
    busy = false;
    render();
    ctx.instruct(`${sit().text} Choisis ce qu’il faut emporter.`);
  }

  function render() {
    const s = sit();
    const wearing = h('div', { class: 'w-worn', 'aria-live': 'polite', 'aria-label': chosen.size ? `Choisi : ${[...chosen].map(name).join(', ')}` : 'Rien de choisi' },
      chosen.size ? [...chosen].map((id) => h('span', { class: 'w-tag', html: picto(id, 44) })) : h('span', { class: 'small' }, 'Rien pour l’instant'));
    clear(root);
    root.append(h('div', { class: 'c-game weather' },
      seriesDots(series.length, index),
      h('div', { class: 'w-scene' },
        h('div', { class: 'w-sky', html: picto(s.weather, 92) }),
        h('div', { class: 'w-who' }, companion({ size: 92 }), wearing),
        h('p', { class: 'w-place' }, h('strong', {}, s.place), h('br'), s.text)),
      h('div', { class: 'w-items', role: 'group', 'aria-label': 'Objets' }, s.offer.map((id) => h('button', {
        class: `w-item${chosen.has(id) ? ' on' : ''}`, 'aria-pressed': chosen.has(id) ? 'true' : 'false', 'aria-label': name(id), 'data-id': id,
        onclick: () => toggle(id),
      }, h('span', { class: 'c-pic', html: picto(id, 56) }), h('span', { class: 'w-name' }, name(id).replace(/^(le |la |les |l’)/, ''))))),
      h('button', { class: 'btn big', disabled: !chosen.size || busy, onclick: verify }, 'C’est prêt')));
  }

  function toggle(id) {
    if (busy) return;
    chosen.has(id) ? chosen.delete(id) : chosen.add(id);
    ctx.sfx('tap');
    render();
  }

  function verify() {
    if (busy) return;
    const s = sit();
    const result = check(s, chosen);
    if (result.ok) return success();
    errors += 1;
    ctx.sfx('soft');
    shake(root.querySelector('.w-worn'), ctx.reducedMotion);
    const parts = [];
    // « Les sandales : elles laissent les pieds au frais, mais ce n'est pas utile ici. »
    for (const id of result.wrong) parts.push(`${name(id).replace(/^./, (c) => c.toUpperCase())} : ${content.items[id].why}, mais ce n’est pas utile ici.`);
    if (result.missing.length) parts.push(`Il manque encore quelque chose. Pense à : ${s.needs[result.missing[0]].map(name).join(' ou ')}.`);
    ctx.instruct(parts.join(' '));
    if (errors % 2 === 0) ctx.offerHint();
  }

  function success() {
    busy = true;
    ctx.sfx('good');
    const s = sit();
    const useful = s.needs.map((g) => g.find((id) => chosen.has(id))).filter(Boolean);
    const text = `Bien préparé ! ${useful.map((id) => `${name(id).replace(/^./, (c) => c.toUpperCase())} : ${content.items[id].why}.`).join(' ')}`;
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Mission suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { situations: series.map((s) => s.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const s = sit();
      const missing = check(s, chosen).missing[0];
      root.querySelector('.w-sky')?.classList.add('glow');
      if (missing !== undefined) {
        const id = s.needs[missing][0];
        root.querySelector(`.w-item[data-id="${id}"]`)?.classList.add('glow');
        ctx.instruct(`Regarde le temps qu’il fait. ${name(id).replace(/^./, (c) => c.toUpperCase())} serait utile.`);
      } else {
        const wrong = check(s, chosen).wrong[0];
        if (wrong) ctx.instruct(`Est-ce que ${name(wrong)} sert vraiment ici ?`);
      }
    },
    repeat() { if (series) ctx.instruct(sit().text); },
    destroy() { destroyed = true; clear(root); },
  };
}
