// Regression test: an offline edit is lost to an OLDER server document after a
// process restart (fix-offline-edit-stale-server, RCA sections 3, 6.2-6.4).
//
// Defect: adapter A edits a document offline and is killed before the write is
// acked, so the edit survives only in the AsyncStorage mirror. On the next
// launch adapter B hydrates the mirror, then the server's older document
// arrives as the first data-bearing snapshot and, under arrival-ordered
// last-writer-wins, silently replaces the edit. The fix stamps every local
// write with a client-generated `writtenAt` watermark (on the document and in
// a v2 mirror envelope) and gates adoption on it: an older server document is
// REPUSHed with the mirrored value and its own stamp, a newer or equal one is
// ADOPTed exactly as today.
//
// The shared harness in `helpers/offline-firestore-harness.ts` models offline
// Firestore: setDoc never publishes to the backing store, and snapshot delivery
// is controllable. Assertions go through each adapter's port surface and the
// mocked SDK boundary (setDoc calls, delivered snapshots); the only direct
// AsyncStorage access is case (c)'s pre-upgrade v1 seed and the check that the
// v1 key is gone afterwards.
//
// The cases are a describe.each row table, one row per mirrored document (trip,
// carryover, staples, areas, section order), plus one section-order-only case
// for a mirrored clear.

import type { StapleItem, Trip, TripItem } from '../../src/domain/types';
import type { FirestoreTripStorage } from '../../src/adapters/firestore/firestore-trip-storage';
import type { FirestoreStapleStorage } from '../../src/adapters/firestore/firestore-staple-storage';
import type { FirestoreAreaStorage } from '../../src/adapters/firestore/firestore-area-storage';
import type { FirestoreSectionOrderStorage } from '../../src/adapters/firestore/firestore-section-order-storage';
import { DEFAULT_HOUSE_AREAS } from '../../src/adapters/async-storage/async-area-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deliverSnapshot,
  firestoreModule,
  forgetRemoteDoc,
  resetOfflineFirestore,
  setSnapshotMode,
  settlePendingReads,
} from './helpers/offline-firestore-harness';

// --- Firestore mock infrastructure (shared harness) ---

jest.mock('firebase/firestore', () =>
  require('./helpers/offline-firestore-harness').firestoreModule
);

// --- Row table ---

const TEST_UID = 'stale-server-uid';
const mockDb = { type: 'firestore' };

type WatermarkAdapter = {
  readonly initialize: () => Promise<void>;
};

// One row per mirrored document.
//   document       — describe label
//   mirrorDocName  — the {doc} segment of firestore-cache:v{1,2}:{uid}:{doc}
//   docPath        — the Firestore document path the adapter writes to
//   serverField    — the field carrying the value on the server document
//   createAdapter  — factory; require() inside it so the module sees the mocks
//   values         — V0, V1, V2: pairwise distinct values of the document
//   write / read   — the port operations for this document
//   silence        — what read() returns after an honoured absent snapshot
//   seedV1Mirror   — the raw pre-upgrade v1 JSON for a value (case c)
//   assertsOnChange — whether this document's handler fires onChange
type WatermarkRow<A extends WatermarkAdapter, T> = {
  readonly document: string;
  readonly mirrorDocName: string;
  readonly docPath: string;
  readonly serverField: 'trip' | 'items' | 'order';
  readonly createAdapter: (db: unknown, uid: string, onChange: () => void) => A;
  readonly values: readonly [T, T, T];
  readonly write: (adapter: A, value: T) => void;
  readonly read: (adapter: A) => unknown;
  readonly silence: unknown;
  readonly seedV1Mirror: (value: T) => string;
  readonly assertsOnChange: boolean;
};

type AnyWatermarkRow = WatermarkRow<WatermarkAdapter, unknown>;

// Erases the row's generics for describe.each. Sound because every adapter
// handed to a row's write/read is the one produced by that same row's
// createAdapter, and every value is one of that row's own values.
const defineRow = <A extends WatermarkAdapter, T>(row: WatermarkRow<A, T>): AnyWatermarkRow =>
  row as unknown as AnyWatermarkRow;

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
  id: 'trip-stale-1',
  items: [makeTripItem()],
  status: 'active',
  createdAt: '2026-04-13T10:00:00.000Z',
  ...overrides,
});

const createTripAdapter = (db: unknown, uid: string, onChange: () => void): FirestoreTripStorage => {
  const { createFirestoreTripStorage } = require('../../src/adapters/firestore/firestore-trip-storage');
  return createFirestoreTripStorage(db, uid, { onChange });
};

