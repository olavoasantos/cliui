import {defineConfig} from 'vite';
import {terminalDom} from '@cliui/vite-plugin';

export default defineConfig({
  plugins: [
    terminalDom({
      fps: 30,
      altScreen: true,
    }),
  ],
});
