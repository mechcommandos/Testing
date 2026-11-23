/**
 * Le compagnon : la mascotte de Layjou redessinée en SVG (casque blanc, visière bleu nuit, antenne rose, cœur),
 * pour pouvoir changer son expression et l'habiller. viewBox 200 × 260.
 * Expressions : joie, surprise, reflechit, oups, dort. Poses : repos, salut (bras levés).
 * Accessoires par emplacement : hat (casquette, chapeau-fleur, couronne), eyes (lunettes, etoiles),
 * neck (noeud, echarpe), back (cape). Voir core/world.js pour leur déblocage.
 */
const C = { teal: '#1fb8c4', tealDark: '#139aa6', pink: '#ef5f95', pinkDark: '#d9457d', white: '#fbfdff', shade: '#dfe8f1', visor: '#0f3a8a', iris: '#2fa8f0' };

function eye(x, y, kind) {
  if (kind === 'dort') return `<path d="M${x - 13} ${y}q13 10 26 0" stroke="#8fd3ff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const r = kind === 'surprise' ? 18 : 17;
  const look = kind === 'reflechit' ? [-4, -5] : [0, 0];
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + look[0]}" cy="${y + look[1]}" r="${r - 4}" fill="${C.iris}"/><circle cx="${x + look[0]}" cy="${y + look[1]}" r="${r - 9}" fill="#0b2a66"/>`
    + `<circle cx="${x + look[0] + 5}" cy="${y + look[1] - 6}" r="5" fill="#fff"/><circle cx="${x + look[0] - 4}" cy="${y + look[1] + 4}" r="1.8" fill="#fff"/>`;
}

function face(expression) {
  const e = expression;
  const brows = {
    joie: '<path d="M60 66q12-8 24 0M116 66q12-8 24 0"/>',
    surprise: '<path d="M60 64q11-9 22 0M118 64q11-9 22 0"/>',
    reflechit: '<path d="M62 72h18M118 66q10-7 20 2"/>',
    oups: '<path d="M62 68q10 4 20-2M118 66q10 6 20 2"/>',
    dort: '',
  }[e];
  const mouth = {
    joie: '<path d="M82 116q18 26 36 0z" fill="#e5484d"/><path d="M89 124q11 9 22 0z" fill="#ff8f8f"/>',
    surprise: '<ellipse cx="100" cy="118" rx="8" ry="10" fill="#e5484d"/>',
    reflechit: '<path d="M90 118q8-4 18 0" stroke="#ff8f8f" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="128" cy="116" r="4" fill="#8fd3ff" opacity=".7"/>',
    oups: '<path d="M88 120q6-6 12 0t12 0" stroke="#ff8f8f" stroke-width="5" fill="none" stroke-linecap="round"/>',
    dort: '<path d="M92 118q8 5 16 0" stroke="#ff8f8f" stroke-width="5" fill="none" stroke-linecap="round"/>',
  }[e];
  return `<g stroke="#8fd3ff" stroke-width="5" fill="none" stroke-linecap="round">${brows}</g>${eye(72, 92, e)}${eye(128, 92, e)}${mouth}`;
}

const HATS = {
  casquette: '<path d="M52 44q48-40 96 0v8H52z" fill="#e5484d"/><path d="M140 48q34 2 40 14q-20 4-44-4z" fill="#c4473a"/><circle cx="100" cy="16" r="5" fill="#c4473a"/>',
  'chapeau-fleur': '<ellipse cx="100" cy="48" rx="80" ry="14" fill="#f2c66d"/><path d="M58 46q4-38 42-38t42 38z" fill="#f5d48a"/><rect x="58" y="34" width="84" height="9" fill="#ef5f95"/><g transform="translate(138 32)"><circle r="7" fill="#fff"/><circle cx="-8" r="5" fill="#ffd6e5"/><circle cx="8" r="5" fill="#ffd6e5"/><circle cy="-8" r="5" fill="#ffd6e5"/><circle cy="8" r="5" fill="#ffd6e5"/><circle r="4" fill="#f5b82e"/></g>',
  couronne: '<path d="M60 52l-6-36 24 18 22-26 22 26 24-18-6 36z" fill="#f5c046" stroke="#d99a1e" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="14" r="5" fill="#ef5f95"/><circle cx="80" cy="40" r="4" fill="#3b82f6"/><circle cx="120" cy="40" r="4" fill="#3aa65b"/>',
};
const EYEWEAR = {
  lunettes: '<g fill="rgba(255,255,255,.18)" stroke="#23324d" stroke-width="5"><circle cx="72" cy="92" r="19"/><circle cx="128" cy="92" r="19"/></g><path d="M91 90q9-6 18 0" stroke="#23324d" stroke-width="5" fill="none"/>',
  etoiles: `<g fill="rgba(239,95,149,.35)" stroke="${C.pink}" stroke-width="4" stroke-linejoin="round">${[72, 128].map((x) => `<path d="M${x} 70l7 14 15 2-11 10 3 15-14-7-14 7 3-15-11-10 15-2z"/>`).join('')}</g>`,
};
const NECK = {
  noeud: `<path d="M100 150l-20-12v24zM100 150l20-12v24z" fill="${C.pink}"/><circle cx="100" cy="150" r="6" fill="${C.pinkDark}"/>`,
  echarpe: '<path d="M60 146q40 14 80 0v14q-40 14-80 0z" fill="#3b82f6"/><g fill="#fff"><rect x="72" y="150" width="8" height="12"/><rect x="96" y="152" width="8" height="12"/><rect x="120" y="150" width="8" height="12"/></g><path d="M118 156l10 40h-16z" fill="#3b82f6"/>',
};
const BACK = {
  cape: '<path d="M60 150q-18 70-6 100h92q12-30-6-100z" fill="#e5484d"/><path d="M60 150q40 16 80 0" stroke="#c4473a" stroke-width="6" fill="none"/>',
};

