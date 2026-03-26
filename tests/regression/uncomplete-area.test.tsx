// Regression: completed area shows Undo button that calls onUncompleteArea
// Feature: allow users to uncomplete a sweep area from the UI

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AreaSection } from '../../src/ui/AreaSection';
import { AreaGroup } from '../../src/domain/item-grouping';
import { TripItem } from '../../src/domain/types';

const createTestItem = (overrides: Partial<TripItem> = {}): TripItem => ({
  id: 'item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preload',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

const createTestAreaGroup = (): AreaGroup => ({
  area: 'Fridge',
  items: [createTestItem()],
  totalCount: 1,
  neededCount: 1,
});

describe('completed area shows undo button', () => {
  it('shows Undo affordance when area is completed', () => {
    const onUncompleteArea = jest.fn();

    render(
      <AreaSection
        areaGroup={createTestAreaGroup()}
        isCompleted={true}
        onUncompleteArea={onUncompleteArea}
      />
    );

    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('calls onUncompleteArea with area name when Undo is tapped', () => {
    const onUncompleteArea = jest.fn();

    render(
      <AreaSection
        areaGroup={createTestAreaGroup()}
        isCompleted={true}
        onUncompleteArea={onUncompleteArea}
      />
    );

    fireEvent.press(screen.getByText('Undo'));

    expect(onUncompleteArea).toHaveBeenCalledWith('Fridge');
    expect(onUncompleteArea).toHaveBeenCalledTimes(1);
  });

  it('does not show Undo when area is not completed', () => {
    const onUncompleteArea = jest.fn();

    render(
      <AreaSection
        areaGroup={createTestAreaGroup()}
        isCompleted={false}
        onUncompleteArea={onUncompleteArea}
      />
    );

    expect(screen.queryByText('Undo')).toBeNull();
  });
});
