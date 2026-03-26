// Item Grouping - pure functions for grouping trip items
// No IO imports

import { TripItem, HouseArea } from './types';

export type AreaGroup = {
  readonly area: HouseArea;
  readonly items: TripItem[];
  readonly totalCount: number;
  readonly neededCount: number;
};

const createAreaGroup = (area: HouseArea, items: TripItem[]): AreaGroup => ({
  area,
  items,
  totalCount: items.length,
  neededCount: items.filter((item) => item.needed).length,
});

export type AisleGroup = {
  readonly section: string;
  readonly aisleNumber: number | null;
  readonly items: TripItem[];
  readonly totalCount: number;
  readonly checkedCount: number;
};

const groupKey = (item: TripItem): string =>
  `${item.storeLocation.section}::${item.storeLocation.aisleNumber}`;

const createAisleGroup = (section: string, aisleNumber: number | null, items: TripItem[]): AisleGroup => ({
  section,
  aisleNumber,
  items,
  totalCount: items.length,
  checkedCount: items.filter((item) => item.checked).length,
});

const compareAisleGroups = (a: AisleGroup, b: AisleGroup): number => {
  if (a.aisleNumber !== null && b.aisleNumber !== null) {
    return a.aisleNumber - b.aisleNumber;
  }
  if (a.aisleNumber !== null) return -1;
  if (b.aisleNumber !== null) return 1;
  return a.section.localeCompare(b.section);
};

export const groupByAisle = (items: TripItem[]): AisleGroup[] => {
  if (items.length === 0) return [];

  const grouped = items.reduce<Record<string, TripItem[]>>(
    (groups, item) => {
      const key = groupKey(item);
      return {
        ...groups,
        [key]: [...(groups[key] ?? []), item],
      };
    },
    {}
  );

  return Object.entries(grouped)
    .map(([, groupItems]) => {
      const first = groupItems[0];
      return createAisleGroup(first.storeLocation.section, first.storeLocation.aisleNumber, groupItems);
    })
    .sort(compareAisleGroups);
};

const isStaple = (item: TripItem): boolean => item.itemType !== 'one-off';

export const groupByArea = (items: TripItem[], areas: readonly string[]): AreaGroup[] => {
  const stapleItems = items.filter(isStaple);
  const itemsByArea = stapleItems.reduce<Record<string, TripItem[]>>(
    (groups, item) => ({
      ...groups,
      [item.houseArea]: [...(groups[item.houseArea] ?? []), item],
    }),
    {}
  );

  return areas.map((area) =>
    createAreaGroup(area, itemsByArea[area] ?? [])
  );
};

export const getOneOffItems = (items: TripItem[]): TripItem[] =>
  items.filter((item) => item.itemType === 'one-off');
