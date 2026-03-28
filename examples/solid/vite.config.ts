import {defineConfig} from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid({ssr: false})],
  ssr: {
    noExternal: ['solid-js'],
    resolve: {
      conditions: ['browser', 'import', 'module', 'default'],
    },
  },
  build: {
    target: 'node22',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: 'src/main.tsx',
    },
  },
});
