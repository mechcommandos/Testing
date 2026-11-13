/* LayJou Battle — point d'entrée. */
import '@fontsource-variable/fredoka';
import './styles.css';
import { loadState } from './core/state.js';
import { Flow } from './core/retention.js';
import { Ads } from './core/ads.js';
import { IAP } from './core/iap.js';
import { Audio } from './core/audio.js';
import { Native } from './core/native.js';
import { initApp, onAppOpen, handleBack, appPause, appResume, currentScreen, go } from './ui/app.js';

async function boot() {
  await loadState();
  Flow.sessionStart();
  initApp();
  // l'audio ne peut démarrer qu'après un premier geste de l'utilisateur
  window.addEventListener('pointerdown', () => Audio.unlock(), { capture: true, passive: true });
  await Native.init({ onPause: appPause, onResume: appResume, onBack: handleBack });
  Ads.setHooks({ before: () => Audio.mute(true), after: () => Audio.mute(false) });
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  const b = document.getElementById('boot');
  if (b) { b.classList.add('out'); setTimeout(() => b.remove(), 400); }
  Native.hideSplash();
  onAppOpen();
  // services en arrière-plan : ne bloquent jamais l'entrée dans le jeu
  Ads.init();
  IAP.init().then(() => { if (currentScreen() === 'shop') go('shop'); });
}

boot().catch((err) => {
  console.error('[boot]', err);
  const b = document.getElementById('boot'); if (b) b.remove();
  Native.hideSplash();
});
