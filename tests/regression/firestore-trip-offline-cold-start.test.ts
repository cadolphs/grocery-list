// Regression test: native Firestore trip adapter loses data on offline cold-start.
//
// Defect: createFirestoreTripStorage hydrates its in-memory cache exclusively from
// onSnapshot(). When the device is offline and the Firestore backend has nothing
// cached for this uid (or the app process was restarted without a hot Firestore
// cache), the initial snapshot reports exists()===false. The adapter therefore
// sees null/empty state even though a trip was saved by a previous adapter
// instance. The fix (step 01-02) adds an AsyncStorage durability mirror so a
// fresh adapter can hydrate locally-persisted state on cold-start.
//
// Second defect (fix-slow-render-flaky-network, RCA Root Cause B): every local
// write disarmed the hydrated-from-local guard. On flapping wifi the first
// snapshot arrives AFTER the user has already edited the mirrored trip, reports
// exists()===false, and — with the guard stood down by the edit — nulls the trip.
// A local write is no evidence about server state; only a snapshot actually
// carrying data may disarm the guard.
//
// The mock models offline Firestore: setDoc never publishes to the backing store
// that future subscribers read. Snapshot delivery is controllable so the tests
// can express "edit, then a late snapshot". Assertions go through the port
// surface returned by the factory — never through an internal helper.

import { Trip, TripItem } from '../../src/domain/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Firestore mock infrastructure ---

type MockDocData = Record<string, unknown> | undefined;
const mockStore: Record<string, MockDocData> = {};

type SnapshotCallback = (snapshot: {
  exists: () => boolean;
  data: () => MockDocData;
}) => void;

// Snapshot delivery regimes, modelling the three real network conditions:
//   'immediate' — the server answers at once (airplane mode / healthy network)
//   'withheld'  — the callback is registered but never invoked (connected-but-dead
//                 wifi: Firestore withholds the initial event until it decides it
//                 is offline, which on flapping wifi can be unbounded)
//   'delayed'   — the callback is captured and the test decides when it fires
type SnapshotMode = 'immediate' | 'withheld' | 'delayed';

let snapshotMode: SnapshotMode = 'immediate';
const capturedCallbacks: Record<string, SnapshotCallback> = {};

const buildSnapshot = (data: MockDocData) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const mockDoc = jest.fn((_db: unknown, ...pathSegments: string[]) => ({
  path: pathSegments.join('/'),
}));

// Offline Firestore: the write is queued locally and never reaches the backing
// store that future subscribers read. A process restart loses it.
const mockSetDoc = jest.fn(async (_docRef: { path: string }, _data: unknown) => {});

const mockOnSnapshot = jest.fn(
  (docRef: { path: string }, callback: SnapshotCallback) => {
    capturedCallbacks[docRef.path] = callback;
    if (snapshotMode === 'immediate') {
      callback(buildSnapshot(mockStore[docRef.path]));
    }
    return jest.fn();
  }
);

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
}));

// Deliver a snapshot to an already-registered subscriber.
const deliverSnapshot = (path: string, data: MockDocData): void => {
  mockStore[path] = data;
  capturedCallbacks[path]?.(buildSnapshot(data));
};

// --- Test helpers ---

const TEST_UID = 'offline-coldstart-uid';
const tripDocPath = (uid: string) => `users/${uid}/data/trip`;
const carryoverDocPath = (uid: string) => `users/${uid}/data/carryover`;

const makeTripItem = (overrides: Partial<TripItem> = {}): TripItem => ({
  id: 'trip-item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-offline-1',
  items: [makeTripItem()],
  status: 'active',
  createdAt: '2026-04-13T10:00:00.000Z',
  ...overrides,
});

const createAdapter = (onChange?: () => void) => {
  // require() each time so the module picks up the current mocks; matches the
  // convention used in firestore-trip-storage.test.ts.
  const { createFirestoreTripStorage } = require('../../src/adapters/firestore/firestore-trip-storage');
  const mockDb = { type: 'firestore' };
  return createFirestoreTripStorage(mockDb, TEST_UID, { onChange });
};

const createFreshAdapter = async () => {
  const storage = createAdapter();
  await storage.initialize();
  return storage;
};

// Let queued microtasks (the AsyncStorage read inside initialize) settle without
// awaiting initialize() itself — which, under 'withheld'/'delayed', stays
// pending until the first snapshot is delivered.
const settlePendingReads = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Cold start with the first snapshot delayed: the mirror is hydrated but the
// server has not spoken yet.
const createHydratedAdapterAwaitingSnapshot = async (onChange?: () => void) => {
  snapshotMode = 'delayed';
  const storage = createAdapter(onChange);
  void storage.initialize();
  await settlePendingReads();
  return storage;
};

beforeEach(async () => {
  jest.clearAllMocks();
  snapshotMode = 'immediate';
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  Object.keys(capturedCallbacks).forEach((key) => delete capturedCallbacks[key]);
  await AsyncStorage.clear();
});

