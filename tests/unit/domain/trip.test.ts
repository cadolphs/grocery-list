// Trip domain - unit tests

import { createTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

describe('Trip: addItem', () => {
  it('adds a one-off item to the trip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);

    trip.addItem({
      name: 'Birthday candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    const items = trip.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        name: 'Birthday candles',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Baking', aisleNumber: 12 },
        itemType: 'one-off',
        source: 'quick-add',
        decision: 'needed',
        checked: false,
      }),
    );
    expect(items[0]!.id).toBeDefined();
  });

  it('one-off item does not have a stapleId', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);

    trip.addItem({
      name: 'Party hats',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Party', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    const items = trip.getItems();
    expect(items[0]!.stapleId).toBeNull();
  });

  it('returns success result when adding a valid item', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);

    const result = trip.addItem({
      name: 'Canned beans',
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
      itemType: 'staple',
      source: 'quick-add',
    });

    expect(result.success).toBe(true);
    expect(trip.getItems()).toHaveLength(1);
  });

  it('rejects item with empty houseArea', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);

    const result = trip.addItem({
      name: 'Something',
      houseArea: '' as any,
      storeLocation: { section: 'General', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('area is required');
    }
    expect(trip.getItems()).toHaveLength(0);
  });
});

describe('Trip: checkOff persistence', () => {
  it('persists checked item to storage via saveTrip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Whole milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    trip.checkOff(itemIdNamed(trip, 'Whole milk'));

    const loadedTrip = tripStorage.loadTrip();
    expect(loadedTrip).not.toBeNull();
    const loadedMilk = loadedTrip?.items.find((i) => i.name === 'Whole milk');
    expect(loadedMilk?.checked).toBe(true);
  });

  it('persists only the checked item, others remain unchecked', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Whole milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    trip.checkOff(itemIdNamed(trip, 'Whole milk'));

    const loadedTrip = tripStorage.loadTrip();
    const loadedButter = loadedTrip?.items.find((i) => i.name === 'Butter');
    expect(loadedButter?.checked).toBe(false);
  });
});

describe('Trip: loadFromStorage', () => {
  it('restores trip items including checked state from storage', () => {
    const tripStorage = createNullTripStorage();
    const trip1 = createTrip(tripStorage);
    trip1.initializeFromStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: null },
      },
    ]);
    trip1.checkOff(itemIdNamed(trip1, 'Milk'));

    const trip2 = createTrip(tripStorage);
    trip2.loadFromStorage();

    const items = trip2.getItems();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.name === 'Milk')?.checked).toBe(true);
    expect(items.find((i) => i.name === 'Bread')?.checked).toBe(false);
  });

  it('returns empty items when no trip in storage', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.loadFromStorage();

    expect(trip.getItems()).toHaveLength(0);
  });
});

describe('Trip: setDecision Not needed', () => {
  it('sets needed to false for the matching item', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Shampoo',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
      {
        name: 'Soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
    ]);

    trip.setDecision(itemIdNamed(trip, 'Shampoo'), 'not-needed');

    const items = trip.getItems();
    const shampoo = items.find((i) => i.name === 'Shampoo');
    const soap = items.find((i) => i.name === 'Soap');
    expect(shampoo?.decision).toBe('not-needed');
    // #96: staples start Undecided; marking Shampoo Not needed leaves Soap untouched.
    expect(soap?.decision).toBe('undecided');
  });

  it('does not remove the item from the trip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    trip.setDecision(itemIdNamed(trip, 'Butter'), 'not-needed');

    expect(trip.getItems()).toHaveLength(1);
    expect(trip.getItems()[0]!.name).toBe('Butter');
  });
});

describe('Trip: resetSweep', () => {
  it('resets staple items to Undecided and checked=false', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    const staples = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];
    trip.initializeFromStorage(staples);
    trip.checkOff(itemIdNamed(trip, 'Milk'));
    trip.setDecision(itemIdNamed(trip, 'Butter'), 'not-needed');

    trip.resetSweep(staples);

    const items = trip.getItems();
    expect(items).toHaveLength(2);
    const milk = items.find((i) => i.name === 'Milk');
    const butter = items.find((i) => i.name === 'Butter');
    // #96: Reset Sweep returns every staple to Undecided.
    expect(milk?.decision).toBe('undecided');
    expect(milk?.checked).toBe(false);
    expect(milk?.checkedAt).toBeNull();
    expect(butter?.decision).toBe('undecided');
    expect(butter?.checked).toBe(false);
  });

  it('removes one-off items from the trip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    const staples = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];
    trip.initializeFromStorage(staples);
    trip.addItem({
      name: 'Birthday candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    trip.resetSweep(staples);

    const items = trip.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Milk');
  });

  it('persists the reset trip to storage', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    const staples = [
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];
    trip.initializeFromStorage(staples);
    trip.checkOff(itemIdNamed(trip, 'Milk'));
    trip.addItem({
      name: 'Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    trip.resetSweep(staples);

    const loadedTrip = tripStorage.loadTrip();
    expect(loadedTrip).not.toBeNull();
    expect(loadedTrip?.items).toHaveLength(1);
    expect(loadedTrip?.items[0]!.name).toBe('Milk');
    expect(loadedTrip?.items[0]!.checked).toBe(false);
    expect(loadedTrip?.items[0]!.decision).toBe('undecided');
  });
});

describe('Trip: complete categorizes items', () => {
  const setupTripWithItems = () => {
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage(library.listAll());
    // #96: staples start Undecided; the sweep marks Milk Needed.
    trip.setDecision(itemIdNamed(trip, 'Milk'), 'needed');
    return { trip };
  };

  it('categorizes checked staples as purchasedStaples', () => {
    const { trip } = setupTripWithItems();
    trip.checkOff(itemIdNamed(trip, 'Milk'));

    const result = trip.complete();

    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0]!.name).toBe('Milk');
  });

  it('categorizes checked one-offs as purchasedOneOffs', () => {
    const { trip } = setupTripWithItems();
    trip.addItem({
      name: 'Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });
    trip.checkOff(itemIdNamed(trip, 'Candles'));

    const result = trip.complete();

    expect(result.purchasedOneOffs).toHaveLength(1);
    expect(result.purchasedOneOffs[0]!.name).toBe('Candles');
  });

  it('categorizes unchecked items as unboughtItems', () => {
    const { trip } = setupTripWithItems();
    trip.addItem({
      name: 'Avocados',
      houseArea: 'Fridge',
      storeLocation: { section: 'Produce', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });
    // Leave Milk and Avocados unchecked

    const result = trip.complete();

    expect(result.unboughtItems).toHaveLength(2);
    expect(result.unboughtItems).toContainEqual(
      expect.objectContaining({ name: 'Milk' }),
    );
    expect(result.unboughtItems).toContainEqual(
      expect.objectContaining({ name: 'Avocados' }),
    );
  });

  it('returns empty arrays when trip has no items', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);

    const result = trip.complete();

    expect(result.purchasedStaples).toHaveLength(0);
    expect(result.purchasedOneOffs).toHaveLength(0);
    expect(result.unboughtItems).toHaveLength(0);
  });
});
