// ADR-013 migration rule for stored trip items (#92), and the in-cart
// rename's read and write rule (#112).

import {
  readStoredCarryover,
  readStoredTrip,
  StoredTripItem,
  toStoredCarryover,
  toStoredTrip,
  toStoredTripItem,
} from './stored-trip';
import { SweepDecision, Trip, TripItem } from './types';

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

    const {
      checked: _checked,
      checkedAt: _checkedAt,
      ...rest
    } = storedItem(undefined);
    expect(readStoredTrip(trip)).toEqual({
      ...trip,
      items: [{ ...rest, decision: 'needed', inCart: false, inCartAt: null }],
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

// #112 expand phase: storage said checked / checkedAt, the domain says
// inCart / inCartAt. Writes carry both pairs, equal; a stored checked pair
// always wins on read, because only an older build changes it alone.
type CartKeys = Pick<
  StoredTripItem,
  'inCart' | 'inCartAt' | 'checked' | 'checkedAt'
>;

const cartItem = (cart: CartKeys): StoredTripItem => ({
  id: 'item-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  itemType: 'staple',
  stapleId: 'staple-1',
  source: 'preloaded',
  decision: 'needed',
  ...cart,
});

const readCart = (cart: CartKeys) => {
  const { inCart, inCartAt } = readStoredTrip({
    id: 'trip-1',
    items: [cartItem(cart)],
    status: 'active',
    createdAt: '2026-11-23T00:00:00.000Z',
  }).items[0]!;
  return { inCart, inCartAt };
};

const AT = '2026-11-26T10:00:00.000Z';
const LATER = '2026-11-26T10:05:00.000Z';

describe('readStoredTrip: in cart', () => {
  test.each<[string, CartKeys, Pick<TripItem, 'inCart' | 'inCartAt'>]>([
    [
      'legacy in cart',
      { checked: true, checkedAt: AT },
      { inCart: true, inCartAt: AT },
    ],
    [
      'legacy not in cart',
      { checked: false, checkedAt: null },
      { inCart: false, inCartAt: null },
    ],
    [
      'legacy in cart without a timestamp',
      { checked: true },
      { inCart: true, inCartAt: null },
    ],
    [
      'new keys only, in cart',
      { inCart: true, inCartAt: AT },
      { inCart: true, inCartAt: AT },
    ],
    [
      'new keys only, not in cart',
      { inCart: false, inCartAt: null },
      { inCart: false, inCartAt: null },
    ],
    [
      'new in cart without a timestamp',
      { inCart: true },
      { inCart: true, inCartAt: null },
    ],
    ['neither pair', {}, { inCart: false, inCartAt: null }],
    [
      'both pairs agreeing',
      { inCart: true, inCartAt: AT, checked: true, checkedAt: AT },
      { inCart: true, inCartAt: AT },
    ],
    [
      'an older build put it in the cart',
      { inCart: false, inCartAt: null, checked: true, checkedAt: AT },
      { inCart: true, inCartAt: AT },
    ],
    [
      'an older build took it out of the cart',
      { inCart: true, inCartAt: AT, checked: false, checkedAt: null },
      { inCart: false, inCartAt: null },
    ],
    [
      'an older build took it out and put it back',
      { inCart: true, inCartAt: AT, checked: true, checkedAt: LATER },
      { inCart: true, inCartAt: LATER },
    ],
  ])('%s', (_case, stored, expected) => {
    expect(readCart(stored)).toEqual(expected);
  });

  test('the legacy checked pair is not kept on the item read', () => {
    const item = readStoredCarryover([
      cartItem({ inCart: true, inCartAt: AT, checked: true, checkedAt: AT }),
    ])[0]!;

    expect(item).not.toHaveProperty('checked');
    expect(item).not.toHaveProperty('checkedAt');
  });

  test('carryover items read the same rule', () => {
    const [item] = readStoredCarryover([
      cartItem({ inCart: false, inCartAt: null, checked: true, checkedAt: AT }),
    ]);

    expect(item).toMatchObject({ inCart: true, inCartAt: AT });
  });
});

describe('toStoredTrip: expand phase writes both pairs', () => {
  const domainItem = (inCart: boolean, inCartAt: string | null): TripItem => ({
    id: 'item-1',
    name: 'Milk',
    houseArea: 'Fridge',
    storeLocation: { section: 'Dairy', aisleNumber: 3 },
    itemType: 'staple',
    stapleId: 'staple-1',
    source: 'preloaded',
    decision: 'needed',
    inCart,
    inCartAt,
  });

  const trip = (items: TripItem[]): Trip => ({
    id: 'trip-1',
    items,
    status: 'active',
    createdAt: '2026-11-23T00:00:00.000Z',
  });

  test.each<[boolean, string | null]>([
    [true, AT],
    [false, null],
  ])('an item with inCart %s carries checked equal to it', (inCart, at) => {
    expect(toStoredTripItem(domainItem(inCart, at))).toEqual({
      ...domainItem(inCart, at),
      checked: inCart,
      checkedAt: at,
    });
  });

  test('a trip and a carryover list write every item with both pairs', () => {
    const items = [domainItem(true, AT), domainItem(false, null)];

    expect(toStoredTrip(trip(items))).toEqual({
      ...trip(items),
      items: items.map(toStoredTripItem),
    });
    expect(toStoredCarryover(items)).toEqual(items.map(toStoredTripItem));
  });

  // Adapters compare serialized trips to spot their own echoed writes, so a
  // read of this build's write must serialize exactly like the trip written.
  test('reading a written trip gives back the same serialized trip', () => {
    const written = trip([domainItem(true, AT), domainItem(false, null)]);

    expect(JSON.stringify(readStoredTrip(toStoredTrip(written)))).toBe(
      JSON.stringify(written),
    );
  });

  // What an older build sees: it reads checked only.
  test('an older build reading the write sees what is in the cart', () => {
    const stored = toStoredTripItem(domainItem(true, AT));

    expect(stored.checked).toBe(true);
    expect(stored.checkedAt).toBe(AT);
  });
});
