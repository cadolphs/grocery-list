// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted
// Optionally accepts onSearch for type-ahead suggestions from staple library

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, FlatList } from 'react-native';
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
    <View>
      <TextInput
        placeholder="Add an item..."
        value={inputText}
        onChangeText={handleChangeText}
      />
      <Pressable onPress={handleAdd}>
        <Text>Add</Text>
      </Pressable>
      {suggestions.length > 0 && (
        <View testID="suggestion-list">
          {suggestions.map((staple) => (
            <Pressable
              key={staple.id}
              onPress={() => handleSelectSuggestion(staple)}
            >
              <Text>{formatSuggestion(staple)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};
