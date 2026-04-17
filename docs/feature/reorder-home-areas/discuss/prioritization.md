# Prioritization: reorder-home-areas

**Feature ID**: reorder-home-areas
**Date**: 2026-04-17

---

## Scope Assessment

This feature is a single thin carpaccio slice. Applying the taste tests from the Elephant Carpaccio checklist:

| Taste Test | Result | Notes |
|------------|--------|-------|
| Does it deliver a user-observable behavior? | YES | Carlos can reorder areas and see the new order in HomeView |
| Can it be demoed in a single session? | YES | 30-second demo on one device |
| Is it independent of other unshipped slices? | YES | Domain + hook + adapter + HomeView rendering all already shipped |
| Is it ≤ 3 days of work? | YES | Estimated 1 day (add up/down buttons + wire to existing reorderAreas + verify) |
| Does it touch ≤ 3 bounded contexts? | YES | Only `src/ui/AreaSettingsScreen.tsx` changes |
| Does it produce testable outcomes? | YES | Gherkin scenarios written, UAT-ready |

Verdict: **one slice, do not split.**

---

## Rejected Splits (Documented for Traceability)

| Proposed Split | Reason Rejected |
|----------------|-----------------|
| "UI controls" then "Auto-save" | Up/down without auto-save is broken (Carlos loses order on restart). Cannot ship separately without regression. |
| "Phone-only" then "Cross-device sync" | Sync is not new code; it is a property of the existing AreaStorage adapter. Holding verification back delivers no learning. |
| "Settings-only reorder" then "In-sweep reorder" | Second slice is DEFERRED as a future feature pending a falsified learning hypothesis — not a release split for this feature. |

---

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Sole release (US-RHA-01 + US-RHA-02 together) | Carlos reorders areas to match his walk; order persists and syncs | Time-to-reorder under 30s; reorder used at least once within 2 weeks of access | The minimum end-to-end that closes Carlos's pain. No meaningful smaller viable deliverable. |

---

## Backlog Suggestions

| Story | Release | Priority | Outcome Link | Dependencies |
|-------|---------|----------|--------------|--------------|
| US-RHA-01 | Sole | P1 | KPI-1 (time-to-reorder) | `useAreas.reorderAreas` (shipped), `AreaStorage` (shipped), `AreaSettingsScreen` (shipped — modified here) |
| US-RHA-02 | Sole | P2 | KPI-2 (persistence reliability) | US-RHA-01, Firestore adapter (shipped) |

---

## Future Work (NOT This Feature)

Pending the learning hypothesis ("Carlos does not need in-sweep reorder"):

- **Future slice**: In-sweep reorder (reorder areas from HomeView without navigating to settings). Only triggered if Carlos explicitly asks for it after 2 weeks of using the settings-based flow.
- **Future slice**: Drag-and-drop reorder (upgrade from up/down buttons). Only triggered if up/down proves fiddly for users with 8+ areas. The backing `reorderAreas(newOrder)` function is control-agnostic, so a future swap is purely UI work.

These are called out here so DESIGN wave does not pre-build for them and so future product conversations have a reference point.

---

## Riskiest Assumption

> "Up/down buttons are sufficient. Carlos does not need drag-and-drop or in-sweep reorder to feel his walk matches the app."

If this assumption is false, we will know by: (a) Carlos explicitly complaining, (b) analytics showing low reorder usage suggesting friction, or (c) Carlos manually editing storage/config to work around the UI. All three signals are observable post-release via the outcome KPIs.

---

## Value × Urgency / Effort

| Story | Value (1-5) | Urgency (1-5) | Effort (1-5) | Priority Score |
|-------|-------------|---------------|--------------|----------------|
| US-RHA-01 | 4 (directly closes documented pain) | 3 (routine has already changed; friction accumulates) | 1 (small UI wire-up) | 12 |
| US-RHA-02 | 2 (regression coverage, not new capability) | 2 (nice to ensure before next multi-device session) | 1 (declarative scenario only) | 4 |
