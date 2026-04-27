# Walking Skeleton — section-order-by-section

**SSOT**: `tests/acceptance/section-order-by-section/walking-skeleton.feature`

This document is a notes file. The Gherkin file is the source of truth.

## Strategy

**A (InMemory)**, confirmed by user 2026-04-27.

Domain functions are pure. UI integrates via `ServiceProvider` with `createNullSectionOrderStorage`. Real Firestore + AsyncStorage adapters are covered by per-adapter integration tests under `src/adapters/*/` (extended in DELIVER with `@real-io @adapter-integration` migration scenarios — out of scope for the acceptance suite).

## Riskiest path

The refactor changes three coupled contracts in one slice:

1. `groupBySection` (renamed from `groupByAisle`) — produces one `SectionGroup` per section name, items inside sorted aisle ascending nulls last.
2. `sortByCustomOrder` — operates on section-name keys (was composite).
3. Render keying — one card per section (was per `(section, aisle)` pair).

The walking skeleton exercises all three together with realistic Carlos data: an `Inner Aisles` section with three different aisle numbers (4, 5, 7) plus a `Produce` section, with a custom order `[Produce, Inner Aisles]`. This single scenario disproves the composite-key assumption end-to-end.

## What it does NOT cover (deferred to milestones)

- Migration of legacy composite-shaped stored orders (US-04) — milestone 2.
- Auto-append narrowing (US-03) — milestone 2.
- Settings screen row-count assertion (US-01) — milestone 1.
- Default-sort fallback when no custom order — milestone 1.

## Stakeholder demo

Carlos can read the scenario and confirm:
- "Yes, I have items in `Inner Aisles` at multiple aisle numbers."
- "Yes, I want one `Inner Aisles` card with my items in aisle order inside."
- "Yes, my custom walking order should put `Produce` first and `Inner Aisles` second."

That confirmation is the litmus test for Mandate 5 (walking skeleton user-centricity).
