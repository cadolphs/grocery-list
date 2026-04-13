/**
 * Milestone 2 Acceptance Tests - Suggestion Labels
 *
 * Tests for US-03: Differentiate one-off suggestions from staple suggestions.
 *
 * Driving Ports:
 * - UI: QuickAdd suggestion list formatting
 * - User actions: fireEvent (changeText)
 * - Assertions: screen queries for label text
 *
 * Story Trace:
 * - US-03: Differentiate one-off suggestions from staple suggestions
 *   - M2-1: One-off suggestion shows "(one-off)" label
 *   - M2-2: Staple suggestion does not show type label
 *   - M2-3: Same-name items distinguished by type label
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

function createServicesWithOneOff() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  // Add a one-off to the library
  (stapleLibrary as any).addOneOff({ name: 'Tahini', storeLocation: { section: 'International', aisleNumber: 7 } });

  const tripAreas = ['Fridge'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll().filter(s => s.type === 'staple'));

  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  return { stapleLibrary, tripService, areaManagement };
}

// =============================================================================
// M2-1: One-off suggestion shows "(one-off)" label
// =============================================================================

describe('M2-1: One-off suggestion shows type label', () => {
  // AC: One-off suggestions display "(one-off)" label in QuickAdd suggestion list
  // Driving port: QuickAdd formatSuggestion

  it('shows "(one-off)" label for one-off suggestions', () => {
    // Given Elena has "Tahini" as a one-off in the library
    const services = createServicesWithOneOff();
    render(
      <ServiceProvider stapleLibrary={services.stapleLibrary} tripService={services.tripService} areaManagement={services.areaManagement}>
        <AppShell />
      </ServiceProvider>
    );

    // When Elena types "Tah" in QuickAdd
    fireEvent.changeText(screen.getByPlaceholderText('Add an item...'), 'Tah');

    // Then the suggestion includes "(one-off)"
    expect(screen.getByText(/Tahini.*\(one-off\)/)).toBeTruthy();
  });
});

// =============================================================================
// M2-2: Staple suggestion does not show type label
// =============================================================================

describe('M2-2: Staple suggestions are not shown in QuickAdd', () => {
  // AC: Staples don't appear in QuickAdd suggestions — they're part of the sweep,
  // not the quick-add flow. Only one-offs (and the "Add as new item..." option) show.
  // Driving port: QuickAdd onSearch (filtered to one-offs only)

  it('does not show staple suggestions when typing a staple name', () => {
    // Given Elena has "Milk" as a staple in the library
    const services = createServicesWithOneOff();
    render(
      <ServiceProvider stapleLibrary={services.stapleLibrary} tripService={services.tripService} areaManagement={services.areaManagement}>
        <AppShell />
      </ServiceProvider>
    );

    // When Elena types "Mil" in QuickAdd
    fireEvent.changeText(screen.getByPlaceholderText('Add an item...'), 'Mil');

    // Then no "Milk - Dairy" staple suggestion appears
    expect(screen.queryByText(/Milk - Dairy/)).toBeNull();
  });
});

// =============================================================================
// M2-3: Same-name items distinguished by type label
// =============================================================================

describe('M2-3: Same-name items: only one-off suggestion appears', () => {
  // AC: Staples are not suggested in QuickAdd. When a name matches both a staple
  // and a one-off, only the one-off suggestion appears (staple is already in the sweep).
  // Driving port: QuickAdd onSearch (filtered to one-offs only)

  it('shows only the one-off suggestion when a staple and one-off share a name', () => {
    // Given Elena has "Butter" as a staple and "Butter" as a one-off
    const stapleStorage = createNullStapleStorage([
      { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 2 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    (stapleLibrary as any).addOneOff({ name: 'Butter', storeLocation: { section: 'International', aisleNumber: 7 } });

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

    // When Elena types "Butter" in QuickAdd
    fireEvent.changeText(screen.getByPlaceholderText('Add an item...'), 'Butter');

    // Then only the one-off suggestion appears
    expect(screen.queryByText(/Butter - Dairy/)).toBeNull();
    expect(screen.getByText(/Butter.*International.*\(one-off\)/)).toBeTruthy();
  });
});
