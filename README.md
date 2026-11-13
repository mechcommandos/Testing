# LayJou Puzzle

Jeu de tri « par 3 » : déplace les objets entre les étagères, réunis 3 objets
identiques sur la même étagère pour les faire disparaître, et vide tout le rayon
avant la fin du chrono. Le robot LayJou t'accompagne pendant la partie.

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
| `release/LayJouPuzzle-debug.apk` | APK de test installable |

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

## Avant de publier : identifiants AdMob

Le projet utilise les **identifiants de test de Google** (aucun revenu, aucun risque
pour votre compte pendant les essais). À remplacer par les vôtres :

| Quoi | Où |
| --- | --- |
| Blocs « Avec récompense » Android / iOS + `testMode: false` | `www/js/config.js` |
| ID d'application AdMob Android | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) |
| ID d'application AdMob iOS | `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |

Pour iOS, ajoutez aussi la liste complète des `SKAdNetworkItems` fournie par Google.

L'APK fourni est un build **debug** (signature de test) : parfait pour essayer le jeu,
mais le Play Store exige un build *release* signé avec votre propre clé
(`./gradlew bundleRelease` + keystore dans Android Studio).

## Réglages du jeu

`www/js/config.js` : secondes offertes par vidéo, nombre de « continuer », prix des bonus.
La difficulté (taille du rayon, profondeur, temps) est dans `levelParams()` et
`startLevel()` de `www/js/game.js`.
