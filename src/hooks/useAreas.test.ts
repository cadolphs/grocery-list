// useAreas reactivity tests
// Verifies the hook subscribes to area storage change notifications and
// re-renders with the updated list, and that subscribe/unsubscribe are
// symmetric (no listener remains after unmount).

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useAreas } from './useAreas';
import { ServiceProvider } from '../ui/ServiceProvider';
import { createStapleLibrary } from '../domain/staple-library';
import { createTrip } from '../domain/trip';
import { createAreaManagement } from '../domain/area-management';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';
import { AreaStorage } from '../ports/area-storage';

type TestAreaStorage = AreaStorage & {
  readonly simulateRemoteChange: (newAreas: string[]) => void;
  readonly listenerCount: () => number;
};

const createTestAreaStorage = (initial: string[]): TestAreaStorage => {
  let areas: string[] = [...initial];
  const listeners = new Set<() => void>();
  return {
    loadAll: () => [...areas],
    saveAll: (next: string[]) => {
      areas = [...next];
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    simulateRemoteChange: (next: string[]) => {
      areas = [...next];
      listeners.forEach((l) => l());
    },
    listenerCount: () => listeners.size,
  };
};

const createTestWrapper = (areaStorage: TestAreaStorage) => {
  const stapleStorage = createNullStapleStorage([]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ServiceProvider,
      { stapleLibrary: library, tripService, areaManagement, children }
    );

  return { wrapper };
};

describe('useAreas reactivity', () => {
  it('re-renders with updated list when storage emits change', () => {
    const areaStorage = createTestAreaStorage(['Kitchen', 'Bathroom']);
    const { wrapper } = createTestWrapper(areaStorage);

    const { result } = renderHook(() => useAreas(), { wrapper });

    expect(result.current.areas).toEqual(['Kitchen', 'Bathroom']);

    act(() => {
      areaStorage.simulateRemoteChange(['Kitchen', 'Bathroom', 'Garage']);
    });

    expect(result.current.areas).toEqual(['Kitchen', 'Bathroom', 'Garage']);
  });

  it('unsubscribes on unmount (listener count returns to zero)', () => {
    const areaStorage = createTestAreaStorage(['Kitchen']);
    const { wrapper } = createTestWrapper(areaStorage);

    const { unmount } = renderHook(() => useAreas(), { wrapper });

    expect(areaStorage.listenerCount()).toBeGreaterThan(0);

    unmount();

    expect(areaStorage.listenerCount()).toBe(0);
  });
});
