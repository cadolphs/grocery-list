// Unit tests for the pure helpers in control.mjs. Runs under `node --test`
// (npm run test:scripts), no Jest transform involved.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkFeatureMap,
  isScreenFile,
  parseArgs,
  parseFeatureMap,
  pickFallbackBuilds,
} from './control.mjs';

describe('parseArgs', () => {
  it('splits positionals from flags', () => {
    assert.deepEqual(parseArgs(['settings', '--json']), {
      positional: ['settings'],
      flags: { json: true },
      skip: false,
    });
  });

  it('takes the next token as a flag value unless it is another flag', () => {
    const { flags, positional } = parseArgs([
      '--path',
      '/',
      '--record',
      '--contains',
      'Section Order',
    ]);
    assert.deepEqual(flags, {
      path: '/',
      record: true,
      contains: 'Section Order',
    });
    assert.deepEqual(positional, []);
  });

  it('treats a trailing flag as boolean', () => {
    assert.deepEqual(parseArgs(['--stop']).flags, { stop: true });
  });

  it('lets a later repeat of a flag win', () => {
    assert.equal(parseArgs(['--port', '1', '--port', '2']).flags.port, '2');
  });

  it('returns empty collections for no arguments', () => {
    assert.deepEqual(parseArgs([]), { positional: [], flags: {}, skip: false });
  });
});

describe('pickFallbackBuilds', () => {
  it('returns other chromium builds, newest first', () => {
    assert.deepEqual(
      pickFallbackBuilds('chromium-1200', [
        'chromium-1100',
        'ffmpeg-1011',
        'chromium-1300',
        'chromium-1200',
        'chromium_headless_shell-1300',
        'not-a-build',
      ]),
      ['chromium-1300', 'chromium-1100'],
    );
  });

  it('returns nothing when only the expected build exists', () => {
    assert.deepEqual(
      pickFallbackBuilds('chromium-1200', ['chromium-1200']),
      [],
    );
  });
});

describe('isScreenFile', () => {
  it('accepts Screen and View components', () => {
    assert.equal(isScreenFile('HomeScreen.tsx'), true);
    assert.equal(isScreenFile('StoreView.tsx'), true);
  });

  it('rejects tests and other components', () => {
    assert.equal(isScreenFile('StoreView.test.tsx'), false);
    assert.equal(isScreenFile('ItemRow.tsx'), false);
    assert.equal(isScreenFile('theme.ts'), false);
  });
});

const featureMap = [
  '# Feature map',
  '',
  'Intro text that is not a section.',
  '',
  '## Home sweep',
  'File: `src/ui/HomeScreen.tsx`',
  'Walk the house, mark what is needed.',
  '',
  '## Store',
  '',
  'File: `src/ui/StoreView.tsx`',
  '',
  '## Orphan',
  'No file line here.',
  '',
].join('\n');

describe('parseFeatureMap', () => {
  it('reads one entry per level-two heading with its File line', () => {
    const entries = parseFeatureMap(featureMap);
    assert.deepEqual(
      entries.map(({ name, file }) => ({ name, file })),
      [
        { name: 'Home sweep', file: 'src/ui/HomeScreen.tsx' },
        { name: 'Store', file: 'src/ui/StoreView.tsx' },
        { name: 'Orphan', file: null },
      ],
    );
  });

  it('keeps the trimmed body of each section', () => {
    const [home] = parseFeatureMap(featureMap);
    assert.equal(
      home.body,
      'File: `src/ui/HomeScreen.tsx`\nWalk the house, mark what is needed.',
    );
  });

  it('returns no entries for a document without sections', () => {
    assert.deepEqual(parseFeatureMap('# Only a title\n\nText.\n'), []);
  });
});

describe('checkFeatureMap', () => {
  const entries = [
    { name: 'Home sweep', file: 'src/ui/HomeScreen.tsx' },
    { name: 'Store', file: 'src/ui/StoreView.tsx' },
  ];

  it('passes when every screen is mapped to an existing file', () => {
    const problems = checkFeatureMap(
      entries,
      ['src/ui/HomeScreen.tsx', 'src/ui/StoreView.tsx'],
      () => true,
    );
    assert.deepEqual(problems, []);
  });

  it('reports entries without a File line', () => {
    const problems = checkFeatureMap(
      [{ name: 'Orphan', file: null }],
      [],
      () => true,
    );
    assert.deepEqual(problems, ['"Orphan" has no File: line']);
  });

  it('reports entries pointing at missing files', () => {
    const problems = checkFeatureMap(
      entries,
      ['src/ui/HomeScreen.tsx'],
      (file) => file === 'src/ui/HomeScreen.tsx',
    );
    assert.deepEqual(problems, [
      '"Store" points at missing src/ui/StoreView.tsx',
    ]);
  });

  it('reports screens with no feature-map entry', () => {
    const problems = checkFeatureMap(
      entries,
      ['src/ui/HomeScreen.tsx', 'src/ui/StoreView.tsx', 'src/ui/NewView.tsx'],
      () => true,
    );
    assert.deepEqual(problems, ['src/ui/NewView.tsx has no feature-map entry']);
  });
});
