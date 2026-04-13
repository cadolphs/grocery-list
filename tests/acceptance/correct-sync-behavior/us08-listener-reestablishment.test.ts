/**
 * US-08: Listener Re-Establishment After Re-Login
 *
 * Focused acceptance scenarios for listener re-establishment.
 * Tests exercise driving ports: initializeApp, AdapterFactories.
 *
 * All tests marked .skip -- enable one at a time during DELIVER.
 */

import { initializeApp, AdapterFactories } from '../../../src/hooks/useAppInitialization';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

const createTestFactories = (): AdapterFactories => ({
  createStapleStorage: (_uid: string) => ({
    ...createNullStapleStorage(),
    initialize: () => Promise.resolve(),
  }),
  createAreaStorage: (_uid: string) => ({
    ...createNullAreaStorage(),
    initialize: () => Promise.resolve(),
  }),
  createSectionOrderStorage: (_uid: string) => ({
    ...createNullSectionOrderStorage(),
    initialize: () => Promise.resolve(),
  }),
  createTripStorage: (_uid: string) => ({
    ...createNullTripStorage(),
    initialize: () => Promise.resolve(),
  }),
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
});

describe('US-08: Listener re-establishment after re-login', () => {
  // =============================================================================
  // S-25: Real-time sync resumes after re-login
  // =============================================================================

  it('S-25: sync resumes after logging out and back in', async () => {
    // Given Clemens logged out and all listeners were cleaned up
    const factories = createTestFactories();
    const clemensAuth = { uid: 'clemens-uid', email: 'clemens@example.com' };

    // First login
    const firstResult = await initializeApp(clemensAuth, factories);
    expect(firstResult.isReady).toBe(true);

    // Logout (in production, useEffect cleanup calls unsubscribe functions)
    // Simulate cleanup: set auth to null
    const loggedOutResult = await initializeApp(null, factories);
    expect(loggedOutResult.needsAuth).toBe(true);

    // When Clemens logs back in
    const reLoginResult = await initializeApp(clemensAuth, factories);

    // Then new real-time listeners are established for staples, areas, section order, and trip
    // (Verified: initializeApp succeeds and returns services)
    expect(reLoginResult.isReady).toBe(true);
    expect(reLoginResult.services).not.toBeNull();

    // And data reflects the latest state from cloud storage
    expect(reLoginResult.services!.stapleLibrary).toBeDefined();
    expect(reLoginResult.services!.tripService).toBeDefined();
  });

  // =============================================================================
  // S-26: Different user sees own data after login switch
  // =============================================================================

  it('S-26: different user sees their own data after login', async () => {
    // Given Clemens logged out on his phone
    const clemensStaples = createNullStapleStorage([
      { name: 'Clemens Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const partnerStaples = createNullStapleStorage([
      { name: 'Partner Yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    // Create factories that return different data per user
    const factories: AdapterFactories = {
      createStapleStorage: (uid: string) => ({
        ...(uid === 'clemens-uid' ? clemensStaples : partnerStaples),
        initialize: () => Promise.resolve(),
      }),
      createAreaStorage: (_uid: string) => ({
        ...createNullAreaStorage(),
        initialize: () => Promise.resolve(),
      }),
      createSectionOrderStorage: (_uid: string) => ({
        ...createNullSectionOrderStorage(),
        initialize: () => Promise.resolve(),
      }),
      createTripStorage: (_uid: string) => ({
        ...createNullTripStorage(),
        initialize: () => Promise.resolve(),
      }),
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

    // When his partner logs in on the same phone
    const partnerAuth = { uid: 'partner-uid', email: 'partner@example.com' };
    const result = await initializeApp(partnerAuth, factories);

    // Then the partner sees their own staple library and trip
    expect(result.isReady).toBe(true);
    const partnerStapleList = result.services!.stapleLibrary.listAll();
    expect(partnerStapleList.map(s => s.name)).toContain('Partner Yogurt');

    // And no data from Clemens is visible
    expect(partnerStapleList.map(s => s.name)).not.toContain('Clemens Milk');
  });
});
