import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Creates a shared Vite configuration for @cliui packages.
 *
 * Each package calls this with its own entry points and package metadata.
 * The returned config handles library mode, sourcemaps, DTS generation,
 * dual CJS/ESM output, and externalizes all `@cliui/*` workspace packages.
 */
export function createViteConfig(options: {
  /** Vite `lib.entry` map — keys become output filenames. */
  entry: Record<string, string>;
  /** The package's `package.json` as an object (for version define). */
  pkg: {version: string; name: string};
  /**
   * Additional rollup externals beyond the default `/@cliui\/.*‍/`.
   * Provide regexes or strings.
   */
  external?: (RegExp | string)[];
}) {
  const {entry, pkg, external = []} = options;

  return defineConfig({
    define: {
      __TERMINAL_DOM_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      emptyOutDir: true,
      sourcemap: true,
      lib: {entry},
      rollupOptions: {
        external: [/@cliui\/.*/, /^node:/, ...external],
        output: [
          {
            format: 'es',
            preserveModules: true,
            entryFileNames: (chunkInfo) => {
              const cleanName = chunkInfo.name.replace(/\.css[?_]inline/g, '');
              return `${cleanName}.js`;
            },
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
          '.ignore/**',
        ],
      }),
    ],
  });
}
