import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking, StyleSheet, View } from 'react-native';
import { useAppInitialization } from './src/hooks/useAppInitialization';
import { useAuth } from './src/hooks/useAuth';
import { createAuthService, AuthService } from './src/auth/AuthService';
import { ServiceProvider } from './src/ui/ServiceProvider';
import { AppShell } from './src/ui/AppShell';
import { LoadingScreen } from './src/ui/LoadingScreen';
import { LoginScreen } from './src/ui/LoginScreen';

const useDeepLinkHandler = (
  handleSignInLink: (url: string) => Promise<unknown>,
) => {
  useEffect(() => {
    // Check initial URL on app launch
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleSignInLink(url);
      }
    });

    // Listen for incoming URLs while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleSignInLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleSignInLink]);
};

export default function App() {
  const authServiceRef = useRef<AuthService>(createAuthService());
  const { user, loading, sendSignInLink, handleSignInLink, signOut } = useAuth(
    authServiceRef.current,
  );

  useDeepLinkHandler(handleSignInLink);

  const { isReady, services } = useAppInitialization(
    user ? user : undefined,
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen sendSignInLink={sendSignInLink} />;
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
