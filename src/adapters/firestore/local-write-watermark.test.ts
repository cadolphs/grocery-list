import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdoptionDecision,
  MirrorDocName,
  MirrorEnvelope,
  ParseV1,
  buildV1MirrorKey,
  buildV2MirrorKey,
  extractWrittenAt,
  nextWrittenAt,
  readMirrorEnvelope,
  resolveAdoption,
  writeMirrorEnvelope,
} from './local-write-watermark';

const TEST_UID = 'user-watermark-123';

const ALL_DOCS: readonly MirrorDocName[] = ['trip', 'carryover', 'staples', 'areas', 'sectionOrder'];

beforeEach(async () => {
  // The jest-expo AsyncStorage mock's methods are jest.fn instances, so their
  // call history accumulates across tests unless cleared here (same convention
  // as the adapter unit tests).
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// --- nextWrittenAt: hybrid logical clock stamp ---

describe('nextWrittenAt', () => {
  test.each<[string, number, number | null, number]>([
    ['lastSeen is null', 100, null, 100],
    ['lastSeen is behind now', 100, 50, 100],
    ['lastSeen equals now (same millisecond)', 100, 100, 101],
    ['lastSeen is ahead of now (device clock stepped backwards)', 100, 150, 151],
  ])('%s', (_label, now, lastSeen, expected) => {
    expect(nextWrittenAt(now, lastSeen)).toBe(expected);
  });

  it('yields strictly increasing stamps when each result is fed back as lastSeen across a backwards-stepping clock', () => {
    const clockReadings = [100, 100, 50, 200, 150];

    const stamps = clockReadings.reduce<readonly number[]>((previousStamps, now) => {
      const lastSeen = previousStamps.length === 0 ? null : previousStamps[previousStamps.length - 1];
      return [...previousStamps, nextWrittenAt(now, lastSeen)];
    }, []);

    stamps.slice(1).forEach((stamp, index) => {
      expect(stamp).toBeGreaterThan(stamps[index]);
    });
    expect(stamps).toEqual([100, 101, 102, 200, 201]);
  });
});

// --- resolveAdoption: full present/missing x older/equal/newer partition ---

describe('resolveAdoption', () => {
  test.each<[string, number | null, number | null, AdoptionDecision]>([
    ['server missing, mirror missing', null, null, 'adopt'],
    ['server missing, mirror present', null, 5, 'adopt'],
    ['server present, mirror missing', 5, null, 'adopt'],
    ['equal stamps', 5, 5, 'adopt'],
    ['server newer than mirror', 6, 5, 'adopt'],
    ['server older than mirror', 4, 5, 'repush'],
  ])('%s', (_label, serverWrittenAt, mirrorWrittenAt, expected) => {
    expect(resolveAdoption(serverWrittenAt, mirrorWrittenAt)).toBe(expected);
  });
});

// --- extractWrittenAt: finite number or nothing ---

describe('extractWrittenAt', () => {
  test.each<[string, Record<string, unknown> | undefined, number | null]>([
    ['undefined data', undefined, null],
    ['missing field', {}, null],
    ['non-number', { writtenAt: 'x' }, null],
    ['NaN', { writtenAt: NaN }, null],
    ['positive infinity', { writtenAt: Infinity }, null],
    ['negative infinity', { writtenAt: -Infinity }, null],
    ['finite number', { writtenAt: 42 }, 42],
    ['zero is a valid stamp', { writtenAt: 0 }, 0],
  ])('%s', (_label, data, expected) => {
    expect(extractWrittenAt(data)).toBe(expected);
  });
});

// --- key builders: v1 must match the legacy adapter keys byte-for-byte ---

describe('mirror key builders', () => {
  test.each(ALL_DOCS)('v1 and v2 keys for %s are versioned and uid-scoped', (doc) => {
    expect(buildV1MirrorKey(TEST_UID, doc)).toBe(`firestore-cache:v1:${TEST_UID}:${doc}`);
    expect(buildV2MirrorKey(TEST_UID, doc)).toBe(`firestore-cache:v2:${TEST_UID}:${doc}`);
  });
});

// --- readMirrorEnvelope: v2 first, v1 fallback per adapter shape ---

type SectionOrderValue = string[] | null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

// v1 parsers mirror the adapters' existing parse logic (RCA 6.3 table).
const parseTripV1: ParseV1<unknown> = (raw) => ({ value: JSON.parse(raw) });
const parseArrayV1: ParseV1<unknown> = (raw) => ({ value: JSON.parse(raw) });
const parseAreasV1: ParseV1<string[]> = (raw) => {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return { value: parsed as string[] };
};
const parseSectionOrderV1: ParseV1<SectionOrderValue> = (raw) => {
  const parsed = JSON.parse(raw) as { order?: unknown } | null;
  if (parsed === null || typeof parsed !== 'object') return null;
  const { order } = parsed;
  if (order === null) return { value: null };
  if (!Array.isArray(order)) return null;
  return { value: order as string[] };
};

const acceptAnyV2 = (_value: unknown): _value is unknown => true;
const validateAreasV2 = (value: unknown): value is string[] =>
  isStringArray(value) && value.length > 0;
const validateSectionOrderV2 = (value: unknown): value is SectionOrderValue =>
  value === null || isStringArray(value);

const rawTrip = { id: 'trip-1', items: [{ id: 'item-1', name: 'Milk' }] };
const rawCarryover = [{ id: 'item-2', name: 'Eggs' }];
const rawStaples = [{ id: 'staple-1', name: 'Bread' }];

describe('readMirrorEnvelope', () => {
  describe('v2 absent, v1 present: falls back to the adapter-supplied parser with writtenAt null', () => {
    type V1FallbackCase = {
      readonly label: string;
      readonly doc: MirrorDocName;
      readonly rawV1: string;
      readonly parseV1: ParseV1<unknown>;
      readonly expected: MirrorEnvelope<unknown> | null;
    };

    const cases: readonly V1FallbackCase[] = [
      {
        label: 'raw trip object',
        doc: 'trip',
        rawV1: JSON.stringify(rawTrip),
        parseV1: parseTripV1,
        expected: { value: rawTrip, writtenAt: null },
      },
      {
        label: 'raw carryover array',
        doc: 'carryover',
        rawV1: JSON.stringify(rawCarryover),
        parseV1: parseArrayV1,
        expected: { value: rawCarryover, writtenAt: null },
      },
      {
        label: 'raw staple array',
        doc: 'staples',
        rawV1: JSON.stringify(rawStaples),
        parseV1: parseArrayV1,
        expected: { value: rawStaples, writtenAt: null },
      },
      {
        label: 'raw area array',
        doc: 'areas',
        rawV1: JSON.stringify(['Fridge', 'Pantry']),
        parseV1: parseAreasV1,
        expected: { value: ['Fridge', 'Pantry'], writtenAt: null },
      },
      {
        label: 'empty area array is no usable mirror',
        doc: 'areas',
        rawV1: JSON.stringify([]),
        parseV1: parseAreasV1,
        expected: null,
      },
      {
        label: 'section order { order: null } is a present mirrored clear',
        doc: 'sectionOrder',
        rawV1: JSON.stringify({ order: null }),
        parseV1: parseSectionOrderV1,
        expected: { value: null, writtenAt: null },
      },
      {
        label: 'section order { order: [...] }',
        doc: 'sectionOrder',
        rawV1: JSON.stringify({ order: ['Dairy', 'Produce'] }),
        parseV1: parseSectionOrderV1,
        expected: { value: ['Dairy', 'Produce'], writtenAt: null },
      },
    ];

    test.each(cases)('$label', async ({ doc, rawV1, parseV1, expected }) => {
      await AsyncStorage.setItem(buildV1MirrorKey(TEST_UID, doc), rawV1);

      const result = await readMirrorEnvelope(TEST_UID, doc, parseV1, acceptAnyV2);

      expect(result).toEqual(expected);
    });
  });

  it('prefers a valid v2 envelope and ignores a co-present v1 value', async () => {
    const v2Trip = { id: 'trip-v2', items: [] };
    await AsyncStorage.setItem(buildV1MirrorKey(TEST_UID, 'trip'), JSON.stringify(rawTrip));
    await AsyncStorage.setItem(
      buildV2MirrorKey(TEST_UID, 'trip'),
      JSON.stringify({ value: v2Trip, writtenAt: 42 })
    );

    const result = await readMirrorEnvelope(TEST_UID, 'trip', parseTripV1, acceptAnyV2);

    expect(result).toEqual({ value: v2Trip, writtenAt: 42 });
  });

  it('returns a v2 envelope whose writtenAt is null as present', async () => {
    await AsyncStorage.setItem(
      buildV2MirrorKey(TEST_UID, 'staples'),
      JSON.stringify({ value: rawStaples, writtenAt: null })
    );

    const result = await readMirrorEnvelope(TEST_UID, 'staples', parseArrayV1, acceptAnyV2);

    expect(result).toEqual({ value: rawStaples, writtenAt: null });
  });

  it('treats a v2 { value: null, writtenAt: 7 } (section-order mirrored clear) as a present envelope', async () => {
    await AsyncStorage.setItem(
      buildV2MirrorKey(TEST_UID, 'sectionOrder'),
      JSON.stringify({ value: null, writtenAt: 7 })
    );

    const result = await readMirrorEnvelope(
      TEST_UID,
      'sectionOrder',
      parseSectionOrderV1,
      validateSectionOrderV2
    );

    expect(result).toEqual({ value: null, writtenAt: 7 });
  });

  it('falls through to v1 when v2 is unparseable', async () => {
    await AsyncStorage.setItem(buildV2MirrorKey(TEST_UID, 'carryover'), '{not json');
    await AsyncStorage.setItem(
      buildV1MirrorKey(TEST_UID, 'carryover'),
      JSON.stringify(rawCarryover)
    );

    const result = await readMirrorEnvelope(TEST_UID, 'carryover', parseArrayV1, acceptAnyV2);

    expect(result).toEqual({ value: rawCarryover, writtenAt: null });
  });

  it('yields null when v2 is unparseable and v1 is absent', async () => {
    await AsyncStorage.setItem(buildV2MirrorKey(TEST_UID, 'carryover'), '{not json');

    const result = await readMirrorEnvelope(TEST_UID, 'carryover', parseArrayV1, acceptAnyV2);

    expect(result).toBeNull();
  });

  it('falls through to v1 when the v2 value fails validateV2 (empty area array)', async () => {
    await AsyncStorage.setItem(
      buildV2MirrorKey(TEST_UID, 'areas'),
      JSON.stringify({ value: [], writtenAt: 3 })
    );
    await AsyncStorage.setItem(buildV1MirrorKey(TEST_UID, 'areas'), JSON.stringify(['Fridge']));

    const result = await readMirrorEnvelope(TEST_UID, 'areas', parseAreasV1, validateAreasV2);

    expect(result).toEqual({ value: ['Fridge'], writtenAt: null });
  });

  it('yields null when nothing usable exists on either key', async () => {
    const result = await readMirrorEnvelope(TEST_UID, 'areas', parseAreasV1, validateAreasV2);

    expect(result).toBeNull();
  });
});

// --- writeMirrorEnvelope: v2 write plus v1 removal on every call ---

describe('writeMirrorEnvelope', () => {
  test.each<[string, number | null]>([
    ['numeric stamp', 42],
    ['null stamp', null],
  ])('writes the v2 envelope carrying exactly { value, writtenAt } and removes the v1 key (%s)', (_label, writtenAt) => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem');

    writeMirrorEnvelope(TEST_UID, 'trip', rawTrip, writtenAt);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const [writtenKey, writtenPayload] = setItemSpy.mock.calls[0];
    expect(writtenKey).toBe(buildV2MirrorKey(TEST_UID, 'trip'));
    const envelope = JSON.parse(writtenPayload) as Record<string, unknown>;
    expect(Object.keys(envelope).sort()).toEqual(['value', 'writtenAt']);
    expect(envelope).toEqual({ value: rawTrip, writtenAt });

    expect(removeItemSpy).toHaveBeenCalledTimes(1);
    expect(removeItemSpy).toHaveBeenCalledWith(buildV1MirrorKey(TEST_UID, 'trip'));
  });

  it('round-trips through readMirrorEnvelope once the write settles', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    writeMirrorEnvelope(TEST_UID, 'sectionOrder', null, 7);
    await Promise.all(setItemSpy.mock.results.map((result) => result.value));

    const result = await readMirrorEnvelope(
      TEST_UID,
      'sectionOrder',
      parseSectionOrderV1,
      validateSectionOrderV2
    );

    expect(result).toEqual({ value: null, writtenAt: 7 });
  });
});
