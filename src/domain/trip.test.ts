// Regression test: TripService.subscribe notifies on external mutations
// Bug: adding an item during sweep via handleStapleChange doesn't update React state
// because tripService has no subscription mechanism for external consumers

import { createTrip, StapleInput, TripService } from './trip';
import { SweepDecision, Trip, TripItem } from './types';
import { TripStorage } from '../ports/trip-storage';
import {
  createNullTripStorage,
  NullTripStorageWithSync,
} from '../adapters/null/null-trip-storage';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

const createTestTripService = (): TripService =>
  createTrip(createNullTripStorage(), () => ['Fridge', 'Kitchen Cabinets']);

const createTestTripServiceWithStorage = (): {
  tripService: TripService;
  storage: NullTripStorageWithSync;
} => {
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

  // HomeView and StoreView are mounted together (AppShell) with separate
  // useTrip state, so every decision/checked mutation must notify or the other
  // view goes stale (#61: a Not needed item still listed in store view).
  test.each([
    [
      'setDecision Not needed',
      (t: TripService) => t.setDecision(itemIdNamed(t, 'Bread'), 'not-needed'),
    ],
    [
      'setDecision Needed',
      (t: TripService) => t.setDecision(itemIdNamed(t, 'Bread'), 'needed'),
    ],
    ['checkOff', (t: TripService) => t.checkOff(itemIdNamed(t, 'Bread'))],
    ['uncheckItem', (t: TripService) => t.uncheckItem(itemIdNamed(t, 'Bread'))],
  ])('subscriber is notified when %s is called', (_name, mutate) => {
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

    mutate(tripService);

    expect(notifications).toHaveLength(1);
  });

  // Sweep progress (completed areas) and the reset also feed every useTrip
  // instance, so these must notify as well.
  test.each([
    ['markAreaDone', (t: TripService) => t.markAreaDone('Fridge')],
    ['undoArea', (t: TripService) => t.undoArea('Fridge')],
    [
      'resetSweep',
      (t: TripService) =>
        t.resetSweep([
          {
            name: 'Bread',
            houseArea: 'Kitchen Cabinets',
            storeLocation: { section: 'Bakery', aisleNumber: 1 },
          },
        ]),
    ],
  ])('subscriber is notified when %s is called', (_name, mutate) => {
    const tripService = createTestTripService();
    tripService.markAreaDone('Fridge');

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    mutate(tripService);

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
    const savedTrip = saveTripSpy.mock.calls[0]![0] as {
      items: Array<{ name: string }>;
    };
    expect(savedTrip.items).toHaveLength(1);
    expect(savedTrip.items[0]!.name).toBe('Bread');
  });

  test('subscriber is notified when loadFromStorage updates state', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 2 },
      },
    ]);

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    // Simulate remote change: check off Milk in storage
    const savedTrip = storage.loadTrip()!;
    storage.saveTrip({
      ...savedTrip,
      items: savedTrip.items.map((i) =>
        i.name === 'Milk'
          ? { ...i, checked: true, checkedAt: '2026-04-13T10:00:00Z' }
          : i,
      ),
    });

    tripService.loadFromStorage();

    expect(notifications).toHaveLength(1);
    expect(tripService.getItems().find((i) => i.name === 'Milk')?.checked).toBe(
      true,
    );
  });

  test('loadFromStorage does not notify when state is identical', () => {
    const { tripService } = createTestTripServiceWithStorage();
    tripService.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 2 },
      },
    ]);

    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    // Load same state — no change
    tripService.loadFromStorage();

    expect(notifications).toHaveLength(0);
  });

  test('initializeFromStorage persists trip to storage when no saved trip exists', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();

    tripService.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 2 },
        id: 'staple-milk',
      },
      {
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
        id: 'staple-bread',
      },
    ]);

    // Storage should contain the persisted trip with both items
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.items).toHaveLength(2);
    expect(savedTrip!.items.map((i) => i.name)).toEqual(['Milk', 'Bread']);
    expect(savedTrip!.status).toBe('active');
  });

  test('initializeFromStorage persists trip to storage when creating from carryover', () => {
    const { tripService, storage } = createTestTripServiceWithStorage();

    // Set up a completed trip in storage
    storage.saveTrip({
      id: 'old-trip',
      items: [
        {
          id: 'item-1',
          name: 'OldItem',
          houseArea: 'Fridge',
          storeLocation: { section: 'Dairy', aisleNumber: 1 },
          itemType: 'staple',
          stapleId: null,
          source: 'preloaded',
          decision: 'needed',
          checked: true,
          checkedAt: '2026-04-12T10:00:00Z',
        },
      ],
      status: 'completed',
      createdAt: '2026-04-12T09:00:00Z',
    });

    // Set up carryover items
    storage.saveCarryover([
      {
        id: 'carry-1',
        name: 'Leftover',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 1 },
        itemType: 'one-off',
        stapleId: null,
        source: 'carryover',
        decision: 'needed',
        checked: false,
        checkedAt: null,
      },
    ]);

    tripService.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 2 },
        id: 'staple-milk',
      },
    ]);

    // Storage should contain the new trip (not the completed one)
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('active');
    // Should have staple + carryover items
    expect(savedTrip!.items).toHaveLength(2);
    expect(savedTrip!.items.map((i) => i.name)).toContain('Milk');
    expect(savedTrip!.items.map((i) => i.name)).toContain('Leftover');
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

  test('addItem rejects duplicate stapleId even when existing item is Not needed', () => {
    const tripService = createTestTripService();

    tripService.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      stapleId: 'staple-milk',
    });

    // Mark it Not needed (simulates unchecking in checklist)
    tripService.setDecision(itemIdNamed(tripService, 'Milk'), 'not-needed');
    expect(tripService.getItems()[0]!.decision).toBe('not-needed');

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

  test('addItem rejects stapleId-less staple duplicate by (name, houseArea) fallback', () => {
    // Defense-in-depth: callers passing itemType='staple' without stapleId
    // must still be blocked when an existing staple shares (name, houseArea).
    // Mirrors matchesStapleIdentity semantics on the remove path.
    const tripService = createTestTripService();

    const seedResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Kitchen',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 's1',
    });
    expect(seedResult.success).toBe(true);

    const duplicateResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Kitchen',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'whiteboard',
      // intentionally NO stapleId — the fallback guard must still catch this
    });

    expect(duplicateResult).toEqual({
      success: false,
      error: 'staple already in trip',
    });
    expect(tripService.getItems()).toHaveLength(1);
  });

  test('addItem allows a one-off with the same (name, houseArea) as an existing staple', () => {
    // Negative control: the fallback guard is gated to itemType==='staple'.
    // A one-off sharing name+houseArea with a staple must NOT be rejected.
    const tripService = createTestTripService();

    tripService.addItem({
      name: 'Milk',
      houseArea: 'Kitchen',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 's1',
    });

    const oneOffResult = tripService.addItem({
      name: 'Milk',
      houseArea: 'Kitchen',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'one-off',
      source: 'whiteboard',
    });

    expect(oneOffResult.success).toBe(true);
    expect(tripService.getItems()).toHaveLength(2);
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
          decision: 'needed',
          checked: false,
          checkedAt: null,
        },
      ],
      status: 'active',
      createdAt: '2026-04-27T10:00:00Z',
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
    expect(tripService.getItems()[0]!.name).toBe('Apples');
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
          decision: 'needed',
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
          decision: 'needed',
          checked: false,
          checkedAt: null,
        },
      ],
      status: 'active',
      createdAt: '2026-04-27T10:00:00Z',
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
    expect(remaining[0]!.id).toBe('item-oneoff');
    expect(remaining[0]!.itemType).toBe('one-off');
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
    tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'preloaded',
    });
    tripService.setDecision(itemIdNamed(tripService, 'Bread'), 'undecided');
    expect(tripService.getSweepProgress().allAreasComplete).toBe(true);

    // Add the area holding an Undecided staple — completion is now incomplete
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
    const savedTrip = saveTripSpy.mock.calls[0]![0] as {
      items: ReadonlyArray<{
        stapleId: string | null;
        houseArea: string;
        storeLocation: { section: string; aisleNumber: number };
      }>;
    };
    const milk = savedTrip.items.find((i) => i.stapleId === 'staple-milk');
    expect(milk).toBeDefined();
    expect(milk!.houseArea).toBe('Garage Pantry');
    expect(milk!.storeLocation).toEqual({
      section: 'Dry Goods',
      aisleNumber: 5,
    });
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
    const savedTrip = saveTripSpy.mock.calls[0]![0] as {
      items: ReadonlyArray<{
        stapleId: string | null;
        storeLocation: { section: string; aisleNumber: number };
      }>;
    };
    const milk = savedTrip.items.find((i) => i.stapleId === 'staple-milk');
    expect(milk!.storeLocation).toEqual({
      section: 'Cold Storage',
      aisleNumber: 2,
    });
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
    const savedTrip = saveTripSpy.mock.calls[0]![0] as {
      items: ReadonlyArray<{
        stapleId: string | null;
        storeLocation: { section: string; aisleNumber: number };
      }>;
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
    const milk = tripService
      .getItems()
      .find((i) => i.stapleId === 'staple-milk');
    expect(milk).toBeDefined();
    expect(milk!.houseArea).toBe('Garage Pantry');
    expect(milk!.storeLocation).toEqual({
      section: 'Dry Goods',
      aisleNumber: 5,
    });
  });
});

