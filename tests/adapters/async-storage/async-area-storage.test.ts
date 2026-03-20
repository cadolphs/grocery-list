// Tests for AsyncStorage-backed AreaStorage adapter with cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncAreaStorage } from '../../../src/adapters/async-storage/async-area-storage';

const STORAGE_KEY = '@grocery/house_areas';

const DEFAULT_AREAS = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

beforeEach(() => {
  (AsyncStorage.clear as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('createAsyncAreaStorage', () => {
  describe('initialize', () => {
    it('loads areas from AsyncStorage into cache', async () => {
      const areas = ['Kitchen', 'Bathroom', 'Garage'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(areas));

      const storage = createAsyncAreaStorage();
      await storage.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(storage.loadAll()).toEqual(areas);
    });

    it('seeds default areas on fresh install when AsyncStorage is empty', async () => {
      const storage = createAsyncAreaStorage();
      await storage.initialize();

      expect(storage.loadAll()).toEqual(DEFAULT_AREAS);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_AREAS)
      );
    });

    it('handles invalid JSON by seeding defaults', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');

      const storage = createAsyncAreaStorage();
      await storage.initialize();

      expect(storage.loadAll()).toEqual(DEFAULT_AREAS);
    });
  });

  describe('loadAll', () => {
    it('returns a defensive copy of cached areas', async () => {
      const areas = ['Kitchen', 'Bathroom'];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(areas));

      const storage = createAsyncAreaStorage();
      await storage.initialize();

      const result1 = storage.loadAll();
      const result2 = storage.loadAll();
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('saveAll', () => {
    it('updates cache immediately', async () => {
      const storage = createAsyncAreaStorage();
      await storage.initialize();

      const newAreas = ['Kitchen', 'Bedroom'];
      storage.saveAll(newAreas);

      expect(storage.loadAll()).toEqual(newAreas);
    });

    it('persists to AsyncStorage in background', async () => {
      const storage = createAsyncAreaStorage();
      await storage.initialize();

      // Clear the setItem mock from initialize seeding
      (AsyncStorage.setItem as jest.Mock).mockClear();

      const newAreas = ['Kitchen', 'Bedroom'];
      storage.saveAll(newAreas);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(newAreas)
      );
    });
  });
});
