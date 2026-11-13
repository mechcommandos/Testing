/* ------------------------------------------------------------------ *
 *  LayJou Battle — catalogue du jeu (skins, accessoires, armes,
 *  améliorations, monstres, mondes, récompenses).
 * ------------------------------------------------------------------ */

/** price: { coins } | { credits } | { ads: n } (vidéos à regarder) | { level: n } | { iap: productId } | null (gratuit) */

export const SKINS = [
  { id: 'classic', name: { fr: 'LayJou Classique', en: 'Classic LayJou' }, rarity: 'common', price: null,
    pal: { main: '#1cc3d2', mainDark: '#0e9fb3', accent: '#ff5c9d', accentLight: '#ff9cc4', shell: '#ffffff', shellShade: '#d5e2f3', visor: '#0c3a96', visorLight: '#1a56c4', eye: '#1f7fe8', eyeRing: '#56d6f5', mouth: '#f0506e', tongue: '#ff9a8a' } },
  { id: 'fraise', name: { fr: 'Fraise Pop', en: 'Strawberry Pop' }, rarity: 'common', price: { coins: 1200 },
    pal: { main: '#ff5d7a', mainDark: '#e03a5c', accent: '#7be35a', accentLight: '#b9f59f', shell: '#fff6f2', shellShade: '#f3d6d0', visor: '#5a1030', visorLight: '#8a1f4c', eye: '#ff7fa6', eyeRing: '#ffc2d4', mouth: '#ff8fb0', tongue: '#ffd0dc' } },
  { id: 'citron', name: { fr: 'Zeste Citron', en: 'Lemon Zest' }, rarity: 'common', price: { coins: 2500 },
    pal: { main: '#ffc928', mainDark: '#f09a12', accent: '#ff7a3d', accentLight: '#ffb48c', shell: '#fffdf0', shellShade: '#efe4bd', visor: '#3d2a08', visorLight: '#6b4a12', eye: '#ffb11f', eyeRing: '#ffe27a', mouth: '#ff6b4a', tongue: '#ffb199' } },
  { id: 'menthe', name: { fr: 'Menthe Givrée', en: 'Frosty Mint' }, rarity: 'rare', price: { coins: 4500 },
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
  { id: 'champion', name: { fr: 'Champion Glitch', en: 'Glitch Champion' }, rarity: 'legendary', price: { stage: 25 },
    pal: { main: '#16e0a0', mainDark: '#0aa878', accent: '#ffe14a', accentLight: '#fff3a6', shell: '#10132e', shellShade: '#090b1e', visor: '#020308', visorLight: '#0d2b2a', eye: '#16e0a0', eyeRing: '#b6ffe6', mouth: '#ffe14a', tongue: '#fff3a6' } },
];

/** Palette d'Anti-Jou (boss final), jamais équipable. */
export const ANTI_PAL = { main: '#7a1fd1', mainDark: '#4b0f8a', accent: '#ff2b5c', accentLight: '#ff8aa5', shell: '#262a45', shellShade: '#171a2e', visor: '#05030c', visorLight: '#200a3a', eye: '#ff2b5c', eyeRing: '#ff9db3', mouth: '#ff2b5c', tongue: '#ff9db3' };

/** perk: bonus passif léger (ne casse pas l'équilibre, donne une raison de collectionner). */
export const ACCESSORIES = [
  { id: 'none', name: { fr: 'Aucun', en: 'None' }, rarity: 'common', price: null, perk: null },
  { id: 'bowtie', name: { fr: 'Nœud Pap’', en: 'Bow Tie' }, rarity: 'common', price: { coins: 600 }, perk: { xp: 0.05 } },
  { id: 'cap', name: { fr: 'Casquette Turbo', en: 'Turbo Cap' }, rarity: 'common', price: { coins: 1000 }, perk: { coins: 0.05 } },
  { id: 'scarf', name: { fr: 'Écharpe du Vent', en: 'Wind Scarf' }, rarity: 'common', price: { coins: 1800 }, perk: { dodge: 0.1 } },
  { id: 'headband', name: { fr: 'Bandeau Dojo', en: 'Dojo Headband' }, rarity: 'rare', price: { coins: 3200 }, perk: { atk: 0.05 } },
  { id: 'cape', name: { fr: 'Cape de Héros', en: 'Hero Cape' }, rarity: 'rare', price: { coins: 5000 }, perk: { hp: 0.08 } },
  { id: 'horns', name: { fr: 'Cornes Coquines', en: 'Cheeky Horns' }, rarity: 'rare', price: { ads: 3 }, perk: { crit: 0.04 } },
  { id: 'shades', name: { fr: 'Lunettes Pixel', en: 'Pixel Shades' }, rarity: 'epic', price: { credits: 120 }, perk: { crit: 0.06 } },
  { id: 'halo', name: { fr: 'Auréole Photon', en: 'Photon Halo' }, rarity: 'epic', price: { credits: 200 }, perk: { energy: 0.15 } },
  { id: 'wings', name: { fr: 'Ailes Jet', en: 'Jet Wings' }, rarity: 'epic', price: { credits: 320 }, perk: { dodge: 0.2, hp: 0.05 } },
  { id: 'crown', name: { fr: 'Couronne Cosmique', en: 'Cosmic Crown' }, rarity: 'legendary', price: { credits: 500 }, perk: { coins: 0.15, xp: 0.1 } },
];

/**
 * dmg: multiplicateur d'ATK · cd: recharge (s) · stagger: charge de la jauge d'étourdissement
 * kind: 'shot' (projectile) | 'melee'
 */
export const WEAPONS = [
  { id: 'blaster', name: { fr: 'Blaster Cœur', en: 'Heart Blaster' }, rarity: 'common', price: null, kind: 'shot', dmg: 2.2, cd: 2.4, stagger: 14, color: '#ff5c9d',
    desc: { fr: 'Tir rapide et fiable.', en: 'Fast and reliable shot.' } },
  { id: 'saber', name: { fr: 'Sabre Laser', en: 'Laser Saber' }, rarity: 'rare', price: { coins: 3500 }, kind: 'melee', dmg: 3.0, cd: 2.8, stagger: 24, color: '#39e4ff',
    desc: { fr: 'Triple entaille qui déséquilibre.', en: 'Triple slash that breaks balance.' } },
  { id: 'boomerang', name: { fr: 'Étoile Boomerang', en: 'Star Boomerang' }, rarity: 'rare', price: { coins: 7500 }, kind: 'shot', dmg: 1.7, hits: 2, cd: 2.6, stagger: 12, color: '#ffd24a',
    desc: { fr: 'Frappe à l’aller ET au retour.', en: 'Hits on the way out AND back.' } },
  { id: 'hammer', name: { fr: 'Méga Marteau', en: 'Mega Hammer' }, rarity: 'epic', price: { coins: 14000 }, kind: 'melee', dmg: 4.4, cd: 4.2, stagger: 55, color: '#ff9a3d',
    desc: { fr: 'Lent mais étourdit presque à coup sûr.', en: 'Slow, but almost always stuns.' } },
  { id: 'plasma', name: { fr: 'Canon Plasma', en: 'Plasma Cannon' }, rarity: 'epic', price: { credits: 260 }, kind: 'shot', dmg: 3.4, cd: 2.9, stagger: 20, burn: 0.5, color: '#7dff5a',
    desc: { fr: 'Brûle l’ennemi pendant 3 s.', en: 'Burns the enemy for 3 s.' } },
  { id: 'rocket', name: { fr: 'Lance-Fusées', en: 'Rocket Launcher' }, rarity: 'legendary', price: { credits: 450 }, kind: 'shot', dmg: 5.6, cd: 4.6, stagger: 40, color: '#ff4f4f',
    desc: { fr: 'Explosion dévastatrice.', en: 'Devastating explosion.' } },
  { id: 'thunder', name: { fr: 'Sceptre Foudre', en: 'Thunder Scepter' }, rarity: 'legendary', price: { credits: 700 }, kind: 'shot', dmg: 4.6, cd: 3.0, stagger: 30, shock: 0.8, color: '#b58cff',
    desc: { fr: 'Éclair qui paralyse brièvement.', en: 'Lightning that briefly paralyzes.' } },
];

export const UPGRADES = [
  { id: 'atk', name: { fr: 'Puissance', en: 'Power' }, desc: { fr: '+10 % de dégâts', en: '+10% damage' }, base: 60, growth: 1.17, max: 60, icon: 'fist' },
  { id: 'hp', name: { fr: 'Blindage', en: 'Armor' }, desc: { fr: '+12 % de points de vie', en: '+12% health' }, base: 50, growth: 1.17, max: 60, icon: 'shield' },
  { id: 'energy', name: { fr: 'Réacteur', en: 'Reactor' }, desc: { fr: '+8 % de charge du Super', en: '+8% Super charge' }, base: 90, growth: 1.24, max: 15, icon: 'bolt' },
  { id: 'crit', name: { fr: 'Précision', en: 'Precision' }, desc: { fr: '+2 % de coups critiques', en: '+2% critical hits' }, base: 110, growth: 1.26, max: 15, icon: 'target' },
];

export const upgradeCost = (u, lvl) => Math.round((u.base * Math.pow(u.growth, lvl)) / 5) * 5;
/** Le niveau du joueur plafonne les améliorations : donne un but à l'XP. */
export const upgradeCap = (u, playerLevel) => Math.min(u.max, 3 + playerLevel * 2);

export const xpForLevel = (lvl) => Math.round(60 + 45 * Math.pow(lvl - 1, 1.3));

/* ------------------------------ Monstres ------------------------------ */

export const ATTACKS = {
  swipe: { wind: 0.95, strike: 0.26, recover: 0.75, dmg: 1.0, block: true, type: 'melee' },
  slam: { wind: 1.3, strike: 0.34, recover: 1.05, dmg: 1.7, block: true, type: 'melee', heavy: true },
  rush: { wind: 1.15, strike: 0.3, recover: 1.15, dmg: 1.5, block: false, type: 'melee', heavy: true },
  shot: { wind: 0.85, strike: 0.2, recover: 0.6, dmg: 0.8, block: true, type: 'proj', count: 1 },
  volley: { wind: 1.0, strike: 0.9, recover: 0.7, dmg: 0.55, block: true, type: 'proj', count: 3 },
  wave: { wind: 1.3, strike: 0.5, recover: 1.15, dmg: 1.4, block: false, type: 'wave', heavy: true },
  beam: { wind: 1.4, strike: 1.25, recover: 1.3, dmg: 0.42, block: true, type: 'beam', ticks: 5 },
};

/** attacks: [id, poids, enragéSeulement?] */
export const ARCHETYPES = {
  blob: { hp: 1.0, dmg: 0.95, gap: [1.3, 2.3], attacks: [['swipe', 5], ['slam', 3], ['shot', 2]] },
  crab: { hp: 1.1, dmg: 1.0, gap: [1.2, 2.2], attacks: [['swipe', 5], ['slam', 3], ['rush', 2]] },
  wasp: { hp: 0.85, dmg: 1.05, gap: [1.0, 1.9], attacks: [['swipe', 3], ['volley', 4], ['rush', 3]] },
  golem: { hp: 1.3, dmg: 1.1, gap: [1.5, 2.5], attacks: [['swipe', 4], ['slam', 3], ['wave', 3]] },
  octo: { hp: 1.05, dmg: 1.0, gap: [1.1, 2.1], attacks: [['swipe', 4], ['volley', 3], ['slam', 2], ['rush', 2, true]] },
  dragon: { hp: 1.2, dmg: 1.15, gap: [1.2, 2.1], attacks: [['swipe', 3], ['volley', 3], ['wave', 2], ['beam', 2]] },
  antijou: { hp: 1.35, dmg: 1.15, gap: [1.0, 1.8], attacks: [['swipe', 3], ['shot', 2], ['rush', 2], ['beam', 2], ['wave', 2, true]] },
};

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

export const WORLDS = [
  { id: 'candy', name: { fr: 'Bonbon-Ville', en: 'Candy City' }, color: '#ff8fbf',
    stages: [
      { m: 'blob', pal: 'grape', name: 'Gloupy' },
      { m: 'crab', pal: 'orange', name: 'Pinz' },
      { m: 'wasp', pal: 'yellow', name: 'Bzzork' },
      { m: 'blob', pal: 'lime', name: 'Gloupy Toxik' },
      { m: 'crab', pal: 'crimson', name: 'Méga-Pinz', boss: true },
    ] },
  { id: 'harbor', name: { fr: 'Port Néon', en: 'Neon Harbor' }, color: '#39e4ff',
    stages: [
      { m: 'octo', pal: 'pink', name: 'Tentakl' },
      { m: 'wasp', pal: 'blue', name: 'Bzzork Azur' },
      { m: 'golem', pal: 'slate', name: 'Rokko' },
      { m: 'crab', pal: 'steel', name: 'Pinz d’Acier' },
      { m: 'octo', pal: 'abyss', name: 'Krakenox', boss: true },
    ] },
  { id: 'desert', name: { fr: 'Désert de Cristal', en: 'Crystal Desert' }, color: '#ffc23c',
    stages: [
      { m: 'golem', pal: 'amber', name: 'Rokko Ambre' },
      { m: 'blob', pal: 'lava', name: 'Gloupy Magma' },
      { m: 'wasp', pal: 'red', name: 'Bzzork Rubis' },
      { m: 'dragon', pal: 'green', name: 'Drakito', scale: 0.86 },
      { m: 'golem', pal: 'amethyst', name: 'Titan Quartz', boss: true },
    ] },
  { id: 'frost', name: { fr: 'Lune Givrée', en: 'Frost Moon' }, color: '#a9c7ff',
    stages: [
      { m: 'blob', pal: 'ice', name: 'Gloupy Givre' },
      { m: 'octo', pal: 'frost', name: 'Tentakl Polaire' },
      { m: 'golem', pal: 'glacier', name: 'Rokko Glacier' },
      { m: 'dragon', pal: 'snow', name: 'Drakito Neige', scale: 0.9 },
      { m: 'dragon', pal: 'royal', name: 'Drakonis', boss: true },
    ] },
  { id: 'glitch', name: { fr: 'Cœur du Glitch', en: 'Glitch Core' }, color: '#ff2bd6',
    stages: [
      { m: 'crab', pal: 'glitch', name: 'Pinz.exe' },
      { m: 'octo', pal: 'glitch', name: 'Tentakl.bug' },
      { m: 'golem', pal: 'glitch', name: 'Rokko.err' },
      { m: 'dragon', pal: 'glitch', name: 'Drakonis.sys' },
      { m: 'antijou', pal: 'glitch', name: 'Anti-Jou', boss: true },
    ] },
];

/** Liste plate des 25 niveaux. */
export const STAGES = WORLDS.flatMap((w, wi) =>
  w.stages.map((s, si) => ({ ...s, index: wi * 5 + si, world: wi, num: si + 1, worldId: w.id })),
);

export const stageCoins = (i, boss) => Math.round((80 * Math.pow(1.13, i) * (boss ? 2 : 1)) / 5) * 5;
export const stageXp = (i, boss) => Math.round((22 + 7 * i) * (boss ? 2 : 1));
export const stageEnemyHp = (i, boss) => 600 * Math.pow(1.105, i) * (boss ? 1.7 : 1);
export const stageEnemyDmg = (i, boss) => 9 * Math.pow(1.075, i) * (boss ? 1.2 : 1);

/* ---------------------------- Boucle quotidienne ---------------------------- */

export const DAILY_REWARDS = [
  { coins: 150 }, { coins: 300 }, { credits: 8 }, { coins: 600 }, { credits: 15 }, { coins: 1200 }, { credits: 40, chest: true },
];

export const WHEEL = [
  { coins: 100, w: 22 }, { credits: 5, w: 14 }, { coins: 250, w: 18 }, { credits: 12, w: 8 },
  { coins: 500, w: 12 }, { boost: 1, w: 12 }, { coins: 1500, w: 5 }, { credits: 50, w: 2 },
];

/** Modèles de missions quotidiennes — `n` = objectif, la récompense suit la difficulté. */
export const MISSIONS = [
  { id: 'win', n: [3, 5, 8], text: { fr: 'Gagne {n} combats', en: 'Win {n} battles' }, reward: 120 },
  { id: 'perfect', n: [5, 10, 15], text: { fr: 'Réussis {n} parades parfaites', en: 'Land {n} perfect blocks' }, reward: 100 },
  { id: 'dodge', n: [5, 10, 15], text: { fr: 'Esquive {n} attaques', en: 'Dodge {n} attacks' }, reward: 100 },
  { id: 'weak', n: [6, 12, 20], text: { fr: 'Touche {n} points faibles', en: 'Hit {n} weak points' }, reward: 100 },
  { id: 'ult', n: [2, 4, 6], text: { fr: 'Lance {n} Super Cœurs', en: 'Unleash {n} Super Hearts' }, reward: 110 },
  { id: 'stun', n: [3, 6, 10], text: { fr: 'Étourdis l’ennemi {n} fois', en: 'Stun the enemy {n} times' }, reward: 110 },
  { id: 'upgrade', n: [2, 4, 6], text: { fr: 'Achète {n} améliorations', en: 'Buy {n} upgrades' }, reward: 90 },
  { id: 'stars', n: [3, 6, 9], text: { fr: 'Gagne {n} étoiles', en: 'Earn {n} stars' }, reward: 130 },
  { id: 'combo', n: [15, 30, 50], text: { fr: 'Enchaîne {n} coups en combo', en: 'Chain {n} combo hits' }, reward: 90 },
  { id: 'arena', n: [3, 6, 10], text: { fr: 'Survis à {n} vagues d’Arène', en: 'Survive {n} Arena waves' }, reward: 140, needArena: true },
];

export const RARITY = {
  common: { fr: 'Commun', en: 'Common', color: '#8fb3ff' },
  rare: { fr: 'Rare', en: 'Rare', color: '#39e4ff' },
  epic: { fr: 'Épique', en: 'Epic', color: '#c58cff' },
  legendary: { fr: 'Légendaire', en: 'Legendary', color: '#ffd24a' },
};

export const byId = (list, id) => list.find((x) => x.id === id) || list[0];
