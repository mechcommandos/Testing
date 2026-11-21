# Layjou Blocks — fiche de publication

> Statut : **Prêt (APK de test compilé, projet iOS synchronisé)**
> Identifiant de l'app : `com.layjou.blocks` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-blocks/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-blocks/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-blocks/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
- Google Play (1080 × 1920) : `store/blocks/google-play/` — 5 captures
- App Store iPhone (1206 × 2622) : `store/blocks/app-store-iphone/` — 5 captures
- Captures brutes sans légende : `store/blocks/captures-brutes/`

## Google Play — fiche principale

**Titre** (28/30 car.)
```
Layjou Blocks : puzzle blocs
```
**Description courte — FR** (74/80 car.)
```
Place les pièces, complète des lignes et enchaîne les combos avec Layjou !
```
**Short description — EN** (59/80 car.)
```
Place the pieces, clear lines and chain combos with Layjou!
```
**Catégorie** : Jeux › Puzzle · **Contient des annonces** : oui · **Achats intégrés** : oui

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom (13/30 car.) | Layjou Blocks | Layjou Blocks |
| Sous-titre | Puzzle de blocs avec Layjou (27/30 car.) | Block puzzle with Layjou (24/30 car.) |
| Catégorie | Jeux › Puzzle (secondaire : Casual) | |

**Texte promotionnel — FR** (87/170 car.)
```
Un puzzle de blocs addictif : armes magiques, missions du jour et un robot à habiller !
```
**Promotional text — EN** (79/170 car.)
```
An addictive block puzzle: magic tools, daily missions and a robot to dress up!
```
**Mots-clés — FR** (65/100 octets, les lettres accentuées comptent double)
```
blocs,puzzle,lignes,grille,8x8,casse-tête,combo,cube,robot,relax
```
**Keywords — EN** (64/100 octets)
```
block,puzzle,lines,grid,8x8,brain,combo,cube,robot,relax,classic
```

## Description complète (Play et App Store)

**FR** (999/4000 car.)
```
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

Glisse les trois pièces proposées sur le plateau 8 × 8 et complète des lignes ou des colonnes pour les effacer. Plus tu en effaces d'un coup, plus le combo grimpe !

• Un puzzle simple à prendre en main, difficile à lâcher
• 4 armes pour te sortir d'affaire : Marteau, Laser, Chroma et Recycleur
• Layjou réagit à ta partie : joie, inquiétude, fierté…
• 7 skins et des accessoires pour habiller ton robot
• 3 missions par jour, cadeau quotidien et partie sauvegardée automatiquement

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit, en français et en anglais

Jeu gratuit avec achats intégrés facultatifs et publicités. Tu peux désactiver les achats intégrés dans les réglages de ton appareil.

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
```

**EN** (850/4000 car.)
```
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

Drag the three pieces onto the 8 × 8 board and complete rows or columns to clear them. The more you clear at once, the bigger the combo!

• Easy to pick up, hard to put down
• 4 tools to get out of trouble: Hammer, Laser, Chroma and Recycler
• Layjou reacts to your game: joy, worry, pride…
• 7 skins and accessories to dress up your robot
• 3 daily missions, a daily gift and automatic game saving

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
PEGI 3 probable — Apple : 4+ probable (les « armes » sont des outils de puzzle).
Répondre au questionnaire IARC (Play) et au questionnaire d'âge (App Store) avec ces éléments : pas de sang, pas de langage grossier, pas d'interaction entre joueurs, pas de chat, pas de jeu d'argent, achats intégrés, publicités.

## Publicités (AdMob)
Vidéos récompensées (continuer, doubler les boulons, arme gratuite, +60 boulons). Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
| Identifiant (identique dans les deux stores) | Type | Contenu | Prix de référence |
|---|---|---|---|
| `layjou_credits_80` | Consommable | 80 crédits | 0,99 € |
| `layjou_credits_500` | Consommable | 500 crédits | 4,99 € |
| `layjou_credits_1200` | Consommable | 1 200 crédits | 9,99 € |
| `layjou_credits_3000` | Consommable | 3 000 crédits | 19,99 € |

Les prix réels viennent des consoles (paliers de prix par pays) ; le prix de référence ne sert que hors ligne.

## À faire dans le code avant l'envoi
- [ ] AdMob : blocs d'annonces dans `src/config.ts` (`ADMOB`), `testing: false`.
- [ ] AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.
- [ ] Construire avec `npm run android:release` (jamais le mode `sandbox`, qui simule pubs et achats).
- [ ] Android : aucune signature release configurée dans `build.gradle` → créer un keystore et un `signingConfig`.
- [ ] Appliquer la nouvelle icône (dossier `brand/layjou-blocks/`).
