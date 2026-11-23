/**
 * Illustrations des jeux 22 à 30 (SVG dessinés pour Layjou, viewBox 100 × 100) : météo, vêtements et accessoires
 * de saison, jardin et petites bêtes, objets du numérique. Même style : aplats, formes rondes, sans contour.
 */
const D = '#23324d';

export const WEATHER = {
  soleil: `<circle cx="50" cy="50" r="22" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="7" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${(50 + Math.cos(r) * 31).toFixed(1)} ${(50 + Math.sin(r) * 31).toFixed(1)}L${(50 + Math.cos(r) * 42).toFixed(1)} ${(50 + Math.sin(r) * 42).toFixed(1)}"/>`; }).join('')}</g>`,
  pluie: `<path d="M24 56a16 16 0 0 1 4-31a20 20 0 0 1 38 2a14 14 0 0 1 10 27z" fill="#9fb4cc"/><g stroke="#3b82f6" stroke-width="5" stroke-linecap="round"><path d="M32 66l-4 12"/><path d="M50 66l-4 14"/><path d="M68 66l-4 12"/></g>`,
  neige: `<path d="M24 54a16 16 0 0 1 4-31a20 20 0 0 1 38 2a14 14 0 0 1 10 27z" fill="#c9d6e6"/><g fill="#7fb0e8"><circle cx="30" cy="70" r="5"/><circle cx="50" cy="78" r="5"/><circle cx="70" cy="70" r="5"/><circle cx="40" cy="88" r="4"/><circle cx="62" cy="90" r="4"/></g>`,
  nuage: '<path d="M18 66a18 18 0 0 1 6-35a22 22 0 0 1 42 3a16 16 0 0 1 14 32z" fill="#c9d6e6"/>',
  vent: '<g stroke="#7fb0e8" stroke-width="7" fill="none" stroke-linecap="round"><path d="M10 38h52a10 10 0 1 0-10-10"/><path d="M10 56h68a10 10 0 1 1-10 10"/><path d="M18 74h30"/></g>',
};

export const CLOTHES = {
  bonnet: '<path d="M18 66q0-46 32-46t32 46z" fill="#e5484d"/><rect x="14" y="62" width="72" height="16" rx="8" fill="#f28b8f"/><circle cx="50" cy="18" r="9" fill="#fff"/>',
  echarpe: '<path d="M18 30q32 14 64 0v18q-32 14-64 0z" fill="#3b82f6"/><path d="M58 44l10 44h-18z" fill="#3b82f6"/><g fill="#fff"><rect x="28" y="36" width="8" height="12"/><rect x="48" y="38" width="8" height="12"/><rect x="54" y="74" width="12" height="5"/></g>',
  gants: '<path d="M18 48q0-14 10-14h6v-8q0-6 6-6t6 6v40q0 12-14 12q-14 0-14-14z" fill="#f08a3c"/><path d="M54 48q0-14 10-14h6v-8q0-6 6-6t6 6v40q0 12-14 12q-14 0-14-14z" fill="#f08a3c"/><rect x="18" y="70" width="28" height="10" rx="4" fill="#c4692a"/><rect x="54" y="70" width="28" height="10" rx="4" fill="#c4692a"/>',
  manteau: '<path d="M30 16h40l18 18-10 12-8-8v50H30V38l-8 8-10-12z" fill="#7a4a24"/><path d="M50 16v72" stroke="#5b3518" stroke-width="3"/><g fill="#f5c046"><circle cx="44" cy="40" r="3"/><circle cx="44" cy="56" r="3"/><circle cx="44" cy="72" r="3"/></g><path d="M38 16l12 12 12-12" fill="#a8683a"/>',
  bottes: '<path d="M14 20h22v46h12q8 0 8 10v8H14z" fill="#3aa65b"/><path d="M54 20h22v46h12q8 0 8 10v8H54z" fill="#2f8f5b"/><rect x="14" y="84" width="42" height="6" rx="3" fill="#1f6b42"/><rect x="54" y="84" width="42" height="6" rx="3" fill="#1f6b42"/>',
  impermeable: '<path d="M30 14h40l18 22-10 10-8-8v50H30V38l-8 8-10-10z" fill="#f5c046"/><path d="M36 14q14 14 28 0" fill="#e0aa26"/><path d="M50 26v62" stroke="#c99a04" stroke-width="3"/><path d="M36 50h10M54 50h10" stroke="#c99a04" stroke-width="4" stroke-linecap="round"/>',
  'lunettes-soleil': `<path d="M8 40h84" stroke="${D}" stroke-width="5" stroke-linecap="round"/><path d="M12 40h30q0 22-15 22T12 40zM58 40h30q0 22-15 22T58 40z" fill="${D}"/><path d="M20 46q4-3 8 0M66 46q4-3 8 0" stroke="#7fb0e8" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  'chapeau-soleil': '<ellipse cx="50" cy="64" rx="44" ry="12" fill="#f2c66d"/><path d="M26 62q2-34 24-34t24 34z" fill="#f5d48a"/><rect x="26" y="52" width="48" height="8" fill="#e5484d"/>',
  'creme-solaire': '<rect x="32" y="26" width="36" height="62" rx="10" fill="#ffd43b"/><rect x="40" y="12" width="20" height="16" rx="4" fill="#f08a3c"/><circle cx="50" cy="56" r="11" fill="#fff"/><circle cx="50" cy="56" r="6" fill="#ffc83d"/>',
  maillot: '<path d="M26 18h12q12 16 24 0h12l-4 30q-2 26-20 34q-18-8-20-34z" fill="#1fb3c6"/><path d="M34 50q16 10 32 0" stroke="#fff" stroke-width="4" fill="none"/>',
  short: '<path d="M22 22h56l6 60H56l-6-34-6 34H16z" fill="#3b82f6"/><rect x="22" y="22" width="56" height="10" fill="#1a56b8"/>',
  tshirt: '<path d="M34 16q16 12 32 0l22 14-10 16-8-4v46H30V42l-8 4-10-16z" fill="#ef5f95"/><path d="M40 18q10 8 20 0" fill="#d9457d"/>',
  pull: '<path d="M34 16q16 12 32 0l22 14-8 44-10-2V88H30V72l-10 2-8-44z" fill="#8b6fe8"/><path d="M30 76h40M30 82h40" stroke="#6f55c4" stroke-width="3"/><path d="M40 18q10 8 20 0" fill="#6f55c4"/>',
  sandales: '<ellipse cx="32" cy="58" rx="14" ry="30" fill="#c98a4b"/><ellipse cx="70" cy="58" rx="14" ry="30" fill="#c98a4b"/><path d="M20 46q12-10 24 0M58 46q12-10 24 0" stroke="#e5484d" stroke-width="5" fill="none"/>',
  gourde: '<rect x="34" y="26" width="32" height="64" rx="14" fill="#3aa65b"/><rect x="40" y="12" width="20" height="16" rx="4" fill="#1f6b42"/><rect x="34" y="50" width="32" height="14" fill="#9bd3a9"/>',
  luge: '<path d="M14 60h66q8 0 10-8" stroke="#c4473a" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="18" y="40" width="56" height="12" rx="4" fill="#e5484d"/><path d="M24 52v8M68 52v8" stroke="#c4473a" stroke-width="5"/>',
};

