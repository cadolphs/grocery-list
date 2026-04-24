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
  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    listeners.forEach((listener) => listener());
  };

  return {
    loadAll: () => [...areas],
    saveAll: (newAreas: string[]) => {
      areas = [...newAreas];
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    simulateRemoteChange: (newAreas: string[]) => {
      areas = [...newAreas];
      onChange?.();
      notifyListeners();
    },
  };
};