// --- Regression: RCA fix-offline-staple-cache-wipe, cause F2 ---
// On a cold start an empty staple list can mean "no staples exist" OR
// "staples have not loaded yet". The completed branch of initializeFromStorage
// used to trust the empty list, rebuild an empty trip and persist it over the
// durable mirror. The guard refuses exactly one combination: a completed
// stored trip that still holds items, rebuilt from zero staples and zero
// carryover. Every other corner of the decision cube keeps today's behaviour,
// so the matrix below drives all 16 combinations exhaustively.

const STORED_TRIP_ID = 'stored-trip';

const storedTripItem: TripItem = {
  id: 'stored-item-1',
  name: 'StoredMilk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 1 },
  itemType: 'staple',
  stapleId: 'staple-milk',
  source: 'preloaded',
  decision: 'needed',
  checked: false,
  checkedAt: null,
};

const carryoverTripItem: TripItem = {
  id: 'carry-1',
  name: 'Leftover',
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section: 'Bakery', aisleNumber: 4 },
  itemType: 'one-off',
  stapleId: null,
  source: 'carryover',
  decision: 'needed',
  checked: false,
  checkedAt: null,
};

const breadStaple: StapleInput = {
  id: 'staple-bread',
  name: 'Bread',
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section: 'Bakery', aisleNumber: 2 },
};

