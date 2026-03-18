// Trip domain - unit tests

import { createTrip, completeTrip } from '../../../src/domain/trip';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';

describe('Trip: addItem', () => {
  it('adds a one-off item to the trip', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

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
        needed: true,
        checked: false,
      })
    );
    expect(items[0].id).toBeDefined();
  });

  it('one-off item does not have a stapleId', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    trip.addItem({
      name: 'Party hats',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Party', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    const items = trip.getItems();
    expect(items[0].stapleId).toBeNull();
  });

  it('returns success result when adding a valid item', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

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
    trip.start([]);

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
    trip.start([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    trip.checkOff('Whole milk');

    const loadedTrip = tripStorage.loadTrip();
    expect(loadedTrip).not.toBeNull();
    const loadedMilk = loadedTrip?.items.find(i => i.name === 'Whole milk');
    expect(loadedMilk?.checked).toBe(true);
  });

  it('persists only the checked item, others remain unchecked', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);

    trip.checkOff('Whole milk');

    const loadedTrip = tripStorage.loadTrip();
    const loadedButter = loadedTrip?.items.find(i => i.name === 'Butter');
    expect(loadedButter?.checked).toBe(false);
  });
});

describe('Trip: loadFromStorage', () => {
  it('restores trip items including checked state from storage', () => {
    const tripStorage = createNullTripStorage();
    const trip1 = createTrip(tripStorage);
    trip1.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
    ]);
    trip1.checkOff('Milk');

    const trip2 = createTrip(tripStorage);
    trip2.loadFromStorage();

    const items = trip2.getItems();
    expect(items).toHaveLength(2);
    expect(items.find(i => i.name === 'Milk')?.checked).toBe(true);
    expect(items.find(i => i.name === 'Bread')?.checked).toBe(false);
  });

  it('returns empty items when no trip in storage', () => {
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.loadFromStorage();

    expect(trip.getItems()).toHaveLength(0);
  });
});

describe('completeTrip', () => {
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
    trip.start(library.listAll());
    return { trip, library };
  };

  it('categorizes checked staples as purchasedStaples', () => {
    const { trip, library } = setupTripWithItems();
    trip.checkOff('Milk');

    const result = completeTrip(trip, library);

    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0].name).toBe('Milk');
  });

  it('categorizes checked one-offs as purchasedOneOffs', () => {
    const { trip, library } = setupTripWithItems();
    trip.addItem({
      name: 'Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });
    trip.checkOff('Candles');

    const result = completeTrip(trip, library);

    expect(result.purchasedOneOffs).toHaveLength(1);
    expect(result.purchasedOneOffs[0].name).toBe('Candles');
  });

  it('categorizes unchecked items as unboughtItems', () => {
    const { trip, library } = setupTripWithItems();
    trip.addItem({
      name: 'Avocados',
      houseArea: 'Fridge',
      storeLocation: { section: 'Produce', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });
    // Leave Milk and Avocados unchecked

    const result = completeTrip(trip, library);

    expect(result.unboughtItems).toHaveLength(2);
    expect(result.unboughtItems).toContainEqual(
      expect.objectContaining({ name: 'Milk' })
    );
    expect(result.unboughtItems).toContainEqual(
      expect.objectContaining({ name: 'Avocados' })
    );
  });

  it('returns empty arrays when trip has no items', () => {
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    const result = completeTrip(trip, library);

    expect(result.purchasedStaples).toHaveLength(0);
    expect(result.purchasedOneOffs).toHaveLength(0);
    expect(result.unboughtItems).toHaveLength(0);
  });
});
