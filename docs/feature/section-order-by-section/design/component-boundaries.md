# Component Boundaries: Section-Keyed Ordering

**Feature ID**: section-order-by-section
**Date**: 2026-04-27
**Refines**: `store-section-order` component boundaries

This document is a refactor plan, not a new-component plan. Every section below names a file that already exists and describes how it changes.

---

## 1. Reuse Analysis (Mandatory)

Default verdict: **EXTEND**. CREATE-NEW only with evidence. No CREATE-NEW verdicts in this feature.

| Component | Today | Refactor verdict | Reasoning |
|---|---|---|---|
| `src/domain/types.ts` | Defines `StoreLocation`, `TripItem`, etc. | **UNCHANGED** | No domain type additions; aisle still lives on `StoreLocation`. |
| `src/domain/item-grouping.ts` (`AisleGroup`, `groupByAisle`, `compareAisleGroups`) | Group key = composite | **EXTEND (rename + reshape)** | Same module, same purpose. Type renamed `AisleGroup → SectionGroup`. Function renamed `groupByAisle → groupBySection`. `aisleNumber` removed from group type. Intra-section sort added inside the function. |
| `src/domain/section-ordering.ts` (`sortByCustomOrder`, `appendNewSections`, internal `groupKey`) | Operates on composite keys | **EXTEND (re-key)** | Same module, same exported function names. Internal `groupKey` simplifies to `group.section`. Function bodies otherwise unchanged. |
| `src/ports/section-order-storage.ts` | `loadOrder/saveOrder/clearOrder/subscribe` over `string[] \| null` | **UNCHANGED** | Interface signature unchanged. Semantic shift: stored entries are section names, not composites. |
| `src/adapters/firestore/firestore-section-order-storage.ts` | Cached + onSnapshot adapter, document `{ order: string[] \| null }` | **UNCHANGED** | Adapter is value-agnostic. Document schema is identical JSON shape. |
| `src/adapters/async-storage/async-section-order-storage.ts` | Cached AsyncStorage adapter, key `@grocery/section_order` | **UNCHANGED** | Adapter is value-agnostic. |
| `src/adapters/null/null-section-order-storage.ts` (if present) | In-memory test adapter | **UNCHANGED** | Value-agnostic. |
| `src/hooks/useSectionOrder.ts` | Bridges port to React state | **EXTEND** | Add legacy-detection sanitisation at first read after mount; on detect, call `clearOrder()` and surface `null`. |
| `src/hooks/useAppInitialization.ts` | Constructs adapters | **UNCHANGED** | Same adapters constructed identically. |
| `src/ui/SectionOrderSettingsScreen.tsx` | Composite parse/render | **EXTEND (simplify)** | Drop `parseSectionKey`, `toSectionKey`, `formatSectionDisplay`, `SectionEntry`. `knownSectionNames` derived from staples' section names. Each row renders a section name string. |
| `src/ui/StoreView.tsx` | Builds composite keys for effective order | **EXTEND** | `knownKeys` becomes `knownSectionNames` (`groups.map(g => g.section)`). `AisleSection` `key` prop becomes `sectionGroup.section`. Prop renamed `aisleGroup → sectionGroup`. |
| `src/ui/AisleSection.tsx` | Renders one group as a card | **EXTEND** | Prop name + prop type rename (`aisleGroup: AisleGroup → sectionGroup: SectionGroup`). No behavioural or visual change. Component name retained (out-of-scope rename per design §6). |
| `src/ui/ServiceProvider.tsx` | Provides storage instances | **UNCHANGED** | Same port instance flows through. |

**Verdict summary**: 4 EXTEND-with-changes, 6 UNCHANGED, 0 CREATE-NEW.

---

## 2. Function-Level Refactor Plan

### 2.1 `src/domain/item-grouping.ts`

**Type rename**:
```
AisleGroup -> SectionGroup
```
Field shape:
```
SectionGroup {
  readonly section: string;
  readonly items: TripItem[];   // sorted aisle ascending, nulls last
  readonly totalCount: number;
  readonly checkedCount: number;
}
```
The `aisleNumber` field is removed from the group type. Each `TripItem` retains its own `storeLocation.aisleNumber` for any consumer that needs per-item aisle info.

**Function rename**:
```
groupByAisle -> groupBySection
```
Behavioural changes inside `groupBySection`:
- Reduce key uses `item.storeLocation.section` (no aisle).
- After grouping, items inside each group are sorted by aisle ascending, nulls last, then by name as a stable tie-break.
- Section-level sort: alphabetical by section name (the existing default order, simplified — no aisle component).

**Function removed**:
```
groupKey  (internal helper -- no longer needed)
```

