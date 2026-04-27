// StoreView render-path tests
// Behavioral acceptance: section ordering at the call site.
// Asserts testID render order — no spies on domain helpers.

import React from 'react';
import { render } from '@testing-library/react-native';
import { StoreView } from './StoreView';
import { ServiceProvider } from './ServiceProvider';
import { createStapleLibrary } from '../domain/staple-library';
import { createTrip } from '../domain/trip';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';
import { createNullSectionOrderStorage } from '../adapters/null/null-section-order-storage';
import { SectionOrderStorage } from '../ports/section-order-storage';
import { StapleInput } from '../domain/trip';

const makeStaple = (
  name: string,
  section: string,
  aisleNumber: number | null,
): StapleInput => ({
  name,
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section, aisleNumber },
});

type Harness = {
  readonly element: React.JSX.Element;
};

const renderStoreViewWithGroups = (
  staples: readonly StapleInput[],
  sectionOrderStorage: SectionOrderStorage,
): Harness => {
  const stapleStorage = createNullStapleStorage([]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  // Seed the trip with items so groupBySection has groups to render
  tripService.start(staples);

  const element = (
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      sectionOrderStorage={sectionOrderStorage}
    >
      <StoreView />
    </ServiceProvider>
  );
  return { element };
};

const aisleSectionTestIds = (root: ReturnType<typeof render>): string[] =>
  root
    .getAllByTestId(/^aisle-section-/)
    .map((node) => String(node.props.testID));

describe('StoreView section ordering at the call site', () => {
  test('appends newly-discovered sections after the user-defined order', () => {
    // GIVEN groups that include a newly-introduced section absent from the persisted order
    const sectionOrderStorage = createNullSectionOrderStorage([
      'Produce',
      'Bakery',
    ]);
    const { element } = renderStoreViewWithGroups(
      [
        makeStaple('Bread', 'Bakery', 1),
        makeStaple('Apple', 'Produce', 3),
        makeStaple('Mystery', 'NewAisle', 9),
      ],
      sectionOrderStorage,
    );

    // WHEN StoreView mounts
    const tree = render(element);

    // THEN AisleSection testIDs render with the user-ordered sections first
    // and the newly-discovered section appended afterwards
    expect(aisleSectionTestIds(tree)).toEqual([
      'aisle-section-Produce',
      'aisle-section-Bakery',
      'aisle-section-NewAisle',
    ]);
  });

  test('preserves default grouping when sectionOrder is null (no customization)', () => {
    // GIVEN no custom order persisted
    const sectionOrderStorage = createNullSectionOrderStorage(null);
    const { element } = renderStoreViewWithGroups(
      [
        makeStaple('Bread', 'Bakery', 1),
        makeStaple('Apple', 'Produce', 3),
      ],
      sectionOrderStorage,
    );

    // WHEN StoreView mounts
    const tree = render(element);

    // THEN existing aisle-number ordering is preserved
    expect(aisleSectionTestIds(tree)).toEqual([
      'aisle-section-Bakery',
      'aisle-section-Produce',
    ]);
  });
});
