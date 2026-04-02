import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from './vite.config';
import benchBase from '@cliui/internals/vitest.bench';

export default mergeConfig(projectConfig, mergeConfig(benchBase, defineConfig({})));
