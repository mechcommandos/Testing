#!/usr/bin/env python3
"""Génère store/<jeu>/fiche.md pour les 6 jeux Layjou et vérifie les limites des stores.

    python3 tools/store-listings.py

Limites vérifiées (Google Play / App Store Connect) :
  titre Play ≤ 30 car. · description courte ≤ 80 · description complète ≤ 4000
  nom App Store ≤ 30 · sous-titre ≤ 30 · texte promotionnel ≤ 170 · mots-clés ≤ 100 octets (UTF-8)
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COMMON_FR = """
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

{body}

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des récompenses chaque jour
• Jouable hors connexion
• Gratuit{lang_note}

{monetisation}

Retrouve tous les jeux Layjou : Battle, Bubble, Puzzle, Run, Blocks et Kart.
""".strip()

COMMON_EN = """
Layjou, the little robot with a pink heart, takes you on a colorful adventure!

{body}

WHY YOU'LL LOVE IT
• Short sessions, perfect for a quick break
• Easy to pick up, with real progression
• Rewards every day
• Playable offline
• Free to play{lang_note}

{monetisation}

Discover all the Layjou games: Battle, Bubble, Puzzle, Run, Blocks and Kart.
""".strip()

GAMES = {
    'battle': dict(
        name='Layjou Battle', bundle='com.layjou.battle', status='Prêt (APK de test compilé, projet iOS synchronisé)',
        play_title='Layjou Battle : robot combat', play_cat='Jeux › Action', apple_cat='Jeux › Action (secondaire : Aventure)',
        rating='PEGI 7 probable (violence de dessin animé envers des personnages fantastiques) — Apple : 9+ probable (« violence de dessin animé ou fantastique, fréquente »).',
        subtitle_fr='Combats de monstres géants', subtitle_en='Giant monster battles',
        short_fr='Affronte des monstres géants avec Layjou : pare, esquive et frappe !',
        short_en='Fight giant monsters with Layjou: block, dodge and strike!',
        promo_fr='Nouveau : 5 mondes, 25 niveaux et une Arène infinie. Défie les boss et personnalise ton robot !',
        promo_en='New: 5 worlds, 25 stages and an endless Arena. Beat the bosses and customize your robot!',
        kw_fr='robot,combat,monstre,boss,arène,action,mignon,héros,kaiju,bagarre',
        kw_en='robot,fight,monster,boss,arena,action,cute,hero,kaiju,brawler,mech',
        body_fr="""Des monstres géants envahissent la ville et seul Layjou peut les arrêter ! Lis leurs attaques, pare au bon moment, esquive les coups rouges et contre-attaque.

• Combats en temps réel : frappe en combo, arme spéciale, parade parfaite et esquive
• Touche les points faibles et étourdis les monstres
• Déchaîne le Super Cœur, ton attaque ultime
• 5 mondes, 25 niveaux, 5 boss qui s'énervent à mi-vie, et une Arène infinie
• 10 skins, 10 accessoires et 7 armes à collectionner
• Améliore ta puissance, ton blindage et tes coups critiques au Labo
• Missions du jour, roue de la chance, coffres et cadeau quotidien""",
        body_en="""Giant monsters are invading the city and only Layjou can stop them! Read their attacks, block at the right moment, dodge the red ones and strike back.

