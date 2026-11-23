/**
 * Les petits scientifiques (jeu 8) : prédire, observer, comprendre. La prédiction n'est jamais notée :
 * l'activité est réussie quand l'expérience a été menée jusqu'à l'explication.
 * Aucune expérience réelle n'est proposée à l'enfant.
 */
import { clear, h } from '../../ui/dom.js';
import { loadJson, openChoice, seriesDots } from '../choices.js';
import { icon } from '../../ui/icons.js';
import { picto } from '../../ui/pictos.js';
import { circuitText, circuitWhy, EXPERIMENTS_PER_SERIES, lampLit, makeSeries, PREDICTIONS, SKILLS } from './rules.js';

const TIPS = [
  'Pense à ce qui est lourd ou léger pour sa taille.',
  'Regarde si la boucle est complète : pile, fils et interrupteur.',
  'Regarde ce que reçoit la graine : de l’eau ? de la lumière ?',
];

/** Circuit dessiné : pile à gauche, ampoule en haut, interrupteur à droite, fil du bas (coupé ou non). */
function circuitSvg(s, lit) {
  const wire = '#5b4a3a';
  const battery = s.battery
    ? '<rect x="22" y="78" width="36" height="64" rx="6" fill="#3e7bfa"/><rect x="32" y="70" width="16" height="10" rx="2" fill="#9fb3d1"/><text x="40" y="118" font-size="20" text-anchor="middle" fill="#fff" font-weight="700">+</text>'
    : '<rect x="22" y="78" width="36" height="64" rx="6" fill="none" stroke="#9fb3d1" stroke-width="3" stroke-dasharray="6 5"/><text x="40" y="118" font-size="22" text-anchor="middle" fill="#9fb3d1">?</text>';
  const bulb = `${lit ? '<circle cx="150" cy="26" r="36" fill="#ffd36e" opacity="0.35"/>' : ''}<circle cx="150" cy="26" r="22" fill="${lit ? '#ffd36e' : '#e6e1d6'}" stroke="#5b4a3a" stroke-width="3"/><rect x="141" y="46" width="18" height="10" rx="2" fill="#9fb3d1"/>`;
  const sw = s.switchClosed
    ? `<line x1="260" y1="90" x2="260" y2="130" stroke="${wire}" stroke-width="5"/>`
    : `<line x1="260" y1="130" x2="285" y2="95" stroke="${wire}" stroke-width="5" stroke-linecap="round"/>`;
  const bottom = s.wired
    ? `<path d="M40 142 V190 H260 V130" fill="none" stroke="${wire}" stroke-width="5"/>`
    : `<path d="M40 142 V190 H130" fill="none" stroke="${wire}" stroke-width="5"/><path d="M175 190 H260 V130" fill="none" stroke="${wire}" stroke-width="5"/><path d="M130 190 q10 -18 20 -12" fill="none" stroke="${wire}" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 300 210" width="300" height="210" role="img" aria-label="${circuitText(s)}">
    <path d="M40 78 V26 H128 M172 26 H260 V90" fill="none" stroke="${wire}" stroke-width="5"/>
    ${bottom}${sw}<circle cx="260" cy="90" r="5" fill="${wire}"/><circle cx="260" cy="130" r="5" fill="${wire}"/>${battery}${bulb}</svg>`;
}

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let confirmed;
  let hints;
  let lastWhy = null;
  let destroyed = false;
  let stage = null;

  async function boot() {
    try {
      content = await loadJson('content/games/petits-scientifiques.json');
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries() {
    series = makeSeries(difficulty, content, random);
    index = 0;
    confirmed = 0;
    hints = 0;
    lastWhy = null;
    ctx.activityStart();
    ask();
  }

  function sceneFor(x) {
    if (x.kind === 'float') {
      return h('div', { class: 'sci-tank', 'aria-label': `un bac d’eau et ${x.object.name}` },
        h('span', { class: 'sci-obj', 'aria-hidden': 'true', html: picto(x.object.picto, 56) }), h('div', { class: 'sci-water' }));
    }
    if (x.kind === 'circuit') return h('div', { class: 'sci-circuit', html: circuitSvg(x.circuit, false) });
    const p = x.plant;
    return h('div', { class: 'sci-plant' },
      h('div', { class: 'sci-factors' },
        h('span', { html: `${icon('drop', 20)} ${p.water ? 'eau' : 'pas d’eau'}` }), h('span', { html: `${icon(p.light ? 'sun' : 'moon', 20)} ${p.light ? 'lumière' : 'dans le noir'}` })),
      h('span', { class: 'sci-sprout', 'aria-hidden': 'true', html: picto('graine', 120) }));
  }

  function showResult(x, scene) {
    if (x.kind === 'float') scene.classList.add('drop', x.outcome === 'flotte' ? 'floats' : 'sinks');
    if (x.kind === 'circuit') scene.innerHTML = circuitSvg(x.circuit, lampLit(x.circuit));
    if (x.kind === 'plant') {
      const sprout = scene.querySelector('.sci-sprout');
      sprout.innerHTML = picto({ verte: 'pousse', pale: 'pousse-pale', rien: 'graine' }[x.outcome], 120);
    }
  }

  function ask() {
    const x = series[index];
    stage = sceneFor(x);
    const question = openChoice({
      model: h('div', { class: 'c-model sci-stage' }, stage),
      choices: PREDICTIONS[difficulty].map((p) => ({ id: p.id, picto: p.picto, text: p.text, aria: p.text })),
      onPick: (prediction) => observe(x, prediction),
    });
    clear(root);
    root.append(h('div', { class: 'c-game science' }, seriesDots(EXPERIMENTS_PER_SERIES, index), h('p', { class: 'sci-step' }, 'Ta prédiction :'), question.node));
    ctx.instruct(x.prompt);
  }

  function observe(x, prediction) {
    root.querySelector('.sci-step').textContent = 'On regarde…';
    setTimeout(() => {
      if (destroyed) return;
      showResult(x, stage);
      const right = prediction === x.outcome;
      if (right) confirmed += 1;
      const feedback = right ? 'Tu l’avais prévu !' : 'Surprise ! Ce n’est pas ce que tu avais prévu : c’est comme ça qu’on découvre, en science.';
      root.querySelector('.sci-step').textContent = 'Ce qui s’est passé :';
      ctx.instruct(`${feedback} ${x.why}`);
      lastWhy = x.why;
      const extra = x.kind === 'circuit' ? h('button', { class: 'btn ghost', onclick: () => toggleSwitch(x) }, 'Essaie l’interrupteur') : null;
      root.querySelector('.c-question').append(h('p', { class: 'notice c-why' }, h('strong', {}, feedback), ' ', x.why), extra,
        h('button', { class: 'btn big c-continue', onclick: next }, index + 1 < EXPERIMENTS_PER_SERIES ? 'Expérience suivante' : 'Terminer'));
    }, ctx.reducedMotion ? 200 : 900);
  }

  /** Manipulation libre après l'observation : ouvrir ou fermer l'interrupteur et voir l'ampoule. */
  function toggleSwitch(x) {
    x.circuit = { ...x.circuit, switchClosed: !x.circuit.switchClosed };
    stage.innerHTML = circuitSvg(x.circuit, lampLit(x.circuit));
    // La vraie raison (pile absente, interrupteur, fil), pas seulement l'état de l'interrupteur.
    ctx.instruct(`Interrupteur ${x.circuit.switchClosed ? 'fermé' : 'ouvert'}. ${circuitWhy(x.circuit)}`);
  }

  function next() {
    if (destroyed) return;
    index += 1;
    if (index < EXPERIMENTS_PER_SERIES) ask();
    else finish();
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors: 0, attempts: EXPERIMENTS_PER_SERIES, level: null, skills: SKILLS[difficulty],
      data: { experiments: EXPERIMENTS_PER_SERIES, predictionsConfirmed: confirmed },
    });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    // Indice : rappel de ce qui a déjà été observé dans la série, sinon une piste d'observation.
    hint() {
      if (!series) return;
      hints += 1;
      ctx.instruct(lastWhy ? `Souviens-toi : ${lastWhy}` : TIPS[difficulty]);
    },
    repeat() { if (series?.[index]) ctx.instruct(series[index].prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
