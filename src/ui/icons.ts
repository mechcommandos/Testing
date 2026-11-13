/** Icônes SVG originales du jeu (chaînes HTML). */

const svg = (body: string, vb = '0 0 48 48') =>
  `<svg class="ic" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

/** Boulon : la monnaie gagnée en jouant. */
export const coin = svg(`
  <path d="M24 3 42 13.5v21L24 45 6 34.500v-21z" fill="#FFC531" stroke="#B26A00" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24 3 42 13.5 24 24 6 13.500z" fill="#FFE27A"/>
  <circle cx="24" cy="24" r="8.500" fill="#FFF3C4" stroke="#B26A00" stroke-width="2.5"/>
  <path d="m19.500 24 9-0" stroke="#B26A00" stroke-width="2.500" stroke-linecap="round" transform="rotate(-35 24 24)"/>`);

/** Cristal : les crédits (monnaie premium). */
export const credit = svg(`
  <path d="M24 3 41 17 24 45 7 17z" fill="#FF4F9A" stroke="#9C1458" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24 3 41 17H7z" fill="#FF9CC8"/>
  <path d="M24 3 31 17 24 45 17 17z" fill="#FF77B2"/>
  <path d="M13.500 14.500 18 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`);

export const heart = svg(
  `<path d="M24 42S5 30 5 17.500C5 10.500 10.300 6 16 6c3.400 0 6.300 1.700 8 4.300C25.700 7.700 28.600 6 32 6c5.700 0 11 4.500 11 11.500C43 30 24 42 24 42z" fill="#FF3D8B" stroke="#9C1458" stroke-width="2.500" stroke-linejoin="round"/><path d="M13 14c1.500-2.500 4-3.500 6-3" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`,
);

export const crown = svg(
  `<path d="M6 36 4 14l11 9 9-15 9 15 11-9-2 22z" fill="#FFC531" stroke="#B26A00" stroke-width="2.500" stroke-linejoin="round"/><rect x="6" y="36" width="36" height="6" rx="2" fill="#FFB000" stroke="#B26A00" stroke-width="2.500"/><circle cx="24" cy="27" r="3" fill="#FF4F9A"/>`,
);

export const hammer = svg(`
  <rect x="21" y="18" width="7" height="27" rx="3.500" fill="#C98A4B" stroke="#6B3F16" stroke-width="2.500" transform="rotate(38 24 30)"/>
  <rect x="5" y="6" width="30" height="17" rx="5" fill="#8FA3C8" stroke="#2D3E66" stroke-width="2.500" transform="rotate(38 20 14)"/>
  <path d="M12 9.500 22 17" stroke="#E4ECFA" stroke-width="3" stroke-linecap="round"/>`);

export const laser = svg(`
  <path d="M28 3 10 27h11l-3 18 20-26H26z" fill="#FFE24A" stroke="#A86500" stroke-width="2.500" stroke-linejoin="round"/>
  <path d="M26.500 8 15 24" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>`);

export const chroma = svg(`
  <circle cx="24" cy="24" r="19" fill="#fff" stroke="#2D3E66" stroke-width="2.500"/>
  <path d="M24 24V5a19 19 0 0 1 16.500 9.500z" fill="#FF4F9A"/>
  <path d="M24 24 40.500 14.500a19 19 0 0 1 0 19z" fill="#FFC531"/>
  <path d="M24 24l16.500 9.500A19 19 0 0 1 24 43z" fill="#35D07F"/>
  <path d="M24 24v19A19 19 0 0 1 7.500 33.500z" fill="#19C5D6"/>
  <path d="M24 24 7.500 33.500a19 19 0 0 1 0-19z" fill="#7B6CF6"/>
  <path d="M24 24 7.500 14.500A19 19 0 0 1 24 5z" fill="#FF8A3D"/>
  <circle cx="24" cy="24" r="6.500" fill="#fff" stroke="#2D3E66" stroke-width="2.500"/>`);

export const recycle = svg(`
  <path d="M38 22A14 14 0 0 0 13 14.500" fill="none" stroke="#19B9C9" stroke-width="6" stroke-linecap="round"/>
  <path d="M10 26a14 14 0 0 0 25 7.500" fill="none" stroke="#FF4F9A" stroke-width="6" stroke-linecap="round"/>
  <path d="M7 8v10h10z" fill="#19B9C9"/><path d="M41 40V30H31z" fill="#FF4F9A"/>`);

