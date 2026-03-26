// Trip lifecycle: complete() persists trip and saves carryover items

import { createTrip, completeTrip } from '../../src/domain/trip';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';

describe('Trip lifecycle: complete() persists trip and saves carryover', () => {
  it('complete() marks trip as completed, persists to storage, saves unbought as carryover, returns CompleteTripResult', () => {
    const storage = createNullTripStorage();
    const trip = createTrip(storage);

    trip.start([
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
      source: 'whiteboard',
    });

    // Check off Milk (staple) and Birthday Cake (one-off) — Bread stays unbought
    trip.checkOff('Milk');
    trip.checkOff('Birthday Cake');

    // Complete the trip
    const result = trip.complete();

    // 1. Result categorizes items correctly
    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0].name).toBe('Milk');

    expect(result.purchasedOneOffs).toHaveLength(1);
    expect(result.purchasedOneOffs[0].name).toBe('Birthday Cake');

    expect(result.unboughtItems).toHaveLength(1);
    expect(result.unboughtItems[0].name).toBe('Bread');

    // 2. Trip persisted with status 'completed'
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('completed');

    // 3. Carryover saved — unbought items with source changed to 'carryover'
    const carryover = storage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0].name).toBe('Bread');
    expect(carryover[0].source).toBe('carryover');
  });

  it('new trip loads carryover from completed trip', () => {
    const storage = createNullTripStorage();
    const trip1 = createTrip(storage);

    // Start first trip with two staples
    trip1.start([
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

    // Check off Milk, leave Bread unbought
    trip1.checkOff('Milk');

    // Complete trip — Bread becomes carryover
    trip1.complete();

    // Start a new trip from the same storage
    const trip2 = createTrip(storage);
    trip2.startWithCarryover([
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
    expect(carryoverItems[0].name).toBe('Bread');

    // Staples should also be present
    const stapleItems = items.filter((item) => item.source === 'preloaded');
    expect(stapleItems).toHaveLength(1);
    expect(stapleItems[0].name).toBe('Milk');

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
    trip1.start(staples);

    const trip1Items = trip1.getItems();
    expect(trip1Items).toHaveLength(3);

    // Check off 2 staples (Milk and Bread) — Eggs stays unbought
    trip1.checkOff('Milk');
    trip1.checkOff('Bread');

    // Complete trip 1
    const result = trip1.complete();
    expect(result.purchasedStaples).toHaveLength(2);
    expect(result.unboughtItems).toHaveLength(1);
    expect(result.unboughtItems[0].name).toBe('Eggs');

    // --- Trip 2: start new trip with same staples + carryover ---
    const trip2 = createTrip(storage);
    trip2.startWithCarryover(staples);

    const trip2Items = trip2.getItems();

    // New trip should have 3 staples (preloaded) + 1 carryover item = 4 total
    expect(trip2Items).toHaveLength(4);

    // The 3 staples should appear as preloaded
    const preloadedItems = trip2Items.filter((item) => item.source === 'preloaded');
    expect(preloadedItems).toHaveLength(3);
    expect(preloadedItems.map((i) => i.name).sort()).toEqual(['Bread', 'Eggs', 'Milk']);

    // The 1 carryover item (Eggs) should have source 'carryover'
    const carryoverItems = trip2Items.filter((item) => item.source === 'carryover');
    expect(carryoverItems).toHaveLength(1);
    expect(carryoverItems[0].name).toBe('Eggs');
    expect(carryoverItems[0].source).toBe('carryover');

    // Carryover should be cleared from storage after starting new trip
    const remainingCarryover2 = storage.loadCarryover();
    expect(remainingCarryover2).toHaveLength(0);
  });

  it('app init starts new trip with carryover from completed trip', () => {
    const storage = createNullTripStorage();

    // --- Setup: simulate a previous session that completed a trip ---
    const previousTrip = createTrip(storage);
    previousTrip.start([
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

    // Buy Milk and Eggs, leave Bread unbought
    previousTrip.checkOff('Milk');
    previousTrip.checkOff('Eggs');
    previousTrip.complete();

    // Verify preconditions: storage has completed trip + carryover
    expect(storage.loadTrip()!.status).toBe('completed');
    expect(storage.loadCarryover()).toHaveLength(1);
    expect(storage.loadCarryover()[0].name).toBe('Bread');

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

    expect(preloadedItems).toHaveLength(3);
    expect(preloadedItems.map((i) => i.name).sort()).toEqual(['Bread', 'Eggs', 'Milk']);

    expect(carryoverItems).toHaveLength(1);
    expect(carryoverItems[0].name).toBe('Bread');
    expect(carryoverItems[0].source).toBe('carryover');

    // 2. Total items = 3 staples + 1 carryover = 4
    expect(items).toHaveLength(4);

    // 3. Carryover cleared from storage
    expect(storage.loadCarryover()).toHaveLength(0);
  });

  it('app init loads active trip from storage without starting new one', () => {
    const storage = createNullTripStorage();

    // Setup: simulate a previous session with an active (in-progress) trip
    const previousTrip = createTrip(storage);
    previousTrip.start([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    previousTrip.checkOff('Milk'); // This persists the trip as active

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
    expect(items[0].name).toBe('Milk');
    expect(items[0].checked).toBe(true);
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
    expect(items[0].name).toBe('Milk');
    expect(items[0].source).toBe('preloaded');
    expect(items[0].checked).toBe(false);
  });

  it('finish trip button triggers domain completion', () => {
    // Regression: StoreView must call tripService.complete() (which persists)
    // not the standalone completeTrip() (which only categorizes items).
    // This test documents the contract difference.

    const storage = createNullTripStorage();
    const tripService = createTrip(storage);

    tripService.start([
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

    tripService.checkOff('Milk');

    // Simulate what handleFinishTrip SHOULD do: call tripService.complete()
    const result = tripService.complete();

    // The result categorizes items correctly
    expect(result.purchasedStaples).toHaveLength(1);
    expect(result.purchasedStaples[0].name).toBe('Milk');
    expect(result.unboughtItems).toHaveLength(1);
    expect(result.unboughtItems[0].name).toBe('Bread');

    // CRITICAL: trip is persisted as completed in storage
    const savedTrip = storage.loadTrip();
    expect(savedTrip).not.toBeNull();
    expect(savedTrip!.status).toBe('completed');

    // CRITICAL: carryover is saved for unbought items
    const carryover = storage.loadCarryover();
    expect(carryover).toHaveLength(1);
    expect(carryover[0].name).toBe('Bread');
    expect(carryover[0].source).toBe('carryover');

    // Contrast: standalone completeTrip() does NOT persist
    const storage2 = createNullTripStorage();
    const tripService2 = createTrip(storage2);
    tripService2.start([
      {
        id: 'staple-1',
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    tripService2.checkOff('Milk');

    const stapleLibrary = createStapleLibrary(createNullStapleStorage());
    const standaloneResult = completeTrip(tripService2, stapleLibrary);

    // Standalone function returns correct categorization...
    expect(standaloneResult.purchasedStaples).toHaveLength(1);

    // ...but does NOT persist trip or save carryover
    const savedTrip2 = storage2.loadTrip();
    expect(savedTrip2?.status).not.toBe('completed');
  });
});
