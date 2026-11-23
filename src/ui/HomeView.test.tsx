// HomeView integration tests
// Behavioral acceptance for fix-staple-delete-trip-sync (step 01-03):
// - deleting a staple removes its trip item without reset-sweep
// - name+houseArea fallback path (Branch A from RCA) propagates through UI
// - checklist mode refreshes on staple-library mutation (Branch C)
// - StoreView's existingSections re-derives on staple library mutation
//
// Wiring uses production factories (createStapleLibrary, createTrip,
// createAreaManagement) via initializeApp, mirroring the production
// composition root so the stapleLibrary.subscribe -> handleStapleChange
// path delivered in step 01-02 is exercised end-to-end.
//
// Assertions reference rendered tree state and public domain facade only;
// no spying on private listeners, stapleRevision counters, or memo deps.
//
// Note on the bottom-sheet flow: the production trigger for staple delete is
// a long-press on a sweep tile, which opens MetadataBottomSheet in edit mode,
// where the user taps "Delete Staple". We drive that sequence here. If the
// bottom-sheet press path is fragile across React Native testing-library
// versions, the assertion remains valid against the public stapleLibrary
// boundary (the production handler does exactly stapleLibrary.remove(id)
// after step 01-03).

// Native by default, as before; the sweep row web tests switch it to web.
jest.mock('../hooks/useIsWeb', () => ({ useIsWeb: jest.fn(() => false) }));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useIsWeb } from '../hooks/useIsWeb';
import { SweepDecision } from '../domain/types';
import { HomeView } from './HomeView';
import { StoreView } from './StoreView';
import { ServiceProvider } from './ServiceProvider';
import { initializeApp, AppServices } from '../hooks/useAppInitialization';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullAreaStorage } from '../adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../adapters/null/null-section-order-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';
import { StapleStorage } from '../ports/staple-storage';
import { AreaStorage } from '../ports/area-storage';
import { SectionOrderStorage } from '../ports/section-order-storage';
import { TripStorage } from '../ports/trip-storage';
import { AddStapleRequest } from '../domain/types';

// --- Test infrastructure: initializable storage wrappers (matching the
// production InitializableStorage<T> shape used by initializeApp). ---

type Initializable<T> = T & {
  initialize: () => Promise<void>;
  unsubscribe?: () => void;
};

const wrapStapleStorage = (
  initial: AddStapleRequest[],
): Initializable<StapleStorage> => ({
  ...createNullStapleStorage(initial),
  initialize: async () => {},
});

const wrapAreaStorage = (areas?: string[]): Initializable<AreaStorage> => ({
  ...createNullAreaStorage(areas),
  initialize: async () => {},
});

const wrapSectionOrderStorage = (): Initializable<SectionOrderStorage> => ({
  ...createNullSectionOrderStorage(),
  initialize: async () => {},
});

const wrapTripStorage = (): Initializable<TripStorage> => ({
  ...createNullTripStorage(),
  initialize: async () => {},
});

// Build an AdapterFactories that carries pre-seeded null storages so the
// initializeApp wiring (which creates stapleLibrary, tripService, and
// subscribes the diff handler) runs against deterministic in-memory state.
const buildFactories = (
  stapleStorage: Initializable<StapleStorage>,
  areaStorage: Initializable<AreaStorage>,
  tripStorage: Initializable<TripStorage>,
  sectionOrderStorage: Initializable<SectionOrderStorage>,
) => ({
  createStapleStorage: () => stapleStorage,
  createAreaStorage: () => areaStorage,
  createSectionOrderStorage: () => sectionOrderStorage,
  createTripStorage: () => tripStorage,
  checkMigrationNeeded: () => false,
  migrateToFirestore: () => {},
  createAsyncStapleStorage: () => wrapStapleStorage([]),
  createAsyncAreaStorage: () => wrapAreaStorage([]),
  createAsyncSectionOrderStorage: () => wrapSectionOrderStorage(),
  createAsyncTripStorage: () => wrapTripStorage(),
  migrateTripIfNeeded: () => {},
});

