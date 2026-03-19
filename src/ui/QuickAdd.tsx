// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted
// Optionally accepts onSearch for type-ahead suggestions from staple library

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, FlatList, StyleSheet } from 'react-native';
import { AddTripItemRequest, AddTripItemResult, StapleItem } from '../domain/types';

const formatSuggestion = (staple: StapleItem): string =>
  `${staple.name} - ${staple.storeLocation.section} / Aisle ${staple.storeLocation.aisleNumber}`;

type QuickAddProps = {
  readonly onAddItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly onSearch?: (query: string) => StapleItem[];
  readonly onSelectSuggestion?: (staple: StapleItem) => void;
};

export const QuickAdd = ({ onAddItem, onSearch, onSelectSuggestion }: QuickAddProps): React.JSX.Element => {
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<StapleItem[]>([]);

  const handleChangeText = (text: string): void => {
    setInputText(text);
    if (onSearch) {
      setSuggestions(onSearch(text));
    }
  };

  const handleSelectSuggestion = (staple: StapleItem): void => {
    if (onSelectSuggestion) {
      onSelectSuggestion(staple);
    } else {
      onAddItem({
        name: staple.name,
        houseArea: staple.houseArea,
        storeLocation: staple.storeLocation,
        itemType: 'staple',
        source: 'quick-add',
      });
    }
    setInputText('');
    setSuggestions([]);
  };

  const handleAdd = (): void => {
    const trimmed = inputText.trim();
    if (trimmed === '') return;

    onAddItem({
      name: trimmed,
      houseArea: 'Kitchen Cabinets',
      storeLocation: { section: 'Unknown', aisleNumber: null },
      itemType: 'one-off',
      source: 'quick-add',
    });

    setInputText('');
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an item..."
          value={inputText}
          onChangeText={handleChangeText}
        />
        <Pressable style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionList} testID="suggestion-list">
          {suggestions.map((staple, index) => (
            <Pressable
              key={staple.id}
              style={[
                styles.suggestionItem,
                index > 0 && styles.suggestionSeparator,
              ]}
              onPress={() => handleSelectSuggestion(staple)}
            >
              <Text style={styles.suggestionText}>{formatSuggestion(staple)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  suggestionList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
  },
  suggestionSeparator: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333333',
  },
});
