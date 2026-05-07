# Evolution — show-single-aisle-number

**Feature ID**: show-single-aisle-number
**Date**: 2026-05-07
**Refines**: `aisle-subgroups-in-store-view` (Q5b decision)
**Job Trace**: `store-navigation` (`docs/product/jobs.yaml`)
**Status**: SHIPPED
**Paradigm**: Functional TypeScript (per CLAUDE.md)
**Density**: lean (LEAN v3.14 — single `feature-delta.md`, archived in this evolution doc)

---

## 1. Summary

**Problem**: After `aisle-subgroups-in-store-view` shipped, single-aisle section cards rendered flat with no aisle cue (Q5b: "single-aisle section collapses — no badge", on the theory that `Aisle 12` inside a `Frozen` card was redundant). Mid-shop reality (Carlos, 2026-05-07): the badge is *not* redundant. The aisle number is the whole point of opening the section card. Without it, Carlos still had to tap an item or switch back to home view to learn that `Frozen` lives in aisle 12. The "redundancy" Q5b avoided was visual; the cost was the actual decision Carlos needs to make on every single-aisle section he passes through during a trip — *which physical aisle do I walk to?*

**Solution**: Reverse Q5b for the *single-numeric-aisle* case only. The existing `partitionSectionByAisle` helper in `src/domain/item-grouping.ts` collapsed both single-numeric-aisle and all-null sections to the same `null` return — the UI could not tell them apart. DESIGN tightened the helper's return type into a discriminated union `AislePartition = { kind: 'flat-no-aisle' } | { kind: 'single-aisle'; aisleNumber: number } | { kind: 'multi-aisle'; subGroups: AisleSubGroup[] }`. `AisleSection.tsx` switches on `partition.kind`: the `single-aisle` arm renders the existing flat path *plus* an `Aisle N` badge slot in the header, reusing the same `aisleBadge` style as the multi-aisle subgroups. The `flat-no-aisle` and `multi-aisle` arms render byte-identically to today.

---

## 2. Business Context

This is a **brownfield UI refinement** of the just-shipped `aisle-subgroups-in-store-view` feature, surfaced from direct field use.

User's verbatim DISCUSS request: *"I only see items per store section ordered by aisle, but it doesn't tell me which aisle I'm in"* — already addressed for multi-aisle sections by `aisle-subgroups-in-store-view`, but the single-aisle-section case slipped through Q5b's collapse rule. This feature flips that one decision while preserving every other contract from the prior feature.

- The job (JS4 — Store Navigation) was already validated upstream; no fresh JTBD analysis (DISCUSS D4 traces to existing `store-navigation` job).
- `docs/product/jobs.yaml` was bootstrapped on first use in this DISCUSS wave with the `store-navigation` job entry (formalizes the previously-informal `JS4`). This is the only SSOT update; happened in-flight, not at finalize.
- All-null sections (e.g. `Produce`) remain flat — there is no aisle number to surface.
- Mixed numeric + null sections (e.g. `Bakery` with aisle-9 items + a null item) remain multi-aisle subgrouped. Any null disqualifies "single-aisle".
- No persistence change. Pure presentation + a return-type widening on one domain helper.

KPI is **qualitative**: self-reported / observational by the dogfood user (Carlos) over the next 3 shopping trips. Target: ~zero "tap an item to learn the aisle" interactions on first-touch with a single-aisle section card. No telemetry instrumentation (single-user app, lean density).

---

## 3. Key Decisions

### DISCUSS (D1–D7)

