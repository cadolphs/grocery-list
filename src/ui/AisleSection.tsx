// AisleSection - renders a section heading with its trip items
// Pure presentational component
//
// Note: filename retained for scope; the prop is now sectionGroup (section-name keyed).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SectionGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';
import { theme } from './theme';

type AisleSectionProps = {
  readonly sectionGroup: SectionGroup;
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
};

const formatProgress = (sectionGroup: SectionGroup): string =>
  `${sectionGroup.checkedCount} of ${sectionGroup.totalCount}`;

const isSectionComplete = (sectionGroup: SectionGroup): boolean =>
  sectionGroup.checkedCount === sectionGroup.totalCount;

export const AisleSection = ({ sectionGroup, onItemPress, onItemLongPress }: AisleSectionProps): React.JSX.Element => (
  <View style={styles.card} testID={`aisle-section-${sectionGroup.section}`}>
    <View style={styles.header}>
      <Text style={styles.heading}>{sectionGroup.section}</Text>
      <View style={styles.headerRight}>
        <Text style={styles.progress}>{formatProgress(sectionGroup)}</Text>
        {isSectionComplete(sectionGroup) && (
          <Text style={styles.checkmark} testID={`section-complete-${sectionGroup.section}`}>✓</Text>
        )}
      </View>
    </View>
    {sectionGroup.items.map((item, index) => (
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
    backgroundColor: theme.color.tile,
    borderRadius: theme.radius.lg,
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
    color: theme.color.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    fontSize: 14,
    color: theme.color.textMuted,
  },
  checkmark: {
    fontSize: 16,
    color: theme.color.accent,
    marginLeft: 6,
    fontWeight: '600',
  },
  separator: {
    height: 0,
  },
});
