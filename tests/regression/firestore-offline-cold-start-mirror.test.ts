// Regression test: the Firestore staple, area and section-order adapters lose the
// user's data on an offline cold start.
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

import type { StapleItem, TripItem } from '../../src/domain/types';
import type { StapleStorage } from '../../src/ports/staple-storage';
import type { AreaStorage } from '../../src/ports/area-storage';
import type { SectionOrderStorage } from '../../src/ports/section-order-storage';
import type { AreaGroup } from '../../src/domain/item-grouping';
import { DEFAULT_HOUSE_AREAS } from '../../src/adapters/async-storage/async-area-storage';
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

// --- Area adapter (RCA secondary symptom: custom areas replaced by defaults) ---
//
// firestore-area-storage substitutes DEFAULT_HOUSE_AREAS whenever the snapshot is
// absent or carries an empty list. On an offline cold start a user with custom
// areas therefore loses them, and groupByArea silently drops every trip item whose
// houseArea is no longer in the list. The defaults are a NEW-USER fallback, not an
// override: a mirrored list must win over them.

const AREAS_UID = 'area-coldstart-uid';
const areasDocPath = (uid: string) => `users/${uid}/data/areas`;
const CUSTOM_AREAS = ['Home Gym', 'Cellar', 'Utility Room'];

type AreaAdapter = AreaStorage & {
  initialize: () => Promise<void>;
  unsubscribe: () => void;
};

const createAreaAdapter = (uid: string = AREAS_UID): AreaAdapter => {
  const {
    createFirestoreAreaStorage,
  } = require('../../src/adapters/firestore/firestore-area-storage');
  return createFirestoreAreaStorage({ type: 'firestore' }, uid) as AreaAdapter;
};

const createInitializedAreaAdapter = async (
  uid: string = AREAS_UID
): Promise<AreaAdapter> => {
  const adapter = createAreaAdapter(uid);
  await adapter.initialize();
  return adapter;
};

