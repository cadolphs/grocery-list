import { createAreaManagement } from '../../../src/domain/area-management';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullLibraryStorage } from '../../../src/adapters/null/null-library-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { LibraryItem } from '../../../src/domain/types';

const makeStaple = (name: string, houseArea: string): LibraryItem => ({
  id: `${name}-${houseArea}`,
  name,
  houseArea,
  storeLocation: { section: 'General', aisleNumber: null },
  type: 'staple',
  createdAt: new Date().toISOString(),
});

const createManagement = (
  areas: string[] = ['Kitchen', 'Bathroom'],
  staples: LibraryItem[] = [],
) => {
  const areaStorage = createNullAreaStorage(areas);
  const libraryStorage = createNullLibraryStorage(staples);
  const tripStorage = createNullTripStorage();
  const management = createAreaManagement(
    areaStorage,
    libraryStorage,
    tripStorage,
  );
  return { management, areaStorage, libraryStorage, tripStorage };
};

describe('area management', () => {
  describe('add', () => {
    it('rejects empty name', () => {
      const { management } = createManagement();

      const result = management.add('');

      expect(result).toEqual({
        success: false,
        error: 'Area name is required',
      });
    });

    it('rejects whitespace-only name', () => {
      const { management } = createManagement();

      const result = management.add('   ');

      expect(result).toEqual({
        success: false,
        error: 'Area name is required',
      });
    });

    it('rejects duplicate name case-insensitively', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.add('kitchen');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists');
      }
    });

    it('appends new area to the list', () => {
      const { management } = createManagement(['Kitchen']);

      const result = management.add('Garage');

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Kitchen', 'Garage']);
    });
  });

  describe('rename', () => {
    it('rejects empty new name', () => {
      const { management } = createManagement(['Kitchen']);

      const result = management.rename('Kitchen', '');

      expect(result).toEqual({
        success: false,
        error: 'Area name is required',
      });
    });

    it('rejects when old name not found', () => {
      const { management } = createManagement(['Kitchen']);

      const result = management.rename('NonExistent', 'NewName');

      expect(result).toEqual({
        success: false,
        error: '"NonExistent" not found',
      });
    });

    it('rejects whitespace-only new name', () => {
      const { management } = createManagement(['Kitchen']);

      const result = management.rename('Kitchen', '   ');

      expect(result).toEqual({
        success: false,
        error: 'Area name is required',
      });
    });

    it('rejects duplicate new name', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.rename('Kitchen', 'Bathroom');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists');
      }
    });

    it('rejects duplicate new name case-insensitively', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.rename('Kitchen', 'bathroom');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists');
      }
      expect(management.getAreas()).toEqual(['Kitchen', 'Bathroom']);
    });

    it('trims the new name before saving', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.rename('Kitchen', '  Pantry  ');

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Pantry', 'Bathroom']);
    });

    it('renames area and propagates to staples and trip items', () => {
      const staples = [makeStaple('Soap', 'Kitchen')];
      const { management, libraryStorage } = createManagement(
        ['Kitchen', 'Bathroom'],
        staples,
      );

      const result = management.rename('Kitchen', 'Pantry');

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Pantry', 'Bathroom']);
      expect(libraryStorage.loadAll()[0]!.houseArea).toBe('Pantry');
    });
  });

  describe('delete', () => {
    it('rejects deleting the last remaining area', () => {
      const { management } = createManagement(['Kitchen']);

      const result = management.delete('Kitchen');

      expect(result).toEqual({
        success: false,
        error: 'Cannot delete: at least one area must remain',
      });
    });

    it('rejects when area not found', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.delete('NonExistent');

      expect(result).toEqual({
        success: false,
        error: '"NonExistent" not found',
      });
    });

    it('rejects when area has staples but no reassignment target', () => {
      const staples = [makeStaple('Soap', 'Kitchen')];
      const { management } = createManagement(['Kitchen', 'Bathroom'], staples);

      const result = management.delete('Kitchen');

      expect(result).toEqual({
        success: false,
        error: 'Area has staples; reassignment target is required',
      });
    });

    it('detects duplicate conflict on reassignment', () => {
      const staples = [
        makeStaple('Soap', 'Kitchen'),
        makeStaple('Soap', 'Bathroom'),
      ];
      const { management } = createManagement(['Kitchen', 'Bathroom'], staples);

      const result = management.delete('Kitchen', { reassignTo: 'Bathroom' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Duplicate conflict on reassignment');
        expect(result.conflicts).toEqual([
          { name: 'Soap', existsIn: 'Bathroom' },
        ]);
      }
    });

    it('deletes area with reassignment when no conflicts', () => {
      const staples = [makeStaple('Soap', 'Kitchen')];
      const { management, libraryStorage } = createManagement(
        ['Kitchen', 'Bathroom'],
        staples,
      );

      const result = management.delete('Kitchen', { reassignTo: 'Bathroom' });

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Bathroom']);
      expect(libraryStorage.loadAll()[0]!.houseArea).toBe('Bathroom');
    });

    it('deletes empty area without reassignment', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.delete('Kitchen');

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Bathroom']);
    });
  });

  describe('reorder', () => {
    it('rejects when areas do not match', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.reorder(['Kitchen', 'Garage']);

      expect(result).toEqual({
        success: false,
        error: 'Reorder must contain exactly the same areas',
      });
    });

    it('rejects when area count mismatches', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.reorder(['Kitchen']);

      expect(result).toEqual({
        success: false,
        error: 'Reorder must contain exactly the same areas',
      });
    });

    it('saves the new order', () => {
      const { management } = createManagement(['Kitchen', 'Bathroom']);

      const result = management.reorder(['Bathroom', 'Kitchen']);

      expect(result).toEqual({ success: true });
      expect(management.getAreas()).toEqual(['Bathroom', 'Kitchen']);
    });
  });
});
