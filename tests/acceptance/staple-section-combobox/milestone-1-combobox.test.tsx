/**
 * Milestone 1 Acceptance Tests - Staple Section Combobox
 *
 * Builds on the walking skeleton. Each test enabled one-at-a-time during DELIVER.
 *
 * Story Trace:
 * - M1-SC-1: US-SC-01 AC3 (typing filters dropdown -- existing behaviour preserved)
 * - M1-SC-2: US-SC-01 AC4 (free-text new section saves successfully)
 * - M1-SC-3: US-SC-01 AC5 (empty existingSections shows hint, field still editable)
 * - M1-SC-4: US-SC-01 AC1 (alphabetical ordering of dropdown rows)
 * - M1-SC-5: US-SC-01 AC6 (edit-mode pre-fill behaviour unchanged)
 */

import { render, fireEvent } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../../src/ui/MetadataBottomSheet';
import { HouseArea } from '../../../src/domain/types';

const AREAS: readonly HouseArea[] = ['Fridge', 'Kitchen Cabinets', 'Garage Pantry'];

const renderSheet = (overrides: Partial<React.ComponentProps<typeof MetadataBottomSheet>> = {}) => {
  const onSubmitStaple = jest.fn();
  const onSubmitTripItem = jest.fn();
  const onDismiss = jest.fn();
  const onSaveEdit = jest.fn();
  const utils = render(
    <MetadataBottomSheet
      visible={true}
      itemName="Hummus"
      areas={AREAS}
      existingSections={['Bakery', 'Dairy', 'Produce']}
      onDismiss={onDismiss}
      onSubmitStaple={onSubmitStaple}
      onSubmitTripItem={onSubmitTripItem}
      onSaveEdit={onSaveEdit}
      {...overrides}
    />,
  );
  return { ...utils, onSubmitStaple, onSubmitTripItem, onDismiss, onSaveEdit };
};

// =============================================================================
// M1-SC-1: Typing filters the dropdown (existing behaviour preserved)
// =============================================================================

describe('M1-SC-1: Typing filters the section dropdown', () => {
  // AC3: Typing characters filters dropdown via case-insensitive prefix match
  // Trace: US-SC-01 AC3

  it('shows only matching sections when user types a prefix', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderSheet();

    // When Clemens types "Da" in the section field
    fireEvent.changeText(getByPlaceholderText('Store section...'), 'Da');

    // Then only "Dairy" remains in the dropdown
    expect(getByText('Dairy')).toBeTruthy();
    expect(queryByText('Bakery')).toBeNull();
    expect(queryByText('Produce')).toBeNull();
  });
});

// =============================================================================
// M1-SC-2: Free-text new section saves successfully
// =============================================================================

describe('M1-SC-2: Free-text new section is persisted', () => {
  // AC4: Saving with a new section persists the new value (no validation block)
  // Trace: US-SC-01 AC4

  it('saves a brand-new section that is not in existingSections', () => {
    const { getByPlaceholderText, getByText, getByTestId, onSubmitStaple } = renderSheet();

    // Given Clemens picks a house area
    fireEvent.press(getByTestId('area-button-Fridge'));

    // When Clemens types a new section name
    fireEvent.changeText(getByPlaceholderText('Store section...'), 'Frozen Foods');

    // And taps "Add Item"
    fireEvent.press(getByText('Add Item'));

    // Then the staple is persisted with section "Frozen Foods"
    expect(onSubmitStaple).toHaveBeenCalledWith(
      expect.objectContaining({
        storeLocation: expect.objectContaining({ section: 'Frozen Foods' }),
      }),
    );
  });
});

// =============================================================================
// M1-SC-3: Empty existingSections shows hint
// =============================================================================

describe.skip('M1-SC-3: Empty library shows hint, field stays editable', () => {
  // AC5: Empty existingSections shows hint instead of empty list
  // Trace: US-SC-01 AC5

  it('shows empty-state hint and lets user type a new section', () => {
    const { getByText, getByPlaceholderText, onSubmitStaple, getByTestId } = renderSheet({
      existingSections: [],
    });

    // Then the dropdown area shows the empty-state hint
    expect(getByText(/No saved sections yet/i)).toBeTruthy();

    // And the section input is still editable
    fireEvent.press(getByTestId('area-button-Fridge'));
    fireEvent.changeText(getByPlaceholderText('Store section...'), 'Produce');
    fireEvent.press(getByText('Add Item'));

    expect(onSubmitStaple).toHaveBeenCalledWith(
      expect.objectContaining({
        storeLocation: expect.objectContaining({ section: 'Produce' }),
      }),
    );
  });
});

// =============================================================================
// M1-SC-4: Dropdown rows are alphabetical
// =============================================================================

describe('M1-SC-4: Dropdown rows are alphabetical', () => {
  // AC1: existingSections rendered alphabetical when empty/focused
  // Trace: US-SC-01 AC1

  it('renders dropdown rows in alphabetical order regardless of input order', () => {
    const { getAllByTestId } = renderSheet({
      existingSections: ['Snacks', 'Bakery', 'Produce', 'Dairy'],
    });

    // Then dropdown row labels are alphabetical
    const rows = getAllByTestId(/^section-suggestion-/).map((node) => node.props.testID);
    expect(rows).toEqual([
      'section-suggestion-Bakery',
      'section-suggestion-Dairy',
      'section-suggestion-Produce',
      'section-suggestion-Snacks',
    ]);
  });
});

// =============================================================================
// M1-SC-5: Edit mode pre-fill behaviour is unchanged
// =============================================================================

describe.skip('M1-SC-5: Edit mode preserves current pre-fill behaviour', () => {
  // AC6: Edit-mode pre-filled section behaviour is unchanged
  // Trace: US-SC-01 AC6

  it('does not auto-show the full dropdown in edit mode when section is pre-filled', () => {
    const { queryByText, getByDisplayValue } = renderSheet({
      mode: 'edit',
      editStapleId: 'staple-1',
      itemName: 'Whole milk',
      initialValues: {
        houseArea: 'Fridge',
        section: 'Dairy',
        aisleNumber: 3,
      },
    });

    // Then the section field shows the current value
    expect(getByDisplayValue('Dairy')).toBeTruthy();

    // And the dropdown is NOT auto-displayed (no other section rows visible)
    expect(queryByText('Bakery')).toBeNull();
    expect(queryByText('Produce')).toBeNull();
  });
});