const makeTripItem = (overrides: Partial<TripItem> = {}): TripItem => ({
  id: 'trip-1',
  name: 'Protein Powder',
  houseArea: 'Home Gym',
  storeLocation: { section: 'Supplements', aisleNumber: 7 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

const visibleItemNames = (groups: AreaGroup[]): string[] =>
  groups.flatMap((group) => group.items.map((item) => item.name));

describe('Firestore area adapter — offline cold-start mirror regression', () => {
  test('cold start with an absent first snapshot returns the mirrored custom areas, not the defaults', async () => {
    const adapterA = await createInitializedAreaAdapter();
    adapterA.saveAll(CUSTOM_AREAS);

    const adapterB = await createInitializedAreaAdapter();

    expect(adapterB.loadAll()).toEqual(CUSTOM_AREAS);
  });

  test('a user with no mirrored areas still receives the defaults fallback on first run', async () => {
    const adapter = await createInitializedAreaAdapter();

    expect(adapter.loadAll()).toEqual([...DEFAULT_HOUSE_AREAS]);
  });

  test('mirrored areas are readable before initialize() resolves when the first snapshot is withheld', async () => {
    const adapterA = await createInitializedAreaAdapter();
    adapterA.saveAll(CUSTOM_AREAS);

    snapshotMode = 'withheld';
    const adapterB = createAreaAdapter();
    let initializeResolved = false;
    void adapterB.initialize().then(() => {
      initializeResolved = true;
    });

    await settlePendingReads();

    expect(initializeResolved).toBe(false);
    expect(adapterB.loadAll()).toEqual(CUSTOM_AREAS);
  });

  test.each([
    ['absent', undefined],
    ['empty', { items: [] }],
  ])(
    'a late %s snapshot does not replace the mirrored custom areas with the defaults',
    async (_regime, payload) => {
      const adapterA = await createInitializedAreaAdapter();
      adapterA.saveAll(CUSTOM_AREAS);

      snapshotMode = 'delayed';
      const adapterB = createAreaAdapter();
      void adapterB.initialize();
      await settlePendingReads();

      deliverSnapshot(areasDocPath(AREAS_UID), payload);

      expect(adapterB.loadAll()).toEqual(CUSTOM_AREAS);
    }
  );

  test('a snapshot carrying areas replaces the mirrored areas and is re-mirrored', async () => {
    const adapterA = await createInitializedAreaAdapter();
    adapterA.saveAll(CUSTOM_AREAS);

    snapshotMode = 'delayed';
    const adapterB = createAreaAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    const serverAreas = ['Attic', 'Shed'];
    deliverSnapshot(areasDocPath(AREAS_UID), { items: serverAreas });

    expect(adapterB.loadAll()).toEqual(serverAreas);

    snapshotMode = 'immediate';
    delete mockStore[areasDocPath(AREAS_UID)];
    const adapterC = await createInitializedAreaAdapter();

    expect(adapterC.loadAll()).toEqual(serverAreas);
  });

  test('trip items in custom areas remain grouped and visible after an offline cold start', async () => {
    const { groupByArea } = require('../../src/domain/item-grouping');
    const adapterA = await createInitializedAreaAdapter();
    adapterA.saveAll(CUSTOM_AREAS);

    const adapterB = await createInitializedAreaAdapter();

    const tripItems = [
      makeTripItem(),
      makeTripItem({ id: 'trip-2', name: 'Detergent', houseArea: 'Utility Room' }),
    ];

    const groups = groupByArea(tripItems, adapterB.loadAll()) as AreaGroup[];

    expect(visibleItemNames(groups)).toEqual(['Protein Powder', 'Detergent']);
  });

  test('hydrating from the mirror notifies no subscriber, while a remote delta still does', async () => {
    const adapterA = await createInitializedAreaAdapter();
    adapterA.saveAll(CUSTOM_AREAS);

    snapshotMode = 'delayed';
    const adapterB = createAreaAdapter();
    const listener = jest.fn();
    void adapterB.initialize();
    await settlePendingReads();
    adapterB.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();

    deliverSnapshot(areasDocPath(AREAS_UID), { items: ['Attic'] });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('mirrored areas are never visible across uids', async () => {
    const adapterA = await createInitializedAreaAdapter(AREAS_UID);
    adapterA.saveAll(CUSTOM_AREAS);

    const otherUserAdapter = await createInitializedAreaAdapter('area-coldstart-other-uid');

    expect(otherUserAdapter.loadAll()).toEqual([...DEFAULT_HOUSE_AREAS]);
  });
});

// --- Section-order adapter (null is a REAL value, not an absent one) ---
//
// firestore-section-order-storage resets the cache to null on an absent snapshot.
// Unlike staples and areas, null here is a legitimate stored value — the user can
// deliberately clear the order — so the mirror must encode "no entry" separately
// from "entry whose value is null". Otherwise the fix trades a silent wipe for a
// silent resurrection.

const ORDER_UID = 'section-order-coldstart-uid';
const sectionOrderDocPath = (uid: string) => `users/${uid}/data/sectionOrder`;
const SAVED_ORDER = ['Produce', 'Dairy', 'Supplements'];

type SectionOrderAdapter = SectionOrderStorage & {
  initialize: () => Promise<void>;
  unsubscribe: () => void;
};

const createSectionOrderAdapter = (uid: string = ORDER_UID): SectionOrderAdapter => {
  const {
    createFirestoreSectionOrderStorage,
  } = require('../../src/adapters/firestore/firestore-section-order-storage');
  return createFirestoreSectionOrderStorage(
    { type: 'firestore' },
    uid
  ) as SectionOrderAdapter;
};

const createInitializedSectionOrderAdapter = async (
  uid: string = ORDER_UID
): Promise<SectionOrderAdapter> => {
  const adapter = createSectionOrderAdapter(uid);
  await adapter.initialize();
  return adapter;
};

describe('Firestore section-order adapter — offline cold-start mirror regression', () => {
  test('cold start with an absent first snapshot returns the mirrored order', async () => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);

    const adapterB = await createInitializedSectionOrderAdapter();

    expect(adapterB.loadOrder()).toEqual(SAVED_ORDER);
  });

  test('a deliberately cleared order stays cleared across a cold start', async () => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);
    adapterA.clearOrder();

    const adapterB = await createInitializedSectionOrderAdapter();

    expect(adapterB.loadOrder()).toBeNull();
  });

  test('mirrored order is readable before initialize() resolves when the first snapshot is withheld', async () => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);

    snapshotMode = 'withheld';
    const adapterB = createSectionOrderAdapter();
    let initializeResolved = false;
    void adapterB.initialize().then(() => {
      initializeResolved = true;
    });

    await settlePendingReads();

    expect(initializeResolved).toBe(false);
    expect(adapterB.loadOrder()).toEqual(SAVED_ORDER);
  });

  test.each([
    ['absent', undefined],
    ['empty', { order: null }],
  ])('a late %s snapshot does not reset the mirrored order', async (_regime, payload) => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);

    snapshotMode = 'delayed';
    const adapterB = createSectionOrderAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    deliverSnapshot(sectionOrderDocPath(ORDER_UID), payload);

    expect(adapterB.loadOrder()).toEqual(SAVED_ORDER);
  });

  test('a uid with no mirror entry and an absent snapshot reports no order', async () => {
    const adapter = await createInitializedSectionOrderAdapter();

    expect(adapter.loadOrder()).toBeNull();
  });

  test('a snapshot carrying an order replaces the mirrored order and is re-mirrored', async () => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);

    snapshotMode = 'delayed';
    const adapterB = createSectionOrderAdapter();
    void adapterB.initialize();
    await settlePendingReads();

    const serverOrder = ['Dairy', 'Produce'];
    deliverSnapshot(sectionOrderDocPath(ORDER_UID), { order: serverOrder });

    expect(adapterB.loadOrder()).toEqual(serverOrder);

    snapshotMode = 'immediate';
    delete mockStore[sectionOrderDocPath(ORDER_UID)];
    const adapterC = await createInitializedSectionOrderAdapter();

    expect(adapterC.loadOrder()).toEqual(serverOrder);
  });

  test('hydrating from the mirror notifies no subscriber, while local writes and remote deltas still do', async () => {
    const adapterA = await createInitializedSectionOrderAdapter();
    adapterA.saveOrder(SAVED_ORDER);

    snapshotMode = 'delayed';
    const adapterB = createSectionOrderAdapter();
    const listener = jest.fn();
    void adapterB.initialize();
    await settlePendingReads();
    adapterB.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();

    adapterB.saveOrder(['Dairy']);
    expect(listener).toHaveBeenCalledTimes(1);

    deliverSnapshot(sectionOrderDocPath(ORDER_UID), { order: ['Produce'] });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('mirrored order is never visible across uids', async () => {
    const adapterA = await createInitializedSectionOrderAdapter(ORDER_UID);
    adapterA.saveOrder(SAVED_ORDER);

    const otherUserAdapter = await createInitializedSectionOrderAdapter(
      'section-order-coldstart-other-uid'
    );

    expect(otherUserAdapter.loadOrder()).toBeNull();
  });
});
