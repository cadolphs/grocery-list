// Firestore adapter for SectionOrderStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use the in-memory
// cache. Writes update the cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection). Reactive subscribers via subscribe() also fire on
// local saveOrder/clearOrder and on remote-delta snapshots; echoes
// (serialized-equal snapshots) do NOT notify.
//
// Why the AsyncStorage mirror: the Firebase JS SDK has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — firebase-js-sdk#7947),
// so the network is otherwise the only source of truth and a cold start on dead
// wifi reset a saved section order to null.
//
// Absence semantics differ from the staple and area adapters: here `null` is a
// legitimate stored value — the user can deliberately clear the order. The mirror
// therefore stores an ENVELOPE, so "no mirror entry" (AsyncStorage returns null)
// stays distinguishable from "mirrored null". The v2 envelope shared by all
// adapters ({ value, writtenAt }) already provides that presence, so its value is
// the bare `string[] | null`; only the pre-upgrade v1 mirror carries the inner
// { order } wrapper. Without the distinction the fix would trade a silent wipe
// for a silent resurrection of an order the user cleared.
//
// Local-write watermark (fix-offline-edit-stale-server): every local write —
// a clear included — is stamped with a client-generated `writtenAt`, sent on
// the document and kept in the v2 mirror envelope. When a data-bearing snapshot
// arrives, an OLDER stamped document is re-pushed with the mirrored value
// (REPUSH) instead of replacing it; a newer, equal or unstamped one is adopted
// as before (ADOPT). See local-write-watermark.ts for the rule and its rationale.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { SectionOrderStorage } from '../../ports/section-order-storage';
import {
  DocumentWatermark,
  UNSTAMPED,
  extractWrittenAt,
  mintLocalStamp,
  observeStamp,
  rePushStamp,
  readMirrorEnvelope,
  writeMirrorEnvelope,
} from './local-write-watermark';

export type FirestoreSectionOrderStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreSectionOrderStorage = SectionOrderStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

type SectionOrder = string[] | null;

// The pre-upgrade v1 mirror shape. Its presence meant "this uid has a mirrored
// decision"; its `order` field carried that decision, which may be null.
type MirroredSectionOrder = {
  readonly order: SectionOrder;
};

type SectionOrderDocumentData = { readonly order?: SectionOrder; readonly writtenAt?: number };

type DocumentSnapshot = {
  exists: () => boolean;
  data: () => SectionOrderDocumentData | undefined;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'sectionOrder');

const persistInBackground = (
  db: Firestore,
  uid: string,
  order: SectionOrder,
  writtenAt: number
): void => {
  setDoc(buildDocRef(db, uid), { order, writtenAt });
};

// --- AsyncStorage mirror (v2 envelope, v1 fallback) ---

const isSectionOrder = (candidate: unknown): candidate is SectionOrder =>
  candidate === null || Array.isArray(candidate);

// Pre-upgrade v1 mirrors hold { order } under the v1 key; an envelope whose
// order is neither null nor an array is no usable mirror.
const parseV1Mirror = (raw: string): { readonly value: SectionOrder } | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<MirroredSectionOrder> | null;
    if (parsed === null || typeof parsed !== 'object') return null;
    const { order } = parsed;
    return isSectionOrder(order) ? { value: order } : null;
  } catch {
    return null;
  }
};

const readSectionOrderMirror = (uid: string) =>
  readMirrorEnvelope<SectionOrder>(uid, 'sectionOrder', parseV1Mirror, isSectionOrder);

// null means "the server has nothing to say" — an absent document or a missing
// order field. A remote clear is indistinguishable from silence at this level and
// is deliberately resolved in favour of keeping data (see the guard below).
const extractIncomingOrder = (data: SectionOrderDocumentData | undefined): SectionOrder =>
  data?.order ?? null;

const serializeOrder = (order: SectionOrder): string =>
  JSON.stringify(order);

export const createFirestoreSectionOrderStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreSectionOrderStorageOptions = {}
): FirestoreSectionOrderStorage => {
  let cache: SectionOrder = null;
  let watermark: DocumentWatermark = UNSTAMPED;
  let unsubscribeFn: () => void = () => {};
  let isInitialized = false;
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent an order of its own. While armed, a snapshot reporting "no
  // order" means "the server has nothing to say" (offline cold start), not "the
  // user cleared the order", so it MUST NOT clobber the mirror. Only a snapshot
  // actually carrying an order disarms it — local writes deliberately do not,
  // because a local write is no evidence about server state.
  let hydratedFromLocal = false;
  const { onChange } = options;
  const listeners = new Set<() => void>();

  const notifySubscribers = (): void => {
    listeners.forEach((listener) => listener());
  };

  const commitLocalChange = (updatedOrder: SectionOrder): void => {
    const writtenAt = mintLocalStamp(watermark);
    cache = updatedOrder;
    watermark = observeStamp(watermark, writtenAt);
    persistInBackground(db, uid, cache, writtenAt);
    writeMirrorEnvelope(uid, 'sectionOrder', cache, writtenAt);
    notifySubscribers();
  };

  const handleSnapshot = (snapshot: DocumentSnapshot): void => {
    const data = snapshot.exists() ? snapshot.data() : undefined;
    const incomingOrder = extractIncomingOrder(data);
    const serverHasOrder = incomingOrder !== null;
    const serverWrittenAt = extractWrittenAt(data);

    // Preserve AsyncStorage hydration: if the server says "nothing here" but we
    // have a locally-mirrored order, keep the local copy. The server wins only
    // when it actually carries an order.
    if (!serverHasOrder && hydratedFromLocal && cache !== null) {
      return;
    }

    if (!isInitialized) {
      // First snapshot for a uid with no mirror entry: the server is all we have.
      cache = incomingOrder;
      watermark = observeStamp(watermark, serverWrittenAt);
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeOrder(incomingOrder) === serializeOrder(cache)) {
      return;
    }

    // Server data has arrived — it is authoritative for the rest of this
    // session, so the empty-snapshot guard stands down on both branches below.
    const rePushWrittenAt = serverHasOrder ? rePushStamp(watermark, serverWrittenAt) : null;
    if (rePushWrittenAt !== null) {
      // The server holds an older document than the decision in cache (an
      // order or a clear): push it back with its own stamp. The echo carries
      // that stamp and equal content, so it short-circuits above and cannot loop.
      hydratedFromLocal = false;
      persistInBackground(db, uid, cache, rePushWrittenAt);
      return;
    }

    cache = incomingOrder;
    watermark = observeStamp(watermark, serverWrittenAt);
    if (serverHasOrder) {
      hydratedFromLocal = false;
      writeMirrorEnvelope(uid, 'sectionOrder', cache, serverWrittenAt);
    }
    onChange?.();
    notifySubscribers();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored order is
      // already readable and the guard above protects it. Hydration runs before
      // any listener can register, so it must not notify.
      const mirror = await readSectionOrderMirror(uid);
      if (mirror !== null) {
        cache = mirror.value;
        watermark = observeStamp(watermark, mirror.writtenAt);
        isInitialized = true;
        hydratedFromLocal = true;
      }

      // Step 2: readiness. A mirror envelope — including one whose value is
      // null, which records a deliberate clear — means the cache already holds
      // what the app needs to render, so initialize() resolves without waiting
      // for the network: the Firestore SDK withholds the first snapshot on
      // connected-but-dead wifi until its offline timer fires. With no envelope
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

    loadOrder: (): string[] | null =>
      cache === null ? null : [...cache],

    saveOrder: (order: string[]): void => {
      commitLocalChange([...order]);
    },

    clearOrder: (): void => {
      commitLocalChange(null);
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
