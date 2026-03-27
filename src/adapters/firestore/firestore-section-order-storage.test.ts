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

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...(args as [{ path: string }])),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [{ path: string }, unknown])),
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
