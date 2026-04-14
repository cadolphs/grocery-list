<!-- markdownlint-disable MD024 -->
# User Stories: web-ux-polish

## System Constraints (apply to all stories)

- **Platform detection:** All platform-specific behavior MUST be gated by `Platform.OS === 'web'`
  from React Native. No user-agent sniffing, no viewport-based detection.
- **Mobile non-regression:** Every story that changes web behavior MUST include a scenario
  verifying iOS/Android behavior is unchanged.
- **Single detection point:** Platform detection SHOULD be encapsulated in a single hook or
  utility (e.g., `useIsWeb()`) — implementation choice deferred to DESIGN wave, but stories
  assume consistency.
- **Accessibility:** All new interactive elements (e.g., pencil icon) MUST be keyboard
  focusable, have visible focus indicators, and meet WCAG 2.2 AA contrast (at least 4.5:1
  for text, 3:1 for large/icon targets against background).
- **IME safety:** Enter-key handlers MUST ignore Enter during IME composition (e.g.,
  accented characters, CJK input). Use `isComposing` / `keyCode === 229` guards.
- **No functional regression on native:** iOS/Android long-press edit MUST continue to work
  exactly as today.

---

## US-01: Desktop planner lands on a ready-to-type input

### Problem

Priya, a weekly meal-planner on desktop web, opens the app to add staples. The QuickAdd
input is not focused, so her first action is to click the input — a mouse detour before
any real work. On mobile, autofocusing would pop the on-screen keyboard unexpectedly, so
the fix must be web-only.

### Who

- Desktop-web user | planning session | keyboard-dominant workflow

### Solution

On web, autofocus the QuickAdd input when the view mounts. On iOS/Android, do not
autofocus (preserves current behavior; avoids unwanted keyboard pop).

### Domain Examples

#### 1: Happy Path — Priya opens the app

Priya opens `https://grocery.app` on her MacBook. She immediately types "bananas" — no
click needed. The "b" appears in the input.

#### 2: Edge Case — Marco on iPhone

Marco taps the app icon on his iPhone. The QuickAdd view appears but the keyboard does NOT
pop up. He taps the input when he's ready.

#### 3: Error / Boundary — Ana on Android returns from background

Ana had the app open, backgrounded it for 10 minutes, returns. The app resumes but does
not force the keyboard to appear.

### UAT Scenarios (BDD)

#### Scenario: Desktop planner lands on a ready-to-type input

```
Given Priya opens the grocery-list app in a desktop browser
When the QuickAdd view finishes mounting
Then the QuickAdd text input has keyboard focus
And Priya can begin typing immediately
```

#### Scenario: Mobile app does not steal focus on mount

```
Given Marco opens the grocery-list app on his iPhone
When the QuickAdd view mounts
Then the QuickAdd input is not autofocused
And the on-screen keyboard does not appear automatically
```

#### Scenario: Returning to the app does not force focus

```
Given Ana has the app open on Android and backgrounds it
When Ana returns to the app 10 minutes later
Then the QuickAdd input is not autofocused
```

### Acceptance Criteria

- [ ] On `Platform.OS === 'web'`, QuickAdd input receives focus on mount.
- [ ] On `Platform.OS === 'ios'` or `'android'`, QuickAdd input is NOT autofocused.
- [ ] Autofocus does not interfere with screen readers (announcement order respected).

### Outcome KPIs

- **Who:** Desktop-web users starting a planning session
- **Does what:** Begin typing without a preliminary mouse click
- **By how much:** At least 90% of desktop sessions start with keyboard input, not a click
- **Measured by:** First-interaction event: key vs click
- **Baseline:** Currently ~0% (input is not autofocused on any platform)

### Technical Notes

- `autoFocus` prop on `TextInput` may behave differently on React Native Web vs. native —
  verify in DESIGN.
- Respect `Platform.OS` exactly; do not use viewport width.

### Dependencies

None (purely additive).

---

## US-02: Enter key in QuickAdd opens the metadata sheet

### Problem

Priya has typed "bananas" in QuickAdd. To proceed, she must move to the mouse and click
"Add" or the "Add as new item" suggestion. This breaks her keyboard rhythm when she's
adding 10-20 staples in a row.

### Who

- Desktop-web user adding a staple | keyboard-first workflow

### Solution

On web, pressing Enter in the QuickAdd input dispatches the same action as the primary
suggestion (or the Add button if no suggestion). The metadata sheet opens with the typed
name prefilled.

