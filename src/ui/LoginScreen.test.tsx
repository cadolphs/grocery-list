import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { AuthResult } from '../auth/AuthService';

const createMockSendSignInLink = (result: AuthResult = { success: true }) => {
  return jest.fn().mockResolvedValue(result);
};

describe('LoginScreen', () => {
  test('renders email input and send link button', () => {
    const sendSignInLink = createMockSendSignInLink();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByText('Send Sign-In Link')).toBeTruthy();
  });

  test('calls sendSignInLink with email when button is pressed', async () => {
    const sendSignInLink = createMockSendSignInLink();
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.press(getByText('Send Sign-In Link'));

    await waitFor(() => {
      expect(sendSignInLink).toHaveBeenCalledWith('user@example.com');
    });
  });

  test('shows confirmation message after successful send', async () => {
    const sendSignInLink = createMockSendSignInLink({ success: true });
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.press(getByText('Send Sign-In Link'));

    await waitFor(() => {
      expect(
        getByText('Check your email! We sent a sign-in link to user@example.com.')
      ).toBeTruthy();
    });
  });

  test('shows error message when sendSignInLink fails', async () => {
    const sendSignInLink = createMockSendSignInLink({
      success: false,
      error: 'Network error',
    });
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.press(getByText('Send Sign-In Link'));

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  test('shows error when email is empty', async () => {
    const sendSignInLink = createMockSendSignInLink();
    const { getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    fireEvent.press(getByText('Send Sign-In Link'));

    await waitFor(() => {
      expect(getByText('Please enter your email address')).toBeTruthy();
    });
    expect(sendSignInLink).not.toHaveBeenCalled();
  });

  test('disables button and shows sending state while in progress', async () => {
    let resolvePromise: (value: AuthResult) => void;
    const sendSignInLink = jest.fn().mockImplementation(
      () => new Promise<AuthResult>((resolve) => { resolvePromise = resolve; })
    );
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen sendSignInLink={sendSignInLink} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com');
    fireEvent.press(getByText('Send Sign-In Link'));

    await waitFor(() => {
      expect(getByText('Sending...')).toBeTruthy();
    });

    resolvePromise!({ success: true });

    await waitFor(() => {
      expect(
        getByText('Check your email! We sent a sign-in link to user@example.com.')
      ).toBeTruthy();
    });
  });
});
