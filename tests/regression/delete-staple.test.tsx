/**
 * Regression test for Delete Staple button in MetadataBottomSheet edit mode.
 *
 * When MetadataBottomSheet is in edit mode and onDeleteStaple prop is provided,
 * a "Delete Staple" button is shown. Tapping it calls onDeleteStaple with the
 * stapleId and dismisses the sheet.
 *
 * Also verifies that HomeView wires onDeleteStaple to remove the staple from
 * the library and the corresponding item from the active trip.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../src/ui/MetadataBottomSheet';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../src/adapters/null/null-section-order-storage';
import {
  initializeApp,
  AdapterFactories,
  AppServices,
} from '../../src/hooks/useAppInitialization';
import { HouseArea } from '../../src/domain/types';

const AREAS: readonly HouseArea[] = ['Bathroom', 'Fridge', 'Freezer'];
const STAPLE_ID = 'staple-123';

const createNoopHandlers = () => ({
  onDismiss: jest.fn(),
  onSubmitStaple: jest.fn(),
  onSubmitTripItem: jest.fn(),
  onDeleteStaple: jest.fn(),
});

describe('edit mode shows delete button that calls onDeleteStaple', () => {
  it('shows Delete Staple button when in edit mode with onDeleteStaple provided', () => {
    const handlers = createNoopHandlers();

    render(
      <MetadataBottomSheet
        visible={true}
        itemName="Butter"
        mode="edit"
        editStapleId={STAPLE_ID}
        initialValues={{
          houseArea: 'Fridge',
          section: 'Dairy',
          aisleNumber: 3,
        }}
        areas={AREAS}
        onDismiss={handlers.onDismiss}
        onSubmitStaple={handlers.onSubmitStaple}
        onSubmitTripItem={handlers.onSubmitTripItem}
        onDeleteStaple={handlers.onDeleteStaple}
      />,
    );

    expect(screen.getByText('Delete Staple')).toBeTruthy();
  });

  it('tapping Delete Staple calls onDeleteStaple with stapleId and dismisses sheet', () => {
    const handlers = createNoopHandlers();

    render(
      <MetadataBottomSheet
        visible={true}
        itemName="Butter"
        mode="edit"
        editStapleId={STAPLE_ID}
        initialValues={{
          houseArea: 'Fridge',
          section: 'Dairy',
          aisleNumber: 3,
        }}
        areas={AREAS}
        onDismiss={handlers.onDismiss}
        onSubmitStaple={handlers.onSubmitStaple}
        onSubmitTripItem={handlers.onSubmitTripItem}
        onDeleteStaple={handlers.onDeleteStaple}
      />,
    );

    fireEvent.press(screen.getByText('Delete Staple'));

    expect(handlers.onDeleteStaple).toHaveBeenCalledWith(STAPLE_ID);
    expect(handlers.onDismiss).toHaveBeenCalled();
  });

  it('does not show Delete Staple button in add mode', () => {
    const handlers = createNoopHandlers();

    render(
      <MetadataBottomSheet
        visible={true}
        itemName="Butter"
        mode="add"
        areas={AREAS}
        onDismiss={handlers.onDismiss}
        onSubmitStaple={handlers.onSubmitStaple}
        onSubmitTripItem={handlers.onSubmitTripItem}
        onDeleteStaple={handlers.onDeleteStaple}
      />,
    );

    expect(screen.queryByText('Delete Staple')).toBeNull();
  });

  it('does not show Delete Staple button when onDeleteStaple is not provided', () => {
    render(
      <MetadataBottomSheet
        visible={true}
        itemName="Butter"
        mode="edit"
        editStapleId={STAPLE_ID}
        initialValues={{
          houseArea: 'Fridge',
          section: 'Dairy',
          aisleNumber: 3,
        }}
        areas={AREAS}
        onDismiss={jest.fn()}
        onSubmitStaple={jest.fn()}
        onSubmitTripItem={jest.fn()}
      />,
    );

    expect(screen.queryByText('Delete Staple')).toBeNull();
  });
});

const WIRING_AREAS = ['Bathroom', 'Fridge', 'Freezer'];

// Wires services through initializeApp (the production composition root) so
// that stapleLibrary.remove drives trip cleanup via stapleLibrary.subscribe ->
// handleStapleChange, exactly as in the running app. Null storages carry the
// seeded state; the extra initialize() matches InitializableStorage<T>.
async function createWiringTestServices(): Promise<AppServices> {
  const stapleStorage = {
    ...createNullStapleStorage([
      {
        name: 'Butter',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      },
      {
        name: 'Shampoo',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      },
    ]),
    initialize: async () => {},
  };
  const areaStorage = {
    ...createNullAreaStorage(WIRING_AREAS),
    initialize: async () => {},
  };
  const tripStorage = {
    ...createNullTripStorage(),
    initialize: async () => {},
  };
  const sectionOrderStorage = {
    ...createNullSectionOrderStorage(),
    initialize: async () => {},
  };
  const factories: AdapterFactories = {
    createStapleStorage: () => stapleStorage,
    createAreaStorage: () => areaStorage,
    createSectionOrderStorage: () => sectionOrderStorage,
    createTripStorage: () => tripStorage,
    checkMigrationNeeded: () => false,
    migrateToFirestore: () => {},
    createAsyncStapleStorage: () => ({
      ...createNullStapleStorage(),
      initialize: async () => {},
    }),
    createAsyncAreaStorage: () => ({
      ...createNullAreaStorage(),
      initialize: async () => {},
    }),
    createAsyncSectionOrderStorage: () => ({
      ...createNullSectionOrderStorage(),
      initialize: async () => {},
    }),
    createAsyncTripStorage: () => ({
      ...createNullTripStorage(),
      initialize: async () => {},
    }),
    migrateTripIfNeeded: () => {},
  };
  const result = await initializeApp({ uid: 'test', email: null }, factories);
  if (!result.isReady || result.services === null) {
    throw new Error(`initializeApp failed: ${result.error ?? 'unknown'}`);
  }
  return result.services;
}

describe('deleting staple removes from library and trip', () => {
  // sweep-ux-refresh replaced tap-to-edit with long-press (pencil icon on web),
  // so the edit sheet is opened with a longPress here.
  it('long-pressing a staple and tapping Delete Staple removes it from library and trip items list', async () => {
    const services = await createWiringTestServices();
    render(
      <ServiceProvider
        stapleLibrary={services.stapleLibrary}
        tripService={services.tripService}
        areaManagement={services.areaManagement}
        sectionOrderStorage={services.sectionOrderStorage}
      >
        <AppShell />
      </ServiceProvider>,
    );

    // Both items should be visible initially
    expect(screen.getByText('Butter')).toBeTruthy();
    expect(screen.getByText('Shampoo')).toBeTruthy();

    // Long-press "Butter" to open edit sheet
    fireEvent(screen.getByText('Butter'), 'longPress');
    expect(screen.getByText("Edit 'Butter'")).toBeTruthy();

    // Edit sheet should show Delete Staple button
    expect(screen.getByText('Delete Staple')).toBeTruthy();

    // Tap Delete Staple
    fireEvent.press(screen.getByText('Delete Staple'));

    // Sheet should dismiss
    expect(screen.queryByText("Edit 'Butter'")).toBeNull();

    // Butter should be removed from the trip items list
    expect(screen.queryByText('Butter')).toBeNull();

    // Shampoo should still be visible
    expect(screen.getByText('Shampoo')).toBeTruthy();

    // Butter should be removed from the staple library
    const remainingStaples = services.stapleLibrary.listAll();
    expect(remainingStaples.find((s) => s.name === 'Butter')).toBeUndefined();
    expect(remainingStaples.find((s) => s.name === 'Shampoo')).toBeTruthy();
  });
});
