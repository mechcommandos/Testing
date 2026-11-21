/* ------------------------------------------------------------------ *
 *  Layjou Kart — catalogue du jeu : skins, accessoires, armes
 *  spéciales, karts, pilotes rivaux, mondes, circuits, objets,
 *  missions et récompenses.
 *
 *  Les personnages (Layjou, ses skins et accessoires, les familles
 *  de monstres et leurs palettes) viennent de Layjou Battle.
 * ------------------------------------------------------------------ */

/** price: { coins } | { credits } | { ads: n } (vidéos à regarder) | { stars: n } | null (gratuit) */

export const SKINS = [
  { id: 'classic', name: { fr: 'Layjou Classique', en: 'Classic Layjou' }, rarity: 'common', price: null,
    pal: { main: '#1cc3d2', mainDark: '#0e9fb3', accent: '#ff5c9d', accentLight: '#ff9cc4', shell: '#ffffff', shellShade: '#d5e2f3', visor: '#0c3a96', visorLight: '#1a56c4', eye: '#1f7fe8', eyeRing: '#56d6f5', mouth: '#f0506e', tongue: '#ff9a8a' } },
  { id: 'fraise', name: { fr: 'Fraise Pop', en: 'Strawberry Pop' }, rarity: 'common', price: { coins: 1500 },
    pal: { main: '#ff5d7a', mainDark: '#e03a5c', accent: '#7be35a', accentLight: '#b9f59f', shell: '#fff6f2', shellShade: '#f3d6d0', visor: '#5a1030', visorLight: '#8a1f4c', eye: '#ff7fa6', eyeRing: '#ffc2d4', mouth: '#ff8fb0', tongue: '#ffd0dc' } },
  { id: 'citron', name: { fr: 'Zeste Citron', en: 'Lemon Zest' }, rarity: 'common', price: { coins: 3000 },
    pal: { main: '#ffc928', mainDark: '#f09a12', accent: '#ff7a3d', accentLight: '#ffb48c', shell: '#fffdf0', shellShade: '#efe4bd', visor: '#3d2a08', visorLight: '#6b4a12', eye: '#ffb11f', eyeRing: '#ffe27a', mouth: '#ff6b4a', tongue: '#ffb199' } },
  { id: 'menthe', name: { fr: 'Menthe Givrée', en: 'Frosty Mint' }, rarity: 'rare', price: { coins: 6000 },
    pal: { main: '#3ddc97', mainDark: '#1fae73', accent: '#a56bff', accentLight: '#cdb0ff', shell: '#f4fff9', shellShade: '#cfeadd', visor: '#0b3b33', visorLight: '#136355', eye: '#2fe0a5', eyeRing: '#a4ffd8', mouth: '#ff6f91', tongue: '#ffb3c4' } },
  { id: 'neon', name: { fr: 'Néon Arcade', en: 'Neon Arcade' }, rarity: 'rare', price: { ads: 5 },
    pal: { main: '#00f0ff', mainDark: '#00a8d6', accent: '#ff2bd6', accentLight: '#ff8bea', shell: '#1b1f4b', shellShade: '#111436', visor: '#05061c', visorLight: '#151a52', eye: '#00f0ff', eyeRing: '#b5fbff', mouth: '#ff2bd6', tongue: '#ff9cee' } },
  { id: 'galaxy', name: { fr: 'Galaxie Violette', en: 'Violet Galaxy' }, rarity: 'epic', price: { credits: 150 },
    pal: { main: '#8f5bff', mainDark: '#6337d6', accent: '#39e4ff', accentLight: '#a8f3ff', shell: '#f3eeff', shellShade: '#d3c8f2', visor: '#1b0b4f', visorLight: '#34148f', eye: '#b58cff', eyeRing: '#e3d2ff', mouth: '#ff6fb5', tongue: '#ffb8dc' }, stars: true },
  { id: 'ninja', name: { fr: 'Ombre Ninja', en: 'Shadow Ninja' }, rarity: 'epic', price: { credits: 240 },
    pal: { main: '#39405a', mainDark: '#23283c', accent: '#ff3b4e', accentLight: '#ff8d99', shell: '#5b6482', shellShade: '#424a66', visor: '#0a0c16', visorLight: '#1c2136', eye: '#ff3b4e', eyeRing: '#ffb0b8', mouth: '#ff3b4e', tongue: '#ff9aa4' } },
  { id: 'royal', name: { fr: 'Or Royal', en: 'Royal Gold' }, rarity: 'legendary', price: { credits: 420 },
    pal: { main: '#ffc531', mainDark: '#e0920a', accent: '#ff4f7b', accentLight: '#ff9db6', shell: '#fff8dc', shellShade: '#ecd9a0', visor: '#3a1c5a', visorLight: '#5c2d8f', eye: '#ffd24a', eyeRing: '#fff0b0', mouth: '#ff4f7b', tongue: '#ffa9bf' }, shine: true },
  { id: 'prisme', name: { fr: 'Prisme Arc-en-ciel', en: 'Rainbow Prism' }, rarity: 'legendary', price: { credits: 650 }, rainbow: true,
    pal: { main: '#1cc3d2', mainDark: '#0e9fb3', accent: '#ff5c9d', accentLight: '#ff9cc4', shell: '#ffffff', shellShade: '#dbe2f5', visor: '#14104a', visorLight: '#2a2390', eye: '#ffffff', eyeRing: '#c9f6ff', mouth: '#ff5c9d', tongue: '#ffb3d1' } },
  { id: 'champion', name: { fr: 'Champion Glitch', en: 'Glitch Champion' }, rarity: 'legendary', price: { stars: 54 },
    pal: { main: '#16e0a0', mainDark: '#0aa878', accent: '#ffe14a', accentLight: '#fff3a6', shell: '#10132e', shellShade: '#090b1e', visor: '#020308', visorLight: '#0d2b2a', eye: '#16e0a0', eyeRing: '#b6ffe6', mouth: '#ffe14a', tongue: '#fff3a6' } },
];

