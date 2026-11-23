/**
 * « Mon album » : les autocollants gagnés en jouant (core/world.js).
 * Les nouveaux attendent dans la pochette ; toucher un autocollant le colle à sa place (il s'envole jusqu'à elle).
 * Une page par zone de l'île ; chaque jeu a 6 places, la silhouette grise montre ce qui reste à gagner.
 */
import { speak, sfx } from '../../core/audio.js';
import { placeSticker, STICKER_SETS, stickerId, unlockedOutfits } from '../../core/world.js';
import { h } from '../dom.js';
import { picto } from '../pictos.js';
import { app, isPlayable, readingMode, reducedMotion, updateWorld } from '../state.js';
import { companion } from '../mascot.js';

let page = 0;

export async function album({ quiet = false } = {}) {
  const main = document.getElementById('main');
  const world = app.world;
  const domains = app.skills.domains.filter((d) => app.catalogue.games.some((g) => g.theme === d.id && isPlayable(g)));
  page = Math.min(page, domains.length - 1);
  const pocket = world.stickers.filter((s) => !s.placed);
  const placed = new Set(world.stickers.filter((s) => s.placed).map((s) => s.id));
  const domain = domains[page];
  const games = app.catalogue.games.filter((g) => g.theme === domain.id && isPlayable(g));
  const total = Object.values(STICKER_SETS).reduce((n, s) => n + s.length, 0);

  const pocketEl = h('div', { class: 'al-pocket', role: 'group', 'aria-label': 'Pochette : autocollants à coller' },
    pocket.length
      ? pocket.map((s) => h('button', { class: 'al-sticker new', 'data-id': s.id, 'aria-label': 'Coller cet autocollant dans l’album', html: picto(s.picto, 56), onclick: (e) => stick(s, e.currentTarget) }))
      : h('p', { class: 'small' }, readingMode() ? '' : 'Joue pour gagner des autocollants !'));

  const pageEl = h('section', { class: 'al-page', 'aria-label': domain.label },
    h('h2', { class: 'al-page-title' }, domain.label),
    games.map((g) => h('div', { class: 'al-game' },
      h('p', { class: 'al-game-name' }, g.name, world.stars[g.id] ? h('span', { class: 'al-stars', 'aria-label': `${world.stars[g.id]} étoiles dorées` }, ` ★ ${world.stars[g.id]}`) : null),
      h('div', { class: 'al-slots' }, (STICKER_SETS[g.id] ?? []).map((p) => {
        const id = stickerId(g.id, p);
        const owned = world.stickers.some((s) => s.id === id);
        return h('span', { class: `al-slot${placed.has(id) ? ' full' : owned ? ' waiting' : ''}`, 'data-slot': id, html: picto(p, 52), 'aria-label': placed.has(id) ? 'autocollant collé' : owned ? 'autocollant dans la pochette' : 'place vide' });
      })))));

  const nav = h('div', { class: 'al-nav' },
    h('button', { class: 'btn ghost', disabled: page === 0, 'aria-label': 'Page précédente', onclick: () => { page -= 1; album({ quiet: true }); } }, '◀'),
    h('div', { class: 'al-dots', 'aria-hidden': 'true' }, domains.map((d, i) => h('span', { class: i === page ? 'on' : '' }))),
    h('button', { class: 'btn ghost', disabled: page === domains.length - 1, 'aria-label': 'Page suivante', onclick: () => { page += 1; album({ quiet: true }); } }, '▶'));

  const buddy = companion({ size: 90, tappable: true, expression: pocket.length ? 'surprise' : 'joie' });
  main.replaceChildren(h('section', { class: 'album' },
    h('div', { class: 'al-head' },
      h('a', { href: '#/compagnon', class: 'al-buddy', 'aria-label': `Habiller ${world.companion.name}` }, buddy, h('span', {}, world.companion.name)),
      h('div', {}, h('h1', {}, 'Mon album'), h('p', { class: 'lead' }, `${world.stickers.length} autocollant${world.stickers.length > 1 ? 's' : ''} sur ${total}`),
        h('p', { class: 'small' }, `${unlockedOutfits(world).length} accessoire${unlockedOutfits(world).length > 1 ? 's' : ''} pour ${world.companion.name}`))),
    pocket.length ? h('p', { class: 'al-hint' }, readingMode() ? '' : 'Touche un autocollant pour le coller.') : null,
    pocketEl, nav, pageEl));
  if (pocket.length && !quiet) speak(pocket.length > 1 ? `Tu as ${pocket.length} autocollants à coller ! Touche-les.` : 'Tu as un autocollant à coller ! Touche-le.');

  async function stick(sticker, el) {
    // Aller à la page du jeu de cet autocollant, puis faire voler l'autocollant jusqu'à sa place.
    const target = domains.findIndex((d) => app.catalogue.games.find((g) => g.id === sticker.gameId)?.theme === d.id);
    if (target !== page) {
      page = target;
      await album({ quiet: true });
      const again = document.querySelector(`.al-sticker[data-id="${sticker.id}"]`);
      return again ? stick(sticker, again) : null;
    }
    const slot = document.querySelector(`[data-slot="${sticker.id}"]`);
    el.disabled = true;
    sfx('tap');
    if (slot && !reducedMotion()) {
      const a = el.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      el.style.transition = 'transform 0.6s cubic-bezier(.3,.7,.4,1.2)';
      el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) rotate(-8deg) scale(0.95)`;
      el.style.zIndex = 20;
      await new Promise((r) => setTimeout(r, 620));
    }
    await updateWorld(placeSticker(app.world, sticker.id));
    sfx('good');
    await album({ quiet: true });
    document.querySelector(`[data-slot="${sticker.id}"]`)?.classList.add('just');
  }

  return { destroy() {} };
}
