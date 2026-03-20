/**
 * Walking Skeleton Acceptance Tests - Custom House Areas
 *
 * These tests form the outer loop of Outside-In TDD.
 * They exercise driving ports (domain functions + area management)
 * and verify observable user outcomes in business language.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - Domain: createAreaManagement, validateAreaName, groupByArea, createTrip
 * - Domain: createStapleLibrary (existing)
 * - Null adapters: createNullAreaStorage, createNullStapleStorage, createNullTripStorage
 *
 * Story Trace:
 * - WS-1 through WS-5: US-CHA-03 (Dynamic Area Consumption -- riskiest first)
 * - WS-6 through WS-7: US-CHA-01 (View Area List in Settings)
 * - WS-8 through WS-9: US-CHA-02 (Add a New Area)
 *
 * Implementation Sequence (riskiest first):
 *   1. groupByArea with custom areas (de-risks cross-cutting type change)
 *   2. getSweepProgress with dynamic area count
 *   3. Area management: add a new area
 *   4. New area in groupByArea output
 *   5. Default area seeding
 *   6-7. Settings screen (UI-level, after domain is stable)
 *   8-9. Add area from settings (UI-level)
 */

// --- Driving port imports (to be created during DELIVER wave) ---

// Domain ports:
import { groupByArea } from '../../../src/domain/item-grouping';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
// NEW domain ports:
import { createAreaManagement } from '../../../src/domain/area-management';

// Null adapters:
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
// NEW null adapter:
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';

// UI components (for UI-level walking skeleton tests):
// import { render, fireEvent, waitFor } from '@testing-library/react-native';
// import { ServiceProvider } from '../../../src/ui/ServiceProvider';
// import { AppShell } from '../../../src/ui/AppShell';

const DEFAULT_AREAS = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

// =============================================================================
// WS-CHA-03: Dynamic Area Consumption (US-CHA-03 -- riskiest first)
// =============================================================================
// De-risks the cross-cutting type change: HouseArea union -> string,
// groupByArea accepts area list parameter, getSweepProgress uses dynamic count.

describe('WS-CHA-03: groupByArea uses custom area list', () => {
  // AC: groupByArea accepts area list as parameter (no hardcoded constant)
  // AC: All existing behavior preserved when using the 5 default areas
  // Trace: US-CHA-03, AC-1

  it('returns groups for custom areas including a user-added area', () => {
    // Given Carlos has configured 6 areas including "Laundry Room"
    const customAreas = [...DEFAULT_AREAS, 'Laundry Room'];

    // And Carlos has staples in "Laundry Room" and "Fridge"
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Detergent',
      houseArea: 'Laundry Room',
      storeLocation: { section: 'Cleaning', aisleNumber: 9 },
    });
    library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // When Carlos starts a new sweep
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());

    // Then the home view shows 6 area sections
    const grouped = groupByArea(trip.getItems(), customAreas);
    expect(grouped).toHaveLength(6);

    // And "Laundry Room" contains detergent
    const laundry = grouped.find(g => g.area === 'Laundry Room');
    expect(laundry?.items).toHaveLength(1);
    expect(laundry?.items[0].name).toBe('Detergent');

    // And "Fridge" contains milk
    const fridge = grouped.find(g => g.area === 'Fridge');
    expect(fridge?.items).toHaveLength(1);
    expect(fridge?.items[0].name).toBe('Whole milk');
  });

  it('preserves existing behavior with default 5 areas', () => {
    // Given Carlos has staples in the default areas only
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });
    library.addStaple({
      name: 'Shampoo',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Personal Care', aisleNumber: 7 },
    });

    // When Carlos starts a new sweep with the default area list
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    const grouped = groupByArea(trip.getItems(), DEFAULT_AREAS);

    // Then all 5 default areas are present
    expect(grouped).toHaveLength(5);
    expect(grouped.find(g => g.area === 'Fridge')?.items).toHaveLength(1);
    expect(grouped.find(g => g.area === 'Bathroom')?.items).toHaveLength(1);
    expect(grouped.find(g => g.area === 'Freezer')?.items).toHaveLength(0);
  });

  it('shows empty groups for areas with no items', () => {
    // Given Carlos has 6 areas but staples only in "Fridge"
    const customAreas = [...DEFAULT_AREAS, 'Laundry Room'];
    const stapleStorage = createNullStapleStorage();
    const library = createStapleLibrary(stapleStorage);
    library.addStaple({
      name: 'Whole milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    // When Carlos starts a sweep
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage);
    trip.start(library.listAll());
    const grouped = groupByArea(trip.getItems(), customAreas);

    // Then all 6 areas are present, 5 with empty items
    expect(grouped).toHaveLength(6);
    expect(grouped.find(g => g.area === 'Laundry Room')?.items).toHaveLength(0);
    expect(grouped.find(g => g.area === 'Bathroom')?.items).toHaveLength(0);
  });
});

