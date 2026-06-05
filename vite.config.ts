import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tailwindcss()],
  publicDir: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'assets/js/app.js'),
      cssFileName: 'style',
      fileName: () => 'app.js',
      formats: ['es'],
    },
    outDir: 'assets/dist',
  },
});
