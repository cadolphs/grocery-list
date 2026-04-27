/**
 * Walking Skeleton Acceptance Test - Rename Staple
 *
 * Outer-loop test for the rename-staple feature.
 * Driving port: MetadataBottomSheet component (UI is the user-facing entry
 * point for renaming a staple in edit mode).
 *
 * Strategy: First test enabled, rest use describe.skip (in milestone-1).
 * Implement until WS-RS-1 passes, then enable M1-RS-1 in milestone-1-rename.test.tsx.
 *
 * Story Trace:
 * - WS-RS-1: US-RS-01 AC1 + AC2 (Name pre-fill + Save persists rename and dismisses)
 *
 * WS Strategy: A (Full InMemory). Props are the driving boundary; no I/O,
 * no driven adapters in scope. See distill/wave-decisions.md DWD-3.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../../src/ui/MetadataBottomSheet';
import { HouseArea } from '../../../src/domain/types';

const AREAS: readonly HouseArea[] = ['Fridge', 'Kitchen Cabinets', 'Garage Pantry'];

const renderSheet = (
  overrides: Partial<React.ComponentProps<typeof MetadataBottomSheet>> = {},
) => {
  const onSubmitStaple = jest.fn();
  const onSubmitTripItem = jest.fn();
  const onSaveEdit = jest.fn();
  const onDismiss = jest.fn();
  const onFindDuplicate = jest.fn();
  const utils = render(
    <MetadataBottomSheet
      visible={true}
      itemName="Milkk"
      mode="edit"
      editStapleId="staple-milkk"
      // The Name field pre-fill is the contract under test. DELIVER will
      // extend EditInitialValues to include `name`. Today the cast is
      // permissive; the test fails RED on the runtime assertion below.
      initialValues={
        {
          name: 'Milkk',
          houseArea: 'Fridge',
          section: 'Dairy',
          aisleNumber: 3,
        } as React.ComponentProps<typeof MetadataBottomSheet>['initialValues']
      }
      areas={AREAS}
      existingSections={['Bakery', 'Dairy', 'Produce']}
      onDismiss={onDismiss}
      onSubmitStaple={onSubmitStaple}
      onSubmitTripItem={onSubmitTripItem}
      onSaveEdit={onSaveEdit}
      onFindDuplicate={onFindDuplicate}
      {...overrides}
    />,
  );
  return { ...utils, onSubmitStaple, onSubmitTripItem, onSaveEdit, onDismiss, onFindDuplicate };
};

// =============================================================================
// WS-RS-1: Renaming a staple persists the new name and dismisses the sheet
// =============================================================================

describe('WS-RS-1: Renaming a staple persists the new name and dismisses the sheet', () => {
  // AC1: Edit sheet renders a Name TextInput pre-filled with current name.
  // AC2: Save Changes with valid new name calls onSaveEdit({name, ...}) and dismisses.
  // Trace: US-RS-01 AC1, AC2

  it('pre-fills the Name field with the current name, accepts a rename, and saves through onSaveEdit', () => {
    // Given Clemens opens the edit sheet for "Milkk" in "Fridge"
    const { getByDisplayValue, getByText, onSaveEdit, onDismiss } = renderSheet();

    // Then the Name field is pre-filled with "Milkk"
    const nameField = getByDisplayValue('Milkk');
    expect(nameField).toBeTruthy();

    // When Clemens replaces the Name with "Milk"
    fireEvent.changeText(nameField, 'Milk');

    // And taps "Save Changes"
    fireEvent.press(getByText('Save Changes'));

    // Then onSaveEdit is called with the staple id and the new name in the changes payload
    expect(onSaveEdit).toHaveBeenCalledWith(
      'staple-milkk',
      expect.objectContaining({
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: expect.objectContaining({ section: 'Dairy', aisleNumber: 3 }),
      }),
    );

    // And the sheet dismisses
    expect(onDismiss).toHaveBeenCalled();
  });
});
