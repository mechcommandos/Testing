/**
 * Les mots de la semaine (jeu 54) : écouter un mot de la liste de l'école, puis l'écrire avec des lettres.
 * Toucher une lettre la pose dans la case suivante ; toucher une case remet sa lettre. Quand le mot est complet,
 * il est vérifié : les lettres bien placées restent, les autres reviennent. Indice : la lettre suivante se pose.
 */
import { speak } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { app } from '../../ui/state.js';
import { continueButton, listenButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { chars, FIXED, makeSeries, wordsFor, wrongSlots } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  const { words, sample } = wordsFor(app.activeProfile);
  let series;
  let index;
  let errors;
  let hints;
  let placed;     // lettre posée dans chaque case (ou null)
  let fromTile;   // case → identifiant de la tuile utilisée
  let locked;     // cases validées (bonnes lettres après vérification, ou posées par l'indice)
  let busy = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random, words);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    start();
  }

  const q = () => series[index];

  function start() {
    const { letters } = q();
    placed = letters.map((c) => (FIXED.test(c) ? c : null));
    fromTile = letters.map(() => null);
    locked = new Set(letters.map((c, i) => (FIXED.test(c) ? i : -1)).filter((i) => i >= 0));
    busy = false;
    render();
    say();
  }

  function say() {
    const { word } = q();
    if (difficulty === 0) ctx.instruct(`Recopie le mot : ${word}.`);
    else ctx.instruct(`Écris le mot : ${word}.`, { display: 'Écoute le mot, puis écris-le avec les lettres.' });
  }

  function render() {
    const { word, letters, tiles } = q();
    const used = new Set(fromTile.filter(Boolean));
    clear(root);
    root.append(h('div', { class: 'c-game ms-game' },
      seriesDots(series.length, busy ? index + 1 : index),
      sample && index === 0 ? h('p', { class: 'small ms-sample' }, 'Mots d’exemple. Un parent peut ajouter les mots de l’école dans l’espace parent (offre Famille).') : null,
      difficulty === 0 ? h('p', { class: 'ms-model', 'aria-label': `Mot à recopier : ${word}` }, word) : listenButton(() => speak(word)),
      h('div', { class: 'ms-slots', role: 'group', 'aria-label': 'Le mot' }, letters.map((c, i) => h('button', {
        class: `ms-slot${placed[i] ? ' full' : ''}${locked.has(i) ? ' locked' : ''}${FIXED.test(c) ? ' fixed' : ''}`,
        'data-i': i, disabled: locked.has(i) || busy,
        'aria-label': placed[i] ? `Case ${i + 1} : ${placed[i]}` : `Case ${i + 1} vide`,
        onclick: () => remove(i),
      }, placed[i] ?? ''))),
      h('div', { class: 'ms-tiles', role: 'group', 'aria-label': 'Les lettres' }, tiles.map((t) => h('button', {
        class: 'ms-tile', disabled: used.has(t.id) || busy, 'aria-label': `Lettre ${t.ch}`, onclick: () => put(t),
      }, t.ch)))));
  }

  function put(tile) {
    if (busy) return;
    const i = placed.findIndex((c, k) => c === null && !locked.has(k));
    if (i < 0) return;
    placed[i] = tile.ch;
    fromTile[i] = tile.id;
    ctx.sfx('tap');
    if (placed.every((c) => c !== null)) return verify();
    render();
  }

  function remove(i) {
    if (busy || locked.has(i) || placed[i] === null) return;
    placed[i] = null;
    fromTile[i] = null;
    render();
  }

  function verify() {
    const { word, letters } = q();
    const wrong = wrongSlots(letters, placed);
    if (!wrong.length) {
      busy = true;
      ctx.sfx('good');
      render(); // le mot complet reste affiché (avant de passer à l'index suivant)
      index += 1;
      const spelled = chars(word).filter((c) => !FIXED.test(c)).join('-');
      const text = `Bravo, ${word} ! ${spelled}.`;
      ctx.instruct(text);
      root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, `Bravo : « ${word} » !`),
        continueButton(index < series.length ? 'Mot suivant' : 'Terminer', () => { if (destroyed) return; if (index < series.length) start(); else finish(); }));
      return;
    }
    errors += 1;
    ctx.sfx('soft');
    // Les bonnes lettres restent (verrouillées), les autres reviennent dans les tuiles.
    letters.forEach((c, i) => { if (!wrong.includes(i)) locked.add(i); });
    for (const i of wrong) { placed[i] = null; fromTile[i] = null; }
    render();
    for (const i of wrong) shake(root.querySelector(`.ms-slot[data-i="${i}"]`), ctx.reducedMotion);
    ctx.instruct(wrong.length === 1 ? 'Presque ! Une lettre n’est pas la bonne. Écoute encore.' : `${wrong.length} lettres ne sont pas les bonnes. Les lettres justes restent en place.`);
    if (errors % 2 === 0) ctx.offerHint();
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { words: series.length, sample } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const { letters, tiles } = q();
      const i = letters.findIndex((c, k) => !locked.has(k) && placed[k] !== c);
      if (i < 0) return;
      // La lettre attendue est posée et verrouillée ; si la case contenait une autre lettre, celle-ci revient.
      const usedIds = new Set(fromTile.filter(Boolean));
      const tile = tiles.find((t) => t.ch === letters[i] && (!usedIds.has(t.id) || fromTile[i] === t.id))
        ?? tiles.find((t) => t.ch === letters[i]);
      const other = fromTile.indexOf(tile.id);
      if (other >= 0 && other !== i) { placed[other] = null; fromTile[other] = null; }
      placed[i] = letters[i];
      fromTile[i] = tile.id;
      locked.add(i);
      ctx.instruct(`La lettre suivante est « ${letters[i]} ».`);
      if (placed.every((c) => c !== null)) return verify();
      render();
    },
    repeat() { if (series) say(); },
    destroy() { destroyed = true; clear(root); },
  };
}
