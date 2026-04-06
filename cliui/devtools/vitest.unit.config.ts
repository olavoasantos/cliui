import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from './vite.config';
import unitBase from '@cliui/internals/vitest.unit';

export default mergeConfig(
  projectConfig,
  mergeConfig(
    unitBase,
    defineConfig({
      resolve: {
        alias: {
          '@cliui/dom': new URL('../dom/src/index.ts', import.meta.url).pathname,
          '@cliui/terminal/core': new URL('../terminal/src/core.ts', import.meta.url).pathname,
          '@cliui/terminal/css': new URL('../terminal/src/css/index.ts', import.meta.url).pathname,
          '@cliui/terminal/layout': new URL('../terminal/src/layout/index.ts', import.meta.url).pathname,
          '@cliui/terminal/renderer': new URL('../terminal/src/renderer/index.ts', import.meta.url).pathname,
          '@cliui/terminal': new URL('../terminal/src/index.ts', import.meta.url).pathname,
        },
      },
    }),
  ),
);
