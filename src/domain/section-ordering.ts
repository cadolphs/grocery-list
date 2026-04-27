// Section Ordering - pure functions for custom section sort order
// No IO imports

import { AisleGroup, SectionGroup } from './item-grouping';

// Transitional generic: during the section-order-by-section refactor, callers
// may pass either AisleGroup[] (legacy composite-keyed) or SectionGroup[] (new
// section-name-keyed). The grouping function determines the concrete shape.
// DELIVER will collapse to SectionGroup once call sites migrate.
type SectionLike = { readonly section: string; readonly aisleNumber?: number | null };

const groupKey = (group: SectionLike): string =>
  group.aisleNumber === undefined
    ? group.section
    : `${group.section}::${group.aisleNumber}`;

const compareByCustomOrder = (
  sectionOrder: string[],
) => (a: SectionLike, b: SectionLike): number => {
  const indexA = sectionOrder.indexOf(groupKey(a));
  const indexB = sectionOrder.indexOf(groupKey(b));

  // Both in custom order: sort by position
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  // Only a in custom order: a comes first
  if (indexA !== -1) return -1;
  // Only b in custom order: b comes first
  if (indexB !== -1) return 1;
  // Neither in custom order: preserve original relative order
  return 0;
};

export const appendNewSections = (
  currentOrder: string[],
  knownSectionKeys: string[],
): string[] => {
  const existingSet = new Set(currentOrder);
  const newSections = knownSectionKeys.filter((key) => !existingSet.has(key));
  return newSections.length === 0 ? currentOrder : [...currentOrder, ...newSections];
};

export function sortByCustomOrder(
  groups: AisleGroup[],
  sectionOrder: string[] | null,
): AisleGroup[];
export function sortByCustomOrder(
  groups: SectionGroup[],
  sectionOrder: string[] | null,
): SectionGroup[];
export function sortByCustomOrder<T extends SectionLike>(
  groups: T[],
  sectionOrder: string[] | null,
): T[] {
  if (sectionOrder === null || sectionOrder.length === 0) return groups;

  return [...groups].sort(compareByCustomOrder(sectionOrder));
}
