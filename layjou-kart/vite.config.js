import { defineConfig } from 'vite';

// Chemins relatifs : indispensable pour le chargement depuis le WebView Capacitor.
export default defineConfig({
  base: './',
  build: { target: ['chrome90', 'safari14'], outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { host: '127.0.0.1', port: 5173 },
});
