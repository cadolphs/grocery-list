/**
 * Milestone 1 Acceptance Tests - Rename Staple
 *
 * Builds on the walking skeleton (WS-RS-1). Each describe.skip block is
 * unskipped one-at-a-time during DELIVER, after the prior scenario is GREEN.
 *
 * Driving port: MetadataBottomSheet component (props boundary).
 * WS Strategy: A (Full InMemory). See distill/wave-decisions.md DWD-3.
 *
 * Story Trace (US-RS-01 from docs/feature/rename-staple/discuss/user-stories.md):
 * - M1-RS-1: AC4 — Empty name → inline error "Name is required", no save, sheet stays
 * - M1-RS-2: AC4 — Whitespace-only name → inline error "Name is required", no save, sheet stays
 * - M1-RS-3: AC5 — Duplicate name+area → inline error "<name> already exists in <area>", no save
 * - M1-RS-4: AC6 — Same name in a different area is allowed (rename succeeds)
 * - M1-RS-5: AC7 — Active trip-item sync via stapleId (changes payload includes name)
 * - M1-RS-6: AC8 — No-op save (name unchanged) succeeds and dismisses
 * - M1-RS-7: AC9 — Add mode unchanged: no Name TextInput appears
 * - M1-RS-8: implicit invariant — sheet title remains `Edit '${itemName}'` snapshot
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../../src/ui/MetadataBottomSheet';
import { HouseArea, StapleItem } from '../../../src/domain/types';

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
// M1-RS-1: Empty name is rejected with inline error
// =============================================================================

describe('M1-RS-1: Empty name is rejected with inline error', () => {
  // AC4: Empty name causes the sheet to stay open with inline error
  //      "Name is required" near the Name field. The staple is not modified.
  // Trace: US-RS-01 AC4 (empty branch)

  it('shows "Name is required" and does not save when the Name field is empty', () => {
    // Given Clemens is editing "Milkk" in "Fridge"
    const { getByDisplayValue, getByText, queryByText, onSaveEdit, onDismiss } = renderSheet();
    const nameField = getByDisplayValue('Milkk');

    // When Clemens clears the Name field
    fireEvent.changeText(nameField, '');

    // And taps "Save Changes"
    fireEvent.press(getByText('Save Changes'));

    // Then the inline error "Name is required" is visible
    expect(getByText('Name is required')).toBeTruthy();

    // And the duplicate-error variant is NOT shown
    expect(queryByText(/already exists in/)).toBeNull();

    // And onSaveEdit is NOT called (staple is unchanged)
    expect(onSaveEdit).not.toHaveBeenCalled();

    // And the sheet stays open (onDismiss NOT called)
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// =============================================================================
// M1-RS-2: Whitespace-only name is rejected with inline error
// =============================================================================

describe('M1-RS-2: Whitespace-only name is rejected with inline error', () => {
  // AC4: Whitespace-only name (after trim) causes the sheet to stay open
  //      with inline error "Name is required". The staple is not modified.
  // Trace: US-RS-01 AC4 (whitespace branch — collapses into AC4 via trim())

  it('treats whitespace-only as empty and shows "Name is required"', () => {
    // Given Clemens is editing "Milkk" in "Fridge"
    const { getByDisplayValue, getByText, onSaveEdit, onDismiss } = renderSheet();
    const nameField = getByDisplayValue('Milkk');

    // When Clemens replaces the Name with "   "
    fireEvent.changeText(nameField, '   ');

    // And taps "Save Changes"
    fireEvent.press(getByText('Save Changes'));

    // Then the inline error "Name is required" is visible
    expect(getByText('Name is required')).toBeTruthy();

    // And onSaveEdit is NOT called
    expect(onSaveEdit).not.toHaveBeenCalled();

    // And the sheet stays open
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// =============================================================================
// M1-RS-3: Duplicate name in same area is rejected with inline error
// =============================================================================

describe('M1-RS-3: Duplicate name in same area is rejected with inline error', () => {
  // AC5: Renaming to a name that already exists for another staple in the
  //      same area causes the sheet to stay open with inline error
  //      `"<name>" already exists in <area>`. The staple is not modified.
  // Trace: US-RS-01 AC5

  it('shows the duplicate error and does not save when the new name conflicts in the same area', () => {
    // Given Clemens has staples "Milkk" and "Milk" both in "Fridge".
    // The component checks for duplicates by asking onFindDuplicate(name, area);
    // the test stubs it to return an existing "Milk" in "Fridge" when asked.
    const existingMilk: StapleItem = {
      id: 'staple-milk-fridge',
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
      type: 'staple',
      createdAt: '2026-04-26T00:00:00.000Z',
    };
    const onFindDuplicate = jest.fn((name: string, area: HouseArea) =>
      name === 'Milk' && area === 'Fridge' ? existingMilk : undefined,
    );

    const { getByDisplayValue, getByText, onSaveEdit, onDismiss } = renderSheet({
      onFindDuplicate,
    });
    const nameField = getByDisplayValue('Milkk');

    // When Clemens changes the Name to "Milk" and taps Save Changes
    fireEvent.changeText(nameField, 'Milk');
    fireEvent.press(getByText('Save Changes'));

    // Then the inline duplicate error is visible
    expect(getByText('"Milk" already exists in Fridge')).toBeTruthy();

    // And onSaveEdit is NOT called (staple is unchanged)
    expect(onSaveEdit).not.toHaveBeenCalled();

    // And the sheet stays open
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// =============================================================================
// M1-RS-4: Same name in a different area is allowed
// =============================================================================

describe('M1-RS-4: Same name in a different area is allowed', () => {
  // AC6: Renaming to a name that exists in a different area is allowed; both
  //      staples coexist. Duplicate check is name+area, not just name.
  // Trace: US-RS-01 AC6

  it('saves successfully when the new name exists in a different area', () => {
    // Given Clemens has "Milk" in "Fridge" and is editing "Milkk" in "Garage Pantry".
    // onFindDuplicate(name, area) returns undefined for ("Milk", "Garage Pantry")
    // because "Milk" only exists in "Fridge", not in "Garage Pantry".
    const onFindDuplicate = jest.fn(() => undefined);

    const { getByDisplayValue, getByText, onSaveEdit, onDismiss } = renderSheet({
      itemName: 'Milkk',
      editStapleId: 'staple-milkk-pantry',
      initialValues: {
        name: 'Milkk',
        houseArea: 'Garage Pantry',
        section: 'Pantry Shelf',
        aisleNumber: null,
      } as React.ComponentProps<typeof MetadataBottomSheet>['initialValues'],
      onFindDuplicate,
    });
    const nameField = getByDisplayValue('Milkk');

    // When Clemens changes the Name to "Milk" and taps Save Changes
    fireEvent.changeText(nameField, 'Milk');
    fireEvent.press(getByText('Save Changes'));

    // Then onSaveEdit is called with the new name and the Garage Pantry area
    expect(onSaveEdit).toHaveBeenCalledWith(
      'staple-milkk-pantry',
      expect.objectContaining({
        name: 'Milk',
        houseArea: 'Garage Pantry',
      }),
    );

    // And the sheet dismisses (no inline error)
    expect(onDismiss).toHaveBeenCalled();
  });
});

// =============================================================================
// M1-RS-5: Active trip-item sync — changes payload includes the new name
// =============================================================================

describe.skip('M1-RS-5: Renaming includes the new name in the changes payload (so trip items sync)', () => {
  // AC7: Renaming during an active trip updates TripItem.name for any
  //      trip item with matching stapleId, preserving checked, needed,
  //      checkedAt, stapleId.
  //
  // Acceptance-test boundary: this scenario verifies the contract surface
  // at the driving port — the changes payload passed to onSaveEdit contains
  // `name`. The actual trip-item rewrite lives in tripService.syncStapleUpdate
  // and is unit-tested + mutation-tested per CLAUDE.md (src/domain/**).
  // See distill/wave-decisions.md DWD-7.
  // Trace: US-RS-01 AC7 (KPI-RS-03 guardrail)

  it('passes name in the changes payload so the hook layer can propagate it to trip items', () => {
    // Given Clemens is editing "Milkk" in "Fridge"
    const { getByDisplayValue, getByText, onSaveEdit } = renderSheet();
    const nameField = getByDisplayValue('Milkk');

    // When Clemens changes the Name to "Milk" and taps Save Changes
    fireEvent.changeText(nameField, 'Milk');
    fireEvent.press(getByText('Save Changes'));

    // Then `name` is present in the changes payload (the input to syncStapleUpdate).
    // This is the contract that trip items rely on: if `name` is missing here,
    // TripItem.name cannot be updated by stapleId join.
    expect(onSaveEdit).toHaveBeenCalledTimes(1);
    const [stapleId, changes] = onSaveEdit.mock.calls[0];
    expect(stapleId).toBe('staple-milkk');
    expect(changes).toHaveProperty('name', 'Milk');
  });
});

// =============================================================================
// M1-RS-6: No-op save (name unchanged) succeeds silently
// =============================================================================

describe.skip('M1-RS-6: No-op save succeeds and dismisses', () => {
  // AC8: No-op save (name unchanged) succeeds and dismisses without error.
  // Trace: US-RS-01 AC8

  it('saves and dismisses when no field is modified', () => {
    // Given Clemens is editing "Milkk" in "Fridge"
    const { getByText, onSaveEdit, onDismiss, queryByText } = renderSheet();

    // When Clemens taps "Save Changes" without modifying any field
    fireEvent.press(getByText('Save Changes'));

    // Then onSaveEdit is called with the unchanged values
    expect(onSaveEdit).toHaveBeenCalledWith(
      'staple-milkk',
      expect.objectContaining({
        name: 'Milkk',
        houseArea: 'Fridge',
      }),
    );

    // And no error is shown
    expect(queryByText('Name is required')).toBeNull();
    expect(queryByText(/already exists in/)).toBeNull();

    // And the sheet dismisses
    expect(onDismiss).toHaveBeenCalled();
  });
});

// =============================================================================
// M1-RS-7: Add mode is unchanged — no Name TextInput appears
// =============================================================================

describe.skip('M1-RS-7: Add mode does not render a Name TextInput', () => {
  // AC9: Add mode (mode === 'add') is unchanged: no Name TextInput appears
  //      (name comes from QuickAdd, as today).
  // Trace: US-RS-01 AC9

  it('does not show a pre-filled Name TextInput when mode is add', () => {
    // Given Clemens opens the Add sheet for "Hummus" (no initialValues)
    const { queryByDisplayValue } = renderSheet({
      mode: 'add',
      itemName: 'Hummus',
      editStapleId: null,
      initialValues: null,
    });

    // Then the Name field for the staple name does NOT appear pre-filled.
    // (Add mode keeps the title-line "Add 'Hummus'" as the only place the
    // name is shown; the TextInput for editing the name is edit-mode-only.)
    expect(queryByDisplayValue('Hummus')).toBeNull();
  });
});

// =============================================================================
// M1-RS-8: Sheet title remains the snapshot `Edit '<itemName>'`
// =============================================================================

describe.skip('M1-RS-8: Sheet title is a snapshot of the original name (does not live-update)', () => {
  // Implicit invariant from shared-artifacts-registry.md and DISCUSS technical
  // notes: the title `Edit '${itemName}'` continues to read from the itemName
  // prop set at sheet-open time. The title does NOT live-update as the user
  // types in the Name field. Asserting this prevents accidental coupling of
  // the title to the Name field state during DELIVER.
  // Trace: US-RS-01 implicit invariant

  it('keeps the title showing the original itemName even after the Name field is edited', () => {
    // Given Clemens is editing "Milkk" in "Fridge"
    const { getByDisplayValue, getByText, queryByText } = renderSheet();
    const nameField = getByDisplayValue('Milkk');

    // When Clemens types "Milk" into the Name field (without saving)
    fireEvent.changeText(nameField, 'Milk');

    // Then the sheet title still reads "Edit 'Milkk'"
    expect(getByText("Edit 'Milkk'")).toBeTruthy();

    // And does not switch to "Edit 'Milk'"
    expect(queryByText("Edit 'Milk'")).toBeNull();
  });
});
