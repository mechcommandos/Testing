/*
 * Configuration Layjou Puzzle.
 *
 * AdMob : compte pub-6003645213510535, application ca-app-pub-6003645213510535~7951613295
 * (identifiant d'application dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist).
 * `testMode` reste à false pour les stores ; `npm run android:demo` le passe à true le temps de compiler l'APK de démo.
 * Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
 */
window.LAYJOU_CONFIG = {
  ads: {
    testMode: false,
    rewarded: {
      android: 'ca-app-pub-6003645213510535/3086524765',
      ios: 'ca-app-pub-6003645213510535/3086524765',
    },
  },
  game: {
    continueSeconds: 60,     // temps ajouté après une vidéo récompensée
    maxContinues: 3,         // nombre de "continuer" par partie
    boosterPrice: 60,        // prix d'un bonus en pièces
    freezeSeconds: 15,
  },
};
