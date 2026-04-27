// Regression test: TripService.subscribe notifies on external mutations
// Bug: adding an item during sweep via handleStapleChange doesn't update React state
// because tripService has no subscription mechanism for external consumers

import { createTrip, TripService } from './trip';
import { createNullTripStorage, NullTripStorageWithSync } from '../adapters/null/null-trip-storage';

const createTestTripService = (): TripService =>
  createTrip(createNullTripStorage(), () => ['Fridge', 'Kitchen Cabinets']);

const createTestTripServiceWithStorage = (): { tripService: TripService; storage: NullTripStorageWithSync } => {
  const storage = createNullTripStorage();
  const tripService = createTrip(storage, () => ['Fridge', 'Kitchen Cabinets']);
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

  test('addItem rejects duplicate stapleId to prevent duplicate items', () => {
    const tripService = createTestTripService();

    const firstResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk',
    });
    expect(firstResult.success).toBe(true);

    // Attempting to add the same stapleId again should be rejected
    const duplicateResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk',
    });
    expect(duplicateResult.success).toBe(false);
    expect(tripService.getItems()).toHaveLength(1);
  });

  test('addItem rejects duplicate stapleId even when existing item is skipped', () => {
    const tripService = createTestTripService();

    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk',
    });

    // Skip the item (simulates unchecking in checklist)
    tripService.skipItem('Milk');
    expect(tripService.getItems()[0].needed).toBe(false);

    // Attempting to add the same stapleId again should be rejected
    const duplicateResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk',
    });
    expect(duplicateResult.success).toBe(false);
    expect(tripService.getItems()).toHaveLength(1);
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

describe('TripService.removeItemsByStaple — id-then-(name,houseArea) fallback gated to staple-typed items', () => {
  test('id-match path: removes the linked item by stapleId (back-compat parity)', () => {
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

    tripService.removeItemsByStaple({
      id: 'staple-milk-1',
      name: 'Milk',
      houseArea: 'Fridge',
    });

    expect(tripService.getItems()).toHaveLength(0);
  });

  test('fallback path: removes a staple-typed item with stapleId=null when name+houseArea match', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    // Seed an item that has stapleId=null but matches name+houseArea (the bug scenario:
    // legacy/pre-link state in which a staple-typed item is not linked by id yet).
    storage.saveTrip({
      id: 'trip-fallback',
      items: [
        {
          id: 'item-1',
          name: 'Bread',
          houseArea: 'Kitchen Cabinets',
          storeLocation: { section: 'Bakery', aisleNumber: 1 },
          itemType: 'staple',
          stapleId: null,
          source: 'preloaded',
          needed: true,
          checked: false,
          checkedAt: null,
        },
      ],
      status: 'active',
      createdAt: '2026-04-27T10:00:00Z',
      completedAreas: [],
    });
    tripService.loadFromStorage();
    expect(tripService.getItems()).toHaveLength(1);

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    tripService.removeItemsByStaple({
      id: 'staple-bread-2',
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
    });

    expect(tripService.getItems()).toHaveLength(0);
    expect(notifications).toHaveLength(1);
  });

  test('itemType guard: does NOT remove a one-off with matching name+houseArea even if stapleId is null', () => {
    const tripService = createTestTripService();
    tripService.addItem({
      name: 'Birthday Cake',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'one-off',
      source: 'quick-add',
    });
    expect(tripService.getItems()).toHaveLength(1);

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    tripService.removeItemsByStaple({
      id: 'staple-cake-x',
      name: 'Birthday Cake',
      houseArea: 'Kitchen Cabinets',
    });

    // The one-off item must remain — the (name, houseArea) coincidence
    // must not remove non-staple items.
    expect(tripService.getItems()).toHaveLength(1);
    expect(notifications).toHaveLength(0);
  });

  test('no-match early-return: no notify, no persist when nothing matched', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Apples',
      houseArea: 'Fridge',
      storeLocation: { section: 'Produce', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-apples',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    tripService.removeItemsByStaple({
      id: 'unrelated-staple',
      name: 'Bananas',
      houseArea: 'Garage Pantry',
    });

    // Items unchanged.
    expect(tripService.getItems()).toHaveLength(1);
    expect(tripService.getItems()[0].name).toBe('Apples');
    // No subscriber notification.
    expect(notifications).toHaveLength(0);
    // No persistence call.
    expect(saveTripSpy).not.toHaveBeenCalled();
  });

  test('mixed scenario: only the matching name+area staple-typed item is removed; one-off lookalike survives', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    // Two items share (name, houseArea) but differ in itemType. Only the staple-typed
    // one (with stapleId=null) should be removed via fallback.
    storage.saveTrip({
      id: 'trip-mix',
      items: [
        {
          id: 'item-staple-null',
          name: 'Eggs',
          houseArea: 'Fridge',
          storeLocation: { section: 'Dairy', aisleNumber: 2 },
          itemType: 'staple',
          stapleId: null,
          source: 'preloaded',
          needed: true,
          checked: false,
          checkedAt: null,
        },
        {
          id: 'item-oneoff',
          name: 'Eggs',
          houseArea: 'Fridge',
          storeLocation: { section: 'Dairy', aisleNumber: 2 },
          itemType: 'one-off',
          stapleId: null,
          source: 'quick-add',
          needed: true,
          checked: false,
          checkedAt: null,
        },
      ],
      status: 'active',
      createdAt: '2026-04-27T10:00:00Z',
      completedAreas: [],
    });
    tripService.loadFromStorage();
    expect(tripService.getItems()).toHaveLength(2);

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    tripService.removeItemsByStaple({
      id: 'staple-eggs-deleted',
      name: 'Eggs',
      houseArea: 'Fridge',
    });

    const remaining = tripService.getItems();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('item-oneoff');
    expect(remaining[0].itemType).toBe('one-off');
    expect(notifications).toHaveLength(1);
  });
});