- **[D1]** Feature type: User-facing UI.
- **[D2]** Walking skeleton: No (brownfield isolated UI tweak — superseded in DISTILL by D-DISTILL-1 below, which adopted Strategy A "Full InMemory" given the pure-domain + UI nature, and identified scenarios #3 and #6 as the skeleton pair).
- **[D3]** UX research depth: Lightweight (happy path focus).
- **[D4]** JTBD: Yes — story traces to `store-navigation`.
- **[D5]** Single carpaccio slice — feature delivers as one thin end-to-end behaviour change.
- **[D6]** `jobs.yaml` bootstrapped on first use; `JS4` → `store-navigation`.
- **[D7]** **Reverses `aisle-subgroups-in-store-view` Q5b**: single numeric-aisle sections now show their aisle number; all-null sections remain flat. Recorded explicitly so the prior feature's decision log stays internally consistent.

### DESIGN (DDD-1, DDD-2, DDD-3)

- **[DDD-1]** Replace `partitionSectionByAisle` return type `AisleSubGroup[] | null` with the discriminated union `AislePartition = { kind: 'flat-no-aisle' } | { kind: 'single-aisle'; aisleNumber: number } | { kind: 'multi-aisle'; subGroups: AisleSubGroup[] }`. The helper already computed the discriminant internally (numeric bucket count + null-bucket presence); promoting it to the type system lets the UI consume an exhaustive switch. Rejected: a sibling helper `singleAisleNumber(group): number | null` next to the existing `partitionSectionByAisle` — would duplicate the case analysis at two call sites and is prone to drift. No ADR warranted (return-type widening on an existing helper, single caller, no rejected alternatives at the architecture level).
- **[DDD-2]** `AisleSection.tsx` consumes the union via exhaustive `switch`/`if` on `kind`. The `flat-no-aisle` branch renders today's flat path byte-identical (no badge). The `single-aisle` branch renders the existing flat path *plus* an `Aisle N` badge slot in the header. The `multi-aisle` branch is unchanged. Preserves the D-NOREGRESS contract from `section-order-by-section`/`aisle-subgroups-in-store-view`.
- **[DDD-3]** The single-aisle badge slot lives inside the existing `headerRight` row. Visual style reuses the existing `aisleBadge` style from the multi-aisle subgroup (consistency with the badge users already learned in the prior feature).

### DISTILL (D-DISTILL-1..3)

- **[D-DISTILL-1]** Walking-skeleton strategy: A (Full InMemory). Pure domain + UI render; no driven adapters, no I/O.
- **[D-DISTILL-2]** Test placement: domain unit tests refactored in place at `src/domain/item-grouping.test.ts` (existing convention enforced by `scripts/check-domain-test-siblings.mjs`); UI regression scenarios in a new `tests/regression/show-single-aisle-number.test.tsx` mirroring sibling regression files. No `.feature` Gherkin (project stack is Jest + RNTL); Gherkin structure preserved at the `it()` title level.
- **[D-DISTILL-3]** Scaffold trade-off: original Mandate-7 plan called for `throw new Error('__SCAFFOLD__ ...')` inside the helper's single-aisle branch. That conflicted with "do NOT BREAK existing tests" — the prior `AisleSection.test.tsx` already renders single-aisle sections, and a throwing helper would propagate as render exceptions, turning passing tests RED for the wrong reason. Resolution: implement the helper functionally (so all 8 refactored domain tests stay GREEN immediately after the type widening) and locate the RED scaffold at the UI badge slot (`headerBadge: React.ReactNode = null` with `// __SCAFFOLD__`), where it cleanly isolates the *user-observable* feature signal from the *internal contract*.

### DEVOPS / DELIVER

- Functional crafter (per CLAUDE.md paradigm). Single-step finish: flip the `headerBadge` `__SCAFFOLD__` slot to render `<Text testID={`section-aisle-badge-${partition.aisleNumber}`} style={...}>{partition.aisleNumber}</Text>` for the `single-aisle` arm. Walking-skeleton scenario flips RED → GREEN. No L1–L6 refactor pass needed (single-arm switch case + JSX expression).

---

## 4. Steps Completed

1 implementation step (`01-01`). Every phase EXECUTED PASS or correctly SKIPPED with rationale (`RED_UNIT` skipped: NOT_APPLICABLE — walking-skeleton scenario serves as the failing test at the appropriate granularity for a single-arm switch case; a separate unit test would only duplicate the assertion).

| Step | Outcome | Commit |
|---|---|---|
| 01-01 | `headerBadge` slot in `src/ui/AisleSection.tsx` renders `Aisle N` badge for the `kind === 'single-aisle'` arm; `__SCAFFOLD__` marker removed; testID template `section-aisle-badge-${aisleNumber}` matches the walking-skeleton query; multi-aisle and flat-no-aisle arms unchanged | `62ac0d6` |

`verify_deliver_integrity`: exit 0. All phases logged. No L1–L6 refactor warranted.

---

## 5. Implementation Footprint

- **1 file changed at runtime**: `src/ui/AisleSection.tsx` — ~5 LOC of JSX inside the `single-aisle` switch arm (the badge `<Text>` element + its style reference).
- **1 type widened**: `partitionSectionByAisle` return type in `src/domain/item-grouping.ts` from `AisleSubGroup[] | null` → `AislePartition` discriminated union (DDD-1). Internal bucketing logic untouched; only the assembly of the return value differs.
- **1 new file**: `tests/regression/show-single-aisle-number.test.tsx` — 5 scenarios (1 walking-skeleton, 4 regression locks).
- **2 test files refactored**: `src/domain/item-grouping.test.ts` (8 existing scenarios migrated to navigate the union; new single-aisle scenarios added) and `src/ui/AisleSection.test.tsx` (existing 12 scenarios unchanged byte-equivalent — they already pass through `AisleSection`'s public prop contract, which is unchanged).
- No new files in `src/`. No new types exported beyond `AislePartition`. No new directories. No new dependencies. No new ADR.

---

## 6. Test Counts

- Domain unit (`src/domain/item-grouping.test.ts`): 8 tests refactored to navigate the `AislePartition` union, all green; new single-aisle and "any null disqualifies single-aisle" scenarios green.
- UI regression (`tests/regression/show-single-aisle-number.test.tsx`): 5 scenarios. 1 walking-skeleton (`section-aisle-badge-12` testID present) + 4 regression locks (all-null no badge, multi-aisle no top-level badge, mixed numeric+null no top-level badge, section progress + ✓ unchanged).
- Component regression (`src/ui/AisleSection.test.tsx`): 12 prior scenarios untouched, stay green.
- Mutation testing (per CLAUDE.md, scoped to `src/domain/item-grouping.ts`): **83.21% kill rate** (≥80% threshold). Stryker break-threshold: PASS. The `kind: 'single-aisle'` branch in `partitionSectionByAisle` and its `numericKeyCount === 1 && !hasNulls` guard are **killed**; the 17 surviving mutants are pre-existing (comparator branch micro-mutations in `compareItemsInSection`, empty-input fast path in `groupBySection`, and one dead-code helper `distinctAisleKeyCount`) — all out of scope for this feature, none represent a behaviour gap introduced by the single-aisle widening.
- `verify_deliver_integrity`: exit 0.

Mutation report: `docs/feature/show-single-aisle-number/deliver/mutation/mutation-report.md` (preserved in workspace).

---

## 7. Lessons Learned

### Discriminated-union return type beats sibling helper for a multi-case partition

DDD-1 had a real alternative: leave `partitionSectionByAisle` returning `AisleSubGroup[] | null` and add a sibling `singleAisleNumber(group): number | null`. We rejected it. The sibling helper would force *both* call sites (the helper itself for the collapse decision, and the UI for the badge decision) to re-derive the same case analysis — `numericKeyCount === 1 && !hasNulls` — and stay in sync with each other forever. Promoting the discriminant into the return type instead means the case analysis exists once, in one place, and TypeScript's exhaustive-switch checking guards against drift. Lesson: when a pure helper already computes a multi-case discriminant internally, prefer widening the return type into a discriminated union over exposing siblings that re-compute the same discriminant. The cost is a one-time call-site migration; the benefit is permanent single-source-of-truth.

### "Do NOT break existing tests" forces scaffold placement at the user-observable boundary

D-DISTILL-3's resolution — moving the RED scaffold from a thrown error inside the helper down to a `null` badge slot in the UI — was forced by the invariant "do NOT BREAK existing tests" inherited from prior feature's regression posture. The prior `AisleSection.test.tsx` already rendered single-aisle sections (the prior feature's flat path); a throwing helper would have propagated as render exceptions and turned passing tests RED for the wrong reason. The fix wasn't a workaround — it produced a *better* scaffold position: the badge slot is exactly where a non-technical stakeholder would look to confirm "is the badge there or not?", which is the litmus test the methodology asks of walking-skeleton scenarios. Lesson: scaffold-position constraints from "do not break existing tests" tend to push the RED toward the user-observable boundary rather than the internal contract. That's the right direction; resist the temptation to put the scaffold deeper into the implementation just because the framework allows it.

### Q5b reversal is a normal feedback-loop event, not a regret

`aisle-subgroups-in-store-view` Q5b ("single-aisle section collapses — no badge") was a *defensible* DISCUSS decision at the time — the rationale "avoid redundant `Aisle 12` chrome when section header already implies it" reads consistent on paper. Field use revealed that the section header *doesn't* in fact imply the aisle number to the user mid-shop; the implication only holds if the user already knows which section maps to which aisle, which is exactly what they're trying to learn. The healthy pattern is: ship it, dogfood it, and write a small reversal feature when the field disconfirms the assumption — not to second-guess the prior decision in the abstract. Lesson: visual-redundancy heuristics during DISCUSS are weak signals; they should be tagged for dogfood validation rather than treated as settled. The feedback loop is short (~10 days here) and cheap when the architecture is already in place to flip one branch.

---

## 8. Issues Encountered

None. Single-step delivery, type-checker green throughout, walking-skeleton flipped GREEN on first run after `__SCAFFOLD__` removal.

---

## 9. Migrated Artifacts

**LEAN v3.14 feature**: full delta archived in this evolution doc; no separate architecture / UX migration needed. The `feature-delta.md` is a single ~700-line narrative covering all four waves (DISCUSS / DESIGN / DEVOPS / DISTILL) and is preserved in the feature workspace at `docs/feature/show-single-aisle-number/feature-delta.md` for the wave matrix and any future archeology.

No per-feature snapshots written to `docs/architecture/`, `docs/scenarios/`, `docs/ux/`, or `docs/adrs/` — none are warranted:

- No new ADR (return-type widening on an existing helper, internal to one aggregate, no rejected architecture-level alternatives — see DDD-1 rationale).
- No new architecture component or boundary (UI -> domain dependency direction unchanged; no new port, no new adapter, no new tech).
- No new UX journey (`docs/product/journeys/` scanned in DISCUSS — none relevant to in-store shopping; lean density + lightweight UX research depth = no `journey-delta.md` produced this wave).
- ADR-005 from `aisle-subgroups-in-store-view` (Aisle Sub-Grouping Belongs in the Domain) at `docs/product/architecture/brief.md` § Aisle Sub-Grouping continues to apply unchanged — the discriminated union is a refinement of that helper, not a departure from it.

The `docs/feature/show-single-aisle-number/` directory is **preserved** (not deleted) per the finalize protocol — the wave matrix continues to derive status from it. Session marker `.nwave/des/deliver-session.json` removed at finalize time.

The SSOT update for this feature (`docs/product/jobs.yaml` `store-navigation` entry) happened in-flight during DISCUSS, not at finalize — no additional SSOT writes needed.

---

## 10. Handoff

Feature complete. Commit `62ac0d6` already landed on `main`. Standard Expo OTA + `deploy-web.yml` republish on next push handles rollout to all already-deployed installs of the current native binary on next app launch. No data migration. Rollback path: `git revert 62ac0d6` and let the same OTA / `deploy-web.yml` mechanism republish the prior render — no data rollback step (no data was changed). No staged rollout window required.

Operations: no infra change; mutation-testing config (`stryker.config.mjs`) automatically picks up the changed file in `src/domain/`. Manual dogfood is the user's responsibility post-deploy per US-01 KPI: open store view, confirm `Frozen` (or any single-numeric-aisle section) shows `Aisle N` next to the section name, confirm `Produce` (all-null) shows no badge, confirm `Inner Aisles` (multi-aisle) shows no top-level badge but per-aisle subgroups render as before.
