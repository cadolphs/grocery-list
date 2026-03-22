/**
 * Walking Skeleton Acceptance Tests - Grocery Smart List
 *
 * These tests form the outer loop of Outside-In TDD.
 * They exercise driving ports (domain functions + React components)
 * and verify observable user outcomes in business language.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - Domain: staple library functions, trip functions, item grouping functions
 * - UI: React components via @testing-library/react-native
 *
 * Story Trace:
 * - WS-1: US-01 (Add a Staple Item)
 * - WS-2: US-02 (See Pre-Loaded Staples by Area)
 * - WS-3: US-03 (Quick-Add Item)
 * - WS-4: US-04 (Toggle Between Home and Store Views)
 * - WS-5: US-05 (Check Off Items in Store)
 * - WS-6: US-06 (Complete Trip with Carryover)
 */

// --- Driving port imports (to be created during DELIVER wave) ---
// Domain ports:
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { completeTrip } from '../../../src/domain/trip';
import { groupByArea } from '../../../src/domain/item-grouping';
import { groupByAisle } from '../../../src/domain/item-grouping';
import { TripItem } from '../../../src/domain/types';
//
// Null adapters for testing:
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
//
// UI components (for UI-level walking skeleton tests):
// import { render, fireEvent, waitFor } from '@testing-library/react-native';
// import { HomeView } from '../../../src/ui/HomeView';
// import { StoreView } from '../../../src/ui/StoreView';

const DEFAULT_AREAS: readonly string[] = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

// =============================================================================
// WS-1: Add a Staple Item (US-01)
// =============================================================================

describe('WS-1: Add a Staple Item', () => {
  // AC: Items can be created with name, house area, section, optional aisle, and type
  // AC: Staple items persist in the staple library across trips
  // Trace: US-01, AC-1, AC-2

  it('adds a staple item with full metadata to the library', () => {
    // Given Carlos has an empty staple library
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);

    // When Carlos adds "Whole milk" as a staple in "Fridge" area, "Dairy" section, aisle 3
    const result = library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // Then "Whole milk" is saved to the staple library
    expect(result.success).toBe(true);
    const allStaples = library.listAll();
    expect(allStaples).toHaveLength(1);
    expect(allStaples[0].name).toBe('Whole milk');
    expect(allStaples[0].houseArea).toBe('Fridge');
    expect(allStaples[0].storeLocation.section).toBe('Dairy');
    expect(allStaples[0].storeLocation.aisleNumber).toBe(3);
  });

  it('adds a staple item without an aisle number', () => {
    // Given Carlos has an empty staple library
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);

    // When Carlos adds "Rotisserie chicken" as a staple in "Fridge" area, "Deli" section, with no aisle
    const result = library.addStaple({
      name: 'Rotisserie chicken',
      houseArea: 'Fridge',
      storeLocation: { section: 'Deli', aisleNumber: null },
    });

    // Then "Rotisserie chicken" is saved with no aisle assigned
    expect(result.success).toBe(true);
    const staple = library.listAll()[0];
    expect(staple.name).toBe('Rotisserie chicken');
    expect(staple.storeLocation.aisleNumber).toBeNull();
  });

  it('adds a one-off item to the current trip only', () => {
    // Given Carlos has an active trip
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    // When Carlos adds "Birthday candles" as a one-off
    trip.addItem({
      name: 'Birthday candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // Then "Birthday candles" appears on the current trip
    expect(trip.getItems()).toContainEqual(
      expect.objectContaining({ name: 'Birthday candles', itemType: 'one-off' })
    );

    // And "Birthday candles" does not appear in the staple library
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    expect(library.listAll()).not.toContainEqual(
      expect.objectContaining({ name: 'Birthday candles' })
    );
  });

  it('prevents duplicate staple in the same house area', () => {
    // Given "Whole milk" already exists as a staple in "Fridge"
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // When Carlos tries to add "Whole milk" to "Fridge" again
    const result = library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // Then the app prevents the duplicate and shows a message
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ success: false, error: expect.stringContaining('already exists in Fridge') })
    );
    expect(library.listAll()).toHaveLength(1);
  });

  it('allows same item name in different house areas', () => {
    // Given "Hand soap" exists as a staple in "Bathroom"
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Hand soap',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Personal Care', aisleNumber: 7 },
    });

    // When Carlos adds "Hand soap" to "Kitchen Cabinets"
    const result = library.addStaple({
      name: 'Hand soap',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Cleaning', aisleNumber: 9 },
    });

    // Then both entries exist in the staple library
    expect(result.success).toBe(true);
    expect(library.listAll()).toHaveLength(2);
  });
});

// =============================================================================
// WS-2: See Pre-Loaded Staples by Area (US-02)
// =============================================================================