describe('TripService.removeItemByStapleId — id-only contract preserved (back-compat)', () => {
  test('no-match early-return: no notify, no persist when stapleId not present', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Apples',
      houseArea: 'Fridge',
      storeLocation: { section: 'Produce', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-apples',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    tripService.removeItemByStapleId('non-existent-staple-id');

    expect(tripService.getItems()).toHaveLength(1);
    expect(notifications).toHaveLength(0);
    expect(saveTripSpy).not.toHaveBeenCalled();
  });
});

describe('TripService.getSweepProgress reads areas live via getter', () => {
  test('totalAreas reflects mutations to the underlying areas array via getter', () => {
    // Arrange — mutable areas array; getter closes over it
    const areas: string[] = ['Fridge', 'Kitchen Cabinets'];
    const areasGetter = (): readonly string[] => areas;
    const tripService = createTrip(createNullTripStorage(), areasGetter);

    // Assert initial state
    expect(tripService.getSweepProgress().totalAreas).toBe(2);

    // Act — mutate the underlying array (simulating user adding a new area
    // to their house areas list without recreating the trip service)
    areas.push('Bathroom');
    areas.push('Garage Pantry');

    // Assert — getSweepProgress reads the live array via the getter
    expect(tripService.getSweepProgress().totalAreas).toBe(4);

    // Act — shrink
    areas.length = 1;

    // Assert — still live
    expect(tripService.getSweepProgress().totalAreas).toBe(1);
  });

  test('empty-getter yields totalAreas 0; later pattern with getter returning 2 yields totalAreas 2', () => {
    const emptyTrip = createTrip(createNullTripStorage(), () => []);
    expect(emptyTrip.getSweepProgress().totalAreas).toBe(0);

    const twoTrip = createTrip(createNullTripStorage(), () => ['A', 'B']);
    expect(twoTrip.getSweepProgress().totalAreas).toBe(2);
  });

  test('allAreasComplete uses the live getter-reported total', () => {
    const areas: string[] = ['Fridge'];
    const tripService = createTrip(createNullTripStorage(), () => areas);

    tripService.completeArea('Fridge');
    expect(tripService.getSweepProgress().allAreasComplete).toBe(true);

    // Add a new area to the source — completion should now be incomplete
    areas.push('Kitchen Cabinets');
    expect(tripService.getSweepProgress().allAreasComplete).toBe(false);
    expect(tripService.getSweepProgress().totalAreas).toBe(2);
  });
});

