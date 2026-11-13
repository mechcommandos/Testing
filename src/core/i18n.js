/* Textes FR / EN. La langue suit l'appareil (modifiable dans les réglages). */
import { S } from './state.js';

const D = {
  ok: ['OK', 'OK'], cancel: ['Annuler', 'Cancel'], close: ['Fermer', 'Close'], later: ['Plus tard', 'Later'], claim: ['Récupérer', 'Claim'],
  cont: ['Continuer', 'Continue'], home: ['Accueil', 'Home'], retry: ['Réessayer', 'Retry'], next_stage: ['Niveau suivant', 'Next stage'],
  free: ['Gratuit', 'Free'], owned: ['Possédé', 'Owned'], equipped: ['Équipé', 'Equipped'], equip: ['Équiper', 'Equip'], buy: ['Acheter', 'Buy'],
  locked: ['Verrouillé', 'Locked'], sk_plain: ['Nouvelle peinture pour LayJou', 'A fresh paint job for LayJou'], sk_rainbow: ['Couleurs animées en continu', 'Colors shift continuously'], sk_stars: ['Visière étoilée scintillante', 'Twinkling starry visor'],
  level: ['Niveau', 'Level'], lv: ['Niv.', 'Lv.'], max: ['MAX', 'MAX'], coins: ['Pièces', 'Coins'], credits: ['Crédits', 'Credits'],
  no_coins: ['Pas assez de pièces', 'Not enough coins'], no_credits: ['Pas assez de crédits', 'Not enough credits'],
  ad_none: ['Aucune vidéo disponible pour le moment', 'No video available right now'], get_more: ['En obtenir', 'Get more'],

  tab_shop: ['Boutique', 'Shop'], tab_hangar: ['Hangar', 'Hangar'], tab_fight: ['Combat', 'Battle'], tab_lab: ['Labo', 'Lab'], tab_map: ['Carte', 'Map'],

  play: ['COMBATTRE', 'FIGHT'], h_stage: ['Monde {w} · Niveau {n}', 'World {w} · Stage {n}'], h_boss: ['BOSS', 'BOSS'],
  h_clear: ['Tous les mondes sont libérés !', 'All worlds are free!'], h_replay: ['REJOUER', 'REPLAY'],
  h_arena: ['Arène infinie', 'Endless Arena'], h_arena_best: ['Record : vague {n}', 'Best: wave {n}'], h_arena_lock: ['Bats le boss du monde 1', 'Beat the world 1 boss'],
  h_daily: ['Cadeau', 'Gift'], h_wheel: ['Roue', 'Wheel'], h_missions: ['Missions', 'Missions'], h_chest: ['Coffre', 'Chest'], h_ready: ['Prêt !', 'Ready!'],
  h_power: ['Puissance', 'Power'], h_streak: ['Série ×{m}', 'Streak ×{m}'], h_boost: ['Boost Super', 'Super boost'],
  h_boost_tip: ['Ton prochain combat démarre avec le Super chargé', 'Your next battle starts with a full Super'],

  b_go: ['GO !', 'GO!'], b_perfect: ['PARFAIT !', 'PERFECT!'], b_block: ['BLOQUÉ', 'BLOCKED'], b_dodge: ['ESQUIVE !', 'DODGE!'],
  b_break: ['GARDE BRISÉE', 'GUARD BROKEN'], b_stun: ['SONNÉ !', 'STUNNED!'], b_weak: ['POINT FAIBLE !', 'WEAK SPOT!'],
  b_enrage: ['ENRAGÉ !', 'ENRAGED!'], b_ult: ['SUPER CŒUR !', 'SUPER HEART!'], b_wave: ['VAGUE', 'WAVE'],
  hint_punch: ['Tape pour frapper !', 'Tap to punch!'], hint_block: ['Maintiens le bouclier !', 'Hold the shield!'],
  hint_dodge: ['Attaque rouge : esquive !', 'Red attack: dodge!'], hint_ult: ['Super Cœur prêt !', 'Super Heart ready!'],
  c_punch: ['Frappe', 'Punch'], c_weapon: ['Arme', 'Weapon'], c_ult: ['Super', 'Super'], c_block: ['Parer', 'Block'], c_dodge: ['Esquive', 'Dodge'],
  combo: ['COMBO', 'COMBO'], stun_bar: ['Étourdissement', 'Stun'], wave_n: ['Vague {n}', 'Wave {n}'],
  pause: ['Pause', 'Paused'], resume: ['Reprendre', 'Resume'], quit: ['Abandonner', 'Quit'],

  rv_title: ['Continuer ?', 'Continue?'], rv_sub: ['Reviens avec {pct} % de PV et le Super chargé', 'Come back with {pct}% HP and a full Super'],
  rv_video: ['Vidéo gratuite', 'Free video'], rv_no: ['Non merci', 'No thanks'],

  r_victory: ['VICTOIRE !', 'VICTORY!'], r_defeat: ['DÉFAITE', 'DEFEAT'], r_arena: ['FIN DE L’ARÈNE', 'ARENA OVER'],
  r_waves: ['{n} vague(s) repoussée(s)', '{n} wave(s) cleared'], r_record: ['Nouveau record !', 'New record!'],
  r_double: ['Doubler', 'Double'], r_doubled: ['Doublé !', 'Doubled!'], r_first: ['1re victoire ×2', 'First clear ×2'],
  r_streak: ['Série de session ×{m}', 'Session streak ×{m}'], r_streak_next: ['Encore un combat → ×{m}', 'One more battle → ×{m}'],
  r_consolation: ['Lot de consolation', 'Consolation prize'], r_upgrade: ['Améliorer', 'Upgrade'], r_world: ['Nouveau monde débloqué !', 'New world unlocked!'],
  r_arena_unlock: ['Arène infinie débloquée !', 'Endless Arena unlocked!'], r_goal: ['Prochain objectif', 'Next goal'],
  r_champion: ['Skin « Champion Glitch » débloqué !', '"Glitch Champion" skin unlocked!'],
  tip_defend: ['Astuce : maintiens le bouclier quand l’icône jaune apparaît, esquive quand elle est rouge.', 'Tip: hold the shield when the yellow icon shows, dodge when it’s red.'],
  tip_weak: ['Astuce : touche les cibles dorées sur le monstre pour des coups critiques.', 'Tip: tap the golden targets on the monster for critical hits.'],
  tip_ult: ['Astuce : remplis la jauge rose puis lance le Super Cœur !', 'Tip: fill the pink gauge, then unleash the Super Heart!'],
  tip_stun: ['Astuce : une parade au dernier moment étourdit l’ennemi.', 'Tip: a last-moment block stuns the enemy.'],
  tip_upgrade: ['Astuce : améliore Puissance et Blindage au Labo.', 'Tip: upgrade Power and Armor in the Lab.'],

  g_mission: ['Mission : plus que {left} !', 'Mission: only {left} to go!'], g_mission_done: ['Mission terminée : récupère ta récompense', 'Mission complete: claim your reward'],
  g_upgrade: ['Plus que {left} pièces pour « {name} »', 'Only {left} coins for “{name}”'], g_upgrade_ready: ['Amélioration « {name} » disponible !', '“{name}” upgrade available!'],
  g_item: ['Plus que {left} pièces pour {name}', 'Only {left} coins to get {name}'], g_item_ready: ['Tu peux t’offrir {name} !', 'You can afford {name}!'],
  g_level: ['Niveau {lvl} dans {left} XP', 'Level {lvl} in {left} XP'], g_boss: ['Boss dans {n} combat(s)', 'Boss in {n} battle(s)'], g_boss_now: ['Le boss t’attend !', 'The boss awaits!'],
  g_chest: ['Coffre de session dans {n} victoire(s)', 'Session chest in {n} win(s)'],

  s_offers: ['Offres', 'Offers'], s_free: ['Crédits gratuits', 'Free credits'], s_free_left: ['{n} restante(s) aujourd’hui', '{n} left today'],
  s_free_none: ['Reviens demain !', 'Come back tomorrow!'], s_coins: ['Packs de pièces', 'Coin packs'],
  s_starter: ['Pack de Départ', 'Starter Pack'], s_starter_desc: ['Skin Galaxie + Sabre Laser + 300 crédits + 5 000 pièces', 'Galaxy skin + Laser Saber + 300 credits + 5,000 coins'],
  s_noads: ['Sans Pubs', 'No Ads'], s_noads_desc: ['Supprime les pubs entre les combats, pour toujours', 'Removes ads between battles, forever'],
  s_popular: ['Populaire', 'Popular'], s_best: ['Meilleure offre', 'Best value'], s_bought: ['Acheté', 'Purchased'],
  s_thanks: ['Merci ! Achat réussi', 'Thank you! Purchase complete'], s_fail: ['Achat impossible pour le moment', 'Purchase unavailable right now'], s_pending: ['Paiement en attente de validation', 'Payment pending approval'],
  s_restore: ['Restaurer les achats', 'Restore purchases'], s_restored: ['{n} achat(s) restauré(s)', '{n} purchase(s) restored'],

  hg_skin: ['Skins', 'Skins'], hg_accessory: ['Accessoires', 'Accessories'], hg_weapon: ['Armes', 'Weapons'],
  hg_watch: ['Regarder ({p}/{n})', 'Watch ({p}/{n})'], hg_stage: ['Bats le boss final', 'Beat the final boss'], hg_unlocked: ['Débloqué !', 'Unlocked!'],
  perk_atk: ['+{n} % dégâts', '+{n}% damage'], perk_hp: ['+{n} % PV', '+{n}% HP'], perk_crit: ['+{n} % critiques', '+{n}% crits'],
  perk_energy: ['+{n} % charge du Super', '+{n}% Super charge'], perk_dodge: ['Esquive {n} % plus rapide', '{n}% faster dodge'],
  perk_coins: ['+{n} % pièces', '+{n}% coins'], perk_xp: ['+{n} % XP', '+{n}% XP'], perk_none: ['Style pur', 'Pure style'],
  w_dmg: ['Dégâts', 'Damage'], w_cd: ['Recharge', 'Cooldown'], w_stun: ['Choc', 'Stagger'],

  lab_title: ['Labo d’améliorations', 'Upgrade Lab'], lab_cap: ['Niveau joueur {n} requis', 'Player level {n} required'],
  lab_atk: ['ATK', 'ATK'], lab_hp: ['PV', 'HP'], lab_crit: ['CRIT', 'CRIT'], lab_super: ['SUPER', 'SUPER'],

  map_title: ['Carte des mondes', 'World Map'], map_locked: ['Termine le monde précédent', 'Finish the previous world'], st_reward: ['Récompenses', 'Rewards'],

  d_title: ['Cadeau du jour', 'Daily Gift'], d_day: ['Jour {n}', 'Day {n}'], d_sub: ['Reviens chaque jour : le jour 7 offre un méga coffre !', 'Come back every day: day 7 gives a mega chest!'], d_done: ['Reviens demain !', 'Come back tomorrow!'],
  m_title: ['Missions du jour', 'Daily Missions'], m_bonus: ['Bonus : les 3 missions', 'Bonus: all 3 missions'], m_reset: ['Nouvelles missions dans {t}', 'New missions in {t}'],
  wh_title: ['Roue de la chance', 'Lucky Wheel'], wh_free: ['Tour gratuit', 'Free spin'], wh_ad: ['Tour bonus ({n})', 'Bonus spin ({n})'], wh_none: ['Reviens demain', 'Come back tomorrow'], wh_boost: ['Boost Super', 'Super boost'],
  ch_title: ['Coffre !', 'Chest!'], ch_session: ['Coffre de session', 'Session chest'], ch_free: ['Coffre gratuit', 'Free chest'], ch_mega: ['Méga coffre', 'Mega chest'], ch_missions: ['Coffre des missions', 'Missions chest'],
  cb_title: ['Content de te revoir !', 'Welcome back!'], cb_sub: ['LayJou t’a gardé un cadeau', 'LayJou saved a gift for you'],
  lu_title: ['NIVEAU {n} !', 'LEVEL {n}!'], lu_sub: ['Plafond d’améliorations augmenté', 'Upgrade cap raised'],
  np_title: ['Ne rate aucun cadeau', 'Never miss a gift'], np_sub: ['Activer les rappels du cadeau du jour et des coffres ?', 'Turn on reminders for daily gifts and chests?'], np_yes: ['Activer', 'Turn on'],
  n_daily_t: ['Ton cadeau du jour t’attend 🎁', 'Your daily gift is waiting 🎁'], n_daily_b: ['LayJou a préparé ta récompense. Garde ta série !', 'LayJou has your reward ready. Keep your streak!'],
  n_chest_t: ['Coffre gratuit prêt !', 'Free chest ready!'], n_chest_b: ['Ouvre-le avant ton prochain combat.', 'Open it before your next battle.'],
  n_back_t: ['LayJou a besoin de toi !', 'LayJou needs you!'], n_back_b: ['Les monstres envahissent la ville. Reviens te battre !', 'Monsters are invading the city. Come back and fight!'],
  set_title: ['Réglages', 'Settings'], set_sfx: ['Effets sonores', 'Sound effects'], set_music: ['Musique', 'Music'], set_haptics: ['Vibrations', 'Haptics'],
  set_notif: ['Rappels', 'Reminders'], set_lang: ['Langue', 'Language'], set_privacy: ['Confidentialité des pubs', 'Ad privacy options'],
  boost_on: ['Boost Super activé !', 'Super boost active!'], mission_done: ['Mission terminée !', 'Mission complete!'],
  st_fight: ['Combattre', 'Fight'], st_cleared: ['Terminé', 'Cleared'],
};

export function lang() {
  const s = S.data.settings.lang;
  if (s === 'fr' || s === 'en') return s;
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function t(key, vars) {
  const e = D[key];
  let str = e ? e[lang() === 'fr' ? 0 : 1] : key;
  if (vars) for (const k of Object.keys(vars)) str = str.replace('{' + k + '}', vars[k]);
  return str;
}

/** Texte localisé d'un objet de données `{ fr, en }` (ou chaîne brute). */
export const L = (o) => (o && typeof o === 'object' ? o[lang()] || o.fr : o);
export const hasKey = (k) => k in D;