describe('WS-CHA-03: Sweep progress uses dynamic area count', () => {
  // AC: getSweepProgress uses dynamic area count (no hardcoded constant)
  // Trace: US-CHA-03, AC-2

  it('shows progress out of 6 when Carlos has 6 areas', () => {
    // Given Carlos has 6 configured areas
    const customAreas = [...DEFAULT_AREAS, 'Laundry Room'];
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage, customAreas);
    trip.start([]);

    // When Carlos completes "Bathroom"
    trip.completeArea('Bathroom');

    // Then sweep progress shows 1 of 6
    const progress = trip.getSweepProgress();
    expect(progress.completedCount).toBe(1);
    expect(progress.totalAreas).toBe(6);
    expect(progress.allAreasComplete).toBe(false);
  });

  it('all-areas-complete triggers only after completing all 6', () => {
    // Given Carlos has 6 areas and completes 5
    const customAreas = [...DEFAULT_AREAS, 'Laundry Room'];
    const tripStorage = createNullTripStorage();
    const trip = createTrip(tripStorage, customAreas);
    trip.start([]);
    DEFAULT_AREAS.forEach(area => trip.completeArea(area));

    // When Carlos has not yet completed "Laundry Room"
    const progress = trip.getSweepProgress();

    // Then all-areas-complete is false
    expect(progress.completedCount).toBe(5);
    expect(progress.allAreasComplete).toBe(false);

    // When Carlos completes "Laundry Room"
    trip.completeArea('Laundry Room');
    const finalProgress = trip.getSweepProgress();

    // Then all-areas-complete is true
    expect(finalProgress.completedCount).toBe(6);
    expect(finalProgress.allAreasComplete).toBe(true);
  });
});

describe('WS-CHA-03: Area management adds a new area', () => {
  // AC: New area created with a user-provided name
  // AC: New area appended to end of area list by default
  // Trace: US-CHA-02, AC-1, AC-2

  it('adds a new area that persists in the area list', () => {
    // Given Carlos has the 5 default areas
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos adds "Laundry Room"
    const result = areaManagement.add('Laundry Room');

    // Then the area list contains 6 areas
    expect(result.success).toBe(true);
    const areas = areaManagement.getAreas();
    expect(areas).toHaveLength(6);

    // And "Laundry Room" is at the end
    expect(areas[5]).toBe('Laundry Room');
  });

  it('rejects adding a duplicate area name', () => {
    // Given "Bathroom" already exists
    const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    const stapleStorage = createNullStapleStorage();
    const tripStorage = createNullTripStorage();
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    // When Carlos tries to add "Bathroom" again
    const result = areaManagement.add('Bathroom');

    // Then the add is rejected
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already exists');
    }
    expect(areaManagement.getAreas()).toHaveLength(5);
  });
});

