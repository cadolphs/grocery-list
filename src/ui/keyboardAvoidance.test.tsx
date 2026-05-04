// Regression: Android soft keyboard overlays bottom-anchored TextInputs.
// Root cause: no KeyboardAvoidingView in modal/form components combined with
// edgeToEdgeEnabled=true (app.json) which disables Android's implicit
// adjustResize handling. Forms must wrap their content in
// KeyboardAvoidingView so the input shifts above the keyboard.
//
// These tests assert the wrapper is present with platform-correct `behavior`.
// They will FAIL against the pre-fix code where no KeyboardAvoidingView is
// rendered in any of the three forms below.

import React from 'react';
import { render } from '@testing-library/react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { LoginScreen } from './LoginScreen';
import { MetadataBottomSheet } from './MetadataBottomSheet';
import { AreaSettingsScreen } from './AreaSettingsScreen';

jest.mock('../hooks/useAreas', () => ({
  useAreas: () => ({
    areas: ['Kitchen Cabinets', 'Pantry'],
    addArea: jest.fn(),
    renameArea: jest.fn(),
    deleteArea: jest.fn(),
  }),
}));

jest.mock('./ServiceProvider', () => ({
  useServices: () => ({
    stapleLibrary: { listByArea: () => [] },
  }),
}));

const expectedBehavior = (): 'padding' | 'height' =>
  Platform.OS === 'ios' ? 'padding' : 'height';

describe('keyboard avoidance — forms wrap content in KeyboardAvoidingView', () => {
  test('LoginScreen renders KeyboardAvoidingView with platform-correct behavior', () => {
    const screen = render(
      <LoginScreen signIn={jest.fn()} signUp={jest.fn()} />
    );
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav).toBeTruthy();
    expect(kav.props.behavior).toBe(expectedBehavior());
  });

  test('MetadataBottomSheet renders KeyboardAvoidingView with platform-correct behavior', () => {
    const screen = render(
      <MetadataBottomSheet
        visible={true}
        itemName="milk"
        areas={['Kitchen Cabinets']}
        onDismiss={jest.fn()}
        onSubmitStaple={jest.fn()}
        onSubmitTripItem={jest.fn()}
      />
    );
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav).toBeTruthy();
    expect(kav.props.behavior).toBe(expectedBehavior());
  });

  test('AreaSettingsScreen renders KeyboardAvoidingView with platform-correct behavior', () => {
    const screen = render(<AreaSettingsScreen />);
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav).toBeTruthy();
    expect(kav.props.behavior).toBe(expectedBehavior());
  });
});