/** Palette d'Anti-Jou (rival final), jamais équipable. */
export const ANTI_PAL = { main: '#7a1fd1', mainDark: '#4b0f8a', accent: '#ff2b5c', accentLight: '#ff8aa5', shell: '#262a45', shellShade: '#171a2e', visor: '#05030c', visorLight: '#200a3a', eye: '#ff2b5c', eyeRing: '#ff9db3', mouth: '#ff2b5c', tongue: '#ff9db3' };

/**
 * perk : bonus de course léger (donne une raison de collectionner sans casser l'équilibre).
 *  coins / xp : gains · drift : charge du mini-turbo · boost : durée des turbos · offroad : moins de ralentissement hors piste
 *  special : charge de la jauge Cœur · luck : meilleurs objets · shieldStart : bouclier au départ · trick : turbo de figure
 */
export const ACCESSORIES = [
  { id: 'none', name: { fr: 'Aucun', en: 'None' }, rarity: 'common', price: null, perk: null },
  { id: 'bowtie', name: { fr: 'Nœud Pap’', en: 'Bow Tie' }, rarity: 'common', price: { coins: 800 }, perk: { xp: 0.08 } },
  { id: 'cap', name: { fr: 'Casquette Turbo', en: 'Turbo Cap' }, rarity: 'common', price: { coins: 1400 }, perk: { coins: 0.06 } },
  { id: 'scarf', name: { fr: 'Écharpe du Vent', en: 'Wind Scarf' }, rarity: 'common', price: { coins: 2400 }, perk: { drift: 0.1 } },
  { id: 'headband', name: { fr: 'Bandeau Pilote', en: 'Racer Headband' }, rarity: 'rare', price: { coins: 4200 }, perk: { boost: 0.1 } },
  { id: 'cape', name: { fr: 'Cape de Héros', en: 'Hero Cape' }, rarity: 'rare', price: { coins: 6500 }, perk: { offroad: 0.3 } },
  { id: 'horns', name: { fr: 'Cornes Coquines', en: 'Cheeky Horns' }, rarity: 'rare', price: { ads: 3 }, perk: { special: 0.12 } },
  { id: 'shades', name: { fr: 'Lunettes Pixel', en: 'Pixel Shades' }, rarity: 'epic', price: { credits: 120 }, perk: { luck: 0.15 } },
  { id: 'halo', name: { fr: 'Auréole Photon', en: 'Photon Halo' }, rarity: 'epic', price: { credits: 200 }, perk: { shieldStart: 1, special: 0.05 } },
  { id: 'wings', name: { fr: 'Ailes Jet', en: 'Jet Wings' }, rarity: 'epic', price: { credits: 320 }, perk: { trick: 0.3, boost: 0.06 } },
  { id: 'crown', name: { fr: 'Couronne Cosmique', en: 'Cosmic Crown' }, rarity: 'legendary', price: { credits: 500 }, perk: { coins: 0.15, xp: 0.1 } },
];

