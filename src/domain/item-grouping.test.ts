// Domain unit tests for partitionSectionByAisle.
// Pure function tests — no React, no IO, no mocks.
// Fixtures built by feeding raw TripItems through groupBySection (DISTILL D4),
// so the tests exercise the same SectionGroup shape the production caller produces.

import { TripItem } from './types';
import {
  AislePartition,
  AisleSubGroup,
  groupBySection,
  partitionSectionByAisle,
} from './item-grouping';

const makeItem = (
  name: string,
  section: string,
  aisleNumber: number | null,
  checked: boolean = false,
): TripItem => ({
  id: `id-${name}`,
  name,
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section, aisleNumber },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked,
  checkedAt: null,
});

const sectionGroupFor = (section: string, items: TripItem[]) => {
  const group = groupBySection(items).find((g) => g.section === section);
  if (!group) {
    throw new Error(`Test fixture error: section "${section}" not found`);
  }
  return group;
};

describe('partitionSectionByAisle', () => {
  // Helper: narrow an AislePartition to its multi-aisle subgroup array,
  // failing the test if the partition turned out to be any other kind.
  const multiAisleSubGroups = (p: AislePartition): AisleSubGroup[] => {
    if (p.kind !== 'multi-aisle') {
      throw new Error(`Expected multi-aisle partition, got kind="${p.kind}"`);
    }
    return p.subGroups;
  };

  test('multi-aisle section partitions into ascending aisle sub-groups', () => {
    // GIVEN a section group "Inner Aisles" with items at aisles 4, 5, and 7
    const items = [
      makeItem('Pasta', 'Inner Aisles', 5),
      makeItem('Cereal', 'Inner Aisles', 7),
      makeItem('Bread', 'Inner Aisles', 4),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(innerAisles);

    // THEN the partition is multi-aisle with three sub-groups keyed 4, 5, 7
    expect(result.kind).toBe('multi-aisle');
    const subGroups = multiAisleSubGroups(result);
    expect(subGroups.map((g) => g.aisleKey)).toEqual([4, 5, 7]);
    expect(subGroups).toHaveLength(3);
  });

  test('all-null section partitions as flat-no-aisle', () => {
    // GIVEN a section group "Produce" where every item has no aisle number
    const items = [
      makeItem('Apple', 'Produce', null),
      makeItem('Banana', 'Produce', null),
      makeItem('Carrot', 'Produce', null),
    ];
    const produce = sectionGroupFor('Produce', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(produce);

    // THEN the partition signals flat-no-aisle (no aisle metadata anywhere)
    expect(result.kind).toBe('flat-no-aisle');
  });

  // @walking_skeleton @in-memory @US-01
  // RED scenario for show-single-aisle-number: helper exposes the single-aisle
  // case as a discriminated-union variant carrying the aisle number, so the UI
  // can render an `Aisle N` badge in the section header.
  test('single-aisle section partitions as kind=single-aisle with that aisleNumber', () => {
    // GIVEN a section group "Frozen" where every item is at aisle 12
    const items = [
      makeItem('Peas', 'Frozen', 12),
      makeItem('Pizza', 'Frozen', 12),
      makeItem('Ice Cream', 'Frozen', 12),
    ];
    const frozen = sectionGroupFor('Frozen', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(frozen);

    // THEN the partition is single-aisle carrying aisleNumber 12
    expect(result.kind).toBe('single-aisle');
    if (result.kind === 'single-aisle') {
      expect(result.aisleNumber).toBe(12);
    }
  });

  test('mixed numeric + null section partitions as multi-aisle with null tail', () => {
    // GIVEN a section group "Inner Aisles" with items at aisles 4 and 5
    // AND one item in "Inner Aisles" with no aisle number
    const items = [
      makeItem('Bread', 'Inner Aisles', 4),
      makeItem('Mystery', 'Inner Aisles', null),
      makeItem('Pasta', 'Inner Aisles', 5),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(innerAisles);

    // THEN the partition is multi-aisle with sub-group keys 4, 5, then null tail
    expect(result.kind).toBe('multi-aisle');
    const subGroups = multiAisleSubGroups(result);
    expect(subGroups.map((g) => g.aisleKey)).toEqual([4, 5, null]);
  });

  // @US-01 — edge case from DISCUSS Domain Example #4 (Bakery: 2 items at aisle 9
  // + 1 item with aisleNumber: null). DISCUSS specifies this is NOT single-aisle —
  // it must render as multi-aisle with the `Aisle 9` subgroup followed by the
  // `No aisle` tail. Locks the helper's discriminator: presence of any null item
  // disqualifies the single-aisle branch even when only one numeric aisle is present.
  test('one numeric aisle plus a null item partitions as multi-aisle (not single-aisle)', () => {
    // GIVEN a section group "Bakery" with 2 items at aisle 9
    // AND 1 item in "Bakery" with no aisle number
    const items = [
      makeItem('Sourdough', 'Bakery', 9),
      makeItem('Croissant', 'Bakery', 9),
      makeItem('Mystery Loaf', 'Bakery', null),
    ];
    const bakery = sectionGroupFor('Bakery', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(bakery);

    // THEN the partition is multi-aisle, NOT single-aisle
    expect(result.kind).toBe('multi-aisle');
    const subGroups = multiAisleSubGroups(result);
    expect(subGroups.map((g) => g.aisleKey)).toEqual([9, null]);
  });

  test('each aisle sub-group reports its own checked / total counts', () => {
    // GIVEN a section group "Inner Aisles" where aisle 4 has 3 items with 2 checked
    // AND aisle 5 has 2 items with 0 checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Pasta', 'Inner Aisles', 4, true),
      makeItem('Rice', 'Inner Aisles', 4, false),
      makeItem('Cereal', 'Inner Aisles', 5, false),
      makeItem('Oats', 'Inner Aisles', 5, false),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(innerAisles);

    // THEN the aisle-4 sub-group reports 2 checked of 3 total
    // AND the aisle-5 sub-group reports 0 checked of 2 total
    const subGroups = multiAisleSubGroups(result);
    const aisle4 = subGroups.find((g) => g.aisleKey === 4);
    const aisle5 = subGroups.find((g) => g.aisleKey === 5);
    expect(aisle4).toBeDefined();
    expect(aisle5).toBeDefined();
    expect(aisle4!.checkedCount).toBe(2);
    expect(aisle4!.totalCount).toBe(3);
    expect(aisle5!.checkedCount).toBe(0);
    expect(aisle5!.totalCount).toBe(2);
  });

  test('no-aisle tail group reports its own counts', () => {
    // GIVEN a section group "Inner Aisles" with aisle 4 (1 item, 1 checked)
    // AND one item with no aisle (unchecked)
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Mystery', 'Inner Aisles', null, false),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(innerAisles);

    // THEN the no-aisle tail sub-group reports 0 checked of 1 total
    const subGroups = multiAisleSubGroups(result);
    const noAisleTail = subGroups.find((g) => g.aisleKey === null);
    expect(noAisleTail).toBeDefined();
    expect(noAisleTail!.checkedCount).toBe(0);
    expect(noAisleTail!.totalCount).toBe(1);
  });

  test('item input order preserved inside each aisle sub-group', () => {
    // GIVEN a section group "Inner Aisles" where aisle 4 contains
    // items "Bread" then "Pasta" in input order
    // AND aisle 5 contains "Cereal" then "Rice" in input order (extra distinct aisle
    // so partition does not collapse)
    const items = [
      makeItem('Bread', 'Inner Aisles', 4),
      makeItem('Cereal', 'Inner Aisles', 5),
      makeItem('Pasta', 'Inner Aisles', 4),
      makeItem('Rice', 'Inner Aisles', 5),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the section is partitioned by aisle
    const result = partitionSectionByAisle(innerAisles);

    // THEN the aisle-4 sub-group's items are "Bread" then "Pasta" in that order
    const subGroups = multiAisleSubGroups(result);
    const aisle4 = subGroups.find((g) => g.aisleKey === 4);
    expect(aisle4).toBeDefined();
    expect(aisle4!.items.map((i) => i.name)).toEqual(['Bread', 'Pasta']);
  });
});
