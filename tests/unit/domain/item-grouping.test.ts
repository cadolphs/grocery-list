// Unit tests for item grouping pure functions

import { groupByArea, AreaGroup, groupByAisle, AisleGroup, groupBySection, SectionGroup } from '../../../src/domain/item-grouping';
import { TripItem, HouseArea } from '../../../src/domain/types';

const makeTripItem = (overrides: Partial<TripItem> & { name: string; houseArea: HouseArea }): TripItem => ({
  id: `trip-item-${overrides.name}`,
  name: overrides.name,
  houseArea: overrides.houseArea,
  storeLocation: overrides.storeLocation ?? { section: 'General', aisleNumber: null },
  itemType: overrides.itemType ?? 'staple',
  stapleId: overrides.stapleId ?? null,
  source: overrides.source ?? 'preloaded',
  needed: overrides.needed ?? true,
  checked: overrides.checked ?? false,
  checkedAt: overrides.checkedAt ?? null,
});

const ALL_HOUSE_AREAS: HouseArea[] = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

describe('groupByArea', () => {
  it('returns all 5 house areas even when given empty items', () => {
    const result = groupByArea([], ALL_HOUSE_AREAS);

    expect(result).toHaveLength(5);
    const areas = result.map(g => g.area);
    expect(areas).toEqual(expect.arrayContaining(ALL_HOUSE_AREAS));
  });

  it('groups items under their correct house area', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge' }),
      makeTripItem({ name: 'Butter', houseArea: 'Fridge' }),
      makeTripItem({ name: 'Shampoo', houseArea: 'Bathroom' }),
    ];

    const result = groupByArea(items, ALL_HOUSE_AREAS);

    const fridgeGroup = result.find(g => g.area === 'Fridge')!;
    expect(fridgeGroup.items).toHaveLength(2);
    expect(fridgeGroup.items.map(i => i.name)).toEqual(expect.arrayContaining(['Whole milk', 'Butter']));

    const bathroomGroup = result.find(g => g.area === 'Bathroom')!;
    expect(bathroomGroup.items).toHaveLength(1);
    expect(bathroomGroup.items[0].name).toBe('Shampoo');
  });

  it('computes totalCount as number of items in each area', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge' }),
      makeTripItem({ name: 'Butter', houseArea: 'Fridge' }),
      makeTripItem({ name: 'Ice cream', houseArea: 'Freezer' }),
    ];

    const result = groupByArea(items, ALL_HOUSE_AREAS);

    expect(result.find(g => g.area === 'Fridge')!.totalCount).toBe(2);
    expect(result.find(g => g.area === 'Freezer')!.totalCount).toBe(1);
    expect(result.find(g => g.area === 'Bathroom')!.totalCount).toBe(0);
  });

  it('computes neededCount as number of items with needed=true', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge', needed: true }),
      makeTripItem({ name: 'Butter', houseArea: 'Fridge', needed: false }),
      makeTripItem({ name: 'Yogurt', houseArea: 'Fridge', needed: true }),
    ];

    const result = groupByArea(items, ALL_HOUSE_AREAS);

    const fridgeGroup = result.find(g => g.area === 'Fridge')!;
    expect(fridgeGroup.neededCount).toBe(2);
    expect(fridgeGroup.totalCount).toBe(3);
  });
});

