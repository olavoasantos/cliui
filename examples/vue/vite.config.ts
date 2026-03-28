import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      style: {trim: false},
    }),
  ],
  build: {
    target: 'node22',
    outDir: 'dist',
    cssCodeSplit: false,
    lib: {
      entry: 'src/app.ts',
      formats: ['es'],
      fileName: 'app',
    },
    rollupOptions: {
      external: [/^node:/, /^@micra\//],
    },
  },
});
