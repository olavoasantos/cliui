import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from '../../vite.config';

export default mergeConfig(
  projectConfig,
  defineConfig({
    test: {
      include: ['**/*.bench.ts', '**/*.bench.tsx'],
      exclude: ['**/.testing/**', '**/build/**', '**/node_modules/**'],
      benchmark: {
        reporters: ['default'],
      },
    },
  }),
);
