// Section Ordering - pure functions for custom section sort order
// No IO imports
//
// Section-keyed: groups are keyed by their `section` field. The legacy AisleGroup
// shape (with composite section::aisleNumber keys) is still accepted at the type
// level via the structural `SectionLike` constraint so the regression suite at
// tests/acceptance/store-section-order/* keeps compiling until step 02-03 retires
// it; production callers (StoreView, SectionOrderSettingsScreen) now pass
// SectionGroup[] with section-name keys.

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

// When no custom order applies, section-keyed groups (no aisleNumber field) sort
// alphabetically by section name. Legacy composite-keyed groups pass through
// unchanged to preserve the default groupByAisle ordering.
const isSectionKeyed = <T extends SectionLike>(groups: T[]): boolean =>
  groups.length > 0 && groups[0].aisleNumber === undefined;

const compareBySectionName = <T extends SectionLike>(a: T, b: T): number =>
  a.section.localeCompare(b.section);

export const sortByCustomOrder = <T extends SectionLike>(
  groups: T[],
  sectionOrder: string[] | null,
): T[] => {
  if (sectionOrder === null || sectionOrder.length === 0) {
    if (isSectionKeyed(groups)) {
      return [...groups].sort(compareBySectionName);
    }
    return groups;
  }

  return [...groups].sort(compareByCustomOrder(sectionOrder));
};
