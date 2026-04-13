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
