# DISTILL Decisions -- web-ux-polish

## Reconciliation

Reconciliation passed -- 0 contradictions between DISCUSS and DESIGN wave decisions.

## Walking Skeleton Strategy

**Strategy A (Full InMemory)** -- All tests render via `ServiceProvider` with null adapters. Platform detection mocked via `jest.mock('../../../src/hooks/useIsWeb')`. No real I/O needed.

## Test Structure

| Test File | Stories | Scenarios | Status |
|-----------|---------|-----------|--------|
| `walking-skeleton.test.tsx` | US-01, US-02, US-03, US-05 | 7 scenarios (WS-1 through WS-5) | 4 RED, 2 trivially pass, 1 skipped |
| `milestone-1-focus-management.test.tsx` | US-04 | 2 scenarios (M1-1) | All skipped |
| `milestone-2-edit-icon.test.tsx` | US-06 | 5 scenarios (M2-1 through M2-3) | All skipped |

## Driving Ports

- **UI layer**: ServiceProvider > AppShell > HomeView/StoreView > QuickAdd, MetadataBottomSheet, TripItemRow, StapleChecklist
- **Platform detection**: `src/hooks/useIsWeb.ts` (mocked per test case)

## Scaffolding (Mandate 7)

Created `src/hooks/useIsWeb.ts` as RED scaffold — it throws `Error('Not yet implemented -- RED scaffold')`. Tests always mock it, so the throw is defensive. DELIVER will replace with `Platform.OS === 'web'` check and remove the `__SCAFFOLD__` marker.

## Mobile Non-Regression Strategy

Every web behavior has a paired mobile test that asserts the behavior is ABSENT when `useIsWeb()` returns false. This is the guardrail against breaking mobile when implementing web features.

**Limitation of current RED tests**: Some "mobile does not have web behavior" assertions pass trivially before implementation (e.g., `expect(autoFocus).toBeFalsy()` passes when the prop is undefined). This is acceptable for DISTILL — the important thing is that the paired web assertion is RED. Once the implementation lands, mobile tests will pass correctly because `useIsWeb()` returns false and the conditional doesn't activate.

## Focus Assertion Strategy

React Native Testing Library doesn't reliably simulate focus state in jsdom. Tests verify focus-related behavior via:
- `autoFocus` prop presence (checked via `input.props.autoFocus`)
- For imperative refocus (US-05), the test is `.skip`'d pending implementation decision on how to expose an observable marker. The crafter may choose to expose via a `focusTrigger` counter state, an `onFocus` callback, or a testID-addressable focus method. The acceptance test will be filled in once the implementation pattern is chosen.

## Adapter Coverage

No new adapters. No real I/O required.

## Missing Upstream Artifacts

- DEVOPS: not found -- KPI baseline measurement deferred
- SSOT journeys/kpi-contracts: not found -- acceptable for lightweight feature

## Open for DELIVER

- Decide exact pencil icon character (✎ U+270E or ✏️ U+270F) — tested via testID `edit-button-{name}` so the glyph is flexible
- Decide WS-5 focus-return implementation (imperative handle vs counter trigger) and fill in the skipped test with the chosen observable
