// Local-write watermark helpers shared by the four Firestore adapters (trip,
// staples, areas, section order). Pure functions plus thin wrappers over the
// two effects the adapters share, the AsyncStorage mirror and the device clock;
// this module imports none of the adapters.
//
// Problem (RCA fix-offline-edit-stale-server): an edit made offline, followed by
// a process kill, is durably held only in the AsyncStorage mirror. On the next
// launch the server's OLDER document arrives first and, under arrival-ordered
// last-writer-wins, silently overwrites the edit. The fix stamps every local
// write with a client-generated `writtenAt` watermark, stored both on the
// document and in the mirror, so the adapter can tell "older server doc" from
// "newer server doc" on the same clock.
//
// Why the clock is injected (RCA 6.1 "Why the HLC bump matters"): the stamp is a
// hybrid logical clock, max(now, lastSeen + 1). `lastSeen` is the highest
// watermark this adapter has observed (mirror at hydration, every adopted
// server doc, its own writes). Bumping past it orders a local edit made AFTER
// seeing a server value strictly after that value even when this device's clock
// is behind the device that wrote it. A far-future clock (R2) is self-healing:
// every device that sees the stamp bumps past it. Taking `now` as a parameter
// keeps the helper pure and makes the clock-goes-backwards case a plain
// table-driven test, no fake timers.
//
// Why a missing stamp on either side adopts (RCA D2 part ii, R5 residual
// window): a v1 mirror, a legacy server doc, or a doc written by an older app
// version carries no watermark. Skipping the comparison keeps today's
// behaviour (data-bearing server wins) for all of them; the first local write
// after upgrade stamps the mirror, the first online write stamps the document.

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export type MirrorDocName = 'trip' | 'carryover' | 'staples' | 'areas' | 'sectionOrder';

export type AdoptionDecision = 'adopt' | 'repush';

// The v2 mirror envelope, uniform across all five documents. Its PRESENCE is
// what distinguishes "no mirror entry" from "mirrored null" (section order's
// cleared state), so `value: null` with a numeric stamp is a real entry.
export type MirrorEnvelope<T> = {
  readonly value: T;
  readonly writtenAt: number | null;
};

// Adapter-supplied v1 reader. Returns the parsed value wrapped, or null when
// the raw string holds nothing usable. Wrapping keeps "value is null" (section
// order's `{ order: null }`) distinct from "nothing usable" when T admits null.
// Where the v1 key held the raw JSON value, buildRawJsonV1Parser builds it;
// section order, whose v1 key held `{ order }`, supplies its own.
export type ParseV1<T> = (raw: string) => { readonly value: T } | null;

// Adapter-supplied v2 value guard. A type predicate rather than `T | null` for
// the same reason as ParseV1: section order's T is `string[] | null`.
export type ValidateV2<T> = (value: unknown) => value is T;

// --- Key builders ---

const MIRROR_KEY_NAMESPACE = 'firestore-cache';

export const buildV1MirrorKey = (uid: string, doc: MirrorDocName): string =>
  `${MIRROR_KEY_NAMESPACE}:v1:${uid}:${doc}`;

export const buildV2MirrorKey = (uid: string, doc: MirrorDocName): string =>
  `${MIRROR_KEY_NAMESPACE}:v2:${uid}:${doc}`;

// --- Pure helpers ---

export const nextWrittenAt = (now: number, lastSeen: number | null): number =>
  Math.max(now, (lastSeen ?? -Infinity) + 1);

// 'repush' only when both stamps are present and the server's is strictly
// older. Ties adopt: a tie is either our own echo (content already equal) or two
// devices stamping the same millisecond, where server-wins is the pre-existing
// last-writer-wins.
export const resolveAdoption = (
  serverWrittenAt: number | null,
  mirrorWrittenAt: number | null
): AdoptionDecision =>
  serverWrittenAt !== null && mirrorWrittenAt !== null && serverWrittenAt < mirrorWrittenAt
    ? 'repush'
    : 'adopt';

const isFiniteNumber = (candidate: unknown): candidate is number =>
  typeof candidate === 'number' && Number.isFinite(candidate);

export const extractWrittenAt = (data: Record<string, unknown> | undefined): number | null => {
  const candidate = data?.writtenAt;
  return isFiniteNumber(candidate) ? candidate : null;
};

// --- Per-document watermark state (RCA 6.2) ---
//
// Two stamps per document. `cachedValueWrittenAt` is the watermark of the value
// currently in cache and is the comparison key against an incoming server stamp
// (null when the cached value is unstamped: no mirror, a v1 mirror, or an
// adopted unstamped document). `highestObservedWrittenAt` is the hybrid-logical
// clock floor used to mint the next local stamp: the highest stamp this adapter
// has ever seen, never lowered by adopting an unstamped document.
export type DocumentWatermark = {
  readonly cachedValueWrittenAt: number | null;
  readonly highestObservedWrittenAt: number | null;
};

