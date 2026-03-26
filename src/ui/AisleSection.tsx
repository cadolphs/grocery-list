// AisleSection - renders an aisle heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AisleGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AisleSectionProps = {
  readonly aisleGroup: AisleGroup;
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
};

const formatAisleHeading = (aisleGroup: AisleGroup): string =>
  aisleGroup.aisleNumber !== null
    ? `Aisle ${aisleGroup.aisleNumber}: ${aisleGroup.section}`
    : aisleGroup.section;

const formatProgress = (aisleGroup: AisleGroup): string =>
  `${aisleGroup.checkedCount} of ${aisleGroup.totalCount}`;

const isSectionComplete = (aisleGroup: AisleGroup): boolean =>
  aisleGroup.checkedCount === aisleGroup.totalCount;

export const AisleSection = ({ aisleGroup, onItemPress, onItemLongPress }: AisleSectionProps): React.JSX.Element => (
  <View style={styles.card} testID={`aisle-section-${aisleGroup.section}`}>
    <View style={styles.header}>
      <Text style={styles.heading}>{formatAisleHeading(aisleGroup)}</Text>
      <View style={styles.headerRight}>
        <Text style={styles.progress}>{formatProgress(aisleGroup)}</Text>
        {isSectionComplete(aisleGroup) && (
          <Text style={styles.checkmark} testID={`section-complete-${aisleGroup.section}`}>✓</Text>
        )}
      </View>
    </View>
    {aisleGroup.items.map((item, index) => (
      <View key={item.id}>
        {index > 0 && <View style={styles.separator} />}
        <TripItemRow
          item={item}
          mode="store"
          onPress={onItemPress ? () => onItemPress(item.name) : undefined}
          onLongPress={onItemLongPress ? () => onItemLongPress(item.name, item.houseArea) : undefined}
        />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    fontSize: 14,
    color: '#666666',
  },
  checkmark: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});
