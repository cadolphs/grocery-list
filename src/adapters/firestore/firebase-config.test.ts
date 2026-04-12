const mockApp = { name: '[DEFAULT]' };
const mockAuthInstance = { type: 'auth-instance' };
const mockDbInstance = { type: 'firestore-instance' };
const mockCache = { kind: 'persistent-local-cache' };

const mockInitializeApp = jest.fn(() => mockApp);
const mockGetApps = jest.fn(() => [] as any[]);
const mockGetAuth = jest.fn(() => mockAuthInstance);
const mockInitializeFirestore = jest.fn(() => mockDbInstance);
const mockPersistentLocalCache = jest.fn(() => mockCache);

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}));

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  initializeFirestore: mockInitializeFirestore,
  persistentLocalCache: mockPersistentLocalCache,
}));

const requireFreshConfig = () => {
  let config: any;
  jest.isolateModules(() => {
    config = require('./firebase-config');
  });
  return config as typeof import('./firebase-config');
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetApps.mockReturnValue([]);
});

describe('firebase config', () => {
  test('exports valid firestore and auth instances', () => {
    const { getFirebaseApp, getFirebaseAuth, getFirebaseDb } =
      requireFreshConfig();

    expect(getFirebaseApp()).toBeDefined();
    expect(getFirebaseAuth()).toBeDefined();
    expect(getFirebaseDb()).toBeDefined();
  });

  test('calling accessors twice returns the same instance (singleton)', () => {
    const { getFirebaseApp, getFirebaseAuth, getFirebaseDb } =
      requireFreshConfig();

    expect(getFirebaseApp()).toBe(getFirebaseApp());
    expect(getFirebaseAuth()).toBe(getFirebaseAuth());
    expect(getFirebaseDb()).toBe(getFirebaseDb());
  });

  test('reuses existing firebase app when already initialized', () => {
    const existingApp = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([existingApp]);

    const { getFirebaseApp } = requireFreshConfig();

    const app = getFirebaseApp();

    expect(app).toBe(existingApp);
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  test('initializes firestore with offline persistence and long polling', () => {
    const { getFirebaseDb } = requireFreshConfig();

    getFirebaseDb();

    expect(mockInitializeFirestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimentalForceLongPolling: true,
        localCache: mockCache,
      })
    );
  });
});
