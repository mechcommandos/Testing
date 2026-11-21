/** Fenêtres : boutique, style, missions, cadeau quotidien, réglages + notifications. */
import { CREDIT_PACKS, ECONOMY, PRIVACY_URL, WEAPON_PRICES } from '../config';
import { WEAPON_IDS, type WeaponId } from '../game/game';
import { fmt, fmtDuration, getLang, setLang, t, td, type Lang } from '../i18n';
import { ads } from '../services/ads';
import { haptic, sfx } from '../services/audio';
import { iap } from '../services/iap';
import { itemsBySlot, type Item, type Slot } from '../state/catalog';
import { DAILY_REWARDS, store, type Reward } from '../state/store';
import { add, fill, h } from './dom';
import { confetti, sparkle } from './fx';
import * as ic from './icons';
import { Mascot } from './mascot';

const layer = () => document.getElementById('overlays')!;

// ---------- notifications ----------
export function toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
  const el = h('div', { class: `toast ${kind}` }, text);
  layer().appendChild(el);
  setTimeout(() => el.classList.add('out'), 1900);
  setTimeout(() => el.remove(), 2300);
}

export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`+${fmt(r.coins)} ${t('coins').toLowerCase()}`);
  if (r.credits) parts.push(`+${r.credits} ${t('credits').toLowerCase()}`);
  if (r.weapon) parts.push(`+1 ${td('w_' + r.weapon)}`);
  return parts.join('  ·  ');
}

export function rewardChips(r: Reward): HTMLElement {
  return h(
    'div',
    { class: 'chips' },
    r.coins ? h('span', { class: 'chip', html: `${ic.coin}<b>${fmt(r.coins)}</b>` }) : null,
    r.credits ? h('span', { class: 'chip', html: `${ic.credit}<b>${r.credits}</b>` }) : null,
    r.weapon ? h('span', { class: 'chip', html: `${ic.weaponIcons[r.weapon]}<b>+1</b>` }) : null,
  );
}

// ---------- socle des fenêtres ----------
export interface Modal {
  el: HTMLElement;
  body: HTMLElement;
  close: () => void;
}

interface ModalOpts {
  title?: string;
  cls?: string;
  /** false : pas de croix ni de fermeture en touchant le fond */
  dismissable?: boolean;
  onClose?: () => void;
}

export function openModal(opts: ModalOpts = {}): Modal {
  const dismissable = opts.dismissable !== false;
  const body = h('div', { class: 'modal-body' });
  const card = h(
    'div',
    { class: `modal-card ${opts.cls ?? ''}` },
    opts.title ? h('div', { class: 'modal-title' }, opts.title) : null,
    dismissable ? h('button', { class: 'modal-x', 'aria-label': t('close'), html: ic.close, onclick: () => close() }) : null,
    body,
  );
  const el = h('div', { class: 'modal' }, card);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 180);
    opts.onClose?.();
  };
  if (dismissable) {
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) close();
    });
  }
  layer().appendChild(el);
  sfx.tap();
  return { el, body, close };
}

/** Ferme la fenêtre du dessus (bouton retour Android). Renvoie false s'il n'y en a pas. */
export function closeTopModal(): boolean {
  const all = layer().querySelectorAll<HTMLElement>('.modal:not(.out)');
  const top = all[all.length - 1];
  if (!top) return false;
  top.querySelector<HTMLElement>('.modal-x')?.click();
  return true;
}

export function btn(label: string | HTMLElement, cls: string, onclick: (e: Event) => void, iconHtml?: string): HTMLButtonElement {
  return h(
    'button',
    {
      class: `btn ${cls}`,
      onclick: (e: Event) => {
        sfx.tap();
        haptic.light();
        onclick(e);
      },
    },
    iconHtml ? h('span', { class: 'btn-ic', html: iconHtml }) : null,
    typeof label === 'string' ? h('span', null, label) : label,
  );
}

/** Regarder une vidéo récompensée, avec messages d'état. */
export async function watchAd(): Promise<boolean> {
  if (!ads.available()) {
    toast(t('adUnavailable'), 'bad');
    return false;
  }
  const wait = h('div', { class: 'modal wait' }, h('div', { class: 'spinner' }), h('p', null, t('adLoading')));
  layer().appendChild(wait);
  const ok = await ads.showRewarded();
  wait.remove();
  if (!ok) toast(t('adUnavailable'), 'bad');
  return ok;
}

