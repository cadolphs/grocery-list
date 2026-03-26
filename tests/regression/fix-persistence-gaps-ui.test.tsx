/**
 * Regression test: skipped item displays item name.
 *
 * Original bug: AreaSection rendered skipped items without visible name.
 * Updated: skipped items now render inline via TripItemRow with grey
 * strikethrough styling (sweep-ux-refresh 01-02 removed separate skipped section).
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
  it('renders the skipped item name inline (no separate skipped section)', () => {
    render(<AreaSection areaGroup={areaGroupWithSkippedItem} />);

    // The item name should be visible so users know what was skipped
    expect(screen.getByText('Paper Towels')).toBeTruthy();

    // Re-add button no longer exists (items toggle via tap)
    expect(screen.queryByText('Re-add')).toBeNull();
  });
});
