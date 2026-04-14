/**
 * Walking Skeleton Acceptance Tests - Web UX Polish (Keyboard Flow)
 *
 * Core keyboard-driven add flow on desktop web:
 *   type item name -> Enter -> sheet opens -> fill fields -> Enter -> submit ->
 *   focus returns to QuickAdd -> type next item.
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - Platform detection: useIsWeb() hook (mocked per test)
 * - User actions: fireEvent (changeText, submitEditing, press)
 *
 * Story Trace:
 * - US-01: Autofocus QuickAdd input on web
 * - US-02: Enter in QuickAdd opens metadata sheet with typed name
 * - US-03: Enter in metadata sheet submits the form
 * - US-05: Focus returns to QuickAdd after sheet dismiss
 *
 * Mobile non-regression: each web behavior is accompanied by a mobile-default
 * scenario that asserts the behavior is ABSENT on iOS/Android.
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

function setWebPlatform(isWeb: boolean) {
  mockedUseIsWeb.mockReturnValue(isWeb);
}

function createTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Fridge', 'Kitchen Cabinets'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  tripService.start(stapleLibrary.listAll().filter(s => s.type === 'staple'));
  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  return { stapleLibrary, tripService, areaManagement };
}

function renderApp() {
  const services = createTestServices();
  render(
    <ServiceProvider stapleLibrary={services.stapleLibrary} tripService={services.tripService} areaManagement={services.areaManagement}>
      <AppShell />
    </ServiceProvider>
  );
  return services;
}

beforeEach(() => {
  mockedUseIsWeb.mockReset();
});

// =============================================================================
// WS-1: Autofocus QuickAdd input on web page load (US-01)
// =============================================================================

describe('WS-1: QuickAdd input autofocuses on web', () => {
  // AC: On web, the QuickAdd "Add an item..." input receives focus on mount
  // AC: On mobile, the input does NOT autofocus (would pop keyboard unexpectedly)
  // Driving port: QuickAdd TextInput autoFocus prop

  it('sets autoFocus on QuickAdd input when running on web', () => {
    setWebPlatform(true);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    expect(input.props.autoFocus).toBe(true);
  });

  it('does NOT set autoFocus on QuickAdd input when running on mobile', () => {
    setWebPlatform(false);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    expect(input.props.autoFocus).toBeFalsy();
  });
});

// =============================================================================
// WS-2: Enter in QuickAdd opens sheet (US-02)
// =============================================================================

describe('WS-2: Enter key in QuickAdd opens metadata sheet with typed name', () => {
  // AC: Pressing Enter (submitEditing) in QuickAdd with a non-empty name opens
  //     the metadata sheet with that name prefilled
  // AC: Pressing Enter with empty input is a no-op (no sheet opens)
  // Driving port: QuickAdd TextInput onSubmitEditing

  it('opens metadata sheet with the typed name when Enter is pressed', () => {
    setWebPlatform(true);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Tahini');
    fireEvent(input, 'submitEditing');

    // Sheet opens with "Add 'Tahini'" title
    expect(screen.getByText("Add 'Tahini'")).toBeTruthy();
  });

  it('does nothing when Enter is pressed with empty input', () => {
    setWebPlatform(true);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent(input, 'submitEditing');

    // No sheet appears
    expect(screen.queryByText(/Add '/)).toBeNull();
  });

  it('also works on mobile (cross-platform keyboard submit)', () => {
    setWebPlatform(false);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Tahini');
    fireEvent(input, 'submitEditing');

    expect(screen.getByText("Add 'Tahini'")).toBeTruthy();
  });
});

// =============================================================================
// WS-3: Enter in metadata sheet submits form (US-03)
// =============================================================================

describe('WS-3: Enter key in metadata sheet submits the form', () => {
  // AC: Pressing Enter on the last text input (Aisle number) submits the form
  // Driving port: MetadataBottomSheet TextInput onSubmitEditing

  it('submits the form when Enter is pressed on the Aisle number input', () => {
    setWebPlatform(true);
    const services = renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Tahini');
    fireEvent(input, 'submitEditing');

    // In the sheet, default type is "Staple", default area is 'Kitchen Cabinets'
    // Fill section and aisle
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'International');
    const aisleInput = screen.getByPlaceholderText('Aisle number');
    fireEvent.changeText(aisleInput, '7');

    // Press Enter on aisle input
    fireEvent(aisleInput, 'submitEditing');

    // Sheet dismisses, item is in trip
    expect(screen.queryByText("Add 'Tahini'")).toBeNull();
    const tripItems = services.tripService.getItems();
    expect(tripItems.some(i => i.name === 'Tahini' && i.itemType === 'staple')).toBe(true);
  });
});

// =============================================================================
// WS-5: Focus returns to QuickAdd after sheet dismiss (US-05)
// =============================================================================

describe.skip('WS-5: Focus returns to QuickAdd input after sheet is dismissed', () => {
  // AC: On web, when the metadata sheet dismisses (submit or cancel), focus
  //     returns to the QuickAdd input so the user can immediately type the next item
  // AC: On mobile, no explicit refocus happens
  // Driving port: QuickAdd imperative focus() + HomeView handleDismiss
  //
  // NOTE: This scenario verifies focus through a testable proxy — we check that
  // QuickAdd's ref.focus() is invoked on sheet dismiss. jsdom focus assertions
  // are unreliable, so the implementation must expose an observable marker
  // (e.g., a testID-addressable focus counter or onFocus callback we can spy on).

  it('refocuses QuickAdd input after sheet is dismissed on web', () => {
    setWebPlatform(true);
    renderApp();

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Tahini');
    fireEvent(input, 'submitEditing');

    // Add the item
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'International');
    fireEvent.press(screen.getByText('Add Item'));

    // Assertion: input has the "focused" marker (implementation-defined).
    // Consumers verify via onFocus spy or visible autofocus-triggering prop
    // change. Exact assertion shape deferred to implementation.
    expect(input.props.autoFocus).toBe(true);
  });
});
