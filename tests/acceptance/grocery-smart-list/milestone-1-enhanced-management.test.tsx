/**
 * Milestone 1: Enhanced Item Management and Navigation
 *
 * All tests in this file are SKIPPED. They should be enabled one at a time
 * after the walking skeleton is complete.
 *
 * Driving Ports:
 * - Domain: staple library functions, trip functions, item grouping, search
 * - UI: React components via @testing-library/react-native
 *
 * Story Trace:
 * - US-07: Mark a Staple Not Needed This Trip
 * - US-08: Navigate Areas During Sweep
 * - US-09: Auto-Suggest from Staple Library
 * - US-10: Navigate Store Sections
 * - US-11: Trip Summary
 */

// --- Driving port imports (to be created during DELIVER wave) ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { groupByArea } from '../../../src/domain/item-grouping';
import { groupBySection } from '../../../src/domain/item-grouping';
// import { searchStaples } from '../../../src/domain/staple-library';
import { createNullLibraryStorage } from '../../../src/adapters/null/null-library-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

const DEFAULT_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

// =============================================================================
// US-07: Mark a Staple Not Needed This Trip
// =============================================================================

describe('US-07: Mark a Staple Not Needed This Trip', () => {
  // AC: Pre-loaded staples can be unchecked to mark them Not needed this trip
  // AC: Unchecking does not remove the item from the staple library
  // AC: Not needed staples reappear on the next trip
  // AC: Not needed staples can be re-added by checking again

  it('marks a staple Not needed without removing from the library', () => {
    // Given "Shampoo" is pre-loaded as a staple in "Bathroom"
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Shampoo',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
      {
        name: 'Toilet paper',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Paper Goods', aisleNumber: 8 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage(library.listAll());
    // #96: staples start Undecided; mark them Needed as a finished sweep would.
    library
      .listAll()
      .forEach((s) => trip.setDecision(itemIdNamed(trip, s.name), 'needed'));

    // When Carlos marks "Shampoo" Not needed for this trip
    trip.setDecision(itemIdNamed(trip, 'Shampoo'), 'not-needed');

    // Then "Shampoo" is removed from the current trip (needed = false)
    const shampoo = trip.getItems().find((i) => i.name === 'Shampoo');
    expect(shampoo?.decision).toBe('not-needed');
    // And "Shampoo" remains in the staple library
    expect(library.listAll()).toContainEqual(
      expect.objectContaining({ name: 'Shampoo' }),
    );
    // And the "Bathroom" needed count decreases
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    const bathroom = grouped.find((g) => g.area === 'Bathroom');
    expect(bathroom?.neededCount).toBe(1);
  });

  it('Not needed staple reappears on next trip', () => {
    // Given Carlos marked "Shampoo" Not needed on the current trip
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Shampoo',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);
    const tripStorage = createNullTripStorage();
    const trip1 = createTrip(tripStorage);
    trip1.initializeFromStorage(library.listAll());
    trip1.setDecision(itemIdNamed(trip1, 'Shampoo'), 'not-needed');
    trip1.complete();

    // When Carlos starts the next sweep
    const trip2 = createTrip(tripStorage);
    trip2.initializeFromStorage(library.listAll());

    // Then "Shampoo" appears pre-loaded again, Undecided for the new sweep (#96)
    const shampoo = trip2
      .getItems()
      .find((i) => i.name === 'Shampoo' && i.source === 'preloaded');
    expect(shampoo?.decision).toBe('undecided');
  });

  it('re-adds a Not needed staple within the same trip', () => {
    // Given Carlos marked "Butter" Not needed in "Fridge"
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage(library.listAll());
    trip.setDecision(itemIdNamed(trip, 'Butter'), 'not-needed');

    // When Carlos re-adds "Butter"
    trip.setDecision(itemIdNamed(trip, 'Butter'), 'needed');

    // Then "Butter" is back on the current trip
    const butter = trip.getItems().find((i) => i.name === 'Butter');
    expect(butter?.decision).toBe('needed');
  });

  it('mark multiple staples Not needed across different areas', () => {
    // Given Carlos has staples in Bathroom and Fridge
    const libraryStorage = createNullLibraryStorage([
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
      {
        name: 'TP',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Paper Goods', aisleNumber: 8 },
      },
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
      {
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Cheese',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage(library.listAll());
    // #96: staples start Undecided; mark them Needed as a finished sweep would.
    library
      .listAll()
      .forEach((s) => trip.setDecision(itemIdNamed(trip, s.name), 'needed'));

    // When Carlos marks 1 in Bathroom and 2 in Fridge Not needed
    trip.setDecision(itemIdNamed(trip, 'Shampoo'), 'not-needed');
    trip.setDecision(itemIdNamed(trip, 'Butter'), 'not-needed');
    trip.setDecision(itemIdNamed(trip, 'Eggs'), 'not-needed');

    // Then area counts reflect the Not needed staples
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    expect(grouped.find((g) => g.area === 'Bathroom')?.neededCount).toBe(2);
    expect(grouped.find((g) => g.area === 'Fridge')?.neededCount).toBe(2);
  });
});

// =============================================================================
// US-08: Navigate Areas During Sweep
// =============================================================================

describe('US-08: Navigate Areas During Sweep', () => {
  // AC: Each area can be marked as complete
  // AC: Progress shows completed vs remaining areas
  // AC: Areas can be visited in any order

  it('marks an area as complete and shows sweep progress', () => {
    // Given Carlos is sweeping with items in Bathroom
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
      {
        name: 'TP',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Paper Goods', aisleNumber: 8 },
      },
    ]);
    // Completion is derived (#95): Bathroom is incomplete while it holds
    // Undecided staples; the empty areas already count as complete.
    const before = trip.getSweepProgress();

    // When Carlos marks "Bathroom" as done
    trip.markAreaDone('Bathroom');

    // Then Bathroom joins the complete areas
    const progress = trip.getSweepProgress();
    expect(before.completedAreas).not.toContain('Bathroom');
    expect(before.completedCount).toBe(4);
    expect(progress.completedAreas).toContain('Bathroom');
    expect(progress.completedCount).toBe(5);
    expect(progress.totalAreas).toBe(5);
  });

  it('allows navigating areas out of order', () => {
    // Given trip with items in multiple areas
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Shampoo',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
      {
        name: 'Ice cream',
        houseArea: 'Freezer',
        storeLocation: { section: 'Frozen', aisleNumber: null },
      },
    ]);
    trip.markAreaDone('Freezer');

    // When Carlos goes back to Bathroom (skipping suggested order)
    trip.markAreaDone('Bathroom');

    // Then both areas are complete, no progress lost
    const progress = trip.getSweepProgress();
    expect(progress.completedAreas).toContain('Bathroom');
    expect(progress.completedAreas).toContain('Freezer');
    expect(progress.allAreasComplete).toBe(true);
  });

  it('all areas complete triggers whiteboard consolidation', () => {
    // Given Carlos has completed all 5 house areas
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([]);
    [
      'Bathroom',
      'Garage Pantry',
      'Kitchen Cabinets',
      'Fridge',
      'Freezer',
    ].forEach((area) => trip.markAreaDone(area));

    // When Carlos checks sweep progress
    const progress = trip.getSweepProgress();

    // Then all areas are complete and whiteboard step is available
    expect(progress.completedCount).toBe(5);
    expect(progress.allAreasComplete).toBe(true);
  });

  it('area item count updates when items are added during sweep', () => {
    // Given Carlos is sweeping Kitchen Cabinets with 2 pre-loaded staples
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.initializeFromStorage([
      {
        name: 'Cereal',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Breakfast', aisleNumber: 2 },
      },
      {
        name: 'Pasta',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Pasta', aisleNumber: 4 },
      },
    ]);

    // When Carlos quick-adds 1 new item to Kitchen Cabinets
    trip.addItem({
      name: 'Rice',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Rice', aisleNumber: 4 },
      itemType: 'staple',
      source: 'quick-add',
    });

    // Then Kitchen Cabinets shows 3 items
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    const kc = grouped.find((g) => g.area === 'Kitchen Cabinets');
    expect(kc?.totalCount).toBe(3);
  });
});