describe('TripService.syncStapleUpdate persists and notifies', () => {
  test('syncStapleUpdate notifies subscribers and persists to storage when item changes', () => {
    // Arrange — trip with a staple item in storage
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    // Reset notification counter + saveTrip spy AFTER addItem's own calls
    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    // Act — sync staple update with new house area + store location
    tripService.syncStapleUpdate('staple-milk', {
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Dry Goods', aisleNumber: 5 },
    });

    // Assert — subscriber notified exactly once
    expect(notifications).toHaveLength(1);

    // Assert — storage received the updated trip
    expect(saveTripSpy).toHaveBeenCalledTimes(1);
    const savedTrip = saveTripSpy.mock.calls[0][0] as {
      items: ReadonlyArray<{ stapleId: string | null; houseArea: string; storeLocation: { section: string; aisleNumber: number } }>;
    };
    const milk = savedTrip.items.find((i) => i.stapleId === 'staple-milk');
    expect(milk).toBeDefined();
    expect(milk!.houseArea).toBe('Garage Pantry');
    expect(milk!.storeLocation).toEqual({ section: 'Dry Goods', aisleNumber: 5 });
  });

  test('syncStapleUpdate is idempotent: no notify/persist when changes match current item', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    // Act — sync with values equal to current state (no-op)
    tripService.syncStapleUpdate('staple-milk', {
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    });

    // Assert — no notification, no persistence
    expect(notifications).toHaveLength(0);
    expect(saveTripSpy).not.toHaveBeenCalled();
  });

  test('syncStapleUpdate persists when only section changes (aisleNumber unchanged)', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    // Act — section differs, aisleNumber identical
    tripService.syncStapleUpdate('staple-milk', {
      houseArea: 'Fridge',
      storeLocation: { section: 'Cold Storage', aisleNumber: 2 },
    });

    // Assert — must detect the section change and persist
    expect(notifications).toHaveLength(1);
    expect(saveTripSpy).toHaveBeenCalledTimes(1);
    const savedTrip = saveTripSpy.mock.calls[0][0] as {
      items: ReadonlyArray<{ stapleId: string | null; storeLocation: { section: string; aisleNumber: number } }>;
    };
    const milk = savedTrip.items.find((i) => i.stapleId === 'staple-milk');
    expect(milk!.storeLocation).toEqual({ section: 'Cold Storage', aisleNumber: 2 });
  });

  test('syncStapleUpdate persists when only aisleNumber changes (section unchanged)', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    // Act — aisleNumber differs, section identical
    tripService.syncStapleUpdate('staple-milk', {
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 7 },
    });

    // Assert — must detect the aisleNumber change and persist
    expect(notifications).toHaveLength(1);
    expect(saveTripSpy).toHaveBeenCalledTimes(1);
    const savedTrip = saveTripSpy.mock.calls[0][0] as {
      items: ReadonlyArray<{ stapleId: string | null; storeLocation: { section: string; aisleNumber: number } }>;
    };
    const milk = savedTrip.items.find((i) => i.stapleId === 'staple-milk');
    expect(milk!.storeLocation).toEqual({ section: 'Dairy', aisleNumber: 7 });
  });

  test('syncStapleUpdate with unknown stapleId does not notify or persist', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));
    const saveTripSpy = jest.spyOn(storage, 'saveTrip' as any);
    saveTripSpy.mockClear();

    // Act — sync a stapleId that is not present in the trip
    tripService.syncStapleUpdate('unknown-staple-id', {
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Dry Goods', aisleNumber: 5 },
    });

    // Assert — nothing happened
    expect(notifications).toHaveLength(0);
    expect(saveTripSpy).not.toHaveBeenCalled();
  });

  test('syncStapleUpdate changes survive loadFromStorage round-trip', () => {
    // Arrange — trip with staple item
    const { tripService } = createTestTripServiceWithStorage();
    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-milk',
    });

    // Act — sync staple update to new area, then reload from storage
    tripService.syncStapleUpdate('staple-milk', {
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Dry Goods', aisleNumber: 5 },
    });
    tripService.loadFromStorage();

    // Assert — the updated values survive the round-trip (were persisted)
    const milk = tripService.getItems().find((i) => i.stapleId === 'staple-milk');
    expect(milk).toBeDefined();
    expect(milk!.houseArea).toBe('Garage Pantry');
    expect(milk!.storeLocation).toEqual({ section: 'Dry Goods', aisleNumber: 5 });
  });
});
