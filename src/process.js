import nodePath from 'node:path';
import chokidar from 'chokidar';
import { globby } from 'globby';
import { parsePkgJson } from './utils.js';
import fs from 'node:fs';
import fsa from 'node:fs/promises';
import chalk from 'chalk';

export async function resolveWorkspaces(globs, cwd) {
  const packages = [];
  const paths = await globby(globs, {
    cwd,
    onlyFiles: false,
    expandDirectories: false,
    absolute: true
  });

  for (const p of paths) {
    const pkgJson = await parsePkgJson(p);

    packages.push({
      path: p,
      pkgJson
    });
  }

  return packages;
}

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
  } else if (existsSync(nodePath.join(dir, '.gitignore'))) {
    ignored = await fsa.readFile(nodePath.join(dir, '.gitignore'), 'utf8');
  }

  return ignored.split('\n')
    .filter((line) => line.trim().length > 0)
    .map(line => line.replace('!!', '!'));
}

export async function ensureDir(path) {
  const dirname = nodePath.dirname(path);

  if (fs.existsSync(dirname)) {
    return;
  }

  await fsa.mkdir(dirname, { recursive: true });
}

export async function copy(src, dest) {
  await ensureDir(dest);

  if (!fs.lstatSync(src).isDirectory()) {
    await fsa.copyFile(src, dest);
  }
}

export function throttle(fn, delay) {
  // define throttling function
  let timer = null;

  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

export async function watchPackage(dir, pkgJson, targetDir) {
  // TODO fix ignored
  const watcher = chokidar.watch([nodePath.join(dir, './**')], {
    ignored: ['node_modules', '.DS_Store'],
    persistent: true,
    cwd: dir,
  });

  const dstDir = nodePath.join(targetDir, 'node_modules', pkgJson.name);
  await ensureDir(dstDir);

  let copiedCount = 0;
  let deletedCount = 0;

  const printStats = throttle(() => {
    console.log(`${chalk.cyan(pkgJson.name)}: ${copiedCount} ${chalk.green.bold('✓')}, ${copiedCount} ${chalk.red.bold('⛌')}` );
    copiedCount = 0;
    deletedCount = 0;
  }, 100);

  watcher.on('all', async (eventName, path) => {
    const dest = nodePath.join(dstDir, path);
    const src = nodePath.join(dir, path);

    if (['add', 'addDir', 'change'].includes(eventName)) {
      copy(src, dest);
      copiedCount++;
    } else if (['unlink', 'unlinkDir'].includes(eventName)) {
      fsa.unlink(dest);
      deletedCount++;
    }

    printStats();
  });
}

export async function watch(packages, options) {
  const { cwd, targetDir } = {
    cwd: process.cwd(),
    ...options,
  };

  for (const { path, pkgJson } of packages) {
    await watchPackage(path, pkgJson, targetDir);
  }
}
