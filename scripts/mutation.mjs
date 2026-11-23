#!/usr/bin/env node
// Local mutation testing, scoped per feature (CLAUDE.md "Mutation Testing
// Strategy"). Runs Stryker on the src/domain and src/ports source files this
// branch changes against its base, including uncommitted and untracked work.
// Mutation testing is deliberately not part of CI or `npm run verify`: a full
// run takes longer than a CI job should, so it is run by hand before a PR that
// touches the domain or ports.
//
// Usage:
//   npm run mutation                # files changed versus origin/main
//   npm run mutation -- main        # files changed versus another base
//   npm run mutation -- --all       # every file in stryker.config.mjs scope
//
// Exits with Stryker's exit code (non-zero below the 80% break threshold), or
// 0 when no domain or port file changed.

import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MUTATABLE = /^src\/(domain|ports)\/.+\.ts$/;
const NOT_MUTATABLE = /\.(test|d)\.ts$/;

export const selectMutateFiles = (paths) => [
  ...new Set(
    paths.filter((path) => MUTATABLE.test(path) && !NOT_MUTATABLE.test(path)),
  ),
];

// `files` is a list of paths, or 'all' for the config's own `mutate` scope.
export const strykerArgs = (files) =>
  files === 'all'
    ? ['stryker', 'run']
    : ['stryker', 'run', '--mutate', files.join(',')];

const gitLines = (args) =>
  execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const changedPaths = (base) => {
  const [mergeBase] = gitLines(['merge-base', base, 'HEAD']);
  return [
    ...gitLines(['diff', '--name-only', '--diff-filter=d', mergeBase]),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ];
};

const USAGE = 'Usage: npm run mutation [-- <base-ref> | --all]';

const resolveFiles = (arg) =>
  arg === '--all'
    ? 'all'
    : selectMutateFiles(changedPaths(arg ?? 'origin/main'));

const main = () => {
  const [arg, ...rest] = process.argv.slice(2);
  if (rest.length > 0 || (arg?.startsWith('-') && arg !== '--all')) {
    console.error(USAGE);
    return 2;
  }
  let files;
  try {
    files = resolveFiles(arg);
  } catch {
    console.error(
      `Cannot diff against ${arg ?? 'origin/main'} (try git fetch origin).\n${USAGE}`,
    );
    return 2;
  }
  if (files !== 'all' && files.length === 0) {
    console.log(
      'No src/domain or src/ports source file changed; nothing to mutate.',
    );
    return 0;
  }
  console.log(
    files === 'all'
      ? 'Mutating the full stryker.config.mjs scope.'
      : `Mutating ${files.length} file(s): ${files.join(', ')}`,
  );
  const result = spawnSync('npx', strykerArgs(files), { stdio: 'inherit' });
  return result.status ?? 1;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