describe('WS-2: See Pre-Loaded Staples by Area', () => {
  // AC: All staples from the library appear pre-loaded when starting a new sweep
  // AC: Staples are grouped by their assigned house area
  // AC: Areas with zero staples are still visible
  // Trace: US-02, AC-1, AC-2, AC-4

  it('pre-loads all staples grouped by house area on new sweep', () => {
    // Given Carlos has staples in the library
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } });
    library.addStaple({ name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } });
    library.addStaple({ name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } });

    // When Carlos starts a new sweep
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    const staples = library.listAll();
    trip.start(staples);

    // Then items are grouped by house area
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    expect(grouped.find(g => g.area === 'Fridge')?.items).toHaveLength(2);
    expect(grouped.find(g => g.area === 'Bathroom')?.items).toHaveLength(2);
    expect(grouped.find(g => g.area === 'Garage Pantry')?.items).toHaveLength(1);
  });

  it('shows all 5 house areas even when some are empty', () => {
    // Given Carlos has staples only in "Fridge" and "Bathroom"
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // When Carlos views the home view
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);

    // Then all 5 house areas are visible
    expect(grouped).toHaveLength(5);
    expect(grouped.find(g => g.area === 'Freezer')?.items).toHaveLength(0);
    expect(grouped.find(g => g.area === 'Kitchen Cabinets')?.items).toHaveLength(0);
    expect(grouped.find(g => g.area === 'Garage Pantry')?.items).toHaveLength(0);
  });

  it('newly added staple appears on next sweep', () => {
    // Given Carlos adds "Oat milk" as a staple during a trip
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Oat milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // When Carlos starts the next sweep
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // Then "Oat milk" appears pre-loaded in "Fridge"
    const fridgeItems = groupByArea(trip.getItems(), DEFAULT_AREAS)
      .find(g => g.area === 'Fridge')?.items;
    expect(fridgeItems).toContainEqual(
      expect.objectContaining({ name: 'Oat milk' })
    );
  });
});

// =============================================================================
// WS-3: Quick-Add Item (US-03)
// =============================================================================

describe('WS-3: Quick-Add Item', () => {
  // AC: Quick-add input accepts item name
  // AC: New items can be assigned house area, section, optional aisle, and type
  // AC: One-off items are trip-scoped only
  // Trace: US-03, AC-1, AC-2, AC-4

  it('quick-adds a new staple item with metadata', () => {
    // Given Carlos has an active trip
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    // When Carlos quick-adds "Canned tomatoes" as a staple
    library.addStaple({
      name: 'Canned tomatoes',
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
    });
    trip.addItem({
      name: 'Canned tomatoes',
      houseArea: 'Garage Pantry',
      storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
      itemType: 'staple',
      source: 'quick-add',
    });

    // Then item appears on trip AND in staple library
    expect(trip.getItems()).toContainEqual(
      expect.objectContaining({ name: 'Canned tomatoes' })
    );
    expect(library.listAll()).toContainEqual(
      expect.objectContaining({ name: 'Canned tomatoes' })
    );
  });

  it('quick-adds a one-off item without adding to staple library', () => {
    // Given Carlos has an active trip
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    // When Carlos quick-adds "Deli turkey" as a one-off
    trip.addItem({
      name: 'Deli turkey',
      houseArea: 'Fridge',
      storeLocation: { section: 'Deli', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // Then item is on the trip but not in the staple library
    expect(trip.getItems()).toContainEqual(
      expect.objectContaining({ name: 'Deli turkey', itemType: 'one-off' })
    );
    expect(library.listAll()).toHaveLength(0);
  });

  it('rejects quick-add without required area', () => {
    // Given Carlos has an active trip
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);

    // When Carlos tries to quick-add without specifying an area
    const result = trip.addItem({
      name: 'Something',
      houseArea: '' as any,
      storeLocation: { section: 'General', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    // Then the item is not added
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ success: false, error: expect.stringContaining('area is required') })
    );
    expect(trip.getItems()).toHaveLength(0);
  });
});

// =============================================================================
// WS-4: Toggle Between Home and Store Views (US-04)
// =============================================================================

describe('WS-4: Toggle Between Home and Store Views', () => {
  // AC: Home view groups items by house area
  // AC: Store view groups items by aisle (ascending) then named sections
  // AC: Only non-empty sections shown in store view
  // AC: Check-off state preserved across view switches
  // Trace: US-04, AC-2, AC-3, AC-4, AC-5

  it('groups items by aisle and section in store view', () => {
    // Given Carlos has trip items with aisle metadata
    const items = [
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 }, itemType: 'staple', checked: false, needed: true },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 }, itemType: 'staple', checked: false, needed: true },
      { name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 }, itemType: 'staple', checked: false, needed: true },
      { name: 'Deli turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null }, itemType: 'one-off', checked: false, needed: true },
    ];

    // When Carlos switches to store view
    const storeGroups = groupByAisle(items as any);

    // Then items are grouped by aisle/section with numbered aisles first
    expect(storeGroups[0].aisleNumber).toBe(3);
    expect(storeGroups[0].section).toBe('Dairy');
    expect(storeGroups[0].items).toHaveLength(2);
    expect(storeGroups[1].aisleNumber).toBe(5);
    expect(storeGroups[1].section).toBe('Canned Goods');
    expect(storeGroups[1].items).toHaveLength(1);
    expect(storeGroups[2].aisleNumber).toBeNull();
    expect(storeGroups[2].section).toBe('Deli');
    expect(storeGroups[2].items).toHaveLength(1);
  });

  it('excludes empty sections from store view', () => {
    // Given Carlos has items only in Dairy and Deli
    const items = [
      { name: 'Whole milk', storeLocation: { section: 'Dairy', aisleNumber: 3 }, needed: true, checked: false },
      { name: 'Deli turkey', storeLocation: { section: 'Deli', aisleNumber: null }, needed: true, checked: false },
    ];

    // When Carlos views store layout
    const storeGroups = groupByAisle(items as any);

    // Then only sections with items are shown
    expect(storeGroups).toHaveLength(2);
  });

  it('preserves check-off state across view toggle', () => {
    // Given Carlos has checked off "Whole milk" in store view
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([{ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }]);
    trip.checkOff('Whole milk');

    // When Carlos views the items (toggle does not change data, only grouping)
    const items = trip.getItems();

    // Then "Whole milk" is still checked off
    const milk = items.find(i => i.name === 'Whole milk');
    expect(milk?.checked).toBe(true);
  });
});

