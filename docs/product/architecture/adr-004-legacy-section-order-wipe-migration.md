# ADR-004: Wipe-on-Detect Migration for Legacy Composite Section Orders

## Status

Accepted

## Context

Feature `section-order-by-section` (2026-04-27) refactors the section-ordering key from composite (`section::aisleNumber`) to section name. Stored values from the predecessor feature (`store-section-order`) contain composite-encoded entries such as `"Inner Aisles::4"`. Reading those entries as section names after the refactor produces nonsensical UI rows (e.g., a section labelled `Inner Aisles::4`) and breaks ordering against the new key space.

The app must handle this transition cleanly on first launch after upgrade.

### Business Drivers

- Zero garbage rendering on upgrade (KPI 4 in `outcome-kpis.md`).
- Single user, minimal stored data — preservation of customised order across the refactor is **not** required (D3 in DISCUSS wave-decisions).
- Maintainability — migration code that runs forever or duplicates across adapters is more expensive than its benefit.

### Constraints

- Two adapter implementations exist: Firestore (`firestore-section-order-storage.ts`) and AsyncStorage (`async-section-order-storage.ts`). Both must be covered.
- The port interface (`SectionOrderStorage`) is value-agnostic and stable; widening it for migration is a contract change.
- Section names are user-supplied strings; the app's UI does not allow `::` to enter a section name (no editor accepts that punctuation as a section component).
- The only historical source of `::` in stored `section_order` arrays is the predecessor composite encoder.

## Decision

**Detect legacy composite-shaped orders by the presence of `::` in any stored entry. On detect, wipe the order via the existing `clearOrder()` method. Implement detection in the `useSectionOrder` hook on first read after mount.**

Concretely:
1. Hook calls `sectionOrderStorage.loadOrder()` on mount.
2. If the loaded value is `string[]` and any entry contains `::`, the hook calls `sectionOrderStorage.clearOrder()` and surfaces local state as `null`.
3. After the wipe, all subsequent reads return `null` (default-sort path).
4. The migration is idempotent: a wiped store fails the legacy-detection predicate immediately on next launch.

The hook-level placement covers both adapters with a single implementation. The port and adapters are unchanged.

## Alternatives Considered

### Option B: Schema version field on the stored document

Add a version field (e.g., `{ version: 2, order: string[] | null }`) to the Firestore document and a parallel key (`@grocery/section_order_v`) for AsyncStorage. Read paths gate on version; mismatched versions trigger migration logic.

**Evaluation:**
- Pro: Preserves customised order across schema changes.
- Pro: Generalisable to future migrations.
- Con: Requires changes in both adapters (read + write of the version field) plus a migration step that maps composite keys to section names (which requires deduping and is non-trivial).
- Con: For a single user with minimal stored data who has confirmed wipe is acceptable (D3), the value is zero — Carlos will rebuild the order in seconds.
- Con: Adds permanent complexity (version handling) for a one-time refactor.
- Rejected: Over-engineered for this app's scale and user agreement.

### Option C: Per-adapter migration

Implement legacy-shape detection inside each adapter's `initialize()` method. The Firestore adapter checks the loaded snapshot; the AsyncStorage adapter checks the parsed value.

**Evaluation:**
- Pro: Migration sits at the storage boundary, which can feel architecturally tidy.
- Con: Duplicates the predicate across two files. If a third adapter is added (null adapter, future cloud adapter), the predicate must be copied again.
- Con: The hook is the natural seam for "what does the React tree see as section order"; sanitising at the hook level keeps adapter implementations free of feature-cycle migration concerns.
- Con: Both adapters today are value-agnostic — they treat the order as opaque `string[]`. Adding feature-specific migration there breaks that property.
- Rejected: Incurs duplication for no architectural gain.

### Option D: Migration utility module

Create `src/migrations/section-order-legacy.ts`, invoked once from `useAppInitialization`.

**Evaluation:**
- Pro: Centralised migration logic; future migrations would gain a home.
- Con: Adds a module for a single one-line predicate that is fully testable through the hook's existing test surface.
- Con: Speculative generality — there is no second migration on the horizon.
- Rejected: Premature abstraction.

## Consequences

### Positive

- One implementation site (the hook) covers all adapters, current and future.
- Port contract unchanged (no widening for migration concerns).
- Adapter files stay value-agnostic.
- Migration is idempotent and self-extinguishing — once stored data is wiped, the predicate never fires again.
- KPI 4 (zero `::` rows post-launch) is directly testable via the hook's behaviour with a fake storage seeded with composite-shaped data.

### Negative

- The legacy predicate (`entry.includes('::')`) embeds an implicit invariant: section names will not contain `::`. If a future feature legitimately stores section names containing `::` (no current UI flow does), the predicate misfires and wipes valid data on the next launch.
- The mitigation is a documented invariant in this ADR. If the constraint becomes false in the future, a follow-up migration is straightforward — replace the predicate with whatever shape change the new schema needs.
- A user who had built a customised composite order will lose it. Acknowledged and accepted under D3.

### Quality Attribute Impact

| Attribute | Impact |
|---|---|
| Reliability under upgrade | Positive — zero garbage rows on first launch (KPI 4) |
| Maintainability | Positive — single migration site, no port/adapter contract change |
| Testability | Positive — fake `SectionOrderStorage` returning a composite-laden array drives the migration test |
| Functional suitability | Neutral — wiped order falls back to default alphabetical sort, which is the documented null-order behaviour |

## Notes

- The predicate must run **before** any consumer (e.g., `SectionOrderSettingsScreen` or `StoreView`) reads the order; placing it inside the hook's mount-time `useEffect` guarantees this ordering since both consumers read the order through the hook.
- The wipe propagates to remote storage via the existing `clearOrder()` path, which on Firestore writes `{ order: null }` to the document. The Firestore listener echoes this write back through the existing own-write echo detection (serialised-equal snapshot skip), so no spurious React re-renders occur.
- Documentation of the invariant ("section names will not contain `::`") lives in this ADR and in the design's §8 ("Migration Strategy").
