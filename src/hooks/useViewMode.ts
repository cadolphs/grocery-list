// useViewMode - simple state hook for toggling between home and store views

import { useState } from 'react';

export type ViewMode = 'home' | 'store';

export type UseViewModeResult = {
  readonly viewMode: ViewMode;
  readonly toggleViewMode: () => void;
};

export const useViewMode = (): UseViewModeResult => {
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  const toggleViewMode = (): void => {
    setViewMode((current) => (current === 'home' ? 'store' : 'home'));
  };

  return { viewMode, toggleViewMode };
};
