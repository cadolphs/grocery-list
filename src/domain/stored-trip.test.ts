// ADR-013 migration rule for stored trip items (#92).

import { readStoredTrip, StoredTripItem } from './stored-trip';
import { SweepDecision } from './types';

const storedItem = (
  needed: boolean | undefined,
  decision?: SweepDecision,
): StoredTripItem => ({
  id: 'item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  ...(needed === undefined ? {} : { needed }),
  ...(decision === undefined ? {} : { decision }),
  checked: false,
  checkedAt: null,
});

const readDecision = (item: StoredTripItem) =>
  readStoredTrip({
    id: 'trip-1',
    items: [item],
    status: 'active',
    createdAt: '2026-11-23T00:00:00.000Z',
  }).items[0]!.decision;

describe('readStoredTrip', () => {
  test.each<
    [string, boolean | undefined, SweepDecision | undefined, SweepDecision]
  >([
    ['decision only, Needed', undefined, 'needed', 'needed'],
    ['decision only, Not needed', undefined, 'not-needed', 'not-needed'],
    ['decision only, Undecided', undefined, 'undecided', 'undecided'],
    ['legacy needed', true, undefined, 'needed'],
    ['legacy not needed', false, undefined, 'not-needed'],
    ['agreeing Needed', true, 'needed', 'needed'],
    ['agreeing Not needed', false, 'not-needed', 'not-needed'],
    ['agreeing Undecided', false, 'undecided', 'undecided'],
    [
      'stale Needed after an old build un-needed it',
      false,
      'needed',
      'not-needed',
    ],
    [
      'stale Undecided after an old build needed it',
      true,
      'undecided',
      'needed',
    ],
    [
      'stale Not needed after an old build needed it',
      true,
      'not-needed',
      'needed',
    ],
  ])('%s reads as the expected decision', (_case, needed, stored, expected) => {
    expect(readDecision(storedItem(needed, stored))).toBe(expected);
  });

  test('reads an item without the legacy needed flag', () => {
    const trip = {
      id: 'trip-1',
      items: [storedItem(true, 'needed')],
      status: 'active' as const,
      createdAt: '2026-11-23T00:00:00.000Z',
    };

    expect(readStoredTrip(trip).items[0]).not.toHaveProperty('needed');
  });

  test('keeps every other field of the trip and its items', () => {
    const trip = {
      id: 'trip-1',
      items: [storedItem(true)],
      status: 'completed' as const,
      createdAt: '2026-11-23T00:00:00.000Z',
    };

    expect(readStoredTrip(trip)).toEqual({
      ...trip,
      items: [{ ...storedItem(undefined), decision: 'needed' }],
    });
  });
});

// #113: 'whiteboard' was dropped from ItemSource. A trip item saved with it
// was added from the Home view by hand, so it reads as a quick add.
describe('readStoredTrip: retired item sources', () => {
  const readSource = (source: string) =>
    readStoredTrip({
      id: 'trip-1',
      items: [{ ...storedItem(undefined, 'needed'), source } as StoredTripItem],
      status: 'active',
      createdAt: '2026-11-23T00:00:00.000Z',
    }).items[0]!.source;

  test('a stored whiteboard item reads as quick-add', () => {
    expect(readSource('whiteboard')).toBe('quick-add');
  });

  test.each(['preloaded', 'quick-add', 'carryover'])(
    'a stored %s item keeps its source',
    (source) => {
      expect(readSource(source)).toBe(source);
    },
  );
});
