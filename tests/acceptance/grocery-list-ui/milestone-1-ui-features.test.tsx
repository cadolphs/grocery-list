/**
 * Milestone 1: UI for Enhanced Item Management and Navigation
 *
 * All tests in this file are SKIPPED. They should be enabled one at a time
 * after the walking skeleton is complete.
 *
 * Driving Ports:
 * - UI: React components rendered with ServiceProvider
 * - User actions: fireEvent (tap, changeText)
 * - Assertions: screen queries (getByText, queryByText, getByTestId)
 *
 * Story Trace:
 * - US-07: Skip button on home screen
 * - US-08: Area completion and sweep progress
 * - US-09: Type-ahead suggestions in quick-add
 * - US-10: Store section navigation and progress
 * - US-11: Trip summary screen
 */

// --- Driving port imports ---
// Domain ports (already implemented):
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip, completeTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

// UI ports:
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { AppShell } from '../../../src/ui/AppShell';

// =============================================================================
// Shared test setup
// =============================================================================

function createTestServices() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Butter', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    { name: 'Toilet paper', houseArea: 'Bathroom', storeLocation: { section: 'Paper Goods', aisleNumber: 8 } },
    { name: 'Shampoo', houseArea: 'Bathroom', storeLocation: { section: 'Personal Care', aisleNumber: 7 } },
    { name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
  ]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(library.listAll());
  return { library, tripService, stapleStorage, tripStorage };
}

// =============================================================================
// US-07: Skip button on home screen
// =============================================================================

describe('US-07: Skip staple from home screen', () => {
  // AC: Tapping skip removes item from visible area
  // AC: Skipped item does not appear in store view
  // AC: Skipped item can be re-added

  it('removes skipped item from the home view area', () => {
    // Given Carlos is viewing the home screen with Bathroom items
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    expect(screen.getByText('Shampoo')).toBeTruthy();

    // When Carlos taps "skip" on "Shampoo"
    fireEvent.press(screen.getByTestId('skip-Shampoo'));

    // Then "Shampoo" is no longer visible in the "Bathroom" area
    expect(screen.queryByText('Shampoo')).toBeNull();

    // And the "Bathroom" area shows 1 item remaining
    expect(screen.getByText('Bathroom (1)')).toBeTruthy();
  });

  it('skipped item does not appear in store view', () => {
    // Given Carlos has skipped "Shampoo" on the home screen
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    fireEvent.press(screen.getByTestId('skip-Shampoo'));

    // When Carlos switches to the store view
    fireEvent.press(screen.getByText('Store'));

    // Then "Shampoo" is not visible in any store section
    expect(screen.queryByText('Shampoo')).toBeNull();
  });

  it('re-adds a skipped staple on the home screen', () => {
    // Given Carlos has skipped "Butter" in the "Fridge" area
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );
    fireEvent.press(screen.getByTestId('skip-Butter'));
    expect(screen.queryByText('Butter')).toBeNull();

    // When Carlos taps "re-add" on "Butter"
    fireEvent.press(screen.getByTestId('readd-Butter'));

    // Then "Butter" reappears in the "Fridge" area
    expect(screen.getByText('Butter')).toBeTruthy();
  });
});

// =============================================================================
// US-08: Area completion and sweep progress
// =============================================================================

