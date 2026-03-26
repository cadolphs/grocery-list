/**
 * Sweep UX Refresh - Steps 01-01 and 01-02
 *
 * 01-01: Home mode tap toggles needed state with green/grey styling.
 * 01-02: Home mode long-press opens edit sheet; no skip section in AreaSection.
 *
 * New behavior:
 * - Tap calls onPress (not onEditStaple)
 * - No Skip button in home mode
 * - Needed items: green text (#4CAF50)
 * - Skipped items: grey text (#999999) with strikethrough
 * - Long-press calls onLongPress in home mode (same as store mode)
 * - AreaSection renders all items inline (no separate skipped section or Re-add buttons)
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TripItemRow } from '../../src/ui/TripItemRow';
import { AreaSection } from '../../src/ui/AreaSection';
import { AreaGroup } from '../../src/domain/item-grouping';
import { TripItem } from '../../src/domain/types';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../src/domain/trip';

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

describe('home mode long-press opens edit and no skip section', () => {
  const createAreaGroup = (items: TripItem[]): AreaGroup => ({
    area: 'Fridge',
    items,
    neededCount: items.filter((i) => i.needed).length,
    totalCount: items.length,
  });

  it('long-press calls onLongPress with name and area in home mode', () => {
    const onLongPress = jest.fn();
    const item = createTripItem();

    render(
      <TripItemRow
        item={item}
        mode="home"
        onLongPress={onLongPress}
      />
    );

    fireEvent(screen.getByText('Milk'), 'longPress');

    expect(onLongPress).toHaveBeenCalledWith('Milk', 'Fridge');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('AreaSection does not render Re-add buttons', () => {
    const skippedItem = createTripItem({ id: 'item-2', name: 'Butter', needed: false });
    const areaGroup = createAreaGroup([createTripItem(), skippedItem]);

    render(<AreaSection areaGroup={areaGroup} />);

    expect(screen.queryByText('Re-add')).toBeNull();
    expect(screen.queryByTestId('readd-Butter')).toBeNull();
  });

  it('AreaSection renders both needed and skipped items inline', () => {
    const neededItem = createTripItem({ id: 'item-1', name: 'Milk', needed: true });
    const skippedItem = createTripItem({ id: 'item-2', name: 'Butter', needed: false });
    const areaGroup = createAreaGroup([neededItem, skippedItem]);

    render(<AreaSection areaGroup={areaGroup} />);

    // Both items visible
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Butter')).toBeTruthy();
  });

  it('AreaSection passes onItemLongPress to TripItemRow', () => {
    const onItemLongPress = jest.fn();
    const item = createTripItem();
    const areaGroup = createAreaGroup([item]);

    render(
      <AreaSection
        areaGroup={areaGroup}
        onItemLongPress={onItemLongPress}
      />
    );

    fireEvent(screen.getByText('Milk'), 'longPress');

    expect(onItemLongPress).toHaveBeenCalledWith('Milk', 'Fridge');
  });

  it('AreaSection passes onItemPress for toggle', () => {
    const onItemPress = jest.fn();
    const item = createTripItem();
    const areaGroup = createAreaGroup([item]);

    render(
      <AreaSection
        areaGroup={areaGroup}
        onItemPress={onItemPress}
      />
    );

    fireEvent.press(screen.getByText('Milk'));

    expect(onItemPress).toHaveBeenCalledWith('Milk');
  });
});

describe('groupByArea excludes one-offs from area groups', () => {
  const { groupByArea } = require('../../src/domain/item-grouping');
  const { getOneOffItems } = require('../../src/domain/item-grouping');

  const ALL_AREAS = ['Fridge', 'Bathroom', 'Kitchen Cabinets'] as const;

  const makeItem = (overrides: Partial<TripItem>): TripItem => ({
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

  it('area groups contain only staple items when mix of staples and one-offs provided', () => {
    const staple = makeItem({ id: 's1', name: 'Milk', itemType: 'staple', houseArea: 'Fridge' });
    const oneOff = makeItem({ id: 'o1', name: 'Birthday Candles', itemType: 'one-off', houseArea: 'Fridge' });

    const result = groupByArea([staple, oneOff], ALL_AREAS);

    const fridgeGroup = result.find((g: { area: string }) => g.area === 'Fridge')!;
    expect(fridgeGroup.items).toHaveLength(1);
    expect(fridgeGroup.items[0].name).toBe('Milk');
  });

  it('one-off items are excluded from all area groups', () => {
    const oneOff = makeItem({ id: 'o1', name: 'Party Cups', itemType: 'one-off', houseArea: 'Bathroom' });

    const result = groupByArea([oneOff], ALL_AREAS);

    const allItems = result.flatMap((g: { items: TripItem[] }) => g.items);
    expect(allItems).toHaveLength(0);
  });

  it('getOneOffItems returns only one-off items', () => {
    const staple = makeItem({ id: 's1', name: 'Milk', itemType: 'staple' });
    const oneOff1 = makeItem({ id: 'o1', name: 'Birthday Candles', itemType: 'one-off' });
    const oneOff2 = makeItem({ id: 'o2', name: 'Party Cups', itemType: 'one-off' });

    const result = getOneOffItems([staple, oneOff1, oneOff2]);

    expect(result).toHaveLength(2);
    expect(result.map((i: TripItem) => i.name)).toEqual(['Birthday Candles', 'Party Cups']);
  });
});

describe('sweep mode shows one-offs section separately', () => {
  function renderAppWithOneOff() {
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage);
    tripService.start(stapleLibrary.listAll());

    tripService.addItem({
      name: 'Birthday Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Baking', aisleNumber: 12 },
      itemType: 'one-off',
      source: 'quick-add',
    });

    render(
      <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    return { tripService };
  }

  it('renders One-offs section with one-off items in sweep mode', () => {
    renderAppWithOneOff();

    expect(screen.getByText('One-offs (1)')).toBeTruthy();
    expect(screen.getByText('Birthday Candles')).toBeTruthy();
  });

  it('does not render One-offs section when no one-off items exist', () => {
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const stapleLibrary = createStapleLibrary(stapleStorage);
    const tripStorage = createNullTripStorage();
    const tripService = createTrip(tripStorage);
    tripService.start(stapleLibrary.listAll());

    render(
      <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    expect(screen.queryByText(/One-offs/)).toBeNull();
  });

  it('one-off item tap toggles needed state', () => {
    renderAppWithOneOff();

    const item = screen.getByText('Birthday Candles');
    fireEvent.press(item);

    // After tap, item should be skipped (grey strikethrough)
    const flatStyle = Array.isArray(item.props.style)
      ? Object.assign({}, ...item.props.style.filter(Boolean))
      : item.props.style;

    expect(flatStyle.color).toBe('#999999');
  });
});
