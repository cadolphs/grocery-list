// Driven port: Area Storage
// Pure interface - no implementation details

export type AreaStorage = {
  readonly loadAll: () => string[];
  readonly saveAll: (areas: string[]) => void;
};
