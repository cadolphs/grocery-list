/**
 * Regression test for Area Settings screen.
 *
 * Verifies that a settings gear on HomeView opens an AreaSettingsScreen
 * showing configured house areas with an "Add Area" button.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createTrip } from '../../../src/domain/trip';
import { createAreaManagement } from '../../../src/domain/area-management';

function createTestServices(areas: string[] = ['Bathroom', 'Kitchen', 'Garage']) {
  const stapleStorage = createNullStapleStorage([]);
  const tripStorage = createNullTripStorage();
  const areaStorage = createNullAreaStorage(areas);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripService = createTrip(tripStorage);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  tripService.start(stapleLibrary.listAll());
  return { stapleLibrary, tripService, areaManagement };
}

function renderApp(areas?: string[]) {
  const { stapleLibrary, tripService, areaManagement } = createTestServices(areas);
  return render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
      <AppShell />
    </ServiceProvider>
  );
}

describe('Area Settings Screen', () => {
  it('settings gear on HomeView opens AreaSettingsScreen showing configured areas', () => {
    renderApp(['Bathroom', 'Kitchen', 'Garage']);

    // Tap the settings gear
    fireEvent.press(screen.getByTestId('settings-button'));

    // Verify area settings screen is visible with all configured areas
    expect(screen.getByText('House Areas')).toBeTruthy();
    expect(screen.getByText('Bathroom')).toBeTruthy();
    expect(screen.getByText('Kitchen')).toBeTruthy();
    expect(screen.getByText('Garage')).toBeTruthy();
  });

  it('AreaSettingsScreen shows an Add Area button', () => {
    renderApp();

    fireEvent.press(screen.getByTestId('settings-button'));

    expect(screen.getByText('Add Area')).toBeTruthy();
  });
});
