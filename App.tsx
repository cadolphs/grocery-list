import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppInitialization } from './src/hooks/useAppInitialization';
import { useAuth } from './src/hooks/useAuth';
import { createAuthService } from './src/auth/AuthService';
import { ServiceProvider } from './src/ui/ServiceProvider';
import { AppShell } from './src/ui/AppShell';
import { LoadingScreen } from './src/ui/LoadingScreen';
import { LoginScreen } from './src/ui/LoginScreen';

export default function App() {
  const authService = useMemo(() => createAuthService(), []);
  const { user, loading, signIn, signUp } = useAuth(
    authService,
  );

  const { isReady, services } = useAppInitialization(
    user ? user : undefined,
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen signIn={signIn} signUp={signUp} />
      </SafeAreaProvider>
    );
  }

  if (!isReady || services === null) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
