// Area Management - driving port implementation
// Pure domain logic, no IO imports

import { AreaStorage } from '../ports/area-storage';
import { StapleStorage } from '../ports/staple-storage';
import { TripStorage } from '../ports/trip-storage';

export type AreaResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type AreaManagement = {
  readonly add: (name: string) => AreaResult;
  readonly getAreas: () => string[];
};

const isDuplicate = (name: string, areas: string[]): boolean =>
  areas.some(area => area.toLowerCase() === name.toLowerCase());

export const createAreaManagement = (
  areaStorage: AreaStorage,
  _stapleStorage: StapleStorage,
  _tripStorage: TripStorage,
): AreaManagement => {
  return {
    add: (name: string): AreaResult => {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return { success: false, error: 'Area name is required' };
      }

      const currentAreas = areaStorage.loadAll();
      if (isDuplicate(trimmedName, currentAreas)) {
        return { success: false, error: `"${trimmedName}" already exists` };
      }

      areaStorage.saveAll([...currentAreas, trimmedName]);
      return { success: true };
    },

    getAreas: (): string[] => areaStorage.loadAll(),
  };
};