/**
 * Armes spéciales : déclenchées quand la jauge Cœur est pleine.
 * charge : vitesse de remplissage de la jauge (1 = normal)
 */
export const WEAPONS = [
  { id: 'blaster', name: { fr: 'Blaster Cœur', en: 'Heart Blaster' }, rarity: 'common', price: null, charge: 1, color: '#ff5c9d',
    desc: { fr: '3 tirs cœur à tête chercheuse.', en: '3 homing heart shots.' } },
  { id: 'saber', name: { fr: 'Sabre Laser', en: 'Laser Saber' }, rarity: 'rare', price: { coins: 5000 }, charge: 1.05, color: '#39e4ff',
    desc: { fr: 'Tourbillon invincible : renverse tout ce qu’il touche.', en: 'Invincible spin: knocks over anyone it touches.' } },
  { id: 'boomerang', name: { fr: 'Étoile Boomerang', en: 'Star Boomerang' }, rarity: 'rare', price: { coins: 9500 }, charge: 1.1, color: '#ffd24a',
    desc: { fr: 'Frappe à l’aller ET au retour.', en: 'Hits on the way out AND back.' } },
  { id: 'hammer', name: { fr: 'Méga Marteau', en: 'Mega Hammer' }, rarity: 'epic', price: { coins: 16000 }, charge: 0.95, color: '#ff9a3d',
    desc: { fr: 'Onde de choc : renverse les karts proches et efface les pièges.', en: 'Shockwave: spins nearby karts and clears traps.' } },
  { id: 'plasma', name: { fr: 'Canon Plasma', en: 'Plasma Cannon' }, rarity: 'epic', price: { credits: 260 }, charge: 1.05, color: '#7dff5a',
    desc: { fr: 'Boule de plasma chercheuse, explosion large.', en: 'Homing plasma orb, wide blast.' } },
  { id: 'rocket', name: { fr: 'Lance-Fusées', en: 'Rocket Launcher' }, rarity: 'legendary', price: { credits: 450 }, charge: 1.1, color: '#ff4f4f',
    desc: { fr: 'Fusée qui vise les deux karts devant toi.', en: 'Rocket that hunts the two karts ahead.' } },
  { id: 'thunder', name: { fr: 'Sceptre Foudre', en: 'Thunder Scepter' }, rarity: 'legendary', price: { credits: 700 }, charge: 1, color: '#b58cff',
    desc: { fr: 'La foudre frappe TOUS les karts devant toi.', en: 'Lightning strikes ALL karts ahead.' } },
];

/**
 * Karts : stats de 1 à 5 (vitesse, accélération, maniabilité, dérapage).
 * Les écarts sont volontairement faibles : le pilotage compte plus que l'achat.
 * La carrosserie prend les couleurs du skin équipé.
 */
export const KARTS = [
  { id: 'coeur', name: { fr: 'Bolide Cœur', en: 'Heart Racer' }, rarity: 'common', price: null, stats: { speed: 3, accel: 3, handling: 3, drift: 3 }, shape: 'round' },
  { id: 'bonbon', name: { fr: 'Fusée Bonbon', en: 'Candy Rocket' }, rarity: 'common', price: { coins: 3500 }, stats: { speed: 3, accel: 5, handling: 3, drift: 2 }, shape: 'rocket' },
  { id: 'requin', name: { fr: 'Turbo Requin', en: 'Turbo Shark' }, rarity: 'rare', price: { coins: 11000 }, stats: { speed: 5, accel: 2, handling: 2, drift: 4 }, shape: 'shark' },
  { id: 'buggy', name: { fr: 'Buggy Cristal', en: 'Crystal Buggy' }, rarity: 'rare', price: { ads: 4 }, stats: { speed: 3, accel: 4, handling: 4, drift: 2 }, shape: 'buggy', offroad: 0.35 },
  { id: 'givre', name: { fr: 'Traîneau Givre', en: 'Frost Sled' }, rarity: 'epic', price: { credits: 180 }, stats: { speed: 4, accel: 3, handling: 3, drift: 5 }, shape: 'sled' },
  { id: 'glitch', name: { fr: 'Glitch-X', en: 'Glitch-X' }, rarity: 'legendary', price: { credits: 420 }, stats: { speed: 5, accel: 4, handling: 4, drift: 4 }, shape: 'glitch' },
];