describe('US-08: Area completion and sweep progress in UI', () => {
  // AC: Marking an area complete shows a badge
  // AC: Progress bar reflects completed area count
  // AC: All areas complete shows whiteboard prompt

  it('shows completion badge and progress bar after marking area done', () => {
    // Given Carlos is sweeping the "Bathroom" area
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // When Carlos marks "Bathroom" as done
    fireEvent.press(screen.getByTestId('complete-Bathroom'));

    // Then "Bathroom" shows a completion badge
    expect(screen.getByTestId('badge-Bathroom')).toBeTruthy();

    // And the sweep progress bar shows "1 of 5 areas complete"
    expect(screen.getByText('1 of 5 areas complete')).toBeTruthy();
  });

  it('navigates to a different area out of order', () => {
    // Given the suggested next area is "Garage Pantry"
    const { library, tripService } = createTestServices();
    render(
      <ServiceProvider stapleLibrary={library} tripService={tripService}>
        <AppShell />
      </ServiceProvider>
    );

    // When Carlos taps "Freezer" instead
    fireEvent.press(screen.getByText('Freezer (0)'));

    // Then the "Freezer" area opens for review
    expect(screen.getByTestId('active-area-Freezer')).toBeTruthy();

    // And sweep progress is unchanged
    expect(screen.getByText('0 of 5 areas complete')).toBeTruthy();
  });

  it.skip('shows whiteboard prompt when all areas complete', () => {
    // Given Carlos has marked all 5 areas as done
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer']
    //   .forEach(area => fireEvent.press(screen.getByTestId(`complete-${area}`)));

    // When Carlos views the sweep screen
    // (already viewing it)

    // Then "Add from whiteboard" is prominently displayed
    // expect(screen.getByText('Add from whiteboard')).toBeTruthy();
  });
});

// =============================================================================
// US-09: Type-ahead suggestions in quick-add
// =============================================================================

describe('US-09: Type-ahead suggestions in quick-add UI', () => {
  // AC: Typing a prefix shows matching suggestions from staple library
  // AC: Tapping a suggestion adds it with all metadata
  // AC: No suggestions for unknown items

  it.skip('shows matching suggestions when typing a prefix', () => {
    // Given the quick-add field is active
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );

    // When Carlos types "who" in the quick-add field
    // const quickAddInput = screen.getByPlaceholderText('Add an item...');
    // fireEvent.changeText(quickAddInput, 'who');

    // Then "Whole milk" appears as a suggestion below the field
    // await waitFor(() => {
    //   expect(screen.getByText('Whole milk - Dairy / Aisle 3')).toBeTruthy();
    // });
  });

  it.skip('tapping a suggestion adds it with metadata', () => {
    // Given "Whole milk" appears as a suggestion
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // const quickAddInput = screen.getByPlaceholderText('Add an item...');
    // fireEvent.changeText(quickAddInput, 'who');

    // When Carlos taps the "Whole milk" suggestion
    // await waitFor(() => {
    //   fireEvent.press(screen.getByText('Whole milk - Dairy / Aisle 3'));
    // });

    // Then "Whole milk" is added to the trip with section "Dairy" and aisle 3
    // expect(screen.getByText('Whole milk')).toBeTruthy();
  });

  it.skip('shows no suggestions for unknown items', () => {
    // Given the staple library does not contain "Birthday candles"
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );

    // When Carlos types "birthday" in the quick-add field
    // const quickAddInput = screen.getByPlaceholderText('Add an item...');
    // fireEvent.changeText(quickAddInput, 'birthday');

    // Then no suggestions appear below the field
    // await waitFor(() => {
    //   expect(screen.queryByTestId('suggestion-list')).toBeNull();
    // });
  });

  it.skip('clears suggestions when quick-add field is cleared', () => {
    // Given suggestions are visible for "who"
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // const quickAddInput = screen.getByPlaceholderText('Add an item...');
    // fireEvent.changeText(quickAddInput, 'who');

    // When Carlos clears the quick-add field
    // fireEvent.changeText(quickAddInput, '');

    // Then no suggestions are visible
    // await waitFor(() => {
    //   expect(screen.queryByTestId('suggestion-list')).toBeNull();
    // });
  });
});

// =============================================================================
// US-10: Store section navigation and progress
// =============================================================================

