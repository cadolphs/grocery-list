// Staple Library - driving port implementation
// Pure domain logic, no IO imports

import { StapleItem, AddStapleRequest, AddStapleResult, HouseArea } from './types';
import { StapleStorage } from '../ports/staple-storage';

export type StapleLibrary = {
  readonly addStaple: (request: AddStapleRequest) => AddStapleResult;
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

    listAll: (): StapleItem[] => storage.loadAll(),

    listByArea: (area: HouseArea): StapleItem[] =>
      storage.loadAll().filter((item) => item.houseArea === area),

    search: (query: string): StapleItem[] =>
      query.trim() === '' ? [] : storage.search(query),

    remove: (id: string): void => storage.remove(id),
  };
};
