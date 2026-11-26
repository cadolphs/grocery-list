// Stored trip shapes and how to read and write them (ADR-013 migration, #112).
// Pure domain logic, no IO imports. Both trip storage adapters read and write
// through these, so a trip saved before the sweep decision existed, or
// rewritten by an app build that only knows the needed flag or the checked
// flag, reads the same everywhere. New writes carry only the decision; the
// needed flag is read, never written.
//
// In cart (#112, expand phase): the domain says inCart / inCartAt, storage
// said checked / checkedAt. Writes carry both pairs, equal, so a build that
// only knows checked still reads what is in the cart. The contract phase stops
// writing checked / checkedAt; the read rule stays for documents saved before.

import { ItemSource, SweepDecision, Trip, TripItem } from './types';

// A trip item as storage may hold it: written now, it has only the decision;
// saved before ADR-013, only the legacy needed flag; rewritten by an app build
// from the expand phase of #90, both.
// 'whiteboard' is a retired item source (#113): read, never written.
// Saved before #112, an item has only checked / checkedAt; written by a build
// from the expand phase, both pairs; after the contract phase, only inCart /
// inCartAt.
export type StoredTripItem = Omit<
  TripItem,
  'decision' | 'source' | 'inCart' | 'inCartAt'
> & {
  readonly source: ItemSource | 'whiteboard';
  readonly decision?: SweepDecision;
  readonly needed?: boolean;
  readonly inCart?: boolean;
  readonly inCartAt?: string | null;
  readonly checked?: boolean;
  readonly checkedAt?: string | null;
};

// Before #95 a trip stored the set of areas marked complete. Completion is now
// derived from decisions, so a legacy set is read and dropped.
export type StoredTrip = Omit<Trip, 'items'> & {
  readonly items: readonly StoredTripItem[];
  readonly completedAreas?: readonly string[];
};

// needed is true exactly when the decision is Needed.
const agreesWithNeeded = (decision: SweepDecision, needed: boolean): boolean =>
  (decision === 'needed') === needed;

// Without a needed flag the stored decision is read as is. A stored decision
// is also kept when it agrees with needed. Otherwise needed wins: true reads
// as Needed, false as Not needed. That covers items saved before the decision
// existed and items an older build rewrote by flipping needed alone.
const readDecision = (
  decision: SweepDecision | undefined,
  needed: boolean | undefined,
): SweepDecision => {
  if (needed === undefined) return decision ?? 'undecided';
  if (decision !== undefined && agreesWithNeeded(decision, needed)) {
    return decision;
  }
  return needed ? 'needed' : 'not-needed';
};

// The legacy needed flag is dropped from the item read, so it is never
// written back. A stored decision keeps its key position: adapters compare
// serialized trips to spot their own echoed writes.
// A whiteboard item was added by hand from the Home view, so it reads as a
// quick add.
const readSource = (source: StoredTripItem['source']): ItemSource =>
  source === 'whiteboard' ? 'quick-add' : source;

// A build from the expand phase writes checked equal to inCart, so the two
// differ only when an older build put the item in the cart or took it out by
// flipping checked alone. checked is then the fresher fact, so whenever it is
// stored it wins, with its timestamp. Without it, inCart is read as is.
type CartState = Pick<TripItem, 'inCart' | 'inCartAt'>;

const readCartState = ({
  inCart,
  inCartAt,
  checked,
  checkedAt,
}: StoredTripItem): CartState =>
  checked === undefined
    ? { inCart: inCart ?? false, inCartAt: inCartAt ?? null }
    : { inCart: checked, inCartAt: checkedAt ?? null };

// The legacy checked pair is dropped from the item read, like needed. A
// stored inCart keeps its key position, so a read of this build's own write
// serializes the same as the trip it came from.
export const readStoredTripItem = (stored: StoredTripItem): TripItem => {
  const { needed, checked: _checked, checkedAt: _checkedAt, ...item } = stored;
  return {
    ...item,
    source: readSource(item.source),
    decision: readDecision(item.decision, needed),
    ...readCartState(stored),
  };
};

export const readStoredCarryover = (
  items: readonly StoredTripItem[],
): TripItem[] => items.map(readStoredTripItem);

export const readStoredTrip = ({
  completedAreas: _legacyCompletedAreas,
  ...trip
}: StoredTrip): Trip => ({
  ...trip,
  items: readStoredCarryover(trip.items),
});

// Expand phase of #112: every write carries the legacy checked pair beside
// inCart, equal to it, until every build reads inCart.
export const toStoredTripItem = (item: TripItem): StoredTripItem => ({
  ...item,
  checked: item.inCart,
  checkedAt: item.inCartAt,
});

export const toStoredCarryover = (
  items: readonly TripItem[],
): StoredTripItem[] => items.map(toStoredTripItem);

export const toStoredTrip = (trip: Trip): StoredTrip => ({
  ...trip,
  items: toStoredCarryover(trip.items),
});
