# Story Map: reorder-home-areas

**Feature ID**: reorder-home-areas
**User**: Carlos Rivera
**Goal**: Change the order of house areas so the Home-view sweep matches his current walking path.
**Date**: 2026-04-17

---

## Backbone

Since this is a small brownfield UI wire-up, the backbone is shallow: three user activities collapse the journey from "notice mismatch" to "see updated order."

| Activity 1: Notice & Enter | Activity 2: Reorder in Settings | Activity 3: Confirm & Resume Sweep |
|----------------------------|---------------------------------|------------------------------------|
| Open HomeView              | See ordered list with controls  | Tap back / see new HomeView order  |
| Notice walk order mismatch | Tap up/down on an area          | Sweep using new order              |
| Tap settings gear          | See Saved confirmation          | Optionally verify on 2nd device    |

---

## Walking Skeleton

**NOTE**: This feature had walking-skeleton = NO in wave decisions, because the skeleton already exists (domain + hook + adapter + HomeView rendering). What is missing is the UI control. Still, for story-mapping clarity, the minimum end-to-end slice is:

Activity 1 (tap gear → open settings) → Activity 2 (tap up/down → reorderAreas called → auto-save → "Saved" toast) → Activity 3 (back to HomeView → see new order).

All of these activities are covered by a single story (US-RHA-01), because the backing functions already exist and no split by technical layer is meaningful.

---

## Story Map

| Activity 1: Notice & Enter | Activity 2: Reorder | Activity 3: Confirm |
|----------------------------|---------------------|---------------------|
| **US-RHA-01**: tap gear icon | **US-RHA-01**: tap up/down on area | **US-RHA-01**: HomeView shows new order |
| (already works) | (NEW UI — up/down buttons) | (already works) |
| | (NEW UI — "Saved" toast) | (already works via Firestore sync) |
| | (NEW — disabled state at list boundaries) | **US-RHA-02**: cross-device sync verified |

---

## Release 1 — Sole Release (sliced as one thin end-to-end slice)

**Target outcome**: Carlos's Home-view sweep matches his current walking path within 30 seconds of noticing a mismatch.

**Stories**:

- **US-RHA-01** — Reorder house areas with up/down controls in settings (happy path + boundary behavior)
- **US-RHA-02** — Reorder persists across app restart and syncs to other devices (verification of existing sync behavior in the reorder context)

**Outcome KPI targeted**: Time-to-reorder under 30 seconds from entry to first visible HomeView change. (See `outcome-kpis.md`.)

**Rationale**: Both stories combined deliver the complete user-visible behavior. US-RHA-01 is the NEW UI work (~1 day). US-RHA-02 is a verification/regression slice that costs almost nothing to write but protects the sync contract for Carlos's two-device usage.

---

## Priority Rationale

1. **US-RHA-01** first — without this, nothing is reorderable. It is the minimum that closes the user pain. All other work is in service of or parallel to it.
2. **US-RHA-02** second — rides on top of US-RHA-01 but adds regression coverage for persistence and cross-device sync. Can ship in the same delivery slice because no additional code is required (the sync is Firestore's default behavior for AreaStorage, already in production).

There is no meaningful split by user outcome that would justify more than one release band. Proposed splits considered and rejected:

- "Add up/down controls" then "Add auto-save" — rejected: up/down without auto-save is a broken deliverable (Carlos would reorder and lose it on restart). They must ship together.
- "Phone-only reorder" then "Cross-device sync" — rejected: cross-device sync is not additional code; it is a verification test. Holding it back offers no learning.
- "In-settings reorder" then "In-sweep reorder" — the second slice is explicitly DEFERRED until the learning hypothesis (Carlos doesn't need in-sweep reorder) is falsified. Not a release split; a future feature.

---

## Anti-Patterns Checked

- [x] Feature-first slicing — N/A, single slice
- [x] No walking skeleton — N/A, skeleton pre-existed
- [x] Orphan stories — both stories trace to JS1 and outcome KPI
- [x] Activity gaps — all three activities represented
- [x] Effort-based priority — priority is by necessity, not ease
