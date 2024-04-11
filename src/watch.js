import fs from 'node:fs';
import fsa from 'node:fs/promises';
import nodePath from 'node:path';

import chokidar from 'chokidar';
import color from 'picocolors';

import { throttle } from './utils.js';

// TODO - parse gitignore/npmignore for ignored files
export async function readIgnored(dir) {
  let ignored = [
    '*',
    '!lib/**/*',
    '!entries/**/*',
    '!webpack/**/*',
    '!package.json',
  ].join('\n');

  if (fs.existsSync(nodePath.join(dir, '.npmignore'))) {
    ignored = await fsa.readFile(nodePath.join(dir, '.npmignore'), 'utf8');
  } else if (fs.existsSync(nodePath.join(dir, '.gitignore'))) {
    ignored = await fsa.readFile(nodePath.join(dir, '.gitignore'), 'utf8');
  }

  return ignored
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace('!!', '!'));
}

/**
 * Ensure directory exists.
 */
export async function ensureDir(path) {
  const dirname = nodePath.dirname(path);

  if (fs.existsSync(dirname)) {
    return;
  }

  await fsa.mkdir(dirname, { recursive: true });
}

/**
 * Copy file.
 */
export async function copy(src, dest) {
  await ensureDir(dest);

  if (!fs.lstatSync(src).isDirectory()) {
    await fsa.copyFile(src, dest);
  }
}

/**
 * Print stats for copied and deleted files and directories.
 */
function printStats(name, copied, deleted, verbose = false) {
  const copiedCount = copied.length;
  const deletedCount = deleted.length;

  if (verbose) {
    console.log(`${color.cyan(name)}`);

    copied.forEach((path, index) =>
      console.log(
        ` ${color.dim(index === copiedCount - 1 ? '└' : '├')} ${color.green('✓')} ${path}`,
      ),
    );

    deleted.forEach((path, index) =>
      console.log(
        ` ${color.dim(index === deletedCount - 1 ? '└' : '├')} ${color.red('⛌')} ${path}`,
      ),
    );
  } else {
    console.log(
      `${color.cyan(name)}: ${copiedCount} ${color.green('✓')}, ${deletedCount} ${color.red('⛌')}`,
    );
  }
}

/**
 * Function to watch packages for changes and copy
 * them to the target directory on change.
 */
export async function watchPackage(dir, pkgJson, destPath, verbose) {
  // TODO fix ignored
  const watcher = chokidar.watch([nodePath.join(dir, './**')], {
    ignored: ['node_modules', '.DS_Store'],
    persistent: true,
    cwd: dir,
  });

  const dstDir = nodePath.join(destPath, 'node_modules', pkgJson.name);
  await ensureDir(dstDir);

  let copied = [];
  let deleted = [];

  const throttleStats = throttle(() => {
    printStats(pkgJson.name, copied, deleted, verbose);

    copied = [];
    deleted = [];
  }, 100);

  watcher.on('all', async (eventName, path) => {
    const dest = nodePath.join(dstDir, path);
    const src = nodePath.join(dir, path);

    if (['add', 'addDir', 'change'].includes(eventName)) {
      copy(src, dest);
      copied.push(path);
    } else if (['unlink', 'unlinkDir'].includes(eventName)) {
      fsa.unlink(dest);
      deleted.push(path);
    }

    throttleStats();
  });
}

export async function watch(packages, options) {
  const { destPath, verbose } = {
    cwd: process.cwd(),
    ...options,
  };

  for (const { path, pkgJson } of packages) {
    await watchPackage(path, pkgJson, destPath, verbose);
  }
}
