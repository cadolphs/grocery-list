/**
 * Milestone 1 Acceptance Tests - Empty State Message
 *
 * Tests for US-02: Empty State Message When No Staples Match Search.
 * Depends on US-01 (search bar must exist).
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - User actions: fireEvent (press, changeText)
 * - Assertions: screen queries (getByText, queryByText)
 *
 * Story Trace:
 * - US-02: Empty State Message When No Staples Match
 *   - M1-1: Show "No staples match" message when filter yields zero results
 *   - M1-2: Message disappears when query is corrected to match
 *   - M1-3: Message disappears when search is cleared
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

function renderInChecklistMode() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Cheddar Cheese', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Fridge'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll());

  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
      <AppShell />
    </ServiceProvider>
  );
  fireEvent.press(screen.getByTestId('home-mode-checklist'));
}

// =============================================================================
// M1-1: No matches message shown
// =============================================================================

describe.skip('M1-1: Empty state message when no staples match', () => {
  // AC: When the search filter produces zero results, the message
  //     "No staples match '{query}'" is displayed
  // AC: The message uses the actual query text typed by the user
  // Driving port: TextInput changeText on search bar

  it('shows "No staples match" message when query has no matches', () => {
    // Given Clemens is in checklist mode with 2 staples
    renderInChecklistMode();

    // When he types "zzz" which matches no staples
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'zzz');

    // Then the empty state message is shown with the query
    expect(screen.getByText("No staples match 'zzz'")).toBeTruthy();

    // And no staple rows are visible
    expect(screen.queryByText('Cheddar Cheese')).toBeNull();
    expect(screen.queryByText('Butter')).toBeNull();
  });
});

// =============================================================================
// M1-2: Message disappears when query is corrected
// =============================================================================

describe.skip('M1-2: Empty state disappears when query matches', () => {
  // AC: The message disappears when the query is modified to produce results
  // Driving port: TextInput changeText on search bar

  it('hides empty state when query is corrected to match a staple', () => {
    // Given Clemens sees "No staples match 'chedr'" (typo)
    renderInChecklistMode();
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'chedr');
    expect(screen.getByText("No staples match 'chedr'")).toBeTruthy();

    // When he corrects the query to "ched"
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'ched');

    // Then the empty state message is gone
    expect(screen.queryByText(/No staples match/)).toBeNull();

    // And "Cheddar Cheese" appears
    expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
  });
});

// =============================================================================
// M1-3: Message disappears when search is cleared
// =============================================================================

describe.skip('M1-3: Empty state disappears when search is cleared', () => {
  // AC: The message disappears when the search is cleared
  // Driving port: Press event on clear button

  it('hides empty state and restores full list when search is cleared', () => {
    // Given Clemens sees "No staples match 'zzz'"
    renderInChecklistMode();
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'zzz');
    expect(screen.getByText("No staples match 'zzz'")).toBeTruthy();

    // When he taps the clear button
    fireEvent.press(screen.getByTestId('search-clear-button'));

    // Then the empty state message is gone
    expect(screen.queryByText(/No staples match/)).toBeNull();

    // And all staples are visible again
    expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
    expect(screen.getByText('Butter')).toBeTruthy();
  });
});
