/* Intégration native : retour haptique, barre d'état, cycle de vie, notifications locales. */
import { Capacitor } from '@capacitor/core';
import { S, save } from './state.js';
import { Flow } from './retention.js';
import { t } from './i18n.js';
import { Haptic } from './haptics.js';

const native = Capacitor.isNativePlatform();
let LocalNotifications = null, App = null;

export const Native = {
  native,
  async init({ onPause, onResume, onBack }) {
    if (!native) {
      document.addEventListener('visibilitychange', () => (document.hidden ? onPause() : onResume()));
      return;
    }
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark }); // icônes claires sur fond sombre ; l'affichage bord à bord est géré par Capacitor (SystemBars)
    } catch { /* plugin absent */ }
    try {
      const m = await import('@capacitor/app'); App = m.App;
      App.addListener('pause', onPause); App.addListener('resume', onResume);
      App.addListener('backButton', () => { if (!onBack()) App.minimizeApp().catch(() => {}); });
    } catch { /* plugin absent */ }
    try { LocalNotifications = (await import('@capacitor/local-notifications')).LocalNotifications; } catch { /* plugin absent */ }
  },

  async hideSplash() {
    if (!native) return;
    try { const { SplashScreen } = await import('@capacitor/splash-screen'); await SplashScreen.hide({ fadeOutDuration: 250 }); } catch { /* plugin absent */ }
  },

  /**
   * Retour haptique (voir core/haptics.js) :
   *  'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning' | 'error' | effet composé ('boom', 'surge', 'hurt', 'celebrate', 'fail')
   *  [[effet, délai ms], ...] → motif ; ['combo', n] → crescendo de combo.
   */
  buzz(kind = 'light') {
    if (Array.isArray(kind)) { if (kind[0] === 'combo') Haptic.combo(kind[1]); else Haptic.pattern(kind); return; }
    (Haptic[kind] || Haptic.light).call(Haptic);
  },

  /** Demande l'autorisation de notifier (proposée après une victoire, jamais au lancement). */
  async enableNotifications() {
    if (!LocalNotifications) { S.data.settings.notif = false; save(); return false; }
    try {
      let st = await LocalNotifications.checkPermissions();
      if (st.display !== 'granted') st = await LocalNotifications.requestPermissions();
      S.data.settings.notif = st.display === 'granted'; save();
      return S.data.settings.notif;
    } catch { return false; }
  },

  /**
   * Rappels programmés quand l'app passe en arrière-plan :
   * récompense du jour, coffre gratuit prêt, et un « tu nous manques » à J+3.
   */
  async scheduleReminders() {
    if (!LocalNotifications || !S.data.settings.notif) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      const now = Date.now(), list = [];
      const tomorrow = new Date(now + 86400000); tomorrow.setHours(Math.min(20, Math.max(10, new Date().getHours())), 0, 0, 0);
      list.push({ id: 1, title: t('n_daily_t'), body: t('n_daily_b'), schedule: { at: tomorrow } });
      const chest = Flow.chestReadyIn();
      if (chest > 15 * 60000) list.push({ id: 2, title: t('n_chest_t'), body: t('n_chest_b'), schedule: { at: new Date(now + chest) } });
      const d3 = new Date(now + 3 * 86400000); d3.setHours(18, 0, 0, 0);
      list.push({ id: 3, title: t('n_back_t'), body: t('n_back_b'), schedule: { at: d3 } });
      await LocalNotifications.schedule({ notifications: list.map((n) => ({ ...n, smallIcon: 'ic_stat_layjou', iconColor: '#1cc3d2' })) });
    } catch (err) { console.warn('[notif]', err); }
  },

  async clearReminders() {
    if (!LocalNotifications) return;
    try { await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] }); } catch { /* rien à annuler */ }
  },
};