• Real-time battles: punch combos, special weapon, perfect block and dodge
• Hit weak spots and stun the monsters
• Unleash the Super Heart, your ultimate attack
• 5 worlds, 25 stages, 5 bosses that get angry at half health, and an endless Arena
• 10 skins, 10 accessories and 7 weapons to collect
• Upgrade your power, armor and critical hits in the Lab
• Daily missions, lucky wheel, chests and a daily gift""",
        ads='Vidéos récompensées (continuer, doubler les gains, crédits gratuits, roue, objets) + interstitiels rares entre les combats',
        iap=[('credits_80', 'Consommable', '80 crédits', '0,99 €'), ('credits_450', 'Consommable', '450 crédits', '4,99 €'),
             ('credits_1000', 'Consommable', '1 000 crédits', '9,99 €'), ('credits_2200', 'Consommable', '2 200 crédits', '19,99 €'),
             ('credits_6000', 'Consommable', '6 000 crédits', '49,99 €'),
             ('starter_pack', 'Non consommable', 'Pack de Départ : skin Galaxie, Sabre Laser, 300 crédits, 5 000 pièces', '2,99 €'),
             ('remove_ads', 'Non consommable', 'Sans Pubs (supprime les interstitiels)', '3,99 €')],
        code=[
            'AdMob : remplacer les blocs d\'annonces dans `src/core/config.js` (`ads.android`, `ads.ios`) et passer `useTestAds` à `false`.',
            'AdMob : identifiant d\'application dans `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et `ios/App/App/Info.plist` (`GADApplicationIdentifier`).',
            'iOS : compléter `SKAdNetworkItems` (1 seul identifiant aujourd\'hui) avec la liste fournie par Google.',
            'Android : créer `android/keystore.properties` (la configuration de signature est déjà prête dans `build.gradle`), puis `npm run android:bundle`.',
            'Achats web de démonstration : passer `iap.webDemo` à `false` si une version web est publiée.',
        ],
        notifications=True,
    ),
    'bubble': dict(
        name='Layjou Bubble', bundle='com.layjou.bubble', status='Prêt (APK de test compilé, projet iOS synchronisé)',
        play_title='Layjou Bubble : match 3', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
        rating='PEGI 3 probable — Apple : 4+ probable.',
        subtitle_fr='Le match-3 du robot Layjou', subtitle_en='The Layjou robot match-3',
        short_fr='Aligne 3 bulles ou plus, crée des combos et aide Layjou à se recharger !',
        short_en='Match 3 bubbles or more, build combos and help Layjou recharge!',
        promo_fr='30 niveaux colorés : brise la glace, fais descendre les batteries et combine les bulles spéciales !',
        promo_en='30 colorful levels: break the ice, drop the batteries and combine special bubbles!',
        kw_fr='match 3,bulle,puzzle,combo,robot,casse-tête,niveaux,couleur,glace',
        kw_en='match 3,bubble,puzzle,combo,robot,brain,levels,colors,ice,swap,pop',
        body_fr="""Fais glisser les bulles pour en aligner trois de la même couleur et regarde-les éclater !

