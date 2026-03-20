// Driven port: Trip Storage
// Pure interface - no implementation details

import { Trip } from '../domain/types';

export type TripStorage = {
  readonly loadTrip: () => Trip | null;
  readonly saveTrip: (trip: Trip) => void;
  readonly loadCheckoffs: () => ReadonlyMap<string, string>;
  readonly saveCheckoffs: (checkoffs: ReadonlyMap<string, string>) => void;
  readonly updateItemArea: (oldName: string, newName: string) => void;
};
