/**
 * « Qui joue ? » : choisir un profil sur cet appareil. Toucher un avatar n'est pas une authentification ;
 * les profils d'un même appareil ne sont pas confidentiels entre eux (expliqué dans l'espace parent).
 */
import { avatarSvg } from '../art.js';
import { icon } from '../icons.js';
import { h } from '../dom.js';
import { app, setActiveProfile } from '../state.js';

export async function whoPlays(next = '#/jeux') {
  const main = document.getElementById('main');
  const profiles = await app.store.listProfiles();

  const choose = async (profile) => {
    await setActiveProfile(profile);
    location.hash = next;
  };

  main.replaceChildren(h('section', { class: 'who-plays' },
    h('h1', {}, 'Qui joue ?'),
    h('p', { class: 'lead' }, profiles.length ? 'Choisis ton aventure' : 'Bienvenue ! Un adulte peut créer un profil pour chaque enfant.'),
    h('div', { class: 'profile-grid' },
      profiles.map((p) => h('button', { class: `profile-card${app.activeProfile?.id === p.id ? ' active' : ''}`, onclick: () => choose(p) },
        h('span', { class: 'avatar', html: avatarSvg(p.avatar, 120) }),
        h('span', { class: 'name' }, p.nickname))),
      h('button', { class: 'profile-card guest', onclick: async () => choose(await app.store.guestProfile()) },
        h('span', { class: 'avatar', html: avatarSvg('robot', 120) }),
        h('span', { class: 'name' }, 'Invité'),
        h('span', { class: 'small' }, 'Pour essayer, sans profil'))),
    h('div', { class: 'row center' },
      h('a', { class: 'btn ghost', href: '#/parent/profils', html: `${icon('plus', 20)} Ajouter un profil` }),
      h('a', { class: 'btn ghost', href: '#/parent', html: `${icon('lock', 20)} Espace parent` }))));

  return { destroy() {} };
}
