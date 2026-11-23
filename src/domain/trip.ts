// Trip - driving port implementation
// Pure domain logic, no IO imports

import {
  Trip,
  TripItem,
  AddTripItemRequest,
  AddTripItemResult,
  AddStapleRequest,
  HouseArea,
  SweepDecision,
} from './types';
import { TripStorage } from '../ports/trip-storage';
import { UpdateStapleChanges } from './staple-library';

export type StapleInput = AddStapleRequest & { readonly id?: string };

// Extended request for auto-add: includes stapleId for duplicate prevention.
// decision defaults to Needed (quick-add); the library-add diff path passes
// Undecided. A one-off is always Needed, whatever is passed.
export type AddTripItemWithStapleId = AddTripItemRequest & {
  readonly stapleId?: string;
  readonly decision?: SweepDecision;
};

// Derived from decisions alone (ADR-013): an area is complete exactly when it
// holds no Undecided staple, so an empty area counts as complete.
export type SweepProgress = {
  readonly completedAreas: readonly HouseArea[];
  readonly completedCount: number;
  readonly totalAreas: number;
  readonly allAreasComplete: boolean;
  readonly undecidedCountByArea: Readonly<Record<HouseArea, number>>;
};

const DEFAULT_HOUSE_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

export type TripService = {
  readonly addItem: (request: AddTripItemWithStapleId) => AddTripItemResult;
  readonly getItems: () => TripItem[];
  readonly checkOff: (name: string) => void;
  readonly uncheckItem: (name: string) => void;
  readonly skipItem: (name: string) => void;
  readonly unskipItem: (name: string) => void;
  readonly stepTowardNeeded: (name: string) => void;
  readonly stepTowardNotNeeded: (name: string) => void;
  readonly setDecision: (name: string, decision: SweepDecision) => void;
  readonly markAreaDone: (area: HouseArea) => void;
  readonly undoArea: (area: HouseArea) => void;
  readonly getSweepProgress: () => SweepProgress;
  readonly loadFromStorage: () => void;
  readonly resetSweep: (staples: ReadonlyArray<StapleInput>) => void;
  readonly complete: () => CompleteTripResult;
  readonly initializeFromStorage: (staples: ReadonlyArray<StapleInput>) => void;
  readonly syncStapleUpdate: (
    stapleId: string,
    changes: UpdateStapleChanges,
  ) => void;
  readonly removeItemByStapleId: (stapleId: string) => void;
  readonly removeItemsByStaple: (staple: StapleIdentity) => void;
  readonly subscribe: (listener: () => void) => () => void;
};

export type StapleIdentity = {
  readonly id: string;
  readonly name: string;
  readonly houseArea: HouseArea;
};

// The sweep row is a 3-position slider (ADR-013): a step moves one position
// along this order and stops at either end.
const DECISION_SLIDER: readonly SweepDecision[] = [
  'not-needed',
  'undecided',
  'needed',
];

const stepDecision = (
  decision: SweepDecision,
  direction: 1 | -1,
): SweepDecision => {
  const position = DECISION_SLIDER.indexOf(decision) + direction;
  const clamped = Math.min(Math.max(position, 0), DECISION_SLIDER.length - 1);
  return DECISION_SLIDER[clamped]!;
};

// Expand phase of #90: needed mirrors decision on every write.
const decisionPatch = (
  decision: SweepDecision,
): Pick<TripItem, 'decision' | 'needed'> => ({
  decision,
  needed: decision === 'needed',
});

// One-offs are always Needed (ADR-013): decision operations leave them alone.
const isSweepable = (item: TripItem): boolean => item.itemType === 'staple';

