#!/usr/bin/env bash
# Construit l'APK de LayJou Run sans Gradle.
# Usage : ANDROID_BT=<build-tools> ANDROID_JAR=<platform>/android.jar android/build.sh [sortie.apk]
# Variables optionnelles : KEYSTORE (créé s'il manque), BUILD_DIR.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BT="${ANDROID_BT:?chemin des build-tools Android}"
JAR="${ANDROID_JAR:?chemin de android.jar}"
B="${BUILD_DIR:-$ROOT/android/build}"
OUT="${1:-$B/LayJouRun.apk}"
KS="${KEYSTORE:-$B/debug.keystore}"

rm -rf "$B/work" && mkdir -p "$B/work/assets/www" "$B/work/classes" "$B/work/dex"
cp -r "$ROOT/index.html" "$ROOT/game.js" "$ROOT/vendor" "$ROOT/assets" "$B/work/assets/www/"

"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$B/work/res.zip"
"$BT/aapt2" link -o "$B/work/base.apk" -I "$JAR" --manifest "$ROOT/android/AndroidManifest.xml" \
  -A "$B/work/assets" --min-sdk-version 24 --target-sdk-version 34 --version-code 1 --version-name 1.0 "$B/work/res.zip"
javac --release 8 -Xlint:-options -cp "$JAR" -d "$B/work/classes" $(find "$ROOT/android/src" -name '*.java')
"$BT/d8" --lib "$JAR" --min-api 24 --output "$B/work/dex" $(find "$B/work/classes" -name '*.class')
(cd "$B/work/dex" && zip -q -j ../base.apk classes.dex)
"$BT/zipalign" -f 4 "$B/work/base.apk" "$B/work/aligned.apk"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias debug \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=LayJou Run Debug" >/dev/null 2>&1
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out "$OUT" "$B/work/aligned.apk"
"$BT/apksigner" verify --verbose "$OUT" | head -6
echo "APK : $OUT"
