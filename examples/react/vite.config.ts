import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'node22',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: 'src/main.tsx',
    },
  },
});