export const GARDEN = {
  arrosoir: '<path d="M24 40h40v36q0 10-10 10H34q-10 0-10-10z" fill="#1fb3c6"/><path d="M64 48l22-16" stroke="#1fb3c6" stroke-width="8" stroke-linecap="round"/><circle cx="88" cy="30" r="7" fill="#139aa6"/><path d="M30 40q14-22 28 0" stroke="#139aa6" stroke-width="6" fill="none"/>',
  coccinelle: `<ellipse cx="50" cy="56" rx="30" ry="28" fill="#e5484d"/><path d="M50 30v54" stroke="${D}" stroke-width="3"/><circle cx="50" cy="28" r="14" fill="${D}"/><g fill="${D}"><circle cx="36" cy="48" r="6"/><circle cx="64" cy="48" r="6"/><circle cx="38" cy="68" r="5"/><circle cx="62" cy="68" r="5"/></g><circle cx="44" cy="25" r="3" fill="#fff"/><circle cx="56" cy="25" r="3" fill="#fff"/>`,
  abeille: `<ellipse cx="34" cy="34" rx="14" ry="10" fill="#dff2ff" transform="rotate(-25 34 34)"/><ellipse cx="58" cy="30" rx="14" ry="10" fill="#dff2ff" transform="rotate(20 58 30)"/><ellipse cx="50" cy="58" rx="28" ry="20" fill="#ffc83d"/><g fill="${D}"><rect x="40" y="39" width="7" height="38" rx="3"/><rect x="56" y="40" width="7" height="36" rx="3"/></g><circle cx="24" cy="56" r="11" fill="${D}"/><circle cx="21" cy="53" r="3" fill="#fff"/>`,
  puceron: '<ellipse cx="50" cy="56" rx="24" ry="18" fill="#9bd36a"/><circle cx="28" cy="50" r="10" fill="#7fbf4f"/><g stroke="#5f9a35" stroke-width="3" stroke-linecap="round"><path d="M36 70l-6 10M50 72v10M64 70l6 10"/><path d="M24 42l-8-10M30 40l-2-12"/></g><circle cx="25" cy="48" r="2.5" fill="#23324d"/>',
  tomate: '<circle cx="50" cy="58" r="30" fill="#e5484d"/><path d="M34 32q8 6 16 0q8 6 16 0q-6 10-16 8q-10 2-16-8z" fill="#3aa65b"/><ellipse cx="38" cy="50" rx="6" ry="9" fill="#fff" opacity=".35"/>',
  'plant-tomate': '<path d="M50 90V30" stroke="#3aa65b" stroke-width="6"/><path d="M50 60q-20-4-24-20q18 0 24 14M50 44q20-4 24-20q-18 0-24 14" fill="#4fae62"/><circle cx="36" cy="70" r="9" fill="#e5484d"/><circle cx="64" cy="66" r="9" fill="#e5484d"/><path d="M30 92h40" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/>',
  fleur: '<path d="M50 90V52" stroke="#3aa65b" stroke-width="6"/><path d="M50 74q-14-2-18-14q14 0 18 10" fill="#4fae62"/><g fill="#ef5f95"><circle cx="50" cy="26" r="11"/><circle cx="66" cy="38" r="11"/><circle cx="60" cy="56" r="11"/><circle cx="40" cy="56" r="11"/><circle cx="34" cy="38" r="11"/></g><circle cx="50" cy="42" r="9" fill="#ffc83d"/>',
  'ver-de-terre': '<path d="M14 64q12-20 24 0t24 0t24 0" stroke="#f0a3b5" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="86" cy="62" r="3" fill="#23324d"/>',
  fanee: '<path d="M50 90V56q0-12-14-18" stroke="#9a8a4a" stroke-width="6" fill="none"/><path d="M40 70q-14 2-18 12q12 2 18-8" fill="#b8a85a"/><g fill="#c9a0a8"><circle cx="30" cy="40" r="9"/><circle cx="24" cy="54" r="8"/><circle cx="38" cy="30" r="8"/></g>',
};

