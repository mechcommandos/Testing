/**
 * La boutique des petits budgets (jeu 20) : règles pures, testées (tests/js/games13-21.test.js).
 * Argent dessiné et virtuel, en euros entiers ; aucun lien vers un achat réel.
 *
 * - difficulté 0 : payer le prix exact d'un article (prix entiers sous 10 €) avec des pièces et des billets ;
 * - difficulté 1 : composer un panier d'au moins 2 articles sans dépasser son budget ; dire si un achat est possible ;
 * - difficulté 2 : rendre la monnaie après un paiement avec un billet.
 */
export const TASKS_PER_SERIES = 4;
export const MONEY = [
  { value: 1, kind: 'coin' }, { value: 2, kind: 'coin' }, { value: 5, kind: 'note' }, { value: 10, kind: 'note' },
];

export const ITEMS = [
  { id: 'pomme', name: 'la pomme', picto: 'pomme', price: 1 },
  { id: 'banane', name: 'la banane', picto: 'banane', price: 2 },
  { id: 'fraise', name: 'la barquette de fraises', picto: 'fraise', price: 3 },
  { id: 'ballon', name: 'le ballon', picto: 'ballon', price: 4 },
  { id: 'voiture', name: 'la petite voiture', picto: 'voiture', price: 5 },
  { id: 'gateau', name: 'le gâteau', picto: 'gateau', price: 6 },
  { id: 'peluche', name: 'la peluche', picto: 'peluche', price: 7 },
  { id: 'train', name: 'le petit train', picto: 'train', price: 8 },
  { id: 'robot', name: 'le robot', picto: 'robot', price: 9 },
];

export const euros = (n) => `${n} €`;
export const sum = (list) => list.reduce((a, b) => a + b, 0);

/** Pièces et billets les plus grands d'abord (pour l'indice). */
export function coinsFor(amount, money = MONEY.map((m) => m.value)) {
  const out = [];
  let rest = amount;
  for (const v of [...money].sort((a, b) => b - a)) while (rest >= v) { out.push(v); rest -= v; }
  return out;
}

/** Panier valide : au moins 2 articles, total inférieur ou égal au budget. */
export function basketOk(items, budget) {
  return items.length >= 2 && sum(items.map((i) => i.price)) <= budget;
}

export function makeSeries(difficulty, random) {
  if (difficulty === 0) {
    return random.shuffle(ITEMS).slice(0, TASKS_PER_SERIES).map((item) => ({ kind: 'pay', item, amount: item.price, money: [1, 2, 5], prompt: `${item.name.replace(/^./, (c) => c.toUpperCase())} coûte ${euros(item.price)}. Paie le prix exact.` }));
  }
  if (difficulty === 1) {
    const shelf = () => random.shuffle(ITEMS).slice(0, 6).sort((a, b) => a.price - b.price);
    const basket = () => {
      const items = shelf();
      // Un panier valide doit toujours exister : le budget dépasse au moins les 2 articles les moins chers.
      const minPair = items[0].price + items[1].price;
      const budgets = [8, 10, 12].filter((b) => b > minPair);
      const budget = budgets.length ? random.pick(budgets) : minPair + 2;
      return { kind: 'basket', budget, shelf: items, prompt: `Tu as ${euros(budget)}. Choisis au moins 2 articles sans dépasser ton budget.` };
    };
    const question = () => {
      const [a, b] = random.shuffle(ITEMS).slice(0, 2);
      const budget = random.pick([8, 10, 12]);
      const ok = a.price + b.price <= budget;
      return { kind: 'yesno', items: [a, b], budget, prompt: `Avec ${euros(budget)}, peux-tu acheter ${a.name} (${euros(a.price)}) et ${b.name} (${euros(b.price)}) ?`, choices: [{ id: 'oui', text: 'Oui' }, { id: 'non', text: 'Non' }], correctId: ok ? 'oui' : 'non', total: a.price + b.price };
    };
    return random.shuffle([basket(), basket(), question(), question()]);
  }
  return random.shuffle(ITEMS).slice(0, TASKS_PER_SERIES).map((item) => {
    const paid = item.price < 5 && random() < 0.5 ? 5 : item.price < 10 && random() < 0.7 ? 10 : 20;
    const change = paid - item.price;
    return { kind: 'change', item, paid, amount: change, money: [1, 2, 5, 10], prompt: `Un client achète ${item.name} à ${euros(item.price)} et paie avec un billet de ${euros(paid)}. Rends-lui la monnaie.` };
  });
}
