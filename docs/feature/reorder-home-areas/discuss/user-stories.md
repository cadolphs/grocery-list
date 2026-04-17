<!-- markdownlint-disable MD024 -->
# User Stories: Reorder Home Areas

**Feature ID**: reorder-home-areas
**Date**: 2026-04-17
**Persona**: Carlos Rivera
**Job traceability**: JS1 (Home Sweep Capture) — reused from `custom-house-areas`, no new JTBD
**Completes**: US-CHA-06 from `custom-house-areas` (domain shipped; this is the UI half)

---

## System Constraints

Cross-cutting constraints that apply to all stories in this feature:

- **Hexagonal architecture**: UI talks to domain only through `useAreas` hook. No direct `AreaStorage` or `AreaManagement` imports from UI.
- **Functional paradigm**: No classes. Pure helpers and hooks only (project CLAUDE.md).
- **Platform**: React Native + Expo SDK 54 (Android + web targets).
- **Sync behavior**: Area changes propagate via Firestore onSnapshot across devices within 5 seconds — existing behavior, not new work.
- **Staple preservation**: Reordering areas MUST NOT modify any staple-to-area assignment. Domain already guarantees this via `reorder()` only calling `areaStorage.saveAll()`.

---

## US-RHA-01: Reorder House Areas from Settings

### Elevator Pitch

- **Before**: Carlos opens HomeView and sees areas in the order `[Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer]`, but his actual walk now starts with Laundry Room. He mentally translates every sweep.
- **After**: Carlos taps the gear icon on HomeView, then taps the up-arrow button on "Laundry Room" three times in Manage Areas. Returns to HomeView and sees `[Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer]`.
- **Decision enabled**: Carlos decides whether to keep sweeping the house in the new order (confirmed by his HomeView matching his walk) or to tweak further before the next sweep.

### Problem

Carlos Rivera is a household grocery shopper who sweeps his house before every shop in a physical walking path. His routine recently changed (he moved the laundry hamper from upstairs to downstairs, and now passes Laundry Room first). The app still shows areas in the order he originally set up — Bathroom first, then Kitchen Cabinets, Fridge, Laundry Room, Freezer. Every sweep, Carlos mentally translates between the app's order and his actual walk, adding friction and occasional backtracking. He has no way to change the order short of deleting and re-adding every area (which would lose all his staple assignments — he will not risk that).

### Who

- Carlos Rivera | Household grocery shopper with an established Home sweep routine | Wants the app's area order to match his walking path as his routine evolves, without losing staples or re-entering data.

### Solution

Add up/down arrow buttons to each row in `AreaSettingsScreen`, wired to the existing `useAreas().reorderAreas()` function. Auto-save on each tap. Show a brief "Saved" confirmation. Disable the up-arrow on the first row and the down-arrow on the last row. No separate reorder mode — reorder is always available when the settings screen is open.

### Domain Examples

#### 1: Promote Laundry Room to Top (Happy Path)

Carlos opens Manage Areas. The list shows: Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer. He taps the up-arrow on Laundry Room. The list redraws as: Bathroom, Kitchen Cabinets, Laundry Room, Fridge, Freezer. A "Saved" toast appears for ~2s. He taps up again: Bathroom, Laundry Room, Kitchen Cabinets, Fridge, Freezer. Taps up a third time: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer. Each tap auto-saves. He taps back and sees HomeView with Laundry Room at the top. Total elapsed: under 20 seconds.

#### 2: Move Freezer Up By One (Boundary — Above Current Bottom)

