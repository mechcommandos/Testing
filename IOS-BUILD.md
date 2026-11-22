# Compiler Layjou Puzzle pour iOS

Prérequis : un Mac avec **Xcode 16+** (iOS 15 minimum). Node.js n'est pas obligatoire :
les plugins natifs nécessaires sont déjà inclus dans `node_modules/`.

1. Dézippez l'archive, puis ouvrez `ios/App/App.xcodeproj` dans Xcode.
2. Attendez que Xcode télécharge les paquets Swift (Capacitor, Google Mobile Ads, UMP).
   En cas d'erreur : menu *File > Packages > Reset Package Caches*.
3. Cible **App** > onglet *Signing & Capabilities* : choisissez votre *Team*
   (et changez le *Bundle Identifier* `com.layjou.puzzle` si besoin).
4. Branchez un iPhone (ou choisissez un simulateur) puis ▶ *Run*.
5. Pour l'App Store : *Product > Archive* puis *Distribute App*.

Avant publication, remplacez les identifiants AdMob de test :
- `ios/App/App/Info.plist` → `GADApplicationIdentifier`
- `ios/App/App/public/js/config.js` (et `www/js/config.js`) → bloc récompensé iOS, `testMode: false`

Si vous modifiez le jeu dans `www/`, lancez `npm install && npx cap sync ios` pour recopier les fichiers.
