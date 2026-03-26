// Driven port: Trip Storage
// Pure interface - no implementation details

import { Trip, TripItem } from '../domain/types';

export type TripStorage = {
  readonly loadTrip: () => Trip | null;
  readonly saveTrip: (trip: Trip) => void;
  readonly loadCheckoffs: () => ReadonlyMap<string, string>;
  readonly saveCheckoffs: (checkoffs: ReadonlyMap<string, string>) => void;
  readonly updateItemArea: (oldName: string, newName: string) => void;
  readonly saveCarryover: (items: readonly TripItem[]) => void;
  readonly loadCarryover: () => readonly TripItem[];
  readonly clearCarryover: () => void;
};
