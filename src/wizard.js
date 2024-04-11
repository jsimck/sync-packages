import fs from 'fs';
import path from 'path';

import {
  cancel,
  confirm,
  intro,
  multiselect,
  outro,
  text,
} from '@clack/prompts';
import color from 'picocolors';

import { createSnipet, resolveCwd } from './utils.js';

function filterPackages(packages, targets) {
  return packages.filter(pkg => targets.includes(pkg.pkgJson.name));
}

/**
 * Wizard for sync-packages.
 */
export async function startWizard(inputPath, options) {
  // Resolve cwd package
  const packages = await resolveCwd(process.cwd());

  // Return if all options are already provided
  if (inputPath && options.targets?.length) {
    // Validate input path
    if (!fs.existsSync(path.join(path.resolve(inputPath), 'node_modules'))) {
      cancel(
        'Destination app root folder does not contain node_modules directory. Exiting.',
      );

      return process.exit(0);
    }

    return {
      packages: filterPackages(packages, options.targets),
      destPath: inputPath,
      targets: options.targets,
    };
  }

  // Start wizard when some params are missing
  intro(color.inverse(' Welcome to sync-packages! '));

  // Get path
  const destPath =
    inputPath ||
    (await text({
      message: 'Path to the destination app root folder',
      placeholder: '../my-app',
      required: true,
      validate: value =>
        !fs.existsSync(path.resolve(value))
          ? 'This path does not exist!'
          : undefined,
    }));

  // We need to validate one more time
  if (!fs.existsSync(path.join(path.resolve(destPath), 'node_modules'))) {
    cancel(
      'Destination app root folder does not contain node_modules directory. Exiting.',
    );

    return process.exit(0);
  }

  // Get package targets
  const targets = options.targets?.length
    ? options.targets
    : await multiselect({
        message: 'Select additional tools.',
        options: packages.map(pkg => ({
          value: pkg.pkgJson.name,
          label: pkg.pkgJson.name,
        })),
        required: true,
      });

  if (!targets.length) {
    cancel('No packages selected or found. Exiting.');

    return process.exit(0);
  }

  const filteredPackages = filterPackages(packages, targets);

  // Provide snippet after finishing wizard
  const shouldContinue = await confirm({
    message: `Before finishing, copy this snippet for faster reuse\n\n${color.cyan(
      createSnipet(
        destPath,
        filteredPackages.map(pkg => pkg.pkgJson.name),
      ),
    )}\n`,
    active: 'Continue',
    inactive: 'Cancel',
    initialValue: true,
  });

  if (!shouldContinue) {
    cancel('Operation cancelled');

    return process.exit(0);
  }

  outro(`You're all set!`);

  return {
    packages: filteredPackages,
    destPath,
    targets,
  };
}
