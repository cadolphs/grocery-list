// Shared Firestore mock for the offline cold-start regression harnesses.
//
// Models offline Firestore: setDoc never publishes to the backing store that
// future subscribers read (a process restart loses the queued write), and
// snapshot delivery is controllable so a test can express "edit, then a late
// snapshot" or "the first snapshot never arrives".
//
// The jest.mock call must stay in the test file so jest hoists it there:
//
//   jest.mock('firebase/firestore', () =>
//     require('./helpers/offline-firestore-harness').firestoreModule
//   );

export type MockDocData = Record<string, unknown> | undefined;

type SnapshotCallback = (snapshot: {
  exists: () => boolean;
  data: () => MockDocData;
}) => void;

// Snapshot delivery regimes, modelling the three real network conditions:
//   'immediate' — the server answers at once (airplane mode / healthy network)
//   'withheld'  — the callback is registered but never invoked (connected-but-dead
//                 wifi: Firestore withholds the initial event until it decides it
//                 is offline, which on flapping wifi can be unbounded)
//   'delayed'   — the callback is captured and the test decides when it fires
export type SnapshotMode = 'immediate' | 'withheld' | 'delayed';

const mockStore: Record<string, MockDocData> = {};
const capturedCallbacks: Record<string, SnapshotCallback> = {};
let snapshotMode: SnapshotMode = 'immediate';

const buildSnapshot = (data: MockDocData) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const mockDoc = jest.fn((_db: unknown, ...pathSegments: string[]) => ({
  path: pathSegments.join('/'),
}));

// Offline Firestore: the write is queued locally and never reaches the backing
// store that future subscribers read. A process restart loses it.
const mockSetDoc = jest.fn(async (_docRef: { path: string }, _data: unknown) => {});

export const mockOnSnapshot = jest.fn(
  (docRef: { path: string }, callback: SnapshotCallback) => {
    capturedCallbacks[docRef.path] = callback;
    if (snapshotMode === 'immediate') {
      callback(buildSnapshot(mockStore[docRef.path]));
    }
    return jest.fn();
  }
);

export const firestoreModule = {
  doc: mockDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
};

export const setSnapshotMode = (mode: SnapshotMode): void => {
  snapshotMode = mode;
};

// Deliver a snapshot to an already-registered subscriber.
export const deliverSnapshot = (path: string, data: MockDocData): void => {
  mockStore[path] = data;
  capturedCallbacks[path]?.(buildSnapshot(data));
};

// Remove a remote document so the next 'immediate' subscriber sees it absent.
export const forgetRemoteDoc = (path: string): void => {
  delete mockStore[path];
};

// Let queued microtasks (the AsyncStorage reads inside initialize) settle
// without awaiting initialize() itself — which, with no mirror entry under
// 'withheld'/'delayed', stays pending until the first snapshot is delivered.
export const settlePendingReads = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const resetOfflineFirestore = (): void => {
  snapshotMode = 'immediate';
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  Object.keys(capturedCallbacks).forEach((key) => delete capturedCallbacks[key]);
};
