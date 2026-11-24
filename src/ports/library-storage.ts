// Driven port: Library Storage
// Pure interface - no implementation details

import { LibraryItem } from '../domain/types';

export type LibraryStorage = {
  readonly loadAll: () => LibraryItem[];
  readonly save: (item: LibraryItem) => void;
  readonly remove: (id: string) => void;
  readonly search: (query: string) => LibraryItem[];
  readonly update: (item: LibraryItem) => void;
  readonly updateArea: (oldName: string, newName: string) => void;
};
