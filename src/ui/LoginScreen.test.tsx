import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { AuthResult } from '../auth/AuthService';

const createMockSignIn = (result: AuthResult = { success: true }) => {
  return jest.fn().mockResolvedValue(result);
};

const createMockSignUp = (result: AuthResult = { success: true }) => {
  return jest.fn().mockResolvedValue(result);
};

describe('LoginScreen', () => {
  test('renders email input, password input, and sign in button', () => {
    const signIn = createMockSignIn();
    const signUp = createMockSignUp();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen signIn={signIn} signUp={signUp} />
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  test('calls signIn with email and password when button is pressed', async () => {
    const signIn = createMockSignIn();
    const signUp = createMockSignUp();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen signIn={signIn} signUp={signUp} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'MyPassword123!');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('user@example.com', 'MyPassword123!');
    });
  });

  test('shows error message when signIn fails', async () => {
    const signIn = createMockSignIn({
      success: false,
      error: 'Invalid credentials',
    });
    const signUp = createMockSignUp();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen signIn={signIn} signUp={signUp} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  test('shows error when email is empty', async () => {
    const signIn = createMockSignIn();
    const signUp = createMockSignUp();
    const { getByText } = render(
      <LoginScreen signIn={signIn} signUp={signUp} />
    );

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Please enter your email address')).toBeTruthy();
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  test('disables button and shows submitting state while in progress', async () => {
    let resolvePromise: (value: AuthResult) => void;
    const signIn = jest.fn().mockImplementation(
      () => new Promise<AuthResult>((resolve) => { resolvePromise = resolve; })
    );
    const signUp = createMockSignUp();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen signIn={signIn} signUp={signUp} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'MyPassword123!');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Signing In...')).toBeTruthy();
    });

    resolvePromise!({ success: true });

    await waitFor(() => {
      expect(getByText('Sign In')).toBeTruthy();
    });
  });
});
