import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    target: 'node22',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: 'src/main.ts',
      external: [/^ws$/, /^@cliui\/devtools/, /^@napi-rs\/canvas$/],
    },
  },
});
