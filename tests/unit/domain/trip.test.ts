// Trip domain - unit tests

import { createTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

describe('Trip: addItem', () => {
  it('adds a one-off item to the trip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    trip.addItem({
      name: 'Birthday candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    const items = trip.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        name: 'Birthday candles',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Baking', aisleNumber: 12 },
        itemType: 'one-off',
        source: 'quick-add',
        needed: true,
        checked: false,
      })
    );
    expect(items[0].id).toBeDefined();
  });

  it('one-off item does not have a stapleId', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    trip.addItem({
      name: 'Party hats',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Party', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    const items = trip.getItems();
    expect(items[0].stapleId).toBeNull();
  });
});
