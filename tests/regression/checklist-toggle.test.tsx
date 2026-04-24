// Regression: HomeView shows Sweep/Checklist toggle
// Feature: toggle between sweep mode and checklist mode

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ServiceProvider } from '../../src/ui/ServiceProvider';
import { AppShell } from '../../src/ui/AppShell';
import { createStapleLibrary } from '../../src/domain/staple-library';
import { createNullStapleStorage } from '../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../src/adapters/null/null-trip-storage';
import { createTrip } from '../../src/domain/trip';

function renderApp() {
  const stapleStorage = createNullStapleStorage([
    { name: 'Milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const stapleLibrary = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(stapleLibrary.listAll());

  return render(
    <ServiceProvider stapleLibrary={stapleLibrary} tripService={tripService}>
      <AppShell />
    </ServiceProvider>
  );
}

describe('home view has sweep checklist toggle', () => {
  it('shows Sweep and Checklist toggle options', () => {
    renderApp();

    expect(screen.getByTestId('home-mode-sweep')).toBeTruthy();
    expect(screen.getByTestId('home-mode-checklist')).toBeTruthy();
  });

  it('defaults to Sweep mode being active', () => {
    renderApp();

    const sweepButton = screen.getByTestId('home-mode-sweep');
    const checklistButton = screen.getByTestId('home-mode-checklist');

    expect(sweepButton).toHaveStyle({ backgroundColor: '#1A1A1A' });
    expect(checklistButton).not.toHaveStyle({ backgroundColor: '#1A1A1A' });
  });

  it('switches to Checklist mode when Checklist is tapped', () => {
    renderApp();

    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    const sweepButton = screen.getByTestId('home-mode-sweep');
    const checklistButton = screen.getByTestId('home-mode-checklist');

    expect(checklistButton).toHaveStyle({ backgroundColor: '#1A1A1A' });
    expect(sweepButton).not.toHaveStyle({ backgroundColor: '#1A1A1A' });
  });

  it('switches back to Sweep mode when Sweep is tapped', () => {
    renderApp();

    // Switch to checklist first
    fireEvent.press(screen.getByTestId('home-mode-checklist'));
    // Switch back to sweep
    fireEvent.press(screen.getByTestId('home-mode-sweep'));

    const sweepButton = screen.getByTestId('home-mode-sweep');
    const checklistButton = screen.getByTestId('home-mode-checklist');

    expect(sweepButton).toHaveStyle({ backgroundColor: '#1A1A1A' });
    expect(checklistButton).not.toHaveStyle({ backgroundColor: '#1A1A1A' });
  });
});

describe('checklist mode shows alphabetic list and quick add', () => {
  it('in checklist mode: StapleChecklist is visible, area sections and sweep progress are not', () => {
    renderApp();

    // Switch to checklist mode
    fireEvent.press(screen.getByTestId('home-mode-checklist'));

    // StapleChecklist should be visible (staple-row for Milk from renderApp setup)
    expect(screen.getByTestId('staple-row-Milk')).toBeTruthy();

    // Sweep progress text should NOT be visible
    expect(screen.queryByText(/areas complete/)).toBeNull();

    // Area sections should NOT be visible (complete buttons won't exist)
    expect(screen.queryAllByTestId(/^complete-/).length).toBe(0);

    // Reset sweep button should NOT be visible
    expect(screen.queryByTestId('reset-sweep-button')).toBeNull();
  });

  it('in sweep mode: area sections visible, StapleChecklist not visible', () => {
    renderApp();

    // Default is sweep mode -- area sections should be visible (complete buttons exist)
    expect(screen.queryAllByTestId(/^complete-/).length).toBeGreaterThan(0);

    // Sweep progress should be visible
    expect(screen.getByText(/areas complete/)).toBeTruthy();

    // StapleChecklist should NOT be visible
    expect(screen.queryByTestId('staple-row-Milk')).toBeNull();
  });
});
