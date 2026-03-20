/**
 * Regression test for Area Settings screen.
 *
 * Verifies that a settings gear on HomeView opens an AreaSettingsScreen
 * showing configured house areas with an "Add Area" button.
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

  describe('Add Area', () => {
    it('tapping Add Area opens name input, typing and saving adds area to list', () => {
      renderApp(['Bathroom', 'Kitchen']);

      fireEvent.press(screen.getByTestId('settings-button'));
      fireEvent.press(screen.getByText('Add Area'));

      // Input and Save/Cancel buttons should be visible
      const nameInput = screen.getByTestId('area-name-input');
      expect(nameInput).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();

      // Type a new area name and save
      fireEvent.changeText(nameInput, 'Garage');
      fireEvent.press(screen.getByText('Save'));

      // New area should appear in the list
      expect(screen.getByText('Garage')).toBeTruthy();
      // Input should be hidden after saving
      expect(screen.queryByTestId('area-name-input')).toBeNull();
    });

    it('blocks empty area name with error message', () => {
      renderApp(['Bathroom', 'Kitchen']);

      fireEvent.press(screen.getByTestId('settings-button'));
      fireEvent.press(screen.getByText('Add Area'));

      // Try to save with empty name
      fireEvent.press(screen.getByText('Save'));

      // Error message should appear
      expect(screen.getByText('Area name is required')).toBeTruthy();
      // Input should still be visible
      expect(screen.getByTestId('area-name-input')).toBeTruthy();
    });

    it('blocks duplicate area name with error message', () => {
      renderApp(['Bathroom', 'Kitchen']);

      fireEvent.press(screen.getByTestId('settings-button'));
      fireEvent.press(screen.getByText('Add Area'));

      fireEvent.changeText(screen.getByTestId('area-name-input'), 'Bathroom');
      fireEvent.press(screen.getByText('Save'));

      // Error message should appear
      expect(screen.getByText('"Bathroom" already exists')).toBeTruthy();
    });

    it('Cancel hides the input without adding', () => {
      renderApp(['Bathroom', 'Kitchen']);

      fireEvent.press(screen.getByTestId('settings-button'));
      fireEvent.press(screen.getByText('Add Area'));

      fireEvent.changeText(screen.getByTestId('area-name-input'), 'Garage');
      fireEvent.press(screen.getByText('Cancel'));

      // Input should be hidden
      expect(screen.queryByTestId('area-name-input')).toBeNull();
      // Garage should NOT have been added
      expect(screen.queryByText('Garage')).toBeNull();
    });
  });
});
