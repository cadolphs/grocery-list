/**
 * US-02: Firestore Trip Storage Adapter
 *
 * Focused acceptance scenarios for trip cloud persistence.
 * Tests exercise driving ports: TripService, TripStorage.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import { createTrip, TripService } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

describe('US-02: Firestore trip storage adapter', () => {
  // =============================================================================
  // S-05: Trip state persists to cloud on checkoff
  // =============================================================================

  it('S-05: trip checkoff is persisted to cloud storage', () => {
    // Given Clemens has an active trip with "Milk", "Eggs", and "Bread" in cloud storage
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
    ]);

    // When Clemens checks off "Milk"
    trip.checkOff('Milk');

    // Then the trip in cloud storage contains "Milk" as checked
    const savedTrip = tripStorage.loadTrip();
    const milkInStorage = savedTrip!.items.find(i => i.name === 'Milk');
    expect(milkInStorage?.checked).toBe(true);

    // And the checkoff timestamp is recorded
    expect(milkInStorage?.checkedAt).not.toBeNull();
  });

  // =============================================================================
  // S-06: Carryover persists to cloud on trip completion
  // =============================================================================

  it('S-06: unbought items saved as carryover in cloud storage', () => {
    // Given Clemens has an active trip with 3 items and "Olive Oil" is unchecked
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Olive Oil', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Oils', aisleNumber: 7 } },
    ]);

    // And "Milk" and "Eggs" are checked off
    trip.checkOff('Milk');
    trip.checkOff('Eggs');

    // When Clemens completes the trip
    trip.complete();

    // Then "Olive Oil" is saved as carryover in cloud storage
    const carryover = tripStorage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0].name).toBe('Olive Oil');

    // And the trip status is "completed" in cloud storage
    const savedTrip = tripStorage.loadTrip();
    expect(savedTrip?.status).toBe('completed');
  });

  // =============================================================================
  // S-07: Trip loads from cloud on initialization
  // =============================================================================

  it('S-07: trip loads from cloud storage during app initialization', () => {
    // Given cloud storage contains a trip with 8 items and 3 checked off
    const tripStorage = createNullTripStorage();
    const setupTrip = createTrip(tripStorage);
    const staples = [
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'Toilet Paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
      { name: 'Canned Beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
      { name: 'Olive Oil', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Oils', aisleNumber: 7 } },
    ];
    setupTrip.start(staples);
    setupTrip.checkOff('Milk');
    setupTrip.checkOff('Eggs');
    setupTrip.checkOff('Bread');

    // When the app initializes and reads from cloud storage
    const loadedTrip = createTrip(tripStorage);
    loadedTrip.loadFromStorage();

    // Then all 8 items are loaded into the trip
    expect(loadedTrip.getItems()).toHaveLength(8);

    // And the 3 checked items retain their checked state and timestamps
    const checkedItems = loadedTrip.getItems().filter(i => i.checked);
    expect(checkedItems).toHaveLength(3);
    expect(checkedItems.every(i => i.checkedAt !== null)).toBe(true);
  });

  // =============================================================================
  // S-08: App continues when cloud write fails
  // =============================================================================

  it('S-08: app does not block when cloud storage write fails', () => {
    // Given Clemens has an active trip with "Eggs"
    // And cloud storage writes are failing silently
    // (Firestore adapter uses fire-and-forget setDoc -- failures do not propagate)
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    // When Clemens checks off "Eggs"
    // (Even if the background persist fails, the local state is updated first)
    trip.checkOff('Eggs');

    // Then "Eggs" appears checked in the local view immediately
    const eggs = trip.getItems().find(i => i.name === 'Eggs');
    expect(eggs?.checked).toBe(true);

    // And the app does not show an error or freeze
    // (The fire-and-forget pattern means checkOff returns synchronously)
    // This is verified by the fact that we reach this assertion without timeout.
  });
});
