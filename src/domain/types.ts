// Domain types - Grocery Smart List

export type HouseArea = string;

export type StoreLocation = {
  readonly section: string;
  readonly aisleNumber: number | null;
};

export type ItemType = 'staple' | 'one-off';

export type StapleItem = {
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

export type AddStapleResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

// Trip domain types

export type ItemSource = 'preloaded' | 'quick-add' | 'whiteboard' | 'carryover';

export type TripItem = {
  readonly id: string;
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
  readonly itemType: ItemType;
  readonly stapleId: string | null;
  readonly source: ItemSource;
  readonly needed: boolean;
  readonly checked: boolean;
  readonly checkedAt: string | null;
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
  readonly completedAreas?: readonly string[];
};
