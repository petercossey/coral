import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  plugins: [tailwindcss()],
  publicDir: false,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  // `vite build` hardcodes NODE_ENV (and therefore import.meta.env.DEV/PROD)
  // to production regardless of `--mode`, so the local asset watcher's
  // `--mode development` build would otherwise still strip DEV-only
  // diagnostics. Define DEV/PROD from `mode` explicitly instead of relying
  // on Vite's build-command default.
  define: {
    'import.meta.env.DEV': JSON.stringify(mode !== 'production'),
    'import.meta.env.PROD': JSON.stringify(mode === 'production'),
  },
  build: {
    emptyOutDir: true,
    // Keep readable stack traces for the local asset watcher; production
    // builds (plain `vite build`, mode defaults to "production") omit them.
    sourcemap: mode === 'development',
    lib: {
      entry: resolve(import.meta.dirname, 'assets/js/app.js'),
      cssFileName: 'style',
      fileName: () => 'app.js',
      formats: ['es'],
    },
    outDir: 'assets/dist',
  },
}));
