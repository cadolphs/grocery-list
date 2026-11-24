/**
 * Acceptance Tests: wire-firestore-trip-sync
 *
 * Tests exercise the driving ports (initializeApp, TripService) to verify
 * that trip storage is wired to Firestore in production and that remote
 * trip changes propagate to the UI via onChange + loadFromStorage + notify.
 *
 * Driving Ports:
 * - Orchestration: initializeApp, AdapterFactories
 * - Domain: TripService (subscribe, loadFromStorage)
 *
 * Story Trace:
 * - US-01: Wire Firestore trip storage in production factories
 * - US-02: Wire trip onChange handler for real-time sync
 * - US-03: TripService notifies subscribers after remote state load
 */

import { initializeApp } from '../../../src/hooks/useAppInitialization';
import { createTrip } from '../../../src/domain/trip';
import { AuthUser } from '../../../src/auth/AuthService';
import {
  createNullTripStorage,
  NullTripStorageWithSync,
} from '../../../src/adapters/null/null-trip-storage';
import { Trip } from '../../../src/domain/types';
import {
  createNullAdapterFactories,
  withInitialize,
} from '../helpers/null-adapter-factories';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

const testUser: AuthUser = { uid: 'clemens-123', email: 'clemens@test.com' };

// Pre-built trip with Milk and Eggs for remote-sync tests
const createActiveTripWithItems = (): Trip => ({
  id: 'trip-active-1',
  createdAt: '2026-04-13T08:00:00Z',
  status: 'active' as const,
  items: [
    {
      id: 'trip-item-1',
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
      itemType: 'staple' as const,
      stapleId: 'staple-1',
      source: 'preloaded' as const,
      decision: 'needed',
      checked: false,
      checkedAt: null,
    },
    {
      id: 'trip-item-2',
      name: 'Eggs',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
      itemType: 'staple' as const,
      stapleId: 'staple-2',
      source: 'preloaded' as const,
      decision: 'needed',
      checked: false,
      checkedAt: null,
    },
  ],
});

// Helper: factories where createTripStorage accepts uid and onChange option
const createTestFactories = (options?: {
  tripStorage?: NullTripStorageWithSync;
}) => {
  let capturedTripStorage: NullTripStorageWithSync | undefined;

  const factories = createNullAdapterFactories({
    createTripStorage: (
      _uid: string,
      tripOptions?: { onChange?: () => void },
    ) => {
      const storage =
        options?.tripStorage ?? createNullTripStorage(tripOptions);
      // Wire onChange from tripOptions into pre-created storage
      if (options?.tripStorage && tripOptions?.onChange) {
        storage.setOnChange(tripOptions.onChange);
      }
      capturedTripStorage = storage;
      return withInitialize(storage);
    },
  });

  return { factories, getCapturedTripStorage: () => capturedTripStorage };
};

// =============================================================================
// US-01: Wire Firestore Trip Storage in Production Factories
// =============================================================================

describe('US-01: AdapterFactories.createTripStorage accepts uid', () => {
  it('initializeApp passes uid to createTripStorage', async () => {
    // Given a factory where createTripStorage tracks the uid it receives
    let receivedUid: string | undefined;
    const { factories } = createTestFactories();
    const originalCreateTripStorage = factories.createTripStorage;
    (factories as any).createTripStorage = (
      uid: string,
      opts?: { onChange?: () => void },
    ) => {
      receivedUid = uid;
      return originalCreateTripStorage(uid, opts);
    };

    // When initializeApp is called with an authenticated user
    await initializeApp(testUser, factories);

    // Then createTripStorage was called with the user's uid
    expect(receivedUid).toBe('clemens-123');
  });
});

// =============================================================================
// US-02: Wire trip onChange handler for real-time sync
// =============================================================================

