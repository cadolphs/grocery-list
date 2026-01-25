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
    <View>
      {GROCERY_ITEMS.map((item) => (
        <Pressable key={item} onPress={() => toggleItem(item)}>
          <Text style={checkedItems.has(item) ? styles.checked : undefined}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  checked: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});
