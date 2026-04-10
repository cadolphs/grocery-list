// Null adapter for SectionOrderStorage - in-memory implementation for testing

import { SectionOrderStorage } from '../../ports/section-order-storage';

type NullSectionOrderStorageOptions = {
  readonly onChange?: () => void;
};

export const createNullSectionOrderStorage = (
  initialOrder: string[] | null = null,
  options: NullSectionOrderStorageOptions = {}
): SectionOrderStorage & { readonly simulateRemoteChange: (order: string[] | null) => void } => {
  let cachedOrder: string[] | null = initialOrder;
  const { onChange } = options;

  return {
    loadOrder: () => cachedOrder,
    saveOrder: (order: string[]) => {
      cachedOrder = [...order];
    },
    clearOrder: () => {
      cachedOrder = null;
    },
    simulateRemoteChange: (order: string[] | null) => {
      cachedOrder = order === null ? null : [...order];
      onChange?.();
    },
  };
};
