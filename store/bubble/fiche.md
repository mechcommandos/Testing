# Layjou Bubble — fiche de publication

> Statut : **Prêt (APK de test compilé, projet iOS synchronisé)**
> Identifiant de l'app : `com.layjou.bubble` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-bubble/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-bubble/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-bubble/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
- Google Play (1080 × 1920) : `store/bubble/google-play/` — 5 captures
- App Store iPhone (1206 × 2622) : `store/bubble/app-store-iphone/` — 5 captures
- Captures brutes sans légende : `store/bubble/captures-brutes/`

## Google Play — fiche principale

**Titre** (23/30 car.)
```
Layjou Bubble : match 3
```
**Description courte — FR** (72/80 car.)
```
Aligne 3 bulles ou plus, crée des combos et aide Layjou à se recharger !
```
**Short description — EN** (63/80 car.)
```
Match 3 bubbles or more, build combos and help Layjou recharge!
```
**Catégorie** : Jeux › Puzzle · **Contient des annonces** : oui · **Achats intégrés** : non

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom (13/30 car.) | Layjou Bubble | Layjou Bubble |
| Sous-titre | Le match-3 du robot Layjou (26/30 car.) | The Layjou robot match-3 (24/30 car.) |
| Catégorie | Jeux › Puzzle (secondaire : Casual) | |

**Texte promotionnel — FR** (99/170 car.)
```
30 niveaux colorés : brise la glace, fais descendre les batteries et combine les bulles spéciales !
```
**Promotional text — EN** (82/170 car.)
```
30 colorful levels: break the ice, drop the batteries and combine special bubbles!
```
**Mots-clés — FR** (66/100 octets, les lettres accentuées comptent double)
```
match 3,bulle,puzzle,combo,robot,casse-tête,niveaux,couleur,glace
```
**Keywords — EN** (66/100 octets)
```
match 3,bubble,puzzle,combo,robot,brain,levels,colors,ice,swap,pop
```

## Description complète (Play et App Store)

**FR** (791/4000 car.)
```
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

Fais glisser les bulles pour en aligner trois de la même couleur et regarde-les éclater !

• 30 niveaux avec 3 types d'objectifs : atteindre un score, briser la glace, faire descendre les batteries
• Bulles spéciales ligne, bombe et arc-en-ciel… à combiner entre elles
• Jusqu'à 3 étoiles par niveau
• Layjou t'encourage et réagit à chaque coup

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit, en français et en anglais

Jeu gratuit, financé par des vidéos publicitaires facultatives.

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
```

**EN** (683/4000 car.)
```
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

Swipe the bubbles to line up three of the same color and watch them pop!

• 30 levels with 3 kinds of goals: reach a score, break the ice, drop the batteries
• Line, bomb and rainbow special bubbles… combine them together
• Up to 3 stars per level
• Layjou cheers you on and reacts to every move

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
Vidéo récompensée uniquement (+5 coups quand il n'en reste plus). Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
Aucun achat intégré : rien à créer dans les consoles (pas de profil marchand ni d'accord « Paid Apps » nécessaires pour ce jeu).

## À faire dans le code avant l'envoi
- [ ] AdMob : blocs d'annonces dans `www/js/config.js` puis `testing: false`.
- [ ] AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.
- [ ] Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.
- [ ] iOS : ajouter `ITSAppUsesNonExemptEncryption` = `NO` dans `Info.plist` (évite la question de conformité à l'export à chaque envoi).
- [ ] Android : aucune signature release configurée → créer un keystore et un `signingConfig` (ou « Generate Signed Bundle » dans Android Studio).
- [ ] Appliquer la nouvelle icône (dossier `brand/layjou-bubble/`) puis régénérer avec `npx capacitor-assets generate`.
