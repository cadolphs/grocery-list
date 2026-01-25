import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GroceryList } from './src/components/GroceryList';

export default function App() {
  return (
    <View style={styles.container}>
      <GroceryList />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
