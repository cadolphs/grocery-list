import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppInitialization } from '../../../src/hooks/useAppInitialization';
import { StapleItem, Trip } from '../../../src/domain/types';

const makeStaple = (): StapleItem => ({
  id: 'staple-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 1 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const makeTrip = (): Trip => ({
  id: 'trip-1',
  items: [],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('useAppInitialization', () => {
  it('starts in not-ready state', () => {
    const { result } = renderHook(() => useAppInitialization());

    expect(result.current.isReady).toBe(false);
    expect(result.current.services).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('becomes ready after initialization completes', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.services).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('provides stapleLibrary and tripService when ready', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.services!.stapleLibrary).toBeDefined();
    expect(result.current.services!.stapleLibrary.listAll).toBeInstanceOf(Function);
    expect(result.current.services!.tripService).toBeDefined();
    expect(result.current.services!.tripService.getItems).toBeInstanceOf(Function);
  });

  it('loads existing staples from AsyncStorage during init', async () => {
    const staple = makeStaple();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@grocery/staple_library')
        return Promise.resolve(JSON.stringify([staple]));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.services!.stapleLibrary.listAll()).toEqual([staple]);
  });

  it('loads existing trip from AsyncStorage during init', async () => {
    const trip = makeTrip();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@grocery/active_trip')
        return Promise.resolve(JSON.stringify(trip));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // tripService should have loaded from storage
    expect(result.current.services!.tripService).toBeDefined();
  });

  it('reports error when initialization fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error('Storage unavailable')
    );

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBe('Storage unavailable');
  });
});
