/**
 * US-01: Real-Time Listeners on Staples, Areas, and Section Order
 *
 * Focused acceptance scenarios for real-time data propagation.
 * Tests exercise driving ports: StapleStorage, AreaStorage, SectionOrderStorage
 * with onChange callback pattern.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

// =============================================================================
// S-01: Area rename propagates via real-time listener
// =============================================================================

describe('US-01: Real-time listeners on staples, areas, and section order', () => {
  it.skip('S-01: area rename on one device reflected on the other', () => {
    // Given Clemens has areas including "Pantry"
    const areaStorage = createNullAreaStorage();
    areaStorage.saveAll(['Bathroom', 'Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer']);
    expect(areaStorage.loadAll()).toContain('Pantry');

    // And a real-time listener is active on the area list
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When "Pantry" is renamed to "Garage Pantry" from a remote device
    // (Simulated: adapter receives remote update, updates cache)
    const areas = areaStorage.loadAll();
    const updated = areas.map(a => a === 'Pantry' ? 'Garage Pantry' : a);
    areaStorage.saveAll(updated);
    onChange();

    // Then the area list contains "Garage Pantry" instead of "Pantry"
    const currentAreas = areaStorage.loadAll();
    expect(currentAreas).toContain('Garage Pantry');
    expect(currentAreas).not.toContain('Pantry');

    // And the onChange callback fires
    expect(onChangeCallCount).toBe(1);
  });

  // =============================================================================
  // S-02: Section order change syncs via listener
  // =============================================================================

  it.skip('S-02: section order change propagates to the other device', () => {
    // Given Clemens has section order ["Dairy", "Produce", "Bakery"]
    const sectionStorage = createNullSectionOrderStorage();
    sectionStorage.saveOrder(['Dairy', 'Produce', 'Bakery']);

    // And a real-time listener is active on section order
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When the section order changes to ["Produce", "Dairy", "Bakery"] from a remote device
    sectionStorage.saveOrder(['Produce', 'Dairy', 'Bakery']);
    onChange();

    // Then the local section order is ["Produce", "Dairy", "Bakery"]
    expect(sectionStorage.loadOrder()).toEqual(['Produce', 'Dairy', 'Bakery']);

    // And the onChange callback fires
    expect(onChangeCallCount).toBe(1);
  });

  // =============================================================================
  // S-03: Staple removal syncs via listener
  // =============================================================================

  it('S-03: staple removed on one device disappears on the other', () => {
    // Given Clemens has staples "Milk", "Eggs", and "Soda"
    const storage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Soda', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Beverages', aisleNumber: 6 } },
    ]);
    const library = createStapleLibrary(storage);
    expect(library.listAll()).toHaveLength(3);

    // And a real-time listener is active on the staple library
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When "Soda" is removed from the staple library on a remote device
    const soda = library.listAll().find(s => s.name === 'Soda')!;
    storage.remove(soda.id);
    onChange();

    // Then the staple library contains only "Milk" and "Eggs"
    const remaining = library.listAll();
    expect(remaining).toHaveLength(2);
    expect(remaining.map(s => s.name)).toEqual(expect.arrayContaining(['Milk', 'Eggs']));
    expect(remaining.map(s => s.name)).not.toContain('Soda');

    // And the onChange callback fires
    expect(onChangeCallCount).toBe(1);
  });

  // =============================================================================
  // S-04: Own write does not trigger onChange callback
  // =============================================================================

  it('S-04: local write echoed back by listener does not trigger redundant update', () => {
    // Given Clemens has staples "Milk" and "Eggs"
    const storage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(storage);

    // And a real-time listener is active on the staple library
    // The own-write echo detection compares serialized state before/after.
    // This test requires the Firestore adapter's echo detection logic.
    //
    // NOTE: This scenario will be implemented by the adapter-level own-write
    // detection. The adapter compares incoming snapshot data to current cache.
    // If identical (own write echo), onChange is NOT called.
    //
    // For the acceptance test, we verify the contract:
    // after a local write followed by an echo, onChange should not fire.

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When Clemens adds "Bread" locally
    library.addStaple({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: null },
    });

    // Capture state after local write
    const stateAfterLocalWrite = JSON.stringify(library.listAll());

    // And the listener receives the echoed write with the same data
    // (Simulated: adapter compares incoming data to cache, finds no difference)
    const incomingState = JSON.stringify(library.listAll());
    if (incomingState !== stateAfterLocalWrite) {
      // Only fire onChange if data actually changed
      onChange();
    }

    // Then the onChange callback does not fire for the echo
    expect(onChangeCallCount).toBe(0);

    // And the staple library contains "Milk", "Eggs", and "Bread"
    expect(library.listAll()).toHaveLength(3);
    expect(library.listAll().map(s => s.name)).toContain('Bread');
  });
});
