# Layjou Blocks

Puzzle de blocs 8 × 8 avec Layjou le robot. Application Capacitor 8 (Android + iOS), Vite + TypeScript, sans framework.

- **APK de démonstration** : [`release/LayjouBlocks-1.0.0-debug.apk`](release/LayjouBlocks-1.0.0-debug.apk)
- **Sources iOS** : `ios/App/App.xcodeproj` (à ouvrir dans Xcode sur un Mac)

## Le jeu

- Glisser 3 pièces sur le plateau, compléter lignes et colonnes, enchaîner les combos.
- **Layjou** réagit à la partie (expressions, bulles, animations) et porte skins et accessoires.
- **Armes** : Marteau (3 × 3), Laser (ligne + colonne), Chroma (une couleur), Recycleur (nouvelles pièces).
- **Jauge cœur** : 10 lignes effacées = une arme offerte.
- **Progression** : niveaux, 3 missions par jour, cadeau quotidien sur 7 jours, cadeau gratuit toutes les 4 h.
- Partie sauvegardée automatiquement et reprise au retour. Interface en français et en anglais.

## Monétisation

| Levier | Détail |
| --- | --- |
| Vidéo récompensée AdMob | continuer une partie (2 fois par partie), doubler les boulons, obtenir une arme, +60 boulons (5 par jour) |
| Crédits (achat intégré) | 4 packs consommables ; servent à continuer, aux lots d'armes, aux skins et accessoires premium |
| Boulons (gagnés en jouant) | armes à l'unité, skins et accessoires standards |

Il n'y a aucune publicité imposée : toutes les vidéos sont choisies par le joueur.

## L'algorithme de rétention

`src/game/director.ts` choisit chaque donne de 3 pièces :

1. **Équité** : la donne est toujours posable (vérifié par simulation). On ne perd que sur ses propres placements.
2. **Difficulté dynamique** : elle monte avec le score comparé au niveau habituel du joueur, suit une vague tension / relâchement, et baisse quand le plateau se remplit.
3. **Sauvetages** : quand le plateau est presque bloqué, un nombre limité de donnes « miracle » permet un retournement de situation.
4. **Accueil et réconfort** : premières parties plus douces, aide après une série de parties courtes et à l'approche du record.

## À personnaliser avant publication

| Quoi | Où |
| --- | --- |
| Produits d'achat intégré | créer les 4 produits **consommables** de `CREDIT_PACKS` (`src/config.ts`) dans Play Console et App Store Connect |
| Prix, récompenses, coûts | `src/config.ts` (`ECONOMY`, `WEAPON_PRICES`) et `src/state/catalog.ts` |
| Identifiant de l'app (`com.layjou.blocks`) | `capacitor.config.ts`, puis recréer les plateformes |

Si le jeu vise les enfants, passer `ADMOB.childDirected` à `true` et suivre le programme Familles de Google Play.

## AdMob (compte pub-6003645213510535)

| Quoi | Valeur | Où |
| --- | --- | --- |
| Identifiant d'application | `ca-app-pub-6003645213510535~4833816740` | `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`) |
| Bloc d'annonces avec récompense | `ca-app-pub-6003645213510535/3309442507` | `src/config.ts` → `ADMOB.rewarded` |