/**
 * SVG du compagnon. outfit : { hat, eyes, neck, back }.
 * Dessiné d'après l'image d'origine (mascot.png) : grand casque blanc, anneau turquoise autour d'une visière bleu nuit
 * brillante, oreillettes turquoise à cœur rose, antenne à boule rose ; corps blanc au col et à la ceinture turquoise,
 * cœur rose, épaules et genoux roses, moufles et bottes turquoise à semelle blanche. Contours bleu-gris doux.
 */
export function companionSvg({ expression = 'joie', pose = 'repos', outfit = {}, size = 140, label = '' } = {}) {
  const line = '#cddbea';
  const limb = (d) => `<path d="${d}" stroke="${line}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${C.white}" stroke-width="17" fill="none" stroke-linecap="round"/>`;
  const mitt = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="${C.teal}"/><circle cx="${x - 4}" cy="${y - 4}" r="4" fill="#fff" opacity=".35"/>`;
  const cuff = (x, y) => `<circle cx="${x}" cy="${y}" r="10.5" fill="${C.tealDark}"/>`;
  const arms = pose === 'salut'
    ? `${limb('M62 166q-24-12-32-42')}${cuff(31, 128)}${mitt(28, 114)}${limb('M138 166q24-12 32-42')}${cuff(169, 128)}${mitt(172, 114)}`
    : `${limb('M62 166q-20 14-24 36')}${cuff(39, 200)}${mitt(37, 212)}${limb('M138 166q22-8 28-34')}${cuff(165, 136)}${mitt(168, 122)}`;
  const leg = (x) => `<rect x="${x}" y="206" width="22" height="32" rx="10" fill="${C.white}" stroke="${line}" stroke-width="3"/><circle cx="${x + 11}" cy="222" r="7.5" fill="${C.pink}"/>`;
  const boot = (x, flip) => `<path d="M${x} 252q0-20 ${flip * 26}-20q${flip * 12} 0 ${flip * 14} 12l0 8z" fill="${C.teal}"/><rect x="${flip > 0 ? x : x - 40}" y="249" width="40" height="7" rx="3.5" fill="${C.white}" stroke="${line}" stroke-width="2"/>`;
  const svg = `<svg viewBox="0 0 200 260" width="${size}" height="${Math.round(size * 1.3)}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} focusable="false">`
    + '<defs><radialGradient id="cp-helmet" cx=".4" cy=".35" r=".75"><stop offset=".6" stop-color="#ffffff"/><stop offset="1" stop-color="#dce8f4"/></radialGradient>'
    + '<linearGradient id="cp-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d4fb0"/><stop offset="1" stop-color="#0b2566"/></linearGradient>'
    + '<radialGradient id="cp-body" cx=".4" cy=".3" r=".8"><stop offset=".55" stop-color="#ffffff"/><stop offset="1" stop-color="#dce8f4"/></radialGradient></defs>'
    + (BACK[outfit.back] ?? '')
    // jambes, genoux roses, bottes turquoise à semelle blanche
    + leg(72) + leg(106)
    + boot(62, 1) + boot(138, -1)
    // bras (blancs, poignets et moufles turquoise), puis corps
    + arms
    + `<ellipse cx="100" cy="186" rx="46" ry="42" fill="url(#cp-body)" stroke="${line}" stroke-width="3"/>`
    + `<path d="M56 198q44 26 88 0q-4 28-44 30q-40-2-44-30z" fill="${C.teal}"/>`
    + `<ellipse cx="100" cy="150" rx="30" ry="9" fill="${C.teal}"/>`
    + `<path d="M100 186c-12-12-22 2-12 10l12 10 12-10c10-8 0-22-12-10z" fill="${C.pink}"/>`
    + `<circle cx="60" cy="162" r="12" fill="${C.pink}"/><circle cx="140" cy="162" r="12" fill="${C.pink}"/><circle cx="57" cy="158" r="3.5" fill="#fff" opacity=".5"/><circle cx="137" cy="158" r="3.5" fill="#fff" opacity=".5"/>`
    + (NECK[outfit.neck] ?? '')
    // antenne
    + `<rect x="96" y="16" width="8" height="24" rx="4" fill="${C.teal}"/><circle cx="100" cy="14" r="12" fill="${C.pink}"/><circle cx="96" cy="10" r="4" fill="#fff" opacity=".7"/>`
    // oreillettes
    + `<ellipse cx="30" cy="100" rx="15" ry="21" fill="${C.teal}" stroke="${C.tealDark}" stroke-width="2"/><ellipse cx="26" cy="100" rx="8" ry="13" fill="${C.pink}"/>`
    + `<ellipse cx="170" cy="100" rx="15" ry="21" fill="${C.teal}" stroke="${C.tealDark}" stroke-width="2"/><ellipse cx="174" cy="100" rx="8" ry="13" fill="${C.pink}"/>`
    // casque blanc, anneau turquoise, visière brillante
    + `<ellipse cx="100" cy="96" rx="72" ry="64" fill="url(#cp-helmet)" stroke="${line}" stroke-width="3"/>`
    + '<rect x="38" y="50" width="124" height="96" rx="46" fill="url(#cp-visor)" stroke="#4d8fe0" stroke-width="3"/>'
    + '<path d="M58 78q6-14 22-16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".35"/>'
    + face(expression)
    + (EYEWEAR[outfit.eyes] ?? '')
    + (HATS[outfit.hat] ?? '')
    + '</svg>';
  return svg;
}

export const EXPRESSIONS = ['joie', 'surprise', 'reflechit', 'oups', 'dort'];
