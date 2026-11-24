// Null adapter for LibraryStorage - in-memory implementation for testing

import { AddStapleRequest, LibraryItem } from '../../domain/types';
import { LibraryStorage } from '../../ports/library-storage';

type NullStapleInput = AddStapleRequest;

export const createNullLibraryStorage = (
  initialItems: NullStapleInput[] = [],
): LibraryStorage & { readonly unsubscribe: () => void } => {
  const items: LibraryItem[] = initialItems.map((input, index) => ({
    id: `staple-init-${index}`,
    name: input.name,
    houseArea: input.houseArea,
    storeLocation: input.storeLocation,
    type: 'staple' as const,
    createdAt: new Date().toISOString(),
  }));

  return {
    loadAll: () => [...items],
    save: (item: LibraryItem) => {
      items.push(item);
    },
    remove: (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    },
    update: (updatedItem: LibraryItem) => {
      const index = items.findIndex((item) => item.id === updatedItem.id);
      if (index !== -1) {
        items[index] = updatedItem;
      }
    },
    search: (query: string) =>
      items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    updateArea: (oldName: string, newName: string) => {
      items.forEach((item, i) => {
        if (item.houseArea === oldName) {
          items[i] = { ...item, houseArea: newName };
        }
      });
    },
    unsubscribe: () => {},
  };
};
