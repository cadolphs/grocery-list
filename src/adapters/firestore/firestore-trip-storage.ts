// Firestore adapter for TripStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use in-memory
// cache. Writes update cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection).
//
// Why AsyncStorage mirror: Firebase JS SDK v12 has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — see
// firebase-js-sdk#7947). Without this mirror, a cold-start while offline
// returns empty state from onSnapshot and the user loses their trip.
//
// Local-write watermark (fix-offline-edit-stale-server): every local write is
// stamped with a client-generated `writtenAt`, sent on the document and kept
// in the v2 mirror envelope. When a data-bearing snapshot arrives, an OLDER
// stamped document is re-pushed with the mirrored value (REPUSH) instead of
// replacing it; a newer, equal or unstamped one is adopted as before (ADOPT).
// See local-write-watermark.ts for the rule and its rationale.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';
import {
  DocumentWatermark,
  UNSTAMPED,
  buildRawJsonV1Parser,
  extractWrittenAt,
  mintLocalStamp,
  observeStamp,
  rePushStamp,
  readMirrorEnvelope,
  writeMirrorEnvelope,
} from './local-write-watermark';

export type FirestoreTripStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreTripStorage = TripStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

type TripDocumentData = { readonly trip?: Trip; readonly writtenAt?: number };
type CarryoverDocumentData = { readonly items?: TripItem[]; readonly writtenAt?: number };

type DocumentSnapshot<Data> = {
  exists: () => boolean;
  data: () => Data | undefined;
};

// --- Firestore documents ---

const buildTripDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'trip');

const buildCarryoverDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'carryover');

const persistTripInBackground = (
  db: Firestore,
  uid: string,
  trip: Trip,
  writtenAt: number
): void => {
  setDoc(buildTripDocRef(db, uid), { trip, writtenAt });
};

const persistCarryoverInBackground = (
  db: Firestore,
  uid: string,
  items: readonly TripItem[],
  writtenAt: number
): void => {
  setDoc(buildCarryoverDocRef(db, uid), { items: [...items], writtenAt });
};

// --- AsyncStorage mirror (v2 envelope, v1 fallback) ---

const isRecord = (candidate: unknown): candidate is Record<string, unknown> =>
  typeof candidate === 'object' && candidate !== null;

const isTripItemList = (candidate: unknown): candidate is readonly TripItem[] =>
  Array.isArray(candidate);

const isTrip = (candidate: unknown): candidate is Trip =>
  isRecord(candidate) && isTripItemList(candidate.items);

// Pre-upgrade v1 mirrors hold the raw JSON value under the v1 key.
const readTripMirror = (uid: string) =>
  readMirrorEnvelope<Trip>(uid, 'trip', buildRawJsonV1Parser(isTrip), isTrip);

const readCarryoverMirror = (uid: string) =>
  readMirrorEnvelope<readonly TripItem[]>(uid, 'carryover', buildRawJsonV1Parser(isTripItemList), isTripItemList);

// --- Domain helpers ---

const serializeTrip = (trip: Trip | null): string =>
  JSON.stringify(trip);

const serializeItems = (items: readonly TripItem[]): string =>
  JSON.stringify(items);

const deriveCheckoffsFromItems = (
  items: readonly TripItem[]
): ReadonlyMap<string, string> => {
  const checkoffs = new Map<string, string>();
  for (const item of items) {
    if (item.checked && item.checkedAt !== null) {
      checkoffs.set(item.name, item.checkedAt);
    }
  }
  return checkoffs;
};

const applyCheckoffsToItems = (
  items: TripItem[],
  checkoffs: ReadonlyMap<string, string>
): TripItem[] =>
  items.map((item) => {
    const checkedAt = checkoffs.get(item.name);
    if (checkedAt !== undefined) {
      return { ...item, checked: true, checkedAt };
    }
    return { ...item, checked: false, checkedAt: null };
  });

