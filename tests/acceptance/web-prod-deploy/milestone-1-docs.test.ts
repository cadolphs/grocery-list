/**
 * Acceptance Tests: web-prod-deploy / docs runbook (US-04, US-03 docs portion)
 *
 * Asserts that docs/deploy.md and README.md make the deploy operable from cold.
 * Real filesystem I/O. RED on first run (files absent) -> AssertionError.
 */

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const fileExists = (rel: string): boolean => fs.existsSync(path.join(repoRoot, rel));
// Gate reads on existence: absent files -> RED (jest assertion) not BROKEN (ENOENT).
const readFile = (rel: string): string => {
  expect(fileExists(rel)).toBe(true);
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
};

describe('web-prod-deploy / docs runbook', () => {
  describe('US-04: docs/deploy.md', () => {
    const deployDoc = 'docs/deploy.md';

    test('file exists', () => {
      expect(fileExists(deployDoc)).toBe(true);
    });

    test('declares the production URL', () => {
      const body = readFile(deployDoc);
      expect(body).toContain('https://grocery-list-cad.web.app');
    });

    test('declares the deploy trigger (push to main + workflow filename)', () => {
      const body = readFile(deployDoc);
      expect(body.toLowerCase()).toContain('push to main');
      expect(body).toContain('deploy-web.yml');
    });

    test('declares the rollback command', () => {
      const body = readFile(deployDoc);
      expect(body).toContain('firebase hosting:rollback');
    });

    test('declares the manual fallback (npm run build + firebase deploy)', () => {
      const body = readFile(deployDoc);
      expect(body).toContain('firebase deploy --only hosting');
      expect(body).toContain('npm run build');
    });

    test('documents service-account secret + rotation procedure', () => {
      const body = readFile(deployDoc);
      expect(body).toContain('FIREBASE_SERVICE_ACCOUNT');
      // rotation guidance: must mention revoking/replacing/rotating the key
      expect(body).toMatch(/(rotate|revoke|replace).*key|rotation/i);
    });
  });

  describe('US-04: README links to deploy docs', () => {
    test('README contains a Deployment heading and links to docs/deploy.md', () => {
      const readme = readFile('README.md');
      expect(readme).toMatch(/^#+\s+Deployment\b/m);
      expect(readme).toMatch(/\(.*docs\/deploy\.md.*\)/);
    });
  });
});
