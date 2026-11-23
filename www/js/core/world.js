/**
 * Le monde de l'enfant : album d'autocollants, compagnon (mascotte personnalisée), mode « je ne sais pas encore lire ».
 * Données par profil, gardées sur l'appareil (réglage local « meta:world:<profil> »), jamais envoyées au serveur.
 *
 * Autocollants : chaque activité réussie en fait gagner un, tiré dans le lot du jeu (6 par jeu), dans l'ordre,
 * sans hasard. Lot complet : l'autocollant suivant est une étoile dorée de ce jeu (compteur). Rien n'est perdu,
 * rien ne dépend de la régularité : pas de série quotidienne, pas de classement.
 */
export const STICKERS_PER_GAME = 6;

/** Lots d'autocollants (identifiants de la bibliothèque d'images), un par jeu, en lien avec le jeu. */
export const STICKER_SETS = {
  'jardin-couleurs': ['graine', 'pousse', 'tournesol', 'fraise', 'pomme', 'feuille'],
  'marche-nombres': ['pomme', 'poire', 'banane', 'ananas', 'panier', 'piece'],
  'animaux-sons': ['chat', 'chien', 'vache', 'cochon', 'mouton', 'poule'],
  'ile-lettres': ['bateau', 'ancre', 'poisson', 'crabe', 'tortue', 'dauphin'],
  'memory-explorateurs': ['boussole', 'sac-a-dos', 'montagne', 'foret', 'hibou', 'renard'],
  'robot-labyrinthes': ['robot', 'etoile', 'cle', 'boulon', 'ampoule', 'reveil'],
  'puzzles-suites': ['ballon', 'cadeau', 'peluche', 'sapin', 'train', 'velo'],
  'petits-scientifiques': ['ampoule', 'glacon', 'graine', 'caillou', 'flotte', 'eponge'],
  'bons-gestes': ['bac-jaune', 'compost', 'conteneur-verre', 'bouteille-verre', 'journal', 'carton'],
  'histoires-emotions': ['visage-joie', 'visage-surprise', 'peluche', 'cadeau', 'gateau', 'ballon'],
  orchestre: ['piano', 'trompette', 'cloche', 'tambour', 'piano-aigu', 'etoile'],
  ombres: ['lapin', 'girafe', 'elephant', 'zebre', 'lion', 'panda'],
  'petit-batisseur': ['marteau', 'maison', 'boulon', 'cle', 'carton', 'etoile'],
  differences: ['etoile', 'ballon', 'parapluie', 'tasse', 'ciseaux', 'reveil'],
  'detectives-categories': ['loup', 'herisson', 'lama', 'manchot', 'phoque', 'ours-polaire'],
  'histoires-ordre': ['graine', 'enveloppe', 'gateau', 'reveil', 'sac-a-dos', 'peluche'],
  'cuisine-mesures': ['gateau', 'tasse', 'citron', 'melon', 'fraise', 'carotte'],
  'pizzeria-fractions': ['gateau', 'citron', 'melon', 'ananas', 'raisin', 'panier'],
  horloge: ['reveil', 'etoile', 'train', 'maison', 'sac-a-dos', 'velo'],
  'boutique-budgets': ['piece', 'panier', 'cadeau', 'voiture', 'robot', 'ballon'],
  'voyage-cartes': ['boussole', 'train', 'bateau', 'montagne', 'ferme', 'helicoptere'],
  'meteo-saisons': ['soleil', 'pluie', 'neige', 'bonnet', 'lunettes-soleil', 'parapluie'],
  'jardin-vivant': ['fleur', 'coccinelle', 'abeille', 'tomate', 'arrosoir', 'ver-de-terre'],
  'mots-phrases': ['journal', 'enveloppe', 'feuille-papier', 'chat', 'lapin', 'hibou'],
  'detectives-lecture': ['boussole', 'cle', 'enveloppe', 'gateau', 'reveil', 'cadenas'],
  'passeport-langues': ['helicoptere', 'train', 'bateau', 'velo', 'voiture', 'ballon'],
  mecanismes: ['boulon', 'marteau', 'cle', 'ampoule', 'reveil', 'robot'],
  'code-debogage': ['robot', 'etoile', 'tablette', 'boulon', 'cle', 'ampoule'],
  'explorateurs-numerique': ['tablette', 'message', 'lien', 'cadenas', 'adulte', 'alerte'],
  'studio-motifs': ['etoile', 'ballon', 'fleur', 'cadeau', 'tournesol', 'piano'],
  'trace-magique': ['etoile', 'ballon', 'cadeau', 'tournesol', 'lapin', 'carotte'],
  'dessus-dessous': ['chat', 'chien', 'peluche', 'panier', 'reveil', 'sac-a-dos'],
  'docteur-doudous': ['peluche', 'brosse-dents', 'eponge', 'ours-polaire', 'panda', 'banane'],
  'metiers': ['ciseaux', 'marteau', 'arrosoir', 'enveloppe', 'gateau', 'ancre'],
  'rue-securite': ['velo', 'voiture', 'moto', 'train', 'alerte', 'helicoptere'],
  'bulle-calme': ['nuage', 'soleil', 'fleur', 'feuille', 'hibou', 'tortue'],
  'ruche-multiplications': ['abeille', 'tournesol', 'coccinelle', 'fraise', 'pomme', 'plant-tomate'],
  'bocal-estimation': ['bocal', 'caillou', 'glacon', 'piece', 'raisin', 'bouteille-verre'],
  'astronaute': ['etoile', 'soleil', 'robot', 'ampoule', 'montagne', 'boussole'],
  'sondage-classe': ['banane', 'ananas', 'citron', 'melon', 'raisin', 'poire'],
  'code-secret': ['cadenas', 'cle', 'enveloppe', 'message', 'journal', 'feuille-papier'],
  'petits-strateges': ['robot', 'pomme', 'etoile', 'cle', 'boulon', 'cadeau'],
  'frise-temps': ['reveil', 'montagne', 'bateau', 'train', 'helicoptere', 'tablette'],
  'amis-de-dix': ['etoile', 'ballon', 'pomme', 'fraise', 'cadeau', 'piece'],
  'droite-nombres': ['train', 'velo', 'boussole', 'montagne', 'etoile', 'reveil'],
  'chasse-rimes': ['bateau', 'gateau', 'lapin', 'sapin', 'loup', 'hibou'],
  'homophones': ['enveloppe', 'feuille-papier', 'cle', 'etoile', 'cadeau', 'ampoule'],
  'machine-temps': ['reveil', 'soleil', 'etoile', 'train', 'sapin', 'cadeau'],
  'atelier-solides': ['ballon', 'conserve', 'cadeau', 'brique', 'glacon', 'etoile'],
  'potager-surfaces': ['graine', 'pousse', 'carotte', 'tomate', 'arrosoir', 'fleur'],
  'roue-hasard': ['etoile', 'ballon', 'cadeau', 'piece', 'cle', 'reveil'],
  'tour-du-monde': ['panda', 'lion', 'lama', 'manchot', 'girafe', 'bateau'],
  'assiette-equilibree': ['pomme', 'carotte', 'banane', 'fraise', 'poire', 'melon'],
  'mots-semaine': ['enveloppe', 'feuille-papier', 'etoile', 'cadeau', 'ampoule', 'cle'],
};

