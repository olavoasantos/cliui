import {createViteConfig} from '../internals/vite.base';
import pkg from './package.json';

export default createViteConfig({
  entry: {
    index: 'src/index.ts',
  },
  pkg,
  external: [/^shiki/],
});
