// Regression: a Not needed decision lost on reload
// Bug: marking an item Not needed did not call persistTrip(), so it reverted
// to Needed when the trip is reloaded from storage.

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';

describe('Regression: a Not needed decision persists across reload', () => {
  it('a Not needed decision persists across reload', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);

    trip.initializeFromStorage([
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

    // Completion is derived from decisions (#95): both areas start with an
    // Undecided staple, and Done on Fridge decides its staple.
    trip.markAreaDone('Fridge');

    const progressBeforeReload = trip.getSweepProgress().completedAreas;

    // Simulate app restart: new TripService instance, same storage
    // This mirrors what happens when the app is killed and relaunched
    const reloadedTrip = createTrip(tripStorage);
    reloadedTrip.loadFromStorage();

    // After reload, the decisions and so the completed areas are preserved
    const progressAfterReload = reloadedTrip.getSweepProgress().completedAreas;
    expect(progressBeforeReload).toContain('Fridge');
    expect(progressAfterReload).toEqual(progressBeforeReload);
    expect(progressAfterReload).not.toContain('Kitchen Cabinets');
  });
});
