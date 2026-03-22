// useTrip - hook bridging TripService to React state
// Reads items from context and exposes them as reactive state

import { useState, useCallback } from 'react';
import { TripItem, AddTripItemRequest, AddTripItemResult, HouseArea, StoreLocation } from '../domain/types';
import { SweepProgress } from '../domain/trip';
import { UpdateStapleChanges } from '../domain/staple-library';
import { useServices } from '../ui/ServiceProvider';

export type UseTripResult = {
  readonly items: TripItem[];
  readonly addItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly checkOff: (name: string) => void;
  readonly toggleCheckOff: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly unskipItem: (name: string) => void;
  readonly completeArea: (area: HouseArea) => void;
  readonly resetSweep: () => void;
  readonly syncStapleUpdate: (stapleId: string, changes: UpdateStapleChanges) => void;
  readonly sweepProgress: SweepProgress;
};

export const useTrip = (): UseTripResult => {
  const { tripService } = useServices();
  const [items, setItems] = useState<TripItem[]>(() => tripService.getItems());
  const [sweepProgress, setSweepProgress] = useState<SweepProgress>(() => tripService.getSweepProgress());

  const addItem = useCallback(
    (request: AddTripItemRequest): AddTripItemResult => {
      const result = tripService.addItem(request);
      if (result.success) {
        setItems(tripService.getItems());
      }
      return result;
    },
    [tripService]
  );

  const checkOff = useCallback(
    (name: string): void => {
      tripService.checkOff(name);
      setItems(tripService.getItems());
    },
    [tripService]
  );

  const toggleCheckOff = useCallback(
    (name: string): void => {
      const item = tripService.getItems().find((i) => i.name === name);
      if (item?.checked) {
        tripService.uncheckItem(name);
      } else {
        tripService.checkOff(name);
      }
      setItems(tripService.getItems());
    },
    [tripService]
  );

  const skipItem = useCallback(
    (name: string): void => {
      tripService.skipItem(name);
      setItems(tripService.getItems());
    },
    [tripService]
  );

  const unskipItem = useCallback(
    (name: string): void => {
      tripService.unskipItem(name);
      setItems(tripService.getItems());
    },
    [tripService]
  );

  const completeArea = useCallback(
    (area: HouseArea): void => {
      tripService.completeArea(area);
      setSweepProgress(tripService.getSweepProgress());
    },
    [tripService]
  );

  const resetSweep = useCallback((): void => {
    tripService.resetSweep();
    setItems(tripService.getItems());
    setSweepProgress(tripService.getSweepProgress());
  }, [tripService]);

  const syncStapleUpdate = useCallback(
    (stapleId: string, changes: UpdateStapleChanges): void => {
      tripService.syncStapleUpdate(stapleId, changes);
      setItems(tripService.getItems());
    },
    [tripService]
  );

  return { items, addItem, checkOff, toggleCheckOff, skipItem, unskipItem, completeArea, resetSweep, syncStapleUpdate, sweepProgress };
};
