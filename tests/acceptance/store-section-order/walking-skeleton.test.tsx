/**
 * Walking Skeleton Acceptance Tests - Store Section Ordering
 *
 * These tests form the outer loop of Outside-In TDD.
 * They exercise driving ports (domain functions + storage port)
 * and verify observable user outcomes in business language.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - Domain: sortByCustomOrder (NEW pure function in section-ordering.ts)
 * - Domain: groupByAisle (existing, provides input to sortByCustomOrder)
 * - Storage: SectionOrderStorage port via createNullSectionOrderStorage
 *
 * Story Trace:
 * - WS-1: US-SSO-02 (Store view uses custom section order)
 * - WS-2: US-SSO-02 (Fallback to default when no custom order)
 * - WS-3: US-SSO-02 (Unknown sections appear at end)
 * - WS-4: US-SSO-01 (Section order persists via storage port)
 * - WS-5: US-SSO-02 (Empty sections hidden with custom order)
 * - WS-6: US-SSO-02 (null order = default sort)
 * - WS-7: US-SSO-02 (empty array order = default sort)
 */

// --- Driving port imports (to be created during DELIVER wave) ---
// Domain ports:
import { groupByAisle, AisleGroup } from '../../../src/domain/item-grouping';
import { TripItem } from '../../../src/domain/types';
// NEW domain module:
import { sortByCustomOrder } from '../../../src/domain/section-ordering';
// NEW null adapter:
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

// --- Test helpers ---

/**
 * Creates a minimal TripItem for testing store view grouping.
 * Only section and aisleNumber matter for groupByAisle; other fields
 * are filled with sensible defaults.
 */
const tripItem = (
  name: string,
  section: string,
  aisleNumber: number | null,
): TripItem => ({
  id: `item-${name.toLowerCase().replace(/\s/g, '-')}`,
  name,
  houseArea: 'Fridge',
  storeLocation: { section, aisleNumber },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
});

/**
 * Derives the section key from an AisleGroup, matching the
 * composite key format used in custom order lists.
 * Format: "${section}::${aisleNumber}"
 */
const sectionKey = (group: AisleGroup): string =>
  `${group.section}::${group.aisleNumber}`;

// =============================================================================
// WS-1: Custom section order overrides default sort (US-SSO-02)
// =============================================================================

describe('WS-1: Custom section order overrides default sort', () => {
  // AC: Store view uses custom section order when one exists
  // AC: Sections appear in the order Carlos configured
  // Trace: US-SSO-02, AC-1

  it('sorts store sections by custom walking order', () => {
    // Given Carlos has trip items in these sections
    const items = [
      tripItem('Shampoo', 'Health & Beauty', null),
      tripItem('Deli turkey', 'Deli', null),
      tripItem('Whole milk', 'Dairy', 3),
      tripItem('Canned beans', 'Canned Goods', 5),
      tripItem('Bread', 'Bakery', null),
    ];

    // And Carlos has set his walking order
    const customOrder = [
      'Health & Beauty::null',
      'Deli::null',
      'Dairy::3',
      'Canned Goods::5',
      'Bakery::null',
    ];

    // When Carlos views the store layout
    const defaultGroups = groupByAisle(items);
    const sorted = sortByCustomOrder(defaultGroups, customOrder);

    // Then sections appear in Carlos's walking order
    expect(sorted).toHaveLength(5);
    expect(sorted[0].section).toBe('Health & Beauty');
    expect(sorted[1].section).toBe('Deli');
    expect(sorted[2].section).toBe('Dairy');
    expect(sorted[3].section).toBe('Canned Goods');
    expect(sorted[4].section).toBe('Bakery');
  });
});

// =============================================================================
// WS-2: Fallback to default when no custom order (US-SSO-02)
// =============================================================================

describe('WS-2: Fallback to default order when no custom order exists', () => {
  // AC: Default sort used when no custom order exists (backward compatible)
  // Trace: US-SSO-02, AC-2

  it('uses default sort when custom order is null', () => {
    // Given Carlos has trip items in Dairy, Canned Goods, and Deli
    const items = [
      tripItem('Whole milk', 'Dairy', 3),
      tripItem('Canned beans', 'Canned Goods', 5),
      tripItem('Deli turkey', 'Deli', null),
    ];

    // And no custom section order has been set
    const customOrder = null;

    // When Carlos views the store layout
    const defaultGroups = groupByAisle(items);
    const sorted = sortByCustomOrder(defaultGroups, customOrder);

    // Then sections appear in default order: numbered aisles ascending, then named sections
    expect(sorted[0].section).toBe('Dairy');
    expect(sorted[0].aisleNumber).toBe(3);
    expect(sorted[1].section).toBe('Canned Goods');
    expect(sorted[1].aisleNumber).toBe(5);
    expect(sorted[2].section).toBe('Deli');
    expect(sorted[2].aisleNumber).toBeNull();
  });
});

// =============================================================================
// WS-3: Sections not in custom order appear at the end (US-SSO-02)
// =============================================================================

