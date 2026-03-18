// useAppInitialization - creates adapters, initializes caches, wires services
// Returns { isReady, services, error } for App.tsx to gate rendering

import { useState, useEffect } from 'react';
import { createAsyncStapleStorage } from '../adapters/async-storage/async-staple-storage';
import { createAsyncTripStorage } from '../adapters/async-storage/async-trip-storage';
import { createStapleLibrary, StapleLibrary } from '../domain/staple-library';
import { createTrip, TripService } from '../domain/trip';

export type AppServices = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
};

export type AppInitializationResult = {
  readonly isReady: boolean;
  readonly services: AppServices | null;
  readonly error: string | null;
};

const initializeApp = async (): Promise<AppServices> => {
  const stapleStorage = createAsyncStapleStorage();
  const tripStorage = createAsyncTripStorage();

  await Promise.all([
    stapleStorage.initialize(),
    tripStorage.initialize(),
  ]);

  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripService = createTrip(tripStorage);

  tripService.loadFromStorage();

  return { stapleLibrary, tripService };
};

export const useAppInitialization = (): AppInitializationResult => {
  const [isReady, setIsReady] = useState(false);
  const [services, setServices] = useState<AppServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    initializeApp()
      .then((result) => {
        if (!cancelled) {
          setServices(result);
          setIsReady(true);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, services, error };
};
