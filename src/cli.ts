#!/usr/bin/env node

import { Command } from 'commander';
import { devCommand } from './commands/dev.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('reqs-builder')
  .description('任意の関連オブジェクト群から整合性の取れた構造的ドキュメントを生成する汎用ツール')
  .version('0.1.0');

program.command('dev').description('Start development server').action(devCommand);

program
  .command('generate')
  .description('Generate documents from data and templates')
  .action(generateCommand);

program.parse();
