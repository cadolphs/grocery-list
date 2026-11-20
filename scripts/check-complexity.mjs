#!/usr/bin/env node
// Deterministic size metrics for the production code (src/** and App.tsx):
// lines per file, longest function, deepest nesting. Prints the files over
// the thresholds as a markdown table and always exits 0: it informs the weekly
// code-health sweep (.github/workflows/code-health.yml, issue #74), it does
// not gate. The sweep hands the table to the model so it reads the outliers
// instead of measuring what a script can measure.
//
// The metrics come from a character scan, not a parse, so they are
// approximations:
// - "nesting" is bracket depth: every unclosed `{`, `(` or `[` counts one
//   level, so a JSX tree and a nested arrow callback both add depth.
// - a "function" is a `{` block opened by `=>` or by `name(...)` where name is
//   not a control keyword (declarations, methods, arrow bodies), or a `(`
//   opened by `=>` (an expression-bodied arrow such as `() => (<View />)`).
//   The name is read from the line where the parameter list starts; a
//   callback that has no name of its own (`useEffect(() => {`,
//   `onPress={() => {`) is reported under the nearest enclosing name.
//   `StyleSheet.create({` and other object literals are not functions.
// - strings, template literals, comments and regex literals are skipped; an
//   apostrophe in JSX text (Don't) is not treated as a quote, and a quote
//   left open at the end of a line ends there, as it does in JS.
// - on an internal error the report is a single "Complexity measurement
//   failed" line, so the sweep can tell an empty table from a broken run.
//
// Zero npm dependencies; Node built-ins only.
//
// Usage:
//   node scripts/check-complexity.mjs [--max-file-lines=400]
//     [--max-function-lines=150] [--max-nesting=8] [--all] [path ...]
//
// Paths default to `src` and `App.tsx`; *.test.ts(x) files are skipped.
// `--all` prints every file (largest first), not only the outliers.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_THRESHOLDS = {
  maxFileLines: 400,
  maxFunctionLines: 150,
  maxNesting: 8,
};

const OPENERS = new Set(['{', '(', '[']);
const CLOSERS = new Set(['}', ')', ']']);
// `word (...) {` opens a block, not a function, for these.
const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
// A `word (` that names nothing: the paren belongs to an expression.
const KEYWORDS = new Set([
  'return',
  'await',
  'yield',
  'typeof',
  'void',
  'throw',
  'new',
  'else',
  'do',
  'case',
  'in',
  'of',
  'instanceof',
  'delete',
  'export',
  'default',
  'import',
]);
// A `/` right after one of these starts a regex literal, not a division.
const REGEX_PRECEDERS = new Set([
  '',
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
]);
const isWordChar = (ch) => /[\w$]/.test(ch);

// Name owning the parameter list that opens after `text` (the line up to the
// `(`): `function name(`, `const name = (`, `name: (`, `name(`. Control and
// other keywords come back as themselves so the caller can tell them apart;
// an unnamed paren (`useEffect((`, `return (`) comes back as ''.
const nameBefore = (text) => {
  const head = text.replace(/\basync\s*$/, '').trimEnd();
  if (/\bfor\s+await$/.test(head)) return 'for';
  const tail = /([\w$]+)$/.exec(head)?.[1];
  if (tail === 'function') return '(anonymous)';
  if (tail && KEYWORDS.has(tail)) return '';
  const named =
    /function\s+([\w$]+)$/.exec(head) ??
    /([\w$]+)\s*[=:]\s*(?:async)?$/.exec(head);
  if (named) return named[1];
  if (tail) return tail;
  const decl = [...head.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=/g)].pop();
  return decl ? decl[1] : '';
};

// Text before a `{`, with a trailing TS return-type annotation removed, so
// `function f(): string {` still ends in `)`. An arrow (`(a): B => {`) is
// kept as `=>`.
const blockHead = (text) => {
  const head = text.trimEnd();
  return head.endsWith('=>')
    ? head
    : head.replace(/:\s*[^:;{}()]*$/, '').trimEnd();
};

