// useSectionOrder - hook bridging SectionOrderStorage to React state
// Reads section order from context and exposes reactive state with reorder/reset.
// Subscribes to storage change notifications so consumers stay in sync when
// writes happen elsewhere (other consumers, remote snapshot deltas).
//
// On first read for a given storage instance, applies the ADR-004 wipe-on-detect
// migration: any stored entry containing '::' indicates legacy composite-keyed
// data from the predecessor feature; the hook clears storage and surfaces null.

import { useState, useCallback, useEffect } from 'react';
import { useServices } from '../ui/ServiceProvider';

export type UseSectionOrderResult = {
  readonly order: string[] | null;
  readonly reorder: (newOrder: string[]) => void;
  readonly reset: () => void;
};

// Pure predicate: detects the legacy composite-key shape (ADR-004).
// True when at least one entry contains '::'. Empty arrays and null pass through.
export const isLegacyOrder = (order: string[] | null): boolean => {
  if (order === null) return false;
  return order.some((entry) => entry.includes('::'));
};

const loadAndMigrate = (
  storage: { loadOrder: () => string[] | null; clearOrder: () => void }
): string[] | null => {
  const loaded = storage.loadOrder();
  if (isLegacyOrder(loaded)) {
    storage.clearOrder();
    return null;
  }
  return loaded;
};

export const useSectionOrder = (): UseSectionOrderResult => {
  const { sectionOrderStorage } = useServices();
  const [order, setOrder] = useState<string[] | null>(() =>
    loadAndMigrate(sectionOrderStorage)
  );

  // Re-sync React state when the storage emits change (local writes from other
  // consumers, Firestore onSnapshot remote deltas) and when the storage is swapped.
  // Migration runs once on mount per storage instance; once cleared, the predicate
  // is false on every subsequent read, making the migration idempotent and
  // self-extinguishing.
  useEffect(() => {
    setOrder(loadAndMigrate(sectionOrderStorage));
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