type StoredTripState =
  'absent' | 'completed-with-items' | 'completed-empty' | 'active';
type ListState = 'empty' | 'non-empty';

const storedTripFor = (state: StoredTripState): Trip | null => {
  switch (state) {
    case 'absent':
      return null;
    case 'completed-with-items':
      return {
        id: STORED_TRIP_ID,
        items: [storedTripItem],
        status: 'completed',
        createdAt: '2026-04-12T09:00:00Z',
      };
    case 'completed-empty':
      return {
        id: STORED_TRIP_ID,
        items: [],
        status: 'completed',
        createdAt: '2026-04-12T09:00:00Z',
      };
    case 'active':
      return {
        id: STORED_TRIP_ID,
        items: [storedTripItem],
        status: 'active',
        createdAt: '2026-04-12T09:00:00Z',
      };
  }
};

// Full observable universe of one initializeFromStorage call: what the user
// sees, what was written to the durable mirror, and how often it was written.
type InitializeOutcome = {
  readonly visibleItemNames: readonly string[];
  readonly saveTripCalls: number;
  readonly clearCarryoverCalls: number;
  readonly storedTripIdentity: 'none' | 'same-as-stored' | 'newly-generated';
  readonly storedTripStatus: 'none' | 'active' | 'completed';
  readonly storedTripItemNames: readonly string[];
  readonly remainingCarryoverNames: readonly string[];
};

const runInitializeFromStorage = (
  storedTripState: StoredTripState,
  staples: readonly StapleInput[],
  carryover: readonly TripItem[],
): InitializeOutcome => {
  const mirror = createNullTripStorage();
  const storedTrip = storedTripFor(storedTripState);
  if (storedTrip) mirror.saveTrip(storedTrip);
  mirror.saveCarryover(carryover);

  let saveTripCalls = 0;
  let clearCarryoverCalls = 0;
  const countingStorage: TripStorage = {
    ...mirror,
    saveTrip: (trip: Trip) => {
      saveTripCalls += 1;
      mirror.saveTrip(trip);
    },
    clearCarryover: () => {
      clearCarryoverCalls += 1;
      mirror.clearCarryover();
    },
  };

  const tripService = createTrip(countingStorage, () => [
    'Fridge',
    'Kitchen Cabinets',
  ]);
  tripService.initializeFromStorage(staples);

  const persisted = mirror.loadTrip();
  const identity = (): InitializeOutcome['storedTripIdentity'] => {
    if (persisted === null) return 'none';
    return persisted.id === STORED_TRIP_ID
      ? 'same-as-stored'
      : 'newly-generated';
  };

  return {
    visibleItemNames: tripService.getItems().map((item) => item.name),
    saveTripCalls,
    clearCarryoverCalls,
    storedTripIdentity: identity(),
    storedTripStatus: persisted === null ? 'none' : persisted.status,
    storedTripItemNames:
      persisted === null ? [] : persisted.items.map((item) => item.name),
    remainingCarryoverNames: mirror.loadCarryover().map((item) => item.name),
  };
};

