import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

// --- Firestore mock infrastructure ---

type MockDocData = Record<string, unknown> | undefined;
const mockStore: Record<string, MockDocData> = {};

const mockDoc = jest.fn((_db: unknown, ...pathSegments: string[]) => ({
  path: pathSegments.join('/'),
}));

const mockSetDoc = jest.fn(async (docRef: { path: string }, data: unknown) => {
  mockStore[docRef.path] = data as MockDocData;
});

type SnapshotCallback = (snapshot: {
  exists: () => boolean;
  data: () => MockDocData;
}) => void;
const capturedCallbacks: Record<string, SnapshotCallback> = {};
const mockUnsubscribes: Record<string, jest.Mock> = {};

const mockOnSnapshot = jest.fn(
  (docRef: { path: string }, callback: SnapshotCallback) => {
    const data = mockStore[docRef.path];
    callback({
      exists: () => data !== undefined,
      data: () => data,
    });
    capturedCallbacks[docRef.path] = callback;
    const unsub = jest.fn();
    mockUnsubscribes[docRef.path] = unsub;
    return unsub;
  },
);

const simulateRemoteSnapshot = (path: string, data: MockDocData) => {
  mockStore[path] = data;
  if (capturedCallbacks[path]) {
    capturedCallbacks[path]({
      exists: () => data !== undefined,
      data: () => data,
    });
  }
};

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
}));

// --- Test helpers ---

const TEST_UID = 'user-trip-123';
const TRIP_DOC_PATH = `users/${TEST_UID}/data/trip`;
const CARRYOVER_DOC_PATH = `users/${TEST_UID}/data/carryover`;

const makeTripItem = (overrides: Partial<TripItem> = {}): TripItem => ({
  id: 'trip-item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  decision: 'needed',
  checked: false,
  checkedAt: null,
  ...overrides,
});

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  items: [makeTripItem()],
  status: 'active',
  createdAt: '2026-04-10T10:00:00.000Z',
  ...overrides,
});

const createFreshStorage = async (onChange?: () => void) => {
  const { createFirestoreTripStorage } = require('./firestore-trip-storage');
  const mockDb = { type: 'firestore' };
  const storage = createFirestoreTripStorage(mockDb, TEST_UID, { onChange });
  await storage.initialize();
  return storage as TripStorage & {
    initialize: () => Promise<void>;
    unsubscribe: () => void;
  };
};

beforeEach(async () => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  Object.keys(capturedCallbacks).forEach(
    (key) => delete capturedCallbacks[key],
  );
  Object.keys(mockUnsubscribes).forEach((key) => delete mockUnsubscribes[key]);
  // Clear AsyncStorage mirror between tests — the adapter now writes through
  // to AsyncStorage, and the global mock persists across tests by default.
  await AsyncStorage.clear();
});

// --- Port compliance tests ---

describe('firestore trip storage implements TripStorage port', () => {
  test('round-trip: saveTrip then loadTrip returns the trip', async () => {
    const storage = await createFreshStorage();
    const trip = makeTrip();

    storage.saveTrip(trip);

    expect(storage.loadTrip()).toEqual(trip);
  });

  test('loadTrip returns null when no trip exists', async () => {
    const storage = await createFreshStorage();

    expect(storage.loadTrip()).toBeNull();
  });

  test('initialize loads trip from Firestore document', async () => {
    const trip = makeTrip();
    mockStore[TRIP_DOC_PATH] = { trip };

    const storage = await createFreshStorage();

    expect(storage.loadTrip()).toEqual(trip);
  });

  test('saveTrip persists to Firestore in background', async () => {
    const storage = await createFreshStorage();
    const trip = makeTrip();

    storage.saveTrip(trip);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: TRIP_DOC_PATH }),
      { trip, writtenAt: expect.any(Number) },
    );
  });

  test('updateItemArea renames area for matching items in trip', async () => {
    const trip = makeTrip({
      items: [
        makeTripItem({ id: 'item-1', name: 'Milk', houseArea: 'Kitchen' }),
        makeTripItem({ id: 'item-2', name: 'Soap', houseArea: 'Bathroom' }),
        makeTripItem({ id: 'item-3', name: 'Bread', houseArea: 'Kitchen' }),
      ],
    });
    mockStore[TRIP_DOC_PATH] = { trip };

    const storage = await createFreshStorage();
    storage.updateItemArea('Kitchen', 'Cocina');

    const loaded = storage.loadTrip();
    expect(loaded!.items[0]!.houseArea).toBe('Cocina');
    expect(loaded!.items[1]!.houseArea).toBe('Bathroom');
    expect(loaded!.items[2]!.houseArea).toBe('Cocina');
  });

  test('saveCarryover persists carryover items to Firestore', async () => {
    const storage = await createFreshStorage();
    const items = [makeTripItem({ name: 'Olive Oil' })];

    storage.saveCarryover(items);

    expect(storage.loadCarryover()).toEqual(items);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: CARRYOVER_DOC_PATH }),
      { items, writtenAt: expect.any(Number) },
    );
  });

  test('loadCarryover returns empty array when no carryover exists', async () => {
    const storage = await createFreshStorage();

    expect(storage.loadCarryover()).toEqual([]);
  });

  test('initialize loads carryover from Firestore document', async () => {
    const items = [makeTripItem({ name: 'Olive Oil' })];
    mockStore[CARRYOVER_DOC_PATH] = { items };

    const storage = await createFreshStorage();

    expect(storage.loadCarryover()).toEqual(items);
  });

  test('clearCarryover removes carryover from cache and persists empty', async () => {
    const items = [makeTripItem({ name: 'Olive Oil' })];
    mockStore[CARRYOVER_DOC_PATH] = { items };

    const storage = await createFreshStorage();
    expect(storage.loadCarryover()).toHaveLength(1);

    storage.clearCarryover();

    expect(storage.loadCarryover()).toEqual([]);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: CARRYOVER_DOC_PATH }),
      { items: [], writtenAt: expect.any(Number) },
    );
  });
});

