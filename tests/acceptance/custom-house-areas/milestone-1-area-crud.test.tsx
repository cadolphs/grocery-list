/**
 * Milestone 1: Area CRUD Operations
 *
 * All tests in this file are SKIPPED. They should be enabled one at a time
 * after the walking skeleton is complete.
 *
 * Driving Ports:
 * - Domain: createAreaManagement, validateAreaName, groupByArea
 * - Null adapters: createNullAreaStorage, createNullStapleStorage, createNullTripStorage
 *
 * Story Trace:
 * - US-CHA-04: Rename Area with Propagation
 * - US-CHA-05: Delete Area with Reassignment
 * - US-CHA-06: Reorder Areas
 * - US-CHA-07: Area Name Validation
 */

// --- Driving port imports (to be created during DELIVER wave) ---

// Domain ports:
import { createAreaManagement } from '../../../src/domain/area-management';
// import { validateAreaName } from '../../../src/domain/area-validation';
import { groupByArea } from '../../../src/domain/item-grouping';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';

// Null adapters:
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';

const DEFAULT_AREAS = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

// =============================================================================
// US-CHA-04: Rename a House Area
// =============================================================================

describe('US-CHA-04: Rename a House Area', () => {
  // AC: Rename propagates to all staples with the old area name
  // AC: Rename propagates to all trip items with the old area name
  // AC: Rename to an existing area name is prevented
  // Trace: US-CHA-04, AC-1 through AC-4

  it('rename propagates to all staples in that area', () => {
    // Given Carlos has 4 staples in "Garage Pantry"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Canned tomatoes', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned', aisleNumber: 5 } });
    library.addStaple({ name: 'Rice', houseArea: 'Garage Pantry', storeLocation: { section: 'Grains', aisleNumber: 4 } });
    library.addStaple({ name: 'Pasta', houseArea: 'Garage Pantry', storeLocation: { section: 'Grains', aisleNumber: 4 } });
    library.addStaple({ name: 'Beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned', aisleNumber: 5 } });
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos renames "Garage Pantry" to "Pantry"
    const result = areaManagement.rename('Garage Pantry', 'Pantry');

    // Then the area list shows "Pantry" instead of "Garage Pantry"
    expect(result.success).toBe(true);
    expect(areaManagement.getAreas()).toContain('Pantry');
    expect(areaManagement.getAreas()).not.toContain('Garage Pantry');

    // And all 4 staples now have area "Pantry"
    const allStaples = library.listAll();
    const pantryStaples = allStaples.filter(s => s.houseArea === 'Pantry');
    expect(pantryStaples).toHaveLength(4);
    const garageStaples = allStaples.filter(s => s.houseArea === 'Garage Pantry');
    expect(garageStaples).toHaveLength(0);
  });

  it('rename propagates to active trip items', () => {
    // Given Carlos has an active trip with 3 items in "Kitchen Cabinets"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Cereal', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Breakfast', aisleNumber: 2 } });
    library.addStaple({ name: 'Pasta', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Grains', aisleNumber: 4 } });
    library.addStaple({ name: 'Rice', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Grains', aisleNumber: 4 } });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage, DEFAULT_AREAS);
    trip.start(library.listAll());
    // Persist the trip so rename can update items in storage
    tripStorage.saveTrip({ id: 'test-trip', items: trip.getItems(), status: 'active', createdAt: new Date().toISOString() });
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos renames "Kitchen Cabinets" to "Kitchen"
    areaManagement.rename('Kitchen Cabinets', 'Kitchen');

    // Then the 3 trip items now show under "Kitchen"
    const loadedTrip = tripStorage.loadTrip();
    const kitchenItems = loadedTrip?.items.filter(i => i.houseArea === 'Kitchen');
    expect(kitchenItems).toHaveLength(3);
    const cabinetItems = loadedTrip?.items.filter(i => i.houseArea === 'Kitchen Cabinets');
    expect(cabinetItems).toHaveLength(0);
  });

  it('blocks rename to an existing area name', () => {
    // Given Carlos has areas "Bathroom" and "Fridge"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos tries to rename "Fridge" to "Bathroom"
    const result = areaManagement.rename('Fridge', 'Bathroom');

    // Then the rename is rejected
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already exists');
    }

    // And the area list is unchanged
    expect(areaManagement.getAreas()).toContain('Fridge');
    expect(areaManagement.getAreas()).toContain('Bathroom');
  });

  it('blocks rename to same name with different case', () => {
    // Given Carlos has an area named "Bathroom"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos tries to rename "Fridge" to "bathroom"
    const result = areaManagement.rename('Fridge', 'bathroom');

    // Then the rename is rejected (case-insensitive duplicate)
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already exists');
    }
  });
});

// =============================================================================
// US-CHA-05: Delete a House Area
// =============================================================================

describe('US-CHA-05: Delete a House Area', () => {
  // AC: Empty areas can be deleted with simple confirmation
  // AC: Areas with staples require reassignment target selection
  // AC: Cannot delete the last remaining area
  // Trace: US-CHA-05, AC-1 through AC-5

  it('deletes an empty area', () => {
    // Given Ana Lucia has "Garage Pantry" with 0 staples
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Ana Lucia deletes "Garage Pantry"
    const result = areaManagement.delete('Garage Pantry');

    // Then "Garage Pantry" is removed
    expect(result.success).toBe(true);
    const areas = areaManagement.getAreas();
    expect(areas).not.toContain('Garage Pantry');
    expect(areas).toHaveLength(4);
  });

  it('deletes area with staples and reassigns to target', () => {
    // Given Carlos has 2 staples in "Freezer"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Frozen peas', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } });
    library.addStaple({ name: 'Ice cream', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } });
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos deletes "Freezer" and reassigns to "Fridge"
    const result = areaManagement.delete('Freezer', { reassignTo: 'Fridge' });

    // Then "Freezer" is removed
    expect(result.success).toBe(true);
    expect(areaManagement.getAreas()).not.toContain('Freezer');

    // And both staples now have area "Fridge"
    const allStaples = library.listAll();
    expect(allStaples.filter(s => s.houseArea === 'Fridge')).toHaveLength(2);
    expect(allStaples.filter(s => s.houseArea === 'Freezer')).toHaveLength(0);
  });

  it('delete reassigns trip items too', () => {
    // Given Carlos has an active trip with 1 item in "Freezer" and 2 staples
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Frozen peas', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } });
    library.addStaple({ name: 'Ice cream', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage, DEFAULT_AREAS);
    trip.start(library.listAll());
    // Persist the trip so delete can update items in storage
    tripStorage.saveTrip({ id: 'test-trip', items: trip.getItems(), status: 'active', createdAt: new Date().toISOString() });
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos deletes "Freezer" and reassigns to "Fridge"
    areaManagement.delete('Freezer', { reassignTo: 'Fridge' });

    // Then trip items and staples all belong to "Fridge"
    const loadedTrip = tripStorage.loadTrip();
    const freezerItems = loadedTrip?.items.filter(i => i.houseArea === 'Freezer');
    expect(freezerItems).toHaveLength(0);
    const fridgeItems = loadedTrip?.items.filter(i => i.houseArea === 'Fridge');
    expect(fridgeItems).toHaveLength(2);
  });

  it('cannot delete the last remaining area', () => {
    // Given Ana Lucia has only 1 area remaining
    const areaStorage = createNullAreaStorage(['Kitchen']);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Ana Lucia tries to delete "Kitchen"
    const result = areaManagement.delete('Kitchen');

    // Then the delete is blocked
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('at least one area');
    }
    expect(areaManagement.getAreas()).toHaveLength(1);
  });

  it('detects duplicate conflict on reassignment', () => {
    // Given Carlos has "Whole milk" in both "Fridge" and "Freezer"
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Whole milk', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } });
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos tries to delete "Freezer" and reassign to "Fridge"
    const result = areaManagement.delete('Freezer', { reassignTo: 'Fridge' });

    // Then a conflict is detected
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.conflicts).toContainEqual(
        expect.objectContaining({ name: 'Whole milk', existsIn: 'Fridge' })
      );
    }
  });
});

