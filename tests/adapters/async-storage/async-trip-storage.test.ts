// Tests for AsyncStorage-backed TripStorage adapter with cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncTripStorage } from '../../../src/adapters/async-storage/async-trip-storage';
import { Trip, TripItem } from '../../../src/domain/types';
import { toStoredTrip } from '../../../src/domain/stored-trip';

const TRIP_KEY = '@grocery/active_trip';

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
      decision: 'needed',
      inCart: false,
      inCartAt: null,
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
        JSON.stringify(toStoredTrip(trip)),
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
});

// ADR-013 expand (#92): a trip saved before the sweep decision existed has
// only the needed flag; it reads back as Needed (true) or Not needed (false).
describe('sweep decision', () => {
  const CARRYOVER_KEY = '@grocery/trip_carryover';

  const legacyItem = (name: string, needed: boolean) => {
    const { decision: _decision, ...item } = makeTrip().items[0]!;
    return { ...item, id: `item-${name}`, name, needed };
  };

  const storeRaw = (values: Record<string, unknown>) => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(key in values ? JSON.stringify(values[key]) : null),
    );
  };

  const decisionsOf = (items: readonly TripItem[]) =>
    items.map(({ name, decision }) => ({ name, decision }));

  it('reads a legacy trip as Needed or Not needed from its needed flag', async () => {
    storeRaw({
      [TRIP_KEY]: {
        ...makeTrip(),
        items: [legacyItem('Milk', true), legacyItem('Eggs', false)],
      },
    });

    const storage = createAsyncTripStorage();
    await storage.initialize();

    expect(decisionsOf(storage.loadTrip()!.items)).toEqual([
      { name: 'Milk', decision: 'needed' },
      { name: 'Eggs', decision: 'not-needed' },
    ]);
  });

  it('reads legacy carryover as Needed or Not needed from its needed flag', async () => {
    storeRaw({
      [CARRYOVER_KEY]: [legacyItem('Milk', true), legacyItem('Eggs', false)],
    });

    const storage = createAsyncTripStorage();
    await storage.initialize();

    expect(decisionsOf(storage.loadCarryover())).toEqual([
      { name: 'Milk', decision: 'needed' },
      { name: 'Eggs', decision: 'not-needed' },
    ]);
  });

  // #97: new writes carry only the decision, so a legacy item read and
  // written back loses its needed flag.
  it('writes a legacy trip back with only the decision', async () => {
    storeRaw({
      [TRIP_KEY]: {
        ...makeTrip(),
        items: [legacyItem('Milk', true), legacyItem('Eggs', false)],
      },
    });
    const storage = createAsyncTripStorage();
    await storage.initialize();

    storage.saveTrip(storage.loadTrip()!);

    const [, written] = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)!;
    const items: Record<string, unknown>[] = JSON.parse(written).items;
    expect(items.map((item) => item.decision)).toEqual([
      'needed',
      'not-needed',
    ]);
    items.forEach((item) => expect(item).not.toHaveProperty('needed'));
  });

  // #95: area completion is derived from decisions; a stored completed-areas
  // set is dropped on read and never written back.
  it('drops a legacy completed-areas set on read and does not write it back', async () => {
    storeRaw({ [TRIP_KEY]: { ...makeTrip(), completedAreas: ['Fridge'] } });
    const storage = createAsyncTripStorage();
    await storage.initialize();
    const loaded = storage.loadTrip();

    storage.updateItemArea('Fridge', 'Cold Storage');

    const [, written] = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)!;
    expect(loaded).not.toHaveProperty('completedAreas');
    expect(JSON.parse(written)).not.toHaveProperty('completedAreas');
  });

  // An app build from before the decision rewrites only needed, leaving the
  // decision it read stale; needed is the fact both builds agree on.
  it('reads a decision that disagrees with its needed flag from the needed flag', async () => {
    const item = makeTrip().items[0]!;
    storeRaw({
      [TRIP_KEY]: {
        ...makeTrip(),
        items: [
          { ...item, name: 'Milk', needed: false, decision: 'needed' },
          { ...item, name: 'Eggs', needed: true, decision: 'undecided' },
        ],
      },
    });

    const storage = createAsyncTripStorage();
    await storage.initialize();

    expect(decisionsOf(storage.loadTrip()!.items)).toEqual([
      { name: 'Milk', decision: 'not-needed' },
      { name: 'Eggs', decision: 'needed' },
    ]);
  });

  it('round-trips a saved decision unchanged through disk', async () => {
    const saved = makeTrip({
      items: [{ ...makeTrip().items[0]!, decision: 'undecided' }],
    });
    const writer = createAsyncTripStorage();
    await writer.initialize();
    writer.saveTrip(saved);
    const written = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
      ([key]) => key === TRIP_KEY,
    )![1];
    storeRaw({ [TRIP_KEY]: JSON.parse(written) });

    const reader = createAsyncTripStorage();
    await reader.initialize();

    expect(reader.loadTrip()).toEqual(saved);
  });
});
