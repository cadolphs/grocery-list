// useStaples reactivity tests
// The hook returns the library's staples, re-renders after each mutation, and
// leaves no listener behind after unmount or when the library is swapped.

import { renderHook, act } from '@testing-library/react-native';
import { useStaples } from './useStaples';
import { createStapleLibrary, StapleLibrary } from '../domain/staple-library';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { StapleItem } from '../domain/types';

const withListenerCount = (
  library: StapleLibrary,
): { library: StapleLibrary; count: () => number } => {
  let listeners = 0;
  return {
    library: {
      ...library,
      subscribe: (listener) => {
        listeners += 1;
        const unsubscribe = library.subscribe(listener);
        return () => {
          listeners -= 1;
          unsubscribe();
        };
      },
    },
    count: () => listeners,
  };
};

const milk = {
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
} as const;

describe('useStaples', () => {
  it('returns the staples already in the library', () => {
    const library = createStapleLibrary(createNullStapleStorage([milk]));

    const { result } = renderHook(() => useStaples(library));

    expect(result.current.map((s) => s.name)).toEqual(['Milk']);
  });

  it('re-renders with the new list after a staple is added', () => {
    const library = createStapleLibrary(createNullStapleStorage([]));
    const { result } = renderHook(() => useStaples(library));

    act(() => {
      library.addStaple(milk);
    });

    expect(result.current.map((s) => s.name)).toEqual(['Milk']);
  });

  it('re-renders after a staple is removed', () => {
    const library = createStapleLibrary(createNullStapleStorage([milk]));
    const { result } = renderHook(() => useStaples(library));

    act(() => {
      library.remove(result.current[0].id);
    });

    expect(result.current).toEqual([]);
  });

  it('removes its listener on unmount', () => {
    const { library, count } = withListenerCount(
      createStapleLibrary(createNullStapleStorage([])),
    );
    const { unmount } = renderHook(() => useStaples(library));
    expect(count()).toBe(1);

    unmount();

    expect(count()).toBe(0);
  });

  it('follows a different library when it is swapped', () => {
    const first = createStapleLibrary(createNullStapleStorage([]));
    const second = createStapleLibrary(createNullStapleStorage([milk]));
    const { result, rerender } = renderHook<
      StapleItem[],
      { library: StapleLibrary }
    >(({ library }) => useStaples(library), {
      initialProps: { library: first },
    });
    expect(result.current).toEqual([]);

    rerender({ library: second });

    expect(result.current.map((s) => s.name)).toEqual(['Milk']);
  });
});