// =============================================================================
// US-CHA-06: Reorder Areas
// =============================================================================

describe('US-CHA-06: Reorder Areas', () => {
  // AC: Areas can be reordered via drag-and-drop in settings
  // AC: New order immediately reflected in home view
  // AC: New order persists across app restart
  // Trace: US-CHA-06, AC-1 through AC-5

  it('reorder changes area list order', () => {
    // Given Carlos has areas with "Laundry Room" at position 6
    const areas = [...DEFAULT_AREAS, 'Laundry Room'];
    const areaStorage = createNullAreaStorage(areas);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos moves "Laundry Room" from position 6 to position 2
    const newOrder = ['Bathroom', 'Laundry Room', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];
    areaManagement.reorder(newOrder);

    // Then the area order matches the new arrangement
    expect(areaManagement.getAreas()).toEqual(newOrder);
  });

  it('reordered areas produce matching groupByArea order', () => {
    // Given Carlos has reordered areas
    const newOrder = ['Bathroom', 'Laundry Room', 'Pantry', 'Kitchen Cabinets', 'Fridge'];
    const areaStorage = createNullAreaStorage(newOrder);
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Soap', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } });
    library.addStaple({ name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage, newOrder);
    trip.start(library.listAll());

    // When Carlos views the home screen
    const grouped = groupByArea(trip.getItems(), newOrder);

    // Then area sections appear in the reordered sequence
    expect(grouped.map(g => g.area)).toEqual(newOrder);
  });

  it('reorder persists after simulated restart', () => {
    // Given Carlos has reordered his areas
    const newOrder = ['Fridge', 'Kitchen Cabinets', 'Bathroom', 'Garage Pantry', 'Freezer'];
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
    areaManagement.reorder(newOrder);

    // When Carlos reopens the app (simulated by re-reading storage)
    const reloadedAreas = areaStorage.loadAll();

    // Then areas appear in the same custom order
    expect(reloadedAreas).toEqual(newOrder);
  });
});

// =============================================================================
// US-CHA-07: Area Name Validation
// =============================================================================

describe('US-CHA-07: Area Name Validation', () => {
  // AC: Area name must be non-empty (after trimming whitespace)
  // AC: Area name must be unique (case-insensitive comparison)
  // AC: Area name max length is 40 characters
  // AC: Validation applies to both add and rename operations
  // Trace: US-CHA-07, AC-1 through AC-6

  it.skip('rejects duplicate name case-insensitively', () => {
    // Given "Bathroom" exists in the area list
    // const existingAreas = DEFAULT_AREAS;

    // When Carlos tries to add "bathroom" (lowercase)
    // const result = validateAreaName('bathroom', existingAreas);

    // Then the validation rejects it
    // expect(result.valid).toBe(false);
    // expect(result.error).toContain('already exists');
  });

  it.skip('rejects empty name', () => {
    // When Carlos tries to add an area with a blank name
    // const result = validateAreaName('', DEFAULT_AREAS);

    // Then validation rejects it
    // expect(result.valid).toBe(false);
    // expect(result.error).toContain('required');
  });

  it.skip('rejects whitespace-only name', () => {
    // When Carlos tries to add "   " as an area name
    // const result = validateAreaName('   ', DEFAULT_AREAS);

    // Then validation rejects it
    // expect(result.valid).toBe(false);
    // expect(result.error).toContain('required');
  });

  it.skip('rejects name exceeding 40 characters', () => {
    // When Carlos tries to add a name that is 41 characters
    // const longName = 'A'.repeat(41);
    // const result = validateAreaName(longName, DEFAULT_AREAS);

    // Then validation rejects it
    // expect(result.valid).toBe(false);
    // expect(result.error).toContain('40 characters');
  });

  it.skip('accepts name at exactly 40 characters', () => {
    // When Carlos tries to add a name that is exactly 40 characters
    // const exactName = 'A'.repeat(40);
    // const result = validateAreaName(exactName, DEFAULT_AREAS);

    // Then validation accepts it
    // expect(result.valid).toBe(true);
  });

  it.skip('accepts valid unique name', () => {
    // When Carlos tries to add "Laundry Room"
    // const result = validateAreaName('Laundry Room', DEFAULT_AREAS);

    // Then validation accepts it
    // expect(result.valid).toBe(true);
  });

  it.skip('trims whitespace before validation', () => {
    // When Carlos types "  Laundry Room  " with leading/trailing spaces
    // const result = validateAreaName('  Laundry Room  ', DEFAULT_AREAS);

    // Then validation accepts the trimmed name
    // expect(result.valid).toBe(true);
  });
});
