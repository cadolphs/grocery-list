#!/usr/bin/env node
// Fail when `npm audit` reports a high or critical advisory in the dependencies
// that ship (`--omit=dev`) and it is not on .github/audit-allowlist.json.
// Allowlist entries carry a reason and an expiry date: an entry past its date
// fails the check while its advisory is still present, so every exception gets
// looked at again. Dev-only advisories are not gated (build tooling).
//
// Zero npm dependencies; Node built-ins only.
//
// Usage (CI): node scripts/check-audit.mjs
//
// Exit codes: 0 ok, 1 unallowlisted or expired advisory, 2 audit could not run.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST = join(ROOT, '.github', 'audit-allowlist.json');
const GATED = new Set(['high', 'critical']);

// Unique high/critical advisories from `npm audit --json`. Every package in a
// dependency chain repeats the same advisory object in `via`, so key on id.
export const collectAdvisories = (audit) => {
  const byId = new Map();
  for (const vuln of Object.values(audit.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || !GATED.has(via.severity)) continue;
      const id = via.url.split('/').pop();
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          severity: via.severity,
          name: via.name,
          title: via.title,
        });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
};

export const evaluateAudit = ({ advisories, allowlist, today }) => {
  const entries = new Map(allowlist.map((e) => [e.id, e]));
  const failures = [];
  const notices = [];

  for (const adv of advisories) {
    const entry = entries.get(adv.id);
    const label = `${adv.id} (${adv.severity}, ${adv.name}: ${adv.title})`;
    if (!entry) failures.push(`not allowlisted: ${label}`);
    else if (entry.expires < today)
      failures.push(`allowlist entry expired ${entry.expires}: ${label}`);
    else notices.push(`allowed until ${entry.expires}: ${label}`);
  }

  const present = new Set(advisories.map((a) => a.id));
  for (const entry of allowlist) {
    if (!present.has(entry.id))
      notices.push(`stale allowlist entry, remove it: ${entry.id}`);
  }

  return { ok: failures.length === 0, failures, notices };
};

const runAudit = () => {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    // npm audit exits non-zero whenever it finds anything; stdout still has the report.
    if (err.stdout) return err.stdout;
    throw err;
  }
};

const main = () => {
  const audit = JSON.parse(runAudit());
  if (audit.error) {
    console.error(`npm audit could not run: ${audit.error.summary}`);
    process.exit(2);
  }
  const result = evaluateAudit({
    advisories: collectAdvisories(audit),
    allowlist: JSON.parse(readFileSync(ALLOWLIST, 'utf8')),
    today: new Date().toISOString().slice(0, 10),
  });
  for (const notice of result.notices) console.log(`note: ${notice}`);
  if (result.ok) {
    console.log('OK: no unallowlisted high or critical runtime advisories');
    process.exit(0);
  }
  for (const failure of result.failures) console.error(`FAIL: ${failure}`);
  console.error(
    '\nFix the dependency, or add the advisory id to .github/audit-allowlist.json with a reason and an expiry date.',
  );
  process.exit(1);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (err) {
    console.error('check-audit: unexpected error');
    console.error(err);
    process.exit(2);
  }
}
