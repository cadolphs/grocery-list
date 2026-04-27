# RCA Context — fix-section-order-reactive

## Bug
Store-location order ignored; grocery list shows alphabetical. Settings UI reorder persists, but `StoreView` never re-reads.

## Root cause A — ordering defect
`useSectionOrder` is snapshot-on-mount with no subscription. Each consumer (`StoreView`, `SectionOrderSettingsScreen`) holds independent React state. `StoreView` mounts at app boot before user reorders → its `loadOrder()` returns `null`/stale. Settings writes do not notify other consumers. `sortByCustomOrder(groups, null)` is a no-op → `groupByAisle` falls back to `localeCompare` → alphabetical.

Evidence:
- `src/hooks/useSectionOrder.ts:13-31` — one-shot `useState`, no effect / no subscribe
- `src/ports/section-order-storage.ts:4-8` — port lacks `subscribe`
- `src/adapters/firestore/firestore-section-order-storage.ts:10-12,41,57-60` — internal `onChange` exists but never wired in `useAppInitialization.ts:172,277`
- `src/domain/item-grouping.ts:45` — alphabetical fallback
- `src/ui/StoreView.tsx:125` — call site

## Root cause B — test-coverage gap
Zero tests on `src/domain/section-ordering.ts`. Zero hits for `sortByCustomOrder` in test files. No hook test for `useSectionOrder`. Stryker scoped to domain but cannot kill mutants in untested files. No CI gate enforcing sibling `*.test.ts` per domain module.

## Approved fix direction
**Full reactive port fix** + sibling-test CI gate.

1. Extend `SectionOrderStorage` port with `subscribe(listener) => unsub`.
2. Implement fan-out registry in firestore + async-storage adapters; null adapter no-op.
3. `useSectionOrder` — subscribe in `useEffect`, re-`loadOrder()` on event.
4. Optional in `StoreView.tsx:125`: apply `appendNewSections` so newly-seen sections get deterministic position.
5. **CI gate**: enforce sibling `*.test.ts` for every `src/domain/*.ts` (and `src/ports/*.ts`).

## Files affected
- `src/ports/section-order-storage.ts` (port extension)
- `src/adapters/firestore/firestore-section-order-storage.ts` (fan-out)
- `src/adapters/async-storage/async-section-order-storage.ts` (fan-out)
- `src/adapters/null/null-section-order-storage.ts` (no-op subscribe)
- `src/hooks/useSectionOrder.ts` (subscribe in effect)
- `src/adapters/firestore/firestore-section-order-storage.test.ts` (extend)
- NEW `src/domain/section-ordering.test.ts`
- NEW `src/hooks/useSectionOrder.test.ts`
- NEW CI gate: `.github/workflows/*.yml` or `scripts/check-domain-tests.*` (per project conventions)

## Regression test plan

### Domain unit — `src/domain/section-ordering.test.ts` (NEW)
- `sortByCustomOrder(groups, null)` → unchanged
- `sortByCustomOrder(groups, [])` → unchanged
- Custom order overrides alphabetical
- Unordered groups appended after ordered, preserving input order
- `appendNewSections` idempotent when nothing new; appends only unseen keys

### Hook — `src/hooks/useSectionOrder.test.ts` (NEW)
Two consumers + shared in-memory fake storage with subscribe fan-out → reorder in A propagates to B's `order` on next tick.

### Adapter — extend `firestore-section-order-storage.test.ts`
- `subscribe` fires on local `saveOrder`
- `subscribe` fires on remote snapshot delta
- `subscribe` does NOT fire on echo (parallels existing `onChange` tests at lines 158-189)

### Integration (optional, high value) — `src/ui/StoreView.test.tsx`
Render `StoreView` + `SectionOrderSettingsScreen` against shared storage; reorder via testID `move-up-Produce`; assert `AisleSection` testID order reflects new order.

## Risk
Low–medium. Port change additive. Persisted shape unchanged. Watch listener fan-out re-render volume — dedupe via serialized compare (pattern already in firestore adapter).

## Paradigm
Functional (per project CLAUDE.md). Use `@nw-functional-software-crafter`.
