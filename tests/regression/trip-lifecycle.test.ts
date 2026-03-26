// Trip lifecycle: complete() persists trip and saves carryover items

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';

describe('Trip lifecycle: complete() persists trip and saves carryover', () => {
  it('complete() marks trip as completed, persists to storage, saves unbought as carryover, returns CompleteTripResult', () => {
    const storage = createNullTripStorage();
    const trip = createTrip(storage);

    trip.start([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
    ]);

    // Add a one-off item
    trip.addItem({
      name: 'Birthday Cake',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'one-off',
      source: 'whiteboard',
    });

    // Check off Milk (staple) and Birthday Cake (one-off) — Bread stays unbought
    trip.checkOff('Milk');
    trip.checkOff('Birthday Cake');

    // Complete the trip
    const result = trip.complete();

    // 1. Result categorizes items correctly
    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0].name).toBe('Milk');

    expect(result.purchasedOneOffs).toHaveLength(1);
    expect(result.purchasedOneOffs[0].name).toBe('Birthday Cake');

    expect(result.unboughtItems).toHaveLength(1);
    expect(result.unboughtItems[0].name).toBe('Bread');

    // 2. Trip persisted with status 'completed'
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('completed');

    // 3. Carryover saved — unbought items with source changed to 'carryover'
    const carryover = storage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0].name).toBe('Bread');
    expect(carryover[0].source).toBe('carryover');
  });
});
