// Layjou Bubble — configuration.
// AdMob : compte pub-6003645213510535, application ca-app-pub-6003645213510535~7951613295
// (identifiant d'application dans android/app/src/main/res/values/strings.xml et ios/App/App/Info.plist).
// `testing` reste à false pour les stores ; `npm run android:demo` le passe à true le temps de compiler l'APK de démo.
// Ne cliquez jamais sur vos propres annonces réelles : déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
window.LAYJOU_CONFIG = {
  admob: {
    testing: false,
    rewarded: {
      android: 'ca-app-pub-6003645213510535/3086524765',
      ios: 'ca-app-pub-6003645213510535/3086524765',
    },
  },
  // Politique de confidentialité (lien dans l'écran d'accueil ; exigé par Apple et Google).
  privacyUrl: 'https://layjou.com/confidentialite/',
  // Extra moves granted when the player watches a rewarded ad after running out of moves.
  continueMoves: 5,
};
