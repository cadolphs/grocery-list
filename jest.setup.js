jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase - we use nullable AuthService wrapper instead
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(() => ({})),
  persistentLocalCache: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