const generateTripItemId = (): string =>
  `trip-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Predicate factory: returns the matching rule shared by removeItemsByStaple.
// Resolution: prefer stapleId equality; fall back to (name, houseArea) only
// for staple-typed items (one-offs that share a name+area must NOT be removed).
const matchesStapleIdentity =
  (staple: StapleIdentity) =>
  (item: TripItem): boolean => {
    if (item.stapleId != null) return item.stapleId === staple.id;
    if (item.itemType !== 'staple') return false;
    return item.name === staple.name && item.houseArea === staple.houseArea;
  };

const stapleInputToTripItem = (staple: StapleInput): TripItem => ({
  id: generateTripItemId(),
  name: staple.name,
  houseArea: staple.houseArea,
  storeLocation: staple.storeLocation,
  itemType: 'staple',
  stapleId: staple.id ?? null,
  source: 'preloaded',
  // ADR-013: a staple starts the trip Undecided until the sweep decides it.
  ...decisionPatch('undecided'),
  checked: false,
  checkedAt: null,
});

const generateTripId = (): string =>
  `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildTrip = (
  tripId: string,
  items: TripItem[],
  createdAt: string,
): Trip => ({
  id: tripId,
  items: [...items],
  status: 'active',
  createdAt,
});

const isUndecidedStaple = (item: TripItem): boolean =>
  item.itemType === 'staple' && item.decision === 'undecided';

const deriveSweepProgress = (
  items: readonly TripItem[],
  areas: readonly HouseArea[],
): SweepProgress => {
  const undecidedCountByArea = Object.fromEntries(
    areas.map((area) => [
      area,
      items.filter((item) => item.houseArea === area && isUndecidedStaple(item))
        .length,
    ]),
  );
  const completedAreas = areas.filter(
    (area) => undecidedCountByArea[area] === 0,
  );
  return {
    completedAreas,
    completedCount: completedAreas.length,
    totalAreas: areas.length,
    allAreasComplete: completedAreas.length === areas.length,
    undecidedCountByArea,
  };
};

// Accepts a getter so getSweepProgress().totalAreas reads the live area
// list each call, avoiding a build-time-frozen snapshot. A plain array is
// still accepted for backward compatibility with pre-existing callers;
// it is wrapped into a constant getter internally.
export type AreasGetter = () => readonly string[];

const toAreasGetter = (
  areas: readonly string[] | AreasGetter | undefined,
): AreasGetter => {
  if (areas === undefined) return () => DEFAULT_HOUSE_AREAS;
  if (typeof areas === 'function') return areas;
  return () => areas;
};