describe('groupByAisle', () => {
  it('returns empty array for empty items', () => {
    const result = groupByAisle([]);

    expect(result).toEqual([]);
  });

  it('groups items by section and aisle number', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
      makeTripItem({ name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
      makeTripItem({ name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } }),
    ];

    const result = groupByAisle(items);

    expect(result).toHaveLength(2);
    expect(result[0].section).toBe('Dairy');
    expect(result[0].items).toHaveLength(2);
    expect(result[1].section).toBe('Canned Goods');
    expect(result[1].items).toHaveLength(1);
  });

  it('sorts numbered aisles ascending before named sections without aisle numbers', () => {
    const items = [
      makeTripItem({ name: 'Deli turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } }),
      makeTripItem({ name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } }),
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
    ];

    const result = groupByAisle(items);

    expect(result).toHaveLength(3);
    expect(result[0].aisleNumber).toBe(3);
    expect(result[0].section).toBe('Dairy');
    expect(result[1].aisleNumber).toBe(5);
    expect(result[1].section).toBe('Canned Goods');
    expect(result[2].aisleNumber).toBeNull();
    expect(result[2].section).toBe('Deli');
  });

  it('computes totalCount and checkedCount per group', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true }),
      makeTripItem({ name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: false }),
      makeTripItem({ name: 'Yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true }),
    ];

    const result = groupByAisle(items);

    expect(result[0].totalCount).toBe(3);
    expect(result[0].checkedCount).toBe(2);
  });

  it('only includes non-empty groups', () => {
    const items = [
      makeTripItem({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
    ];

    const result = groupByAisle(items);

    expect(result).toHaveLength(1);
    expect(result[0].section).toBe('Dairy');
  });
});

describe('groupBySection', () => {
  it('returns empty array for empty items', () => {
    const result = groupBySection([]);

    expect(result).toEqual([]);
  });

  it('groups items by section name regardless of aisle number', () => {
    const items = [
      makeTripItem({
        name: 'Bread',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 4 },
      }),
      makeTripItem({
        name: 'Pasta',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
      makeTripItem({
        name: 'Soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 7 },
      }),
      makeTripItem({
        name: 'Apple',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Produce', aisleNumber: null },
      }),
    ];

    const result: SectionGroup[] = groupBySection(items);

    expect(result).toHaveLength(2);
    const sections = result.map((g) => g.section);
    expect(sections).toEqual(expect.arrayContaining(['Inner Aisles', 'Produce']));

    const innerAisles = result.find((g) => g.section === 'Inner Aisles')!;
    expect(innerAisles.items).toHaveLength(3);
    expect(innerAisles.totalCount).toBe(3);

    const produce = result.find((g) => g.section === 'Produce')!;
    expect(produce.items).toHaveLength(1);
  });

  it('orders items within a section by aisleNumber ascending', () => {
    const items = [
      makeTripItem({
        name: 'Soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 7 },
      }),
      makeTripItem({
        name: 'Bread',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 4 },
      }),
      makeTripItem({
        name: 'Pasta',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
    ];

    const result = groupBySection(items);

    expect(result).toHaveLength(1);
    expect(result[0].items.map((i) => i.name)).toEqual(['Bread', 'Pasta', 'Soap']);
  });

  it('orders items with null aisleNumber after numbered aisles within the same section', () => {
    const items = [
      makeTripItem({
        name: 'Bulk Bin Oats',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: null },
      }),
      makeTripItem({
        name: 'Pasta',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
      makeTripItem({
        name: 'Bread',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 4 },
      }),
    ];

    const result = groupBySection(items);

    expect(result[0].items.map((i) => i.name)).toEqual(['Bread', 'Pasta', 'Bulk Bin Oats']);
  });

  it('preserves input order as a stable secondary order for items with the same aisleNumber', () => {
    const items = [
      makeTripItem({
        name: 'Pasta',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
      makeTripItem({
        name: 'Rice',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
      makeTripItem({
        name: 'Beans',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
      }),
    ];

    const result = groupBySection(items);

    expect(result[0].items.map((i) => i.name)).toEqual(['Pasta', 'Rice', 'Beans']);
  });

  it('computes totalCount and checkedCount per section', () => {
    const items = [
      makeTripItem({
        name: 'Bread',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 4 },
        checked: true,
      }),
      makeTripItem({
        name: 'Pasta',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 5 },
        checked: false,
      }),
      makeTripItem({
        name: 'Soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Inner Aisles', aisleNumber: 7 },
        checked: true,
      }),
    ];

    const result = groupBySection(items);

    expect(result[0].totalCount).toBe(3);
    expect(result[0].checkedCount).toBe(2);
  });
});
