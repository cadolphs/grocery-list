/**
 * Regression test: tapping a checked item in StoreView should uncheck it.
 *
 * Bug: StoreView only passes `putInCart` to item press, so tapping a checked
 * item re-checks it (no-op) instead of unchecking it.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullLibraryStorage } from '../../../src/adapters/null/null-library-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../../src/domain/trip';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

function renderAppInStoreView() {
  const libraryStorage = createNullLibraryStorage([
    {
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    },
    {
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
    },
  ]);
  const stapleLibrary = createStapleLibrary(libraryStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.initializeFromStorage(stapleLibrary.listAll());
  // #96: staples start Undecided; mark them Needed as a finished sweep would.
  stapleLibrary
    .listAll()
    .forEach((s) =>
      tripService.setDecision(itemIdNamed(tripService, s.name), 'needed'),
    );

  render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
      <AppShell />
    </ServiceProvider>,
  );

  // Switch to Store view
  fireEvent.press(screen.getByText('Store'));
}

describe('Store view: uncheck item on tap', () => {
  it('tapping a checked item unchecks it', () => {
    renderAppInStoreView();

    // Tap Milk to check it off
    fireEvent.press(screen.getByText('Milk'));
    expect(screen.getByTestId('checked-Milk')).toBeTruthy();

    // Tap Milk again -- should uncheck it
    fireEvent.press(screen.getByTestId('checked-Milk'));
    expect(screen.queryByTestId('checked-Milk')).toBeNull();
  });
});