describe('WS-CHA-03: New area appears in groupByArea', () => {
  // AC: New area immediately available in home view
  // Trace: US-CHA-02, AC-3 + US-CHA-03, AC-1

  it.skip('newly added area shows items in groupByArea', () => {
    // Given Carlos has added "Laundry Room" to his areas
    // const areaStorage = createNullAreaStorage(DEFAULT_AREAS);
    // const stapleStorage = createNullStapleStorage();
    // const tripStorage = createNullTripStorage();
    // const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
    // areaManagement.add('Laundry Room');

    // And Carlos adds "Detergent" as a staple in "Laundry Room"
    // const library = createStapleLibrary(stapleStorage);
    // library.addStaple({
    //   name: 'Detergent',
    //   houseArea: 'Laundry Room',
    //   storeLocation: { section: 'Cleaning', aisleNumber: 9 },
    // });

    // When Carlos starts a new sweep
    // const trip = createTrip(tripStorage, areaManagement.getAreas());
    // trip.start(library.listAll());

    // Then "Laundry Room" appears as a group with "Detergent" pre-loaded
    // const grouped = groupByArea(trip.getItems(), areaManagement.getAreas());
    // const laundry = grouped.find(g => g.area === 'Laundry Room');
    // expect(laundry?.items).toHaveLength(1);
    // expect(laundry?.items[0].name).toBe('Detergent');
  });
});

describe('WS-CHA-03: Default areas seeded on fresh install', () => {
  // AC: Fresh install shows 5 default areas
  // Trace: US-CHA-01, AC-5

  it.skip('loads the 5 default areas on a brand new installation', () => {
    // Given a brand new app with no prior area data
    // const areaStorage = createNullAreaStorage();

    // When the area list is loaded
    // const areas = areaStorage.loadAll();

    // Then it contains the 5 defaults in order
    // expect(areas).toEqual(['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer']);
  });
});

// =============================================================================
// WS-CHA-01: View Area List in Settings (US-CHA-01 -- UI level)
// =============================================================================
// These tests require React rendering. Enable after domain tests pass.

// describe('WS-CHA-01: Settings screen shows area list', () => {
//   // AC: Settings icon visible on the home view
//   // AC: Area list displays all configured areas in order
//   // Trace: US-CHA-01, AC-1, AC-2
//
//   it.skip('displays all configured areas in settings', () => {
//     // Given Carlos has 6 areas including "Laundry Room"
//     // const areaStorage = createNullAreaStorage([...DEFAULT_AREAS, 'Laundry Room']);
//     // const stapleStorage = createNullStapleStorage();
//     // const tripStorage = createNullTripStorage();
//     // const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
//     // const library = createStapleLibrary(stapleStorage);
//     // const trip = createTrip(tripStorage, areaManagement.getAreas());
//     //
//     // When Carlos opens area settings
//     // render(
//     //   <ServiceProvider
//     //     stapleLibrary={library}
//     //     tripService={trip}
//     //     areaManagement={areaManagement}
//     //   >
//     //     <AppShell />
//     //   </ServiceProvider>
//     // );
//     // fireEvent.press(screen.getByLabelText('Settings'));
//     //
//     // Then all 6 areas are displayed
//     // await waitFor(() => {
//     //   expect(screen.getByText('Bathroom')).toBeTruthy();
//     //   expect(screen.getByText('Laundry Room')).toBeTruthy();
//     // });
//   });
//
//   it.skip('fresh install settings shows 5 default areas', () => {
//     // Given Ana Lucia has just installed the app
//     // When Ana Lucia opens area settings
//     // Then she sees 5 areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer
//   });
// });

// =============================================================================
// WS-CHA-02: Add Area from Settings (US-CHA-02 -- UI level)
// =============================================================================
// These tests require React rendering. Enable after domain tests pass.

// describe('WS-CHA-02: Add area from settings', () => {
//   // AC: New area immediately available in home view, area picker, and sweep progress
//   // Trace: US-CHA-02, AC-3
//
//   it.skip('new area appears in home view after adding from settings', () => {
//     // Given Ana Lucia has the 5 default areas
//     // When Ana Lucia adds "Laundry Room" from the area settings
//     // Then "Laundry Room" appears in the home view with 0 staples due
//     // And sweep progress shows 0 of 6 areas complete
//   });
//
//   it.skip('staple added to new area appears on next sweep', () => {
//     // Given Ana Lucia has added "Laundry Room"
//     // When Ana Lucia adds "Detergent" as a staple in "Laundry Room"
//     // And Ana Lucia starts a new sweep
//     // Then "Detergent" appears pre-loaded in "Laundry Room"
//   });
// });
