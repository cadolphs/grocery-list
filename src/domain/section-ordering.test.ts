// Regression tests for section-ordering pure functions
// Locks behavior of sortByCustomOrder and appendNewSections to close test-coverage gap
// (root cause B in fix-section-order-reactive RCA). Pure unit tests, no mocks.

import { TripItem } from './types';
import { AisleGroup, SectionGroup } from './item-grouping';
import { appendNewSections, sortByCustomOrder } from './section-ordering';

const makeAisleGroup = (
  section: string,
  aisleNumber: number | null,
): AisleGroup => ({
  section,
  aisleNumber,
  items: [] as TripItem[],
  totalCount: 0,
  checkedCount: 0,
});

const makeSectionGroup = (section: string): SectionGroup => ({
  section,
  items: [] as TripItem[],
  totalCount: 0,
  checkedCount: 0,
});

describe('sortByCustomOrder', () => {
  test('returns input groups unchanged when sectionOrder is null', () => {
    const dairy = makeAisleGroup('Dairy', 5);
    const produce = makeAisleGroup('Produce', 3);
    const groups = [dairy, produce];

    const result = sortByCustomOrder(groups, null);

    expect(result).toEqual([dairy, produce]);
  });

  test('returns input groups unchanged when sectionOrder is empty', () => {
    const dairy = makeAisleGroup('Dairy', 5);
    const produce = makeAisleGroup('Produce', 3);
    const groups = [dairy, produce];

    const result = sortByCustomOrder(groups, []);

    expect(result).toEqual([dairy, produce]);
  });

  test('reorders groups to match the custom sectionOrder', () => {
    const dairy = makeAisleGroup('Dairy', 5);
    const produce = makeAisleGroup('Produce', 3);
    const bakery = makeAisleGroup('Bakery', 1);
    const groups = [dairy, produce, bakery];

    const result = sortByCustomOrder(groups, ['Produce::3', 'Bakery::1']);

    expect(result.map((g) => g.section)).toEqual(['Produce', 'Bakery', 'Dairy']);
  });

  test('appends groups absent from sectionOrder after ordered ones, preserving input order', () => {
    const dairy = makeAisleGroup('Dairy', 5);
    const produce = makeAisleGroup('Produce', 3);
    const bakery = makeAisleGroup('Bakery', 1);
    const meat = makeAisleGroup('Meat', 7);
    const groups = [dairy, produce, bakery, meat];

    const result = sortByCustomOrder(groups, ['Bakery::1', 'Produce::3']);

    expect(result.map((g) => g.section)).toEqual([
      'Bakery',
      'Produce',
      'Dairy',
      'Meat',
    ]);
  });

  test('preserves input order when no group keys appear in sectionOrder', () => {
    const a = makeAisleGroup('A', 1);
    const b = makeAisleGroup('B', 2);
    const c = makeAisleGroup('C', 3);
    const groups = [a, b, c];

    const result = sortByCustomOrder(groups, ['X::1']);

    expect(result.map((g) => g.section)).toEqual(['A', 'B', 'C']);
  });

  test('does not mutate the input groups array', () => {
    const dairy = makeAisleGroup('Dairy', 5);
    const produce = makeAisleGroup('Produce', 3);
    const groups = [dairy, produce];
    const snapshot = [...groups];

    sortByCustomOrder(groups, ['Produce::3']);

    expect(groups).toEqual(snapshot);
  });

  test('treats null aisleNumber as part of the group key', () => {
    const seasonal = makeAisleGroup('Seasonal', null);
    const dairy = makeAisleGroup('Dairy', 5);
    const groups = [dairy, seasonal];

    const result = sortByCustomOrder(groups, ['Seasonal::null', 'Dairy::5']);

    expect(result.map((g) => g.section)).toEqual(['Seasonal', 'Dairy']);
  });

  describe('SectionGroup overload (section-keyed)', () => {
    test('sorts SectionGroups alphabetically by section name when sectionOrder is null', () => {
      const produce = makeSectionGroup('Produce');
      const bakery = makeSectionGroup('Bakery');
      const innerAisles = makeSectionGroup('Inner Aisles');
      const groups = [produce, innerAisles, bakery];

      const result = sortByCustomOrder(groups, null);

      expect(result.map((g) => g.section)).toEqual([
        'Bakery',
        'Inner Aisles',
        'Produce',
      ]);
    });

    test('sorts SectionGroups alphabetically by section name when sectionOrder is empty', () => {
      const deli = makeSectionGroup('Deli');
      const bakery = makeSectionGroup('Bakery');
      const groups = [deli, bakery];

      const result = sortByCustomOrder(groups, []);

      expect(result.map((g) => g.section)).toEqual(['Bakery', 'Deli']);
    });

    test('reorders SectionGroups to match the custom sectionOrder when provided', () => {
      const dairy = makeSectionGroup('Dairy');
      const produce = makeSectionGroup('Produce');
      const bakery = makeSectionGroup('Bakery');
      const groups = [dairy, produce, bakery];

      const result = sortByCustomOrder(groups, ['Produce', 'Bakery']);

      expect(result.map((g) => g.section)).toEqual([
        'Produce',
        'Bakery',
        'Dairy',
      ]);
    });

    test('does not mutate input when sorting alphabetically', () => {
      const produce = makeSectionGroup('Produce');
      const bakery = makeSectionGroup('Bakery');
      const groups = [produce, bakery];
      const snapshot = [...groups];

      sortByCustomOrder(groups, null);

      expect(groups).toEqual(snapshot);
    });
  });
});

describe('appendNewSections', () => {
  test('returns currentOrder unchanged when knownSectionKeys are all already present', () => {
    const result = appendNewSections(['a', 'b'], ['a', 'b']);

    expect(result).toEqual(['a', 'b']);
  });

  test('appends only unseen keys, preserving input order of newcomers', () => {
    const result = appendNewSections(['a'], ['a', 'b', 'c']);

    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('preserves the existing currentOrder ordering when appending', () => {
    const result = appendNewSections(['z', 'y', 'x'], ['y', 'new1', 'new2']);

    expect(result).toEqual(['z', 'y', 'x', 'new1', 'new2']);
  });

  test('returns the same reference when nothing new is appended (idempotent no-op)', () => {
    const currentOrder = ['a', 'b'];

    const result = appendNewSections(currentOrder, ['a']);

    expect(result).toBe(currentOrder);
  });

  test('handles empty currentOrder by emitting knownSectionKeys in input order', () => {
    const result = appendNewSections([], ['b', 'a', 'c']);

    expect(result).toEqual(['b', 'a', 'c']);
  });

  test('handles empty knownSectionKeys by returning currentOrder', () => {
    const currentOrder = ['a', 'b'];

    const result = appendNewSections(currentOrder, []);

    expect(result).toBe(currentOrder);
  });
});
