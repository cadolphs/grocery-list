// useAppInitialization - creates adapters, initializes caches, wires services
// Returns { isReady, services, error, needsAuth } for App.tsx to gate rendering
//
// When authenticated: creates Firestore adapters for staples, areas, section order.
// TripStorage always uses AsyncStorage (not synced to cloud).
// When not authenticated: signals needsAuth without creating adapters.

import { useState, useEffect } from 'react';
import { createAsyncStapleStorage } from '../adapters/async-storage/async-staple-storage';
import { createAsyncTripStorage } from '../adapters/async-storage/async-trip-storage';
import { createAsyncAreaStorage } from '../adapters/async-storage/async-area-storage';
import { createAsyncSectionOrderStorage } from '../adapters/async-storage/async-section-order-storage';
import { createFirestoreStapleStorage } from '../adapters/firestore/firestore-staple-storage';
import { createFirestoreAreaStorage } from '../adapters/firestore/firestore-area-storage';
import { createFirestoreSectionOrderStorage } from '../adapters/firestore/firestore-section-order-storage';
import { getFirebaseDb } from '../adapters/firestore/firebase-config';
import { migrationNeeded, migrateToFirestore } from '../adapters/firestore/migration';
import { createStapleLibrary, StapleLibrary } from '../domain/staple-library';
import { createTrip, TripService } from '../domain/trip';
import { createAreaManagement, AreaManagement } from '../domain/area-management';
import { StapleStorage } from '../ports/staple-storage';
import { AreaStorage } from '../ports/area-storage';
import { SectionOrderStorage } from '../ports/section-order-storage';
import { TripStorage } from '../ports/trip-storage';
import { AuthUser } from '../auth/AuthService';
import { StapleItem } from '../domain/types';

export type AppServices = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
  readonly areaManagement: AreaManagement;
  readonly sectionOrderStorage: SectionOrderStorage;
};

export type AppInitializationResult = {
  readonly isReady: boolean;
  readonly services: AppServices | null;
  readonly error: string | null;
  readonly needsAuth: boolean;
  readonly unsubscribeAll?: () => void;
};

// Initializable storage = port + initialize() + optional unsubscribe()
type InitializableStorage<T> = T & {
  initialize: () => Promise<void>;
  unsubscribe?: () => void;
};

export type AdapterFactories = {
  readonly createStapleStorage: (uid: string, options?: { onChange?: () => void }) => InitializableStorage<StapleStorage>;
  readonly createAreaStorage: (uid: string) => InitializableStorage<AreaStorage>;
  readonly createSectionOrderStorage: (uid: string) => InitializableStorage<SectionOrderStorage>;
  readonly createTripStorage: () => InitializableStorage<TripStorage>;
  readonly checkMigrationNeeded: (firestoreStaples: StapleStorage) => boolean;
  readonly migrateToFirestore: (
    from: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
    to: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
  ) => void;
  readonly createAsyncStapleStorage: () => InitializableStorage<StapleStorage>;
  readonly createAsyncAreaStorage: () => InitializableStorage<AreaStorage>;
  readonly createAsyncSectionOrderStorage: () => InitializableStorage<SectionOrderStorage>;
};

const notAuthenticated: AppInitializationResult = {
  isReady: false,
  services: null,
  error: null,
  needsAuth: true,
};

const initializationError = (message: string): AppInitializationResult => ({
  isReady: false,
  services: null,
  error: message,
  needsAuth: false,
});

const runMigrationIfNeeded = async (
  factories: AdapterFactories,
  firestoreStaples: StapleStorage,
  firestoreAreas: AreaStorage,
  firestoreSectionOrder: SectionOrderStorage,
): Promise<void> => {
  if (!factories.checkMigrationNeeded(firestoreStaples)) return;

  const asyncStaples = factories.createAsyncStapleStorage();
  const asyncAreas = factories.createAsyncAreaStorage();
  const asyncSectionOrder = factories.createAsyncSectionOrderStorage();

  await Promise.all([
    asyncStaples.initialize(),
    asyncAreas.initialize(),
    asyncSectionOrder.initialize(),
  ]);

  factories.migrateToFirestore(
    { staples: asyncStaples, areas: asyncAreas, sectionOrder: asyncSectionOrder },
    { staples: firestoreStaples, areas: firestoreAreas, sectionOrder: firestoreSectionOrder },
  );
};

// Pure function: compute added and removed staples by comparing old vs new lists
export type StapleDiff = {
  readonly added: readonly StapleItem[];
  readonly removed: readonly StapleItem[];
};

export const diffStaples = (
  previousStaples: readonly StapleItem[],
  currentStaples: readonly StapleItem[],
): StapleDiff => {
  const previousIds = new Set(previousStaples.map(s => s.id));
  const currentIds = new Set(currentStaples.map(s => s.id));

  const added = currentStaples.filter(s => !previousIds.has(s.id));
  const removed = previousStaples.filter(s => !currentIds.has(s.id));

  return { added, removed };
};

