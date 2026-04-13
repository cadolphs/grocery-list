// Trip - driving port implementation
// Pure domain logic, no IO imports

import {
  Trip,
  TripItem,
  AddTripItemRequest,
  AddTripItemResult,
  AddStapleRequest,
  HouseArea,
  StoreLocation,
} from './types';
import { TripStorage } from '../ports/trip-storage';
import { StapleLibrary } from './staple-library';
import { UpdateStapleChanges } from './staple-library';

export type StapleInput = AddStapleRequest & { readonly id?: string };

// Extended request for auto-add: includes stapleId for duplicate prevention
export type AddTripItemWithStapleId = AddTripItemRequest & { readonly stapleId?: string };

export type TripSummary = {
  readonly totalItems: number;
  readonly stapleCount: number;
  readonly oneOffCount: number;
  readonly sweepCount: number;
  readonly whiteboardCount: number;
  readonly prepTimeMinutes: number;
};

export type SweepProgress = {
  readonly completedAreas: readonly HouseArea[];
  readonly completedCount: number;
  readonly totalAreas: number;
  readonly allAreasComplete: boolean;
};

const DEFAULT_HOUSE_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

export type TripService = {
  readonly start: (staples: ReadonlyArray<StapleInput>, carryover?: readonly TripItem[]) => void;
  readonly startWithCarryover: (staples: ReadonlyArray<StapleInput>) => void;
  readonly addItem: (request: AddTripItemWithStapleId) => AddTripItemResult;
  readonly getItems: () => TripItem[];
  readonly checkOff: (name: string) => void;
  readonly uncheckItem: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly unskipItem: (name: string) => void;
  readonly completeArea: (area: HouseArea) => void;
  readonly uncompleteArea: (area: HouseArea) => void;
  readonly getSweepProgress: () => SweepProgress;
  readonly getSummary: () => TripSummary;
  readonly setStartTime: (date: Date) => void;
  readonly loadFromStorage: () => void;
  readonly resetSweep: (staples: ReadonlyArray<StapleInput>) => void;
  readonly complete: () => CompleteTripResult;
  readonly initializeFromStorage: (staples: ReadonlyArray<StapleInput>) => void;
  readonly syncStapleUpdate: (stapleId: string, changes: UpdateStapleChanges) => void;
  readonly removeItemByStapleId: (stapleId: string) => void;
  readonly subscribe: (listener: () => void) => () => void;
};

const generateTripItemId = (): string =>
  `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const stapleInputToTripItem = (staple: StapleInput): TripItem => ({
  id: generateTripItemId(),
  name: staple.name,
  houseArea: staple.houseArea,
  storeLocation: staple.storeLocation,
  itemType: 'staple',
  stapleId: staple.id ?? null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
});

const generateTripId = (): string =>
  `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildTrip = (tripId: string, items: TripItem[], createdAt: string, completed: ReadonlySet<HouseArea>): Trip => ({
  id: tripId,
  items: [...items],
  status: 'active',
  createdAt,
  completedAreas: [...completed],
});

