/**
 * Regression test: Tapping a staple item with stapleId=null opens edit sheet.
 *
 * Bug: TripItemRow checks item.stapleId for truthiness before calling onEditStaple.
 * Trip items from stapleInputToTripItem can have stapleId=null when the staple
 * has no id field, preventing the edit sheet from opening.
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

const AREAS = ['Bathroom', 'Fridge', 'Freezer'];

function renderAppWithNullStapleId() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const areaStorage = createNullAreaStorage(AREAS);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  const tripService = createTrip(tripStorage, AREAS);

  // Start trip WITHOUT passing staple ids -- stapleId will be null on trip items
  tripService.start([
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);

  // Verify the trip item has stapleId=null (the bug condition)
  const items = tripService.getItems();
  expect(items[0].stapleId).toBeNull();

  render(
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      areaManagement={areaManagement}
    >
      <AppShell />
    </ServiceProvider>
  );
}

describe('Tap staple with stapleId=null opens edit sheet', () => {
  it('tapping a staple item with null stapleId opens the edit sheet', () => {
    renderAppWithNullStapleId();

    // Tap the "Butter" item name
    fireEvent.press(screen.getByText('Butter'));

    // Edit sheet should open with the edit title
    expect(screen.getByText("Edit 'Butter'")).toBeTruthy();
    expect(screen.getByText('Save Changes')).toBeTruthy();
  });
});