export const initializeApp = async (
  authUser: AuthUser | null,
  factories: AdapterFactories,
): Promise<AppInitializationResult> => {
  if (authUser === null) return notAuthenticated;

  try {
    const { uid } = authUser;

    // Late-binding callback: set after trip service is created
    let handleStapleChange: (() => void) | undefined;
    const onStapleChange = () => handleStapleChange?.();

    const stapleStorage = factories.createStapleStorage(uid, { onChange: onStapleChange });
    const areaStorage = factories.createAreaStorage(uid);
    const sectionOrderStorage = factories.createSectionOrderStorage(uid);
    const tripStorage = factories.createTripStorage();

    await Promise.all([
      stapleStorage.initialize(),
      areaStorage.initialize(),
      sectionOrderStorage.initialize(),
      tripStorage.initialize(),
    ]);

    await runMigrationIfNeeded(factories, stapleStorage, areaStorage, sectionOrderStorage);

    const stapleLibrary = createStapleLibrary(stapleStorage);
    const areas = areaStorage.loadAll();
    const tripService = createTrip(tripStorage, areas);
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    tripService.initializeFromStorage(stapleLibrary.listAll());

    // Wire auto-add/remove: track previous staples, diff on change
    let previousStaples = stapleLibrary.listAll();
    handleStapleChange = () => {
      const currentStaples = stapleLibrary.listAll();
      const { added, removed } = diffStaples(previousStaples, currentStaples);

      for (const staple of added) {
        tripService.addItem({
          name: staple.name,
          houseArea: staple.houseArea,
          storeLocation: staple.storeLocation,
          itemType: 'staple',
          source: 'preloaded',
        });
      }

      for (const staple of removed) {
        tripService.removeItemByStapleId(staple.id);
      }

      previousStaples = currentStaples;
    };

    const unsubscribeAll = () => {
      stapleStorage.unsubscribe?.();
      areaStorage.unsubscribe?.();
      sectionOrderStorage.unsubscribe?.();
      tripStorage.unsubscribe?.();
    };

    return {
      isReady: true,
      services: { stapleLibrary, tripService, areaManagement, sectionOrderStorage },
      error: null,
      needsAuth: false,
      unsubscribeAll,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return initializationError(message);
  }
};

// Production factories: Firestore for staples/areas/sectionOrder, AsyncStorage for trips
const createProductionFactories = (): AdapterFactories => {
  const db = getFirebaseDb();
  return {
    createStapleStorage: (uid, options) => createFirestoreStapleStorage(db, uid, options),
    createAreaStorage: (uid) => createFirestoreAreaStorage(db, uid),
    createSectionOrderStorage: (uid) => createFirestoreSectionOrderStorage(db, uid),
    createTripStorage: () => createAsyncTripStorage(),
    checkMigrationNeeded: migrationNeeded,
    migrateToFirestore,
    createAsyncStapleStorage: () => createAsyncStapleStorage(),
    createAsyncAreaStorage: () => createAsyncAreaStorage(),
    createAsyncSectionOrderStorage: () => createAsyncSectionOrderStorage(),
  };
};

// Legacy factories: all AsyncStorage (backward compatibility for unauthenticated usage)
const createLegacyFactories = (): AdapterFactories => ({
  createStapleStorage: () => createAsyncStapleStorage(),
  createAreaStorage: () => createAsyncAreaStorage(),
  createSectionOrderStorage: () => createAsyncSectionOrderStorage(),
  createTripStorage: () => createAsyncTripStorage(),
  checkMigrationNeeded: () => false,
  migrateToFirestore: () => {},
  createAsyncStapleStorage: () => createAsyncStapleStorage(),
  createAsyncAreaStorage: () => createAsyncAreaStorage(),
  createAsyncSectionOrderStorage: () => createAsyncSectionOrderStorage(),
});

export const useAppInitialization = (
  authUser?: AuthUser | null,
  factories?: AdapterFactories,
): AppInitializationResult => {
  const [result, setResult] = useState<AppInitializationResult>({
    isReady: false,
    services: null,
    error: null,
    needsAuth: false,
  });

  useEffect(() => {
    let cancelled = false;

    // If no auth user provided, use legacy behavior (all AsyncStorage, no auth check)
    const isLegacyMode = authUser === undefined;
    const resolvedUser = isLegacyMode ? { uid: 'local', email: null } : authUser;
    const resolvedFactories = factories ?? (isLegacyMode ? createLegacyFactories() : createProductionFactories());

    let unsubscribeAll: (() => void) | undefined;

    initializeApp(resolvedUser, resolvedFactories)
      .then((initResult) => {
        if (!cancelled) {
          unsubscribeAll = initResult.unsubscribeAll;
          setResult(initResult);
        } else {
          // Component unmounted before initialization completed; clean up immediately
          initResult.unsubscribeAll?.();
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setResult(initializationError(err.message));
        }
      });

    return () => {
      cancelled = true;
      unsubscribeAll?.();
    };
  }, [authUser, factories]);

  return result;
};
