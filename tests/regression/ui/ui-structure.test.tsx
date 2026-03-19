/**
 * Regression tests for UI structural layout.
 *
 * These tests verify that key layout wrappers (SafeAreaView, ScrollView)
 * are present in the component tree, ensuring the app is usable on
 * devices with notches, status bars, and scrollable content.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../../src/domain/trip';

function renderApp() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(stapleLibrary.listAll());

  return render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
      <AppShell />
    </ServiceProvider>
  );
}

describe('UI Structure - Layout wrappers', () => {
  it('AppShell renders content within a SafeAreaView', () => {
    renderApp();
    expect(screen.getByTestId('safe-area')).toBeTruthy();
  });

  it('HomeView wraps content in a ScrollView', () => {
    renderApp();
    expect(screen.getByTestId('home-scroll')).toBeTruthy();
  });

  it('StoreView wraps content in a ScrollView', () => {
    renderApp();
    fireEvent.press(screen.getByText('Store'));
    expect(screen.getByTestId('store-scroll')).toBeTruthy();
  });
});
