// Migration service: transfers data from AsyncStorage to Firestore on first sign-in

import { StapleStorage } from '../../ports/staple-storage';
import { AreaStorage } from '../../ports/area-storage';
import { SectionOrderStorage } from '../../ports/section-order-storage';
import { TripStorage } from '../../ports/trip-storage';

type StorageAdapters = {
  readonly staples: StapleStorage;
  readonly areas: AreaStorage;
  readonly sectionOrder: SectionOrderStorage;
};

export const migrationNeeded = (firestoreStaples: StapleStorage): boolean =>
  firestoreStaples.loadAll().length === 0;

const migrateStaples = (from: StapleStorage, to: StapleStorage): void => {
  from.loadAll().forEach((staple) => to.save(staple));
};

const migrateAreas = (from: AreaStorage, to: AreaStorage): void => {
  const areas = from.loadAll();
  if (areas.length > 0) {
    to.saveAll(areas);
  }
};

const migrateSectionOrder = (from: SectionOrderStorage, to: SectionOrderStorage): void => {
  const order = from.loadOrder();
  if (order !== null) {
    to.saveOrder(order);
  }
};

export const migrateToFirestore = (from: StorageAdapters, to: StorageAdapters): void => {
  migrateStaples(from.staples, to.staples);
  migrateAreas(from.areas, to.areas);
  migrateSectionOrder(from.sectionOrder, to.sectionOrder);
};

export const migrateTripIfNeeded = (localTrip: TripStorage, cloudTrip: TripStorage): void => {
  const cloudData = cloudTrip.loadTrip();
  if (cloudData !== null) return;

  const localData = localTrip.loadTrip();
  if (localData !== null) {
    cloudTrip.saveTrip(localData);
  }

  const localCarryover = localTrip.loadCarryover();
  if (localCarryover.length > 0) {
    cloudTrip.saveCarryover(localCarryover);
  }
};
