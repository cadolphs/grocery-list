/**
 * Sweep UX Refresh - Step 01-01
 *
 * Home mode tap toggles needed state with green/grey styling.
 *
 * New behavior:
 * - Tap calls onPress (not onEditStaple)
 * - No Skip button in home mode
 * - Needed items: green text (#4CAF50)
 * - Skipped items: grey text (#999999) with strikethrough
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TripItemRow } from '../../src/ui/TripItemRow';
import { TripItem } from '../../src/domain/types';

const createTripItem = (overrides?: Partial<TripItem>): TripItem => ({
  id: 'item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 2 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
  ...overrides,
});

describe('home mode tap toggles needed state with green/grey', () => {
  it('tap calls onPress, not onEditStaple, for staple items in home mode', () => {
    const onPress = jest.fn();
    const onEditStaple = jest.fn();
    const item = createTripItem();

    render(
      <TripItemRow
        item={item}
        mode="home"
        onPress={onPress}
        onEditStaple={onEditStaple}
      />
    );

    fireEvent.press(screen.getByText('Milk'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onEditStaple).not.toHaveBeenCalled();
  });

  it('does not render a Skip button in home mode', () => {
    const onSkip = jest.fn();
    const item = createTripItem();

    render(
      <TripItemRow
        item={item}
        mode="home"
        onSkip={onSkip}
      />
    );

    expect(screen.queryByText('Skip')).toBeNull();
  });

  it('renders needed item with green text color', () => {
    const item = createTripItem({ needed: true });

    render(
      <TripItemRow
        item={item}
        mode="home"
      />
    );

    const text = screen.getByText('Milk');
    const flatStyle = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.filter(Boolean))
      : text.props.style;

    expect(flatStyle.color).toBe('#4CAF50');
  });

  it('renders skipped item with grey strikethrough text', () => {
    const item = createTripItem({ needed: false });

    render(
      <TripItemRow
        item={item}
        mode="home"
      />
    );

    const text = screen.getByText('Milk');
    const flatStyle = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.filter(Boolean))
      : text.props.style;

    expect(flatStyle.color).toBe('#999999');
    expect(flatStyle.textDecorationLine).toBe('line-through');
  });
});
