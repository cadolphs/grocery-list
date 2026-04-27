/**
 * Regression test: StoreView renders sections in custom order
 * when sectionOrderStorage has a saved custom order.
 *
 * Verifies the integration of useSectionOrder hook with StoreView
 * and sortByCustomOrder domain function.
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

function renderAppWithCustomOrder(customOrder: string[] | null) {
  const stapleStorage = createNullStapleStorage([
    { name: 'Deli Turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } },
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Bread', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Bakery', aisleNumber: 1 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(stapleLibrary.listAll());

  const sectionOrderStorage = createNullSectionOrderStorage(customOrder);

  render(
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      sectionOrderStorage={sectionOrderStorage}
    >
      <AppShell />
    </ServiceProvider>
  );

  // Switch to Store view
  fireEvent.press(screen.getByText('Store'));
}

describe('StoreView section ordering integration', () => {
  it('renders sections in custom order when custom order is set', () => {
    // Custom order: Deli first, then Dairy, then Bakery
    renderAppWithCustomOrder(['Deli', 'Dairy', 'Bakery']);

    // Get all section headers by testID pattern
    const storeScroll = screen.getByTestId('store-scroll');
    // Verify Deli appears before Dairy and Dairy before Bakery
    const allText = screen.getByTestId('store-scroll').children;

    // Use getAllByTestId to find aisle section headers
    const sectionHeaders = screen.getAllByTestId(/^aisle-section-/);
    expect(sectionHeaders).toHaveLength(3);
    expect(sectionHeaders[0].props.testID).toBe('aisle-section-Deli');
    expect(sectionHeaders[1].props.testID).toBe('aisle-section-Dairy');
    expect(sectionHeaders[2].props.testID).toBe('aisle-section-Bakery');
  });

  it('renders sections in default order when no custom order is set', () => {
    renderAppWithCustomOrder(null);

    const sectionHeaders = screen.getAllByTestId(/^aisle-section-/);
    expect(sectionHeaders).toHaveLength(3);
    // Default: numbered aisles first (Bakery aisle 1, Dairy aisle 3), then named (Deli null)
    expect(sectionHeaders[0].props.testID).toBe('aisle-section-Bakery');
    expect(sectionHeaders[1].props.testID).toBe('aisle-section-Dairy');
    expect(sectionHeaders[2].props.testID).toBe('aisle-section-Deli');
  });
});
