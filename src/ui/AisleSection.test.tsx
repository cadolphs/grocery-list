// AisleSection render-branch tests — slice 01.
// Driving surface: <AisleSection sectionGroup={...} />.
// Props built by feeding raw TripItems through groupBySection (DISTILL D4),
// so the component sees the same SectionGroup shape the production caller produces.
//
// Slice 01 scope: aisle dividers + numeric/no-aisle badges + render-branch selection.
// Per-aisle progress text and per-aisle ✓ are SLICE 02 — not asserted here.

import React from 'react';
import { render } from '@testing-library/react-native';
import { AisleSection } from './AisleSection';
import { groupBySection, SectionGroup } from '../domain/item-grouping';
import { TripItem } from '../domain/types';

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

describe('AisleSection — slice 01 render branches (US-01)', () => {
  test('multi-aisle section renders divider + badge per aisle group', () => {
    // GIVEN Carlos has trip items in "Inner Aisles" at aisles 4, 5, and 7
    const items = [
      makeItem('Pasta', 'Inner Aisles', 5),
      makeItem('Cereal', 'Inner Aisles', 7),
      makeItem('Bread', 'Inner Aisles', 4),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN a sub-group node is present for each of aisles 4, 5, 7
    expect(tree.queryByTestId('aisle-subgroup-4')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-5')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-7')).not.toBeNull();

    // AND the on-screen aisle badges read "4", "5", "7" in that order
    const subGroupNodes = tree
      .getAllByTestId(/^aisle-subgroup-/)
      .map((n) => String(n.props.testID));
    expect(subGroupNodes).toEqual([
      'aisle-subgroup-4',
      'aisle-subgroup-5',
      'aisle-subgroup-7',
    ]);
  });

  test('all-null section renders flat — no sub-group nodes', () => {
    // GIVEN Carlos has trip items in "Produce", all with no aisle number
    const items = [
      makeItem('Apple', 'Produce', null),
      makeItem('Banana', 'Produce', null),
      makeItem('Carrot', 'Produce', null),
    ];
    const sectionGroup = sectionGroupFor('Produce', items);

    // WHEN the "Produce" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN no sub-group node is present
    expect(tree.queryAllByTestId(/^aisle-subgroup-/)).toHaveLength(0);
    // AND no aisle badge is shown (no-aisle badge included)
    expect(tree.queryByTestId('aisle-subgroup-no-aisle')).toBeNull();
  });

  test('single-aisle section renders flat — no badge', () => {
    // GIVEN Carlos has trip items in "Frozen", all at aisle 12
    const items = [
      makeItem('Peas', 'Frozen', 12),
      makeItem('Pizza', 'Frozen', 12),
      makeItem('Ice Cream', 'Frozen', 12),
    ];
    const sectionGroup = sectionGroupFor('Frozen', items);

    // WHEN the "Frozen" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN no sub-group node is present
    expect(tree.queryAllByTestId(/^aisle-subgroup-/)).toHaveLength(0);
    // AND no "12" badge is shown
    expect(tree.queryByTestId('aisle-subgroup-12')).toBeNull();
  });

  test('mixed section places `No aisle` tail at the end', () => {
    // GIVEN Carlos has trip items in "Inner Aisles" at aisles 4 and 5
    // AND one item in "Inner Aisles" with no aisle number
    const items = [
      makeItem('Bread', 'Inner Aisles', 4),
      makeItem('Pasta', 'Inner Aisles', 5),
      makeItem('Mystery', 'Inner Aisles', null),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN sub-group nodes appear for aisles 4, 5, and no-aisle in that order
    const subGroupNodes = tree
      .getAllByTestId(/^aisle-subgroup-/)
      .map((n) => String(n.props.testID));
    expect(subGroupNodes).toEqual([
      'aisle-subgroup-4',
      'aisle-subgroup-5',
      'aisle-subgroup-no-aisle',
    ]);

    // AND the tail badge reads "No aisle"
    // Within the rendered tree, exactly one "No aisle" text node exists, and it
    // lives inside the no-aisle sub-group (the only place we render that label).
    const noAisleLabel = tree.getByText('No aisle');
    expect(noAisleLabel).not.toBeNull();
  });

  test('section header is unchanged on the sub-grouped branch (D-NOREGRESS)', () => {
    // GIVEN Carlos has trip items in "Inner Aisles" at aisles 4 and 5
    // totalling 5 items, 2 checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Butter', 'Inner Aisles', 4, true),
      makeItem('Flour', 'Inner Aisles', 4, false),
      makeItem('Pasta', 'Inner Aisles', 5, false),
      makeItem('Sauce', 'Inner Aisles', 5, false),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN the section header reads "Inner Aisles"
    expect(tree.queryByText('Inner Aisles')).not.toBeNull();
    // AND the section-level progress reads "2 of 5"
    expect(tree.queryByText('2 of 5')).not.toBeNull();
    // AND no section-level checkmark is shown
    expect(tree.queryByTestId('section-complete-Inner Aisles')).toBeNull();
  });
});

describe('AisleSection — slice 02 per-aisle progress + checkmark (US-02)', () => {
  test('aisle sub-group displays its own progress text', () => {
    // GIVEN "Inner Aisles" aisle 4 has 3 needed items with 2 checked
    // AND "Inner Aisles" aisle 5 has 1 unchecked item (so the section is
    // multi-aisle and the sub-grouped branch is selected — single-aisle
    // sections collapse to flat per US-01).
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Butter', 'Inner Aisles', 4, true),
      makeItem('Flour', 'Inner Aisles', 4, false),
      makeItem('Pasta', 'Inner Aisles', 5, false),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN the aisle-4 sub-group shows "2 of 3"
    const aisle4 = tree.getByTestId('aisle-subgroup-4');
    // Resolve "2 of 3" *within* the aisle-4 sub-group (not the section header).
    const within = require('@testing-library/react-native').within;
    expect(within(aisle4).queryByText('2 of 3')).not.toBeNull();
    // AND no aisle-4 completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-4')).toBeNull();
  });

  test('aisle sub-group shows completion checkmark when fully checked', () => {
    // GIVEN "Inner Aisles" aisle 4 has 3 needed items, all 3 checked
    // AND "Inner Aisles" aisle 5 has 2 needed items, none checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Butter', 'Inner Aisles', 4, true),
      makeItem('Flour', 'Inner Aisles', 4, true),
      makeItem('Pasta', 'Inner Aisles', 5, false),
      makeItem('Sauce', 'Inner Aisles', 5, false),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);
    const within = require('@testing-library/react-native').within;

    // THEN the aisle-4 sub-group shows "3 of 3"
    const aisle4 = tree.getByTestId('aisle-subgroup-4');
    expect(within(aisle4).queryByText('3 of 3')).not.toBeNull();
    // AND the aisle-4 completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-4')).not.toBeNull();
    // AND the aisle-5 sub-group shows "0 of 2"
    const aisle5 = tree.getByTestId('aisle-subgroup-5');
    expect(within(aisle5).queryByText('0 of 2')).not.toBeNull();
    // AND no aisle-5 completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-5')).toBeNull();
  });

  test('section-level checkmark unaffected by partial-aisle completion (@noregress)', () => {
    // GIVEN "Inner Aisles" aisle 4 has 3 items, all checked
    // AND "Inner Aisles" aisle 5 has 2 items, none checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Butter', 'Inner Aisles', 4, true),
      makeItem('Flour', 'Inner Aisles', 4, true),
      makeItem('Pasta', 'Inner Aisles', 5, false),
      makeItem('Sauce', 'Inner Aisles', 5, false),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN the aisle-4 completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-4')).not.toBeNull();
    // AND the section-level progress reads "3 of 5"
    expect(tree.queryByText('3 of 5')).not.toBeNull();
    // AND no section-level checkmark is shown
    expect(tree.queryByTestId('section-complete-Inner Aisles')).toBeNull();
  });

  test('section-level checkmark shown when all aisles complete (@noregress)', () => {
    // GIVEN "Inner Aisles" aisle 4 has 3 items and aisle 5 has 2 items, all 5 checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, true),
      makeItem('Butter', 'Inner Aisles', 4, true),
      makeItem('Flour', 'Inner Aisles', 4, true),
      makeItem('Pasta', 'Inner Aisles', 5, true),
      makeItem('Sauce', 'Inner Aisles', 5, true),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN both aisle-4 and aisle-5 completion checkmarks are shown
    expect(tree.queryByTestId('aisle-subgroup-complete-4')).not.toBeNull();
    expect(tree.queryByTestId('aisle-subgroup-complete-5')).not.toBeNull();
    // AND the section-level checkmark is shown
    expect(tree.queryByTestId('section-complete-Inner Aisles')).not.toBeNull();
    // AND the section-level progress reads "5 of 5"
    expect(tree.queryByText('5 of 5')).not.toBeNull();
  });

  test('all-null section shows no sub-group progress (@noregress)', () => {
    // GIVEN Carlos has trip items in "Produce", all with no aisle number, 1 of 4 checked
    const items = [
      makeItem('Apple', 'Produce', null, true),
      makeItem('Banana', 'Produce', null, false),
      makeItem('Carrot', 'Produce', null, false),
      makeItem('Daikon', 'Produce', null, false),
    ];
    const sectionGroup = sectionGroupFor('Produce', items);

    // WHEN the "Produce" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN no sub-group node is present
    expect(tree.queryAllByTestId(/^aisle-subgroup-/)).toHaveLength(0);
    // AND the section-level progress reads "1 of 4"
    expect(tree.queryByText('1 of 4')).not.toBeNull();
  });

  test('single-aisle section shows no sub-group progress (@noregress)', () => {
    // GIVEN Carlos has trip items in "Frozen", all at aisle 12, 0 of 3 checked
    const items = [
      makeItem('Peas', 'Frozen', 12, false),
      makeItem('Pizza', 'Frozen', 12, false),
      makeItem('Ice Cream', 'Frozen', 12, false),
    ];
    const sectionGroup = sectionGroupFor('Frozen', items);

    // WHEN the "Frozen" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);

    // THEN no sub-group node is present
    expect(tree.queryAllByTestId(/^aisle-subgroup-/)).toHaveLength(0);
    // AND the section-level progress reads "0 of 3"
    expect(tree.queryByText('0 of 3')).not.toBeNull();
  });

  test('`No aisle` tail in mixed section reports its own progress and ✓', () => {
    // GIVEN "Inner Aisles" has aisle 4 (1 item, 0 checked)
    // AND one no-aisle item that is checked
    const items = [
      makeItem('Bread', 'Inner Aisles', 4, false),
      makeItem('Mystery', 'Inner Aisles', null, true),
    ];
    const sectionGroup = sectionGroupFor('Inner Aisles', items);

    // WHEN the "Inner Aisles" card renders
    const tree = render(<AisleSection sectionGroup={sectionGroup} />);
    const within = require('@testing-library/react-native').within;

    // THEN the no-aisle sub-group shows "1 of 1"
    const noAisle = tree.getByTestId('aisle-subgroup-no-aisle');
    expect(within(noAisle).queryByText('1 of 1')).not.toBeNull();
    // AND the no-aisle completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-no-aisle')).not.toBeNull();
    // AND the aisle-4 sub-group shows "0 of 1"
    const aisle4 = tree.getByTestId('aisle-subgroup-4');
    expect(within(aisle4).queryByText('0 of 1')).not.toBeNull();
    // AND no aisle-4 completion checkmark is shown
    expect(tree.queryByTestId('aisle-subgroup-complete-4')).toBeNull();
  });
});
