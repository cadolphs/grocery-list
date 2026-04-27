// useAppInitialization - creates adapters, initializes caches, wires services
// Returns { isReady, services, error, needsAuth } for App.tsx to gate rendering
//
// When authenticated: creates Firestore adapters for staples, areas, section
//   order, AND trip. The Firestore trip adapter mirrors its cache to
//   AsyncStorage for offline durability (Firebase JS SDK has no persistent
//   cache on React Native — see firebase-js-sdk#7947).
// When not authenticated: signals needsAuth without creating adapters; the
//   legacy factories fall back to pure AsyncStorage adapters.

import { useState, useEffect } from 'react';
import { createAsyncStapleStorage } from '../adapters/async-storage/async-staple-storage';
import { createAsyncTripStorage } from '../adapters/async-storage/async-trip-storage';
import { createAsyncAreaStorage } from '../adapters/async-storage/async-area-storage';
import { createAsyncSectionOrderStorage } from '../adapters/async-storage/async-section-order-storage';
import { createFirestoreStapleStorage } from '../adapters/firestore/firestore-staple-storage';
import { createFirestoreAreaStorage } from '../adapters/firestore/firestore-area-storage';
import { createFirestoreSectionOrderStorage } from '../adapters/firestore/firestore-section-order-storage';
import { createFirestoreTripStorage } from '../adapters/firestore/firestore-trip-storage';
import { getFirebaseDb } from '../adapters/firestore/firebase-config';
import { migrationNeeded, migrateToFirestore, migrateTripIfNeeded } from '../adapters/firestore/migration';
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
  readonly createAreaStorage: (uid: string, options?: { onChange?: () => void }) => InitializableStorage<AreaStorage>;
  readonly createSectionOrderStorage: (uid: string) => InitializableStorage<SectionOrderStorage>;
  readonly createTripStorage: (uid: string, options?: { onChange?: () => void }) => InitializableStorage<TripStorage>;
  readonly checkMigrationNeeded: (firestoreStaples: StapleStorage) => boolean;
  readonly migrateToFirestore: (
    from: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
    to: { staples: StapleStorage; areas: AreaStorage; sectionOrder: SectionOrderStorage },
  ) => void;
  readonly createAsyncStapleStorage: () => InitializableStorage<StapleStorage>;
  readonly createAsyncAreaStorage: () => InitializableStorage<AreaStorage>;
  readonly createAsyncSectionOrderStorage: () => InitializableStorage<SectionOrderStorage>;
  readonly createAsyncTripStorage: () => InitializableStorage<TripStorage>;
  readonly migrateTripIfNeeded: (localTrip: TripStorage, cloudTrip: TripStorage) => void;
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
  firestoreTripStorage: TripStorage,
): Promise<void> => {
  // Trip migration runs independently (has its own idempotency guard)
  const asyncTripStorage = factories.createAsyncTripStorage();
  await asyncTripStorage.initialize();
  factories.migrateTripIfNeeded(asyncTripStorage, firestoreTripStorage);

  // Staple/area/sectionOrder migration only if needed
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

// Pure function: compute added, removed, and updated staples by comparing old vs new lists.
// An "updated" staple is a same-id staple whose houseArea or storeLocation (section/aisleNumber)
// differs between previous and current. The CURRENT (new) staple is returned in `updated`
// so consumers get the post-edit values.
export type StapleDiff = {
  readonly added: readonly StapleItem[];
  readonly removed: readonly StapleItem[];
  readonly updated: readonly StapleItem[];
};

const hasRelevantChange = (previous: StapleItem, current: StapleItem): boolean =>
  previous.houseArea !== current.houseArea ||
  previous.storeLocation.section !== current.storeLocation.section ||
  previous.storeLocation.aisleNumber !== current.storeLocation.aisleNumber;

export const diffStaples = (
  previousStaples: readonly StapleItem[],
  currentStaples: readonly StapleItem[],
): StapleDiff => {
  const previousById = new Map(previousStaples.map(s => [s.id, s]));
  const currentIds = new Set(currentStaples.map(s => s.id));

  const added = currentStaples.filter(s => !previousById.has(s.id));
  const removed = previousStaples.filter(s => !currentIds.has(s.id));
  const updated = currentStaples.filter(s => {
    const previous = previousById.get(s.id);
    if (previous === undefined) return false;
    return hasRelevantChange(previous, s);
  });

  return { added, removed, updated };
};

// Apply each diff bucket to the trip. Each helper has one responsibility,
// matching the three branches of handleStapleChange.

const applyAddedStaplesToTrip = (
  tripService: TripService,
  added: readonly StapleItem[],
): void => {
  for (const staple of added) {
    // Duplicate guard: skip if trip already has an item with this stapleId
    const alreadyInTrip = tripService.getItems().some(item => item.stapleId === staple.id);
    if (alreadyInTrip) continue;

    tripService.addItem({
      name: staple.name,
      houseArea: staple.houseArea,
      storeLocation: staple.storeLocation,
      itemType: 'staple',
      source: 'preloaded',
      stapleId: staple.id,
    });
  }
};

const applyRemovedStaplesToTrip = (
  tripService: TripService,
  removed: readonly StapleItem[],
): void => {
  for (const staple of removed) {
    tripService.removeItemsByStaple(staple);
  }
};

const applyUpdatedStaplesToTrip = (
  tripService: TripService,
  updated: readonly StapleItem[],
): void => {
  for (const staple of updated) {
    tripService.syncStapleUpdate(staple.id, {
      houseArea: staple.houseArea,
      storeLocation: staple.storeLocation,
    });
  }
};

export const initializeApp = async (
  authUser: AuthUser | null,
  factories: AdapterFactories,
): Promise<AppInitializationResult> => {
  if (authUser === null) return notAuthenticated;

  try {
    const { uid } = authUser;

    // Late-binding callbacks: set after services are created
    // eslint-disable-next-line prefer-const
    let handleStapleChange: (() => void) | undefined;
    const onStapleChange = () => handleStapleChange?.();

    // eslint-disable-next-line prefer-const
    let handleTripChange: (() => void) | undefined;
    const onTripChange = () => handleTripChange?.();

    // eslint-disable-next-line prefer-const
    let handleAreaChange: (() => void) | undefined;
    const onAreaChange = () => handleAreaChange?.();

    const stapleStorage = factories.createStapleStorage(uid, { onChange: onStapleChange });
    const areaStorage = factories.createAreaStorage(uid, { onChange: onAreaChange });
    const sectionOrderStorage = factories.createSectionOrderStorage(uid);
    const tripStorage = factories.createTripStorage(uid, { onChange: onTripChange });

    await Promise.all([
      stapleStorage.initialize(),
      areaStorage.initialize(),
      sectionOrderStorage.initialize(),
      tripStorage.initialize(),
    ]);

    await runMigrationIfNeeded(factories, stapleStorage, areaStorage, sectionOrderStorage, tripStorage);

    const stapleLibrary = createStapleLibrary(stapleStorage);
    // Pass a live-read getter so getSweepProgress().totalAreas reflects the
    // current area list even when areas are added/removed without recreating
    // the trip service (RCA: frozen tripAreas snapshot, trip.ts:96-97,201).
    const tripService = createTrip(tripStorage, () => areaStorage.loadAll());
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    tripService.initializeFromStorage(stapleLibrary.listAll().filter((s) => s.type === 'staple'));

    // Wire trip onChange: reload from storage when remote changes arrive
    handleTripChange = () => {
      tripService.loadFromStorage();
    };

    // Wire area onChange: notify the domain's subscribers so React hooks
    // (useAreas, and transitively anything reading areaManagement.getAreas())
    // re-render. The Firestore area adapter fires both `onChange` and its
    // own listener fan-out, so this callback is the application-level seam
    // for future side-effects (logging, analytics, invariant checks) while
    // the direct reactivity path flows via `areaStorage.subscribe`.
    handleAreaChange = () => {
      // No domain-side reload needed: area-management reads through to the
      // storage cache on each getAreas() call. Listener fan-out (via
      // areaStorage.subscribe) drives React re-render directly.
    };

    // Wire auto-add/remove: track previous staples, diff on change
    let previousStaples = stapleLibrary.listAll().filter((s) => s.type === 'staple');
    handleStapleChange = () => {
      const currentStaples = stapleLibrary.listAll().filter((s) => s.type === 'staple');
      const { added, removed, updated } = diffStaples(previousStaples, currentStaples);

      applyAddedStaplesToTrip(tripService, added);
      applyRemovedStaplesToTrip(tripService, removed);
      // syncStapleUpdate is idempotent (skips notify+persist when content
      // equal), which guards against the onSnapshot echo loop after a
      // UI-driven edit.
      applyUpdatedStaplesToTrip(tripService, updated);

      previousStaples = currentStaples;
    };

    // Reactivity wiring: subscribe to the stapleLibrary's own change seam so
    // that LOCAL deletes (UI-driven `stapleLibrary.remove`) drive trip cleanup
    // even when the Firestore adapter suppresses its own-write echo via
    // `stapleStorage.onChange`. The two paths fan into the same handler, so
    // remote/cross-device deletes (which DO surface through `onChange`) keep
    // working unchanged. `diffStaples` makes the second fire a no-op against
    // an already-advanced `previousStaples`, so double-firing is idempotent.
    const unsubscribeStapleLibrary = stapleLibrary.subscribe(onStapleChange);

    const unsubscribeAll = () => {
      stapleStorage.unsubscribe?.();
      areaStorage.unsubscribe?.();
      sectionOrderStorage.unsubscribe?.();
      tripStorage.unsubscribe?.();
      unsubscribeStapleLibrary();
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

// Production factories: Firestore for staples/areas/sectionOrder/trip.
// The Firestore trip adapter mirrors writes to AsyncStorage for offline
// durability (compensating for the lack of persistentLocalCache on RN).
const createProductionFactories = (): AdapterFactories => {
  const db = getFirebaseDb();
  return {
    createStapleStorage: (uid, options) => createFirestoreStapleStorage(db, uid, options),
    createAreaStorage: (uid, options) => createFirestoreAreaStorage(db, uid, options),
    createSectionOrderStorage: (uid) => createFirestoreSectionOrderStorage(db, uid),
    createTripStorage: (uid, options) => createFirestoreTripStorage(db, uid, options),
    checkMigrationNeeded: migrationNeeded,
    migrateToFirestore,
    createAsyncStapleStorage: () => createAsyncStapleStorage(),
    createAsyncAreaStorage: () => createAsyncAreaStorage(),
    createAsyncSectionOrderStorage: () => createAsyncSectionOrderStorage(),
    createAsyncTripStorage: () => createAsyncTripStorage(),
    migrateTripIfNeeded,
  };
};

// Legacy factories: all AsyncStorage (backward compatibility for unauthenticated usage)
const createLegacyFactories = (): AdapterFactories => ({
  createStapleStorage: () => createAsyncStapleStorage(),
  createAreaStorage: () => createAsyncAreaStorage(),
  createSectionOrderStorage: () => createAsyncSectionOrderStorage(),
  createTripStorage: (_uid: string) => createAsyncTripStorage(),
  checkMigrationNeeded: () => false,
  migrateToFirestore: () => {},
  createAsyncStapleStorage: () => createAsyncStapleStorage(),
  createAsyncAreaStorage: () => createAsyncAreaStorage(),
  createAsyncSectionOrderStorage: () => createAsyncSectionOrderStorage(),
  createAsyncTripStorage: () => createAsyncTripStorage(),
  migrateTripIfNeeded: () => {},
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
