/**
 * Regression test for StapleChecklist component (whiteboard phase).
 *
 * StapleChecklist renders an alphabetically sorted list of all staples.
 * Each staple shows its name and a toggle button.
 * Staples already on the trip show as checked.
 * Tapping unchecked staple calls onAddStaple; tapping checked calls onRemoveStaple.
 *
 * Integration: when all areas are complete in HomeView, StapleChecklist appears
 * below the whiteboard prompt. Adding/removing staples updates the trip.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { StapleChecklist } from '../../src/ui/StapleChecklist';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../src/adapters/null/null-area-storage';
import { createTrip } from '../../src/domain/trip';
import { createAreaManagement } from '../../src/domain/area-management';
import { StapleItem } from '../../src/domain/types';

const createStaple = (name: string, houseArea: string): StapleItem => ({
  id: `id-${name.toLowerCase()}`,
  name,
  houseArea,
  storeLocation: { section: 'General', aisleNumber: null },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00Z',
});

const STAPLES: readonly StapleItem[] = [
  createStaple('Milk', 'Fridge'),
  createStaple('Apples', 'Pantry'),
  createStaple('Bread', 'Pantry'),
  createStaple('Cheese', 'Fridge'),
];

describe('staple checklist renders sorted list with toggle', () => {
  it('renders staples in alphabetical order by name', () => {
    const onAddStaple = jest.fn();
    const onRemoveStaple = jest.fn();

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={new Set<string>()}
        onAddStaple={onAddStaple}
        onRemoveStaple={onRemoveStaple}
      />
    );

    const stapleNames = screen.getAllByTestId(/^staple-row-/).map(
      (element) => element.props.testID
    );

    expect(stapleNames).toEqual([
      'staple-row-Apples',
      'staple-row-Bread',
      'staple-row-Cheese',
      'staple-row-Milk',
    ]);
  });

  it('shows each staple name and area label', () => {
    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={new Set<string>()}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />
    );

    expect(screen.getByText('Apples')).toBeTruthy();
    expect(screen.getAllByText('Fridge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pantry').length).toBeGreaterThanOrEqual(1);
  });

  it('marks staples on the trip with green text; staples not on trip with strikethrough', () => {
    const tripItemNames = new Set(['Milk', 'Bread']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />
    );

    // Checked staples: green text, no strikethrough
    expect(screen.getByText('Milk')).toHaveStyle({ color: '#4CAF50' });
    expect(screen.getByText('Bread')).toHaveStyle({ color: '#4CAF50' });
    // Unchecked staples: gray strikethrough
    expect(screen.getByText('Apples')).toHaveStyle({ color: '#999999', textDecorationLine: 'line-through' });
    expect(screen.getByText('Cheese')).toHaveStyle({ color: '#999999', textDecorationLine: 'line-through' });
  });

  it('calls onAddStaple when tapping an unchecked staple', () => {
    const onAddStaple = jest.fn();
    const tripItemNames = new Set(['Milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={onAddStaple}
        onRemoveStaple={jest.fn()}
      />
    );

    fireEvent.press(screen.getByTestId('staple-row-Apples'));

    expect(onAddStaple).toHaveBeenCalledTimes(1);
    expect(onAddStaple).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apples', houseArea: 'Pantry' })
    );
  });

  it('calls onRemoveStaple when tapping a checked staple', () => {
    const onRemoveStaple = jest.fn();
    const tripItemNames = new Set(['Milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={jest.fn()}
        onRemoveStaple={onRemoveStaple}
      />
    );

    fireEvent.press(screen.getByTestId('staple-row-Milk'));

    expect(onRemoveStaple).toHaveBeenCalledTimes(1);
    expect(onRemoveStaple).toHaveBeenCalledWith('Milk');
  });
});

function renderAppInChecklistMode() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Bread', houseArea: 'Pantry', storeLocation: { section: 'Bakery', aisleNumber: null } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripAreas = ['Fridge', 'Pantry'];
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll());

  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

  render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
      <AppShell />
    </ServiceProvider>
  );

  // Switch to checklist mode to see the StapleChecklist
  fireEvent.press(screen.getByTestId('home-mode-checklist'));
}

describe('preloaded staples show as already on trip', () => {
  it('preloaded staples that are needed show green; skipped staples show strikethrough', () => {
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Pantry', storeLocation: { section: 'Bakery', aisleNumber: null } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripAreas = ['Fridge', 'Pantry'];
    const tripService = createTrip(tripStorage, tripAreas);
    tripService.start(stapleLibrary.listAll());

    // Skip Eggs during the sweep phase (needed becomes false)
    tripService.skipItem('Eggs');

    const areaStorage = createNullAreaStorage(tripAreas);
    const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);

    render(
      <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService} areaManagement={areaManagement}>
        <AppShell />
      </ServiceProvider>
    );

    // Switch to checklist mode to see StapleChecklist
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    // Preloaded and still needed -> green text
    expect(screen.getByText('Milk')).toHaveStyle({ color: '#4CAF50' });
    expect(screen.getByText('Bread')).toHaveStyle({ color: '#4CAF50' });

    // Preloaded but skipped (needed=false) -> strikethrough
    expect(screen.getByText('Eggs')).toHaveStyle({ color: '#999999', textDecorationLine: 'line-through' });
  });
});

describe('checklist mode shows staple checklist', () => {
  it('renders StapleChecklist in checklist mode', () => {
    renderAppInChecklistMode();

    // Staple checklist rows should appear
    expect(screen.getByTestId('staple-row-Bread')).toBeTruthy();
    expect(screen.getByTestId('staple-row-Milk')).toBeTruthy();
  });

  it('preloaded staples show as green in checklist mode', () => {
    renderAppInChecklistMode();

    // Both staples are already on the trip from preload, so they should be green
    expect(screen.getByText('Milk')).toHaveStyle({ color: '#4CAF50' });
    expect(screen.getByText('Bread')).toHaveStyle({ color: '#4CAF50' });
  });

  it('tapping a checked staple skips it and shows strikethrough', () => {
    renderAppInChecklistMode();

    // Tap Milk (already on trip = green) to skip it
    fireEvent.press(screen.getByTestId('staple-row-Milk'));

    // After skip, Milk should show strikethrough
    expect(screen.getByText('Milk')).toHaveStyle({ color: '#999999', textDecorationLine: 'line-through' });
  });

  it('tapping a skipped staple unskips it and shows green', () => {
    renderAppInChecklistMode();

    // First skip Milk
    fireEvent.press(screen.getByTestId('staple-row-Milk'));
    expect(screen.getByText('Milk')).toHaveStyle({ textDecorationLine: 'line-through' });

    // Now tap Milk again to unskip it
    fireEvent.press(screen.getByTestId('staple-row-Milk'));
    expect(screen.getByText('Milk')).toHaveStyle({ color: '#4CAF50' });
  });
});
