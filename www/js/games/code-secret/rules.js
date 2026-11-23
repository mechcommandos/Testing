/**
 * Le code secret des espions (jeu 41) : règles pures, testées (tests/js/games31-43.test.js).
 * Code par décalage (code de César) : chaque lettre est remplacée par celle qui se trouve k rangs plus loin dans
 * l'alphabet ; après Z, on repart à A. Mots en capitales, sans accent.
 */
export const SERIES = 4;
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const WORDS = ['CHAT', 'LUNE', 'ROBOT', 'PIZZA', 'ECOLE', 'ARBRE', 'POMME', 'VELO', 'SOLEIL', 'NUAGE', 'LAPIN', 'BATEAU', 'JARDIN', 'ETOILE', 'CODE', 'ESPION', 'TRESOR', 'CARTE', 'DRAGON', 'FUSEE', 'LIVRE', 'MAISON', 'ZEBRE', 'OURS'];

export function shiftLetter(letter, k) {
  const i = ALPHABET.indexOf(letter);
  return i < 0 ? letter : ALPHABET[(((i + k) % 26) + 26) % 26];
}

export function encode(word, k) {
  return [...word].map((c) => shiftLetter(c, k)).join('');
}

export function decode(word, k) {
  return encode(word, -k);
}

/** Trois mots proposés pour un message codé : le bon, un mot réel de même longueur, et le décodage dans le mauvais sens. */
export function decodeChoices(word, k, random) {
  const coded = encode(word, k);
  const sameLength = random.shuffle(WORDS.filter((w) => w !== word && w.length === word.length));
  const wrongWay = encode(coded, k);
  const list = [word];
  for (const w of [sameLength[0], wrongWay, sameLength[1], encode(word, 1 - k + 2)]) if (w && !list.includes(w) && list.length < 3) list.push(w);
  return random.shuffle(list);
}

export function makeSeries(difficulty, random) {
  const words = random.shuffle(WORDS);
  return Array.from({ length: SERIES }, (_, i) => {
    const word = words[i];
    if (difficulty === 0) {
      return { kind: 'decode', word, k: 1, coded: encode(word, 1), options: decodeChoices(word, 1, random),
        prompt: `Message secret : ${spell(encode(word, 1))}. Chaque lettre a été remplacée par la suivante. Pour décoder, recule d’une lettre. Quel est le mot ?` };
    }
    if (difficulty === 1) {
      const k = random.int(2, 5);
      if (i % 2 === 0) {
        const options = random.shuffle([k, ...random.shuffle([1, 2, 3, 4, 5, 6].filter((x) => x !== k)).slice(0, 2)]).map(String);
        return { kind: 'shift', word, k, coded: encode(word, k), options,
          prompt: `Le mot ${spell(word)}, une fois codé, donne ${spell(encode(word, k))}. De combien de lettres a-t-on avancé ?` };
      }
      return { kind: 'decode', word, k, coded: encode(word, k), options: decodeChoices(word, k, random),
        prompt: `Message codé avec un décalage de ${k} : ${spell(encode(word, k))}. Pour décoder, recule de ${k} lettres. Quel est le mot ?` };
    }
    const short = words.filter((w) => w.length <= 5)[i] ?? word;
    const k = random.int(1, 3);
    return { kind: 'encode', word: short, k, coded: encode(short, k),
      prompt: `À toi de coder le mot ${spell(short)} avec un décalage de ${k} : pour chaque lettre, avance de ${k} dans l’alphabet et touche la lettre trouvée.` };
  });
}

/** Lettres séparées, pour que la voix les épelle. */
export function spell(word) {
  return [...word].join('-');
}
