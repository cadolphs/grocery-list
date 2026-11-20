/**
 * US-07: Prevent Duplicate Trip Items from Concurrent Local and Remote Adds
 *
 * Focused acceptance scenarios for duplicate prevention.
 * Tests exercise driving ports: TripService.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import {
  initializeApp,
  AdapterFactories,
} from '../../../src/hooks/useAppInitialization';
import { AuthUser } from '../../../src/auth/AuthService';
import { createTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import {
  createNullTripStorage,
  NullTripStorageWithSync,
} from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

const testUser: AuthUser = { uid: 'clemens-123', email: 'clemens@test.com' };

// Helper: factories over shared staple and trip storages, so a test can
// deliver remote updates to them. The staple adapter's onChange is captured
// (the null staple storage has no simulateRemoteChange); the trip adapter's
// is wired into the storage's simulateRemoteChange.
const createSyncFactories = (
  stapleStorage: ReturnType<typeof createNullStapleStorage>,
  tripStorage: NullTripStorageWithSync,
) => {
  let stapleOnChange: (() => void) | undefined;

  const factories: AdapterFactories = {
    createStapleStorage: (
      _uid: string,
      options?: { onChange?: () => void },
    ) => {
      stapleOnChange = options?.onChange;
      return {
        ...stapleStorage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {},
      };
    },
    createAreaStorage: (_uid: string) => ({
      ...createNullAreaStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {},
    }),
    createSectionOrderStorage: (_uid: string) => ({
      ...createNullSectionOrderStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {},
    }),
    createTripStorage: (_uid: string, options?: { onChange?: () => void }) => {
      if (options?.onChange) tripStorage.setOnChange(options.onChange);
      return {
        ...tripStorage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {},
      };
    },
    checkMigrationNeeded: () => false,
    migrateToFirestore: () => {},
    createAsyncStapleStorage: () => ({
      ...createNullStapleStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncAreaStorage: () => ({
      ...createNullAreaStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncSectionOrderStorage: () => ({
      ...createNullSectionOrderStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncTripStorage: () => ({
      ...createNullTripStorage(),
      initialize: () => Promise.resolve(),
    }),
    migrateTripIfNeeded: () => {},
  };

  return { factories, fireStapleOnChange: () => stapleOnChange?.() };
};

describe('US-07: Prevent duplicate trip items', () => {
  // =============================================================================
  // S-22: No duplicate when trip sync delivers item already added locally
  // =============================================================================

  it('S-22: no duplicate when remote trip update contains locally added item', async () => {
    // Given Clemens has an active trip with "Milk", and "Tahini"
    // (stapleId: "staple-tahini-abc") was just added to it locally
    const stapleStorage = createNullStapleStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const tripStorage = createNullTripStorage();
    const { factories, fireStapleOnChange } = createSyncFactories(
      stapleStorage,
      tripStorage,
    );
    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);
    const tripService = result.services!.tripService;
    const tahini = {
      name: 'Tahini',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'International', aisleNumber: 4 },
    };
    const localAdd = tripService.addItem({
      ...tahini,
      itemType: 'staple',
      source: 'preloaded',
      stapleId: 'staple-tahini-abc',
    });
    expect(localAdd).toEqual({ success: true });
    expect(tripService.getItems().map((i) => i.name)).toEqual([
      'Milk',
      'Tahini',
    ]);

    // When the trip listener delivers a remote update that also contains
    // "Tahini" (same stapleId): the other device's auto-add reached the
    // server first, so its trip item carries that device's item id
    const localTrip = tripStorage.loadTrip()!;
    tripStorage.simulateRemoteChange((s) => {
      s.saveTrip({
        ...localTrip,
        items: localTrip.items.map((item) =>
          item.name === 'Tahini'
            ? { ...item, id: 'trip-item-remote-tahini' }
            : item,
        ),
      });
    });

    // And the staple listener then delivers the "Tahini" staple behind it,
    // so the auto-add path sees "Tahini" as a new staple
    stapleStorage.save({
      id: 'staple-tahini-abc',
      ...tahini,
      type: 'staple',
      createdAt: '2026-04-10T10:00:00.000Z',
    });
    fireStapleOnChange();

    // Then the trip contains exactly one "Tahini" item, the remote one
    const items = tripService.getItems();
    expect(items.map((i) => i.name)).toEqual(['Milk', 'Tahini']);
    expect(items.filter((i) => i.name === 'Tahini')).toEqual([
      expect.objectContaining({
        id: 'trip-item-remote-tahini',
        stapleId: 'staple-tahini-abc',
      }),
    ]);
  });

  // =============================================================================
  // S-23: Staple and one-off with same name coexist
  // =============================================================================

  it('S-23: staple item and one-off item with same name are not considered duplicates', () => {
    // Given Clemens has a trip with "Milk" (stapleId: "staple-milk-1", type: staple)
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      {
        id: 'staple-milk-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // When Clemens quick-adds a one-off "Milk" (stapleId: null)
    trip.addItem({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // Then the trip contains two "Milk" items
    const milkItems = trip.getItems().filter((i) => i.name === 'Milk');
    expect(milkItems).toHaveLength(2);

    // And one is a staple and one is a one-off
    expect(milkItems.filter((i) => i.itemType === 'staple')).toHaveLength(1);
    expect(milkItems.filter((i) => i.itemType === 'one-off')).toHaveLength(1);
  });

  // =============================================================================
  // S-24: Re-added staple gets fresh trip item after removal (@property)
  // =============================================================================

  it('S-24: re-added staple with new ID gets a fresh trip item', () => {
    // Given Clemens removed "Tahini" from staples (old trip item removed)
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      {
        id: 'staple-tahini-old',
        name: 'Tahini',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'International', aisleNumber: 4 },
      },
    ]);
    const oldItem = trip.getItems().find((i) => i.name === 'Tahini')!;
    trip.removeItemByStapleId(oldItem.stapleId!);
    expect(trip.getItems().filter((i) => i.name === 'Tahini')).toHaveLength(0);

    // When Clemens re-adds "Tahini" as a staple (with a new stapleId)
    // (Simulated: new staple has a different ID)
    trip.addItem({
      name: 'Tahini',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'International', aisleNumber: 4 },
      itemType: 'staple',
      source: 'preloaded',
    });

    // Then a new trip item for "Tahini" is created with the new stapleId
    // And the trip contains exactly one "Tahini"
    const tahiniItems = trip.getItems().filter((i) => i.name === 'Tahini');
    expect(tahiniItems).toHaveLength(1);
  });
});