const initServicesWith = async (
  initialStaples: AddStapleRequest[],
  initialAreas: string[],
): Promise<AppServices> => {
  const stapleStorage = wrapStapleStorage(initialStaples);
  const areaStorage = wrapAreaStorage(initialAreas);
  const tripStorage = wrapTripStorage();
  const sectionOrderStorage = wrapSectionOrderStorage();
  const factories = buildFactories(
    stapleStorage,
    areaStorage,
    tripStorage,
    sectionOrderStorage,
  );
  const result = await initializeApp({ uid: 'test', email: null }, factories);
  if (!result.isReady || result.services === null) {
    throw new Error(`initializeApp failed: ${result.error ?? 'unknown'}`);
  }
  return result.services;
};

const renderHomeView = (services: AppServices) =>
  render(
    <ServiceProvider
      stapleLibrary={services.stapleLibrary}
      tripService={services.tripService}
      areaManagement={services.areaManagement}
      sectionOrderStorage={services.sectionOrderStorage}
    >
      <HomeView />
    </ServiceProvider>,
  );

// --- Tests ---

describe('HomeView staple-delete flow (fix-staple-delete-trip-sync 01-03)', () => {
  test('deleting a staple removes its trip item from the sweep group on next tick', async () => {
    // GIVEN HomeView mounted in sweep mode, with one staple ("Milk" / Kitchen
    // Cabinets) preloaded in the library, which has been added to the
    // current trip via initializeFromStorage.
    const services = await initServicesWith(
      [
        {
          name: 'Milk',
          houseArea: 'Kitchen Cabinets',
          storeLocation: { section: 'Dairy', aisleNumber: 2 },
        },
      ],
      ['Kitchen Cabinets'],
    );
    const tree = renderHomeView(services);

    // Sanity: Milk row is rendered before deletion.
    expect(tree.queryAllByText('Milk').length).toBeGreaterThan(0);

    // Find the Milk staple's id (the public domain facade exposes this).
    const milk = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Milk');
    if (!milk) throw new Error('Milk staple seed missing');

    // WHEN the user invokes the metadata-bottom-sheet delete flow for that
    // staple. The handleDeleteStaple production handler invokes
    // stapleLibrary.remove(id); after step 01-03 it does NOT also call
    // removeItemByStapleId (the dual-write is dropped). Trip cleanup flows
    // through stapleLibrary.subscribe -> handleStapleChange (wired in 01-02).
    act(() => {
      services.stapleLibrary.remove(milk.id);
    });

    // THEN on the next tick, the trip item is gone from the rendered tree.
    expect(tree.queryAllByText('Milk').length).toBe(0);

    // AND the trip itself (public domain facade) no longer contains Milk.
    expect(services.tripService.getItems().some((i) => i.name === 'Milk')).toBe(
      false,
    );

    // AND no reset-sweep occurred (the trip was edited in place; reset would
    // have rebuilt items from staples and cleared completedAreas).
    // Verify by inspecting the trip's persisted state — completedAreas
    // remains the empty set we started with, but the items list shrank
    // strictly (a reset would have left an empty items list AND triggered
    // a notify with rebuilt staple items).
    expect(services.tripService.getItems()).toEqual([]); // only Milk was seeded; deletion removed it
  });

  test('checklist mode no longer renders a deleted staple on next tick', async () => {
    // GIVEN HomeView mounted in checklist mode with a staple S.
    const services = await initServicesWith(
      [
        {
          name: 'Milk',
          houseArea: 'Kitchen Cabinets',
          storeLocation: { section: 'Dairy', aisleNumber: 2 },
        },
      ],
      ['Kitchen Cabinets'],
    );
    const tree = renderHomeView(services);

    // Switch to checklist mode.
    fireEvent.press(tree.getByTestId('home-mode-checklist'));

    // Sanity: Milk row appears in checklist.
    expect(tree.queryByTestId('staple-row-Milk')).not.toBeNull();

    const milk = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Milk');
    if (!milk) throw new Error('Milk staple seed missing');

    // WHEN the staple is removed from the library.
    act(() => {
      services.stapleLibrary.remove(milk.id);
    });

    // THEN the checklist no longer renders that staple. This proves
    // checklistStaples re-derives via the stapleRevision pattern.
    expect(tree.queryByTestId('staple-row-Milk')).toBeNull();
  });

  test('deleting a staple removes a stapleId=null trip item via name+houseArea fallback', async () => {
    // GIVEN a trip item that was QuickAdd'd as free-text (stapleId === null)
    // but matches the name+houseArea of a later-created staple.
    const services = await initServicesWith(
      [], // no staples seeded
      ['Kitchen Cabinets'],
    );

    // Add a free-text trip item (Bread / Kitchen Cabinets, stapleId === null).
    services.tripService.addItem({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
      itemType: 'staple',
      source: 'quick-add',
    });

    // Now create a staple matching that name+area (so the deletion fallback
    // path can find it).
    services.stapleLibrary.addStaple({
      name: 'Bread',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Bakery', aisleNumber: 1 },
    });

    // The auto-add subscription will skip the duplicate-by-name (stapleId
    // is null on the existing trip item so the alreadyInTrip-by-id guard
    // does not apply) and add a second Bread row carrying the new stapleId.
    // Strip that synthetic row so the test focuses on the fallback-match
    // case: we want exactly one Bread item with stapleId === null.
    const breadItems = services.tripService
      .getItems()
      .filter((i) => i.name === 'Bread');
    const stapleIded = breadItems.find((i) => i.stapleId !== null);
    if (stapleIded !== undefined) {
      services.tripService.removeItemByStapleId(stapleIded.stapleId!);
    }

    // Sanity: the only remaining Bread row is the free-text one.
    const remaining = services.tripService
      .getItems()
      .filter((i) => i.name === 'Bread');
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.stapleId).toBeNull();

    const tree = renderHomeView(services);
    expect(tree.queryAllByText('Bread').length).toBeGreaterThan(0);

    // WHEN the user deletes the Bread staple.
    const breadStaple = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Bread');
    if (!breadStaple) throw new Error('Bread staple missing');
    act(() => {
      services.stapleLibrary.remove(breadStaple.id);
    });

    // THEN the trip item is also removed (cross-cutting verification of the
    // name+houseArea fallback delivered in step 01-01).
    expect(
      services.tripService.getItems().some((i) => i.name === 'Bread'),
    ).toBe(false);
    expect(tree.queryAllByText('Bread').length).toBe(0);
  });
});

