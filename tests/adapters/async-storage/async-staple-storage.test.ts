// Tests for AsyncStorage-backed StapleStorage adapter with cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStapleStorage } from '../../../src/adapters/async-storage/async-staple-storage';
import { StapleItem } from '../../../src/domain/types';

const STORAGE_KEY = '@grocery/staple_library';

const makeStaple = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'staple-1',
  name: 'Paper Towels',
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section: 'Paper Goods', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage.clear as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('createAsyncStapleStorage', () => {
  describe('initialize', () => {
    it('loads items from AsyncStorage into cache', async () => {
      const items = [makeStaple()];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(storage.loadAll()).toEqual(items);
    });

    it('starts with empty cache when AsyncStorage has no data', async () => {
      const storage = createAsyncStapleStorage();
      await storage.initialize();

      expect(storage.loadAll()).toEqual([]);
    });

    it('starts with empty cache when AsyncStorage has invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      expect(storage.loadAll()).toEqual([]);
    });
  });

  describe('loadAll', () => {
    it('returns a defensive copy of cached items', async () => {
      const items = [makeStaple()];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      const result1 = storage.loadAll();
      const result2 = storage.loadAll();
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('save', () => {
    it('adds item to cache immediately', async () => {
      const storage = createAsyncStapleStorage();
      await storage.initialize();

      const item = makeStaple();
      storage.save(item);

      expect(storage.loadAll()).toEqual([item]);
    });

    it('persists to AsyncStorage in background', async () => {
      const storage = createAsyncStapleStorage();
      await storage.initialize();

      const item = makeStaple();
      storage.save(item);

      // Allow microtask to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([item])
      );
    });
  });

  describe('remove', () => {
    it('removes item from cache immediately', async () => {
      const item = makeStaple();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([item]));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      storage.remove(item.id);

      expect(storage.loadAll()).toEqual([]);
    });

    it('persists removal to AsyncStorage in background', async () => {
      const item = makeStaple();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([item]));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      storage.remove(item.id);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([])
      );
    });

    it('does nothing when removing non-existent id', async () => {
      const item = makeStaple();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([item]));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      storage.remove('non-existent');

      expect(storage.loadAll()).toEqual([item]);
    });
  });

  describe('search', () => {
    it('filters cache case-insensitively', async () => {
      const towels = makeStaple({ id: '1', name: 'Paper Towels' });
      const plates = makeStaple({ id: '2', name: 'Paper Plates' });
      const milk = makeStaple({ id: '3', name: 'Milk' });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([towels, plates, milk])
      );

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      expect(storage.search('paper')).toEqual([towels, plates]);
      expect(storage.search('PAPER')).toEqual([towels, plates]);
    });

    it('returns empty array for blank query', async () => {
      const item = makeStaple();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([item]));

      const storage = createAsyncStapleStorage();
      await storage.initialize();

      expect(storage.search('')).toEqual([]);
      expect(storage.search('   ')).toEqual([]);
    });
  });
});
