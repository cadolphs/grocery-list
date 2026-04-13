# Acceptance Tests — wire-firestore-trip-sync

## Test File

`tests/acceptance/wire-firestore-trip-sync/wire-firestore-trip-sync.test.ts`

## Scenario Summary

| # | Scenario | Story | Driving Port | Status |
|---|----------|-------|-------------|--------|
| 1 | initializeApp passes uid to createTripStorage | US-01 | initializeApp | skip |
| 2 | Remote trip checkoff arrives via onChange and updates trip service state | US-02 | initializeApp | skip |
| 3 | Remote item addition via onChange appears in local trip | US-02 | initializeApp | skip |
| 4 | Subscribers are notified when loadFromStorage updates state | US-03 | TripService | skip |
| 5 | UI re-renders when remote trip change arrives through full pipeline | US-03 | initializeApp + TripService | skip |

## Coverage Analysis

- **Happy path**: 3 scenarios (60%) — uid wiring, checkoff sync, item addition sync
- **Error/edge**: 0 scenarios — no error paths in scope (error handling already tested in correct-sync-behavior)
- **Integration**: 2 scenarios (40%) — subscriber notification, full pipeline end-to-end

## Implementation Order

1. **US-03 first** (scenario 4): `loadFromStorage` + `notify()` — pure domain change, no factory signature changes needed
2. **US-01 next** (scenario 1): Change `AdapterFactories` type and `initializeApp` to pass uid
3. **US-02 last** (scenarios 2, 3, 5): Wire onChange handler — depends on US-01 (type change) and US-03 (notify)
