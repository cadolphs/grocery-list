// Item Grouping - pure functions for grouping trip items
// No IO imports

import { TripItem, HouseArea } from './types';

export type AreaGroup = {
  readonly area: HouseArea;
  readonly items: TripItem[];
  readonly totalCount: number;
  readonly neededCount: number;
};

const ALL_HOUSE_AREAS: readonly HouseArea[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

const createAreaGroup = (area: HouseArea, items: TripItem[]): AreaGroup => ({
  area,
  items,
  totalCount: items.length,
  neededCount: items.filter((item) => item.needed).length,
});

export const groupByArea = (items: TripItem[]): AreaGroup[] => {
  const itemsByArea = items.reduce<Record<string, TripItem[]>>(
    (groups, item) => ({
      ...groups,
      [item.houseArea]: [...(groups[item.houseArea] ?? []), item],
    }),
    {}
  );

  return ALL_HOUSE_AREAS.map((area) =>
    createAreaGroup(area, itemsByArea[area] ?? [])
  );
};
