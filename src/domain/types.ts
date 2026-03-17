// Domain types - Grocery Smart List

export type HouseArea =
  | 'Bathroom'
  | 'Garage Pantry'
  | 'Kitchen Cabinets'
  | 'Fridge'
  | 'Freezer';

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
  readonly type: 'staple';
  readonly createdAt: string;
};

export type AddStapleRequest = {
  readonly name: string;
  readonly houseArea: HouseArea;
  readonly storeLocation: StoreLocation;
};

export type AddStapleResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };
