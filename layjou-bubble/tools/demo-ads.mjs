// Bascule les annonces AdMob en mode test (on) ou production (off) dans www/js/config.js.
// Utilisé par `npm run android:demo` : l'APK de démo affiche des annonces de test, les builds pour les stores de vraies annonces.
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../www/js/config.js', import.meta.url);
const on = process.argv[2] === 'on';
const src = readFileSync(file, 'utf8');
const out = src.replace(/(testing: )(true|false)/, `$1${on}`);
if (out === src && !src.includes('testing: ' + on)) { console.error('Drapeau de test introuvable dans www/js/config.js'); process.exit(1); }
writeFileSync(file, out);
console.log(`Annonces AdMob : ${on ? 'mode TEST' : 'mode PRODUCTION'} (www/js/config.js)`);
