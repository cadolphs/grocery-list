// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted
// Optionally accepts onSearch for type-ahead suggestions from staple library

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, FlatList, StyleSheet } from 'react-native';
import { AddTripItemRequest, AddTripItemResult, StapleItem } from '../domain/types';
import { useIsWeb } from '../hooks/useIsWeb';
import { theme } from './theme';

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
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 16,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  addButton: {
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    padding: 12,
    marginLeft: 8,
  },
  addButtonText: {
    color: theme.color.inverseText,
    fontWeight: '600',
    fontSize: 16,
  },
  suggestionList: {
    backgroundColor: theme.color.tile,
    borderRadius: theme.radius.lg,
    marginTop: 4,
  },
  suggestionItem: {
    padding: 12,
  },
  suggestionSeparator: {
    borderTopWidth: 0,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.color.text,
  },
  addNewItemText: {
    fontSize: 14,
    color: theme.color.accent,
    fontWeight: '500',
  },
});