// =============================================================================
// US-09: Auto-Suggest from Staple Library
// =============================================================================

describe('US-09: Auto-Suggest from Staple Library', () => {
  // AC: Type-ahead suggestions appear within 300ms
  // AC: Suggestions show item name, section, and aisle
  // AC: Tapping suggestion adds item with all metadata
  // AC: No suggestions when no match exists

  it('suggests known staples by name prefix', () => {
    // Given "Greek yogurt" is in the staple library
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Greek yogurt',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Green beans',
        houseArea: 'Garage Pantry',
        storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);

    // When Carlos types "gre"
    const suggestions = library.search('gre');

    // Then matching staples appear
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]!.name).toBe('Greek yogurt');
  });

  it('returns no suggestions for unknown item', () => {
    // Given staple library has items but not "Birthday candles"
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Greek yogurt',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);

    // When Carlos types "birthday candles"
    const suggestions = library.search('birthday candles');

    // Then no suggestions appear
    expect(suggestions).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    // Given "Greek yogurt" is in the staple library
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Greek yogurt',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);

    // When Carlos types "GREEK"
    const suggestions = library.search('GREEK');

    // Then "Greek yogurt" appears
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.name).toBe('Greek yogurt');
  });

  it('multiple suggestions for partial match', () => {
    // Given multiple items starting with "ch"
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Cheddar cheese',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Chicken breast',
        houseArea: 'Fridge',
        storeLocation: { section: 'Meat', aisleNumber: 6 },
      },
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);

    // When Carlos types "ch"
    const suggestions = library.search('ch');

    // Then both "ch" items appear, but not "Milk"
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((s) => s.name)).toContain('Cheddar cheese');
    expect(suggestions.map((s) => s.name)).toContain('Chicken breast');
  });

  it('empty input returns no suggestions', () => {
    const libraryStorage = createNullLibraryStorage([
      {
        name: 'Greek yogurt',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const library = createStapleLibrary(libraryStorage);

    // When the quick-add field is empty
    const suggestions = library.search('');

    // Then no suggestions are shown
    expect(suggestions).toHaveLength(0);
  });
});

// =============================================================================
// US-10: Navigate Store Sections
// =============================================================================

describe('US-10: Navigate Store Sections', () => {
  // AC: "Next" button navigates to the next non-empty section
  // AC: "Move on" allows leaving a section with unchecked items
  // AC: Section list shows completion status

  it('determines next section in store order', () => {
    // Given items across multiple store sections
    const items = [
      {
        name: 'Milk',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
        inCart: true,
      },
      {
        name: 'Butter',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
        inCart: true,
      },
      {
        name: 'Beans',
        storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
        inCart: false,
      },
    ];
    const groups = groupBySection(items as any);

    // When all Dairy items are checked
    const dairyComplete = groups[0]!.inCartCount === groups[0]!.totalCount;

    // Then the next section is Canned Goods
    expect(dairyComplete).toBe(true);
    expect(groups[1]!.section).toBe('Canned Goods');
  });

  it('section progress reflects partial completion', () => {
    // Given Produce has 3 of 4 items checked
    const items = [
      {
        name: 'Apples',
        storeLocation: { section: 'Produce', aisleNumber: null },
        inCart: true,
      },
      {
        name: 'Bananas',
        storeLocation: { section: 'Produce', aisleNumber: null },
        inCart: true,
      },
      {
        name: 'Oranges',
        storeLocation: { section: 'Produce', aisleNumber: null },
        inCart: true,
      },
      {
        name: 'Avocados',
        storeLocation: { section: 'Produce', aisleNumber: null },
        inCart: false,
      },
    ];

    // When we compute the store grouping
    const groups = groupBySection(items as any);
    const produce = groups.find((g) => g.section === 'Produce');

    // Then Produce shows 3 of 4
    expect(produce?.inCartCount).toBe(3);
    expect(produce?.totalCount).toBe(4);
  });

  it('section list shows completion badges', () => {
    // Given Carlos has completed 2 of 3 sections
    const items = [
      {
        name: 'Milk',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
        inCart: true,
      },
      {
        name: 'Beans',
        storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
        inCart: true,
      },
      {
        name: 'Turkey',
        storeLocation: { section: 'Deli', aisleNumber: null },
        inCart: false,
      },
    ];

    // When we compute the store grouping
    const groups = groupBySection(items as any);

    // Then completed sections are identifiable
    const completed = groups.filter((g) => g.inCartCount === g.totalCount);
    expect(completed).toHaveLength(2);
    const incomplete = groups.filter((g) => g.inCartCount < g.totalCount);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]!.section).toBe('Deli');
  });

  it('all sections complete enables trip completion', () => {
    // Given all sections are complete
    const items = [
      {
        name: 'Milk',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
        inCart: true,
      },
      {
        name: 'Beans',
        storeLocation: { section: 'Canned Goods', aisleNumber: 5 },
        inCart: true,
      },
    ];
    const groups = groupBySection(items as any);

    // When we check if all sections are complete
    const allComplete = groups.every((g) => g.inCartCount === g.totalCount);

    // Then trip completion is available
    expect(allComplete).toBe(true);
  });
});

// =============================================================================
// US-11: Trip Summary
// =============================================================================

describe('US-11: Trip Summary', () => {
  it.todo('summary offers store view transition');
  // Sketch of the pending test:
  // This would be a UI-level test with React Testing Library
  // Given the trip summary is rendered
  // const { getByText } = render(<TripSummary trip={trip} />);
  // Then "Switch to Store View" is available
  // expect(getByText('Switch to Store View')).toBeTruthy();
});
