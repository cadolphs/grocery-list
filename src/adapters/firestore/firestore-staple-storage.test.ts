import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

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
  // Immediately fire with current data (simulates initial snapshot)
  const data = mockStore[docRef.path];
  callback({
    exists: () => data !== undefined,
    data: () => data,
  });
  capturedSnapshotCallback = callback;
  return mockUnsubscribe;
});

// Helper to simulate a remote snapshot arriving
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
const STAPLES_DOC_PATH = `users/${TEST_UID}/data/staples`;

const makeStapleItem = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'item-1',
  name: 'Milk',
  houseArea: 'Kitchen',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const createFreshStorage = async () => {
  const { createFirestoreStapleStorage } = require('./firestore-staple-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreStapleStorage(mockDb, TEST_UID);
  await storage.initialize();
  return storage as StapleStorage & { initialize: () => Promise<void> };
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  capturedSnapshotCallback = null;
});

// --- Acceptance test ---

describe('firestore staple storage implements staple storage port', () => {
  test('round-trip: save an item then loadAll returns it', async () => {
    const storage = await createFreshStorage();
    const item = makeStapleItem();

    storage.save(item);

    const result = storage.loadAll();
    expect(result).toEqual([item]);
  });

  // --- Unit tests for each port method ---

  test('loadAll returns empty array when no items exist', async () => {
    const storage = await createFreshStorage();

    expect(storage.loadAll()).toEqual([]);
  });

  test('initialize loads items from Firestore document', async () => {
    const item = makeStapleItem();
    mockStore[STAPLES_DOC_PATH] = { items: [item] };

    const storage = await createFreshStorage();

    expect(storage.loadAll()).toEqual([item]);
  });

  test('save persists item to Firestore in background', async () => {
    const storage = await createFreshStorage();
    const item = makeStapleItem();

    storage.save(item);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: STAPLES_DOC_PATH }),
      { items: [item] }
    );
  });

  test('remove deletes item by id', async () => {
    const item = makeStapleItem();
    mockStore[STAPLES_DOC_PATH] = { items: [item] };
    const storage = await createFreshStorage();

    storage.remove(item.id);

    expect(storage.loadAll()).toEqual([]);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: STAPLES_DOC_PATH }),
      { items: [] }
    );
  });

  test('remove does nothing for non-existent id', async () => {
    const item = makeStapleItem();
    mockStore[STAPLES_DOC_PATH] = { items: [item] };
    const storage = await createFreshStorage();

    storage.remove('non-existent');

    expect(storage.loadAll()).toEqual([item]);
  });

  test('update replaces item with matching id', async () => {
    const item = makeStapleItem();
    mockStore[STAPLES_DOC_PATH] = { items: [item] };
    const storage = await createFreshStorage();

    const updated = { ...item, name: 'Oat Milk' };
    storage.update(updated);

    expect(storage.loadAll()).toEqual([updated]);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: STAPLES_DOC_PATH }),
      { items: [updated] }
    );
  });

  test('search returns matching items case-insensitively', async () => {
    const milk = makeStapleItem({ id: '1', name: 'Milk' });
    const bread = makeStapleItem({ id: '2', name: 'Bread' });
    const almondMilk = makeStapleItem({ id: '3', name: 'Almond Milk' });
    mockStore[STAPLES_DOC_PATH] = { items: [milk, bread, almondMilk] };
    const storage = await createFreshStorage();

    expect(storage.search('milk')).toEqual([milk, almondMilk]);
  });

  test('search returns empty array for empty query', async () => {
    const item = makeStapleItem();
    mockStore[STAPLES_DOC_PATH] = { items: [item] };
    const storage = await createFreshStorage();

    expect(storage.search('')).toEqual([]);
    expect(storage.search('  ')).toEqual([]);
  });

  test('updateArea renames area for all matching items', async () => {
    const kitchen1 = makeStapleItem({ id: '1', name: 'Milk', houseArea: 'Kitchen' });
    const bathroom = makeStapleItem({ id: '2', name: 'Soap', houseArea: 'Bathroom' });
    const kitchen2 = makeStapleItem({ id: '3', name: 'Bread', houseArea: 'Kitchen' });
    mockStore[STAPLES_DOC_PATH] = { items: [kitchen1, bathroom, kitchen2] };
    const storage = await createFreshStorage();

    storage.updateArea('Kitchen', 'Cocina');

    const result = storage.loadAll();
    expect(result[0].houseArea).toBe('Cocina');
    expect(result[1].houseArea).toBe('Bathroom');
    expect(result[2].houseArea).toBe('Cocina');
  });
});

