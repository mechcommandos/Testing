/**
 * Les histoires des émotions (jeu 10). Une scène est lue, l'enfant propose une émotion pour un personnage
 * (ou une idée de réponse) ; le jeu reformule, sans jamais noter. Seul le nombre de scènes explorées est enregistré.
 */
import { avatarSvg } from '../../ui/art.js';
import { clear, h } from '../../ui/dom.js';
import { loadJson, openChoice, seriesDots } from '../choices.js';
import { makeSeries, reflect, SCENES_PER_SERIES } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let hints;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/histoires-emotions.json');
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries() {
    series = makeSeries(difficulty, content, random);
    index = 0;
    hints = 0;
    ctx.activityStart();
    showScene();
  }

  function sceneCard(scene) {
    // Les personnages de la scène, représentés par leur avatar.
    const whos = scene.characters ? scene.characters.map((c) => c.who) : [scene.who];
    return h('div', { class: 'c-model e-scene' },
      h('div', { class: 'e-avatars', 'aria-hidden': 'true' }, whos.map((w) => h('span', { html: avatarSvg(content.characters?.[w] ?? 'robot', 72) }))),
      h('p', { class: 'e-text' }, scene.text));
  }

  function frame(...children) {
    clear(root);
    root.append(h('div', { class: 'c-game emotions' }, seriesDots(SCENES_PER_SERIES[difficulty], index), ...children));
  }

  function showScene() {
    const item = series[index];
    if (item.kind === 'responses') return showResponses(item, new Set());
    showStep(item, 0);
  }

  function showStep(item, stepIndex) {
    const step = item.steps[stepIndex];
    const question = `Comment se sent ${step.who}, à ton avis ?`;
    const choice = openChoice({
      model: sceneCard(item.scene),
      choices: step.choices,
      onPick: (id) => {
        const text = reflect(content, step, id);
        ctx.instruct(text);
        const last = stepIndex + 1 >= item.steps.length;
        root.querySelector('.c-question').append(h('p', { class: 'notice c-why' }, text),
          h('button', { class: 'btn big c-continue', onclick: () => (last ? next() : showStep(item, stepIndex + 1)) }, last ? 'Scène suivante' : `Et ${item.steps[stepIndex + 1].who} ?`));
      },
    });
    frame(h('p', { class: 'e-question' }, question), choice.node);
    ctx.instruct(stepIndex === 0 ? `${item.scene.text} ${question}` : question);
  }

  function showResponses(item, seen) {
    const choice = openChoice({
      model: sceneCard(item.scene),
      layout: 'list',
      choices: item.options.map((o) => ({ id: o.id, text: o.text, aria: o.text, className: `long${seen.has(o.id) ? ' seen' : ''}` })),
      onPick: (id) => {
        seen.add(id);
        const option = item.options.find((o) => o.id === id);
        ctx.instruct(`Et alors ? ${option.consequence}`);
        root.querySelector('.c-question').append(h('p', { class: 'notice c-why' }, h('strong', {}, 'Et alors ? '), option.consequence),
          h('div', { class: 'row center' },
            seen.size < item.options.length ? h('button', { class: 'btn ghost', onclick: () => showResponses(item, seen) }, 'Voir une autre idée') : null,
            h('button', { class: 'btn big c-continue', onclick: next }, 'Scène suivante')));
      },
    });
    frame(h('p', { class: 'e-question' }, item.scene.question), choice.node);
    ctx.instruct(seen.size ? item.scene.question : `${item.scene.text} ${item.scene.question}`);
  }

  function next() {
    if (destroyed) return;
    index += 1;
    if (index < series.length) showScene();
    else finish();
  }

  async function finish() {
    // Aucune émotion choisie n'est enregistrée : seulement que les scènes ont été explorées.
    await ctx.activityDone({ success: true, hints, errors: 0, attempts: series.length, level: null, data: { scenes: series.length } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    // Indice : la scène est relue (rappel des détails).
    hint() {
      if (!series?.[index]) return;
      hints += 1;
      ctx.instruct(`Relis bien : ${series[index].scene.text}`);
    },
    repeat() { if (series?.[index]) ctx.instruct(series[index].scene.text); },
    destroy() { destroyed = true; clear(root); },
  };
}
