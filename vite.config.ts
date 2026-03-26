import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

export default defineConfig({
  build: {
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false,
      },
    },
    lib: {
      formats: ['es', 'cjs'],
      entry: {
        index: 'src/index.ts',
      },
    },
    rollupOptions: {
      external: [/@micra\/*/],
      output: {
        preserveModules: true,
      },
    },
  },

  test: {name: pkg.name},

  plugins: [
    dts({
      entryRoot: 'src',
      beforeWriteFile: (filePath, content) => {
        return {
          filePath: filePath.replace('/dist/src/', '/dist/'),
          content,
        };
      },
      exclude: [
        '**/specs/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.unit.ts',
        '**/*.unit.tsx',
        '**/*.integration.ts',
        '**/*.integration.tsx',
        '**/*.e2e.ts',
        '**/*.e2e.tsx',
        './*.*',
      ],
    }),
  ],
});
