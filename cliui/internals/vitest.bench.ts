import {defineConfig} from 'vitest/config';

/**
 * Shared vitest configuration for benchmarks across all @cliui packages.
 *
 * Each package's `vitest.bench.config.ts` merges this with its own vite config.
 */
export default defineConfig({
  test: {
    include: ['**/*.bench.ts', '**/*.bench.tsx'],
    exclude: ['**/.testing/**', '**/build/**', '**/node_modules/**'],
    benchmark: {
      reporters: ['default'],
    },
  },
});
