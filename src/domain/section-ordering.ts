// Section Ordering - pure functions for custom section sort order
// No IO imports
//
// Section-keyed: groups are keyed by their `section` field. Custom-order keys
// are section names; default sort (when no custom order is provided) is
// alphabetical by section name.

import { SectionGroup } from './item-grouping';

const compareByCustomOrder = (
  sectionOrder: string[],
) => (a: SectionGroup, b: SectionGroup): number => {
  const indexA = sectionOrder.indexOf(a.section);
  const indexB = sectionOrder.indexOf(b.section);

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

const compareBySectionName = (a: SectionGroup, b: SectionGroup): number =>
  a.section.localeCompare(b.section);

export const sortByCustomOrder = (
  groups: SectionGroup[],
  sectionOrder: string[] | null,
): SectionGroup[] => {
  if (sectionOrder === null || sectionOrder.length === 0) {
    return [...groups].sort(compareBySectionName);
  }

  return [...groups].sort(compareByCustomOrder(sectionOrder));
};
