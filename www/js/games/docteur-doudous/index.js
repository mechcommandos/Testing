/**
 * Le docteur des doudous (jeu 33) : un ourson dessiné dont on touche les parties du corps (niveaux 1 et 2),
 * ou des cartes de gestes du quotidien (niveau 3). Une bonne réponse pose un pansement ou fait sourire le doudou.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { CARE_LABELS, carePrompt, makeSeries, PARTS, SERIES } from './rules.js';

const FUR = '#c98a4b';
const LIGHT = '#ecc89a';
const DARK = '#23324d';
/** L'ourson : chaque partie porte data-part (zones larges, faciles à toucher). */
const BEAR = `
  <g data-part="oreilles"><circle cx="98" cy="62" r="24" fill="${FUR}"/><circle cx="98" cy="62" r="12" fill="${LIGHT}"/><circle cx="202" cy="62" r="24" fill="${FUR}"/><circle cx="202" cy="62" r="12" fill="${LIGHT}"/></g>
  <g data-part="bras"><ellipse cx="86" cy="190" rx="18" ry="44" fill="${FUR}" transform="rotate(20 86 190)"/><ellipse cx="214" cy="190" rx="18" ry="44" fill="${FUR}" transform="rotate(-20 214 190)"/></g>
  <g data-part="mains"><circle cx="72" cy="232" r="17" fill="${LIGHT}"/><circle cx="228" cy="232" r="17" fill="${LIGHT}"/></g>
  <g data-part="jambes"><ellipse cx="118" cy="272" rx="22" ry="30" fill="${FUR}"/><ellipse cx="182" cy="272" rx="22" ry="30" fill="${FUR}"/></g>
  <g data-part="pieds"><ellipse cx="112" cy="302" rx="28" ry="15" fill="${LIGHT}"/><ellipse cx="188" cy="302" rx="28" ry="15" fill="${LIGHT}"/></g>
  <g data-part="ventre"><ellipse cx="150" cy="214" rx="60" ry="64" fill="${FUR}"/><ellipse cx="150" cy="222" rx="38" ry="42" fill="${LIGHT}"/></g>
  <g data-part="tete"><circle cx="150" cy="102" r="64" fill="${FUR}"/></g>
  <g data-part="yeux"><circle cx="126" cy="90" r="11" fill="#fff"/><circle cx="128" cy="91" r="6" fill="${DARK}"/><circle cx="174" cy="90" r="11" fill="#fff"/><circle cx="172" cy="91" r="6" fill="${DARK}"/></g>
  <ellipse cx="150" cy="126" rx="30" ry="22" fill="${LIGHT}"/>
  <g data-part="nez"><ellipse cx="150" cy="116" rx="11" ry="8" fill="${DARK}"/></g>
  <g data-part="bouche"><path d="M136 134q14 12 28 0" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="132" y="128" width="36" height="16" fill="transparent"/></g>`;

