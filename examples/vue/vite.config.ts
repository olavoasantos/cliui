import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    target: 'node22',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: {
        bootstrap: 'src/bootstrap.ts',
        app: 'src/app.ts',
      },
    },
  },
});
