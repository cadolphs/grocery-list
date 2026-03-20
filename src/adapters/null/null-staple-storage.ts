// Null adapter for StapleStorage - in-memory implementation for testing

import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

export const createNullStapleStorage = (
  initialItems: StapleItem[] = []
): StapleStorage => {
  const items: StapleItem[] = [...initialItems];

  return {
    loadAll: () => [...items],
    save: (item: StapleItem) => {
      items.push(item);
    },
    remove: (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    },
    search: (query: string) =>
      items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    updateArea: (oldName: string, newName: string) => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].houseArea === oldName) {
          items[i] = { ...items[i], houseArea: newName };
        }
      }
    },
  };
};
