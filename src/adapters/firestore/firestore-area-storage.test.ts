import { AreaStorage } from '../../ports/area-storage';

// --- Firestore mock infrastructure ---

type MockDocData = Record<string, unknown> | undefined;
const mockStore: Record<string, MockDocData> = {};

const mockDoc = jest.fn((_db: unknown, ...pathSegments: string[]) => ({
  path: pathSegments.join('/'),
}));

const mockGetDoc = jest.fn(async (docRef: { path: string }) => {
  const data = mockStore[docRef.path];
  return {
    exists: () => data !== undefined,
    data: () => data,
  };
});

const mockSetDoc = jest.fn(async (docRef: { path: string }, data: unknown) => {
  mockStore[docRef.path] = data as MockDocData;
});

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...(args as [{ path: string }])),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [{ path: string }, unknown])),
}));

// --- Test helpers ---

const TEST_UID = 'user-123';
const AREAS_DOC_PATH = `users/${TEST_UID}/data/areas`;

const createFreshStorage = async () => {
  const { createFirestoreAreaStorage } = require('./firestore-area-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreAreaStorage(mockDb, TEST_UID);
  await storage.initialize();
  return storage as AreaStorage & { initialize: () => Promise<void> };
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
});

// --- Tests ---

describe('firestore area storage implements area storage port', () => {
  test('round-trip: saveAll areas then loadAll returns them', async () => {
    const storage = await createFreshStorage();
    const areas = ['Kitchen', 'Bathroom', 'Garage'];

    storage.saveAll(areas);

    expect(storage.loadAll()).toEqual(areas);
  });

  test('loadAll returns empty array when no areas exist', async () => {
    const storage = await createFreshStorage();

    expect(storage.loadAll()).toEqual([]);
  });

  test('initialize loads areas from Firestore document', async () => {
    const areas = ['Fridge', 'Freezer'];
    mockStore[AREAS_DOC_PATH] = { items: areas };

    const storage = await createFreshStorage();

    expect(storage.loadAll()).toEqual(areas);
  });

  test('saveAll persists areas to Firestore in background', async () => {
    const storage = await createFreshStorage();
    const areas = ['Kitchen', 'Bathroom'];

    storage.saveAll(areas);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: AREAS_DOC_PATH }),
      { items: areas }
    );
  });

  test('saveAll replaces previous areas', async () => {
    mockStore[AREAS_DOC_PATH] = { items: ['Old Area'] };
    const storage = await createFreshStorage();

    storage.saveAll(['New Area 1', 'New Area 2']);

    expect(storage.loadAll()).toEqual(['New Area 1', 'New Area 2']);
  });
});
