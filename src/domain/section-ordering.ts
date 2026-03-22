// Section Ordering - pure functions for custom section sort order
// No IO imports

import { AisleGroup } from './item-grouping';

const groupKey = (group: AisleGroup): string =>
  `${group.section}::${group.aisleNumber}`;

const compareByCustomOrder = (
  sectionOrder: string[],
) => (a: AisleGroup, b: AisleGroup): number => {
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

export const sortByCustomOrder = (
  groups: AisleGroup[],
  sectionOrder: string[] | null,
): AisleGroup[] => {
  if (sectionOrder === null || sectionOrder.length === 0) return groups;

  return [...groups].sort(compareByCustomOrder(sectionOrder));
};
