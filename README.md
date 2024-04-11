# sync-packages

Utility script for watching a package (monorepo workspaces) files and syncing (copying) them to another directory. This is usefull in situations when npm link locally fails (due to dependencies) or when you want to test a package in a different project.

## Usage
This simple CLI accepts a single argument, the path to the target package. It will watch current directory workspace and copy changed packages into destination folder.

```sh
npx sync-packages ../../target-package
```

## Contribution guide

Every PR implementing new feature should include [changeset](https://github.com/changesets/changesets). Use `npm run changeset` from the root of the repository to generate new changeset and include it with your PR.
