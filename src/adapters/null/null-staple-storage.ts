// Null adapter for StapleStorage - in-memory implementation for testing

import { AddStapleRequest, StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

type NullStapleInput = AddStapleRequest;

export const createNullStapleStorage = (
  initialItems: NullStapleInput[] = []
): StapleStorage => {
  const items: StapleItem[] = initialItems.map((input, index) => ({
    id: `staple-init-${index}`,
    name: input.name,
    houseArea: input.houseArea,
    storeLocation: input.storeLocation,
    type: 'staple' as const,
    createdAt: new Date().toISOString(),
  }));

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
