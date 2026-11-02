# Primitives

The building blocks to compose before adding new ones. Each entry: what it is,
its code root, and `adrs` (current records that shape it, `[]` when none). A PR
that adds or reshapes a primitive, or writes or supersedes an ADR, updates the
matching `adrs` lists in the same PR. Paths in `adrs` are relative to
`docs/`.

Layering (ADR-001-architecture-style-and-paradigm): `domain` is pure and
depends only on `ports`; `adapters` implement `ports`; `hooks` and `ui` compose
services from `ServiceProvider`. No classes (ADR-009).

## Domain (`src/domain/`)

- **Types** (`types.ts`): `StapleItem`, `TripItem`, `Trip`, `HouseArea`,
  `StoreLocation`. adrs: [adrs/ADR-005-house-area-type-migration.md]
- **Trip service** (`trip.ts`: `createTrip`, `completeTrip`): the current trip,
  sweep progress, carryover on completion. adrs:
  [product/architecture/adr-002-firestore-trip-storage.md]
- **Staple library** (`staple-library.ts`: `createStapleLibrary`): recurring
  items and their metadata. adrs: []
- **Area management** (`area-management.ts`, `area-validation.ts`): add,
  rename, reorder, delete-and-move house areas. adrs:
  [adrs/ADR-005-house-area-type-migration.md]
- **Item grouping** (`item-grouping.ts`: `groupByArea`, `groupBySection`,
  `partitionSectionByAisle`): pure view grouping. adrs:
  [product/architecture/adr-005-aisle-subgrouping-domain-helper.md]
- **Section ordering** (`section-ordering.ts`: `sortByCustomOrder`,
  `appendNewSections`). adrs:
  [adrs/ADR-006-section-order-storage-and-sort-override.md,
  product/architecture/adr-004-legacy-section-order-wipe-migration.md]

## Ports (`src/ports/`)

- **Storage ports**: `StapleStorage`, `TripStorage`, `AreaStorage`,
  `SectionOrderStorage`. adrs: [adrs/ADR-003-async-sync-port-bridge.md,
  adrs/ADR-002-local-storage-strategy.md]

## Adapters (`src/adapters/`)

- **Firestore adapters** (`firestore/firestore-*-storage.ts`): synced storage
  with a local mirror and real-time listeners. adrs:
  [adrs/ADR-001-firestore-cloud-backend.md,
  product/architecture/adr-001-realtime-listener-integration.md,
  product/architecture/adr-002-firestore-trip-storage.md,
  adrs/ADR-008-signout-listener-lifecycle.md]
- **Local-write watermark** (`firestore/local-write-watermark.ts`): decides
  whether to adopt a server snapshot over a newer local write; v2 mirror
  envelope. adrs: []
- **Firebase config** (`firestore/firebase-config.ts`): app, auth, Firestore
  singletons; production project only (ADR-011). adrs:
  [adrs/ADR-001-firestore-cloud-backend.md]
- **Migration** (`firestore/migration.ts`): local → Firestore one-time move.
  adrs: [adrs/ADR-001-firestore-cloud-backend.md]
- **AsyncStorage adapters** (`async-storage/`): device-local storage. adrs:
  [adrs/ADR-002-local-storage-strategy.md]
- **Null adapters** (`null/`): in-memory test doubles for every port; use them
  in tests instead of mocks. adrs: []

## Auth (`src/auth/AuthService.ts`)

- **Auth service** (`createAuthService`, `createNullAuthService`):
  email/password sign-in, sign-up, sign-out. adrs:
  [adrs/ADR-007-email-password-auth-migration.md,
  adrs/ADR-008-signout-listener-lifecycle.md]

## Hooks and UI (`src/hooks/`, `src/ui/`)

- **App initialization** (`hooks/useAppInitialization.ts`): builds services
  for the signed-in user. adrs: [adrs/ADR-008-signout-listener-lifecycle.md]
- **State hooks** (`useTrip`, `useAreas`, `useSectionOrder`, `useAuth`,
  `useViewMode`, `useIsWeb`). adrs: []
- **ServiceProvider** (`ui/ServiceProvider.tsx`): dependency injection for
  hooks. adrs: []
- **Screens**: see [feature-map.md](feature-map.md). adrs:
  [adrs/ADR-004-bottom-sheet-implementation.md]
