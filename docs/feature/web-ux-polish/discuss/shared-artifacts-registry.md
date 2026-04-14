# Shared Artifacts Registry: web-ux-polish

## Artifacts

### platform_is_web

- **Source of truth:** `Platform.OS === 'web'` (React Native's Platform module)
- **Consumers:**
  - `QuickAdd` — gates autofocus on mount
  - `QuickAdd` — gates Enter-submit handler
  - `MetadataBottomSheet` — gates Enter-submit handler and first-field autofocus
  - `TripItemRow` — gates pencil edit icon rendering
  - `StapleChecklist` (StapleRow) — gates pencil edit icon rendering
  - `AreaSection`, `AisleSection` — gates pencil edit icon rendering
- **Owner:** web-ux-polish feature
- **Integration risk:** HIGH — scattered `Platform.OS` checks cause behavioral drift.
  Recommendation for DESIGN wave: extract a single `useIsWeb()` hook (or equivalent) and
  use it everywhere.
- **Validation:** No component may hardcode `web`; all must import from one source. Lint
  or test rule: grep for raw `Platform.OS === 'web'` beyond the hook definition.

### staple_name (QuickAdd → MetadataBottomSheet)

- **Source of truth:** QuickAdd input state at time of submit
- **Consumers:**
  - `MetadataBottomSheet` — prefills Name field when opened via QuickAdd Enter
- **Owner:** QuickAdd flow
- **Integration risk:** MEDIUM — if QuickAdd clears its input before the sheet reads the
  value, the Name field opens empty.
- **Validation:** Name passed explicitly to sheet via prop; do not rely on shared store for
  transient typing state.

### primary_action_on_enter

- **Source of truth:** Derived in QuickAdd from input text + suggestion list state
- **Consumers:**
  - QuickAdd Enter key handler
  - QuickAdd "Add" button click handler (must match)
  - QuickAdd tip text ("Press Enter to ${primary_action}")
- **Owner:** QuickAdd
- **Integration risk:** MEDIUM — if Enter and the visible button dispatch differently,
  users will be confused.
- **Validation:** One function computes the action; both Enter and button click invoke it.

### focus_target_after_close

- **Source of truth:** React ref held on the QuickAdd input
- **Consumers:**
  - `MetadataBottomSheet` close callback — restores focus to this ref
- **Owner:** QuickAdd owns the ref; sheet calls a callback on close
- **Integration risk:** MEDIUM — the sheet must not know about QuickAdd directly; focus
  restoration is done by the opener via the onClose callback.
- **Validation:** Sheet's onClose callback receives no target argument; the caller (QuickAdd)
  restores its own focus.

### staple_record (edit flow)

- **Source of truth:** Library store (existing staple entry)
- **Consumers:** `MetadataBottomSheet` prefill when opened in edit mode
- **Owner:** Library domain
- **Integration risk:** LOW — existing pattern, reused unchanged
- **Validation:** Click-pencil and long-press both pass the same record shape.

## Consistency Validation Questions

- Does every `Platform.OS === 'web'` check in the diff trace back to the one detection
  point? (Target: yes, via a single hook.)
- Do QuickAdd Enter and the Add button call the same handler? (Target: yes.)
- Do pencil-click and long-press dispatch the same edit handler with the same arguments?
  (Target: yes.)
- Is the QuickAdd input autofocus conditional ONLY on `platform_is_web`, never on viewport
  size? (Target: yes — viewport-based detection breaks iPad Safari edge cases.)
