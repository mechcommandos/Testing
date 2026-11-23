/**
 * À chacun son métier (jeu 34) : un personnage dessiné (chapeau, tenue) et trois cartes. Niveau 1 : son outil ;
 * niveau 2 : son lieu de travail ; niveau 3 : une devinette, les cartes sont des personnages.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, seriesDots } from '../choices.js';
import { JOBS, makeSeries, PLACE_NAMES, SERIES, TOOL_NAMES } from './rules.js';

const SKIN = ['#f1c7a3', '#d9a27a', '#a8714a', '#7a4a2a'];
const HAIR = ['#3b2a1e', '#7a4a24', '#d9a441', '#23324d'];

/** Personnage simple : tête, cheveux, chapeau selon le métier, tenue colorée. */
export function person(job, size = 120) {
  const { look } = JOBS[job];
  const k = Object.keys(JOBS).indexOf(job);
  const skin = SKIN[k % SKIN.length];
  const hair = HAIR[(k + 1) % HAIR.length];
  const hats = {
    long: `<path d="M30 40q0-30 20-30t20 30v26q-4 4-8 0V42H38v24q-4 4-8 0z" fill="${hair}"/>`,
    short: `<path d="M32 36q0-24 18-24t18 24q-6-10-18-10t-18 10z" fill="${hair}"/>`,
    cap: `<path d="M32 30q0-18 18-18t18 18z" fill="${look.hatColor}"/><path d="M50 30h26q2 4-4 6H50z" fill="${look.hatColor}"/><rect x="44" y="18" width="12" height="6" rx="2" fill="#f5b82e"/>`,
    straw: `<ellipse cx="50" cy="26" rx="30" ry="6" fill="#e9c46a"/><path d="M36 26q0-16 14-16t14 16z" fill="#e9c46a"/><rect x="36" y="20" width="28" height="4" fill="#c4473a"/>`,
    toque: `<path d="M34 28h32l-2-10q8-10-2-14q-6-8-12 0q-6-8-12 0q-10 4-2 14z" fill="#fff" stroke="#d8e1ec" stroke-width="2"/>`,
    helmet: `<path d="M30 32q0-24 20-24t20 24z" fill="${look.hatColor}"/><rect x="26" y="30" width="48" height="6" rx="3" fill="${look.hatColor}"/><rect x="47" y="10" width="6" height="20" rx="3" fill="#fff" opacity=".5"/>`,
    sailor: `<path d="M34 28q0-14 16-14t16 14z" fill="#fff" stroke="#d8e1ec" stroke-width="2"/><rect x="33" y="26" width="34" height="5" fill="#1a56b8"/>`,
    ranger: `<ellipse cx="50" cy="28" rx="28" ry="5" fill="#8a6a3a"/><path d="M36 28q0-16 14-16t14 16z" fill="#a8844a"/>`,
    beanie: `<path d="M32 32q0-22 18-22t18 22z" fill="${look.hatColor}"/><rect x="31" y="28" width="38" height="7" rx="3" fill="#fff" opacity=".7"/><circle cx="50" cy="9" r="5" fill="#fff"/>`,
  };
  const stripes = look.stripes ? '<path d="M30 74h40M28 82h44M27 90h46" stroke="#1a56b8" stroke-width="3"/>' : '';
  const cross = look.cross ? '<path d="M62 70h8M66 66v8" stroke="#e5484d" stroke-width="3"/>' : '';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="M22 100q0-38 28-38t28 38z" fill="${look.shirt}" stroke="#d8e1ec" stroke-width="${look.shirt === '#ffffff' ? 2 : 0}"/>${stripes}${cross}<rect x="44" y="54" width="12" height="10" fill="${skin}"/><circle cx="50" cy="40" r="17" fill="${skin}"/><circle cx="44" cy="40" r="2.2" fill="#23324d"/><circle cx="56" cy="40" r="2.2" fill="#23324d"/><path d="M44 47q6 5 12 0" stroke="#23324d" stroke-width="2" fill="none" stroke-linecap="round"/>${hats[look.hat] ?? ''}</svg>`;
}

const PLACE_TEXT = { nuage: 'Le ciel', mer: 'La mer', ferme: 'La ferme', foret: 'La forêt', montagne: 'La montagne', banquise: 'La banquise', savane: 'La savane' };

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let errors;
  let hints;
  let question;
  let destroyed = false;

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
    const choices = q.options.map((o) => {
      if (q.kind === 'tool') return { id: o, picto: o, aria: TOOL_NAMES[o] };
      if (q.kind === 'place') return { id: o, picto: o, text: PLACE_TEXT[o], aria: PLACE_NAMES[o] };
      return { id: o, html: person(o, 76), text: JOBS[o].name.replace(/^(le |la )/, ''), aria: JOBS[o].name };
    });
    const model = q.kind === 'riddle'
      ? h('div', { class: 'c-model mt-riddle' }, h('span', { class: 'mt-bubble', 'aria-hidden': 'true' }, '?'), h('p', {}, JOBS[q.job].riddle))
      : h('div', { class: 'c-model mt-model', role: 'img', 'aria-label': JOBS[q.job].name }, h('span', { html: person(q.job, 130) }), h('strong', {}, JOBS[q.job].name[0].toUpperCase() + JOBS[q.job].name.slice(1)));
    question = choiceQuestion(ctx, { model, choices, correctId: q.correctId, onCorrect: () => answered(q) });
    clear(root);
    root.append(h('div', { class: 'c-game mt-game' }, seriesDots(SERIES, index), question.node));
    ctx.instruct(q.prompt);
  }

  function answered(q) {
    errors += question.errors;
    ctx.instruct(q.why);
    index += 1;
    ctx.afterSpeech(() => { if (destroyed) return; if (index < SERIES) ask(); else finish(); }, 700);
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: SERIES, level: null, data: { jobs: series.map((q) => q.job) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() { if (question) { hints += 1; question.hint(); } },
    repeat() { if (series) ctx.instruct(series[index].prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