export const createTrip = (
  storage: TripStorage,
  areas?: readonly string[] | AreasGetter,
): TripService => {
  const getTripAreas = toAreasGetter(areas);
  let items: TripItem[] = [];
  let tripId: string = generateTripId();
  let createdAt: string = new Date().toISOString();
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((l) => l());

  const persistTrip = (): void => {
    storage.saveTrip(buildTrip(tripId, items, createdAt));
  };

  // Apply a partial patch to every item matching `name`, then notify and
  // persist. Used by check/uncheck/skip/unskip — all share this shape.
  // Notifying matters because HomeView and StoreView are mounted at the same
  // time (AppShell) and each holds its own useTrip state: without it, an item
  // skipped on Home stays listed on Store until something else notifies.
  const updateItemByName = (name: string, patch: Partial<TripItem>): void => {
    items = items.map((item) =>
      item.name === name ? { ...item, ...patch } : item,
    );
    notify();
    persistTrip();
  };

  // Done / Undo: move every staple in the area whose decision is `from` to
  // `to`. Needed staples and other areas are never touched.
  const moveAreaDecisions = (
    area: HouseArea,
    from: SweepDecision,
    to: SweepDecision,
  ): void => {
    items = items.map((item) =>
      item.houseArea === area &&
      item.itemType === 'staple' &&
      item.decision === from
        ? { ...item, ...decisionPatch(to) }
        : item,
    );
    notify();
    persistTrip();
  };

  const decideItemByName = (
    name: string,
    decide: (current: SweepDecision) => SweepDecision,
  ): void => {
    items = items.map((item) =>
      item.name === name && isSweepable(item)
        ? { ...item, ...decisionPatch(decide(item.decision)) }
        : item,
    );
    notify();
    persistTrip();
  };

  // Remove items matching predicate. If nothing matched, this is a no-op
  // (no notify, no persist). Shared by removeItemByStapleId and
  // removeItemsByStaple — both want the same "filter, short-circuit when
  // unchanged, otherwise notify+persist" semantics.
  const removeWhere = (shouldRemove: (item: TripItem) => boolean): void => {
    const next = items.filter((item) => !shouldRemove(item));
    if (next.length === items.length) return;
    items = next;
    notify();
    persistTrip();
  };

  return {
    addItem: (request: AddTripItemWithStapleId): AddTripItemResult => {
      if (!request.houseArea || request.houseArea.trim() === '') {
        return { success: false, error: 'area is required' };
      }
      if (
        request.stapleId &&
        items.some((i) => i.stapleId === request.stapleId)
      ) {
        return { success: false, error: 'staple already in trip' };
      }
      // Defense-in-depth fallback: callers passing itemType='staple' without
      // a stapleId must still be blocked when an existing staple-typed item
      // shares (name, houseArea). Mirrors matchesStapleIdentity used on the
      // remove path so add and remove identity rules stay symmetric.
      if (
        request.itemType === 'staple' &&
        items.some(
          (i) =>
            i.itemType === 'staple' &&
            i.name === request.name &&
            i.houseArea === request.houseArea,
        )
      ) {
        return { success: false, error: 'staple already in trip' };
      }

      const tripItem: TripItem = {
        id: generateTripItemId(),
        name: request.name,
        houseArea: request.houseArea,
        storeLocation: request.storeLocation,
        itemType: request.itemType,
        stapleId: request.stapleId ?? null,
        source: request.source,
        ...decisionPatch(
          request.itemType === 'one-off'
            ? 'needed'
            : (request.decision ?? 'needed'),
        ),
        checked: false,
        checkedAt: null,
      };
      items = [...items, tripItem];
      notify();
      persistTrip();
      return { success: true };
    },

    getItems: () => [...items],

    checkOff: (name: string) => {
      updateItemByName(name, {
        checked: true,
        checkedAt: new Date().toISOString(),
      });
    },

    uncheckItem: (name: string) => {
      updateItemByName(name, { checked: false, checkedAt: null });
    },

    skipItem: (name: string) => {
      decideItemByName(name, () => 'not-needed');
    },

    unskipItem: (name: string) => {
      decideItemByName(name, () => 'needed');
    },

    stepTowardNeeded: (name: string) => {
      decideItemByName(name, (current) => stepDecision(current, 1));
    },

    stepTowardNotNeeded: (name: string) => {
      decideItemByName(name, (current) => stepDecision(current, -1));
    },

    setDecision: (name: string, decision: SweepDecision) => {
      decideItemByName(name, () => decision);
    },

    markAreaDone: (area: HouseArea) => {
      moveAreaDecisions(area, 'undecided', 'not-needed');
    },

    undoArea: (area: HouseArea) => {
      moveAreaDecisions(area, 'not-needed', 'undecided');
    },

    getSweepProgress: (): SweepProgress =>
      deriveSweepProgress(items, getTripAreas()),

    loadFromStorage: () => {
      const savedTrip = storage.loadTrip();
      if (savedTrip) {
        const previousItems = items;
        tripId = savedTrip.id;
        createdAt = savedTrip.createdAt;
        items = [...savedTrip.items];

        if (JSON.stringify(previousItems) !== JSON.stringify(items)) {
          notify();
        }
      }
    },

    resetSweep: (staples: ReadonlyArray<StapleInput>) => {
      const stapleItems = staples.map(stapleInputToTripItem);
      items = stapleItems;
      notify();
      persistTrip();
    },

    syncStapleUpdate: (stapleId: string, changes: UpdateStapleChanges) => {
      let changed = false;
      const nextItems = items.map((item) => {
        if (item.stapleId !== stapleId) return item;
        const nextHouseArea = changes.houseArea ?? item.houseArea;
        const nextStoreLocation = changes.storeLocation ?? item.storeLocation;
        const storeLocationEqual =
          item.storeLocation.section === nextStoreLocation.section &&
          item.storeLocation.aisleNumber === nextStoreLocation.aisleNumber;
        if (item.houseArea === nextHouseArea && storeLocationEqual) return item;
        changed = true;
        return {
          ...item,
          houseArea: nextHouseArea,
          storeLocation: nextStoreLocation,
        };
      });
      if (!changed) return;
      items = nextItems;
      notify();
      persistTrip();
    },

    removeItemByStapleId: (stapleId: string) => {
      removeWhere((item) => item.stapleId === stapleId);
    },

    removeItemsByStaple: (staple: StapleIdentity) => {
      removeWhere(matchesStapleIdentity(staple));
    },

    initializeFromStorage: (staples: ReadonlyArray<StapleInput>) => {
      const savedTrip = storage.loadTrip();
      if (!savedTrip) {
        // No stored trip: start fresh with staples
        const stapleItems = staples.map(stapleInputToTripItem);
        items = [...stapleItems];
        persistTrip();
        return;
      }
      if (savedTrip.status === 'completed') {
        const carryover = storage.loadCarryover();
        // An empty staple list means either "no staples exist" or "staples have
        // not loaded yet"; the domain cannot tell the two apart. When the only
        // inputs to the rebuild are empty and the stored trip still holds items,
        // rebuilding would replace a real list with an empty one and persist
        // that loss. Refuse it and fall through to adopting the stored trip.
        const rebuildWouldEraseStoredItems =
          savedTrip.items.length > 0 &&
          staples.length === 0 &&
          carryover.length === 0;
        if (!rebuildWouldEraseStoredItems) {
          // Completed trip: start new trip with carryover. A carried-over
          // staple arrives Needed in place of its fresh Undecided copy.
          const isCarried = (staple: StapleInput): boolean =>
            carryover.some(
              matchesStapleIdentity({
                id: staple.id ?? '',
                name: staple.name,
                houseArea: staple.houseArea,
              }),
            );
          const stapleItems = staples
            .filter((staple) => !isCarried(staple))
            .map(stapleInputToTripItem);
          items = [...stapleItems, ...carryover];
          storage.clearCarryover();
          tripId = generateTripId();
          createdAt = new Date().toISOString();
          persistTrip();
          return;
        }
      }
      // Active trip, or a refused completed rebuild: load existing items
      tripId = savedTrip.id;
      createdAt = savedTrip.createdAt;
      items = [...savedTrip.items];
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    complete: (): CompleteTripResult => {
      const result = categorizeItems(items);

      // Save carryover: unbought items with source changed to 'carryover'
      const carryoverItems = result.unboughtItems.map((item) => ({
        ...item,
        source: 'carryover' as const,
      }));
      storage.saveCarryover(carryoverItems);

      // Persist trip as completed
      storage.saveTrip({
        id: tripId,
        items: [...items],
        status: 'completed',
        createdAt,
      });

      return result;
    },
  };
};

// --- Pure function: categorize trip items on completion ---

export type CompleteTripResult = {
  readonly purchasedStaples: readonly TripItem[];
  readonly purchasedOneOffs: readonly TripItem[];
  readonly unboughtItems: readonly TripItem[];
};

const isChecked = (item: TripItem): boolean => item.checked;
// Finish Trip carries over exactly the Needed items not in the cart (ADR-013).
const carriesOver = (item: TripItem): boolean =>
  item.decision === 'needed' && !item.checked;
const isStaple = (item: TripItem): boolean => item.itemType === 'staple';
const isOneOff = (item: TripItem): boolean => item.itemType === 'one-off';

// Pure categorization: split items into purchased staples / one-offs / unbought.
// Used by `complete()`, which also persists carryover and trip status.
const categorizeItems = (items: readonly TripItem[]): CompleteTripResult => {
  const checkedItems = items.filter(isChecked);
  return {
    purchasedStaples: checkedItems.filter(isStaple),
    purchasedOneOffs: checkedItems.filter(isOneOff),
    unboughtItems: items.filter(carriesOver),
  };
};
