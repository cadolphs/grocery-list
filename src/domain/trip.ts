// Trip - driving port implementation
// Pure domain logic, no IO imports

import {
  TripItem,
  AddTripItemRequest,
  StapleItem,
  HouseArea,
  StoreLocation,
} from './types';
import { TripStorage } from '../ports/trip-storage';

export type TripService = {
  readonly start: (staples: StapleItem[], carryover?: TripItem[]) => void;
  readonly addItem: (request: AddTripItemRequest) => void;
  readonly getItems: () => TripItem[];
  readonly checkOff: (name: string) => void;
  readonly uncheckItem: (name: string) => void;
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

export const createTrip = (storage: TripStorage): TripService => {
  let items: TripItem[] = [];

  return {
    start: (staples: StapleItem[], carryover: TripItem[] = []) => {
      const stapleItems = staples.map(stapleToTripItem);
      items = [...stapleItems, ...carryover];
    },

    addItem: (request: AddTripItemRequest) => {
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
    },

    getItems: () => [...items],

    checkOff: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, checked: true, checkedAt: new Date().toISOString() }
          : item
      );
    },

    uncheckItem: (name: string) => {
      items = items.map((item) =>
        item.name === name
          ? { ...item, checked: false, checkedAt: null }
          : item
      );
    },

    complete: () => {
      // Will be implemented in a later step
    },
  };
};
