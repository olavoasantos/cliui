import {defineConfig, mergeConfig} from 'vitest/config';
import projectConfig from './vite.config';
import integrationBase from '@cliui/internals/vitest.integration';

export default mergeConfig(projectConfig, mergeConfig(integrationBase, defineConfig({})));