// A rebuild always mints a new trip id, persists exactly once, and leaves the
// mirror holding an active trip whose items are the rebuilt list.
const rebuiltTrip = (
  itemNames: readonly string[],
  clearCarryoverCalls: number,
  remainingCarryoverNames: readonly string[],
): InitializeOutcome => ({
  visibleItemNames: itemNames,
  saveTripCalls: 1,
  clearCarryoverCalls,
  storedTripIdentity: 'newly-generated',
  storedTripStatus: 'active',
  storedTripItemNames: itemNames,
  remainingCarryoverNames,
});

// The stored trip is adopted in memory: nothing written, nothing cleared,
// the mirror keeps its id, status and items.
const storedTripAdoptedUntouched = (
  itemNames: readonly string[],
  storedTripStatus: 'active' | 'completed',
  remainingCarryoverNames: readonly string[],
): InitializeOutcome => ({
  visibleItemNames: itemNames,
  saveTripCalls: 0,
  clearCarryoverCalls: 0,
  storedTripIdentity: 'same-as-stored',
  storedTripStatus,
  storedTripItemNames: itemNames,
  remainingCarryoverNames,
});

type InitializeCase = {
  readonly storedTrip: StoredTripState;
  readonly staples: ListState;
  readonly carryover: ListState;
  readonly expected: InitializeOutcome;
};

const initializeCases: readonly InitializeCase[] = [
  // No stored trip: fresh-start rebuild, carryover untouched by this branch.
  {
    storedTrip: 'absent',
    staples: 'empty',
    carryover: 'empty',
    expected: rebuiltTrip([], 0, []),
  },
  {
    storedTrip: 'absent',
    staples: 'empty',
    carryover: 'non-empty',
    expected: rebuiltTrip([], 0, ['Leftover']),
  },
  {
    storedTrip: 'absent',
    staples: 'non-empty',
    carryover: 'empty',
    expected: rebuiltTrip(['Bread'], 0, []),
  },
  {
    storedTrip: 'absent',
    staples: 'non-empty',
    carryover: 'non-empty',
    expected: rebuiltTrip(['Bread'], 0, ['Leftover']),
  },

  // Completed trip that still holds items: the single refused combination.
  {
    storedTrip: 'completed-with-items',
    staples: 'empty',
    carryover: 'empty',
    expected: storedTripAdoptedUntouched(['StoredMilk'], 'completed', []),
  },
  {
    storedTrip: 'completed-with-items',
    staples: 'empty',
    carryover: 'non-empty',
    expected: rebuiltTrip(['Leftover'], 1, []),
  },
  {
    storedTrip: 'completed-with-items',
    staples: 'non-empty',
    carryover: 'empty',
    expected: rebuiltTrip(['Bread'], 1, []),
  },
  {
    storedTrip: 'completed-with-items',
    staples: 'non-empty',
    carryover: 'non-empty',
    expected: rebuiltTrip(['Bread', 'Leftover'], 1, []),
  },

  // Completed trip with nothing to lose: a genuine new user is never refused.
  {
    storedTrip: 'completed-empty',
    staples: 'empty',
    carryover: 'empty',
    expected: rebuiltTrip([], 1, []),
  },
  {
    storedTrip: 'completed-empty',
    staples: 'empty',
    carryover: 'non-empty',
    expected: rebuiltTrip(['Leftover'], 1, []),
  },
  {
    storedTrip: 'completed-empty',
    staples: 'non-empty',
    carryover: 'empty',
    expected: rebuiltTrip(['Bread'], 1, []),
  },
  {
    storedTrip: 'completed-empty',
    staples: 'non-empty',
    carryover: 'non-empty',
    expected: rebuiltTrip(['Bread', 'Leftover'], 1, []),
  },

  // Active trip: always adopted, never rebuilt, for every input combination.
  {
    storedTrip: 'active',
    staples: 'empty',
    carryover: 'empty',
    expected: storedTripAdoptedUntouched(['StoredMilk'], 'active', []),
  },
  {
    storedTrip: 'active',
    staples: 'empty',
    carryover: 'non-empty',
    expected: storedTripAdoptedUntouched(['StoredMilk'], 'active', [
      'Leftover',
    ]),
  },
  {
    storedTrip: 'active',
    staples: 'non-empty',
    carryover: 'empty',
    expected: storedTripAdoptedUntouched(['StoredMilk'], 'active', []),
  },
  {
    storedTrip: 'active',
    staples: 'non-empty',
    carryover: 'non-empty',
    expected: storedTripAdoptedUntouched(['StoredMilk'], 'active', [
      'Leftover',
    ]),
  },
];

