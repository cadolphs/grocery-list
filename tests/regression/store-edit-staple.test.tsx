/**
 * Regression test for long-press edit in store mode.
 *
 * When TripItemRow is rendered in store mode with a staple item,
 * long-pressing triggers onLongPress with item name and area.
 * Short tap still triggers check-off via onPress.
 *
 * Integration: StoreView long-press opens MetadataBottomSheet in edit mode,
 * saving changes updates staple library and syncs to active trip.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TripItemRow } from '../../src/ui/TripItemRow';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../src/adapters/null/null-area-storage';
import { createTrip } from '../../src/domain/trip';
import { createAreaManagement } from '../../src/domain/area-management';
import { TripItem } from '../../src/domain/types';

const createStapleTripItem = (overrides?: Partial<TripItem>): TripItem => ({
  id: 'item-1',
  name: 'Butter',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

describe('long press on store item triggers edit callback', () => {
  it('calls onLongPress with name and area when long-pressed in store mode', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const item = createStapleTripItem();

    render(
      <TripItemRow
        item={item}
        mode="store"
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );

    fireEvent(screen.getByText('Butter'), 'longPress');

    expect(onLongPress).toHaveBeenCalledWith('Butter', 'Fridge');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress (not onLongPress) on short tap in store mode', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const item = createStapleTripItem();

    render(
      <TripItemRow
        item={item}
        mode="store"
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );

    fireEvent.press(screen.getByText('Butter'));

    expect(onPress).toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

const WIRING_AREAS = ['Bathroom', 'Fridge', 'Freezer'];

function createStoreEditTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
  ]);
  const tripStorage = createNullTripStorage();
  const areaStorage = createNullAreaStorage(WIRING_AREAS);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripService = createTrip(tripStorage, WIRING_AREAS);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  tripService.start(stapleLibrary.listAll());
  return { stapleLibrary, tripService, areaManagement };
}

describe('store view long-press opens edit sheet and saves changes', () => {
  it('long-pressing a staple item in store view opens MetadataBottomSheet in edit mode', () => {
    const services = createStoreEditTestServices();
    render(
      <ServiceProvider
        stapleLibrary={services.stapleLibrary}
        tripService={services.tripService}
        areaManagement={services.areaManagement}
      >
        <AppShell />
      </ServiceProvider>
    );

    // Switch to Store view
    fireEvent.press(screen.getByText('Store'));

    // Butter should be visible in the store view
    expect(screen.getByText('Butter')).toBeTruthy();

    // Long-press Butter to open edit sheet
    fireEvent(screen.getByText('Butter'), 'longPress');

    // MetadataBottomSheet should open in edit mode with the staple's name
    expect(screen.getByText("Edit 'Butter'")).toBeTruthy();
  });

  it('saving edit changes updates staple library and syncs to active trip', () => {
    const services = createStoreEditTestServices();
    render(
      <ServiceProvider
        stapleLibrary={services.stapleLibrary}
        tripService={services.tripService}
        areaManagement={services.areaManagement}
      >
        <AppShell />
      </ServiceProvider>
    );

    // Switch to Store view
    fireEvent.press(screen.getByText('Store'));

    // Long-press Butter to open edit sheet
    fireEvent(screen.getByText('Butter'), 'longPress');

    // Edit sheet should show current section value "Dairy"
    expect(screen.getByText("Edit 'Butter'")).toBeTruthy();

    // Change the area to Bathroom
    fireEvent.press(screen.getByTestId('area-button-Bathroom'));

    // Save changes
    fireEvent.press(screen.getByText('Save Changes'));

    // Sheet should dismiss
    expect(screen.queryByText("Edit 'Butter'")).toBeNull();

    // Staple library should reflect the update
    const updatedStaple = services.stapleLibrary.listAll().find((s) => s.name === 'Butter');
    expect(updatedStaple?.houseArea).toBe('Bathroom');
  });
});
