/**
 * Les explorateurs du numérique (jeu 29) : des situations fictives (message d'inconnu, lien piège, moquerie en ligne)
 * et le bon réflexe, souvent : en parler à un adulte. Une mauvaise réponse est expliquée avec douceur, puis on réessaie.
 * Aucun champ de saisie : rien n'est jamais écrit ni demandé.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { choiceQuestion, continueButton, loadJson, seriesDots } from '../choices.js';
import { best, makeSeries } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let content = null;
  let series;
  let index;
  let step;
  let question;
  let errors;
  let hints;
  let destroyed = false;

  async function boot() {
    try {
      content = await loadJson('content/games/explorateurs-numerique.json');
    } catch {
      root.replaceChildren(h('p', { class: 'notice' }, 'Le contenu du jeu n’a pas pu être chargé. Vérifie la connexion puis reviens.'));
      return;
    }
    if (!destroyed) newSeries();
  }

  function newSeries() {
    series = makeSeries(difficulty, content, random);
    index = 0;
    errors = 0;
    hints = 0;
    ctx.activityStart();
    step = 0;
    ask();
  }

  const scenario = () => series[index];

  function ask() {
    const s = scenario();
    const st = s.steps[step];
    const model = h('div', { class: 'c-model dg-scene' },
      h('span', { class: 'c-pic', html: picto(s.picto, 72) }),
      s.message && step === 0 ? h('div', { class: 'dg-phone' }, h('div', { class: 'dg-bubble' }, s.message), h('p', { class: 'small' }, 'Message fictif')) : null,
      h('p', { class: 'dg-text' }, st.text));
    question = choiceQuestion(ctx, { model, choices: st.choices.map((c) => ({ id: c.id, text: c.text, aria: c.text, className: 'long' })), correctId: best(st).id, layout: 'list', onCorrect: answered });
    // Une mauvaise réponse est expliquée tout de suite (sans être grondé), puis l'enfant réessaie.
    question.node.querySelectorAll('.c-choice').forEach((btn) => {
      const c = st.choices.find((x) => x.id === btn.dataset.id);
      if (!c.best) btn.addEventListener('click', () => ctx.instruct(`${c.why} Essaie encore.`));
    });
    clear(root);
    root.append(h('div', { class: 'c-game digital' }, seriesDots(series.length, index), s.steps.length > 1 ? h('p', { class: 'small' }, `Étape ${step + 1} sur ${s.steps.length}`) : null, question.node));
    ctx.instruct(`${s.message && step === 0 ? `Tu reçois ce message : « ${s.message} ». ` : ''}${st.text} Que fais-tu ?`);
  }

  function answered() {
    errors += question.errors;
    const s = scenario();
    const why = best(s.steps[step]).why;
    ctx.instruct(why);
    step += 1;
    let next;
    if (step < s.steps.length) next = ask;
    else {
      index += 1;
      step = 0;
      next = index < series.length ? ask : finish;
    }
    root.querySelector('.c-game').append(h('p', { class: 'notice c-why' }, h('strong', {}, 'Bon réflexe ! '), why),
      continueButton(next === finish ? 'Terminer' : 'Suivant', () => { if (!destroyed) next(); }));
  }

  async function finish() {
    await ctx.activityDone({ success: true, hints, errors, attempts: series.length, level: null, data: { scenarios: series.map((s) => s.id) } });
    if (!destroyed) ctx.celebrate(newSeries);
  }

  boot();

  return {
    hint() {
      if (!question) return;
      hints += 1;
      ctx.instruct('Rappel : quand quelque chose te gêne, te fait peur ou te demande un secret, on en parle à un adulte de confiance.');
      question.hint();
    },
    repeat() { if (series) ctx.instruct(`${scenario().steps[step].text} Que fais-tu ?`); },
    destroy() { destroyed = true; clear(root); },
  };
}
