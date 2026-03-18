// ServiceProvider - React Context for dependency injection
// Provides domain services to the component tree

import React, { createContext, useContext } from 'react';
import { StapleLibrary } from '../domain/staple-library';
import { TripService } from '../domain/trip';

export type ServiceContextValue = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
};

export const ServiceContext = createContext<ServiceContextValue | null>(null);

export const useServices = (): ServiceContextValue => {
  const context = useContext(ServiceContext);
  if (context === null) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

type ServiceProviderProps = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
  readonly children: React.ReactNode;
};

export const ServiceProvider = ({
  stapleLibrary,
  tripService,
  children,
}: ServiceProviderProps): React.JSX.Element => (
  <ServiceContext.Provider value={{ stapleLibrary, tripService }}>
    {children}
  </ServiceContext.Provider>
);