/** Petits dessins des gestes qui ne sont pas dans la bibliothèque d'images. */
const CARE_ART = {
  savon: '<rect x="18" y="40" width="64" height="36" rx="12" fill="#9fd3f5"/><rect x="26" y="46" width="48" height="10" rx="5" fill="#fff" opacity=".6"/><circle cx="30" cy="28" r="9" fill="#e8f6fd" stroke="#9fd3f5" stroke-width="3"/><circle cx="54" cy="20" r="6" fill="#e8f6fd" stroke="#9fd3f5" stroke-width="3"/><circle cx="72" cy="30" r="7" fill="#e8f6fd" stroke="#9fd3f5" stroke-width="3"/>',
  mouchoir: '<rect x="20" y="44" width="60" height="38" rx="6" fill="#ef5f95"/><path d="M40 44q4-22 10-26q8 8 10 26z" fill="#fff" stroke="#d8e1ec" stroke-width="2"/><rect x="34" y="52" width="32" height="8" rx="4" fill="#fff" opacity=".5"/>',
  bonnet: '<path d="M22 70q0-44 28-44t28 44z" fill="#1a56b8"/><rect x="18" y="66" width="64" height="14" rx="6" fill="#9fc3f3"/><circle cx="50" cy="22" r="9" fill="#9fc3f3"/>',
  coude: '<path d="M20 30h34q16 0 16 16v34" stroke="#ecc89a" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M20 30h34q16 0 16 16v34" stroke="#1a56b8" stroke-width="20" fill="none" stroke-dasharray="40 200" stroke-linecap="round"/><circle cx="70" cy="34" r="12" fill="#c98a4b"/>',
  'mains-ouvertes': '<g fill="#ecc89a"><rect x="18" y="40" width="28" height="36" rx="10"/><rect x="54" y="40" width="28" height="36" rx="10"/><rect x="18" y="24" width="7" height="22" rx="3"/><rect x="27" y="20" width="7" height="24" rx="3"/><rect x="36" y="22" width="7" height="22" rx="3"/><rect x="57" y="22" width="7" height="22" rx="3"/><rect x="66" y="20" width="7" height="24" rx="3"/><rect x="75" y="24" width="7" height="22" rx="3"/></g>',
  personne: '<circle cx="50" cy="30" r="14" fill="#c98a4b"/><path d="M28 86q0-36 22-36t22 36z" fill="#3aa65b"/>',
  lit: '<rect x="12" y="50" width="76" height="22" rx="5" fill="#1a56b8"/><rect x="12" y="40" width="10" height="44" rx="3" fill="#8a5a2b"/><rect x="78" y="56" width="10" height="28" rx="3" fill="#8a5a2b"/><rect x="24" y="42" width="22" height="12" rx="5" fill="#fff"/><path d="M60 26l6 0-6 8h6M70 14l8 0-8 10h8" stroke="#56627a" stroke-width="3" fill="none"/>',
};
const careArt = (id) => (CARE_ART[id] ? `<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" focusable="false">${CARE_ART[id]}</svg>` : picto(id, 64));

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
  let busy = false;
  let destroyed = false;
  let bear;

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
    busy = false;
    question = null;
    clear(root);
    if (q.kind === 'part') {
      bear = h('div', { class: 'doc-bear', html: `<svg viewBox="0 0 300 330" role="img" aria-label="Le doudou" focusable="false">${BEAR}</svg>` });
      const buttons = h('div', { class: 'doc-parts', role: 'group', 'aria-label': 'Les parties du doudou' },
        Object.entries(PARTS).map(([id, name]) => h('button', { class: 'doc-part-btn', 'data-part': id, onclick: () => pick(id) }, name)));
      bear.querySelector('svg').addEventListener('click', (e) => { const g = e.target.closest('[data-part]'); if (g) pick(g.dataset.part, g); });
      root.append(h('div', { class: 'c-game doc-game' }, seriesDots(SERIES, index), bear, buttons));
      ctx.instruct(q.say);
      return;
    }
    question = choiceQuestion(ctx, {
      model: h('div', { class: 'c-model doc-mini', html: `<svg viewBox="0 0 300 330" aria-hidden="true" focusable="false">${BEAR}</svg>` }),
      choices: q.options.map((o) => ({ id: o, html: careArt(o), text: CARE_LABELS[o], aria: CARE_LABELS[o] })),
      correctId: q.correctId,
      onCorrect: () => careDone(q),
    });
    root.append(h('div', { class: 'c-game doc-game' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(carePrompt(q));
  }

  function pick(part, el = null) {
    if (busy) return;
    const q = series[index];
    if (part !== q.part) {
      errors += 1;
      ctx.sfx('soft');
      const target = el ?? root.querySelector(`.doc-part-btn[data-part="${part}"]`);
      if (target) shake(target, ctx.reducedMotion);
      if (errors % 2 === 0) ctx.offerHint();
      return;
    }
    busy = true;
    bear.querySelectorAll(`[data-part="${part}"]`).forEach((g) => g.classList.add('doc-ok'));
    root.querySelector(`.doc-part-btn[data-part="${part}"]`)?.classList.add('ok');
    ctx.sfx('good');
    ctx.instruct(q.why);
    next();
  }

  function careDone(q) {
    errors += question.errors;
    busy = true;
    ctx.instruct(q.why);
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, q.why), continueButton(index + 1 < SERIES ? 'Patient suivant' : 'Terminer', () => { if (!destroyed) { index += 1; if (index < SERIES) ask(); else finish(); } }));
  }

  function next() {
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }, 700);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { asked: series.map((q) => q.part ?? q.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const q = series[index];
      if (question) { question.hint(); return; }
      bear.querySelectorAll(`[data-part="${q.part}"]`).forEach((g) => g.classList.add('doc-glow'));
      root.querySelector(`.doc-part-btn[data-part="${q.part}"]`)?.classList.add('glow');
    },
    repeat() { if (series) { const q = series[index]; ctx.instruct(q.kind === 'care' ? carePrompt(q) : q.say); } },
    destroy() { destroyed = true; clear(root); },
  };
}