export const createFirestoreTripStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreTripStorageOptions = {}
): FirestoreTripStorage => {
  let cachedTrip: Trip | null = null;
  let cachedCarryover: readonly TripItem[] = [];
  let tripWatermark: DocumentWatermark = UNSTAMPED;
  let carryoverWatermark: DocumentWatermark = UNSTAMPED;
  let unsubscribeTripFn: () => void = () => {};
  let unsubscribeCarryoverFn: () => void = () => {};
  let isTripInitialized = false;
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent anything of its own. While armed, a snapshot reporting "no
  // trip" / "no carryover" means "the server has nothing to say" (offline cold
  // start), not "the user deleted everything", so it MUST NOT clobber the
  // mirror. Only a snapshot actually carrying data disarms it — local writes
  // deliberately do not, because a local write is no evidence about server
  // state. For carryover, an existing document with items: [] IS server data
  // (clearCarryover persists []) and disarms; exists=false is silence.
  let tripHydratedFromLocal = false;
  let carryoverHydratedFromLocal = false;
  const { onChange } = options;

  const commitLocalTripChange = (updatedTrip: Trip): void => {
    const writtenAt = mintLocalStamp(tripWatermark);
    cachedTrip = updatedTrip;
    tripWatermark = observeStamp(tripWatermark, writtenAt);
    persistTripInBackground(db, uid, updatedTrip, writtenAt);
    writeMirrorEnvelope(uid, 'trip', updatedTrip, writtenAt);
  };

  const commitLocalCarryoverChange = (updatedItems: readonly TripItem[]): void => {
    const writtenAt = mintLocalStamp(carryoverWatermark);
    cachedCarryover = updatedItems;
    carryoverWatermark = observeStamp(carryoverWatermark, writtenAt);
    persistCarryoverInBackground(db, uid, updatedItems, writtenAt);
    writeMirrorEnvelope(uid, 'carryover', updatedItems, writtenAt);
  };

  const handleTripSnapshot = (snapshot: DocumentSnapshot<TripDocumentData>): void => {
    const data = snapshot.exists() ? snapshot.data() : undefined;
    const incomingTrip: Trip | null = data?.trip ?? null;
    const serverWrittenAt = extractWrittenAt(data);

    if (!isTripInitialized) {
      cachedTrip = incomingTrip;
      tripWatermark = observeStamp(tripWatermark, serverWrittenAt);
      isTripInitialized = true;
      return;
    }

    // Preserve AsyncStorage hydration: if server says "nothing here" but we
    // have a locally-mirrored trip, keep the local copy. Server wins only
    // when it actually has data.
    if (incomingTrip === null && tripHydratedFromLocal && cachedTrip !== null) {
      return;
    }

    if (serializeTrip(incomingTrip) === serializeTrip(cachedTrip)) {
      return;
    }

    // Server data has arrived — it is authoritative for the rest of this
    // session, so the empty-snapshot guard stands down on both branches below.
    const rePushWrittenAt = rePushStamp(tripWatermark, serverWrittenAt);
    if (cachedTrip !== null && rePushWrittenAt !== null) {
      // The server holds an older document than the edit in cache: push the
      // edit back with its own stamp. The echo carries that stamp and equal
      // content, so it short-circuits above and cannot loop.
      tripHydratedFromLocal = false;
      persistTripInBackground(db, uid, cachedTrip, rePushWrittenAt);
      return;
    }

    cachedTrip = incomingTrip;
    tripWatermark = observeStamp(tripWatermark, serverWrittenAt);
    if (incomingTrip !== null) {
      tripHydratedFromLocal = false;
      writeMirrorEnvelope(uid, 'trip', incomingTrip, serverWrittenAt);
    }
    onChange?.();
  };

  const handleCarryoverSnapshot = (snapshot: DocumentSnapshot<CarryoverDocumentData>): void => {
    const data = snapshot.exists() ? snapshot.data() : undefined;
    const incomingItems: readonly TripItem[] | null = snapshot.exists()
      ? data?.items ?? []
      : null;
    const serverWrittenAt = extractWrittenAt(data);

    // Preserve AsyncStorage hydration for carryover on empty snapshot — same
    // rationale as the trip path above.
    if (incomingItems === null && carryoverHydratedFromLocal && cachedCarryover.length > 0) {
      return;
    }

    if (incomingItems === null) {
      cachedCarryover = [];
      carryoverWatermark = observeStamp(carryoverWatermark, null);
      return;
    }

    // An existing document (even with items: []) is a stored decision, so
    // the guard stands down; an absent document is silence and leaves it armed.
    carryoverHydratedFromLocal = false;

    if (serializeItems(incomingItems) === serializeItems(cachedCarryover)) {
      return;
    }

    const rePushWrittenAt = rePushStamp(carryoverWatermark, serverWrittenAt);
    if (rePushWrittenAt !== null) {
      persistCarryoverInBackground(db, uid, cachedCarryover, rePushWrittenAt);
      return;
    }

    cachedCarryover = incomingItems;
    carryoverWatermark = observeStamp(carryoverWatermark, serverWrittenAt);
    writeMirrorEnvelope(uid, 'carryover', incomingItems, serverWrittenAt);
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate cache from AsyncStorage BEFORE subscribing to
      // Firestore. This way if the first onSnapshot fires exists=false
      // (offline cold-start, no remote doc yet), the mirrored data is already
      // in memory and the empty-snapshot guard above prevents clobbering.
      const [tripMirror, carryoverMirror] = await Promise.all([
        readTripMirror(uid),
        readCarryoverMirror(uid),
      ]);

      if (tripMirror !== null) {
        cachedTrip = tripMirror.value;
        tripWatermark = observeStamp(tripWatermark, tripMirror.writtenAt);
        isTripInitialized = true;
        tripHydratedFromLocal = true;
      }
      if (carryoverMirror !== null) {
        cachedCarryover = carryoverMirror.value;
        carryoverWatermark = observeStamp(carryoverWatermark, carryoverMirror.writtenAt);
        carryoverHydratedFromLocal = true;
      }

      // Step 2: readiness. Both mirrors present means the cache already holds
      // everything the app needs to render, so initialize() resolves without
      // waiting for the network: the Firestore SDK withholds the first snapshot
      // on connected-but-dead wifi until its offline timer fires, and that
      // timer re-arms on every stream restart. Requiring BOTH keys keeps a
      // completed trip from being rebuilt without its carryover. With no mirror
      // (first install / new uid) the first snapshots remain the only source
      // of truth, so initialize() awaits them. The subscriptions are registered
      // in both cases; only the await is skipped.
      const hydratedFromMirror = tripMirror !== null && carryoverMirror !== null;

      // Settles once both documents have delivered their first snapshot; later
      // resolve() calls are no-ops.
      const firstSnapshots = new Promise<void>((resolve) => {
        let tripSnapshotArrived = false;
        let carryoverSnapshotArrived = false;

        const resolveOnceBothArrived = () => {
          if (tripSnapshotArrived && carryoverSnapshotArrived) {
            resolve();
          }
        };

        unsubscribeTripFn = onSnapshot(buildTripDocRef(db, uid), (snapshot) => {
          handleTripSnapshot(snapshot as DocumentSnapshot<TripDocumentData>);
          tripSnapshotArrived = true;
          resolveOnceBothArrived();
        });

        unsubscribeCarryoverFn = onSnapshot(buildCarryoverDocRef(db, uid), (snapshot) => {
          handleCarryoverSnapshot(snapshot as DocumentSnapshot<CarryoverDocumentData>);
          carryoverSnapshotArrived = true;
          resolveOnceBothArrived();
        });
      });

      return hydratedFromMirror ? undefined : firstSnapshots;
    },

    unsubscribe: (): void => {
      unsubscribeTripFn();
      unsubscribeCarryoverFn();
    },

    loadTrip: (): Trip | null => cachedTrip ? { ...cachedTrip, items: [...cachedTrip.items] } : null,

    saveTrip: (trip: Trip): void => {
      commitLocalTripChange(trip);
    },

    loadCheckoffs: (): ReadonlyMap<string, string> => {
      if (!cachedTrip) return new Map();
      return deriveCheckoffsFromItems(cachedTrip.items);
    },

    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>): void => {
      if (!cachedTrip) return;
      const updatedItems = applyCheckoffsToItems(cachedTrip.items, checkoffs);
      commitLocalTripChange({ ...cachedTrip, items: updatedItems });
    },

    updateItemArea: (oldName: string, newName: string): void => {
      if (!cachedTrip) return;
      commitLocalTripChange({
        ...cachedTrip,
        items: cachedTrip.items.map((item) =>
          item.houseArea === oldName
            ? { ...item, houseArea: newName }
            : item
        ),
      });
    },

    saveCarryover: (items: readonly TripItem[]): void => {
      commitLocalCarryoverChange([...items]);
    },

    loadCarryover: (): readonly TripItem[] => [...cachedCarryover],

    clearCarryover: (): void => {
      commitLocalCarryoverChange([]);
    },
  };
};
