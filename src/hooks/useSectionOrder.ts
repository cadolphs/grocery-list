// useSectionOrder - hook bridging SectionOrderStorage to React state
// Reads section order from context and exposes reactive state with reorder/reset

import { useState, useCallback } from 'react';
import { useServices } from '../ui/ServiceProvider';

export type UseSectionOrderResult = {
  readonly order: string[] | null;
  readonly reorder: (newOrder: string[]) => void;
  readonly reset: () => void;
};

export const useSectionOrder = (): UseSectionOrderResult => {
  const { sectionOrderStorage } = useServices();
  const [order, setOrder] = useState<string[] | null>(() => sectionOrderStorage.loadOrder());

  const reorder = useCallback(
    (newOrder: string[]): void => {
      sectionOrderStorage.saveOrder(newOrder);
      setOrder(sectionOrderStorage.loadOrder());
    },
    [sectionOrderStorage],
  );

  const reset = useCallback((): void => {
    sectionOrderStorage.clearOrder();
    setOrder(null);
  }, [sectionOrderStorage]);

  return { order, reorder, reset };
};
