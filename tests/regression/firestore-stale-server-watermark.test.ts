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
// The cases are a describe.each row table, one row per mirrored document.
// Step 02-02 appends the staples, areas and section-order rows; nothing else in
// this file should need to change for that.

import type { Trip, TripItem } from '../../src/domain/types';
import type { FirestoreTripStorage } from '../../src/adapters/firestore/firestore-trip-storage';
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

const rows: readonly AnyWatermarkRow[] = [tripRow, carryoverRow];

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