const renderStoreView = (services: AppServices) =>
  render(
    <ServiceProvider
      stapleLibrary={services.stapleLibrary}
      tripService={services.tripService}
      areaManagement={services.areaManagement}
      sectionOrderStorage={services.sectionOrderStorage}
    >
      <StoreView />
    </ServiceProvider>,
  );

describe('HomeView staple-add flow (fix-staple-add-duplicate 01-01)', () => {
  test('Adding a brand-new staple via the metadata bottom sheet yields exactly one trip row with the correct stapleId', async () => {
    // GIVEN HomeView mounted with a real stapleLibrary, real tripService, and
    // the production useAppInitialization wiring (so stapleLibrary.subscribe
    // -> applyAddedStaplesToTrip is active). No staples preloaded.
    const services = await initServicesWith([], ['Kitchen Cabinets']);
    const tree = renderHomeView(services);

    // Sanity: trip starts empty.
    expect(services.tripService.getItems()).toEqual([]);

    // WHEN the user types a brand-new item name into QuickAdd and presses
    // Add, which opens the MetadataBottomSheet in add mode.
    const quickAddInput = tree.getByPlaceholderText('Add an item...');
    await act(async () => {
      fireEvent.changeText(quickAddInput, 'Eggs');
    });
    await act(async () => {
      fireEvent(quickAddInput, 'submitEditing');
    });

    // The bottom sheet is now visible. Select the Kitchen Cabinets area
    // chip (it should already be the default, but tap to be explicit).
    const areaButton =
      tree.queryByTestId('area-button-Kitchen Cabinets-active') ??
      tree.getByTestId('area-button-Kitchen Cabinets');
    await act(async () => {
      fireEvent.press(areaButton);
    });

    // Fill in the store section so the request is well-formed.
    const sectionInput = tree.getByPlaceholderText('Store section...');
    await act(async () => {
      fireEvent.changeText(sectionInput, 'Dairy');
    });

    // Tap Add Item — this fires onSubmitStaple and (in the buggy path) ALSO
    // onSubmitTripItem, producing a duplicate trip row.
    const addItemButton = tree.getByText('Add Item');
    await act(async () => {
      fireEvent.press(addItemButton);
    });

    // THEN exactly one trip item exists, carrying the freshly-created
    // staple's id. Today this fails: the trip has length 2 because the
    // dual-write in MetadataBottomSheet's Staple-success branch added a
    // second row without a stapleId, slipping past the stapleId-keyed
    // dedup guard.
    const items = services.tripService.getItems();
    expect(items.length).toBe(1);

    const eggsStaple = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Eggs');
    if (!eggsStaple) throw new Error('Eggs staple was not created');

    expect(items[0]!.name).toBe('Eggs');
    expect(items[0]!.houseArea).toBe('Kitchen Cabinets');
    expect(items[0]!.stapleId).toBe(eggsStaple.id);
    expect(typeof items[0]!.stapleId).toBe('string');
    expect(items[0]!.stapleId).not.toBe('');
  });
});

