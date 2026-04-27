# Evolution — aisle-subgroups-in-store-view

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27
**Refines**: `section-order-by-section` (D2)
**Status**: SHIPPED
**Paradigm**: Functional TypeScript (per CLAUDE.md)

---

## 1. Summary

**Problem**: After `section-order-by-section`, store-view section cards collapsed to one header per section with items sorted aisle-ascending inside. This worked for *macro* walking order but stripped the *aisle* signal. Carlos walking `Inner Aisles` from aisle 4 through 5 to 7 received no on-screen cue when crossing an aisle boundary — just an unbroken list of items. He could not tell which aisle he was in mid-shop, and got no closure cue when finishing an aisle.

**Solution**: A pure-domain helper `partitionSectionByAisle(group: SectionGroup): AisleSubGroup[] | null` next to `groupBySection` in `src/domain/item-grouping.ts`. `null` return = render flat (single-aisle, all-null, or empty); otherwise numeric-asc sub-groups followed by an optional `null`-keyed tail (`No aisle`). `AisleSection.tsx` consumes the helper and branches: flat path preserves today's render exactly; sub-grouped path renders inline AisleSubGroup blocks (divider + numeric/`No aisle` badge + per-aisle `X of Y` progress + ✓ on completion + items). No new ports, adapters, components files, persistence change, or dependencies.

---

## 2. Business Context

This is a **brownfield UI refinement** of the just-shipped `section-order-by-section` feature.

- The previous feature satisfied *ordering* but not *orientation*. Mid-shop user feedback 2026-04-27: "I only see items per store section ordered by aisle, but it doesn't tell me which aisle I'm in."
- The job (JS4 — Store Navigation) was already validated upstream; no fresh JTBD analysis was required (DISCUSS D7).
- UX research depth was lightweight: a `journey-delta.md` was produced (full journey lives in parent feature `section-order-by-section`).
- No persistence change. Pure presentation + one domain helper. `groupBySection` contract is preserved; the new helper composes on top.

KPIs (observational / self-reported, retained in the feature workspace `discuss/outcome-kpis.md`): aisle-boundary visibility cue present, per-aisle closure cue present, single-aisle and all-null collapse paths suppress chrome, section-level header behaviour preserved (D-NOREGRESS).

---

## 3. Key Decisions

### DISCUSS (D1–D9 in `discuss/wave-decisions.md`)

- **[D1]** Aisle boundary inside section card = divider + numeric badge (Q1=c). Minimal visual chrome with hard boundary cue.
- **[D2]** All-null sections render flat — no sub-header at all (Q2=a). Aisle is meaningless in `Produce`/`Deli`.
- **[D3]** Mixed numeric + null sections place null group last under `No aisle` badge (Q3=a). Keeps numeric flow ascending; orphans get a deterministic, labelled home.
- **[D4]** Per-aisle progress + completion checkmark (Q4=a). Aisle-level closure cue is the second pillar of orientation.
- **[D5]** Single-aisle section collapses — no badge (Q5=b). Avoid redundant `Aisle 12` chrome when section header already implies it.
- **[D6]** Aisle order inside section stays ascending; user-defined aisle order out of scope (Q6=a).
- **[D7]** JTBD skipped — JS4 already validated.
- **[D8]** Lightweight UX research depth — brownfield refinement; `journey-delta.md`, not full visual + YAML + feature.
- **[D9]** No walking skeleton — brownfield; existing infra reused.

### DESIGN (D1–D8 + D-NOREGRESS in `design/wave-decisions.md`)