export const UNSTAMPED: DocumentWatermark = {
  cachedValueWrittenAt: null,
  highestObservedWrittenAt: null,
};

const laterOf = (left: number | null, right: number | null): number | null =>
  left === null ? right : right === null ? left : Math.max(left, right);

// The cached value now carries `writtenAt`; the floor only ever rises. One
// transition serves hydration, local writes and adoption alike.
export const observeStamp = (watermark: DocumentWatermark, writtenAt: number | null): DocumentWatermark => ({
  cachedValueWrittenAt: writtenAt,
  highestObservedWrittenAt: laterOf(watermark.highestObservedWrittenAt, writtenAt),
});

// The stamp a REPUSH re-sends the cached value with (the cached value's own,
// not bumped, so a second re-push writes identical bytes), or null when the
// incoming document is to be adopted.
export const rePushStamp = (watermark: DocumentWatermark, serverWrittenAt: number | null): number | null =>
  watermark.cachedValueWrittenAt !== null &&
  resolveAdoption(serverWrittenAt, watermark.cachedValueWrittenAt) === 'repush'
    ? watermark.cachedValueWrittenAt
    : null;

// --- Clock (the one effect here besides AsyncStorage) ---

// The stamp a local write carries: the hybrid logical clock formula in
// nextWrittenAt, fed the device clock and this document's floor.
export const mintLocalStamp = (watermark: DocumentWatermark): number =>
  nextWrittenAt(Date.now(), watermark.highestObservedWrittenAt);

// --- v2 envelope decoding ---

const isRecord = (candidate: unknown): candidate is Record<string, unknown> =>
  typeof candidate === 'object' && candidate !== null;

const tryParseJson = (raw: string): { readonly parsed: unknown } | null => {
  try {
    return { parsed: JSON.parse(raw) };
  } catch {
    return null;
  }
};

const decodeV2Envelope = <T>(raw: string, validateV2: ValidateV2<T>): MirrorEnvelope<T> | null => {
  const json = tryParseJson(raw);
  if (json === null || !isRecord(json.parsed)) return null;
  const envelope = json.parsed;
  if (!('value' in envelope) || !validateV2(envelope.value)) return null;
  return { value: envelope.value, writtenAt: extractWrittenAt(envelope) };
};

// --- v1 fallback parsing ---

// Builds the v1 reader for a document whose pre-upgrade mirror held the raw
// JSON value under the v1 key: parse, then admit the value only if it passes
// the adapter's guard.
export const buildRawJsonV1Parser =
  <T>(isValue: (candidate: unknown) => candidate is T): ParseV1<T> =>
  (raw) => {
    const json = tryParseJson(raw);
    return json !== null && isValue(json.parsed) ? { value: json.parsed } : null;
  };

// --- AsyncStorage wrappers ---

const readV2Envelope = async <T>(
  uid: string,
  doc: MirrorDocName,
  validateV2: ValidateV2<T>
): Promise<MirrorEnvelope<T> | null> => {
  const raw = await AsyncStorage.getItem(buildV2MirrorKey(uid, doc));
  return raw === null ? null : decodeV2Envelope(raw, validateV2);
};

const readV1AsEnvelope = async <T>(
  uid: string,
  doc: MirrorDocName,
  parseV1: ParseV1<T>
): Promise<MirrorEnvelope<T> | null> => {
  const raw = await AsyncStorage.getItem(buildV1MirrorKey(uid, doc));
  if (raw === null) return null;
  const parsed = parseV1(raw);
  return parsed === null ? null : { value: parsed.value, writtenAt: null };
};

// v2 key first; an absent or unusable v2 falls through to the v1 key, read by
// the adapter's own legacy parser and wrapped as a watermark-less envelope.
export const readMirrorEnvelope = async <T>(
  uid: string,
  doc: MirrorDocName,
  parseV1: ParseV1<T>,
  validateV2: ValidateV2<T>
): Promise<MirrorEnvelope<T> | null> => {
  const v2 = await readV2Envelope(uid, doc, validateV2);
  return v2 !== null ? v2 : readV1AsEnvelope(uid, doc, parseV1);
};

// Fire-and-forget, matching the adapters' existing mirror writes. The v1 key is
// removed on EVERY call (RCA 6.3 definite rule): a stale v1 value left behind
// would mask a failed v2 write on a later launch.
export const writeMirrorEnvelope = <T>(
  uid: string,
  doc: MirrorDocName,
  value: T,
  writtenAt: number | null
): void => {
  const envelope: MirrorEnvelope<T> = { value, writtenAt };
  AsyncStorage.setItem(buildV2MirrorKey(uid, doc), JSON.stringify(envelope));
  AsyncStorage.removeItem(buildV1MirrorKey(uid, doc));
};
