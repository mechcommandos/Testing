/**
 * En-tête commun : logo, navigation, profil actif toujours visible.
 * Mode « je ne sais pas encore lire » : seulement des images (le CSS cache les mots) et chaque bouton dit son nom.
 */
import { speak } from '../../core/audio.js';
import { avatarSvg } from '../art.js';
import { icon } from '../icons.js';
import { clear, h } from '../dom.js';
import { app, readingMode } from '../state.js';

export function renderHeader() {
  const header = document.getElementById('header');
  clear(header);
  const hash = location.hash || '#/';
  if (hash.startsWith('#/jouer/')) {
    header.hidden = true;
    return;
  }
  header.hidden = false;
  const pre = readingMode();
  const link = (href, label, name, active) => h('a', {
    href, class: `nav-link${active ? ' active' : ''}`, 'aria-current': active ? 'page' : null, 'aria-label': label,
    onclick: () => { if (pre) speak(label); },
  }, h('span', { 'aria-hidden': 'true', html: icon(name, pre ? 28 : 20) }), h('span', { class: 'nav-text' }, label));
  const profile = app.activeProfile;
  header.append(
    h('a', { href: '#/', class: 'brand', 'aria-label': 'Layjou, l’île' }, h('img', { src: 'assets/img/wordmark.png', alt: '', width: 140, height: 40 })),
    h('nav', { class: 'nav', 'aria-label': 'Navigation principale' },
      link('#/', 'L’île', 'map', hash === '#/' || hash === '#'),
      link('#/album', 'Mon album', 'book', hash === '#/album' || hash === '#/compagnon'),
      link('#/aventure', 'Mon aventure', 'star', hash === '#/aventure'),
      link('#/parent', 'Espace parent', 'lock', hash.startsWith('#/parent'))),
    profile
      ? h('a', { href: '#/qui-joue', class: 'profile-chip', 'aria-label': `Profil actif : ${profile.nickname}. Changer de profil` },
        h('span', { html: avatarSvg(profile.avatar, 36) }), h('span', { class: 'nav-text' }, profile.nickname), profile.guest ? h('span', { class: 'tag nav-text' }, 'invité') : null)
      : h('a', { href: '#/qui-joue', class: 'profile-chip' }, 'Qui joue ?'));
}
