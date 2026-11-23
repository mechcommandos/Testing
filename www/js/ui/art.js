/**
 * Illustrations originales en SVG (aucune ressource tierce) : avatars des profils et décor.
 * Formes simples, couleurs douces, lisibles en petit.
 */
import { PICTOS } from './pictos.js';
const AVATAR_SVG = {
  robot: `<circle cx="50" cy="50" r="48" fill="#e8f6f9"/><g transform="translate(14 12) scale(0.72)">${PICTOS.robot}</g>`,
  renard: `<circle cx="50" cy="50" r="48" fill="#fdecd9"/><path d="M24 30l10 24 16-6 16 6 10-24-14 10H38z" fill="#f08a3c"/><path d="M28 50q22-18 44 0q-4 22-22 26q-18-4-22-26z" fill="#f08a3c"/><path d="M36 62q14 14 28 0q-6 12-14 13q-8-1-14-13z" fill="#fff"/><circle cx="41" cy="54" r="3.5" fill="#2b2b2b"/><circle cx="59" cy="54" r="3.5" fill="#2b2b2b"/><circle cx="50" cy="63" r="3" fill="#2b2b2b"/><path d="M27 31l9 17M73 31l-9 17" stroke="#7a3e12" stroke-width="2" fill="none"/>`,
  hibou: `<circle cx="50" cy="50" r="48" fill="#e1f3ea"/><path d="M28 34q22-16 44 0v30q-22 18-44 0z" fill="#3aa67a"/><circle cx="40" cy="46" r="10" fill="#fff"/><circle cx="60" cy="46" r="10" fill="#fff"/><circle cx="40" cy="46" r="5" fill="#2b2b2b"/><circle cx="60" cy="46" r="5" fill="#2b2b2b"/><path d="M47 54l3 6 3-6z" fill="#f2b705"/><path d="M38 66q12 8 24 0" stroke="#bfe7d4" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 34l4-10 8 8M72 34l-4-10-8 8" fill="#3aa67a"/>`,
  lapin: `<circle cx="50" cy="50" r="48" fill="#e9ecf8"/><ellipse cx="40" cy="26" rx="6" ry="16" fill="#9fb0d9"/><ellipse cx="60" cy="26" rx="6" ry="16" fill="#9fb0d9"/><ellipse cx="40" cy="27" rx="3" ry="11" fill="#f5c4d3"/><ellipse cx="60" cy="27" rx="3" ry="11" fill="#f5c4d3"/><circle cx="50" cy="56" r="22" fill="#9fb0d9"/><circle cx="42" cy="52" r="3.5" fill="#2b2b2b"/><circle cx="58" cy="52" r="3.5" fill="#2b2b2b"/><ellipse cx="50" cy="62" rx="9" ry="7" fill="#fff"/><circle cx="50" cy="59" r="2.5" fill="#e5708f"/>`,
  tortue: `<circle cx="50" cy="50" r="48" fill="#eef6df"/><ellipse cx="50" cy="58" rx="28" ry="18" fill="#7bb83f"/><path d="M30 58h40M40 44l4 28M60 44l-4 28" stroke="#5a8f28" stroke-width="2.5"/><circle cx="76" cy="46" r="10" fill="#a9d86e"/><circle cx="79" cy="44" r="2.5" fill="#2b2b2b"/><path d="M76 50q3 2 6 0" stroke="#2b2b2b" stroke-width="1.5" fill="none"/><ellipse cx="30" cy="74" rx="6" ry="4" fill="#a9d86e"/><ellipse cx="66" cy="74" rx="6" ry="4" fill="#a9d86e"/>`,
  chat: `<circle cx="50" cy="50" r="48" fill="#fbe9f0"/><path d="M28 34l6-14 12 12h8l12-12 6 14v24q-22 20-44 0z" fill="#8a8fa8"/><circle cx="41" cy="48" r="4" fill="#cfe86f"/><circle cx="59" cy="48" r="4" fill="#cfe86f"/><circle cx="41" cy="48" r="1.6" fill="#2b2b2b"/><circle cx="59" cy="48" r="1.6" fill="#2b2b2b"/><path d="M47 56l3 3 3-3z" fill="#e5708f"/><path d="M32 58l10 1M32 62l10-1M68 58l-10 1M68 62l-10-1" stroke="#fff" stroke-width="1.5"/>`,
};

export const AVATAR_NAMES = { robot: 'Robot', renard: 'Renard', hibou: 'Hibou', lapin: 'Lapin', tortue: 'Tortue', chat: 'Chat' };

export function avatarSvg(name, size = 96) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${AVATAR_SVG[name] ?? AVATAR_SVG.robot}</svg>`;
}

/** Petites plantes décoratives en bas des écrans. */
export const plantsSvg = `<svg viewBox="0 0 600 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="#7cc48c"><path d="M30 90q-6-40 10-62q4 30-2 62z"/><path d="M48 90q4-34 24-48q-6 30-16 48z"/><path d="M548 90q-6-40 10-62q4 30-2 62z"/><path d="M566 90q4-34 24-48q-6 30-16 48z"/></g><g fill="#a5d9ae"><path d="M12 90q8-28 26-36q-10 20-16 36z"/><path d="M580 90q-8-28-26-36q10 20 16 36z"/></g><circle cx="74" cy="40" r="7" fill="#ff9aa8"/><circle cx="74" cy="40" r="3" fill="#ffd36e"/><circle cx="532" cy="34" r="7" fill="#ffb36b"/><circle cx="532" cy="34" r="3" fill="#ffd36e"/></svg>`;


/** Vignettes des jeux : voir thumbs.js. */
export { gameThumb } from './thumbs.js';