function priceTag(item: { coins?: number; credits?: number }): string {
  if (item.credits) return `${ic.credit}<b>${fmt(item.credits)}</b>`;
  if (item.coins) return `${ic.coin}<b>${fmt(item.coins)}</b>`;
  return `<b>${t('free')}</b>`;
}

// ---------- boutique ----------
export function openShop(focus?: 'credits' | 'weapons'): void {
  const cleanup: (() => void)[] = [];
  const m = openModal({ title: t('shop'), cls: 'sheet', onClose: () => cleanup.forEach((f) => f()) });

  const render = () => {
    const p = store.p;
    fill(m.body, 
      walletRow(),
      iap.simulated() ? h('div', { class: 'sandbox' }, t('sandboxBadge')) : null,

      h('h3', { id: 'sec-credits' }, t('creditPacks')),
      h(
        'div',
        { class: 'packs' },
        CREDIT_PACKS.map((pack) =>
          h(
            'button',
            {
              class: `pack ${pack.tag ?? ''}`,
              onclick: async (e: Event) => {
                const el = e.currentTarget as HTMLElement;
                el.classList.add('busy');
                const res = await iap.buy(pack);
                el.classList.remove('busy');
                if (res === 'ok') {
                  sfx.reward();
                  haptic.celebrate();
                  confetti(60);
                  toast(t('purchaseOk', { n: fmt(pack.credits) }), 'good');
                } else if (res === 'cancelled') toast(t('purchaseCancelled'));
                else toast(t(res === 'unavailable' ? 'storeUnavailable' : 'purchaseFailed'), 'bad');
              },
            },
            pack.tag ? h('span', { class: 'ribbon' }, t(pack.tag === 'popular' ? 'popular' : 'bestValue')) : null,
            h('span', { class: 'pack-ic', html: ic.credit }),
            h('b', { class: 'pack-n' }, fmt(pack.credits)),
            h('span', { class: 'pack-price' }, iap.price(pack)),
          ),
        ),
      ),

      h('h3', { id: 'sec-weapons' }, t('weapons')),
      h(
        'div',
        { class: 'wlist' },
        WEAPON_IDS.map((w) => weaponRow(w)),
      ),

      h('h3', null, t('freeStuff')),
      h(
        'div',
        { class: 'frees' },
        h(
          'button',
          {
            class: 'free-card',
            disabled: p.adCoins.count >= ECONOMY.adCoinsPerDay,
            onclick: async () => {
              if (!(await watchAd())) return;
              store.rollover();
              store.p.adCoins.count += 1;
              store.addCoins(ECONOMY.adCoins);
              sfx.coin();
              toast(t('freeCoins', { n: ECONOMY.adCoins }), 'good');
            },
          },
          h('span', { class: 'free-ic', html: ic.video }),
          h('b', { html: `${ic.coin} +${ECONOMY.adCoins}` }),
          h('small', null, t('freeCoinsLeft', { n: Math.max(0, ECONOMY.adCoinsPerDay - p.adCoins.count) })),
        ),
        h(
          'button',
          {
            class: `free-card ${store.giftReady() ? 'ready' : ''}`,
            disabled: !store.giftReady(),
            onclick: (e: Event) => {
              const r = store.claimGift();
              if (!r) return;
              sfx.reward();
              haptic.success();
              const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
              sparkle(box.left + box.width / 2, box.top + box.height / 2);
              toast(rewardText(r), 'good');
            },
          },
          h('span', { class: 'free-ic gift', html: ic.gift }),
          h('b', null, t('freeGift')),
          h('small', null, store.giftReady() ? t('giftReady') : t('giftIn', { t: fmtDuration(p.giftAt - Date.now()) })),
        ),
      ),
      h('button', { class: 'link', onclick: async () => { await iap.restore(); toast(t('restored')); } }, t('restore')),
    );
  };

  cleanup.push(store.on(render));
  render();
  const timer = setInterval(render, 30000);
  cleanup.push(() => clearInterval(timer));
  if (focus) setTimeout(() => m.body.querySelector(`#sec-${focus}`)?.scrollIntoView({ block: 'start' }), 60);
}

