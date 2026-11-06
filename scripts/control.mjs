#!/usr/bin/env node
// control-grocery-list: one entry point agents use to run and check the real
// app. Local Expo web first; the deployed site only for `health`.
// See .claude/skills/control-grocery-list/SKILL.md for usage.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const stateDir = path.join(root, '.control');
const artifactsDir = path.join(stateDir, 'artifacts');
const featureMapPath = path.join(root, 'docs', 'feature-map.md');
const screensDir = path.join(root, 'src', 'ui');

const DEFAULT_PORT = 8081;
const PROD_ORIGIN = 'https://grocery-list-cad.web.app';

// ---------- arg parsing (pure) ----------

export const parseArgs = (argv) =>
  argv.reduce(
    (acc, token, index, all) => {
      if (acc.skip) return { ...acc, skip: false };
      if (!token.startsWith('--')) {
        return { ...acc, positional: [...acc.positional, token] };
      }
      const key = token.slice(2);
      const next = all[index + 1];
      const isValue = next !== undefined && !next.startsWith('--');
      return {
        ...acc,
        flags: { ...acc.flags, [key]: isValue ? next : true },
        skip: isValue,
      };
    },
    { positional: [], flags: {}, skip: false },
  );

const localOrigin = (flags) =>
  flags.origin ?? `http://localhost:${flags.port ?? DEFAULT_PORT}`;

const sessionFile = (origin) =>
  path.join(
    stateDir,
    `session-${createHash('sha1').update(origin).digest('hex').slice(0, 10)}.json`,
  );

// ---------- output ----------

const report = (flags, result) => {
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of result.lines ?? []) console.log(line);
    if (result.error) console.error(`✗ ${result.error}`);
  }
  return result.ok ? 0 : 1;
};

// ---------- http ----------

const isUp = async (origin) => {
  try {
    const res = await fetch(origin, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (check, timeoutMs, intervalMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await sleep(intervalMs);
  }
  return false;
};

// ---------- playwright ----------

const loadPlaywright = async () => {
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'playwright not installed. Fix: npm ci && npx playwright install chromium',
    );
  }
};

// Playwright pins one Chromium build per release. Containers often ship a
// different build than package-lock.json expects, so fall back to another
// installed build (newest first) instead of failing. CONTROL_CHROMIUM_PATH
// overrides the search.
const CHROMIUM_BINARIES = new Set([
  'chrome',
  'chrome.exe',
  'Chromium',
  'Google Chrome for Testing',
]);

export const pickFallbackBuilds = (expectedDir, siblingDirs) =>
  siblingDirs
    .map((name) => ({
      name,
      build: Number(name.match(/^chromium-(\d+)$/)?.[1]),
    }))
    .filter(({ name, build }) => Number.isFinite(build) && name !== expectedDir)
    .sort((a, b) => b.build - a.build)
    .map(({ name }) => name);

const isDirectory = (file) => {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false;
  }
};

const findChromiumBinary = (dir, depth = 5) => {
  if (depth < 0 || !isDirectory(dir)) return null;
  const entries = readdirSync(dir).map((name) => path.join(dir, name));
  const binary = entries.find(
    (file) => CHROMIUM_BINARIES.has(path.basename(file)) && !isDirectory(file),
  );
  return (
    binary ??
    entries.reduce(
      (found, file) => found ?? findChromiumBinary(file, depth - 1),
      null,
    )
  );
};

// Returns {} for the build Playwright expects, { executablePath, note } for an
// override or fallback, or { error } when no Chromium can be found.
const resolveChromium = (chromium) => {
  const override = process.env.CONTROL_CHROMIUM_PATH;
  if (override) {
    return existsSync(override)
      ? { executablePath: override, note: 'CONTROL_CHROMIUM_PATH' }
      : { error: `CONTROL_CHROMIUM_PATH points at missing ${override}` };
  }
  const expected = chromium.executablePath();
  if (existsSync(expected)) return {};
  const [, browsersDir, expectedDir] =
    expected.match(/^(.*)[\\/](chromium-\d+)[\\/]/) ?? [];
  const fallback = (
    browsersDir && isDirectory(browsersDir)
      ? pickFallbackBuilds(expectedDir, readdirSync(browsersDir))
      : []
  )
    .map((name) => ({
      name,
      executablePath: findChromiumBinary(path.join(browsersDir, name)),
    }))
    .find(({ executablePath }) => executablePath);
  return fallback
    ? {
        executablePath: fallback.executablePath,
        note: `${fallback.name} (Playwright expects ${expectedDir})`,
      }
    : {
        error:
          'no Chromium found. Fix: npx playwright install chromium, or set CONTROL_CHROMIUM_PATH',
      };
};

