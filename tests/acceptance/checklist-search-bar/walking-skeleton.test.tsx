/**
 * Walking Skeleton Acceptance Tests - Checklist Search Bar
 *
 * End-to-end acceptance tests for filtering staples in checklist mode.
 * Renders HomeView via ServiceProvider with null adapters and verifies
 * observable user outcomes through screen queries.
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - User actions: fireEvent (press, changeText)
 * - Assertions: screen queries (getByText, queryByText, getByPlaceholderText)
 *
 * Story Trace:
 * - US-01: Filter Checklist Staples by Name
 *   - WS-1: Search bar visible in checklist mode
 *   - WS-2: Typing filters staples by name (case-insensitive substring)
 *   - WS-3: Toggle staple on/off trip from filtered results
 *   - WS-4: Clear search restores full list
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

function createTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Cheddar Cheese', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Chicken Breast', houseArea: 'Freezer', storeLocation: { section: 'Meat', aisleNumber: 5 } },
    { name: 'Chocolate Chips', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Baking', aisleNumber: 7 } },
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Peanut Butter', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Spreads', aisleNumber: 4 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Fridge', 'Freezer', 'Kitchen Cabinets'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll());

  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  return { stapleLibrary, tripService, areaManagement };
}

function renderInChecklistMode() {
  const services = createTestServices();
  render(
    <ServiceProvider stapleLibrary={services.stapleLibrary} tripService={services.tripService} areaManagement={services.areaManagement}>
      <AppShell />
    </ServiceProvider>
  );
  fireEvent.press(screen.getByTestId('home-mode-checklist'));
  return services;
}

// =============================================================================
// WS-1: Search bar visible in checklist mode
// =============================================================================

describe('WS-1: Search bar visible in checklist mode', () => {
  // AC: A search input is visible at the top of the checklist when in checklist mode
  // Driving port: StapleChecklist via ServiceProvider > AppShell > HomeView

  it('displays a search input when checklist mode is active', () => {
    // Given Clemens has 5 staples in his library
    renderInChecklistMode();

    // Then a search input with placeholder "Search staples..." is visible
    expect(screen.getByPlaceholderText('Search staples...')).toBeTruthy();

    // And all 5 staples are displayed
    expect(screen.getByText('Butter')).toBeTruthy();
    expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
    expect(screen.getByText('Chicken Breast')).toBeTruthy();
    expect(screen.getByText('Chocolate Chips')).toBeTruthy();
    expect(screen.getByText('Peanut Butter')).toBeTruthy();
  });
});

// =============================================================================
// WS-2: Typing filters staples by name
// =============================================================================

describe('WS-2: Typing filters staples by name', () => {
  // AC: Typing in the search input filters the staple list in real-time by name
  //     (case-insensitive substring match)
  // Driving port: TextInput changeText event on search bar

  it('filters staples to show only those matching the query', () => {
    // Given Clemens is in checklist mode with 5 staples
    renderInChecklistMode();

    // When he types "ch" in the search bar
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'ch');

    // Then only staples containing "ch" are shown
    expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
    expect(screen.getByText('Chicken Breast')).toBeTruthy();
    expect(screen.getByText('Chocolate Chips')).toBeTruthy();

    // And non-matching staples are hidden
    expect(screen.queryByText('Butter')).toBeNull();
    expect(screen.queryByText('Peanut Butter')).toBeNull();
  });

  it('matches case-insensitively', () => {
    // Given Clemens is in checklist mode
    renderInChecklistMode();

    // When he types "peanut" (all lowercase)
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'peanut');

    // Then "Peanut Butter" appears (case-insensitive match)
    expect(screen.getByText('Peanut Butter')).toBeTruthy();

    // And non-matching staples are hidden
    expect(screen.queryByText('Butter')).toBeNull();
    expect(screen.queryByText('Cheddar Cheese')).toBeNull();
  });

  it('matches substrings anywhere in the name', () => {
    // Given Clemens is in checklist mode
    renderInChecklistMode();

    // When he types "butter" which appears in "Butter" and "Peanut Butter"
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'butter');

    // Then both matching staples are shown
    expect(screen.getByText('Butter')).toBeTruthy();
    expect(screen.getByText('Peanut Butter')).toBeTruthy();

    // And non-matching staples are hidden
    expect(screen.queryByText('Cheddar Cheese')).toBeNull();
  });
});

// =============================================================================
// WS-3: Toggle staple on/off trip from filtered results
// =============================================================================

describe('WS-3: Toggle staple from filtered results', () => {
  // AC: Tapping a staple in filtered results toggles it on/off the trip
  // AC: Filtered results preserve checked/unchecked visual state
  // Driving port: Press event on staple row in filtered list

  it('toggles a staple off the trip from filtered results and shows strikethrough', () => {
    // Given Clemens has filtered the checklist by typing "ched"
    renderInChecklistMode();
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'ched');

    // And "Cheddar Cheese" is on the trip (green text)
    expect(screen.getByText('Cheddar Cheese')).toHaveStyle({ color: '#1A1A1A' });

    // When he taps "Cheddar Cheese" to skip it
    fireEvent.press(screen.getByTestId('staple-row-Cheddar Cheese'));

    // Then it shows strikethrough (removed from trip)
    expect(screen.getByText('Cheddar Cheese')).toHaveStyle({ color: '#6B6B6B', textDecorationLine: 'line-through' });
  });

  it('toggles a staple back onto the trip from filtered results', () => {
    // Given Clemens has skipped "Cheddar Cheese" and then filtered to show it
    renderInChecklistMode();

    // First skip it
    fireEvent.press(screen.getByTestId('staple-row-Cheddar Cheese'));
    expect(screen.getByText('Cheddar Cheese')).toHaveStyle({ textDecorationLine: 'line-through' });

    // Then filter to show it
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'ched');

    // When he taps to re-add it
    fireEvent.press(screen.getByTestId('staple-row-Cheddar Cheese'));

    // Then it shows green (back on trip)
    expect(screen.getByText('Cheddar Cheese')).toHaveStyle({ color: '#1A1A1A' });
  });
});

// =============================================================================
// WS-4: Clear search restores full list
// =============================================================================

describe('WS-4: Clear search restores full list', () => {
  // AC: A clear button (X) appears when the search input has text
  // AC: Clearing the filter restores the full staple list
  // Driving port: Press event on clear button

  it('shows clear button when search has text and restores full list on tap', () => {
    // Given Clemens has typed "ch" and sees 3 filtered results
    renderInChecklistMode();
    fireEvent.changeText(screen.getByPlaceholderText('Search staples...'), 'ch');
    expect(screen.queryByText('Butter')).toBeNull();

    // When he taps the clear button
    fireEvent.press(screen.getByTestId('search-clear-button'));

    // Then all 5 staples are displayed again
    expect(screen.getByText('Butter')).toBeTruthy();
    expect(screen.getByText('Cheddar Cheese')).toBeTruthy();
    expect(screen.getByText('Chicken Breast')).toBeTruthy();
    expect(screen.getByText('Chocolate Chips')).toBeTruthy();
    expect(screen.getByText('Peanut Butter')).toBeTruthy();
  });

  it('hides clear button when search input is empty', () => {
    // Given Clemens is in checklist mode with no search text
    renderInChecklistMode();

    // Then the clear button is not visible
    expect(screen.queryByTestId('search-clear-button')).toBeNull();
  });
});
