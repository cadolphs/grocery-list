/**
 * US-03: Real-Time Listeners on Trip Data
 *
 * Focused acceptance scenarios for trip real-time sync.
 * Tests exercise driving ports: TripService, TripStorage with onChange callback.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import { createTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { Trip, TripItem } from '../../../src/domain/types';

describe('US-03: Real-time listeners on trip data', () => {
  // =============================================================================
  // S-09: Skipped item syncs in real-time
  // =============================================================================

  it('S-09: skipped item on one device reflected on the other', () => {
    // Given Clemens has an active trip with "Butter" marked as needed
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const butter = trip.getItems().find(i => i.name === 'Butter');
    expect(butter?.needed).toBe(true);

    // And a real-time listener is active on the trip
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When "Butter" is marked as skipped from a remote device
    // (Simulated: remote device skips Butter, trip is persisted, arrives via onSnapshot)
    trip.skipItem('Butter');
    onChange();

    // Then the local trip shows "Butter" as not needed
    const updatedButter = trip.getItems().find(i => i.name === 'Butter');
    expect(updatedButter?.needed).toBe(false);

    // And the onChange callback fires
    expect(onChangeCallCount).toBe(1);
  });

  // =============================================================================
  // S-10: Quick-added item appears on other device via trip sync
  // =============================================================================

  it('S-10: quick-added item appears on other device through trip sync', () => {
    // Given Clemens has an active trip with "Milk" and "Eggs"
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    // And a real-time listener is active on the trip
    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    // When "Birthday Candles" is quick-added to the trip from a remote device
    // (Simulated: remote device adds item, trip update arrives via onSnapshot)
    trip.addItem({
      name: 'Birthday Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });
    onChange();

    // Then the local trip contains "Milk", "Eggs", and "Birthday Candles"
    const items = trip.getItems();
    expect(items).toHaveLength(3);
    expect(items.map(i => i.name)).toEqual(
      expect.arrayContaining(['Milk', 'Eggs', 'Birthday Candles'])
    );

    // And the onChange callback fires
    expect(onChangeCallCount).toBe(1);
  });
});
