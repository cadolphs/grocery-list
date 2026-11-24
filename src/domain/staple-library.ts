// Staple Library - driving port implementation
// Pure domain logic, no IO imports

import {
  LibraryItem,
  AddStapleRequest,
  AddOneOffRequest,
  AddLibraryItemResult,
  HouseArea,
  StoreLocation,
} from './types';
import { LibraryStorage } from '../ports/library-storage';

export type UpdateStapleChanges = {
  readonly name?: string;
  readonly houseArea?: HouseArea;
  readonly storeLocation?: StoreLocation;
};

export type StapleLibrary = {
  readonly addStaple: (request: AddStapleRequest) => AddLibraryItemResult;
  readonly addOneOff: (request: AddOneOffRequest) => AddLibraryItemResult;
  readonly updateStaple: (
    id: string,
    changes: UpdateStapleChanges,
  ) => AddLibraryItemResult;
  readonly listAll: () => LibraryItem[];
  readonly listByArea: (area: HouseArea) => LibraryItem[];
  readonly search: (query: string) => LibraryItem[];
  readonly remove: (id: string) => void;
  // Functional in-memory subscription: listener invoked after any mutation
  // (add/update/remove). Returns an unsubscribe function. Mirrors the
  // pattern used by createTrip.subscribe in src/domain/trip.ts.
  readonly subscribe: (listener: () => void) => () => void;
};

const generateId = (): string =>
  `staple-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isDuplicate = (
  existing: LibraryItem[],
  name: string,
  houseArea: HouseArea,
): boolean =>
  existing.some((item) => item.name === name && item.houseArea === houseArea);

const isDuplicateOneOff = (existing: LibraryItem[], name: string): boolean =>
  existing.some((item) => item.name === name && item.type === 'one-off');

const isDuplicateExcludingSelf = (
  existing: LibraryItem[],
  selfId: string,
  name: string,
  houseArea: HouseArea,
): boolean =>
  existing.some(
    (item) =>
      item.id !== selfId && item.name === name && item.houseArea === houseArea,
  );

export const createStapleLibrary = (storage: LibraryStorage): StapleLibrary => {
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((listener) => listener());

  return {
    addStaple: (request: AddStapleRequest): AddLibraryItemResult => {
      const existing = storage.loadAll();

      if (isDuplicate(existing, request.name, request.houseArea)) {
        return {
          success: false,
          error: `"${request.name}" already exists in ${request.houseArea}`,
        };
      }

      const staple: LibraryItem = {
        id: generateId(),
        name: request.name,
        houseArea: request.houseArea,
        storeLocation: request.storeLocation,
        type: 'staple',
        createdAt: new Date().toISOString(),
      };

      storage.save(staple);
      notify();
      return { success: true };
    },

    addOneOff: (request: AddOneOffRequest): AddLibraryItemResult => {
      const existing = storage.loadAll();

      if (isDuplicateOneOff(existing, request.name)) {
        return { success: true };
      }

      const oneOff: LibraryItem = {
        id: generateId(),
        name: request.name,
        houseArea: '',
        storeLocation: request.storeLocation,
        type: 'one-off',
        createdAt: new Date().toISOString(),
      };

      storage.save(oneOff);
      notify();
      return { success: true };
    },

    updateStaple: (
      id: string,
      changes: UpdateStapleChanges,
    ): AddLibraryItemResult => {
      const existing = storage.loadAll();
      const staple = existing.find((item) => item.id === id);

      if (!staple) {
        return { success: false, error: `Staple with id "${id}" not found` };
      }

      if (changes.name !== undefined && changes.name.trim() === '') {
        return { success: false, error: 'name is required' };
      }

      const updatedName = changes.name?.trim() ?? staple.name;
      const updatedHouseArea = changes.houseArea ?? staple.houseArea;
      const updatedStoreLocation =
        changes.storeLocation ?? staple.storeLocation;

      if (updatedHouseArea.trim() === '') {
        return { success: false, error: 'house area is required' };
      }

      if (updatedStoreLocation.section.trim() === '') {
        return { success: false, error: 'store section is required' };
      }

      if (
        isDuplicateExcludingSelf(existing, id, updatedName, updatedHouseArea)
      ) {
        return {
          success: false,
          error: `"${updatedName}" already exists in ${updatedHouseArea}`,
        };
      }

      const updatedStaple: LibraryItem = {
        ...staple,
        name: updatedName,
        houseArea: updatedHouseArea,
        storeLocation: updatedStoreLocation,
      };

      storage.update(updatedStaple);
      notify();
      return { success: true };
    },

    listAll: (): LibraryItem[] => storage.loadAll(),

    listByArea: (area: HouseArea): LibraryItem[] =>
      storage.loadAll().filter((item) => item.houseArea === area),

    search: (query: string): LibraryItem[] =>
      query.trim() === '' ? [] : storage.search(query),

    remove: (id: string): void => {
      storage.remove(id);
      notify();
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
