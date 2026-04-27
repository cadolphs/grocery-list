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
 * - US-07: Skip Staple This Trip
 * - US-08: Navigate Areas During Sweep
 * - US-09: Auto-Suggest from Staple Library
 * - US-10: Navigate Store Sections
 * - US-11: Trip Summary
 */

// --- Driving port imports (to be created during DELIVER wave) ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip, completeTrip } from '../../../src/domain/trip';
import { groupByArea } from '../../../src/domain/item-grouping';
import { groupBySection } from '../../../src/domain/item-grouping';
// import { searchStaples } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

const DEFAULT_AREAS: readonly string[] = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

// =============================================================================
// US-07: Skip Staple This Trip
// =============================================================================

describe('US-07: Skip Staple This Trip', () => {
  // AC: Pre-loaded staples can be unchecked to skip this trip
  // AC: Unchecking does not remove the item from the staple library
  // AC: Skipped staples reappear on the next trip
  // AC: Skipped staples can be re-added by checking again

  it('skips a staple without removing from the library', () => {
    // Given "Shampoo" is pre-loaded as a staple in "Bathroom"
    const stapleStorage = createNullStapleStorage([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // When Carlos skips "Shampoo" for this trip
    trip.skipItem('Shampoo');

    // Then "Shampoo" is removed from the current trip (needed = false)
    const shampoo = trip.getItems().find(i => i.name === 'Shampoo');
    expect(shampoo?.needed).toBe(false);
    // And "Shampoo" remains in the staple library
    expect(library.listAll()).toContainEqual(
      expect.objectContaining({ name: 'Shampoo' })
    );
    // And the "Bathroom" needed count decreases
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    const bathroom = grouped.find(g => g.area === 'Bathroom');
    expect(bathroom?.neededCount).toBe(1);
  });

  it('skipped staple reappears on next trip', () => {
    // Given Carlos skipped "Shampoo" on the current trip
    const stapleStorage = createNullStapleStorage([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip1 = createTrip(tripStorage);
    trip1.start(library.listAll());
    trip1.skipItem('Shampoo');
    completeTrip(trip1, library);

    // When Carlos starts the next sweep
    const trip2 = createTrip(tripStorage);
    trip2.start(library.listAll());

    // Then "Shampoo" appears pre-loaded again with needed = true
    const shampoo = trip2.getItems().find(i => i.name === 'Shampoo');
    expect(shampoo?.needed).toBe(true);
  });

  it('re-adds a skipped staple within the same trip', () => {
    // Given Carlos skipped "Butter" in "Fridge"
    const stapleStorage = createNullStapleStorage([
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    trip.skipItem('Butter');

    // When Carlos re-adds "Butter"
    trip.unskipItem('Butter');

    // Then "Butter" is back on the current trip
    const butter = trip.getItems().find(i => i.name === 'Butter');
    expect(butter?.needed).toBe(true);
  });

  it('skip multiple staples across different areas', () => {
    // Given Carlos has staples in Bathroom and Fridge
    const stapleStorage = createNullStapleStorage([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'Soap', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'TP', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Cheese', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // When Carlos skips 1 in Bathroom and 2 in Fridge
    trip.skipItem('Shampoo');
    trip.skipItem('Butter');
    trip.skipItem('Eggs');

    // Then area counts reflect skips
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    expect(grouped.find(g => g.area === 'Bathroom')?.neededCount).toBe(2);
    expect(grouped.find(g => g.area === 'Fridge')?.neededCount).toBe(2);
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
    trip.start([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'Soap', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'TP', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
    ]);

    // When Carlos marks "Bathroom" as done
    trip.completeArea('Bathroom');

    // Then progress shows 1 of 5 areas complete
    const progress = trip.getSweepProgress();
    expect(progress.completedAreas).toContain('Bathroom');
    expect(progress.completedCount).toBe(1);
    expect(progress.totalAreas).toBe(5);
  });

  it('allows navigating areas out of order', () => {
    // Given trip with items in multiple areas
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([
      { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
      { name: 'Ice cream', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: null } },
    ]);
    trip.completeArea('Bathroom');

    // When Carlos jumps to Freezer (skipping suggested order)
    trip.completeArea('Freezer');

    // Then both areas are complete, no progress lost
    const progress = trip.getSweepProgress();
    expect(progress.completedAreas).toContain('Bathroom');
    expect(progress.completedAreas).toContain('Freezer');
    expect(progress.completedCount).toBe(2);
  });

  it('all areas complete triggers whiteboard consolidation', () => {
    // Given Carlos has completed all 5 house areas
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);
    ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer']
      .forEach(area => trip.completeArea(area));

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
    trip.start([
      { name: 'Cereal', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Breakfast', aisleNumber: 2 } },
      { name: 'Pasta', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Pasta', aisleNumber: 4 } },
    ]);

    // When Carlos quick-adds 1 new item to Kitchen Cabinets
    trip.addItem({
      name: 'Rice', houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Rice', aisleNumber: 4 },
      itemType: 'staple', source: 'quick-add',
    });

    // Then Kitchen Cabinets shows 3 items
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);
    const kc = grouped.find(g => g.area === 'Kitchen Cabinets');
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
    const stapleStorage = createNullStapleStorage([
      { name: 'Greek yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Green beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

    // When Carlos types "gre"
    const suggestions = library.search('gre');

    // Then matching staples appear
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].name).toBe('Greek yogurt');
  });

  it('returns no suggestions for unknown item', () => {
    // Given staple library has items but not "Birthday candles"
    const stapleStorage = createNullStapleStorage([
      { name: 'Greek yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

    // When Carlos types "birthday candles"
    const suggestions = library.search('birthday candles');

    // Then no suggestions appear
    expect(suggestions).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    // Given "Greek yogurt" is in the staple library
    const stapleStorage = createNullStapleStorage([
      { name: 'Greek yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

    // When Carlos types "GREEK"
    const suggestions = library.search('GREEK');

    // Then "Greek yogurt" appears
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].name).toBe('Greek yogurt');
  });

  it('multiple suggestions for partial match', () => {
    // Given multiple items starting with "ch"
    const stapleStorage = createNullStapleStorage([
      { name: 'Cheddar cheese', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Chicken breast', houseArea: 'Fridge', storeLocation: { section: 'Meat', aisleNumber: 6 } },
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

    // When Carlos types "ch"
    const suggestions = library.search('ch');

    // Then both "ch" items appear, but not "Milk"
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map(s => s.name)).toContain('Cheddar cheese');
    expect(suggestions.map(s => s.name)).toContain('Chicken breast');
  });

  it('empty input returns no suggestions', () => {
    const stapleStorage = createNullStapleStorage([
      { name: 'Greek yogurt', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);

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
      { name: 'Milk', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true },
      { name: 'Butter', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true },
      { name: 'Beans', storeLocation: { section: 'Canned Goods', aisleNumber: 5 }, checked: false },
    ];
    const groups = groupBySection(items as any);

    // When all Dairy items are checked
    const dairyComplete = groups[0].checkedCount === groups[0].totalCount;

    // Then the next section is Canned Goods
    expect(dairyComplete).toBe(true);
    expect(groups[1].section).toBe('Canned Goods');
  });

  it('section progress reflects partial completion', () => {
    // Given Produce has 3 of 4 items checked
    const items = [
      { name: 'Apples', storeLocation: { section: 'Produce', aisleNumber: null }, checked: true },
      { name: 'Bananas', storeLocation: { section: 'Produce', aisleNumber: null }, checked: true },
      { name: 'Oranges', storeLocation: { section: 'Produce', aisleNumber: null }, checked: true },
      { name: 'Avocados', storeLocation: { section: 'Produce', aisleNumber: null }, checked: false },
    ];

    // When we compute the store grouping
    const groups = groupBySection(items as any);
    const produce = groups.find(g => g.section === 'Produce');

    // Then Produce shows 3 of 4
    expect(produce?.checkedCount).toBe(3);
    expect(produce?.totalCount).toBe(4);
  });

  it('section list shows completion badges', () => {
    // Given Carlos has completed 2 of 3 sections
    const items = [
      { name: 'Milk', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true },
      { name: 'Beans', storeLocation: { section: 'Canned Goods', aisleNumber: 5 }, checked: true },
      { name: 'Turkey', storeLocation: { section: 'Deli', aisleNumber: null }, checked: false },
    ];

    // When we compute the store grouping
    const groups = groupBySection(items as any);

    // Then completed sections are identifiable
    const completed = groups.filter(g => g.checkedCount === g.totalCount);
    expect(completed).toHaveLength(2);
    const incomplete = groups.filter(g => g.checkedCount < g.totalCount);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].section).toBe('Deli');
  });

  it('all sections complete enables trip completion', () => {
    // Given all sections are complete
    const items = [
      { name: 'Milk', storeLocation: { section: 'Dairy', aisleNumber: 3 }, checked: true },
      { name: 'Beans', storeLocation: { section: 'Canned Goods', aisleNumber: 5 }, checked: true },
    ];
    const groups = groupBySection(items as any);

    // When we check if all sections are complete
    const allComplete = groups.every(g => g.checkedCount === g.totalCount);

    // Then trip completion is available
    expect(allComplete).toBe(true);
  });
});

// =============================================================================
// US-11: Trip Summary
// =============================================================================

describe('US-11: Trip Summary', () => {
  // AC: Trip summary shows total item count
  // AC: Breakdown by source (sweep vs whiteboard)
  // AC: Breakdown by type (staple vs one-off)
  // AC: Prep time displayed

  it('shows trip summary with item breakdown', () => {
    // Given Carlos completed sweep with 19 items and 3 from whiteboard
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    // Simulate 19 sweep items (17 staples + 2 one-offs) and 3 whiteboard items (3 one-offs)
    const sweepStaples = Array.from({ length: 17 }, (_, i) => ({
      name: `Staple ${i}`, houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: 1 },
    }));
    const sweepOneOffs: Array<{ name: string; houseArea: 'Fridge'; storeLocation: { section: string; aisleNumber: number }; itemType: 'one-off'; source: 'quick-add' }> = Array.from({ length: 2 }, (_, i) => ({
      name: `SweepOneOff ${i}`, houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: 1 },
      itemType: 'one-off' as const, source: 'quick-add' as const,
    }));
    const whiteboardItems: Array<{ name: string; houseArea: 'Kitchen Cabinets'; storeLocation: { section: string; aisleNumber: number }; itemType: 'one-off'; source: 'whiteboard' }> = Array.from({ length: 3 }, (_, i) => ({
      name: `Whiteboard ${i}`, houseArea: 'Kitchen Cabinets' as const,
      storeLocation: { section: 'General', aisleNumber: 2 },
      itemType: 'one-off' as const, source: 'whiteboard' as const,
    }));
    // Start trip and add items
    trip.start(sweepStaples);
    sweepOneOffs.forEach(i => trip.addItem(i));
    whiteboardItems.forEach(i => trip.addItem(i));

    // When Carlos views the trip summary
    const summary = trip.getSummary();

    // Then it shows correct totals and breakdowns
    expect(summary.totalItems).toBe(22);
    expect(summary.stapleCount).toBe(17);
    expect(summary.oneOffCount).toBe(5);
    expect(summary.sweepCount).toBe(19);
    expect(summary.whiteboardCount).toBe(3);
  });

  it('displays prep time', () => {
    // Given Carlos started the sweep 4 minutes ago
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start([]);
    // Simulate 4 minutes elapsed by setting startedAt in the past
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
    trip.setStartTime(fourMinutesAgo); // test helper

    // When Carlos views the trip summary
    const summary = trip.getSummary();

    // Then prep time shows approximately 4 minutes
    expect(summary.prepTimeMinutes).toBeGreaterThanOrEqual(3);
    expect(summary.prepTimeMinutes).toBeLessThanOrEqual(5);
  });

  it('summary reflects skipped staples', () => {
    // Given Carlos started with 21 staples and skipped 3, added 2 one-offs
    const staples = Array.from({ length: 21 }, (_, i) => ({
      name: `Staple ${i}`, houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: 1 },
    }));
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(staples);
    trip.skipItem('Staple 0');
    trip.skipItem('Staple 1');
    trip.skipItem('Staple 2');
    trip.addItem({
      name: 'OneOff A', houseArea: 'Fridge',
      storeLocation: { section: 'General', aisleNumber: 1 },
      itemType: 'one-off', source: 'quick-add',
    });
    trip.addItem({
      name: 'OneOff B', houseArea: 'Fridge',
      storeLocation: { section: 'General', aisleNumber: 1 },
      itemType: 'one-off', source: 'quick-add',
    });

    // When Carlos views the summary (only needed items count)
    const summary = trip.getSummary();

    // Then 20 total items (18 staples + 2 one-offs)
    expect(summary.totalItems).toBe(20);
  });

  it.skip('summary offers store view transition', () => {
    // This would be a UI-level test with React Testing Library
    // Given the trip summary is rendered
    // const { getByText } = render(<TripSummary trip={trip} />);

    // Then "Switch to Store View" is available
    // expect(getByText('Switch to Store View')).toBeTruthy();
  });
});
