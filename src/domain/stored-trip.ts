// Stored trip shapes and how to read them (ADR-013 migration).
// Pure domain logic, no IO imports. Both trip storage adapters read through
// these, so a trip saved before the sweep decision existed, or rewritten by an
// app build that only knows the needed flag, reads the same everywhere. New
// writes carry only the decision; the needed flag is read, never written.

import { ItemSource, SweepDecision, Trip, TripItem } from './types';

// A trip item as storage may hold it: written now, it has only the decision;
// saved before ADR-013, only the legacy needed flag; rewritten by an app build
// from the expand phase of #90, both.
// 'whiteboard' is a retired item source (#113): read, never written.
export type StoredTripItem = Omit<TripItem, 'decision' | 'source'> & {
  readonly source: ItemSource | 'whiteboard';
  readonly decision?: SweepDecision;
  readonly needed?: boolean;
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

export const readStoredTripItem = ({
  needed,
  ...item
}: StoredTripItem): TripItem => ({
  ...item,
  source: readSource(item.source),
  decision: readDecision(item.decision, needed),
});

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
