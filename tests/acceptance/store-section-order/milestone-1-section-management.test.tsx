/**
 * Milestone 1: Section Management, Navigation, and Reset
 *
 * All tests in this file are SKIPPED. They should be enabled one at a time
 * after the walking skeleton is complete.
 *
 * Driving Ports:
 * - Domain: sortByCustomOrder, appendNewSections (in section-ordering.ts)
 * - Domain: groupBySection (provides section-keyed input)
 * - Storage: SectionOrderStorage port via createNullSectionOrderStorage
 *
 * Regression note (post step 02-03): originally written against the legacy
 * `groupByAisle` / `AisleGroup` shape with composite keys. Migrated to the
 * section-keyed contract; section names serve as custom-order keys.
 *
 * Story Trace:
 * - US-SSO-04: New Section Auto-Appends to Custom Order
 * - US-SSO-05: Reset Section Order to Default
 * - US-SSO-03: Section Navigation Follows Custom Order
 */

// --- Driving port imports ---
// Domain ports:
import { groupBySection } from '../../../src/domain/item-grouping';
import { TripItem } from '../../../src/domain/types';
import { sortByCustomOrder, appendNewSections } from '../../../src/domain/section-ordering';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

// --- Test helpers ---

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

// =============================================================================
// US-SSO-04: New Section Auto-Appends to Custom Order
// =============================================================================

describe('US-SSO-04: New Section Auto-Appends to Custom Order', () => {
  // AC: New sections auto-append to end of custom order
  // AC: Auto-append happens when item is added (not deferred)
  // AC: New sections are visible in store view and settings immediately
  // Trace: US-SSO-04, AC-1, AC-2, AC-3

  it('appends a new section to end of existing custom order', () => {
    // Given Carlos has a custom order of 3 sections
    const currentOrder = ['Deli', 'Dairy', 'Canned Goods'];

    // And Carlos has items that include a new section "Sushi Bar"
    const knownKeys = ['Deli', 'Dairy', 'Canned Goods', 'Sushi Bar'];

    // When the app detects sections not in the custom order
    const updated = appendNewSections(currentOrder, knownKeys);

    // Then "Sushi Bar" is appended at the end
    expect(updated).toEqual(['Deli', 'Dairy', 'Canned Goods', 'Sushi Bar']);
  });

  it('appends multiple new sections preserving discovery order', () => {
    // Given Carlos has a custom order of 2 sections
    const currentOrder = ['Deli', 'Dairy'];

    // And Carlos has items in Deli, Dairy, Bakery, and Floral
    const knownKeys = ['Deli', 'Dairy', 'Bakery', 'Floral'];

    // When the app detects sections not in the custom order
    const updated = appendNewSections(currentOrder, knownKeys);

    // Then Bakery and Floral are appended
    expect(updated).toEqual(['Deli', 'Dairy', 'Bakery', 'Floral']);
  });

  it('returns unchanged order when all sections already present', () => {
    // Given Carlos has a custom order of 3 sections
    const currentOrder = ['Deli', 'Dairy', 'Bakery'];

    // And Carlos has items only in existing sections
    const knownKeys = ['Deli', 'Dairy'];

    // When the app checks for new sections
    const updated = appendNewSections(currentOrder, knownKeys);

    // Then the custom order remains unchanged
    expect(updated).toEqual(['Deli', 'Dairy', 'Bakery']);
  });

  it('does not create duplicates when existing section has new items', () => {
    // Given Carlos has a custom order including Dairy
    const currentOrder = ['Deli', 'Dairy', 'Bakery'];

    // And Carlos adds another item in the Dairy section
    const knownKeys = ['Deli', 'Dairy', 'Bakery'];

    // When the app detects sections
    const updated = appendNewSections(currentOrder, knownKeys);

    // Then the order has exactly one Dairy entry
    const dairyCount = updated.filter(k => k === 'Dairy').length;
    expect(dairyCount).toBe(1);
    expect(updated).toHaveLength(3);
  });
});

// =============================================================================
// US-SSO-05: Reset Section Order to Default
// =============================================================================

describe('US-SSO-05: Reset Section Order to Default', () => {
  // AC: Reset clears custom order from storage
  // AC: After reset, store view and navigation use default sort
  // AC: After reset, Carlos can create a new custom order
  // Trace: US-SSO-05, AC-3, AC-4, AC-5

  it('clears custom order and reverts to default sort', () => {
    // Given Carlos has a custom order
    const storage = createNullSectionOrderStorage(['Deli', 'Dairy', 'Canned Goods']);

    // When Carlos resets the section order to default
    storage.clearOrder();

    // Then the stored section order is null
    expect(storage.loadOrder()).toBeNull();

    // And the store view uses default alphabetical sort
    const items = [
      tripItem('Whole milk', 'Dairy', 3),
      tripItem('Canned beans', 'Canned Goods', 5),
      tripItem('Deli turkey', 'Deli', null),
    ];
    const groups = groupBySection(items);
    const sorted = sortByCustomOrder(groups, storage.loadOrder());
    expect(sorted[0].section).toBe('Canned Goods');
    expect(sorted[1].section).toBe('Dairy');
    expect(sorted[2].section).toBe('Deli');
  });

  it('allows creating new custom order after reset', () => {
    // Given Carlos has reset his section order
    const storage = createNullSectionOrderStorage(['Deli', 'Dairy']);
    storage.clearOrder();
    expect(storage.loadOrder()).toBeNull();

    // When Carlos sets a new walking order
    const newOrder = ['Bakery', 'Produce', 'Dairy'];
    storage.saveOrder(newOrder);

    // Then the stored order reflects the new customization
    expect(storage.loadOrder()).toEqual(['Bakery', 'Produce', 'Dairy']);

    // And the store view uses the new custom order
    const items = [
      tripItem('Bread', 'Bakery', null),
      tripItem('Apples', 'Produce', null),
      tripItem('Whole milk', 'Dairy', 3),
    ];
    const groups = groupBySection(items);
    const sorted = sortByCustomOrder(groups, storage.loadOrder());
    expect(sorted[0].section).toBe('Bakery');
    expect(sorted[1].section).toBe('Produce');
    expect(sorted[2].section).toBe('Dairy');
  });
});

