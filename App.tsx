import { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useAppInitialization } from './src/hooks/useAppInitialization';
import { useAuth } from './src/hooks/useAuth';
import { createAuthService, AuthService } from './src/auth/AuthService';
import { ServiceProvider } from './src/ui/ServiceProvider';
import { AppShell } from './src/ui/AppShell';
import { LoadingScreen } from './src/ui/LoadingScreen';
import { LoginScreen } from './src/ui/LoginScreen';

export default function App() {
  const authServiceRef = useRef<AuthService>(createAuthService());
  const { user, loading, signIn, signUp } = useAuth(
    authServiceRef.current,
  );

  const { isReady, services } = useAppInitialization(
    user ? user : undefined,
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen signIn={signIn} signUp={signUp} />;
  }

  if (!isReady || services === null) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ServiceProvider
        stapleLibrary={services.stapleLibrary}
        tripService={services.tripService}
        areaManagement={services.areaManagement}
        sectionOrderStorage={services.sectionOrderStorage}
      >
        <AppShell />
      </ServiceProvider>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
