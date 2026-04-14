/**
 * Milestone 2 Acceptance Tests - Edit Icon Replaces Long-Press on Web
 *
 * Tests for US-06: Pencil icon replaces long-press on web for editing staples.
 * Mobile (iOS/Android) retains long-press behavior.
 *
 * Story Trace:
 * - US-06: Always-visible pencil icon on web, long-press retained on mobile
 */

jest.mock('../../../src/hooks/useIsWeb');

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
import { useIsWeb } from '../../../src/hooks/useIsWeb';

const mockedUseIsWeb = useIsWeb as jest.MockedFunction<typeof useIsWeb>;

function renderApp() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Fridge'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll().filter(s => s.type === 'staple'));
  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
      <AppShell />
    </ServiceProvider>
  );
}

beforeEach(() => {
  mockedUseIsWeb.mockReset();
});

// =============================================================================
// M2-1: Pencil icon visible on web next to editable rows
// =============================================================================

describe.skip('M2-1: Edit icon visible on web', () => {
  // AC: On web, each row with an edit affordance shows a visible pencil icon
  // AC: On mobile, the pencil icon is NOT rendered
  // Driving port: TripItemRow / StapleRow conditional render

  it('renders a pencil edit button for each staple row on web in sweep view', () => {
    mockedUseIsWeb.mockReturnValue(true);
    renderApp();

    // The edit button is addressable via testID "edit-button-Milk"
    expect(screen.getByTestId('edit-button-Milk')).toBeTruthy();
  });

  it('does NOT render pencil edit button on mobile', () => {
    mockedUseIsWeb.mockReturnValue(false);
    renderApp();

    expect(screen.queryByTestId('edit-button-Milk')).toBeNull();
  });
});

// =============================================================================
// M2-2: Tapping pencil icon opens the edit metadata sheet
// =============================================================================

describe.skip('M2-2: Tapping edit icon opens the edit sheet', () => {
  // AC: Pressing the pencil icon on a row opens the edit metadata sheet
  //     for that staple (same behavior as long-press on mobile)
  // Driving port: Pressable onPress -> handleEditStaple

  it('opens the edit sheet when the pencil icon is tapped on web', () => {
    mockedUseIsWeb.mockReturnValue(true);
    renderApp();

    fireEvent.press(screen.getByTestId('edit-button-Milk'));

    // Edit sheet shows up with "Edit 'Milk'" title
    expect(screen.getByText("Edit 'Milk'")).toBeTruthy();
  });
});

// =============================================================================
// M2-3: Checklist rows also show pencil icon on web
// =============================================================================

describe.skip('M2-3: Checklist rows show pencil icon on web', () => {
  // AC: Staple checklist rows also show the pencil icon on web

  it('shows pencil icon on staple checklist rows on web', () => {
    mockedUseIsWeb.mockReturnValue(true);
    renderApp();

    // Switch to checklist mode
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    expect(screen.getByTestId('edit-button-Milk')).toBeTruthy();
  });

  it('does NOT show pencil icon on checklist rows on mobile', () => {
    mockedUseIsWeb.mockReturnValue(false);
    renderApp();

    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    expect(screen.queryByTestId('edit-button-Milk')).toBeNull();
  });
});
