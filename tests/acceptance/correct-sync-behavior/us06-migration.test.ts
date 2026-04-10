/**
 * US-06: Migrate Local AsyncStorage Trip to Firestore
 *
 * Focused acceptance scenarios for one-time trip migration.
 * Tests exercise driving port: migrateTripIfNeeded from migration.ts.
 */

import { createTrip } from '../../../src/domain/trip';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { TripItem } from '../../../src/domain/types';
import { migrateTripIfNeeded } from '../../../src/adapters/firestore/migration';

describe('US-06: Migrate local trip to cloud storage', () => {
  // =============================================================================
  // S-18: Local trip migrates to cloud on first sync-enabled launch
  // =============================================================================

  it('S-18: existing local trip migrates to cloud storage on first sync launch', () => {
    // Given Clemens has a local trip with 15 items and 7 checked off
    const localTripStorage = createNullTripStorage();
    const localTrip = createTrip(localTripStorage);
    const staples = Array.from({ length: 15 }, (_, i) => ({
      name: `Item ${i + 1}`,
      houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: i + 1 },
    }));
    localTrip.start(staples);
    for (let i = 0; i < 7; i++) {
      localTrip.checkOff(`Item ${i + 1}`);
    }

    // And cloud storage has no trip for his account
    const cloudTripStorage = createNullTripStorage();
    expect(cloudTripStorage.loadTrip()).toBeNull();

    // When the app initializes with the sync-enabled version
    migrateTripIfNeeded(localTripStorage, cloudTripStorage);

    // Then all 15 items with their checkoff states are written to cloud storage
    const migratedTrip = cloudTripStorage.loadTrip();
    expect(migratedTrip!.items).toHaveLength(15);
    const checkedCount = migratedTrip!.items.filter(i => i.checked).length;
    expect(checkedCount).toBe(7);
  });

  // =============================================================================
  // S-19: Cloud trip takes precedence over local trip
  // =============================================================================

  it('S-19: cloud trip takes precedence over stale local trip', () => {
    // Given cloud storage has a trip with 12 items
    const cloudTripStorage = createNullTripStorage();
    const cloudTrip = createTrip(cloudTripStorage);
    const cloudStaples = Array.from({ length: 12 }, (_, i) => ({
      name: `Cloud Item ${i + 1}`,
      houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: i + 1 },
    }));
    cloudTrip.start(cloudStaples);
    // Persist cloud trip to storage (start does not auto-persist)
    cloudTrip.checkOff('Cloud Item 1');
    cloudTrip.uncheckItem('Cloud Item 1');

    // And local storage has a stale trip with 10 items
    const localTripStorage = createNullTripStorage();
    const localTrip = createTrip(localTripStorage);
    const localStaples = Array.from({ length: 10 }, (_, i) => ({
      name: `Local Item ${i + 1}`,
      houseArea: 'Fridge' as const,
      storeLocation: { section: 'General', aisleNumber: i + 1 },
    }));
    localTrip.start(localStaples);
    // Persist local trip to storage
    localTrip.checkOff('Local Item 1');
    localTrip.uncheckItem('Local Item 1');

    // When the app initializes (migration should not overwrite cloud)
    migrateTripIfNeeded(localTripStorage, cloudTripStorage);

    // Then the trip loaded has 12 items (from cloud, not local)
    const loadedTrip = createTrip(cloudTripStorage);
    loadedTrip.loadFromStorage();
    expect(loadedTrip.getItems()).toHaveLength(12);
    expect(loadedTrip.getItems()[0].name).toContain('Cloud');
  });

  // =============================================================================
  // S-20: Fresh user with no trip data starts clean
  // =============================================================================

  it('S-20: new user with no trip data anywhere starts a fresh trip', () => {
    // Given cloud storage has no trip for Clemens
    const cloudTripStorage = createNullTripStorage();
    expect(cloudTripStorage.loadTrip()).toBeNull();

    // And local storage has no trip
    const localTripStorage = createNullTripStorage();
    expect(localTripStorage.loadTrip()).toBeNull();

    // When migration runs (no-op: neither has data)
    migrateTripIfNeeded(localTripStorage, cloudTripStorage);

    // And the app initializes from staple library
    const stapleStorage = createNullStapleStorage([
      { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
      { name: 'Eggs', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
    ]);
    const library = createStapleLibrary(stapleStorage);
    const trip = createTrip(cloudTripStorage);
    trip.initializeFromStorage(library.listAll());

    // Then a new trip is created from the staple library
    expect(trip.getItems()).toHaveLength(2);
    expect(trip.getItems().map(i => i.name)).toEqual(
      expect.arrayContaining(['Milk', 'Eggs'])
    );
  });

  // =============================================================================
  // S-21: Carryover data migrates alongside trip
  // =============================================================================

  it('S-21: carryover items migrate from local storage to cloud', () => {
    // Given Clemens has carryover items "Olive Oil" and "Sponges" in local storage
    const localTripStorage = createNullTripStorage();
    const carryoverItems: TripItem[] = [
      {
        id: 'carry-1', name: 'Olive Oil', houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Oils', aisleNumber: 7 }, itemType: 'staple',
        stapleId: 'staple-olive-oil', source: 'carryover', needed: true,
        checked: false, checkedAt: null,
      },
      {
        id: 'carry-2', name: 'Sponges', houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Cleaning', aisleNumber: 9 }, itemType: 'staple',
        stapleId: 'staple-sponges', source: 'carryover', needed: true,
        checked: false, checkedAt: null,
      },
    ];
    localTripStorage.saveCarryover(carryoverItems);

    // And cloud storage has no carryover for his account
    const cloudTripStorage = createNullTripStorage();
    expect(cloudTripStorage.loadCarryover()).toHaveLength(0);

    // When the app initializes with the sync-enabled version
    migrateTripIfNeeded(localTripStorage, cloudTripStorage);

    // Then "Olive Oil" and "Sponges" are written as carryover to cloud storage
    const migratedCarryover = cloudTripStorage.loadCarryover();
    expect(migratedCarryover).toHaveLength(2);
    expect(migratedCarryover.map(i => i.name)).toEqual(
      expect.arrayContaining(['Olive Oil', 'Sponges'])
    );
  });
});