// =============================================================================
// US-SSO-03: Section Navigation Follows Custom Order
// =============================================================================

describe('US-SSO-03: Section Navigation Follows Custom Order', () => {
  // AC: "Next" button targets the next section in custom order that has items
  // AC: Empty sections are skipped in navigation
  // AC: Last section shows completion indicator instead of "Next"
  // Trace: US-SSO-03, AC-1, AC-2, AC-4

  it.skip('next section follows custom order after completing a section', () => {
    // Given Carlos has custom order and items in all 4 sections
    // const customOrder = ['Deli', 'Dairy', 'Canned Goods', 'Produce'];
    // const items = [
    //   tripItem('Deli turkey', 'Deli', null),
    //   tripItem('Whole milk', 'Dairy', 3),
    //   tripItem('Canned beans', 'Canned Goods', 5),
    //   tripItem('Apples', 'Produce', null),
    // ];

    // And the sorted store sections are in custom order
    // const groups = groupBySection(items);
    // const sorted = sortByCustomOrder(groups, customOrder);

    // When Carlos finishes the Deli section (index 0)
    // const currentIndex = 0;
    // const nextIndex = currentIndex + 1;

    // Then the next section is Dairy
    // expect(sorted[nextIndex].section).toBe('Dairy');
  });

  it.skip('next section skips empty sections in custom order', () => {
    // Given Carlos has custom order but no items in Dairy
    // const customOrder = ['Deli', 'Dairy', 'Canned Goods', 'Produce'];
    // const items = [
    //   tripItem('Deli turkey', 'Deli', null),
    //   tripItem('Canned beans', 'Canned Goods', 5),
    //   tripItem('Apples', 'Produce', null),
    // ];

    // And the sorted store sections are in custom order (Dairy excluded by groupBySection)
    // const groups = groupBySection(items);
    // const sorted = sortByCustomOrder(groups, customOrder);

    // When Carlos finishes the Deli section (index 0)
    // const currentIndex = 0;
    // const nextIndex = currentIndex + 1;

    // Then the next section is Canned Goods (Dairy skipped - no items)
    // expect(sorted[nextIndex].section).toBe('Canned Goods');
  });

  it.skip('no next section after the last section in custom order', () => {
    // Given Carlos has custom order and items in 3 sections
    // const customOrder = ['Deli', 'Dairy', 'Produce'];
    // const items = [
    //   tripItem('Deli turkey', 'Deli', null),
    //   tripItem('Whole milk', 'Dairy', 3),
    //   tripItem('Apples', 'Produce', null),
    // ];

    // And the sorted store sections are in custom order
    // const groups = groupBySection(items);
    // const sorted = sortByCustomOrder(groups, customOrder);

    // When Carlos finishes the Produce section (last, index 2)
    // const currentIndex = 2;
    // const nextIndex = currentIndex + 1;

    // Then there is no next section
    // expect(sorted[nextIndex]).toBeUndefined();
  });
});

// =============================================================================
// Edge Cases: Auto-Append Boundary Conditions
// =============================================================================

describe('Edge: Auto-append with null order', () => {
  // When no custom order exists, auto-append should be a no-op
  // Trace: US-SSO-04, boundary condition

  it.skip('auto-append with null order returns null (no-op)', () => {
    // Given no custom section order has been set
    // const currentOrder = null;

    // When the app detects new sections from trip items
    // const knownKeys = ['Deli', 'Dairy'];

    // Then no auto-append occurs (can't append to null)
    // This behavior is for the hook/caller to handle:
    // if order is null, don't call appendNewSections
    // The domain function only operates on non-null orders
  });
});

describe('Edge: Reset when no custom order exists', () => {
  // Clearing null order should be safe (no-op)
  // Trace: US-SSO-05, boundary condition

  it('reset when no custom order exists is safe', () => {
    // Given no custom section order has been set
    const storage = createNullSectionOrderStorage();
    expect(storage.loadOrder()).toBeNull();

    // When Carlos resets the section order to default
    storage.clearOrder();

    // Then the stored section order is still null
    expect(storage.loadOrder()).toBeNull();
  });
});