export function walletRow(): HTMLElement {
  return h(
    'div',
    { class: 'wallet' },
    h('span', { class: 'pill', html: `${ic.coin}<b>${fmt(store.p.coins)}</b>` }),
    h('span', { class: 'pill', html: `${ic.credit}<b>${fmt(store.p.credits)}</b>` }),
  );
}

/** Achat d'armes : à l'unité (boulons) ou par lot de 5 (crédits). */
export function buyWeapon(w: WeaponId, mode: 'coins' | 'credits'): boolean {
  const price = WEAPON_PRICES[w];
  if (mode === 'coins') {
    if (!store.spendCoins(price.coins)) {
      toast(t('notEnoughCoins'), 'bad');
      sfx.invalid(); haptic.error();
      return false;
    }
    store.addWeapon(w, 1);
  } else {
    if (!store.spendCredits(price.credits5)) {
      toast(t('notEnoughCredits'), 'bad');
      sfx.invalid(); haptic.error();
      return false;
    }
    store.addWeapon(w, 5);
  }
  sfx.coin();
  haptic.medium();
  return true;
}

function weaponRow(w: WeaponId): HTMLElement {
  const price = WEAPON_PRICES[w];
  return h(
    'div',
    { class: 'wrow' },
    h('span', { class: 'wrow-ic', html: ic.weaponIcons[w] }, h('i', null, `×${store.p.weapons[w]}`)),
    h('div', { class: 'wrow-txt' }, h('b', null, td('w_' + w)), h('small', null, td('wd_' + w))),
    h(
      'div',
      { class: 'wrow-buy' },
      h('button', { class: 'price', html: `<small>×1</small>${ic.coin}<b>${price.coins}</b>`, onclick: () => buyWeapon(w, 'coins') }),
      h('button', { class: 'price pink', html: `<small>×5</small>${ic.credit}<b>${price.credits5}</b>`, onclick: () => buyWeapon(w, 'credits') }),
    ),
  );
}

