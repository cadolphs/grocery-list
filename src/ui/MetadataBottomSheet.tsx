// MetadataBottomSheet - Modal form for adding new item metadata
// Collects item type (Staple/One-off), house area, store section, and aisle

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { HouseArea } from '../domain/types';

const HOUSE_AREAS: readonly HouseArea[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

type ItemTypeSelection = 'Staple' | 'One-off';

type MetadataBottomSheetProps = {
  readonly visible: boolean;
  readonly itemName: string;
  readonly onDismiss: () => void;
};

export const MetadataBottomSheet = ({
  visible,
  itemName,
  onDismiss,
}: MetadataBottomSheetProps): React.JSX.Element => {
  const [selectedType, setSelectedType] = useState<ItemTypeSelection>('Staple');
  const [selectedArea, setSelectedArea] = useState<HouseArea>('Kitchen Cabinets');
  const [section, setSection] = useState('');
  const [aisleText, setAisleText] = useState('');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add &apos;{itemName}&apos;</Text>

          {/* Type toggle */}
          <View style={styles.typeToggleContainer}>
            <Pressable
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
            {HOUSE_AREAS.map((area) => (
              <Pressable
                key={area}
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
            onChangeText={setSection}
          />

          {/* Aisle input */}
          <TextInput
            style={styles.input}
            placeholder="Aisle number"
            value={aisleText}
            onChangeText={setAisleText}
            keyboardType="numeric"
          />

          {/* Action buttons */}
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>Add Item</Text>
          </Pressable>

          <Pressable style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip, add with defaults</Text>
          </Pressable>
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
