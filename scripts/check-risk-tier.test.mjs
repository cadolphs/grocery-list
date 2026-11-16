import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkRiskTier,
  computeTier,
  parseDeclaredTier,
} from './check-risk-tier.mjs';

describe('computeTier', () => {
  it('is low for docs, ui, domain and scripts', () => {
    assert.equal(
      computeTier(['README.md', 'src/ui/HomeView.tsx', 'src/domain/trip.ts']),
      'low',
    );
  });

  it('is medium for adapters and dependency files', () => {
    assert.equal(computeTier(['src/adapters/firestore/x.ts']), 'medium');
    assert.equal(computeTier(['package.json']), 'medium');
    assert.equal(computeTier(['package-lock.json']), 'medium');
  });

  it('is high for rules, auth, workflows and native config', () => {
    for (const path of [
      'firestore.rules',
      'firebase.json',
      'eas.json',
      'app.json',
      'src/auth/AuthService.ts',
      '.github/workflows/ci.yml',
    ]) {
      assert.equal(computeTier(['src/ui/a.tsx', path]), 'high', path);
    }
  });

  it('takes the highest tier across all paths', () => {
    assert.equal(
      computeTier(['package.json', 'src/auth/AuthService.ts', 'README.md']),
      'high',
    );
  });

  it('does not raise the tier for test files in adapter or auth folders', () => {
    assert.equal(
      computeTier([
        'src/adapters/firestore/x.test.ts',
        'src/auth/AuthService.failure.test.ts',
      ]),
      'low',
    );
  });

  it('is low for no changes', () => {
    assert.equal(computeTier([]), 'low');
  });
});

describe('parseDeclaredTier', () => {
  it('reads the tier from a Risk line, ignoring case and trailing notes', () => {
    assert.equal(
      parseDeclaredTier('Risk: medium (new dep)\n\n## What'),
      'medium',
    );
    assert.equal(parseDeclaredTier('intro\nrisk: HIGH'), 'high');
  });

  it('rejects the unfilled template placeholder and missing lines', () => {
    assert.equal(
      parseDeclaredTier('Risk: <!-- low | medium | high (see AGENTS.md) -->'),
      null,
    );
    assert.equal(parseDeclaredTier('no risk here'), null);
    assert.equal(parseDeclaredTier(undefined), null);
  });

  it('ignores Risk text that is not at the start of a line', () => {
    assert.equal(parseDeclaredTier('The Risk: low claim is quoted'), null);
  });
});

describe('checkRiskTier', () => {
  it('passes when declared equals computed', () => {
    assert.equal(
      checkRiskTier({ body: 'Risk: medium', paths: ['package.json'] }).ok,
      true,
    );
  });

  it('passes when declared is higher than computed', () => {
    assert.equal(
      checkRiskTier({ body: 'Risk: high', paths: ['README.md'] }).ok,
      true,
    );
  });

  it('fails when declared is lower than computed, naming both', () => {
    const result = checkRiskTier({
      body: 'Risk: low',
      paths: ['src/auth/AuthService.ts'],
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /Declared Risk: low/);
    assert.match(result.message, /imply high/);
  });

  it('fails when the Risk line is missing', () => {
    const result = checkRiskTier({ body: '', paths: ['README.md'] });
    assert.equal(result.ok, false);
    assert.match(result.message, /no "Risk:/);
  });
});
