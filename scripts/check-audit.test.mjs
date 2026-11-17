import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectAdvisories, evaluateAudit } from './check-audit.mjs';

const via = (id, severity = 'high', name = 'pkg') => ({
  name,
  title: `title ${id}`,
  severity,
  url: `https://github.com/advisories/${id}`,
});

describe('collectAdvisories', () => {
  it('keeps high and critical advisories, once per id', () => {
    const audit = {
      vulnerabilities: {
        a: { via: [via('GHSA-1'), 'b'] },
        b: { via: [via('GHSA-1'), via('GHSA-2', 'critical')] },
        c: { via: [via('GHSA-3', 'moderate'), via('GHSA-4', 'low')] },
      },
    };
    assert.deepEqual(
      collectAdvisories(audit).map((a) => [a.id, a.severity]),
      [
        ['GHSA-1', 'high'],
        ['GHSA-2', 'critical'],
      ],
    );
  });

  it('copes with a clean audit', () => {
    assert.deepEqual(collectAdvisories({}), []);
    assert.deepEqual(collectAdvisories({ vulnerabilities: {} }), []);
  });
});

describe('evaluateAudit', () => {
  const adv = { id: 'GHSA-1', severity: 'high', name: 'pkg', title: 't' };
  const entry = (expires) => ({ id: 'GHSA-1', reason: 'r', expires });

  it('fails on an advisory that is not allowlisted', () => {
    const r = evaluateAudit({
      advisories: [adv],
      allowlist: [],
      today: '2026-11-17',
    });
    assert.equal(r.ok, false);
    assert.match(r.failures[0], /not allowlisted: GHSA-1/);
  });

  it('passes while the allowlist entry is current, including on its last day', () => {
    for (const today of ['2026-11-17', '2027-01-01']) {
      const r = evaluateAudit({
        advisories: [adv],
        allowlist: [entry('2027-01-01')],
        today,
      });
      assert.equal(r.ok, true);
      assert.match(r.notices[0], /allowed until 2027-01-01/);
    }
  });

  it('fails once the entry has expired and the advisory is still present', () => {
    const r = evaluateAudit({
      advisories: [adv],
      allowlist: [entry('2027-01-01')],
      today: '2027-01-02',
    });
    assert.equal(r.ok, false);
    assert.match(r.failures[0], /expired 2027-01-01/);
  });

  it('only notes a stale entry whose advisory is gone, even if expired', () => {
    const r = evaluateAudit({
      advisories: [],
      allowlist: [entry('2020-01-01')],
      today: '2026-11-17',
    });
    assert.equal(r.ok, true);
    assert.match(r.notices[0], /stale allowlist entry, remove it: GHSA-1/);
  });

  it('passes with nothing to report', () => {
    assert.deepEqual(
      evaluateAudit({ advisories: [], allowlist: [], today: '2026-11-17' }),
      { ok: true, failures: [], notices: [] },
    );
  });
});
