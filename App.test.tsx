import { render } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  test('displays the grocery list', () => {
    const { getByText } = render(<App />);
    expect(getByText('Milk')).toBeTruthy();
  });
});
