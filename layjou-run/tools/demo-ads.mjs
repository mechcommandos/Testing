// Bascule les annonces AdMob en mode test (on) ou production (off) dans www/ads.js.
// Utilisé par `npm run android:demo` : l'APK de démo affiche des annonces de test, les builds pour les stores de vraies annonces.
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../www/ads.js', import.meta.url);
const on = process.argv[2] === 'on';
const src = readFileSync(file, 'utf8');
const out = src.replace(/(const TEST_ADS = )(true|false)/, `$1${on}`);
if (out === src && !src.includes('const TEST_ADS = ' + on)) { console.error('Drapeau de test introuvable dans www/ads.js'); process.exit(1); }
writeFileSync(file, out);
console.log(`Annonces AdMob : ${on ? 'mode TEST' : 'mode PRODUCTION'} (www/ads.js)`);
