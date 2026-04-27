// Driven port: Section Order Storage
// Pure interface - no implementation details

export type SectionOrderStorage = {
  readonly loadOrder: () => string[] | null;
  readonly saveOrder: (order: string[]) => void;
  readonly clearOrder: () => void;
  readonly subscribe: (listener: () => void) => () => void;
};
