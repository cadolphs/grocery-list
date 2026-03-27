import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { AuthResult } from '../auth/AuthService';

type ScreenState =
  | { kind: 'initial' }
  | { kind: 'sending' }
  | { kind: 'success'; email: string }
  | { kind: 'error'; message: string };

interface LoginScreenProps {
  sendSignInLink: (email: string) => Promise<AuthResult>;
}

export const LoginScreen = ({ sendSignInLink }: LoginScreenProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'initial' });

  const handleSendLink = async () => {
    if (!email.trim()) {
      setScreenState({ kind: 'error', message: 'Please enter your email address' });
      return;
    }

    setScreenState({ kind: 'sending' });
    const result = await sendSignInLink(email);

    if (result.success) {
      setScreenState({ kind: 'success', email });
    } else {
      setScreenState({ kind: 'error', message: result.error || 'Failed to send sign-in link' });
    }
  };

  const isSending = screenState.kind === 'sending';

  return (
    <View style={styles.container}>
      {screenState.kind === 'success' ? (
        <Text style={styles.successText}>
          Check your email! We sent a sign-in link to {screenState.email}.
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isSending}
          />
          {screenState.kind === 'error' && (
            <Text style={styles.errorText}>{screenState.message}</Text>
          )}
          <Pressable
            style={[styles.button, isSending && styles.buttonDisabled]}
            onPress={handleSendLink}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>
              {isSending ? 'Sending...' : 'Send Sign-In Link'}
            </Text>
          </Pressable>
        </>
      )}
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
  successText: {
    fontSize: 16,
    color: '#2e7d32',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 12,
  },
});
