#!/usr/bin/env node
// List the `expect(` lines a PR removes or adds in test files, as Markdown for
// a PR comment. "Every changed test expectation needs a reason" (PR template,
// Testing) is then visible without anyone scanning the diff. Prints nothing
// when no expectation changed.
//
// Zero npm dependencies; Node built-ins only.
//
// Usage (CI): node scripts/changed-expectations.mjs origin/main

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- changed-expectations -->';
const LIMIT = 40;

const isTestPath = (path) =>
  /\.test\.(ts|tsx|mjs)$/.test(path) || path.startsWith('tests/');

// Parses `git diff -U0` output into the expect( lines removed and added per
// test file. A modified expectation shows up as one removed and one added.
export const parseExpectations = (diff) => {
  const removed = [];
  const added = [];
  let file = null;
  let oldFile = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('--- ')) {
      oldFile = line.slice(4).replace(/^a\//, '');
      file = oldFile;
    } else if (line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '');
      // A deleted file has no new path; its removed lines still count.
      file = path === '/dev/null' ? oldFile : path;
    } else if (file && isTestPath(file) && /\bexpect\(/.test(line)) {
      const text = line.slice(1).trim();
      if (line.startsWith('-')) removed.push({ file, text });
      else if (line.startsWith('+')) added.push({ file, text });
    }
  }
  return { removed, added };
};

const section = (title, entries) => {
  if (entries.length === 0) return '';
  const shown = entries
    .slice(0, LIMIT)
    .map(({ file, text }) => `- \`${file}\`: \`${text.replaceAll('`', "'")}\``);
  const more =
    entries.length > LIMIT ? [`- … and ${entries.length - LIMIT} more`] : [];
  return `**${title} (${entries.length})**\n\n${[...shown, ...more].join('\n')}\n\n`;
};

export const renderComment = ({ removed, added }) =>
  removed.length === 0 && added.length === 0
    ? ''
    : `${MARKER}\n### Changed test expectations\n\n` +
      section('Removed', removed) +
      section('Added', added) +
      '_Each removed or changed expectation needs a reason under **Testing** in the PR body._\n';

const main = () => {
  const base = process.argv[2];
  if (!base) {
    console.error('usage: changed-expectations.mjs <base-ref>');
    process.exit(2);
  }
  const diff = execFileSync(
    'git',
    ['diff', '-U0', '--no-color', `${base}...HEAD`, '--', '*.test.*', 'tests/'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  process.stdout.write(renderComment(parseExpectations(diff)));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (err) {
    console.error('changed-expectations: unexpected error');
    console.error(err);
    process.exit(2);
  }
}
