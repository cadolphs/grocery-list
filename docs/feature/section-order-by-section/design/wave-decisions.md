# DESIGN Decisions — section-order-by-section

**Wave**: DESIGN
**Date**: 2026-04-27
**Architect**: Morgan (PROPOSE mode)
**Refines**: `store-section-order` design

---

## Key Decisions

- **[D-DES-01] Recommended option: A — rename `AisleGroup → SectionGroup` and `groupByAisle → groupBySection`; intra-section aisle sort lives inside `groupBySection`.** Two alternatives (B: keep names; C: separate `sortItemsWithinSection` helper) rejected. Rationale: domain language must reflect the new ordering key; cohesive grouping function; one mental model. See architecture-design.md §6. Source: PROPOSE mode analysis of DISCUSS artifacts.
- **[D-DES-02] Migration logic placement: `useSectionOrder` hook, executed once on first read after mount.** Alternative (per-adapter migration) rejected because both adapter implementations are value-agnostic and would otherwise duplicate the legacy predicate. Source: design Q3 resolved per ADR-004.
- **[D-DES-03] Legacy detection predicate: any stored entry containing `::` (no schema version field).** Alternative (schema version document field) rejected per US-04 D3 (single user, minimal data, wipe acceptable). Documented in ADR-004.
- **[D-DES-04] Port unchanged.** `SectionOrderStorage` interface stays as-is (`string[] | null`). Semantic shift (entries are section names, not composites) is documented but not type-encoded.
- **[D-DES-05] No new components, no new ports, no new adapters.** Refactor is fully contained in 4 files with behavioural changes and 2 with rename-only changes.
- **[D-DES-06] `AisleSection.tsx` UI component name retained.** Only the prop name and type rename. Out-of-scope rename per the user's "section-order-by-section" framing; documented as known minor naming inconsistency.

---

## Reuse Analysis Table

Default verdict: **EXTEND**. CREATE-NEW only with evidence.

| Component | Path | Verdict | What changes |
|---|---|---|---|
| `StoreLocation`, `TripItem` types | `src/domain/types.ts` | UNCHANGED | — |
| `AisleGroup` / `groupByAisle` | `src/domain/item-grouping.ts` | EXTEND | Rename to `SectionGroup` / `groupBySection`; remove `aisleNumber` from group; sort items within each group aisle-ascending nulls-last |
| `sortByCustomOrder` / `appendNewSections` | `src/domain/section-ordering.ts` | EXTEND | Internal `groupKey` simplifies to `group.section`; type parameter changes from `AisleGroup` to `SectionGroup` |
| `SectionOrderStorage` port | `src/ports/section-order-storage.ts` | UNCHANGED | Interface identical; semantic shift documented in comment |
| Firestore section-order adapter | `src/adapters/firestore/firestore-section-order-storage.ts` | UNCHANGED | Value-agnostic; document schema identical |
| AsyncStorage section-order adapter | `src/adapters/async-storage/async-section-order-storage.ts` | UNCHANGED | Value-agnostic; storage key identical |
| `useSectionOrder` hook | `src/hooks/useSectionOrder.ts` | EXTEND | Add legacy-detection sanitisation on first read; call `clearOrder()` on detect |
| `useAppInitialization` | `src/hooks/useAppInitialization.ts` | UNCHANGED | — |
| `SectionOrderSettingsScreen` | `src/ui/SectionOrderSettingsScreen.tsx` | EXTEND | Drop composite parse/format helpers; render section name strings directly |
| `StoreView` | `src/ui/StoreView.tsx` | EXTEND | Switch to `groupBySection`, key by section name, prop renamed |
| `AisleSection` | `src/ui/AisleSection.tsx` | EXTEND | Prop name + type rename; component name retained |
| `ServiceProvider` | `src/ui/ServiceProvider.tsx` | UNCHANGED | — |

**Counts**: 6 EXTEND, 6 UNCHANGED, 0 CREATE-NEW.

**Justification for zero CREATE-NEW**: every artifact required for section-keyed ordering already exists from the `store-section-order` feature. The work is a re-keying refactor, not a feature build.

---

## Quality Attributes Validated

| Attribute (ISO 25010) | Strategy | Validation |
|---|---|---|
| Functional Suitability | Domain examples in user stories drive unit tests; KPI 1 + KPI 2 measure cardinality post-refactor | KPIs in `outcome-kpis.md` |
| Maintainability | Hexagonal direction unchanged; `dependency-cruiser` rules unchanged; one rename | Existing enforcement rules cover the refactor |
| Testability | Domain functions remain pure; null adapter still works; migration testable via fake storage | No new infrastructure dependencies |
| Reliability under upgrade | Wipe-on-detect runs once per mount; idempotent on subsequent loads | KPI 4 verifies zero `::` rows post-launch |
| Real-time consistency | Inherited; Firestore `onSnapshot` adapter unchanged; legacy-wipe write echoes through existing own-write detection | No behaviour change to listener pattern |

---

## ADRs Produced

- **ADR-004**: Wipe-on-Detect Migration for Legacy Composite Section Orders.

No other architectural decisions required (refactor stays inside the existing pattern; rename is tactical).

---

## C4 Component Diagram

L3 component diagram for the section-ordering subsystem after the refactor lives in `architecture-design.md` §9 (Mermaid `C4Component`). System Context (L1) and Container (L2) are unchanged from the parent `brief.md` and are not duplicated.

---

## Brief Update

The parent `docs/product/architecture/brief.md` is **not modified** by this refactor. The section-ordering subsystem inherits the existing `store-section-order` description; the changes are component-internal (re-keying + intra-section sort) and do not warrant a new brief entry. Documented under "Inherited subsystem" expectation in this file.

---

## Open Questions / Contradictions With DISCUSS

**None blocking.** One observation surfaced for the user's awareness:

- The UI component file is named `AisleSection.tsx` and renders what the new design calls a `SectionGroup`. The architecture design retains the component name to keep the refactor narrowly scoped (per the feature ID). If the user wants UI-level consistency, a follow-up rename (`AisleSection → SectionCard` or similar) is straightforward but out of scope here.

---

## Handoff

- **To DISTILL** (acceptance-designer): full DESIGN artifact set under `docs/feature/section-order-by-section/design/` plus DISCUSS materials. Domain examples in user stories already enumerate AC inputs/outputs.
- **To DEVOPS** (platform-architect): no infrastructure or CI/CD impact. Stryker mutation-testing config (per `CLAUDE.md`) automatically picks up the changed files in `src/domain/`. No new external integrations.
- **External integrations contract test annotation**: no change. Firestore section-order document schema is identical (still `{ order: string[] | null }`); the existing Firestore schema validation guidance from `brief.md` covers this document type.
