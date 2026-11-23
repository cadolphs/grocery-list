// useTrip - hook bridging TripService to React state
// Reads items from context and exposes them as reactive state

import { useState, useCallback, useEffect } from 'react';
import {
  TripItem,
  AddTripItemResult,
  HouseArea,
  SweepDecision,
} from '../domain/types';
import { SweepProgress, AddTripItemWithStapleId } from '../domain/trip';
import { UpdateStapleChanges } from '../domain/staple-library';
import { useServices } from '../ui/ServiceProvider';

export type UseTripResult = {
  readonly items: TripItem[];
  readonly addItem: (request: AddTripItemWithStapleId) => AddTripItemResult;
  readonly toggleCheckOff: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly unskipItem: (name: string) => void;
  readonly setDecision: (name: string, decision: SweepDecision) => void;
  readonly stepTowardNeeded: (name: string) => void;
  readonly stepTowardNotNeeded: (name: string) => void;
  readonly markAreaDone: (area: HouseArea) => void;
  readonly undoArea: (area: HouseArea) => void;
  readonly resetSweep: () => void;
  readonly syncStapleUpdate: (
    stapleId: string,
    changes: UpdateStapleChanges,
  ) => void;
  readonly sweepProgress: SweepProgress;
};

export const useTrip = (): UseTripResult => {
  const { tripService, stapleLibrary } = useServices();
  const [items, setItems] = useState<TripItem[]>(() => tripService.getItems());
  const [sweepProgress, setSweepProgress] = useState<SweepProgress>(() =>
    tripService.getSweepProgress(),
  );

  // Re-sync React state when tripService changes (e.g. reload swaps legacy -> production)
  // and when tripService is mutated externally (e.g. Firestore sync handler)
  useEffect(() => {
    setItems(tripService.getItems());
    setSweepProgress(tripService.getSweepProgress());
    return tripService.subscribe(() => {
      setItems(tripService.getItems());
      setSweepProgress(tripService.getSweepProgress());
    });
  }, [tripService]);

  const addItem = useCallback(
    (request: AddTripItemWithStapleId): AddTripItemResult => {
      const result = tripService.addItem(request);
      if (result.success) {
        setItems(tripService.getItems());
      }
      return result;
    },
    [tripService],
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
    [tripService],
  );

  const skipItem = useCallback(
    (name: string): void => {
      tripService.skipItem(name);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const unskipItem = useCallback(
    (name: string): void => {
      tripService.unskipItem(name);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const setDecision = useCallback(
    (name: string, decision: SweepDecision): void => {
      tripService.setDecision(name, decision);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const stepTowardNeeded = useCallback(
    (name: string): void => {
      tripService.stepTowardNeeded(name);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const stepTowardNotNeeded = useCallback(
    (name: string): void => {
      tripService.stepTowardNotNeeded(name);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const markAreaDone = useCallback(
    (area: HouseArea): void => {
      tripService.markAreaDone(area);
      setItems(tripService.getItems());
      setSweepProgress(tripService.getSweepProgress());
    },
    [tripService],
  );

  const undoArea = useCallback(
    (area: HouseArea): void => {
      tripService.undoArea(area);
      setItems(tripService.getItems());
      setSweepProgress(tripService.getSweepProgress());
    },
    [tripService],
  );

  const resetSweep = useCallback((): void => {
    const currentStaples = stapleLibrary
      .listAll()
      .filter((s) => s.type === 'staple');
    tripService.resetSweep(currentStaples);
    setItems(tripService.getItems());
    setSweepProgress(tripService.getSweepProgress());
  }, [tripService, stapleLibrary]);

  const syncStapleUpdate = useCallback(
    (stapleId: string, changes: UpdateStapleChanges): void => {
      tripService.syncStapleUpdate(stapleId, changes);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  return {
    items,
    addItem,
    toggleCheckOff,
    skipItem,
    unskipItem,
    setDecision,
    stepTowardNeeded,
    stepTowardNotNeeded,
    markAreaDone,
    undoArea,
    resetSweep,
    syncStapleUpdate,
    sweepProgress,
  };
};
