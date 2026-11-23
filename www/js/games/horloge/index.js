/**
 * L'horloge des aventures (jeu 19) : régler une horloge à aiguilles, lire l'heure, calculer une durée.
 * L'affichage numérique est à côté de l'horloge. Les boutons tournent les aiguilles (l'aiguille des heures suit les minutes).
 * L'indice fait clignoter l'aiguille à corriger.
 */
import { clear, h } from '../../ui/dom.js';
import { choiceQuestion, continueButton, pic, seriesDots } from '../choices.js';
import { shake } from '../shared.js';
import { clockTime, digital, formatDuration, formatTime, handAngles, makeSeries, sameClockFace } from './rules.js';

function clockFace(minutes, { blink = null, small = false, label }) {
  const { hour, minute } = handAngles(minutes);
  let marks = '';
  for (let i = 1; i <= 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    marks += `<text x="${(100 + Math.cos(a) * 72).toFixed(1)}" y="${(100 + Math.sin(a) * 72 + 7).toFixed(1)}" text-anchor="middle" font-size="20" font-weight="800" fill="#23324d">${i}</text>`;
  }
  for (let i = 0; i < 60; i++) {
    const a = ((i * 6 - 90) * Math.PI) / 180;
    const r1 = i % 5 ? 86 : 82;
    marks += `<line x1="${(100 + Math.cos(a) * r1).toFixed(1)}" y1="${(100 + Math.sin(a) * r1).toFixed(1)}" x2="${(100 + Math.cos(a) * 90).toFixed(1)}" y2="${(100 + Math.sin(a) * 90).toFixed(1)}" stroke="#5b6b85" stroke-width="${i % 5 ? 1.5 : 3}"/>`;
  }
  return h('div', { class: `t-clock${small ? ' small' : ''}`, role: 'img', 'aria-label': label, html:
    `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle cx="100" cy="100" r="96" fill="#fff" stroke="#1a56b8" stroke-width="8"/>${marks}`
    + `<line class="t-hour${blink === 'hour' ? ' t-blink' : ''}" x1="100" y1="100" x2="100" y2="52" stroke="#23324d" stroke-width="9" stroke-linecap="round" transform="rotate(${hour.toFixed(1)} 100 100)"/>`
    + `<line class="t-minute${blink === 'minute' ? ' t-blink' : ''}" x1="100" y1="100" x2="100" y2="26" stroke="#e5484d" stroke-width="5" stroke-linecap="round" transform="rotate(${minute.toFixed(1)} 100 100)"/>`
    + '<circle cx="100" cy="100" r="7" fill="#23324d"/></svg>' });
}

const screen = (minutes, label = '') => h('div', { class: 't-digital', 'aria-label': `${label}${formatTime(minutes)}` }, digital(minutes));

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let series;
  let index;
  let question;
  let current;
  let blink;
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

  const task = () => series[index];

  function frame(...body) {
    clear(root);
    root.append(h('div', { class: 'c-game clocks' }, seriesDots(series.length, index), ...body));
  }

  function ask() {
    const t = task();
    busy = false;
    question = null;
    blink = null;
    if (t.kind === 'set') {
      current = 12 * 60;
      renderSet();
    } else {
      let model;
      if (t.kind === 'read') model = clockFace(t.shown, { label: 'Une horloge à aiguilles' });
      else {
        model = h('div', { class: 't-moment' }, pic(t.picto, 72),
          h('div', { class: 't-pair' }, h('div', {}, h('span', { class: 'small' }, 'Début'), screen(t.start, 'Début : ')),
            t.kind === 'duration' ? h('div', {}, h('span', { class: 'small' }, 'Fin'), screen(t.end, 'Fin : ')) : h('div', { class: 't-dur' }, h('span', { class: 'small' }, 'Durée'), h('strong', {}, formatDuration(t.duration)))));
      }
      question = choiceQuestion(ctx, { model, choices: t.choices.map((c) => ({ ...c, aria: c.text, className: 'long' })), correctId: t.correctId, onCorrect: () => success(t) });
      frame(question.node);
    }
    ctx.instruct(t.prompt);
  }

  function renderSet() {
    const t = task();
    const big = t.step === 60 ? [] : [[-15, '− 15 min'], [15, '+ 15 min']];
    frame(h('div', { class: 't-set' },
      clockFace(current, { blink, label: `Horloge réglée sur ${formatTime(current)}` }),
      h('div', { class: 't-goal' }, h('span', { class: 'small' }, 'À régler'), screen(t.target, 'Heure à régler : '))),
    h('div', { class: 't-buttons' },
      [[-60, '− 1 heure'], [60, '+ 1 heure'], ...big].map(([d, label]) => h('button', { class: 'btn ghost', onclick: () => turn(d) }, label)),
      h('button', { class: 'btn', onclick: checkSet }, 'C’est réglé')));
  }

  function turn(delta) {
    if (busy) return;
    current = clockTime(current + delta); // entre 1 h et 12 h 59 : jamais « 0 h 15 »
    blink = null;
    ctx.sfx('tap');
    renderSet();
  }

  function checkSet() {
    if (busy) return;
    const t = task();
    if (sameClockFace(current, t.target)) return success(t);
    errors += 1;
    ctx.sfx('soft');
    shake(root.querySelector('.t-clock'), ctx.reducedMotion);
    ctx.instruct(`Pas encore. L’horloge montre ${formatTime(current)}. ${t.prompt}`);
    if (errors % 2 === 0) ctx.offerHint();
  }

  function success(t) {
    busy = true;
    if (question) errors += question.errors;
    ctx.sfx('good');
    const text = t.kind === 'set' || t.kind === 'read' ? `Oui, il est ${formatTime(t.target ?? t.shown)}.`
      : t.kind === 'duration' ? `Oui, ça a duré ${formatDuration(t.end - t.start)}.` : `Oui, c’est fini à ${formatTime(t.start + t.duration)}.`;
    ctx.instruct(text);
    index += 1;
    const next = index < series.length ? ask : finish;
    root.querySelector('.c-game').append(t.kind === 'read' ? screen(t.shown) : null, h('p', { class: 'notice c-why' }, text), continueButton(index < series.length ? 'Suivant' : 'Terminer', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { tasks: series.map((t) => t.kind) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  newSeries();

  return {
    hint() {
      if (!series || busy) return;
      hints += 1;
      const t = task();
      if (question) {
        question.hint();
        if (t.kind === 'duration') ctx.instruct(`Compte de ${formatTime(t.start)} à ${formatTime(t.end)}, heure par heure, puis les minutes.`);
        return;
      }
      const goal = handAngles(t.target);
      const now = handAngles(current);
      blink = Math.abs(goal.minute - now.minute) > 0.5 ? 'minute' : 'hour';
      renderSet();
      ctx.instruct(blink === 'minute' ? 'Regarde la grande aiguille rouge : c’est elle qu’il faut tourner.' : 'Les minutes sont bonnes. Tourne maintenant la petite aiguille, celle des heures.');
    },
    repeat() { if (series) ctx.instruct(task().prompt); },
    destroy() { destroyed = true; clear(root); },
  };
}
