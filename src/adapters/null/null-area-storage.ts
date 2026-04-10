// Null adapter for AreaStorage - in-memory implementation for testing

import { AreaStorage } from '../../ports/area-storage';

const DEFAULT_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

type NullAreaStorageOptions = {
  readonly onChange?: () => void;
};

export const createNullAreaStorage = (
  initialAreas?: string[],
  options: NullAreaStorageOptions = {}
): AreaStorage & { readonly simulateRemoteChange: (areas: string[]) => void } => {
  let areas: string[] = [...(initialAreas ?? DEFAULT_AREAS)];
  const { onChange } = options;

  return {
    loadAll: () => [...areas],
    saveAll: (newAreas: string[]) => {
      areas = [...newAreas];
    },
    simulateRemoteChange: (newAreas: string[]) => {
      areas = [...newAreas];
      onChange?.();
    },
  };
};