describe('US-10: Store section navigation and progress in UI', () => {
  // AC: Each section shows checked count progress
  // AC: Completed sections show a checkmark badge
  // AC: All sections complete reveals Finish Trip button

  it.skip('shows checked count per store section', () => {
    // Given Carlos is viewing the store view
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // fireEvent.press(screen.getByText('Store'));

    // And Carlos has checked off "Whole milk" in "Aisle 3: Dairy"
    // fireEvent.press(screen.getByText('Whole milk'));

    // Then "Aisle 3: Dairy" shows "1 of 3" progress
    // expect(screen.getByText('1 of 3')).toBeTruthy();
  });

  it.skip('shows completion checkmark on fully checked section', () => {
    // Given Carlos has checked all items in "Aisle 5: Canned Goods"
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // fireEvent.press(screen.getByText('Store'));
    // fireEvent.press(screen.getByText('Canned beans'));

    // When Carlos views the store section list
    // (already viewing)

    // Then "Aisle 5: Canned Goods" shows a completion checkmark
    // expect(screen.getByTestId('section-complete-Canned Goods')).toBeTruthy();
  });

  it.skip('reveals finish trip button when all sections are complete', () => {
    // Given Carlos has checked all items in all store sections
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // fireEvent.press(screen.getByText('Store'));
    // // Check all items
    // ['Whole milk', 'Butter', 'Eggs', 'Toilet paper', 'Shampoo', 'Canned beans']
    //   .forEach(name => fireEvent.press(screen.getByText(name)));

    // When Carlos views the store view
    // (already viewing)

    // Then "Finish Trip" button is visible
    // expect(screen.getByText('Finish Trip')).toBeTruthy();
  });
});

// =============================================================================
// US-11: Trip summary screen
// =============================================================================

describe('US-11: Trip summary screen in UI', () => {
  // AC: Summary shows total purchased and breakdown
  // AC: Prep time is displayed
  // AC: Store view transition is available

  it.skip('displays total purchased and item breakdown', () => {
    // Given Carlos has completed the trip with 5 items purchased and 1 skipped
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // fireEvent.press(screen.getByText('Store'));
    // ['Whole milk', 'Butter', 'Eggs', 'Toilet paper', 'Canned beans']
    //   .forEach(name => fireEvent.press(screen.getByText(name)));
    // tripService.skipItem('Shampoo');

    // When the trip summary screen appears
    // fireEvent.press(screen.getByText('Finish Trip'));

    // Then Carlos sees "5 items purchased"
    // expect(screen.getByText('5 items purchased')).toBeTruthy();

    // And breakdown shows staple and one-off counts
    // expect(screen.getByText(/5 staples/)).toBeTruthy();
  });

  it.skip('shows preparation time on summary', () => {
    // Given Carlos started the sweep 3 minutes ago
    // const { library, tripService } = createTestServices();
    // tripService.setStartTime(new Date(Date.now() - 3 * 60 * 1000));
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // // Complete all items and finish trip
    // fireEvent.press(screen.getByText('Store'));
    // tripService.getItems().forEach(i => tripService.checkOff(i.name));
    // fireEvent.press(screen.getByText('Finish Trip'));

    // When the trip summary screen appears
    // (already rendered)

    // Then Carlos sees approximately "3 minutes" prep time
    // expect(screen.getByText(/3 min/)).toBeTruthy();
  });

  it.skip('switches to store view from trip summary', () => {
    // Given the trip summary is displayed
    // const { library, tripService } = createTestServices();
    // render(
    //   <ServiceProvider stapleLibrary={library} tripService={tripService}>
    //     <AppShell />
    //   </ServiceProvider>
    // );
    // fireEvent.press(screen.getByText('Store'));
    // tripService.getItems().forEach(i => tripService.checkOff(i.name));
    // fireEvent.press(screen.getByText('Finish Trip'));

    // When Carlos taps "Switch to Store View"
    // fireEvent.press(screen.getByText('Switch to Store View'));

    // Then the store view opens with all trip items grouped by aisle
    // expect(screen.getByText('Aisle 3: Dairy')).toBeTruthy();
  });
});
