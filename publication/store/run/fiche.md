# Layjou Run — fiche de publication

> Statut : **Prêt (APK de test compilé, projet iOS synchronisé)**
> Identifiant de l'app : `com.layjou.run` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-run/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-run/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-run/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
- Google Play (1080 × 1920) : `store/run/google-play/` — 5 captures
- App Store iPhone (1206 × 2622) : `store/run/app-store-iphone/` — 5 captures
- Captures brutes sans légende : `store/run/captures-brutes/`

## Google Play — fiche principale

**Titre** (28/30 car.)
```
Layjou Run : course sans fin
```
**Description courte — FR** (74/80 car.)
```
Cours sur les rails avec Layjou, esquive les trains et ramasse les cœurs !
```
**Short description — EN** (63/80 car.)
```
Run the rails with Layjou, dodge the trains and collect hearts!
```
**Catégorie** : Jeux › Arcade · **Contient des annonces** : oui · **Achats intégrés** : non

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom (10/30 car.) | Layjou Run | Layjou Run |
| Sous-titre | Cours, saute, esquive ! (23/30 car.) | Run, jump and dodge! (20/30 car.) |
| Catégorie | Jeux › Action (secondaire : Arcade) | |

**Texte promotionnel — FR** (95/170 car.)
```
Une course 3D sans fin : esquive les trains, ramasse les cœurs et bats ton record chaque jour !
```
**Promotional text — EN** (80/170 car.)
```
An endless 3D run: dodge trains, grab hearts and beat your high score every day!
```
**Mots-clés — FR** (63/100 octets, les lettres accentuées comptent double)
```
course,runner,train,rails,saut,esquive,arcade,robot,sans fin,3d
```
**Keywords — EN** (63/100 octets)
```
runner,endless,train,rails,jump,dodge,arcade,robot,dash,3d,city
```

## Description complète (Play et App Store)

**FR** (807/4000 car.)
```
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

Layjou file à toute vitesse sur les voies ferrées de la ville. Glisse à gauche ou à droite pour changer de voie, vers le haut pour sauter, vers le bas pour passer sous les portiques !

• Course en 3D sur 3 voies
• Bonus Aimant, Bouclier et Score ×2… à améliorer avec tes cœurs
• Missions et bonus de connexion chaque jour
• Une partie plus rapide et plus folle à chaque fois

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit, en français

Jeu gratuit, financé par des vidéos publicitaires facultatives.

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
```

**EN** (688/4000 car.)
```
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

Layjou dashes across the city's railways. Swipe left or right to switch lanes, up to jump and down to slide under the gates!

• 3D running on 3 lanes
• Magnet, Shield and Score ×2 power-ups… upgrade them with your hearts
• Daily missions and login bonuses
• Every run gets faster and crazier

WHY YOU'LL LOVE IT
• Short sessions, perfect for a quick break
• Easy to pick up, with real progression
• Rewards every day
• Playable offline
• Free to play (French-only interface for now)

Free to play, supported by optional video ads.

Discover all the Layjou games: Battle, Bubble, Puzzle, Run, Blocks and Kart.
```

## Classification
PEGI 3 probable — Apple : 4+ probable.
Répondre au questionnaire IARC (Play) et au questionnaire d'âge (App Store) avec ces éléments : pas de sang, pas de langage grossier, pas d'interaction entre joueurs, pas de chat, pas de jeu d'argent, publicités.

## Publicités (AdMob)
Vidéo récompensée uniquement (continuer la course, une fois par partie). Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
Aucun achat intégré : rien à créer dans les consoles (pas de profil marchand ni d'accord « Paid Apps » nécessaires pour ce jeu).

## À faire dans le code avant l'envoi
- [ ] AdMob : blocs d'annonces dans `www/ads.js` (`REWARDED_UNITS`). Ce projet n'a pas de drapeau de test : déclarer vos appareils de test dans AdMob avant d'installer une version avec les vrais identifiants.
- [ ] AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.
- [ ] Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.
- [ ] Les polices sont chargées depuis Google Fonts au démarrage : les embarquer dans l'app évite cet appel réseau (confidentialité et jeu hors ligne).
- [ ] Interface uniquement en français : ne cocher que le français dans les langues de la fiche, ou traduire avant de publier en anglais.
- [ ] Android : aucune signature release configurée → créer un keystore et un `signingConfig`.
- [ ] Appliquer la nouvelle icône (dossier `brand/layjou-run/`).
