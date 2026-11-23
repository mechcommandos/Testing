/**
 * Questions à choix (grandes cartes) partagées par plusieurs jeux, chargement des contenus JSON
 * et du manifeste des sons (content/audio.json).
 */
import { speaking, speechDone, speechOn } from '../core/audio.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { picto } from '../ui/pictos.js';
import { shake } from './shared.js';

const cache = new Map();

export function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((r) => {
      if (!r.ok) throw new Error(`${path} : ${r.status}`);
      return r.json();
    }).catch((error) => { cache.delete(path); throw error; }));
  }
  return cache.get(path);
}

/** Sons déclarés : { id: { file, placeholder, … } }. Un manifeste absent = aucun son disponible. */
export async function loadClips() {
  try { return (await loadJson('content/audio.json')).clips ?? {}; } catch { return {}; }
}

/** Un son est utilisable pour noter une reconnaissance sonore seulement s'il existe et n'est plus provisoire. */
export function isRealClip(clips, id) {
  return !!id && !!clips[id] && clips[id].placeholder === false;
}

/**
 * Une question : un modèle facultatif et 2 à 4 cartes. Une erreur fait trembler la carte (sans son négatif) ;
 * l'indice retire une mauvaise carte, puis fait briller la bonne.
 * choices : [{ id, picto?, text?, aria, className? }]
 */
export function choiceQuestion(ctx, { model = null, choices, correctId, onCorrect, layout = '' }) {
  const state = { removed: new Set(), errors: 0, done: false };
  const buttons = new Map();

  const pick = (id, btn) => {
    if (state.done || state.removed.has(id)) return;
    if (id !== correctId) {
      state.errors += 1;
      shake(btn, ctx.reducedMotion);
      ctx.sfx('soft');
      if (state.errors === 3) ctx.offerHint();
      return;
    }
    state.done = true;
    btn.classList.add('ok');
    ctx.sfx('good');
    setTimeout(() => onCorrect(state), ctx.reducedMotion ? 150 : 700);
  };

  const grid = h('div', { class: `c-choices n${choices.length} ${layout}` }, choices.map((c) => {
    const btn = h('button', { class: `c-choice ${c.className ?? ''}`, 'aria-label': c.aria, 'data-id': c.id },
      c.picto ? h('span', { class: 'c-pic', 'aria-hidden': 'true', html: picto(c.picto, 64) }) : null,
      c.html ? h('span', { class: 'c-pic c-art', 'aria-hidden': 'true', html: c.html }) : null,
      c.text ? h('span', { class: 'c-text', 'aria-hidden': 'true' }, c.text) : null);
    btn.addEventListener('click', () => pick(c.id, btn));
    buttons.set(c.id, btn);
    return btn;
  }));

  return {
    node: h('div', { class: 'c-question' }, model, grid),
    get errors() { return state.errors; },
    hint() {
      const wrong = choices.filter((c) => c.id !== correctId && !state.removed.has(c.id));
      if (wrong.length) {
        const c = wrong[Math.floor(ctx.random() * wrong.length)];
        state.removed.add(c.id);
        const btn = buttons.get(c.id);
        btn.classList.add('removed');
        btn.disabled = true;
      } else {
        buttons.get(correctId).classList.add('glow');
      }
    },
  };
}

/** Avancement dans une série : points pleins pour les questions terminées. */
export function seriesDots(total, done) {
  return h('div', { class: 'c-dots', role: 'img', 'aria-label': `Question ${Math.min(done + 1, total)} sur ${total}` },
    Array.from({ length: total }, (_, i) => h('span', { class: i < done ? 'on' : '' })));
}

/** Bouton « réécouter » affiché à la place d'un modèle visuel quand la question est sonore. */
export function listenButton(onClick) {
  return h('button', { class: 'c-listen', 'aria-label': 'Réécouter', onclick: onClick }, h('span', { 'aria-hidden': 'true', html: icon('sound', 28) }), h('span', {}, 'Réécouter'));
}

/**
 * Choix ouvert : aucune réponse n'est fausse (prédictions, émotions). onPick(id) reçoit le choix ;
 * les cartes sont ensuite désactivées. Rien ne tremble, rien n'est compté comme une erreur.
 */
export function openChoice({ model = null, choices, onPick, layout = '' }) {
  let picked = false;
  const grid = h('div', { class: `c-choices n${choices.length} ${layout}` }, choices.map((c) => {
    const btn = h('button', { class: `c-choice ${c.className ?? ''}`, 'aria-label': c.aria, 'data-id': c.id },
      c.picto ? h('span', { class: 'c-pic', 'aria-hidden': 'true', html: picto(c.picto, 64) }) : null,
      c.html ? h('span', { class: 'c-pic c-art', 'aria-hidden': 'true', html: c.html }) : null,
      c.text ? h('span', { class: 'c-text', 'aria-hidden': 'true' }, c.text) : null);
    btn.addEventListener('click', () => {
      if (picked) return;
      picked = true;
      btn.classList.add('chosen');
      grid.querySelectorAll('.c-choice').forEach((b) => { b.disabled = true; });
      onPick(c.id);
    });
    return btn;
  }));
  return { node: h('div', { class: 'c-question' }, model, grid) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bouton « Continuer » affiché après une bonne réponse et son explication. La suite arrive toute seule quand la voix
 * a fini de parler (plus une courte pause) ; sans voix, après un temps de lecture. Le bouton reste là pour aller plus vite.
 */
export function continueButton(label, onClick, { auto = true } = {}) {
  let used = false;
  const go = () => { if (used) return; used = true; btn.disabled = true; onClick(); };
  const btn = h('button', { class: 'btn big c-continue', onclick: go }, label);
  if (auto) {
    (async () => {
      await sleep(50); // le temps que la consigne parlée soit lancée
      if (speechOn()) {
        do { await speechDone(); await sleep(1200); } while (speaking()); // « Répéter » relance la voix : on attend encore
      } else {
        await sleep(4500);
      }
      if (btn.isConnected) go();
    })();
  }
  return btn;
}
/** Illustration seule (modèles des questions). */
export function pic(id, size = 96, className = 'c-pic big') {
  return h('span', { class: className, 'aria-hidden': 'true', html: picto(id, size) });
}
