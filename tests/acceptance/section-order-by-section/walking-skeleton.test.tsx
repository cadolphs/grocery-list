/**
 * Walking Skeleton Acceptance Tests - Section-Keyed Store Ordering
 *
 * Outer loop of Outside-In TDD for the section-order-by-section refactor.
 * Strategy: A (InMemory) -- confirmed by user 2026-04-27.
 *
 * Driving Ports:
 * - Domain: groupBySection (NEW; scaffolded throw-on-call in src/domain/item-grouping.ts)
 * - Domain: sortByCustomOrder (existing; semantic shift to section-name keys)
 * - Domain: appendNewSections (existing; semantic shift to section-name dedupe)
 *
 * Story Trace:
 * - WS-1: US-01 + US-02 (section-keyed grouping, intra-section aisle sort, custom order applied)
 *
 * One-at-a-time discipline: only WS-1 is enabled. Milestone scenarios live in
 * milestone-1-section-keyed-grouping.test.tsx and milestone-2-migration-and-autoappend.test.tsx.
 */

import {
  groupBySection,
  SectionGroup,
} from '../../../src/domain/item-grouping';
import { sortByCustomOrder, appendNewSections } from '../../../src/domain/section-ordering';
import { TripItem } from '../../../src/domain/types';

// --- Test helpers ---

const tripItem = (
  name: string,
  section: string,
  aisleNumber: number | null,
): TripItem => ({
  id: `item-${name.toLowerCase().replace(/\s/g, '-')}`,
  name,
  houseArea: 'Pantry',
  storeLocation: { section, aisleNumber },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
});

// =============================================================================
// WS-1: One card per section, intra-section aisle order, custom order applied
// =============================================================================

describe('WS-1: Carlos opens the store view and sees one card per section with custom order applied', () => {
  // Trace: US-01 (settings grain), US-02 (store view grain)

  it('renders one SectionGroup per distinct section name with items aisle-ordered inside, sorted by custom order', () => {
    // Given Carlos has trip items in Inner Aisles (aisles 4, 5, 7) and Produce (no aisle)
    const items = [
      tripItem('Bread', 'Inner Aisles', 4),
      tripItem('Pasta', 'Inner Aisles', 5),
      tripItem('Soap', 'Inner Aisles', 7),
      tripItem('Apple', 'Produce', null),
    ];

    // And Carlos has set his walking order to: Produce, Inner Aisles
    const customOrder = ['Produce', 'Inner Aisles'];

    // When Carlos views the store layout
    const groups: SectionGroup[] = groupBySection(items);
    const knownSectionNames = groups.map((g) => g.section);
    const effectiveOrder = appendNewSections(customOrder, knownSectionNames);
    const sorted = sortByCustomOrder(groups, effectiveOrder);

    // Then exactly two section cards appear (one per section, not per aisle)
    expect(sorted).toHaveLength(2);

    // And the first card is Produce
    expect(sorted[0].section).toBe('Produce');

    // And the second card is Inner Aisles
    expect(sorted[1].section).toBe('Inner Aisles');

    // And the Inner Aisles card contains items in aisle order: Bread, Pasta, Soap
    const innerAislesItems = sorted[1].items.map((i) => i.name);
    expect(innerAislesItems).toEqual(['Bread', 'Pasta', 'Soap']);
  });
});
