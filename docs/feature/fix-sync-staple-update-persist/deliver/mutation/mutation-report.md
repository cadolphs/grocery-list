# Mutation Report — fix-sync-staple-update-persist

## Verdict: PASS

- syncStapleUpdate body (lines 251-268): 0 surviving mutants
- trip.ts overall: 88.33% kill rate (threshold: 80%)
- Stryker break threshold (80%) exceeded

## Command

```
npx stryker run --mutate 'src/domain/trip.ts'
```

Config: `stryker.config.mjs` (repo root), thresholds: break=80, low=80, high=90.
Jest runner, concurrency=2, timeout=30000ms.

## Aggregate Numbers (trip.ts)

| Metric | Count |
|---|---|
| Total mutants | 240 |
| Killed | 212 |
| Survived | 27 |
| Timed out | 0 |
| No coverage | 1 |
| Errors | 0 |
| Mutation score (total) | 88.33 % |
| Mutation score (covered) | 88.70 % |
| Avg tests run per mutant | 60.10 |
| Runtime | 4 min 42 s |

Result: `Final mutation score of 88.33 is greater than or equal to break threshold 80`.

## Feature-Scope Verdict: syncStapleUpdate (lines 251-268)

The body of `syncStapleUpdate` contains **zero surviving mutants** in the current run.

### Baseline run (before mutation-coverage tests added)

Three mutants initially survived in the idempotency check:

| Line:Col | Mutator | Mutation | Status |
|---|---|---|---|
| 258:11 | LogicalOperator | `section === section && aisleNumber === aisleNumber` -> `... || ...` | Killed (new test) |
| 258:11 | ConditionalExpression | `item.storeLocation.section === nextStoreLocation.section` -> `true` | Killed (new test) |
| 259:11 | ConditionalExpression | `item.storeLocation.aisleNumber === nextStoreLocation.aisleNumber` -> `true` | Killed (new test) |

### Tests added to kill these mutants

Two focused behavioral tests added to `src/domain/trip.test.ts`:

1. `syncStapleUpdate persists when only section changes (aisleNumber unchanged)` — exercises the `section` half of `storeLocationEqual` independently (kills the `section === section -> true` mutant and the `&& -> ||` mutant).
2. `syncStapleUpdate persists when only aisleNumber changes (section unchanged)` — exercises the `aisleNumber` half independently (kills the `aisleNumber === aisleNumber -> true` mutant and the `&& -> ||` mutant).

Together with the pre-existing idempotency test (both fields match) and the happy-path test (both fields differ), the `storeLocationEqual` truth table is now fully covered: 4 cells, each asserted.

### Re-run kill rate

After adding the two tests:
- syncStapleUpdate surviving mutants: **0**
- Overall trip.ts kill rate improved: 87.08 % -> 88.33 %
- Mutants killed: 209 -> 212 (+3, as expected)

## Surviving Mutants in Other trip.ts Regions (Not feature-scope)

These survivors pre-existed the feature and are in untested code outside `syncStapleUpdate`. Per task spec, file-level rate < 80% from other functions is acceptable. Listed for transparency.

| Line:Col | Function | Mutator | Classification |
|---|---|---|---|
| 39-43 | DEFAULT_HOUSE_AREAS constants | StringLiteral -> "" | Acceptable (config constant, no test asserts on literal value) |
| 70:3, 70:30 | generateTripItemId | StringLiteral/MethodExpression | Acceptable (ID format helper, output is random/opaque) |
| 85:24, 86:3, 86:25 | generateTripId | ArrowFunction/StringLiteral/MethodExpression | Acceptable (ID generator, random component) |
| 123:11, 123:33, 123:62, 127:41 | addItem validation messages | LogicalOperator/ConditionalExpression/StringLiteral | Missing test (error-message equivalence) — pre-existing |
| 161:9 | uncheckItem name-match guard | ConditionalExpression -> true | Missing test — pre-existing |
| 179:9 | unskipItem name-match guard | ConditionalExpression -> true | Missing test — pre-existing |
| 228:35 | loadFromStorage previousCompleted snapshot | ArrayDeclaration -> [] | Missing test — pre-existing |
| 237:11, 237:64 | loadFromStorage completedAreas change detection | ConditionalExpression/ArrayDeclaration | Missing test — pre-existing |
| 302:36, 302:48 | initializeFromStorage completedAreas replay | ArrayDeclaration/ArrowFunction | Missing test — pre-existing |
| 330:16, 333:25 | complete() items/completedAreas spread | ArrayDeclaration -> [] | Missing test — pre-existing |
| 359:24, 363:23, 364:23 | completeTrip pure filters | MethodExpression filter -> items | Missing test — pre-existing |

### No-Coverage Mutant

| Line:Col | Mutator | Classification |
|---|---|---|
| 233:38 | ArrayDeclaration | Missing test — pre-existing `savedTrip.completedAreas ?? []` fallback branch |

All 27 survivors + 1 no-coverage are in functions UNRELATED to the `fix-sync-staple-update-persist` feature. They represent pre-existing test gaps in other `trip.ts` functions and are out of scope for this feature's mutation verdict.

## Conclusion

- Feature region `syncStapleUpdate` (lines 251-268): **100% mutation kill rate** (0 survivors, 0 no-coverage).
- File-level trip.ts: **88.33%** overall, passing the 80% break threshold.
- Two behavioral tests added under test budget (bringing `syncStapleUpdate` subgroup to 6 tests, 6 distinct behaviors).
- No production code modified.

**PASS** — feature-scoped mutation testing targets met.
