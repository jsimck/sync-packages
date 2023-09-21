import { existsSync, readFileSync } from 'node:fs';
import * as nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

export function getImportMetaDirname(importMeta) {
  const filename = fileURLToPath(importMeta.url);
  const dirname = nodePath.dirname(filename);

  return {
    filename,
    dirname
  };
}

export function parsePkgJson(cwd) {
  const pkgJsonPath = nodePath.join(cwd, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    throw new Error(`No package.json found in ${pkgJsonPath}`);
  }

  return JSON.parse(readFileSync(pkgJsonPath));
}
