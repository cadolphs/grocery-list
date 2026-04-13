# DISTILL Decisions -- persist-one-offs

## Reconciliation

Reconciliation passed -- 0 contradictions between DISCUSS and DESIGN wave decisions.

## Walking Skeleton Strategy

**Strategy A (Full InMemory)** -- All tests render via `ServiceProvider` with null adapters. Domain logic tested through UI interactions. No real I/O needed.

## Test Structure

| Test File | Story | Scenarios | Status |
|-----------|-------|-----------|--------|
| `walking-skeleton.test.tsx` | US-01 + US-02 | 6 scenarios (WS-1 through WS-6) | 4 RED, 1 skip, 1 pass |
| `milestone-1-safety-filters.test.tsx` | US-04 | 3 scenarios (M1-1 through M1-3) | All skipped |
| `milestone-2-suggestion-labels.test.tsx` | US-03 | 3 scenarios (M2-1 through M2-3) | All skipped |

## Driving Ports

- **UI layer**: ServiceProvider > AppShell > HomeView > MetadataBottomSheet / QuickAdd
- **Domain layer**: StapleLibrary.addOneOff, StapleLibrary.search, StapleLibrary.listAll

## Adapter Coverage

No new adapters. Existing null adapters provide test coverage. Firestore sync handles the new `type` field transparently.

## Scaffolding

No scaffolding files needed. The feature extends existing types and methods. Tests call `addOneOff` which doesn't exist yet — this produces RED (method not found), not BROKEN (import error).

Note: Milestone tests use `(stapleLibrary as any).addOneOff(...)` to call the method that will be added in US-01. This cast is temporary — once the `StapleLibrary` type is extended, the cast can be removed.

## Missing Upstream Artifacts

- DEVOPS: not found -- not applicable for domain + UI feature
- SSOT journeys/kpi-contracts: not found -- acceptable for lightweight feature
