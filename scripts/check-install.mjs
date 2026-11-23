#!/usr/bin/env node
// First step of `npm run verify` (#102): fail fast when this folder's
// node_modules does not match its package.json.
//
// An agent worktree under .claude/worktrees/ has no node_modules of its own,
// so Node, TypeScript and Jest resolve packages from the main checkout's,
// which can be a different version set: false type errors in untouched files.
// The same mismatch happens in any checkout after a pull or branch switch that
// added or changed a dependency. `npm ls --depth=0` (about 0.3 s) reports
// missing, invalid and extraneous top-level packages; file mtimes are no
// guide, since git rewrites package-lock.json on checkout.
//
// Zero npm dependencies; Node built-ins only.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const installProblem = ({ hasNodeModules, npmLsOk }) => {
  if (!hasNodeModules) {
    return (
      'no node_modules in this folder (an agent worktree, or a fresh clone): ' +
      'packages would resolve from a parent folder. Run `npm ci` here.'
    );
  }
  if (!npmLsOk) {
    return (
      'installed packages do not match package.json (see `npm ls ' +
      '--depth=0`), e.g. after a pull or branch switch. Run `npm ci`.'
    );
  }
  return null;
};

const main = () => {
  const root = path.resolve(import.meta.dirname, '..');
  const hasNodeModules = existsSync(path.join(root, 'node_modules'));
  const npmLsOk =
    hasNodeModules &&
    spawnSync('npm', ['ls', '--depth=0'], { cwd: root, stdio: 'ignore' })
      .status === 0;
  const problem = installProblem({ hasNodeModules, npmLsOk });
  if (problem) {
    console.error(`✗ ${problem}`);
    return 1;
  }
  return 0;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