export const DIGITAL = {
  tablette: `<rect x="18" y="12" width="64" height="78" rx="8" fill="${D}"/><rect x="24" y="20" width="52" height="60" rx="3" fill="#7fb0e8"/><circle cx="50" cy="85" r="3" fill="#5b6b85"/>`,
  message: '<path d="M14 22h72q6 0 6 6v38q0 6-6 6H40l-18 14v-14h-8q-6 0-6-6V28q0-6 6-6z" fill="#1fb3c6"/><g fill="#fff"><circle cx="34" cy="47" r="5"/><circle cx="50" cy="47" r="5"/><circle cx="66" cy="47" r="5"/></g>',
  lien: '<g stroke="#3b82f6" stroke-width="9" fill="none" stroke-linecap="round"><path d="M42 58l-8 8a12 12 0 0 1-17-17l12-12a12 12 0 0 1 17 0"/><path d="M58 42l8-8a12 12 0 0 1 17 17l-12 12a12 12 0 0 1-17 0"/><path d="M40 60l20-20"/></g>',
  cadenas: '<rect x="24" y="44" width="52" height="42" rx="8" fill="#f5c046"/><path d="M34 44V32a16 16 0 0 1 32 0v12" stroke="#5b6b85" stroke-width="8" fill="none"/><circle cx="50" cy="62" r="6" fill="#23324d"/><rect x="47" y="64" width="6" height="12" rx="3" fill="#23324d"/>',
  adulte: '<circle cx="50" cy="28" r="14" fill="#c98a4b"/><path d="M24 90q0-40 26-40t26 40z" fill="#1a56b8"/><path d="M40 26q10-14 20 0" fill="#4a2c14"/>',
  alerte: '<path d="M50 12l40 72H10z" fill="#ffc83d" stroke-linejoin="round"/><rect x="46" y="36" width="8" height="26" rx="4" fill="#23324d"/><circle cx="50" cy="72" r="5" fill="#23324d"/>',
};