// Expo web keeps Firestore's listen channel open once signed in, so
// 'networkidle' never fires there. Settle on the app having rendered, then
// give in-flight requests a bounded grace period.
const settle = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#root > *').first().waitFor({ timeout: 30_000 });
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => {});
};

const withPage = async (flags, origin, fn) => {
  const { chromium } = await loadPlaywright();
  mkdirSync(artifactsDir, { recursive: true });
  const resolved = resolveChromium(chromium);
  if (resolved.error) throw new Error(resolved.error);
  if (resolved.note && !flags.json) {
    console.error(`chromium: using ${resolved.note}`);
  }
  const browser = await chromium.launch({
    headless: !flags.headed,
    ...(resolved.executablePath
      ? { executablePath: resolved.executablePath }
      : {}),
  });
  const storage = sessionFile(origin);
  const context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    ...(existsSync(storage) && !flags.anonymous
      ? { storageState: storage }
      : {}),
    ...(flags.record ? { recordVideo: { dir: artifactsDir } } : {}),
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  try {
    const value = await fn({ page, context, origin, consoleErrors });
    const video = page.video();
    await context.close();
    const videoPath = video ? await video.path() : null;
    return { value, videoPath, consoleErrors };
  } finally {
    await browser.close();
  }
};

// ---------- feature map (pure parsing + fs scan) ----------

// A screen is a top-level component file in src/ui that a user can land on.
export const isScreenFile = (file) =>
  /(Screen|View)\.tsx$/.test(file) && !file.endsWith('.test.tsx');

