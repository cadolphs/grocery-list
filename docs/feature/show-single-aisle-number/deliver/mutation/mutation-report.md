# Mutation Report — show-single-aisle-number

- **Feature**: show-single-aisle-number
- **Date**: 2026-05-07
- **Tool**: Stryker (`@stryker-mutator/core` + jest-runner)
- **Threshold**: kill rate >= 80% (break)
- **Scope**: `src/domain/item-grouping.ts` (per-feature, the only file touched in domain widening for this feature)

## Summary

| File | Mutants Total | Killed | Survived | Timeout | No Coverage | Kill Rate % |
|------|---------------|--------|----------|---------|-------------|-------------|
| `src/domain/item-grouping.ts` | 131 | 109 | 17 | 0 | 5 | **83.21%** |

Note: total = killed + survived + no-coverage = 109 + 17 + 5 = 131. "% covered" reported by Stryker = 86.51% (kills out of mutants reached by tests). Headline number used for the gate is 83.21% (overall mutation score).

## Verdict: **PASS** (>= 80%)

Stryker's own break-threshold check confirms: "Final mutation score of 83.21 is greater than or equal to break threshold 80".

## Surviving Mutants (notable)

All 17 survivors fall into three buckets, none of which represent a behavior gap introduced by **this** feature (single-aisle widening). The single-aisle slice itself is fully covered (kind: 'single-aisle' branch in `partitionSectionByAisle` is killed by the dedicated tests).

### Bucket A: Comparator branch micro-mutations (`compareItemsInSection`, lines 56-63)

`compareItemsInSection` is a private helper used inside `groupBySection`. Several short-circuit / equality-flip mutants survive because the comparator's behavior is observed only through the *final sorted order* of items in a section, and most existing test fixtures don't construct an input where flipping a single conjunct changes the final order.

Specific survivors:
- L56:7 `ConditionalExpression` → `if (true && aisleB !== null && aisleA !== aisleB)`
- L56:45 `ConditionalExpression` → `aisleA !== aisleB` replaced with `true`
- L59:7 `ConditionalExpression` / `LogicalOperator` / `EqualityOperator` (4 variants on `aisleA === null && aisleB !== null`)
- L59:26 two variants on the same line
- L60:7 `ConditionalExpression` → `if (true && aisleB === null)`
- L63:10 `ArithmeticOperator` → `+` instead of `-` for tie-break
- L63:11 `LogicalOperator` → `&&` instead of `??` (nullish coalescing)

Why they survive: existing test fixtures inside `groupBySection` either (a) avoid mixed null/numeric aisles in the same section, or (b) have inputs already in a final order that survives the mutated comparator path. The downstream `partitionSectionByAisle` tests use pre-shaped `SectionGroup` fixtures that never traverse the comparator at all.

### Bucket B: `groupBySection` empty-input fast path / index map (lines 74, 76)

- L74 `ConditionalExpression` → `if (false) return []` survives because no test exercises empty-input through `groupBySection` — the empty case is tested at higher level only.
- L76 `ArrayDeclaration` → `[item, i]` replaced with `[]` (turns the index map into a Map of `undefined => undefined`). Survives because the comparator's `?? unknownIndex` fallback masks the broken map for inputs that never trigger a tie-break or that happen to remain in their original input order after sort.

### Bucket C: Multi-aisle ascending sort (line 164) and dead-code helper (line 129)

- L164 three mutants on the `[...numericBuckets.keys()].sort((a, b) => a - b)`: removing the sort, returning undefined, or `+` instead of `-`. Survive because existing multi-aisle test fixtures already feed aisle keys in ascending order, so a stable / no-op / inverse-but-already-sorted sort produces the same observable output.
- L129 `ArrowFunction` → `distinctAisleKeyCount = () => undefined` survives because `distinctAisleKeyCount` is **dead code**. It is defined and exported nowhere — `partitionSectionByAisle` computes the equivalent inline using `numericKeyCount` and `hasNulls`. Stryker correctly identifies it as having no behavioral coverage.

## Single-aisle Slice (this feature) — Specifically Verified

The mutation that would directly invalidate this feature's contract — the `kind: 'single-aisle'` branch in `partitionSectionByAisle` (lines 158-161) and the surrounding `numericKeyCount === 1 && !hasNulls` guard — was **killed** in this run. The 8 tests added in `partitionSectionByAisle.test` (single-aisle, mixed numeric+null distinguishing-from-single, etc.) catch that branch's mutants.

## Recommendation

**No action required for the feature gate** — verdict is PASS at 83.21% vs 80% threshold.

Optional follow-ups (not blocking, would belong to separate refactoring/tests work, not this feature):

1. **Dead code removal** (`distinctAisleKeyCount`, line 129-132): the helper is not referenced. Either delete it or wire it into `partitionSectionByAisle` to replace the inline computation. This would eliminate one survivor outright.
2. **Comparator-targeted unit test** for `groupBySection`: a focused test feeding a section with mixed numeric + null aisles in deliberately-shuffled input order would kill most of the L56-63 survivors. Suggested fixture: section "Produce" with items in input order `[null-aisle, aisle=5, aisle=2, null-aisle, aisle=2]` and assert exact output order `[2, 2, 5, null, null]`.
3. **Multi-aisle ordering test** with descending-input keys: feed numeric buckets in input order `[7, 2, 5]` and assert `partitionSectionByAisle` returns `subGroups` ordered `[2, 5, 7]`. Kills the three L164 sort-mutation survivors.

These would push the score toward ~95%, but are out of scope for the show-single-aisle-number feature gate.

## Post-Run Safety

- `git status` confirms no `src/` modifications post-Stryker.
- `npm test -- src/domain/item-grouping.test.ts` re-runs green (8/8).
- Working tree clean of mutation artifacts (Stryker's own report at `reports/mutation/mutation.html` is gitignored / out of scope).
