/**
 * Illustrations des animaux et de leurs lieux de vie (SVG dessinés pour Layjou, viewBox 100 × 100).
 * Style : aplats, formes rondes, pas de contour, couleurs proches du logo.
 */
const D = '#23324d';
const eye = (x, y, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${D}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#fff"/>`;
const eyes = (y, dx = 10, r = 4.5, cx = 50) => eye(cx - dx, y, r) + eye(cx + dx, y, r);
const smile = (y, w = 6, color = D) => `<path d="M${50 - w} ${y}q${w} ${w * 0.8} ${w * 2} 0" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

export const ANIMALS = {
  chat: `<path d="M22 30l10-20 14 14h8l14-14 10 20v30q0 28-28 28T22 60z" fill="#8a8fa8"/><path d="M27 28l5-11 7 8zM73 28l-5-11-7 8z" fill="#f4b6c9"/>${eyes(52, 12, 5)}<path d="M46 62h8l-4 5z" fill="#f06b9b"/><path d="M50 67v4" stroke="${D}" stroke-width="2.5"/><path d="M18 60l16 2M18 68l16-2M82 60l-16 2M82 68l-16-2" stroke="#eef1f5" stroke-width="2.5" stroke-linecap="round"/>`,
  chien: `<circle cx="50" cy="52" r="30" fill="#c98a4b"/><ellipse cx="20" cy="48" rx="10" ry="22" fill="#7a4a24" transform="rotate(14 20 48)"/><ellipse cx="80" cy="48" rx="10" ry="22" fill="#7a4a24" transform="rotate(-14 80 48)"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#f3dcc0"/>${eyes(48, 11, 5)}<ellipse cx="50" cy="60" rx="6" ry="4.5" fill="${D}"/>${smile(68, 5)}`,
  vache: `<ellipse cx="50" cy="50" rx="28" ry="32" fill="#eef1f5"/><path d="M26 32q10-6 14 6q-6 14-16 8z" fill="${D}"/><path d="M68 44q10-4 8 12q-8 2-10-6z" fill="${D}"/><path d="M28 24q-8-8-4-14M72 24q8-8 4-14" stroke="#c9b8a0" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="18" cy="40" rx="10" ry="6" fill="#d9dde5"/><ellipse cx="82" cy="40" rx="10" ry="6" fill="#d9dde5"/>${eyes(44, 11, 4.5)}<ellipse cx="50" cy="70" rx="20" ry="13" fill="#f4b6c9"/><ellipse cx="43" cy="70" rx="3" ry="4" fill="#c4577c"/><ellipse cx="57" cy="70" rx="3" ry="4" fill="#c4577c"/>`,
  cochon: `<circle cx="50" cy="54" r="32" fill="#f7a8c2"/><path d="M24 30l4-16 16 12zM76 30l-4-16-16 12z" fill="#ef8fb0"/>${eyes(46, 12, 4.5)}<ellipse cx="50" cy="64" rx="14" ry="10" fill="#ef8fb0"/><ellipse cx="45" cy="64" rx="3" ry="4" fill="#c4577c"/><ellipse cx="55" cy="64" rx="3" ry="4" fill="#c4577c"/>`,
  mouton: `<g fill="#eef1f5"><circle cx="30" cy="34" r="14"/><circle cx="50" cy="26" r="15"/><circle cx="70" cy="34" r="14"/><circle cx="24" cy="54" r="13"/><circle cx="76" cy="54" r="13"/><circle cx="32" cy="72" r="13"/><circle cx="68" cy="72" r="13"/><circle cx="50" cy="78" r="13"/></g><ellipse cx="50" cy="56" rx="18" ry="22" fill="#5d6779"/><ellipse cx="28" cy="50" rx="9" ry="5" fill="#5d6779"/><ellipse cx="72" cy="50" rx="9" ry="5" fill="#5d6779"/>${eye(43, 52, 4)}${eye(57, 52, 4)}<path d="M46 66h8l-4 4z" fill="#f4b6c9"/>`,
  poule: `<path d="M44 14q4-8 8 0q4-8 8 0q2 8-8 10q-10-2-8-10z" fill="#e5484d"/><ellipse cx="54" cy="58" rx="30" ry="28" fill="#eef1f5"/><circle cx="50" cy="36" r="16" fill="#eef1f5"/><path d="M84 50q12-14 10 6q-4 10-12 8z" fill="#d9dde5"/>${eye(46, 34, 4)}<path d="M32 38l-10 4 10 4z" fill="#f5b82e"/><path d="M36 46q-4 8 2 10q4-4-2-10z" fill="#e5484d"/><path d="M44 84v10M60 84v10M40 94h10M56 94h10" stroke="#f5b82e" stroke-width="3.5" stroke-linecap="round"/>`,
  canard: `<ellipse cx="54" cy="64" rx="32" ry="22" fill="#ffd43b"/><path d="M80 52q14-6 12 8q-4 6-12 4z" fill="#f5c518"/><circle cx="38" cy="38" r="18" fill="#ffd43b"/>${eye(34, 34, 4)}<path d="M20 40q-14 2-14 8q8 4 18-2z" fill="#f08a3c"/><path d="M44 62q12 10 26 0" stroke="#f5c518" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  cheval: `<path d="M34 20q16-10 32 0l6 44q-2 26-22 28q-20-2-22-28z" fill="#a8683a"/><path d="M38 12l4 12M62 12l-4 12" stroke="#a8683a" stroke-width="8" stroke-linecap="round"/><path d="M40 16q10 6 20 0l-2 22q-8-6-16 0z" fill="#4a2c14"/>${eyes(42, 13, 4.5)}<ellipse cx="50" cy="76" rx="16" ry="13" fill="#d8a77c"/><ellipse cx="44" cy="76" rx="2.6" ry="3.6" fill="#4a2c14"/><ellipse cx="56" cy="76" rx="2.6" ry="3.6" fill="#4a2c14"/>`,
  lion: `<g fill="#d9782d">${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => `<circle cx="${50 + 34 * Math.cos((a * Math.PI) / 180)}" cy="${52 + 34 * Math.sin((a * Math.PI) / 180)}" r="13"/>`).join('')}</g><circle cx="50" cy="52" r="30" fill="#f5b82e"/><circle cx="28" cy="30" r="7" fill="#f5b82e"/><circle cx="72" cy="30" r="7" fill="#f5b82e"/>${eyes(48, 11, 4.5)}<ellipse cx="50" cy="64" rx="12" ry="9" fill="#ffe3a3"/><path d="M45 59h10l-5 5z" fill="#7a3e12"/>${smile(68, 5, '#7a3e12')}`,
  elephant: `<ellipse cx="20" cy="46" rx="18" ry="24" fill="#a3aec2"/><ellipse cx="80" cy="46" rx="18" ry="24" fill="#a3aec2"/><circle cx="50" cy="44" r="26" fill="#bcc5d4"/>${eyes(40, 11, 4.5)}<path d="M42 56q0 26 10 34q10 4 12-4q-8-2-10-10q-2-10-2-20z" fill="#bcc5d4"/><path d="M38 60q-8 4-6 10M62 60q8 4 6 10" stroke="#eef1f5" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  zebre: `<path d="M30 30q20-20 40 0l-4 50q-16 14-32 0z" fill="#eef1f5"/><path d="M34 8l4 18M66 8l-4 18" stroke="#eef1f5" stroke-width="8" stroke-linecap="round"/><path d="M42 10q8-4 16 0v16h-16z" fill="${D}"/><g stroke="${D}" stroke-width="5" stroke-linecap="round"><path d="M32 36q6 2 10 0M58 36q4 2 10 0M33 48q5 2 8 0M59 48q3 2 8 0M44 24q6 3 12 0"/></g>${eyes(44, 11, 4.5)}<ellipse cx="50" cy="78" rx="15" ry="11" fill="#5d6779"/><ellipse cx="45" cy="78" rx="2.6" ry="3.6" fill="${D}"/><ellipse cx="55" cy="78" rx="2.6" ry="3.6" fill="${D}"/>`,
  girafe: `<path d="M38 10v14M62 10v14" stroke="#c98a4b" stroke-width="5" stroke-linecap="round"/><circle cx="38" cy="9" r="5" fill="#7a4a24"/><circle cx="62" cy="9" r="5" fill="#7a4a24"/><ellipse cx="22" cy="34" rx="10" ry="5" fill="#f5c046"/><ellipse cx="78" cy="34" rx="10" ry="5" fill="#f5c046"/><path d="M32 26q18-10 36 0l-2 48q-16 18-32 0z" fill="#f5c046"/><g fill="#c98a4b"><circle cx="38" cy="36" r="5"/><circle cx="62" cy="34" r="4"/><circle cx="58" cy="52" r="4"/><circle cx="40" cy="56" r="3.5"/></g>${eyes(42, 10, 4.5)}<ellipse cx="50" cy="76" rx="14" ry="10" fill="#ffe3a3"/><ellipse cx="45" cy="76" rx="2.4" ry="3.2" fill="#7a4a24"/><ellipse cx="55" cy="76" rx="2.4" ry="3.2" fill="#7a4a24"/>`,
  hibou: `<path d="M24 22l10 10M76 22l-10 10" stroke="#7a4a24" stroke-width="8" stroke-linecap="round"/><ellipse cx="50" cy="56" rx="30" ry="34" fill="#a8683a"/><ellipse cx="50" cy="68" rx="18" ry="20" fill="#e8c9a0"/><circle cx="38" cy="44" r="12" fill="#fff"/><circle cx="62" cy="44" r="12" fill="#fff"/>${eye(38, 44, 6)}${eye(62, 44, 6)}<path d="M45 54h10l-5 9z" fill="#f5b82e"/><path d="M40 72q4 3 8 0M52 72q4 3 8 0M46 80q4 3 8 0" stroke="#c9a57a" stroke-width="2.5" fill="none"/>`,
  loup: `<path d="M20 28l10-22 16 18h8l16-18 10 22-6 30q-24 34-48 0z" fill="#6f7b91"/><path d="M26 24l5-11 7 9zM74 24l-5-11-7 9z" fill="#4a5468"/><path d="M34 56q16-6 32 0l-16 28z" fill="#d9dde5"/>${eyes(46, 13, 4.5)}<ellipse cx="50" cy="70" rx="6" ry="4.5" fill="${D}"/>`,
  renard: `<path d="M18 22l14 22 18-6 18 6 14-22-14 6H32z" fill="#f08a3c"/><path d="M22 44q28-24 56 0q-6 30-28 40q-22-10-28-40z" fill="#f08a3c"/><path d="M32 60q18 16 36 0q-8 22-18 24q-10-2-18-24z" fill="#fff"/>${eyes(52, 12, 4.5)}<circle cx="50" cy="70" r="4" fill="${D}"/>`,
  herisson: `<path d="M12 74q2-46 46-50l-8 8 14-4-6 10 14-2-8 10 14 2-10 8 12 6-14 4 8 10z" fill="#7a4a24"/><path d="M48 74q14-30 34-20q10 6 8 18q-8 8-26 6z" fill="#e8c9a0"/>${eye(72, 58, 4)}<circle cx="90" cy="68" r="4" fill="${D}"/><path d="M30 74v10M52 76v10" stroke="#7a4a24" stroke-width="5" stroke-linecap="round"/>`,
  lapin: `<ellipse cx="38" cy="24" rx="9" ry="22" fill="#c9cfdc"/><ellipse cx="62" cy="24" rx="9" ry="22" fill="#c9cfdc"/><ellipse cx="38" cy="26" rx="4.5" ry="15" fill="#f4b6c9"/><ellipse cx="62" cy="26" rx="4.5" ry="15" fill="#f4b6c9"/><circle cx="50" cy="62" r="28" fill="#c9cfdc"/>${eyes(56, 11, 4.5)}<ellipse cx="50" cy="70" rx="10" ry="7" fill="#eef1f5"/><path d="M46 66h8l-4 4z" fill="#f06b9b"/>`,
  'ours-polaire': `<circle cx="26" cy="28" r="11" fill="#dfe5ee"/><circle cx="74" cy="28" r="11" fill="#dfe5ee"/><circle cx="50" cy="54" r="32" fill="#eef2f7"/><circle cx="26" cy="28" r="5" fill="#c9d3e1"/><circle cx="74" cy="28" r="5" fill="#c9d3e1"/>${eyes(48, 12, 4.5)}<ellipse cx="50" cy="66" rx="14" ry="10" fill="#dfe5ee"/><ellipse cx="50" cy="62" rx="6" ry="4.5" fill="${D}"/>`,
  panda: `<circle cx="24" cy="26" r="12" fill="${D}"/><circle cx="76" cy="26" r="12" fill="${D}"/><circle cx="50" cy="54" r="32" fill="#eef1f5"/><ellipse cx="37" cy="50" rx="9" ry="11" fill="${D}" transform="rotate(-20 37 50)"/><ellipse cx="63" cy="50" rx="9" ry="11" fill="${D}" transform="rotate(20 63 50)"/><circle cx="38" cy="49" r="3.5" fill="#fff"/><circle cx="62" cy="49" r="3.5" fill="#fff"/><ellipse cx="50" cy="64" rx="6" ry="4" fill="${D}"/>${smile(70, 5)}`,
  lama: `<path d="M34 6q4 0 6 20M66 6q-4 0-6 20" stroke="#f3e1c2" stroke-width="9" stroke-linecap="round"/><path d="M30 26q20-14 40 0v50q-20 16-40 0z" fill="#f3e1c2"/><path d="M28 30q4-10 12-6M72 30q-4-10-12-6" fill="#e6cfa6"/>${eyes(44, 10, 4.5)}<ellipse cx="50" cy="68" rx="14" ry="11" fill="#e6cfa6"/><path d="M46 64l4 4 4-4M50 68v4" stroke="#7a4a24" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M30 88h40" stroke="#f06b9b" stroke-width="6" stroke-linecap="round"/>`,
  dauphin: `<path d="M10 62q20-38 62-34q16 2 22 12q-8 2-14 0q-6 22-34 26q-18 2-30 14q2-12-6-18z" fill="#5b8fd4"/><path d="M48 30q4-16 16-18q-4 10 0 18z" fill="#4677bd"/><path d="M30 64q20 4 40-8" stroke="#c9dcf3" stroke-width="5" fill="none" stroke-linecap="round"/>${eye(72, 38, 4)}<path d="M50 70q-2 10 8 14q-2-8 2-14z" fill="#4677bd"/>`,
  baleine: `<path d="M8 58q0-28 44-28q38 0 38 26q0 22-38 22q-26 0-34-8q-6 10-14 10q4-12-2-18q6 2 6-4z" fill="#1a56b8"/><path d="M30 66q22 10 52-4q-6 14-30 14q-14 0-22-10z" fill="#9ec5f0"/>${eye(70, 48, 4.5)}<path d="M50 28q-6-10-14-10M50 28q6-12 14-12M50 28v-14" stroke="#20b7c9" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  pieuvre: `<path d="M22 50q0-36 28-36t28 36z" fill="#a66ad9"/><g stroke="#a66ad9" stroke-width="9" fill="none" stroke-linecap="round"><path d="M26 50q-4 18 6 28"/><path d="M40 52q-4 22 4 34"/><path d="M60 52q4 22-4 34"/><path d="M74 50q4 18-6 28"/></g>${eyes(38, 10, 5)}${smile(44, 5)}`,
  crabe: `<ellipse cx="50" cy="60" rx="28" ry="18" fill="#e5484d"/><path d="M14 30q-6 14 6 20q6-4 8-12zM86 30q6 14-6 20q-6-4-8-12z" fill="#e5484d"/><path d="M14 30l10 6M86 30l-10 6" stroke="#fff" stroke-width="3"/><path d="M40 44v-12M60 44v-12" stroke="#e5484d" stroke-width="4"/>${eye(40, 30, 5)}${eye(60, 30, 5)}<g stroke="#e5484d" stroke-width="5" stroke-linecap="round"><path d="M26 68l-12 10M30 74l-8 14M74 68l12 10M70 74l8 14"/></g>${smile(64, 6, '#fff')}`,
  poisson: `<path d="M14 50q24-30 56-14l18-14q-2 28 0 56l-18-14q-32 16-56-14z" fill="#f08a3c"/><path d="M40 30q10 20 0 40" stroke="#f5b82e" stroke-width="5" fill="none"/>${eye(28, 46, 4.5)}<path d="M16 54q4 2 8 0" stroke="${D}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  tortue: `<path d="M18 66q0-38 34-38t34 38z" fill="#3aa65b"/><path d="M30 64l8-22h28l8 22M44 42l-4 22M60 42l4 22" stroke="#2c8048" stroke-width="3" fill="none"/><circle cx="12" cy="56" r="10" fill="#8cc63f"/>${eye(9, 53, 3.5)}<g fill="#8cc63f"><ellipse cx="28" cy="72" rx="8" ry="6"/><ellipse cx="74" cy="72" rx="8" ry="6"/><path d="M86 62l10 4-10 4z"/></g>`,
  manchot: `<ellipse cx="50" cy="54" rx="26" ry="36" fill="${D}"/><ellipse cx="50" cy="62" rx="18" ry="26" fill="#eef1f5"/><path d="M26 44q-12 14-6 30q6-6 8-16z M74 44q12 14 6 30q-6-6-8-16z" fill="${D}"/>${eye(42, 34, 4)}${eye(58, 34, 4)}<path d="M44 40h12l-6 8z" fill="#f08a3c"/><path d="M36 90h12M52 90h12" stroke="#f08a3c" stroke-width="6" stroke-linecap="round"/>`,
  phoque: `<path d="M8 80q14-6 30-6q6-40 34-44q20 0 18 20q-2 18-18 28q-10 8-34 10q-20 2-30-8z" fill="#9aa6ba"/><path d="M40 74q-14 2-24 14q16 0 28-6z" fill="#7d8aa1"/><ellipse cx="78" cy="48" rx="8" ry="6" fill="#c9cfdc"/>${eye(68, 40, 4)}<circle cx="84" cy="46" r="3" fill="${D}"/><path d="M76 50l-12 2M76 52l-10 6M86 52l8 4" stroke="#eef1f5" stroke-width="2" stroke-linecap="round"/>`,
};