/** Accessoires du compagnon, débloqués par le nombre d'autocollants (jamais achetés, jamais perdus). */
export const OUTFITS = [
  { id: 'noeud', slot: 'neck', label: 'le nœud papillon', need: 1 },
  { id: 'casquette', slot: 'hat', label: 'la casquette', need: 3 },
  { id: 'lunettes', slot: 'eyes', label: 'les lunettes', need: 6 },
  { id: 'echarpe', slot: 'neck', label: 'l’écharpe', need: 10 },
  { id: 'cape', slot: 'back', label: 'la cape', need: 15 },
  { id: 'chapeau-fleur', slot: 'hat', label: 'le chapeau à fleur', need: 20 },
  { id: 'etoiles', slot: 'eyes', label: 'les lunettes étoiles', need: 30 },
  { id: 'couronne', slot: 'hat', label: 'la couronne', need: 45 },
];

export const COMPANION_NAMES = ['Jou', 'Pixel', 'Bulle', 'Tilou', 'Nova', 'Lumo'];

export function emptyWorld() {
  return { stickers: [], stars: {}, companion: { name: 'Jou', outfit: {} }, preReader: null };
}

export const stickerId = (gameId, picto) => `${gameId}:${picto}`;

/** Prochain autocollant du lot d'un jeu, ou null si le lot est complet. */
export function nextSticker(world, gameId) {
  const set = STICKER_SETS[gameId] ?? [];
  const owned = new Set(world.stickers.map((s) => s.id));
  const picto = set.find((p) => !owned.has(stickerId(gameId, p)));
  return picto ? { id: stickerId(gameId, picto), gameId, picto } : null;
}

