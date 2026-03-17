import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { createNullAuthService } from '../auth/AuthService';

describe('LoginScreen', () => {
  test('renders email input', () => {
    const auth = createNullAuthService();
    const { getByPlaceholderText } = render(
      <LoginScreen auth={auth} onLoginSuccess={() => {}} />
    );
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });

  test('renders password input', () => {
    const auth = createNullAuthService();
    const { getByPlaceholderText } = render(
      <LoginScreen auth={auth} onLoginSuccess={() => {}} />
    );
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  test('renders login button', () => {
    const auth = createNullAuthService();
    const { getByText } = render(
      <LoginScreen auth={auth} onLoginSuccess={() => {}} />
    );
    expect(getByText('Log In')).toBeTruthy();
  });

  test('calls onLoginSuccess after successful login', async () => {
    const auth = createNullAuthService();
    const onLoginSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen auth={auth} onLoginSuccess={onLoginSuccess} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  test('shows error message on failed login', async () => {
    const auth = createNullAuthService();
    const onLoginSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen auth={auth} onLoginSuccess={onLoginSuccess} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'short'); // Too short
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Invalid password')).toBeTruthy();
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
