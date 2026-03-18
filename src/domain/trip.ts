// Trip - driving port implementation
// Pure domain logic, no IO imports

import {
  Trip,
  TripItem,
  AddTripItemRequest,
  AddTripItemResult,
  StapleItem,
  HouseArea,
  StoreLocation,
} from './types';
import { TripStorage } from '../ports/trip-storage';
import { StapleLibrary } from './staple-library';

export type TripService = {
  readonly start: (staples: StapleItem[], carryover?: TripItem[]) => void;
  readonly addItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly getItems: () => TripItem[];
  readonly checkOff: (name: string) => void;
  readonly uncheckItem: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly loadFromStorage: () => void;
  readonly complete: () => void;
};

const generateTripItemId = (): string =>
  `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const stapleToTripItem = (staple: StapleItem): TripItem => ({
  id: generateTripItemId(),
  name: staple.name,
  houseArea: staple.houseArea,
  storeLocation: staple.storeLocation,
  itemType: 'staple',
  stapleId: staple.id,
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

export const createTrip = (storage: TripStorage): TripService => {
  let items: TripItem[] = [];
  let tripId: string = generateTripId();
  let createdAt: string = new Date().toISOString();

  const persistTrip = (): void => {
    storage.saveTrip(buildTrip(tripId, items, createdAt));
  };

  return {
    start: (staples: StapleItem[], carryover: TripItem[] = []) => {
      const stapleItems = staples.map(stapleToTripItem);
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

    loadFromStorage: () => {
      const savedTrip = storage.loadTrip();
      if (savedTrip) {
        tripId = savedTrip.id;
        createdAt = savedTrip.createdAt;
        items = [...savedTrip.items];
      }
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
