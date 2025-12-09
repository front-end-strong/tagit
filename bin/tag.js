#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from '../lib/utils.js';
import { registerBumpCommand } from '../lib/commands/bump.js';
import { registerListCommand } from '../lib/commands/list.js';
import { registerRefreshCommand } from '../lib/commands/refresh.js';
import { registerResetCommand } from '../lib/commands/reset.js';
import { registerSetupCommand } from '../lib/commands/setup.js';

const ENVS = loadConfig();

const program = new Command();

program
  .name('tag')
  .description('Helper for environment-specific git tags')
  .version('0.1.0');

registerListCommand(program, ENVS);
registerSetupCommand(program);
registerRefreshCommand(program);
registerResetCommand(program);
registerBumpCommand(program, ENVS);

program.parseAsync(process.argv);
