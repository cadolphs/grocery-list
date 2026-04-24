// AsyncStorage area storage port-contract tests for subscribe.
// The AsyncStorage adapter has no remote change source; subscribe is a safe no-op
// that returns a callable unsubscribe. Adapter must never crash regardless of
// whether a listener is registered.

import { createAsyncAreaStorage } from './async-area-storage';

// Minimal in-memory AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string | null> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
    },
  };
});

describe('async area storage subscribe contract (no-op)', () => {
  test('subscribe returns an unsubscribe function', async () => {
    const storage = createAsyncAreaStorage();
    await storage.initialize();

    const unsubscribe = storage.subscribe(() => {});

    expect(typeof unsubscribe).toBe('function');
  });

  test('unsubscribe can be invoked without throwing', async () => {
    const storage = createAsyncAreaStorage();
    await storage.initialize();

    const unsubscribe = storage.subscribe(() => {});

    expect(() => unsubscribe()).not.toThrow();
  });

  test('saveAll does not crash when a listener is subscribed', async () => {
    const storage = createAsyncAreaStorage();
    await storage.initialize();

    storage.subscribe(() => {});

    expect(() => storage.saveAll(['Kitchen', 'Bathroom'])).not.toThrow();
  });

  test('saveAll does not crash when no listener is subscribed', async () => {
    const storage = createAsyncAreaStorage();
    await storage.initialize();

    expect(() => storage.saveAll(['Kitchen', 'Bathroom'])).not.toThrow();
  });

  test('multiple subscribe / unsubscribe calls are safe', async () => {
    const storage = createAsyncAreaStorage();
    await storage.initialize();

    const u1 = storage.subscribe(() => {});
    const u2 = storage.subscribe(() => {});

    expect(() => u1()).not.toThrow();
    expect(() => u2()).not.toThrow();
    // Double unsubscribe should also be safe (idempotent)
    expect(() => u1()).not.toThrow();
  });
});