describe('US-02: Trip onChange handler wired in initializeApp', () => {
  it('remote trip checkoff arrives via onChange and updates trip service state', async () => {
    // Given Clemens is logged in and has an active trip with "Milk" and "Eggs"
    const tripStorage = createNullTripStorage();
    tripStorage.saveTrip(createActiveTripWithItems());
    const { factories } = createTestFactories({ tripStorage });

    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);

    const tripService = result.services!.tripService;

    // And the trip service holds the stored trip (initializeApp calls
    // initializeFromStorage, which adopts the active trip), with "Milk" not
    // yet checked
    const itemsBefore = tripService.getItems();
    expect(itemsBefore.map((i) => i.name)).toEqual(['Milk', 'Eggs']);
    expect(itemsBefore.find((i) => i.name === 'Milk')).toMatchObject({
      checked: false,
      checkedAt: null,
    });

    // When a remote device checks off "Milk" and the trip update arrives via onChange
    // (Simulated: remote writes updated trip to storage, then onChange fires)
    const currentTrip = tripStorage.loadTrip()!;
    const updatedItems = currentTrip.items.map((item) =>
      item.name === 'Milk'
        ? { ...item, checked: true, checkedAt: '2026-04-13T10:00:00Z' }
        : item,
    );
    tripStorage.simulateRemoteChange((s) => {
      s.saveTrip({ ...currentTrip, items: updatedItems });
    });

    // Then the local trip service shows "Milk" as checked
    const itemsAfter = tripService.getItems();
    const milkItem = itemsAfter.find((i) => i.name === 'Milk');
    expect(milkItem?.checked).toBe(true);
    expect(milkItem?.checkedAt).toBe('2026-04-13T10:00:00Z');

    // And nothing else about the trip changed
    expect(itemsAfter.map((i) => i.name)).toEqual(['Milk', 'Eggs']);
    expect(itemsAfter.find((i) => i.name === 'Eggs')).toEqual(
      itemsBefore.find((i) => i.name === 'Eggs'),
    );
  });

  it('remote item addition via onChange appears in local trip', async () => {
    // Given Clemens has an active trip open
    const tripStorage = createNullTripStorage();
    tripStorage.saveTrip(createActiveTripWithItems());
    const { factories } = createTestFactories({ tripStorage });

    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);

    const tripService = result.services!.tripService;
    const itemCountBefore = tripService.getItems().length;

    // When a remote device adds "Birthday Candles" and the trip update arrives
    const currentTrip = tripStorage.loadTrip();
    if (currentTrip) {
      const newItem = {
        id: 'trip-item-remote-1',
        name: 'Birthday Candles',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Baking', aisleNumber: 12 },
        itemType: 'one-off' as const,
        stapleId: null,
        source: 'quick-add' as const,
        decision: 'needed' as const,
        checked: false,
        checkedAt: null,
      };
      tripStorage.simulateRemoteChange((s) => {
        s.saveTrip({ ...currentTrip, items: [...currentTrip.items, newItem] });
      });
    }

    // Then "Birthday Candles" appears in the local trip
    const items = tripService.getItems();
    expect(items.length).toBe(itemCountBefore + 1);
    expect(items.map((i) => i.name)).toContain('Birthday Candles');
  });
});

// =============================================================================
// US-03: TripService notifies subscribers after remote state load
// =============================================================================

describe('US-03: TripService.loadFromStorage notifies subscribers', () => {
  it('subscribers are notified when loadFromStorage updates state', () => {
    // Given a trip service with a subscriber listening for changes
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage);
    tripService.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // Persist initial state so loadFromStorage has something to load
    tripService.putInCart(itemIdNamed(tripService, 'Milk'));
    tripService.takeOutOfCart(itemIdNamed(tripService, 'Milk'));

    let notifyCount = 0;
    tripService.subscribe(() => {
      notifyCount++;
    });

    // When remote state is written to storage and loadFromStorage is called
    const currentTrip = tripStorage.loadTrip()!;
    const updatedItems = currentTrip.items.map((item) =>
      item.name === 'Milk'
        ? { ...item, checked: true, checkedAt: '2026-04-13T10:00:00Z' }
        : item,
    );
    tripStorage.saveTrip({ ...currentTrip, items: updatedItems });
    tripService.loadFromStorage();

    // Then the subscriber is notified
    expect(notifyCount).toBeGreaterThanOrEqual(1);

    // And the trip state reflects the remote change
    const milk = tripService.getItems().find((i) => i.name === 'Milk');
    expect(milk?.checked).toBe(true);
  });

  it('UI re-renders when remote trip change arrives through full pipeline', async () => {
    // Given Clemens is logged in with an active trip and a UI subscriber
    const tripStorage = createNullTripStorage();
    tripStorage.saveTrip(createActiveTripWithItems());
    const { factories } = createTestFactories({ tripStorage });

    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);

    const tripService = result.services!.tripService;

    let renderCount = 0;
    tripService.subscribe(() => {
      renderCount++;
    });

    // When a remote trip change arrives via onChange
    const currentTrip = tripStorage.loadTrip();
    if (currentTrip) {
      const updatedItems = currentTrip.items.map((item) =>
        item.name === 'Milk'
          ? { ...item, checked: true, checkedAt: '2026-04-13T10:00:00Z' }
          : item,
      );
      tripStorage.simulateRemoteChange((s) => {
        s.saveTrip({ ...currentTrip, items: updatedItems });
      });
    }

    // Then the UI subscriber is notified (re-render triggered)
    expect(renderCount).toBeGreaterThanOrEqual(1);
  });
});
