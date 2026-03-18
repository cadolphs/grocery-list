import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useTrip } from '../../../src/hooks/useTrip';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';
import { createStapleLibrary } from '../../../src/domain/staple-library';
import { createTrip } from '../../../src/domain/trip';
import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';

const createTestWrapper = () => {
  const stapleStorage = createNullStapleStorage([
    { name: 'Whole milk', houseArea: 'Fridge', storeLocation: { section: 'Dairy', aisleNumber: 3 } },
  ]);
  const library = createStapleLibrary(stapleStorage);
  const tripStorage = createNullTripStorage();
  const tripService = createTrip(tripStorage);
  tripService.start(library.listAll());

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ServiceProvider stapleLibrary={library} tripService={tripService}>
      {children}
    </ServiceProvider>
  );

  return { wrapper, tripService };
};

describe('useTrip', () => {
  it('returns trip items from the service context', () => {
    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useTrip(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Whole milk');
  });
});
