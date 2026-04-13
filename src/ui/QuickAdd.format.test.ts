// Unit tests for formatSuggestion — a pure function.

import { formatSuggestion } from './QuickAdd';
import { StapleItem } from '../domain/types';

const makeStaple = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'id-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('formatSuggestion', () => {
  it('appends "(one-off)" label for one-off items', () => {
    const oneOff = makeStaple({
      name: 'Tahini',
      type: 'one-off',
      storeLocation: { section: 'International', aisleNumber: 7 },
    });

    expect(formatSuggestion(oneOff)).toBe('Tahini - International / Aisle 7 (one-off)');
  });

  it('does not append a type label for staple items', () => {
    const staple = makeStaple({
      name: 'Milk',
      type: 'staple',
      storeLocation: { section: 'Dairy', aisleNumber: 3 },
    });

    expect(formatSuggestion(staple)).toBe('Milk - Dairy / Aisle 3');
    expect(formatSuggestion(staple)).not.toMatch(/\(one-off\)/);
    expect(formatSuggestion(staple)).not.toMatch(/\(staple\)/);
  });
});