### Domain Examples

#### 1: Happy Path — Priya adds a new staple

Priya types "bananas" (not in library). Suggestion list shows `+ Add "bananas" as new
item`. She presses Enter. The metadata sheet opens with Name = "bananas".

#### 2: Edge Case — Priya types a name that matches an existing staple

Priya types "olive oil" (already in library). The top suggestion is the existing record.
She presses Enter. The metadata sheet opens in edit mode for that record.

#### 3: Error / Boundary — Priya presses Enter on an empty input

Priya accidentally presses Enter with an empty input. Nothing happens; focus stays on
QuickAdd. No sheet opens.

### UAT Scenarios (BDD)

#### Scenario: Pressing Enter on a new name opens the add sheet

```
Given Priya has typed "bananas" in QuickAdd on desktop web
And "bananas" does not exist in her library
When Priya presses Enter
Then the metadata sheet opens
And the Name field is prefilled with "bananas"
```

#### Scenario: Pressing Enter on an existing name opens the edit sheet

```
Given "olive oil" already exists in Priya's library
And Priya has typed "olive oil" in QuickAdd on desktop web
When Priya presses Enter
Then the metadata sheet opens in edit mode
And the fields are prefilled with the existing "olive oil" record
```

#### Scenario: Pressing Enter on an empty input does nothing

```
Given the QuickAdd input is empty on desktop web
When Priya presses Enter
Then no sheet opens
And focus remains on the QuickAdd input
```

#### Scenario: Enter is ignored during IME composition

```
Given Priya is composing an accented character via IME in QuickAdd
When the IME dispatches an Enter keydown to commit composition
Then no sheet opens
And the composed character appears in the input
```

#### Scenario: Mobile behavior is unchanged

```
Given Marco is using QuickAdd on iOS
When Marco taps the "Add as new item" suggestion
Then the metadata sheet opens as it does today
And no Enter-key handler interferes with his tap
```

### Acceptance Criteria

- [ ] On web, Enter in QuickAdd dispatches the same handler as the primary suggestion/Add button
- [ ] Enter on empty input is a no-op
- [ ] Enter during IME composition is ignored
- [ ] Enter dispatches to "add new" OR "edit existing" based on suggestion state
- [ ] On iOS/Android, no Enter handler is attached (no behavior change)

### Outcome KPIs

- **Who:** Desktop-web users submitting the QuickAdd input
- **Does what:** Submit via Enter key instead of mouse click
- **By how much:** At least 60% of desktop submits use Enter
- **Measured by:** `submit_source` event tag (enter / click / suggestion_click)
- **Baseline:** 0% (Enter not wired)

### Technical Notes

- Handler shared with click path — do not duplicate logic.
- IME guard: check `event.nativeEvent.isComposing` or `keyCode === 229`.

### Dependencies

None. US-01 is complementary but independent.

---

## US-03: Enter key submits the MetadataBottomSheet

### Problem

After Priya's QuickAdd Enter opens the metadata sheet, she fills in fields and must now
reach for the mouse again to click "Add Item". For a 15-item session, that's 15 round-trips
to the mouse — pure friction.

### Who

- Desktop-web user filling the metadata sheet | keyboard-first workflow

### Solution

On web, pressing Enter from any single-line input inside MetadataBottomSheet submits the
form (same as clicking the primary "Add Item" / "Save" button). Multi-line fields (Notes)
require Cmd/Ctrl+Enter to submit, so Enter inside Notes inserts a newline.

### Domain Examples

#### 1: Happy Path — Submit from the last dropdown

Priya is in the Aisle dropdown with "Produce" selected. She presses Enter. The sheet
submits. The staple "bananas" is saved.

#### 2: Edge Case — Submit with validation error

Priya cleared the Name field by accident. She presses Enter. The sheet stays open. An
inline "Name is required" error appears on the Name field and focus moves there.

#### 3: Error / Boundary — Enter inside Notes field

Priya is in the Notes textarea typing a multi-line note. She presses Enter. A newline is
inserted. She presses Cmd+Enter. The sheet submits.

### UAT Scenarios (BDD)

#### Scenario: Enter from a single-line field submits the form

```
Given the metadata sheet is open on desktop web
And Priya has entered Name "bananas", Area "Kitchen", Aisle "Produce"
When Priya presses Enter while focused in the Aisle field
Then the sheet submits
And the staple "bananas" is saved with Area "Kitchen" and Aisle "Produce"
```

