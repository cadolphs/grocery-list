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
// This test reproduces the bug. Adapter A writes a trip + carryover, then we
// simulate a cold-start: reset the in-memory Firestore backing store so the
// next onSnapshot fires with exists()===false (offline, no remote doc). Adapter
// B is created fresh with the same uid. After initialize(), adapter B should
// return the trip and carryover that adapter A saved — but with current code it
// returns null/[], because nothing rehydrates the cache.
//
// EXPECTATION: This test FAILS against current code (RED). It will pass once
// the adapter mirrors writes to AsyncStorage and re-hydrates on initialize().

import { Trip, TripItem } from '../../src/domain/types';

// --- Firestore mock infrastructure ---

type MockDocData = Record<string, unknown> | undefined;
const mockStore: Record<string, MockDocData> = {};

const mockDoc = jest.fn((_db: unknown, ...pathSegments: string[]) => ({
  path: pathSegments.join('/'),
}));

const mockSetDoc = jest.fn(async (docRef: { path: string }, data: unknown) => {
  // Simulate offline Firestore: setDoc does NOT update the backing store that
  // future onSnapshot subscribers will read. This models the real offline case
  // where writes are queued but not yet round-tripped, and a process restart
  // loses the queued writes from the native SDK's in-memory state.
  void docRef;
  void data;
});

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => MockDocData }) => void;

const mockOnSnapshot = jest.fn((docRef: { path: string }, callback: SnapshotCallback) => {
  // Fire immediately with whatever is in mockStore (empty by default -> exists=false).
  const data = mockStore[docRef.path];
  callback({
    exists: () => data !== undefined,
    data: () => data,
  });
  return jest.fn(); // unsubscribe
});

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
}));

// --- Test helpers ---

const TEST_UID = 'offline-coldstart-uid';

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

const createFreshAdapter = async () => {
  // require() each time so the module picks up the current mocks; matches the
  // convention used in firestore-trip-storage.test.ts.
  const { createFirestoreTripStorage } = require('../../src/adapters/firestore/firestore-trip-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreTripStorage(mockDb, TEST_UID);
  await storage.initialize();
  return storage;
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
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
