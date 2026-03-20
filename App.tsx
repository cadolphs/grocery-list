import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useAppInitialization } from './src/hooks/useAppInitialization';
import { ServiceProvider } from './src/ui/ServiceProvider';
import { AppShell } from './src/ui/AppShell';
import { LoadingScreen } from './src/ui/LoadingScreen';

export default function App() {
  const { isReady, services, error } = useAppInitialization();

  if (!isReady || services === null) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ServiceProvider
        stapleLibrary={services.stapleLibrary}
        tripService={services.tripService}
        areaManagement={services.areaManagement}
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
