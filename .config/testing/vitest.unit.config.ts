import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from '../../vite.config';

export default mergeConfig(
  projectConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['**/*.unit.ts', '**/*.unit.tsx'],
      exclude: ['**/.testing/**', '**/build/**', '**/node_modules/**'],
      passWithNoTests: true,
      globals: false,
      reporters: ['default'],
      coverage: {
        provider: 'v8',
        reporter: 'json-summary',
        reportsDirectory: '.testing/coverage/unit',
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          '**/.testing/**',
          '**/*.bench.ts',
          '**/*.bench.tsx',
          '**/*.e2e.ts',
          '**/*.e2e.tsx',
          '**/*.integration.ts',
          '**/*.integration.tsx',
          '**/*.unit.ts',
          '**/*.unit.tsx',
          '**/build/**',
          '**/index.ts',
          '**/node_modules/**',
          '**/register.d.ts',
          '**/types/**',
        ],
      },
    },
  }),
);
