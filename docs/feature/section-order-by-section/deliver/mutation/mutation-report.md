# Mutation Report — section-order-by-section

**Date**: 2026-04-27
**Tool**: Stryker (`@stryker-mutator/core` + `@stryker-mutator/jest-runner`)
**Strategy**: per-feature
**Threshold**: ≥80% kill rate

## Scope
- `src/domain/item-grouping.ts`
- `src/domain/section-ordering.ts`

## Result: PASS — 86.18% kill rate

| File | Kill % | Killed | Survived | Timeout | No cov | Errors |
|------|-------:|-------:|---------:|--------:|-------:|-------:|
| item-grouping.ts | 83.75% | 67 | 13 | 0 | 0 | 0 |
| section-ordering.ts | 90.70% | 39 | 4 | 0 | 0 | 0 |
| **Total** | **86.18%** | **106** | **17** | **0** | **0** | **0** |

## Survivor Analysis (lightweight)

Most surviving mutants in `section-ordering.ts` are equality-operator flips inside the `compareByCustomOrder` chain (e.g., `indexB !== -1` ↔ `indexB === -1`). These survive because the alphabetical fallback path produces observationally equivalent ordering for the test inputs covered. Tightening would require additional cases that exercise exotic asymmetric "one in / one out of order" combinations.

`item-grouping.ts` survivors are similarly comparator-symmetry mutants and string-mutation noise on internal predicates that don't change observable output.

Both files exceed the 80% threshold; no additional tests required.

## Command
```
npx stryker run --mutate "src/domain/item-grouping.ts,src/domain/section-ordering.ts"
```

Full HTML report: `reports/mutation/mutation.html`.