/** Multiplicateurs physiques dérivés des stats. */
export const kartMods = (k) => ({
  speed: 1 + (k.stats.speed - 3) * 0.022,
  accel: 1 + (k.stats.accel - 3) * 0.09,
  handling: 1 + (k.stats.handling - 3) * 0.07,
  drift: 1 + (k.stats.drift - 3) * 0.08,
  offroad: k.offroad || 0,
});

/* ------------------------------ Pilotes rivaux ------------------------------ */

/**
 * Les 7 familles de monstres de Layjou Battle deviennent les rivaux.
 * pace : rythme de base · corner : vitesse en virage · aggro : usage des objets · fav : objet fétiche
 */
export const RIVALS = [
  { id: 'gloupy', type: 'blob', name: 'Gloupy', pal: 'grape', kart: '#9b5cff', pace: 0.955, corner: 0.9, aggro: 0.45, fav: 'slime', tag: { fr: 'Gélatine joyeuse', en: 'Jolly jelly' } },
  { id: 'pinz', type: 'crab', name: 'Pinz', pal: 'orange', kart: '#ff9a3d', pace: 0.965, corner: 0.95, aggro: 0.7, fav: 'bomb', tag: { fr: 'Pince-sans-rire', en: 'Snappy joker' } },
  { id: 'bzzork', type: 'wasp', name: 'Bzzork', pal: 'yellow', kart: '#ffd23c', pace: 0.975, corner: 1.0, aggro: 0.6, fav: 'bolt3', tag: { fr: 'Pilote piquant', en: 'Stinging speedster' } },
  { id: 'rokko', type: 'golem', name: 'Rokko', pal: 'slate', kart: '#8892a8', pace: 0.95, corner: 0.85, aggro: 0.4, fav: 'shield', heavy: true, tag: { fr: 'Roc inarrêtable', en: 'Unstoppable rock' } },
  { id: 'tentakl', type: 'octo', name: 'Tentakl', pal: 'pink', kart: '#ff7ab8', pace: 0.97, corner: 1.05, aggro: 0.55, fav: 'slime', tag: { fr: 'Huit bras, zéro frein', en: 'Eight arms, no brakes' } },
  { id: 'drakito', type: 'dragon', name: 'Drakito', pal: 'green', kart: '#4fd08a', pace: 0.985, corner: 0.98, aggro: 0.5, fav: 'turbo', tag: { fr: 'Souffle turbo', en: 'Turbo breath' } },
  { id: 'antijou', type: 'antijou', name: 'Anti-Jou', pal: 'glitch', kart: '#7a1fd1', pace: 1.0, corner: 1.02, aggro: 0.65, fav: 'heart', tag: { fr: 'Le grand rival', en: 'The arch-rival' } },
];

