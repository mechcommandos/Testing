#!/usr/bin/env python3
"""Génère publication/store/<jeu>/fiche.md pour les 6 jeux Layjou et vérifie les limites des stores.

    python3 publication/outils/store-listings.py

Limites vérifiées (Google Play / App Store Connect) :
  titre Play ≤ 30 car. · description courte ≤ 80 · description complète ≤ 4000
  nom App Store ≤ 30 · sous-titre ≤ 30 · texte promotionnel ≤ 170 · mots-clés ≤ 100 octets (UTF-8)
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # publication/
PRIVACY_URL = 'https://layjou.com/confidentialite/'
SUPPORT_URL = 'https://layjou.com/support/'

COMMON_FR = """
Layjou, le petit robot au cœur rose, t'emmène dans une aventure pleine de couleurs !

{body}

POURQUOI TU VAS ADORER
• Des parties courtes, parfaites pour les pauses
• Une prise en main immédiate, une vraie progression
• Des vibrations qui font ressentir chaque action (désactivables)
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
• Haptic feedback you can feel with every move (can be turned off)
• Rewards every day
• Playable offline
• Free to play{lang_note}

{monetisation}

Discover all the Layjou games: Battle, Bubble, Puzzle, Run, Blocks and Kart.
""".strip()

CREDITS_IAP = [
    ('credits_80', 'Consommable', '80 crédits', '0,99 €'),
    ('credits_450', 'Consommable', '450 crédits', '4,99 €'),
    ('credits_1000', 'Consommable', '1 000 crédits', '9,99 €'),
    ('credits_2200', 'Consommable', '2 200 crédits', '19,99 €'),
    ('credits_6000', 'Consommable', '6 000 crédits', '49,99 €'),
]
REMOVE_ADS_NOTE = ('`remove_ads` (« Sans Pubs », non consommable, 3,99 €) existe dans le code mais **n\'est pas affiché** tant que les '
                   'interstitiels sont désactivés (aucune pub imposée aujourd\'hui) : ne le créez dans les consoles que le jour où vous activerez les interstitiels.')

# Réponses communes aux questionnaires d'âge (tout ce qui n'est pas listé = Aucun / Non)
APPLE_COMMON = ('Contrôles intégrés : contrôle parental **Non**, vérification de l\'âge **Non** · Fonctionnalités : accès Web illimité **Non**, '
                'contenu généré par les utilisateurs **Non**, réseaux sociaux **Non**, messagerie et chat **Non**, partage de position **Non**, '
                '**Publicité : Oui** · Thèmes pour adultes, médical/bien-être, sexualité/nudité : **Aucun** · Jeux d\'argent, jeux d\'argent simulés, concours : **Non**')
IARC_COMMON = ('Catégorie : **Jeu**. Peur, sexualité, langage grossier, substances, humour grossier, jeux d\'argent (réels ou simulés) : **Non**. '
               'Interaction entre utilisateurs, partage de la position, accès Internet illimité : **Non**.')

GAMES = {
    'kart': dict(
        name='Layjou Kart', bundle='com.layjou.kart', v_android='1.0.0 (code 2)', v_ios='1.0 (build 2)',
        aab='layjou-kart/release/LayjouKart-1.0.0-release.aab',
        play_title='Layjou Kart : course de karts', play_cat='Jeux › Course', apple_cat='Jeux › Course (secondaire : Action)',
        subtitle_fr='Courses de karts déjantées', subtitle_en='Wacky kart racing',
        short_fr='Dérape, lance des objets et fonce vers la victoire avec le robot Layjou !',
        short_en='Drift, fire items and race to victory with Layjou the robot!',
        promo_fr='15 circuits, 7 rivaux monstrueux, des objets délirants et des turbos dorés : prends le volant avec Layjou !',
        promo_en='15 tracks, 7 monster rivals, wild items and golden boosts: take the wheel with Layjou!',
        kw_fr='kart,course,voiture,dérapage,turbo,circuit,pilote,robot,arcade,vitesse',
        kw_en='kart,racing,car,drift,turbo,track,driver,robot,arcade,speed,race,go-kart',
        body_fr="""Layjou prend le volant ! Fonce sur des circuits colorés, dérape dans les virages pour charger tes mini-turbos et utilise des objets surprises pour doubler tes rivaux monstrueux.

