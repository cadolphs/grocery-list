// Tests for useAppInitialization - wiring Firestore adapters when authenticated

import { AuthUser } from '../auth/AuthService';
import { StapleStorage } from '../ports/staple-storage';
import { AreaStorage } from '../ports/area-storage';
import { SectionOrderStorage } from '../ports/section-order-storage';
import { TripStorage } from '../ports/trip-storage';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullAreaStorage } from '../adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../adapters/null/null-section-order-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';

// Types for the initializable storage adapters (Firestore/AsyncStorage adapters have initialize())
type InitializableStapleStorage = StapleStorage & { initialize: () => Promise<void> };
type InitializableAreaStorage = AreaStorage & { initialize: () => Promise<void> };
type InitializableSectionOrderStorage = SectionOrderStorage & { initialize: () => Promise<void> };
type InitializableTripStorage = TripStorage & { initialize: () => Promise<void> };

// Factory types for dependency injection
type AdapterFactories = {
  readonly createStapleStorage: (uid: string, options?: { onChange?: () => void }) => InitializableStapleStorage;
  readonly createAreaStorage: (uid: string) => InitializableAreaStorage;
  readonly createSectionOrderStorage: (uid: string) => InitializableSectionOrderStorage;
  readonly createTripStorage: () => InitializableTripStorage;
  readonly checkMigrationNeeded: (firestoreStaples: StapleStorage) => boolean;
  readonly migrateToFirestore: (
    from: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
    to: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
  ) => void;
  readonly createAsyncStapleStorage: () => InitializableStapleStorage;
  readonly createAsyncAreaStorage: () => InitializableAreaStorage;
  readonly createAsyncSectionOrderStorage: () => InitializableSectionOrderStorage;
  readonly createAsyncTripStorage: () => InitializableTripStorage;
  readonly migrateTripIfNeeded: (localTrip: TripStorage, cloudTrip: TripStorage) => void;
};

import { StapleItem, AddStapleRequest } from '../domain/types';

// Helper: create initializable wrappers around null storages
const createInitializableStapleStorage = (
  initialItems: AddStapleRequest[] = [],
  options: { onChange?: () => void } = {},
): InitializableStapleStorage => ({
  ...createNullStapleStorage(initialItems, options),
  initialize: async () => {},
});

const createInitializableAreaStorage = (areas?: string[]): InitializableAreaStorage => ({
  ...createNullAreaStorage(areas),
  initialize: async () => {},
});

const createInitializableSectionOrderStorage = (): InitializableSectionOrderStorage => ({
  ...createNullSectionOrderStorage(),
  initialize: async () => {},
});

const createInitializableTripStorage = (): InitializableTripStorage => ({
  ...createNullTripStorage(),
  initialize: async () => {},
});

const defaultFactories: AdapterFactories = {
  createStapleStorage: () => createInitializableStapleStorage(),
  createAreaStorage: () => createInitializableAreaStorage(),
  createSectionOrderStorage: () => createInitializableSectionOrderStorage(),
  createTripStorage: () => createInitializableTripStorage(),
  checkMigrationNeeded: () => false,
  migrateToFirestore: () => {},
  createAsyncStapleStorage: () => createInitializableStapleStorage(),
  createAsyncAreaStorage: () => createInitializableAreaStorage(),
  createAsyncSectionOrderStorage: () => createInitializableSectionOrderStorage(),
  createAsyncTripStorage: () => createInitializableTripStorage(),
  migrateTripIfNeeded: () => {},
};

// Import the function under test
import { initializeApp, diffStaples } from './useAppInitialization';