const tripRow = defineRow<FirestoreTripStorage, Trip>({
  document: 'trip',
  mirrorDocName: 'trip',
  docPath: `users/${TEST_UID}/data/trip`,
  serverField: 'trip',
  createAdapter: createTripAdapter,
  values: [
    makeTrip({ id: 'trip-v0' }),
    makeTrip({
      id: 'trip-v1',
      items: [makeTripItem({ checked: true, checkedAt: '2026-04-13T10:05:00.000Z' })],
    }),
    makeTrip({ id: 'trip-v2', items: [makeTripItem({ id: 'trip-item-2', name: 'Bread' })] }),
  ],
  write: (adapter, trip) => adapter.saveTrip(trip),
  read: (adapter) => adapter.loadTrip(),
  silence: null,
  seedV1Mirror: (trip) => JSON.stringify(trip),
  assertsOnChange: true,
});

const carryoverRow = defineRow<FirestoreTripStorage, readonly TripItem[]>({
  document: 'carryover',
  mirrorDocName: 'carryover',
  docPath: `users/${TEST_UID}/data/carryover`,
  serverField: 'items',
  createAdapter: createTripAdapter,
  values: [
    [makeTripItem({ id: 'carry-1', name: 'Olive Oil' })],
    [makeTripItem({ id: 'carry-1', name: 'Olive Oil' }), makeTripItem({ id: 'carry-2', name: 'Rice' })],
    [makeTripItem({ id: 'carry-3', name: 'Bread' })],
  ],
  write: (adapter, items) => adapter.saveCarryover(items),
  read: (adapter) => adapter.loadCarryover(),
  silence: [],
  seedV1Mirror: (items) => JSON.stringify(items),
  assertsOnChange: false,
});

const makeStaple = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'staple-1',
  name: 'Milk',
  houseArea: 'Kitchen',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createStapleAdapter = (db: unknown, uid: string, onChange: () => void): FirestoreStapleStorage => {
  const { createFirestoreStapleStorage } = require('../../src/adapters/firestore/firestore-staple-storage');
  return createFirestoreStapleStorage(db, uid, { onChange });
};

// The staple port has no replace-all write. Each value is a one-item library
// under a fixed id, so writing it is a save the first time and an update after.
const stapleRow = defineRow<FirestoreStapleStorage, StapleItem[]>({
  document: 'staples',
  mirrorDocName: 'staples',
  docPath: `users/${TEST_UID}/data/staples`,
  serverField: 'items',
  createAdapter: createStapleAdapter,
  values: [
    [makeStaple({ name: 'Milk' })],
    [makeStaple({ name: 'Oat Milk' })],
    [makeStaple({ name: 'Soy Milk' })],
  ],
  write: (adapter, items) => {
    const knownIds = new Set(adapter.loadAll().map((item) => item.id));
    items.forEach((item) => (knownIds.has(item.id) ? adapter.update(item) : adapter.save(item)));
  },
  read: (adapter) => adapter.loadAll(),
  silence: [],
  seedV1Mirror: (items) => JSON.stringify(items),
  assertsOnChange: true,
});

const createAreaAdapter = (db: unknown, uid: string, onChange: () => void): FirestoreAreaStorage => {
  const { createFirestoreAreaStorage } = require('../../src/adapters/firestore/firestore-area-storage');
  return createFirestoreAreaStorage(db, uid, { onChange });
};

// Areas use non-empty lists throughout: an empty list is "no usable data" to
// this adapter, on the server and in the mirror alike.
const areaRow = defineRow<FirestoreAreaStorage, string[]>({
  document: 'areas',
  mirrorDocName: 'areas',
  docPath: `users/${TEST_UID}/data/areas`,
  serverField: 'items',
  createAdapter: createAreaAdapter,
  values: [
    ['Fridge', 'Pantry'],
    ['Fridge', 'Pantry', 'Garage'],
    ['Attic', 'Shed'],
  ],
  write: (adapter, areas) => adapter.saveAll(areas),
  read: (adapter) => adapter.loadAll(),
  silence: [...DEFAULT_HOUSE_AREAS],
  seedV1Mirror: (areas) => JSON.stringify(areas),
  assertsOnChange: true,
});

const createSectionOrderAdapter = (
  db: unknown,
  uid: string,
  onChange: () => void
): FirestoreSectionOrderStorage => {
  const { createFirestoreSectionOrderStorage } = require('../../src/adapters/firestore/firestore-section-order-storage');
  return createFirestoreSectionOrderStorage(db, uid, { onChange });
};

// The pre-upgrade section-order mirror was already an envelope, { order }, so
// that its presence could record a deliberate clear.
const sectionOrderRow = defineRow<FirestoreSectionOrderStorage, string[]>({
  document: 'section order',
  mirrorDocName: 'sectionOrder',
  docPath: `users/${TEST_UID}/data/sectionOrder`,
  serverField: 'order',
  createAdapter: createSectionOrderAdapter,
  values: [
    ['Produce', 'Dairy'],
    ['Dairy', 'Produce', 'Frozen'],
    ['Bakery', 'Snacks'],
  ],
  write: (adapter, order) => adapter.saveOrder(order),
  read: (adapter) => adapter.loadOrder(),
  silence: null,
  seedV1Mirror: (order) => JSON.stringify({ order }),
  assertsOnChange: true,
});