- **Mode test** : annonces de test avec `npm run dev` et dans l'APK de démo (`npm run android:debug`), vraies annonces avec `npm run build` et `npm run android:release` (réglage automatique dans `src/config.ts`).
- **Ne cliquez jamais sur vos propres annonces réelles.** Déclarez votre téléphone dans AdMob › Paramètres › Appareils de test.
- **app-ads.txt** : publiez le fichier [`app-ads.txt`](/app-ads.txt) de la racine du dépôt à la racine du site indiqué dans les fiches des stores (par exemple `https://layjou.com/app-ads.txt`).
- **Un identifiant par jeu et par plateforme** : le même identifiant d'application sert aujourd'hui aux 6 jeux, sur Android et iOS. AdMob prévoit une application par jeu et par plateforme (12 au total). Créez-les dans AdMob, puis remplacez les identifiants ci-dessus, sinon les statistiques se mélangent et la diffusion peut être limitée une fois les apps associées aux stores.
- **iOS** : compléter `SKAdNetworkItems` dans `Info.plist` avec la [liste de Google](https://developers.google.com/admob/ios/quick-start#update_your_infoplist). Seul l'identifiant de Google (`cstr6suwn9.skadnetwork`) est présent.

## Retours haptiques

Le module `src/services/haptics.ts` pilote le moteur haptique d'iOS et le vibreur d'Android (avec repli `navigator.vibrate` dans le navigateur) :
- **effets de base :** cran discret, chocs léger, moyen et fort, motifs de succès, d'alerte et d'erreur ;
- **effets composés :** crescendo de combo, explosion, poussée, fête, échec, et vibrations continues ;
- **limiteur :** deux impulsions sont espacées d'au moins 40 ms, sauf si la seconde est plus forte.

Le joueur peut couper les vibrations : réglage « Vibrations » de la fenêtre Réglages.

## Commandes

```bash
npm install
npm run dev            # navigateur, achats et pubs simulés
npm test               # tests de la logique de jeu
npm run assets         # régénère les skins depuis assets/source/layjou-original.png

npm run android:debug  # APK de démonstration (achats simulés)
npm run android:release # AAB de production signé (voir « Publier sur Google Play »)
npm run ios:sync       # prépare le projet Xcode
```

Le mode « bac à sable » (`npm run dev`, `npm run build:sandbox`) simule les achats tant que le store ne renvoie aucun produit. `npm run build` ne l'active jamais.

Prérequis Android : JDK 21, SDK Android 36, et `android/local.properties` contenant `sdk.dir=…`.
Prérequis iOS : un Mac avec Xcode ; les dépendances natives sont résolues par Swift Package Manager à l'ouverture du projet.

## Publier sur Google Play (App Bundle signé)

Le fichier prêt à envoyer est [`release/LayjouBlocks-1.0.0-release.aab`](release/LayjouBlocks-1.0.0-release.aab) : App Bundle de production (vraies annonces, achats réels), signé avec la clé d'envoi Layjou (`layjou-upload-key.jks`, alias `layjou-upload`, la même pour les 6 jeux). La clé et son mot de passe ne sont **jamais** dans ce dépôt : gardez-les en lieu sûr.

Pour recompiler, créez `android/keystore.properties` (ignoré par Git) :

```properties
storeFile=/chemin/absolu/layjou-upload-key.jks
storePassword=********
keyAlias=layjou-upload
keyPassword=********
```

ou définissez les variables d'environnement `LAYJOU_KEYSTORE`, `LAYJOU_KEYSTORE_PASSWORD`, `LAYJOU_KEY_ALIAS` et `LAYJOU_KEY_PASSWORD`, puis `npm run android:release` → `android/app/build/outputs/bundle/release/app-release.aab`. Augmentez `versionCode` dans `android/app/build.gradle` à chaque mise à jour.

## Limites connues

- Validation des achats côté client uniquement (pas de serveur).
- Pas de musique, uniquement des effets sonores synthétisés.
- Le projet iOS n'a pas pu être compilé ici (pas de Mac) ; l'APK n'a pas été testé sur un appareil réel.

## Les 6 jeux Layjou de ce dépôt

| Jeu | Dossier | APK de démonstration (annonces de test) |
| --- | --- | --- |
| Layjou Blocks | racine du dépôt | [`release/LayjouBlocks-1.0.0-debug.apk`](release/LayjouBlocks-1.0.0-debug.apk) |
| Layjou Battle | [`layjou-battle/`](layjou-battle/) | [`layjou-battle/release/LayjouBattle-1.0.0-debug.apk`](layjou-battle/release/LayjouBattle-1.0.0-debug.apk) |
| Layjou Bubble | [`layjou-bubble/`](layjou-bubble/) | [`layjou-bubble/release/LayjouBubble-debug.apk`](layjou-bubble/release/LayjouBubble-debug.apk) |
| Layjou Puzzle | [`layjou-puzzle/`](layjou-puzzle/) | [`layjou-puzzle/release/LayjouPuzzle-debug.apk`](layjou-puzzle/release/LayjouPuzzle-debug.apk) |
| Layjou Run | [`layjou-run/`](layjou-run/) | [`layjou-run/release/LayjouRun-debug.apk`](layjou-run/release/LayjouRun-debug.apk) |
| Layjou Kart | [`layjou-kart/`](layjou-kart/) | [`layjou-kart/release/LayjouKart-1.0.0-demo.apk`](layjou-kart/release/LayjouKart-1.0.0-demo.apk) |

Les 6 jeux partagent le même compte AdMob (`pub-6003645213510535`) et le même module de retours haptiques. Le fichier [`app-ads.txt`](app-ads.txt) est à publier à la racine du site du développeur.