// --- onChange callback and echo detection tests ---

const createFreshStorageWithOnChange = async (onChange?: () => void) => {
  const { createFirestoreStapleStorage } = require('./firestore-staple-storage');
  const mockDb = { type: 'firestore' };
  const result = createFirestoreStapleStorage(mockDb, TEST_UID, { onChange });
  await result.initialize();
  return result as StapleStorage & { initialize: () => Promise<void>; unsubscribe: () => void };
};

describe('firestore staple storage onChange callback', () => {
  test('calls onChange when remote snapshot contains different data', async () => {
    const milk = makeStapleItem({ id: '1', name: 'Milk' });
    mockStore[STAPLES_DOC_PATH] = { items: [milk] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);
    expect(storage.loadAll()).toEqual([milk]);

    // Simulate remote addition of "Eggs"
    const eggs = makeStapleItem({ id: '2', name: 'Eggs' });
    simulateRemoteSnapshot(STAPLES_DOC_PATH, { items: [milk, eggs] });

    expect(onChangeCallCount).toBe(1);
    expect(storage.loadAll()).toHaveLength(2);
  });

  test('does NOT call onChange when snapshot echoes current cache (own-write detection)', async () => {
    const milk = makeStapleItem({ id: '1', name: 'Milk' });
    mockStore[STAPLES_DOC_PATH] = { items: [milk] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);

    // Add item locally (updates cache)
    const eggs = makeStapleItem({ id: '2', name: 'Eggs' });
    storage.save(eggs);

    // Simulate snapshot echo with identical data
    simulateRemoteSnapshot(STAPLES_DOC_PATH, { items: [milk, eggs] });

    // onChange should NOT fire for echo
    expect(onChangeCallCount).toBe(0);
  });

  test('calls onChange when remote snapshot removes an item', async () => {
    const milk = makeStapleItem({ id: '1', name: 'Milk' });
    const eggs = makeStapleItem({ id: '2', name: 'Eggs' });
    mockStore[STAPLES_DOC_PATH] = { items: [milk, eggs] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);
    expect(storage.loadAll()).toHaveLength(2);

    // Simulate remote removal of "Eggs"
    simulateRemoteSnapshot(STAPLES_DOC_PATH, { items: [milk] });

    expect(onChangeCallCount).toBe(1);
    expect(storage.loadAll()).toHaveLength(1);
    expect(storage.loadAll()[0].name).toBe('Milk');
  });

  test('returns unsubscribe function that stops the listener', async () => {
    mockStore[STAPLES_DOC_PATH] = { items: [] };

    const storage = await createFreshStorageWithOnChange(() => {});
    storage.unsubscribe();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('works without onChange callback (backward compatible)', async () => {
    const milk = makeStapleItem({ id: '1', name: 'Milk' });
    mockStore[STAPLES_DOC_PATH] = { items: [milk] };

    const storage = await createFreshStorageWithOnChange();
    expect(storage.loadAll()).toEqual([milk]);

    // Simulate remote change -- should not throw even without onChange
    const eggs = makeStapleItem({ id: '2', name: 'Eggs' });
    simulateRemoteSnapshot(STAPLES_DOC_PATH, { items: [milk, eggs] });

    expect(storage.loadAll()).toHaveLength(2);
  });
});