• 15 circuits dans 5 mondes : Bonbon-Ville, Port Néon, Désert de Cristal, Lune Givrée et Cœur du Glitch
• 5 défis spéciaux : course aux pièces, contre-la-montre et duels contre des boss
• 7 rivaux qui ont chacun leur style : Gloupy, Pinz, Bzzork, Rokko, Tentakl, Drakito et Anti-Jou
• Dérapages, mini-turbos, turbos dorés et figures sur les tremplins
• 10 objets surprises et 7 armes spéciales : Blaster Cœur, Sabre Laser, Sceptre Foudre…
• 6 karts, 10 skins et 10 accessoires à collectionner, chacun avec son bonus
• Conduite assistée, sensibilité réglable et mode économie de batterie
• Missions du jour, roue de la chance, coffres et cadeau quotidien""",
        body_en="""Layjou takes the wheel! Speed along colorful tracks, drift through corners to charge your mini-turbos and use surprise items to overtake your monster rivals.

• 15 tracks across 5 worlds: Candy City, Neon Harbor, Crystal Desert, Frost Moon and Glitch Core
• 5 special challenges: coin rush, time trial and boss duels
• 7 rivals, each with their own style: Gloupy, Pinz, Bzzork, Rokko, Tentakl, Drakito and Anti-Jou
• Drifts, mini-turbos, golden boosts and ramp tricks
• 10 surprise items and 7 special weapons: Heart Blaster, Laser Saber, Thunder Scepter…
• 6 karts, 10 skins and 10 accessories to collect, each with its own perk
• Assisted steering, adjustable sensitivity and a battery saver mode
• Daily missions, lucky wheel, chests and a daily gift""",
        ads='Vidéos récompensées uniquement : tour ou temps supplémentaire pour finir une course, doubler les gains, coffre gratuit, tour de roue, crédits gratuits, déblocage d\'objets. Interstitiels désactivés.',
        iap=CREDITS_IAP + [('starter_pack', 'Non consommable', 'Pack de Départ : skin Galaxie Violette, kart Fusée Bonbon, 300 crédits, 6 000 pièces', '2,99 €')],
        iap_note=REMOVE_ADS_NOTE,
        iarc='Violence : **Oui** — violence de dessin animé ou fantastique (les karts touchés par un objet font un tête-à-queue), envers des personnages non humains et non réalistes ; pas de sang. Achats numériques : **Oui**. Objets aléatoires achetables avec de l\'argent réel : **Oui** (un coffre au contenu aléatoire peut être ouvert plus tôt avec des crédits).',
        iarc_expected='PEGI 3 ou 7 + mention « Achats intégrés (dont objets aléatoires) »',
        apple='Violence de dessin animé ou fantastique : **Rare/légère** · Violence réaliste : **Aucune** · Armes : armes fantaisistes (blaster, sabre laser) — si la question « Guns or Other Weapons » est posée, **Rare/légère** · **Coffres à butin (Loot Boxes) : Oui**',
        apple_expected='9+',
        review_en="""No account or sign-in is needed: all content is available right away.
