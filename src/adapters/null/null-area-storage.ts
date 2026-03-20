// Null adapter for AreaStorage - in-memory implementation for testing

import { AreaStorage } from '../../ports/area-storage';

const DEFAULT_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

export const createNullAreaStorage = (
  initialAreas?: string[]
): AreaStorage => {
  let areas: string[] = [...(initialAreas ?? DEFAULT_AREAS)];

  return {
    loadAll: () => [...areas],
    saveAll: (newAreas: string[]) => {
      areas = [...newAreas];
    },
  };
};