export const MONSTER_PALS = {
  grape: { a: '#9b5cff', b: '#6a2fd6', c: '#ffd24a', belly: '#c9a6ff', glow: '#e1c9ff' },
  lime: { a: '#8be33a', b: '#4eaa16', c: '#ff5c9d', belly: '#d0f79a', glow: '#e6ffb8' },
  lava: { a: '#ff7a2f', b: '#d13a12', c: '#ffe14a', belly: '#ffc078', glow: '#fff0a6' },
  ice: { a: '#7fd8ff', b: '#3c9be0', c: '#ffffff', belly: '#d2f1ff', glow: '#ffffff' },
  orange: { a: '#ff9a3d', b: '#e0641a', c: '#39e4ff', belly: '#ffd0a0', glow: '#bff6ff' },
  crimson: { a: '#f0425a', b: '#b01a3a', c: '#ffd24a', belly: '#ff9aa8', glow: '#fff0a6' },
  steel: { a: '#8fa3c2', b: '#56688a', c: '#ff5c9d', belly: '#c8d5ea', glow: '#ffc2dc' },
  yellow: { a: '#ffd23c', b: '#e09a10', c: '#2b2440', belly: '#fff0a6', glow: '#fff7cf' },
  blue: { a: '#4aa8ff', b: '#1f62d6', c: '#101c40', belly: '#b9dcff', glow: '#d9ecff' },
  red: { a: '#ff5a4a', b: '#c0261c', c: '#2b0f14', belly: '#ffb1a6', glow: '#ffd9d2' },
  pink: { a: '#ff7ab8', b: '#d6418a', c: '#ffe14a', belly: '#ffc4e0', glow: '#ffe1f0' },
  abyss: { a: '#1fb7a6', b: '#0b6f78', c: '#ff5c9d', belly: '#8cebd9', glow: '#c6fff4' },
  frost: { a: '#a9c7ff', b: '#6a86e0', c: '#ffffff', belly: '#dfe9ff', glow: '#ffffff' },
  slate: { a: '#8892a8', b: '#566078', c: '#39e4ff', belly: '#b8c0d2', glow: '#a8f3ff' },
  amber: { a: '#e0a04a', b: '#a8641e', c: '#ffe14a', belly: '#f3cf94', glow: '#fff0a6' },
  amethyst: { a: '#b06bff', b: '#6e2fd0', c: '#ff7ad1', belly: '#dcc0ff', glow: '#ffc9f0' },
  glacier: { a: '#9fe0f5', b: '#4f9fc9', c: '#ffffff', belly: '#d9f5ff', glow: '#ffffff' },
  green: { a: '#4fd08a', b: '#1f8f58', c: '#ffd24a', belly: '#c6f3d6', glow: '#fff0a6' },
  snow: { a: '#dfeeff', b: '#8fb0e0', c: '#56d6f5', belly: '#ffffff', glow: '#c9f6ff' },
  royal: { a: '#7a5cff', b: '#3f2bb0', c: '#56d6f5', belly: '#c6b8ff', glow: '#c9f6ff' },
  glitch: { a: '#2a2f55', b: '#141731', c: '#ff2bd6', belly: '#4a4f85', glow: '#00f0ff' },
};

/* ---------------------------------- Mondes ---------------------------------- */

/**
 * Chaque monde est une Coupe : 3 courses + 1 défi.
 * variants : palette de chaque rival dans ce monde (repris des niveaux de Layjou Battle).
 * Circuits : mini-langage de tracé (voir track.js) :
 *   S60      ligne droite de 60 segments
 *   R3x90    virage à droite d'intensité 3 sur 90 segments (L = gauche)
 *   ^20 / v20  monte / descend de 20 (en cumul) pendant le tronçon
 *   !b boost · !i boîtes à objets · !c pièces · !j tremplin · !t tunnel · !o obstacles
 */
