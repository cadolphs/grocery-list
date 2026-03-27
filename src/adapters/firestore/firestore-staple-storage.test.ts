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

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...(args as [{ path: string }])),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [{ path: string }, unknown])),
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
