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
import { AddTripItemResult } from '../../src/domain/types';

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
