// Area Management - driving port implementation
// Pure domain logic, no IO imports

import { AreaStorage } from '../ports/area-storage';
import { StapleStorage } from '../ports/staple-storage';
import { TripStorage } from '../ports/trip-storage';

export type AreaResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type DeleteOptions = {
  readonly reassignTo?: string;
};

export type DeleteResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string; readonly conflicts?: ReadonlyArray<{ readonly name: string; readonly existsIn: string }> };

export type AreaManagement = {
  readonly add: (name: string) => AreaResult;
  readonly rename: (oldName: string, newName: string) => AreaResult;
  readonly delete: (name: string, options?: DeleteOptions) => DeleteResult;
  readonly reorder: (newOrder: string[]) => AreaResult;
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

    delete: (name: string, options?: DeleteOptions): DeleteResult => {
      const currentAreas = areaStorage.loadAll();

      if (currentAreas.length <= 1) {
        return { success: false, error: 'Cannot delete: at least one area must remain' };
      }

      if (!currentAreas.includes(name)) {
        return { success: false, error: `"${name}" not found` };
      }

      const staplesInArea = stapleStorage.loadAll().filter(s => s.houseArea === name);

      if (staplesInArea.length > 0 && !options?.reassignTo) {
        return { success: false, error: 'Area has staples; reassignment target is required' };
      }

      if (staplesInArea.length > 0 && options?.reassignTo) {
        // Check for duplicate conflicts
        const targetStaples = stapleStorage.loadAll().filter(s => s.houseArea === options.reassignTo);
        const targetNames = new Set(targetStaples.map(s => s.name.toLowerCase()));
        const conflicts = staplesInArea
          .filter(s => targetNames.has(s.name.toLowerCase()))
          .map(s => ({ name: s.name, existsIn: options.reassignTo! }));

        if (conflicts.length > 0) {
          return { success: false, error: 'Duplicate conflict on reassignment', conflicts };
        }

        // Reassign staples and trip items
        stapleStorage.updateArea(name, options.reassignTo);
        tripStorage.updateItemArea(name, options.reassignTo);
      }

      const updatedAreas = currentAreas.filter(area => area !== name);
      areaStorage.saveAll(updatedAreas);
      return { success: true };
    },

    reorder: (newOrder: string[]): AreaResult => {
      const currentAreas = areaStorage.loadAll();
      const currentSorted = [...currentAreas].sort();
      const newSorted = [...newOrder].sort();

      if (currentSorted.length !== newSorted.length ||
          currentSorted.some((area, index) => area !== newSorted[index])) {
        return { success: false, error: 'Reorder must contain exactly the same areas' };
      }

      areaStorage.saveAll([...newOrder]);
      return { success: true };
    },

    getAreas: (): string[] => areaStorage.loadAll(),
  };
};