#### Scenario: Invalid submission keeps sheet open with inline error

```
Given the metadata sheet is open with an empty Name field
When Priya presses Enter
Then the sheet remains open
And an inline error "Name is required" appears on the Name field
And focus moves to the Name field
```

#### Scenario: Enter in Notes inserts a newline, Cmd+Enter submits

```
Given the metadata sheet is open on desktop web
And Priya is focused in the multi-line Notes field
When Priya presses Enter
Then a newline is inserted in Notes
And the sheet does not submit

When Priya presses Cmd+Enter (or Ctrl+Enter on Windows/Linux)
Then the sheet submits
```

#### Scenario: Mobile behavior is unchanged

```
Given Marco has the metadata sheet open on iOS
When Marco taps "Add Item"
Then the sheet submits as today
And no Enter-key behavior has changed on iOS
```

### Acceptance Criteria

- [ ] On web, Enter from a single-line input submits the sheet
- [ ] On web, Enter inside multi-line textarea inserts newline; Cmd/Ctrl+Enter submits
- [ ] Invalid submission: sheet stays open, focus moves to first invalid field, inline error shown
- [ ] On iOS/Android, no Enter-key submit behavior (no regression)

### Outcome KPIs

- **Who:** Desktop-web users submitting the metadata sheet
- **Does what:** Submit via Enter (or Cmd+Enter from Notes)
- **By how much:** At least 60% of desktop sheet submits use Enter / Cmd+Enter
- **Measured by:** `sheet_submit_source` event tag
- **Baseline:** 0% (Enter not wired)

### Technical Notes

- Prefer submitting via `<form onSubmit>` semantics where possible so Enter from any
  single-line input naturally submits.
- Cmd/Ctrl+Enter from Notes: handle manually.

### Dependencies

None. Pairs with US-02 but deliverable independently.

---

## US-04: Autofocus the first editable field when the metadata sheet opens

### Problem

When the metadata sheet opens from QuickAdd with the Name prefilled, focus lands on the
Name field. Priya doesn't want to edit the Name (she just typed it); she wants to set Area
and Aisle. She presses Tab to skip Name — wasted keystroke on every add.

### Who

- Desktop-web user opening the metadata sheet with a prefilled name

### Solution

On web, when MetadataBottomSheet opens AND the Name is prefilled, focus lands on the first
editable-by-user field (Area dropdown). When opened for editing an existing staple, focus
also lands on Area (or the first non-Name field). When opened with an empty name (unusual
on web), focus lands on Name.

### Domain Examples

#### 1: Happy Path — Priya opens the sheet from QuickAdd Enter

Priya pressed Enter in QuickAdd with "bananas". Sheet opens. Focus is on the Area
dropdown, not on Name. She starts arrow-key navigating areas without a preliminary Tab.

#### 2: Edge Case — Priya opens the sheet via pencil icon to edit

Priya clicks pencil on "olive oil". Sheet opens in edit mode with all fields prefilled.
Focus lands on Area (not Name).

#### 3: Error / Boundary — Sheet opens with empty Name

Priya somehow opens the sheet without a prefilled Name (e.g., she opens it from a menu
without going through QuickAdd). Focus lands on Name.

### UAT Scenarios (BDD)

#### Scenario: First editable field is focused when Name is prefilled

```
Given the metadata sheet opens on desktop web with Name = "bananas" prefilled
When the sheet finishes mounting
Then keyboard focus is on the Area field (not the Name field)
```

#### Scenario: First editable field is focused in edit mode

```
Given the metadata sheet opens on desktop web in edit mode for "olive oil"
When the sheet finishes mounting
Then keyboard focus is on the Area field
```

#### Scenario: Name field is focused when opened with empty Name

```
Given the metadata sheet opens on desktop web with an empty Name field
When the sheet finishes mounting
Then keyboard focus is on the Name field
```

#### Scenario: Mobile does not force focus

```
Given Marco opens the metadata sheet on iOS
When the sheet finishes mounting
Then no field is autofocused
And the on-screen keyboard does not appear unprompted
```

### Acceptance Criteria

- [ ] On web with prefilled Name: focus lands on the first editable field after Name
- [ ] On web in edit mode: focus lands on the first field after Name
- [ ] On web with empty Name: focus lands on Name
- [ ] On mobile: no autofocus on sheet open

### Outcome KPIs

