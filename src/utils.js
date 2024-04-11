import { existsSync, readFileSync } from 'node:fs';
import * as nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import { globby } from 'globby';

export function getImportMetaDirname(importMeta) {
  const filename = fileURLToPath(importMeta.url);
  const dirname = nodePath.dirname(filename);

  return {
    filename,
    dirname,
  };
}

/**
 * Parse package.json file. Throws error if not found.
 */
export function parsePkgJson(cwd) {
  const pkgJsonPath = nodePath.join(cwd, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    throw new Error(`No package.json found in ${pkgJsonPath}`);
  }

  return JSON.parse(readFileSync(pkgJsonPath));
}

/**
 * Resolve workspaces from globs. Returns an array of packages.
 */
export async function resolveWorkspaces(globs, cwd) {
  const packages = [];
  const paths = await globby(globs, {
    cwd,
    onlyFiles: false,
    expandDirectories: false,
    absolute: true,
  });

  for (const p of paths) {
    const pkgJson = await parsePkgJson(p);

    packages.push({
      path: p,
      pkgJson,
    });
  }

  return packages;
}

/**
 * Resolve current working directory. Returns an array of packages.
 */
export async function resolveCwd(cwd) {
  const pkgJson = parsePkgJson(cwd);

  // Return root package.json if no workspaces
  if (!pkgJson.workspaces) {
    return [
      {
        path: cwd,
        pkgJson,
      },
    ];
  }

  return resolveWorkspaces(pkgJson.workspaces);
}

/**
 * Throttle function execution
 */
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

/**
 * Create a snippet for pkg-link command.
 */
export function createSnipet(destPath, targets) {
  return `npx pkg-link ${destPath} -t ${targets.join(' ')}`;
}