describe('initializeApp', () => {
  describe('acceptance: initialization creates firestore adapters when authenticated', () => {
    test('given authenticated user, returns ready services', async () => {
      const authUser: AuthUser = { uid: 'user-123', email: 'test@example.com' };

      const result = await initializeApp(authUser, defaultFactories);

      expect(result.isReady).toBe(true);
      expect(result.services).not.toBeNull();
      expect(result.services!.stapleLibrary).toBeDefined();
      expect(result.services!.tripService).toBeDefined();
      expect(result.services!.areaManagement).toBeDefined();
      expect(result.services!.sectionOrderStorage).toBeDefined();
      expect(result.needsAuth).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('not authenticated returns needsAuth', () => {
    test('given no auth user, returns needsAuth status', async () => {
      const result = await initializeApp(null, defaultFactories);

      expect(result.isReady).toBe(false);
      expect(result.services).toBeNull();
      expect(result.needsAuth).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('authenticated creates services with correct adapters', () => {
    test('staple storage factory receives the user uid', async () => {
      const authUser: AuthUser = { uid: 'user-abc', email: 'a@b.com' };
      let capturedUid: string | null = null;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (uid: string) => {
          capturedUid = uid;
          return createInitializableStapleStorage();
        },
      };

      await initializeApp(authUser, factories);

      expect(capturedUid).toBe('user-abc');
    });

    test('area storage factory receives the user uid', async () => {
      const authUser: AuthUser = { uid: 'user-xyz', email: 'x@y.com' };
      let capturedUid: string | null = null;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createAreaStorage: (uid: string) => {
          capturedUid = uid;
          return createInitializableAreaStorage();
        },
      };

      await initializeApp(authUser, factories);

      expect(capturedUid).toBe('user-xyz');
    });

    test('section order storage factory receives the user uid', async () => {
      const authUser: AuthUser = { uid: 'user-so', email: 's@o.com' };
      let capturedUid: string | null = null;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createSectionOrderStorage: (uid: string) => {
          capturedUid = uid;
          return createInitializableSectionOrderStorage();
        },
      };

      await initializeApp(authUser, factories);

      expect(capturedUid).toBe('user-so');
    });

    test('trip storage always uses AsyncStorage adapter (no uid)', async () => {
      const authUser: AuthUser = { uid: 'user-trip', email: 't@t.com' };
      let tripStorageCalled = false;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createTripStorage: () => {
          tripStorageCalled = true;
          return createInitializableTripStorage();
        },
      };

      await initializeApp(authUser, factories);

      expect(tripStorageCalled).toBe(true);
    });
  });

  describe('migration runs when needed', () => {
    test('given migration needed, migrates data from async to firestore adapters', async () => {
      const authUser: AuthUser = { uid: 'user-migrate', email: 'm@m.com' };
      let migrateCalled = false;

      const factories: AdapterFactories = {
        ...defaultFactories,
        checkMigrationNeeded: () => true,
        migrateToFirestore: () => {
          migrateCalled = true;
        },
      };

      const result = await initializeApp(authUser, factories);

      expect(migrateCalled).toBe(true);
      expect(result.isReady).toBe(true);
    });

    test('trip migration runs even when staple migration is not needed', async () => {
      const authUser: AuthUser = { uid: 'user-trip-mig', email: 'tm@m.com' };
      let tripMigrateCalled = false;

      const factories: AdapterFactories = {
        ...defaultFactories,
        checkMigrationNeeded: () => false, // staple migration NOT needed
        migrateTripIfNeeded: () => {
          tripMigrateCalled = true;
        },
      };

      await initializeApp(authUser, factories);

      expect(tripMigrateCalled).toBe(true);
    });

    test('given no migration needed, does not call migrate', async () => {
      const authUser: AuthUser = { uid: 'user-nomigrate', email: 'n@n.com' };
      let migrateCalled = false;

      const factories: AdapterFactories = {
        ...defaultFactories,
        checkMigrationNeeded: () => false,
        migrateToFirestore: () => {
          migrateCalled = true;
        },
      };

      await initializeApp(authUser, factories);

      expect(migrateCalled).toBe(false);
    });

    test('migration initializes async storage adapters before migrating', async () => {
      const authUser: AuthUser = { uid: 'user-mig', email: 'mi@g.com' };
      const initOrder: string[] = [];

      const factories: AdapterFactories = {
        ...defaultFactories,
        checkMigrationNeeded: () => true,
        createAsyncStapleStorage: () => ({
          ...createNullStapleStorage(),
          initialize: async () => { initOrder.push('async-staple'); },
        }),
        createAsyncAreaStorage: () => ({
          ...createNullAreaStorage(),
          initialize: async () => { initOrder.push('async-area'); },
        }),
        createAsyncSectionOrderStorage: () => ({
          ...createNullSectionOrderStorage(),
          initialize: async () => { initOrder.push('async-section'); },
        }),
      };

      await initializeApp(authUser, factories);

      expect(initOrder).toContain('async-staple');
      expect(initOrder).toContain('async-area');
      expect(initOrder).toContain('async-section');
    });
  });

  describe('error handling', () => {
    test('given adapter initialization fails, returns error', async () => {
      const authUser: AuthUser = { uid: 'user-err', email: 'e@e.com' };

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: () => ({
          ...createNullStapleStorage(),
          initialize: async () => { throw new Error('Firestore unavailable'); },
        }),
      };

      const result = await initializeApp(authUser, factories);

      expect(result.isReady).toBe(false);
      expect(result.error).toBe('Firestore unavailable');
      expect(result.services).toBeNull();
    });
  });

  describe('auto-add new staples to active trip', () => {
    test('when staple storage onChange fires after a new staple is added, trip gets the new item', async () => {
      const authUser: AuthUser = { uid: 'user-auto', email: 'a@a.com' };

      // Track the onChange callback so we can fire it manually
      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          // Create storage with initial staples, wire onChange
          sharedStorage = createNullStapleStorage([
            { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);

      // Trip starts with 1 item (Milk)
      const tripBefore = result.services!.tripService.getItems();
      expect(tripBefore).toHaveLength(1);
      expect(tripBefore[0].name).toBe('Milk');

      // Simulate remote staple add: save directly to storage, then fire onChange
      sharedStorage!.save({
        id: 'staple-bread-remote',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
        type: 'staple',
        createdAt: '2026-04-10T10:00:00.000Z',
      });
      capturedOnChange!();

      // Trip should now have 2 items
      const tripAfter = result.services!.tripService.getItems();
      expect(tripAfter).toHaveLength(2);
      expect(tripAfter.map(i => i.name)).toContain('Bread');
    });

    test('when staple storage onChange fires after a staple is removed, trip loses the item', async () => {
      const authUser: AuthUser = { uid: 'user-remove', email: 'r@r.com' };

      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          sharedStorage = createNullStapleStorage([
            { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
            { name: 'Soda', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Beverages', aisleNumber: 6 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);

      // Trip starts with 2 items
      const tripBefore = result.services!.tripService.getItems();
      expect(tripBefore).toHaveLength(2);

      // Find the stapleId of Soda in the trip
      const sodaInTrip = tripBefore.find(i => i.name === 'Soda');
      expect(sodaInTrip?.stapleId).not.toBeNull();

      // Simulate remote staple removal: remove from storage, then fire onChange
      const sodaStaple = sharedStorage!.loadAll().find(s => s.name === 'Soda')!;
      sharedStorage!.remove(sodaStaple.id);
      capturedOnChange!();

      // Trip should now have 1 item
      const tripAfter = result.services!.tripService.getItems();
      expect(tripAfter).toHaveLength(1);
      expect(tripAfter.map(i => i.name)).not.toContain('Soda');
    });

    test('auto-added staple items carry their stapleId on the trip item', async () => {
      const authUser: AuthUser = { uid: 'user-sid', email: 'sid@d.com' };

      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          sharedStorage = createNullStapleStorage([
            { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);

      // Add Bread via staple sync
      const breadStapleId = 'staple-bread-1';
      sharedStorage!.save({
        id: breadStapleId,
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
        type: 'staple',
        createdAt: '2026-04-10T10:00:00.000Z',
      });
      capturedOnChange!();

      // The auto-added trip item should carry the stapleId
      const breadItem = result.services!.tripService.getItems().find(i => i.name === 'Bread');
      expect(breadItem).toBeDefined();
      expect(breadItem!.stapleId).toBe(breadStapleId);
    });

    test('duplicate guard: skips adding staple when trip already has item with that stapleId', async () => {
      const authUser: AuthUser = { uid: 'user-guard', email: 'g@g.com' };

      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          sharedStorage = createNullStapleStorage([
            { name: 'Tahini', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'International', aisleNumber: 4 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);
      const tripService = result.services!.tripService;

      // Trip starts with 1 Tahini (from initializeFromStorage, has stapleId)
      expect(tripService.getItems()).toHaveLength(1);
      const tahiniStapleId = tripService.getItems()[0].stapleId!;

      // Simulate: remove from storage, fire onChange (removes from trip)
      sharedStorage!.remove(tahiniStapleId);
      capturedOnChange!();
      expect(tripService.getItems()).toHaveLength(0);

      // Re-add same staple ID, fire onChange (should add back)
      sharedStorage!.save({
        id: tahiniStapleId,
        name: 'Tahini',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'International', aisleNumber: 4 },
        type: 'staple',
        createdAt: '2026-04-10T10:00:00.000Z',
      });
      capturedOnChange!();
      expect(tripService.getItems()).toHaveLength(1);

      // Fire onChange AGAIN with same storage state -- should NOT create duplicate
      // This simulates a Firestore snapshot replay
      capturedOnChange!();
      expect(tripService.getItems().filter(i => i.name === 'Tahini')).toHaveLength(1);
    });

    test('handleStapleChange syncs trip when staple area or location changes', async () => {
      const authUser: AuthUser = { uid: 'user-sync-update', email: 'su@u.com' };

      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          sharedStorage = createNullStapleStorage([
            { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);
      const tripService = result.services!.tripService;

      // Trip starts with Milk at Fridge / Dairy aisle 3 (via initializeFromStorage)
      const tripBefore = tripService.getItems();
      expect(tripBefore).toHaveLength(1);
      const milkBefore = tripBefore[0];
      expect(milkBefore.houseArea).toBe('Fridge');
      expect(milkBefore.storeLocation).toEqual({ section: 'Dairy', aisleNumber: 3 });

      // Simulate remote staple edit: change area and storeLocation in the storage,
      // then fire onChange as Firestore onSnapshot would.
      const milkStaple = sharedStorage!.loadAll().find(s => s.name === 'Milk')!;
      sharedStorage!.update({
        ...milkStaple,
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      });
      capturedOnChange!();

      // The trip item carrying this stapleId must now reflect the updated
      // area and location -- observable through the tripService driving port.
      const tripAfter = tripService.getItems();
      expect(tripAfter).toHaveLength(1);
      const milkAfter = tripAfter[0];
      expect(milkAfter.stapleId).toBe(milkStaple.id);
      expect(milkAfter.houseArea).toBe('Kitchen Cabinets');
      expect(milkAfter.storeLocation).toEqual({ section: 'Bakery', aisleNumber: 1 });
    });

    test('auto-add preserves sweep progress', async () => {
      const authUser: AuthUser = { uid: 'user-sweep', email: 's@s.com' };

      let capturedOnChange: (() => void) | undefined;
      let sharedStorage: ReturnType<typeof createNullStapleStorage> | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          sharedStorage = createNullStapleStorage([
            { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
          ], { onChange: options?.onChange });
          capturedOnChange = options?.onChange;
          return {
            ...sharedStorage,
            initialize: async () => {},
          };
        },
      };

      const result = await initializeApp(authUser, factories);
      const tripService = result.services!.tripService;

      // Complete an area
      tripService.completeArea('Bathroom');
      expect(tripService.getSweepProgress().completedAreas).toContain('Bathroom');

      // Simulate remote staple add
      sharedStorage!.save({
        id: 'staple-soap-remote',
        name: 'Soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 2 },
        type: 'staple',
        createdAt: '2026-04-10T10:00:00.000Z',
      });
      capturedOnChange!();

      // Sweep progress preserved
      expect(tripService.getSweepProgress().completedAreas).toContain('Bathroom');
      // New item added
      expect(tripService.getItems().map(i => i.name)).toContain('Soap');
    });
  });

  // RCA root cause B: local stapleLibrary.remove must drive trip cleanup via the
  // domain's own subscribe seam, independent of stapleStorage.onChange (which
  // the Firestore adapter suppresses for own-write echoes). These tests use a
  // real stapleLibrary and a real tripService -- only stapleStorage is faked,
  // and its onChange is captured but never auto-invoked.
  describe('local stapleLibrary.remove triggers trip cleanup via domain subscription', () => {
    test('local stapleLibrary.remove removes a trip item linked by stapleId', async () => {
      const authUser: AuthUser = { uid: 'user-local-remove', email: 'lr@l.com' };

      let capturedOnChange: (() => void) | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          // Real seed: one staple, captured onChange that we WILL NOT auto-fire.
          const storage = createNullStapleStorage(
            [{ name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }],
            { onChange: options?.onChange },
          );
          capturedOnChange = options?.onChange;
          return { ...storage, initialize: async () => {} };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);
      const { stapleLibrary, tripService } = result.services!;

      // Trip starts with the seeded staple item linked by stapleId.
      const before = tripService.getItems();
      expect(before).toHaveLength(1);
      const milkStaple = stapleLibrary.listAll().find(s => s.name === 'Milk')!;
      expect(before[0].stapleId).toBe(milkStaple.id);

      // Drive locally: stapleLibrary.remove (NO storage.onChange invocation).
      stapleLibrary.remove(milkStaple.id);

      // The trip item must be gone -- proves the domain subscription is wired.
      expect(tripService.getItems()).toHaveLength(0);
      // And we never relied on the storage echo path:
      expect(capturedOnChange).toBeDefined();
    });

    test('local stapleLibrary.remove also removes trip items matched by name+houseArea fallback (proves removeItemsByStaple wiring)', async () => {
      const authUser: AuthUser = { uid: 'user-fallback', email: 'fb@f.com' };

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          const storage = createNullStapleStorage(
            [{ name: 'Cinnamon', houseArea: 'Pantry', storeLocation: { section: 'Spices', aisleNumber: 5 } }],
            { onChange: options?.onChange },
          );
          return { ...storage, initialize: async () => {} };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);
      const { stapleLibrary, tripService } = result.services!;

      // Seed an additional, legacy-style trip item with stapleId=null but
      // matching name + houseArea + itemType='staple'. This is the fallback
      // identity that ONLY removeItemsByStaple (not removeItemByStapleId)
      // can clean up.
      const addResult = tripService.addItem({
        name: 'Cinnamon',
        houseArea: 'Pantry',
        storeLocation: { section: 'Spices', aisleNumber: 5 },
        itemType: 'staple',
        source: 'carryover',
        // stapleId intentionally omitted -> stored as null
      });
      expect(addResult.success).toBe(true);

      const before = tripService.getItems();
      // 1 from initializeFromStorage (with stapleId) + 1 fallback (stapleId=null)
      expect(before).toHaveLength(2);
      const fallbackItem = before.find(i => i.stapleId === null);
      expect(fallbackItem).toBeDefined();
      expect(fallbackItem!.name).toBe('Cinnamon');

      // Drive locally.
      const cinnamonStaple = stapleLibrary.listAll().find(s => s.name === 'Cinnamon')!;
      stapleLibrary.remove(cinnamonStaple.id);

      // Both items must be gone: id-linked and fallback-matched.
      const after = tripService.getItems();
      expect(after).toHaveLength(0);
    });

    test('after unsubscribeAll, local stapleLibrary.remove does NOT mutate tripService', async () => {
      const authUser: AuthUser = { uid: 'user-unsub', email: 'un@u.com' };

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          const storage = createNullStapleStorage(
            [{ name: 'Soda', houseArea: 'Pantry', storeLocation: { section: 'Beverages', aisleNumber: 6 } }],
            { onChange: options?.onChange },
          );
          return { ...storage, initialize: async () => {} };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);
      const { stapleLibrary, tripService } = result.services!;
      expect(tripService.getItems()).toHaveLength(1);

      // Tear down all subscriptions.
      result.unsubscribeAll!();

      // After teardown, removing a staple should NOT touch the trip.
      const sodaStaple = stapleLibrary.listAll().find(s => s.name === 'Soda')!;
      stapleLibrary.remove(sodaStaple.id);

      // Trip is unchanged: subscription was unwired.
      const after = tripService.getItems();
      expect(after).toHaveLength(1);
      expect(after[0].name).toBe('Soda');
    });

    test('double-fire (delayed Firestore echo) is idempotent: stapleLibrary.remove + manual onChange replay does not double-mutate', async () => {
      const authUser: AuthUser = { uid: 'user-double', email: 'd@d.com' };

      let capturedOnChange: (() => void) | undefined;

      const factories: AdapterFactories = {
        ...defaultFactories,
        createStapleStorage: (_uid: string, options?: { onChange?: () => void }) => {
          const storage = createNullStapleStorage(
            [
              { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
              { name: 'Bread', houseArea: 'Pantry', storeLocation: { section: 'Bakery', aisleNumber: 1 } },
            ],
            { onChange: options?.onChange },
          );
          capturedOnChange = options?.onChange;
          return { ...storage, initialize: async () => {} };
        },
      };

      const result = await initializeApp(authUser, factories);
      expect(result.isReady).toBe(true);
      const { stapleLibrary, tripService } = result.services!;

      expect(tripService.getItems()).toHaveLength(2);

      // First fire: local stapleLibrary.remove drives the domain subscription
      // and removes Milk from the trip.
      const milkStaple = stapleLibrary.listAll().find(s => s.name === 'Milk')!;
      stapleLibrary.remove(milkStaple.id);

      const afterFirst = tripService.getItems();
      expect(afterFirst).toHaveLength(1);
      expect(afterFirst[0].name).toBe('Bread');

      // Second fire (simulated delayed Firestore echo): manually invoke the
      // captured stapleStorage.onChange. previousStaples has been advanced by
      // the first fire, so diffStaples sees no removed/added/updated entries
      // and removeItemsByStaple is never called again.
      capturedOnChange!();

      // Observable surface unchanged: still exactly the Bread item, no
      // duplicate removal, no inadvertent re-add.
      const afterSecond = tripService.getItems();
      expect(afterSecond).toHaveLength(1);
      expect(afterSecond[0].name).toBe('Bread');
      expect(afterSecond[0].id).toBe(afterFirst[0].id);
    });
  });
});

// Helper: build a StapleItem for diff tests
const makeStaple = (overrides: Partial<StapleItem> & { id: string }): StapleItem => ({
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-04-10T10:00:00.000Z',
  ...overrides,
});

describe('diffStaples', () => {
  test('returns updated with staples whose houseArea changed', () => {
    const previous = [makeStaple({ id: 's1', houseArea: 'Fridge' })];
    const current = [makeStaple({ id: 's1', houseArea: 'Kitchen Cabinets' })];

    const diff = diffStaples(previous, current);

    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].id).toBe('s1');
    expect(diff.updated[0].houseArea).toBe('Kitchen Cabinets');
  });

  test('returns updated with staples whose storeLocation.section changed', () => {
    const previous = [
      makeStaple({ id: 's1', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
    ];
    const current = [
      makeStaple({ id: 's1', storeLocation: { section: 'Bakery', aisleNumber: 3 } }),
    ];

    const diff = diffStaples(previous, current);

    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].storeLocation.section).toBe('Bakery');
  });

  test('returns updated with staples whose storeLocation.aisleNumber changed', () => {
    const previous = [
      makeStaple({ id: 's1', storeLocation: { section: 'Dairy', aisleNumber: 3 } }),
    ];
    const current = [
      makeStaple({ id: 's1', storeLocation: { section: 'Dairy', aisleNumber: 7 } }),
    ];

    const diff = diffStaples(previous, current);

    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0].storeLocation.aisleNumber).toBe(7);
  });

  test('does NOT include unchanged staples in updated', () => {
    const staple = makeStaple({ id: 's1' });
    const previous = [staple];
    const current = [staple];

    const diff = diffStaples(previous, current);

    expect(diff.updated).toHaveLength(0);
  });

  test('does NOT include added staples in updated', () => {
    const previous: StapleItem[] = [];
    const current = [makeStaple({ id: 's-new' })];

    const diff = diffStaples(previous, current);

    expect(diff.added).toHaveLength(1);
    expect(diff.updated).toHaveLength(0);
  });

  test('does NOT include removed staples in updated', () => {
    const previous = [makeStaple({ id: 's-gone' })];
    const current: StapleItem[] = [];

    const diff = diffStaples(previous, current);

    expect(diff.removed).toHaveLength(1);
    expect(diff.updated).toHaveLength(0);
  });

  test('returns empty updated when previous and current are identical', () => {
    const a = makeStaple({ id: 's1' });
    const b = makeStaple({ id: 's2', name: 'Bread', houseArea: 'Kitchen Cabinets' });

    const diff = diffStaples([a, b], [a, b]);

    expect(diff.updated).toHaveLength(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });
});
