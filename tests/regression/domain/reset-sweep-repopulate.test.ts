// Regression test: startOver must re-populate trip from current staple library
//
// Bug: startOver() only resets existing trip items. New staples added to the
// library after trip.initializeFromStorage() never appear on the trip after startOver.

import { createTrip, StapleInput } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

describe('startOver re-populates from library', () => {
  it('includes staples added to library after trip.initializeFromStorage()', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);

    const initialStaples: StapleInput[] = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];
    trip.initializeFromStorage(initialStaples);

    // Simulate a staple added to the library AFTER the trip started
    const updatedStaples: StapleInput[] = [
      ...initialStaples,
      {
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];

    // startOver should accept current staples and rebuild from them
    trip.startOver(updatedStaples);

    const items = trip.getItems();
    const itemNames = items.map((i) => i.name);
    expect(itemNames).toContain('Milk');
    expect(itemNames).toContain('Eggs');
    expect(items).toHaveLength(2);
  });

  it('removes staples that are no longer in the library', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);

    const initialStaples: StapleInput[] = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];
    trip.initializeFromStorage(initialStaples);

    // Library no longer has Butter
    const updatedStaples: StapleInput[] = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];

    trip.startOver(updatedStaples);

    const items = trip.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Milk');
  });
});