// Scans one file's source and returns its metrics. Pure: same input, same
// result.
export const measureSource = (source) => {
  const lines = source.split('\n');
  const lineCount =
    source === '' ? 0 : lines.length - (lines.at(-1) === '' ? 1 : 0);

  let depth = 0;
  let maxNesting = { depth: 0, line: 0 };
  let longestFunction = { name: '', lines: 0, line: 0 };
  // Open brackets, innermost last: { char, line, name, isFunction }.
  const stack = [];
  let lastParen = null; // the most recently closed `(...)` frame
  let prev = ''; // previous significant character (for `/` and `'`)
  let prevWord = ''; // identifier or keyword that `prev` ended
  let mode = 'code'; // code | line-comment | block-comment | ' | " | ` | regex
  const templateDepths = []; // bracket depth at each open `${`

  const enclosingName = () =>
    [...stack].reverse().find((frame) => frame.name)?.name ?? '';

  const closeFunction = (frame, lineIndex) => {
    const length = lineIndex - frame.line + 1;
    if (length > longestFunction.lines)
      longestFunction = {
        name: frame.name,
        lines: length,
        line: frame.line + 1,
      };
  };

  const open = (ch, text, lineIndex) => {
    const frame = { char: ch, line: lineIndex, name: '', isFunction: false };
    if (ch === '(') {
      frame.name = nameBefore(text);
      if (text.trimEnd().endsWith('=>')) {
        frame.isFunction = true;
        frame.name = lastParen?.name ?? '';
      }
    } else if (ch === '{') {
      const head = blockHead(text);
      if (head.endsWith('=>')) {
        frame.isFunction = true;
        frame.name = lastParen?.name ?? '';
      } else if (head.endsWith(')') && lastParen) {
        frame.isFunction = !CONTROL.has(lastParen.name);
        frame.name = frame.isFunction ? lastParen.name : '';
      }
    }
    if (!frame.name) frame.name = enclosingName();
    if (frame.isFunction && !frame.name) frame.name = '(anonymous)';
    stack.push(frame);
    depth += 1;
    if (depth > maxNesting.depth) maxNesting = { depth, line: lineIndex + 1 };
  };

  const close = (lineIndex) => {
    const frame = stack.pop();
    if (!frame) return;
    depth -= 1;
    if (frame.char === '(') lastParen = frame;
    if (frame.isFunction) closeFunction(frame, lineIndex);
  };

  lines.forEach((line, lineIndex) => {
    // None of these can span lines; a false start (an unpaired quote in
    // JSX text) must not swallow the rest of the file.
    if (['line-comment', 'regex', "'", '"'].includes(mode)) mode = 'code';
    let word = '';
    const endWord = () => {
      if (!word) return;
      prevWord = word;
      prev = word.at(-1);
      word = '';
    };

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1] ?? '';

      if (mode === 'block-comment') {
        if (ch === '*' && next === '/') {
          mode = 'code';
          i += 1;
        }
        continue;
      }
      if (mode === "'" || mode === '"' || mode === 'regex') {
        if (ch === '\\') i += 1;
        else if (ch === (mode === 'regex' ? '/' : mode)) mode = 'code';
        continue;
      }
      if (mode === '`') {
        if (ch === '\\') i += 1;
        else if (ch === '`') mode = 'code';
        else if (ch === '$' && next === '{') {
          templateDepths.push(depth);
          mode = 'code';
          i += 1;
        }
        continue;
      }

      // mode === 'code'
      if (isWordChar(ch)) {
        word += ch;
        continue;
      }
      endWord();
      if (/\s/.test(ch)) continue;

      if (ch === '/' && next === '/') {
        mode = 'line-comment';
        break;
      }
      if (ch === '/' && next === '*') {
        mode = 'block-comment';
        i += 1;
        continue;
      }
      if (ch === '=' && next === '>') {
        prev = '=';
        prevWord = '';
        i += 1;
        continue;
      }
      if (ch === '}' && templateDepths.at(-1) === depth) {
        templateDepths.pop();
        mode = '`';
        continue;
      }

      if (ch === "'" || ch === '"') {
        // `Don't` in JSX text is prose, not a string.
        if (!(ch === "'" && isWordChar(prev))) mode = ch;
      } else if (ch === '`') {
        mode = '`';
      } else if (
        ch === '/' &&
        next !== '>' && // self-closing JSX tag, `<Foo />`
        (REGEX_PRECEDERS.has(prev) || prevWord === 'return')
      ) {
        mode = 'regex';
      } else if (OPENERS.has(ch)) {
        open(ch, line.slice(0, i), lineIndex);
      } else if (CLOSERS.has(ch)) {
        close(lineIndex);
      }
      prev = ch;
      prevWord = '';
    }
    endWord();
  });

  return { lines: lineCount, longestFunction, maxNesting };
};

