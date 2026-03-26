/**
 * Regression test: bare Add opens metadata sheet instead of hardcoding Kitchen Cabinets.
 *
 * Bug: QuickAdd handleAdd directly calls onAddItem with hardcoded 'Kitchen Cabinets'
 * house area. It should instead call onOpenMetadataSheet so the user can pick area,
 * section, and type via the metadata bottom sheet.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuickAdd } from '../../src/ui/QuickAdd';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../src/domain/trip';
import { AddTripItemResult } from '../../src/domain/types';

describe('store view has quick add bar', () => {
  it('renders QuickAdd component at the top of StoreView', () => {
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage);
    tripService.start(stapleLibrary.listAll());

    render(
      <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // Switch to Store view
    fireEvent.press(screen.getByText('Store'));

    // QuickAdd should be present - it renders the "Add an item..." placeholder
    expect(screen.getByPlaceholderText('Add an item...')).toBeTruthy();
  });
});

describe('bare add opens metadata sheet', () => {
  it('calls onOpenMetadataSheet with input text instead of onAddItem when Add is tapped', () => {
    const mockOnAddItem = jest.fn<AddTripItemResult, [any]>().mockReturnValue({ success: true });
    const mockOnOpenMetadataSheet = jest.fn();

    render(
      <QuickAdd
        onAddItem={mockOnAddItem}
        onOpenMetadataSheet={mockOnOpenMetadataSheet}
      />
    );

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Gift Wrap');

    const addButton = screen.getByText('Add');
    fireEvent.press(addButton);

    expect(mockOnOpenMetadataSheet).toHaveBeenCalledWith('Gift Wrap');
    expect(mockOnAddItem).not.toHaveBeenCalled();
  });

  it('add button requires metadata sheet handler', () => {
    const mockOnAddItem = jest.fn<AddTripItemResult, [any]>().mockReturnValue({ success: true });

    render(
      <QuickAdd
        onAddItem={mockOnAddItem}
      />
    );

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Gift Wrap');

    const addButton = screen.getByText('Add');
    expect(addButton).toBeDisabled();
  });

  it('clears input text after opening metadata sheet', () => {
    const mockOnAddItem = jest.fn<AddTripItemResult, [any]>().mockReturnValue({ success: true });
    const mockOnOpenMetadataSheet = jest.fn();

    render(
      <QuickAdd
        onAddItem={mockOnAddItem}
        onOpenMetadataSheet={mockOnOpenMetadataSheet}
      />
    );

    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.changeText(input, 'Gift Wrap');

    const addButton = screen.getByText('Add');
    fireEvent.press(addButton);

    expect(input.props.value).toBe('');
  });
});