const rows: readonly AnyWatermarkRow[] = [tripRow, carryoverRow, stapleRow, areaRow, sectionOrderRow];

// --- Harness helpers ---

const v1MirrorKey = (row: AnyWatermarkRow): string =>
  `firestore-cache:v1:${TEST_UID}:${row.mirrorDocName}`;

const setDocCallsFor = (path: string) =>
  firestoreModule.setDoc.mock.calls.filter(([docRef]) => docRef.path === path);

const lastWrittenAtFor = (path: string): unknown => {
  const calls = setDocCallsFor(path);
  const [, payload] = calls[calls.length - 1];
  return (payload as { writtenAt?: unknown }).writtenAt;
};

// Adapter A, online-shaped start with no remote document, edits V0 then V1 and
// is killed. Returns W1, the stamp its last setDoc for this document carried.
const editOfflineThenKill = async (row: AnyWatermarkRow): Promise<unknown> => {
  setSnapshotMode('immediate');
  const adapterA = row.createAdapter(mockDb, TEST_UID, () => {});
  await adapterA.initialize();
  row.write(adapterA, row.values[0]);
  row.write(adapterA, row.values[1]);
  return lastWrittenAtFor(row.docPath);
};

// Adapter B, cold start with the mirror hydrated and the first snapshot delayed.
const coldStartAwaitingSnapshot = async (row: AnyWatermarkRow, onChange: () => void) => {
  setSnapshotMode('delayed');
  const adapterB = row.createAdapter(mockDb, TEST_UID, onChange);
  void adapterB.initialize();
  await settlePendingReads();
  return adapterB;
};

// Adapter C, a later cold start where the server answers at once with nothing.
const coldStartWithRemoteForgotten = async (row: AnyWatermarkRow) => {
  setSnapshotMode('immediate');
  forgetRemoteDoc(row.docPath);
  const adapterC = row.createAdapter(mockDb, TEST_UID, () => {});
  await adapterC.initialize();
  return adapterC;
};

const expectOnChangeCalls = (row: AnyWatermarkRow, onChange: jest.Mock, count: number): void => {
  if (row.assertsOnChange) {
    expect(onChange).toHaveBeenCalledTimes(count);
  }
};

beforeEach(async () => {
  jest.clearAllMocks();
  resetOfflineFirestore();
  await AsyncStorage.clear();
});