- **Who:** Desktop-web users opening the metadata sheet
- **Does what:** Begin editing without a preliminary Tab keystroke
- **By how much:** Remove 1 keystroke per add action (roughly 10-20 strokes per 10-item session)
- **Measured by:** Keystroke count in a scripted user test
- **Baseline:** 1 extra Tab per add

### Technical Notes

- Small delay may be required for the sheet animation to complete before focusing (web
  only). Implementation detail for DESIGN wave.

### Dependencies

None, but complements US-02, US-03.

---

## US-05: Focus returns to QuickAdd after the metadata sheet closes

### Problem

After Priya submits or cancels the metadata sheet, focus is lost (document body). To type
the next item, she must click back into QuickAdd. This breaks the rhythm entirely — the
whole keyboard flow is undone by the last step.

### Who

- Desktop-web user completing an add-staple action

### Solution

On web, when MetadataBottomSheet closes (via submit OR cancel OR Esc), focus is restored
to the QuickAdd input. The input is cleared so typing begins fresh. Cancel preserves the
clear behavior (the typed name is discarded — consistent with "cancel" semantics).

### Domain Examples

#### 1: Happy Path — Priya submits and continues

Priya submits "bananas". Sheet closes. Focus is on QuickAdd, input is empty. She types
"olive oil" immediately.

#### 2: Edge Case — Priya cancels mid-edit

Priya types "bananas", presses Enter, sheet opens. She changes her mind, presses Esc.
Sheet closes. Focus is on QuickAdd, input is empty.

#### 3: Error / Boundary — Sheet closes after validation error resolved

Priya submits invalid data; error appears; she fixes it and submits again. Sheet closes
normally. Focus is restored.

### UAT Scenarios (BDD)

#### Scenario: Focus returns to QuickAdd after successful add

```
Given Priya submitted a new staple "bananas" via the metadata sheet on desktop web
When the sheet closes
Then keyboard focus is on the QuickAdd input
And the QuickAdd input is empty
And Priya can type the next item immediately
```

#### Scenario: Focus returns to QuickAdd after cancel

```
Given the metadata sheet is open on desktop web
When Priya presses Esc
Then the sheet closes
And keyboard focus is on the QuickAdd input
And the QuickAdd input is empty
```

#### Scenario: Focus is restored even if user clicked outside to dismiss

```
Given the metadata sheet is open on desktop web
When Priya clicks the scrim (outside the sheet) to dismiss it
Then the sheet closes
And keyboard focus is on the QuickAdd input
```

#### Scenario: Mobile behavior is unchanged

```
Given Marco dismisses the metadata sheet on iOS
When the sheet closes
Then no focus restoration is triggered
And behavior matches today's app
```

### Acceptance Criteria

- [ ] On web, after sheet close (any reason), QuickAdd input has focus
- [ ] On web, QuickAdd input is empty after sheet close
- [ ] On mobile, no focus restoration behavior (unchanged)
- [ ] If QuickAdd input is unmounted when sheet closes, no error; focus lands on document body

### Outcome KPIs

- **Who:** Desktop-web users completing an add-staple cycle
- **Does what:** Continue adding without a mouse click between items
- **By how much:** At least 60% of multi-item sessions show zero mouse clicks between items
- **Measured by:** Intra-session click count between consecutive `staple.add` events
- **Baseline:** ~100% of sessions require a click (focus is lost)

### Technical Notes

- QuickAdd owns the input ref and restores focus in its own `onSheetClose` callback.
- Use `requestAnimationFrame` or a short delay if the sheet animation causes focus conflicts.

### Dependencies

US-02 and US-03 make this meaningful (without Enter submission, focus restoration has less
value). Can be delivered in the same commit or the one after.

---

## US-06: Visible edit icon replaces long-press on desktop web

### Problem

Priya sees "olive oil" filed under the wrong aisle and wants to correct it on her desktop.
On mobile, she would long-press the row to open the edit sheet — but long-press is not
discoverable on desktop and doesn't work reliably in browsers. She has no visible
affordance to edit. Meanwhile, Marco on iPhone relies on long-press and must keep it.

### Who

- **Primary:** Desktop-web user managing the staple library
- **Secondary (guardrail):** Mobile (iOS/Android) user — must not regress

### Solution

On web (`Platform.OS === 'web'`), render a pencil icon on each editable row in
`TripItemRow`, `StapleChecklist`, `AreaSection`, and `AisleSection`. Clicking the icon
dispatches the same edit handler as the native long-press. The icon is always visible (no
hover-to-reveal) so it serves as an explicit signifier per Norman's principles. On
iOS/Android, the icon is NOT rendered and long-press remains the edit gesture.

