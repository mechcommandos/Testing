/**
 * L'orchestre des petits (jeu 11) : écouter et regarder une séquence, puis la rejouer.
 * Une erreur rejoue la séquence (sans son négatif) ; l'indice la rejoue plus lentement.
 */
import { playNote, soundOn } from '../../core/audio.js';
import { clear, h } from '../../ui/dom.js';
import { pic, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { checkInput, makeSequence, modeFor, PADS, SEQUENCES_PER_ACTIVITY, SKILLS } from './rules.js';

const STEP_MS = 650;
const SLOW_MS = 1100;

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  const pads = PADS[difficulty];
  let mode;
  let index;
  let sequence;
  let inputs;
  let errors;
  let hints;
  let listening = false; // la séquence est en train d'être montrée : les touches sont ignorées
  let destroyed = false;
  let timers = [];
  const buttons = new Map();

  function later(fn, ms) {
    timers.push(setTimeout(() => { if (!destroyed) fn(); }, ms));
  }

  function light(id, ms) {
    const btn = buttons.get(id);
    const pad = pads.find((p) => p.id === id);
    btn.classList.add('lit');
    if (mode === 'sound') playNote(pad.instrument, pad.frequency, Math.min(ms - 150, 500));
    later(() => btn.classList.remove('lit'), ms - 150);
  }

  function show(stepMs = STEP_MS) {
    listening = true;
    inputs = [];
    root.querySelector('.o-status').textContent = mode === 'sound' ? 'Écoute et regarde…' : 'Regarde bien…';
    sequence.forEach((id, i) => later(() => light(id, stepMs), 500 + i * stepMs));
    later(() => {
      listening = false;
      root.querySelector('.o-status').textContent = 'À toi !';
    }, 500 + sequence.length * stepMs);
  }

  function render() {
    clear(root);
    buttons.clear();
    const grid = h('div', { class: `o-pads n${pads.length}` }, pads.map((pad) => {
      const btn = h('button', { class: 'o-pad', style: `--pad: ${pad.color}`, 'aria-label': pad.label, onclick: () => press(pad, btn) },
        pic(pad.picto, 64, 'c-pic'),
        difficulty === 0 ? h('span', { class: 'o-pad-label', 'aria-hidden': 'true' }, pad.id === 'grave' ? 'grave' : 'aiguë') : null);
      buttons.set(pad.id, btn);
      return btn;
    }));
    root.append(h('div', { class: 'c-game orchestra' },
      seriesDots(SEQUENCES_PER_ACTIVITY, index),
      h('p', { class: 'o-status', 'aria-live': 'polite' }),
      grid,
      mode === 'silent' ? h('p', { class: 'small' }, 'Son coupé : la séquence se suit avec les lumières.') : null));
  }

  function newActivity() {
    mode = modeFor(soundOn());
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    newSequence();
  }

  function newSequence() {
    sequence = makeSequence(difficulty, random);
    render();
    ctx.instruct(mode === 'sound' ? 'Écoute la musique, puis rejoue-la.' : 'Regarde les lumières, puis touche les instruments dans le même ordre.', { quiet: true });
    show();
  }

  function press(pad, btn) {
    if (listening || !sequence) return;
    btn.classList.add('lit');
    later(() => btn.classList.remove('lit'), 250);
    if (mode === 'sound') playNote(pad.instrument, pad.frequency, 350);
    inputs.push(pad.id);
    const result = checkInput(sequence, inputs);
    if (result === 'wrong') {
      errors += 1;
      shake(btn, ctx.reducedMotion);
      if (errors === 3) ctx.offerHint();
      root.querySelector('.o-status').textContent = 'On réécoute…';
      later(() => show(), 700);
      return;
    }
    if (result === 'ok') return;
    ctx.sfx('good');
    index += 1;
    if (index < SEQUENCES_PER_ACTIVITY) {
      root.querySelector('.o-status').textContent = 'Bravo !';
      later(newSequence, 900);
      return;
    }
    later(finish, 700);
  }

  async function finish() {
    await ctx.activityDone({
      success: true, hints, errors, attempts: SEQUENCES_PER_ACTIVITY, level: null, skills: SKILLS[mode],
      data: { mode, sequences: SEQUENCES_PER_ACTIVITY, length: sequence.length, synthesized: true },
    });
    if (!destroyed) ctx.celebrate(newActivity);
  }

  newActivity();

  return {
    hint() {
      if (listening || !sequence) return;
      hints += 1;
      show(SLOW_MS);
    },
    repeat() { if (!listening && sequence) show(); },
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      timers = [];
      clear(root);
    },
  };
}