describe('initializeFromStorage refuses a completed-trip rebuild that would erase the stored item list', () => {
  test.each(initializeCases)(
    'stored trip $storedTrip, staples $staples, carryover $carryover',
    ({ storedTrip, staples, carryover, expected }) => {
      const outcome = runInitializeFromStorage(
        storedTrip,
        staples === 'empty' ? [] : [breadStaple],
        carryover === 'empty' ? [] : [carryoverTripItem],
      );

      expect(outcome).toEqual(expected);
    },
  );

  test('deliberately pinned: with a completed stored trip holding items, deleting every staple restores that trip instead of a fresh empty trip, and storage is still not written (recovery is Reset Sweep)', () => {
    const outcome = runInitializeFromStorage('completed-with-items', [], []);

    expect(outcome.visibleItemNames).toEqual(['StoredMilk']);
    expect(outcome.saveTripCalls).toBe(0);
    expect(outcome.storedTripItemNames).toEqual(['StoredMilk']);
  });
});

// ADR-013: every trip item carries a sweep decision.
describe('TripService sweep decision', () => {
  const bread = {
    name: 'Bread',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Bakery', aisleNumber: 1 },
    itemType: 'staple' as const,
    source: 'preloaded' as const,
    stapleId: 'staple-1',
  };

  const decisionsOf = (tripService: TripService) =>
    tripService.getItems().map(({ name, decision }) => ({ name, decision }));

  test('an added staple is Needed', () => {
    const tripService = createTestTripService();

    tripService.addItem(bread);

    expect(decisionsOf(tripService)).toEqual([
      { name: 'Bread', decision: 'needed' },
    ]);
  });

  test('decision holds through start, check, complete, carryover and reset', () => {
    const storage = createNullTripStorage();
    const staples = [
      { ...bread, id: 'staple-1' },
      {
        id: 'staple-2',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 2 },
      },
    ];
    const firstTrip = createTrip(storage, () => ['Fridge', 'Kitchen Cabinets']);
    firstTrip.initializeFromStorage(staples);
    // #96: staples start Undecided; the sweep marks both Needed.
    firstTrip.setDecision(itemIdNamed(firstTrip, 'Bread'), 'needed');
    firstTrip.setDecision(itemIdNamed(firstTrip, 'Milk'), 'needed');
    firstTrip.addItem({
      name: 'Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Home', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });
    firstTrip.checkOff(itemIdNamed(firstTrip, 'Bread'));
    const afterCheck = decisionsOf(firstTrip);
    firstTrip.complete();

    const nextTrip = createTrip(storage, () => ['Fridge', 'Kitchen Cabinets']);
    nextTrip.initializeFromStorage(staples);
    const afterCarryover = decisionsOf(nextTrip);
    nextTrip.setDecision(itemIdNamed(nextTrip, 'Milk'), 'not-needed');
    nextTrip.resetSweep(staples);

    const needed = (name: string) => ({
      name,
      decision: 'needed',
    });
    expect(afterCheck).toEqual([
      needed('Bread'),
      needed('Milk'),
      needed('Candles'),
    ]);
    // Unbought Milk and Candles carry over still Needed.
    expect(afterCarryover).toContainEqual(needed('Milk'));
    expect(afterCarryover).toContainEqual(needed('Candles'));
    // #96: Reset Sweep returns every staple to Undecided.
    const undecided = (name: string) => ({
      name,
      decision: 'undecided',
    });
    expect(decisionsOf(nextTrip)).toEqual([
      undecided('Bread'),
      undecided('Milk'),
    ]);
  });
});

