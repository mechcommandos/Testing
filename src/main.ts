import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './styles/app.css';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { detectLang, setLang } from './i18n';
import { ads } from './services/ads';
import { haptic, suspendAudio, unlockAudio } from './services/audio';
import { iap } from './services/iap';
import { store } from './state/store';
import { initFx } from './ui/fx';
import { createGameScreen, type GameScreen } from './ui/game-screen';
import { createHomeScreen, type HomeScreen } from './ui/home-screen';
import { closeTopModal, openDaily } from './ui/modals';

const root = document.getElementById('app')!;
let home: HomeScreen | null = null;
let game: GameScreen | null = null;

function clear(): void {
  home?.destroy();
  game?.destroy();
  home = null;
  game = null;
}

function showHome(): void {
  clear();
  home = createHomeScreen(showGame, showHome);
  root.appendChild(home.el);
}

function showGame(resume: boolean): void {
  clear();
  game = createGameScreen(resume, showHome, () => showGame(false));
  root.appendChild(game.el);
}

async function boot(): Promise<void> {
  await store.load();
  setLang(store.p.settings.lang ?? detectLang());
  initFx();

  // décor : blocs flottants en arrière-plan
  const decor = document.createElement('div');
  decor.className = 'decor';
  decor.innerHTML = Array.from({ length: 9 }, (_, i) => `<i class="d${i}"></i>`).join('');
  document.body.prepend(decor);

  showHome();

  window.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      void store.flush();
      suspendAudio();
    } else store.rollover();
  });
  // empêche le zoom et le menu contextuel dans la WebView
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Light });
    } catch {
      /* barre d'état non pilotable sur cet appareil */
    }
    void App.addListener('backButton', () => {
      if (closeTopModal()) return;
      if (game) game.pause();
      else void App.exitApp();
    });
    void App.addListener('pause', () => { haptic.stopAll(); void store.flush(); });
    await SplashScreen.hide({ fadeOutDuration: 250 });
  }

  // services en arrière-plan : ne bloquent jamais le démarrage du jeu
  void ads.init();
  void iap.init();

  // le cadeau du jour s'ouvre tout seul pour les joueurs qui reviennent
  if (store.p.tutorialDone && store.dailyAvailable()) setTimeout(openDaily, 900);
}

void boot();
