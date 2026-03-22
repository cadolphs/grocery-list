/**
 * Regression test for Reset Sweep button on HomeView.
 *
 * Verifies that tapping "Reset Sweep" calls resetSweep on TripService,
 * refreshes the view, and requires confirmation before executing.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../../src/domain/trip';

function renderAppWithItems() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Soap', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(stapleLibrary.listAll());

  // Check off Milk and complete an area to have state to reset
  tripService.checkOff('Milk');
  tripService.completeArea('Fridge');

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
    </ServiceProvider>
  );

  return { tripService };
}

describe('Reset Sweep button', () => {
  it('HomeView shows a Reset Sweep button', () => {
    renderAppWithItems();
    expect(screen.getByTestId('reset-sweep-button')).toBeTruthy();
    expect(screen.getByText('Reset Sweep')).toBeTruthy();
  });

  it('tapping Reset Sweep shows a confirmation prompt', () => {
    renderAppWithItems();
    fireEvent.press(screen.getByTestId('reset-sweep-button'));
    expect(screen.getByText('Are you sure? This will reset all items and remove one-offs.')).toBeTruthy();
  });

  it('confirming Reset Sweep resets the trip and refreshes the view', () => {
    const { tripService } = renderAppWithItems();

    // Before reset: one-off item should be visible
    expect(screen.getByText('Birthday candles')).toBeTruthy();

    // Tap Reset Sweep then confirm
    fireEvent.press(screen.getByTestId('reset-sweep-button'));
    fireEvent.press(screen.getByTestId('confirm-reset-sweep'));

    // After reset: one-off removed, sweep progress resets
    expect(screen.queryByText('Birthday candles')).toBeNull();
    expect(screen.getByText('0 of 5 areas complete')).toBeTruthy();
  });

  it('cancelling Reset Sweep does not change the trip', () => {
    renderAppWithItems();

    // Tap Reset Sweep then cancel
    fireEvent.press(screen.getByTestId('reset-sweep-button'));
    fireEvent.press(screen.getByTestId('cancel-reset-sweep'));

    // One-off should still be present
    expect(screen.getByText('Birthday candles')).toBeTruthy();
    // Confirmation should be dismissed
    expect(screen.queryByText('Are you sure? This will reset all items and remove one-offs.')).toBeNull();
  });
});