export const WORLDS = [
  {
    id: 'candy', name: { fr: 'Bonbon-Ville', en: 'Candy City' }, color: '#ff8fbf',
    variants: { gloupy: 'grape', pinz: 'orange', bzzork: 'yellow', rokko: 'pink', tentakl: 'lime', drakito: 'green', antijou: 'glitch' },
    tracks: [
      { id: 'candy1', name: { fr: 'Boulevard Guimauve', en: 'Marshmallow Boulevard' },
        layout: 'S70!c R2x80!i S40 L3x90^20 S50!b R4x80v20!c S60!i L2x70 R3x90^10 S40!c L4x100v10 S30!b R2x60!i S50!c L3x80 S40' },
      { id: 'candy2', name: { fr: 'Spirale Sucette', en: 'Lollipop Spiral' },
        layout: 'S60!c L3x70!i S30^25!j S40v25!c R5x110 S40!b L2x60!i R4x90^20!c S30v20 L5x120!i S50!b R3x80!c S40^15 L2x60v15 S40' },
      { id: 'candy3', name: { fr: 'Pont Caramel', en: 'Caramel Bridge' },
        layout: 'S50!c R3x80^30!i S80!c!b L2x60 R2x60v30 S40!i L5x100!c S40^20!j S40v20 R4x100!b S50!i!c L3x70^15 R3x70v15!c S40!b' },
    ],
  },
  {
    id: 'harbor', name: { fr: 'Port Néon', en: 'Neon Harbor' }, color: '#39e4ff', night: true,
    variants: { gloupy: 'blue', pinz: 'steel', bzzork: 'blue', rokko: 'slate', tentakl: 'pink', drakito: 'abyss', antijou: 'glitch' },
    tracks: [
      { id: 'harbor1', name: { fr: 'Quais Lumineux', en: 'Glowing Docks' },
        layout: 'S60!c L3x80!i S50!b R2x60 S40!t!c R4x90!t L3x80!t!i S40!b R3x80^20!c S40v20 L4x100!i S50!c R2x70!b S40' },
      { id: 'harbor2', name: { fr: 'Tunnel Abyssal', en: 'Abyssal Tunnel' },
        layout: 'S50!c R2x60!i S40v20!t L3x100!t!c R3x100!t!b S60^20!t!i L5x110!c S40!j R4x90!i S50!b L2x70!c R3x80 S40' },
      { id: 'harbor3', name: { fr: 'Digue des Vagues', en: 'Wave Breakwater' },
        layout: 'S70!c!b L2x60^15 R2x60v15!i L2x60^15!c R2x60v15 S40!i R5x110!c S40!t!b L4x90!t!i S40^25!j S30v25!c R3x90!i L3x90!c S50!b' },
    ],
  },
  {
    id: 'desert', name: { fr: 'Désert de Cristal', en: 'Crystal Desert' }, color: '#ffc23c',
    variants: { gloupy: 'lava', pinz: 'amber', bzzork: 'red', rokko: 'amber', tentakl: 'orange', drakito: 'green', antijou: 'glitch' },
    tracks: [
      { id: 'desert1', name: { fr: 'Dunes Prismatiques', en: 'Prism Dunes' },
        layout: 'S60!c R2x70^25!i S40v25!b L3x90^20!c S40v20!o R4x100!i S50!c!b L2x60^30 S50v30!j R3x80!i L4x90!c S40!b' },
      { id: 'desert2', name: { fr: 'Canyon Quartz', en: 'Quartz Canyon' },
        layout: 'S50!c L4x90!i S30!o R4x90!c S40!b L5x110^20!i S50v20!c R3x70!o L3x70!i S40!j R5x110!c S50!b L2x60!i S40' },
      { id: 'desert3', name: { fr: 'Oasis Miroir', en: 'Mirror Oasis' },
        layout: 'S80!c!b R3x100!i L3x100^25!o S40v25!c R5x120!i S40!b L2x60!c S30^30!j S30v30 L4x100!i R2x60!c S60!b L3x80!o!i S40' },
    ],
  },
  {
    id: 'frost', name: { fr: 'Lune Givrée', en: 'Frost Moon' }, color: '#a9c7ff', night: true, ice: true,
    variants: { gloupy: 'ice', pinz: 'frost', bzzork: 'glacier', rokko: 'glacier', tentakl: 'frost', drakito: 'snow', antijou: 'glitch' },
    tracks: [
      { id: 'frost1', name: { fr: 'Piste Aurore', en: 'Aurora Run' },
        layout: 'S60!c L2x80!i S50!b R3x90^20!c S40v20 L4x100!i S40!c R2x70^25!j S40v25!b L3x90!i R4x100!c S50!b' },
      { id: 'frost2', name: { fr: 'Glacier Glissant', en: 'Slippery Glacier' },
        layout: 'S50!c R4x90!i S40v25!c L4x90!o S40^25!b R5x120!i S40!c L2x60!j S40 R3x80!i L5x110!c S50!b R2x60 S40' },
      { id: 'frost3', name: { fr: 'Cratère Étoilé', en: 'Starry Crater' },
        layout: 'S60!c!b L3x80^30!i S40v30!j R4x100!c S50!t!b L3x90!t!i S40^20!c R5x110v20!o S40!i L2x70!c R3x80!b S50!i L3x80 S40' },
    ],
  },
  {
    id: 'glitch', name: { fr: 'Cœur du Glitch', en: 'Glitch Core' }, color: '#ff2bd6', night: true,
    variants: { gloupy: 'glitch', pinz: 'glitch', bzzork: 'glitch', rokko: 'glitch', tentakl: 'glitch', drakito: 'glitch', antijou: 'glitch' },
    tracks: [
      { id: 'glitch1', name: { fr: 'Autoroute Binaire', en: 'Binary Highway' },
        layout: 'S70!c!b R3x80!i S40!t!c L4x100!t!b S40!i R2x60^25!j S40v25!c L5x110!i S40!b R4x90!c!o L2x60!i S50!b' },
      { id: 'glitch2', name: { fr: 'Labyrinthe Pixel', en: 'Pixel Maze' },
        layout: 'S50!c L5x100!i R5x100!c S30!b L4x90!t!i R4x90!t!c S40^30!j S30v30!b L3x80!o!i R3x80!c S40!b L5x110!i S40' },
      { id: 'glitch3', name: { fr: 'Noyau Anti-Jou', en: 'Anti-Jou Core' },
        layout: 'S60!c!b R4x90!i S40^30!c L5x110v30!o S40!t!b R3x90!t!i L3x90!t!c S40^25!j S40v25!b R5x120!i!c L4x100!o S50!b R2x60!i S40' },
    ],
  },
];

