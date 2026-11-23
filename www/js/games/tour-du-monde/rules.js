/**
 * Le tour du monde (jeu 52) : règles pures, testées (tests/js/games44-53.test.js).
 * Niveau 1 : reconnaître le continent coloré sur la carte. Niveau 2 : où vivent des animaux sauvages (seulement des
 * animaux qui ne vivent à l'état sauvage que sur un continent). Niveau 3 : sur quel continent se trouvent des
 * monuments et des pays.
 */
export const SERIES_LENGTH = 6;

export const CONTINENTS = {
  europe: 'l’Europe',
  afrique: 'l’Afrique',
  asie: 'l’Asie',
  'amerique-nord': 'l’Amérique du Nord',
  'amerique-sud': 'l’Amérique du Sud',
  oceanie: 'l’Océanie',
  antarctique: 'l’Antarctique',
};

/** Nom court pour les cartes (sans article). */
export const short = (id) => CONTINENTS[id].replace(/^l’/, '').replace(/^./, (c) => c.toUpperCase());

/** Animaux sauvages (picto si l'image existe). */
export const ANIMALS = [
  { id: 'panda', name: 'le panda géant', continent: 'asie', picto: 'panda', fact: 'Il vit dans les forêts de bambous des montagnes de Chine.' },
  { id: 'tigre', name: 'le tigre', continent: 'asie', fact: 'Il vit en Inde, en Asie du Sud-Est et dans l’est de la Russie.' },
  { id: 'kangourou', name: 'le kangourou', continent: 'oceanie', fact: 'Il vit en Australie et saute sur ses grandes pattes arrière.' },
  { id: 'koala', name: 'le koala', continent: 'oceanie', fact: 'Il vit en Australie et mange des feuilles d’eucalyptus.' },
  { id: 'girafe', name: 'la girafe', continent: 'afrique', picto: 'girafe', fact: 'Elle vit dans la savane africaine.' },
  { id: 'zebre', name: 'le zèbre', continent: 'afrique', picto: 'zebre', fact: 'Il vit dans la savane africaine, en troupeaux.' },
  { id: 'lama', name: 'le lama', continent: 'amerique-sud', picto: 'lama', fact: 'Il vit dans la cordillère des Andes.' },
  { id: 'paresseux', name: 'le paresseux', continent: 'amerique-sud', fact: 'Il vit dans les arbres de la forêt amazonienne.' },
  { id: 'manchot', name: 'le manchot empereur', continent: 'antarctique', picto: 'manchot', fact: 'Il vit sur la glace de l’Antarctique, le continent le plus froid.' },
  { id: 'bison', name: 'le bison d’Amérique', continent: 'amerique-nord', fact: 'Il vit dans les grandes plaines des États-Unis et du Canada.' },
];

export const PLACES = [
  { id: 'eiffel', name: 'la tour Eiffel', continent: 'europe', fact: 'Elle est à Paris, en France.' },
  { id: 'colisee', name: 'le Colisée', continent: 'europe', fact: 'Il est à Rome, en Italie.' },
  { id: 'pyramides', name: 'les pyramides de Gizeh', continent: 'afrique', fact: 'Elles sont en Égypte.' },
  { id: 'kilimandjaro', name: 'le Kilimandjaro', continent: 'afrique', fact: 'C’est la plus haute montagne d’Afrique, en Tanzanie.' },
  { id: 'muraille', name: 'la Grande Muraille', continent: 'asie', fact: 'Elle est en Chine.' },
  { id: 'taj', name: 'le Taj Mahal', continent: 'asie', fact: 'Il est en Inde.' },
  { id: 'liberte', name: 'la statue de la Liberté', continent: 'amerique-nord', fact: 'Elle est à New York, aux États-Unis.' },
  { id: 'machu', name: 'le Machu Picchu', continent: 'amerique-sud', fact: 'C’est une ancienne cité inca, au Pérou.' },
  { id: 'opera', name: 'l’opéra de Sydney', continent: 'oceanie', fact: 'Il est à Sydney, en Australie.' },
  { id: 'france', name: 'la France', continent: 'europe', fact: 'La France est en Europe, avec ses voisins l’Espagne, l’Italie, l’Allemagne…' },
  { id: 'bresil', name: 'le Brésil', continent: 'amerique-sud', fact: 'C’est le plus grand pays d’Amérique du Sud.' },
  { id: 'japon', name: 'le Japon', continent: 'asie', fact: 'C’est un pays fait d’îles, à l’est de l’Asie.' },
];

function options(answer, random) {
  return random.shuffle([answer, ...random.shuffle(Object.keys(CONTINENTS).filter((c) => c !== answer)).slice(0, 2)]);
}

export function makeSeries(difficulty, random) {
  if (difficulty === 0) {
    return random.shuffle(Object.keys(CONTINENTS)).slice(0, SERIES_LENGTH).map((answer) => ({ kind: 'map', answer, options: options(answer, random) }));
  }
  const list = difficulty === 1 ? ANIMALS : PLACES;
  return random.shuffle(list).slice(0, SERIES_LENGTH).map((item) => ({ kind: difficulty === 1 ? 'animal' : 'place', item, answer: item.continent, options: options(item.continent, random) }));
}