const isSource = (name) =>
  /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name);

// Every non-test .ts/.tsx file under the given paths (files or directories),
// relative to root, in a stable order.
export const collectFiles = (paths, root = ROOT) => {
  const walk = (path) =>
    statSync(path).isDirectory()
      ? readdirSync(path)
          .sort()
          .flatMap((name) => walk(join(path, name)))
      : isSource(path)
        ? [path]
        : [];
  return paths
    .flatMap((p) => walk(join(root, p)))
    .map((p) => relative(root, p));
};

export const measureFiles = (files, root = ROOT) =>
  files.map((file) => ({
    file,
    ...measureSource(readFileSync(join(root, file), 'utf8')),
  }));

// Which thresholds a row exceeds, in a fixed order; empty for a healthy file.
export const exceeded = (row, thresholds = DEFAULT_THRESHOLDS) =>
  [
    row.lines > thresholds.maxFileLines && 'file lines',
    row.longestFunction.lines > thresholds.maxFunctionLines && 'function lines',
    row.maxNesting.depth > thresholds.maxNesting && 'nesting',
  ].filter(Boolean);

const byLinesDesc = (a, b) => b.lines - a.lines || a.file.localeCompare(b.file);

export const findOutliers = (rows, thresholds = DEFAULT_THRESHOLDS) =>
  rows.filter((row) => exceeded(row, thresholds).length > 0).sort(byLinesDesc);

const describeThresholds = (t) =>
  `file > ${t.maxFileLines} lines, function > ${t.maxFunctionLines} lines, nesting > ${t.maxNesting}`;

const functionCell = ({ name, lines, line }) =>
  lines === 0 ? 'none' : `\`${name}\` (${lines} lines, L${line})`;

const row = (r, thresholds) =>
  `| \`${r.file}\` | ${r.lines} | ${functionCell(r.longestFunction)} | ${r.maxNesting.depth} (L${r.maxNesting.line}) | ${exceeded(r, thresholds).join(', ') || '-'} |`;

// Markdown report: one summary line, then the outliers (every file with
// `all`) as a table.
export const renderReport = (
  rows,
  thresholds = DEFAULT_THRESHOLDS,
  { all = false } = {},
) => {
  const outliers = findOutliers(rows, thresholds);
  const shown = all ? [...rows].sort(byLinesDesc) : outliers;
  const summary =
    outliers.length === 0
      ? `No complexity outliers in ${rows.length} files (${describeThresholds(thresholds)}).`
      : `${outliers.length} of ${rows.length} files over thresholds (${describeThresholds(thresholds)}). Nesting is bracket depth and function length is approximate; see scripts/check-complexity.mjs.`;
  if (shown.length === 0) return `${summary}\n`;
  return [
    summary,
    '',
    '| File | Lines | Longest function | Max nesting | Over |',
    '| --- | --- | --- | --- | --- |',
    ...shown.map((r) => row(r, thresholds)),
    '',
  ].join('\n');
};

const FLAG_TO_KEY = {
  'max-file-lines': 'maxFileLines',
  'max-function-lines': 'maxFunctionLines',
  'max-nesting': 'maxNesting',
};

export const parseArgs = (argv) => {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  const paths = [];
  let all = false;
  for (const arg of argv) {
    const flag = /^--([a-z-]+)(?:=(\d+))?$/.exec(arg);
    if (!flag) paths.push(arg);
    else if (flag[1] === 'all' && flag[2] === undefined) all = true;
    else if (FLAG_TO_KEY[flag[1]] && flag[2] !== undefined)
      thresholds[FLAG_TO_KEY[flag[1]]] = Number(flag[2]);
    else throw new Error(`unknown or incomplete flag: ${arg}`);
  }
  return { thresholds, all, paths: paths.length ? paths : ['src', 'App.tsx'] };
};

const main = () => {
  const { thresholds, all, paths } = parseArgs(process.argv.slice(2));
  const rows = measureFiles(collectFiles(paths));
  process.stdout.write(renderReport(rows, thresholds, { all }));
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (err) {
    // Informational only, so still exit 0, but say so on stdout: the sweep
    // reads stdout and must not mistake a broken run for a clean one.
    process.stdout.write(`Complexity measurement failed: ${err.message}\n`);
    console.error(err);
  }
}
