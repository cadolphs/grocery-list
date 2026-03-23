// Regression: pre-loaded staple items must preserve stapleId from library
// Bug: tapping a pre-loaded staple in HomeView doesn't open edit sheet
// because TripItemRow requires item.stapleId to be truthy, but pre-loaded
// trip items had stapleId: null when library staples flowed through start().

import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

describe('Regression: staple ID preserved on trip preload', () => {
  it('trip items created from library staples have non-null stapleId matching the staple ID', () => {
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);

    library.addStaple({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });
    library.addStaple({
      name: 'Shampoo',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Personal Care', aisleNumber: 7 },
    });

    const allStaples = library.listAll();
    expect(allStaples).toHaveLength(2);

    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage);
    tripService.start(allStaples);

    const tripItems = tripService.getItems();
    expect(tripItems).toHaveLength(2);

    for (const tripItem of tripItems) {
      expect(tripItem.stapleId).not.toBeNull();
      const matchingStaple = allStaples.find(s => s.name === tripItem.name);
      expect(matchingStaple).toBeDefined();
      expect(tripItem.stapleId).toBe(matchingStaple!.id);
    }
  });
});
