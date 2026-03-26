// Regression: uncompleteArea removes area from completed set
// Feature: allow users to mark a sweep area as not done after completing it

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';

describe('uncompleteArea removes area from completed set', () => {
  it('area is no longer in completedAreas after uncompleteArea', () => {
    const storage = createNullTripStorage();
    const trip = createTrip(storage);

    trip.start([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    trip.completeArea('Fridge');
    expect(trip.getSweepProgress().completedAreas).toContain('Fridge');

    trip.uncompleteArea('Fridge');

    const progress = trip.getSweepProgress();
    expect(progress.completedAreas).not.toContain('Fridge');
    expect(progress.completedCount).toBe(0);
  });

  it('getSweepProgress reflects the change after uncompleteArea', () => {
    const storage = createNullTripStorage();
    const trip = createTrip(storage);

    trip.start([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Ice Cream',
        houseArea: 'Freezer',
        storeLocation: { section: 'Frozen', aisleNumber: 7 },
      },
    ]);

    trip.completeArea('Fridge');
    trip.completeArea('Freezer');
    expect(trip.getSweepProgress().completedCount).toBe(2);

    trip.uncompleteArea('Fridge');

    const progress = trip.getSweepProgress();
    expect(progress.completedAreas).toEqual(['Freezer']);
    expect(progress.completedCount).toBe(1);
  });
});
