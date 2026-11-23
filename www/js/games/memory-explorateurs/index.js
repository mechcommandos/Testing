/**
 * Le memory des explorateurs (jeu 5) : retourner deux cartes, garder les paires.
 * Le plateau en cours est sauvegardé à chaque tour et retrouvé au retour dans le jeu.
 */
import { clear, h } from '../../ui/dom.js';
import { loadJson } from '../choices.js';
import { picto } from '../../ui/pictos.js';
import { COLUMNS, hintCard, isMatch, isValidSave, makeDeck } from './rules.js';

const PROMPTS = [
  'Retourne deux cartes à la fois et retrouve les images pareilles.',
  'Associe chaque animal à l’endroit où il vit.',
  'Associe chaque calcul à son résultat.',
];

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let cards;
  let matched;
  let seen;
  let open;
  let turns;
  let mismatches;
  let hints;
  let busy = false;
  let destroyed = false;
  const buttons = new Map();
  let timer = null;

  /** resume : reprendre le plateau sauvegardé (seulement à l'ouverture du jeu, jamais après une partie finie). */
  async function boot(resume = true) {
    const saved = resume ? ctx.progress?.resume?.memory : null;
    if (isValidSave(saved, difficulty)) {
      ({ cards } = saved);
      matched = new Set(saved.matched);
      seen = new Set(saved.seen ?? []);
      turns = saved.turns ?? 0;
      mismatches = saved.mismatches ?? 0;
      hints = saved.hints ?? 0;
      open = [];
      ctx.activityStart();
      render();
      const pairs = matched.size / 2;
      ctx.instruct(pairs ? `On reprend la partie : ${pairs} paire${pairs > 1 ? 's' : ''} déjà trouvée${pairs > 1 ? 's' : ''}.` : 'On reprend la partie en cours.');
      return;
    }
    let animals = null;
    if (difficulty === 1) {
      try {
        animals = await loadJson('content/games/animaux-sons.json');
      } catch {
        root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
        return;
      }
    }
    if (!destroyed) newBoard(animals);
  }

  function newBoard(animals) {
    cards = makeDeck(difficulty, random, { animals });
    matched = new Set();
    seen = new Set();
    open = [];
    turns = 0;
    mismatches = 0;
    hints = 0;
    ctx.activityStart();
    render();
    ctx.instruct(PROMPTS[difficulty]);
  }

  function save() {
    ctx.saveResume?.({ memory: { difficulty, cards, matched: [...matched], seen: [...seen], turns, mismatches, hints } });
  }

  function face(card) {
    return [
      card.picto ? h('span', { class: 'c-pic', 'aria-hidden': 'true', html: picto(card.picto, 60) }) : null,
      card.text ? h('span', { class: 'm-text', 'aria-hidden': 'true' }, card.text) : null,
      card.kind === 'habitat' ? h('span', { class: 'm-label', 'aria-hidden': 'true' }, card.label) : null,
    ];
  }

  function paint(card) {
    const btn = buttons.get(card.id);
    const visible = matched.has(card.id) || open.includes(card.id) || btn.classList.contains('peek');
    btn.classList.toggle('up', visible);
    btn.classList.toggle('found', matched.has(card.id));
    btn.setAttribute('aria-label', visible ? card.label : 'carte cachée');
    btn.replaceChildren(...(visible ? face(card).filter(Boolean) : [h('span', { class: 'm-back', 'aria-hidden': 'true' }, '?')]));
  }

  function render() {
    clear(root);
    buttons.clear();
    const grid = h('div', { class: `m-grid cols-${COLUMNS[difficulty]}` }, cards.map((card) => {
      const btn = h('button', { class: 'm-card', 'data-id': card.id, onclick: () => flip(card) });
      buttons.set(card.id, btn);
      return btn;
    }));
    root.append(h('div', { class: 'c-game memory' }, grid));
    cards.forEach(paint);
  }

  function flip(card) {
    if (busy || matched.has(card.id) || open.includes(card.id)) return;
    ctx.sfx('tap');
    open.push(card.id);
    seen.add(card.id);
    paint(card);
    if (open.length < 2) return;
    turns += 1;
    const [a, b] = open.map((id) => cards.find((c) => c.id === id));
    if (isMatch(a, b)) {
      matched.add(a.id);
      matched.add(b.id);
      open = [];
      paint(a);
      paint(b);
      ctx.sfx('good');
      if (difficulty === 1) {
        const animal = a.kind === 'animal' ? a : b;
        const habitat = a.kind === 'habitat' ? a : b;
        ctx.instruct(`Oui : ${animal.label} vit dans ${habitat.label}.`);
      }
      if (matched.size === cards.length) return finish();
      return save();
    }
    mismatches += 1;
    busy = true;
    save();
    // Les deux cartes restent visibles le temps de les mémoriser, puis se retournent.
    timer = setTimeout(() => {
      busy = false;
      open = [];
      if (!destroyed) { paint(a); paint(b); }
    }, 1300);
  }

  async function finish() {
    // Sauvegarde effacée avant l'enregistrement du résultat : les deux écrivent la même progression.
    await ctx.saveResume?.(null);
    await ctx.activityDone({
      success: true, hints, errors: 0, attempts: turns, level: null,
      data: { pairs: cards.length / 2, turns, mismatches },
    });
    if (!destroyed) ctx.celebrate(() => boot(false), `${cards.length / 2} paires trouvées en ${turns} tours.`);
  }

  boot(true);

  return {
    hint() {
      if (!cards || busy) return;
      const id = hintCard(cards, { openId: open[0] ?? null, seen, matched }, random);
      if (!id) return;
      hints += 1;
      const btn = buttons.get(id);
      btn.classList.add('peek', 'glow');
      paint(cards.find((c) => c.id === id));
      setTimeout(() => {
        btn.classList.remove('peek', 'glow');
        if (!destroyed) paint(cards.find((c) => c.id === id));
      }, 1200);
      save();
    },
    repeat() { ctx.instruct(PROMPTS[difficulty]); },
    destroy() { destroyed = true; clearTimeout(timer); clear(root); },
  };
}