/** Gain d'une activité réussie : un autocollant, ou une étoile dorée si le lot est complet. Pur : renvoie un nouveau monde. */
export function award(world, gameId, at) {
  const next = nextSticker(world, gameId);
  if (next) return { world: { ...world, stickers: [...world.stickers, { ...next, at, placed: false }] }, gained: { kind: 'sticker', ...next } };
  if (!STICKER_SETS[gameId]) return { world, gained: null };
  const stars = { ...world.stars, [gameId]: (world.stars[gameId] ?? 0) + 1 };
  return { world: { ...world, stars }, gained: { kind: 'star', gameId, count: stars[gameId] } };
}

export function placeSticker(world, id) {
  return { ...world, stickers: world.stickers.map((s) => (s.id === id ? { ...s, placed: true } : s)) };
}

export function unlockedOutfits(world) {
  const n = world.stickers.length;
  return OUTFITS.filter((o) => n >= o.need);
}

/** Accessoires débloqués par le dernier gain (pour les annoncer). */
export function newlyUnlocked(before, after) {
  const had = new Set(unlockedOutfits(before).map((o) => o.id));
  return unlockedOutfits(after).filter((o) => !had.has(o.id));
}

/** Mettre un accessoire (un par emplacement) ou l'enlever (id null). Refuse un accessoire pas encore débloqué. */
export function wear(world, slot, id) {
  if (id && !unlockedOutfits(world).some((o) => o.id === id && o.slot === slot)) return world;
  const outfit = { ...world.companion.outfit };
  if (id) outfit[slot] = id;
  else delete outfit[slot];
  return { ...world, companion: { ...world.companion, outfit } };
}

export function rename(world, name) {
  const clean = String(name ?? '').replace(/[<>]/g, '').trim().slice(0, 16);
  return clean ? { ...world, companion: { ...world.companion, name: clean } } : world;
}

/**
 * Mode « je ne sais pas encore lire » : choix du parent, sinon actif par défaut pour les profils de 2–5 ans.
 * Jamais d'office en invité : c'est souvent un adulte qui découvre le site (le parent peut l'activer).
 */
export function preReading(world, profile) {
  if (typeof world.preReader === 'boolean') return world.preReader;
  if (!profile || profile.guest) return false;
  return profile.ageBand === '2-3' || profile.ageBand === '4-5';
}

// ---------- Stockage (par profil, sur l'appareil) ----------

const key = (profileId) => `world:${profileId}`;

export async function loadWorld(store, profileId) {
  const saved = await store.getMeta(key(profileId), null);
  const base = emptyWorld();
  return saved ? { ...base, ...saved, companion: { ...base.companion, ...saved.companion, outfit: { ...saved.companion?.outfit } } } : base;
}

export function saveWorld(store, profileId, world) {
  return store.setMeta(key(profileId), world);
}

export function forgetWorld(store, profileId) {
  return store.setMeta(key(profileId), null);
}
