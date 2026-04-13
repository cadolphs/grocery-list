/**
 * Unit tests for filterStaples pure function.
 *
 * filterStaples performs case-insensitive substring matching on staple names.
 * Port-to-port at domain scope: function signature IS the driving port.
 */

import { filterStaples } from '../../../src/ui/StapleChecklist';
import { StapleItem } from '../../../src/domain/types';

const makeStaple = (name: string): StapleItem => ({
  id: name.toLowerCase().replace(/\s/g, '-'),
  name,
  houseArea: 'Kitchen',
  storeLocation: { section: 'General', aisleNumber: 1 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00Z',
});

const staples: readonly StapleItem[] = [
  makeStaple('Cheddar Cheese'),
  makeStaple('Chicken Breast'),
  makeStaple('Chocolate Chips'),
  makeStaple('Butter'),
  makeStaple('Peanut Butter'),
];

describe('filterStaples', () => {
  it('returns all staples when query is empty', () => {
    const result = filterStaples(staples, '');
    expect(result).toEqual(staples);
  });

  it('filters by case-insensitive substring match', () => {
    const result = filterStaples(staples, 'ch');
    const names = result.map(s => s.name);
    expect(names).toEqual(['Cheddar Cheese', 'Chicken Breast', 'Chocolate Chips']);
  });

  it('matches substrings anywhere in the name', () => {
    const result = filterStaples(staples, 'butter');
    const names = result.map(s => s.name);
    expect(names).toEqual(['Butter', 'Peanut Butter']);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterStaples(staples, 'xyz');
    expect(result).toEqual([]);
  });
});
