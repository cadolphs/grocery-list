/**
 * Milestone 1 Acceptance Tests - Safety Filters
 *
 * Tests for US-04: Exclude persisted one-offs from staple checklist and trip preloading.
 * Ensures one-offs don't leak into the sweep workflow.
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - Domain: StapleLibrary (listAll filtered by type), TripService (start with filtered staples)
 * - User actions: fireEvent (press)
 * - Assertions: screen queries
 *
 * Story Trace:
 * - US-04: Exclude persisted one-offs from checklist and preloading
 *   - M1-1: Staple checklist excludes one-off items
 *   - M1-2: New trip preloads only staples
 *   - M1-3: Empty checklist when only one-offs exist
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

// =============================================================================
// M1-1: Staple checklist excludes one-off items
// =============================================================================

describe('M1-1: Staple checklist excludes one-off items', () => {
  // AC: Staple checklist displays only items with type 'staple'
  // AC: One-offs are not visible in checklist view
  // Driving port: HomeView -> StapleChecklist (allStaples filtered)

  it('shows only staples in checklist, not persisted one-offs', () => {
    // Given Elena has staples "Milk", "Bread" and one-off "Tahini" in the library
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: 1 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    // Manually add a one-off to the library
    (stapleLibrary as any).addOneOff({ name: 'Tahini', storeLocation: { section: 'International', aisleNumber: 7 } });

    const tripAreas = ['Fridge', 'Kitchen Cabinets'];
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

    // When Elena switches to checklist mode
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    // Then "Milk" and "Bread" appear in the checklist
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Bread')).toBeTruthy();

    // And "Tahini" does not appear
    expect(screen.queryByTestId('staple-row-Tahini')).toBeNull();
  });
});

// =============================================================================
// M1-2: New trip preloads only staples
// =============================================================================

describe('M1-2: New trip preloads only staples', () => {
  // AC: Trip preloading includes only items with type 'staple'
  // AC: One-offs are not preloaded into new trips
  // Driving port: TripService.start with filtered staple list

  it('does not preload one-offs into a new trip', () => {
    // Given Elena has staples "Milk" and one-off "Tahini" in the library
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    (stapleLibrary as any).addOneOff({ name: 'Tahini', storeLocation: { section: 'International', aisleNumber: 7 } });

    const tripAreas = ['Fridge'];
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage, tripAreas);

    // When a new trip is created with preloaded staples (filtered to type 'staple')
    tripService.start(stapleLibrary.listAll().filter(s => s.type === 'staple'));

    // Then only "Milk" is preloaded
    const tripItems = tripService.getItems();
    expect(tripItems).toHaveLength(1);
    expect(tripItems[0].name).toBe('Milk');

    // And "Tahini" is not in the trip
    expect(tripItems.find(i => i.name === 'Tahini')).toBeUndefined();
  });
});

// =============================================================================
// M1-3: Empty checklist when only one-offs exist
// =============================================================================

describe('M1-3: Empty checklist when only one-offs exist', () => {
  // AC: Staple checklist shows empty state when only one-offs exist in library
  // Driving port: HomeView -> StapleChecklist (empty after filter)

  it('shows no staple rows when library has only one-offs', () => {
    // Given Elena has only one-off "Tahini" in the library (no staples)
    const stapleStorage = createNullStapleStorage([]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    (stapleLibrary as any).addOneOff({ name: 'Tahini', storeLocation: { section: 'International', aisleNumber: 7 } });

    const tripAreas = ['Fridge'];
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage, tripAreas);
    tripService.start([]);

    const areaStorage = createNullAreaStorage(tripAreas);
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    render(
      <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
        <AppShell />
      </ServiceProvider>
    );

    // When Elena switches to checklist mode
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    // Then no staple rows are visible
    expect(screen.queryByTestId('staple-row-Tahini')).toBeNull();
  });
});
