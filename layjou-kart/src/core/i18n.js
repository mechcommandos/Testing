/* Textes FR / EN. La langue suit l'appareil (modifiable dans les réglages). */
import { S } from './state.js';

const D = {
  ok: ['OK', 'OK'], cancel: ['Annuler', 'Cancel'], close: ['Fermer', 'Close'], later: ['Plus tard', 'Later'], claim: ['Récupérer', 'Claim'],
  cont: ['Continuer', 'Continue'], home: ['Accueil', 'Home'], retry: ['Rejouer', 'Race again'], next: ['Suivant', 'Next'],
  free: ['Gratuit', 'Free'], owned: ['Possédé', 'Owned'], equipped: ['Équipé', 'Equipped'], equip: ['Équiper', 'Equip'], buy: ['Acheter', 'Buy'],
  locked: ['Verrouillé', 'Locked'], level: ['Niveau', 'Level'], lv: ['Niv.', 'Lv.'], coins: ['Pièces', 'Coins'], credits: ['Crédits', 'Credits'],
  no_coins: ['Pas assez de pièces', 'Not enough coins'], no_credits: ['Pas assez de crédits', 'Not enough credits'],
  ad_none: ['Aucune vidéo disponible pour le moment', 'No video available right now'], get_more: ['En obtenir', 'Get more'],
  watch: ['Regarder', 'Watch'], videos: ['{n}/{m} vidéos', '{n}/{m} videos'], stars_need: ['{n} étoiles', '{n} stars'],

  tab_shop: ['Boutique', 'Shop'], tab_garage: ['Garage', 'Garage'], tab_race: ['Course', 'Race'], tab_cups: ['Coupes', 'Cups'],
  play: ['COURIR', 'RACE'], h_event: ['{w} · {e}', '{w} · {e}'], h_cup: ['Coupe {w}', '{w} Cup'],
  h_daily: ['Cadeau', 'Gift'], h_wheel: ['Roue', 'Wheel'], h_missions: ['Missions', 'Missions'], h_chest: ['Coffre', 'Chest'], h_ready: ['Prêt !', 'Ready!'],
  h_streak: ['Série ×{m}', 'Streak ×{m}'], h_turbo: ['Turbo de départ', 'Starting turbo'], h_turbo_tip: ['Ta prochaine course démarre avec un Triple Turbo', 'Your next race starts with a Triple Turbo'],
  h_stars: ['{n} étoiles', '{n} stars'],

  // courses
  r_lap: ['TOUR', 'LAP'], r_final: ['DERNIER TOUR !', 'FINAL LAP!'], r_go: ['GO !', 'GO!'], r_rocket: ['DÉPART TURBO !', 'ROCKET START!'], r_stall: ['Trop tôt…', 'Too early…'],
  r_finish: ['ARRIVÉE !', 'FINISH!'], r_time: ['TEMPS', 'TIME'], r_coins: ['PIÈCES', 'COINS'], r_timeup: ['TEMPS ÉCOULÉ !', 'TIME UP!'],
  r_hit: ['TOUCHÉ !', 'HIT!'], r_blocked: ['BLOQUÉ', 'BLOCKED'], r_trick: ['FIGURE !', 'TRICK!'], r_pad: ['BOOST !', 'BOOST!'],
  r_drift1: ['Mini-turbo', 'Mini-turbo'], r_drift2: ['Super turbo', 'Super turbo'], r_drift3: ['TURBO DORÉ !', 'GOLDEN TURBO!'],
  r_overtake: ['Dépassement !', 'Overtake!'], r_special: ['ATTAQUE SPÉCIALE !', 'SPECIAL ATTACK!'], r_special_ready: ['Spéciale prête !', 'Special ready!'],
  r_combo: ['COMBO ×{n}', 'COMBO ×{n}'], r_crash: ['Aïe !', 'Ouch!'], r_shield: ['Bouclier brisé', 'Shield broken'],
  pt_drift1: ['Mini-turbo', 'Mini-turbo'], pt_drift2: ['Super turbo', 'Super turbo'], pt_drift3: ['Turbo doré', 'Golden turbo'],
  pt_coin: ['Pièce', 'Coin'], pt_box: ['Boîte', 'Box'], pt_hit: ['Touché', 'Hit'], pt_overtake: ['Dépassement', 'Overtake'], pt_trick: ['Figure', 'Trick'], pt_start: ['Départ turbo', 'Rocket start'], pt_special: ['Spéciale', 'Special'],
  place_1: ['1er', '1st'], place_2: ['2e', '2nd'], place_3: ['3e', '3rd'], place_n: ['{n}e', '{n}th'],
  hint_steer: ['Glisse ton doigt à gauche et à droite pour tourner', 'Slide your finger left and right to steer'],
  hint_drift: ['Tourne fort dans les virages pour déraper et charger un turbo !', 'Steer hard in turns to drift and charge a turbo!'],
  hint_item: ['Touche l’objet (ou tape l’écran) pour l’utiliser · glisse vers le bas pour lancer derrière', 'Tap the item (or the screen) to use it · swipe down to throw behind'],
  hint_special: ['Jauge Cœur pleine : lance ton attaque spéciale !', 'Heart gauge full: fire your special attack!'],
  hint_start: ['Tape l’écran pendant le « 1 » pour un départ turbo', 'Tap the screen on “1” for a rocket start'],
  hint_jump: ['Tape l’écran pendant un saut pour faire une figure', 'Tap the screen mid-air to do a trick'],
  pause: ['Pause', 'Pause'], resume: ['Reprendre', 'Resume'], quit: ['Abandonner', 'Quit'], restart: ['Recommencer', 'Restart'],
  quit_confirm: ['Abandonner la course ? Les pièces ramassées seront perdues.', 'Quit the race? Coins picked up will be lost.'],

  // prolongation / temps
  ext_title: ['PROLONGATION ?', 'EXTRA LAP?'], ext_sub: ['Tu as fini {p}. Cours un tour de plus avec un Turbo Doré, la jauge spéciale pleine et un Triple Turbo !', 'You finished {p}. Race one more lap with a Golden Turbo, a full special gauge and a Triple Turbo!'],
  ext_video: ['Vidéo : +1 tour', 'Video: +1 lap'], ext_credits: ['+1 tour', '+1 lap'], ext_no: ['Non merci', 'No thanks'],
  time_title: ['ENCORE UN PEU ?', 'A LITTLE MORE?'], time_sub: ['Ajoute {s} secondes et termine ton défi !', 'Add {s} seconds and finish your challenge!'],
  time_video: ['Vidéo : +{s} s', 'Video: +{s} s'], time_credits: ['+{s} s', '+{s} s'],

  // résultats
  res_title: ['Résultats', 'Results'], res_place: ['{p} place', '{p} place'], res_win: ['VICTOIRE !', 'VICTORY!'], res_podium: ['PODIUM !', 'PODIUM!'], res_ok: ['Course terminée', 'Race over'],
  res_score: ['Score', 'Score'], res_actions: ['Points d’action', 'Action points'], res_position: ['Classement', 'Placement'], res_best: ['Nouveau record !', 'New record!'],
  res_double: ['×2 pièces', '×2 coins'], res_next: ['Épreuve suivante', 'Next event'], res_replay: ['Rejouer', 'Race again'], res_cups: ['Coupes', 'Cups'],
  res_near: ['Plus que {g} s pour la {p} place !', 'Only {g} s from {p} place!'], res_stars: ['Étoiles', 'Stars'],
  res_chest: ['Coffre de session !', 'Session chest!'], res_chest_sub: ['3 podiums dans la session', '3 podiums this session'],
  res_duel_win: ['Boss battu !', 'Boss beaten!'], res_duel_lose: ['Le boss a gagné…', 'The boss won…'],
  res_coins_got: ['{n} pièces ramassées', '{n} coins collected'], res_chrono: ['Temps : {t}', 'Time: {t}'],
  res_unlock: ['Nouveau monde débloqué : {w} !', 'New world unlocked: {w}!'], res_level: ['Niveau {n} !', 'Level {n}!'],
  tip_offroad: ['Astuce : reste sur la piste, l’herbe ralentit beaucoup. Active le pilotage assisté dans les réglages si besoin.', 'Tip: stay on the track, grass slows you down a lot. Turn on assisted steering in settings if needed.'],
  tip_drift: ['Astuce : tourne fort et garde le virage pour déraper, puis relâche pour un turbo. Bleu → rose → doré !', 'Tip: steer hard and hold it to drift, then release for a turbo. Blue → pink → gold!'],
  tip_shield: ['Astuce : garde un Bouclier ou une Flaque pour te protéger des tirs.', 'Tip: keep a Shield or a Puddle to protect yourself from shots.'],
  tip_special: ['Astuce : quand la jauge Cœur est pleine, touche le gros cœur pour ton attaque spéciale.', 'Tip: when the Heart gauge is full, tap the big heart for your special attack.'],
  tip_coins: ['Astuce : chaque pièce augmente ta vitesse de pointe (jusqu’à 10).', 'Tip: every coin raises your top speed (up to 10).'],
  tip_items: ['Astuce : les nouvelles armes et karts du Garage changent ta façon de courir.', 'Tip: new weapons and karts from the Garage change how you race.'],

  // coupes
  cups_title: ['Coupes', 'Cups'], cup_locked: ['{n} étoiles pour débloquer', '{n} stars to unlock'], ev_race: ['Course', 'Race'], ev_coins: ['Défi', 'Challenge'], ev_chrono: ['Défi', 'Challenge'], ev_duel: ['Boss', 'Boss'],
  pre_rivals: ['Tes rivaux', 'Your rivals'], pre_goal: ['Objectifs', 'Goals'], pre_laps: ['{n} tours', '{n} laps'], pre_start: ['C’EST PARTI !', 'LET’S GO!'],
  goal_score: ['Score {n}', 'Score {n}'], goal_coins: ['{n} pièces', '{n} coins'], goal_time: ['Moins de {t}', 'Under {t}'], goal_win: ['Battre le boss', 'Beat the boss'],
  ch_coins: ['Ramasse un maximum de pièces avant la fin du temps.', 'Grab as many coins as you can before time runs out.'],
  ch_chrono: ['Termine les tours avant la fin du chrono. Les boosts et turbos sont tes amis !', 'Finish the laps before the clock runs out. Boost pads and turbos are your friends!'],
  ch_duel: ['Duel en tête-à-tête contre un boss très agressif.', 'One-on-one duel against a very aggressive boss.'],

  // garage
  g_title: ['Garage', 'Garage'], g_skins: ['Skins', 'Skins'], g_acc: ['Accessoires', 'Accessories'], g_weapons: ['Armes', 'Weapons'], g_karts: ['Karts', 'Karts'],
  st_speed: ['Vitesse', 'Speed'], st_accel: ['Accélération', 'Acceleration'], st_handling: ['Maniabilité', 'Handling'], st_drift: ['Dérapage', 'Drift'],
  perk_coins: ['+{v} % de pièces', '+{v}% coins'], perk_xp: ['+{v} % d’XP', '+{v}% XP'], perk_drift: ['Mini-turbo +{v} % plus rapide', 'Mini-turbo charges {v}% faster'],
  perk_boost: ['Turbos +{v} % plus longs', 'Turbos last {v}% longer'], perk_offroad: ['Hors-piste moins pénalisant', 'Less off-road slowdown'], perk_special: ['Jauge Cœur +{v} %', 'Heart gauge +{v}%'],
  perk_luck: ['Meilleurs objets', 'Better items'], perk_shieldStart: ['Bouclier au départ', 'Shield at the start'], perk_trick: ['Figures plus puissantes', 'Stronger tricks'],
  perk_none: ['Aucun bonus', 'No bonus'], sk_plain: ['Nouvelle peinture pour Layjou et son kart', 'A fresh paint job for Layjou and the kart'], sk_rainbow: ['Couleurs animées en continu', 'Colors shift continuously'], sk_stars: ['Casque étoilé scintillant', 'Twinkling starry helmet'],
  w_charge: ['Recharge ×{v}', 'Charge ×{v}'], unlock_stars: ['Gagne {n} étoiles', 'Earn {n} stars'],

  // boutique
  s_title: ['Boutique', 'Shop'], s_credits: ['Crédits', 'Credits'], s_offers: ['Offres', 'Offers'], s_coins: ['Packs de pièces', 'Coin packs'],
  s_free: ['Crédits gratuits', 'Free credits'], s_free_sub: ['+{n} crédits · {left} restantes aujourd’hui', '+{n} credits · {left} left today'],
  s_starter: ['Pack de Départ', 'Starter Pack'], s_starter_sub: ['Skin Galaxie + Fusée Bonbon + 300 crédits + 6 000 pièces', 'Galaxy skin + Candy Rocket + 300 credits + 6,000 coins'],
  s_noads: ['Sans Pubs', 'No Ads'], s_noads_sub: ['Supprime les publicités imposées (les vidéos bonus restent au choix)', 'Removes forced ads (bonus videos stay optional)'],
  s_restore: ['Restaurer mes achats', 'Restore purchases'], s_restored: ['{n} achat(s) restauré(s)', '{n} purchase(s) restored'], s_bonus: ['+{n} % bonus', '+{n}% bonus'],
  s_popular: ['Populaire', 'Popular'], s_best: ['Meilleure offre', 'Best value'], s_thanks: ['Merci ! Achat livré.', 'Thank you! Purchase delivered.'], s_fail: ['Achat impossible pour le moment', 'Purchase unavailable right now'],
  s_pending: ['Paiement en attente de validation', 'Payment pending approval'], s_owned: ['Déjà acheté', 'Already owned'],

  // quotidien
  d_title: ['Cadeau du jour', 'Daily gift'], d_day: ['Jour {n}', 'Day {n}'], d_come: ['Reviens demain pour la suite !', 'Come back tomorrow for more!'],
  m_title: ['Missions du jour', 'Daily missions'], m_bonus: ['Bonus des 3 missions', 'All-missions bonus'], m_reset: ['Nouvelles missions demain', 'New missions tomorrow'],
  w_title: ['Roue de la chance', 'Lucky wheel'], w_spin: ['Tourner', 'Spin'], w_spin_ad: ['Tour bonus', 'Bonus spin'], w_won: ['Gagné !', 'You won!'], w_turbo: ['Turbo de départ', 'Starting turbo'],
  c_title: ['Coffre gratuit', 'Free chest'], c_open: ['Ouvrir', 'Open'], c_in: ['Prêt dans {t}', 'Ready in {t}'], c_skip: ['Ouvrir maintenant', 'Open now'],
  cb_title: ['Bon retour !', 'Welcome back!'], cb_sub: ['Layjou t’attendait. Un petit cadeau pour reprendre la route :', 'Layjou missed you. A little gift to get back on track:'],
  lv_title: ['Niveau supérieur !', 'Level up!'], lv_sub: ['Récompense de niveau', 'Level reward'],
  g_mission: ['Mission : plus que {left}', 'Mission: {left} to go'], g_mission_done: ['Une mission est terminée, récupère ta récompense !', 'A mission is complete, claim your reward!'],
  g_item: ['Plus que {left} pièces pour {name}', '{left} coins to unlock {name}'], g_item_ready: ['{name} est à ta portée au Garage !', '{name} is within reach in the Garage!'],
  g_level: ['Plus que {left} XP pour le niveau {lvl}', '{left} XP to level {lvl}'], g_world: ['Plus que {left} étoiles pour {name}', '{left} stars to unlock {name}'],
  g_chest: ['Encore {n} podium(s) pour le coffre de session', '{n} more podium(s) for the session chest'],
  mission_done: ['Mission terminée !', 'Mission complete!'],

  // réglages
  set_title: ['Réglages', 'Settings'], set_sfx: ['Effets sonores', 'Sound effects'], set_music: ['Musique', 'Music'], set_haptics: ['Vibrations', 'Vibration'],
  set_notif: ['Rappels', 'Reminders'], set_assist: ['Pilotage assisté', 'Assisted steering'], set_assist_sub: ['Aide à rester sur la piste', 'Helps you stay on track'],
  set_sens: ['Sensibilité', 'Sensitivity'], set_quality: ['Qualité graphique', 'Graphics quality'], set_q_high: ['Haute', 'High'], set_q_low: ['Économie', 'Battery saver'],
  set_lang: ['Langue', 'Language'], set_privacy: ['Confidentialité des pubs', 'Ad privacy'], set_policy: ['Politique de confidentialité', 'Privacy policy'], set_restore: ['Restaurer les achats', 'Restore purchases'], set_version: ['Version {v}', 'Version {v}'],
  n_ask_title: ['Activer les rappels ?', 'Turn on reminders?'], n_ask_sub: ['Layjou te prévient quand ton cadeau du jour et ton coffre gratuit sont prêts.', 'Layjou lets you know when your daily gift and free chest are ready.'],
  n_daily_t: ['Ton cadeau du jour t’attend 🎁', 'Your daily gift is waiting 🎁'], n_daily_b: ['Layjou a préparé une récompense. Viens la chercher !', 'Layjou prepared a reward. Come and get it!'],
  n_chest_t: ['Coffre gratuit prêt !', 'Free chest ready!'], n_chest_b: ['Ton coffre est plein de pièces. Ouvre-le !', 'Your chest is full of coins. Open it!'],
  n_back_t: ['Les rivaux s’entraînent…', 'The rivals are training…'], n_back_b: ['Anti-Jou prend de l’avance. Reviens défendre ton titre !', 'Anti-Jou is getting ahead. Come back and defend your title!'],
  turbo_on: ['Turbo de départ activé !', 'Starting turbo active!'], tut_title: ['Bienvenue dans Layjou Kart !', 'Welcome to Layjou Kart!'],
  items_get: ['Objet obtenu', 'Item received'], special: ['Spéciale', 'Special'],
};

export function lang() {
  const s = S.data.settings.lang;
  if (s === 'fr' || s === 'en') return s;
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function t(key, vars) {
  const e = D[key];
  let str = e ? e[lang() === 'fr' ? 0 : 1] : key;
  if (vars) for (const k of Object.keys(vars)) str = str.replace('{' + k + '}', typeof vars[k] === 'object' && vars[k] ? L(vars[k]) : vars[k]);
  return str;
}

/** Texte localisé d'un objet de données `{ fr, en }` (ou chaîne brute). */
export const L = (o) => (o && typeof o === 'object' ? o[lang()] || o.fr : o);
export const hasKey = (k) => k in D;
export const placeStr = (n) => (n <= 3 ? t('place_' + n) : t('place_n', { n }));
