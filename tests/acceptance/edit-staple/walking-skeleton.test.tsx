/**
 * Walking Skeleton Acceptance Tests - Edit Staple
 *
 * These tests form the outer loop of Outside-In TDD for the edit-staple feature.
 * They exercise the staple library driving port and verify observable user outcomes
 * in business language.
 *
 * Strategy: First test enabled, rest use it.skip.
 * Implement until it passes, then enable the next.
 *
 * Driving Ports:
 * - Domain: createStapleLibrary (library.updateStaple)
 *
 * Story Trace:
 * - WS-ES-1: US-ES-01 (Edit staple house area)
 * - WS-ES-2: US-ES-02 (Edit staple store location)
 * - WS-ES-3: US-ES-01 duplicate detection on edit
 * - WS-ES-4: US-ES-02 self-update allowed
 */

// --- Driving port imports (to be extended during DELIVER wave) ---
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';

// =============================================================================
// WS-ES-1: Edit Staple House Area (US-ES-01)
// =============================================================================

describe('WS-ES-1: Edit Staple House Area', () => {
  // AC: Tapping a staple opens edit mode with current values
  // AC: Changing house area moves the staple to the new area
  // AC: Saved changes persist in the staple library
  // Trace: US-ES-01

  it('moves a staple to a different house area', () => {
    // Given "Whole milk" is a staple in "Fridge"
    const stapleStorage = createNullStapleStorage([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];

    // When Carlos changes "Whole milk" house area to "Freezer"
    const result = library.updateStaple(staple.id, { houseArea: 'Freezer' });

    // Then "Whole milk" is now in "Freezer"
    expect(result.success).toBe(true);
    const updated = library.listAll().find(s => s.name === 'Whole milk');
    expect(updated?.houseArea).toBe('Freezer');

    // And "Whole milk" no longer appears in "Fridge"
    const fridgeItems = library.listByArea('Fridge');
    expect(fridgeItems).toHaveLength(0);
  });
});

// =============================================================================
// WS-ES-2: Edit Staple Store Location (US-ES-02)
// =============================================================================

describe('WS-ES-2: Edit Staple Store Location', () => {
  // AC: Store section and aisle can be changed independently
  // AC: Updated store location persists in the library
  // Trace: US-ES-02

  it('changes store section and aisle on a staple', () => {
    // Given "Canned beans" is in "Canned Goods" section, aisle 5
    const stapleStorage = createNullStapleStorage([
      { name: 'Canned beans', houseArea: 'Garage Pantry', storeLocation: { section: 'Canned Goods', aisleNumber: 5 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];

    // When Carlos moves "Canned beans" to "International" section, aisle 9
    const result = library.updateStaple(staple.id, {
      storeLocation: { section: 'International', aisleNumber: 9 },
    });

    // Then "Canned beans" now shows "International" section, aisle 9
    expect(result.success).toBe(true);
    const updated = library.listAll().find(s => s.name === 'Canned beans');
    expect(updated?.storeLocation.section).toBe('International');
    expect(updated?.storeLocation.aisleNumber).toBe(9);
  });
});

// =============================================================================
// WS-ES-3: Duplicate Detection on Edit (US-ES-01)
// =============================================================================

describe('WS-ES-3: Duplicate Detection on Edit', () => {
  // AC: Moving a staple to an area where same name already exists is blocked
  // AC: Error message tells the user which area has the conflict
  // Trace: US-ES-01, duplicate rule

  it('blocks move when same name already exists in target area', () => {
    // Given "Whole milk" exists in both "Fridge" and "Freezer"
    const stapleStorage = createNullStapleStorage([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Whole milk', houseArea: 'Freezer', storeLocation: { section: 'Frozen', aisleNumber: 10 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const fridgeMilk = library.listByArea('Fridge')[0];

    // When Carlos tries to move the Fridge "Whole milk" to "Freezer"
    const result = library.updateStaple(fridgeMilk.id, { houseArea: 'Freezer' });

    // Then the edit is rejected because "Whole milk" already exists in "Freezer"
    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({ error: expect.stringContaining('already exists in Freezer') })
    );

    // And the original staple remains unchanged in "Fridge"
    const fridgeItems = library.listByArea('Fridge');
    expect(fridgeItems).toHaveLength(1);
    expect(fridgeItems[0].name).toBe('Whole milk');
  });
});

// =============================================================================
// WS-ES-4: Self-Update Allowed (US-ES-02)
// =============================================================================

describe('WS-ES-4: Self-Update Allowed', () => {
  // AC: Changing section/aisle on a staple without changing name+area is permitted
  // AC: Self-exclusion in duplicate check: the staple being edited is not its own duplicate
  // Trace: US-ES-02, self-exclusion rule

  it('allows updating store location on same staple without duplicate error', () => {
    // Given "Whole milk" is in "Fridge", "Dairy" section, aisle 3
    const stapleStorage = createNullStapleStorage([
      { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const staple = library.listAll()[0];

    // When Carlos updates aisle from 3 to 4 (same name, same area)
    const result = library.updateStaple(staple.id, {
      storeLocation: { section: 'Dairy', aisleNumber: 4 },
    });

    // Then the update succeeds without duplicate error
    expect(result.success).toBe(true);
    const updated = library.listAll().find(s => s.name === 'Whole milk');
    expect(updated?.storeLocation.aisleNumber).toBe(4);
  });
});