describe('WS-3: Unknown sections append to end of custom order', () => {
  // AC: Groups whose key does not appear in custom order sort to end
  // Trace: US-SSO-02, AC-1 (graceful handling)

  it('places unknown sections after all custom-ordered sections', () => {
    // Given Carlos has set his walking order to only Deli and Dairy
    const customOrder = ['Deli::null', 'Dairy::3'];

    // And Carlos has trip items in Deli, Dairy, and Bakery (Bakery not in order)
    const items = [
      tripItem('Deli turkey', 'Deli', null),
      tripItem('Whole milk', 'Dairy', 3),
      tripItem('Bread', 'Bakery', null),
    ];

    // When Carlos views the store layout
    const defaultGroups = groupByAisle(items);
    const sorted = sortByCustomOrder(defaultGroups, customOrder);

    // Then Deli appears first, Dairy second, Bakery last
    expect(sorted[0].section).toBe('Deli');
    expect(sorted[1].section).toBe('Dairy');
    expect(sorted[2].section).toBe('Bakery');
  });
});

// =============================================================================
// WS-4: Section order persists via storage port (US-SSO-01)
// =============================================================================

describe('WS-4: Section order persists and loads from storage', () => {
  // AC: Custom order persists to local storage and survives app restart
  // Trace: US-SSO-01, AC-4

  it('saves and loads custom section order from storage', () => {
    // Given Carlos has saved his walking order
    const storage = createNullSectionOrderStorage();
    const orderToSave = ['Deli::null', 'Dairy::3', 'Produce::null'];
    storage.saveOrder(orderToSave);

    // When Carlos reopens the app and loads his section order
    const loaded = storage.loadOrder();

    // Then the stored order matches what he saved
    expect(loaded).toEqual(['Deli::null', 'Dairy::3', 'Produce::null']);
  });
});

// =============================================================================
// WS-5: Empty sections hidden with custom order (US-SSO-02)
// =============================================================================

describe('WS-5: Custom order still hides empty sections', () => {
  // AC: Empty sections still hidden regardless of ordering method
  // Trace: US-SSO-02, AC-3

  it('only shows sections that have items on the current trip', () => {
    // Given Carlos has set his walking order to 5 sections
    const customOrder = [
      'Health & Beauty::null',
      'Deli::null',
      'Dairy::3',
      'Canned Goods::5',
      'Bakery::null',
    ];

    // And Carlos has trip items only in Deli and Bakery
    const items = [
      tripItem('Deli turkey', 'Deli', null),
      tripItem('Bread', 'Bakery', null),
    ];

    // When Carlos views the store layout
    const defaultGroups = groupByAisle(items);
    const sorted = sortByCustomOrder(defaultGroups, customOrder);

    // Then only 2 sections are shown (groupByAisle already excludes empties)
    expect(sorted).toHaveLength(2);
    // And they appear in custom order: Deli first, Bakery second
    expect(sorted[0].section).toBe('Deli');
    expect(sorted[1].section).toBe('Bakery');
  });
});

// =============================================================================
// WS-6: null order means use default sort (US-SSO-02, edge case)
// =============================================================================

describe('WS-6: null stored order means default sort', () => {
  // AC: null from storage = no custom order = default groupByAisle sort
  // Trace: US-SSO-02, null semantics from architecture design

  it.skip('null order passes groups through unchanged', () => {
    // Given the stored section order is null
    // const storage = createNullSectionOrderStorage();
    // const loaded = storage.loadOrder();
    // expect(loaded).toBeNull();

    // When Carlos views the store layout with items in Dairy and Deli
    // const items = [
    //   tripItem('Whole milk', 'Dairy', 3),
    //   tripItem('Deli turkey', 'Deli', null),
    // ];
    // const defaultGroups = groupByAisle(items);
    // const sorted = sortByCustomOrder(defaultGroups, loaded);

    // Then Dairy appears before Deli (default: numbered aisles first)
    // expect(sorted[0].section).toBe('Dairy');
    // expect(sorted[1].section).toBe('Deli');
  });
});

// =============================================================================
// WS-7: Empty array order treated as no custom order (edge case)
// =============================================================================

describe('WS-7: Empty array order falls back to default sort', () => {
  // AC: Empty list should not reorder groups (edge case defense)
  // Trace: US-SSO-02, boundary condition

  it.skip('empty array order does not reorder groups', () => {
    // Given the stored section order is an empty list
    // const customOrder: string[] = [];

    // When Carlos views the store layout
    // const items = [
    //   tripItem('Whole milk', 'Dairy', 3),
    //   tripItem('Deli turkey', 'Deli', null),
    // ];
    // const defaultGroups = groupByAisle(items);
    // const sorted = sortByCustomOrder(defaultGroups, customOrder);

    // Then default sort is preserved: Dairy before Deli
    // expect(sorted[0].section).toBe('Dairy');
    // expect(sorted[1].section).toBe('Deli');
  });
});