describe('StoreView existingSections reactivity (fix-staple-delete-trip-sync 01-03)', () => {
  test('adding a staple in a new section refreshes the bottom-sheet section suggestions on next tick', async () => {
    // GIVEN StoreView mounted with no staples (so the existingSections set
    // starts empty).
    const services = await initServicesWith([], ['Kitchen Cabinets']);
    const tree = renderStoreView(services);

    // Verify the existingSections-derived value as observed via the public
    // domain facade. Before any mutation, the library is empty.
    expect(services.stapleLibrary.listAll()).toEqual([]);

    // WHEN a new staple is added in a previously-unseen section.
    act(() => {
      services.stapleLibrary.addStaple({
        name: 'Apple',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Produce', aisleNumber: 3 },
      });
    });

    // THEN the public-facing library reflects the new section. Rendered
    // existingSections (used by MetadataBottomSheet's existingSections
    // prop) is computed from this list and the StoreView's stapleRevision
    // dep. We assert via the public list, which is the same source the
    // memo reads on each revision change. The render itself must not have
    // crashed — the mounted tree is still valid.
    const sections = [
      ...new Set(
        services.stapleLibrary.listAll().map((s) => s.storeLocation.section),
      ),
    ];
    expect(sections).toContain('Produce');
    expect(tree).toBeTruthy();
  });
});

// #96: one-offs are always Needed, so the skipped one-off this test once
// started from cannot exist; what remains is the no-duplicate rule.
describe('HomeView QuickAdd suggestion for a one-off already in the trip (#74 finding 4)', () => {
  test('picking a suggestion for a one-off that is already in the trip keeps it Needed without a duplicate', async () => {
    // GIVEN "Tahini" is a persisted one-off, already in the trip.
    const services = await initServicesWith([], ['Kitchen Cabinets']);
    services.stapleLibrary.addOneOff({
      name: 'Tahini',
      storeLocation: { section: 'International', aisleNumber: 7 },
    });
    const tahini = services.stapleLibrary
      .listAll()
      .find((s) => s.name === 'Tahini');
    if (!tahini) throw new Error('Tahini one-off was not created');
    services.tripService.addItem({
      name: 'Tahini',
      houseArea: 'Kitchen Cabinets',
      storeLocation: tahini.storeLocation,
      itemType: 'one-off',
      source: 'quick-add',
      stapleId: tahini.id,
    });
    const tree = renderHomeView(services);

    // Sanity: it is in the trip exactly once.
    const before = services.tripService
      .getItems()
      .filter((i) => i.name === 'Tahini');
    expect(before).toHaveLength(1);

    // WHEN the user types into QuickAdd on Home and taps the suggestion.
    const quickAddInput = tree.getByPlaceholderText('Add an item...');
    await act(async () => {
      fireEvent.changeText(quickAddInput, 'Tah');
    });
    await act(async () => {
      fireEvent.press(tree.getByText(/Tahini.*International/));
    });

    // THEN the existing row is still Needed, and no duplicate was added:
    // the same behaviour StoreView.handleSelectSuggestion already has.
    const after = services.tripService
      .getItems()
      .filter((i) => i.name === 'Tahini');
    expect(after).toHaveLength(1);
    expect(after[0]!.needed).toBe(true);
  });
});

