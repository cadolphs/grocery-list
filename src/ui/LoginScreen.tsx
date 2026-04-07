import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { AuthResult } from '../auth/AuthService';

type ScreenState =
  | { kind: 'initial' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

interface LoginScreenProps {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
}

export const LoginScreen = ({ signIn, signUp }: LoginScreenProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'initial' });

  const handleSignIn = async () => {
    if (!email.trim()) {
      setScreenState({ kind: 'error', message: 'Please enter your email address' });
      return;
    }

    setScreenState({ kind: 'submitting' });
    const result = await signIn(email, password);

    if (result.success) {
      setScreenState({ kind: 'initial' });
    } else {
      setScreenState({ kind: 'error', message: result.error || 'Failed to sign in' });
    }
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
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </Text>
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
});
