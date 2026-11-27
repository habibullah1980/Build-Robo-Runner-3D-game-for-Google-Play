import { defineConfig } from 'vite';

// `npm run build` makes the app bundle for Android.
// `npm run build:web` inlines every asset so the game can be shared as a single web page preview.
export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: false, // public/kits holds source packs; the game imports only what it uses
  build: {
    outDir: mode === 'web' ? 'dist-web' : 'dist',
    assetsInlineLimit: mode === 'web' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
}));
