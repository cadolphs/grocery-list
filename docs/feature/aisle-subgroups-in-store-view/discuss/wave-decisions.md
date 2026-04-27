# DISCUSS Decisions — aisle-subgroups-in-store-view

## Key Decisions

- [D1] **Aisle boundary inside section card = divider + numeric badge** (Q1=c). Rationale: minimal visual chrome that still creates a hard boundary cue. Source: user 2026-04-27.
- [D2] **All-null sections render flat — no sub-header at all** (Q2=a). Rationale: aisle is meaningless in `Produce`/`Deli`; sub-header would be noise. Source: user 2026-04-27.
- [D3] **Mixed numeric + null sections place null group last under `No aisle` badge** (Q3=a). Rationale: keeps numeric flow ascending and gives the orphan items a deterministic, labelled home. Source: user 2026-04-27.
- [D4] **Per-aisle progress + completion checkmark** (Q4=a). Rationale: aisle-level closure cue is the second pillar of the orientation goal. Source: user 2026-04-27.
- [D5] **Single-aisle section collapses — no badge** (Q5=b). Rationale: avoid redundant `Aisle 12` chrome when section header already implies that aisle. Source: user 2026-04-27.
- [D6] **Aisle order inside section stays ascending; user-defined aisle order out of scope** (Q6=a). Rationale: ascending matches walking order in the layout we have today; settings UI extension would explode scope. Source: user 2026-04-27.
- [D7] **JTBD skipped**. Rationale: JS4 Store Navigation already validated in two prior features.
- [D8] **Lightweight UX research depth**. Rationale: brownfield refinement; journey already documented in `section-order-by-section`. Captured as `journey-delta.md`, not full visual + YAML + feature.
- [D9] **No walking skeleton**. Rationale: brownfield; existing infra reused.

## Requirements Summary

- Primary user need: Carlos wants to know which aisle he is in mid-shop, and to feel closure when he finishes an aisle, without leaving the section card model established by `section-order-by-section`.
- Walking skeleton: N/A (brownfield).
- Feature type: user-facing (UI-only refinement).

## Constraints Established

- No persistence change; pure presentation + one domain helper.
- Section-level header behaviour (progress, checkmark, header text) must not regress.
- Section ordering model from `section-order-by-section` is preserved unchanged.
- `groupBySection` contract is preserved; new helper composes on top.

## Upstream Changes

See `journey-delta.md` § Changed Assumptions for the back-propagation against `section-order-by-section` D2.

## Handoff

- **To DESIGN** (nw-solution-architect): full artifact set in this folder.
- **To DEVOPS**: `outcome-kpis.md` only (single-user, observational — no new instrumentation likely required).