• 30 niveaux avec 3 types d'objectifs : atteindre un score, briser la glace, faire descendre les batteries
• Bulles spéciales ligne, bombe et arc-en-ciel… à combiner entre elles
• Jusqu'à 3 étoiles par niveau
• Layjou t'encourage et réagit à chaque coup""",
        body_en="""Swipe the bubbles to line up three of the same color and watch them pop!

• 30 levels with 3 kinds of goals: reach a score, break the ice, drop the batteries
• Line, bomb and rainbow special bubbles… combine them together
• Up to 3 stars per level
• Layjou cheers you on and reacts to every move""",
        ads='Vidéo récompensée uniquement (+5 coups quand il n\'en reste plus)', iap=[],
        code=[
            'AdMob : blocs d\'annonces dans `www/js/config.js` puis `testing: false`.',
            'AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.',
            'Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.',
            'iOS : ajouter `ITSAppUsesNonExemptEncryption` = `NO` dans `Info.plist` (évite la question de conformité à l\'export à chaque envoi).',
            'Android : aucune signature release configurée → créer un keystore et un `signingConfig` (ou « Generate Signed Bundle » dans Android Studio).',
            'Appliquer la nouvelle icône (dossier `brand/layjou-bubble/`) puis régénérer avec `npx capacitor-assets generate`.',
        ],
    ),
    'puzzle': dict(
        name='Layjou Puzzle', bundle='com.layjou.puzzle', status='Prêt (APK de test compilé, projet iOS synchronisé)',
        play_title='Layjou Puzzle : tri d\'objets', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
        rating='PEGI 3 probable — Apple : 4+ probable.',
        subtitle_fr='Range 3 objets identiques', subtitle_en='Sort 3 matching items',
        short_fr='Trie les objets sur les étagères : 3 identiques disparaissent. Relaxant !',
        short_en='Sort the goods on the shelves: 3 matching items vanish. So relaxing!',
        promo_fr='Range, trie, gagne ! Des étagères à vider, des bonus malins et Layjou pour t\'encourager.',
        promo_en='Sort, match, win! Shelves to clear, clever boosters and Layjou cheering you on.',
        kw_fr='tri,ranger,étagère,triple,objets,match 3,casse-tête,relax,puzzle',
        kw_en='sort,goods,shelf,triple,match 3,organize,brain,relax,puzzle,tidy',
        body_fr="""Déplace les objets d'une étagère à l'autre : dès que trois objets identiques sont réunis, ils disparaissent et les rangées cachées avancent.

• Glisser-déposer ou toucher-toucher, au choix
• Un chrono et des combos pour les plus rapides
• 3 bonus : Aimant, Mélange et Gel
• Une difficulté qui monte doucement de niveau en niveau""",
        body_en="""Move items from shelf to shelf: as soon as three matching items meet, they vanish and the hidden rows move forward.

• Drag and drop or tap to move, your choice
• A timer and combos for the quickest players
• 3 boosters: Magnet, Shuffle and Freeze
• Difficulty that ramps up gently, level after level""",
        ads='Vidéo récompensée uniquement (+60 s pour continuer, bonus gratuit)', iap=[],
        code=[
            'AdMob : blocs d\'annonces dans `www/js/config.js` puis `testMode: false`.',
            'AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.',
            'Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.',
            'Android : aucune signature release configurée → créer un keystore et un `signingConfig`.',
            'Les objets sont des emojis : leur dessin varie selon le téléphone (les captures montrent ceux de Google).',
            'Appliquer la nouvelle icône (dossier `brand/layjou-puzzle/`).',
        ],
    ),
    'run': dict(
        name='Layjou Run', bundle='com.layjou.run', status='Prêt (APK de test compilé, projet iOS synchronisé)',
        play_title='Layjou Run : course sans fin', play_cat='Jeux › Arcade', apple_cat='Jeux › Action (secondaire : Arcade)',
        rating='PEGI 3 probable — Apple : 4+ probable.',
        subtitle_fr='Cours, saute, esquive !', subtitle_en='Run, jump and dodge!',
        short_fr='Cours sur les rails avec Layjou, esquive les trains et ramasse les cœurs !',
        short_en='Run the rails with Layjou, dodge the trains and collect hearts!',
        promo_fr='Une course 3D sans fin : esquive les trains, ramasse les cœurs et bats ton record chaque jour !',
        promo_en='An endless 3D run: dodge trains, grab hearts and beat your high score every day!',
        kw_fr='course,runner,train,rails,saut,esquive,arcade,robot,sans fin,3d',
        kw_en='runner,endless,train,rails,jump,dodge,arcade,robot,dash,3d,city',
        body_fr="""Layjou file à toute vitesse sur les voies ferrées de la ville. Glisse à gauche ou à droite pour changer de voie, vers le haut pour sauter, vers le bas pour passer sous les portiques !

• Course en 3D sur 3 voies
• Bonus Aimant, Bouclier et Score ×2… à améliorer avec tes cœurs
• Missions et bonus de connexion chaque jour
• Une partie plus rapide et plus folle à chaque fois""",
        body_en="""Layjou dashes across the city's railways. Swipe left or right to switch lanes, up to jump and down to slide under the gates!

• 3D running on 3 lanes
• Magnet, Shield and Score ×2 power-ups… upgrade them with your hearts
• Daily missions and login bonuses
• Every run gets faster and crazier""",
        ads='Vidéo récompensée uniquement (continuer la course, une fois par partie)', iap=[],
        lang_fr=', en français', lang_en=' (French-only interface for now)',
        code=[
            'AdMob : blocs d\'annonces dans `www/ads.js` (`REWARDED_UNITS`). Ce projet n\'a pas de drapeau de test : déclarer vos appareils de test dans AdMob avant d\'installer une version avec les vrais identifiants.',
            'AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.',
            'Ajouter dans les réglages un bouton « Confidentialité des pubs » qui appelle `AdMob.showPrivacyOptionsForm()` : exigé par le formulaire de consentement RGPD (UMP) pour les joueurs européens.',
            'Les polices sont chargées depuis Google Fonts au démarrage : les embarquer dans l\'app évite cet appel réseau (confidentialité et jeu hors ligne).',
            'Interface uniquement en français : ne cocher que le français dans les langues de la fiche, ou traduire avant de publier en anglais.',
            'Android : aucune signature release configurée → créer un keystore et un `signingConfig`.',
            'Appliquer la nouvelle icône (dossier `brand/layjou-run/`).',
        ],
    ),
    'blocks': dict(
        name='Layjou Blocks', bundle='com.layjou.blocks', status='Prêt (APK de test compilé, projet iOS synchronisé)',
        play_title='Layjou Blocks : puzzle blocs', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
        rating='PEGI 3 probable — Apple : 4+ probable (les « armes » sont des outils de puzzle).',
        subtitle_fr='Puzzle de blocs avec Layjou', subtitle_en='Block puzzle with Layjou',
        short_fr='Place les pièces, complète des lignes et enchaîne les combos avec Layjou !',
        short_en='Place the pieces, clear lines and chain combos with Layjou!',
        promo_fr='Un puzzle de blocs addictif : armes magiques, missions du jour et un robot à habiller !',
        promo_en='An addictive block puzzle: magic tools, daily missions and a robot to dress up!',
        kw_fr='blocs,puzzle,lignes,grille,8x8,casse-tête,combo,cube,robot,relax',
        kw_en='block,puzzle,lines,grid,8x8,brain,combo,cube,robot,relax,classic',
        body_fr="""Glisse les trois pièces proposées sur le plateau 8 × 8 et complète des lignes ou des colonnes pour les effacer. Plus tu en effaces d'un coup, plus le combo grimpe !

• Un puzzle simple à prendre en main, difficile à lâcher
• 4 armes pour te sortir d'affaire : Marteau, Laser, Chroma et Recycleur
• Layjou réagit à ta partie : joie, inquiétude, fierté…
• 7 skins et des accessoires pour habiller ton robot
• 3 missions par jour, cadeau quotidien et partie sauvegardée automatiquement""",
        body_en="""Drag the three pieces onto the 8 × 8 board and complete rows or columns to clear them. The more you clear at once, the bigger the combo!

• Easy to pick up, hard to put down
• 4 tools to get out of trouble: Hammer, Laser, Chroma and Recycler
• Layjou reacts to your game: joy, worry, pride…
• 7 skins and accessories to dress up your robot
• 3 daily missions, a daily gift and automatic game saving""",
        ads='Vidéos récompensées (continuer, doubler les boulons, arme gratuite, +60 boulons)',
        iap=[('layjou_credits_80', 'Consommable', '80 crédits', '0,99 €'), ('layjou_credits_500', 'Consommable', '500 crédits', '4,99 €'),
             ('layjou_credits_1200', 'Consommable', '1 200 crédits', '9,99 €'), ('layjou_credits_3000', 'Consommable', '3 000 crédits', '19,99 €')],
        code=[
            'AdMob : blocs d\'annonces dans `src/config.ts` (`ADMOB`), `testing: false`.',
            'AdMob : `admob_app_id` (Android) et `GADApplicationIdentifier` (iOS), compléter `SKAdNetworkItems`.',
            'Construire avec `npm run android:release` (jamais le mode `sandbox`, qui simule pubs et achats).',
            'Android : aucune signature release configurée dans `build.gradle` → créer un keystore et un `signingConfig`.',
            'Appliquer la nouvelle icône (dossier `brand/layjou-blocks/`).',
        ],
    ),
    'kart': dict(
        name='Layjou Kart', bundle='com.layjou.kart (à confirmer)', status='EN DÉVELOPPEMENT — textes provisoires, captures à faire quand le jeu sera terminé',
        play_title='Layjou Kart : course de karts', play_cat='Jeux › Course', apple_cat='Jeux › Course (secondaire : Action)',
        rating='À déterminer selon les armes du jeu final — probablement PEGI 3 ou 7, Apple 4+ ou 9+.',
        subtitle_fr='Courses de karts déjantées', subtitle_en='Wacky kart racing',
        short_fr='Pilote ton kart avec Layjou : dérape, ramasse des objets et finis premier !',
        short_en='Drive your kart with Layjou: drift, grab items and finish first!',
        promo_fr='Dérapages, mini-turbos et objets surprises : défie 7 rivaux sur des circuits de 5 mondes !',
        promo_en='Drifts, mini-turbos and surprise items: race 7 rivals across tracks in 5 worlds!',
        kw_fr='kart,course,voiture,dérapage,turbo,circuit,pilote,robot,arcade',
        kw_en='kart,racing,car,drift,turbo,track,driver,robot,arcade,speed,race',
        body_fr="""Layjou prend le volant ! Fonce sur des circuits colorés, dérape dans les virages pour charger tes mini-turbos et utilise des objets surprises pour doubler tes rivaux.

• Courses contre 7 rivaux
• Dérapages et mini-turbos
• Objets et armes spéciales
• Circuits dans 5 mondes : Bonbon, Néon, Cristal, Neige et Glitch""",
        body_en="""Layjou takes the wheel! Speed along colorful tracks, drift through corners to charge your mini-turbos and use surprise items to overtake your rivals.

• Races against 7 rivals
• Drifts and mini-turbos
• Items and special weapons
• Tracks across 5 worlds: Candy, Neon, Crystal, Snow and Glitch""",
        ads='À définir (probablement vidéos récompensées)', iap=None,
        code=['Le jeu est en cours de création dans une autre session : reprendre cette fiche quand il sera terminé (fonctionnalités, achats, pubs, captures).'],
    ),
}


