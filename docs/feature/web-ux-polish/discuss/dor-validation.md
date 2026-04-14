# Definition of Ready Validation: web-ux-polish

All 6 stories validated against the 9-item DoR gate.

## Summary

| Story | Title | Status |
|-------|-------|--------|
| US-01 | Autofocus QuickAdd on web | PASSED |
| US-02 | Enter in QuickAdd opens sheet | PASSED |
| US-03 | Enter in sheet submits | PASSED |
| US-04 | Autofocus first editable field | PASSED |
| US-05 | Focus returns to QuickAdd after close | PASSED |
| US-06 | Pencil icon replaces long-press on web | PASSED |

## Per-Story Validation

### US-01: Autofocus QuickAdd on web

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | "Priya... opens the app to add staples. The QuickAdd input is not focused, so her first action is to click..." — domain language |
| User/persona identified | PASS | Priya, desktop-web meal-planner, keyboard-dominant |
| 3+ domain examples | PASS | Priya/MacBook, Marco/iPhone, Ana/Android — real names, real platforms |
| UAT scenarios (3-7) | PASS | 3 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 3 AC items map 1:1 to scenarios |
| Right-sized | PASS | ~0.5 day effort, 3 scenarios, single component |
| Technical notes | PASS | `autoFocus` RNW caveat, Platform.OS exactness |
| Dependencies tracked | PASS | "None (purely additive)" |
| Outcome KPIs | PASS | Who/what/by-how-much/measured/baseline all present |

**Status:** PASSED

### US-02: Enter in QuickAdd opens sheet

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Breaks keyboard rhythm; mouse detour per add |
| User/persona identified | PASS | Desktop-web user, keyboard-first |
| 3+ domain examples | PASS | New name, existing match, empty input |
| UAT scenarios (3-7) | PASS | 5 scenarios (incl. IME + mobile non-regression) |
| AC derived from UAT | PASS | 5 AC items |
| Right-sized | PASS | ~1 day, single component |
| Technical notes | PASS | IME guard, shared handler |
| Dependencies tracked | PASS | "None" |
| Outcome KPIs | PASS | 60% Enter rate target with event tagging |

**Status:** PASSED

### US-03: Enter in sheet submits

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | 15 round-trips to mouse per session |
| User/persona identified | PASS | Desktop-web user filling the sheet |
| 3+ domain examples | PASS | Happy submit, validation error, Notes-textarea edge |
| UAT scenarios (3-7) | PASS | 4 scenarios |
| AC derived from UAT | PASS | 4 AC items |
| Right-sized | PASS | ~1 day |
| Technical notes | PASS | `<form onSubmit>`, Cmd/Ctrl+Enter Notes handling |
| Dependencies tracked | PASS | Pairs with US-02, no blocker |
| Outcome KPIs | PASS | 60% Enter/Cmd-Enter submit target |

**Status:** PASSED

### US-04: Autofocus first editable field

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Extra Tab keystroke per add |
| User/persona identified | PASS | Desktop-web, opening sheet with prefilled name |
| 3+ domain examples | PASS | QuickAdd path, edit path, empty name |
| UAT scenarios (3-7) | PASS | 4 scenarios |
| AC derived from UAT | PASS | 4 AC items |
| Right-sized | PASS | ~0.5 day |
| Technical notes | PASS | Animation timing note |
| Dependencies tracked | PASS | None |
| Outcome KPIs | PASS | Keystroke count in scripted test |

**Status:** PASSED

### US-05: Focus returns to QuickAdd

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Keyboard flow broken by last step |
| User/persona identified | PASS | Desktop-web, completing add cycle |
| 3+ domain examples | PASS | Submit, cancel, validation-error-then-submit |
| UAT scenarios (3-7) | PASS | 4 scenarios |
| AC derived from UAT | PASS | 4 AC items |
| Right-sized | PASS | ~0.5-1 day |
| Technical notes | PASS | Ref ownership, RAF timing |
| Dependencies tracked | PASS | Complements US-02/US-03 |
| Outcome KPIs | PASS | Intra-session click count metric |

**Status:** PASSED

### US-06: Pencil icon replaces long-press on web

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Long-press not discoverable on desktop; Marco on iPhone must keep it |
| User/persona identified | PASS | Priya (desktop) primary, Marco/mobile guardrail, Ravi/keyboard |
| 3+ domain examples | PASS | Priya/pencil, Marco/long-press, Ravi/keyboard |
| UAT scenarios (3-7) | PASS | 6 scenarios (includes a11y + shared-handler) |
| AC derived from UAT | PASS | 8 AC items — all observable |
| Right-sized | PASS | ~1.5 days, 4 components, extract 1 shared icon component |
| Technical notes | PASS | Affected components listed, component extraction suggested, right-click explicitly rejected |
| Dependencies tracked | PASS | Existing edit handler verified |
| Outcome KPIs | PASS | Desktop edit-open rate matches mobile |

**Status:** PASSED

## Overall DoR Status: PASSED (6/6 stories)

All stories pass all 9 DoR items with specific evidence. No remediation required. Feature
is ready for peer review and DESIGN wave handoff.

## Artifacts Inventory

All in `docs/feature/web-ux-polish/discuss/`:

- `wave-decisions.md`
- `journey-desktop-planning-visual.md`
- `journey-desktop-planning.yaml`
- `shared-artifacts-registry.md`
- `story-map.md`
- `outcome-kpis.md`
- `user-stories.md` (6 stories)
- `dor-validation.md` (this file)
