# Layjou Battle — fiche de publication

> Statut : **Prêt (APK de test compilé, projet iOS synchronisé)**
> Identifiant de l'app : `com.layjou.battle` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-battle/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-battle/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-battle/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
- Google Play (1080 × 1920) : `store/battle/google-play/` — 5 captures
- App Store iPhone (1206 × 2622) : `store/battle/app-store-iphone/` — 5 captures
- Captures brutes sans légende : `store/battle/captures-brutes/`

## Google Play — fiche principale

**Titre** (28/30 car.)
```
Layjou Battle : robot combat
```
**Description courte — FR** (68/80 car.)
```
Affronte des monstres géants avec Layjou : pare, esquive et frappe !
```
**Short description — EN** (58/80 car.)
```
Fight giant monsters with Layjou: block, dodge and strike!
```
**Catégorie** : Jeux › Action · **Contient des annonces** : oui · **Achats intégrés** : oui

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom (13/30 car.) | Layjou Battle | Layjou Battle |
| Sous-titre | Combats de monstres géants (26/30 car.) | Giant monster battles (21/30 car.) |
| Catégorie | Jeux › Action (secondaire : Aventure) | |

**Texte promotionnel — FR** (95/170 car.)
```
Nouveau : 5 mondes, 25 niveaux et une Arène infinie. Défie les boss et personnalise ton robot !
```
**Promotional text — EN** (88/170 car.)
```
New: 5 worlds, 25 stages and an endless Arena. Beat the bosses and customize your robot!
```
**Mots-clés — FR** (67/100 octets, les lettres accentuées comptent double)
```
robot,combat,monstre,boss,arène,action,mignon,héros,kaiju,bagarre
```
**Keywords — EN** (66/100 octets)
```
robot,fight,monster,boss,arena,action,cute,hero,kaiju,brawler,mech
```

## Description complète (Play et App Store)

**FR** (1126/4000 car.)
```
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

Des monstres géants envahissent la ville et seul Layjou peut les arrêter ! Lis leurs attaques, pare au bon moment, esquive les coups rouges et contre-attaque.

• Combats en temps réel : frappe en combo, arme spéciale, parade parfaite et esquive
• Touche les points faibles et étourdis les monstres
• Déchaîne le Super Cœur, ton attaque ultime
• 5 mondes, 25 niveaux, 5 boss qui s'énervent à mi-vie, et une Arène infinie
• 10 skins, 10 accessoires et 7 armes à collectionner
• Améliore ta puissance, ton blindage et tes coups critiques au Labo
• Missions du jour, roue de la chance, coffres et cadeau quotidien

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit, en français et en anglais

Jeu gratuit avec achats intégrés facultatifs et publicités. Tu peux désactiver les achats intégrés dans les réglages de ton appareil.

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
```

**EN** (1013/4000 car.)
```
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

Giant monsters are invading the city and only Layjou can stop them! Read their attacks, block at the right moment, dodge the red ones and strike back.

• Real-time battles: punch combos, special weapon, perfect block and dodge
• Hit weak spots and stun the monsters
• Unleash the Super Heart, your ultimate attack
• 5 worlds, 25 stages, 5 bosses that get angry at half health, and an endless Arena
• 10 skins, 10 accessories and 7 weapons to collect
• Upgrade your power, armor and critical hits in the Lab
• Daily missions, lucky wheel, chests and a daily gift

WHY YOU'LL LOVE IT
• Short sessions, perfect for a quick break
• Easy to pick up, with real progression
• Rewards every day
• Playable offline
• Free to play, in English and French

Free to play with optional in-app purchases and ads. You can disable in-app purchases in your device settings.

Discover all the Layjou games: Battle, Bubble, Puzzle, Run, Blocks and Kart.
```

## Classification
PEGI 7 probable (violence de dessin animé envers des personnages fantastiques) — Apple : 9+ probable (« violence de dessin animé ou fantastique, fréquente »).
Répondre au questionnaire IARC (Play) et au questionnaire d'âge (App Store) avec ces éléments : pas de sang, pas de langage grossier, pas d'interaction entre joueurs, pas de chat, pas de jeu d'argent, achats intégrés, publicités.

## Publicités (AdMob)
Vidéos récompensées (continuer, doubler les gains, crédits gratuits, roue, objets) + interstitiels rares entre les combats. Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
| Identifiant (identique dans les deux stores) | Type | Contenu | Prix de référence |
|---|---|---|---|
| `credits_80` | Consommable | 80 crédits | 0,99 € |
| `credits_450` | Consommable | 450 crédits | 4,99 € |
| `credits_1000` | Consommable | 1 000 crédits | 9,99 € |
| `credits_2200` | Consommable | 2 200 crédits | 19,99 € |
| `credits_6000` | Consommable | 6 000 crédits | 49,99 € |
| `starter_pack` | Non consommable | Pack de Départ : skin Galaxie, Sabre Laser, 300 crédits, 5 000 pièces | 2,99 € |
| `remove_ads` | Non consommable | Sans Pubs (supprime les interstitiels) | 3,99 € |

Les prix réels viennent des consoles (paliers de prix par pays) ; le prix de référence ne sert que hors ligne. Le bouton « Restaurer les achats » exigé par Apple pour les non-consommables est déjà dans les réglages du jeu.

## À faire dans le code avant l'envoi
- [ ] AdMob : remplacer les blocs d'annonces dans `src/core/config.js` (`ads.android`, `ads.ios`) et passer `useTestAds` à `false`.
- [ ] AdMob : identifiant d'application dans `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`).
- [ ] iOS : compléter `SKAdNetworkItems` (1 seul identifiant aujourd'hui) avec la liste fournie par Google.
- [ ] Android : créer `android/keystore.properties` (la configuration de signature est déjà prête dans `build.gradle`), puis `npm run android:bundle`.
- [ ] Achats web de démonstration : passer `iap.webDemo` à `false` si une version web est publiée.
