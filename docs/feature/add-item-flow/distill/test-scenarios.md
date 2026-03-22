# Test Scenarios: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Scenario Inventory

### Walking Skeletons (4 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| WS-AIF-1 | "Add as new item" row appears when no staple matches | US-AIF-01 | Happy path |
| WS-AIF-2 | Bottom sheet opens with metadata form when row is tapped | US-AIF-01 | Happy path |
| WS-AIF-3 | Submitting as staple saves to library and adds to trip | US-AIF-01 | Happy path |
| WS-AIF-4 | Submitting as one-off adds to trip without saving to library | US-AIF-01 | Happy path |

### Focused Scenarios (22 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| F-01 | "Add as new item" row appears even when partial matches exist | US-AIF-01 | Edge case |
| F-02 | Sweep mode pre-fills staple type and active area | US-AIF-02 | Happy path |
| F-03 | Whiteboard mode defaults to one-off with no area | US-AIF-02 | Happy path |
| F-04 | Active area changes when Carlos switches rooms | US-AIF-02 | Happy path |
| F-05 | Carlos can override any smart default | US-AIF-02 | Happy path |
| F-06 | Skip adds item as one-off with active area during sweep | US-AIF-03 | Happy path |
| F-07 | Skip uses Kitchen Cabinets fallback during whiteboard entry | US-AIF-03 | Edge case |
| F-08 | Skipped items are not saved to staple library | US-AIF-03 | Happy path |
| F-09 | Previously used section appears as suggestion on prefix match | US-AIF-04 | Happy path |
| F-10 | Non-matching sections are filtered out | US-AIF-04 | Happy path |
| F-11 | Tapping a section suggestion fills the field | US-AIF-04 | Happy path |
| F-12 | New section name accepted without restriction | US-AIF-04 | Edge case |
| F-13 | Section suggestions are case-insensitive | US-AIF-04 | Edge case |
| F-14 | Duplicate detected when same name and area exist | US-AIF-05 | Error path |
| F-15 | Same name in different area is not a duplicate | US-AIF-05 | Edge case |
| F-16 | "Add to trip instead" uses existing staple metadata | US-AIF-05 | Happy path (recovery) |
| F-17 | Cancel from duplicate warning returns to form | US-AIF-05 | Happy path (recovery) |
| F-18 | Submit blocked when area is not selected | Validation | Error path |
| F-19 | Submit blocked when section is empty | Validation | Error path |
| F-20 | Aisle number is optional and item saves without it | Validation | Edge case |
| F-21 | Dismissing the bottom sheet adds nothing | US-AIF-01 | Error path |
| F-22 | QuickAdd input clears after successful submission | US-AIF-01 | Happy path |

---

## Coverage Analysis

**Total scenarios**: 26 (4 walking skeletons + 22 focused)

### By Story

| Story | Scenarios | Coverage |
|-------|-----------|----------|
| US-AIF-01 (Bottom sheet entry) | 7 | All ACs covered |
| US-AIF-02 (Smart defaults) | 4 | All ACs covered |
| US-AIF-03 (Skip shortcut) | 3 | All ACs covered |
| US-AIF-04 (Section auto-suggest) | 5 | All ACs covered |
| US-AIF-05 (Duplicate detection) | 4 | All ACs covered |
| Validation / Error paths | 3 | Boundary conditions |

### By Type

| Type | Count | Percentage |
|------|-------|------------|
| Happy path | 14 | 54% |
| Error path | 4 | 15% |
| Edge case | 6 | 23% |
| Recovery path | 2 | 8% |

**Error + Edge + Recovery ratio**: 46% (exceeds 40% target)

---

## Implementation Sequence

Enable tests one at a time in this order:

1. WS-AIF-1: No staple match triggers prompt (domain-only, already passing)
2. F-01: Partial match still shows prompt (domain + UI)
3. WS-AIF-2: Bottom sheet opens with form fields (UI component)
4. WS-AIF-3: Staple submit saves to library + trip (integration)
5. WS-AIF-4: One-off submit adds to trip only (integration)
6. F-18: Validation - area required
7. F-19: Validation - section required
8. F-20: Aisle optional
9. F-21: Dismiss adds nothing
10. F-02: Sweep mode defaults
11. F-03: Whiteboard mode defaults
12. F-04: Active area follows room switch
13. F-05: Override defaults
14. F-06: Skip with active area
15. F-07: Skip with Kitchen Cabinets fallback
16. F-08: Skip does not save to library
17. F-09: Section suggestion prefix match
18. F-10: Non-matching filtered out
19. F-11: Tap suggestion fills field
20. F-12: New section accepted
21. F-13: Case-insensitive suggestions
22. F-14: Duplicate detected
23. F-15: Different area not duplicate
24. F-16: Add to trip instead
25. F-17: Cancel returns to form
26. F-22: Input clears after submit
