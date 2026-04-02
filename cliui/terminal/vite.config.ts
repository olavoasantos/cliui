import {createViteConfig} from '../internals/vite.base';
import pkg from './package.json';

export default createViteConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    'css/index': 'src/css/index.ts',
    'layout/index': 'src/layout/index.ts',
    'renderer/index': 'src/renderer/index.ts',
  },
  pkg,
});
