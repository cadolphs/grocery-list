# Definition of Ready Validation: reorder-home-areas

**Feature ID**: reorder-home-areas
**Date**: 2026-04-17
**Stories validated**: US-RHA-01, US-RHA-02

---

## US-RHA-01: Reorder House Areas from Settings

| # | DoR Item | Status | Evidence |
|---|----------|--------|----------|
| 1 | Problem statement clear, domain language | PASS | Problem paragraph in user-stories.md describes Carlos's routine change and the specific pain (mental translation every sweep; delete+recreate workaround is destructive). No technical jargon. |
| 2 | User/persona identified with specific characteristics | PASS | Carlos Rivera — household grocery shopper, established Home sweep routine, changes his walking path over time. Reused from `custom-house-areas`. |
| 3 | 3+ domain examples with real data | PASS | Three examples: promote Laundry Room to top (happy), move Freezer up one (boundary), tap disabled up-arrow on Bathroom (boundary at top). Real area names, real persona (Carlos, Ana Lucia). |
| 4 | UAT scenarios in Given/When/Then (3-7) | PASS | 5 scenarios: reorder happy path, HomeView reflects order, up-arrow disabled at top, down-arrow disabled at bottom, staple preservation. |
| 5 | Acceptance criteria derived from UAT | PASS | 7 AC items, each mapping to specific scenario behaviors. |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | Estimated 1 day. 5 scenarios. |
| 7 | Technical notes: constraints / dependencies | PASS | Domain and hook already shipped; references line numbers in source. UI precedent named. Small-screen layout constraint flagged for DESIGN. |
| 8 | Dependencies resolved or tracked | PASS | All dependencies shipped: `useAreas.reorderAreas`, `AreaManagement.reorder`, `AreaStorage` adapter, `SectionOrderSettingsScreen` precedent. |
| 9 | Outcome KPIs defined with measurable targets | PASS | KPI-1 (time-to-reorder <30s), KPI-2 (40% adoption in 14d), KPI-4 and KPI-5 guardrails. Measurement methods specified. |

### Elevator Pitch Check (Dimension 0)

| Check | Result |
|-------|--------|
| Presence of Before/After/Decision | PASS — all three lines present at top of story |
| Real entry point in "After" | PASS — "taps the gear icon on HomeView, then taps the up-arrow button on 'Laundry Room' three times in Manage Areas" — concrete user-invocable UI actions |
| Concrete observable output | PASS — "Returns to HomeView and sees `[Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer]`" — observable list on screen, not internal state |
| Job connection / decision enabled | PASS — Carlos decides whether the new order matches his walk or needs tweaking |

### Story Status: **PASSED** all 9 DoR items plus Dimension 0

---

## US-RHA-02: Reorder Persists Across App Restart and Syncs to Other Devices

| # | DoR Item | Status | Evidence |
|---|----------|--------|----------|
| 1 | Problem statement clear, domain language | PASS | Describes Carlos's multi-device expectation and the specific trust risk if persistence/sync were to fail silently. |
| 2 | User/persona identified with specific characteristics | PASS | Carlos Rivera as a multi-device user (phone primary, tablet secondary) on a shared account. |
| 3 | 3+ domain examples with real data | PASS | Persistence across restart, cross-device sync within 5s, offline-then-online convergence. Real device names (phone, tablet), real area names. |
| 4 | UAT scenarios in Given/When/Then (3-7) | PASS | 3 scenarios: persistence across restart, cross-device propagation, staple counts consistent after sync. |
| 5 | Acceptance criteria derived from UAT | PASS | 3 AC items mapping to each scenario. |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | Estimated 0.5 day (verification tests only — no production code). |
| 7 | Technical notes: constraints / dependencies | PASS | Notes that this is verification of existing Firestore onSnapshot behavior; suggests integration tests with Firestore emulator. |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-RHA-01 (explicit) and shipped Firestore adapter. |
| 9 | Outcome KPIs defined with measurable targets | PASS | KPI-3 (sync latency <5s, 95th percentile) in outcome-kpis.md. |

### Elevator Pitch Check (Dimension 0)

| Check | Result |
|-------|--------|
| Presence of Before/After/Decision | PASS — all three lines present |
| Real entry point in "After" | PASS — "closes and reopens the app" and "opens the app on his tablet" — both are real user-invocable actions, not internal API calls |
| Concrete observable output | PASS — "HomeView shows the new order" on both devices — observable on-screen output, not internal flags |
| Job connection / decision enabled | PASS — Carlos decides he can trust reorder to stick and does the one-time update after any routine change |

### Story Status: **PASSED** all 9 DoR items plus Dimension 0

---

## Slice-Level Dimension 0 Check

The feature has 2 stories. Neither is tagged `@infrastructure`. Both describe user-observable outcomes (list reorders on screen; HomeView syncs across devices). Slice is not infrastructure-only.

**Slice-level Dimension 0**: PASS

---

## Requirements Completeness Check

| Category | Coverage | Notes |
|----------|----------|-------|
| Functional | PASS | Reorder action + persistence + sync covered |
| Non-Functional (Performance) | PASS | Time-to-reorder under 30s; sync latency under 5s (KPIs) |
| Non-Functional (Reliability) | PASS | Guardrail KPI-5 (≤0.5% failure rate) |
| Non-Functional (Accessibility) | PARTIAL | Disabled state semantics described but full WCAG review deferred to DESIGN. Flagged here. |
| Business Rules | PASS | Reorder must preserve staple assignments (AC-07 US-RHA-01); same set of areas (domain guarantee) |

**Completeness estimate**: 0.96 (accessibility full pass deferred to DESIGN; otherwise complete).

---

## Overall DoR Status: **PASSED**

Both stories ready for DESIGN handoff. No blocking items.

---

## Anti-Pattern Scan

| Anti-Pattern | Present? | Notes |
|--------------|----------|-------|
| Implement-X | NO | Stories framed as Carlos's pain, not "implement reorder" |
| Generic data | NO | Real persona (Carlos, Ana Lucia), real area names (Bathroom, Laundry Room, etc.) |
| Technical AC | NO | AC describe observable UI behaviors, not implementation ("up-arrow visually disabled," not "render with opacity 0.5") |
| Technical scenario titles | NO | All scenario titles describe user outcomes |
| Oversized stories | NO | Both stories ≤ 5 scenarios, ≤ 1 day |
| Abstract requirements | NO | Concrete examples with real data provided |

Scan result: **CLEAN**
