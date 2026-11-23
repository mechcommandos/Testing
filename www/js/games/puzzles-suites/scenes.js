/** Images des puzzles (SVG 300 × 300 dessinés pour le projet) : formes nettes et couleurs franches, faciles à découper. */
export const SCENES = {
  maison: '<rect width="300" height="300" fill="#bfe3ff"/><circle cx="245" cy="55" r="32" fill="#ffd36e"/><rect y="215" width="300" height="85" fill="#7cc46b"/><path d="M60 140 L140 75 L220 140 Z" fill="#e5484d"/><rect x="75" y="140" width="130" height="95" fill="#f6ead5"/><rect x="125" y="180" width="32" height="55" fill="#8a5a3b"/><rect x="90" y="155" width="26" height="24" fill="#3e7bfa"/><rect x="165" y="155" width="26" height="24" fill="#3e7bfa"/><circle cx="35" cy="235" r="14" fill="#f59a23"/><circle cx="265" cy="240" r="14" fill="#c86bd8"/>',
  bateau: '<rect width="300" height="300" fill="#d7efff"/><circle cx="60" cy="60" r="28" fill="#ffd36e"/><path d="M0 210 Q75 190 150 210 T300 210 V300 H0 Z" fill="#3e7bfa"/><path d="M0 240 Q75 225 150 240 T300 240 V300 H0 Z" fill="#2a5fc9"/><path d="M80 200 L220 200 L195 235 L105 235 Z" fill="#8a5a3b"/><rect x="147" y="70" width="7" height="130" fill="#5b4a3a"/><path d="M155 75 L155 185 L225 185 Z" fill="#fff"/><path d="M145 95 L145 185 L95 185 Z" fill="#e5484d"/><path d="M236 70 q12 -10 24 0 q12 -10 24 0" stroke="#5b4a3a" stroke-width="4" fill="none"/>',
  fusee: '<rect width="300" height="300" fill="#23324d"/><g fill="#fff"><circle cx="40" cy="50" r="3"/><circle cx="250" cy="40" r="4"/><circle cx="270" cy="160" r="3"/><circle cx="30" cy="190" r="4"/><circle cx="90" cy="260" r="3"/><circle cx="220" cy="250" r="3"/></g><circle cx="235" cy="235" r="40" fill="#f5b82e"/><path d="M150 40 C190 80 190 170 175 210 L125 210 C110 170 110 80 150 40 Z" fill="#eef2f8"/><circle cx="150" cy="115" r="18" fill="#3e7bfa" stroke="#9fb3d1" stroke-width="5"/><path d="M125 170 L95 225 L128 210 Z M175 170 L205 225 L172 210 Z" fill="#e5484d"/><path d="M130 212 L150 265 L170 212 Z" fill="#f59a23"/>',
  jardin: '<rect width="300" height="300" fill="#eaf7d9"/><rect y="230" width="300" height="70" fill="#8a5a3b"/><rect x="62" y="120" width="10" height="115" fill="#3aa65b"/><rect x="146" y="90" width="10" height="145" fill="#3aa65b"/><rect x="228" y="140" width="10" height="95" fill="#3aa65b"/><g fill="#e5484d"><circle cx="67" cy="95" r="18"/><circle cx="45" cy="115" r="18"/><circle cx="89" cy="115" r="18"/><circle cx="56" cy="138" r="18"/><circle cx="78" cy="138" r="18"/></g><circle cx="67" cy="118" r="12" fill="#ffd36e"/><g fill="#f5b82e"><circle cx="151" cy="62" r="20"/><circle cx="127" cy="84" r="20"/><circle cx="175" cy="84" r="20"/><circle cx="138" cy="110" r="20"/><circle cx="164" cy="110" r="20"/></g><circle cx="151" cy="88" r="13" fill="#8a5a3b"/><g fill="#c86bd8"><circle cx="233" cy="118" r="15"/><circle cx="215" cy="134" r="15"/><circle cx="251" cy="134" r="15"/><circle cx="224" cy="152" r="15"/><circle cx="242" cy="152" r="15"/></g><circle cx="233" cy="138" r="10" fill="#ffd36e"/><path d="M110 40 q8 -10 16 0 q8 -10 16 0" stroke="#23324d" stroke-width="3" fill="none"/>',
};

export const SCENE_IDS = Object.keys(SCENES);

/** Une pièce : la même image, cadrée sur sa case. */
export function tileSvg(scene, n, x, y, size) {
  const s = 300 / n;
  return `<svg viewBox="${x * s} ${y * s} ${s} ${s}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${SCENES[scene]}</svg>`;
}

export function sceneSvg(scene, size) {
  return `<svg viewBox="0 0 300 300" width="${size}" height="${size}" aria-hidden="true" focusable="false">${SCENES[scene]}</svg>`;
}

export const SCENE_NAMES = { maison: 'la maison', bateau: 'le bateau', fusee: 'la fusée', jardin: 'le jardin' };
