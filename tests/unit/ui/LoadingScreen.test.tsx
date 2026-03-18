import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingScreen } from '../../../src/ui/LoadingScreen';

describe('LoadingScreen', () => {
  it('displays loading text', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
