// Regression tests for section-ordering pure functions
// Locks behavior of sortByCustomOrder and appendNewSections.
// Pure unit tests, no mocks. Section-keyed contract only (post step 02-03).

import { TripItem } from './types';
import { SectionGroup } from './item-grouping';
import { appendNewSections, sortByCustomOrder } from './section-ordering';

const makeSectionGroup = (section: string): SectionGroup => ({
  section,
  items: [] as TripItem[],
  totalCount: 0,
  checkedCount: 0,
});

describe('sortByCustomOrder', () => {
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

  test('appends groups absent from sectionOrder after ordered ones, preserving alphabetical fallback', () => {
    const dairy = makeSectionGroup('Dairy');
    const produce = makeSectionGroup('Produce');
    const bakery = makeSectionGroup('Bakery');
    const meat = makeSectionGroup('Meat');
    const groups = [dairy, produce, bakery, meat];

    const result = sortByCustomOrder(groups, ['Bakery', 'Produce']);

    // Bakery and Produce in custom order; Dairy and Meat preserve input order at end.
    expect(result.map((g) => g.section)).toEqual([
      'Bakery',
      'Produce',
      'Dairy',
      'Meat',
    ]);
  });

  test('preserves input order when no group keys appear in sectionOrder', () => {
    const a = makeSectionGroup('A');
    const b = makeSectionGroup('B');
    const c = makeSectionGroup('C');
    const groups = [a, b, c];

    const result = sortByCustomOrder(groups, ['X']);

    expect(result.map((g) => g.section)).toEqual(['A', 'B', 'C']);
  });

  test('does not mutate input when sorting alphabetically', () => {
    const produce = makeSectionGroup('Produce');
    const bakery = makeSectionGroup('Bakery');
    const groups = [produce, bakery];
    const snapshot = [...groups];

    sortByCustomOrder(groups, null);

    expect(groups).toEqual(snapshot);
  });

  test('does not mutate the input groups array when applying custom order', () => {
    const dairy = makeSectionGroup('Dairy');
    const produce = makeSectionGroup('Produce');
    const groups = [dairy, produce];
    const snapshot = [...groups];

    sortByCustomOrder(groups, ['Produce']);

    expect(groups).toEqual(snapshot);
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