// ---------- Animaux en entier ----------
// Les têtes ci-dessus restent le visage reconnaissable de chaque animal ; on leur ajoute ici un corps complet
// (pattes, queue, motifs) dans le même style, à la même échelle (viewBox 100 × 100).
const HEADS = { ...ANIMALS };
const placeHead = (id, cx, cy, s) => `<g transform="translate(${(cx - 50 * s).toFixed(2)} ${(cy - 50 * s).toFixed(2)}) scale(${s})">${HEADS[id]}</g>`;
const leg = (x, y1, y2, w, color, hoof) => `<rect x="${x - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" rx="${w / 2}" fill="${color}"/>${hoof ? `<rect x="${x - w / 2}" y="${y2 - 5}" width="${w}" height="5" rx="2" fill="${hoof}"/>` : ''}`;
const shade = (hex, f = 0.82) => `#${hex.slice(1).match(/../g).map((c) => Math.round(parseInt(c, 16) * f).toString(16).padStart(2, '0')).join('')}`;

/**
 * Quadrupède vu de profil, tête de face (style des livres pour enfants).
 * neck : 0 (tête posée sur le corps), 1 (cou moyen : cheval, zèbre, lama), 2 (long cou : girafe).
 */
function quad(id, o) {
  const neck = o.neck ?? 0;
  const body = o.body;
  const legTop = neck === 2 ? 56 : 62;
  const legBottom = neck === 2 ? 94 : 90;
  const cy = neck === 2 ? 50 : 58;
  const w = o.legW ?? 7;
  const far = shade(o.leg ?? body);
  let s = '';
  s += o.tail ?? '';
  s += leg(44, legTop, legBottom - 2, w, far, o.hoof && shade(o.hoof)) + leg(74, legTop, legBottom - 2, w, far, o.hoof && shade(o.hoof));
  s += `<ellipse cx="${o.cx ?? 60}" cy="${cy}" rx="${o.rx ?? 26}" ry="${o.ry ?? 15}" fill="${body}"/>`;
  if (o.belly) s += `<ellipse cx="${o.cx ?? 60}" cy="${cy + 6}" rx="${(o.rx ?? 26) - 8}" ry="${(o.ry ?? 15) - 8}" fill="${o.belly}"/>`;
  s += o.pattern ?? '';
  s += leg(38, legTop, legBottom, w, o.leg ?? body, o.hoof) + leg(68, legTop, legBottom, w, o.leg ?? body, o.hoof);
  if (neck === 1) s += `<path d="M40 ${cy - 8}L26 30h16l10 ${cy - 34}z" fill="${o.neckColor ?? body}"/>${o.mane ?? ''}`;
  if (neck === 2) s += `<path d="M44 ${cy - 6}L24 18h12l18 ${cy - 22}z" fill="${body}"/>${o.neckPattern ?? ''}`;
  const head = neck === 2 ? [27, 15, 0.34] : neck === 1 ? [29, 27, 0.48] : [o.headX ?? 28, o.headY ?? 40, o.headS ?? 0.46];
  return s + placeHead(id, ...head);
}

