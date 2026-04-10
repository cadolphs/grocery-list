import { createNullStapleStorage } from '../null/null-staple-storage';
import { createNullAreaStorage } from '../null/null-area-storage';
import { createNullSectionOrderStorage } from '../null/null-section-order-storage';
import { createNullTripStorage } from '../null/null-trip-storage';
import { migrationNeeded, migrateToFirestore, migrateTripIfNeeded } from './migration';
import { StapleItem, Trip, TripItem } from '../../domain/types';

const makeStaple = (overrides: Partial<StapleItem> = {}): StapleItem => ({
  id: 'staple-1',
  name: 'Milk',
  houseArea: 'Fridge',
  storeLocation: { section: 'Dairy', aisleNumber: 3 },
  type: 'staple',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('migration service', () => {
  describe('migrateToFirestore', () => {
    it('transfers all data from source to destination adapters', () => {
      const staple1 = makeStaple({ id: 'staple-1', name: 'Milk' });
      const staple2 = makeStaple({ id: 'staple-2', name: 'Eggs', houseArea: 'Kitchen Cabinets' });

      const source = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage(['Fridge', 'Kitchen Cabinets', 'Bathroom']),
        sectionOrder: createNullSectionOrderStorage(['Dairy', 'Bakery', 'Produce']),
      };
      // Pre-populate source staples via save
      source.staples.save(staple1);
      source.staples.save(staple2);

      const destination = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage([]),
        sectionOrder: createNullSectionOrderStorage(null),
      };

      migrateToFirestore(source, destination);

      // All staples copied
      const destStaples = destination.staples.loadAll();
      expect(destStaples).toHaveLength(2);
      expect(destStaples).toEqual(expect.arrayContaining([staple1, staple2]));

      // All areas copied
      expect(destination.areas.loadAll()).toEqual(['Fridge', 'Kitchen Cabinets', 'Bathroom']);

      // Section order copied
      expect(destination.sectionOrder.loadOrder()).toEqual(['Dairy', 'Bakery', 'Produce']);
    });
  });

  describe('migrationNeeded', () => {
    it('returns true when Firestore staple storage is empty', () => {
      const firestoreStaples = createNullStapleStorage();
      expect(migrationNeeded(firestoreStaples)).toBe(true);
    });

    it('returns false when Firestore already has data', () => {
      const firestoreStaples = createNullStapleStorage();
      firestoreStaples.save(makeStaple());
      expect(migrationNeeded(firestoreStaples)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('completes without error when source is empty', () => {
      const source = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage([]),
        sectionOrder: createNullSectionOrderStorage(null),
      };
      const destination = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage([]),
        sectionOrder: createNullSectionOrderStorage(null),
      };

      migrateToFirestore(source, destination);

      expect(destination.staples.loadAll()).toEqual([]);
      expect(destination.areas.loadAll()).toEqual([]);
      expect(destination.sectionOrder.loadOrder()).toBeNull();
    });

    it('copies section order only when source has one', () => {
      const source = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage(['Kitchen']),
        sectionOrder: createNullSectionOrderStorage(null),
      };
      const destination = {
        staples: createNullStapleStorage(),
        areas: createNullAreaStorage([]),
        sectionOrder: createNullSectionOrderStorage(null),
      };

      migrateToFirestore(source, destination);

      expect(destination.areas.loadAll()).toEqual(['Kitchen']);
      expect(destination.sectionOrder.loadOrder()).toBeNull();
    });
  });

  describe('migrateTripIfNeeded', () => {
    const makeTripItem = (name: string): TripItem => ({
      id: `item-${name}`,
      name,
      houseArea: 'Fridge',
      storeLocation: { section: 'General', aisleNumber: 1 },
      itemType: 'staple',
      stapleId: null,
      source: 'preloaded',
      needed: true,
      checked: false,
      checkedAt: null,
    });

    const makeTrip = (items: TripItem[]): Trip => ({
      id: 'trip-1',
      items,
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
    });

    it('copies local trip to cloud when cloud is empty', () => {
      const localStorage = createNullTripStorage();
      const cloudStorage = createNullTripStorage();

      const trip = makeTrip([makeTripItem('Milk'), makeTripItem('Eggs')]);
      localStorage.saveTrip(trip);

      migrateTripIfNeeded(localStorage, cloudStorage);

      const cloudTrip = cloudStorage.loadTrip();
      expect(cloudTrip).not.toBeNull();
      expect(cloudTrip!.items).toHaveLength(2);
    });

    it('does not overwrite cloud trip when cloud already has data', () => {
      const localStorage = createNullTripStorage();
      const cloudStorage = createNullTripStorage();

      localStorage.saveTrip(makeTrip([makeTripItem('Local Item')]));
      cloudStorage.saveTrip(makeTrip([makeTripItem('Cloud Item 1'), makeTripItem('Cloud Item 2')]));

      migrateTripIfNeeded(localStorage, cloudStorage);

      const cloudTrip = cloudStorage.loadTrip();
      expect(cloudTrip!.items).toHaveLength(2);
      expect(cloudTrip!.items[0].name).toBe('Cloud Item 1');
    });

    it('is a no-op when neither has trip data', () => {
      const localStorage = createNullTripStorage();
      const cloudStorage = createNullTripStorage();

      migrateTripIfNeeded(localStorage, cloudStorage);

      expect(cloudStorage.loadTrip()).toBeNull();
    });

    it('copies carryover from local to cloud when cloud has no trip', () => {
      const localStorage = createNullTripStorage();
      const cloudStorage = createNullTripStorage();

      const carryover = [makeTripItem('Olive Oil'), makeTripItem('Sponges')];
      localStorage.saveCarryover(carryover);

      migrateTripIfNeeded(localStorage, cloudStorage);

      const migratedCarryover = cloudStorage.loadCarryover();
      expect(migratedCarryover).toHaveLength(2);
    });

    it('does not copy carryover when cloud already has a trip', () => {
      const localStorage = createNullTripStorage();
      const cloudStorage = createNullTripStorage();

      localStorage.saveCarryover([makeTripItem('Local Carryover')]);
      cloudStorage.saveTrip(makeTrip([makeTripItem('Cloud Item')]));

      migrateTripIfNeeded(localStorage, cloudStorage);

      expect(cloudStorage.loadCarryover()).toHaveLength(0);
    });
  });
});
