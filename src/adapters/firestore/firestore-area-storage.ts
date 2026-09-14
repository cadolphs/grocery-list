// Firestore adapter for AreaStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use the in-memory
// cache. Writes update the cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection); subscribe() listeners fire on the same deltas.
//
// Why the AsyncStorage mirror: the Firebase JS SDK has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — firebase-js-sdk#7947),
// so the network is otherwise the only source of truth. This adapter's failure
// mode is worse than an empty list: an absent snapshot used to resolve to
// DEFAULT_HOUSE_AREAS, so a cold start on dead wifi replaced a custom-area user's
// areas with the defaults, and groupByArea then silently dropped every trip item
// whose houseArea was no longer listed.
//
// The defaults are a NEW-USER fallback, not an override. Resolution order is:
// mirrored areas, then server areas, then DEFAULT_HOUSE_AREAS when neither has
// anything to say.
//
// Local-write watermark (fix-offline-edit-stale-server): every local write is
// stamped with a client-generated `writtenAt`, sent on the document and kept
// in the v2 mirror envelope. When a data-bearing snapshot arrives, an OLDER
// stamped document is re-pushed with the mirrored value (REPUSH) instead of
// replacing it; a newer, equal or unstamped one is adopted as before (ADOPT).
// See local-write-watermark.ts for the rule and its rationale.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { AreaStorage } from '../../ports/area-storage';
import { DEFAULT_HOUSE_AREAS } from '../async-storage/async-area-storage';
import {
  DocumentWatermark,
  UNSTAMPED,
  extractWrittenAt,
  nextWrittenAt,
  observeStamp,
  rePushStamp,
  readMirrorEnvelope,
  writeMirrorEnvelope,
} from './local-write-watermark';

export type FirestoreAreaStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreAreaStorage = AreaStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

type AreaDocumentData = { readonly items?: string[]; readonly writtenAt?: number };

type DocumentSnapshot = {
  exists: () => boolean;
  data: () => AreaDocumentData | undefined;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'areas');

const persistInBackground = (
  db: Firestore,
  uid: string,
  areas: string[],
  writtenAt: number
): void => {
  setDoc(buildDocRef(db, uid), { items: areas, writtenAt });
};

// An empty or non-array list is no usable data — in the mirror (v1 and v2
// alike) and on the server — so the defaults fallback stays a genuine-no-data
// fallback.
const isUsableAreaList = (candidate: unknown): candidate is string[] =>
  Array.isArray(candidate) && candidate.length > 0;

// --- AsyncStorage mirror (v2 envelope, v1 fallback) ---

// Pre-upgrade v1 mirrors hold the raw JSON array under the v1 key.
const parseV1Mirror = (raw: string): { readonly value: string[] } | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isUsableAreaList(parsed) ? { value: parsed } : null;
  } catch {
    return null;
  }
};

const readAreaMirror = (uid: string) =>
  readMirrorEnvelope<string[]>(uid, 'areas', parseV1Mirror, isUsableAreaList);

const mintLocalStamp = (watermark: DocumentWatermark): number =>
  nextWrittenAt(Date.now(), watermark.highestObservedWrittenAt);

// null means "the server has nothing to say" — an absent document, a missing
// field, or an empty list. It is deliberately NOT read as "the user has no areas".
const extractIncomingAreas = (data: AreaDocumentData | undefined): string[] | null => {
  const items = data?.items;
  return isUsableAreaList(items) ? items : null;
};

const serializeAreas = (areas: string[]): string =>
  JSON.stringify(areas);

