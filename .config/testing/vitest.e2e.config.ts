import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from '../../vite.config';

export default mergeConfig(
  projectConfig,
  defineConfig({
    test: {
      include: ['**/*.e2e.ts', '**/*.e2e.tsx'],
      exclude: ['**/.testing/**', '**/build/**', '**/node_modules/**'],
      passWithNoTests: true,
      globals: false,
      reporters: ['default'],
    },
  }),
);
