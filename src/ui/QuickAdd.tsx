// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted
// Optionally accepts onSearch for type-ahead suggestions from staple library

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, FlatList, StyleSheet } from 'react-native';
import { AddTripItemRequest, AddTripItemResult, StapleItem } from '../domain/types';
import { useIsWeb } from '../hooks/useIsWeb';

const formatLocation = (section: string, aisleNumber: number | null): string =>
  aisleNumber === null ? section : `${section} / Aisle ${aisleNumber}`;

const typeLabel = (type: StapleItem['type']): string =>
  type === 'one-off' ? ' (one-off)' : '';

export const formatSuggestion = (staple: StapleItem): string => {
  const location = formatLocation(staple.storeLocation.section, staple.storeLocation.aisleNumber);
  return `${staple.name} - ${location}${typeLabel(staple.type)}`;
};

type QuickAddProps = {
  readonly onAddItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly onSearch?: (query: string) => StapleItem[];
  readonly onSelectSuggestion?: (staple: StapleItem) => void;
  readonly onOpenMetadataSheet?: (itemName: string) => void;
};

export const QuickAdd = ({ onAddItem, onSearch, onSelectSuggestion, onOpenMetadataSheet }: QuickAddProps): React.JSX.Element => {
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<StapleItem[]>([]);
  const trimmedInput = inputText.trim();
  const isWeb = useIsWeb();

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

    if (onOpenMetadataSheet) {
      onOpenMetadataSheet(trimmed);
    }

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
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
          autoFocus={isWeb}
        />
        <Pressable style={styles.addButton} onPress={handleAdd} disabled={!onOpenMetadataSheet}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      {(suggestions.length > 0 || trimmedInput.length > 0) && (
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
          {trimmedInput.length > 0 && (
            <Pressable
              style={[
                styles.suggestionItem,
                suggestions.length > 0 && styles.suggestionSeparator,
              ]}
              onPress={() => onOpenMetadataSheet?.(trimmedInput)}
            >
              <Text style={styles.addNewItemText}>Add &apos;{trimmedInput}&apos; as new item...</Text>
            </Pressable>
          )}
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
  addNewItemText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
});
