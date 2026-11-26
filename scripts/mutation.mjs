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
//   npm run mutation -- src/domain/trip.ts [...]   # only these files
//   npm run mutation -- --all       # every file in stryker.config.mjs scope
//
// Pass paths when a branch touches many files but only some carry logic
// changes (a rename across the domain, say): the changed-file scope would
// mutate them all.
//
// Exits with Stryker's exit code (non-zero below the 80% break threshold), or
// 0 when no domain or port file changed.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MUTATABLE = /^src\/(domain|ports)\/.+\.ts$/;
const NOT_MUTATABLE = /\.(test|d)\.ts$/;

// Above this many files a changed-file run can take most of the 15-minute
// budget, so the runner suggests naming the files instead.
export const WIDE_RUN_FILES = 3;

const isMutatable = (path) => MUTATABLE.test(path) && !NOT_MUTATABLE.test(path);

// `exists` keeps a file the working tree no longer has (deleted but still
// listed by git) away from Stryker.
export const selectMutateFiles = (paths, exists = existsSync) => [
  ...new Set(paths.filter((path) => isMutatable(path) && exists(path))),
];

const USAGE =
  'Usage: npm run mutation [-- <base-ref> | --all | <src/domain|src/ports file>...]';

const looksLikePath = (arg) => arg.endsWith('.ts');

// Turns the CLI arguments into what to mutate:
//   { base }   files changed versus that ref
//   { all }    the config's own scope
//   { paths }  exactly these files
//   { error }  a message to print before exiting with 2
export const parseArgs = (args, exists = existsSync) => {
  if (args.length === 0) return { base: 'origin/main' };
  if (args.some(looksLikePath)) {
    const rejected = args.filter(
      (arg) => !looksLikePath(arg) || !isMutatable(arg) || !exists(arg),
    );
    return rejected.length > 0
      ? {
          error: `Not an existing src/domain or src/ports source file: ${rejected.join(', ')}\n${USAGE}`,
        }
      : { paths: [...new Set(args)] };
  }
  const [arg, ...rest] = args;
  if (rest.length > 0 || (arg.startsWith('-') && arg !== '--all')) {
    return { error: USAGE };
  }
  return arg === '--all' ? { all: true } : { base: arg };
};

// `files` is a list of paths, or 'all' for the config's own `mutate` scope.
export const strykerArgs = (files) =>
  files === 'all'
    ? ['stryker', 'run']
    : ['stryker', 'run', '--mutate', files.join(',')];

export const scopeMessage = (files, { fromDiff }) => {
  if (files === 'all') return 'Mutating the full stryker.config.mjs scope.';
  const list = `Mutating ${files.length} file(s): ${files.join(', ')}`;
  return fromDiff && files.length > WIDE_RUN_FILES
    ? `${list}\nThat is a wide run. If only some of these files carry logic ` +
        'changes, name them instead: npm run mutation -- <file>...'
    : list;
};

const gitLines = (args) =>
  execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const changedPaths = (base) => {
  const [mergeBase] = gitLines(['merge-base', base, 'HEAD']);
  return [
    ...gitLines(['diff', '--name-only', '--diff-filter=d', mergeBase]),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ];
};

const resolveFiles = (parsed) => {
  if (parsed.all) return 'all';
  if (parsed.paths) return parsed.paths;
  return selectMutateFiles(changedPaths(parsed.base));
};

const main = () => {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    return 2;
  }
  let files;
  try {
    files = resolveFiles(parsed);
  } catch {
    console.error(
      `Cannot diff against ${parsed.base} (try git fetch origin).\n${USAGE}`,
    );
    return 2;
  }
  if (files !== 'all' && files.length === 0) {
    console.log(
      'No src/domain or src/ports source file changed; nothing to mutate.',
    );
    return 0;
  }
  console.log(scopeMessage(files, { fromDiff: parsed.base !== undefined }));
  const result = spawnSync('npx', strykerArgs(files), { stdio: 'inherit' });
  return result.status ?? 1;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