// =============================================================================
// WS-5: Check Off Items in Store (US-05)
// =============================================================================

describe('WS-5: Check Off Items in Store', () => {
  // AC: Tap to check off item, tap again to uncheck
  // AC: Check-off persisted to local storage
  // AC: Full trip state survives app restart
  // AC: Section progress counter updates on check-off
  // Trace: US-05, AC-1, AC-3, AC-4, AC-6

  it('checks off an item and persists the state', () => {
    // Given Carlos has an active trip with "Whole milk"
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([{ name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }]);

    // When Carlos checks off "Whole milk"
    trip.checkOff('Whole milk');

    // Then "Whole milk" shows as in the cart
    const milk = trip.getItems().find(i => i.name === 'Whole milk');
    expect(milk?.checked).toBe(true);

    // And the check-off is persisted to storage
    const loadedTrip = tripStorage.loadTrip();
    const loadedMilk = loadedTrip?.items.find(i => i.name === 'Whole milk');
    expect(loadedMilk?.checked).toBe(true);
  });

  it('unchecks an accidentally checked item', () => {
    // Given Carlos has checked off "Butter"
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([{ name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } }]);
    trip.checkOff('Butter');

    // When Carlos taps "Butter" again
    trip.uncheckItem('Butter');

    // Then "Butter" is unchecked
    const butter = trip.getItems().find(i => i.name === 'Butter');
    expect(butter?.checked).toBe(false);

    // And the uncheck is persisted to storage
    const loadedTrip = tripStorage.loadTrip();
    const loadedButter = loadedTrip?.items.find(i => i.name === 'Butter');
    expect(loadedButter?.checked).toBe(false);
  });

  it('check-off state survives simulated app restart', () => {
    // Given Carlos has checked off 3 items
    const tripStorage = createNullTripStorage();
    const trip1 = createTrip(tripStorage);
    trip1.start([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
    ]);
    trip1.checkOff('Milk');
    trip1.checkOff('Eggs');
    trip1.checkOff('Bread');

    // When the app restarts (simulate by creating new trip instance with same storage)
    const trip2 = createTrip(tripStorage);
    trip2.loadFromStorage();

    // Then all 3 items are still checked off
    const items = trip2.getItems();
    expect(items.filter(i => i.checked)).toHaveLength(3);
  });

  it('section progress updates on check-off', () => {
    // Given Carlos is viewing a section with 4 items — 2 unchecked, 2 checked
    const items = [
      { name: 'Milk', houseArea: 'Fridge' as const, storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: false, needed: true },
      { name: 'Butter', houseArea: 'Fridge' as const, storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: false, needed: true },
      { name: 'Yogurt', houseArea: 'Fridge' as const, storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true, needed: true },
      { name: 'Cheese', houseArea: 'Fridge' as const, storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true, needed: true },
    ];

    // When we compute the store view grouping
    const groups = groupByAisle(items as TripItem[]);
    const dairy = groups.find(g => g.section === 'Dairy');

    // Then progress shows 2 of 4
    expect(dairy?.checkedCount).toBe(2);
    expect(dairy?.totalCount).toBe(4);
  });
});

