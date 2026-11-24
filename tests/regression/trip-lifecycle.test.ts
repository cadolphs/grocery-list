// Trip lifecycle: complete() persists trip and saves carryover items

import { createTrip } from '../../src/domain/trip';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

describe('Trip lifecycle: complete() persists trip and saves carryover', () => {
  it('complete() marks trip as completed, persists to storage, saves unbought as carryover, returns CompleteTripResult', () => {
    const storage = createNullTripStorage();
    const trip = createTrip(storage);

    trip.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
    ]);

    // Add a one-off item
    trip.addItem({
      name: 'Birthday Cake',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // #96: staples start Undecided; the sweep marks them Needed.
    trip.setDecision(itemIdNamed(trip, 'Milk'), 'needed');
    trip.setDecision(itemIdNamed(trip, 'Bread'), 'needed');

    // Check off Milk (staple) and Birthday Cake (one-off) — Bread stays unbought
    trip.putInCart(itemIdNamed(trip, 'Milk'));
    trip.putInCart(itemIdNamed(trip, 'Birthday Cake'));

    // Complete the trip
    const result = trip.complete();

    // 1. Result categorizes items correctly
    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0]!.name).toBe('Milk');

    expect(result.purchasedOneOffs).toHaveLength(1);
    expect(result.purchasedOneOffs[0]!.name).toBe('Birthday Cake');

    expect(result.carryoverItems).toHaveLength(1);
    expect(result.carryoverItems[0]!.name).toBe('Bread');

    // 2. Trip persisted with status 'completed'
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('completed');

    // 3. Carryover saved — unbought items with source changed to 'carryover'
    const carryover = storage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0]!.name).toBe('Bread');
    expect(carryover[0]!.source).toBe('carryover');
  });

  it('new trip loads carryover from completed trip', () => {
    const storage = createNullTripStorage();
    const trip1 = createTrip(storage);

    // Start first trip with two staples
    trip1.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
    ]);

    // #96: staples start Undecided; the sweep marks them Needed.
    trip1.setDecision(itemIdNamed(trip1, 'Milk'), 'needed');
    trip1.setDecision(itemIdNamed(trip1, 'Bread'), 'needed');

    // Check off Milk, leave Bread unbought
    trip1.putInCart(itemIdNamed(trip1, 'Milk'));

    // Complete trip — Bread becomes carryover
    trip1.complete();

    // Start a new trip from the same storage
    const trip2 = createTrip(storage);
    trip2.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // Carryover items should appear in new trip
    const items = trip2.getItems();
    const carryoverItems = items.filter((item) => item.source === 'carryover');
    expect(carryoverItems).toHaveLength(1);
    expect(carryoverItems[0]!.name).toBe('Bread');

    // Staples should also be present
    const stapleItems = items.filter((item) => item.source === 'preloaded');
    expect(stapleItems).toHaveLength(1);
    expect(stapleItems[0]!.name).toBe('Milk');

    // Carryover should be cleared from storage after loading
    const remainingCarryover = storage.loadCarryover();
    expect(remainingCarryover).toHaveLength(0);
  });

  it('full trip cycle with carryover: start, buy some, complete, start new with staples plus carryover', () => {
    const storage = createNullTripStorage();

    // Define 3 staples used across both trips
    const staples = [
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
      {
        id: 'staple-3',
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];

    // --- Trip 1: start with 3 staples ---
    const trip1 = createTrip(storage);
    trip1.initializeFromStorage(staples);

    const trip1Items = trip1.getItems();
    expect(trip1Items).toHaveLength(3);

    // #96: staples start Undecided; the sweep marks them Needed.
    trip1.setDecision(itemIdNamed(trip1, 'Milk'), 'needed');
    trip1.setDecision(itemIdNamed(trip1, 'Bread'), 'needed');
    trip1.setDecision(itemIdNamed(trip1, 'Eggs'), 'needed');

    // Check off 2 staples (Milk and Bread) — Eggs stays unbought
    trip1.putInCart(itemIdNamed(trip1, 'Milk'));
    trip1.putInCart(itemIdNamed(trip1, 'Bread'));

    // Complete trip 1
    const result = trip1.complete();
    expect(result.purchasedStaples).toHaveLength(2);
    expect(result.carryoverItems).toHaveLength(1);
    expect(result.carryoverItems[0]!.name).toBe('Eggs');

    // --- Trip 2: start new trip with same staples + carryover ---
    const trip2 = createTrip(storage);
    trip2.initializeFromStorage(staples);

    const trip2Items = trip2.getItems();

    // #96: the carried-over Eggs arrives Needed in place of a fresh
    // Undecided copy, so the new trip holds each staple once: 2 + 1 = 3.
    expect(trip2Items).toHaveLength(3);

    const preloadedItems = trip2Items.filter(
      (item) => item.source === 'preloaded',
    );
    expect(preloadedItems).toHaveLength(2);
    expect(preloadedItems.map((i) => i.name).sort()).toEqual(['Bread', 'Milk']);

    // The 1 carryover item (Eggs) should have source 'carryover'
    const carryoverItems = trip2Items.filter(
      (item) => item.source === 'carryover',
    );
    expect(carryoverItems).toHaveLength(1);
    expect(carryoverItems[0]!.name).toBe('Eggs');
    expect(carryoverItems[0]!.source).toBe('carryover');

    // Carryover should be cleared from storage after starting new trip
    const remainingCarryover2 = storage.loadCarryover();
    expect(remainingCarryover2).toHaveLength(0);
  });

  it('app init starts new trip with carryover from completed trip', () => {
    const storage = createNullTripStorage();

    // --- Setup: simulate a previous session that completed a trip ---
    const previousTrip = createTrip(storage);
    previousTrip.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
      {
        id: 'staple-3',
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // #96: staples start Undecided; the sweep marks them Needed.
    previousTrip.setDecision(itemIdNamed(previousTrip, 'Milk'), 'needed');
    previousTrip.setDecision(itemIdNamed(previousTrip, 'Bread'), 'needed');
    previousTrip.setDecision(itemIdNamed(previousTrip, 'Eggs'), 'needed');

    // Buy Milk and Eggs, leave Bread unbought
    previousTrip.putInCart(itemIdNamed(previousTrip, 'Milk'));
    previousTrip.putInCart(itemIdNamed(previousTrip, 'Eggs'));
    previousTrip.complete();

    // Verify preconditions: storage has completed trip + carryover
    expect(storage.loadTrip()!.status).toBe('completed');
    expect(storage.loadCarryover()).toHaveLength(1);
    expect(storage.loadCarryover()[0]!.name).toBe('Bread');

    // --- App init: new session creates fresh trip service, calls initializeFromStorage ---
    const currentStaples = [
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
      {
        id: 'staple-3',
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ];

    const newTripService = createTrip(storage);
    newTripService.initializeFromStorage(currentStaples);

    // 1. New trip has staples + carryover items
    const items = newTripService.getItems();
    const preloadedItems = items.filter((item) => item.source === 'preloaded');
    const carryoverItems = items.filter((item) => item.source === 'carryover');

    // #96: the carried-over Bread replaces its fresh Undecided copy.
    expect(preloadedItems).toHaveLength(2);
    expect(preloadedItems.map((i) => i.name).sort()).toEqual(['Eggs', 'Milk']);

    expect(carryoverItems).toHaveLength(1);
    expect(carryoverItems[0]!.name).toBe('Bread');
    expect(carryoverItems[0]!.source).toBe('carryover');

    // 2. Total items = 2 fresh staples + 1 carryover = 3, each staple once
    expect(items).toHaveLength(3);

    // 3. Carryover cleared from storage
    expect(storage.loadCarryover()).toHaveLength(0);
  });

  it('app init loads active trip from storage without starting new one', () => {
    const storage = createNullTripStorage();

    // Setup: simulate a previous session with an active (in-progress) trip
    const previousTrip = createTrip(storage);
    previousTrip.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    previousTrip.putInCart(itemIdNamed(previousTrip, 'Milk')); // This persists the trip as active

    // App init: new session
    const newTripService = createTrip(storage);
    newTripService.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // Should load the existing active trip items, not start fresh
    const items = newTripService.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Milk');
    expect(items[0]!.checked).toBe(true);
  });

  it('app init starts fresh trip when no stored trip exists', () => {
    const storage = createNullTripStorage();

    const tripService = createTrip(storage);
    tripService.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);

    // Should start fresh trip with staples
    const items = tripService.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Milk');
    expect(items[0]!.source).toBe('preloaded');
    expect(items[0]!.checked).toBe(false);
  });

  it('finish trip button triggers domain completion', () => {
    // Regression: StoreView must call tripService.complete(), which both
    // categorizes the items and persists the completed trip plus carryover.

    const storage = createNullTripStorage();
    const tripService = createTrip(storage);

    tripService.initializeFromStorage([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        id: 'staple-2',
        name: 'Bread',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Bakery', aisleNumber: 1 },
      },
    ]);

    // #96: staples start Undecided; the sweep marks them Needed.
    tripService.setDecision(itemIdNamed(tripService, 'Milk'), 'needed');
    tripService.setDecision(itemIdNamed(tripService, 'Bread'), 'needed');

    tripService.putInCart(itemIdNamed(tripService, 'Milk'));

    // Simulate what handleFinishTrip SHOULD do: call tripService.complete()
    const result = tripService.complete();

    // The result categorizes items correctly
    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0]!.name).toBe('Milk');
    expect(result.carryoverItems).toHaveLength(1);
    expect(result.carryoverItems[0]!.name).toBe('Bread');

    // CRITICAL: trip is persisted as completed in storage
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('completed');

    // CRITICAL: carryover is saved for unbought items
    const carryover = storage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0]!.name).toBe('Bread');
    expect(carryover[0]!.source).toBe('carryover');
  });
});
