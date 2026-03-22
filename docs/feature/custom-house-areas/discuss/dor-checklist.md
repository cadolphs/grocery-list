# DoR Checklist: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## US-CHA-01: View Area List in Settings

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | Ana Lucia cannot see or control her area configuration; "Garage Pantry" is meaningless for her house |
| 2 | User/persona with specific characteristics | PASS | Ana Lucia Rivera, new user with different house layout |
| 3 | 3+ domain examples with real data | PASS | Fresh install defaults, custom areas after modification, settings during sweep |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 3 scenarios: default view, custom view, mid-sweep access |
| 5 | AC derived from UAT | PASS | 5 AC items covering settings icon, area list, drag handles, add button, defaults |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~1 day, 3 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | New AreaStorage port, default seeding, settings icon in header |
| 8 | Dependencies resolved or tracked | PASS | No dependencies (foundational story) |
| 9 | Outcome KPIs defined | PASS | KPI-CHA-01 (settings discovery rate) |

### Result: PASS

---

## US-CHA-02: Add a New House Area

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | Ana Lucia's laundry room supplies end up under Bathroom; feels wrong, confuses sweep |
| 2 | User/persona with specific characteristics | PASS | Ana Lucia Rivera, user with non-default rooms; Miguel (basement pantry); Priya Sharma (office) |
| 3 | 3+ domain examples with real data | PASS | Laundry Room, Basement Pantry, Office -- real names, real items |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 4 scenarios: add area, appears in home view, appears in picker, add staple to new area |
| 5 | AC derived from UAT | PASS | 4 AC items covering creation, display, availability, persistence |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~1 day, 4 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Generated ID, position = last, validation deferred to US-CHA-07 |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-01 (tracked) |
| 9 | Outcome KPIs defined | PASS | KPI-CHA-02 (area addition rate) |

### Result: PASS

---

## US-CHA-03: Home View and Domain Logic Use Dynamic Area List

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | New area invisible to groupByArea, sweep progress, area picker; hardcoded constants ignore user changes |
| 2 | User/persona with specific characteristics | PASS | Carlos Rivera, user who added a custom area |
| 3 | 3+ domain examples with real data | PASS | groupByArea includes Laundry Room, sweep progress 1/6, area picker shows 6 |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 4 scenarios: groupByArea, sweep progress, picker, removed area |
| 5 | AC derived from UAT | PASS | 5 AC items covering all consumers of the area list |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~2 days (cross-cutting but bounded), 4 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Signature changes for groupByArea and getSweepProgress; type change for HouseArea |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-01 (tracked) |
| 9 | Outcome KPIs defined | PASS | Zero hardcoded area references in codebase |

### Result: PASS

---

## US-CHA-04: Rename a House Area

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | "Garage Pantry" feels off; Carlos and Elena call it "the pantry" |
| 2 | User/persona with specific characteristics | PASS | Carlos Rivera (rename to match vocabulary), Ana Lucia (prefers "Refrigerator") |
| 3 | 3+ domain examples with real data | PASS | Garage Pantry to Pantry (4 staples), Fridge to Refrigerator (6 staples), Kitchen Cabinets to Kitchen mid-trip |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 4 scenarios: propagate to staples, home view, trip items, prevent duplicate name |
| 5 | AC derived from UAT | PASS | 5 AC items covering edit, propagation (staples + trip), duplicate prevention, persistence |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~2 days, 4 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Batch update, atomic operation or rollback |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-03 (tracked) |
| 9 | Outcome KPIs defined | PASS | KPI-CHA-01 (customization adoption) |

### Result: PASS

---

## US-CHA-05: Delete a House Area

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | "Garage Pantry" meaningless for Ana Lucia; clutters sweep with empty room |
| 2 | User/persona with specific characteristics | PASS | Ana Lucia (removing irrelevant defaults), Carlos (merging Freezer into Fridge) |
| 3 | 3+ domain examples with real data | PASS | Delete empty area, delete with 2 staples (frozen peas, ice cream) reassigned, last area blocked |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 5 scenarios: empty delete, reassignment, trip items, last area, duplicate conflict |
| 5 | AC derived from UAT | PASS | 6 AC items covering both paths, reassignment, constraint, conflict, persistence |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~2 days, 5 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Multi-step operation, duplicate detection on reassignment |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-03, US-CHA-04 (tracked) |
| 9 | Outcome KPIs defined | PASS | KPI-CHA-03 (default area cleanup), KPI-CHA-05 (zero data loss) |

### Result: PASS

---

## US-CHA-06: Reorder House Areas

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | App order does not match Carlos's walking path; scrolling disrupts flow |
| 2 | User/persona with specific characteristics | PASS | Carlos (physical walking path), Ana Lucia (fridge last) |
| 3 | 3+ domain examples with real data | PASS | Laundry Room to position 2, Fridge to end, order persists after restart |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 4 scenarios: drag reorder, home view, sweep suggestion, persistence |
| 5 | AC derived from UAT | PASS | 5 AC items covering drag, home view, sweep, persistence, picker |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~1 day, 4 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Array index = position, drag library needed |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-03 (tracked) |
| 9 | Outcome KPIs defined | PASS | KPI-CHA-01 (customization adoption) |

### Result: PASS

---

## US-CHA-07: Area Name Validation

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Problem statement clear, domain language | PASS | Bad input (blank, duplicate, long names) causes confusing behavior |
| 2 | User/persona with specific characteristics | PASS | Carlos (accidental duplicate), Ana Lucia (blank name), Miguel (long name) |
| 3 | 3+ domain examples with real data | PASS | Duplicate "Bathroom" blocked, empty blocked, long name truncated at 40 |
| 4 | UAT in Given/When/Then (3-7 scenarios) | PASS | 5 scenarios: duplicate, case-insensitive, empty, whitespace, max length |
| 5 | AC derived from UAT | PASS | 6 AC items covering all validation rules and inline feedback |
| 6 | Right-sized (1-3 days, 3-7 scenarios) | PASS | ~1 day, 5 scenarios |
| 7 | Technical notes: constraints/dependencies | PASS | Pure validation function, reusable for add and rename |
| 8 | Dependencies resolved or tracked | PASS | Depends on US-CHA-02 (tracked) |
| 9 | Outcome KPIs defined | PASS | Zero invalid areas in storage |

### Result: PASS

---

## Summary

| Story | Status |
|---|---|
| US-CHA-01: View Area List | PASS |
| US-CHA-02: Add Area | PASS |
| US-CHA-03: Dynamic Consumption | PASS |
| US-CHA-04: Rename Area | PASS |
| US-CHA-05: Delete Area | PASS |
| US-CHA-06: Reorder Areas | PASS |
| US-CHA-07: Validation | PASS |

All 7 stories pass the 9-item DoR checklist. Ready for DESIGN wave handoff.
