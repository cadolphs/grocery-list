import { useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import { AuthService } from '../auth/AuthService';

interface LoginScreenProps {
  auth: AuthService;
  onLoginSuccess: () => void;
}

export function LoginScreen({ auth, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const result = await auth.signIn(email, password);
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <View>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text>{error}</Text>}
      <Pressable onPress={handleLogin}>
        <Text>Log In</Text>
      </Pressable>
    </View>
  );
}
