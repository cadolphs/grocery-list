// Regression test: TripService.subscribe notifies on external mutations
// Bug: adding an item during sweep via handleStapleChange doesn't update React state
// because tripService has no subscription mechanism for external consumers

import { createTrip, TripService } from './trip';
import { createNullTripStorage, NullTripStorageWithSync } from '../adapters/null/null-trip-storage';

const createTestTripService = (): TripService =>
  createTrip(createNullTripStorage(), ['Fridge', 'Kitchen Cabinets']);

const createTestTripServiceWithStorage = (): { tripService: TripService; storage: NullTripStorageWithSync } => {
  const storage = createNullTripStorage();
  const tripService = createTrip(storage, ['Fridge', 'Kitchen Cabinets']);
  return { tripService, storage };
};

describe('TripService.subscribe', () => {
  test('subscriber is notified when addItem is called', () => {
    const tripService = createTestTripService();
    const notifications: number[] = [];

    tripService.subscribe(() => notifications.push(1));

    tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-1',
    });

    expect(notifications).toHaveLength(1);
  });

  test('subscriber is notified when removeItemByStapleId is called', () => {
    const tripService = createTestTripService();
    tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-1',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    tripService.removeItemByStapleId('staple-1');

    expect(notifications).toHaveLength(1);
  });

  test('item added with stapleId is removed by removeItemByStapleId', () => {
    const tripService = createTestTripService();

    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk-1',
    });

    expect(tripService.getItems()).toHaveLength(1);

    tripService.removeItemByStapleId('staple-milk-1');

    expect(tripService.getItems()).toHaveLength(0);
  });

  test('item added without stapleId is NOT removed by removeItemByStapleId', () => {
    const tripService = createTestTripService();

    tripService.addItem({
      name: 'Random Item',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Snacks', aisleNumber: 3 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    expect(tripService.getItems()).toHaveLength(1);

    tripService.removeItemByStapleId('some-staple-id');

    expect(tripService.getItems()).toHaveLength(1);
  });

  test('addItem persists trip to storage', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);

    tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-1',
    });

    expect(saveTripSpy).toHaveBeenCalledTimes(1);
    const savedTrip = saveTripSpy.mock.calls[0][0] as { items: Array<{ name: string }> };
    expect(savedTrip.items).toHaveLength(1);
    expect(savedTrip.items[0].name).toBe('Bread');
  });

  test('unsubscribe stops notifications', () => {
    const tripService = createTestTripService();
    const notifications: number[] = [];

    const unsubscribe = tripService.subscribe(() => notifications.push(1));
    unsubscribe();

    tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-1',
    });

    expect(notifications).toHaveLength(0);
  });
});
