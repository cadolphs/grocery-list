import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const RULES_PATH = resolve(__dirname, '../../firestore.rules');

describe('firestore.rules security invariants', () => {
  it('rules file exists at repo root', () => {
    expect(existsSync(RULES_PATH)).toBe(true);
  });

  describe('rules file content', () => {
    const rules = existsSync(RULES_PATH) ? readFileSync(RULES_PATH, 'utf8') : '';

    it('declares rules_version 2', () => {
      expect(rules).toMatch(/rules_version\s*=\s*['"]2['"]/);
    });

    it('matches user-scoped document path /users/{userId}', () => {
      expect(rules).toMatch(/match\s+\/users\/\{[a-zA-Z_]+\}/);
    });

    it('enforces authenticated uid equals owning userId', () => {
      expect(rules).toMatch(/request\.auth\s*!=\s*null/);
      expect(rules).toMatch(/request\.auth\.uid\s*==\s*[a-zA-Z_]+/);
    });

    it('denies by default for non-matching paths', () => {
      expect(rules).toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+false/);
    });

    it('does not contain a blanket allow true', () => {
      expect(rules).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/);
      expect(rules).not.toMatch(/allow\s+if\s+true/);
    });
  });
});
