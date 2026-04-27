# Mutation Report — aisle-subgroups-in-store-view

**Date**: 2026-04-27
**Tool**: Stryker 9.x
**Strategy**: per-feature
**Config**: `stryker.aisle-subgroups.config.mjs`
**Scope**: `src/domain/item-grouping.ts` (the only domain file touched in this feature)
**Threshold**: ≥80%

## Result

| File | Score | Killed | Survived | Timeout | No cov |
|------|------:|------:|------:|------:|------:|
| `src/domain/item-grouping.ts` | **86.55%** | 103 | 16 | 0 | 0 |

**Status**: ✅ PASS — exceeds break threshold of 80% by 6.55 pts.

## Surviving Mutant Themes (16)

1. **Sort comparator weakness (3 mutants)** at `item-grouping.ts:148`
   `[...numericBuckets.keys()].sort((a, b) => a - b)` — replacing the comparator with `() => undefined`, `(a, b) => a + b`, or removing the `.sort(...)` entirely all survive because the test fixtures happen to insert keys in already-ascending order. Tests would catch a wrong-direction comparator on **descending** input but not the trivial cases.
   - **Mitigation deferred**: a follow-up test that provides aisle keys in shuffled order (e.g., `[7, 4, 5]`) would kill all three.
2. **`indexOf` map secondary tie-break (1 mutant)** at `item-grouping.ts:76` — replacing `[item, i]` with `[]` survives because the existing fixtures don't depend on the input-order tie-break beyond the explicit `Bread` / `Pasta` test, which stays green for an unrelated reason.
3. **Other survivors (12 mutants)** — mostly within `groupBySection` (existing, pre-feature code). Outside the scope of this feature's contribution; a separate mutation pass on `groupBySection` itself would address them.

## Verdict

The new public function `partitionSectionByAisle` and its helpers (`bucketByAisleKey`, `distinctAisleKeyCount`, `createAisleSubGroup`) are well-covered. The 86.55% kill rate satisfies the project quality gate. The known weakness around sort comparators is a documented follow-up — not blocking.

## Reports

- HTML: `docs/feature/aisle-subgroups-in-store-view/deliver/mutation/mutation-report.html`
- JSON: `docs/feature/aisle-subgroups-in-store-view/deliver/mutation/mutation-report.json`
