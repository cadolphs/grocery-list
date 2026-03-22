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
  readonly start: (staples: ReadonlyArray<AddStapleRequest>, carryover?: readonly TripItem[]) => void;
  readonly addItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly getItems: () => TripItem[];
  readonly checkOff: (name: string) => void;
  readonly uncheckItem: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly unskipItem: (name: string) => void;
  readonly completeArea: (area: HouseArea) => void;
  readonly getSweepProgress: () => SweepProgress;
  readonly getSummary: () => TripSummary;
  readonly setStartTime: (date: Date) => void;
  readonly loadFromStorage: () => void;
  readonly resetSweep: () => void;
  readonly complete: () => void;
};

const generateTripItemId = (): string =>
  `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const stapleRequestToTripItem = (staple: AddStapleRequest): TripItem => ({
  id: generateTripItemId(),
  name: staple.name,
  houseArea: staple.houseArea,
  storeLocation: staple.storeLocation,
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
});

const generateTripId = (): string =>
  `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildTrip = (tripId: string, items: TripItem[], createdAt: string): Trip => ({
  id: tripId,
  items: [...items],
  status: 'active',
  createdAt,
});

export const createTrip = (storage: TripStorage, areas?: readonly string[]): TripService => {
  const tripAreas = areas ?? DEFAULT_HOUSE_AREAS;
  let items: TripItem[] = [];
  let tripId: string = generateTripId();
  let createdAt: string = new Date().toISOString();
  const completedAreas = new Set<HouseArea>();

  const persistTrip = (): void => {
    storage.saveTrip(buildTrip(tripId, items, createdAt));
  };

  return {
    start: (staples: ReadonlyArray<AddStapleRequest>, carryover: readonly TripItem[] = []) => {
      const stapleItems = staples.map(stapleRequestToTripItem);
      items = [...stapleItems, ...carryover];
    },

    addItem: (request: AddTripItemRequest): AddTripItemResult => {
      if (!request.houseArea || request.houseArea.trim() === '') {
        return { success: false, error: 'area is required' };
      }

      const tripItem: TripItem = {
        id: generateTripItemId(),
        name: request.name,
        houseArea: request.houseArea,
        storeLocation: request.storeLocation,
        itemType: request.itemType,
        stapleId: null,
        source: request.source,
        needed: true,
        checked: false,
        checkedAt: null,
      };
      items = [...items, tripItem];
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
    },

    unskipItem: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, needed: true }
          : item
      );
    },

    completeArea: (area: HouseArea) => {
      completedAreas.add(area);
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
        tripId = savedTrip.id;
        createdAt = savedTrip.createdAt;
        items = [...savedTrip.items];
      }
    },

    resetSweep: () => {
      items = items
        .filter((item) => item.itemType !== 'one-off')
        .map((item) => ({ ...item, needed: true, checked: false, checkedAt: null }));
      completedAreas.clear();
      persistTrip();
    },

    complete: () => {
      // Will be implemented in a later step
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
