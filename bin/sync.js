#!/usr/bin/env node

import { program } from 'commander';

import { watch } from '../src/watch.js';
import { startWizard } from '../src/wizard.js';

program
  .name('sync-packages')
  .description(
    'A utility for watching and copying packages (monorepo workspaces) to target directory, without symlinks.',
  )
  .argument('[path]', 'Path to the destination app root folder')
  .option('-t, --targets [targets...]', 'Package names to sync')
  .option('-v, --verbose', 'Print additional information during watch')
  .action(async (inputPath, options) => {
    // Start wizard to get missing options
    const { packages, ...restOptions } = await startWizard(inputPath, options);

    // Start watcher
    await watch(packages, {
      ...options,
      ...restOptions,
    });
  });

program.parse(process.argv);