### Domain Examples

#### 1: Happy Path — Priya edits via pencil

Priya views her staple checklist on desktop. Next to "olive oil" she sees a small pencil
icon. She clicks it. The metadata sheet opens prefilled with the olive oil record. She
corrects the aisle and submits.

#### 2: Edge Case — Marco edits via long-press on iPhone

Marco opens the same checklist on iPhone. There is no pencil icon (iOS doesn't need it).
He long-presses the "olive oil" row. The same edit sheet opens.

#### 3: Error / Boundary — Keyboard user edits via Tab and Enter

Ravi, who uses keyboard navigation exclusively, Tabs through the list on desktop web.
Focus moves through row contents and onto each pencil icon. When focus is on the pencil
for "olive oil", he presses Enter and the edit sheet opens.

### UAT Scenarios (BDD)

#### Scenario: Desktop user edits a staple via the visible edit icon

```
Given Priya is viewing the staple checklist on desktop web
And "olive oil" appears in the list
When Priya clicks the edit icon on the "olive oil" row
Then the metadata sheet opens prefilled with the "olive oil" record
```

#### Scenario: iOS user still edits via long-press and sees no icon

```
Given Marco is viewing the staple checklist on iOS
When the checklist renders
Then no edit icon is visible on any row
And long-pressing the "olive oil" row opens the metadata sheet prefilled with its record
```

#### Scenario: Android user still edits via long-press and sees no icon

```
Given a user is viewing the staple checklist on Android
When the checklist renders
Then no edit icon is visible on any row
And long-pressing the "olive oil" row opens the metadata sheet prefilled with its record
```

#### Scenario: Edit icon is keyboard accessible on web

```
Given Ravi is navigating the staple checklist on desktop web with the keyboard only
When Ravi tabs to the edit icon on the "olive oil" row
Then a visible focus indicator appears on the icon
And pressing Enter opens the edit sheet for "olive oil"
```

#### Scenario: Edit icon meets accessibility minimums

```
Given the edit icon renders on desktop web
Then the icon has an accessible name (e.g., aria-label "Edit olive oil")
And the icon's touch/click target is at least 24x24 CSS pixels
And the icon colour contrast against the row background is at least 3:1
```

#### Scenario: Edit icon and long-press dispatch the same handler

```
Given both long-press (mobile) and pencil-click (web) are available ways to edit a staple
When either gesture is invoked on "olive oil"
Then the same edit handler is called with the same staple identifier
And the metadata sheet opens in edit mode for that staple
```

### Acceptance Criteria

- [ ] On web, a pencil edit icon is visible on every editable row in TripItemRow, StapleChecklist, AreaSection, AisleSection
- [ ] On iOS and Android, no edit icon is rendered (long-press retained)
- [ ] Clicking the icon on web dispatches the same edit handler as long-press on native
- [ ] The icon is keyboard-focusable with a visible focus indicator
- [ ] The icon has an accessible name identifying which row it edits
- [ ] The icon's click target is at least 24x24 CSS pixels
- [ ] Contrast at least 3:1 against row background
- [ ] Long-press on native continues to open the edit sheet (no regression)

### Outcome KPIs

- **Who:** Desktop-web users viewing editable staple/item lists
- **Does what:** Discover and use the edit affordance
- **By how much:** Desktop edit-open rate rises from near-zero to within ±20% of mobile rate
- **Measured by:** `edit_sheet_opened` event with `platform` tag and `source` tag (pencil-click / long-press / keyboard)
- **Baseline:** Desktop edit-open rate is currently near zero because long-press is not
  discoverable/reliable in browsers

### Technical Notes

- Touches: `TripItemRow`, `StapleChecklist` (StapleRow), `AreaSection`, `AisleSection` — 4
  components.
- Recommend extracting an `<EditIconButton />` component to keep the affordance consistent.
- Reuse the existing long-press handler shape; do not duplicate edit logic.
- On touch-capable laptops, both long-press and pencil click will work on web — this is
  acceptable since both dispatch the same handler.
- DO NOT use right-click context menu (previously considered; rejected in wave-decisions).

### Dependencies

- None blocking. Stories US-01..US-05 can ship independently.
- Existing edit handler (from long-press) must already pass a staple identifier — verified
  in pre-wave code survey (it does).

---
