# Mutation Testing Report: grocery-smart-list

**Date**: 2026-03-18
**Tool**: Stryker (@stryker-mutator/core + @stryker-mutator/jest-runner)
**Scope**: src/domain/, src/ports/

## Results

| File | % Score | Killed | Survived | No Coverage |
|------|---------|--------|----------|-------------|
| item-grouping.ts | 90.74% | 49 | 5 | 0 |
| staple-library.ts | 71.43% | 25 | 5 | 5 |
| trip.ts | 78.05% | 64 | 18 | 0 |
| **Total** | **80.70%** | **138** | **28** | **5** |

## Verdict: PASS (80.70% >= 80% threshold)

## Notable Surviving Mutants

- `completeTrip`: Removing `.filter(isChecked)`, `.filter(isStaple)`, `.filter(isOneOff)` survived — acceptance tests verify next-trip composition but don't strongly assert on the intermediate categorization arrays
- `generateTripId`: Mutating to `undefined` survived — ID generation is not asserted
- `staple-library.ts`: 5 mutants in uncovered code paths (search, remove)

## Recommendations for Future Iteration

1. Add unit tests asserting `completeTrip` result categories contain correct item types
2. Add coverage for `staple-library.search()` and `staple-library.remove()`
