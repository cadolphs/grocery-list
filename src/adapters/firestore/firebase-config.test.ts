const mockApp = { name: "[DEFAULT]" };
const mockAuthInstance = { type: "auth-instance" };
const mockDbInstance = { type: "firestore-instance" };
const mockCache = { kind: "persistent-local-cache" };
const mockReactNativePersistence = { type: "rn-persistence" };
const mockAsyncStorage = { type: "async-storage" };

const mockInitializeApp = jest.fn(() => mockApp);
const mockGetApps = jest.fn(() => [] as any[]);
const mockGetAuth = jest.fn(() => mockAuthInstance);
const mockInitializeAuth = jest.fn(() => mockAuthInstance);
const mockGetReactNativePersistence = jest.fn(() => mockReactNativePersistence);
const mockInitializeFirestore = jest.fn(() => mockDbInstance);
const mockPersistentLocalCache = jest.fn(() => mockCache);

jest.mock("firebase/app", () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}));

jest.mock("firebase/auth", () => ({
  getAuth: mockGetAuth,
  initializeAuth: mockInitializeAuth,
  getReactNativePersistence: mockGetReactNativePersistence,
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  initializeFirestore: mockInitializeFirestore,
  persistentLocalCache: mockPersistentLocalCache,
}));

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

let mockPlatformOS = "ios";
jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
  },
}));

const requireFreshConfig = () => {
  let config: any;
  jest.isolateModules(() => {
    config = require("./firebase-config");
  });
  return config as typeof import("./firebase-config");
};

const requireFreshConfigWithPlatform = (platform: string) => {
  mockPlatformOS = platform;
  return requireFreshConfig();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetApps.mockReturnValue([]);
});

describe("firebase config", () => {
  test("exports valid firestore and auth instances", () => {
    const { getFirebaseApp, getFirebaseAuth, getFirebaseDb } =
      requireFreshConfig();

    expect(getFirebaseApp()).toBeDefined();
    expect(getFirebaseAuth()).toBeDefined();
    expect(getFirebaseDb()).toBeDefined();
  });

  test("calling accessors twice returns the same instance (singleton)", () => {
    const { getFirebaseApp, getFirebaseAuth, getFirebaseDb } =
      requireFreshConfig();

    expect(getFirebaseApp()).toBe(getFirebaseApp());
    expect(getFirebaseAuth()).toBe(getFirebaseAuth());
    expect(getFirebaseDb()).toBe(getFirebaseDb());
  });

  test("reuses existing firebase app when already initialized", () => {
    const existingApp = { name: "[DEFAULT]" };
    mockGetApps.mockReturnValue([existingApp]);

    const { getFirebaseApp } = requireFreshConfig();

    const app = getFirebaseApp();

    expect(app).toBe(existingApp);
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  test("initializes firestore with long polling", () => {
    const { getFirebaseDb } = requireFreshConfig();

    getFirebaseDb();

    expect(mockInitializeFirestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        experimentalForceLongPolling: true,
      }),
    );
  });
});

describe("platform-specific initialization", () => {
  describe("on native platform (android)", () => {
    test("uses initializeAuth with AsyncStorage persistence", () => {
      const { getFirebaseAuth } = requireFreshConfigWithPlatform("android");

      getFirebaseAuth();

      expect(mockInitializeAuth).toHaveBeenCalledWith(expect.anything(), {
        persistence: mockReactNativePersistence,
      });
      expect(mockGetReactNativePersistence).toHaveBeenCalledWith(
        mockAsyncStorage,
      );
      expect(mockGetAuth).not.toHaveBeenCalled();
    });

    test("initializes Firestore without persistentLocalCache", () => {
      const { getFirebaseDb } = requireFreshConfigWithPlatform("android");

      getFirebaseDb();

      expect(mockInitializeFirestore).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          experimentalForceLongPolling: true,
        }),
      );

      const firestoreConfig = (mockInitializeFirestore.mock.calls as any)[0][1];
      expect(firestoreConfig).not.toHaveProperty("localCache");
    });
  });

  describe("on web platform", () => {
    test("uses getAuth for authentication", () => {
      const { getFirebaseAuth } = requireFreshConfigWithPlatform("web");

      getFirebaseAuth();

      expect(mockGetAuth).toHaveBeenCalled();
      expect(mockInitializeAuth).not.toHaveBeenCalled();
    });

    test("initializes Firestore with persistentLocalCache", () => {
      const { getFirebaseDb } = requireFreshConfigWithPlatform("web");

      getFirebaseDb();

      expect(mockInitializeFirestore).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          experimentalForceLongPolling: true,
          localCache: mockCache,
        }),
      );
    });
  });
});