/** Animal assis, de face : corps arrondi, pattes avant, pieds, tête au-dessus. */
function sit(id, o) {
  let s = o.tail ?? '';
  s += `<ellipse cx="50" cy="74" rx="${o.rx ?? 21}" ry="19" fill="${o.body}"/>`;
  if (o.belly) s += `<ellipse cx="50" cy="78" rx="${(o.rx ?? 21) - 9}" ry="12" fill="${o.belly}"/>`;
  s += `<ellipse cx="38" cy="92" rx="9" ry="5" fill="${o.feet ?? o.body}"/><ellipse cx="62" cy="92" rx="9" ry="5" fill="${o.feet ?? o.body}"/>`;
  s += `<ellipse cx="40" cy="76" rx="5" ry="11" fill="${o.arms ?? shade(o.body, 0.9)}"/><ellipse cx="60" cy="76" rx="5" ry="11" fill="${o.arms ?? shade(o.body, 0.9)}"/>`;
  return s + placeHead(id, 50, o.headY ?? 36, o.headS ?? 0.6);
}

const tuftTail = (color, tip) => `<path d="M85 54q8 6 6 22" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="91" cy="78" rx="3.5" ry="6" fill="${tip}"/>`;

Object.assign(ANIMALS, {
  chat: sit('chat', { body: '#8a8fa8', belly: '#eef1f5', headY: 36, tail: '<path d="M68 86q22 0 18-26q-2-8-6-6" stroke="#8a8fa8" stroke-width="7" fill="none" stroke-linecap="round"/>' }),
  chien: quad('chien', { body: '#c98a4b', headS: 0.5, headY: 38, belly: '#f3dcc0', leg: '#c98a4b', tail: '<path d="M84 54q10-6 12-18" stroke="#c98a4b" stroke-width="7" fill="none" stroke-linecap="round"/>', pattern: '<ellipse cx="72" cy="52" rx="8" ry="6" fill="#7a4a24"/>' }),
  vache: quad('vache', { body: '#eef1f5', hoof: '#5b4a3a', tail: tuftTail('#eef1f5', '#23324d'), headS: 0.5, pattern: '<path d="M54 46q10-4 12 6q-6 8-14 2z" fill="#23324d"/><path d="M72 58q8-2 10 6q-6 4-12-1z" fill="#23324d"/><ellipse cx="66" cy="73" rx="6" ry="4" fill="#f4b6c9"/>' }),
  cochon: quad('cochon', { body: '#f7a8c2', leg: '#f7a8c2', hoof: '#c4577c', legW: 8, tail: '<path d="M85 56q8-2 6 4t6 2" stroke="#ef8fb0" stroke-width="3" fill="none" stroke-linecap="round"/>' }),
  mouton: quad('mouton', { body: '#eef1f5', leg: '#5d6779', legW: 6, rx: 27, ry: 17, headS: 0.48, tail: '<circle cx="87" cy="54" r="6" fill="#eef1f5"/>', pattern: `<g fill="#eef1f5">${[[40, 50], [52, 44], [64, 44], [76, 48], [84, 58], [46, 66], [60, 70], [74, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>` }),
  cheval: quad('cheval', { body: '#a8683a', neck: 1, hoof: '#4a2c14', legW: 6, tail: '<path d="M84 52q14 4 10 30q-6-10-10-26z" fill="#4a2c14"/>', mane: '<path d="M38 52L28 28l6-2 12 24z" fill="#4a2c14"/>' }),
  zebre: quad('zebre', { body: '#eef1f5', neck: 1, hoof: '#23324d', legW: 6, tail: tuftTail('#eef1f5', '#23324d'), mane: '<path d="M38 52L28 28l6-2 12 24z" fill="#23324d"/>', pattern: '<g stroke="#23324d" stroke-width="4" stroke-linecap="round" fill="none"><path d="M50 45q2 8-2 16"/><path d="M60 43q3 10-1 20"/><path d="M70 44q3 10 0 20"/><path d="M80 48q2 8-1 14"/></g>' }),
  girafe: quad('girafe', { body: '#f5c046', neck: 2, hoof: '#7a4a24', legW: 5, rx: 22, ry: 13, cx: 62, tail: tuftTail('#f5c046', '#7a4a24'), pattern: '<g fill="#c98a4b"><circle cx="52" cy="46" r="4"/><circle cx="64" cy="44" r="4.5"/><circle cx="76" cy="48" r="4"/><circle cx="58" cy="56" r="4"/><circle cx="72" cy="57" r="4"/></g>', neckPattern: '<g fill="#c98a4b"><circle cx="38" cy="38" r="3"/><circle cx="32" cy="28" r="2.6"/><circle cx="44" cy="30" r="2.4"/></g>' }),
  loup: quad('loup', { body: '#8a93a6', belly: '#d9dde5', headS: 0.52, headY: 38, tail: '<path d="M84 54q18 0 12 22q-8-4-14-16z" fill="#6f788c"/>' }),
  renard: quad('renard', { body: '#f08a3c', headS: 0.5, headY: 38, belly: '#fff3e4', leg: '#5b3a24', legW: 6, tail: '<path d="M84 54q20-6 14 20q-10 0-16-12z" fill="#f08a3c"/><path d="M96 70q2 6-2 6q-4-2-4-6z" fill="#fff3e4"/>' }),
  lapin: sit('lapin', { body: '#c9cfdc', belly: '#eef1f5', headY: 34, headS: 0.58, tail: '<circle cx="72" cy="86" r="6" fill="#eef1f5"/>' }),
  'ours-polaire': sit('ours-polaire', { body: '#e1e8f1', rx: 24, belly: '#f4f7fb', feet: '#c9d3e1', arms: '#d3dce8', headY: 34 }),
  panda: sit('panda', { body: '#eef1f5', arms: '#23324d', feet: '#23324d', headY: 34 }),
  lion: quad('lion', { body: '#f5b82e', headS: 0.5, headY: 38, tail: tuftTail('#f5b82e', '#d9782d') }),
  elephant: quad('elephant', { body: '#bcc5d4', leg: '#bcc5d4', legW: 12, rx: 30, ry: 20, cx: 60, headS: 0.56, headX: 26, headY: 40, tail: '<path d="M89 54q6 8 3 16" stroke="#a3aec2" stroke-width="3" fill="none" stroke-linecap="round"/>' }),
  lama: quad('lama', { body: '#f3e1c2', neck: 1, leg: '#e6cfa6', legW: 6, hoof: '#8a6a44', tail: '<circle cx="86" cy="52" r="5" fill="#f3e1c2"/>', pattern: `<g fill="#f3e1c2">${[[46, 50], [58, 46], [70, 46], [80, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>` }),
});