def b(s):
    return len(s.encode('utf-8'))


def check(g, key, val, limit, unit='car.'):
    n = b(val) if unit == 'octets' else len(val)
    assert n <= limit, f'{g}: {key} trop long ({n} {unit} > {limit}) : {val!r}'
    return f'{n}/{limit} {unit}'


def monetisation(d, lang):
    fr = lang == 'fr'
    iap = d['iap']
    if iap is None:
        return 'Jeu gratuit.' if fr else 'Free to play.'
    if iap:
        return ('Jeu gratuit avec achats intégrés facultatifs et publicités. Tu peux désactiver les achats intégrés dans les réglages de ton appareil.'
                if fr else 'Free to play with optional in-app purchases and ads. You can disable in-app purchases in your device settings.')
    return 'Jeu gratuit, financé par des vidéos publicitaires facultatives.' if fr else 'Free to play, supported by optional video ads.'


def fiche(g, d):
    full_fr = COMMON_FR.format(body=d['body_fr'], lang_note=d.get('lang_fr', ', en français et en anglais'), monetisation=monetisation(d, 'fr'))
    full_en = COMMON_EN.format(body=d['body_en'], lang_note=d.get('lang_en', ', in English and French'), monetisation=monetisation(d, 'en'))
    L = {
        'play_title': check(g, 'titre Play', d['play_title'], 30),
        'name': check(g, 'nom App Store', d['name'], 30),
        'sub_fr': check(g, 'sous-titre FR', d['subtitle_fr'], 30), 'sub_en': check(g, 'sous-titre EN', d['subtitle_en'], 30),
        'short_fr': check(g, 'description courte FR', d['short_fr'], 80), 'short_en': check(g, 'description courte EN', d['short_en'], 80),
        'promo_fr': check(g, 'texte promo FR', d['promo_fr'], 170), 'promo_en': check(g, 'texte promo EN', d['promo_en'], 170),
        'kw_fr': check(g, 'mots-clés FR', d['kw_fr'], 100, 'octets'), 'kw_en': check(g, 'mots-clés EN', d['kw_en'], 100, 'octets'),
        'full_fr': check(g, 'description FR', full_fr, 4000), 'full_en': check(g, 'description EN', full_en, 4000),
    }
    shots_dir = os.path.join(ROOT, 'store', g, 'google-play')
    nshots = len([f for f in os.listdir(shots_dir) if f.endswith('.jpg')]) if os.path.isdir(shots_dir) else 0
    iap = d['iap']
    if iap is None:
        iap_md = '_À définir quand le jeu sera terminé._'
    elif not iap:
        iap_md = 'Aucun achat intégré : rien à créer dans les consoles (pas de profil marchand ni d\'accord « Paid Apps » nécessaires pour ce jeu).'
    else:
        iap_md = ('| Identifiant (identique dans les deux stores) | Type | Contenu | Prix de référence |\n|---|---|---|---|\n'
                  + '\n'.join(f'| `{i}` | {t} | {c} | {p} |' for i, t, c, p in iap)
                  + '\n\nLes prix réels viennent des consoles (paliers de prix par pays) ; le prix de référence ne sert que hors ligne.')
        if any(t == 'Non consommable' for _, t, _, _ in iap):
            iap_md += ' Le bouton « Restaurer les achats » exigé par Apple pour les non-consommables est déjà dans les réglages du jeu.'
    code_md = '\n'.join(f'- [ ] {c}' for c in d['code'])
    shots_md = (f'- Google Play (1080 × 1920) : `store/{g}/google-play/` — {nshots} captures\n'
                f'- App Store iPhone (1206 × 2622) : `store/{g}/app-store-iphone/` — {nshots} captures\n'
                f'- Captures brutes sans légende : `store/{g}/captures-brutes/`') if nshots else '- _Captures à réaliser quand le jeu sera terminé._'
    return f"""# {d['name']} — fiche de publication

> Statut : **{d['status']}**
> Identifiant de l'app : `{d['bundle']}` · Version : 1.0 (code de version 1)

## Visuels
- Icône Play Store 512 × 512 : `brand/layjou-{g}/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 : `brand/layjou-{g}/store/feature-graphic-1024x500.png`
- Icône App Store 1024 × 1024 : `brand/layjou-{g}/icon-only.png` (à intégrer au projet Xcode via `npx capacitor-assets generate`)
{shots_md}

## Google Play — fiche principale

**Titre** ({L['play_title']})
```
{d['play_title']}
```
**Description courte — FR** ({L['short_fr']})
```
{d['short_fr']}
```
**Short description — EN** ({L['short_en']})
```
{d['short_en']}
```
**Catégorie** : {d['play_cat']} · **Contient des annonces** : oui · **Achats intégrés** : {'oui' if d['iap'] else ('à définir' if d['iap'] is None else 'non')}

## App Store Connect

| Champ | FR | EN |
|---|---|---|
| Nom ({L['name']}) | {d['name']} | {d['name']} |
| Sous-titre | {d['subtitle_fr']} ({L['sub_fr']}) | {d['subtitle_en']} ({L['sub_en']}) |
| Catégorie | {d['apple_cat']} | |

**Texte promotionnel — FR** ({L['promo_fr']})
```
{d['promo_fr']}
```
**Promotional text — EN** ({L['promo_en']})
```
{d['promo_en']}
```
**Mots-clés — FR** ({L['kw_fr']}, les lettres accentuées comptent double)
```
{d['kw_fr']}
```
**Keywords — EN** ({L['kw_en']})
```
{d['kw_en']}
```

## Description complète (Play et App Store)

**FR** ({L['full_fr']})
```
{full_fr}
```

**EN** ({L['full_en']})
```
{full_en}
```

## Classification
{d['rating']}
Répondre au questionnaire IARC (Play) et au questionnaire d'âge (App Store) avec ces éléments : pas de sang, pas de langage grossier, pas d'interaction entre joueurs, pas de chat, pas de jeu d'argent{', achats intégrés' if d['iap'] else ''}, publicités.

## Publicités (AdMob)
{d['ads']}. Créer dans AdMob une app par plateforme (Android et iOS) et les blocs d'annonces correspondants.

## Achats intégrés
{iap_md}

## À faire dans le code avant l'envoi
{code_md}
"""


def main():
    for g, d in GAMES.items():
        os.makedirs(os.path.join(ROOT, 'store', g), exist_ok=True)
        with open(os.path.join(ROOT, 'store', g, 'fiche.md'), 'w', encoding='utf-8') as f:
            f.write(fiche(g, d))
        print('✓', g)


if __name__ == '__main__':
    main()
