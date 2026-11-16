#!/usr/bin/env node
// Fail a PR whose declared `Risk:` is lower than the tier its changed paths
// imply (AGENTS.md risk tiers). Paths can only raise the tier: a human or
// agent may declare higher than computed, never lower.
//
// Zero npm dependencies; Node built-ins only.
//
// Usage (CI):
//   PR_BODY="$body" node scripts/check-risk-tier.mjs origin/main
//
// Exit codes: 0 ok, 1 declared tier too low or missing, 2 unexpected error.

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const TIERS = ['low', 'medium', 'high'];

const isTestFile = (path) => /\.test\.(ts|tsx|mjs)$/.test(path);

// Mirrors the table in AGENTS.md. "Auth flows" cannot be told from paths, so
// src/auth/ stands in for it. Test files never raise the tier.
const HIGH = [
  /^firestore\.rules$/,
  /^firebase\.json$/,
  /^eas\.json$/,
  /^app\.json$/,
  /^src\/auth\//,
  /^\.github\/workflows\//,
];
const MEDIUM = [/^src\/adapters\//, /^package(-lock)?\.json$/];

const tierOfPath = (path) => {
  if (isTestFile(path) && !path.startsWith('.github/')) return 'low';
  if (HIGH.some((re) => re.test(path))) return 'high';
  if (MEDIUM.some((re) => re.test(path))) return 'medium';
  return 'low';
};

export const computeTier = (paths) =>
  paths.reduce(
    (top, path) =>
      TIERS.indexOf(tierOfPath(path)) > TIERS.indexOf(top)
        ? tierOfPath(path)
        : top,
    'low',
  );

// First `Risk: <tier>` line in the PR body. The template's placeholder
// (`Risk: <!-- low | medium | high ... -->`) does not match.
export const parseDeclaredTier = (body) => {
  const match = /^Risk:\s*(low|medium|high)\b/im.exec(body ?? '');
  return match ? match[1].toLowerCase() : null;
};

export const checkRiskTier = ({ body, paths }) => {
  const computed = computeTier(paths);
  const declared = parseDeclaredTier(body);
  if (declared === null) {
    return {
      ok: false,
      computed,
      declared,
      message: `PR body has no "Risk: low|medium|high" line (changed paths imply at least ${computed}).`,
    };
  }
  if (TIERS.indexOf(declared) < TIERS.indexOf(computed)) {
    return {
      ok: false,
      computed,
      declared,
      message: `Declared Risk: ${declared}, but the changed paths imply ${computed}. Raise the Risk line (AGENTS.md risk tiers).`,
    };
  }
  return {
    ok: true,
    computed,
    declared,
    message: `OK: declared ${declared}, paths imply ${computed}.`,
  };
};

const changedPaths = (base) =>
  execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

const main = () => {
  const base = process.argv[2];
  if (!base) {
    console.error('usage: check-risk-tier.mjs <base-ref>');
    process.exit(2);
  }
  const result = checkRiskTier({
    body: process.env.PR_BODY,
    paths: changedPaths(base),
  });
  (result.ok ? console.log : console.error)(result.message);
  process.exit(result.ok ? 0 : 1);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (err) {
    console.error('check-risk-tier: unexpected error');
    console.error(err);
    process.exit(2);
  }
}