export const HABITATS = {
  maison: `<rect x="20" y="46" width="60" height="42" fill="#f6ead5"/><path d="M12 50L50 16l38 34z" fill="#e5484d"/><rect x="44" y="62" width="14" height="26" rx="2" fill="#a8683a"/><rect x="26" y="56" width="12" height="12" rx="2" fill="#20b7c9"/><rect x="64" y="56" width="12" height="12" rx="2" fill="#20b7c9"/><rect x="64" y="22" width="8" height="16" fill="#c4473a"/>`,
  ferme: `<path d="M14 88V44l36-26 36 26v44z" fill="#c4473a"/><path d="M8 46l42-32 42 32" stroke="#eef1f5" stroke-width="6" fill="none" stroke-linejoin="round"/><rect x="34" y="56" width="32" height="32" fill="#eef1f5"/><path d="M36 58l28 28M64 58l-28 28" stroke="#c4473a" stroke-width="4"/><rect x="44" y="32" width="12" height="12" rx="6" fill="#eef1f5"/><rect x="0" y="88" width="100" height="12" fill="#8cc63f"/>`,
  foret: `<path d="M26 14l18 34H8z M26 34l20 34H6z" fill="#2c8048"/><path d="M70 6l20 38H50z M70 28l24 42H46z" fill="#3aa65b"/><path d="M48 40l14 28H34z M48 58l16 30H32z" fill="#2c8048"/><rect x="23" y="68" width="6" height="14" fill="#7a4a24"/><rect x="67" y="70" width="6" height="14" fill="#7a4a24"/><rect x="45" y="88" width="6" height="8" fill="#7a4a24"/>`,
  mer: `<circle cx="74" cy="26" r="14" fill="#f5b82e"/><path d="M0 52q12-10 25 0t25 0 25 0 25 0v48H0z" fill="#20b7c9"/><path d="M0 70q12-10 25 0t25 0 25 0 25 0v30H0z" fill="#1a56b8"/>`,
  banquise: `<rect x="0" y="62" width="100" height="38" fill="#1a56b8"/><path d="M8 66l10-24h34l12 10h22l6 14z" fill="#eef6fb"/><path d="M18 42l8 24M52 42l-8 24" stroke="#bfe3f3" stroke-width="4"/><path d="M12 66h82" stroke="#bfe3f3" stroke-width="4"/><path d="M60 22l5 8h-10z M72 18l4 7h-8z" fill="#eef6fb"/>`,
  savane: `<circle cx="22" cy="26" r="12" fill="#f5b82e"/><rect x="0" y="70" width="100" height="30" fill="#e8c46a"/><path d="M0 72q10-8 14 0q6-10 12 0q6-8 12 0q6-10 12 0q6-8 12 0q6-10 12 0q6-8 12 0q6-10 14 0" fill="#d9a83a"/><path d="M64 70V40" stroke="#7a4a24" stroke-width="6"/><path d="M64 46l-12-8M64 44l12-10" stroke="#7a4a24" stroke-width="4"/><ellipse cx="64" cy="34" rx="30" ry="9" fill="#5a9e3a"/>`,
};
