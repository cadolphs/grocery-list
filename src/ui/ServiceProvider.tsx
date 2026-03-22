// ServiceProvider - React Context for dependency injection
// Provides domain services to the component tree

import React, { createContext, useContext, useMemo } from 'react';
import { StapleLibrary } from '../domain/staple-library';
import { TripService } from '../domain/trip';
import { AreaManagement, createAreaManagement } from '../domain/area-management';
import { SectionOrderStorage } from '../ports/section-order-storage';
import { createNullAreaStorage } from '../adapters/null/null-area-storage';
import { createNullStapleStorage } from '../adapters/null/null-staple-storage';
import { createNullTripStorage } from '../adapters/null/null-trip-storage';
import { createNullSectionOrderStorage } from '../adapters/null/null-section-order-storage';

export type ServiceContextValue = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
  readonly areaManagement: AreaManagement;
  readonly sectionOrderStorage: SectionOrderStorage;
};

export const ServiceContext = createContext<ServiceContextValue | null>(null);

export const useServices = (): ServiceContextValue => {
  const context = useContext(ServiceContext);
  if (context === null) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

const createDefaultAreaManagement = (): AreaManagement =>
  createAreaManagement(
    createNullAreaStorage(),
    createNullStapleStorage([]),
    createNullTripStorage(),
  );

type ServiceProviderProps = {
  readonly stapleLibrary: StapleLibrary;
  readonly tripService: TripService;
  readonly areaManagement?: AreaManagement;
  readonly sectionOrderStorage?: SectionOrderStorage;
  readonly children: React.ReactNode;
};

export const ServiceProvider = ({
  stapleLibrary,
  tripService,
  areaManagement,
  sectionOrderStorage,
  children,
}: ServiceProviderProps): React.JSX.Element => {
  const resolvedAreaManagement = useMemo(
    () => areaManagement ?? createDefaultAreaManagement(),
    [areaManagement],
  );

  const resolvedSectionOrderStorage = useMemo(
    () => sectionOrderStorage ?? createNullSectionOrderStorage(),
    [sectionOrderStorage],
  );

  return (
    <ServiceContext.Provider value={{ stapleLibrary, tripService, areaManagement: resolvedAreaManagement, sectionOrderStorage: resolvedSectionOrderStorage }}>
      {children}
    </ServiceContext.Provider>
  );
};
