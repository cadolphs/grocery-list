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

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => MockDocData }) => void;
let capturedSnapshotCallback: SnapshotCallback | null = null;
const mockUnsubscribe = jest.fn();

const mockOnSnapshot = jest.fn((docRef: { path: string }, callback: SnapshotCallback) => {
  const data = mockStore[docRef.path];
  callback({
    exists: () => data !== undefined,
    data: () => data,
  });
  capturedSnapshotCallback = callback;
  return mockUnsubscribe;
});

const simulateRemoteSnapshot = (path: string, data: MockDocData) => {
  mockStore[path] = data;
  if (capturedSnapshotCallback) {
    capturedSnapshotCallback({
      exists: () => data !== undefined,
      data: () => data,
    });
  }
};

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
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
  capturedSnapshotCallback = null;
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

// --- onChange callback and echo detection tests ---

const createFreshStorageWithOnChange = async (onChange?: () => void) => {
  const { createFirestoreAreaStorage } = require('./firestore-area-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreAreaStorage(mockDb, TEST_UID, { onChange });
  await storage.initialize();
  return storage as AreaStorage & { initialize: () => Promise<void>; unsubscribe: () => void };
};

describe('firestore area storage onChange callback', () => {
  test('calls onChange when remote snapshot contains different areas', async () => {
    mockStore[AREAS_DOC_PATH] = { items: ['Kitchen', 'Bathroom'] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);
    expect(storage.loadAll()).toEqual(['Kitchen', 'Bathroom']);

    // Simulate remote rename of "Bathroom" to "Garage"
    simulateRemoteSnapshot(AREAS_DOC_PATH, { items: ['Kitchen', 'Garage'] });

    expect(onChangeCallCount).toBe(1);
    expect(storage.loadAll()).toEqual(['Kitchen', 'Garage']);
  });

  test('does NOT call onChange when snapshot echoes current cache (own-write detection)', async () => {
    mockStore[AREAS_DOC_PATH] = { items: ['Kitchen', 'Bathroom'] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);

    // Save locally (updates cache)
    storage.saveAll(['Kitchen', 'Bathroom', 'Garage']);

    // Simulate snapshot echo with identical data
    simulateRemoteSnapshot(AREAS_DOC_PATH, { items: ['Kitchen', 'Bathroom', 'Garage'] });

    expect(onChangeCallCount).toBe(0);
  });

  test('returns unsubscribe function that stops the listener', async () => {
    mockStore[AREAS_DOC_PATH] = { items: [] };

    const storage = await createFreshStorageWithOnChange(() => {});
    storage.unsubscribe();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('works without onChange callback (backward compatible)', async () => {
    mockStore[AREAS_DOC_PATH] = { items: ['Kitchen'] };

    const storage = await createFreshStorageWithOnChange();
    expect(storage.loadAll()).toEqual(['Kitchen']);

    simulateRemoteSnapshot(AREAS_DOC_PATH, { items: ['Kitchen', 'Garage'] });

    expect(storage.loadAll()).toEqual(['Kitchen', 'Garage']);
  });
});
