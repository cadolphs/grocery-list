// Null adapter for SectionOrderStorage - in-memory implementation for testing

import { SectionOrderStorage } from '../../ports/section-order-storage';

export const createNullSectionOrderStorage = (
  initialOrder: string[] | null = null,
): SectionOrderStorage => {
  let cachedOrder: string[] | null = initialOrder;

  return {
    loadOrder: () => cachedOrder,
    saveOrder: (order: string[]) => {
      cachedOrder = [...order];
    },
    clearOrder: () => {
      cachedOrder = null;
    },
  };
};
