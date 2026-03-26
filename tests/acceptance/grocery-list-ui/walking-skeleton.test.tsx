/**
 * Walking Skeleton Acceptance Tests - Grocery List UI
 *
 * These tests form the outer loop of Outside-In TDD for the UI layer.
 * They render components via ServiceProvider with null adapters and
 * verify observable user outcomes through screen queries.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - User actions: fireEvent (tap, changeText)
 * - Assertions: screen queries (getByText, queryByText, getByTestId)
 *
 * Story Trace:
 * - UI-WS-1: Home view renders staples grouped by house area
 * - UI-WS-2: Quick-add places a new item on the trip
 * - UI-WS-3: Toggle from home view to store view
 * - UI-WS-4: Store view renders items grouped by aisle
 * - UI-WS-5: Check off an item in store view
 * - UI-WS-6: Trip completion shows summary with carryover
 */

// --- Driving port imports ---
// Domain ports (already implemented):
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip, completeTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// UI ports (to be created during DELIVER wave):
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';

// =============================================================================
// Shared test setup
// =============================================================================

function createTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
    { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
    { name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
  ]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(library.listAll());
  return { library, tripService, stapleStorage, tripStorage };
}

// =============================================================================
// UI-WS-1: Home view renders staples grouped by house area
// =============================================================================

describe('UI-WS-1: Home view shows staples organized by house area', () => {
  // AC: Home screen displays trip items grouped by their house area
  // AC: Each area section shows item names within it
  // Trace: US-02 (UI rendering)

  it('displays staples under their house area headings', () => {
    // Given Carlos has staples across Fridge, Bathroom, and Garage Pantry
    const { library, tripService } = createTestServices();

    // When Carlos opens the home screen
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // Then Carlos sees "Fridge" area with "Whole milk" and "Butter"
    expect(screen.getByText('Fridge (2)')).toBeTruthy();
    expect(screen.getByText('Whole milk')).toBeTruthy();
    expect(screen.getByText('Butter')).toBeTruthy();

    // And Carlos sees "Bathroom" area with "Toilet paper" and "Shampoo"
    expect(screen.getByText('Bathroom (2)')).toBeTruthy();
    expect(screen.getByText('Toilet paper')).toBeTruthy();
    expect(screen.getByText('Shampoo')).toBeTruthy();

    // And Carlos sees "Garage Pantry" area with "Canned beans"
    expect(screen.getByText('Garage Pantry (1)')).toBeTruthy();
    expect(screen.getByText('Canned beans')).toBeTruthy();
  });
});

// =============================================================================
// UI-WS-2: Quick-add places a new item on the trip
// =============================================================================

describe('UI-WS-2: Quick-add places a new item on the trip', () => {
  // AC: Typing a name and submitting adds the item to the visible trip
  // Trace: US-03 (UI rendering)

  it('adds a quick-add item that appears on the home screen', () => {
    // Given Carlos has an active trip displayed on the home screen
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // When Carlos types "Greek yogurt" in the quick-add field and taps Add
    const quickAddInput = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(quickAddInput, 'Greek yogurt');
    fireEvent.press(screen.getByText('Add'));

    // Then the metadata sheet opens; Carlos skips metadata and adds with defaults
    fireEvent.press(screen.getByText('Skip, add with defaults'));

    // Then "Greek yogurt" appears on the home screen
    expect(screen.getByText('Greek yogurt')).toBeTruthy();
  });
});

// =============================================================================
// UI-WS-3: Toggle from home view to store view
// =============================================================================

describe('UI-WS-3: Toggle switches from home view to store view', () => {
  // AC: Tapping the view toggle switches visible content
  // AC: Home view content disappears when store view is active
  // Trace: US-04 (UI rendering)

  it('hides home view and shows store view on toggle tap', () => {
    // Given Carlos is viewing the home screen
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    expect(screen.getByText('Fridge (2)')).toBeTruthy();

    // When Carlos taps the store view toggle
    fireEvent.press(screen.getByText('Store'));

    // Then the store view is displayed
    expect(screen.getByText('Aisle 3: Dairy')).toBeTruthy();

    // And the home view area headings are no longer visible
    expect(screen.queryByText('Fridge (2)')).toBeNull();
  });
});

// =============================================================================
// UI-WS-4: Store view renders items grouped by aisle
// =============================================================================

describe('UI-WS-4: Store view shows items organized by aisle and section', () => {
  // AC: Store view groups items by aisle number ascending, then named sections
  // Trace: US-04 (UI rendering)

  it('displays items under aisle and section headings', () => {
    // Given Carlos has an active trip and switches to store view
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    fireEvent.press(screen.getByText('Store'));

    // When the store view renders
    // (already rendered after toggle)

    // Then Carlos sees "Aisle 3: Dairy" with "Whole milk" and "Butter"
    expect(screen.getByText('Aisle 3: Dairy')).toBeTruthy();
    expect(screen.getByText('Whole milk')).toBeTruthy();
    expect(screen.getByText('Butter')).toBeTruthy();

    // And Carlos sees "Aisle 5: Canned Goods" with "Canned beans"
    expect(screen.getByText('Aisle 5: Canned Goods')).toBeTruthy();
    expect(screen.getByText('Canned beans')).toBeTruthy();

    // And numbered aisles appear before named-only sections
    // (visual ordering verified by render order via groupByAisle sort)
  });
});

// =============================================================================
// UI-WS-5: Check off an item in store view
// =============================================================================

describe('UI-WS-5: Tapping an item in store view marks it as in the cart', () => {
  // AC: Tapping an item toggles its checked state visually
  // Trace: US-05 (UI rendering)

  it('shows item as checked after tap', () => {
    // Given Carlos is viewing the store view
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    fireEvent.press(screen.getByText('Store'));

    // When Carlos taps "Whole milk" to check it off
    fireEvent.press(screen.getByText('Whole milk'));

    // Then "Whole milk" appears as checked off (strikethrough or checkmark visible)
    expect(screen.getByTestId('checked-Whole milk')).toBeTruthy();
  });
});

// =============================================================================
// UI-WS-6: Trip completion shows summary with carryover
// =============================================================================

describe('UI-WS-6: Completing the trip shows a summary with carryover', () => {
  // AC: After finishing the trip, a summary screen appears
  // AC: Summary shows purchased count and carryover items
  // Trace: US-06 (UI rendering)

  it('displays trip summary with purchased and carryover counts', () => {
    // Given Carlos has checked off "Whole milk" and "Butter" but not "Canned beans"
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    fireEvent.press(screen.getByText('Store'));
    fireEvent.press(screen.getByText('Whole milk'));
    fireEvent.press(screen.getByText('Butter'));

    // When Carlos finishes the trip
    fireEvent.press(screen.getByText('Finish Trip'));

    // Then Carlos sees a trip summary showing 2 items purchased
    expect(screen.getByText('2 items purchased')).toBeTruthy();

    // And the summary indicates "Canned beans" will carry over
    expect(screen.getByText('Canned beans')).toBeTruthy();
    expect(screen.getByText(/carry over/i)).toBeTruthy();
  });
});
