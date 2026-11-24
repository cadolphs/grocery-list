// Shared AdapterFactories stub over the null adapters, for acceptance tests
// that drive initializeApp. Every adapter initializes at once and unsubscribes
// as a no-op; a scenario overrides only the factories it needs to observe or
// share (a storage it reads from, an onChange it wants to fire).

import { AdapterFactories } from '../../../src/hooks/useAppInitialization';
import { createNullLibraryStorage } from '../../../src/adapters/null/null-library-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// Wrap a null storage as an initializable adapter (what the Firestore and
// AsyncStorage adapters add on top of their port).
export const withInitialize = <T extends object>(storage: T) => ({
  ...storage,
  initialize: () => Promise.resolve(),
  unsubscribe: () => {},
});

export const createNullAdapterFactories = (
  overrides: Partial<AdapterFactories> = {},
): AdapterFactories => ({
  createLibraryStorage: () => withInitialize(createNullLibraryStorage()),
  createAreaStorage: () => withInitialize(createNullAreaStorage()),
  createSectionOrderStorage: () =>
    withInitialize(createNullSectionOrderStorage()),
  createTripStorage: () => withInitialize(createNullTripStorage()),
  checkMigrationNeeded: () => false,
  migrateToFirestore: () => {},
  createAsyncLibraryStorage: () => withInitialize(createNullLibraryStorage()),
  createAsyncAreaStorage: () => withInitialize(createNullAreaStorage()),
  createAsyncSectionOrderStorage: () =>
    withInitialize(createNullSectionOrderStorage()),
  createAsyncTripStorage: () => withInitialize(createNullTripStorage()),
  migrateTripIfNeeded: () => {},
  ...overrides,
});