export const parseFeatureMap = (markdown) =>
  [...markdown.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map(
    ([, name, body]) => ({
      name: name.trim(),
      file: body.match(/^File: `([^`]+)`/m)?.[1] ?? null,
      body: body.trim(),
    }),
  );

export const checkFeatureMap = (entries, screenFiles, fileExists) => {
  const mapped = new Set(entries.map((e) => e.file).filter(Boolean));
  return [
    ...entries
      .filter((e) => !e.file)
      .map((e) => `"${e.name}" has no File: line`),
    ...entries
      .filter((e) => e.file && !fileExists(e.file))
      .map((e) => `"${e.name}" points at missing ${e.file}`),
    ...screenFiles
      .filter((f) => !mapped.has(f))
      .map((f) => `${f} has no feature-map entry`),
  ];
};

const listScreenFiles = () => [
  'App.tsx',
  ...readdirSync(screensDir)
    .filter(isScreenFile)
    .map((f) => `src/ui/${f}`),
];

// ---------- commands ----------

const doctor = async (flags) => {
  const origin = localOrigin(flags);
  const major = Number(process.versions.node.split('.')[0]);
  const hook = path.join(root, '.git', 'hooks', 'pre-commit');
  let chromiumState = { error: 'playwright not installed' };
  try {
    const { chromium } = await import('playwright');
    chromiumState = resolveChromium(chromium);
  } catch {
    /* keep the error state */
  }
  const checks = [
    { name: 'node >= 20', ok: major >= 20, fix: 'install Node 20+' },
    {
      name: 'node_modules installed',
      ok: existsSync(path.join(root, 'node_modules', 'expo')),
      fix: 'npm ci',
    },
    {
      name: 'git hooks installed',
      ok:
        existsSync(hook) && readFileSync(hook, 'utf8').includes('npm run lint'),
      fix: 'npx simple-git-hooks',
    },
    {
      name: `playwright chromium${chromiumState.note ? ` (using ${chromiumState.note})` : ''}`,
      ok: !chromiumState.error,
      fix: 'npx playwright install chromium (or set CONTROL_CHROMIUM_PATH)',
    },
    {
      name: `dev server at ${origin}`,
      ok: await isUp(origin),
      fix: 'npm run control -- dev',
      optional: true,
    },
    {
      name: 'session for dev origin',
      ok: existsSync(sessionFile(origin)),
      fix: 'npm run control -- login (needs CONTROL_EMAIL / CONTROL_PASSWORD)',
      optional: true,
    },
  ];
  const ok = checks.every((c) => c.ok || c.optional);
  return report(flags, {
    ok,
    checks,
    lines: checks.map(
      (c) =>
        `${c.ok ? '✓' : c.optional ? '·' : '✗'} ${c.name}${c.ok ? '' : `  → ${c.fix}`}`,
    ),
  });
};

const dev = async (flags) => {
  const port = Number(flags.port ?? DEFAULT_PORT);
  const origin = `http://localhost:${port}`;
  if (flags.stop) {
    const pidFile = path.join(stateDir, 'dev.pid');
    if (!existsSync(pidFile)) {
      return report(flags, {
        ok: true,
        lines: ['no dev server started by control'],
      });
    }
    const pid = Number(readFileSync(pidFile, 'utf8'));
    try {
      process.kill(-pid);
    } catch {
      /* already gone */
    }
    return report(flags, {
      ok: true,
      lines: [`stopped dev server (pid ${pid})`],
    });
  }
  if (await isUp(origin)) {
    return report(flags, { ok: true, origin, reused: true, lines: [origin] });
  }
  mkdirSync(stateDir, { recursive: true });
  const logPath = path.join(stateDir, 'dev.log');
  const out = openSync(logPath, 'a');
  const child = spawn(
    'npx',
    ['expo', 'start', '--web', '--port', String(port)],
    {
      cwd: root,
      detached: true,
      stdio: ['ignore', out, out],
      env: { ...process.env, BROWSER: 'none', CI: '1' },
    },
  );
  child.unref();
  writeFileSync(path.join(stateDir, 'dev.pid'), String(child.pid));
  const up = await waitFor(() => isUp(origin), 180_000);
  return report(flags, {
    ok: up,
    origin,
    pid: child.pid,
    log: logPath,
    lines: up ? [origin] : [],
    error: up ? undefined : `dev server did not come up; see ${logPath}`,
  });
};

const login = async (flags) => {
  const origin = localOrigin(flags);
  const email = process.env.CONTROL_EMAIL;
  const password = process.env.CONTROL_PASSWORD;
  if (!email || !password) {
    return report(flags, {
      ok: false,
      error:
        'Set CONTROL_EMAIL and CONTROL_PASSWORD (dedicated test account only, see ADR-011).',
    });
  }
  const { value } = await withPage(
    { ...flags, anonymous: true },
    origin,
    async ({ page, context }) => {
      await page.goto(origin);
      await page.getByPlaceholder('Email').fill(email);
      await page.getByPlaceholder('Password').fill(password);
      await page.getByText(/^sign in$/i).click();
      await page.getByTestId('safe-area').waitFor({ timeout: 30_000 });
      await context.storageState({
        path: sessionFile(origin),
        indexedDB: true,
      });
      return sessionFile(origin);
    },
  );
  return report(flags, {
    ok: true,
    session: value,
    lines: [`session saved for ${origin}`],
  });
};

const browse = async (flags) => {
  const origin = localOrigin(flags);
  const target = new URL(flags.path ?? '/', origin).href;
  const { value, videoPath, consoleErrors } = await withPage(
    flags,
    origin,
    async ({ page }) => {
      await page.goto(target);
      await settle(page);
      const clicks = [flags.click].flat().filter((c) => typeof c === 'string');
      for (const testId of clicks) {
        await page.getByTestId(testId).click();
        await settle(page);
      }
      const text = await page.locator('body').innerText();
      const shot = path.join(
        artifactsDir,
        typeof flags.screenshot === 'string' ? flags.screenshot : 'browse.png',
      );
      await page.screenshot({ path: shot, fullPage: true });
      return { text, shot };
    },
  );
  const contains = typeof flags.contains === 'string' ? flags.contains : null;
  const ok = contains === null || value.text.includes(contains);
  return report(flags, {
    ok,
    url: target,
    screenshot: value.shot,
    video: videoPath,
    consoleErrors,
    lines: [
      `url ${target}`,
      `screenshot ${value.shot}`,
      ...(videoPath ? [`video ${videoPath}`] : []),
      ...(consoleErrors.length
        ? [`console errors: ${consoleErrors.length}`]
        : []),
      ...(contains ? [`${ok ? '✓' : '✗'} contains "${contains}"`] : []),
    ],
    error: ok ? undefined : `page text does not contain "${contains}"`,
  });
};

// The app has no HTTP API of its own (data lives in Firestore), so `execute`
// drives the real UI: a fixture module default-exports
// async ({ page, origin }) => result, and throws to fail.
const execute = async (flags) => {
  if (typeof flags['code-file'] !== 'string') {
    return report(flags, {
      ok: false,
      error: 'execute needs --code-file <file.mjs>',
    });
  }
  const origin = localOrigin(flags);
  const fixture = await import(
    pathToFileURL(path.resolve(process.cwd(), flags['code-file'])).href
  );
  try {
    const { value, videoPath, consoleErrors } = await withPage(
      flags,
      origin,
      async (ctx) => {
        await ctx.page.goto(origin);
        await settle(ctx.page);
        return fixture.default(ctx);
      },
    );
    return report(flags, {
      ok: true,
      result: value ?? null,
      video: videoPath,
      consoleErrors,
      lines: [
        `✓ ${flags['code-file']}`,
        ...(value !== undefined ? [JSON.stringify(value)] : []),
        ...(videoPath ? [`video ${videoPath}`] : []),
      ],
    });
  } catch (err) {
    return report(flags, {
      ok: false,
      error: `${flags['code-file']}: ${err.message}`,
    });
  }
};

const map = async (flags, [feature]) => {
  const entries = parseFeatureMap(readFileSync(featureMapPath, 'utf8'));
  if (flags.check) {
    const problems = checkFeatureMap(entries, listScreenFiles(), (f) =>
      existsSync(path.join(root, f)),
    );
    return report(flags, {
      ok: problems.length === 0,
      problems,
      lines: problems.length
        ? problems.map((p) => `✗ ${p}`)
        : [`✓ feature map covers ${entries.length} screens`],
      error: problems.length
        ? 'docs/feature-map.md drifted from src/ui'
        : undefined,
    });
  }
  const chosen = feature
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(feature.toLowerCase()),
      )
    : entries;
  return report(flags, {
    ok: chosen.length > 0,
    entries: chosen,
    lines: feature
      ? chosen.map((e) => `## ${e.name}\n${e.body}\n`)
      : chosen.map((e) => `${e.name.padEnd(28)} ${e.file}`),
    error: chosen.length ? undefined : `no feature matching "${feature}"`,
  });
};

const buildWeb = async (flags) => {
  const exported = spawnSync('npx', ['expo', 'export', '-p', 'web'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (exported.status !== 0) {
    return report(flags, { ok: false, error: 'expo export failed' });
  }
  const sha =
    flags.sha ??
    spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).stdout.trim();
  writeFileSync(
    path.join(root, 'dist', 'version.json'),
    JSON.stringify({ sha }) + '\n',
  );
  return report(flags, { ok: true, sha, lines: [`dist/ built for ${sha}`] });
};

const health = async (flags) => {
  const origin = flags.origin ?? PROD_ORIGIN;
  const expected = flags.sha ?? process.env.SHIP_PR_SHA;
  const waitMs = Number(flags.wait ?? 0) * 1000;
  const fetchSha = async () => {
    try {
      const res = await fetch(new URL('/version.json', origin), {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const body = await res.json();
      return typeof body.sha === 'string' ? body.sha : null;
    } catch {
      return null;
    }
  };
  const matches = (sha) => Boolean(sha && expected && sha.startsWith(expected));
  let running = await fetchSha();
  if (expected && waitMs > 0 && !matches(running)) {
    await waitFor(
      async () => matches((running = await fetchSha())),
      waitMs,
      15_000,
    );
  }
  const up = await isUp(origin);
  const ok = up && (expected ? matches(running) : true);
  return report(flags, {
    ok,
    origin,
    up,
    running,
    expected: expected ?? null,
    lines: [
      `${up ? '✓' : '✗'} ${origin} responds`,
      `running ${running ?? 'unknown (no /version.json)'}`,
      ...(expected
        ? [`${matches(running) ? '✓' : '✗'} expected ${expected}`]
        : []),
    ],
    error: ok
      ? undefined
      : expected
        ? `running version is not ${expected}`
        : `${origin} is down`,
  });
};

const commands = {
  doctor: {
    run: doctor,
    help: 'doctor                       environment check (read-only)',
  },
  dev: {
    run: dev,
    help: 'dev [--port 8081] [--stop]   start or reuse Expo web dev server',
  },
  login: {
    run: login,
    help: 'login                        sign in test account (CONTROL_EMAIL/PASSWORD), save session',
  },
  browse: {
    run: browse,
    help: 'browse --path / [--click <testID>] [--contains <text>] [--record] [--anonymous]',
  },
  execute: {
    run: execute,
    help: 'execute --code-file <fixture.mjs>   drive the UI with a fixture',
  },
  map: {
    run: map,
    help: 'map [<feature>] | map --check   feature map notes / drift check',
  },
  'build-web': {
    run: buildWeb,
    help: 'build-web [--sha <sha>]      expo export + dist/version.json',
  },
  health: {
    run: health,
    help: 'health [--origin <url>] --sha <sha> [--wait <sec>]  running version check',
  },
};

const usage = () =>
  [
    'Usage: npm run control -- <command> [--json]',
    '',
    ...Object.values(commands).map((c) => `  ${c.help}`),
  ].join('\n');

const main = async (argv) => {
  const [name, ...rest] = argv;
  const command = commands[name];
  if (!command) {
    console.log(usage());
    return name ? 1 : 0;
  }
  const { positional, flags } = parseArgs(rest);
  try {
    return await command.run(flags, positional);
  } catch (err) {
    return report(flags, { ok: false, error: err.message });
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