// ---------- style (skins et accessoires) ----------
export function openWardrobe(): void {
  let tab: Slot = 'skin';
  // tenue en cours d'essayage (peut contenir des objets non possédés)
  const preview = { ...store.p.equipped };
  const mascot = new Mascot(preview);
  const cleanup: (() => void)[] = [() => mascot.destroy()];
  const m = openModal({ title: t('style'), cls: 'sheet wardrobe', onClose: () => cleanup.forEach((f) => f()) });
  const stage = h('div', { class: 'stage' }, mascot.el);
  const tabs = h('div', { class: 'tabs' });
  const grid = h('div', { class: 'items' });
  const action = h('div', { class: 'ward-action' });
  const wallet = h('div');
  add(m.body, wallet, stage, tabs, grid, action);

  const TABS: [Slot, string][] = [
    ['skin', t('skins')],
    ['head', t('head')],
    ['face', t('face')],
    ['neck', t('neck')],
  ];

  const select = (item: Item | null) => {
    preview[tab] = item ? item.id : null;
    if (item && store.owns(item.id)) store.equip(item.id);
    else if (!item) store.unequip(tab);
    mascot.equip(preview as never);
    mascot.act('hop');
    render();
  };

  const render = () => {
    fill(wallet, walletRow());
    fill(tabs, 
      ...TABS.map(([slot, label]) =>
        h('button', { class: `tab ${slot === tab ? 'on' : ''}`, onclick: () => { tab = slot; sfx.tap(); haptic.select(); render(); } }, label),
      ),
    );
    const cards: HTMLElement[] = [];
    if (tab !== 'skin') {
      cards.push(
        h('button', { class: `item ${preview[tab] === null ? 'sel' : ''}`, onclick: () => { sfx.tap(); haptic.select(); select(null); } },
          h('span', { class: 'item-none', html: ic.none }), h('small', null, t('remove'))),
      );
    }
    for (const item of itemsBySlot(tab)) {
      const owned = store.owns(item.id);
      const thumb =
        item.slot === 'skin'
          ? h('span', { class: 'item-skin', style: { backgroundImage: `url(./mascot/${item.id}.webp)` } })
          : h('span', { class: `item-acc acc-${item.id}`, html: accessoryThumb(item.id) });
      cards.push(
        h(
          'button',
          { class: `item ${preview[tab] === item.id ? 'sel' : ''} ${owned ? 'owned' : ''}`, onclick: () => { sfx.tap(); haptic.select(); select(item); } },
          thumb,
          h('small', null, td('i_' + item.id)),
          owned
            ? store.p.equipped[tab] === item.id
              ? h('span', { class: 'item-tag on', html: ic.check })
              : null
            : h('span', { class: 'item-price', html: priceTag(item) }),
        ),
      );
    }
    fill(grid, ...cards);

    const cur = itemsBySlot(tab).find((i) => i.id === preview[tab]);
    if (cur && !store.owns(cur.id)) {
      fill(action, 
        btn(h('span', { html: `${t('buy')} &nbsp;${priceTag(cur)}` }), cur.credits ? 'pink big' : 'cyan big', () => {
          const res = store.buyItem(cur.id);
          if (res === 'ok') {
            sfx.reward();
            haptic.celebrate();
            mascot.flash('wow', 1500);
            mascot.act('cheer');
            const box = stage.getBoundingClientRect();
            sparkle(box.left + box.width / 2, box.top + box.height / 2, '#FF4F9A', 18);
            toast(t('purchased'), 'good');
            render();
          } else {
            sfx.invalid(); haptic.error(); haptic.error();
            toast(t(res === 'coins' ? 'notEnoughCoins' : 'notEnoughCredits'), 'bad');
            if (res === 'credits') openShop('credits');
          }
        }),
      );
    } else {
      fill(action, h('div', { class: 'ward-ok', html: `${ic.check} ${cur ? td('i_' + cur.id) + ' — ' : ''}${t('equipped')}` }));
    }
  };
  cleanup.push(store.on(render));
  render();
}

/** Vignette d'un accessoire : Layjou cadré sur la zone concernée. */
function accessoryThumb(id: string): string {
  const eq = { skin: 'classic', head: null, face: null, neck: null } as Record<string, string | null>;
  const slot = itemsBySlot('head').some((i) => i.id === id) ? 'head' : itemsBySlot('face').some((i) => i.id === id) ? 'face' : 'neck';
  eq[slot] = id;
  const m = new Mascot(eq as never);
  const html = m.el.querySelector('.mascot-body')!.outerHTML;
  m.destroy();
  return html;
}

// ---------- missions ----------
export function openMissions(): void {
  const cleanup: (() => void)[] = [];
  const m = openModal({ title: t('dailyMissions'), cls: 'sheet', onClose: () => cleanup.forEach((f) => f()) });
  const render = () => {
    store.rollover();
    const p = store.p;
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    fill(m.body, 
      ...p.missions.list.map((mi, i) => {
        const done = mi.progress >= mi.target;
        return h(
          'div',
          { class: `mission ${mi.claimed ? 'claimed' : done ? 'done' : ''}` },
          h(
            'div',
            { class: 'mission-main' },
            h('b', null, td('m_' + mi.kind, { n: fmt(mi.target) })),
            h('div', { class: 'bar' }, h('i', { style: { width: `${(mi.progress / mi.target) * 100}%` } }), h('span', null, `${fmt(mi.progress)} / ${fmt(mi.target)}`)),
          ),
          mi.claimed
            ? h('span', { class: 'mission-ok', html: ic.check })
            : h('button', {
                class: 'price claim',
                disabled: !done,
                html: `${ic.coin}<b>${mi.reward}</b>`,
                onclick: (e: Event) => {
                  const n = store.claimMission(i);
                  if (!n) return;
                  sfx.coin();
                  haptic.success();
                  const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  sparkle(b.left + b.width / 2, b.top + b.height / 2);
                },
              }),
        );
      }),
      h(
        'div',
        { class: `mission bonus ${p.missions.bonus ? 'claimed' : store.missionBonusReady() ? 'done' : ''}` },
        h('div', { class: 'mission-main' }, h('b', null, t('allDone')), rewardChips({ credits: 15, coins: 150 })),
        p.missions.bonus
          ? h('span', { class: 'mission-ok', html: ic.check })
          : h('button', {
              class: 'price claim pink',
              disabled: !store.missionBonusReady(),
              html: `<b>${t('claim')}</b>`,
              onclick: () => {
                if (!store.claimMissionBonus()) return;
                sfx.reward();
                haptic.success();
                confetti(70);
              },
            }),
      ),
      h('p', { class: 'hint' }, t('resetsIn', { t: fmtDuration(midnight.getTime() - Date.now()) })),
    );
  };
  cleanup.push(store.on(render));
  render();
}

