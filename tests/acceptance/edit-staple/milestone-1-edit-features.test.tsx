/**
 * Milestone 1: Edit Staple Features
 *
 * All tests in this file are SKIPPED. Enable one at a time after the
 * walking skeleton is complete.
 *
 * Driving Ports:
 * - Domain: createStapleLibrary (library.updateStaple, library.remove)
 * - Domain: createTrip (trip sync on staple edit)
 *
 * Story Trace:
 * - US-ES-01: Edit staple house area (error/edge cases)
 * - US-ES-02: Edit staple store location (error/edge cases)
 * - US-ES-03: Remove staple from edit sheet
 * - US-ES-04: Sync current trip when staple edited
 */

// --- Driving port imports ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { groupByArea } from '../../../src/domain/item-grouping';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

const DEFAULT_AREAS: readonly string[] = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

// =============================================================================
// US-ES-01/02: Edit Validation and Error Paths
// =============================================================================

describe('US-ES-01/02: Edit Validation', () => {
  // Error path: invalid inputs rejected before persistence

  it('rejects edit with empty house area', () => {
    // Given "Butter" is a staple in "Fridge"
    const stapleStorage = createNullStapleStorage([
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];

    // When Carlos clears the house area field and tries to save
    const result = library.updateStaple(staple.id, { houseArea: '' });

    // Then the edit is rejected with a validation message
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ error: expect.stringContaining('area') })
    );

    // And the original staple remains unchanged
    const butter = library.listAll().find(s => s.name === 'Butter');
    expect(butter?.houseArea).toBe('Fridge');
  });

  it('rejects edit with empty store section', () => {
    // Given "Shampoo" is a staple in "Bathroom"
    const stapleStorage = createNullStapleStorage([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];

    // When Carlos clears the store section and tries to save
    const result = library.updateStaple(staple.id, {
      storeLocation: { section: '', aisleNumber: 7 },
    });

    // Then the edit is rejected with a validation message
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ error: expect.stringContaining('section') })
    );

    // And the original staple remains unchanged
    const shampoo = library.listAll().find(s => s.name === 'Shampoo');
    expect(shampoo?.storeLocation.section).toBe('Personal Care');
  });

  it('rejects edit on a staple that no longer exists', () => {
    // Given "Oat milk" was removed from the library
    const stapleStorage = createNullStapleStorage([
      { name: 'Oat milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];
    library.remove(staple.id);

    // When Carlos tries to edit the removed staple
    const result = library.updateStaple(staple.id, { houseArea: 'Freezer' });

    // Then the edit is rejected because the staple no longer exists
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ error: expect.stringContaining('not found') })
    );
  });

  it('preserves original values when edit is cancelled', () => {
    // Given "Eggs" is a staple in "Fridge", "Dairy" section, aisle 3
    const stapleStorage = createNullStapleStorage([
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

    // When Carlos opens the edit sheet but does not call updateStaple (cancel)
    // (No update call -- simulating cancel at domain level)

    // Then "Eggs" retains its original values
    const eggs = library.listAll().find(s => s.name === 'Eggs');
    expect(eggs?.houseArea).toBe('Fridge');
    expect(eggs?.storeLocation.section).toBe('Dairy');
    expect(eggs?.storeLocation.aisleNumber).toBe(3);
  });
});

// =============================================================================
// US-ES-03: Remove Staple from Edit Sheet
// =============================================================================

describe('US-ES-03: Remove Staple from Edit Sheet', () => {
  // AC: Remove button available in edit mode
  // AC: Confirmation required before removal
  // AC: Removed staple disappears from library and future trips
  // Trace: US-ES-03

  it('removes a staple from the library', () => {
    // Given "Toilet paper" and "Shampoo" are staples in "Bathroom"
    const stapleStorage = createNullStapleStorage([
      { name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tp = library.listAll().find(s => s.name === 'Toilet paper')!;

    // When Carlos removes "Toilet paper" from the library
    library.remove(tp.id);

    // Then "Toilet paper" is gone from the library
    expect(library.listAll()).toHaveLength(1);
    expect(library.listAll()[0].name).toBe('Shampoo');

    // And "Toilet paper" will not appear on future trips
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    const tripItems = trip.getItems();
    expect(tripItems).not.toContainEqual(
      expect.objectContaining({ name: 'Toilet paper' })
    );
  });
});

// =============================================================================
// US-ES-04: Sync Current Trip When Staple Edited
// =============================================================================

describe('US-ES-04: Sync Current Trip When Staple Edited', () => {
  // AC: Active trip items reflect staple edits immediately
  // AC: Trip item house area updates when staple area changes
  // AC: Trip item store location updates when staple section/aisle changes
  // Trace: US-ES-04

  it.skip('trip item moves to new area when staple area is edited', () => {
    // Given Carlos has an active trip with "Whole milk" in "Fridge"
    const stapleStorage = createNullStapleStorage([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    const staple = library.listAll().find(s => s.name === 'Whole milk')!;

    // When Carlos edits "Whole milk" to move to "Freezer"
    library.updateStaple(staple.id, { houseArea: 'Freezer' });
    trip.syncStapleUpdate(staple.id, { houseArea: 'Freezer' });

    // Then "Whole milk" appears in "Freezer" on the trip
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    const freezerItems = grouped.find(g => g.area === 'Freezer')?.items ?? [];
    expect(freezerItems).toContainEqual(
      expect.objectContaining({ name: 'Whole milk' })
    );

    // And "Fridge" only has "Butter"
    const fridgeItems = grouped.find(g => g.area === 'Fridge')?.items ?? [];
    expect(fridgeItems).toHaveLength(1);
    expect(fridgeItems[0].name).toBe('Butter');
  });

  it.skip('trip item updates store section when staple section is edited', () => {
    // Given Carlos has an active trip with "Canned beans" in "Canned Goods", aisle 5
    const stapleStorage = createNullStapleStorage([
      { name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    const staple = library.listAll().find(s => s.name === 'Canned beans')!;

    // When Carlos changes "Canned beans" to "International" section, aisle 9
    library.updateStaple(staple.id, {
      storeLocation: { section: 'International', aisleNumber: 9 },
    });
    trip.syncStapleUpdate(staple.id, {
      storeLocation: { section: 'International', aisleNumber: 9 },
    });

    // Then "Canned beans" on the trip shows "International" section, aisle 9
    const beans = trip.getItems().find(i => i.name === 'Canned beans');
    expect(beans?.storeLocation.section).toBe('International');
    expect(beans?.storeLocation.aisleNumber).toBe(9);
  });

  it.skip('editing a staple does not affect one-off items on the trip', () => {
    // Given the trip has staple "Whole milk" and one-off "Birthday cake"
    const stapleStorage = createNullStapleStorage([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    trip.addItem({
      name: 'Birthday cake',
      houseArea: 'Fridge',
      storeLocation: { section: 'Bakery', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });
    const staple = library.listAll().find(s => s.name === 'Whole milk')!;

    // When Carlos edits "Whole milk" area to "Freezer"
    library.updateStaple(staple.id, { houseArea: 'Freezer' });
    trip.syncStapleUpdate(staple.id, { houseArea: 'Freezer' });

    // Then "Birthday cake" remains unchanged in "Fridge"
    const cake = trip.getItems().find(i => i.name === 'Birthday cake');
    expect(cake?.houseArea).toBe('Fridge');
    expect(cake?.storeLocation.section).toBe('Bakery');
  });
});
