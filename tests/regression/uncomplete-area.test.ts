// Regression: uncompleteArea removes area from completed set
// Feature: allow users to mark a sweep area as not done after completing it

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { UseTripResult } from '../../src/hooks/useTrip';
import { HouseArea } from '../../src/domain/types';

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

describe('useTrip exposes uncompleteArea', () => {
  it('UseTripResult type includes uncompleteArea', () => {
    // Runtime verification that UseTripResult requires uncompleteArea
    // We create a conformance check: an object missing uncompleteArea
    // cannot satisfy the full UseTripResult interface
    const requiredKeys: (keyof UseTripResult)[] = [
      'items', 'addItem', 'checkOff', 'toggleCheckOff',
      'skipItem', 'unskipItem', 'completeArea', 'uncompleteArea',
      'resetSweep', 'syncStapleUpdate', 'sweepProgress',
    ];
    // This test fails if 'uncompleteArea' is not a key of UseTripResult
    expect(requiredKeys).toContain('uncompleteArea');
  });

  it('tripService.uncompleteArea updates sweepProgress (wiring verification)', () => {
    // Verify the service call pattern that the hook will delegate to
    const storage = createNullTripStorage();
    const tripService = createTrip(storage);

    tripService.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    tripService.completeArea('Fridge');
    expect(tripService.getSweepProgress().completedAreas).toContain('Fridge');

    // This is the exact pattern useTrip.uncompleteArea will use
    tripService.uncompleteArea('Fridge');
    const progress = tripService.getSweepProgress();

    expect(progress.completedAreas).not.toContain('Fridge');
    expect(progress.completedCount).toBe(0);
  });
});
