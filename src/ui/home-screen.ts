/** Écran d'accueil. */
import { fmt, say, t } from '../i18n';
import { haptic, sfx } from '../services/audio';
import { store, xpForLevel } from '../state/store';
import { fill, h } from './dom';
import * as ic from './icons';
import { Mascot } from './mascot';
import { openDaily, openMissions, openSettings, openShop, openWardrobe } from './modals';

export interface HomeScreen {
  el: HTMLElement;
  destroy: () => void;
}

const LOGO_TILES = ['B', 'L', 'O', 'C', 'K', 'S'];

export function logo(): HTMLElement {
  return h(
    'div',
    { class: 'logo', role: 'img', 'aria-label': 'Layjou Blocks' },
    h('img', { class: 'logo-img', src: './layjou-logo.png', alt: 'Layjou', draggable: 'false' }),
    h('div', { class: 'logo-tiles' }, LOGO_TILES.map((l, i) => h('i', { class: `blk c${[1, 2, 3, 4, 6, 5][i]}` }, l))),
  );
}

export function createHomeScreen(play: (resume: boolean) => void, rebuild: () => void): HomeScreen {
  const mascot = new Mascot(store.p.equipped as never);
  const top = h('div', { class: 'topbar' });
  const bestEl = h('div', { class: 'home-best' });
  const actions = h('div', { class: 'home-actions' });
  const nav = h('div', { class: 'nav' });

  const navBtn = (label: string, icon: string, cls: string, badge: number | boolean, onclick: () => void) =>
    h(
      'button',
      { class: `nav-btn ${cls}`, onclick: () => { haptic.light(); onclick(); } },
      h('span', { class: 'nav-ic', html: icon }),
      h('small', null, label),
      badge ? h('i', { class: 'badge' }, badge === true ? '!' : String(badge)) : null,
    );

  const render = () => {
    const p = store.p;
    const need = xpForLevel(p.level);
    fill(top, 
      h('div', { class: 'lvl-chip' }, h('b', null, String(p.level)), h('div', { class: 'bar' }, h('i', { style: { width: `${(p.xp / need) * 100}%` } }))),
      h('span', { class: 'pill', html: `${ic.coin}<b>${fmt(p.coins)}</b>` }),
      h('button', { class: 'pill', html: `${ic.credit}<b>${fmt(p.credits)}</b><span class="plus">+</span>`, onclick: () => { haptic.tap(); openShop('credits'); } }),
      h('button', { class: 'round', 'aria-label': t('settings'), html: ic.gear, onclick: () => { haptic.tap(); openSettings(rebuild); } }),
    );
    bestEl.innerHTML = p.best > 0 ? `${ic.crown}<span>${t('best')}</span><b>${fmt(p.best)}</b>` : '';
    const saved = !!p.saved;
    fill(actions, 
      h(
        'button',
        { class: 'btn pink huge play', onclick: () => { sfx.tap(); haptic.medium(); play(saved); } },
        h('span', { class: 'btn-ic', html: ic.play }),
        h('span', null, saved ? t('resume') : t('play')),
      ),
      saved
        ? h('button', { class: 'link', onclick: () => { sfx.tap(); haptic.light(); play(false); } }, `${t('newGame')} · ${t('score')} ${fmt(p.saved!.score)}`)
        : null,
    );
    fill(nav, 
      navBtn(t('shop'), ic.bag, 'n1', store.giftReady(), () => openShop()),
      navBtn(t('style'), ic.shirt, 'n2', false, openWardrobe),
      navBtn(t('missions'), ic.target, 'n3', store.missionsClaimable(), openMissions),
      navBtn(t('gift'), ic.gift, 'n4', store.dailyAvailable(), openDaily),
    );
    mascot.equip(p.equipped as never);
  };

  const hero = h('button', { class: 'hero', 'aria-label': 'Layjou', onclick: () => {
    mascot.act('hop');
    mascot.flash('joy', 900);
    mascot.say(say('sayPoke'));
    sfx.pick();
    haptic.light();
  } }, mascot.el);

  const el = h(
    'div',
    { class: 'screen home' },
    top,
    logo(),
    hero,
    bestEl,
    actions,
    nav,
  );
  const off = store.on(render);
  render();
  setTimeout(() => mascot.say(say('sayHello'), 2600), 700);

  return {
    el,
    destroy: () => {
      off();
      mascot.destroy();
      el.remove();
    },
  };
}
