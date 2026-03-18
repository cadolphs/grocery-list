// QuickAdd - text input + Add button for adding one-off items to the trip
// Accepts onAddItem callback from parent to keep state management lifted

import React, { useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import { AddTripItemRequest, AddTripItemResult } from '../domain/types';

type QuickAddProps = {
  readonly onAddItem: (request: AddTripItemRequest) => AddTripItemResult;
};

export const QuickAdd = ({ onAddItem }: QuickAddProps): React.JSX.Element => {
  const [inputText, setInputText] = useState('');

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
  };

  return (
    <View>
      <TextInput
        placeholder="Add an item..."
        value={inputText}
        onChangeText={setInputText}
      />
      <Pressable onPress={handleAdd}>
        <Text>Add</Text>
      </Pressable>
    </View>
  );
};
