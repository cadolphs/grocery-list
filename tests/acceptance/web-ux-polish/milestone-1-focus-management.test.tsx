/**
 * Milestone 1 Acceptance Tests - Focus Management in Metadata Sheet
 *
 * Tests for US-04: Autofocus first editable field when sheet opens on web.
 *
 * Story Trace:
 * - US-04: Autofocus Store section input when sheet opens on web
 */

jest.mock('../../../src/hooks/useIsWeb');

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
import { useIsWeb } from '../../../src/hooks/useIsWeb';

const mockedUseIsWeb = useIsWeb as jest.MockedFunction<typeof useIsWeb>;

function renderApp() {
  const stapleStorage = createNullStapleStorage([]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Fridge', 'Kitchen Cabinets'];
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
}

function openSheet(name: string) {
  const input = screen.getByPlaceholderText('Add an item...');
  fireEvent.changeText(input, name);
  fireEvent(input, 'submitEditing');
}

beforeEach(() => {
  mockedUseIsWeb.mockReset();
});

// =============================================================================
// M1-1: Autofocus Store section input on web (US-04)
// =============================================================================

describe('M1-1: Store section input autofocuses when sheet opens on web', () => {
  // AC: On web, when the metadata sheet becomes visible, the "Store section..."
  //     TextInput receives focus so user can type immediately.
  // AC: On mobile, the section input does NOT autofocus.
  // Driving port: MetadataBottomSheet section TextInput autoFocus (conditional on isWeb)

  it('sets autoFocus on Store section input when sheet opens on web', () => {
    mockedUseIsWeb.mockReturnValue(true);
    renderApp();
    openSheet('Tahini');

    const sectionInput = screen.getByPlaceholderText('Store section...');
    expect(sectionInput.props.autoFocus).toBe(true);
  });

  it('does NOT autofocus Store section input on mobile', () => {
    mockedUseIsWeb.mockReturnValue(false);
    renderApp();
    openSheet('Tahini');

    const sectionInput = screen.getByPlaceholderText('Store section...');
    expect(sectionInput.props.autoFocus).toBeFalsy();
  });
});