export const weaponIcons = { hammer, laser, chroma, recycle } as const;

const line = (d: string, extra = '') =>
  svg(`<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</g>`);

export const pause = svg(`<rect x="11" y="9" width="9" height="30" rx="3.500" fill="currentColor"/><rect x="28" y="9" width="9" height="30" rx="3.500" fill="currentColor"/>`);
export const play = svg(`<path d="M15 8.500v31a2.500 2.500 0 0 0 3.800 2.100l25-15.500a2.500 2.500 0 0 0 0-4.200l-25-15.500A2.500 2.500 0 0 0 15 8.500z" fill="currentColor" transform="translate(-5)"/>`);
export const close = line(`<path d="M12 12 36 36M36 12 12 36"/>`);
export const check = line(`<path d="m9 25 10 10 20-22"/>`);
export const gear = svg(`<path d="M20.500 4h7l1.400 6 4.100 2.400 5.900-1.800 3.500 6-4.500 4.200v4.400l4.500 4.200-3.500 6-5.900-1.800-4.100 2.400-1.400 6h-7l-1.400-6-4.100-2.400-5.900 1.800-3.500-6 4.500-4.200v-4.400L5.600 16.600l3.500-6 5.900 1.800L19.100 10z" fill="currentColor"/><circle cx="24" cy="24" r="6.500" fill="#fff"/>`);
export const home = svg(`<path d="M6 23 24 6l18 17v17a3 3 0 0 1-3 3h-9V30H18v13H9a3 3 0 0 1-3-3z" fill="currentColor"/>`);
export const bag = svg(`<path d="M9 16h30l3 24a3 3 0 0 1-3 3.500H9A3 3 0 0 1 6 40z" fill="currentColor"/><path d="M16 20v-6a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`);
export const shirt = svg(`<path d="M17 5 4 12l5 10 5-2.500V43h20V19.500l5 2.500 5-10-13-7a7 7 0 0 1-14 0z" fill="currentColor"/>`);
export const target = svg(`<circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="4.500"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="4.500"/><circle cx="24" cy="24" r="3.500" fill="currentColor"/>`);
export const gift = svg(`<rect x="5" y="15" width="38" height="10" rx="3" fill="currentColor"/><path d="M8 25h32v15a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="currentColor"/><path d="M24 15v28" stroke="#fff" stroke-width="5"/><path d="M24 15c-3-9-14-10-14-4s8 4 14 4zm0 0c3-9 14-10 14-4s-8 4-14 4z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`);
export const video = svg(`<rect x="4" y="11" width="28" height="26" rx="6" fill="currentColor"/><path d="m32 21 11-7v20l-11-7z" fill="currentColor"/><path d="M15 18.500v11l9-5.500z" fill="#fff"/>`);
export const lock = svg(`<rect x="9" y="21" width="30" height="22" rx="5" fill="currentColor"/><path d="M15 21v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" stroke-width="4.500"/>`);
export const sound = svg(`<path d="M6 18h8l11-9v30l-11-9H6z" fill="currentColor"/><path d="M31 17a10 10 0 0 1 0 14M36 11a18 18 0 0 1 0 26" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`);
export const vibrate = svg(`<rect x="15" y="6" width="18" height="36" rx="4" fill="currentColor"/><path d="M8 16v16M40 16v16M3 21v6M45 21v6" stroke="currentColor" stroke-width="3.500" stroke-linecap="round"/>`);
export const globe = line(`<circle cx="24" cy="24" r="19"/><path d="M5 24h38M24 5c-7 6-7 32 0 38M24 5c7 6 7 32 0 38"/>`);
export const shield = svg(`<path d="M24 4 41 10v13c0 10-7 17-17 21C14 40 7 33 7 23V10z" fill="currentColor"/><path d="m16 24 6 6 11-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
export const info = svg(`<circle cx="24" cy="24" r="20" fill="currentColor"/><path d="M24 22v13" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="14" r="3" fill="#fff"/>`);
export const restart = line(`<path d="M40 24a16 16 0 1 1-5-11.500"/><path d="M40 6v9h-9" />`);
export const none = line(`<circle cx="24" cy="24" r="18"/><path d="m11 37 26-26"/>`);