// --- onChange callback and echo detection tests ---

describe('firestore trip storage onChange callback', () => {
  test('calls onChange when remote snapshot contains different trip data', async () => {
    const trip = makeTrip();
    mockStore[TRIP_DOC_PATH] = { trip };

    let onChangeCallCount = 0;
    const onChange = () => {
      onChangeCallCount++;
    };

    const storage = await createFreshStorage(onChange);
    expect(storage.loadTrip()).toEqual(trip);

    // Simulate remote checkoff of "Milk"
    const updatedTrip = makeTrip({
      items: [
        makeTripItem({ checked: true, checkedAt: '2026-04-10T11:00:00.000Z' }),
      ],
    });
    simulateRemoteSnapshot(TRIP_DOC_PATH, { trip: updatedTrip });

    expect(onChangeCallCount).toBe(1);
    expect(storage.loadTrip()!.items[0]!.checked).toBe(true);
  });

  test('does NOT call onChange when snapshot echoes current cache (own-write detection)', async () => {
    mockStore[TRIP_DOC_PATH] = undefined;

    let onChangeCallCount = 0;
    const onChange = () => {
      onChangeCallCount++;
    };

    const storage = await createFreshStorage(onChange);

    // Save trip locally (updates cache)
    const trip = makeTrip();
    storage.saveTrip(trip);

    // Simulate snapshot echo with identical data
    simulateRemoteSnapshot(TRIP_DOC_PATH, { trip });

    expect(onChangeCallCount).toBe(0);
  });

  test('a post-write absent echo does not null a trip hydrated from the mirror', async () => {
    // Seed the mirror through a previous session, then drop the remote doc so
    // the next cold start hydrates from the mirror with an absent snapshot.
    const previousSession = await createFreshStorage();
    previousSession.saveTrip(makeTrip());
    delete mockStore[TRIP_DOC_PATH];

    const onChange = jest.fn();
    const storage = await createFreshStorage(onChange);

    const editedTrip = makeTrip({
      items: [
        makeTripItem({ checked: true, checkedAt: '2026-04-10T11:00:00.000Z' }),
      ],
    });
    storage.saveTrip(editedTrip);

    // A local write is no evidence about server state: an absent snapshot
    // arriving after the edit must not clobber the cache.
    simulateRemoteSnapshot(TRIP_DOC_PATH, undefined);

    expect(storage.loadTrip()).toEqual(editedTrip);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('unsubscribe stops all listeners', async () => {
    mockStore[TRIP_DOC_PATH] = undefined;
    mockStore[CARRYOVER_DOC_PATH] = undefined;

    const storage = await createFreshStorage();
    storage.unsubscribe();

    // Both trip and carryover listeners should be unsubscribed
    expect(mockUnsubscribes[TRIP_DOC_PATH]).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribes[CARRYOVER_DOC_PATH]).toHaveBeenCalledTimes(1);
  });

  test('works without onChange callback (backward compatible)', async () => {
    const trip = makeTrip();
    mockStore[TRIP_DOC_PATH] = { trip };

    const storage = await createFreshStorage();
    expect(storage.loadTrip()).toEqual(trip);

    // Simulate remote change -- should not throw even without onChange
    const updatedTrip = makeTrip({
      items: [
        makeTripItem({ checked: true, checkedAt: '2026-04-10T11:00:00.000Z' }),
      ],
    });
    simulateRemoteSnapshot(TRIP_DOC_PATH, { trip: updatedTrip });

    expect(storage.loadTrip()!.items[0]!.checked).toBe(true);
  });
});

// ADR-013 expand (#92): trips saved before the sweep decision existed carry
// only the needed flag, on the server and in the local mirror alike. They read
// as Needed (true) or Not needed (false); saved decisions read back unchanged.
describe('firestore trip storage sweep decision', () => {
  const legacyItem = (name: string, needed: boolean) => {
    const { decision: _decision, ...item } = makeTripItem({ name });
    return { ...item, id: `item-${name}`, needed };
  };

  const legacyItems = () => [
    legacyItem('Milk', true),
    legacyItem('Eggs', false),
  ];

  const expectedDecisions = [
    { name: 'Milk', needed: true, decision: 'needed' },
    { name: 'Eggs', needed: false, decision: 'not-needed' },
  ];

  const decisionsOf = (items: readonly TripItem[]) =>
    items.map(({ name, needed, decision }) => ({ name, needed, decision }));

  const seedMirror = async (doc: 'trip' | 'carryover', value: unknown) => {
    await AsyncStorage.setItem(
      `firestore-cache:v2:${TEST_UID}:${doc}`,
      JSON.stringify({ value, writtenAt: 1 }),
    );
  };

  test('reads a legacy trip from the server by its needed flag', async () => {
    mockStore[TRIP_DOC_PATH] = {
      trip: { ...makeTrip(), items: legacyItems() },
    };

    const storage = await createFreshStorage();

    expect(decisionsOf(storage.loadTrip()!.items)).toEqual(expectedDecisions);
  });

  test('reads a legacy trip arriving in a later snapshot by its needed flag', async () => {
    const storage = await createFreshStorage();

    simulateRemoteSnapshot(TRIP_DOC_PATH, {
      trip: { ...makeTrip(), items: legacyItems() },
    });

    expect(decisionsOf(storage.loadTrip()!.items)).toEqual(expectedDecisions);
  });

  test('reads legacy carryover from the server by its needed flag', async () => {
    mockStore[CARRYOVER_DOC_PATH] = { items: legacyItems() };

    const storage = await createFreshStorage();

    expect(decisionsOf(storage.loadCarryover())).toEqual(expectedDecisions);
  });

  test('reads a legacy trip and carryover from the local mirror by their needed flag', async () => {
    await seedMirror('trip', { ...makeTrip(), items: legacyItems() });
    await seedMirror('carryover', legacyItems());

    const storage = await createFreshStorage();

    expect(decisionsOf(storage.loadTrip()!.items)).toEqual(expectedDecisions);
    expect(decisionsOf(storage.loadCarryover())).toEqual(expectedDecisions);
  });

  // Before #92 the server trip was cached as-is; reading it must not throw
  // inside the snapshot callback, or initialize() never resolves.
  test('a server trip without an item list reads as no trip', async () => {
    mockStore[TRIP_DOC_PATH] = { trip: {} };

    const storage = await createFreshStorage();

    expect(storage.loadTrip()).toBeNull();
  });

  // #95: area completion is derived from decisions; a stored completed-areas
  // set is dropped on read and never written back.
  test('a legacy completed-areas set is dropped on read and not written back', async () => {
    mockStore[TRIP_DOC_PATH] = {
      trip: { ...makeTrip(), completedAreas: ['Fridge'] },
    };
    await seedMirror('trip', { ...makeTrip(), completedAreas: ['Fridge'] });
    const storage = await createFreshStorage();
    const loaded = storage.loadTrip();

    storage.updateItemArea('Fridge', 'Cold Storage');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loaded).not.toHaveProperty('completedAreas');
    expect(mockStore[TRIP_DOC_PATH]!.trip).not.toHaveProperty('completedAreas');
  });

  test('a saved decision reads back unchanged in the next session', async () => {
    const trip = makeTrip({
      items: [makeTripItem({ needed: false, decision: 'undecided' })],
    });
    const carryover = [makeTripItem({ id: 'carried', source: 'carryover' })];
    const previousSession = await createFreshStorage();
    previousSession.saveTrip(trip);
    previousSession.saveCarryover(carryover);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const storage = await createFreshStorage();

    expect(storage.loadTrip()).toEqual(trip);
    expect(storage.loadCarryover()).toEqual(carryover);
  });
});
