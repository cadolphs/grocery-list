# Story Map: web-ux-polish

## User: Priya (desktop meal-planner, keyboard-dominant)
## Goal: Plan a shopping trip on desktop web without the UI breaking her keyboard rhythm

## Backbone

| Open app (focus) | Add staple (QuickAdd) | Fill details (Sheet) | Continue flow | Edit existing |
|------------------|-----------------------|----------------------|---------------|---------------|
| Autofocus input on web | Enter opens sheet | Enter submits sheet | Focus returns to QuickAdd | Pencil icon replaces long-press |
| (Mobile: no autofocus) | Type + Enter flow | Autofocus first field | Input cleared | Long-press retained on mobile |
|                  | Handle empty input | Tab between fields | Esc returns focus | Pencil keyboard accessible |
|                  | IME / composition safety | Validation blocks submit |               |               |

---

### Walking Skeleton

Brownfield — no new walking skeleton required; the existing app already works end-to-end.
The "thinnest slice" for THIS feature that demonstrates the outcome end-to-end is:

1. Autofocus QuickAdd input on web (Step 1 of journey)
2. Enter in QuickAdd opens sheet with name prefilled (Step 2)
3. Enter in sheet submits (Step 3)
4. Focus returns to QuickAdd (Step 4)

Demonstrates the keyboard-only add loop. (Edit-via-pencil is Journey B, delivered in R2.)

### Release 1: "Keyboard-only add loop works"

**Outcome target:** Priya can add 10 staples using only the keyboard on desktop web.
**KPI:** Time-to-add-10-staples reduced at least 40% vs. baseline; keyboard-only sessions
rise from ~0% to at least 60% of desktop-web add actions.

Stories included:

- US-01 Autofocus QuickAdd input on desktop web
- US-02 Enter key in QuickAdd opens metadata sheet
- US-03 Enter key in MetadataBottomSheet submits the form
- US-04 Autofocus first editable field in MetadataBottomSheet on open
- US-05 Return focus to QuickAdd after sheet dismissal

### Release 2: "Editing is discoverable on desktop"

**Outcome target:** Priya can edit existing staples on desktop without knowing the
long-press gesture.
**KPI:** Edit-action success rate on desktop web rises from near-zero to match mobile.

Stories included:

- US-06 Visible edit icon replaces long-press on web (mobile retains long-press)

## Priority Rationale

Priority is driven by outcome impact and dependency order. Release 1 unblocks the primary
workflow pain point (sluggish adding) — this is the most frequent friction per the problem
statement ("Adding many staples feels slow"). Release 2 addresses a discoverability
problem that is lower frequency but higher per-incident frustration.

| Priority | Story | Target Outcome | Rationale |
|----------|-------|----------------|-----------|
| P1 | US-01 Autofocus QuickAdd | Keyboard-only flow starts immediately | Small change, enables all of R1 |
| P1 | US-02 Enter opens sheet | Primary rhythm step | Core of keyboard flow |
| P1 | US-03 Enter submits sheet | Close the loop | Pairs with US-02; together they enable flow state |
| P2 | US-04 Autofocus first field | Remove extra Tab | Polish — loop works without this, but friction remains |
| P2 | US-05 Focus returns to QuickAdd | Enables repeat without mouse | Essential for multi-item sessions |
| P3 | US-06 Pencil icon for edit | Discoverable edit on web | Independent of R1; can ship in parallel |

US-04 and US-05 can ship together as a single "focus management" delivery if preferred
during DELIVER wave. US-06 is independent and can be pulled forward if a desktop edit
session is a near-term user request.

## Scope Assessment: PASS — 6 stories, 4 components, estimated 4-6 days total

Signals checked:

- Stories: 6 (threshold: >10) — PASS
- Bounded contexts: 1 (UI layer only) (threshold: >3) — PASS
- Integration points: 4 components modified (QuickAdd, MetadataBottomSheet, TripItemRow,
  StapleChecklist) plus one shared hook — within right-sized bounds
- Effort: estimated 4-6 days total; each story 0.5-1.5 days — PASS
- Independent outcomes: 2 (keyboard flow, edit discoverability) — right-sized, both small

Feature is right-sized. No split required.
