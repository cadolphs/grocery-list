import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  CheckedItemsStorage,
  createCheckedItemsStorage,
} from '../storage/CheckedItemsStorage';

const GROCERY_ITEMS = ['Milk', 'Eggs', 'Bread'];
const defaultStorage = createCheckedItemsStorage();

interface GroceryListProps {
  storage?: CheckedItemsStorage;
}

export function GroceryList({
  storage = defaultStorage,
}: GroceryListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    storage.load().then((items) => {
      setCheckedItems(new Set(items));
    });
  }, [storage]);

  const toggleItem = (item: string) => {
    const next = new Set(checkedItems);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setCheckedItems(next);
    storage.save([...next]);
  };

  return (
    <View style={styles.container}>
      {GROCERY_ITEMS.map((item) => {
        const isChecked = checkedItems.has(item);
        return (
          <Pressable
            key={item}
            style={styles.item}
            onPress={() => toggleItem(item)}
          >
            <Text style={styles.checkbox}>{isChecked ? '☑' : '☐'}</Text>
            <Text style={[styles.itemText, isChecked && styles.checkedText]}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkbox: {
    fontSize: 24,
    marginRight: 12,
  },
  itemText: {
    fontSize: 18,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});
