// Driven port: Staple Storage
// Pure interface - no implementation details

import { StapleItem } from '../domain/types';

export type StapleStorage = {
  readonly loadAll: () => StapleItem[];
  readonly save: (item: StapleItem) => void;
  readonly remove: (id: string) => void;
  readonly search: (query: string) => StapleItem[];
};
