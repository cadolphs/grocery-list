// useAppInitialization - creates adapters, initializes caches, wires services
// Returns { isReady, services, error } for App.tsx to gate rendering

import { useState, useEffect } from 'react';
import { createAsyncStapleStorage } from '../adapters/async-storage/async-staple-storage';
import { createAsyncTripStorage } from '../adapters/async-storage/async-trip-storage';
import { createAsyncAreaStorage } from '../adapters/async-storage/async-area-storage';
import { createAsyncSectionOrderStorage } from '../adapters/async-storage/async-section-order-storage';
import { createStapleLibrary, StapleLibrary } from '../domain/staple-library';
import { createTrip, TripService } from '../domain/trip';
import { createAreaManagement, AreaManagement } from '../domain/area-management';
import { SectionOrderStorage } from '../ports/section-order-storage';

export type AppServices = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
  readonly areaManagement: AreaManagement;
  readonly sectionOrderStorage: SectionOrderStorage;
};

export type AppInitializationResult = {
  readonly isReady: boolean;
  readonly services: AppServices | null;
  readonly error: string | null;
};

const initializeApp = async (): Promise<AppServices> => {
  const stapleStorage = createAsyncStapleStorage();
  const tripStorage = createAsyncTripStorage();
  const areaStorage = createAsyncAreaStorage();
  const sectionOrderStorage = createAsyncSectionOrderStorage();

  await Promise.all([
    stapleStorage.initialize(),
    tripStorage.initialize(),
    areaStorage.initialize(),
    sectionOrderStorage.initialize(),
  ]);

  const stapleLibrary = createStapleLibrary(stapleStorage);
  const areas = areaStorage.loadAll();
  const tripService = createTrip(tripStorage, areas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  tripService.initializeFromStorage(stapleLibrary.listAll());

  return { stapleLibrary, tripService, areaManagement, sectionOrderStorage };
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
