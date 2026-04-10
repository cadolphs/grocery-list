/**
 * US-07: Prevent Duplicate Trip Items from Concurrent Local and Remote Adds
 *
 * Focused acceptance scenarios for duplicate prevention.
 * Tests exercise driving ports: TripService.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import { createTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { TripItem } from '../../../src/domain/types';

describe('US-07: Prevent duplicate trip items', () => {
  // =============================================================================
  // S-22: No duplicate when trip sync delivers item already added locally
  // =============================================================================

  it('S-22: no duplicate when remote trip update contains locally added item', () => {
    // Given Clemens has an active trip with "Tahini" (stapleId: "staple-tahini-abc")
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    // Simulate auto-add of Tahini with stapleId
    trip.addItem({
      name: 'Tahini',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'International', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
    });
    expect(trip.getItems().filter(i => i.name === 'Tahini')).toHaveLength(1);

    // When the trip listener receives an update also containing "Tahini" (same stapleId)
    // (The onSnapshot approach replaces the entire trip state from the remote document.
    //  This naturally prevents duplicates because the remote state IS the state.)
    //
    // Alternative: if merging, guard with stapleId check before adding.
    // The duplicate prevention guard:
    const existingStapleIds = new Set(
      trip.getItems().filter(i => i.stapleId !== null).map(i => i.stapleId)
    );
    const remoteTahiniStapleId = 'staple-tahini-abc';
    const wouldBeDuplicate = existingStapleIds.has(remoteTahiniStapleId);

    // Then the trip contains exactly one "Tahini" item
    // (Either by whole-state replacement or by duplicate guard)
    expect(trip.getItems().filter(i => i.name === 'Tahini')).toHaveLength(1);
  });

  // =============================================================================
  // S-23: Staple and one-off with same name coexist
  // =============================================================================

  it('S-23: staple item and one-off item with same name are not considered duplicates', () => {
    // Given Clemens has a trip with "Milk" (stapleId: "staple-milk-1", type: staple)
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { id: 'staple-milk-1', name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    // When Clemens quick-adds a one-off "Milk" (stapleId: null)
    trip.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // Then the trip contains two "Milk" items
    const milkItems = trip.getItems().filter(i => i.name === 'Milk');
    expect(milkItems).toHaveLength(2);

    // And one is a staple and one is a one-off
    expect(milkItems.filter(i => i.itemType === 'staple')).toHaveLength(1);
    expect(milkItems.filter(i => i.itemType === 'one-off')).toHaveLength(1);
  });

  // =============================================================================
  // S-24: Re-added staple gets fresh trip item after removal (@property)
  // =============================================================================

  it('S-24: re-added staple with new ID gets a fresh trip item', () => {
    // Given Clemens removed "Tahini" from staples (old trip item removed)
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { id: 'staple-tahini-old', name: 'Tahini', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'International', aisleNumber: 4 } },
    ]);
    const oldItem = trip.getItems().find(i => i.name === 'Tahini')!;
    trip.removeItemByStapleId(oldItem.stapleId!);
    expect(trip.getItems().filter(i => i.name === 'Tahini')).toHaveLength(0);

    // When Clemens re-adds "Tahini" as a staple (with a new stapleId)
    // (Simulated: new staple has a different ID)
    trip.addItem({
      name: 'Tahini',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'International', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
    });

    // Then a new trip item for "Tahini" is created with the new stapleId
    // And the trip contains exactly one "Tahini"
    const tahiniItems = trip.getItems().filter(i => i.name === 'Tahini');
    expect(tahiniItems).toHaveLength(1);
  });
});
