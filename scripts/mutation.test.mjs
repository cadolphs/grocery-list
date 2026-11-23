import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectMutateFiles, strykerArgs } from './mutation.mjs';

describe('selectMutateFiles', () => {
  it('keeps domain and port source files', () => {
    assert.deepEqual(
      selectMutateFiles([
        'src/domain/trip.ts',
        'src/ports/trip-storage.ts',
        'src/domain/nested/rule.ts',
      ]),
      [
        'src/domain/trip.ts',
        'src/ports/trip-storage.ts',
        'src/domain/nested/rule.ts',
      ],
    );
  });

  it('drops tests, declarations, other layers and non-TypeScript files', () => {
    assert.deepEqual(
      selectMutateFiles([
        'src/domain/trip.test.ts',
        'src/domain/env.d.ts',
        'src/adapters/firestore/firestore-trip-storage.ts',
        'src/ui/HomeView.tsx',
        'src/domain/README.md',
        'tests/unit/domain/item-grouping.test.ts',
      ]),
      [],
    );
  });

  it('lists each file once, in first-seen order', () => {
    assert.deepEqual(
      selectMutateFiles([
        'src/domain/b.ts',
        'src/domain/a.ts',
        'src/domain/b.ts',
      ]),
      ['src/domain/b.ts', 'src/domain/a.ts'],
    );
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
