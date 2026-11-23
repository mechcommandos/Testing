// Réglages du produit. Le nom de marque est configurable ici (et dans index.html / manifest).
export const APP = {
  name: 'Layjou',
  version: '0.31.2',
  locale: 'fr',
};

// Seuils documentés dans docs/progression.md. Modifier ici change le calcul partout.
export const THRESHOLDS = {
  // Une période sans interaction plus longue que ceci n'est pas comptée comme du jeu actif.
  idleMs: 45_000,
  // Suggérer la difficulté supérieure après N réussites autonomes sur les dernières activités.
  suggestHarderAfter: 4,
  suggestHarderWindow: 5,
  // Proposer de l'aide (ou une difficulté plus douce) après N activités non réussies ou avec indices d'affilée.
  suggestHelpAfter: 3,
  // Code parent : temporisation après erreurs, verrouillage automatique.
  pinMaxAttempts: 5,
  pinLockMs: 60_000,
  parentAutoLockMs: 5 * 60_000,
};

export const AGE_BANDS = [
  { id: '2-3', label: '2–3 ans', min: 2, max: 3 },
  { id: '4-5', label: '4–5 ans', min: 4, max: 5 },
  { id: '6-8', label: '6–8 ans', min: 6, max: 8 },
  { id: '9-12', label: '9–12 ans', min: 9, max: 12 },
];

export const AVATARS = ['robot', 'renard', 'hibou', 'lapin', 'tortue', 'chat'];