- **[D1]** Aisle key type = `number | null` (where `null` is the sentinel for "no aisle"). Rejected: string sentinel `'__no_aisle__'` (loses numeric ordering).
- **[D2]** Partition lives in domain, not UI. Layout-relevant aggregation rules (asc + null-tail + collapse + per-aisle counts) are domain concepts. See **ADR-005**.
- **[D3]** Single-aisle and all-null collapse encoded in the partition function (returns `null`). Single source of truth for "flat render"; UI branches once.
- **[D4]** Mixed numeric + null ordering = numeric ascending first, then `null` tail.
- **[D5]** Render shape = extend `AisleSection` in place with an inline AisleSubGroup render block. No new top-level React component file (no reuse target).
- **[D6]** Per-aisle `checkedCount` / `totalCount` derived inside the partition function, mirroring `SectionGroup`'s shape. UI reads, never recomputes.
- **[D7]** Reuse over rewrite — `groupBySection` and `compareItemsInSection` are untouched. Partition consumes their already-aisle-asc/null-last ordered output.
- **[D8]** `AisleSubGroup` type mirrors `SectionGroup` shape: `{ aisleKey, items, totalCount, checkedCount }`. Symmetric aggregate semantics → identical render code shape for progress + checkmark.
- **[D-NOREGRESS]** Section-level header behaviour does not change. Text, X of Y, and ✓ render identically on both flat and sub-grouped branches. Existing tests for section progress + completion remain green by construction.
- **ADR-005** produced: Aisle Sub-Grouping Belongs in the Domain, Composing on `groupBySection` (already at `docs/product/architecture/adr-005-aisle-subgrouping-domain-helper.md`).

### DISTILL (D1–D8 in `distill/wave-decisions.md`)

- **[D1]** No walking skeleton, by carry-over from DISCUSS D9.
- **[D2]** Test boundaries split between domain unit (`src/domain/item-grouping.test.ts`) and UI component (`src/ui/AisleSection.test.tsx`). `StoreView.test.tsx` untouched as regression gate.
- **[D3]** No new test framework introduced. Jest 29 + jest-expo + @testing-library/react-native 13.
- **[D4]** Test data shape: build `SectionGroup` fixtures by feeding raw items through `groupBySection` (the production composition), not by constructing literals — keeps partition tests honest about upstream invariants.
- **[D5]** New testIDs: `aisle-subgroup-{aisleKey | 'no-aisle'}`, `aisle-subgroup-complete-{aisleKey | 'no-aisle'}`. Existing testIDs retained.
- **[D6]** D-NOREGRESS asserted in two places: `StoreView.test.tsx` (existing) + five `@noregress`-tagged scenarios in `AisleSection.test.tsx`.
- **[D7]** One-at-a-time slice discipline.
- **[D8]** No `@kpi` or `@real-io` scenarios — observational KPIs; no new driven adapters.

### DELIVER

- Functional crafter (per CLAUDE.md paradigm). Mutation strategy: per-feature, kill-rate ≥80% on `src/domain/**`.
- Adversarial review verdict: **APPROVE** (verbal — captured in conversation; no review file written).

---

## 4. Steps Completed

4 implementation steps + 1 refactor pass. Every step DONE in `execution-log.json`; phases EXECUTED PASS or correctly SKIPPED with rationale.

### Phase 01 — Domain helper + dividers/badges (US-01)

| Step | Outcome | Commit |
|---|---|---|
| 01-01 | `partitionSectionByAisle` domain helper + `AisleSubGroup` / `AisleKey` types; pure-function tests for partition shape, ordering, collapse | `59f0271` |
| 01-02 | `AisleSection.tsx` extended with sub-grouped render branch: dividers, numeric / `No aisle` badges; flat path preserved on collapse | `375e205` |

### Phase 02 — Per-aisle progress + completion checkmark (US-02)

| Step | Outcome | Commit |
|---|---|---|
| 02-01 | Domain regression-lock tests for per-aisle `checkedCount` / `totalCount` semantics (counts already derived in 01-01; `GREEN` correctly `SKIPPED: NOT_APPLICABLE`) | `d8693a7` |
| 02-02 | Per-aisle `X of Y` progress text + ✓ on aisle completion; section-level header behaviour unchanged (D-NOREGRESS scenarios green) | `ecd5218` |

### Refactor pass (L2)

| Step | Outcome | Commit |
|---|---|---|
| refactor-L2 | Unify duplicated progress + completion helpers across section/aisle render branches | `36863d6` |

Adversarial review verdict: **APPROVE** (verbal; no review file written).

---

## 5. Test Counts

