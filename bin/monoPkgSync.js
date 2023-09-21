#!/usr/bin/env node

import nodePath from 'node:path';
import { argv } from 'node:process';
import { existsSync } from 'node:fs';
import { globby } from 'globby';
import inquirer from 'inquirer';
import { getImportMetaDirname, parsePkgJson } from '../src/utils.js';
import { resolveWorkspaces, watch } from '../src/process.js';

const { dirname, filename } = getImportMetaDirname(import.meta);
const cwd = process.cwd();

if (argv.length < 3) {
  console.error('Missing target path');
  console.error(`Usage: npx @jsimck/mono-pkg-sync <path to target>`);
  process.exit(1);
}

const targetDir = nodePath.resolve(dirname, argv[2]);

if (!existsSync(targetDir)) {
  console.error(`Target directory ${targetDir} does not exist`);
  process.exit(1);
}

const { workspaces } = parsePkgJson(process.cwd());

if (!Array.isArray(workspaces) || workspaces.length === 0) {
  console.error('This CLI only works on monorepos with workspaces ' +
    'there are no workspacs defined in your package.json');
  process.exit(1);
}

const packages = await resolveWorkspaces(workspaces, cwd);
const answers = await inquirer.prompt({
  name: 'packages',
  message: 'Choose which packages you want to sync',
  type: 'checkbox',
  pageSize: 20,
  choices: packages.map((pkg) => ({
    name: pkg.pkgJson.name,
    value: pkg,
    checked: false
  }))
});

if (answers.packages.length === 0) {
  console.log('No packages selected');
  process.exit(0);
}

// Watch for changes
try {
  await watch(answers.packages, { cwd, targetDir });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
