/**
 * Regression tests: SectionOrderSettingsScreen
 *
 * Verifies the settings screen renders known sections, supports reordering
 * via up/down buttons, and provides a reset-to-default button.
 * Accessible from HomeView settings area.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../../src/domain/trip';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
import { SectionOrderStorage } from '../../../src/ports/section-order-storage';

type StapleSeed = {
  readonly name: string;
  readonly houseArea: string;
  readonly storeLocation: { section: string; aisleNumber: number | null };
};

const defaultStapleSeeds: readonly StapleSeed[] = [
  { name: 'Deli Turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } },
  { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: 1 } },
];

function renderAppWithSections(
  customOrder: string[] | null,
  stapleSeeds: readonly StapleSeed[] = defaultStapleSeeds,
): { storage: SectionOrderStorage } {
  const stapleStorage = createNullStapleStorage([...stapleSeeds]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(stapleLibrary.listAll());

  const storage = createNullSectionOrderStorage(customOrder);

  render(
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      sectionOrderStorage={storage}
    >
      <AppShell />
    </ServiceProvider>
  );

  return { storage };
}

function navigateToSectionOrderSettings() {
  fireEvent.press(screen.getByText('Settings'));
  fireEvent.press(screen.getByText('Section Order'));
}

describe('SectionOrderSettingsScreen', () => {
  it('is accessible from HomeView settings area', () => {
    renderAppWithSections(null);
    fireEvent.press(screen.getByText('Settings'));

    expect(screen.getByText('Section Order')).toBeTruthy();
  });

  it('shows known sections from staple library', () => {
    renderAppWithSections(null);
    navigateToSectionOrderSettings();

    // Should show all 3 sections known from staples
    expect(screen.getByText(/Bakery/)).toBeTruthy();
    expect(screen.getByText(/Dairy/)).toBeTruthy();
    expect(screen.getByText(/Deli/)).toBeTruthy();
  });

  it('shows sections in custom order when custom order is set', () => {
    renderAppWithSections(['Deli::null', 'Dairy::3', 'Bakery::1']);
    navigateToSectionOrderSettings();

    const sectionRows = screen.getAllByTestId(/^section-row-/);
    expect(sectionRows).toHaveLength(3);
    expect(sectionRows[0].props.testID).toBe('section-row-Deli');
    expect(sectionRows[1].props.testID).toBe('section-row-Dairy');
    expect(sectionRows[2].props.testID).toBe('section-row-Bakery');
  });

  it('moves a section down when down button is pressed', () => {
    renderAppWithSections(['Deli::null', 'Dairy::3', 'Bakery::1']);
    navigateToSectionOrderSettings();

    // Move Deli down (from index 0 to index 1)
    fireEvent.press(screen.getByTestId('move-down-Deli'));

    const sectionRows = screen.getAllByTestId(/^section-row-/);
    expect(sectionRows[0].props.testID).toBe('section-row-Dairy');
    expect(sectionRows[1].props.testID).toBe('section-row-Deli');
    expect(sectionRows[2].props.testID).toBe('section-row-Bakery');
  });

  it('moves a section up when up button is pressed', () => {
    renderAppWithSections(['Deli::null', 'Dairy::3', 'Bakery::1']);
    navigateToSectionOrderSettings();

    // Move Bakery up (from index 2 to index 1)
    fireEvent.press(screen.getByTestId('move-up-Bakery'));

    const sectionRows = screen.getAllByTestId(/^section-row-/);
    expect(sectionRows[0].props.testID).toBe('section-row-Deli');
    expect(sectionRows[1].props.testID).toBe('section-row-Bakery');
    expect(sectionRows[2].props.testID).toBe('section-row-Dairy');
  });

  it('resets to default order and persists', () => {
    const { storage } = renderAppWithSections(['Deli::null', 'Dairy::3', 'Bakery::1']);
    navigateToSectionOrderSettings();

    fireEvent.press(screen.getByText('Reset to Default Order'));
    // Confirm reset
    fireEvent.press(screen.getByTestId('confirm-reset-section-order'));

    // Storage should be cleared
    expect(storage.loadOrder()).toBeNull();
  });

  it('appends newly-introduced sections to the end when a custom order is saved', () => {
    // Custom order saved for three known sections
    const savedOrder = ['Deli::null', 'Dairy::3', 'Bakery::1'];
    // Staple library includes a staple whose storeLocation introduces a brand-new section key
    const stapleSeeds: readonly StapleSeed[] = [
      { name: 'Deli Turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } },
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: 1 } },
      { name: 'California Roll', houseArea: 'Fridge', storeLocation: { section: 'Sushi Bar', aisleNumber: null } },
    ];

    const { storage } = renderAppWithSections(savedOrder, stapleSeeds);
    navigateToSectionOrderSettings();

    const sectionRows = screen.getAllByTestId(/^section-row-/);
    expect(sectionRows).toHaveLength(4);
    expect(sectionRows[0].props.testID).toBe('section-row-Deli');
    expect(sectionRows[1].props.testID).toBe('section-row-Dairy');
    expect(sectionRows[2].props.testID).toBe('section-row-Bakery');
    expect(sectionRows[3].props.testID).toBe('section-row-Sushi Bar');

    // Read-time merge only: opening the screen must NOT have written to storage.
    expect(storage.loadOrder()).toEqual(savedOrder);
  });
});
