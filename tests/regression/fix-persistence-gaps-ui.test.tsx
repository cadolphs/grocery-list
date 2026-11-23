/**
 * Regression test: Not needed item displays item name.
 *
 * Original bug: AreaSection rendered Not needed items without visible name.
 * Updated: Not needed items now render inline via TripItemRow with grey
 * strikethrough styling (sweep-ux-refresh 01-02 removed separate Not needed section).
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AreaSection } from '../../src/ui/AreaSection';
import { AreaGroup } from '../../src/domain/item-grouping';
import { TripItem } from '../../src/domain/types';

const notNeededItem: TripItem = {
  id: 'test-not-needed-1',
  name: 'Paper Towels',
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section: 'Paper Goods', aisleNumber: 5 },
  itemType: 'staple' as const,
  stapleId: null,
  source: 'preloaded' as const,
  decision: 'not-needed',
  checked: false,
  checkedAt: null,
};

const areaGroupWithNotNeededItem: AreaGroup = {
  area: 'Kitchen Cabinets',
  items: [notNeededItem],
  neededCount: 0,
  totalCount: 1,
};

describe('Not needed item row displays item name', () => {
  it('renders the Not needed item name inline (no separate Not needed section)', () => {
    render(<AreaSection areaGroup={areaGroupWithNotNeededItem} />);

    // The item name should be visible so users know what is Not needed
    expect(screen.getByText('Paper Towels')).toBeTruthy();

    // Re-add button no longer exists (items toggle via tap)
    expect(screen.queryByText('Re-add')).toBeNull();
  });
});
