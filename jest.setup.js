jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { frame, insets },
  };
});

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

// Production wraps the app root in GestureHandlerRootView (App.tsx); a sweep
// row's GestureDetector throws outside one. Every render gets the same root,
// so tests that render a screen directly match the app (ADR-014).
jest.mock('@testing-library/react-native', () => {
  const React = require('react');
  const actual = jest.requireActual('@testing-library/react-native');
  const { GestureHandlerRootView } = require('react-native-gesture-handler');
  const withGestureRoot =
    (Inner) =>
    ({ children }) =>
      React.createElement(
        GestureHandlerRootView,
        null,
        Inner ? React.createElement(Inner, null, children) : children,
      );
  const render = (ui, options = {}) =>
    actual.render(ui, {
      ...options,
      wrapper: withGestureRoot(options.wrapper),
    });
  // A proxy, not a spread: `screen` is a live getter set by each render.
  return new Proxy(actual, {
    get: (target, key) => (key === 'render' ? render : target[key]),
  });
});
