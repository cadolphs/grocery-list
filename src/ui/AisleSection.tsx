// AisleSection - renders a section heading with its trip items.
//
// Two render branches, selected by the pure domain function
// `partitionSectionByAisle`:
//   - null      -> flat render path (single-aisle or all-null section).
//   - subGroups -> inline aisle sub-group blocks within the same section card,
//                  each preceded by a divider + numeric badge (or "No aisle"
//                  for the null tail).
//
// The section header (name + section-level "X of Y" + section-level ✓) is
// byte-identical across both branches — this is the D-NOREGRESS contract from
// section-order-by-section.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AisleKey,
  AisleSubGroup,
  SectionGroup,
  partitionSectionByAisle,
} from '../domain/item-grouping';
import { TripItem } from '../domain/types';
import { TripItemRow } from './TripItemRow';
import { theme } from './theme';
import { surfaces } from './surfaces';

type AisleSectionProps = {
  readonly sectionGroup: SectionGroup;
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
};

// Section and aisle sub-group share the same checked/total count shape,
// so progress formatting and completion are computed by a single helper pair.
type Progress = { readonly checkedCount: number; readonly totalCount: number };

const formatProgress = (progress: Progress): string =>
  `${progress.checkedCount} of ${progress.totalCount}`;

const isComplete = (progress: Progress): boolean =>
  progress.checkedCount === progress.totalCount;

const aisleKeySlug = (aisleKey: AisleKey): string =>
  aisleKey === null ? 'no-aisle' : String(aisleKey);

const aisleBadgeLabel = (aisleKey: AisleKey): string =>
  aisleKey === null ? 'No aisle' : String(aisleKey);

type ItemHandlers = {
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
};

const renderItemRow = (
  item: TripItem,
  index: number,
  handlers: ItemHandlers,
): React.JSX.Element => (
  <View key={item.id}>
    {index > 0 && <View style={styles.separator} />}
    <TripItemRow
      item={item}
      mode="store"
      onPress={
        handlers.onItemPress
          ? () => handlers.onItemPress!(item.name)
          : undefined
      }
      onLongPress={
        handlers.onItemLongPress
          ? () => handlers.onItemLongPress!(item.name, item.houseArea)
          : undefined
      }
    />
  </View>
);

const AisleSubGroupBlock = ({
  subGroup,
  handlers,
}: {
  readonly subGroup: AisleSubGroup;
  readonly handlers: ItemHandlers;
}): React.JSX.Element => (
  <View testID={`aisle-subgroup-${aisleKeySlug(subGroup.aisleKey)}`}>
    <View style={styles.aisleDivider}>
      <Text style={styles.aisleBadge}>
        {aisleBadgeLabel(subGroup.aisleKey)}
      </Text>
      <View style={styles.aisleDividerRight}>
        <Text style={styles.aisleProgress}>{formatProgress(subGroup)}</Text>
        {isComplete(subGroup) && (
          <Text
            style={styles.aisleCheckmark}
            testID={`aisle-subgroup-complete-${aisleKeySlug(subGroup.aisleKey)}`}
          >
            ✓
          </Text>
        )}
      </View>
    </View>
    {subGroup.items.map((item, index) => renderItemRow(item, index, handlers))}
  </View>
);

export const AisleSection = ({
  sectionGroup,
  onItemPress,
  onItemLongPress,
}: AisleSectionProps): React.JSX.Element => {
  const partition = partitionSectionByAisle(sectionGroup);
  const handlers: ItemHandlers = { onItemPress, onItemLongPress };

  // When partition.kind === 'single-aisle', render an `Aisle N` badge in the
  // section header reusing the existing per-aisle badge style (DDD-2). Other
  // kinds (flat-no-aisle, multi-aisle) leave the slot empty.
  const headerBadge: React.ReactNode =
    partition.kind === 'single-aisle' ? (
      <Text
        testID={`section-aisle-badge-${partition.aisleNumber}`}
        style={styles.aisleBadge}
      >
        Aisle {partition.aisleNumber}
      </Text>
    ) : null;

  // Body rendering: flat-no-aisle and single-aisle render the same flat item
  // list; multi-aisle renders inline subgroup blocks. The visible difference
  // between flat-no-aisle and single-aisle lives in `headerBadge` above.
  const body =
    partition.kind === 'multi-aisle'
      ? partition.subGroups.map((subGroup) => (
          <AisleSubGroupBlock
            key={aisleKeySlug(subGroup.aisleKey)}
            subGroup={subGroup}
            handlers={handlers}
          />
        ))
      : sectionGroup.items.map((item, index) =>
          renderItemRow(item, index, handlers),
        );

  return (
    <View style={styles.card} testID={`aisle-section-${sectionGroup.section}`}>
      <View style={styles.header}>
        <Text style={styles.heading}>{sectionGroup.section}</Text>
        <View style={styles.headerRight}>
          {headerBadge}
          <Text style={styles.progress}>{formatProgress(sectionGroup)}</Text>
          {isComplete(sectionGroup) && (
            <Text
              style={styles.checkmark}
              testID={`section-complete-${sectionGroup.section}`}
            >
              ✓
            </Text>
          )}
        </View>
      </View>
      {body}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    marginBottom: theme.space.md,
    padding: theme.space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  heading: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  progress: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
  },
  checkmark: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
    marginLeft: 6,
    fontWeight: theme.font.weight.bold,
  },
  separator: {
    height: 0,
  },
  aisleDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.sm,
    marginBottom: theme.space.xs,
  },
  aisleDividerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  aisleBadge: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.color.textMuted,
    backgroundColor: theme.color.accentSoft,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  aisleProgress: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
  },
  aisleCheckmark: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
    marginLeft: 6,
    fontWeight: theme.font.weight.bold,
  },
});
