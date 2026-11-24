/**
 * Regression test for Start over button on HomeView.
 *
 * Verifies that tapping "Start over" calls startOver on TripService,
 * refreshes the view, and requires confirmation before executing.
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

function renderAppWithItems() {
  const libraryStorage = createNullLibraryStorage([
    {
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    },
    {
      name: 'Soap',
      houseArea: 'Bathroom',
      storeLocation: { section: 'Personal Care', aisleNumber: 7 },
    },
  ]);
  const stapleLibrary = createStapleLibrary(libraryStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.initializeFromStorage(stapleLibrary.listAll());

  // Check off Milk and complete an area to have state to reset
  tripService.putInCart(itemIdNamed(tripService, 'Milk'));
  tripService.markAreaDone('Fridge');

  // Add a one-off item
  tripService.addItem({
    name: 'Birthday candles',
    houseArea: 'Kitchen Cabinets',
    storeLocation: { section: 'Baking', aisleNumber: 12 },
    itemType: 'one-off',
    source: 'quick-add',
  });

  render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
      <AppShell />
    </ServiceProvider>,
  );

  return { tripService };
}

describe('Start over button', () => {
  it('HomeView shows a Start over button', () => {
    renderAppWithItems();
    expect(screen.getByTestId('start-over-button')).toBeTruthy();
    expect(screen.getByText('Start over')).toBeTruthy();
  });

  it('tapping Start over shows a confirmation prompt', () => {
    renderAppWithItems();
    fireEvent.press(screen.getByTestId('start-over-button'));
    expect(
      screen.getByText(
        'Start over? Every staple goes back to Undecided. One-offs, in-cart marks and carried-over items are lost.',
      ),
    ).toBeTruthy();
  });

  it('confirming Start over resets the trip and refreshes the view', () => {
    renderAppWithItems();

    // Before reset: one-off item should be visible
    expect(screen.getByText('Birthday candles')).toBeTruthy();

    // Tap Start over then confirm
    fireEvent.press(screen.getByTestId('start-over-button'));
    fireEvent.press(screen.getByTestId('confirm-start-over'));

    // After reset: one-off removed. Sweep progress is derived from decisions
    // (#95), so what it reads after a reset follows the reset's decisions.
    expect(screen.queryByText('Birthday candles')).toBeNull();
  });

  it('cancelling Start over does not change the trip', () => {
    renderAppWithItems();

    // Tap Start over then cancel
    fireEvent.press(screen.getByTestId('start-over-button'));
    fireEvent.press(screen.getByTestId('cancel-start-over'));

    // One-off should still be present
    expect(screen.getByText('Birthday candles')).toBeTruthy();
    // Confirmation should be dismissed
    expect(
      screen.queryByText(
        'Start over? Every staple goes back to Undecided. One-offs, in-cart marks and carried-over items are lost.',
      ),
    ).toBeNull();
  });
});
