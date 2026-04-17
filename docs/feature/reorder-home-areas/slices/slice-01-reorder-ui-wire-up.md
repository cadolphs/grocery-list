# Slice 01: Reorder UI Wire-Up in Settings

**Feature ID**: reorder-home-areas
**Slice**: 01 (sole slice)
**Date**: 2026-04-17

---

## Summary

Add up/down reorder buttons to each row in `AreaSettingsScreen`, wired to the existing `useAreas().reorderAreas(newOrder)` function. Add a "Saved" toast on successful reorder. Verify cross-device persistence.

This is the complete feature in one slice. See `prioritization.md` for why splitting was rejected.

---

## Stories Included

- **US-RHA-01** — Reorder house areas with up/down controls in settings
- **US-RHA-02** — Reorder persists across app restart and syncs to other devices

---

## Carpaccio Taste Tests

| Test | Result |
|------|--------|
| User-observable outcome | YES — Carlos sees HomeView in his chosen order |
| Demo-able in one session | YES — 30 seconds, start to finish |
| Independent (no other unshipped slices required) | YES |
| ≤ 3 days effort | YES — ~1 day |
| Touches ≤ 3 modules | YES — only `src/ui/AreaSettingsScreen.tsx` |
| Produces testable UAT | YES — 4 Gherkin scenarios |

---

## Technical Shape (handed to DESIGN)

- Modify `src/ui/AreaSettingsScreen.tsx` to render up/down arrow buttons per area row.
- Import `reorderAreas` from existing `useAreas()` hook (already exported).
- Reuse the `moveItem` helper pattern from `SectionOrderSettingsScreen.tsx:31-36` (or extract to a shared util if DESIGN prefers).
- Disabled state for up-arrow on first row and down-arrow on last row.
- "Saved" toast — reuse whichever toast component the app already uses (DESIGN to choose).
- No new ports, no new domain functions, no new hooks.

---

## Learning Hypothesis

> "Up/down reorder in settings is sufficient UX; Carlos does NOT need in-sweep reorder or drag-and-drop."

**Validation window**: 2 weeks post-release.
**Falsification signals**: explicit complaint, zero reorder usage after initial setup, workaround behaviors (edit/delete/recreate areas instead of reordering).

If falsified → next slice adds in-sweep reorder OR drag-and-drop, chosen based on the specific signal.

---

## Out of Scope for This Slice

- In-sweep reorder (reorder from HomeView mid-sweep) — deferred pending hypothesis falsification
- Drag-and-drop upgrade — deferred pending evidence that up/down is insufficient
- Batch reorder (select multiple, move together) — not requested
- Reset-to-default-order button — not requested; Carlos has custom areas anyway, there is no universal default

---

## Dependencies

All shipped:

- `src/domain/area-management.ts` `reorder()` method (verified at line 120)
- `src/hooks/useAreas.ts` `reorderAreas` (verified at line 57)
- `AreaStorage` Firestore adapter with onSnapshot (shipped with `custom-house-areas`)
- `SectionOrderSettingsScreen.tsx` as UI precedent pattern

No blocking dependencies.
