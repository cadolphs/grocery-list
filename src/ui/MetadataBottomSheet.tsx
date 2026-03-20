// MetadataBottomSheet - Modal form for adding new item metadata
// Collects item type (Staple/One-off), house area, store section, and aisle

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { HouseArea, StapleItem, AddStapleRequest, AddTripItemRequest } from '../domain/types';

const DEFAULT_HOUSE_AREAS: readonly HouseArea[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

type ItemTypeSelection = 'Staple' | 'One-off';
type SheetMode = 'form' | 'duplicate-warning';

type MetadataBottomSheetProps = {
  readonly visible: boolean;
  readonly itemName: string;
  readonly defaultItemType?: ItemTypeSelection;
  readonly defaultArea?: HouseArea | null;
  readonly areas?: readonly HouseArea[];
  readonly existingSections?: readonly string[];
  readonly onFindDuplicate?: (name: string, area: HouseArea) => StapleItem | undefined;
  readonly onDismiss: () => void;
  readonly onSubmitStaple: (request: AddStapleRequest) => void;
  readonly onSubmitTripItem: (request: AddTripItemRequest) => void;
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

export const MetadataBottomSheet = ({
  visible,
  itemName,
  defaultItemType,
  defaultArea,
  areas = DEFAULT_HOUSE_AREAS,
  existingSections = [],
  onFindDuplicate,
  onDismiss,
  onSubmitStaple,
  onSubmitTripItem,
}: MetadataBottomSheetProps): React.JSX.Element => {
  const resolveDefaultArea = (): HouseArea | null =>
    defaultArea === undefined ? 'Kitchen Cabinets' : defaultArea;

  const [selectedType, setSelectedType] = useState<ItemTypeSelection>(defaultItemType ?? 'Staple');
  const [selectedArea, setSelectedArea] = useState<HouseArea | null>(resolveDefaultArea());
  const [section, setSection] = useState('');
  const [sectionSuggestions, setSectionSuggestions] = useState<readonly string[]>([]);
  const [aisleText, setAisleText] = useState('');
  const [sheetMode, setSheetMode] = useState<SheetMode>('form');
  const [duplicateStaple, setDuplicateStaple] = useState<StapleItem | null>(null);

  // Re-initialize defaults when sheet opens or defaults change
  useEffect(() => {
    if (visible) {
      setSelectedType(defaultItemType ?? 'Staple');
      setSelectedArea(resolveDefaultArea());
      setSection('');
      setSectionSuggestions([]);
      setAisleText('');
      setSheetMode('form');
      setDuplicateStaple(null);
    }
  }, [visible, defaultItemType, defaultArea]);

  const handleSectionChange = (text: string): void => {
    setSection(text);
    setSectionSuggestions(filterSectionSuggestions(existingSections, text));
  };

  const handleSelectSectionSuggestion = (sectionName: string): void => {
    setSection(sectionName);
    setSectionSuggestions([]);
  };

  const handleSubmit = (): void => {
    if (selectedArea === null) return;

    // Check for duplicate staple before submitting
    if (selectedType === 'Staple' && onFindDuplicate) {
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

    if (selectedType === 'Staple') {
      onSubmitStaple({
        name: itemName,
        houseArea: selectedArea,
        storeLocation,
      });
    }

    onSubmitTripItem({
      name: itemName,
      houseArea: selectedArea,
      storeLocation,
      itemType: selectedType === 'Staple' ? 'staple' : 'one-off',
      source: 'quick-add',
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

    onSubmitTripItem({
      name: itemName,
      houseArea: skipArea,
      storeLocation: { section: 'Uncategorized', aisleNumber: null },
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
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {sheetMode === 'duplicate-warning' && duplicateStaple ? (
            <>
              <Text style={styles.title}>Duplicate Found</Text>
              <Text style={styles.duplicateMessage}>
                &quot;{duplicateStaple.name}&quot; already exists in {duplicateStaple.houseArea}
              </Text>
              <Text style={styles.duplicateMetadata}>
                {duplicateStaple.storeLocation.section}
                {duplicateStaple.storeLocation.aisleNumber !== null
                  ? ` / Aisle ${duplicateStaple.storeLocation.aisleNumber}`
                  : ''}
              </Text>
              <Pressable style={styles.addButton} onPress={handleAddToTripInstead}>
                <Text style={styles.addButtonText}>Add to trip instead</Text>
              </Pressable>
              <Pressable style={styles.skipButton} onPress={handleCancelDuplicate}>
                <Text style={styles.skipButtonText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
          <Text style={styles.title}>Add &apos;{itemName}&apos;</Text>

          {/* Type toggle */}
          <View style={styles.typeToggleContainer}>
            <Pressable
              testID={selectedType === 'Staple' ? 'type-toggle-Staple-active' : 'type-toggle-Staple'}
              style={[
                styles.typeToggleButton,
                selectedType === 'Staple' && styles.typeToggleActive,
              ]}
              onPress={() => setSelectedType('Staple')}
            >
              <Text
                style={[
                  styles.typeToggleText,
                  selectedType === 'Staple' && styles.typeToggleTextActive,
                ]}
              >
                Staple
              </Text>
            </Pressable>
            <Pressable
              testID={selectedType === 'One-off' ? 'type-toggle-One-off-active' : 'type-toggle-One-off'}
              style={[
                styles.typeToggleButton,
                selectedType === 'One-off' && styles.typeToggleActive,
              ]}
              onPress={() => setSelectedType('One-off')}
            >
              <Text
                style={[
                  styles.typeToggleText,
                  selectedType === 'One-off' && styles.typeToggleTextActive,
                ]}
              >
                One-off
              </Text>
            </Pressable>
          </View>

          {/* Area picker */}
          <View style={styles.areaContainer}>
            {areas.map((area) => (
              <Pressable
                key={area}
                testID={selectedArea === area ? `area-button-${area}-active` : `area-button-${area}`}
                style={[
                  styles.areaButton,
                  selectedArea === area && styles.areaButtonActive,
                ]}
                onPress={() => setSelectedArea(area)}
              >
                <Text
                  style={[
                    styles.areaButtonText,
                    selectedArea === area && styles.areaButtonTextActive,
                  ]}
                >
                  {area}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Section input */}
          <TextInput
            style={styles.input}
            placeholder="Store section..."
            value={section}
            onChangeText={handleSectionChange}
          />

          {/* Section suggestions */}
          {sectionSuggestions.length > 0 && (
            <View style={styles.sectionSuggestions}>
              {sectionSuggestions.map((sectionName) => (
                <Pressable
                  key={sectionName}
                  style={styles.sectionSuggestionItem}
                  onPress={() => handleSelectSectionSuggestion(sectionName)}
                >
                  <Text style={styles.sectionSuggestionText}>{sectionName}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Aisle input */}
          <TextInput
            style={styles.input}
            placeholder="Aisle number"
            value={aisleText}
            onChangeText={setAisleText}
            keyboardType="numeric"
          />

          {/* Action buttons */}
          <Pressable style={styles.addButton} onPress={handleSubmit}>
            <Text style={styles.addButtonText}>Add Item</Text>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip, add with defaults</Text>
          </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  typeToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    justifyContent: 'center',
  },
  typeToggleActive: {
    backgroundColor: '#2196F3',
  },
  typeToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  typeToggleTextActive: {
    color: '#ffffff',
  },
  areaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  areaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    justifyContent: 'center',
  },
  areaButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  areaButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  areaButtonTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  duplicateMessage: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  duplicateMetadata: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  sectionSuggestions: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
    marginTop: -8,
  },
  sectionSuggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionSuggestionText: {
    fontSize: 14,
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  skipButton: {
    borderWidth: 1,
    borderColor: '#9e9e9e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#666666',
    fontWeight: '500',
    fontSize: 16,
  },
});
