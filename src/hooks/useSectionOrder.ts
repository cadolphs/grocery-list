// useSectionOrder - hook bridging SectionOrderStorage to React state
// Reads section order from context and exposes reactive state with reorder/reset.
// Subscribes to storage change notifications so consumers stay in sync when
// writes happen elsewhere (other consumers, remote snapshot deltas).

import { useState, useCallback, useEffect } from 'react';
import { useServices } from '../ui/ServiceProvider';

export type UseSectionOrderResult = {
  readonly order: string[] | null;
  readonly reorder: (newOrder: string[]) => void;
  readonly reset: () => void;
};

export const useSectionOrder = (): UseSectionOrderResult => {
  const { sectionOrderStorage } = useServices();
  const [order, setOrder] = useState<string[] | null>(() => sectionOrderStorage.loadOrder());

  // Re-sync React state when the storage emits change (local writes from other
  // consumers, Firestore onSnapshot remote deltas) and when the storage is swapped.
  useEffect(() => {
    setOrder(sectionOrderStorage.loadOrder());
    return sectionOrderStorage.subscribe(() => {
      setOrder(sectionOrderStorage.loadOrder());
    });
  }, [sectionOrderStorage]);

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
