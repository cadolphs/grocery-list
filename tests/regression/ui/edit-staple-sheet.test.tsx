/**
 * Regression test for Edit Staple via MetadataBottomSheet.
 *
 * Verifies that long-pressing a staple item name on HomeView opens the
 * MetadataBottomSheet in edit mode with pre-filled values, "Save Changes"
 * button, and no type toggle or skip button, and that saving moves the
 * trip item along with the staple.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullLibraryStorage } from '../../../src/adapters/null/null-library-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createTrip } from '../../../src/domain/trip';
import { createAreaManagement } from '../../../src/domain/area-management';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

const AREAS = ['Bathroom', 'Fridge', 'Freezer'];

function createTestServices() {
  const libraryStorage = createNullLibraryStorage([
    {
      name: 'Butter',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    },
    {
      name: 'Shampoo',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Personal Care', aisleNumber: 7 },
    },
  ]);
  const tripStorage = createNullTripStorage();
  const areaStorage = createNullAreaStorage(AREAS);
  const stapleLibrary = createStapleLibrary(libraryStorage);
  const tripService = createTrip(tripStorage);
  const areaManagement = createAreaManagement(
    areaStorage,
    libraryStorage,
    tripStorage,
  );
  tripService.initializeFromStorage(stapleLibrary.listAll());
  // #96: staples start Undecided; mark them Needed as a finished sweep would.
  stapleLibrary
    .listAll()
    .forEach((s) =>
      tripService.setDecision(itemIdNamed(tripService, s.name), 'needed'),
    );
  return { stapleLibrary, tripService, areaManagement };
}

function renderApp() {
  const services = createTestServices();
  render(
    <ServiceProvider
      stapleLibrary={services.stapleLibrary}
      tripService={services.tripService}
      areaManagement={services.areaManagement}
    >
      <AppShell />
    </ServiceProvider>,
  );
  return services;
}

describe('Edit Staple via MetadataBottomSheet', () => {
  // sweep-ux-refresh replaced tap-to-edit with long-press (a tap now toggles
  // needed; web additionally shows a pencil icon, covered in
  // tests/acceptance/web-ux-polish/milestone-2-edit-icon.test.tsx).
  it('long-pressing a staple name opens edit sheet with pre-filled values and Save Changes button', () => {
    renderApp();

    // Long-press the "Butter" item name to open edit sheet
    fireEvent(screen.getByText('Butter'), 'longPress');

    // Edit sheet is visible with "Edit 'Butter'" title
    expect(screen.getByText("Edit 'Butter'")).toBeTruthy();

    // "Save Changes" button visible instead of "Add Item"
    expect(screen.getByText('Save Changes')).toBeTruthy();
    expect(screen.queryByText('Add Item')).toBeNull();

    // No type toggle (Staple/One-off) in edit mode
    expect(screen.queryByText('One-off')).toBeNull();

    // No skip button in edit mode
    expect(screen.queryByText('Skip, add with defaults')).toBeNull();

    // Pre-filled area: "Fridge" is active
    expect(screen.getByTestId('area-button-Fridge-active')).toBeTruthy();

    // Pre-filled section: "Dairy"
    expect(screen.getByDisplayValue('Dairy')).toBeTruthy();

    // Pre-filled aisle: "3"
    expect(screen.getByDisplayValue('3')).toBeTruthy();
  });

  it('Save Changes updates the staple and syncs the trip', () => {
    const services = renderApp();
    expect(screen.getByText('Fridge (1)')).toBeTruthy();
    expect(screen.getByText('Freezer (0)')).toBeTruthy();

    // Long-press "Butter" to open edit sheet
    fireEvent(screen.getByText('Butter'), 'longPress');

    // Change area to "Freezer"
    fireEvent.press(screen.getByTestId('area-button-Freezer'));

    // Tap "Save Changes"
    fireEvent.press(screen.getByText('Save Changes'));

    // Sheet dismisses -- "Edit 'Butter'" gone
    expect(screen.queryByText("Edit 'Butter'")).toBeNull();

    // The trip item moved from Fridge to Freezer (area counts follow)
    expect(screen.getByText('Freezer (1)')).toBeTruthy();
    expect(screen.getByText('Fridge (0)')).toBeTruthy();

    // And the staple itself was updated in the library
    const butter = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Butter');
    expect(butter?.houseArea).toBe('Freezer');
  });
});
