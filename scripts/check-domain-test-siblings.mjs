#!/usr/bin/env node
// Check that every behavioral module under src/domain/ and src/ports/ has
// a sibling *.test.ts(x) file. Prevents recurrence of the test-coverage gap
// that hid the section-order reactivity defect (see RCA root cause B).
//
// Zero npm dependencies — Node built-ins only.
//
// Excluded from the check:
//   - *.test.ts, *.test.tsx          (the tests themselves)
//   - *.d.ts                         (ambient declarations)
//   - index.ts                       (re-export barrels)
//   - type-only modules              (no value exports — heuristic below)
//   - allowlisted technical debt     (documented gaps to be burned down)
//
// Exit codes:
//   0 — every behavioral module has a sibling test (or is allowlisted/excluded)
//   1 — at least one behavioral module is missing a sibling test
//
// Usage:
//   node scripts/check-domain-test-siblings.mjs

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(HERE);

const SCAN_DIRS = ['src/domain', 'src/ports'];

// Documented technical-debt allowlist. Modules listed here are known to lack
// sibling tests at the time the gate was introduced (step 01-04 of the
// fix-section-order-reactive feature). They MUST be burned down by adding
// real tests; new entries should not be added without explicit review.
//
// Path is relative to repo root, forward-slash separated.
const ALLOWLIST = new Set([
  'src/domain/area-management.ts',
  'src/domain/area-validation.ts',
  'src/domain/item-grouping.ts',
  'src/domain/staple-library.ts',
]);

// --- pure helpers -----------------------------------------------------------

const isTestFile = (name) =>
  name.endsWith('.test.ts') || name.endsWith('.test.tsx');

const isDeclarationFile = (name) => name.endsWith('.d.ts');

const isIndexFile = (name) => name === 'index.ts' || name === 'index.tsx';

const isTypeScriptSource = (name) =>
  (name.endsWith('.ts') || name.endsWith('.tsx')) &&
  !isTestFile(name) &&
  !isDeclarationFile(name);

const stripExt = (name) => name.slice(0, -extname(name).length);

// Heuristic: a module is "type-only" if it contains no runtime value exports.
// We look for `export <kw>` where <kw> is a value-creating keyword. Pure
// `export type` / `export interface` / `export {}` re-exports of types only
// are considered type-only.
//
// This is intentionally conservative — false positives (treating a behavioral
// file as type-only) would skip the test-sibling check, so we err on the side
// of detecting value exports.
const VALUE_EXPORT_PATTERNS = [
  /^\s*export\s+const\b/m,
  /^\s*export\s+let\b/m,
  /^\s*export\s+var\b/m,
  /^\s*export\s+function\b/m,
  /^\s*export\s+async\s+function\b/m,
  /^\s*export\s+class\b/m,
  /^\s*export\s+enum\b/m,
  /^\s*export\s+default\b/m,
  /^\s*export\s+abstract\s+class\b/m,
];

const hasValueExport = (source) =>
  VALUE_EXPORT_PATTERNS.some((re) => re.test(source));

const isTypeOnlyModule = async (absPath) => {
  const source = await readFile(absPath, 'utf8');
  return !hasValueExport(source);
};

// --- directory walk ---------------------------------------------------------

const collectSourceFiles = async (absDir, repoRelDir) => {
  const entries = await readdir(absDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const entryAbs = join(absDir, entry.name);
    const entryRel = `${repoRelDir}/${entry.name}`;
    if (entry.isDirectory()) {
      const nested = await collectSourceFiles(entryAbs, entryRel);
      results.push(...nested);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isIndexFile(entry.name)) continue;
    if (!isTypeScriptSource(entry.name)) continue;
    results.push({ absPath: entryAbs, relPath: entryRel });
  }
  return results;
};

const hasSiblingTest = async (absPath) => {
  const dir = dirname(absPath);
  const stem = stripExt(basename(absPath));
  const candidates = [`${stem}.test.ts`, `${stem}.test.tsx`];
  const siblings = new Set(await readdir(dir));
  return candidates.some((c) => siblings.has(c));
};

// --- main -------------------------------------------------------------------

const findMissingSiblings = async () => {
  const missing = [];
  for (const relDir of SCAN_DIRS) {
    const absDir = join(REPO_ROOT, relDir);
    const sources = await collectSourceFiles(absDir, relDir);
    for (const { absPath, relPath } of sources) {
      if (ALLOWLIST.has(relPath)) continue;
      if (await isTypeOnlyModule(absPath)) continue;
      if (await hasSiblingTest(absPath)) continue;
      missing.push(relPath);
    }
  }
  return missing.sort();
};

const main = async () => {
  const missing = await findMissingSiblings();
  if (missing.length === 0) {
    const allowlistSize = ALLOWLIST.size;
    const note =
      allowlistSize > 0
        ? ` (${allowlistSize} module(s) on technical-debt allowlist)`
        : '';
    console.log(
      `OK: every behavioral module under ${SCAN_DIRS.join(', ')} has a sibling *.test.ts(x)${note}`
    );
    process.exit(0);
  }
  console.error('Missing sibling tests:');
  for (const path of missing) {
    console.error(
      `  MISSING TEST: ${path} (expected sibling ${stripExt(basename(path))}.test.ts or ${stripExt(basename(path))}.test.tsx)`
    );
  }
  console.error(
    `\n${missing.length} module(s) missing sibling tests. Add a *.test.ts(x) sibling for each, or — if the module is genuinely type-only — restructure it so the type-only heuristic detects it.`
  );
  process.exit(1);
};

main().catch((err) => {
  console.error('check-domain-test-siblings: unexpected error');
  console.error(err);
  process.exit(2);
});
