import { SectionOrderStorage } from '../../ports/section-order-storage';

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
const SECTION_ORDER_DOC_PATH = `users/${TEST_UID}/data/sectionOrder`;

const createFreshStorage = async () => {
  const { createFirestoreSectionOrderStorage } = require('./firestore-section-order-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreSectionOrderStorage(mockDb, TEST_UID);
  await storage.initialize();
  return storage as SectionOrderStorage & { initialize: () => Promise<void> };
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  capturedSnapshotCallback = null;
});

// --- Tests ---

describe('firestore section order storage implements section order storage port', () => {
  test('round-trip: saveOrder then loadOrder returns the order', async () => {
    const storage = await createFreshStorage();
    const order = ['Produce', 'Dairy', 'Bakery'];

    storage.saveOrder(order);

    expect(storage.loadOrder()).toEqual(order);
  });

  test('clearOrder then loadOrder returns null', async () => {
    const storage = await createFreshStorage();
    storage.saveOrder(['Produce', 'Dairy']);

    storage.clearOrder();

    expect(storage.loadOrder()).toBeNull();
  });

  test('loadOrder returns null when no order exists', async () => {
    const storage = await createFreshStorage();

    expect(storage.loadOrder()).toBeNull();
  });

  test('initialize loads order from Firestore document', async () => {
    const order = ['Frozen', 'Snacks', 'Beverages'];
    mockStore[SECTION_ORDER_DOC_PATH] = { order };

    const storage = await createFreshStorage();

    expect(storage.loadOrder()).toEqual(order);
  });

  test('saveOrder persists order to Firestore in background', async () => {
    const storage = await createFreshStorage();
    const order = ['Produce', 'Dairy'];

    storage.saveOrder(order);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: SECTION_ORDER_DOC_PATH }),
      { order }
    );
  });

  test('clearOrder persists null to Firestore in background', async () => {
    const storage = await createFreshStorage();
    storage.saveOrder(['Produce']);

    storage.clearOrder();

    expect(mockSetDoc).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: SECTION_ORDER_DOC_PATH }),
      { order: null }
    );
  });

  test('loadOrder returns a copy, not the cached reference', async () => {
    const storage = await createFreshStorage();
    const order = ['Produce', 'Dairy'];
    storage.saveOrder(order);

    const result1 = storage.loadOrder();
    const result2 = storage.loadOrder();

    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
  });
});

// --- onChange callback and echo detection tests ---

const createFreshStorageWithOnChange = async (onChange?: () => void) => {
  const { createFirestoreSectionOrderStorage } = require('./firestore-section-order-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreSectionOrderStorage(mockDb, TEST_UID, { onChange });
  await storage.initialize();
  return storage as SectionOrderStorage & { initialize: () => Promise<void>; unsubscribe: () => void };
};

describe('firestore section order storage onChange callback', () => {
  test('calls onChange when remote snapshot contains different order', async () => {
    mockStore[SECTION_ORDER_DOC_PATH] = { order: ['Dairy', 'Produce', 'Bakery'] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);
    expect(storage.loadOrder()).toEqual(['Dairy', 'Produce', 'Bakery']);

    // Simulate remote reorder
    simulateRemoteSnapshot(SECTION_ORDER_DOC_PATH, { order: ['Produce', 'Dairy', 'Bakery'] });

    expect(onChangeCallCount).toBe(1);
    expect(storage.loadOrder()).toEqual(['Produce', 'Dairy', 'Bakery']);
  });

  test('does NOT call onChange when snapshot echoes current cache (own-write detection)', async () => {
    mockStore[SECTION_ORDER_DOC_PATH] = { order: ['Dairy', 'Produce'] };

    let onChangeCallCount = 0;
    const onChange = () => { onChangeCallCount++; };

    const storage = await createFreshStorageWithOnChange(onChange);

    // Save locally (updates cache)
    storage.saveOrder(['Dairy', 'Produce', 'Bakery']);

    // Simulate snapshot echo with identical data
    simulateRemoteSnapshot(SECTION_ORDER_DOC_PATH, { order: ['Dairy', 'Produce', 'Bakery'] });

    expect(onChangeCallCount).toBe(0);
  });

  test('returns unsubscribe function that stops the listener', async () => {
    mockStore[SECTION_ORDER_DOC_PATH] = { order: null };

    const storage = await createFreshStorageWithOnChange(() => {});
    storage.unsubscribe();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('works without onChange callback (backward compatible)', async () => {
    mockStore[SECTION_ORDER_DOC_PATH] = { order: ['Dairy'] };

    const storage = await createFreshStorageWithOnChange();
    expect(storage.loadOrder()).toEqual(['Dairy']);

    simulateRemoteSnapshot(SECTION_ORDER_DOC_PATH, { order: ['Dairy', 'Produce'] });

    expect(storage.loadOrder()).toEqual(['Dairy', 'Produce']);
  });
});
