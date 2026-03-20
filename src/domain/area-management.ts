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
  readonly rename: (oldName: string, newName: string) => AreaResult;
  readonly getAreas: () => string[];
};

const isDuplicate = (name: string, areas: string[]): boolean =>
  areas.some(area => area.toLowerCase() === name.toLowerCase());

export const createAreaManagement = (
  areaStorage: AreaStorage,
  stapleStorage: StapleStorage,
  tripStorage: TripStorage,
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

    rename: (oldName: string, newName: string): AreaResult => {
      const trimmedNewName = newName.trim();
      if (trimmedNewName === '') {
        return { success: false, error: 'Area name is required' };
      }

      const currentAreas = areaStorage.loadAll();

      if (isDuplicate(trimmedNewName, currentAreas)) {
        return { success: false, error: `"${trimmedNewName}" already exists` };
      }

      if (!currentAreas.includes(oldName)) {
        return { success: false, error: `"${oldName}" not found` };
      }

      // Replace old name with new name at same position
      const updatedAreas = currentAreas.map(area =>
        area === oldName ? trimmedNewName : area
      );
      areaStorage.saveAll(updatedAreas);

      // Propagate to staples and trip items
      stapleStorage.updateArea(oldName, trimmedNewName);
      tripStorage.updateItemArea(oldName, trimmedNewName);

      return { success: true };
    },

    getAreas: (): string[] => areaStorage.loadAll(),
  };
};
