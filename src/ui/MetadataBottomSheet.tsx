// MetadataBottomSheet - Modal form for adding new item metadata
// Collects item type (Staple/One-off), house area, store section, and aisle

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  HouseArea,
  StapleItem,
  AddStapleRequest,
  AddOneOffRequest,
  AddTripItemRequest,
} from '../domain/types';
import { useIsWeb } from '../hooks/useIsWeb';
import { theme } from './theme';
import { pressedBlock, surfaces } from './surfaces';

type ItemTypeSelection = 'Staple' | 'One-off';
type SheetMode = 'form' | 'duplicate-warning';
type EditMode = 'add' | 'edit';

type EditInitialValues = {
  readonly name?: string;
  readonly houseArea: HouseArea;
  readonly section: string;
  readonly aisleNumber: number | null;
};

type MetadataBottomSheetProps = {
  readonly visible: boolean;
  readonly itemName: string;
  readonly mode?: EditMode;
  readonly editStapleId?: string | null;
  readonly initialValues?: EditInitialValues | null;
  readonly defaultItemType?: ItemTypeSelection;
  readonly defaultArea?: HouseArea | null;
  readonly areas: readonly HouseArea[];
  readonly existingSections?: readonly string[];
  readonly onFindDuplicate?: (
    name: string,
    area: HouseArea,
  ) => StapleItem | undefined;
  readonly onDismiss: () => void;
  readonly onSubmitStaple: (request: AddStapleRequest) => void;
  readonly onSubmitOneOff?: (request: AddOneOffRequest) => void;
  readonly onSubmitTripItem: (request: AddTripItemRequest) => void;
  readonly onSaveEdit?: (
    stapleId: string,
    changes: {
      name?: string;
      houseArea?: HouseArea;
      storeLocation?: { section: string; aisleNumber: number | null };
    },
  ) => void;
  readonly onDeleteStaple?: (stapleId: string) => void;
};

const filterSectionSuggestions = (
  sections: readonly string[],
  query: string,
): readonly string[] => {
  const trimmed = query.trim();
  if (trimmed === '') return [];
  const lowerQuery = trimmed.toLowerCase();
  return sections.filter((s) => s.toLowerCase().startsWith(lowerQuery));
};

const sortSectionsAlphabetically = (
  sections: readonly string[],
): readonly string[] => [...sections].sort((a, b) => a.localeCompare(b));

type SectionDropdownState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'empty-hint' }
  | { readonly kind: 'list'; readonly rows: readonly string[] };

const decideSectionDropdownState = (
  mode: EditMode,
  query: string,
  existingSections: readonly string[],
  filteredSuggestions: readonly string[],
): SectionDropdownState => {
  if (mode !== 'add') return { kind: 'hidden' };

  const isQueryEmpty = query === '';

  if (isQueryEmpty && existingSections.length === 0) {
    return { kind: 'empty-hint' };
  }

  if (isQueryEmpty && existingSections.length > 0) {
    return { kind: 'list', rows: sortSectionsAlphabetically(existingSections) };
  }

  if (!isQueryEmpty && filteredSuggestions.length > 0) {
    return {
      kind: 'list',
      rows: sortSectionsAlphabetically(filteredSuggestions),
    };
  }

  return { kind: 'hidden' };
};

type RenameValidationResult =
  | { readonly kind: 'invalid-empty' }
  | {
      readonly kind: 'invalid-duplicate';
      readonly trimmedName: string;
      readonly area: HouseArea;
    }
  | { readonly kind: 'ok'; readonly trimmedName: string };

const validateRename = (
  rawName: string,
  area: HouseArea,
  selfId: string,
  findDuplicate:
    ((name: string, area: HouseArea) => StapleItem | undefined) | undefined,
): RenameValidationResult => {
  const trimmedName = rawName.trim();
  if (trimmedName === '') return { kind: 'invalid-empty' };

  if (findDuplicate) {
    const duplicate = findDuplicate(trimmedName, area);
    if (duplicate && duplicate.id !== selfId) {
      return { kind: 'invalid-duplicate', trimmedName, area };
    }
  }

  return { kind: 'ok', trimmedName };
};

const renameErrorMessage = (
  result: Exclude<RenameValidationResult, { kind: 'ok' }>,
): string => {
  if (result.kind === 'invalid-empty') return 'Name is required';
  return `"${result.trimmedName}" already exists in ${result.area}`;
};

