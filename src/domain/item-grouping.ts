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

export type SectionGroup = {
  readonly section: string;
  readonly items: TripItem[];
  readonly totalCount: number;
  readonly checkedCount: number;
};

// Compare two items within the same section: aisleNumber ascending, nulls last,
// with input position as a stable secondary key.
const compareItemsInSection = (
  indexOf: Map<TripItem, number>,
) => (a: TripItem, b: TripItem): number => {
  const aisleA = a.storeLocation.aisleNumber;
  const aisleB = b.storeLocation.aisleNumber;

  if (aisleA !== null && aisleB !== null && aisleA !== aisleB) {
    return aisleA - aisleB;
  }
  if (aisleA === null && aisleB !== null) return 1;
  if (aisleA !== null && aisleB === null) return -1;

  // Equal aisle (both numeric-equal or both null): preserve input order.
  return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
};

const createSectionGroup = (section: string, items: TripItem[]): SectionGroup => ({
  section,
  items,
  totalCount: items.length,
  checkedCount: items.filter((item) => item.checked).length,
});

export const groupBySection = (items: TripItem[]): SectionGroup[] => {
  if (items.length === 0) return [];

  const indexOf = new Map<TripItem, number>(items.map((item, i) => [item, i]));

  // Bucket items by section, preserving first-seen section order.
  const sectionOrder: string[] = [];
  const itemsBySection = new Map<string, TripItem[]>();
  for (const item of items) {
    const section = item.storeLocation.section;
    if (!itemsBySection.has(section)) {
      sectionOrder.push(section);
      itemsBySection.set(section, []);
    }
    itemsBySection.get(section)!.push(item);
  }

  const compare = compareItemsInSection(indexOf);

  return sectionOrder.map((section) => {
    const sectionItems = [...itemsBySection.get(section)!].sort(compare);
    return createSectionGroup(section, sectionItems);
  });
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
