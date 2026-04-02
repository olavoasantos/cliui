import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from './vite.config';
import integrationBase from '../internals/vitest.integration';

export default mergeConfig(
  projectConfig,
  mergeConfig(
    integrationBase,
    defineConfig({
      resolve: {
        alias: {
          '@cliui/dom': new URL('../dom/src/index.ts', import.meta.url).pathname,
        },
      },
    }),
  ),
);