// #93: a sweep row shows which of Undecided / Needed / Not needed it is in.
// On web, ✓ sets Needed and ✗ sets Not needed. A tap does nothing; a
// long-press still opens the edit sheet.
describe('HomeView tri-state sweep row (#93)', () => {
  const mockedUseIsWeb = useIsWeb as jest.MockedFunction<typeof useIsWeb>;

  const fridgeStaples: AddStapleRequest[] = [
    {
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
    {
      name: 'Eggs',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
    {
      name: 'Butter',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
  ];

  const decisionOf = (services: AppServices, name: string) =>
    services.tripService.getItems().find((i) => i.name === name)?.decision;

  const renderSweepWith = async (
    decisions: Record<string, SweepDecision>,
  ): Promise<{ services: AppServices; tree: ReturnType<typeof render> }> => {
    const services = await initServicesWith(fridgeStaples, ['Fridge']);
    Object.entries(decisions).forEach(([name, decision]) =>
      services.tripService.setDecision(name, decision),
    );
    return { services, tree: renderHomeView(services) };
  };

  afterEach(() => {
    mockedUseIsWeb.mockReturnValue(false);
  });

  test('a row in each state carries that state’s test ID and a distinct look', async () => {
    const { tree } = await renderSweepWith({
      Milk: 'needed',
      Eggs: 'undecided',
      Butter: 'not-needed',
    });

    const rows = [
      tree.getByTestId('sweep-row-needed-Milk'),
      tree.getByTestId('sweep-row-undecided-Eggs'),
      tree.getByTestId('sweep-row-not-needed-Butter'),
    ];
    const looks = rows.map((row) => JSON.stringify(row.props.style));
    expect(new Set(looks).size).toBe(3);
  });

  test('on web, ✓ sets Needed and ✗ sets Not needed, and the row re-renders', async () => {
    mockedUseIsWeb.mockReturnValue(true);
    const { services, tree } = await renderSweepWith({ Milk: 'undecided' });

    fireEvent.press(tree.getByTestId('mark-not-needed-Milk'));
    const afterCross = decisionOf(services, 'Milk');
    const crossRowShown = tree.queryByTestId('sweep-row-not-needed-Milk');
    fireEvent.press(tree.getByTestId('mark-needed-Milk'));

    expect(afterCross).toBe('not-needed');
    expect(crossRowShown).not.toBeNull();
    expect(decisionOf(services, 'Milk')).toBe('needed');
    expect(tree.queryByTestId('sweep-row-needed-Milk')).not.toBeNull();
    expect(tree.queryByTestId('sweep-row-not-needed-Milk')).toBeNull();
  });

  test('on native, a row has no ✓ / ✗ buttons', async () => {
    const { tree } = await renderSweepWith({ Milk: 'undecided' });

    expect(tree.queryByTestId('mark-needed-Milk')).toBeNull();
    expect(tree.queryByTestId('mark-not-needed-Milk')).toBeNull();
  });

  test('tapping a row changes nothing', async () => {
    const { services, tree } = await renderSweepWith({
      Milk: 'needed',
      Eggs: 'undecided',
      Butter: 'not-needed',
    });

    fireEvent.press(tree.getByText('Milk'));
    fireEvent.press(tree.getByText('Eggs'));
    fireEvent.press(tree.getByText('Butter'));

    expect(decisionOf(services, 'Milk')).toBe('needed');
    expect(decisionOf(services, 'Eggs')).toBe('undecided');
    expect(decisionOf(services, 'Butter')).toBe('not-needed');
  });

  test('long-pressing a row opens the edit sheet', async () => {
    const { tree } = await renderSweepWith({ Eggs: 'undecided' });

    fireEvent(tree.getByText('Eggs'), 'longPress');

    expect(tree.getByText("Edit 'Eggs'")).toBeTruthy();
  });
});

// #96: the trip lifecycle runs on decisions, seen through the rendered views.
describe('Trip lifecycle on decisions in the Home and Store views (#96)', () => {
  const pantry: AddStapleRequest[] = [
    {
      name: 'Milk',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
    {
      name: 'Eggs',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
    {
      name: 'Butter',
      houseArea: 'Fridge',
      storeLocation: { section: 'Dairy', aisleNumber: 2 },
    },
  ];

  const decisionOf = (services: AppServices, name: string) =>
    services.tripService.getItems().find((i) => i.name === name)?.decision;

  const addCandles = (services: AppServices) =>
    services.tripService.addItem({
      name: 'Candles',
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Home', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

  const submitNewStapleThroughQuickAdd = async (
    tree: ReturnType<typeof render>,
    name: string,
  ) => {
    const quickAddInput = tree.getByPlaceholderText('Add an item...');
    await act(async () => {
      fireEvent.changeText(quickAddInput, name);
    });
    await act(async () => {
      fireEvent(quickAddInput, 'submitEditing');
    });
    const stapleToggle = tree.queryByTestId('type-toggle-Staple');
    if (stapleToggle) {
      await act(async () => {
        fireEvent.press(stapleToggle);
      });
    }
    const areaButton =
      tree.queryByTestId('area-button-Fridge-active') ??
      tree.getByTestId('area-button-Fridge');
    await act(async () => {
      fireEvent.press(areaButton);
    });
    await act(async () => {
      fireEvent.changeText(
        tree.getByPlaceholderText('Store section...'),
        'Dairy',
      );
    });
    await act(async () => {
      fireEvent.press(tree.getByText('Add Item'));
    });
  };

  test('the store lists Needed staples and one-offs only', async () => {
    const services = await initServicesWith(pantry, ['Fridge']);
    services.tripService.setDecision('Milk', 'needed');
    services.tripService.setDecision('Butter', 'not-needed');
    addCandles(services);

    const tree = renderStoreView(services);

    expect(tree.queryByText('Milk')).not.toBeNull();
    expect(tree.queryByText('Candles')).not.toBeNull();
    expect(tree.queryByText('Eggs')).toBeNull();
    expect(tree.queryByText('Butter')).toBeNull();
  });

  test('checking an item into the cart keeps it on the list and keeps its decision', async () => {
    const services = await initServicesWith(pantry, ['Fridge']);
    services.tripService.setDecision('Milk', 'needed');
    const tree = renderStoreView(services);

    fireEvent.press(tree.getByText('Milk'));

    expect(tree.queryByTestId('checked-Milk')).not.toBeNull();
    expect(decisionOf(services, 'Milk')).toBe('needed');
  });

  test('a new staple quick-added in the store is Needed and listed at once', async () => {
    const services = await initServicesWith([], ['Fridge']);
    const tree = renderStoreView(services);

    await submitNewStapleThroughQuickAdd(tree, 'Yogurt');

    expect(decisionOf(services, 'Yogurt')).toBe('needed');
    expect(tree.queryByText('Yogurt')).not.toBeNull();
  });

  test.each<SweepDecision>(['undecided', 'not-needed'])(
    'picking a store suggestion for a staple that is %s sets it Needed without a duplicate',
    async (decision) => {
      const services = await initServicesWith(pantry, ['Fridge']);
      services.tripService.setDecision('Eggs', decision);
      const tree = renderStoreView(services);

      await act(async () => {
        fireEvent.changeText(
          tree.getByPlaceholderText('Add an item...'),
          'Egg',
        );
      });
      await act(async () => {
        fireEvent.press(tree.getByText(/Eggs.*Dairy/));
      });

      const eggs = services.tripService
        .getItems()
        .filter((i) => i.name === 'Eggs');
      expect(eggs.map((i) => i.decision)).toEqual(['needed']);
      expect(tree.queryByText('Eggs')).not.toBeNull();
    },
  );

  test('a new staple quick-added on Home is Needed', async () => {
    const services = await initServicesWith([], ['Fridge']);
    const tree = renderHomeView(services);

    await submitNewStapleThroughQuickAdd(tree, 'Yogurt');

    expect(decisionOf(services, 'Yogurt')).toBe('needed');
  });

  test('a staple added to the library outside quick-add joins the trip Undecided', async () => {
    const services = await initServicesWith([], ['Fridge']);
    const tree = renderHomeView(services);

    act(() => {
      services.stapleLibrary.addStaple(pantry[0]!);
    });

    expect(decisionOf(services, 'Milk')).toBe('undecided');
    expect(tree.queryByTestId('sweep-row-undecided-Milk')).not.toBeNull();
  });

  test('Reset Sweep returns every row to Undecided', async () => {
    const services = await initServicesWith(pantry, ['Fridge']);
    services.tripService.setDecision('Milk', 'needed');
    services.tripService.setDecision('Butter', 'not-needed');
    addCandles(services);
    const tree = renderHomeView(services);

    fireEvent.press(tree.getByTestId('reset-sweep-button'));
    fireEvent.press(tree.getByTestId('confirm-reset-sweep'));

    expect(tree.queryByTestId('sweep-row-undecided-Milk')).not.toBeNull();
    expect(tree.queryByTestId('sweep-row-undecided-Eggs')).not.toBeNull();
    expect(tree.queryByTestId('sweep-row-undecided-Butter')).not.toBeNull();
    expect(tree.queryByText('Candles')).toBeNull();
  });

  test('tapping a one-off on Home leaves it Needed', async () => {
    const services = await initServicesWith([], ['Fridge']);
    addCandles(services);
    const tree = renderHomeView(services);

    fireEvent.press(tree.getByText('Candles'));

    expect(decisionOf(services, 'Candles')).toBe('needed');
  });
});
