/**
 * Regression test for feature `show-single-aisle-number` (US-01).
 *
 * Driving surface: <AisleSection sectionGroup={...} /> as rendered inside the
 * store view. Props built by feeding raw TripItems through groupBySection
 * (DISTILL D4), so the component sees the same SectionGroup shape the
 * production caller produces. Pure UI render — no I/O, no fixtures, no mocks.
 *
 * Reverses Q5b from `aisle-subgroups-in-store-view`: when every needed item
 * in a section shares the same numeric aisleNumber, the section header now
 * shows an `Aisle N` badge alongside the section name and progress count.
 * All-null and multi-aisle sections are unchanged (regression coverage below).
 *
 * Tags: @walking_skeleton @in-memory @US-01
 * Walking skeleton strategy: A (Full InMemory) — pure domain + component
 * render. No driven adapters in this feature; no real I/O needed.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AisleSection } from '../../src/ui/AisleSection';
import { groupBySection, SectionGroup } from '../../src/domain/item-grouping';
import { TripItem } from '../../src/domain/types';

const makeItem = (
  name: string,
  section: string,
  aisleNumber: number | null,
  checked: boolean = false,
): TripItem => ({
  id: `id-${name}`,
  name,
  houseArea: 'Kitchen Cabinets',
  storeLocation: { section, aisleNumber },
  itemType: 'staple',
  stapleId: null,
  source: 'preloaded',
  needed: true,
  checked,
  checkedAt: null,
});

const sectionGroupFor = (section: string, items: TripItem[]): SectionGroup => {
  const group = groupBySection(items).find((g) => g.section === section);
  if (!group) {
    throw new Error(`Test fixture error: section "${section}" not found`);
  }
  return group;
};

describe('show-single-aisle-number — section header badge (US-01)', () => {
  // @walking_skeleton @in-memory @US-01
  // RED scenario: this is the user-observable change introduced by the feature.
  // Carlos opens the store view and sees `Aisle 12` next to `Frozen` without
  // having to tap an item or switch tabs.
  it('Given a section has items in only one numeric aisle, When AisleSection renders, Then the `Aisle N` badge is visible in the header', () => {
    // GIVEN Carlos has 3 needed items in "Frozen", all at aisle 12
    const items = [
      makeItem('Peas', 'Frozen', 12),
      makeItem('Pizza', 'Frozen', 12),
      makeItem('Ice Cream', 'Frozen', 12),
    ];
    const frozen = sectionGroupFor('Frozen', items);

    // WHEN the "Frozen" section card renders
    const tree = render(<AisleSection sectionGroup={frozen} />);

    // THEN an `Aisle 12` badge is shown in the section header
    expect(tree.queryByTestId('section-aisle-badge-12')).not.toBeNull();
    expect(tree.queryByText('Aisle 12')).not.toBeNull();
  });

  // @US-01 — preserves DISCUSS Domain Example #2 / DDD-2 byte-identical contract.
  it('Given a section has items with no aisle metadata, When AisleSection renders, Then no `Aisle` badge is shown', () => {
    // GIVEN Carlos has 3 needed items in "Produce", all with no aisle number
    const items = [
      makeItem('Apple', 'Produce', null),
      makeItem('Banana', 'Produce', null),
      makeItem('Carrot', 'Produce', null),
    ];
    const produce = sectionGroupFor('Produce', items);

    // WHEN the "Produce" section card renders
    const tree = render(<AisleSection sectionGroup={produce} />);

    // THEN no aisle badge of any number is shown in the header
    expect(tree.queryByTestId(/^section-aisle-badge-/)).toBeNull();
  });

  // @US-01 — regression: multi-aisle rendering must not gain a top-level badge
  // (DISCUSS AC: "Multi-aisle sections show no top-level Aisle badge").
  it('Given a section has items spread across multiple aisles, When AisleSection renders, Then no top-level `Aisle` badge is shown and per-aisle subgroups remain', () => {
    // GIVEN Carlos has trip items in "Inner Aisles" at aisles 4, 5, and 7
    const items = [
      makeItem('Bread', 'Inner Aisles', 4),
      makeItem('Pasta', 'Inner Aisles', 5),
      makeItem('Cereal', 'Inner Aisles', 7),
    ];
    const innerAisles = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" section card renders
    const tree = render(<AisleSection sectionGroup={innerAisles} />);

    // THEN no top-level section-aisle-badge is shown
    expect(tree.queryByTestId(/^section-aisle-badge-/)).toBeNull();
    // AND the existing per-aisle subgroup nodes still render (regression)
    expect(tree.queryByTestId('aisle-subgroup-4')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-5')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-7')).not.toBeNull();
  });

  // @US-01 — DISCUSS Domain Example #4 (Bakery: 2 items at aisle 9 + 1 null
  // item). The section is NOT single-numeric-aisle; renders multi-aisle with
  // an `Aisle 9` subgroup followed by a `No aisle` tail. Critical edge case
  // — locks the rule that any null item disqualifies the single-aisle branch.
  it('Given a section has items at one numeric aisle plus a null-aisle item, When AisleSection renders, Then no top-level `Aisle` badge is shown and the card renders multi-aisle with a `No aisle` tail', () => {
    // GIVEN Carlos has 2 items at aisle 9 in "Bakery"
    // AND 1 item in "Bakery" with no aisle number
    const items = [
      makeItem('Sourdough', 'Bakery', 9),
      makeItem('Croissant', 'Bakery', 9),
      makeItem('Mystery Loaf', 'Bakery', null),
    ];
    const bakery = sectionGroupFor('Bakery', items);

    // WHEN the "Bakery" section card renders
    const tree = render(<AisleSection sectionGroup={bakery} />);

    // THEN no top-level section-aisle-badge is shown
    expect(tree.queryByTestId(/^section-aisle-badge-/)).toBeNull();
    // AND the card renders an aisle-9 subgroup and a no-aisle tail subgroup
    expect(tree.queryByTestId('aisle-subgroup-9')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-no-aisle')).not.toBeNull();
  });

  // @US-01 — D-NOREGRESS contract from `section-order-by-section` /
  // `aisle-subgroups-in-store-view`: section-level `X of Y` and ✓ position
  // and format are unchanged on the new single-aisle branch.
  it('Given a single-aisle section, When AisleSection renders, Then section-level progress and completion are unchanged in position and format', () => {
    // GIVEN Carlos has 3 items in "Frozen" all at aisle 12, 1 of which is checked
    const items = [
      makeItem('Peas', 'Frozen', 12, true),
      makeItem('Pizza', 'Frozen', 12, false),
      makeItem('Ice Cream', 'Frozen', 12, false),
    ];
    const frozen = sectionGroupFor('Frozen', items);

    // WHEN the "Frozen" section card renders
    const tree = render(<AisleSection sectionGroup={frozen} />);

    // THEN the section-level progress reads "1 of 3"
    expect(tree.queryByText('1 of 3')).not.toBeNull();
    // AND no section-level completion checkmark is shown (1 of 3, not complete)
    expect(tree.queryByTestId('section-complete-Frozen')).toBeNull();
  });
});
