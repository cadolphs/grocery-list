import { createNullStapleStorage } from '../null/null-staple-storage';
import { createNullAreaStorage } from '../null/null-area-storage';
import { createNullSectionOrderStorage } from '../null/null-section-order-storage';
import { migrationNeeded, migrateToFirestore } from './migration';
import { StapleItem } from '../../domain/types';

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
});