describe.each(rows)(
  'Stale server after process restart — $document document: the newer mirrored edit wins, is re-pushed once, and does not loop on its echo',
  (row) => {
    const [V0, V1, V2] = row.values;

    it('(a) an older data-bearing snapshot leaves the mirrored edit in place, re-pushes it once with its own stamp, and a later cold start hydrates it', async () => {
      const W1 = await editOfflineThenKill(row);
      expect(typeof W1 === 'number' && Number.isFinite(W1)).toBe(true);

      const onChange = jest.fn();
      const adapterB = await coldStartAwaitingSnapshot(row, onChange);
      const setDocCountBefore = setDocCallsFor(row.docPath).length;

      deliverSnapshot(row.docPath, { [row.serverField]: V0, writtenAt: 1 });

      expect(row.read(adapterB)).toEqual(V1);
      expectOnChangeCalls(row, onChange, 0);
      const rePushes = setDocCallsFor(row.docPath).slice(setDocCountBefore);
      expect(rePushes).toHaveLength(1);
      expect(rePushes[0][1]).toEqual({ [row.serverField]: V1, writtenAt: W1 });

      const adapterC = await coldStartWithRemoteForgotten(row);
      expect(row.read(adapterC)).toEqual(V1);
    });

    it('(b) a newer data-bearing snapshot replaces the mirrored edit without a re-push and a later cold start hydrates it', async () => {
      await editOfflineThenKill(row);

      const onChange = jest.fn();
      const adapterB = await coldStartAwaitingSnapshot(row, onChange);
      const setDocCountBefore = setDocCallsFor(row.docPath).length;

      deliverSnapshot(row.docPath, { [row.serverField]: V2, writtenAt: Date.now() + 1e6 });

      expect(row.read(adapterB)).toEqual(V2);
      expectOnChangeCalls(row, onChange, 1);
      expect(setDocCallsFor(row.docPath)).toHaveLength(setDocCountBefore);

      const adapterC = await coldStartWithRemoteForgotten(row);
      expect(row.read(adapterC)).toEqual(V2);
    });

    it.each<[string, number | null]>([
      ['a stamped-older', 1],
      ['an unstamped', null],
    ])(
      '(c) a pre-upgrade v1 mirror behaves as today against %s server document: server wins, no re-push, and the v1 key is removed',
      async (_label, serverWrittenAt) => {
        // The ONE direct AsyncStorage write: simulate a device that mirrored V1
        // before the upgrade, in the raw v1 shape under the v1 key.
        await AsyncStorage.setItem(v1MirrorKey(row), row.seedV1Mirror(V1));

        const onChange = jest.fn();
        const adapterB = await coldStartAwaitingSnapshot(row, onChange);
        expect(row.read(adapterB)).toEqual(V1);
        const setDocCountBefore = setDocCallsFor(row.docPath).length;

        const serverDocument =
          serverWrittenAt === null
            ? { [row.serverField]: V0 }
            : { [row.serverField]: V0, writtenAt: serverWrittenAt };
        deliverSnapshot(row.docPath, serverDocument);

        expect(row.read(adapterB)).toEqual(V0);
        expect(setDocCallsFor(row.docPath)).toHaveLength(setDocCountBefore);

        const adapterC = await coldStartWithRemoteForgotten(row);
        expect(row.read(adapterC)).toEqual(V0);

        await settlePendingReads();
        expect(await AsyncStorage.getItem(v1MirrorKey(row))).toBeNull();
      }
    );

    it('(d) the re-push echo, delivered twice, issues no further setDoc and no onChange, and an absent snapshot afterwards is honoured', async () => {
      const W1 = await editOfflineThenKill(row);

      const onChange = jest.fn();
      const adapterB = await coldStartAwaitingSnapshot(row, onChange);
      const setDocCountBefore = setDocCallsFor(row.docPath).length;

      deliverSnapshot(row.docPath, { [row.serverField]: V0, writtenAt: 1 });
      const setDocCountAfterRePush = setDocCallsFor(row.docPath).length;
      expect(setDocCountAfterRePush).toBe(setDocCountBefore + 1);

      deliverSnapshot(row.docPath, { [row.serverField]: V1, writtenAt: W1 });
      deliverSnapshot(row.docPath, { [row.serverField]: V1, writtenAt: W1 });

      expect(setDocCallsFor(row.docPath)).toHaveLength(setDocCountAfterRePush);
      expectOnChangeCalls(row, onChange, 0);
      expect(row.read(adapterB)).toEqual(V1);

      // The guard stood down on the data-bearing snapshot, exactly as
      // firestore-trip-offline-cold-start.test.ts pins for ADOPT today.
      deliverSnapshot(row.docPath, undefined);

      expect(row.read(adapterB)).toEqual(row.silence);
    });
  }
);

// --- Section order only: a mirrored clear is a stamped decision ---
//
// Section order is the one document whose null is a stored value, so its v2
// envelope can be { value: null, writtenAt: W }. That envelope must count as a
// present mirror for readiness AND its stamp must beat an older server order.

describe('Stale server after process restart — section order document: a mirrored clear beats an older server order', () => {
  const ORDER = ['Produce', 'Dairy'];

  it('(e) a cleared order is a present v2 envelope: initialize() resolves from it, loadOrder() is null, and an older stamped server order is rejected with one re-push of the clear', async () => {
    // Adapter A saves an order, then clears it, and is killed.
    setSnapshotMode('immediate');
    const adapterA = createSectionOrderAdapter(mockDb, TEST_UID, () => {});
    await adapterA.initialize();
    adapterA.saveOrder(ORDER);
    adapterA.clearOrder();
    const W = lastWrittenAtFor(sectionOrderRow.docPath);
    expect(typeof W === 'number' && Number.isFinite(W)).toBe(true);

    // Adapter B cold-starts on connected-but-dead wifi: the first snapshot is
    // withheld, so readiness can only come from the mirrored clear.
    setSnapshotMode('withheld');
    const onChange = jest.fn();
    const adapterB = createSectionOrderAdapter(mockDb, TEST_UID, onChange);
    let initializeResolved = false;
    void adapterB.initialize().then(() => {
      initializeResolved = true;
    });
    await settlePendingReads();

    expect(initializeResolved).toBe(true);
    expect(adapterB.loadOrder()).toBeNull();
    const setDocCountBefore = setDocCallsFor(sectionOrderRow.docPath).length;

    // The withheld callback is registered; firing it now is the 'delayed'
    // regime: the server's OLDER order finally arrives.
    deliverSnapshot(sectionOrderRow.docPath, { order: ORDER, writtenAt: 1 });

    expect(adapterB.loadOrder()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    const rePushes = setDocCallsFor(sectionOrderRow.docPath).slice(setDocCountBefore);
    expect(rePushes).toHaveLength(1);
    expect(rePushes[0][1]).toEqual({ order: null, writtenAt: W });
  });
});
