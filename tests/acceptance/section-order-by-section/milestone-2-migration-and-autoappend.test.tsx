/**
 * Milestone 2: Migration and Auto-Append at Section Grain
 *
 * All tests skipped. Enable one at a time per outside-in TDD.
 *
 * Driving Ports:
 * - Domain: appendNewSections (existing; semantic shift to section-name dedupe)
 * - Hook:   useSectionOrder (UI-level driving port for migration + reactive read)
 *
 * Story Trace:
 * - US-03: appendNewSections keys on section name; new aisle in known section = no diff
 * - US-04: Migration wipes legacy composite-key order on first read
 *
 * Strategy: A (InMemory). Hook scenarios use renderHook from @testing-library/react-native
 * with ServiceProvider seeded with createNullSectionOrderStorage. Real Firestore +
 * AsyncStorage migration scenarios live in src/adapters/*  /  *.test.ts (added in DELIVER).
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { appendNewSections } from '../../../src/domain/section-ordering';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createTrip } from '../../../src/domain/trip';
import { createAreaManagement } from '../../../src/domain/area-management';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { useSectionOrder } from '../../../src/hooks/useSectionOrder';

// --- Test helpers ---

const wrapperWithStorage = (initialOrder: string[] | null) => {
  const sectionOrderStorage = createNullSectionOrderStorage(initialOrder);
  const stapleStorage = createNullStapleStorage([]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage, ['Pantry']);
  const areaStorage = createNullAreaStorage(['Pantry']);
  const areaManagement = createAreaManagement(areaStorage, stapleStorage, tripStorage);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ServiceProvider
      stapleLibrary={stapleLibrary}
      tripService={tripService}
      areaManagement={areaManagement}
      sectionOrderStorage={sectionOrderStorage}
    >
      {children}
    </ServiceProvider>
  );
  return { wrapper, sectionOrderStorage };
};

// =============================================================================
// US-04: Migration wipes legacy composite order
// =============================================================================

describe('US-04: Legacy composite-keyed order is wiped on first read', () => {
  // Trace: US-04, ADR-004

  it('clears storage and reports null when stored order contains "::" entries', () => {
    // Given the stored section order contains legacy composite entries
    const { wrapper, sectionOrderStorage } = wrapperWithStorage([
      'Inner Aisles::4',
      'Deli::null',
    ]);

    // When the hook loads for the first time on the new build
    const { result } = renderHook(() => useSectionOrder(), { wrapper });

    // Then the stored section order is cleared
    expect(sectionOrderStorage.loadOrder()).toBeNull();

    // And the section order reports as no custom order
    expect(result.current.order).toBeNull();
  });
});

describe('US-04: Already-migrated section-name order is preserved', () => {
  // Trace: US-04 (idempotent: clean stored order passes through untouched)

  it('leaves storage unchanged when no entry contains "::"', () => {
    // Given the stored section order contains section names only
    const { wrapper, sectionOrderStorage } = wrapperWithStorage(['Inner Aisles', 'Deli']);

    // When the hook loads
    const { result } = renderHook(() => useSectionOrder(), { wrapper });

    // Then the stored section order is unchanged
    expect(sectionOrderStorage.loadOrder()).toEqual(['Inner Aisles', 'Deli']);

    // And the section order reports as: Inner Aisles, Deli
    expect(result.current.order).toEqual(['Inner Aisles', 'Deli']);
  });
});

describe('US-04: Mixed legacy and section-name entries are wiped', () => {
  // Trace: US-04 boundary (predicate fires on ANY entry containing "::")

  it('clears storage when at least one entry contains "::"', () => {
    // Given the stored section order contains a clean entry and a legacy entry
    const { wrapper, sectionOrderStorage } = wrapperWithStorage(['Inner Aisles', 'Deli::null']);

    // When the hook loads
    renderHook(() => useSectionOrder(), { wrapper });

    // Then the stored section order is cleared
    expect(sectionOrderStorage.loadOrder()).toBeNull();
  });
});

describe('US-04: Empty stored order needs no migration', () => {
  // Trace: US-04 boundary (empty array has no "::" entries; predicate is false)

  it('leaves an empty stored order unchanged', () => {
    // Given the stored section order is an empty list
    const { wrapper, sectionOrderStorage } = wrapperWithStorage([]);

    // When the hook loads
    const { result } = renderHook(() => useSectionOrder(), { wrapper });

    // Then the stored section order is unchanged
    expect(sectionOrderStorage.loadOrder()).toEqual([]);

    // And the section order reports as an empty list
    expect(result.current.order).toEqual([]);
  });
});

// =============================================================================
// US-03: Auto-append at section grain
// =============================================================================

describe('US-03: New section name appends to the order', () => {
  // Trace: US-03

  it('appends a brand-new section name to the end of the order', () => {
    // Given the section order is [Inner Aisles, Deli]
    const currentOrder = ['Inner Aisles', 'Deli'];

    // And the known section names include: Inner Aisles, Deli, Sushi Bar
    const knownSectionNames = ['Inner Aisles', 'Deli', 'Sushi Bar'];

    // When the app reconciles known sections against the order
    const updated = appendNewSections(currentOrder, knownSectionNames);

    // Then the order becomes: Inner Aisles, Deli, Sushi Bar
    expect(updated).toEqual(['Inner Aisles', 'Deli', 'Sushi Bar']);
  });
});

describe('US-03: New aisle inside a known section is a no-op', () => {
  // Trace: US-03 -- the critical behaviour change. New aisle inside a known
  // section MUST NOT mutate the order. The known-section-names list reflects
  // distinct section names only (deduped), so adding aisle 12 to Inner Aisles
  // does not introduce a new entry into knownSectionNames.

  it('produces zero diff when every known section name is already in the order', () => {
    // Given the section order is [Inner Aisles, Deli]
    const currentOrder = ['Inner Aisles', 'Deli'];

    // And every staple's section name is already in the order
    // (Inner Aisles spans aisles 4 and 12, but the known section names list
    // dedupes to just "Inner Aisles".)
    const knownSectionNames = ['Inner Aisles', 'Deli'];

    // When the app reconciles known sections against the order
    const updated = appendNewSections(currentOrder, knownSectionNames);

    // Then the order remains: Inner Aisles, Deli
    expect(updated).toEqual(['Inner Aisles', 'Deli']);
  });
});

describe('US-03: Multiple new sections append in discovery order', () => {
  // Trace: US-03

  it('appends multiple unknown section names in input order', () => {
    // Given the section order is [Inner Aisles, Deli]
    const currentOrder = ['Inner Aisles', 'Deli'];

    // And the known section names include two new sections
    const knownSectionNames = ['Inner Aisles', 'Deli', 'Bakery', 'Floral'];

    // When the app reconciles known sections against the order
    const updated = appendNewSections(currentOrder, knownSectionNames);

    // Then the order ends with: Inner Aisles, Deli, Bakery, Floral
    expect(updated).toEqual(['Inner Aisles', 'Deli', 'Bakery', 'Floral']);
  });
});
