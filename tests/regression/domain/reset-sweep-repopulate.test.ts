// Regression test: resetSweep must re-populate trip from current staple library
//
// Bug: resetSweep() only resets existing trip items. New staples added to the
// library after trip.start() never appear on the trip after resetSweep.

import { createTrip, StapleInput } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

describe('resetSweep re-populates from library', () => {
  it('includes staples added to library after trip.start()', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);

    const initialStaples: StapleInput[] = [
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ];
    trip.start(initialStaples);

    // Simulate a staple added to the library AFTER the trip started
    const updatedStaples: StapleInput[] = [
      ...initialStaples,
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ];

    // resetSweep should accept current staples and rebuild from them
    trip.resetSweep(updatedStaples);

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
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ];
    trip.start(initialStaples);

    // Library no longer has Butter
    const updatedStaples: StapleInput[] = [
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ];

    trip.resetSweep(updatedStaples);

    const items = trip.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Milk');
  });
});
