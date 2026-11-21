/**
 * Layjou Kart — configuration centrale.
 *
 * ⚠️ AVANT PUBLICATION SUR LES STORES :
 *  1. Remplacer les identifiants AdMob de test ci-dessous par les vôtres
 *     (et l'App ID dans android/app/src/main/res/values/strings.xml + ios/App/App/Info.plist).
 *  2. Passer `useTestAds` à false.
 *  3. Créer dans Google Play Console / App Store Connect les produits intégrés
 *     dont les identifiants figurent dans `iap.products`.
 */
export const CONFIG = {
  appId: 'com.layjou.kart',
  version: '1.0.0',

  ads: {
    /**
     * Annonces de test dans les builds de démo / développement (`npm run dev`, `npm run android:demo`),
     * vraies annonces dans le build de production (`npm run build`, `npm run sync`, `npm run android:bundle`).
     * Ne cliquez jamais sur vos propres annonces réelles : ajoutez votre téléphone dans AdMob › Paramètres › Appareils de test.
     */
    useTestAds: import.meta.env.MODE !== 'production',
    /** true si l'app vise un public enfant (COPPA / programme Familles) : pubs non personnalisées + contenu « G ». */
    childDirected: false,
    // Compte AdMob pub-6003645213510535 — application ca-app-pub-6003645213510535~7951613295
    android: {
      rewarded: 'ca-app-pub-6003645213510535/3086524765',
      interstitial: '', // à créer dans AdMob (format Interstitiel), puis réactiver `interstitial.enabled`
    },
    ios: {
      rewarded: 'ca-app-pub-6003645213510535/3086524765',
      interstitial: '',
    },
    /** Interstitiels : volontairement rares pour ne pas casser la rétention. */
    interstitial: { enabled: false, skipFirstRaces: 4, everyNRaces: 3, minSecondsBetween: 180 },
    /** Plafond quotidien de vidéos récompensées « crédits gratuits ». */
    freeCreditsPerDay: 5,
    freeCreditsAmount: 8,
  },

  iap: {
    /** Achats simulés dans le navigateur (développement / démo). Mettre false si la version web est publiée. */
    webDemo: true,
    /**
     * APK de démonstration (`npm run android:demo`) : simule les achats tant que le store ne renvoie aucun produit.
     * Jamais actif dans un build de production (`npm run build`).
     */
    sandbox: import.meta.env.MODE === 'sandbox',
    /** type: 'consumable' | 'nonconsumable' */
    products: [
      { id: 'credits_80', type: 'consumable', credits: 80, fallbackPrice: '0,99 €' },
      { id: 'credits_450', type: 'consumable', credits: 450, bonus: 12, fallbackPrice: '4,99 €' },
      { id: 'credits_1000', type: 'consumable', credits: 1000, bonus: 25, fallbackPrice: '9,99 €', tag: 'popular' },
      { id: 'credits_2200', type: 'consumable', credits: 2200, bonus: 38, fallbackPrice: '19,99 €' },
      { id: 'credits_6000', type: 'consumable', credits: 6000, bonus: 50, fallbackPrice: '49,99 €', tag: 'best' },
      { id: 'starter_pack', type: 'nonconsumable', credits: 300, coins: 6000, skin: 'galaxy', kart: 'bonbon', fallbackPrice: '2,99 €' },
      { id: 'remove_ads', type: 'nonconsumable', fallbackPrice: '3,99 €' },
    ],
  },

  economy: {
    startCoins: 300,
    startCredits: 40,
    /** Prolongation (+1 tour) : 1 vidéo gratuite par course, sinon crédits (escalade par course). */
    extendCosts: [15, 30, 60],
    /** Défis chronométrés : temps ajouté et coût. */
    addTimeSeconds: 15,
    addTimeCosts: [10, 20, 40],
    /** Pièces de classement (multipliées par le monde). */
    placeCoins: [160, 120, 95, 75, 60, 50, 40, 30],
    coinValue: 3,
    replayFactor: 0.7,
    coinPacks: [
      { id: 'coins_s', coins: 3000, credits: 40 },
      { id: 'coins_m', coins: 10000, credits: 110 },
      { id: 'coins_l', coins: 30000, credits: 300 },
    ],
    freeChestHours: 3,
    wheelAdSpinsPerDay: 3,
  },
};