/** Défi de fin de Coupe (4ᵉ épreuve). type : 'coins' | 'chrono' | 'duel' */
export const CHALLENGES = [
  { world: 0, type: 'coins', track: 0, goal: [50, 80, 110], time: 60, name: { fr: 'Course aux pièces', en: 'Coin Rush' } },
  { world: 1, type: 'duel', track: 1, rival: 'tentakl', boss: { name: 'Krakenox', pal: 'abyss' }, laps: 2, name: { fr: 'Duel : Krakenox', en: 'Duel: Krakenox' } },
  { world: 2, type: 'chrono', track: 2, laps: 2, name: { fr: 'Contre-la-montre', en: 'Time Trial' } },
  { world: 3, type: 'duel', track: 0, rival: 'drakito', boss: { name: 'Drakonis', pal: 'royal' }, laps: 2, name: { fr: 'Duel : Drakonis', en: 'Duel: Drakonis' } },
  { world: 4, type: 'duel', track: 2, rival: 'antijou', boss: { name: 'Anti-Jou', pal: 'glitch' }, laps: 3, name: { fr: 'Duel final : Anti-Jou', en: 'Final duel: Anti-Jou' } },
];

/** Liste plate des épreuves : 5 mondes × (3 courses + 1 défi) = 20 épreuves. */
export const EVENTS = WORLDS.flatMap((w, wi) => [
  ...w.tracks.map((tr, ti) => ({ key: `${w.id}-${ti}`, kind: 'race', world: wi, track: ti, trackId: tr.id, name: tr.name, laps: 3 })),
  (() => { const c = CHALLENGES[wi]; return { key: `${w.id}-x`, kind: c.type, world: wi, track: c.track, trackId: w.tracks[c.track].id, name: c.name, challenge: c, laps: c.laps || 2 }; })(),
]);
export const eventByKey = (k) => EVENTS.find((e) => e.key === k);

/** Seuils de score pour 1, 2 et 3 étoiles (courses). */
export const starThresholds = (world) => [1300 + world * 120, 2300 + world * 160, 3200 + world * 220];
/** Étoiles nécessaires pour débloquer le monde suivant. */
export const WORLD_UNLOCK = [0, 6, 14, 23, 33];

/* ---------------------------------- Objets ---------------------------------- */

export const ITEMS = {
  turbo: { name: { fr: 'Pile Turbo', en: 'Turbo Cell' }, color: '#ffd24a' },
  turbo3: { name: { fr: 'Triple Turbo', en: 'Triple Turbo' }, color: '#ffb21f', uses: 3 },
  slime: { name: { fr: 'Flaque Gloupy', en: 'Gloopy Puddle' }, color: '#9b5cff' },
  heart: { name: { fr: 'Cœur Chercheur', en: 'Homing Heart' }, color: '#ff5c9d' },
  bolt3: { name: { fr: 'Triple Blaster', en: 'Triple Blaster' }, color: '#39e4ff', uses: 3 },
  shield: { name: { fr: 'Bulle Bouclier', en: 'Bubble Shield' }, color: '#8ff5ff' },
  magnet: { name: { fr: 'Aimant à Pièces', en: 'Coin Magnet' }, color: '#ff8a3d' },
  bomb: { name: { fr: 'Bombe Pinz', en: 'Pinz Bomb' }, color: '#3a3f66' },
  star: { name: { fr: 'Mode Prisme', en: 'Prism Mode' }, color: '#ff8fe0' },
  storm: { name: { fr: 'Orage Glitch', en: 'Glitch Storm' }, color: '#b58cff' },
};

