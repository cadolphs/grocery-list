/**
 * Walking Skeleton Acceptance Tests - Add Item Metadata Flow
 *
 * These tests form the outer loop of Outside-In TDD.
 * They exercise driving ports (domain functions + React components)
 * and verify observable user outcomes in business language.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next. All tests after the first use it.skip().
 *
 * Driving Ports:
 * - Domain: staple library functions, trip functions
 * - UI: React components via @testing-library/react-native
 *
 * Story Trace:
 * - WS-AIF-1: US-AIF-01 (New item prompt appears)
 * - WS-AIF-2: US-AIF-01 (Bottom sheet opens with form)
 * - WS-AIF-3: US-AIF-01 (Staple saved and added to trip)
 * - WS-AIF-4: US-AIF-01 (One-off added to trip only)
 */

// --- Driving port imports ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// UI-level imports:
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';

// =============================================================================
// Test Setup Helper
// =============================================================================

function createTestServices(preloadedStaples?: Array<{
  name: string;
  houseArea: 'Bathroom' | 'Garage Pantry' | 'Kitchen Cabinets' | 'Fridge' | 'Freezer';
  storeLocation: { section: string; aisleNumber: number | null };
}>) {
  const stapleStorage = createNullStapleStorage(preloadedStaples ?? [
    { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(library.listAll());
  return { library, tripService, stapleStorage, tripStorage };
}

// =============================================================================
// WS-AIF-1: "Add as new item" row appears when no staple matches
// =============================================================================

describe('WS-AIF-1: New item prompt appears when no staple matches', () => {
  // AC: When QuickAdd input matches no staple, an "Add as new item" prompt appears
  // Trace: US-AIF-01, AC-1

  it('"Add as new item" row appears when typed name has no staple match', () => {
    // Given Carlos has a staple library with "Whole milk" but not "Oat milk"
    const { library } = createTestServices();

    // When Carlos types "Oat milk" and searches the staple library
    const suggestions = library.search('Oat milk');

    // Then no staple matches are found
    expect(suggestions).toHaveLength(0);

    // And the UI should show "Add 'Oat milk' as new item..." row
    // (UI assertion will be added when MetadataBottomSheet component exists)
    // This domain-level test confirms the prerequisite: no match triggers the prompt
  });

  it('"Add as new item" row appears even when partial matches exist', () => {
    // Given Carlos has "Whole milk" in the staple library
    const { library, tripService } = createTestServices();

    // When Carlos opens the app and types "milk" in QuickAdd
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    const quickAddInput = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(quickAddInput, 'milk');

    // Then staple suggestions include "Whole milk"
    expect(screen.getAllByText(/Whole milk/).length).toBeGreaterThanOrEqual(1);

    // And "Add 'milk' as new item..." row also appears below suggestions
    expect(screen.getByText(/Add 'milk' as new item/)).toBeTruthy();
  });
});

// =============================================================================
// WS-AIF-2: Bottom sheet opens with metadata form
// =============================================================================

describe('WS-AIF-2: Bottom sheet opens with metadata form', () => {
  // AC: Tapping the prompt opens a bottom sheet with type, area, section, and aisle fields
  // Trace: US-AIF-01, AC-2

  it('bottom sheet opens with form fields when "Add as new item" is tapped', () => {
    // Given Carlos has typed "Oat milk" and sees the new item prompt
    const { library, tripService } = createTestServices();

    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    const quickAddInput = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(quickAddInput, 'Oat milk');

    // When Carlos taps "Add 'Oat milk' as new item..."
    fireEvent.press(screen.getByText(/Add 'Oat milk' as new item/));

    // Then a bottom sheet opens with title "Add 'Oat milk'"
    expect(screen.getByText("Add 'Oat milk'")).toBeTruthy();

    // And the bottom sheet shows type toggle
    expect(screen.getByText('Staple')).toBeTruthy();
    expect(screen.getByText('One-off')).toBeTruthy();

    // And all 5 house areas are shown
    expect(screen.getByText('Bathroom')).toBeTruthy();
    expect(screen.getByText('Garage Pantry')).toBeTruthy();
    expect(screen.getByText('Kitchen Cabinets')).toBeTruthy();
    expect(screen.getByText('Fridge')).toBeTruthy();
    expect(screen.getByText('Freezer')).toBeTruthy();

    // And section and aisle inputs are shown
    expect(screen.getByPlaceholderText('Store section...')).toBeTruthy();
    expect(screen.getByPlaceholderText('Aisle number')).toBeTruthy();

    // And action buttons are shown
    expect(screen.getByText('Add Item')).toBeTruthy();
    expect(screen.getByText('Skip, add with defaults')).toBeTruthy();
  });
});

// =============================================================================
// WS-AIF-3: Staple saved to library AND added to trip
// =============================================================================

describe('WS-AIF-3: Submitting as staple saves to library and adds to trip', () => {
  // AC: Staple items are saved to the staple library AND added to the trip
  // Trace: US-AIF-01, AC-3

  it('submitting as staple saves to library and adds to trip', () => {
    // Given Carlos has an active trip and opens the metadata bottom sheet for "Oat milk"
    const { library, tripService } = createTestServices();

    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // Carlos types "Oat milk" and taps "Add as new item"
    const quickAddInput = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(quickAddInput, 'Oat milk');
    fireEvent.press(screen.getByText(/Add 'Oat milk' as new item/));

    // And Carlos selects type "Staple" (default), area "Fridge", section "Dairy", aisle 3
    fireEvent.press(screen.getByText('Staple'));
    fireEvent.press(screen.getByText('Fridge'));
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Dairy');
    fireEvent.changeText(screen.getByPlaceholderText('Aisle number'), '3');

    // When Carlos taps "Add Item"
    fireEvent.press(screen.getByText('Add Item'));

    // Then "Oat milk" is saved to the staple library
    const allStaples = library.listAll();
    expect(allStaples).toContainEqual(
      expect.objectContaining({ name: 'Oat milk', houseArea: 'Fridge' })
    );
    expect(allStaples.find(s => s.name === 'Oat milk')?.storeLocation.section).toBe('Dairy');
    expect(allStaples.find(s => s.name === 'Oat milk')?.storeLocation.aisleNumber).toBe(3);

    // And "Oat milk" appears on the current trip
    const tripItems = tripService.getItems();
    expect(tripItems).toContainEqual(
      expect.objectContaining({ name: 'Oat milk', houseArea: 'Fridge', itemType: 'staple' })
    );

    // And the sheet is dismissed
    expect(screen.queryByText("Add 'Oat milk'")).toBeNull();
  });
});

// =============================================================================
// WS-AIF-4: One-off added to trip only
// =============================================================================

describe('WS-AIF-4: Submitting as one-off adds to trip without saving to library', () => {
  // AC: One-off items are added to the trip only, not the staple library
  // Trace: US-AIF-01, AC-4

  it('submitting as one-off adds to trip but not to staple library', () => {
    // Given Carlos has an active trip and opens the metadata bottom sheet for "Birthday candles"
    const { library, tripService } = createTestServices();

    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // Carlos types "Birthday candles" and taps "Add as new item"
    const quickAddInput = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(quickAddInput, 'Birthday candles');
    fireEvent.press(screen.getByText(/Add 'Birthday candles' as new item/));

    // And Carlos selects type "One-off", area "Kitchen Cabinets" (default), section "Baking", aisle 12
    fireEvent.press(screen.getByText('One-off'));
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Baking');
    fireEvent.changeText(screen.getByPlaceholderText('Aisle number'), '12');

    // When Carlos taps "Add Item"
    fireEvent.press(screen.getByText('Add Item'));

    // Then "Birthday candles" appears on the current trip as one-off
    const tripItems = tripService.getItems();
    expect(tripItems).toContainEqual(
      expect.objectContaining({ name: 'Birthday candles', itemType: 'one-off' })
    );

    // And "Birthday candles" is NOT in the staple library
    expect(library.listAll()).not.toContainEqual(
      expect.objectContaining({ name: 'Birthday candles' })
    );

    // And the sheet is dismissed
    expect(screen.queryByText("Add 'Birthday candles'")).toBeNull();
  });
});