describe('Firestore trip adapter — offline cold-start regression', () => {
  it('adapter B (cold-start after adapter A) recovers trip saved by adapter A', async () => {
    // Adapter A: initialized with empty remote state (offline, no remote doc).
    const adapterA = await createFreshAdapter();
    const savedTrip = makeTrip();
    adapterA.saveTrip(savedTrip);

    // Simulate process restart: new adapter instance, same uid.
    // mockStore is still empty (setDoc did not publish), so onSnapshot will
    // fire exists=false. Any in-process cache in adapter A is gone.
    const adapterB = await createFreshAdapter();

    expect(adapterB.loadTrip()).toEqual(savedTrip);
  });

  it('adapter B (cold-start after adapter A) recovers carryover saved by adapter A', async () => {
    const adapterA = await createFreshAdapter();
    const savedCarryover: readonly TripItem[] = [
      makeTripItem({ id: 'carry-1', name: 'Olive Oil' }),
      makeTripItem({ id: 'carry-2', name: 'Rice' }),
    ];
    adapterA.saveCarryover(savedCarryover);

    const adapterB = await createFreshAdapter();

    expect(adapterB.loadCarryover()).toEqual(savedCarryover);
  });
});

describe('Firestore trip adapter — a local edit survives a late empty snapshot while a data-bearing snapshot still wins', () => {
  it('a local trip edit made after mirror hydration survives a later absent snapshot', async () => {
    const adapterA = await createFreshAdapter();
    adapterA.saveTrip(makeTrip());

    const onChange = jest.fn();
    const adapterB = await createHydratedAdapterAwaitingSnapshot(onChange);

    const editedTrip = makeTrip({
      items: [makeTripItem({ checked: true, checkedAt: '2026-04-13T10:05:00.000Z' })],
    });
    adapterB.saveTrip(editedTrip);

    deliverSnapshot(tripDocPath(TEST_UID), undefined);

    expect(adapterB.loadTrip()).toEqual(editedTrip);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a local carryover edit made after mirror hydration survives two consecutive absent snapshots', async () => {
    const adapterA = await createFreshAdapter();
    adapterA.saveCarryover([makeTripItem({ id: 'carry-1', name: 'Olive Oil' })]);

    const adapterB = await createHydratedAdapterAwaitingSnapshot();

    const editedCarryover: readonly TripItem[] = [
      makeTripItem({ id: 'carry-1', name: 'Olive Oil' }),
      makeTripItem({ id: 'carry-2', name: 'Rice' }),
    ];
    adapterB.saveCarryover(editedCarryover);

    // Flapping reconnect: the absent snapshot is delivered twice.
    deliverSnapshot(carryoverDocPath(TEST_UID), undefined);
    deliverSnapshot(carryoverDocPath(TEST_UID), undefined);

    expect(adapterB.loadCarryover()).toEqual(editedCarryover);
  });

  it('an absent carryover snapshot received while the mirror holds an empty carryover does not disarm the guard for a later local edit', async () => {
    const adapterA = await createFreshAdapter();
    adapterA.saveCarryover([makeTripItem({ id: 'carry-1', name: 'Olive Oil' })]);
    adapterA.clearCarryover();

    const adapterB = await createHydratedAdapterAwaitingSnapshot();

    deliverSnapshot(carryoverDocPath(TEST_UID), undefined);

    const editedCarryover: readonly TripItem[] = [
      makeTripItem({ id: 'carry-2', name: 'Rice' }),
    ];
    adapterB.saveCarryover(editedCarryover);

    deliverSnapshot(carryoverDocPath(TEST_UID), undefined);

    expect(adapterB.loadCarryover()).toEqual(editedCarryover);
  });

  it('a snapshot carrying trip data replaces the mirrored trip, is re-mirrored, and stands the guard down', async () => {
    const adapterA = await createFreshAdapter();
    adapterA.saveTrip(makeTrip());

    const adapterB = await createHydratedAdapterAwaitingSnapshot();

    const serverTrip = makeTrip({
      id: 'trip-offline-2',
      items: [makeTripItem({ id: 'trip-item-2', name: 'Bread' })],
    });
    deliverSnapshot(tripDocPath(TEST_UID), { trip: serverTrip });

    expect(adapterB.loadTrip()).toEqual(serverTrip);

    // The server has spoken: a subsequent absent snapshot is honoured.
    deliverSnapshot(tripDocPath(TEST_UID), undefined);

    expect(adapterB.loadTrip()).toBeNull();

    // The server-authoritative trip is what a later cold start recovers.
    snapshotMode = 'immediate';
    delete mockStore[tripDocPath(TEST_UID)];
    const adapterC = await createFreshAdapter();

    expect(adapterC.loadTrip()).toEqual(serverTrip);
  });
});