**Function reshaped**:
```
compareAisleGroups -> compareSectionGroups
```
Now compares by `a.section.localeCompare(b.section)` only.

**Exported surface (after refactor)**:
- `SectionGroup` (type, replaces `AisleGroup`)
- `groupBySection(items: TripItem[]): SectionGroup[]` (replaces `groupByAisle`)
- `AreaGroup`, `groupByArea`, `getOneOffItems` (unchanged)

**Breaking changes** (TypeScript will catch every call site):
- Anything importing `AisleGroup` or `groupByAisle` must update.
- Anyone reading `aisleNumber` off a group must read it off individual items instead.

### 2.2 `src/domain/section-ordering.ts`

**Internal helper simplified**:
```
groupKey(group) = group.section   (was: `${group.section}::${group.aisleNumber}`)
```

**Exported functions — signatures unchanged**:
- `sortByCustomOrder(groups: SectionGroup[], sectionOrder: string[] | null): SectionGroup[]`
  - Function body identical except `groupKey` now returns just the section name.
  - Type parameter changes from `AisleGroup[]` to `SectionGroup[]`.
- `appendNewSections(currentOrder: string[], knownSectionNames: string[]): string[]`
  - Body unchanged. Parameter renamed for clarity (`knownSectionKeys → knownSectionNames`).

**Behavioural contract** (unchanged shape, refined semantics):
- Input is one entry per section, not per (section, aisle) pair.
- `sortByCustomOrder` continues to: place groups whose key is in `sectionOrder` first by index, append unknowns at the end (preserve relative order), pass through unchanged when `sectionOrder` is `null` or empty.
- `appendNewSections` continues to: dedupe by key, append new keys at the end.

### 2.3 `src/ports/section-order-storage.ts`

**No changes to the interface.**

Implicit semantic change: `loadOrder()` returns `string[] | null` where each string is a section name (not a composite). This is documented in the port file via comment update only — no type-level change is possible since the value type is already `string[] | null`.

### 2.4 `src/adapters/firestore/firestore-section-order-storage.ts`

**No changes.**

The adapter serialises and deserialises whatever array the hook hands it. Document path `users/{uid}/data/sectionOrder` continues to hold `{ order: string[] | null }`. Wipe migration writes `{ order: null }` via the existing `clearOrder()` path.

### 2.5 `src/adapters/async-storage/async-section-order-storage.ts`

**No changes.**

Storage key `@grocery/section_order` continues to hold a JSON-encoded `string[] | null`. Wipe migration removes the key via the existing `clearOrder()` path.

### 2.6 `src/hooks/useSectionOrder.ts`

**Behavioural extension**: legacy-detection sanitisation at first read.

Pseudocode (illustrative — crafter chooses exact placement):
```
on first read after mount:
  loaded = sectionOrderStorage.loadOrder()
  if loaded !== null and any entry contains '::':
    sectionOrderStorage.clearOrder()
    setOrder(null)
    return
  setOrder(loaded)
```

The detection must run exactly once per `sectionOrderStorage` instance per hook lifecycle. The existing `useEffect` with `[sectionOrderStorage]` dep is the correct trigger site. After clear, the hook's own `subscribe` callback will receive the wipe notification, but the order is already `null` locally; `setOrder(null)` is idempotent.

**Public API unchanged**:
- `order: string[] | null`
- `reorder(newOrder: string[]): void`
- `reset(): void`

**Testability**: a fake `SectionOrderStorage` returning a composite-laden array on first `loadOrder()` and asserting that `clearOrder()` was called drives the migration test.

### 2.7 `src/ui/SectionOrderSettingsScreen.tsx`

**Removals**:
- `SectionEntry` type
- `toSectionKey(location)`
- `parseSectionKey(key)`
- `formatSectionDisplay(entry)`

**Reshape**:
- `knownSectionKeys` becomes `knownSectionNames: string[]`, derived from `stapleLibrary.listAll().map(s => s.storeLocation.section)` deduped (preserve insertion order, as today).
- `orderedEntries` becomes `orderedSections: string[]` — `appendNewSections(order, knownSectionNames)` if `order !== null`, else `knownSectionNames`.
- Render iterates over strings; row label is the section name directly.
- `testID`s remain `section-row-${section}`, `move-up-${section}`, `move-down-${section}` — these already keyed on the section name component, so AC test selectors remain stable.

### 2.8 `src/ui/StoreView.tsx`

**Reshape inside the render method**:
```
const groups = groupBySection(neededItems);     // was groupByAisle
const knownSectionNames = groups.map(g => g.section);
const effectiveOrder =
  sectionOrder !== null
    ? appendNewSections(sectionOrder, knownSectionNames)
    : null;
const sectionGroups = sortByCustomOrder(groups, effectiveOrder);
```

