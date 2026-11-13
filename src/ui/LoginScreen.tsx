import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AuthResult } from '../auth/AuthService';
import { theme } from './theme';
import { pressedBlock, surfaces } from './surfaces';

type ScreenState =
  | { kind: 'initial' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

type AuthMode = 'signIn' | 'signUp';

interface LoginScreenProps {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
}

const submitLabel = (mode: AuthMode, isSubmitting: boolean): string => {
  if (mode === 'signUp') return isSubmitting ? 'Signing Up...' : 'Sign Up';
  return isSubmitting ? 'Signing In...' : 'Sign In';
};

const toggleLabel = (mode: AuthMode): string =>
  mode === 'signIn'
    ? "Don't have an account? Sign Up"
    : 'Already have an account? Sign In';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateFormInput = (
  email: string,
  password: string,
  mode: AuthMode,
): string | null => {
  if (!email.trim()) return 'Please enter your email address';
  if (!EMAIL_PATTERN.test(email.trim()))
    return 'Please enter a valid email address.';
  if (mode === 'signUp' && password.length < 8)
    return 'Password must be at least 8 characters.';
  return null;
};

const fallbackErrorMessage = (mode: AuthMode): string =>
  mode === 'signUp' ? 'Failed to sign up' : 'Failed to sign in';

export const LoginScreen = ({
  signIn,
  signUp,
}: LoginScreenProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>({
    kind: 'initial',
  });
  const [mode, setMode] = useState<AuthMode>('signIn');

  const handleSubmit = async () => {
    const validationError = validateFormInput(email, password, mode);
    if (validationError) {
      setScreenState({ kind: 'error', message: validationError });
      return;
    }

    setScreenState({ kind: 'submitting' });
    const action = mode === 'signUp' ? signUp : signIn;
    const result = await action(email, password);

    if (result.success) {
      setScreenState({ kind: 'initial' });
    } else {
      setScreenState({
        kind: 'error',
        message: result.error || fallbackErrorMessage(mode),
      });
    }
  };

  const toggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setScreenState({ kind: 'initial' });
  };

  const isSubmitting = screenState.kind === 'submitting';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
      />
      {screenState.kind === 'error' && (
        <Text style={styles.errorText}>{screenState.message}</Text>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          isSubmitting && styles.buttonDisabled,
          pressedBlock(pressed),
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>{submitLabel(mode, isSubmitting)}</Text>
      </Pressable>
      <Pressable onPress={toggleMode} disabled={isSubmitting}>
        <Text style={styles.toggleText}>{toggleLabel(mode)}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.ground,
    padding: theme.space.xl,
  },
  input: {
    ...surfaces.input,
    width: '100%',
    maxWidth: 320,
    padding: theme.space.md,
    fontSize: theme.font.size.md,
    color: theme.color.text,
    marginBottom: theme.space.lg,
  },
  button: {
    ...surfaces.primaryButton,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.color.onAccent,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
  },
  errorText: {
    fontSize: theme.font.size.sm,
    color: theme.color.danger,
    marginBottom: theme.space.md,
  },
  toggleText: {
    textDecorationLine: 'underline',
    color: theme.color.text,
    fontSize: theme.font.size.sm,
    marginTop: theme.space.lg,
  },
});
