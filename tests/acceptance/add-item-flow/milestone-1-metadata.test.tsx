/**
 * Milestone 1: Add Item Metadata Flow - Focused Scenarios
 *
 * All tests in this file are SKIPPED. They should be enabled one at a time
 * after the walking skeleton is complete.
 *
 * Driving Ports:
 * - Domain: staple library functions, trip functions
 * - UI: React components via @testing-library/react-native
 *
 * Story Trace:
 * - US-AIF-02: Context-Aware Smart Defaults
 * - US-AIF-03: Skip Metadata Shortcut
 * - US-AIF-04: Section Auto-Suggest
 * - US-AIF-05: Duplicate Staple Detection
 */

// --- Driving port imports ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// UI-level imports:
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';

// =============================================================================
// Test Setup Helper
// =============================================================================

function createTestServices(preloadedStaples?: Array<{
  name: string;
  houseArea: 'Bathroom' | 'Garage Pantry' | 'Kitchen Cabinets' | 'Fridge' | 'Freezer';
  storeLocation: { section: string; aisleNumber: number | null };
}>) {
  const stapleStorage = createNullStapleStorage(preloadedStaples ?? [
    { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
  ]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(library.listAll());
  return { library, tripService, stapleStorage, tripStorage };
}

function renderApp(library: ReturnType<typeof createStapleLibrary>, tripService: ReturnType<typeof createTrip>) {
  return render(
    <ServiceProvider stapleLibrary={library} tripService={tripService}>
      <AppShell />
    </ServiceProvider>
  );
}

function openMetadataSheet(itemName: string): void {
  const quickAddInput = screen.getByPlaceholderText('Add an item...');
  fireEvent.changeText(quickAddInput, itemName);
  fireEvent.press(screen.getByText(new RegExp(`Add '${itemName}' as new item`)));
}

function tapAreaSection(areaName: string): void {
  // Tap area heading to set it as active area
  fireEvent.press(screen.getByText(new RegExp(`^${areaName} \\(`)));
}

function completeAllAreas(tripService: ReturnType<typeof createTrip>): void {
  const allAreas = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'] as const;
  for (const area of allAreas) {
    tripService.completeArea(area);
  }
}

// =============================================================================
// US-AIF-02: Context-Aware Smart Defaults
// =============================================================================

describe('US-AIF-02: Context-Aware Smart Defaults', () => {
  // AC: During sweep, type defaults to Staple and area defaults to active area
  // AC: During whiteboard entry, type defaults to One-off and area has no default
  // AC: All defaults can be overridden by the user
  // Trace: US-AIF-02, AC-1, AC-2, AC-3

  it('sweep mode pre-fills staple type and active area', () => {
    // Given Carlos is viewing the Fridge area during a sweep (not all areas complete)
    const { library, tripService } = createTestServices();
    renderApp(library, tripService);

    // Carlos taps the Fridge area to set it as active
    tapAreaSection('Fridge');

    // When Carlos opens the metadata bottom sheet for "Almond butter"
    openMetadataSheet('Almond butter');

    // Then the type toggle defaults to "Staple" (shown by testID)
    expect(screen.getByTestId('type-toggle-Staple-active')).toBeTruthy();

    // And the area picker shows "Fridge" pre-selected
    expect(screen.getByTestId('area-button-Fridge-active')).toBeTruthy();
  });

  it('whiteboard mode defaults to one-off with no area pre-selected', () => {
    // Given all sweep areas are complete (whiteboard mode active)
    const { library, tripService } = createTestServices();
    completeAllAreas(tripService);
    renderApp(library, tripService);

    // When Carlos opens the metadata bottom sheet for "Dish soap"
    openMetadataSheet('Dish soap');

    // Then the type toggle defaults to "One-off"
    expect(screen.getByTestId('type-toggle-One-off-active')).toBeTruthy();

    // And no area button is in active state
    expect(screen.queryByTestId(/area-button-.*-active/)).toBeNull();
  });

  it('active area changes when Carlos switches rooms', () => {
    // Given Carlos was viewing Fridge but switches to Garage Pantry
    const { library, tripService } = createTestServices();
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    tapAreaSection('Garage Pantry');

    // When Carlos opens the metadata bottom sheet for "Dog treats"
    openMetadataSheet('Dog treats');

    // Then the area picker shows "Garage Pantry" pre-selected
    expect(screen.getByTestId('area-button-Garage Pantry-active')).toBeTruthy();
  });

  it('Carlos can override any smart default', () => {
    // Given Carlos is viewing the Fridge area during a sweep
    const { library, tripService } = createTestServices();
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    openMetadataSheet('Dog treats');

    // Defaults should be Staple + Fridge
    expect(screen.getByTestId('type-toggle-Staple-active')).toBeTruthy();
    expect(screen.getByTestId('area-button-Fridge-active')).toBeTruthy();

    // When Carlos changes type to "One-off" and area to "Freezer"
    fireEvent.press(screen.getByText('One-off'));
    fireEvent.press(screen.getByText('Freezer'));

    // And Carlos fills section "Frozen Treats" and taps "Add Item"
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Frozen Treats');
    fireEvent.press(screen.getByText('Add Item'));

    // Then the item is saved as one-off in the Freezer area
    const tripItems = tripService.getItems();
    expect(tripItems).toContainEqual(
      expect.objectContaining({
        name: 'Dog treats',
        houseArea: 'Freezer',
        itemType: 'one-off',
      })
    );
  });
});

// =============================================================================
// US-AIF-03: Skip Metadata Shortcut
// =============================================================================

describe('US-AIF-03: Skip Metadata Shortcut', () => {
  // AC: "Skip, add with defaults" button visible in the bottom sheet
  // AC: Skip uses current active area or Kitchen Cabinets as fallback
  // AC: Skip always creates a one-off item
  // AC: Skipped items are not saved to the staple library
  // Trace: US-AIF-03, AC-1 through AC-5

  it('skip adds item as one-off with active area during sweep', () => {
    // Given Carlos is viewing the Fridge area during a sweep
    const { library, tripService } = createTestServices();
    renderApp(library, tripService);

    tapAreaSection('Fridge');

    // And Carlos has opened the metadata bottom sheet for "Sriracha"
    openMetadataSheet('Sriracha');

    // When Carlos taps "Skip, add with defaults"
    fireEvent.press(screen.getByText('Skip, add with defaults'));

    // Then "Sriracha" is added as one-off in the Fridge area
    const tripItems = tripService.getItems();
    const sriracha = tripItems.find(i => i.name === 'Sriracha');
    expect(sriracha).toBeDefined();
    expect(sriracha?.itemType).toBe('one-off');
    expect(sriracha?.houseArea).toBe('Fridge');

    // And the section is "Uncategorized" with no aisle number
    expect(sriracha?.storeLocation.section).toBe('Uncategorized');
    expect(sriracha?.storeLocation.aisleNumber).toBeNull();

    // And the bottom sheet dismisses
    expect(screen.queryByText("Add 'Sriracha'")).toBeNull();
  });

  it('skip uses Kitchen Cabinets fallback during whiteboard entry', () => {
    // Given all sweep areas are complete with no active area
    const { library, tripService } = createTestServices();
    completeAllAreas(tripService);
    renderApp(library, tripService);

    // And Carlos has opened the metadata bottom sheet for "Fancy mustard"
    openMetadataSheet('Fancy mustard');

    // When Carlos taps "Skip, add with defaults"
    fireEvent.press(screen.getByText('Skip, add with defaults'));

    // Then "Fancy mustard" is added as one-off in Kitchen Cabinets
    const mustard = tripService.getItems().find(i => i.name === 'Fancy mustard');
    expect(mustard).toBeDefined();
    expect(mustard?.houseArea).toBe('Kitchen Cabinets');
    expect(mustard?.storeLocation.section).toBe('Uncategorized');
  });

  it('skipped items are not saved to staple library', () => {
    // Given Carlos is viewing the Fridge area during a sweep
    const { library, tripService } = createTestServices();
    renderApp(library, tripService);

    tapAreaSection('Fridge');

    // And Carlos has opened the metadata bottom sheet for "Sriracha"
    openMetadataSheet('Sriracha');

    // When Carlos taps "Skip, add with defaults"
    fireEvent.press(screen.getByText('Skip, add with defaults'));

    // Then "Sriracha" is NOT saved to the staple library
    expect(library.listAll()).not.toContainEqual(
      expect.objectContaining({ name: 'Sriracha' })
    );
  });
});

// =============================================================================
// US-AIF-04: Section Auto-Suggest
// =============================================================================

describe('US-AIF-04: Section Auto-Suggest', () => {
  // AC: Section field shows auto-suggestions from previously used section names
  // AC: Suggestions filter as Carlos types (prefix match)
  // AC: Tapping a suggestion fills the section field
  // AC: New section names are accepted (free-text)
  // Trace: US-AIF-04, AC-1 through AC-5

  it('previously used section appears as suggestion on prefix match', () => {
    // Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
    const { library, tripService } = createTestServices([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Apples', houseArea: 'Fridge', storeLocation: { section: 'Produce', aisleNumber: null } },
      { name: 'Turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } },
    ]);
    renderApp(library, tripService);

    // Carlos taps the Fridge area to set it as active
    tapAreaSection('Fridge');

    // When Carlos opens the metadata bottom sheet for "Oat milk"
    openMetadataSheet('Oat milk');

    // And types "Da" in the section field
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Da');

    // Then "Dairy" appears as a section suggestion
    expect(screen.getByText('Dairy')).toBeTruthy();

    // And "Produce" and "Deli" do not appear as suggestions
    expect(screen.queryByText('Produce')).toBeNull();
    expect(screen.queryByText('Deli')).toBeNull();
  });

  it('non-matching sections are filtered out', () => {
    // Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
    const { library, tripService } = createTestServices([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Apples', houseArea: 'Fridge', storeLocation: { section: 'Produce', aisleNumber: null } },
      { name: 'Turkey', houseArea: 'Fridge', storeLocation: { section: 'Deli', aisleNumber: null } },
    ]);
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    openMetadataSheet('Oat milk');

    // When Carlos types "Pr" in the section field
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Pr');

    // Then "Produce" appears as a suggestion
    expect(screen.getByText('Produce')).toBeTruthy();

    // And "Dairy" and "Deli" do not appear
    expect(screen.queryByText('Dairy')).toBeNull();
    expect(screen.queryByText('Deli')).toBeNull();
  });

  it('tapping a section suggestion fills the field', () => {
    // Given Carlos has staples in section "Dairy"
    const { library, tripService } = createTestServices([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    openMetadataSheet('Oat milk');

    // When Carlos types "Da" and taps "Dairy"
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'Da');
    fireEvent.press(screen.getByText('Dairy'));

    // Then the section field is filled with "Dairy"
    expect(screen.getByPlaceholderText('Store section...')).toHaveProp('value', 'Dairy');

    // And the suggestion list dismisses (no more suggestion text visible)
    // "Dairy" as a standalone suggestion should not be visible; only the input value
  });

  it('new section name is accepted without restriction', () => {
    // Given Carlos has no staples in section "International Foods"
    const { library, tripService } = createTestServices([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    openMetadataSheet('Kimchi');

    // When Carlos types "International Foods" in the section field and taps "Add Item"
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'International Foods');
    fireEvent.press(screen.getByText('Add Item'));

    // Then the item is created with section "International Foods"
    const tripItems = tripService.getItems();
    const kimchi = tripItems.find(i => i.name === 'Kimchi');
    expect(kimchi).toBeDefined();
    expect(kimchi?.storeLocation.section).toBe('International Foods');
  });

  it('section suggestions are case-insensitive', () => {
    // Given Carlos has staples in section "Dairy"
    const { library, tripService } = createTestServices([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    renderApp(library, tripService);

    tapAreaSection('Fridge');
    openMetadataSheet('Oat milk');

    // When Carlos types "dai" (lowercase) in the section field
    fireEvent.changeText(screen.getByPlaceholderText('Store section...'), 'dai');

    // Then "Dairy" appears as a suggestion
    expect(screen.getByText('Dairy')).toBeTruthy();
  });
});

// =============================================================================
// US-AIF-05: Duplicate Staple Detection
// =============================================================================

describe('US-AIF-05: Duplicate Staple Detection', () => {
  // AC: Duplicate check triggers when name + area match an existing staple
  // AC: Duplicate warning shows existing staple metadata
  // AC: "Add to trip instead" adds the existing staple to the trip
  // AC: "Cancel" returns to the metadata form
  // AC: Same name in different area is not treated as duplicate
  // Trace: US-AIF-05, AC-1 through AC-5

  it.skip('duplicate detected when same name and area exist', () => {
    // Given "Whole milk" exists as a staple in the Fridge area
    // const { library } = createTestServices();
    // const existing = library.search('Whole milk').find(s => s.houseArea === 'Fridge');
    // expect(existing).toBeDefined();

    // And Carlos has opened the metadata bottom sheet for "Whole milk" with area Fridge

    // When Carlos taps "Add Item"

    // Then the bottom sheet shows "Whole milk already exists in Fridge"
    // And displays the existing metadata "Dairy / Aisle 3"
    // (UI: expect(screen.getByText(/already exists in Fridge/)).toBeTruthy())
    // (UI: expect(screen.getByText(/Dairy/)).toBeTruthy())
  });

  it.skip('same name in different area is not a duplicate', () => {
    // Given "Trash bags" exists as a staple in Kitchen Cabinets
    // const { library } = createTestServices([
    //   { name: 'Trash bags', houseArea: 'Kitchen Cabinets', storeLocation: { section: 'Cleaning', aisleNumber: 9 } },
    // ]);

    // And Carlos has opened the metadata bottom sheet for "Trash bags" with area Bathroom

    // When Carlos taps "Add Item"

    // Then "Trash bags" is saved as a new staple in Bathroom
    // const trashBags = library.listAll().filter(s => s.name === 'Trash bags');
    // expect(trashBags).toHaveLength(2);

    // And no duplicate warning is shown
  });

  it.skip('"Add to trip instead" uses existing staple metadata', () => {
    // Given the duplicate warning is showing for "Whole milk" in Fridge
    // const { library, tripService } = createTestServices();

    // When Carlos taps "Add to trip instead"
    // (UI: fireEvent.press(screen.getByText('Add to trip instead')))

    // Then "Whole milk" is added to the trip with area Fridge, section Dairy, aisle 3
    // const milk = tripService.getItems().find(i => i.name === 'Whole milk');
    // expect(milk?.houseArea).toBe('Fridge');
    // expect(milk?.storeLocation.section).toBe('Dairy');
    // expect(milk?.storeLocation.aisleNumber).toBe(3);

    // And the bottom sheet dismisses
  });

  it.skip('cancel from duplicate warning returns to form', () => {
    // Given the duplicate warning is showing for "Whole milk" in Fridge

    // When Carlos taps "Cancel"
    // (UI: fireEvent.press(screen.getByText('Cancel')))

    // Then the bottom sheet returns to the metadata form
    // (UI: expect(screen.getByText('Add Item')).toBeTruthy())

    // And Carlos can change the area or name
  });
});

// =============================================================================
// Error and Edge Cases
// =============================================================================

describe('Error and Edge Cases', () => {
  // These validate error paths and boundary conditions

  it.skip('submit blocked when area is not selected', () => {
    // Given Carlos has opened the metadata bottom sheet for "Oat milk"
    // And Carlos has not selected an area

    // When Carlos taps "Add Item"

    // Then the item is not added
    // And Carlos sees a message that area is required
    // (UI: expect(screen.getByText(/area is required/i)).toBeTruthy())
  });

  it.skip('submit blocked when section is empty', () => {
    // Given Carlos has opened the metadata bottom sheet for "Oat milk"
    // And Carlos selects area "Fridge" but leaves section empty

    // When Carlos taps "Add Item"

    // Then the item is not added
    // And Carlos sees a message that section is required
  });

  it.skip('aisle number is optional and item saves without it', () => {
    // Given Carlos has opened the metadata bottom sheet for "Rotisserie chicken"
    // And Carlos selects type "Staple", area "Fridge", section "Deli"
    // And Carlos leaves the aisle field blank

    // When Carlos taps "Add Item"

    // Then "Rotisserie chicken" is saved with no aisle number
    // const chicken = library.listAll().find(s => s.name === 'Rotisserie chicken');
    // expect(chicken?.storeLocation.aisleNumber).toBeNull();
  });

  it.skip('dismissing the bottom sheet adds nothing', () => {
    // Given Carlos has opened the metadata bottom sheet for "Oat milk"
    // const { library, tripService } = createTestServices();
    // const initialStapleCount = library.listAll().length;
    // const initialTripCount = tripService.getItems().length;

    // When Carlos dismisses the bottom sheet without submitting

    // Then no item is added to the trip
    // expect(tripService.getItems()).toHaveLength(initialTripCount);

    // And no staple is added to the library
    // expect(library.listAll()).toHaveLength(initialStapleCount);
  });

  it.skip('QuickAdd input clears after successful submission', () => {
    // Given Carlos has submitted an item through the metadata bottom sheet

    // Then the QuickAdd input is cleared
    // (UI: expect(screen.getByPlaceholderText('Add an item...')).toHaveProp('value', ''))
  });
});