Ana Lucia (Carlos's sister, same persona family) has five areas: Bathroom, Pantry, Kitchen Cabinets, Fridge, Freezer. She wants Freezer one position higher, swapping with Fridge. She taps the up-arrow on Freezer. New order: Bathroom, Pantry, Kitchen Cabinets, Freezer, Fridge. She verifies Freezer's down-arrow is still enabled (Fridge is now last). Saved automatically.

#### 3: Attempt to Move Bathroom Up (Boundary — Already at Top)

Carlos is on Manage Areas. Bathroom is currently in position 1. He notices the up-arrow on Bathroom is grey. He taps it anyway. Nothing changes — the button does not call `reorderAreas`, no "Saved" toast appears, the list does not re-render. Carlos moves on to another action.

### UAT Scenarios (BDD)

#### Scenario: Carlos reorders his areas to match his new walking path

```gherkin
Given Carlos has 5 configured house areas in order: Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer
And Carlos is viewing the HomeView
When Carlos taps the settings gear icon
And Carlos taps the up-arrow on "Laundry Room" three times
Then the Manage Areas list shows the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
And a "Saved" confirmation appears after each tap
```

#### Scenario: HomeView reflects the new order without manual refresh

```gherkin
Given Carlos has just reordered his areas in Manage Areas to Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
When Carlos taps Back to return to HomeView
Then HomeView displays the areas in the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
And the staple check-off counts for each area are unchanged from before the reorder
```

#### Scenario: Up-arrow on the first row is not interactive

```gherkin
Given Carlos is on the Manage Areas screen
And "Bathroom" is at position 1 (top of the list)
When Carlos looks at the up-arrow on the "Bathroom" row
Then the up-arrow is visually disabled
And tapping it produces no change to the list
And no "Saved" confirmation appears
```

#### Scenario: Down-arrow on the last row is not interactive

```gherkin
Given Carlos is on the Manage Areas screen
And "Freezer" is at the last position
When Carlos looks at the down-arrow on the "Freezer" row
Then the down-arrow is visually disabled
And tapping it produces no change to the list
```

#### Scenario: Reorder does not alter any staple-to-area assignment

```gherkin
Given Carlos has 3 staples assigned to "Bathroom" (toothpaste, shampoo, bar soap)
And Carlos has 2 staples assigned to "Laundry Room" (detergent, fabric softener)
When Carlos reorders areas so Laundry Room moves to the top
Then the 3 staples under Bathroom remain assigned to Bathroom with unchanged check-off state
And the 2 staples under Laundry Room remain assigned to Laundry Room with unchanged check-off state
```

### Acceptance Criteria

- [ ] AC-01: Each row on Manage Areas displays an up-arrow button and a down-arrow button.
- [ ] AC-02: Tapping an enabled up-arrow moves that area one position higher; tapping an enabled down-arrow moves it one position lower.
- [ ] AC-03: On each successful reorder tap, a "Saved" confirmation is displayed for approximately 2 seconds.
- [ ] AC-04: The up-arrow on the first-position row is visually disabled and non-interactive.
- [ ] AC-05: The down-arrow on the last-position row is visually disabled and non-interactive.
- [ ] AC-06: After returning to HomeView, areas render in the order set in Manage Areas, with no manual refresh.
- [ ] AC-07: Staple-to-area assignments and check-off state are unchanged across a reorder.

### Outcome KPIs

- **Who**: Carlos (and any user who has 3+ areas configured)
- **Does what**: Completes a reorder action to align app order with his walk
- **By how much**: End-to-end reorder (open settings → final tap → return to HomeView) completes in under 30 seconds
- **Measured by**: Instrumentation on `reorderAreas` calls plus settings-screen entry/exit timestamps
- **Baseline**: No reorder capability in UI → workaround is delete+recreate (≥3 minutes and destructive)

### Technical Notes

- No new domain code. `AreaManagement.reorder` at `src/domain/area-management.ts:120` already exists and is tested.
- No new hook code. `useAreas().reorderAreas` at `src/hooks/useAreas.ts:57-66` already exists.
- UI precedent: `src/ui/SectionOrderSettingsScreen.tsx` uses up/down buttons (lines 76-98). Reuse the `moveItem` helper pattern.
- "Saved" toast: reuse whichever toast component the app already uses for auto-save confirmations (DESIGN wave to select).
- Disable state: render the arrow with reduced opacity (≥50%) and `disabled` prop; no onPress handler attached.
- Layout constraint: row already holds [area name, edit button, delete button]. Adding up/down must not crowd on small screens (360px). DESIGN to decide (possible approaches: icons-only with tooltip/accessible label; collapse edit/delete into an overflow menu). Not prescribed here.

### Dependencies

- DEPENDS-ON: `useAreas.reorderAreas` (shipped, `src/hooks/useAreas.ts:57`)
- DEPENDS-ON: `AreaManagement.reorder` (shipped, `src/domain/area-management.ts:120`)
- DEPENDS-ON: `AreaStorage` Firestore adapter (shipped with `custom-house-areas`)
- UI PATTERN SOURCE: `src/ui/SectionOrderSettingsScreen.tsx` (shipped with `store-section-order`)

### Traceability

- JTBD: JS1 (Home Sweep Capture) — reused
- Completes: US-CHA-06 from `custom-house-areas`

---

## US-RHA-02: Reorder Persists Across App Restart and Syncs to Other Devices

### Elevator Pitch

- **Before**: After Carlos reorders areas on his phone, he has no assurance that closing the app or picking up his tablet will preserve the new order.
- **After**: Carlos reorders on his phone, closes and reopens the app — HomeView shows the new order. He opens the app on his tablet (same account) and within 5 seconds sees the same new order, without any manual refresh.
- **Decision enabled**: Carlos decides he can safely trust the reorder to stick, so he does the one-time reorder after any routine change and never thinks about it again.

### Problem

Carlos uses the app on both his phone (primary) and his tablet (secondary, used on the couch for shop planning). After making a change on one device, he expects the other device to catch up quickly. If reorder were to only affect the current session, or only one device, Carlos would lose trust in the whole settings flow and go back to mental translation. The sync behavior exists (Firestore onSnapshot for `AreaStorage`) but has never been exercised specifically through the reorder path — this story verifies it.

### Who

- Carlos Rivera | Multi-device user (phone + tablet) with a shared account | Expects changes on one device to appear on the other without manual action.

### Solution

No additional production code. Add a UAT scenario that explicitly verifies persistence across app restart (single device) and propagation across devices (within 5 seconds via the existing Firestore onSnapshot subscription). This slice delivers regression coverage and a documented expectation for future maintainers.

### Domain Examples

#### 1: Persistence Across App Restart

Carlos reorders his areas on the phone so Laundry Room is first. He force-quits the app, then relaunches it. HomeView displays: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer — the order he just saved. No manual resync action required.

#### 2: Cross-Device Sync Within 5 Seconds

Carlos is holding his phone. His tablet is open on the couch showing HomeView with the old order: Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer. Carlos performs a reorder on his phone (moves Laundry Room to position 1). Within 5 seconds, without anyone touching the tablet, the tablet's HomeView updates to show the new order.

#### 3: Offline-then-Online Convergence (Edge)

Carlos reorders his areas on the phone while offline (no network). The UI still auto-saves locally and shows the new order on the phone. When network returns, Firestore syncs the write up. Carlos's tablet (which has been online) then receives the onSnapshot update and reflects the new order. (Note: this is existing Firestore adapter behavior from `custom-house-areas`, not new to this feature.)

### UAT Scenarios (BDD)

#### Scenario: Reorder persists across app restart

```gherkin
Given Carlos has reordered his areas on his phone to Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
When Carlos closes and reopens the app on his phone
Then the HomeView displays the areas in the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
And Carlos performed no explicit save, sync, or refresh action
```

#### Scenario: Reorder on phone propagates to tablet within 5 seconds

```gherkin
Given Carlos is signed in on both his phone and his tablet with the same account
And both devices are online
And both devices currently show the area order: Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer
When Carlos reorders the areas on his phone so "Laundry Room" is first
Then within 5 seconds the tablet's HomeView displays the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
And no one interacted with the tablet during those 5 seconds
```

#### Scenario: Staple counts remain consistent after sync

```gherkin
Given Carlos has reordered areas on his phone
And his staple check-off counts on his phone are Bathroom 3/5, Laundry Room 0/2
When the tablet receives the sync update within 5 seconds
Then the tablet's HomeView shows the same staple counts: Bathroom 3/5, Laundry Room 0/2
And the counts are associated with the correct areas after reorder
```

### Acceptance Criteria

- [ ] AC-01: After app close-and-reopen, HomeView reflects the most recently saved area order.
- [ ] AC-02: After reorder on Device A, Device B shows the new order within 5 seconds without manual action.
- [ ] AC-03: Staple-to-area associations and check-off counts remain correct after cross-device sync.

### Outcome KPIs

- **Who**: Carlos (and any multi-device user)
- **Does what**: Trusts that a reorder on one device is reflected everywhere without follow-up action
- **By how much**: 100% of reorder operations reflected on the second device within 5 seconds when both devices are online
- **Measured by**: Logging timestamps of `AreaStorage.saveAll` writes and Firestore onSnapshot callbacks on the second device; alerting if delta > 5s for a majority of events
- **Baseline**: Same 5-second target already achieved for other area operations (add/rename/delete) from `custom-house-areas`; reorder is expected to match.

### Technical Notes

- No new code. Verifies existing Firestore onSnapshot behavior in the AreaStorage adapter shipped with `custom-house-areas`.
- UAT scenarios may be implemented as integration tests using a Firestore emulator with two subscriptions.

### Dependencies

- DEPENDS-ON: US-RHA-01 (the reorder UI must exist to trigger the save)
- DEPENDS-ON: Firestore adapter for AreaStorage (shipped)

### Traceability

- JTBD: JS1 (Home Sweep Capture)
- Completes: US-CHA-06 from `custom-house-areas` (cross-device behavior half)