export const createTrip = (storage: TripStorage, areas?: readonly string[]): TripService => {
  const tripAreas = areas ?? DEFAULT_HOUSE_AREAS;
  let items: TripItem[] = [];
  let tripId: string = generateTripId();
  let createdAt: string = new Date().toISOString();
  const completedAreas = new Set<HouseArea>();
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach(l => l());

  const persistTrip = (): void => {
    storage.saveTrip(buildTrip(tripId, items, createdAt, completedAreas));
  };

  return {
    start: (staples: ReadonlyArray<StapleInput>, carryover: readonly TripItem[] = []) => {
      const stapleItems = staples.map(stapleInputToTripItem);
      items = [...stapleItems, ...carryover];
    },

    startWithCarryover: (staples: ReadonlyArray<StapleInput>) => {
      const carryover = storage.loadCarryover();
      const stapleItems = staples.map(stapleInputToTripItem);
      items = [...stapleItems, ...carryover];
      storage.clearCarryover();
    },

    addItem: (request: AddTripItemWithStapleId): AddTripItemResult => {
      if (!request.houseArea || request.houseArea.trim() === '') {
        return { success: false, error: 'area is required' };
      }
      if (request.stapleId && items.some(i => i.stapleId === request.stapleId)) {
        return { success: false, error: 'staple already in trip' };
      }

      const tripItem: TripItem = {
        id: generateTripItemId(),
        name: request.name,
        houseArea: request.houseArea,
        storeLocation: request.storeLocation,
        itemType: request.itemType,
        stapleId: request.stapleId ?? null,
        source: request.source,
        needed: true,
        checked: false,
        checkedAt: null,
      };
      items = [...items, tripItem];
      notify();
      persistTrip();
      return { success: true };
    },

    getItems: () => [...items],

    checkOff: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, checked: true, checkedAt: new Date().toISOString() }
          : item
      );
      persistTrip();
    },

    uncheckItem: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, checked: false, checkedAt: null }
          : item
      );
      persistTrip();
    },

    skipItem: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, needed: false }
          : item
      );
      persistTrip();
    },

    unskipItem: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, needed: true }
          : item
      );
      persistTrip();
    },

    completeArea: (area: HouseArea) => {
      completedAreas.add(area);
      persistTrip();
    },

    uncompleteArea: (area: HouseArea) => {
      completedAreas.delete(area);
      persistTrip();
    },

    getSweepProgress: (): SweepProgress => {
      const completed = [...completedAreas];
      return {
        completedAreas: completed,
        completedCount: completed.length,
        totalAreas: tripAreas.length,
        allAreasComplete: completed.length === tripAreas.length,
      };
    },

    getSummary: (): TripSummary => {
      const neededItems = items.filter((item) => item.needed);
      const elapsedMs = Date.now() - new Date(createdAt).getTime();
      const prepTimeMinutes = Math.round(elapsedMs / 60000);
      return {
        totalItems: neededItems.length,
        stapleCount: neededItems.filter((item) => item.itemType === 'staple').length,
        oneOffCount: neededItems.filter((item) => item.itemType === 'one-off').length,
        sweepCount: neededItems.filter((item) => item.source !== 'whiteboard').length,
        whiteboardCount: neededItems.filter((item) => item.source === 'whiteboard').length,
        prepTimeMinutes,
      };
    },

    setStartTime: (date: Date) => {
      createdAt = date.toISOString();
    },

    loadFromStorage: () => {
      const savedTrip = storage.loadTrip();
      if (savedTrip) {
        const previousItems = items;
        const previousCompleted = [...completedAreas];
        tripId = savedTrip.id;
        createdAt = savedTrip.createdAt;
        items = [...savedTrip.items];
        completedAreas.clear();
        (savedTrip.completedAreas ?? []).forEach(a => completedAreas.add(a));

        const stateChanged =
          JSON.stringify(previousItems) !== JSON.stringify(items) ||
          JSON.stringify(previousCompleted) !== JSON.stringify([...completedAreas]);
        if (stateChanged) {
          notify();
        }
      }
    },

    resetSweep: (staples: ReadonlyArray<StapleInput>) => {
      const stapleItems = staples.map(stapleInputToTripItem);
      items = stapleItems;
      completedAreas.clear();
      persistTrip();
    },

    syncStapleUpdate: (stapleId: string, changes: UpdateStapleChanges) => {
      items = items.map((item) =>
        item.stapleId === stapleId
          ? {
              ...item,
              houseArea: changes.houseArea ?? item.houseArea,
              storeLocation: changes.storeLocation ?? item.storeLocation,
            }
          : item
      );
    },

    removeItemByStapleId: (stapleId: string) => {
      items = items.filter((item) => item.stapleId !== stapleId);
      notify();
      persistTrip();
    },

    initializeFromStorage: (staples: ReadonlyArray<StapleInput>) => {
      const savedTrip = storage.loadTrip();
      if (!savedTrip) {
        // No stored trip: start fresh with staples
        const stapleItems = staples.map(stapleInputToTripItem);
        items = [...stapleItems];
        persistTrip();
        return;
      }
      if (savedTrip.status === 'completed') {
        // Completed trip: start new trip with carryover
        const carryover = storage.loadCarryover();
        const stapleItems = staples.map(stapleInputToTripItem);
        items = [...stapleItems, ...carryover];
        storage.clearCarryover();
        tripId = generateTripId();
        createdAt = new Date().toISOString();
        completedAreas.clear();
        persistTrip();
        return;
      }
      // Active trip: load existing items
      tripId = savedTrip.id;
      createdAt = savedTrip.createdAt;
      items = [...savedTrip.items];
      completedAreas.clear();
      (savedTrip.completedAreas ?? []).forEach(a => completedAreas.add(a));
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    complete: (): CompleteTripResult => {
      const checkedItems = items.filter(isChecked);
      const uncheckedItems = items.filter((item) => !isChecked(item));

      const result: CompleteTripResult = {
        purchasedStaples: checkedItems.filter(isStaple),
        purchasedOneOffs: checkedItems.filter(isOneOff),
        unboughtItems: uncheckedItems,
      };

      // Save carryover: unbought items with source changed to 'carryover'
      const carryoverItems = uncheckedItems.map((item) => ({
        ...item,
        source: 'carryover' as const,
      }));
      storage.saveCarryover(carryoverItems);

      // Persist trip as completed
      const completedTrip: Trip = {
        id: tripId,
        items: [...items],
        status: 'completed',
        createdAt,
        completedAreas: [...completedAreas],
      };
      storage.saveTrip(completedTrip);

      return result;
    },
  };
};

// --- Pure function: categorize trip items on completion ---

export type CompleteTripResult = {
  readonly purchasedStaples: readonly TripItem[];
  readonly purchasedOneOffs: readonly TripItem[];
  readonly unboughtItems: readonly TripItem[];
};

const isChecked = (item: TripItem): boolean => item.checked;
const isStaple = (item: TripItem): boolean => item.itemType === 'staple';
const isOneOff = (item: TripItem): boolean => item.itemType === 'one-off';

export const completeTrip = (
  trip: TripService,
  _library: StapleLibrary
): CompleteTripResult => {
  const items = trip.getItems();
  const checkedItems = items.filter(isChecked);
  const uncheckedItems = items.filter((item) => !isChecked(item));

  return {
    purchasedStaples: checkedItems.filter(isStaple),
    purchasedOneOffs: checkedItems.filter(isOneOff),
    unboughtItems: uncheckedItems,
  };
};
