// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted
// Optionally accepts onSearch for type-ahead suggestions from staple library

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import {
  AddTripItemRequest,
  AddTripItemResult,
  StapleItem,
} from '../domain/types';
import { useIsWeb } from '../hooks/useIsWeb';
import { theme } from './theme';
import { pressedBlock, surfaces, linkHit } from './surfaces';

const formatLocation = (section: string, aisleNumber: number | null): string =>
  aisleNumber === null ? section : `${section} / Aisle ${aisleNumber}`;

const typeLabel = (type: StapleItem['type']): string =>
  type === 'one-off' ? ' (one-off)' : '';

export const formatSuggestion = (staple: StapleItem): string => {
  const location = formatLocation(
    staple.storeLocation.section,
    staple.storeLocation.aisleNumber,
  );
  return `${staple.name} - ${location}${typeLabel(staple.type)}`;
};

type QuickAddProps = {
  readonly onAddItem: (request: AddTripItemRequest) => AddTripItemResult;
  readonly onSearch?: (query: string) => StapleItem[];
  readonly onSelectSuggestion?: (staple: StapleItem) => void;
  readonly onOpenMetadataSheet?: (itemName: string) => void;
};

export const QuickAdd = ({
  onAddItem,
  onSearch,
  onSelectSuggestion,
  onOpenMetadataSheet,
}: QuickAddProps): React.JSX.Element => {
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
        <Pressable
          style={({ pressed }) => [styles.addButton, pressedBlock(pressed)]}
          onPress={handleAdd}
          disabled={!onOpenMetadataSheet}
        >
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
              <Text style={styles.suggestionText}>
                {formatSuggestion(staple)}
              </Text>
            </Pressable>
          ))}
          {trimmedInput.length > 0 && (
            <Pressable
              hitSlop={linkHit}
              style={[
                styles.suggestionItem,
                suggestions.length > 0 && styles.suggestionSeparator,
              ]}
              onPress={() => onOpenMetadataSheet?.(trimmedInput)}
            >
              <Text style={styles.addNewItemText}>
                Add &apos;{trimmedInput}&apos; as new item...
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.space.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    ...surfaces.input,
    flex: 1,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text,
  },
  addButton: {
    ...surfaces.primaryButton,
    padding: theme.space.md,
    marginLeft: theme.space.sm,
  },
  addButtonText: {
    color: theme.color.onAccent,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.md,
  },
  suggestionList: {
    ...surfaces.card,
    marginTop: theme.space.xs,
  },
  suggestionItem: {
    padding: theme.space.md,
  },
  suggestionSeparator: {
    borderTopWidth: 0,
  },
  suggestionText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
  },
  addNewItemText: {
    textDecorationLine: 'underline',
    fontSize: theme.font.size.sm,
    color: theme.color.text,
    fontWeight: theme.font.weight.regular,
  },
});
