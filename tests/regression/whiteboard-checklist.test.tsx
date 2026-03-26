/**
 * Regression test for StapleChecklist component (whiteboard phase).
 *
 * StapleChecklist renders an alphabetically sorted list of all staples.
 * Each staple shows its name and a toggle button.
 * Staples already on the trip show as checked.
 * Tapping unchecked staple calls onAddStaple; tapping checked calls onRemoveStaple.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { StapleChecklist } from '../../src/ui/StapleChecklist';
import { StapleItem } from '../../src/domain/types';

const createStaple = (name: string, houseArea: string): StapleItem => ({
  id: `id-${name.toLowerCase()}`,
  name,
  houseArea,
  storeLocation: { section: 'General', aisleNumber: null },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00Z',
});

const STAPLES: readonly StapleItem[] = [
  createStaple('Milk', 'Fridge'),
  createStaple('Apples', 'Pantry'),
  createStaple('Bread', 'Pantry'),
  createStaple('Cheese', 'Fridge'),
];

describe('staple checklist renders sorted list with toggle', () => {
  it('renders staples in alphabetical order by name', () => {
    const onAddStaple = jest.fn();
    const onRemoveStaple = jest.fn();

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={new Set<string>()}
        onAddStaple={onAddStaple}
        onRemoveStaple={onRemoveStaple}
      />
    );

    const stapleNames = screen.getAllByTestId(/^staple-row-/).map(
      (element) => element.props.testID
    );

    expect(stapleNames).toEqual([
      'staple-row-Apples',
      'staple-row-Bread',
      'staple-row-Cheese',
      'staple-row-Milk',
    ]);
  });

  it('shows each staple name and area label', () => {
    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={new Set<string>()}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />
    );

    expect(screen.getByText('Apples')).toBeTruthy();
    expect(screen.getAllByText('Fridge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pantry').length).toBeGreaterThanOrEqual(1);
  });

  it('marks staples on the trip as checked', () => {
    const tripItemNames = new Set(['Milk', 'Bread']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={jest.fn()}
        onRemoveStaple={jest.fn()}
      />
    );

    expect(screen.getByTestId('toggle-Milk')).toHaveTextContent('checked');
    expect(screen.getByTestId('toggle-Bread')).toHaveTextContent('checked');
    expect(screen.getByTestId('toggle-Apples')).toHaveTextContent('unchecked');
    expect(screen.getByTestId('toggle-Cheese')).toHaveTextContent('unchecked');
  });

  it('calls onAddStaple when tapping an unchecked staple', () => {
    const onAddStaple = jest.fn();
    const tripItemNames = new Set(['Milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={onAddStaple}
        onRemoveStaple={jest.fn()}
      />
    );

    fireEvent.press(screen.getByTestId('staple-row-Apples'));

    expect(onAddStaple).toHaveBeenCalledTimes(1);
    expect(onAddStaple).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apples', houseArea: 'Pantry' })
    );
  });

  it('calls onRemoveStaple when tapping a checked staple', () => {
    const onRemoveStaple = jest.fn();
    const tripItemNames = new Set(['Milk']);

    render(
      <StapleChecklist
        staples={STAPLES}
        tripItemNames={tripItemNames}
        onAddStaple={jest.fn()}
        onRemoveStaple={onRemoveStaple}
      />
    );

    fireEvent.press(screen.getByTestId('staple-row-Milk'));

    expect(onRemoveStaple).toHaveBeenCalledTimes(1);
    expect(onRemoveStaple).toHaveBeenCalledWith('Milk');
  });
});
