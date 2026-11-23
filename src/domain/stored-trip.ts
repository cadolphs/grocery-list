// Stored trip shapes and how to read them (ADR-013 migration).
// Pure domain logic, no IO imports. Both trip storage adapters read through
// these, so a trip saved before the sweep decision existed, or rewritten by an
// app build that only knows the needed flag, reads the same everywhere.

import { SweepDecision, Trip, TripItem } from './types';

// A trip item as storage may hold it: saved before ADR-013, it has only the
// needed flag and no decision.
export type StoredTripItem = Omit<TripItem, 'decision'> & {
  readonly decision?: SweepDecision;
};

export type StoredTrip = Omit<Trip, 'items'> & {
  readonly items: readonly StoredTripItem[];
};

// needed is true exactly when the decision is Needed.
const agreesWithNeeded = (decision: SweepDecision, needed: boolean): boolean =>
  (decision === 'needed') === needed;

// A stored decision is kept when it agrees with needed. Otherwise needed wins:
// true reads as Needed, false as Not needed. That covers items saved before the
// decision existed and items an older build rewrote by flipping needed alone.
export const readStoredTripItem = (item: StoredTripItem): TripItem => {
  const { decision, needed } = item;
  return {
    ...item,
    decision:
      decision !== undefined && agreesWithNeeded(decision, needed)
        ? decision
        : needed
          ? 'needed'
          : 'not-needed',
  };
};

export const readStoredCarryover = (
  items: readonly StoredTripItem[],
): TripItem[] => items.map(readStoredTripItem);

export const readStoredTrip = (trip: StoredTrip): Trip => ({
  ...trip,
  items: readStoredCarryover(trip.items),
});
