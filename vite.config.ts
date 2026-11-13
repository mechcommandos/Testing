import { defineConfig } from 'vite';

// base relative : indispensable pour que l'app fonctionne dans la WebView Capacitor
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: { host: true, port: 5173 },
});