// =============================================================================
// WS-6: Complete Trip with Carryover (US-06)
// =============================================================================

describe('WS-6: Complete Trip with Carryover', () => {
  // AC: Purchased staples re-queue for next trip automatically
  // AC: Purchased one-offs are cleared permanently
  // AC: Unbought items carry over to next trip
  // AC: No duplicate items created by carryover
  // AC: Staple library is never modified by trip completion
  // Trace: US-06, AC-2, AC-3, AC-4, AC-5, AC-6

  it('bought staples re-queue, bought one-offs clear, unbought carry over', () => {
    // Given Carlos has an active trip with mixed items
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Whole milk', houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    trip.addItem({
      name: 'Birthday candles', houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off', source: 'quick-add',
    });
    trip.addItem({
      name: 'Avocados', houseArea: 'Fridge',
      storeLocation: { section: 'Produce', aisleNumber: null },
      itemType: 'one-off', source: 'quick-add',
    });
    trip.checkOff('Whole milk');
    trip.checkOff('Birthday candles');
    // Avocados left unchecked

    // When Carlos finishes the trip
    const result = completeTrip(trip, library);

    // Then bought staple re-queues (it is in the library, so it will pre-load next trip)
    expect(result.purchasedStaples).toContainEqual(
      expect.objectContaining({ name: 'Whole milk' })
    );
    // And bought one-off is cleared
    expect(result.purchasedOneOffs).toContainEqual(
      expect.objectContaining({ name: 'Birthday candles' })
    );
    // And unbought one-off carries over
    expect(result.unboughtItems).toContainEqual(
      expect.objectContaining({ name: 'Avocados' })
    );

    // Verify next trip has staples + carried-over items
    const nextTrip = createTrip(tripStorage);
    nextTrip.start(library.listAll(), result.unboughtItems);
    const nextItems = nextTrip.getItems();
    expect(nextItems).toContainEqual(expect.objectContaining({ name: 'Whole milk' }));
    expect(nextItems).toContainEqual(expect.objectContaining({ name: 'Avocados' }));
    expect(nextItems).not.toContainEqual(expect.objectContaining({ name: 'Birthday candles' }));
  });

  it('unbought items carry over exactly once without duplicates', () => {
    // Given "Avocados" was carried over from the previous trip
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    const carryover: TripItem[] = [
      { id: 'carry-1', name: 'Avocados', houseArea: 'Fridge', storeLocation: { section: 'Produce', aisleNumber: null }, itemType: 'one-off', stapleId: null, source: 'carryover', needed: true, checked: false, checkedAt: null },
    ];
    trip.start([], carryover);
    // Carlos did not buy "Avocados" again

    // When Carlos finishes the trip
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    const result = completeTrip(trip, library);

    // Then "Avocados" appears once on the next trip
    const nextTrip = createTrip(tripStorage);
    nextTrip.start(library.listAll(), result.unboughtItems);
    const avocadoEntries = nextTrip.getItems().filter(i => i.name === 'Avocados');
    expect(avocadoEntries).toHaveLength(1);
  });

  it('staple library is unchanged after trip completion', () => {
    // Given Carlos has 5 staples in the library
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({ name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } });
    library.addStaple({ name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } });
    library.addStaple({ name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } });
    library.addStaple({ name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } });
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    trip.checkOff('Milk');
    trip.checkOff('Eggs');

    // When Carlos finishes the trip
    completeTrip(trip, library);

    // Then the staple library still contains exactly 5 items
    expect(library.listAll()).toHaveLength(5);
  });

  it('all items bought results in clean next trip with only staples', () => {
    // Given Carlos has checked all items: 3 staples and 2 one-offs
    const staples = [
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: null } },
    ];
    const stapleStorage = createNullStapleStorage(staples);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    trip.addItem({ name: 'Candles', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Baking', aisleNumber: 12 }, itemType: 'one-off', source: 'quick-add' });
    trip.addItem({ name: 'Flowers', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Floral', aisleNumber: null }, itemType: 'one-off', source: 'quick-add' });
    // Check all items
    trip.getItems().forEach(i => trip.checkOff(i.name));

    // When Carlos finishes the trip
    const result = completeTrip(trip, library);

    // Then the next trip has only the 3 staples
    const nextTrip = createTrip(tripStorage);
    nextTrip.start(library.listAll(), result.unboughtItems);
    expect(nextTrip.getItems()).toHaveLength(3);
    expect(nextTrip.getItems().every(i => i.itemType === 'staple')).toBe(true);
  });
});