// #93: a sweep row moves along Not needed ‹ Undecided › Needed, one position
// per step, stopping at the ends; set decision lands directly.
describe('TripService step and set decision', () => {
  const bread = {
    name: 'Bread',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Bakery', aisleNumber: 1 },
    itemType: 'staple' as const,
    source: 'preloaded' as const,
    stapleId: 'staple-1',
  };

  const breadIn = (
    decision: SweepDecision,
  ): { tripService: TripService; storage: NullTripStorageWithSync } => {
    const { tripService, storage } = createTestTripServiceWithStorage();
    tripService.addItem(bread);
    tripService.setDecision(itemIdNamed(tripService, 'Bread'), decision);
    return { tripService, storage };
  };

  const breadState = (tripService: TripService) => {
    const item = tripService.getItems().find((i) => i.name === 'Bread');
    return { decision: item?.decision };
  };

  const state = (decision: SweepDecision) => ({ decision });

  test.each<[SweepDecision, SweepDecision]>([
    ['not-needed', 'undecided'],
    ['undecided', 'needed'],
    ['needed', 'needed'],
  ])('step toward Needed from %s yields %s', (from, to) => {
    const { tripService } = breadIn(from);

    tripService.stepTowardNeeded(itemIdNamed(tripService, 'Bread'));

    expect(breadState(tripService)).toEqual(state(to));
  });

  test.each<[SweepDecision, SweepDecision]>([
    ['needed', 'undecided'],
    ['undecided', 'not-needed'],
    ['not-needed', 'not-needed'],
  ])('step toward Not needed from %s yields %s', (from, to) => {
    const { tripService } = breadIn(from);

    tripService.stepTowardNotNeeded(itemIdNamed(tripService, 'Bread'));

    expect(breadState(tripService)).toEqual(state(to));
  });

  test.each<[SweepDecision, SweepDecision]>([
    ['not-needed', 'needed'],
    ['needed', 'not-needed'],
    ['needed', 'undecided'],
  ])('set decision from %s lands directly on %s', (from, to) => {
    const { tripService } = breadIn(from);

    tripService.setDecision(itemIdNamed(tripService, 'Bread'), to);

    expect(breadState(tripService)).toEqual(state(to));
  });

  test('a step is persisted and notifies subscribers', () => {
    const { tripService, storage } = breadIn('needed');
    const notifications: number[] = [];
    tripService.subscribe(() => notifications.push(1));

    tripService.stepTowardNotNeeded(itemIdNamed(tripService, 'Bread'));

    expect(notifications).toHaveLength(1);
    const stored = storage.loadTrip()?.items.find((i) => i.name === 'Bread');
    expect(stored).toMatchObject(state('undecided'));
  });

  test('stepping one item leaves the others alone', () => {
    const { tripService } = breadIn('needed');
    tripService.addItem({ ...bread, name: 'Milk', stapleId: 'staple-2' });

    tripService.stepTowardNotNeeded(itemIdNamed(tripService, 'Bread'));

    const milk = tripService.getItems().find((i) => i.name === 'Milk');
    expect(milk).toMatchObject(state('needed'));
  });

  // Spec #90 story 35: the library allows one name in several house areas,
  // and deciding the row in one area leaves the other area's row alone.
  test.each<[string, (t: TripService, id: string) => void]>([
    ['set decision', (t, id) => t.setDecision(id, 'needed')],
    ['step toward Needed', (t, id) => t.stepTowardNeeded(id)],
    ['step toward Not needed', (t, id) => t.stepTowardNotNeeded(id)],
  ])(
    '%s on one row leaves a same-named row in another area alone',
    (_, decide) => {
      const tripService = createTestTripService();
      tripService.addItem({ ...bread, decision: 'undecided' });
      tripService.addItem({
        ...bread,
        houseArea: 'Fridge',
        stapleId: 'staple-2',
        decision: 'undecided',
      });
      const [cabinetBread] = tripService.getItems();

      decide(tripService, cabinetBread!.id);

      const decisions = tripService
        .getItems()
        .map((i) => [i.houseArea, i.decision === 'undecided']);
      expect(decisions).toEqual([
        ['Kitchen Cabinets', false],
        ['Fridge', true],
      ]);
    },
  );

  test('checking one row into the cart leaves a same-named row in another area alone', () => {
    const tripService = createTestTripService();
    tripService.addItem(bread);
    tripService.addItem({
      ...bread,
      houseArea: 'Fridge',
      stapleId: 'staple-2',
    });
    const [cabinetBread] = tripService.getItems();

    tripService.checkOff(cabinetBread!.id);
    const afterCheck = tripService.getItems().map((i) => i.checked);
    tripService.uncheckItem(cabinetBread!.id);

    expect(afterCheck).toEqual([true, false]);
    expect(tripService.getItems().map((i) => i.checked)).toEqual([
      false,
      false,
    ]);
  });
});

