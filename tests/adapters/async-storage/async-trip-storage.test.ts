// Tests for AsyncStorage-backed TripStorage adapter with cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncTripStorage } from '../../../src/adapters/async-storage/async-trip-storage';
import { Trip } from '../../../src/domain/types';

const TRIP_KEY = '@grocery/active_trip';
const CHECKOFFS_KEY = '@grocery/trip_checkoffs';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  items: [
    {
      id: 'item-1',
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 1 },
      itemType: 'staple',
      stapleId: 'staple-1',
      source: 'preloaded',
      needed: true,
      checked: false,
      checkedAt: null,
    },
  ],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('createAsyncTripStorage', () => {
  describe('initialize', () => {
    it('loads trip from AsyncStorage into cache', async () => {
      const trip = makeTrip();
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === TRIP_KEY) return Promise.resolve(JSON.stringify(trip));
        return Promise.resolve(null);
      });

      const storage = createAsyncTripStorage();
      await storage.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(TRIP_KEY);
      expect(storage.loadTrip()).toEqual(trip);
    });

    it('starts with null trip when AsyncStorage is empty', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      expect(storage.loadTrip()).toBeNull();
    });

    it('starts with null trip when AsyncStorage has invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === TRIP_KEY) return Promise.resolve('bad-json');
        return Promise.resolve(null);
      });

      const storage = createAsyncTripStorage();
      await storage.initialize();

      expect(storage.loadTrip()).toBeNull();
    });
  });

  describe('loadTrip', () => {
    it('returns null before initialization', () => {
      const storage = createAsyncTripStorage();
      expect(storage.loadTrip()).toBeNull();
    });
  });

  describe('saveTrip', () => {
    it('updates cache immediately', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      const trip = makeTrip();
      storage.saveTrip(trip);

      expect(storage.loadTrip()).toEqual(trip);
    });

    it('persists to AsyncStorage in background', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      const trip = makeTrip();
      storage.saveTrip(trip);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        TRIP_KEY,
        JSON.stringify(trip)
      );
    });

    it('overwrites previous cached trip', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      const trip1 = makeTrip({ id: 'trip-1' });
      const trip2 = makeTrip({ id: 'trip-2' });

      storage.saveTrip(trip1);
      storage.saveTrip(trip2);

      expect(storage.loadTrip()).toEqual(trip2);
    });
  });

  describe('loadCheckoffs', () => {
    it('loads checkoffs from AsyncStorage into cache', async () => {
      const checkoffs = { 'item-1': '2026-01-01T00:00:00.000Z' };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === CHECKOFFS_KEY) return Promise.resolve(JSON.stringify(checkoffs));
        return Promise.resolve(null);
      });

      const storage = createAsyncTripStorage();
      await storage.initialize();

      const result = storage.loadCheckoffs();
      expect(result).toEqual(new Map([['item-1', '2026-01-01T00:00:00.000Z']]));
    });

    it('returns empty map when no checkoffs stored', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      expect(storage.loadCheckoffs()).toEqual(new Map());
    });
  });

  describe('saveCheckoffs', () => {
    it('updates cache and persists in background', async () => {
      const storage = createAsyncTripStorage();
      await storage.initialize();

      const checkoffs = new Map([['item-1', '2026-01-01T00:00:00.000Z']]);
      storage.saveCheckoffs(checkoffs);

      expect(storage.loadCheckoffs()).toEqual(checkoffs);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        CHECKOFFS_KEY,
        JSON.stringify({ 'item-1': '2026-01-01T00:00:00.000Z' })
      );
    });
  });
});
