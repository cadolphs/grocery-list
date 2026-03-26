// Regression: skip state lost on reload
// Bug: skipItem() does not call persistTrip(), so skipped items revert
// to needed=true when the trip is reloaded from storage.

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';

describe('Regression: skip state persists across reload', () => {
  it('skip state persists across reload', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);

    trip.start([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
    ]);

    // Persist initial state so storage has the trip
    trip.checkOff('Bread');
    trip.uncheckItem('Bread');

    // Skip an item -- this is the operation under test
    trip.skipItem('Milk');

    // Verify skip took effect in memory
    const itemsBeforeReload = trip.getItems();
    const milkBefore = itemsBeforeReload.find((item) => item.name === 'Milk');
    expect(milkBefore?.needed).toBe(false);

    // Simulate app reload by loading from storage
    trip.loadFromStorage();

    // After reload, skip state should be preserved
    const itemsAfterReload = trip.getItems();
    const milkAfter = itemsAfterReload.find((item) => item.name === 'Milk');
    expect(milkAfter?.needed).toBe(false);
  });
});