export const MetadataBottomSheet = ({
  visible,
  itemName,
  mode = 'add',
  editStapleId,
  initialValues,
  defaultItemType,
  defaultArea,
  areas,
  existingSections = [],
  onFindDuplicate,
  onDismiss,
  onSubmitStaple,
  onSubmitOneOff,
  onSubmitTripItem,
  onSaveEdit,
  onDeleteStaple,
}: MetadataBottomSheetProps): React.JSX.Element => {
  const isEditMode = mode === 'edit';
  const isWeb = useIsWeb();

  const resolveDefaultArea = (): HouseArea | null =>
    defaultArea === undefined ? 'Kitchen Cabinets' : defaultArea;

  const [selectedType, setSelectedType] = useState<ItemTypeSelection>(
    defaultItemType ?? 'Staple',
  );
  const [selectedArea, setSelectedArea] = useState<HouseArea | null>(
    resolveDefaultArea(),
  );
  const [editedName, setEditedName] = useState('');
  const [section, setSection] = useState('');
  const [sectionSuggestions, setSectionSuggestions] = useState<
    readonly string[]
  >([]);
  const [aisleText, setAisleText] = useState('');
  const [sheetMode, setSheetMode] = useState<SheetMode>('form');
  const [duplicateStaple, setDuplicateStaple] = useState<StapleItem | null>(
    null,
  );
  const [nameError, setNameError] = useState<string | null>(null);

  // Re-initialize defaults when sheet opens or defaults change
  useEffect(() => {
    if (visible) {
      if (isEditMode && initialValues) {
        setSelectedType('Staple');
        setSelectedArea(initialValues.houseArea);
        setEditedName(initialValues.name ?? itemName);
        setSection(initialValues.section);
        setAisleText(
          initialValues.aisleNumber !== null
            ? String(initialValues.aisleNumber)
            : '',
        );
      } else {
        setSelectedType(defaultItemType ?? 'Staple');
        setSelectedArea(resolveDefaultArea());
        setEditedName('');
        setSection('');
        setAisleText('');
      }
      setSectionSuggestions([]);
      setSheetMode('form');
      setDuplicateStaple(null);
      setNameError(null);
    }
  }, [
    visible,
    defaultItemType,
    defaultArea,
    isEditMode,
    initialValues,
    itemName,
  ]);

  const handleSectionChange = (text: string): void => {
    setSection(text);
    setSectionSuggestions(filterSectionSuggestions(existingSections, text));
  };

  const handleSelectSectionSuggestion = (sectionName: string): void => {
    setSection(sectionName);
    setSectionSuggestions([]);
  };

  const handleSaveEdit = (): void => {
    if (selectedArea === null || !editStapleId || !onSaveEdit) return;

    const validation = validateRename(
      editedName,
      selectedArea,
      editStapleId,
      onFindDuplicate,
    );
    if (validation.kind !== 'ok') {
      setNameError(renameErrorMessage(validation));
      return;
    }

    const storeLocation = {
      section,
      aisleNumber: aisleText ? parseInt(aisleText, 10) : null,
    };

    onSaveEdit(editStapleId, {
      name: editedName,
      houseArea: selectedArea,
      storeLocation,
    });

    onDismiss();
  };

  const handleDeleteStaple = (): void => {
    if (!editStapleId || !onDeleteStaple) return;
    onDeleteStaple(editStapleId);
    onDismiss();
  };

  const handleSubmit = (): void => {
    if (selectedType === 'One-off') {
      const oneOffStoreLocation = {
        section: section || 'Uncategorized',
        aisleNumber: aisleText ? parseInt(aisleText, 10) : null,
      };
      if (onSubmitOneOff) {
        onSubmitOneOff({
          name: itemName,
          storeLocation: oneOffStoreLocation,
        });
      }
      onSubmitTripItem({
        name: itemName,
        houseArea: 'Kitchen Cabinets',
        storeLocation: oneOffStoreLocation,
        itemType: 'one-off',
        source: 'quick-add',
      });
      onDismiss();
      return;
    }

    if (selectedArea === null) return;

    if (onFindDuplicate) {
      const existing = onFindDuplicate(itemName, selectedArea);
      if (existing) {
        setDuplicateStaple(existing);
        setSheetMode('duplicate-warning');
        return;
      }
    }

    const storeLocation = {
      section,
      aisleNumber: aisleText ? parseInt(aisleText, 10) : null,
    };

    // Single source of truth: stapleLibrary.subscribe -> applyAddedStaplesToTrip
    // (wired in useAppInitialization) adds the trip row carrying the new
    // staple's id. The previous direct onSubmitTripItem call here was a
    // dual-write that produced a duplicate row without a stapleId, slipping
    // past the stapleId-keyed dedup guard at trip.ts:178. Mirrors the
    // analogous delete-path simplification in commit b32cd42.
    onSubmitStaple({
      name: itemName,
      houseArea: selectedArea,
      storeLocation,
    });

    onDismiss();
  };

  const handleAddToTripInstead = (): void => {
    if (!duplicateStaple) return;

    onSubmitTripItem({
      name: duplicateStaple.name,
      houseArea: duplicateStaple.houseArea,
      storeLocation: duplicateStaple.storeLocation,
      itemType: 'staple',
      source: 'quick-add',
    });

    onDismiss();
  };

  const handleCancelDuplicate = (): void => {
    setSheetMode('form');
    setDuplicateStaple(null);
  };

  const handleSkip = (): void => {
    const skipArea: HouseArea = selectedArea ?? 'Kitchen Cabinets';
    const skipStoreLocation = { section: 'Uncategorized', aisleNumber: null };

    if (onSubmitOneOff) {
      onSubmitOneOff({
        name: itemName,
        storeLocation: skipStoreLocation,
      });
    }

    onSubmitTripItem({
      name: itemName,
      houseArea: skipArea,
      storeLocation: skipStoreLocation,
      itemType: 'one-off',
      source: 'quick-add',
    });

    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <KeyboardAvoidingView
          style={styles.kbAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={styles.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {sheetMode === 'duplicate-warning' && duplicateStaple ? (
                <>
                  <Text style={styles.title}>Duplicate Found</Text>
                  <Text style={styles.duplicateMessage}>
                    &quot;{duplicateStaple.name}&quot; already exists in{' '}
                    {duplicateStaple.houseArea}
                  </Text>
                  <Text style={styles.duplicateMetadata}>
                    {duplicateStaple.storeLocation.section}
                    {duplicateStaple.storeLocation.aisleNumber !== null
                      ? ` / Aisle ${duplicateStaple.storeLocation.aisleNumber}`
                      : ''}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.addButton,
                      pressedBlock(pressed),
                    ]}
                    onPress={handleAddToTripInstead}
                  >
                    <Text style={styles.addButtonText}>
                      Add to trip instead
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.skipButton}
                    onPress={handleCancelDuplicate}
                  >
                    <Text style={styles.skipButtonText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.title}>
                    {isEditMode ? `Edit '${itemName}'` : `Add '${itemName}'`}
                  </Text>

                  {/* Name field - only shown in edit mode (rename) */}
                  {isEditMode && (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Name"
                        value={editedName}
                        onChangeText={(text) => {
                          setEditedName(text);
                          if (nameError !== null) setNameError(null);
                        }}
                      />
                      {nameError !== null && (
                        <Text style={styles.inlineError}>{nameError}</Text>
                      )}
                    </>
                  )}

                  {/* Type toggle - hidden in edit mode */}
                  {!isEditMode && (
                    <View style={styles.typeToggleContainer}>
                      <Pressable
                        testID={
                          selectedType === 'Staple'
                            ? 'type-toggle-Staple-active'
                            : 'type-toggle-Staple'
                        }
                        style={[
                          styles.typeToggleButton,
                          selectedType === 'Staple' && styles.typeToggleActive,
                        ]}
                        onPress={() => setSelectedType('Staple')}
                      >
                        <Text
                          style={[
                            styles.typeToggleText,
                            selectedType === 'Staple' &&
                              styles.typeToggleTextActive,
                          ]}
                        >
                          Staple
                        </Text>
                      </Pressable>
                      <Pressable
                        testID={
                          selectedType === 'One-off'
                            ? 'type-toggle-One-off-active'
                            : 'type-toggle-One-off'
                        }
                        style={[
                          styles.typeToggleButton,
                          selectedType === 'One-off' && styles.typeToggleActive,
                        ]}
                        onPress={() => setSelectedType('One-off')}
                      >
                        <Text
                          style={[
                            styles.typeToggleText,
                            selectedType === 'One-off' &&
                              styles.typeToggleTextActive,
                          ]}
                        >
                          One-off
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Area picker - only shown for staples (or edit mode) */}
                  {(selectedType === 'Staple' || isEditMode) && (
                    <View style={styles.areaContainer}>
                      {areas.map((area) => (
                        <Pressable
                          key={area}
                          testID={
                            selectedArea === area
                              ? `area-button-${area}-active`
                              : `area-button-${area}`
                          }
                          style={[
                            styles.areaButton,
                            selectedArea === area && styles.areaButtonActive,
                          ]}
                          onPress={() => setSelectedArea(area)}
                        >
                          <Text
                            style={[
                              styles.areaButtonText,
                              selectedArea === area &&
                                styles.areaButtonTextActive,
                            ]}
                          >
                            {area}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Store section and aisle - shown for all item types */}
                  <TextInput
                    style={styles.input}
                    placeholder="Store section..."
                    value={section}
                    onChangeText={handleSectionChange}
                    autoFocus={isWeb}
                  />

                  {(() => {
                    const dropdownState = decideSectionDropdownState(
                      mode,
                      section,
                      existingSections,
                      sectionSuggestions,
                    );
                    if (dropdownState.kind === 'hidden') return null;
                    if (dropdownState.kind === 'empty-hint') {
                      return (
                        <View style={styles.sectionSuggestions}>
                          <Text style={styles.sectionEmptyHint}>
                            No saved sections yet — type a new one.
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.sectionSuggestions}>
                        {dropdownState.rows.map((sectionName) => (
                          <Pressable
                            key={sectionName}
                            testID={`section-suggestion-${sectionName}`}
                            style={styles.sectionSuggestionItem}
                            onPress={() =>
                              handleSelectSectionSuggestion(sectionName)
                            }
                          >
                            <Text style={styles.sectionSuggestionText}>
                              {sectionName}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })()}

                  <TextInput
                    style={styles.input}
                    placeholder="Aisle number"
                    value={aisleText}
                    onChangeText={setAisleText}
                    onSubmitEditing={isEditMode ? handleSaveEdit : handleSubmit}
                    keyboardType="numeric"
                  />

                  {/* Action buttons */}
                  {isEditMode ? (
                    <>
                      <Pressable
                        style={({ pressed }) => [
                          styles.addButton,
                          pressedBlock(pressed),
                        ]}
                        onPress={handleSaveEdit}
                      >
                        <Text style={styles.addButtonText}>Save Changes</Text>
                      </Pressable>
                      {onDeleteStaple && editStapleId && (
                        <Pressable
                          style={styles.deleteButton}
                          onPress={handleDeleteStaple}
                        >
                          <Text style={styles.deleteButtonText}>
                            Delete Staple
                          </Text>
                        </Pressable>
                      )}
                    </>
                  ) : (
                    <>
                      <Pressable
                        style={({ pressed }) => [
                          styles.addButton,
                          pressedBlock(pressed),
                        ]}
                        onPress={handleSubmit}
                      >
                        <Text style={styles.addButtonText}>Add Item</Text>
                      </Pressable>

                      <Pressable style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipButtonText}>
                          Skip, add with defaults
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  kbAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingBottom: theme.space.sm,
  },
  sheet: {
    backgroundColor: theme.color.ground,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    padding: 20,
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
    marginBottom: theme.space.lg,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderWidth: theme.border.width,
    borderColor: theme.color.border,
    marginBottom: theme.space.lg,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  typeToggleButton: {
    flex: 1,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    backgroundColor: theme.color.accentSoft,
    minHeight: theme.target.min,
    justifyContent: 'center',
  },
  typeToggleActive: {
    backgroundColor: theme.color.inverse,
  },
  typeToggleText: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.regular,
    color: theme.color.text,
  },
  typeToggleTextActive: {
    color: theme.color.inverseText,
  },
  areaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginBottom: theme.space.lg,
  },
  areaButton: {
    ...surfaces.secondaryButton,
    paddingHorizontal: theme.space.lg,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  areaButtonActive: {
    backgroundColor: theme.color.accent,
  },
  areaButtonText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
  },
  areaButtonTextActive: {
    color: theme.color.onAccent,
  },
  input: {
    ...surfaces.input,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text,
    marginBottom: theme.space.md,
  },
  inlineError: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    marginTop: -8,
    marginBottom: theme.space.md,
    paddingHorizontal: theme.space.xs,
  },
  duplicateMessage: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
    marginBottom: theme.space.sm,
  },
  duplicateMetadata: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
    marginBottom: theme.space.lg,
  },
  sectionSuggestions: {
    ...surfaces.card,
    marginBottom: theme.space.md,
    marginTop: -8,
  },
  sectionSuggestionItem: {
    padding: theme.space.md,
  },
  sectionSuggestionText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
  },
  sectionEmptyHint: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
    padding: theme.space.md,
    fontStyle: 'italic',
  },
  addButton: {
    ...surfaces.primaryButton,
    padding: theme.space.lg,
    alignItems: 'center',
    marginBottom: theme.space.sm,
    justifyContent: 'center',
  },
  addButtonText: {
    color: theme.color.onAccent,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.md,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: theme.color.danger,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
    alignItems: 'center',
    marginBottom: theme.space.sm,
    minHeight: theme.target.min,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: theme.color.danger,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.md,
  },
  skipButton: {
    ...surfaces.secondaryButton,
    padding: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: theme.color.text,
    fontWeight: theme.font.weight.regular,
    fontSize: theme.font.size.md,
  },
});
