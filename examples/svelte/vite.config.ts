import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        css: 'injected',
      },
    }),
  ],
  build: {
    target: 'node22',
    outDir: 'dist',
    lib: {
      entry: 'src/app.ts',
      formats: ['es'],
      fileName: 'app',
    },
    rollupOptions: {
      external: [/^node:/, /^@cliui\//],
    },
  },
});