- Domain unit (`src/domain/item-grouping.test.ts`): new `partitionSectionByAisle` scenarios green.
- Component (`src/ui/AisleSection.test.tsx`): new file; slice-01 and slice-02 scenarios green; 5 `@noregress`-tagged section-level scenarios green.
- Regression gate (`src/ui/StoreView.test.tsx`): untouched, stays green.
- Mutation testing (per CLAUDE.md, scoped to `src/domain/**`): **86.55% kill rate** (≥80% threshold). 16 surviving mutants documented — sort comparator (3) + `indexOf` tie-break (1) + 12 pre-feature `groupBySection` survivors out of scope.
- `verify_deliver_integrity`: exit 0.

Mutation report: `docs/feature/aisle-subgroups-in-store-view/deliver/mutation/mutation-report.md`.

---

## 6. Lessons Learned

### Collapse signal as `null` return — single source of truth simplified UI branching

Encoding the "render flat" decision (single-aisle / all-null / empty) as a `null` return from `partitionSectionByAisle` rather than always-array-then-decide-in-UI gave the component a single branch (`partition === null ? flat : subGrouped`). The collapse rule lives once, in the domain, and the UI cannot drift from it. Lesson: when a domain helper emits a layout-shape decision, prefer a discriminating return type (`T[] | null` or a tagged union) over a boolean flag the caller has to combine with the data — the caller can't forget to check.

### Fixtures via `groupBySection` over `makeItem` factories produced realistic test inputs

For domain-unit tests of `partitionSectionByAisle`, building `SectionGroup` fixtures by feeding raw items through the production `groupBySection` composition (rather than constructing `SectionGroup` literals) kept the partition tests honest about the upstream invariants (aisle-asc + null-last + stable input order) that the partition relies on. A literal-based fixture could have lied about ordering and given the partition undeserved confidence. Lesson: when one pure function consumes another's output, build downstream fixtures by *running* the upstream — not by hand-rolling its shape.

---

## 7. Issues Encountered

### Mid-GREEN test bug fix (JSON.stringify of React tree → circular ref)

During the GREEN of one component test, an early debugging assertion attempted `JSON.stringify(rendered.toJSON())` on a deep React tree, hitting a circular reference and exploding the test runner. The fix was to replace the diagnostic with a focused `getByText('No aisle')` query — the actual assertion the test was meant to make. Test integrity preserved; no production code changed. Lesson: avoid stringifying React trees as a debug aid in test code — query the tree by user-visible text or testID instead.

---

## 8. Migrated Artifacts

| Source (workspace) | Destination (permanent) |
|---|---|
| `design/architecture-design.md` | `docs/architecture/aisle-subgroups-in-store-view/architecture-design.md` |
| `design/component-boundaries.md` | `docs/architecture/aisle-subgroups-in-store-view/component-boundaries.md` |
| `distill/walking-skeleton.md` | `docs/scenarios/aisle-subgroups-in-store-view/walking-skeleton.md` |
| `discuss/journey-delta.md` | `docs/ux/aisle-subgroups-in-store-view/journey-delta.md` |
| ADR-005 | already at `docs/product/architecture/adr-005-aisle-subgrouping-domain-helper.md` (left in place; **not** duplicated to `docs/adrs/`) |
| Aisle Sub-Grouping subsection in product brief | already at `docs/product/architecture/brief.md` § Aisle Sub-Grouping (left in place) |

Discarded (process scaffolding):

- `discuss/dor-validation.md`, `discuss/prioritization.md`, `discuss/shared-artifacts-registry.md`, `discuss/story-map.md`, `discuss/user-stories.md`, `discuss/outcome-kpis.md`.
- `slices/slice-0*-*.md` (per-slice planning notes superseded by roadmap + execution log).
- `deliver/roadmap.json`, `deliver/execution-log.json`, `deliver/.develop-progress.json` (audit trail summarised here).
- `deliver/mutation/mutation-report.{html,json,md}` (kept under preserved workspace; report referenced from §5).
- `*/wave-decisions.md` (key decisions extracted into §3 above).

The `docs/feature/aisle-subgroups-in-store-view/` directory is **preserved** (not deleted) so the wave matrix continues to derive status from it. Session marker `.nwave/des/deliver-session.json` removed at finalize time.

---

## 9. Handoff

Feature complete. No next wave. Operations: no infra change; mutation-testing config (`stryker.config.mjs`) automatically picks up the changed files in `src/domain/`. Manual dogfood is the user's responsibility post-deploy per US-01 and US-02 KPIs.
