import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from './vite.config';
import unitBase from '@cliui/internals/vitest.unit';

export default mergeConfig(projectConfig, mergeConfig(unitBase, defineConfig({})));
