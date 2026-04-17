# Shared Artifacts Registry: reorder-home-areas

**Feature ID**: reorder-home-areas
**Date**: 2026-04-17

This registry tracks data appearing in multiple places across the reorder journey. Every shared artifact must have one source of truth and documented consumers.

---

## Artifacts

### 1. House Area Order (ordered list of area names)

| Field | Value |
|-------|-------|
| **Source of truth** | `AreaStorage` port (persisted via Firestore adapter → `areas` collection document) |
| **Read via** | `AreaManagement.getAreas()` → `useAreas().areas` |
| **Written via** | `AreaManagement.reorder(newOrder)` → `useAreas().reorderAreas(newOrder)` |
| **Consumers** | `AreaSettingsScreen` (displays + edits), `HomeView` (renders area list in sweep order), sweep progression logic (iterates in order), area picker when editing staples |
| **Owner** | `custom-house-areas` feature (domain); this feature adds a new consumer control |
| **Integration risk** | **HIGH** — if the stored order diverges from what any consumer shows, Carlos loses trust in the sweep order |
| **Validation** | After any reorder, `HomeView` must re-render from the same `areas` array the settings screen just wrote. Firestore onSnapshot guarantees this within 5 seconds across devices. |
| **Cross-device consistency** | Last-write-wins via Firestore onSnapshot. Two devices reordering within seconds of each other will converge to the last write — acceptable per `custom-house-areas` sync strategy. |

---

## Consumer Map

```
AreaStorage (Firestore: areas/{userId})
    |
    +-> AreaManagement.getAreas() -> useAreas().areas
    |       |
    |       +-> AreaSettingsScreen  -- list UI with up/down controls (this feature)
    |       |
    |       +-> HomeView              -- sweep rendering (custom-house-areas)
    |       |
    |       +-> StapleEditScreen      -- area picker dropdown (custom-house-areas)
    |       |
    |       +-> Sweep progression     -- ordered iteration (custom-house-areas)
    |
    +-> AreaManagement.reorder(newOrder) -> useAreas().reorderAreas(newOrder)
            |
            +-> (writes via AreaStorage.saveAll) -- triggers onSnapshot to all consumers above
```

---

## Integration Checkpoints

Downstream DISTILL wave must verify:

- [ ] After `reorderAreas` resolves `success: true`, `HomeView` re-renders areas in the new order within one React tick (same device).
- [ ] After `reorderAreas` resolves `success: true`, a second device running the app and connected to the same account sees the new order within 5 seconds (Firestore onSnapshot).
- [ ] Staple→area assignments are untouched by reorder (domain guarantee — `reorder()` only calls `areaStorage.saveAll`, never mutates staples).
- [ ] Sweep in-progress state is preserved across a reorder (no sweep-checkpoint data is tied to area index; areas are keyed by name).

---

## Validation Questions

- Does every ${variable} referenced in TUI/screen mockups resolve to `AreaStorage`? **YES** — `${areas[]}` and `${areaName}` both trace to `AreaStorage.loadAll()`.
- If the area order changes, would all consumers automatically update? **YES** via React state refresh in `useAreas` + Firestore onSnapshot.
- Are there any hardcoded order assumptions in consumers? **NO** — all consumers iterate `areas` array; order is data-driven.
- Do any two consumers display the order from different sources? **NO** — single source of truth via `AreaStorage`.
