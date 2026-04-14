/**
 * Acceptance Tests: web-prod-deploy walking skeleton
 *
 * Tests assert real repo state. WS Strategy C (Real local) -- filesystem I/O on
 * the actual repo config files. No InMemory doubles, no Firebase CLI invocation,
 * no live deploy.
 *
 * Driving ports (per DISTILL DWD-02):
 * - Filesystem reads of: firebase.json, .firebaserc, .github/workflows/*.yml
 * - JSON parser (native)
 * - YAML parser (js-yaml, available via node_modules)
 *
 * Story trace:
 * - US-01: firebase.json + .firebaserc (scenarios 1-3)
 * - US-02: deploy-web.yml (scenarios 4-10)
 * - US-03: secret reference (scenario 7, partial -- full secret value untestable)
 *
 * RED-on-first-run: scenarios fail with `expect()` assertion failures (RED) when
 * config files are absent. No production modules imported -- no ImportError risk.
 */

import * as fs from 'fs';
import * as path from 'path';

const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const fileExists = (relativePath: string): boolean => {
  return fs.existsSync(path.join(repoRoot, relativePath));
};

// Gate every read on existence so absent files produce a clean RED (jest
// assertion failure) instead of a BROKEN classification (Node ENOENT throw).
const readFile = (relativePath: string): string => {
  expect(fileExists(relativePath)).toBe(true);
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
};

const readJson = <T = unknown>(relativePath: string): T => {
  return JSON.parse(readFile(relativePath));
};

const readYaml = <T = unknown>(relativePath: string): T => {
  return yaml.load(readFile(relativePath));
};

// Minimal type shapes for parsed config -- defensive narrowing inside tests.
type FirebaseHostingConfig = {
  hosting?: {
    public?: string;
    rewrites?: Array<{ source?: string; destination?: string }>;
  };
};

type FirebaseRc = {
  projects?: Record<string, string>;
};

type GhWorkflow = {
  name?: string;
  on?: {
    workflow_run?: {
      workflows?: string[];
      branches?: string[];
      types?: string[];
    };
    push?: { branches?: string[] };
    pull_request?: { branches?: string[] };
  };
  concurrency?: {
    group?: string;
    'cancel-in-progress'?: boolean;
  };
  jobs?: Record<
    string,
    {
      if?: string;
      'runs-on'?: string;
      steps?: Array<Record<string, unknown>>;
    }
  >;
};

describe('web-prod-deploy walking skeleton', () => {
  describe('US-01: hosting config', () => {
    test('firebase.json declares public dir = "web/dist"', () => {
      expect(fileExists('firebase.json')).toBe(true);
      const cfg = readJson<FirebaseHostingConfig>('firebase.json');
      expect(cfg.hosting?.public).toBe('web/dist');
    });

    test('firebase.json declares SPA rewrite ** -> /index.html', () => {
      const cfg = readJson<FirebaseHostingConfig>('firebase.json');
      const rewrites = cfg.hosting?.rewrites ?? [];
      const spaRule = rewrites.find(
        (r) => r.source === '**' && r.destination === '/index.html'
      );
      expect(spaRule).toBeDefined();
    });

    test('.firebaserc maps default project to "grocery-list-cad"', () => {
      expect(fileExists('.firebaserc')).toBe(true);
      const rc = readJson<FirebaseRc>('.firebaserc');
      expect(rc.projects?.default).toBe('grocery-list-cad');
    });
  });

  describe('US-02: deploy-web.yml workflow', () => {
    const workflowPath = '.github/workflows/deploy-web.yml';

    test('chains off CI workflow via workflow_run', () => {
      expect(fileExists(workflowPath)).toBe(true);
      const wf = readYaml<GhWorkflow>(workflowPath);
      const workflows = wf.on?.workflow_run?.workflows ?? [];
      expect(workflows).toContain('CI');
    });

    test('only runs after CI succeeds on main', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const branches = wf.on?.workflow_run?.branches ?? [];
      expect(branches).toContain('main');

      const deployJob = Object.values(wf.jobs ?? {})[0];
      expect(deployJob?.if).toMatch(/conclusion\s*==\s*['"]success['"]/);
    });

    test('checkout step pins ref to workflow_run.head_sha', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const job = Object.values(wf.jobs ?? {})[0];
      const steps = job?.steps ?? [];
      const checkout = steps.find(
        (s) => typeof s.uses === 'string' && (s.uses as string).startsWith('actions/checkout@')
      );
      expect(checkout).toBeDefined();
      const withBlock = (checkout as { with?: { ref?: string } } | undefined)?.with;
      expect(withBlock?.ref).toMatch(/workflow_run\.head_sha/);
    });

    test('deploy step uses FIREBASE_SERVICE_ACCOUNT secret + project + channel "live"', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const job = Object.values(wf.jobs ?? {})[0];
      const steps = job?.steps ?? [];
      const deployStep = steps.find(
        (s) =>
          typeof s.uses === 'string' &&
          (s.uses as string).includes('FirebaseExtended/action-hosting-deploy')
      );
      expect(deployStep).toBeDefined();
      const withBlock = (deployStep as { with?: Record<string, string> } | undefined)?.with ?? {};
      expect(withBlock.firebaseServiceAccount).toMatch(/FIREBASE_SERVICE_ACCOUNT/);
      expect(withBlock.projectId).toBe('grocery-list-cad');
      expect(withBlock.channelId).toBe('live');
    });

    test('builds the web bundle (npm ci + npm run build in /web) before deploying', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      const job = Object.values(wf.jobs ?? {})[0];
      const steps = job?.steps ?? [];

      const findIdx = (predicate: (s: Record<string, unknown>) => boolean) =>
        steps.findIndex((s) => predicate(s));

      const ciIdx = findIdx(
        (s) =>
          typeof s.run === 'string' &&
          (s.run as string).includes('npm ci') &&
          (s as { 'working-directory'?: string })['working-directory'] === 'web'
      );
      const buildIdx = findIdx(
        (s) =>
          typeof s.run === 'string' &&
          (s.run as string).includes('npm run build') &&
          (s as { 'working-directory'?: string })['working-directory'] === 'web'
      );
      const deployIdx = findIdx(
        (s) =>
          typeof s.uses === 'string' &&
          (s.uses as string).includes('FirebaseExtended/action-hosting-deploy')
      );

      expect(ciIdx).toBeGreaterThanOrEqual(0);
      expect(buildIdx).toBeGreaterThanOrEqual(0);
      expect(deployIdx).toBeGreaterThanOrEqual(0);
      expect(ciIdx).toBeLessThan(deployIdx);
      expect(buildIdx).toBeLessThan(deployIdx);
    });

    test('concurrency group "deploy-web" with cancel-in-progress = false', () => {
      const wf = readYaml<GhWorkflow>(workflowPath);
      expect(wf.concurrency?.group).toBe('deploy-web');
      expect(wf.concurrency?.['cancel-in-progress']).toBe(false);
    });
  });

  describe('US-02 invariant: ci.yml is untouched', () => {
    test('ci.yml still has exactly one job ("commit-stage") and triggers on push to main + PR to main', () => {
      const ci = readYaml<GhWorkflow>('.github/workflows/ci.yml');
      expect(Object.keys(ci.jobs ?? {})).toEqual(['commit-stage']);
      expect(ci.on?.push?.branches).toContain('main');
      expect(ci.on?.pull_request?.branches).toContain('main');
    });
  });
});
