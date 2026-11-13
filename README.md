# LayJou Blocks

Puzzle de blocs 8 × 8 avec LayJou le robot. Application Capacitor 8 (Android + iOS), Vite + TypeScript, sans framework.

- **APK de démonstration** : [`release/LayJouBlocks-1.0.0-debug.apk`](release/LayJouBlocks-1.0.0-debug.apk)
- **Sources iOS** : `ios/App/App.xcodeproj` (à ouvrir dans Xcode sur un Mac)

## Le jeu

- Glisser 3 pièces sur le plateau, compléter lignes et colonnes, enchaîner les combos.
- **LayJou** réagit à la partie (expressions, bulles, animations) et porte skins et accessoires.
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
| Blocs d'annonces récompensées, `testing: false` | `src/config.ts` → `ADMOB` |
| Identifiant d'application AdMob Android | `android/app/src/main/res/values/strings.xml` → `admob_app_id` |
| Identifiant d'application AdMob iOS | `ios/App/App/Info.plist` → `GADApplicationIdentifier` |
| Produits d'achat intégré | créer les 4 produits **consommables** de `CREDIT_PACKS` (`src/config.ts`) dans Play Console et App Store Connect |
| Prix, récompenses, coûts | `src/config.ts` (`ECONOMY`, `WEAPON_PRICES`) et `src/state/catalog.ts` |
| Identifiant de l'app (`com.layjou.blocks`) | `capacitor.config.ts`, puis recréer les plateformes |

Les identifiants AdMob fournis sont les identifiants de **test** officiels de Google : ils affichent de fausses annonces et ne rapportent rien.

Si le jeu vise les enfants, passer `ADMOB.childDirected` à `true` et suivre le programme Familles de Google Play.

## Commandes

```bash
npm install
npm run dev            # navigateur, achats et pubs simulés
npm test               # tests de la logique de jeu
npm run assets         # régénère les skins depuis assets/source/layjou-original.png

npm run android:debug  # APK de démonstration (achats simulés)
npm run android:release # AAB de production (signature à configurer)
npm run ios:sync       # prépare le projet Xcode
```

Le mode « bac à sable » (`npm run dev`, `npm run build:sandbox`) simule les achats tant que le store ne renvoie aucun produit. `npm run build` ne l'active jamais.

Prérequis Android : JDK 21, SDK Android 36, et `android/local.properties` contenant `sdk.dir=…`.
Prérequis iOS : un Mac avec Xcode ; les dépendances natives sont résolues par Swift Package Manager à l'ouverture du projet.

## Limites connues

- Validation des achats côté client uniquement (pas de serveur).
- Pas de musique, uniquement des effets sonores synthétisés.
- Le projet iOS n'a pas pu être compilé ici (pas de Mac) ; l'APK n'a pas été testé sur un appareil réel.
