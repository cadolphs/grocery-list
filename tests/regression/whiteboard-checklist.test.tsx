/**
 * Regression test for StapleChecklist component (whiteboard phase).
 *
 * StapleChecklist renders an alphabetically sorted list of all staples.
 * Each staple shows its name and a toggle button.
 * Staples already on the trip show as checked.
 * Tapping unchecked staple calls onAddStaple; tapping checked calls onRemoveStaple
 * with that staple (keyed by staple id, not name: #104).
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
import { theme } from '../../src/ui/theme';

// Trip operations take a trip item id; these tests name the item instead.
const itemIdNamed = (
  trip: { getItems: () => ReadonlyArray<{ id: string; name: string }> },
  name: string,
): string =>
  trip.getItems().find((item) => item.name === name)?.id ?? `missing-${name}`;

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
        neededStapleIds={new Set<string>()}
        onAddStaple={onAddStaple}
        onRemoveStaple={onRemoveStaple}
      />,
    );

    const stapleNames = screen
      .getAllByTestId(/^staple-row-/)
      .map((element) => element.props.testID);

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
        neededStapleIds={new Set<string>()}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />,
    );

    expect(screen.getByText('Apples')).toBeTruthy();
    expect(screen.getAllByText('Fridge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pantry').length).toBeGreaterThanOrEqual(1);
  });

  it('marks staples on the trip with green text; staples not on trip with strikethrough', () => {
    const neededStapleIds = new Set(['id-milk', 'id-bread']);

    render(
      <StapleChecklist
        staples={STAPLES}
        neededStapleIds={neededStapleIds}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />,
    );

    // Checked staples: green text, no strikethrough
    expect(screen.getByText('Milk')).toHaveStyle({ color: theme.color.text });
    expect(screen.getByText('Bread')).toHaveStyle({ color: theme.color.text });
    // Unchecked staples: gray strikethrough
    expect(screen.getByText('Apples')).toHaveStyle({
      color: theme.color.textMuted,
      textDecorationLine: 'line-through',
    });
    expect(screen.getByText('Cheese')).toHaveStyle({
      color: theme.color.textMuted,
      textDecorationLine: 'line-through',
    });
  });

  it('calls onAddStaple when tapping an unchecked staple', () => {
    const onAddStaple = jest.fn();
    const neededStapleIds = new Set(['id-milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        neededStapleIds={neededStapleIds}
        onAddStaple={onAddStaple}
        onRemoveStaple={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('staple-row-Apples'));

    expect(onAddStaple).toHaveBeenCalledTimes(1);
    expect(onAddStaple).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apples', houseArea: 'Pantry' }),
    );
  });

  it('calls onRemoveStaple when tapping a checked staple', () => {
    const onRemoveStaple = jest.fn();
    const neededStapleIds = new Set(['id-milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        neededStapleIds={neededStapleIds}
        onAddStaple={jest.fn()}
        onRemoveStaple={onRemoveStaple}
      />,
    );

    fireEvent.press(screen.getByTestId('staple-row-Milk'));

    expect(onRemoveStaple).toHaveBeenCalledTimes(1);
    expect(onRemoveStaple).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id-milk', name: 'Milk' }),
    );
  });
});

function renderAppInChecklistMode() {
  const stapleStorage = createNullStapleStorage([
    {
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    },
    {
      name: 'Bread',
      houseArea: 'Pantry',
      storeLocation: { section: 'Bakery', aisleNumber: null },
    },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripAreas = ['Fridge', 'Pantry'];
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.initializeFromStorage(stapleLibrary.listAll());
  // #96: staples start Undecided; mark them Needed as a finished sweep would.
  stapleLibrary
    .listAll()
    .forEach((s) =>
      tripService.setDecision(itemIdNamed(tripService, s.name), 'needed'),
    );

  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(
    areaStorage,
    stapleStorage,
    tripStorage,
  );

  render(
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      areaManagement={areaManagement}
    >
      <AppShell />
    </ServiceProvider>,
  );

  // Switch to checklist mode to see the StapleChecklist
  fireEvent.press(screen.getByTestId('home-mode-checklist'));
}

describe('preloaded staples show as already on trip', () => {
  it('preloaded staples that are needed show green; Not needed staples show strikethrough', () => {
    const stapleStorage = createNullStapleStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Bread',
        houseArea: 'Pantry',
        storeLocation: { section: 'Bakery', aisleNumber: null },
      },
      {
        name: 'Eggs',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripAreas = ['Fridge', 'Pantry'];
    const tripService = createTrip(tripStorage, tripAreas);
    tripService.initializeFromStorage(stapleLibrary.listAll());
    // #96: staples start Undecided; mark them Needed as a finished sweep would.
    stapleLibrary
      .listAll()
      .forEach((s) =>
        tripService.setDecision(itemIdNamed(tripService, s.name), 'needed'),
      );

    // Mark Eggs Not needed during the sweep phase
    tripService.setDecision(itemIdNamed(tripService, 'Eggs'), 'not-needed');

    const areaStorage = createNullAreaStorage(tripAreas);
    const areaManagement = createAreaManagement(
      areaStorage,
      stapleStorage,
      tripStorage,
    );

    render(
      <ServiceProvider
        stapleLibrary={stapleLibrary}
        tripService={tripService}
        areaManagement={areaManagement}
      >
        <AppShell />
      </ServiceProvider>,
    );

    // Switch to checklist mode to see StapleChecklist
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    // Preloaded and still needed -> green text
    expect(screen.getByText('Milk')).toHaveStyle({ color: theme.color.text });
    expect(screen.getByText('Bread')).toHaveStyle({ color: theme.color.text });

    // Preloaded but Not needed -> strikethrough
    expect(screen.getByText('Eggs')).toHaveStyle({
      color: theme.color.textMuted,
      textDecorationLine: 'line-through',
    });
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
    expect(screen.getByText('Milk')).toHaveStyle({ color: theme.color.text });
    expect(screen.getByText('Bread')).toHaveStyle({ color: theme.color.text });
  });

  it('tapping a checked staple marks it Not needed and shows strikethrough', () => {
    renderAppInChecklistMode();

    // Tap Milk (already on trip = green) to mark it Not needed
    fireEvent.press(screen.getByTestId('staple-row-Milk'));

    // After marking it Not needed, Milk should show strikethrough
    expect(screen.getByText('Milk')).toHaveStyle({
      color: theme.color.textMuted,
      textDecorationLine: 'line-through',
    });
  });

  it('tapping a Not needed staple makes it Needed and shows green', () => {
    renderAppInChecklistMode();

    // First mark Milk Not needed
    fireEvent.press(screen.getByTestId('staple-row-Milk'));
    expect(screen.getByText('Milk')).toHaveStyle({
      textDecorationLine: 'line-through',
    });

    // Now tap Milk again to make it Needed again
    fireEvent.press(screen.getByTestId('staple-row-Milk'));
    expect(screen.getByText('Milk')).toHaveStyle({ color: theme.color.text });
  });
});

// #104: the library allows one name in several house areas; the checklist
// must act on the row the user touched, not every staple of that name.
describe('same-named staples in different areas', () => {
  const renderTwoMilks = () => {
    const stapleStorage = createNullStapleStorage([
      {
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Milk',
        houseArea: 'Pantry',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripAreas = ['Fridge', 'Pantry'];
    const tripService = createTrip(tripStorage, tripAreas);
    tripService.initializeFromStorage(stapleLibrary.listAll());
    tripService
      .getItems()
      .forEach((item) => tripService.setDecision(item.id, 'needed'));
    const areaManagement = createAreaManagement(
      createNullAreaStorage(tripAreas),
      stapleStorage,
      tripStorage,
    );
    render(
      <ServiceProvider
        stapleLibrary={stapleLibrary}
        tripService={tripService}
        areaManagement={areaManagement}
      >
        <AppShell />
      </ServiceProvider>,
    );
    fireEvent.press(screen.getByTestId('home-mode-checklist'));
    return tripService;
  };

  const decisionIn = (
    tripService: ReturnType<typeof createTrip>,
    houseArea: string,
  ) =>
    tripService.getItems().find((item) => item.houseArea === houseArea)
      ?.decision;

  it('unticking one Milk leaves the other Milk Needed', () => {
    const tripService = renderTwoMilks();

    // Rows sort by name; the Fridge staple was added first.
    fireEvent.press(screen.getAllByTestId('staple-row-Milk')[0]!);

    expect([
      decisionIn(tripService, 'Fridge'),
      decisionIn(tripService, 'Pantry'),
    ]).toEqual(['not-needed', 'needed']);
  });

  it('a Not needed Milk shows unticked while the other Milk stays ticked', () => {
    const tripService = renderTwoMilks();

    fireEvent.press(screen.getAllByTestId('staple-row-Milk')[0]!);

    const [fridgeMilk, pantryMilk] = screen.getAllByText('Milk');
    expect(fridgeMilk).toHaveStyle({ textDecorationLine: 'line-through' });
    expect(pantryMilk).not.toHaveStyle({ textDecorationLine: 'line-through' });
    expect(decisionIn(tripService, 'Pantry')).toBe('needed');
  });
});