// #96: the trip lifecycle runs on decisions. A new trip starts every staple
// Undecided; one-offs are always Needed; Finish Trip carries over exactly the
// Needed items not in the cart; Reset Sweep returns staples to Undecided.
describe('TripService lifecycle on decisions (#96)', () => {
  const areas = () => ['Fridge', 'Kitchen Cabinets'];
  const milk: StapleInput = {
    id: 'staple-milk',
    name: 'Milk',
    houseArea: 'Fridge',
    storeLocation: { section: 'Dairy', aisleNumber: 2 },
  };
  const eggs: StapleInput = {
    id: 'staple-eggs',
    name: 'Eggs',
    houseArea: 'Fridge',
    storeLocation: { section: 'Dairy', aisleNumber: 2 },
  };
  const bread: StapleInput = {
    id: 'staple-bread',
    name: 'Bread',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Bakery', aisleNumber: 1 },
  };
  const rice: StapleInput = {
    id: 'staple-rice',
    name: 'Rice',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Grains', aisleNumber: 5 },
  };
  const candles = {
    name: 'Candles',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Home', aisleNumber: null },
    itemType: 'one-off' as const,
    source: 'quick-add' as const,
  };

  const decisions = (tripService: TripService) =>
    Object.fromEntries(
      tripService.getItems().map((i) => [i.name, i.decision] as const),
    );

  const startedWith = (staples: StapleInput[]) => {
    const storage = createNullTripStorage();
    const tripService = createTrip(storage, areas);
    tripService.initializeFromStorage(staples);
    return { storage, tripService };
  };

  test('a new trip starts every staple Undecided', () => {
    const { tripService } = startedWith([milk, bread]);

    expect(decisions(tripService)).toEqual({
      Milk: 'undecided',
      Bread: 'undecided',
    });
  });

  test('a one-off is Needed and stays Needed whatever the sweep does to it', () => {
    const { tripService } = startedWith([]);
    tripService.addItem(candles);
    const onAdd = decisions(tripService);

    tripService.setDecision(itemIdNamed(tripService, 'Candles'), 'not-needed');
    tripService.stepTowardNotNeeded(itemIdNamed(tripService, 'Candles'));
    tripService.setDecision(itemIdNamed(tripService, 'Candles'), 'not-needed');

    expect(onAdd).toEqual({ Candles: 'needed' });
    expect(decisions(tripService)).toEqual({ Candles: 'needed' });
    expect(tripService.getItems()[0]!.decision).toBe('needed');
  });

  const finishTripWith = () => {
    const { storage, tripService } = startedWith([milk, eggs, bread, rice]);
    tripService.addItem(candles);
    tripService.setDecision(itemIdNamed(tripService, 'Milk'), 'needed'); // Needed, not in cart
    tripService.setDecision(itemIdNamed(tripService, 'Eggs'), 'needed'); // Needed, in cart
    tripService.checkOff(itemIdNamed(tripService, 'Eggs'));
    tripService.setDecision(itemIdNamed(tripService, 'Bread'), 'not-needed');
    // Rice stays Undecided
    const result = tripService.complete();
    return { storage, result };
  };

  test('Finish Trip carries over exactly the Needed items not in the cart', () => {
    const { storage, result } = finishTripWith();

    const carried = storage.loadCarryover().map((i) => [i.name, i.decision]);
    expect(carried).toEqual([
      ['Milk', 'needed'],
      ['Candles', 'needed'],
    ]);
    expect(result.unboughtItems.map((i) => i.name)).toEqual([
      'Milk',
      'Candles',
    ]);
  });

  test('the next trip has the carried-over items Needed, once each, and every other staple Undecided', () => {
    const { storage } = finishTripWith();

    const nextTrip = createTrip(storage, areas);
    nextTrip.initializeFromStorage([milk, eggs, bread, rice]);

    expect(
      nextTrip
        .getItems()
        .map((i) => i.name)
        .sort(),
    ).toEqual(['Bread', 'Candles', 'Eggs', 'Milk', 'Rice']);
    expect(decisions(nextTrip)).toEqual({
      Milk: 'needed',
      Eggs: 'undecided',
      Bread: 'undecided',
      Rice: 'undecided',
      Candles: 'needed',
    });
  });

  test('Reset Sweep returns every staple to Undecided and drops one-offs', () => {
    const { tripService } = startedWith([milk, bread]);
    tripService.addItem(candles);
    tripService.setDecision(itemIdNamed(tripService, 'Milk'), 'needed');
    tripService.setDecision(itemIdNamed(tripService, 'Bread'), 'not-needed');

    tripService.resetSweep([milk, bread]);

    expect(decisions(tripService)).toEqual({
      Milk: 'undecided',
      Bread: 'undecided',
    });
  });

  test('a quick-added staple starts Needed; a library-added staple starts Undecided', () => {
    const { tripService } = startedWith([]);

    tripService.addItem({
      name: 'Butter',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
      itemType: 'staple',
      source: 'quick-add',
      stapleId: 'staple-butter',
    });
    tripService.addItem({
      name: 'Jam',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Spreads', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-jam',
      decision: 'undecided',
    });

    expect(decisions(tripService)).toEqual({
      Butter: 'needed',
      Jam: 'undecided',
    });
  });

  test.each<SweepDecision>(['undecided', 'needed', 'not-needed'])(
    'a staple deleted from the library leaves the trip when %s',
    (decision) => {
      const { tripService } = startedWith([milk, bread]);
      tripService.setDecision(itemIdNamed(tripService, 'Milk'), decision);

      tripService.removeItemsByStaple({
        id: 'staple-milk',
        name: 'Milk',
        houseArea: 'Fridge',
      });

      expect(decisions(tripService)).toEqual({ Bread: 'undecided' });
    },
  );
});

