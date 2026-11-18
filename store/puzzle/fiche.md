# Layjou Puzzle — fiche de publication

> Statut : **Prêt (APK de test compilé, projet iOS synchronisé)**
> Identifiant de l'app : `com.layjou.puzzle` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-puzzle/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-puzzle/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-puzzle/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
- Google Play (1080 × 1920) : `store/puzzle/google-play/` — 4 captures
- App Store iPhone (1206 × 2622) : `store/puzzle/app-store-iphone/` — 4 captures
- Captures brutes sans légende : `store/puzzle/captures-brutes/`

## Google Play — fiche principale

**Titre** (28/30 car.)
```
Layjou Puzzle : tri d'objets
```
**Description courte — FR** (73/80 car.)
```
Trie les objets sur les étagères : 3 identiques disparaissent. Relaxant !
```
**Short description — EN** (68/80 car.)
```
Sort the goods on the shelves: 3 matching items vanish. So relaxing!
```
**Catégorie** : Jeux › Puzzle · **Contient des annonces** : oui · **Achats intégrés** : non

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom (13/30 car.) | Layjou Puzzle | Layjou Puzzle |
| Sous-titre | Range 3 objets identiques (25/30 car.) | Sort 3 matching items (21/30 car.) |
| Catégorie | Jeux › Puzzle (secondaire : Casual) | |

**Texte promotionnel — FR** (88/170 car.)
```
Range, trie, gagne ! Des étagères à vider, des bonus malins et Layjou pour t'encourager.
```
**Promotional text — EN** (79/170 car.)
```
Sort, match, win! Shelves to clear, clever boosters and Layjou cheering you on.
```
**Mots-clés — FR** (67/100 octets, les lettres accentuées comptent double)
```
tri,ranger,étagère,triple,objets,match 3,casse-tête,relax,puzzle
```
**Keywords — EN** (64/100 octets)
```
sort,goods,shelf,triple,match 3,organize,brain,relax,puzzle,tidy
```

## Description complète (Play et App Store)

**FR** (775/4000 car.)
```
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

Déplace les objets d'une étagère à l'autre : dès que trois objets identiques sont réunis, ils disparaissent et les rangées cachées avancent.

• Glisser-déposer ou toucher-toucher, au choix
• Un chrono et des combos pour les plus rapides
• 3 bonus : Aimant, Mélange et Gel
• Une difficulté qui monte doucement de niveau en niveau

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit, en français et en anglais

Jeu gratuit, financé par des vidéos publicitaires facultatives.

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
```

**EN** (688/4000 car.)
```
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

Move items from shelf to shelf: as soon as three matching items meet, they vanish and the hidden rows move forward.

• Drag and drop or tap to move, your choice
• A timer and combos for the quickest players
• 3 boosters: Magnet, Shuffle and Freeze
• Difficulty that ramps up gently, level after level

WHY YOU'LL LOVE IT
• Short sessions, perfect for a quick break
• Easy to pick up, with real progression
• Rewards every day
• Playable offline
• Free to play, in English and French

Free to play, supported by optional video ads.

Discover all the Layjou games: Battle, Bubble, Puzzle, Run, Blocks and Kart.
```

## Classification
PEGI 3 probable — Apple : 4+ probable.
Répondre au questionnaire IARC (Play) et au questionnaire d'âge (App Store) avec ces éléments : pas de sang, pas de langage grossier, pas d'interaction entre joueurs, pas de chat, pas de jeu d'argent, publicités.

## Publicités (AdMob)
Vidéo récompensée uniquement (+60 s pour continuer, bonus gratuit). Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
Aucun achat intégré : rien à créer dans les consoles (pas de profil marchand ni d'accord « Paid Apps » nécessaires pour ce jeu).

## À faire dans le code avant l'envoi
- [ ] AdMob : blocs d'annonces dans `www/js/config.js` puis `testMode: false`.
- [ ] AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.
- [ ] Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.
- [ ] Android : aucune signature release configurée → créer un keystore et un `signingConfig`.
- [ ] Les objets sont des emojis : leur dessin varie selon le téléphone (les captures montrent ceux de Google).
- [ ] Appliquer la nouvelle icône (dossier `brand/layjou-puzzle/`).
