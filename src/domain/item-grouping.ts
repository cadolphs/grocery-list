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

// AisleKey identifies an aisle sub-group within a section.
// `null` represents the "no aisle" tail bucket for items missing aisleNumber.
export type AisleKey = number | null;

// AisleSubGroup mirrors SectionGroup's count shape but at the per-aisle level.
// Counts are derived from the items in this bucket; the UI never recomputes.
export type AisleSubGroup = {
  readonly aisleKey: AisleKey;
  readonly items: TripItem[];
  readonly totalCount: number;
  readonly checkedCount: number;
};

// Compare two items within the same section: aisleNumber ascending, nulls last,
// with input position as a stable secondary key.
//
// Fallback rationale: if an item is missing from `indexOf` (a wiring bug, since
// `groupBySection` builds the map from the same input array it sorts), it sorts
// to the END of the section rather than the front. This keeps the comparator
// pure (no throw) while making the failure mode deterministic and visible
// (unknown items appear in a stable, low-priority slot) rather than masked at
// position 0.
const compareItemsInSection = (
  indexOf: Map<TripItem, number>,
  unknownIndex: number,
) => (a: TripItem, b: TripItem): number => {
  const aisleA = a.storeLocation.aisleNumber;
  const aisleB = b.storeLocation.aisleNumber;

  if (aisleA !== null && aisleB !== null && aisleA !== aisleB) {
    return aisleA - aisleB;
  }
  if (aisleA === null && aisleB !== null) return 1;
  if (aisleA !== null && aisleB === null) return -1;

  // Equal aisle (both numeric-equal or both null): preserve input order.
  return (indexOf.get(a) ?? unknownIndex) - (indexOf.get(b) ?? unknownIndex);
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

  const compare = compareItemsInSection(indexOf, items.length);

  return sectionOrder.map((section) => {
    const sectionItems = [...itemsBySection.get(section)!].sort(compare);
    return createSectionGroup(section, sectionItems);
  });
};

const createAisleSubGroup = (
  aisleKey: AisleKey,
  items: TripItem[],
): AisleSubGroup => ({
  aisleKey,
  items,
  totalCount: items.length,
  checkedCount: items.filter((item) => item.checked).length,
});

// Bucket items by aisleKey, preserving input order within each bucket.
// Returns numeric buckets keyed by their aisle number plus a separate null bucket.
const bucketByAisleKey = (
  items: TripItem[],
): { numericBuckets: Map<number, TripItem[]>; nullBucket: TripItem[] } => {
  const numericBuckets = new Map<number, TripItem[]>();
  const nullBucket: TripItem[] = [];
  for (const item of items) {
    const aisle = item.storeLocation.aisleNumber;
    if (aisle === null) {
      nullBucket.push(item);
      continue;
    }
    if (!numericBuckets.has(aisle)) {
      numericBuckets.set(aisle, []);
    }
    numericBuckets.get(aisle)!.push(item);
  }
  return { numericBuckets, nullBucket };
};

const distinctAisleKeyCount = (
  numericBuckets: Map<number, TripItem[]>,
  nullBucket: TripItem[],
): number => numericBuckets.size + (nullBucket.length > 0 ? 1 : 0);

// Partitions a SectionGroup into per-aisle sub-groups.
// Returns null when the section has exactly one distinct aisle key (including
// the all-null case): the caller falls back to the existing flat render path.
// Otherwise returns numeric-ascending sub-groups followed by an optional
// null-keyed tail. Pure function; no React, no IO.
export const partitionSectionByAisle = (
  group: SectionGroup,
): AisleSubGroup[] | null => {
  const { numericBuckets, nullBucket } = bucketByAisleKey(group.items);

  if (distinctAisleKeyCount(numericBuckets, nullBucket) <= 1) {
    return null;
  }

  const ascendingNumericKeys = [...numericBuckets.keys()].sort((a, b) => a - b);
  const numericSubGroups = ascendingNumericKeys.map((key) =>
    createAisleSubGroup(key, numericBuckets.get(key)!),
  );

  if (nullBucket.length === 0) {
    return numericSubGroups;
  }
  return [...numericSubGroups, createAisleSubGroup(null, nullBucket)];
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
