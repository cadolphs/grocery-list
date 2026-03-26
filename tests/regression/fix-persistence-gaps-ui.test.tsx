/**
 * Regression test: skipped item row displays item name.
 *
 * Bug: AreaSection renders skipped items (needed=false) with only a "Re-add"
 * button and no item name text. Users cannot tell which item was skipped.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AreaSection } from '../../src/ui/AreaSection';
import { AreaGroup } from '../../src/domain/item-grouping';
import { TripItem } from '../../src/domain/types';

const skippedItem: TripItem = {
  id: 'test-skipped-1',
  name: 'Paper Towels',
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section: 'Paper Goods', aisleNumber: 5 },
  itemType: 'staple' as const,
  stapleId: null,
  source: 'preloaded' as const,
  needed: false,
  checked: false,
  checkedAt: null,
};

const areaGroupWithSkippedItem: AreaGroup = {
  area: 'Kitchen Cabinets',
  items: [skippedItem],
  neededCount: 0,
  totalCount: 1,
};

describe('Skipped item row displays item name', () => {
  it('renders the item name alongside the Re-add button for skipped items', () => {
    render(<AreaSection areaGroup={areaGroupWithSkippedItem} />);

    // The Re-add button should be present
    expect(screen.getByText('Re-add')).toBeTruthy();

    // The item name should also be visible so users know what was skipped
    expect(screen.getByText('Paper Towels')).toBeTruthy();
  });
});
