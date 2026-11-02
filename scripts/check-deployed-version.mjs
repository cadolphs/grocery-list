#!/usr/bin/env node
// ship-pr deployCheck: waits until production serves the merge commit.
// ship-pr sets SHIP_PR_SHA; the deploy runs after CI on main (~5-10 min).
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const sha = process.argv[2] ?? process.env.SHIP_PR_SHA;
if (!sha) {
  console.error('usage: check-deployed-version.mjs <sha> (or set SHIP_PR_SHA)');
  process.exit(2);
}
const control = path.join(import.meta.dirname, 'control.mjs');
const result = spawnSync(
  process.execPath,
  [
    control,
    'health',
    '--sha',
    sha,
    '--wait',
    process.env.DEPLOY_WAIT_SEC ?? '900',
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
