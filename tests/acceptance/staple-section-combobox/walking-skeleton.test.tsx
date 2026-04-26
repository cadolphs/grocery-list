/**
 * Walking Skeleton Acceptance Test - Staple Section Combobox
 *
 * Outer-loop test for the staple-section-combobox feature.
 * Driving port: MetadataBottomSheet component (UI is the user-facing entry point
 * for adding a staple).
 *
 * Strategy: First test enabled, rest use it.skip.
 * Implement until it passes, then enable the next.
 *
 * Story Trace:
 * - WS-SC-1: US-SC-01 (Section dropdown visible immediately on add)
 *
 * WS Strategy: A (InMemory / component-only). Props are the boundary;
 * no I/O, no driven adapters in scope.
 */

import { render, fireEvent } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../../src/ui/MetadataBottomSheet';
import { HouseArea } from '../../../src/domain/types';

const AREAS: readonly HouseArea[] = ['Fridge', 'Kitchen Cabinets', 'Garage Pantry'];

const renderSheet = (overrides: Partial<React.ComponentProps<typeof MetadataBottomSheet>> = {}) => {
  const onSubmitStaple = jest.fn();
  const onSubmitTripItem = jest.fn();
  const onDismiss = jest.fn();
  const utils = render(
    <MetadataBottomSheet
      visible={true}
      itemName="Hummus"
      areas={AREAS}
      existingSections={['Bakery', 'Dairy', 'Produce']}
      onDismiss={onDismiss}
      onSubmitStaple={onSubmitStaple}
      onSubmitTripItem={onSubmitTripItem}
      {...overrides}
    />,
  );
  return { ...utils, onSubmitStaple, onSubmitTripItem, onDismiss };
};

// =============================================================================
// WS-SC-1: Section dropdown visible immediately, tap fills field, save persists
// =============================================================================

describe('WS-SC-1: Section combobox shows known sections immediately', () => {
  // AC1: In add mode, section field renders dropdown with all unique
  //      existingSections (alphabetical) when empty/focused
  // AC2: Tapping a dropdown row fills the field and closes the dropdown
  // Trace: US-SC-01

  it('shows known sections on open and fills the field when one is tapped', () => {
    // Given Clemens opens "Add Hummus" with Bakery, Dairy, Produce as known sections
    const { getByText, onSubmitStaple } = renderSheet();

    // Then the section dropdown shows Bakery, Dairy, Produce immediately
    expect(getByText('Bakery')).toBeTruthy();
    expect(getByText('Dairy')).toBeTruthy();
    expect(getByText('Produce')).toBeTruthy();

    // When Clemens taps "Dairy"
    fireEvent.press(getByText('Dairy'));

    // And taps "Add Item" (the staple-add submit)
    fireEvent.press(getByText('Add Item'));

    // Then the staple is persisted with section "Dairy"
    expect(onSubmitStaple).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hummus',
        storeLocation: expect.objectContaining({ section: 'Dairy' }),
      }),
    );
  });
});
