import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { AuthResult } from '../auth/AuthService';

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

export const LoginScreen = ({ signIn, signUp }: LoginScreenProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'initial' });
  const [mode, setMode] = useState<AuthMode>('signIn');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setScreenState({ kind: 'error', message: 'Please enter your email address' });
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!isValidEmail) {
      setScreenState({ kind: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (mode === 'signUp' && password.length < 8) {
      setScreenState({ kind: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    setScreenState({ kind: 'submitting' });
    const action = mode === 'signUp' ? signUp : signIn;
    const result = await action(email, password);

    if (result.success) {
      setScreenState({ kind: 'initial' });
    } else {
      const fallback = mode === 'signUp' ? 'Failed to sign up' : 'Failed to sign in';
      setScreenState({ kind: 'error', message: result.error || fallback });
    }
  };

  const toggleMode = () => {
    setMode(current => (current === 'signIn' ? 'signUp' : 'signIn'));
    setScreenState({ kind: 'initial' });
  };

  const isSubmitting = screenState.kind === 'submitting';

  return (
    <View style={styles.container}>
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
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {submitLabel(mode, isSubmitting)}
        </Text>
      </Pressable>
      <Pressable onPress={toggleMode} disabled={isSubmitting}>
        <Text style={styles.toggleText}>{toggleLabel(mode)}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 12,
  },
  toggleText: {
    color: '#2196F3',
    fontSize: 14,
    marginTop: 16,
  },
});
