/**
 * Acceptance Tests: expo-web-unify migration
 *
 * Tests assert real repo state after the Vite/web -> Expo web migration:
 *   - firebase.json hosting.public = "dist"
 *   - deploy-web.yml builds via `expo export -p web` at repo root
 *   - /web directory is gone
 *   - no lingering references to /web/* in production code
 *
 * WS strategy C (Real local) -- real filesystem I/O on the actual repo.
 * Live URL + `expo export` execution validated by K1/K2 drills post-deploy.
 */

import * as fs from 'fs';
import * as path from 'path';

const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const fileExists = (relativePath: string): boolean => {
  return fs.existsSync(path.join(repoRoot, relativePath));
};

// Gate reads on existence so absent files produce jest assertions (RED), not ENOENT (BROKEN).
const readFile = (relativePath: string): string => {
  expect(fileExists(relativePath)).toBe(true);
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
};

const readJson = <T = unknown>(relativePath: string): T =>
  JSON.parse(readFile(relativePath));

const readYaml = <T = unknown>(relativePath: string): T =>
  yaml.load(readFile(relativePath));

type FirebaseHostingConfig = {
  hosting?: {
    public?: string;
    rewrites?: Array<{ source?: string; destination?: string }>;
  };
};

type FirebaseRc = {
  projects?: Record<string, string>;
};

type WorkflowStep = Record<string, unknown>;

type GhWorkflow = {
  on?: {
    workflow_run?: {
      workflows?: string[];
      branches?: string[];
    };
  };
  jobs?: Record<
    string,
    {
      if?: string;
      steps?: WorkflowStep[];
    }
  >;
};

const workflowSteps = (wf: GhWorkflow): WorkflowStep[] => {
  const job = Object.values(wf.jobs ?? {})[0];
  return job?.steps ?? [];
};

describe('expo-web-unify migration', () => {
  describe('US-01: Firebase Hosting serves the Expo web export', () => {
    test('firebase.json hosting.public is "dist" (not "web/dist")', () => {
      const cfg = readJson<FirebaseHostingConfig>('firebase.json');
      expect(cfg.hosting?.public).toBe('dist');
    });

    test('firebase.json SPA rewrite is preserved', () => {
      const cfg = readJson<FirebaseHostingConfig>('firebase.json');
      const spa = (cfg.hosting?.rewrites ?? []).find(
        (r) => r.source === '**' && r.destination === '/index.html'
      );
      expect(spa).toBeDefined();
    });

    test('.firebaserc default project is unchanged', () => {
      const rc = readJson<FirebaseRc>('.firebaserc');
      expect(rc.projects?.default).toBe('grocery-list-cad');
    });

    const workflowPath = '.github/workflows/deploy-web.yml';

    test('deploy-web.yml runs `expo export` with platform web at repo root', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const steps = workflowSteps(wf);
      const exportStep = steps.find((s) => {
        const runCmd = typeof s.run === 'string' ? (s.run as string) : '';
        return /expo\s+export/.test(runCmd) && /-p\s+web|--platform\s+web/.test(runCmd);
      });
      expect(exportStep).toBeDefined();
      // MUST NOT be scoped to the old /web directory.
      const wd = (exportStep as { 'working-directory'?: string } | undefined)?.[
        'working-directory'
      ];
      expect(wd).not.toBe('web');
    });

    test('deploy-web.yml has NO steps rooted inside /web', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const steps = workflowSteps(wf);
      for (const s of steps) {
        const wd = (s as { 'working-directory'?: string })['working-directory'];
        expect(wd).not.toBe('web');
      }
    });

    test('deploy-web.yml has NO `npm ci` or `npm run build` inside /web', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const steps = workflowSteps(wf);
      const forbidden = steps.find((s) => {
        const runCmd = typeof s.run === 'string' ? (s.run as string) : '';
        const wd = (s as { 'working-directory'?: string })['working-directory'];
        return wd === 'web' && (/npm ci/.test(runCmd) || /npm run build/.test(runCmd));
      });
      expect(forbidden).toBeUndefined();
    });

    test('deploy-web.yml still chains off CI via workflow_run on success/main', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      expect(wf.on?.workflow_run?.workflows).toContain('CI');
      expect(wf.on?.workflow_run?.branches).toContain('main');
      const deployJob = Object.values(wf.jobs ?? {})[0];
      expect(deployJob?.if).toMatch(/conclusion\s*==\s*['"]success['"]/);
    });

    test('deploy step still uses FirebaseExtended/action-hosting-deploy with service account', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const steps = workflowSteps(wf);
      const deploy = steps.find(
        (s) =>
          typeof s.uses === 'string' &&
          (s.uses as string).includes('FirebaseExtended/action-hosting-deploy')
      );
      expect(deploy).toBeDefined();
      const withBlock =
        (deploy as { with?: Record<string, string> } | undefined)?.with ?? {};
      expect(withBlock.firebaseServiceAccount).toMatch(/FIREBASE_SERVICE_ACCOUNT/);
      expect(withBlock.projectId).toBe('grocery-list-cad');
      expect(withBlock.channelId).toBe('live');
    });
  });

  // Gated until step 01-02 deletes the /web directory.
  describe.skip('US-02: /web directory is retired', () => {
    test('/web directory does not exist', () => {
      expect(fileExists('web')).toBe(false);
    });

    test('no production source file references deleted /web paths', () => {
      const productionRoots = ['.github', 'src'];
      const referenceExtensions = new Set([
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json',
        '.yml',
        '.yaml',
      ]);
      const forbiddenPatterns = [/\bweb\/src\b/, /\bweb\/package\b/, /\bweb\/dist\b/];

      const offenders: Array<{ file: string; pattern: string }> = [];

      const walk = (dir: string) => {
        const full = path.join(repoRoot, dir);
        if (!fs.existsSync(full)) return;
        const entries = fs.readdirSync(full, { withFileTypes: true });
        for (const entry of entries) {
          const relPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            walk(relPath);
          } else if (referenceExtensions.has(path.extname(entry.name))) {
            const body = fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
            for (const pat of forbiddenPatterns) {
              if (pat.test(body)) {
                offenders.push({ file: relPath, pattern: pat.source });
              }
            }
          }
        }
      };

      productionRoots.forEach(walk);

      // Also check top-level config files
      const topLevel = [
        'package.json',
        'app.json',
        'eas.json',
        'tsconfig.json',
        'firebase.json',
        '.firebaserc',
        '.gitignore',
      ];
      for (const rel of topLevel) {
        if (!fileExists(rel)) continue;
        const body = readFile(rel);
        for (const pat of forbiddenPatterns) {
          if (pat.test(body)) {
            offenders.push({ file: rel, pattern: pat.source });
          }
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});
