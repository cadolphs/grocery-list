// Unit tests for groupByArea pure function

import { groupByArea, AreaGroup } from '../../../src/domain/item-grouping';
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
    const result = groupByArea([]);

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

    const result = groupByArea(items);

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

    const result = groupByArea(items);

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

    const result = groupByArea(items);

    const fridgeGroup = result.find(g => g.area === 'Fridge')!;
    expect(fridgeGroup.neededCount).toBe(2);
    expect(fridgeGroup.totalCount).toBe(3);
  });
});
