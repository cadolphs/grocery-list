// Domain types - Grocery Smart List

export type HouseArea = string;

export type StoreLocation = {
  readonly section: string;
  readonly aisleNumber: number | null;
};

export type ItemType = 'staple' | 'one-off';

export type LibraryItem = {
  readonly id: string;
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
  readonly type: 'staple' | 'one-off';
  readonly createdAt: string;
};

export type AddStapleRequest = {
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
};

export type AddOneOffRequest = {
  readonly name: string;
  readonly storeLocation: StoreLocation;
};

export type AddLibraryItemResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

// Trip domain types

// A staple's sweep status on the current trip (ADR-013, GLOSSARY.md).
export type SweepDecision = 'undecided' | 'needed' | 'not-needed';

export type ItemSource = 'preloaded' | 'quick-add' | 'carryover';

export type TripItem = {
  readonly id: string;
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
  readonly itemType: ItemType;
  readonly stapleId: string | null;
  readonly source: ItemSource;
  readonly decision: SweepDecision;
  readonly inCart: boolean;
  readonly inCartAt: string | null;
};

export type AddTripItemRequest = {
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
  readonly itemType: ItemType;
  readonly source: ItemSource;
};

export type AddTripItemResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export type Trip = {
  readonly id: string;
  readonly items: TripItem[];
  readonly status: 'active' | 'completed';
  readonly createdAt: string;
};
