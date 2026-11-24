// useStaples - hook bridging the StapleLibrary to React state
// Re-reads the library after every mutation (add, update, remove) so screens
// that derive from the staple list stay current while mounted.

import { useEffect, useState } from 'react';
import { StapleLibrary } from '../domain/staple-library';
import { LibraryItem } from '../domain/types';

export const useStaples = (stapleLibrary: StapleLibrary): LibraryItem[] => {
  const [staples, setStaples] = useState<LibraryItem[]>(() =>
    stapleLibrary.listAll(),
  );

  // Re-sync when the library is swapped, then follow its mutations. Mirrors
  // the pattern in useAreas and useTrip.
  useEffect(() => {
    setStaples(stapleLibrary.listAll());
    return stapleLibrary.subscribe(() => {
      setStaples(stapleLibrary.listAll());
    });
  }, [stapleLibrary]);

  return staples;
};