/** Probabilités par tranche de position (1er, 2-3, 4-5, 6-8) : objets de rattrapage pour les derniers. */
export const ITEM_ODDS = [
  { turbo: 10, slime: 30, heart: 4, bolt3: 16, shield: 24, magnet: 12, bomb: 4, star: 0, storm: 0, turbo3: 0 },
  { turbo: 15, slime: 18, heart: 15, bolt3: 16, shield: 14, magnet: 10, bomb: 10, star: 1, storm: 0, turbo3: 1 },
  { turbo: 18, slime: 8, heart: 20, bolt3: 14, shield: 9, magnet: 8, bomb: 12, star: 4, storm: 1, turbo3: 6 },
  { turbo: 16, slime: 4, heart: 20, bolt3: 9, shield: 5, magnet: 5, bomb: 10, star: 10, storm: 6, turbo3: 15 },
];

/** Points d'action (score de course, comme une note de style). */
export const POINTS = {
  place: [1200, 1000, 860, 720, 580, 450, 330, 220],
  drift: [40, 80, 140], coin: 12, box: 10, hit: 110, special: 150, overtake: 25, trick: 60, start: 120, dodge: 40,
};

export const xpForLevel = (lvl) => Math.round(80 + 55 * Math.pow(lvl - 1, 1.28));

/* ---------------------------- Boucle quotidienne ---------------------------- */

export const DAILY_REWARDS = [
  { coins: 200 }, { coins: 400 }, { credits: 10 }, { coins: 800 }, { credits: 20 }, { coins: 1500 }, { credits: 50, chest: true },
];

export const WHEEL = [
  { coins: 150, w: 22 }, { credits: 5, w: 14 }, { coins: 350, w: 18 }, { credits: 12, w: 8 },
  { coins: 700, w: 12 }, { turbo: 1, w: 12 }, { coins: 2000, w: 5 }, { credits: 50, w: 2 },
];

/** Modèles de missions quotidiennes — `n` = objectif selon le niveau, la récompense suit. */
export const MISSIONS = [
  { id: 'podium', n: [2, 4, 6], text: { fr: 'Monte sur {n} podiums', en: 'Finish on the podium {n} times' }, reward: 140 },
  { id: 'win', n: [1, 2, 4], text: { fr: 'Gagne {n} courses', en: 'Win {n} races' }, reward: 160 },
  { id: 'drift', n: [8, 15, 25], text: { fr: 'Réussis {n} mini-turbos', en: 'Land {n} mini-turbos' }, reward: 110 },
  { id: 'ultra', n: [2, 4, 7], text: { fr: 'Déclenche {n} turbos dorés', en: 'Trigger {n} golden turbos' }, reward: 130 },
  { id: 'hit', n: [4, 8, 14], text: { fr: 'Touche {n} rivaux avec des objets', en: 'Hit rivals {n} times with items' }, reward: 120 },
  { id: 'coins', n: [40, 80, 140], text: { fr: 'Ramasse {n} pièces en course', en: 'Pick up {n} coins in races' }, reward: 100 },
  { id: 'special', n: [2, 4, 6], text: { fr: 'Lance {n} attaques spéciales', en: 'Fire {n} special attacks' }, reward: 120 },
  { id: 'trick', n: [3, 6, 10], text: { fr: 'Fais {n} figures sur les tremplins', en: 'Do {n} ramp tricks' }, reward: 110 },
  { id: 'overtake', n: [15, 30, 50], text: { fr: 'Dépasse {n} rivaux', en: 'Overtake {n} rivals' }, reward: 110 },
  { id: 'stars', n: [3, 6, 9], text: { fr: 'Gagne {n} étoiles', en: 'Earn {n} stars' }, reward: 150 },
];

export const RARITY = {
  common: { fr: 'Commun', en: 'Common', color: '#8fb3ff' },
  rare: { fr: 'Rare', en: 'Rare', color: '#39e4ff' },
  epic: { fr: 'Épique', en: 'Epic', color: '#c58cff' },
  legendary: { fr: 'Légendaire', en: 'Legendary', color: '#ffd24a' },
};

export const byId = (list, id) => list.find((x) => x.id === id) || list[0];
