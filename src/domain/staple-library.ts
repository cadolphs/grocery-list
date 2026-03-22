// Staple Library - driving port implementation
// Pure domain logic, no IO imports

import { StapleItem, AddStapleRequest, AddStapleResult, HouseArea, StoreLocation } from './types';
import { StapleStorage } from '../ports/staple-storage';

export type UpdateStapleChanges = {
  readonly houseArea?: HouseArea;
  readonly storeLocation?: StoreLocation;
};

export type StapleLibrary = {
  readonly addStaple: (request: AddStapleRequest) => AddStapleResult;
  readonly updateStaple: (id: string, changes: UpdateStapleChanges) => AddStapleResult;
  readonly listAll: () => StapleItem[];
  readonly listByArea: (area: HouseArea) => StapleItem[];
  readonly search: (query: string) => StapleItem[];
  readonly remove: (id: string) => void;
};

const generateId = (): string =>
  `staple-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isDuplicate = (
  existing: StapleItem[],
  name: string,
  houseArea: HouseArea
): boolean =>
  existing.some(
    (item) => item.name === name && item.houseArea === houseArea
  );

const isDuplicateExcludingSelf = (
  existing: StapleItem[],
  selfId: string,
  name: string,
  houseArea: HouseArea
): boolean =>
  existing.some(
    (item) => item.id !== selfId && item.name === name && item.houseArea === houseArea
  );

export const createStapleLibrary = (storage: StapleStorage): StapleLibrary => {
  return {
    addStaple: (request: AddStapleRequest): AddStapleResult => {
      const existing = storage.loadAll();

      if (isDuplicate(existing, request.name, request.houseArea)) {
        return {
          success: false,
          error: `"${request.name}" already exists in ${request.houseArea}`,
        };
      }

      const staple: StapleItem = {
        id: generateId(),
        name: request.name,
        houseArea: request.houseArea,
        storeLocation: request.storeLocation,
        type: 'staple',
        createdAt: new Date().toISOString(),
      };

      storage.save(staple);
      return { success: true };
    },

    updateStaple: (id: string, changes: UpdateStapleChanges): AddStapleResult => {
      const existing = storage.loadAll();
      const staple = existing.find((item) => item.id === id);

      if (!staple) {
        return { success: false, error: `Staple with id "${id}" not found` };
      }

      const updatedHouseArea = changes.houseArea ?? staple.houseArea;
      const updatedStoreLocation = changes.storeLocation ?? staple.storeLocation;

      if (updatedHouseArea.trim() === '') {
        return { success: false, error: 'house area is required' };
      }

      if (updatedStoreLocation.section.trim() === '') {
        return { success: false, error: 'store section is required' };
      }

      if (isDuplicateExcludingSelf(existing, id, staple.name, updatedHouseArea)) {
        return {
          success: false,
          error: `"${staple.name}" already exists in ${updatedHouseArea}`,
        };
      }

      const updatedStaple: StapleItem = {
        ...staple,
        houseArea: updatedHouseArea,
        storeLocation: updatedStoreLocation,
      };

      storage.update(updatedStaple);
      return { success: true };
    },

    listAll: (): StapleItem[] => storage.loadAll(),

    listByArea: (area: HouseArea): StapleItem[] =>
      storage.loadAll().filter((item) => item.houseArea === area),

    search: (query: string): StapleItem[] =>
      query.trim() === '' ? [] : storage.search(query),

    remove: (id: string): void => storage.remove(id),
  };
};
