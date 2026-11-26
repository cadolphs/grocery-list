import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  WIDE_RUN_FILES,
  parseArgs,
  scopeMessage,
  selectMutateFiles,
  strykerArgs,
  unnamedChanges,
  unnamedMessage,
} from './mutation.mjs';

const always = () => true;

describe('selectMutateFiles', () => {
  it('keeps domain and port source files', () => {
    assert.deepEqual(
      selectMutateFiles(
        [
          'src/domain/trip.ts',
          'src/ports/trip-storage.ts',
          'src/domain/nested/rule.ts',
        ],
        always,
      ),
      [
        'src/domain/trip.ts',
        'src/ports/trip-storage.ts',
        'src/domain/nested/rule.ts',
      ],
    );
  });

  it('drops tests, declarations, other layers and non-TypeScript files', () => {
    assert.deepEqual(
      selectMutateFiles(
        [
          'src/domain/trip.test.ts',
          'src/domain/env.d.ts',
          'src/adapters/firestore/firestore-trip-storage.ts',
          'src/ui/HomeView.tsx',
          'src/domain/README.md',
          'tests/unit/domain/item-grouping.test.ts',
        ],
        always,
      ),
      [],
    );
  });

  it('lists each file once, in first-seen order', () => {
    assert.deepEqual(
      selectMutateFiles(
        ['src/domain/b.ts', 'src/domain/a.ts', 'src/domain/b.ts'],
        always,
      ),
      ['src/domain/b.ts', 'src/domain/a.ts'],
    );
  });

  it('drops files the working tree no longer has', () => {
    const exists = (path) => path !== 'src/ports/staple-storage.ts';
    assert.deepEqual(
      selectMutateFiles(
        ['src/ports/staple-storage.ts', 'src/ports/library-storage.ts'],
        exists,
      ),
      ['src/ports/library-storage.ts'],
    );
  });
});

describe('parseArgs', () => {
  it('diffs against origin/main by default', () => {
    assert.deepEqual(parseArgs([], always), { base: 'origin/main' });
  });

  it('takes one base ref, including one with a slash', () => {
    assert.deepEqual(parseArgs(['upstream/main'], always), {
      base: 'upstream/main',
    });
  });

  it('takes --all for the config scope', () => {
    assert.deepEqual(parseArgs(['--all'], always), { all: true });
  });

  it('takes explicit source files, each once', () => {
    assert.deepEqual(
      parseArgs(
        [
          'src/domain/stored-trip.ts',
          'src/ports/a.ts',
          'src/domain/stored-trip.ts',
        ],
        always,
      ),
      { paths: ['src/domain/stored-trip.ts', 'src/ports/a.ts'] },
    );
  });

  it('rejects files outside the scope, tests, and missing files', () => {
    const exists = (path) => path !== 'src/domain/gone.ts';
    const { error } = parseArgs(
      [
        'src/domain/trip.ts',
        'src/ui/HomeView.ts',
        'src/domain/trip.test.ts',
        'src/domain/gone.ts',
      ],
      exists,
    );
    assert.match(
      error,
      /src\/ui\/HomeView\.ts, src\/domain\/trip\.test\.ts, src\/domain\/gone\.ts\n/,
    );
    assert.doesNotMatch(error, /src\/domain\/trip\.ts,/);
  });

  it('accepts a leading ./', () => {
    assert.deepEqual(parseArgs(['./src/domain/trip.ts'], always), {
      paths: ['src/domain/trip.ts'],
    });
  });

  it('rejects a ref mixed with files', () => {
    assert.ok(parseArgs(['main', 'src/domain/trip.ts'], always).error);
  });

  it('rejects unknown flags and more than one ref', () => {
    assert.ok(parseArgs(['--fast'], always).error);
    assert.ok(parseArgs(['main', 'dev'], always).error);
  });
});

describe('scopeMessage', () => {
  const files = (n) =>
    Array.from({ length: n }, (_, i) => `src/domain/f${i}.ts`);

  it('lists the files', () => {
    assert.equal(
      scopeMessage(files(2), { fromDiff: true }),
      'Mutating 2 file(s): src/domain/f0.ts, src/domain/f1.ts',
    );
  });

  it('suggests naming files when a diff selects a wide run', () => {
    assert.match(
      scopeMessage(files(WIDE_RUN_FILES + 1), { fromDiff: true }),
      /wide run.*npm run mutation -- <file>/s,
    );
    assert.doesNotMatch(
      scopeMessage(files(WIDE_RUN_FILES), { fromDiff: true }),
      /wide run/,
    );
  });

  it('does not warn when the files were named', () => {
    assert.doesNotMatch(
      scopeMessage(files(WIDE_RUN_FILES + 1), { fromDiff: false }),
      /wide run/,
    );
  });

  it('names the full scope for --all', () => {
    assert.match(scopeMessage('all', { fromDiff: false }), /full/);
  });
});

describe('strykerArgs', () => {
  it('mutates only the given files', () => {
    assert.deepEqual(strykerArgs(['src/domain/a.ts', 'src/ports/b.ts']), [
      'stryker',
      'run',
      '--mutate',
      'src/domain/a.ts,src/ports/b.ts',
    ]);
  });

  it('falls back to the config scope when asked for everything', () => {
    assert.deepEqual(strykerArgs('all'), ['stryker', 'run']);
  });
});

describe('unnamedChanges', () => {
  it('lists changed files that were not named', () => {
    assert.deepEqual(
      unnamedChanges(
        ['src/domain/a.ts', 'src/domain/b.ts', 'src/ports/c.ts'],
        ['src/domain/b.ts'],
      ),
      ['src/domain/a.ts', 'src/ports/c.ts'],
    );
  });

  it('says nothing when every changed file was named', () => {
    assert.equal(unnamedMessage([]), undefined);
    assert.match(
      unnamedMessage(['src/domain/a.ts']),
      /Not mutating 1 other changed file\(s\): src\/domain\/a\.ts/,
    );
  });
});
