// StapleChecklist - renders alphabetically sorted list of staples with toggle
// Search bar filters staples by case-insensitive substring match

import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { StapleItem } from '../domain/types';
import { useIsWeb } from '../hooks/useIsWeb';

export const filterStaples = (
  staples: readonly StapleItem[],
  query: string,
): readonly StapleItem[] => {
  if (query === '') return staples;
  const lowerQuery = query.toLowerCase();
  return staples.filter((staple) => staple.name.toLowerCase().includes(lowerQuery));
};

type StapleChecklistProps = {
  readonly staples: readonly StapleItem[];
  readonly tripItemNames: ReadonlySet<string>;
  readonly onAddStaple: (staple: StapleItem) => void;
  readonly onRemoveStaple: (name: string) => void;
  readonly onLongPress?: (name: string, area: string) => void;
};

const sortAlphabetically = (staples: readonly StapleItem[]): readonly StapleItem[] =>
  [...staples].sort((a, b) => a.name.localeCompare(b.name));

type StapleRowProps = {
  readonly staple: StapleItem;
  readonly isChecked: boolean;
  readonly onToggle: () => void;
  readonly onLongPress?: () => void;
};

const StapleRow = ({ staple, isChecked, onToggle, onLongPress }: StapleRowProps): React.JSX.Element => {
  const isWeb = useIsWeb();
  const showEditButton = isWeb && !!onLongPress;
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowPressable}
        testID={`staple-row-${staple.name}`}
        onPress={onToggle}
        onLongPress={onLongPress}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.stapleName, isChecked ? styles.checkedName : styles.uncheckedName]}>
            {staple.name}
          </Text>
          <Text style={styles.areaLabel}>{staple.houseArea}</Text>
        </View>
      </Pressable>
      {showEditButton && (
        <Pressable
          style={styles.editButton}
          onPress={onLongPress}
          testID={`edit-button-${staple.name}`}
          accessibilityLabel={`Edit ${staple.name}`}
        >
          <Text style={styles.editIcon}>{'\u270E'}</Text>
        </Pressable>
      )}
    </View>
  );
};

export const StapleChecklist = ({
  staples,
  tripItemNames,
  onAddStaple,
  onRemoveStaple,
  onLongPress,
}: StapleChecklistProps): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedStaples = sortAlphabetically(staples);
  const visibleStaples = filterStaples(sortedStaples, searchQuery);

  const handleToggle = (staple: StapleItem): void => {
    if (tripItemNames.has(staple.name)) {
      onRemoveStaple(staple.name);
    } else {
      onAddStaple(staple);
    }
  };

  const handleClear = (): void => {
    setSearchQuery('');
  };

  return (
    <View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search staples..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable testID="search-clear-button" onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>X</Text>
          </Pressable>
        )}
      </View>
      {visibleStaples.length === 0 && searchQuery.length > 0 && (
        <Text style={styles.emptyStateMessage}>No staples match &apos;{searchQuery}&apos;</Text>
      )}
      {visibleStaples.map((item) => (
        <StapleRow
          key={item.id}
          staple={item}
          isChecked={tripItemNames.has(item.name)}
          onToggle={() => handleToggle(item)}
          onLongPress={onLongPress ? () => onLongPress(item.name, item.houseArea) : undefined}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rowPressable: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editIcon: {
    fontSize: 18,
    color: '#666666',
  },
  stapleName: {
    fontSize: 16,
    color: '#333333',
  },
  checkedName: {
    color: '#4CAF50',
  },
  uncheckedName: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  areaLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
});
