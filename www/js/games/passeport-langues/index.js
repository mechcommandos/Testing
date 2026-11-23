/**
 * Le passeport des langues (jeu 26) : écouter un mot (ou une petite phrase) en anglais et toucher la bonne image.
 * Le mot est aussi écrit. Après la réponse : le mot anglais et sa traduction, à réécouter. Pas de micro.
 * L'indice fait réécouter lentement et retire une mauvaise image. Un tampon par bonne réponse sur le passeport.
 */
import { speakIn, voiceFor } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { choiceQuestion, continueButton, seriesDots } from '../choices.js';
import { makeSeries } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let errors;
  let hints;
  let busy = false;
  let destroyed = false;

  function newSeries() {
    series = makeSeries(difficulty, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    ask();
  }

  const cur = () => series[index];
  const say = (slow = false) => speakIn(cur().target.en, 'en', { slow });

  function ask() {
    busy = false;
    const q = cur();
    const voice = !!voiceFor('en');
    const model = h('div', { class: 'c-model en-word' },
      h('button', { class: 'c-listen', 'aria-label': 'Écouter en anglais', onclick: () => say() }, h('span', { 'aria-hidden': 'true', html: icon('sound', 28) }), h('span', {}, 'Écouter')),
      h('p', { class: 'en-text', lang: 'en' }, q.target.en),
      voice ? null : h('p', { class: 'small' }, 'Pas de voix anglaise sur cet appareil : lis le mot.'));
    question = choiceQuestion(ctx, {
      model,
      choices: q.choices.map((c) => (c.kind === 'color'
        ? { id: c.en, aria: c.fr, className: 'en-swatch', text: ' ' }
        : { id: c.en, picto: c.picto, aria: c.fr })),
      correctId: q.correctId,
      onCorrect: answered,
    });
    clear(root);
    root.append(h('div', { class: 'c-game passport' }, h('div', { class: 'en-stamps', 'aria-label': `Tampons : ${index} sur ${series.length}` }, series.map((_, i) => h('span', { class: i < index ? 'on' : '' }))), seriesDots(series.length, index), question.node));
    // Les pastilles de couleur prennent leur couleur ici (le style en ligne passe par le DOM).
    q.choices.forEach((c) => { if (c.kind === 'color') root.querySelector(`.c-choice[data-id="${c.en}"]`).style.setProperty('--swatch', c.color); });
    ctx.instruct(difficulty === 2 ? 'Écoute la phrase en anglais et touche la bonne image.' : 'Écoute le mot en anglais et touche la bonne image.', { quiet: true });
    setTimeout(() => { if (!destroyed) say(); }, 300);
  }

  function answered() {
    busy = true;
    errors += question.errors;
    const t = cur().target;
    say();
    index += 1;
    const next = index < series.length ? ask : finish;
    // Le bouton « Suivant » se place à droite, sur la même ligne que les images.
    const choices = root.querySelector('.c-choices');
    const row = h('div', { class: 'en-row' });
    choices.replaceWith(row);
    row.append(choices, continueButton(index < series.length ? 'Suivant' : 'Terminer', () => { if (!destroyed) next(); }));
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why en-pair' }, h('strong', { lang: 'en' }, t.en), ` = ${t.fr}`));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { words: series.map((q) => q.target.en) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      say(true);
      question.hint();
    },
    repeat() { if (series) say(); },
    destroy() { destroyed = true; clear(root); },
  };
}
