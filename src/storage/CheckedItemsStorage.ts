import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'checkedItems';

export interface CheckedItemsStorage {
  load(): Promise<string[]>;
  save(items: string[]): Promise<void>;
}

export function createCheckedItemsStorage(): CheckedItemsStorage {
  return {
    async load() {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : [];
    },
    async save(items: string[]) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    },
  };
}

export function createNullCheckedItemsStorage(
  initialItems: string[] = []
): CheckedItemsStorage {
  let storedItems = [...initialItems];
  return {
    async load() {
      return [...storedItems];
    },
    async save(items: string[]) {
      storedItems = [...items];
    },
  };
}
