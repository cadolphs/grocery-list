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
  readonly createStapleStorage: (uid: string) => InitializableStapleStorage;
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
};

// Helper: create initializable wrappers around null storages
const createInitializableStapleStorage = (): InitializableStapleStorage => ({
  ...createNullStapleStorage(),
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
});
