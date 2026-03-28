import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

export default defineConfig({
  define: {
    __TERMINAL_DOM_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
    // minify: 'terser',
    terserOptions: {
      format: {
        comments: false,
      },
    },
    lib: {
      entry: {
        index: 'src/index.ts',
        core: 'src/core.ts',
        components: 'src/components/index.ts',
      },
    },
    rollupOptions: {
      external: [/@micra\/*/],
      output: [
        {
          format: 'es',
          preserveModules: true,
          // Intercept the entry files
          entryFileNames: (chunkInfo) => {
            // Catches both .css?inline and .css_inline
            const cleanName = chunkInfo.name.replace(/\.css[?_]inline/g, '');
            return `${cleanName}.js`;
          },
          // Intercept dynamic imports/chunks
          chunkFileNames: (chunkInfo) => {
            const cleanName = chunkInfo.name.replace(/\.css[?_]inline/g, '');
            return `${cleanName}.js`;
          },
        },
        {
          format: 'cjs',
          preserveModules: true,
          entryFileNames: (chunkInfo) => {
            const cleanName = chunkInfo.name.replace(/\.css[?_]inline/g, '');
            return `${cleanName}.cjs`;
          },
          chunkFileNames: (chunkInfo) => {
            const cleanName = chunkInfo.name.replace(/\.css[?_]inline/g, '');
            return `${cleanName}.cjs`;
          },
        },
      ],
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
