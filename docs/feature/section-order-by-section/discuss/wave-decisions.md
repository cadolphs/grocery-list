# DISCUSS Decisions — section-order-by-section

## Key Decisions

- [D1] **Section name = ordering key** (not composite `section::aisle`). Rationale: matches user mental model — sections are physical zones, aisles are sub-positions inside a zone. Source: user request 2026-04-27.
- [D2] **Single header per section in store view, items sorted by aisle ascending inside (Q1=a)**. Rationale: keeps UX clean; aisle is sub-order. Source: user confirmation 2026-04-27.
- [D3] **Wipe legacy stored composite order on upgrade (Q2)**. Rationale: single user, minimal data; cheaper than running migration logic forever. Source: user confirmation 2026-04-27.
- [D4] **Skip section-to-section navigation work (Q3)**. Rationale: feature does not exist today; user not aware. Out of scope. Source: user confirmation 2026-04-27.
- [D5] **Auto-append fires on new section name only (Q4)**. New aisle in known section = no diff. Source: user confirmation 2026-04-27.
- [D6] **JTBD analysis skipped (Q5)**. Job (JS4 Store Navigation) already validated in `store-section-order`. Source: user confirmation 2026-04-27.
- [D7] **Lightweight UX research depth**. Brownfield refinement; full journey already documented in prior feature. See `journey-delta.md`.
- [D8] **No walking skeleton**. Brownfield refinement; existing infra reused.

## Requirements Summary

- Primary user need: Carlos wants to reorder store sections at the section grain, with aisles auto-sub-ordered ascending inside.
- Walking skeleton: N/A (refinement).
- Feature type: cross-cutting (domain + storage migration + UI).

## Constraints Established

- Stored data shape change requires migration (wipe acceptable).
- `groupByAisle` shape changes (one group per section); downstream `StoreView` keying must update.
- Auto-append must dedupe by section name, not composite.

## Upstream Changes (Back-Propagation)

### Changed Assumptions

**Source**: `docs/feature/store-section-order/discuss/user-stories.md` (US-SSO-01)

> "Section key: composite of section name + aisle number (same as groupKey in item-grouping.ts)"

**New assumption**: Section ordering keys on section name only. Aisle number drops out of the order key entirely and becomes intra-section sort.

**Rationale**: The composite-key model produced redundant rows for sections spanning multiple aisles (e.g., `Inner Aisles` aisles 4, 5, 7 = 3 rows in settings). User feedback 2026-04-27: this does not match how shoppers think about store layout — sections are zones, aisles are sub-positions inside zones.

**DISCOVER documents**: unchanged (DISCUSS-only refinement).

## Handoff

- **To DESIGN**: full artifact set (this folder).
- **To DEVOPS**: `outcome-kpis.md` only.
