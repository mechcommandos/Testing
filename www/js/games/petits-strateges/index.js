/**
 * Les petits stratèges (jeu 42) : le jeu des pommes contre le robot. L'enfant prend 1, 2 (ou 3) pommes ; le robot
 * répond. Celui qui prend la dernière pomme gagne. Une défaite propose la revanche (aucune pénalité visible) ;
 * l'activité est réussie à la première victoire.
 */
import { clear, h } from '../../ui/dom.js';
import { picto } from '../../ui/pictos.js';
import { advice, newGame, robotMove } from './rules.js';

export function createGame(ctx) {
  const { root, difficulty, random } = ctx;
  let game;
  let losses = 0;
  let hints = 0;
  let turn = 'child';
  let timer = null;
  let destroyed = false;

  function begin(first = true) {
    if (first) { losses = 0; hints = 0; ctx.activityStart(); }
    game = newGame(difficulty, random);
    turn = 'child';
    render();
    const names = ['le robot rêveur', 'le robot prudent', 'le robot malin'][Math.min(difficulty, 2)];
    ctx.instruct(`Contre ${names} : chacun à son tour prend ${game.max === 2 ? '1 ou 2' : '1, 2 ou 3'} pommes. Celui qui prend la dernière pomme gagne. Il y a ${game.pile} pommes : à toi de commencer !`);
  }

  function render(taken = 0) {
    const apples = h('div', { class: 'ps-apples', role: 'img', 'aria-label': `${game.pile} pommes` },
      Array.from({ length: game.start }, (_, i) => h('span', { class: `ps-apple${i >= game.pile ? ' gone' : ''}${i >= game.pile && i < game.pile + taken ? ' leaving' : ''}`, html: picto('pomme', 44) })));
    const buttons = h('div', { class: 'ps-moves', role: 'group', 'aria-label': 'Combien de pommes prendre ?' },
      Array.from({ length: game.max }, (_, k) => k + 1).map((n) => h('button', {
        class: 'btn big ps-take', disabled: turn !== 'child' || n > game.pile,
        onclick: () => take(n),
      }, `Prendre ${n}`)));
    clear(root);
    root.append(h('div', { class: 'c-game ps-game' },
      h('p', { class: 'ps-count', 'aria-live': 'polite' }, `${game.pile} pomme${game.pile > 1 ? 's' : ''}`),
      apples,
      h('p', { class: 'ps-turn' }, turn === 'child' ? 'À toi de jouer' : 'Le robot réfléchit…'),
      buttons));
  }

  function take(n) {
    if (turn !== 'child' || n > game.pile) return;
    game.pile -= n;
    ctx.sfx('tap');
    if (game.pile === 0) return won();
    turn = 'robot';
    render(n);
    ctx.instruct(`Tu prends ${n} pomme${n > 1 ? 's' : ''}. Il en reste ${game.pile}.`);
    timer = setTimeout(robot, ctx.reducedMotion ? 400 : 1300);
  }

  function robot() {
    if (destroyed) return;
    const n = robotMove(game.pile, game.max, game.robot, random);
    game.pile -= n;
    if (game.pile === 0) return lost(n);
    turn = 'child';
    render(n);
    ctx.instruct(`Le robot prend ${n} pomme${n > 1 ? 's' : ''}. Il en reste ${game.pile}. À toi !`);
  }

  async function won() {
    turn = 'over';
    render();
    ctx.sfx('good');
    ctx.instruct('Tu as pris la dernière pomme : tu as gagné !');
    await ctx.activityDone({ success: true, hints, errors: losses, attempts: losses + 1, level: null, data: { losses, start: game.start } });
    if (!destroyed) ctx.celebrate(() => begin(true), losses ? `Victoire après ${losses} revanche${losses > 1 ? 's' : ''} !` : 'Victoire du premier coup !');
  }

  function lost(n) {
    turn = 'over';
    losses += 1;
    render(n);
    ctx.sfx('soft');
    ctx.instruct(`Le robot prend ${n === 1 ? 'la dernière pomme' : `les ${n} dernières pommes`} et gagne cette partie. On fait la revanche ? Tu peux demander un indice au robot.`);
    if (losses >= 1) ctx.offerHint();
    root.querySelector('.c-game').append(h('button', { class: 'btn big', onclick: () => begin(false) }, 'Revanche !'));
  }

  begin(true);

  return {
    hint() {
      hints += 1;
      if (turn === 'child') ctx.instruct(advice(game.pile, game.max));
      else ctx.instruct(`Le secret : laisse au robot un nombre de pommes qui est un multiple de ${game.max + 1}.`);
    },
    repeat() { ctx.instruct(turn === 'child' ? `Il reste ${game.pile} pommes. Prends ${game.max === 2 ? '1 ou 2' : '1, 2 ou 3'} pommes. Celui qui prend la dernière gagne.` : 'Le robot joue.'); },
    destroy() { destroyed = true; clearTimeout(timer); clear(root); },
  };
}
