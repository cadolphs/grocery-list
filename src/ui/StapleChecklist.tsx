// StapleChecklist - renders alphabetically sorted list of staples with toggle
// Pure presentational component - no hooks, no domain logic

import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { StapleItem } from '../domain/types';

type StapleChecklistProps = {
  readonly staples: readonly StapleItem[];
  readonly tripItemNames: ReadonlySet<string>;
  readonly onAddStaple: (staple: StapleItem) => void;
  readonly onRemoveStaple: (name: string) => void;
};

const sortAlphabetically = (staples: readonly StapleItem[]): readonly StapleItem[] =>
  [...staples].sort((a, b) => a.name.localeCompare(b.name));

type StapleRowProps = {
  readonly staple: StapleItem;
  readonly isChecked: boolean;
  readonly onToggle: () => void;
};

const StapleRow = ({ staple, isChecked, onToggle }: StapleRowProps): React.JSX.Element => (
  <Pressable
    style={styles.row}
    testID={`staple-row-${staple.name}`}
    onPress={onToggle}
  >
    <View style={styles.textContainer}>
      <Text style={[styles.stapleName, isChecked && styles.checkedName]}>
        {staple.name}
      </Text>
      <Text style={styles.areaLabel}>{staple.houseArea}</Text>
    </View>
    <Text testID={`toggle-${staple.name}`} style={styles.toggleIndicator}>
      {isChecked ? 'checked' : 'unchecked'}
    </Text>
  </Pressable>
);

export const StapleChecklist = ({
  staples,
  tripItemNames,
  onAddStaple,
  onRemoveStaple,
}: StapleChecklistProps): React.JSX.Element => {
  const sortedStaples = sortAlphabetically(staples);

  const handleToggle = (staple: StapleItem): void => {
    if (tripItemNames.has(staple.name)) {
      onRemoveStaple(staple.name);
    } else {
      onAddStaple(staple);
    }
  };

  return (
    <View>
      {sortedStaples.map((item) => (
        <StapleRow
          key={item.id}
          staple={item}
          isChecked={tripItemNames.has(item.name)}
          onToggle={() => handleToggle(item)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    flex: 1,
  },
  stapleName: {
    fontSize: 16,
    color: '#333333',
  },
  checkedName: {
    color: '#4CAF50',
  },
  areaLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  toggleIndicator: {
    fontSize: 14,
    color: '#666666',
    paddingHorizontal: 8,
  },
});
