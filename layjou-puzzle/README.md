# Layjou Puzzle

Jeu de tri « par 3 » : déplace les objets entre les étagères, réunis 3 objets
identiques sur la même étagère pour les faire disparaître, et vide tout le rayon
avant la fin du chrono. Le robot Layjou t'accompagne pendant la partie.

- **Techno** : HTML/CSS/JS sans dépendance (dossier `www/`) + **Capacitor 8** (Android & iOS)
- **Publicité** : vidéos récompensées **AdMob** (`@capacitor-community/admob`)
  - « Continuer » (+60 s) après une défaite, jusqu'à 3 fois par partie
  - +1 bonus gratuit (Aimant / Mélange / Gel) quand le stock est vide
- **Langues** : français (par défaut) et anglais, selon la langue du téléphone

## Arborescence

| Chemin | Contenu |
| --- | --- |
| `www/` | Le jeu (index.html, style.css, `js/game.js`, `js/ads.js`, `js/config.js`, `js/i18n.js`) |
| `android/` | Projet Android Studio (Gradle) |
| `ios/` | Projet Xcode (Swift Package Manager, pas de CocoaPods) |
| `resources/` | Icône et écran de démarrage sources |
| `release/LayjouPuzzle-debug.apk` | APK de test installable |

## Lancer / compiler

```bash
npm install
npm run serve          # test dans le navigateur (la pub y est simulée)

# Android (JDK 21 + Android SDK 36)
npm run android        # => android/app/build/outputs/apk/debug/app-debug.apk

# iOS (Mac + Xcode 16 ou plus récent)
npm run ios            # synchronise puis ouvre ios/App/App.xcodeproj dans Xcode
```

Dans Xcode : choisir son équipe dans *Signing & Capabilities*, puis Run / Archive.
Après chaque modification de `www/`, relancer `npx cap sync`.

## AdMob (compte pub-6003645213510535)

| Quoi | Valeur | Où |
| --- | --- | --- |
| Identifiant d'application | `ca-app-pub-6003645213510535~7951613295` | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |
| Bloc d'annonces avec récompense | `ca-app-pub-6003645213510535/3086524765` | `www/js/config.js` → `ads.rewarded` |

- **Mode test** : `testMode` reste à `false` dans `www/js/config.js` pour les stores. `npm run android:demo` le passe à `true` le temps de compiler l'APK de démo, puis le remet à `false`.
- **Ne cliquez jamais sur vos propres annonces réelles.** Déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
- **app-ads.txt** : publiez le fichier [`app-ads.txt`](/app-ads.txt) de la racine du dépôt à la racine du site indiqué dans les fiches des stores (par exemple `https://layjou.com/app-ads.txt`).
- **Un identifiant par jeu et par plateforme** : le même identifiant d'application sert aujourd'hui aux 6 jeux, sur Android et iOS. AdMob prévoit une application par jeu et par plateforme (12 au total). Créez-les dans AdMob, puis remplacez les identifiants ci-dessus, sinon les statistiques se mélangent et la diffusion peut être limitée une fois les apps associées aux stores.
- **iOS** : compléter `SKAdNetworkItems` dans `Info.plist` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist). Seul l'identifiant de Google (`cstr6suwn9.skadnetwork`) est présent.

## Retours haptiques

Le module `www/js/haptique.js` pilote le moteur haptique d'iOS et le vibreur d'Android (avec repli `navigator.vibrate` dans le navigateur) :
- **effets de base :** cran discret, chocs léger, moyen et fort, motifs de succès, d'alerte et d'erreur ;
- **effets composés :** crescendo de combo, explosion, poussée, fête, échec, et vibrations continues ;
- **limiteur :** deux impulsions sont espacées d'au moins 40 ms, sauf si la seconde est plus forte.

Le joueur peut couper les vibrations : bouton 📳 de l'accueil.

L'APK fourni est un build **debug** (signature de test) : parfait pour essayer le jeu, mais le Play Store exige un build *release* signé avec votre propre clé (`./gradlew bundleRelease` + keystore dans Android Studio).

## Réglages du jeu

`www/js/config.js` : secondes offertes par vidéo, nombre de « continuer », prix des bonus.
La difficulté (taille du rayon, profondeur, temps) est dans `levelParams()` et
`startLevel()` de `www/js/game.js`.