export const createFirestoreAreaStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreAreaStorageOptions = {}
): FirestoreAreaStorage => {
  let cache: string[] = [];
  let watermark: DocumentWatermark = UNSTAMPED;
  let unsubscribeFn: () => void = () => {};
  let isInitialized = false;
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent anything of its own. While armed, a snapshot reporting "no
  // areas" means "the server has nothing to say" (offline cold start), not "the
  // user reset to defaults", so it MUST NOT clobber the mirror. Only a snapshot
  // actually carrying areas disarms it — local writes deliberately do not,
  // because a local write is no evidence about server state.
  let hydratedFromLocal = false;
  const { onChange } = options;
  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    listeners.forEach((listener) => listener());
  };

  const commitLocalChange = (updatedAreas: string[]): void => {
    const writtenAt = mintLocalStamp(watermark);
    cache = updatedAreas;
    watermark = observeStamp(watermark, writtenAt);
    persistInBackground(db, uid, cache, writtenAt);
    writeMirrorEnvelope(uid, 'areas', cache, writtenAt);
  };

  const handleSnapshot = (snapshot: DocumentSnapshot): void => {
    const data = snapshot.exists() ? snapshot.data() : undefined;
    const incomingAreas = extractIncomingAreas(data);
    const serverHasAreas = incomingAreas !== null;
    const serverWrittenAt = extractWrittenAt(data);

    // Preserve AsyncStorage hydration: if the server says "nothing here" but we
    // have a locally-mirrored list, keep the local copy. The server wins only
    // when it actually carries areas.
    if (!serverHasAreas && hydratedFromLocal && cache.length > 0) {
      return;
    }

    // Neither the mirror nor the server has anything: this is a first-run user.
    const resolvedAreas = incomingAreas ?? [...DEFAULT_HOUSE_AREAS];

    if (!isInitialized) {
      // First snapshot for a uid with no mirror entry: the server is all we have.
      cache = resolvedAreas;
      watermark = observeStamp(watermark, serverWrittenAt);
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeAreas(resolvedAreas) === serializeAreas(cache)) {
      return;
    }

    // Server data has arrived — it is authoritative for the rest of this
    // session, so the empty-snapshot guard stands down on both branches below.
    const rePushWrittenAt = serverHasAreas ? rePushStamp(watermark, serverWrittenAt) : null;
    if (rePushWrittenAt !== null) {
      // The server holds an older document than the edit in cache: push the
      // edit back with its own stamp. The echo carries that stamp and equal
      // content, so it short-circuits above and cannot loop.
      hydratedFromLocal = false;
      persistInBackground(db, uid, cache, rePushWrittenAt);
      return;
    }

    cache = resolvedAreas;
    watermark = observeStamp(watermark, serverWrittenAt);
    if (serverHasAreas) {
      hydratedFromLocal = false;
      writeMirrorEnvelope(uid, 'areas', cache, serverWrittenAt);
    }
    onChange?.();
    notifyListeners();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored areas are
      // already readable and the guard above protects them. Hydration runs
      // before any listener can register, so it must not notify.
      const mirror = await readAreaMirror(uid);
      if (mirror !== null) {
        cache = mirror.value;
        watermark = observeStamp(watermark, mirror.writtenAt);
        isInitialized = true;
        hydratedFromLocal = true;
      }

      // Step 2: readiness. A usable mirror entry (the reader already maps an
      // empty or invalid one to null, so the defaults fallback stays a
      // genuine-no-data fallback) means the cache already holds what the app
      // needs to render, so initialize() resolves without waiting for the
      // network: the Firestore SDK withholds the first snapshot on
      // connected-but-dead wifi until its offline timer fires. With no mirror
      // (first install / new uid) the first snapshot remains the only source of
      // truth, so initialize() awaits it. The subscription is registered in
      // both cases; only the await is skipped.
      const hydratedFromMirror = mirror !== null;

      // Settles on the first snapshot; later resolve() calls are no-ops.
      const firstSnapshot = new Promise<void>((resolve) => {
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as DocumentSnapshot);
          resolve();
        });
      });

      return hydratedFromMirror ? undefined : firstSnapshot;
    },

    unsubscribe: (): void => {
      unsubscribeFn();
    },

    loadAll: (): string[] => [...cache],

    saveAll: (areas: string[]): void => {
      commitLocalChange([...areas]);
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
