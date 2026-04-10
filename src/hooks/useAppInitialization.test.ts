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
import { initializeApp } from './useAppInitialization';

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
});
