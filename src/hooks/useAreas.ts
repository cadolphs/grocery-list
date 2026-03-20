// useAreas - hook bridging AreaManagement to React state
// Reads areas from context and exposes them as reactive state

import { useState, useCallback } from 'react';
import { AreaResult, DeleteResult, DeleteOptions } from '../domain/area-management';
import { useServices } from '../ui/ServiceProvider';

export type UseAreasResult = {
  readonly areas: string[];
  readonly addArea: (name: string) => AreaResult;
  readonly renameArea: (oldName: string, newName: string) => AreaResult;
  readonly deleteArea: (name: string, options?: DeleteOptions) => DeleteResult;
  readonly reorderAreas: (newOrder: string[]) => AreaResult;
};

export const useAreas = (): UseAreasResult => {
  const { areaManagement } = useServices();
  const [areas, setAreas] = useState<string[]>(() => areaManagement.getAreas());

  const refreshAreas = useCallback(() => {
    setAreas(areaManagement.getAreas());
  }, [areaManagement]);

  const addArea = useCallback(
    (name: string): AreaResult => {
      const result = areaManagement.add(name);
      if (result.success) {
        refreshAreas();
      }
      return result;
    },
    [areaManagement, refreshAreas],
  );

  const renameArea = useCallback(
    (oldName: string, newName: string): AreaResult => {
      const result = areaManagement.rename(oldName, newName);
      if (result.success) {
        refreshAreas();
      }
      return result;
    },
    [areaManagement, refreshAreas],
  );

  const deleteArea = useCallback(
    (name: string, options?: DeleteOptions): DeleteResult => {
      const result = areaManagement.delete(name, options);
      if (result.success) {
        refreshAreas();
      }
      return result;
    },
    [areaManagement, refreshAreas],
  );

  const reorderAreas = useCallback(
    (newOrder: string[]): AreaResult => {
      const result = areaManagement.reorder(newOrder);
      if (result.success) {
        refreshAreas();
      }
      return result;
    },
    [areaManagement, refreshAreas],
  );

  return { areas, addArea, renameArea, deleteArea, reorderAreas };
};
