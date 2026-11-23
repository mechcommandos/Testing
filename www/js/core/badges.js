/**
 * Badges simples, calculés à partir des résultats réels. Ils valorisent la découverte, l'effort et la
 * persévérance ; jamais la vitesse, la régularité quotidienne ou une comparaison avec d'autres enfants.
 * Aucun tirage aléatoire.
 */
export const BADGES = [
  { id: 'first-step', icon: 'pousse', label: 'Premier pas', description: 'Terminer une première activité.', test: (rs) => rs.length >= 1 },
  { id: 'explorer', icon: 'boussole', label: 'Explorateur', description: 'Essayer trois jeux différents.', test: (rs) => new Set(rs.map((r) => r.gameId)).size >= 3 },
  { id: 'persevere', icon: 'etoile', label: 'Persévérant', description: 'Réussir une activité après plusieurs essais.', test: (rs) => rs.some((r) => r.success && r.errors >= 2) },
  { id: 'curious', icon: 'ampoule', label: 'Curieux', description: 'Réussir en s’aidant d’un indice.', test: (rs) => rs.some((r) => r.success && r.hints > 0) },
  { id: 'coder', icon: 'robot', label: 'Petit programmeur', description: 'Guider le robot jusqu’à l’étoile.', test: (rs) => rs.some((r) => r.gameId === 'robot-labyrinthes' && r.success) },
  { id: 'gardener', icon: 'tournesol', label: 'Jardinier', description: 'Terminer cinq manches au jardin.', test: (rs) => rs.filter((r) => r.gameId === 'jardin-couleurs' && r.success).length >= 5 },
  { id: 'merchant', icon: 'panier', label: 'Marchand', description: 'Préparer cinq commandes au marché.', test: (rs) => rs.filter((r) => r.gameId === 'marche-nombres' && r.success).length >= 5 },
  { id: 'challenger', icon: 'montagne', label: 'Grimpeur', description: 'Réussir une activité en difficulté 3.', test: (rs) => rs.some((r) => r.success && r.difficulty === 2) },
];

export function earnedBadges(results) {
  return BADGES.map((b) => ({ ...b, earned: b.test(results) }));
}

/** Badges gagnés par le dernier résultat : obtenus avec `after`, pas encore avec `before`. */
export function newBadges(before, after) {
  return BADGES.filter((b) => b.test(after) && !b.test(before));
}
