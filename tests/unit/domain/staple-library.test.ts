import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';

describe('staple library', () => {
  describe('addStaple', () => {
    it('adds a staple with name, house area, section, and aisle number', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      const result = library.addStaple({
        name: 'Whole milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });

      expect(result.success).toBe(true);
      const allStaples = library.listAll();
      expect(allStaples).toHaveLength(1);
      expect(allStaples[0]).toMatchObject({
        name: 'Whole milk',
        houseArea: 'Fridge',
        type: 'staple',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      expect(allStaples[0].id).toBeDefined();
      expect(allStaples[0].createdAt).toBeDefined();
    });

    it('rejects duplicate staple with same name and house area', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Whole milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });

      const result = library.addStaple({
        name: 'Whole milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists in Fridge');
      }
      expect(library.listAll()).toHaveLength(1);
    });

    it('allows same item name in different house areas', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Hand soap',
        houseArea: 'Bathroom',
        storeLocation: { section: 'Personal Care', aisleNumber: 7 },
      });

      const result = library.addStaple({
        name: 'Hand soap',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'Cleaning', aisleNumber: 9 },
      });

      expect(result.success).toBe(true);
      expect(library.listAll()).toHaveLength(2);
    });
  });

  describe('updateStaple', () => {
    it('rejects rename to empty name with an error result', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Milkk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      const stapleId = library.listAll()[0].id;

      const result = library.updateStaple(stapleId, { name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('name is required');
      }
      // Staple is unchanged
      expect(library.listAll()[0].name).toBe('Milkk');
    });

    it('rejects rename to whitespace-only name with an error result', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Milkk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      const stapleId = library.listAll()[0].id;

      const result = library.updateStaple(stapleId, { name: '   ' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('name is required');
      }
      expect(library.listAll()[0].name).toBe('Milkk');
    });

    it('merges changes.name into the persisted staple', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Milkk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      const stapleId = library.listAll()[0].id;

      const result = library.updateStaple(stapleId, { name: 'Milk' });

      expect(result.success).toBe(true);
      const updated = library.listAll().find((s) => s.id === stapleId);
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Milk');
      expect(updated!.houseArea).toBe('Fridge');
      expect(updated!.storeLocation).toEqual({ section: 'Dairy', aisleNumber: 3 });
    });

    it('rejects rename when post-merge name duplicates another staple in same area', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Milkk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      library.addStaple({
        name: 'Milk',
        houseArea: 'Fridge',
        storeLocation: { section: 'Dairy', aisleNumber: 3 },
      });
      const milkkId = library.listAll().find((s) => s.name === 'Milkk')!.id;

      const result = library.updateStaple(milkkId, { name: 'Milk' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists in Fridge');
      }
      // Milkk staple unchanged after rejection
      const milkk = library.listAll().find((s) => s.id === milkkId);
      expect(milkk!.name).toBe('Milkk');
    });
  });

  describe('addOneOff', () => {
    it('adds a one-off item with type one-off and empty houseArea', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addOneOff({
        name: 'Tahini',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });

      const allItems = library.listAll();
      expect(allItems).toHaveLength(1);
      expect(allItems[0]).toMatchObject({
        name: 'Tahini',
        houseArea: '',
        type: 'one-off',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });
      expect(allItems[0].id).toBeDefined();
      expect(allItems[0].createdAt).toBeDefined();
    });

    it('deduplicates by name and type one-off', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addOneOff({
        name: 'Tahini',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });

      library.addOneOff({
        name: 'Tahini',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });

      const tahiniItems = library.listAll().filter(i => i.name === 'Tahini');
      expect(tahiniItems).toHaveLength(1);
    });

    it('does not interfere with staple adds of same name', () => {
      const storage = createNullStapleStorage();
      const library = createStapleLibrary(storage);

      library.addStaple({
        name: 'Tahini',
        houseArea: 'Kitchen Cabinets',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });

      library.addOneOff({
        name: 'Tahini',
        storeLocation: { section: 'International', aisleNumber: 7 },
      });

      const allItems = library.listAll();
      expect(allItems).toHaveLength(2);
      expect(allItems.filter(i => i.type === 'staple')).toHaveLength(1);
      expect(allItems.filter(i => i.type === 'one-off')).toHaveLength(1);
    });
  });
});
