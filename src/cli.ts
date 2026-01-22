#!/usr/bin/env node

import { Command } from 'commander';
import { withConfig } from './config.js';
import { devCommand } from './commands/dev.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('reqs-builder')
  .description('Generate structured documents from related objects')
  .version('0.1.0');

program.command('dev').description('Start development server').action(withConfig(devCommand));

program
  .command('generate')
  .description('Generate documents from data and templates')
  .action(withConfig(generateCommand));

program.parse();
