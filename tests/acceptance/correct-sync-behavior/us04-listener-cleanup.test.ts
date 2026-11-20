/**
 * US-04: Listener Cleanup on Unmount and Logout
 *
 * Focused acceptance scenarios for listener lifecycle management.
 * Tests exercise driving ports: initializeApp, AdapterFactories.
 *
 * Tests verify that initializeApp returns unsubscribe functions that
 * callers (useAppInitialization) can invoke on logout/unmount to stop
 * all Firestore listeners and prevent stale callbacks from corrupting state.
 */

import {
  initializeApp,
  AdapterFactories,
} from '../../../src/hooks/useAppInitialization';
import { AuthUser } from '../../../src/auth/AuthService';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import {
  createNullTripStorage,
  NullTripStorageWithSync,
} from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

// Helper: create test factories that track unsubscribe calls and expose onChange triggers.
// Pass shared storages to read or change them from a test.
const createTrackingFactories = (
  shared: {
    stapleStorage?: ReturnType<typeof createNullStapleStorage>;
    tripStorage?: NullTripStorageWithSync;
  } = {},
) => {
  const unsubscribeCalls: string[] = [];
  const onChangeCallbacks: Record<string, () => void> = {};

  const factories: AdapterFactories = {
    createStapleStorage: (_uid: string) => {
      const storage = shared.stapleStorage ?? createNullStapleStorage();
      return {
        ...storage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {
          unsubscribeCalls.push('staples');
        },
      };
    },
    createAreaStorage: (_uid: string) => {
      const storage = createNullAreaStorage();
      return {
        ...storage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {
          unsubscribeCalls.push('areas');
        },
      };
    },
    createSectionOrderStorage: (_uid: string) => {
      const storage = createNullSectionOrderStorage();
      return {
        ...storage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {
          unsubscribeCalls.push('sectionOrder');
        },
      };
    },
    createTripStorage: (_uid: string, options?: { onChange?: () => void }) => {
      const storage = shared.tripStorage ?? createNullTripStorage();
      if (options?.onChange) storage.setOnChange(options.onChange);
      return {
        ...storage,
        initialize: () => Promise.resolve(),
        unsubscribe: () => {
          unsubscribeCalls.push('trip');
        },
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

  return { factories, unsubscribeCalls, onChangeCallbacks };
};

const testUser: AuthUser = { uid: 'clemens-123', email: 'clemens@test.com' };

describe('US-04: Listener cleanup on unmount and logout', () => {
  // =============================================================================
  // S-11: All listeners unsubscribed on logout
  // =============================================================================

  it('S-11: all listeners are cleaned up when Clemens logs out', async () => {
    // Given Clemens is logged in and real-time listeners are active
    const { factories, unsubscribeCalls } = createTrackingFactories();
    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);

    // When Clemens logs out (caller invokes cleanup)
    // initializeApp must return an unsubscribeAll function
    expect(result.unsubscribeAll).toBeDefined();
    result.unsubscribeAll!();

    // Then all 4 listeners are unsubscribed
    expect(unsubscribeCalls).toHaveLength(4);
    expect(unsubscribeCalls).toEqual(
      expect.arrayContaining(['staples', 'areas', 'sectionOrder', 'trip']),
    );
  });

  // =============================================================================
  // S-12: Listeners unsubscribed on component unmount
  // =============================================================================

  it('S-12: listeners are cleaned up when the app component unmounts', async () => {
    // Given the app is initialized with active listeners
    const { factories, unsubscribeCalls } = createTrackingFactories();
    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);

    // When the component unmounts (caller invokes cleanup)
    result.unsubscribeAll!();

    // Then all unsubscribe functions are called
    expect(unsubscribeCalls).toHaveLength(4);
  });

  // =============================================================================
  // S-13: No duplicate listeners after re-mount
  // =============================================================================

  it('S-13: re-mounting the app does not create duplicate listeners', async () => {
    // Given the app was initialized and then cleaned up (unmount)
    const { factories, unsubscribeCalls } = createTrackingFactories();
    const firstResult = await initializeApp(testUser, factories);
    firstResult.unsubscribeAll!();
    expect(unsubscribeCalls).toHaveLength(4);

    // When the app re-mounts with fresh initialization
    // Clear tracking to count only new unsubscribes
    unsubscribeCalls.length = 0;
    const secondResult = await initializeApp(testUser, factories);
    expect(secondResult.isReady).toBe(true);

    // Then only one set of listeners is active
    // (calling unsubscribe on second result cleans up exactly 4, not 8)
    secondResult.unsubscribeAll!();
    expect(unsubscribeCalls).toHaveLength(4);
  });

  // =============================================================================
  // S-14: Stale listener callback does not corrupt state after logout
  // =============================================================================

  it('S-14: delayed listener callback after logout does not update state', async () => {
    // Given Clemens is logged in with "Milk" as a staple and an active trip
    const stapleStorage = createNullStapleStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const tripStorage = createNullTripStorage();
    const { factories } = createTrackingFactories({
      stapleStorage,
      tripStorage,
    });
    const result = await initializeApp(testUser, factories);
    expect(result.isReady).toBe(true);
    const { stapleLibrary, tripService } = result.services!;
    const tripBeforeLogout = tripService.getItems();
    expect(tripBeforeLogout.map((i) => i.name)).toEqual(['Milk']);
    const storedTripBeforeLogout = tripStorage.loadTrip();
    expect(storedTripBeforeLogout).not.toBeNull();

    // And Clemens has logged out (listeners cleaned up)
    result.unsubscribeAll!();

    // When a delayed staple-library listener callback fires after logout
    // (an in-flight local add lands on the old session's services; the
    // library's change seam is the listener initializeApp subscribed to)
    const added = stapleLibrary.addStaple({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
    });
    expect(added.success).toBe(true);

    // Then the old session's services still exist but its trip is unchanged,
    // in memory and in storage (nothing was written after logout)
    expect(result.services).not.toBeNull();
    expect(tripService.getItems()).toEqual(tripBeforeLogout);
    expect(tripStorage.loadTrip()).toEqual(storedTripBeforeLogout);
  });
});
