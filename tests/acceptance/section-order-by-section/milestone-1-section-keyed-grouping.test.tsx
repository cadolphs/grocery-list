/**
 * Milestone 1: Section-Keyed Grouping (Settings Screen + Store View)
 *
 * All tests except the first are skipped. Enable one at a time per outside-in TDD.
 *
 * Driving Ports:
 * - Domain: groupBySection (NEW)
 * - Domain: sortByCustomOrder (existing; semantic shift)
 * - Domain: appendNewSections (existing; semantic shift)
 * - UI:     SectionOrderSettingsScreen (driving port for settings UX)
 *
 * Story Trace:
 * - US-01: Settings screen lists section names only (one row per section)
 * - US-02: Store view = one card per section, items sorted by aisle ascending (nulls last) inside
 *
 * Strategy: A (InMemory). UI scenarios use ServiceProvider with InMemory adapters.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { groupBySection, SectionGroup } from '../../../src/domain/item-grouping';
import { sortByCustomOrder } from '../../../src/domain/section-ordering';
import { TripItem, AddStapleRequest } from '../../../src/domain/types';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { createAreaManagement } from '../../../src/domain/area-management';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { SectionOrderSettingsScreen } from '../../../src/ui/SectionOrderSettingsScreen';

// --- Test helpers ---

const tripItem = (
  name: string,
  section: string,
  aisleNumber: number | null,
): TripItem => ({
  id: `item-${name.toLowerCase().replace(/\s/g, '-')}`,
  name,
  houseArea: 'Pantry',
  storeLocation: { section, aisleNumber },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked: false,
  checkedAt: null,
});

const stapleInput = (
  name: string,
  section: string,
  aisleNumber: number | null,
): AddStapleRequest => ({
  name,
  houseArea: 'Pantry',
  storeLocation: { section, aisleNumber },
});

// Renders the settings screen wrapped in a ServiceProvider with InMemory adapters
// pre-seeded with the supplied staples. UI-level driving port for US-01.
const renderSettingsScreenWithStaples = (staples: AddStapleRequest[]) => {
  const stapleStorage = createNullStapleStorage(staples);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripAreas = ['Pantry'];
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, tripAreas);
  const areaStorage = createNullAreaStorage(tripAreas);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  const sectionOrderStorage = createNullSectionOrderStorage();
  return render(
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      areaManagement={areaManagement}
      sectionOrderStorage={sectionOrderStorage}
    >
      <SectionOrderSettingsScreen />
    </ServiceProvider>,
  );
};

// =============================================================================
// US-01: Settings screen lists section names only
// =============================================================================

describe('US-01: Settings screen shows one row per section regardless of aisle count', () => {
  // Trace: US-01

  it('renders exactly one row per distinct section name; row labels are section names', () => {
    // Given Carlos has staples in Inner Aisles at aisles 4, 5, 7 and Deli (no aisle)
    const staples = [
      stapleInput('Bread', 'Inner Aisles', 4),
      stapleInput('Pasta', 'Inner Aisles', 5),
      stapleInput('Soap', 'Inner Aisles', 7),
      stapleInput('Turkey', 'Deli', null),
    ];

    // When Carlos opens Store Section Order settings
    renderSettingsScreenWithStaples(staples);

    // Then the settings list has exactly two rows
    expect(screen.getByTestId('section-row-Inner Aisles')).toBeTruthy();
    expect(screen.getByTestId('section-row-Deli')).toBeTruthy();
    expect(screen.queryByTestId('section-row-Inner Aisles::4')).toBeNull();
    expect(screen.queryByTestId('section-row-Inner Aisles::5')).toBeNull();
    expect(screen.queryByTestId('section-row-Inner Aisles::7')).toBeNull();

    // And no row label contains an aisle number prefix (e.g., "Aisle 4: Inner Aisles")
    expect(screen.queryByText(/Aisle 4:/)).toBeNull();
    expect(screen.queryByText(/Aisle 5:/)).toBeNull();
    expect(screen.queryByText(/Aisle 7:/)).toBeNull();
  });
});

// =============================================================================
// US-02: Store view -- intra-section aisle ordering, nulls last
// =============================================================================

describe('US-02: Null aisle items sort last within a section', () => {
  // Trace: US-02 (null sorts last within section)

  it('places aisle-numbered items before null-aisle items inside a single section', () => {
    // Given Carlos has trip items in Inner Aisles at aisle 4 and Inner Aisles at no aisle
    const items = [
      tripItem('Pasta', 'Inner Aisles', null),
      tripItem('Bread', 'Inner Aisles', 4),
    ];

    // When Carlos views the store layout
    const groups: SectionGroup[] = groupBySection(items);

    // Then within the Inner Aisles card, the aisle-4 item appears before the no-aisle item
    expect(groups).toHaveLength(1);
    const innerAislesItems = groups[0].items.map((i) => i.name);
    expect(innerAislesItems).toEqual(['Bread', 'Pasta']);
  });
});

describe('US-02: No custom order falls back to alphabetical sections', () => {
  // Trace: US-02 (default sort = alphabetical by section name)

  it('sorts sections alphabetically when no custom order is set', () => {
    // Given Carlos has trip items in Produce, Inner Aisles, and Bakery
    const items = [
      tripItem('Apple', 'Produce', null),
      tripItem('Pasta', 'Inner Aisles', 5),
      tripItem('Bread', 'Bakery', null),
    ];

    // And no custom section order has been set
    const customOrder = null;

    // When Carlos views the store layout
    const groups: SectionGroup[] = groupBySection(items);
    const sorted = sortByCustomOrder(groups, customOrder);

    // Then sections appear alphabetically: Bakery, Inner Aisles, Produce
    expect(sorted.map((g) => g.section)).toEqual(['Bakery', 'Inner Aisles', 'Produce']);
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe('Edge: Empty trip yields no section cards', () => {
  // Trace: US-02 boundary

  it('returns an empty array for an empty trip', () => {
    // Given Carlos has no trip items
    const items: TripItem[] = [];

    // When Carlos views the store layout
    const groups = groupBySection(items);

    // Then no section cards appear
    expect(groups).toEqual([]);
  });
});

describe('Edge: All-null aisle items render in a single section card', () => {
  // Trace: US-02 boundary (every item has null aisle in same section)

  it('groups all-null-aisle items into one section card', () => {
    // Given Carlos has trip items only in Deli with no aisle numbers
    const items = [
      tripItem('Turkey', 'Deli', null),
      tripItem('Cheese', 'Deli', null),
      tripItem('Olives', 'Deli', null),
    ];

    // When Carlos views the store layout
    const groups: SectionGroup[] = groupBySection(items);

    // Then exactly one Deli card appears
    expect(groups).toHaveLength(1);
    expect(groups[0].section).toBe('Deli');

    // And the Deli card contains every Deli item
    expect(groups[0].items.map((i) => i.name).sort()).toEqual(['Cheese', 'Olives', 'Turkey']);
  });
});
