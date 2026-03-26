/**
 * Regression test for Delete Staple button in MetadataBottomSheet edit mode.
 *
 * When MetadataBottomSheet is in edit mode and onDeleteStaple prop is provided,
 * a "Delete Staple" button is shown. Tapping it calls onDeleteStaple with the
 * stapleId and dismisses the sheet.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MetadataBottomSheet } from '../../src/ui/MetadataBottomSheet';
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
        initialValues={{ houseArea: 'Fridge', section: 'Dairy', aisleNumber: 3 }}
        areas={AREAS}
        onDismiss={handlers.onDismiss}
        onSubmitStaple={handlers.onSubmitStaple}
        onSubmitTripItem={handlers.onSubmitTripItem}
        onDeleteStaple={handlers.onDeleteStaple}
      />
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
        initialValues={{ houseArea: 'Fridge', section: 'Dairy', aisleNumber: 3 }}
        areas={AREAS}
        onDismiss={handlers.onDismiss}
        onSubmitStaple={handlers.onSubmitStaple}
        onSubmitTripItem={handlers.onSubmitTripItem}
        onDeleteStaple={handlers.onDeleteStaple}
      />
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
      />
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
        initialValues={{ houseArea: 'Fridge', section: 'Dairy', aisleNumber: 3 }}
        areas={AREAS}
        onDismiss={jest.fn()}
        onSubmitStaple={jest.fn()}
        onSubmitTripItem={jest.fn()}
      />
    );

    expect(screen.queryByText('Delete Staple')).toBeNull();
  });
});