// ---------- cadeau quotidien ----------
export function openDaily(): void {
  const m = openModal({ title: t('dailyTitle'), cls: 'daily' });
  const render = () => {
    const available = store.dailyAvailable();
    const cur = store.dailyIndex();
    fill(m.body, 
      h('p', { class: 'hint' }, t('dailyText')),
      h(
        'div',
        { class: 'days' },
        DAILY_REWARDS.map((r, i) =>
          h(
            'div',
            { class: `dayc ${i < cur || (i === cur && !available) ? 'past' : ''} ${i === cur && available ? 'now' : ''} ${i === 6 ? 'big' : ''}` },
            h('small', null, t('day', { n: i + 1 })),
            rewardChips(r),
            i < cur || (i === cur && !available) ? h('span', { class: 'dayc-ok', html: ic.check }) : null,
          ),
        ),
      ),
      available
        ? btn(t('claim'), 'pink big', () => {
            const r = store.claimDaily();
            if (!r) return;
            sfx.reward();
            haptic.success();
            confetti(80);
            toast(rewardText(r), 'good');
            render();
          })
        : h('div', { class: 'ward-ok' }, t('comeBack')),
    );
  };
  render();
}

// ---------- réglages ----------
export function openSettings(onLangChange: () => void): void {
  const m = openModal({ title: t('settings'), cls: 'settings' });
  const toggle = (label: string, icon: string, get: () => boolean, set: (v: boolean) => void) => {
    const sw = h('button', { class: `switch ${get() ? 'on' : ''}`, role: 'switch', 'aria-checked': String(get()) }, h('i'));
    sw.onclick = () => {
      set(!get());
      store.commit();
      sw.classList.toggle('on', get());
      sw.setAttribute('aria-checked', String(get()));
      sfx.tap();
      haptic.light();
    };
    return h('div', { class: 'set-row' }, h('span', { class: 'set-ic', html: icon }), h('b', null, label), sw);
  };
  const s = store.p.settings;
  const langBtn = (l: Lang, label: string) =>
    h('button', { class: `seg ${getLang() === l ? 'on' : ''}`, onclick: () => { s.lang = l; setLang(l); store.commit(); m.close(); onLangChange(); } }, label);
  add(m.body, 
    toggle(t('sound'), ic.sound, () => s.sound, (v) => (s.sound = v)),
    toggle(t('haptics'), ic.vibrate, () => s.haptics, (v) => (s.haptics = v)),
    h('div', { class: 'set-row' }, h('span', { class: 'set-ic', html: ic.globe }), h('b', null, t('language')), h('div', { class: 'segs' }, langBtn('fr', 'FR'), langBtn('en', 'EN'))),
    ads.hasPrivacyOptions()
      ? h('button', { class: 'set-row tap', onclick: () => void ads.showPrivacyOptions() }, h('span', { class: 'set-ic', html: ic.shield }), h('b', null, t('privacy')))
      : null,
    h('button', { class: 'set-row tap', onclick: () => window.open(PRIVACY_URL, '_blank') }, h('span', { class: 'set-ic', html: ic.info }), h('b', null, t('privacyPolicy'))),
    h('div', { class: 'howto' }, h('b', { html: `${ic.info} ${t('howTo')}` }), h('p', null, t('howToText'))),
    h('p', { class: 'hint' }, `Layjou Blocks · ${t('version')} ${__APP_VERSION__}`),
  );
}
