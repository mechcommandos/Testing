/**
 * L'atelier des mots et des phrases (jeu 24) : toucher les étiquettes dans l'ordre pour écrire la phrase de l'image.
 * Toucher un mot posé le remet dans la réserve. Phrase complète : vérifiée, puis lue. L'indice pose le mot suivant.
 */
import { speak } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { continueButton, loadJson, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { goodPrefix, isValid, makeSeries, nextWord, words, written } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let placed; // identifiants des étiquettes posées, dans l'ordre
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/mots-phrases.json');
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

  const cur = () => series[index];
  const textOf = (id) => cur().tiles.find((t) => t.id === id).text;
  const placedText = () => placed.map(textOf);
  const prompt = () => (difficulty === 1 ? 'Écris la phrase de l’image. Attention : une étiquette est en trop.' : 'Remets les mots dans l’ordre pour écrire la phrase de l’image.');

  function start() {
    placed = [];
    busy = false;
    render();
    ctx.instruct(prompt());
  }

  function render() {
    const s = cur();
    const pics = Array.from({ length: s.count ?? 1 }, () => h('span', { class: 'c-pic', html: picto(s.picto, 84) }));
    clear(root);
    root.append(h('div', { class: 'c-game words' },
      seriesDots(series.length, index),
      h('div', { class: 'c-model ph-image', 'aria-hidden': 'true' }, pics),
      h('div', { class: 'ph-line', 'aria-label': `Ta phrase : ${placedText().join(' ') || 'vide'}` },
        placed.length ? placed.map((id, i) => h('button', { class: 'ph-tile placed', 'aria-label': `${textOf(id)} (toucher pour l’enlever)`, onclick: () => remove(id) }, i === 0 ? textOf(id).replace(/^./, (c) => c.toUpperCase()) : textOf(id))) : h('span', { class: 'ph-empty' }, '…'),
        placed.length === words(s).length ? h('span', { class: 'ph-dot' }, '.') : null),
      h('div', { class: 'ph-tray', role: 'group', 'aria-label': 'Étiquettes' }, s.tiles.filter((t) => !placed.includes(t.id)).map((t) => h('button', { class: 'ph-tile', 'data-tile': t.id, onclick: () => put(t.id) }, t.text)))));
  }

  function put(id) {
    if (busy) return;
    placed.push(id);
    ctx.sfx('tap');
    render();
    if (placed.length === words(cur()).length) check();
  }

  function remove(id) {
    if (busy) return;
    placed = placed.filter((x) => x !== id);
    render();
  }

  function check() {
    const s = cur();
    const text = placedText();
    if (isValid(s, text)) return success();
    errors += 1;
    ctx.sfx('soft');
    busy = true;
    const keep = goodPrefix(s, text);
    shake(root.querySelector('.ph-line'), ctx.reducedMotion);
    const trap = (s.distractors ?? []).find((d) => text.includes(d));
    ctx.instruct(trap && s.rule ? `Presque ! ${s.rule}` : keep ? `Les ${keep} premiers mots sont bien placés. Cherche la suite.` : 'Ce n’est pas encore une phrase juste. Par quel mot commence-t-elle ?');
    if (errors % 2 === 0) ctx.offerHint();
    setTimeout(() => {
      if (destroyed) return;
      placed = placed.slice(0, keep);
      busy = false;
      render();
    }, ctx.reducedMotion ? 300 : 900);
  }

  function success() {
    busy = true;
    ctx.sfx('good');
    const phrase = written(cur(), placedText());
    root.querySelector('.ph-line').classList.add('done');
    speak(phrase);
    index += 1;
    const next = index < series.length ? start : finish;
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why ph-written' }, phrase), continueButton(index < series.length ? 'Phrase suivante' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { sentences: series.map((s) => s.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const s = cur();
      placed = placed.slice(0, goodPrefix(s, placedText()));
      const word = nextWord(s, placedText());
      const tile = s.tiles.find((t) => t.text === word && !placed.includes(t.id));
      render();
      if (tile) put(tile.id);
    },
    repeat() { if (series) ctx.instruct(prompt()); },
    destroy() { destroyed = true; clear(root); },
  };
}
