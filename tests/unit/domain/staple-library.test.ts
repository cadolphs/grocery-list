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
});
