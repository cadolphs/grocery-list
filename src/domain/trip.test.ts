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

  test('subscriber is notified when loadFromStorage updates state', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 2 } },
    ]);
    // Persist initial state
    tripService.checkOff('Milk');
    tripService.uncheckItem('Milk');

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    // Simulate remote change: check off Milk in storage
    const savedTrip = storage.loadTrip()!;
    storage.saveTrip({
      ...savedTrip,
      items: savedTrip.items.map(i =>
        i.name === 'Milk' ? { ...i, checked: true, checkedAt: '2026-04-13T10:00:00Z' } : i
      ),
    });

    tripService.loadFromStorage();

    expect(notifications).toHaveLength(1);
    expect(tripService.getItems().find(i => i.name === 'Milk')?.checked).toBe(true);
  });

  test('loadFromStorage does not notify when state is identical', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 2 } },
    ]);
    // Persist current state
    tripService.checkOff('Milk');
    tripService.uncheckItem('Milk');

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    // Load same state — no change
    tripService.loadFromStorage();

    expect(notifications).toHaveLength(0);
  });

  test('initializeFromStorage persists trip to storage when no saved trip exists', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();

    tripService.initializeFromStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 2 }, id: 'staple-milk' },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: 1 }, id: 'staple-bread' },
    ]);

    // Storage should contain the persisted trip with both items
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.items).toHaveLength(2);
    expect(savedTrip!.items.map(i => i.name)).toEqual(['Milk', 'Bread']);
    expect(savedTrip!.status).toBe('active');
  });

  test('initializeFromStorage persists trip to storage when creating from carryover', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();

    // Set up a completed trip in storage
    storage.saveTrip({
      id: 'old-trip',
      items: [
        { id: 'item-1', name: 'OldItem', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 1 }, itemType: 'staple', stapleId: null, source: 'preloaded', needed: true, checked: true, checkedAt: '2026-04-12T10:00:00Z' },
      ],
      status: 'completed',
      createdAt: '2026-04-12T09:00:00Z',
      completedAreas: [],
    });

    // Set up carryover items
    storage.saveCarryover([
      { id: 'carry-1', name: 'Leftover', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 1 }, itemType: 'one-off', stapleId: null, source: 'carryover', needed: true, checked: false, checkedAt: null },
    ]);

    tripService.initializeFromStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 2 }, id: 'staple-milk' },
    ]);

    // Storage should contain the new trip (not the completed one)
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('active');
    // Should have staple + carryover items
    expect(savedTrip!.items).toHaveLength(2);
    expect(savedTrip!.items.map(i => i.name)).toContain('Milk');
    expect(savedTrip!.items.map(i => i.name)).toContain('Leftover');
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
