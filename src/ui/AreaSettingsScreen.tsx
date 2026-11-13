// AreaSettingsScreen - displays and manages house areas
// Shows list of configured areas with Add/Edit/Delete functionality

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAreas } from '../hooks/useAreas';
import { useServices } from './ServiceProvider';
import { theme } from './theme';
import { pressedBlock, surfaces, linkHit } from './surfaces';

type DeleteState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'confirm-empty'; readonly areaName: string }
  | {
      readonly kind: 'reassign';
      readonly areaName: string;
      readonly stapleCount: number;
      readonly selectedTarget: string | null;
    }
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
      setDeleteState({
        kind: 'blocked',
        message: 'Cannot delete: at least one area must remain',
      });
      return;
    }

    // Check staple count
    const staplesInArea = stapleLibrary.listByArea(area);
    if (staplesInArea.length > 0) {
      setDeleteState({
        kind: 'reassign',
        areaName: area,
        stapleCount: staplesInArea.length,
        selectedTarget: null,
      });
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
      deleteArea(deleteState.areaName, {
        reassignTo: deleteState.selectedTarget,
      });
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
          <Pressable
            hitSlop={linkHit}
            testID={`edit-area-${area}`}
            onPress={() => handleEditPress(area)}
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable
            hitSlop={linkHit}
            testID={`delete-area-${area}`}
            onPress={() => handleDeletePress(area)}
          >
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
          <Text style={styles.deleteDialogText}>
            Delete {deleteState.areaName}?
          </Text>
          <View style={styles.formButtons}>
            <Pressable
              style={styles.deleteConfirmButton}
              testID="confirm-delete-button"
              onPress={handleConfirmDelete}
            >
              <Text style={styles.saveButtonText}>Delete</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={handleDismissDelete}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (deleteState.kind === 'reassign') {
      const otherAreas = areas.filter((a) => a !== deleteState.areaName);
      return (
        <View style={styles.deleteDialog}>
          <Text style={styles.deleteDialogText}>
            {deleteState.stapleCount} staples in {deleteState.areaName}. Move
            to:
          </Text>
          {otherAreas.map((target) => (
            <Pressable
              key={target}
              testID={`reassign-to-${target}`}
              style={[
                styles.reassignOption,
                deleteState.selectedTarget === target &&
                  styles.reassignOptionSelected,
              ]}
              onPress={() => handleSelectReassignTarget(target)}
            >
              <Text style={styles.reassignOptionText}>{target}</Text>
            </Pressable>
          ))}
          <View style={styles.formButtons}>
            <Pressable
              style={[
                styles.deleteConfirmButton,
                !deleteState.selectedTarget && styles.disabledButton,
              ]}
              testID="confirm-delete-and-move-button"
              onPress={handleConfirmDeleteAndMove}
            >
              <Text style={styles.saveButtonText}>Delete and Move</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={handleDismissDelete}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.kbAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        testID="area-settings-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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
          <Pressable
            style={({ pressed }) => [styles.addButton, pressedBlock(pressed)]}
            testID="add-area-button"
            onPress={handleAddPress}
          >
            <Text style={styles.addButtonText}>Add Area</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kbAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.space.lg,
  },
  header: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
    marginBottom: theme.space.lg,
  },
  areaCard: {
    ...surfaces.card,
    padding: theme.space.lg,
    marginBottom: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  areaName: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
  },
  rowActions: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
  actionText: {
    textDecorationLine: 'underline',
    color: theme.color.text,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
  },
  deleteActionText: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
  },
  editForm: {
    flex: 1,
  },
  addButton: {
    ...surfaces.primaryButton,
    padding: 14,
    alignItems: 'center',
    marginTop: theme.space.sm,
  },
  addButtonText: {
    color: theme.color.onAccent,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
  },
  addForm: {
    ...surfaces.card,
    padding: theme.space.lg,
    marginTop: theme.space.sm,
  },
  nameInput: {
    ...surfaces.input,
    padding: 10,
    fontSize: theme.font.size.md,
    marginBottom: theme.space.sm,
    color: theme.color.text,
  },
  errorText: {
    color: theme.color.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.space.sm,
  },
  formButtons: {
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  saveButton: {
    ...surfaces.darkButton,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: theme.color.inverseText,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
  },
  cancelButton: {
    ...surfaces.secondaryButton,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: theme.color.text,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
  },
  deleteDialog: {
    ...surfaces.dialog,
    padding: theme.space.lg,
    marginBottom: theme.space.sm,
  },
  deleteDialogText: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
    marginBottom: theme.space.md,
  },
  deleteConfirmButton: {
    ...surfaces.dangerButton,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  reassignOption: {
    ...surfaces.input,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
  reassignOptionSelected: {
    backgroundColor: theme.color.accentSoft,
  },
  reassignOptionText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
  },
});
