# Definition of Ready Validation: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## US-AIF-01: Add New Item via Bottom Sheet

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Carlos gets hardcoded defaults (Kitchen Cabinets, Unknown, one-off) because QuickAdd has no metadata entry |
| User/persona identified | PASS | Carlos Rivera, household grocery planner, mid-sweep and whiteboard contexts |
| 3+ domain examples | PASS | Oat milk (staple + Fridge), Birthday candles (one-off + Kitchen Cabinets), Rotisserie chicken (staple, no aisle) |
| UAT scenarios (3-7) | PASS | 5 scenarios: no-match prompt, bottom sheet opens, staple saved, one-off added, no-aisle staple |
| AC derived from UAT | PASS | 6 ACs mapped to scenarios |
| Right-sized | PASS | 2-3 days effort, 5 scenarios, single bottom sheet flow |
| Technical notes | PASS | Bottom sheet component, addStaple/addItem calls, HouseArea type, offline-first |
| Dependencies tracked | PASS | No external dependencies. Depends on existing domain (addStaple, addItem) which is implemented |
| Outcome KPIs defined | PASS | MK1: metadata completion rate > 80% |

### DoR Status: PASSED

---

## US-AIF-02: Context-Aware Smart Defaults

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Carlos has to manually select area and type even when context makes the answer obvious |
| User/persona identified | PASS | Carlos Rivera mid-sweep (area known) vs whiteboard entry (area unknown) |
| 3+ domain examples | PASS | Almond butter (Fridge sweep), Dish soap (whiteboard), Dog treats (Garage Pantry sweep) |
| UAT scenarios (3-7) | PASS | 4 scenarios: sweep defaults, whiteboard defaults, area change, override |
| AC derived from UAT | PASS | 4 ACs mapped to scenarios |
| Right-sized | PASS | 1 day effort, 4 scenarios, UI-only changes |
| Technical notes | PASS | Reads activeArea and sweepProgress.allAreasComplete, no new domain logic |
| Dependencies tracked | PASS | Depends on US-AIF-01 (bottom sheet must exist) |
| Outcome KPIs defined | PASS | MK2: metadata entry under 5 seconds during sweep |

### DoR Status: PASSED

---

## US-AIF-03: Skip Metadata Shortcut

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Carlos in a rush does not know the store section and risks abandoning the add flow entirely |
| User/persona identified | PASS | Carlos Rivera in a rush during sweep |
| 3+ domain examples | PASS | Sriracha (skip during sweep), Fancy mustard (skip during whiteboard), Sriracha edit-later motivation |
| UAT scenarios (3-7) | PASS | 3 scenarios: skip with active area, skip without active area, skipped items not in staple library |
| AC derived from UAT | PASS | 5 ACs mapped to scenarios |
| Right-sized | PASS | 0.5-1 day effort, 3 scenarios, single button addition |
| Technical notes | PASS | addItem with one-off, area fallback logic, hardcoded "Uncategorized" |
| Dependencies tracked | PASS | Depends on US-AIF-01 |
| Outcome KPIs defined | PASS | K4 guardrail: add time under 10s preserved |

### DoR Status: PASSED

---

## US-AIF-04: Section Auto-Suggest

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Carlos retyping "Dairy" from scratch, risk of typos creating fragmented sections |
| User/persona identified | PASS | Carlos Rivera building staple library over time |
| 3+ domain examples | PASS | "Da" matches Dairy, "International Foods" no match, "D" matches Dairy and Deli |
| UAT scenarios (3-7) | PASS | 4 scenarios: suggestion appears, non-match filtered, new section accepted, tap fills field |
| AC derived from UAT | PASS | 5 ACs mapped to scenarios |
| Right-sized | PASS | 1-2 days effort, 4 scenarios |
| Technical notes | PASS | Derived from StapleLibrary.listAll() distinct sections, prefix match, case-insensitive |
| Dependencies tracked | PASS | Depends on US-AIF-01 |
| Outcome KPIs defined | PASS | 90% section entries use suggestion for existing sections |

### DoR Status: PASSED

---

## US-AIF-05: Duplicate Staple Detection

| DoR Item | Status | Evidence |
|----------|--------|----------|
| Problem statement clear | PASS | Carlos accidentally creating duplicate "Whole milk" in Fridge, cluttering list |
| User/persona identified | PASS | Carlos Rivera with existing staple library |
| 3+ domain examples | PASS | Whole milk duplicate caught, Trash bags same-name-different-area allowed, add-to-trip recovery |
| UAT scenarios (3-7) | PASS | 4 scenarios: duplicate detected, different area allowed, add to trip, cancel returns to form |
| AC derived from UAT | PASS | 5 ACs mapped to scenarios |
| Right-sized | PASS | 1 day effort, 4 scenarios |
| Technical notes | PASS | Uses existing isDuplicate logic, client-side check, addItem for "add to trip" path |
| Dependencies tracked | PASS | Depends on US-AIF-01 |
| Outcome KPIs defined | PASS | MK3: zero duplicate staples per month |

### DoR Status: PASSED

---

## Summary

| Story | DoR Status | Items Passed | Items Failed |
|-------|-----------|-------------|-------------|
| US-AIF-01 | PASSED | 9/9 | 0 |
| US-AIF-02 | PASSED | 9/9 | 0 |
| US-AIF-03 | PASSED | 9/9 | 0 |
| US-AIF-04 | PASSED | 9/9 | 0 |
| US-AIF-05 | PASSED | 9/9 | 0 |

All stories pass the Definition of Ready hard gate and are ready for handoff to the DESIGN wave.
