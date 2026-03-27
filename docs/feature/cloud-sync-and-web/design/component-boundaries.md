# Component Boundaries — cloud-sync-and-web

## Boundary Principle

The existing ports-and-adapters architecture defines clear boundaries. Cloud sync is implemented as **new adapters** — no changes to ports or domain logic.

## Component Map

```
┌─────────────────────────────────────────────────────┐
│ MOBILE APP                                          │
│                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌────────────┐  │
│  │  UI      │──→│  Domain      │──→│  Ports     │  │
│  │  (React  │   │  (StapleLib, │   │  (Storage  │  │
│  │   Native)│   │   TripSvc,   │   │   Ifaces)  │  │
│  │          │   │   AreaMgmt)  │   │            │  │
│  └──────────┘   └──────────────┘   └─────┬──────┘  │
│                                          │         │
│                              ┌───────────┼────────┐│
│                              │           │        ││
│                     ┌────────▼──┐  ┌─────▼──────┐ ││
│                     │AsyncStorage│  │ Firestore  │ ││
│                     │ Adapters  │  │ Adapters   │ ││
│                     │(fallback) │  │ (primary)  │ ││
│                     └───────────┘  └─────┬──────┘ ││
│                                          │        ││
└──────────────────────────────────────────┼────────┘│
                                           │         │
┌──────────────────────────────────────────┼─────────┘
│ WEB APP                                  │
│                                          │
│  ┌──────────┐                    ┌───────▼──────┐
│  │  Web UI  │───────────────────→│  Firestore   │
│  │  (React  │  (direct access)   │  (Cloud)     │
│  │   + Vite)│                    │              │
│  └──────────┘                    └──────────────┘
│
└──────────────────────────────────────────────────
```

## Boundary Decisions

### Mobile App: Firestore Adapters

**Boundary**: `src/adapters/firestore/`

New adapter files that implement existing ports:
- `firestore-staple-storage.ts` → implements `StapleStorage`
- `firestore-area-storage.ts` → implements `AreaStorage`
- `firestore-section-order-storage.ts` → implements `SectionOrderStorage`
- `firestore-trip-storage.ts` → implements `TripStorage`

**Dependency direction**: Adapters depend on ports (inward). Domain never depends on adapters.

**Initialization change**: `useAppInitialization.ts` switches from creating AsyncStorage adapters to Firestore adapters. The rest of the app is unaware.

### Mobile App: Firebase Config

**Boundary**: `src/adapters/firestore/firebase-config.ts`

Firebase app initialization, auth, and Firestore instance. Shared across all Firestore adapters.

### Web App: Separate Package (Direct Firestore Access)

**Boundary**: `web/` directory at project root

Completely separate React app. No shared runtime code with mobile (different React renderers). Shares only:
- Domain types (copied `types.ts`)
- Firebase project config (same Firestore DB)

**Architectural asymmetry**: The web app does NOT implement ports-and-adapters — it accesses Firestore directly via hooks. This is acceptable because: (1) the web app is single-purpose (staple management), (2) it's simple enough to rewrite if the backend changes, (3) adding port abstraction for a disposable web UI adds complexity without proportional benefit. The mobile app implements ports for testability and adapter swappability — different constraints.

### Firestore Security Rules

**Boundary**: `firebase/firestore.rules` (or `firestore.rules` at root)

Deployed via Firebase CLI. Enforces per-user data isolation.

## What Does NOT Change

| Component | Why |
|-----------|-----|
| `src/ports/*` | Ports are stable abstractions — adapters change, ports don't |
| `src/domain/*` | Domain logic is infrastructure-agnostic |
| `src/ui/*` | UI calls domain services, unaware of storage backend |
| `src/hooks/*` | Hooks bridge domain ↔ UI, unaware of storage backend |
| `src/adapters/async-storage/*` | Kept as fallback and for migration source |
| `src/adapters/null/*` | Test adapters unchanged |

**Note on TripStorage**: TripStorage is intentionally excluded from cloud sync. Trips are shopping session-scoped, local to the device at the store. Each device has its own active trip. Cloud durability is not required for trips. If multi-device trip coordination is needed later, TripStorage can be added to Firestore adapters without breaking existing domain logic (ports are stable).
