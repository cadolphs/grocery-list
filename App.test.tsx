import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';

beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('App', () => {
  test('shows loading screen during initialization', () => {
    const { getByText } = render(<App />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  test('renders app shell after initialization completes', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });
  });
});
