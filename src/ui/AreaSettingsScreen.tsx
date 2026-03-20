// AreaSettingsScreen - displays and manages house areas
// Shows list of configured areas with Add/Edit/Delete functionality

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useAreas } from '../hooks/useAreas';

export const AreaSettingsScreen = (): React.JSX.Element => {
  const { areas, addArea } = useAreas();
  const [isAdding, setIsAdding] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddPress = () => {
    setIsAdding(true);
    setNewAreaName('');
    setAddError(null);
  };

  const handleSaveNewArea = () => {
    const result = addArea(newAreaName);
    if (result.success) {
      setIsAdding(false);
      setNewAreaName('');
      setAddError(null);
    } else {
      setAddError(result.error);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewAreaName('');
    setAddError(null);
  };

  return (
    <ScrollView testID="area-settings-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>House Areas</Text>
      {areas.map((area) => (
        <View key={area} style={styles.areaCard}>
          <Text style={styles.areaName}>{area}</Text>
        </View>
      ))}
      {isAdding ? (
        <View style={styles.addForm}>
          <TextInput
            testID="area-name-input"
            style={styles.nameInput}
            value={newAreaName}
            onChangeText={setNewAreaName}
            placeholder="Area name"
            autoFocus
          />
          {addError && <Text style={styles.errorText}>{addError}</Text>}
          <View style={styles.formButtons}>
            <Pressable style={styles.saveButton} onPress={handleSaveNewArea}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={handleCancelAdd}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.addButton} testID="add-area-button" onPress={handleAddPress}>
          <Text style={styles.addButtonText}>Add Area</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  areaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  areaName: {
    fontSize: 16,
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addForm: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 8,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