Rewarded video ads are always optional (e.g. extra lap/time to finish a race, double rewards, free chest).
In-app purchases: Shop tab (bottom bar) > Credits / Starter Pack. "Restore purchases" is in Settings (gear icon on the home screen) and in the Shop.
Settings also contain the privacy policy link and "Ad privacy" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=['Sur iPad, le jeu s\'affiche dans une colonne de téléphone (bandes sombres sur les côtés) : les captures iPad le montrent tel quel.'],
    ),
    'battle': dict(
        name='Layjou Battle', bundle='com.layjou.battle', v_android='1.0.0 (code 2)', v_ios='1.0.0 (build 2)',
        aab='layjou-battle/release/LayjouBattle-1.0.0-release.aab',
        play_title='Layjou Battle : robot combat', play_cat='Jeux › Action', apple_cat='Jeux › Action (secondaire : Aventure)',
        subtitle_fr='Combats de monstres géants', subtitle_en='Giant monster battles',
        short_fr='Affronte des monstres géants avec Layjou : pare, esquive et frappe !',
        short_en='Fight giant monsters with Layjou: block, dodge and strike!',
        promo_fr='5 mondes, 25 niveaux et une Arène infinie : défie les boss et personnalise ton robot !',
        promo_en='5 worlds, 25 stages and an endless Arena: beat the bosses and customize your robot!',
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
        ads='Vidéos récompensées uniquement : continuer un combat, doubler les pièces, tour de roue, crédits gratuits, déblocage d\'objets. Interstitiels désactivés.',
        iap=CREDITS_IAP + [('starter_pack', 'Non consommable', 'Pack de Départ : skin Galaxie, Sabre Laser, 300 crédits, 5 000 pièces', '2,99 €')],
        iap_note=REMOVE_ADS_NOTE,
        iarc='Violence : **Oui** — violence de dessin animé ou fantastique (un petit robot affronte des monstres géants), envers des personnages non humains et non réalistes ; pas de sang ni de démembrement. Achats numériques : **Oui**. Objets aléatoires achetables avec de l\'argent réel : **Non** (les coffres s\'ouvrent gratuitement, avec le temps).',
        iarc_expected='PEGI 7 + mention « Achats intégrés »',
        apple='Violence de dessin animé ou fantastique : **Rare/légère** (coups sans sang sur des monstres de dessin animé ; « Fréquente/intense » donnerait 13+) · Violence réaliste : **Aucune** · Armes : armes fantaisistes (sabre laser, blaster) — si la question « Guns or Other Weapons » est posée, **Rare/légère** · Coffres à butin : **Non**',
        apple_expected='9+',
        review_en="""No account or sign-in is needed: all content is available right away.
Rewarded video ads are always optional (continue a battle, double coins, wheel spin, free credits).
In-app purchases: Shop tab (bottom bar) > Starter Pack / Credits. "Restore purchases" is in Settings (gear icon on the home screen) and in the Shop.
Settings also contain the privacy policy link and "Ad privacy options" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=['Sur iPad, le jeu s\'affiche dans une colonne de téléphone (bandes sombres sur les côtés) : les captures iPad le montrent tel quel.',
               'Rappels facultatifs (notifications locales, sans serveur), proposés dans les réglages.'],
    ),
    'blocks': dict(
        name='Layjou Blocks', bundle='com.layjou.blocks', v_android='1.0 (code 2)', v_ios='1.0 (build 2)',
        aab='release/LayjouBlocks-1.0.0-release.aab',
        play_title='Layjou Blocks : puzzle blocs', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
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
        ads='Vidéos récompensées uniquement : continuer la partie (2 fois), doubler les boulons, arme gratuite, +60 boulons (5 fois par jour).',
        iap=[('layjou_credits_80', 'Consommable', '80 crédits', '0,99 €'), ('layjou_credits_500', 'Consommable', '500 crédits', '4,99 €'),
             ('layjou_credits_1200', 'Consommable', '1 200 crédits', '9,99 €'), ('layjou_credits_3000', 'Consommable', '3 000 crédits', '19,99 €')],
        iap_note='Attention : les identifiants de Blocks commencent par `layjou_` (différents de ceux de Battle et Kart).',
        iarc='Violence : **Non** (le « Marteau » et le « Laser » sont des outils qui cassent des blocs). Achats numériques : **Oui**. Objets aléatoires achetables : **Non**.',
        iarc_expected='PEGI 3 + mention « Achats intégrés »',
        apple='Violence : **Aucune** · Armes : **Aucune** (outils de puzzle) · Coffres à butin : **Non**',
        apple_expected='4+',
        review_en="""No account or sign-in is needed: all content is available right away.
Rewarded video ads are always optional (continue a game, double bolts, free tool).
In-app purchases: Shop button (bottom bar of the home screen) > Credit packs. "Restore purchases" is at the bottom of the Shop.
Settings (gear icon) contain the privacy policy link and "Ad privacy" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=[],
    ),
    'bubble': dict(
        name='Layjou Bubble', bundle='com.layjou.bubble', v_android='1.0 (code 2)', v_ios='1.0 (build 2)',
        aab='layjou-bubble/release/LayjouBubble-1.0-release.aab',
        play_title='Layjou Bubble : match 3', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
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
        ads='Vidéo récompensée uniquement : +5 coups quand il n\'en reste plus.', iap=[], iap_note='',
        iarc='Violence : **Non**. Achats numériques : **Non**.', iarc_expected='PEGI 3',
        apple='Violence : **Aucune** · Coffres à butin : **Non**', apple_expected='4+',
        review_en="""No account or sign-in is needed: all content is available right away. There are no in-app purchases.
The only ad is an optional rewarded video offered when the player runs out of moves (+5 moves).
The privacy policy link is at the bottom of the home screen, next to "Ad privacy options" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=['La version iOS déjà compilée n\'a pas la déclaration de chiffrement : App Store Connect posera la question à l\'envoi → répondre que l\'app n\'utilise que le chiffrement standard exempté (HTTPS).'],
    ),
    'puzzle': dict(
        name='Layjou Puzzle', bundle='com.layjou.puzzle', v_android='1.0 (code 2)', v_ios='1.0 (build 2)',
        aab='layjou-puzzle/release/LayjouPuzzle-1.0-release.aab',
        play_title='Layjou Puzzle : tri d\'objets', play_cat='Jeux › Puzzle', apple_cat='Jeux › Puzzle (secondaire : Casual)',
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
        ads='Vidéos récompensées uniquement : +60 s pour continuer (3 fois par partie), bonus gratuit.', iap=[], iap_note='',
        iarc='Violence : **Non**. Achats numériques : **Non**.', iarc_expected='PEGI 3',
        apple='Violence : **Aucune** · Coffres à butin : **Non**', apple_expected='4+',
        review_en="""No account or sign-in is needed: all content is available right away. There are no in-app purchases.
Rewarded videos are optional: +60 seconds to continue a level, or a free booster.
The privacy policy link is at the bottom of the home screen, next to "Ad privacy options" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=['Les objets sont des emojis : leur dessin varie selon le téléphone (les captures montrent ceux de Google).'],
    ),
    'run': dict(
        name='Layjou Run', bundle='com.layjou.run', v_android='1.0 (code 2)', v_ios='1.0 (build 2)',
        aab='layjou-run/release/LayjouRun-1.0-release.aab',
        play_title='Layjou Run : course sans fin', play_cat='Jeux › Arcade', apple_cat='Jeux › Action (secondaire : Arcade)',
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
        ads='Vidéo récompensée uniquement : continuer la course, une fois par partie.', iap=[], iap_note='',
        lang_fr=', en français', lang_en=' (French-only interface for now)', french_only=True,
        iarc='Violence : **Non**. Achats numériques : **Non**.', iarc_expected='PEGI 3',
        apple='Violence : **Aucune** · Coffres à butin : **Non**', apple_expected='4+',
        review_en="""No account or sign-in is needed: all content is available right away. There are no in-app purchases. The interface is in French.
The only ad is an optional rewarded video to continue a run once ("Continuer avec une vidéo").
The privacy policy link ("Politique de confidentialité") is at the bottom of the main menu, next to "Confidentialité des pubs" (Google consent form, shown in the EEA/UK).
The App Tracking Transparency prompt appears before personalized ads; the game works exactly the same if tracking is declined.""",
        notes=['Interface uniquement en français : fiche en français seulement (ne pas ajouter l\'anglais dans les langues de la fiche).'],
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
    if d['iap']:
        return ('Jeu gratuit avec achats intégrés facultatifs et publicités. Tu peux désactiver les achats intégrés dans les réglages de ton appareil.'
                if fr else 'Free to play with optional in-app purchases and ads. You can disable in-app purchases in your device settings.')
    return 'Jeu gratuit, financé par des vidéos publicitaires facultatives.' if fr else 'Free to play, supported by optional video ads.'


def count(g, fmt, lang):
    d = os.path.join(ROOT, 'store', g, fmt, lang)
    return len([f for f in os.listdir(d) if f.endswith('.jpg')]) if os.path.isdir(d) else 0


def shots_md(g, d):
    langs = ['fr'] if d.get('french_only') else ['fr', 'en']
    rows = []
    for fmt, label, size in (('google-play', 'Google Play — téléphone', '1080 × 1920'), ('app-store-iphone', 'App Store — iPhone (6,3" Dynamic Island)', '1206 × 2622'),
                             ('app-store-ipad', 'App Store — iPad 13"', '2064 × 2752')):
        cells = ' · '.join(f'`store/{g}/{fmt}/{lg}/` ({count(g, fmt, lg)})' for lg in langs)
        rows.append(f'| {label} | {size} | {cells} |')
    return '| Emplacement | Taille | Dossiers (nombre d\'images) |\n|---|---|---|\n' + '\n'.join(rows)


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
    fr_only = d.get('french_only')
    if d['iap']:
        iap_md = ('| Identifiant (identique dans les deux stores) | Type | Contenu (nom affiché) | Prix de référence |\n|---|---|---|---|\n'
                  + '\n'.join(f'| `{i}` | {t} | {c} | {p} |' for i, t, c, p in d['iap'])
                  + '\n\nPrix réels : choisissez le palier le plus proche dans chaque console (le prix de référence ne sert qu\'hors ligne). '
                  + 'Pour chaque produit Apple, la capture de vérification demandée est prête : `store/' + g + '/captures-brutes/iap-en/01-boutique.jpg` (écran Boutique) ; note de vérification : « Credits are a virtual currency spent in the in-game shop on cosmetics, karts/weapons and coin packs. »')
        if any(t == 'Non consommable' for _, t, _, _ in d['iap']):
            iap_md += '\nLe bouton « Restaurer les achats » exigé par Apple pour les non-consommables est déjà dans le jeu.'
        if d.get('iap_note'):
            iap_md += '\n\n' + d['iap_note']
    else:
        iap_md = 'Aucun achat intégré : rien à créer dans les consoles.'
    notes = '\n'.join(f'- {n}' for n in d['notes']) or '- Rien de particulier.'
    en_play = '' if fr_only else f"""
**Short description — EN** ({L['short_en']})
```
{d['short_en']}
```"""
    en_full = '' if fr_only else f"""

**EN** ({L['full_en']})
```
{full_en}
```"""
    en_apple = '' if fr_only else f"""
**Sous-titre — EN** ({L['sub_en']}) : `{d['subtitle_en']}`

**Promotional text — EN** ({L['promo_en']})
```
{d['promo_en']}
```
**Keywords — EN** ({L['kw_en']})
```
{d['kw_en']}
```"""
    return f"""# {d['name']} — fiche de publication

> Identifiant : `{d['bundle']}` · Version Android {d['v_android']} · Version iOS {d['v_ios']}
> Langues de la fiche : {'**français uniquement**' if fr_only else 'français (langue par défaut) et anglais'}
> Questionnaires communs aux 6 jeux (sécurité des données, confidentialité, public cible…) : [../formulaires.md](../formulaires.md)

## 1. Fichiers à envoyer
- **Google Play** : `{os.path.basename(d['aab'])}` (archive `Layjou-AAB-Google-Play.zip` ; dans le dépôt : `{d['aab']}`), signé avec votre clé d'envoi.
- **App Store** : votre fichier `.ipa` (voir le guide, « Étape 3 — Recompiler les IPA »).
- Icône Play Store 512 × 512 (PNG 32 bits) : `brand/layjou-{g}/store/play-icon-512.png`
- Bannière Play Store 1024 × 500 (PNG 24 bits) : `brand/layjou-{g}/store/feature-graphic-1024x500.png`
- L'icône App Store vient de l'IPA (rien à envoyer).

{shots_md(g, d)}

Envoyez les captures dans l'ordre des numéros (les 3 premières sont les plus vues). Sans légende : `store/{g}/captures-brutes/`.

## 2. Google Play — fiche principale

**Nom de l'application** ({L['play_title']})
```
{d['play_title']}
```
**Description courte — FR** ({L['short_fr']})
```
{d['short_fr']}
```{en_play}

**Catégorie** : {d['play_cat']} · **Contient des annonces** : oui · **Achats intégrés** : {'oui' if d['iap'] else 'non'}
**Adresse e-mail** : [votre e-mail de contact] · **Site Web** : `https://layjou.com` · **Politique de confidentialité** : `{PRIVACY_URL}`

## 3. App Store Connect

| Champ | Valeur |
|---|---|
| Nom ({L['name']}) | `{d['name']}` |
| Sous-titre — FR ({L['sub_fr']}) | `{d['subtitle_fr']}` |
| Catégorie | {d['apple_cat']} |
| URL d'assistance | `{SUPPORT_URL}` |
| URL de confidentialité | `{PRIVACY_URL}` |
| Copyright | `2026 [Nom de l'éditeur]` |
| Prix | Gratuit |
| Connexion requise pour la vérification | Non |

**Texte promotionnel — FR** ({L['promo_fr']})
```
{d['promo_fr']}
```
**Mots-clés — FR** ({L['kw_fr']} ; les lettres accentuées comptent double)
```
{d['kw_fr']}
```{en_apple}

**Notes pour la vérification (App Review › Notes)** — en anglais :
```
{d['review_en']}
```

## 4. Description complète (Google Play et App Store)

**FR** ({L['full_fr']})
```
{full_fr}
```{en_full}

## 5. Classification par âge

**Google Play (questionnaire IARC)** — {IARC_COMMON}
{d['iarc']}
→ Résultat attendu : **{d['iarc_expected']}**

**App Store (questionnaire d'âge)** — {APPLE_COMMON}
{d['apple']}
→ Classification attendue : **{d['apple_expected']}** (App Store Connect l'affiche dès les réponses saisies). « Conçu pour les enfants » : **Non**.

## 6. Publicités et achats intégrés

**Publicités (AdMob)** : {d['ads']}

**Achats intégrés**
{iap_md}

## 7. À savoir
{notes}
"""


def main():
    for g, d in GAMES.items():
        os.makedirs(os.path.join(ROOT, 'store', g), exist_ok=True)
        with open(os.path.join(ROOT, 'store', g, 'fiche.md'), 'w', encoding='utf-8') as f:
            f.write(fiche(g, d))
        print('✓', g)


if __name__ == '__main__':
    main()