// #95: an area is complete exactly when it holds no Undecided staple; nothing
// is stored for it. Done and Undo move a whole area between Undecided and Not
// needed and never touch Needed staples or other areas.
describe('TripService derived area completion, Done and Undo', () => {
  const staple = (name: string, houseArea: string) => ({
    name,
    houseArea,
    storeLocation: { section: 'Aisle', aisleNumber: 1 },
    itemType: 'staple' as const,
    source: 'preloaded' as const,
    stapleId: `staple-${name}`,
  });

  // Fridge: Milk, Eggs, Butter. Kitchen Cabinets: Bread. Bathroom is empty.
  const sweepWith = (
    decisions: Readonly<Record<string, SweepDecision>>,
  ): TripService => {
    const tripService = createTrip(createNullTripStorage(), () => [
      'Fridge',
      'Kitchen Cabinets',
      'Bathroom',
    ]);
    tripService.addItem(staple('Milk', 'Fridge'));
    tripService.addItem(staple('Eggs', 'Fridge'));
    tripService.addItem(staple('Butter', 'Fridge'));
    tripService.addItem(staple('Bread', 'Kitchen Cabinets'));
    Object.entries(decisions).forEach(([name, decision]) =>
      tripService.setDecision(itemIdNamed(tripService, name), decision),
    );
    return tripService;
  };

  const decisionsOf = (tripService: TripService) =>
    Object.fromEntries(
      tripService.getItems().map((item) => [item.name, item.decision]),
    );

  test('an area with an Undecided staple is incomplete; empty and fully decided areas are complete', () => {
    const tripService = sweepWith({ Milk: 'undecided', Bread: 'not-needed' });

    expect(tripService.getSweepProgress()).toMatchObject({
      completedAreas: ['Kitchen Cabinets', 'Bathroom'],
      completedCount: 2,
      totalAreas: 3,
      allAreasComplete: false,
    });
  });

  test('an area flips to incomplete the moment a row returns to Undecided', () => {
    const tripService = sweepWith({});
    const before = tripService.getSweepProgress().completedAreas;

    tripService.stepTowardNotNeeded(itemIdNamed(tripService, 'Eggs'));

    expect(before).toEqual(['Fridge', 'Kitchen Cabinets', 'Bathroom']);
    expect(tripService.getSweepProgress().completedAreas).toEqual([
      'Kitchen Cabinets',
      'Bathroom',
    ]);
  });

  test('every area complete reads as all areas complete', () => {
    const tripService = sweepWith({ Milk: 'not-needed' });

    expect(tripService.getSweepProgress()).toMatchObject({
      completedCount: 3,
      allAreasComplete: true,
    });
  });

  test('progress counts the Undecided staples in each area', () => {
    const tripService = sweepWith({
      Milk: 'undecided',
      Eggs: 'undecided',
      Bread: 'undecided',
    });

    expect(tripService.getSweepProgress().undecidedCountByArea).toEqual({
      Fridge: 2,
      'Kitchen Cabinets': 1,
      Bathroom: 0,
    });
  });

  test('Done makes every Undecided staple in the area Not needed and leaves Needed and other areas alone', () => {
    const tripService = sweepWith({
      Milk: 'undecided',
      Eggs: 'undecided',
      Bread: 'undecided',
    });

    tripService.markAreaDone('Fridge');

    expect(decisionsOf(tripService)).toEqual({
      Milk: 'not-needed',
      Eggs: 'not-needed',
      Butter: 'needed',
      Bread: 'undecided',
    });
    expect(tripService.getSweepProgress().completedAreas).toContain('Fridge');
  });

  test('Undo returns every Not needed staple in the area to Undecided and leaves Needed and other areas alone', () => {
    const tripService = sweepWith({
      Milk: 'not-needed',
      Eggs: 'not-needed',
      Bread: 'not-needed',
    });

    tripService.undoArea('Fridge');

    expect(decisionsOf(tripService)).toEqual({
      Milk: 'undecided',
      Eggs: 'undecided',
      Butter: 'needed',
      Bread: 'not-needed',
    });
    expect(tripService.getSweepProgress().completedAreas).not.toContain(
      'Fridge',
    );
  });

  test('Done persists the decisions it writes', () => {
    const storage = createNullTripStorage();
    const tripService = createTrip(storage, () => ['Fridge']);
    tripService.addItem(staple('Milk', 'Fridge'));
    tripService.setDecision(itemIdNamed(tripService, 'Milk'), 'undecided');

    tripService.markAreaDone('Fridge');

    const stored = storage.loadTrip();
    expect(stored?.items[0]).toMatchObject({
      decision: 'not-needed',
    });
    expect(stored).not.toHaveProperty('completedAreas');
  });
});
