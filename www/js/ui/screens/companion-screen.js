/**
 * « Mon compagnon » : choisir le nom de la mascotte et l'habiller avec les accessoires débloqués par l'album.
 * Un accessoire pas encore gagné montre un cadenas et le nombre d'autocollants qu'il manque (jamais d'achat).
 */
import { speak, sfx } from '../../core/audio.js';
import { COMPANION_NAMES, OUTFITS, rename, unlockedOutfits, wear } from '../../core/world.js';
import { companionSvg } from '../companion.js';
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { app, readingMode, updateWorld } from '../state.js';
import { companion, react } from '../mascot.js';

const SLOTS = [['hat', 'Sur la tête'], ['eyes', 'Sur les yeux'], ['neck', 'Autour du cou'], ['back', 'Dans le dos']];

export function companionScreen() {
  const main = document.getElementById('main');

  function render() {
    const world = app.world;
    const unlocked = new Set(unlockedOutfits(world).map((o) => o.id));
    const buddy = companion({ size: 170, tappable: true, pose: 'salut' });
    const nameInput = h('input', { id: 'buddy-name', value: world.companion.name, maxlength: 16, autocomplete: 'off', 'aria-label': 'Nom du compagnon' });
    const setName = async (value) => {
      await updateWorld(rename(app.world, value));
      sfx('tap');
      speak(`Je m’appelle ${app.world.companion.name} !`);
      render();
    };
    main.replaceChildren(h('section', { class: 'buddy-screen' },
      h('div', { class: 'buddy-stage' }, buddy, h('p', { class: 'buddy-name' }, world.companion.name)),
      h('div', { class: 'buddy-panel' },
        h('h1', {}, 'Mon compagnon'),
        h('div', { class: 'buddy-names', role: 'group', 'aria-label': 'Choisir un nom' },
          COMPANION_NAMES.map((n) => h('button', { class: `chip${world.companion.name === n ? ' on' : ''}`, 'aria-pressed': world.companion.name === n ? 'true' : 'false', onclick: () => setName(n) }, n))),
        readingMode() ? null : h('form', { class: 'buddy-own', onsubmit: (e) => { e.preventDefault(); setName(nameInput.value); } },
          h('label', { for: 'buddy-name' }, 'Ou invente son nom :'), nameInput, h('button', { class: 'btn small' }, 'OK')),
        SLOTS.map(([slot, label]) => h('div', { class: 'buddy-slot' },
          h('h2', {}, label),
          h('div', { class: 'buddy-items' },
            h('button', { class: `buddy-item${!world.companion.outfit[slot] ? ' on' : ''}`, 'aria-label': `Rien ${label.toLowerCase()}`, onclick: () => put(slot, null) }, h('span', { class: 'buddy-none' }, '—')),
            OUTFITS.filter((o) => o.slot === slot).map((o) => {
              const open = unlocked.has(o.id);
              const missing = o.need - world.stickers.length;
              return h('button', {
                class: `buddy-item${world.companion.outfit[slot] === o.id ? ' on' : ''}${open ? '' : ' locked'}`,
                'aria-label': open ? o.label : `${o.label} : encore ${missing} autocollant${missing > 1 ? 's' : ''} à gagner`,
                onclick: () => (open ? put(slot, o.id) : locked(o, missing)),
                html: companionSvg({ outfit: { [slot]: o.id }, size: 54 }),
              }, open ? null : h('span', { class: 'buddy-lock', html: `${icon('lock', 14)} ${missing}` }));
            })))),
        h('p', { class: 'small' }, 'Les accessoires se gagnent avec les autocollants de l’album. Ils ne s’achètent jamais.'))));
    react(buddy, 'wave');

    async function put(slot, id) {
      await updateWorld(wear(app.world, slot, id));
      sfx(id ? 'good' : 'tap');
      render();
    }
  }

  function locked(outfit, missing) {
    sfx('soft');
    speak(`Pour avoir ${outfit.label}, gagne encore ${missing} autocollant${missing > 1 ? 's' : ''} en jouant.`);
  }

  render();
  speak(`Voici ${app.world.companion.name}, ton compagnon. Choisis ses accessoires !`);
  return { destroy() {} };
}
