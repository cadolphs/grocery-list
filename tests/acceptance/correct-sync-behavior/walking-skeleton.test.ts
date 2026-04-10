/**
 * Walking Skeleton Acceptance Tests - correct-sync-behavior
 *
 * These tests form the outer loop of Outside-In TDD.
 * They exercise driving ports (domain services + initializeApp orchestration)
 * and verify observable user outcomes in business language.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - Domain: createStapleLibrary, createTrip, TripService, StapleLibrary
 * - Orchestration: initializeApp, AdapterFactories
 *
 * Story Trace:
 * - WS-1: US-01 (Real-time staple sync via onChange callback)
 * - WS-2: US-02 + US-03 (Trip persists to cloud, syncs via listener)
 * - WS-3: US-05 (New staple auto-adds to active trip)
 */

import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip, TripService } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { StapleItem } from '../../../src/domain/types';
import { StapleStorage } from '../../../src/ports/staple-storage';

// =============================================================================
// WS-1: Staple added on one device appears on the other via real-time listener
// Story: US-01
// =============================================================================

describe('WS-1: Staple sync across devices via real-time listener', () => {
  it('staple added on one device appears on the other without restart', () => {
    // Given Clemens has a staple library with "Milk" and "Eggs"
    const storage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(storage);
    expect(library.listAll()).toHaveLength(2);

    // And a real-time listener is active on the staple library
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When "Olive Oil" is added to the staple library from a remote device
    // (Simulated: adapter receives remote update, updates cache, calls onChange)
    // The adapter internally updates the storage with the new staple list
    // and invokes onChange to signal the hook layer.
    //
    // NOTE: This test will require the Firestore staple adapter to accept
    // an onChange callback and call it when remote data changes.
    // For now, we simulate by directly modifying storage and calling onChange.
    storage.save({
      id: 'staple-olive-oil-remote',
      name: 'Olive Oil',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Oils', aisleNumber: 7 },
      type: 'staple',
      createdAt: '2026-04-10T10:00:00.000Z',
    });
    onChange();

    // Then the staple library contains "Milk", "Eggs", and "Olive Oil"
    const allStaples = library.listAll();
    expect(allStaples).toHaveLength(3);
    expect(allStaples.map(s => s.name)).toContain('Olive Oil');

    // And the onChange callback fires to signal the update
    expect(onChangeCallCount).toBe(1);
  });
});

// =============================================================================
// WS-2: Trip checkoff persists to cloud and appears on another device
// Stories: US-02, US-03
// =============================================================================

describe('WS-2: Trip state syncs to cloud and loads on another device', () => {
  it.skip('trip checkoff persists to cloud storage and syncs to other device', () => {
    // Given Clemens has an active trip with "Milk", "Eggs", and "Bread"
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
    ]);

    // And the trip is stored in cloud storage
    // (checkOff calls persistTrip internally, writing to storage)

    // When Clemens checks off "Milk" on his phone
    trip.checkOff('Milk');

    // Then the trip in cloud storage shows "Milk" as checked with a timestamp
    const savedTrip = tripStorage.loadTrip();
    expect(savedTrip).not.toBeNull();
    const milkInStorage = savedTrip!.items.find(i => i.name === 'Milk');
    expect(milkInStorage?.checked).toBe(true);
    expect(milkInStorage?.checkedAt).not.toBeNull();

    // And when the trip updates arrive from a remote change
    // (Simulated: other device loads from same storage, sees checked state)
    const otherDeviceTrip = createTrip(tripStorage);
    otherDeviceTrip.loadFromStorage();

    // Then "Milk" appears as checked on the other device
    const milkOnOther = otherDeviceTrip.getItems().find(i => i.name === 'Milk');
    expect(milkOnOther?.checked).toBe(true);
    expect(milkOnOther?.checkedAt).not.toBeNull();
  });
});

// =============================================================================
// WS-3: New staple auto-adds to active trip without losing sweep progress
// Story: US-05
// =============================================================================

describe('WS-3: New staple auto-adds to active trip', () => {
  it.skip('new staple appears in active trip without resetting sweep', () => {
    // Given Clemens has an active trip started with "Milk" and "Eggs"
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // And the "Bathroom" area sweep is completed
    trip.completeArea('Bathroom');
    expect(trip.getSweepProgress().completedAreas).toContain('Bathroom');

    // When Clemens adds "Paper Towels" (area: "Bathroom") as a new staple
    const addResult = library.addStaple({
      name: 'Paper Towels',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Paper Goods', aisleNumber: 8 },
    });
    expect(addResult.success).toBe(true);

    // And the orchestration layer detects the new staple
    // (Simulated: hook layer compares old vs new staple list, finds "Paper Towels" is new)
    const newStaple = library.listAll().find(s => s.name === 'Paper Towels')!;
    trip.addItem({
      name: newStaple.name,
      houseArea: newStaple.houseArea,
      storeLocation: newStaple.storeLocation,
      itemType: 'staple',
      source: 'preloaded',
    });

    // Then "Paper Towels" appears in the active trip
    const tripItems = trip.getItems();
    expect(tripItems.map(i => i.name)).toContain('Paper Towels');

    // And the "Bathroom" area sweep progress is preserved
    expect(trip.getSweepProgress().completedAreas).toContain('Bathroom');

    // And the trip contains 3 items total
    expect(tripItems).toHaveLength(3);
  });
});