**Render**:
```
<AisleSection
  key={sectionGroup.section}
  sectionGroup={sectionGroup}
  ...
/>
```

The `existingSections` derivation already in StoreView (line 43) is unaffected — it already deduplicates by section name.

### 2.9 `src/ui/AisleSection.tsx`

**Prop rename** (assumed location of the change; crafter may discover variations):
```
aisleGroup: AisleGroup -> sectionGroup: SectionGroup
```

Internal rendering: drop any `aisleNumber` display if present; render only the section name as the card header. Items inside are already sorted by `groupBySection`, so the component renders them in the order received.

**Component name**: retained (`AisleSection`). This is the one deliberate naming inconsistency, scoped out per design §6.

---

## 3. Signatures That Break

A complete list of breaking signature changes. Every call site is statically checkable.

| Symbol | Before | After | Reason |
|---|---|---|---|
| `AisleGroup` (type) | `{ section, aisleNumber, items, totalCount, checkedCount }` | renamed `SectionGroup`; field `aisleNumber` removed | Section is the new key |
| `groupByAisle` (function) | `(items) => AisleGroup[]` | renamed `groupBySection`; same parameter shape; returns `SectionGroup[]` with sorted items | Section-keyed grouping + intra-section sort |
| `compareAisleGroups` (private) | `(a, b) => number` over composite | renamed `compareSectionGroups`; alpha by section name | Aisle no longer in key |
| `sortByCustomOrder` (function) | `(AisleGroup[], string[] \| null) => AisleGroup[]` | `(SectionGroup[], string[] \| null) => SectionGroup[]` | Type parameter rename |
| `appendNewSections` (function) | `(string[], string[]) => string[]` | unchanged signature; semantic shift to section names | Already general |
| `AisleSection` prop | `aisleGroup: AisleGroup` | `sectionGroup: SectionGroup` | Type rename |

No port/adapter signatures change.

---

## 4. Adapters That Need Updates

**None.**

Both `firestore-section-order-storage.ts` and `async-section-order-storage.ts` are value-agnostic and operate on `string[] | null`. The migration is hook-level. The Firestore document path and AsyncStorage key are unchanged.

---

## 5. Migration Implementation Sketch (Hook-Level)

Reference only — crafter implements exact form during GREEN.

```
// useSectionOrder.ts (new behaviour, pseudocode)

useEffect(() => {
  const loaded = sectionOrderStorage.loadOrder();
  if (loaded !== null && loaded.some(entry => entry.includes('::'))) {
    sectionOrderStorage.clearOrder();   // wipes Firestore doc / AsyncStorage key
    setOrder(null);
  } else {
    setOrder(loaded);
  }
  return sectionOrderStorage.subscribe(() => {
    setOrder(sectionOrderStorage.loadOrder());
  });
}, [sectionOrderStorage]);
```

The sanitization runs once per mount with the same storage instance. After the wipe, subsequent reads yield `null`, which fails the `entry.includes('::')` predicate immediately.

---

## 6. Dependency Direction

Unchanged from `store-section-order`:

```
UI (StoreView, SectionOrderSettingsScreen, AisleSection)
   |
   v
Hooks (useSectionOrder)
   |
   v
Domain (item-grouping.ts, section-ordering.ts)
   ^
   | (port)
   |
Adapters (firestore-section-order-storage, async-section-order-storage)
   |
   v
Infrastructure (Firestore SDK, AsyncStorage)
```

`dependency-cruiser` rules continue to hold:
- Domain has zero imports from adapters/UI/hooks.
- Ports have zero imports from adapters.
- `section-ordering.ts` imports only `SectionGroup` (a type) from `item-grouping.ts` — which is still a type-only seam, not a runtime call.

---

## 7. Architectural Enforcement Recap

Tool: `dependency-cruiser` (MIT, already in use). No rule changes required for this feature; existing rules remain valid.

---

## 8. Test Surface (for acceptance-designer's reference, not test-design)

Behavioural surfaces the AC author should consider:
- Section-name-only grouping (US-01, US-02): one `SectionGroup` per distinct section name.
- Intra-section aisle-ascending sort (US-02): given items with mixed aisle numbers and nulls inside one section, items appear in numeric ascending order with nulls at the end.
- Custom order over section names (US-01, US-02): drag-reorder commits and persists; store view reflects it.
- Auto-append narrowing (US-03): adding a staple in a brand-new section appends; adding a staple in a known section does not mutate the order.
- Migration wipe (US-04): a stored array containing `::` is wiped; a clean array is preserved untouched.

Mutation testing (per `CLAUDE.md`): scoped to `src/domain/item-grouping.ts` and `src/domain/section-ordering.ts`; threshold ≥80%.
