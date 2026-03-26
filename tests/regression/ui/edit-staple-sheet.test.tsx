/**
 * Regression test for Edit Staple via MetadataBottomSheet.
 *
 * Verifies that tapping a staple item name on HomeView opens the
 * MetadataBottomSheet in edit mode with pre-filled values, "Save Changes"
 * button, and no type toggle or skip button.
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createTrip } from '../../../src/domain/trip';
import { createAreaManagement } from '../../../src/domain/area-management';

const AREAS = ['Bathroom', 'Fridge', 'Freezer'];

function createTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
  ]);
  const tripStorage = createNullTripStorage();
  const areaStorage = createNullAreaStorage(AREAS);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripService = createTrip(tripStorage);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  tripService.start(stapleLibrary.listAll());
  return { stapleLibrary, tripService, areaManagement };
}

function renderApp() {
  const services = createTestServices();
  return render(
    <ServiceProvider
      stapleLibrary={services.stapleLibrary}
      tripService={services.tripService}
      areaManagement={services.areaManagement}
    >
      <AppShell />
    </ServiceProvider>
  );
}

describe('Edit Staple via MetadataBottomSheet', () => {
  // Tap-to-edit removed in sweep-ux-refresh (01-01). Long-press edit wired in step 01-02.
  it.skip('tapping a staple name opens edit sheet with pre-filled values and Save Changes button', () => {
    renderApp();

    // Tap the "Butter" item name to open edit sheet
    fireEvent.press(screen.getByText('Butter'));

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

  // Tap-to-edit removed in sweep-ux-refresh (01-01). Long-press edit wired in step 01-02.
  it.skip('Save Changes updates the staple and syncs the trip', () => {
    renderApp();

    // Tap "Butter" to open edit sheet
    fireEvent.press(screen.getByText('Butter'));

    // Change area to "Freezer"
    fireEvent.press(screen.getByTestId('area-button-Freezer'));

    // Tap "Save Changes"
    fireEvent.press(screen.getByText('Save Changes'));

    // Sheet dismisses -- "Edit 'Butter'" gone
    expect(screen.queryByText("Edit 'Butter'")).toBeNull();

    // Butter now appears under Freezer on the trip
    // (Freezer section should contain Butter)
    const freezerSection = screen.getByText(/Freezer/);
    expect(freezerSection).toBeTruthy();
  });
});
