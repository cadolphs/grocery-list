/**
 * Regression test for long-press edit in store mode.
 *
 * When TripItemRow is rendered in store mode with a staple item,
 * long-pressing triggers onLongPress with item name and area.
 * Short tap still triggers check-off via onPress.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TripItemRow } from '../../src/ui/TripItemRow';
import { TripItem } from '../../src/domain/types';

const createStapleTripItem = (overrides?: Partial<TripItem>): TripItem => ({
  id: 'item-1',
  name: 'Butter',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

describe('long press on store item triggers edit callback', () => {
  it('calls onLongPress with name and area when long-pressed in store mode', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const item = createStapleTripItem();

    render(
      <TripItemRow
        item={item}
        mode="store"
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );

    fireEvent(screen.getByText('Butter'), 'longPress');

    expect(onLongPress).toHaveBeenCalledWith('Butter', 'Fridge');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress (not onLongPress) on short tap in store mode', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const item = createStapleTripItem();

    render(
      <TripItemRow
        item={item}
        mode="store"
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );

    fireEvent.press(screen.getByText('Butter'));

    expect(onPress).toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
