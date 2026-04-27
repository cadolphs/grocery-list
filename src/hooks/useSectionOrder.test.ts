// useSectionOrder reactivity tests
// Verifies the hook subscribes to section order storage change notifications,
// re-renders with the updated order, and propagates changes across consumers
// sharing one storage instance.

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useSectionOrder } from './useSectionOrder';
import { ServiceProvider } from '../ui/ServiceProvider';
import { createStapleLibrary } from '../domain/staple-library';
import { createTrip } from '../domain/trip';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';
import { SectionOrderStorage } from '../ports/section-order-storage';

type TestSectionOrderStorage = SectionOrderStorage & {
  readonly listenerCount: () => number;
};

const createTestSectionOrderStorage = (
  initial: string[] | null = null
): TestSectionOrderStorage => {
  let cached: string[] | null = initial === null ? null : [...initial];
  const listeners = new Set<() => void>();
  const notify = (): void => {
    listeners.forEach((l) => l());
  };
  return {
    loadOrder: (): string[] | null => (cached === null ? null : [...cached]),
    saveOrder: (order: string[]): void => {
      cached = [...order];
      notify();
    },
    clearOrder: (): void => {
      cached = null;
      notify();
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount: () => listeners.size,
  };
};

const createTestWrapper = (sectionOrderStorage: SectionOrderStorage) => {
  const stapleStorage = createNullStapleStorage([]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ServiceProvider,
      { stapleLibrary: library, tripService, sectionOrderStorage, children }
    );

  return { wrapper };
};

describe('useSectionOrder reactivity', () => {
  it('propagates reorder from one consumer to another sharing the same storage', () => {
    const sectionOrderStorage = createTestSectionOrderStorage(null);
    const { wrapper } = createTestWrapper(sectionOrderStorage);

    const consumerA = renderHook(() => useSectionOrder(), { wrapper });
    const consumerB = renderHook(() => useSectionOrder(), { wrapper });

    expect(consumerA.result.current.order).toBeNull();
    expect(consumerB.result.current.order).toBeNull();

    act(() => {
      consumerA.result.current.reorder(['Bakery::1', 'Produce::3']);
    });

    expect(consumerA.result.current.order).toEqual(['Bakery::1', 'Produce::3']);
    expect(consumerB.result.current.order).toEqual(['Bakery::1', 'Produce::3']);
  });

  it('re-renders with updated order when storage emits change', () => {
    const sectionOrderStorage = createTestSectionOrderStorage(['Dairy', 'Produce']);
    const { wrapper } = createTestWrapper(sectionOrderStorage);

    const { result } = renderHook(() => useSectionOrder(), { wrapper });

    expect(result.current.order).toEqual(['Dairy', 'Produce']);

    act(() => {
      sectionOrderStorage.saveOrder(['Produce', 'Dairy', 'Bakery']);
    });

    expect(result.current.order).toEqual(['Produce', 'Dairy', 'Bakery']);
  });

  it('unsubscribes on unmount (listener count returns to zero)', () => {
    const sectionOrderStorage = createTestSectionOrderStorage(null);
    const { wrapper } = createTestWrapper(sectionOrderStorage);

    const { unmount } = renderHook(() => useSectionOrder(), { wrapper });

    expect(sectionOrderStorage.listenerCount()).toBeGreaterThan(0);

    unmount();

    expect(sectionOrderStorage.listenerCount()).toBe(0);
  });
});
