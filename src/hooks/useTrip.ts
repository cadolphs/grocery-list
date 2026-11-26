// useTrip - hook bridging TripService to React state
// Reads items from context and exposes them as reactive state

import { useState, useCallback, useEffect } from 'react';
import {
  TripItem,
  AddTripItemResult,
  AddStapleRequest,
  HouseArea,
  SweepDecision,
} from '../domain/types';
import { SweepProgress, AddTripItemWithStapleId } from '../domain/trip';
import { UpdateStapleChanges } from '../domain/staple-library';
import { useServices } from '../ui/ServiceProvider';

export type UseTripResult = {
  readonly items: TripItem[];
  readonly addItem: (request: AddTripItemWithStapleId) => AddTripItemResult;
  // Row operations take the trip item id: one name can sit in several house
  // areas (spec #90 story 35).
  readonly togglePutInCart: (itemId: string) => void;
  readonly setDecision: (itemId: string, decision: SweepDecision) => void;
  readonly stepTowardNeeded: (itemId: string) => void;
  readonly stepTowardNotNeeded: (itemId: string) => void;
  // Quick-add of a new staple: adds it to the library and marks the trip item
  // it just added, and only that one, Needed (#96).
  readonly addStapleAsNeeded: (request: AddStapleRequest) => void;
  readonly markAreaDone: (area: HouseArea) => void;
  readonly undoArea: (area: HouseArea) => void;
  readonly startOver: () => void;
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

  const togglePutInCart = useCallback(
    (itemId: string): void => {
      const item = tripService.getItems().find((i) => i.id === itemId);
      if (item?.inCart) {
        tripService.takeOutOfCart(itemId);
      } else {
        tripService.putInCart(itemId);
      }
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const setDecision = useCallback(
    (itemId: string, decision: SweepDecision): void => {
      tripService.setDecision(itemId, decision);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const stepTowardNeeded = useCallback(
    (itemId: string): void => {
      tripService.stepTowardNeeded(itemId);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  const stepTowardNotNeeded = useCallback(
    (itemId: string): void => {
      tripService.stepTowardNotNeeded(itemId);
      setItems(tripService.getItems());
    },
    [tripService],
  );

  // The library diff path adds the new staple to the trip Undecided,
  // synchronously; the library rejects a second staple with the same name and
  // area, so (name, area) finds exactly the row just added.
  const addStapleAsNeeded = useCallback(
    (request: AddStapleRequest): void => {
      if (!stapleLibrary.addStaple(request).success) return;
      const added = tripService
        .getItems()
        .find(
          (i) =>
            i.itemType === 'staple' &&
            i.name === request.name &&
            i.houseArea === request.houseArea,
        );
      if (added) tripService.setDecision(added.id, 'needed');
      setItems(tripService.getItems());
    },
    [tripService, stapleLibrary],
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

  const startOver = useCallback((): void => {
    const currentStaples = stapleLibrary
      .listAll()
      .filter((s) => s.type === 'staple');
    tripService.startOver(currentStaples);
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
    togglePutInCart,
    setDecision,
    stepTowardNeeded,
    stepTowardNotNeeded,
    addStapleAsNeeded,
    markAreaDone,
    undoArea,
    startOver,
    syncStapleUpdate,
    sweepProgress,
  };
};
