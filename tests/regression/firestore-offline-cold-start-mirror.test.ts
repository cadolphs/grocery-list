// Regression test: the Firestore staple adapter loses the user's staple library
// on an offline cold start.
//
// Defect (RCA primary cause, causal-chain links 2-4):
// createFirestoreStapleStorage binds readiness to a remote round trip — cache is
// hydrated exclusively from inside the first onSnapshot callback, and an absent
// document is read as "the user has no staples" rather than "the server has not
// told us anything yet". On native there is no durable Firestore cache
// (persistentLocalCache() throws UNIMPLEMENTED), so a cold start in a store with
// dead wifi produces an empty staple list, which then propagates into the
// completed-trip rebuild and erases the stored trip.
//
// The existing sibling `firestore-trip-offline-cold-start.test.ts` models offline
// as a fast hard failure (airplane mode). The real store condition is
// connected-but-dead or flapping wifi: the first snapshot is DELAYED, or never
// arrives at all. This file adds a controllable snapshot mode so both regimes are
// exercised, and asserts through the StapleStorage port surface returned by the
// factory — never through an internal helper.

import type { StapleItem } from '../../src/domain/types';
import type { StapleStorage } from '../../src/ports/staple-storage';
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

const TEST_UID = 'staple-coldstart-uid';
const OTHER_UID = 'staple-coldstart-other-uid';
const staplesDocPath = (uid: string) => `users/${uid}/data/staples`;

const makeStaple = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'staple-1',
  name: 'Milk',
  houseArea: 'Kitchen',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

type StapleAdapter = StapleStorage & {
  initialize: () => Promise<void>;
  unsubscribe: () => void;
};

const createAdapter = (uid: string = TEST_UID): StapleAdapter => {
  const {
    createFirestoreStapleStorage,
  } = require('../../src/adapters/firestore/firestore-staple-storage');
  return createFirestoreStapleStorage({ type: 'firestore' }, uid) as StapleAdapter;
};

const createInitializedAdapter = async (
  uid: string = TEST_UID
): Promise<StapleAdapter> => {
  const adapter = createAdapter(uid);
  await adapter.initialize();
  return adapter;
};

// Let queued microtasks (the AsyncStorage read inside initialize) settle without
// awaiting initialize() itself — which, under 'withheld', never resolves.
const settlePendingReads = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  snapshotMode = 'immediate';
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  Object.keys(capturedCallbacks).forEach((key) => delete capturedCallbacks[key]);
  await AsyncStorage.clear();
});

describe('Firestore staple adapter — offline cold-start mirror regression', () => {
  test('cold start with an absent first snapshot returns the previous session staples', async () => {
    const adapterA = await createInitializedAdapter();
    const milk = makeStaple();
    adapterA.save(milk);

    // Process restart: fresh adapter, same uid. mockStore is still empty because
    // the offline setDoc never published, so onSnapshot reports exists()===false.
    const adapterB = await createInitializedAdapter();

    expect(adapterB.loadAll()).toEqual([milk]);
  });

  test('mirrored staples are readable before initialize() resolves when the first snapshot is withheld', async () => {
    const adapterA = await createInitializedAdapter();
    const milk = makeStaple();
    adapterA.save(milk);

    // Connected-but-dead wifi: the callback is registered but never fires, so
    // initialize() stays pending forever. Hydration must not depend on it.
    snapshotMode = 'withheld';
    const adapterB = createAdapter();
    let initializeResolved = false;
    void adapterB.initialize().then(() => {
      initializeResolved = true;
    });

    await settlePendingReads();

    expect(initializeResolved).toBe(false);
    expect(adapterB.loadAll()).toEqual([milk]);
  });

  test('a late absent snapshot does not overwrite the mirrored staples', async () => {
    const adapterA = await createInitializedAdapter();
    const milk = makeStaple();
    adapterA.save(milk);

    snapshotMode = 'delayed';
    const adapterB = createAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    deliverSnapshot(staplesDocPath(TEST_UID), undefined);

    expect(adapterB.loadAll()).toEqual([milk]);
  });

  test('a late empty snapshot does not overwrite the mirrored staples', async () => {
    const adapterA = await createInitializedAdapter();
    const milk = makeStaple();
    adapterA.save(milk);

    snapshotMode = 'delayed';
    const adapterB = createAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    deliverSnapshot(staplesDocPath(TEST_UID), { items: [] });

    expect(adapterB.loadAll()).toEqual([milk]);
  });

  test('a snapshot carrying data replaces the mirrored staples and is re-mirrored', async () => {
    const adapterA = await createInitializedAdapter();
    const milk = makeStaple();
    adapterA.save(milk);

    snapshotMode = 'delayed';
    const adapterB = createAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    const bread = makeStaple({ id: 'staple-2', name: 'Bread' });
    deliverSnapshot(staplesDocPath(TEST_UID), { items: [bread] });

    expect(adapterB.loadAll()).toEqual([bread]);

    // The server-authoritative list is now what a later cold start recovers.
    snapshotMode = 'immediate';
    delete mockStore[staplesDocPath(TEST_UID)];
    const adapterC = await createInitializedAdapter();

    expect(adapterC.loadAll()).toEqual([bread]);
  });

  test.each([
    [
      'save',
      (adapter: StapleAdapter) => adapter.save(makeStaple({ id: 'staple-2', name: 'Bread' })),
      [makeStaple(), makeStaple({ id: 'staple-2', name: 'Bread' })],
    ],
    ['remove', (adapter: StapleAdapter) => adapter.remove('staple-1'), []],
    [
      'update',
      (adapter: StapleAdapter) => adapter.update(makeStaple({ name: 'Oat Milk' })),
      [makeStaple({ name: 'Oat Milk' })],
    ],
    [
      'updateArea',
      (adapter: StapleAdapter) => adapter.updateArea('Kitchen', 'Cocina'),
      [makeStaple({ houseArea: 'Cocina' })],
    ],
  ])('%s survives a cold start', async (_operation, applyOperation, expected) => {
    const adapterA = await createInitializedAdapter();
    adapterA.save(makeStaple());
    applyOperation(adapterA as StapleAdapter);

    const adapterB = await createInitializedAdapter();

    expect(adapterB.loadAll()).toEqual(expected);
  });

  test('a uid with no mirror entry and an absent snapshot reports an empty staple list', async () => {
    const adapter = await createInitializedAdapter();

    expect(adapter.loadAll()).toEqual([]);
  });

  test('mirrored staples are never visible across uids', async () => {
    const adapterA = await createInitializedAdapter(TEST_UID);
    adapterA.save(makeStaple());

    const otherUserAdapter = await createInitializedAdapter(OTHER_UID);

    expect(otherUserAdapter.loadAll()).toEqual([]);
  });

  test('an already-migrated user hydrating from the mirror does not re-run the legacy migration', async () => {
    const adapterA = await createInitializedAdapter();
    adapterA.save(makeStaple());

    const adapterB = await createInitializedAdapter();

    const { migrationNeeded } = require('../../src/adapters/firestore/migration');
    expect(migrationNeeded(adapterB)).toBe(false);
  });
});
