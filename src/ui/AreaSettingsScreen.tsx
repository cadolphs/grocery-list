// AreaSettingsScreen - displays and manages house areas
// Shows list of configured areas with Add/Edit/Delete functionality

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useAreas } from '../hooks/useAreas';
import { useServices } from './ServiceProvider';

type DeleteState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'confirm-empty'; readonly areaName: string }
  | { readonly kind: 'reassign'; readonly areaName: string; readonly stapleCount: number; readonly selectedTarget: string | null }
  | { readonly kind: 'blocked'; readonly message: string };

export const AreaSettingsScreen = (): React.JSX.Element => {
  const { areas, addArea, renameArea, deleteArea } = useAreas();
  const { stapleLibrary } = useServices();
  const [isAdding, setIsAdding] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ kind: 'idle' });

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

  const handleEditPress = (area: string) => {
    setEditingArea(area);
    setEditName(area);
    setEditError(null);
  };

  const handleSaveRename = () => {
    if (editingArea === null) return;
    const result = renameArea(editingArea, editName);
    if (result.success) {
      setEditingArea(null);
      setEditName('');
      setEditError(null);
    } else {
      setEditError(result.error);
    }
  };

  const handleCancelEdit = () => {
    setEditingArea(null);
    setEditName('');
    setEditError(null);
  };

  const handleDeletePress = (area: string) => {
    // Check if last area
    if (areas.length <= 1) {
      setDeleteState({ kind: 'blocked', message: 'Cannot delete: at least one area must remain' });
      return;
    }

    // Check staple count
    const staplesInArea = stapleLibrary.listByArea(area);
    if (staplesInArea.length > 0) {
      setDeleteState({ kind: 'reassign', areaName: area, stapleCount: staplesInArea.length, selectedTarget: null });
    } else {
      setDeleteState({ kind: 'confirm-empty', areaName: area });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteState.kind === 'confirm-empty') {
      deleteArea(deleteState.areaName);
      setDeleteState({ kind: 'idle' });
    }
  };

  const handleSelectReassignTarget = (target: string) => {
    if (deleteState.kind === 'reassign') {
      setDeleteState({ ...deleteState, selectedTarget: target });
    }
  };

  const handleConfirmDeleteAndMove = () => {
    if (deleteState.kind === 'reassign' && deleteState.selectedTarget) {
      deleteArea(deleteState.areaName, { reassignTo: deleteState.selectedTarget });
      setDeleteState({ kind: 'idle' });
    }
  };

  const handleDismissDelete = () => {
    setDeleteState({ kind: 'idle' });
  };

  const renderAreaRow = (area: string) => {
    if (editingArea === area) {
      return (
        <View key={area} style={styles.areaCard}>
          <View style={styles.editForm}>
            <TextInput
              testID="rename-area-input"
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            {editError && <Text style={styles.errorText}>{editError}</Text>}
            <View style={styles.formButtons}>
              <Pressable style={styles.saveButton} onPress={handleSaveRename}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={area} style={styles.areaCard}>
        <Text style={styles.areaName}>{area}</Text>
        <View style={styles.rowActions}>
          <Pressable testID={`edit-area-${area}`} onPress={() => handleEditPress(area)}>
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable testID={`delete-area-${area}`} onPress={() => handleDeletePress(area)}>
            <Text style={styles.deleteActionText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderDeleteDialog = () => {
    if (deleteState.kind === 'idle') return null;

    if (deleteState.kind === 'blocked') {
      return (
        <View style={styles.deleteDialog}>
          <Text style={styles.errorText}>{deleteState.message}</Text>
          <Pressable style={styles.cancelButton} onPress={handleDismissDelete}>
            <Text style={styles.cancelButtonText}>OK</Text>
          </Pressable>
        </View>
      );
    }

    if (deleteState.kind === 'confirm-empty') {
      return (
        <View style={styles.deleteDialog}>
          <Text style={styles.deleteDialogText}>Delete {deleteState.areaName}?</Text>
          <View style={styles.formButtons}>
            <Pressable style={styles.deleteConfirmButton} testID="confirm-delete-button" onPress={handleConfirmDelete}>
              <Text style={styles.saveButtonText}>Delete</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={handleDismissDelete}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (deleteState.kind === 'reassign') {
      const otherAreas = areas.filter(a => a !== deleteState.areaName);
      return (
        <View style={styles.deleteDialog}>
          <Text style={styles.deleteDialogText}>
            {deleteState.stapleCount} staples in {deleteState.areaName}. Move to:
          </Text>
          {otherAreas.map(target => (
            <Pressable
              key={target}
              testID={`reassign-to-${target}`}
              style={[
                styles.reassignOption,
                deleteState.selectedTarget === target && styles.reassignOptionSelected,
              ]}
              onPress={() => handleSelectReassignTarget(target)}
            >
              <Text style={styles.reassignOptionText}>{target}</Text>
            </Pressable>
          ))}
          <View style={styles.formButtons}>
            <Pressable
              style={[styles.deleteConfirmButton, !deleteState.selectedTarget && styles.disabledButton]}
              testID="confirm-delete-and-move-button"
              onPress={handleConfirmDeleteAndMove}
            >
              <Text style={styles.saveButtonText}>Delete and Move</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={handleDismissDelete}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <ScrollView testID="area-settings-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>House Areas</Text>
      {areas.map(renderAreaRow)}
      {renderDeleteDialog()}
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
  rowActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    flex: 1,
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
  deleteDialog: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  deleteDialogText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
  },
  deleteConfirmButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  reassignOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  reassignOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  reassignOptionText: {
    fontSize: 14,
    color: '#333333',
  },
});
