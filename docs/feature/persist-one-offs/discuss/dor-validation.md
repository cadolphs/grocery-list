# Definition of Ready Validation: persist-one-offs

## Story: US-01 -- Persist One-Off to Library on First Add

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Elena finds it tedious to re-enter the item name, store section, and aisle number each time" -- domain language, specific pain |
| User/persona identified | PASS | "Elena Ruiz, weekly shopper who buys specialty items every few weeks" -- specific characteristics |
| 3+ domain examples | PASS | 3 examples: happy path (tahini), skip with defaults (birthday candles), duplicate one-off (tahini again) |
| UAT scenarios (3-7) | PASS | 4 scenarios: first add, skip defaults, duplicate prevention, staple add unaffected |
| AC derived from UAT | PASS | 4 AC items, each traceable to a scenario |
| Right-sized | PASS | ~1 day effort, 4 scenarios, single domain change + one UI handler |
| Technical notes | PASS | Type extension, MetadataBottomSheet changes, houseArea sentinel, duplicate handling noted |
| Dependencies tracked | PASS | No upstream dependencies (this is the foundation story) |
| Outcome KPIs defined | PASS | "100% of one-off adds result in a library entry" with measurement method |

### DoR Status: PASSED

---

## Story: US-02 -- Re-Add Persisted One-Off from QuickAdd Suggestions

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "one-offs are not persisted, so nothing appears... must re-enter name, section, aisle from scratch" |
| User/persona identified | PASS | "Returning shopper, starting a new trip, wants to quickly re-add a previously purchased one-off" |
| 3+ domain examples | PASS | 3 examples: happy path (tahini re-add), multiple matches (B search), already in trip |
| UAT scenarios (3-7) | PASS | 4 scenarios: appears in suggestions, adds with location, no duplicate, stays in one-offs section |
| AC derived from UAT | PASS | 5 AC items covering all scenarios |
| Right-sized | PASS | ~1 day effort, 4 scenarios, HomeView handler change |
| Technical notes | PASS | handleSelectSuggestion type check, duplicate detection adjustment, search already returns all |
| Dependencies tracked | PASS | Depends on US-01 (noted) |
| Outcome KPIs defined | PASS | "Time to re-add drops from ~15s to ~3s" with measurement method |

### DoR Status: PASSED

---

## Story: US-03 -- Differentiate One-Off Suggestions from Staple Suggestions

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "cannot tell which is the staple and which is the one-off... tapping wrong one adds with wrong type" |
| User/persona identified | PASS | "Shopper with overlapping item names, searching in QuickAdd" |
| 3+ domain examples | PASS | 3 examples: differentiated butter, single one-off, all staples |
| UAT scenarios (3-7) | PASS | 3 scenarios: one-off label, staple no label, same-name differentiation |
| AC derived from UAT | PASS | 3 AC items covering all scenarios |
| Right-sized | PASS | ~0.5 day effort, 3 scenarios, single function change in QuickAdd.tsx |
| Technical notes | PASS | formatSuggestion change, pure UI, no domain logic |
| Dependencies tracked | PASS | Depends on US-01 and US-02 (noted) |
| Outcome KPIs defined | PASS | "Mis-selection rate below 5%" with qualitative measurement |

### DoR Status: PASSED

---

## Story: US-04 -- Exclude Persisted One-Offs from Staple Checklist and Trip Preloading

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "one-offs clutter the sweep workflow... Birthday Candles have no house area and should not be part of sweep" |
| User/persona identified | PASS | "Weekly shopper using the staple checklist during sweep" |
| 3+ domain examples | PASS | 3 examples: checklist filters to staples, preloading filters to staples, empty checklist with only one-offs |
| UAT scenarios (3-7) | PASS | 3 scenarios: checklist excludes one-offs, preloading excludes one-offs, empty checklist |
| AC derived from UAT | PASS | 4 AC items covering all scenarios |
| Right-sized | PASS | ~0.5 day effort, 3 scenarios, filter additions in HomeView and trip init |
| Technical notes | PASS | Filter on listAll(), consumers filter not storage, depends on US-01 |
| Dependencies tracked | PASS | Depends on US-01 (noted) |
| Outcome KPIs defined | PASS | "Zero one-off items appear in sweep-related views" with automated test measurement |

### DoR Status: PASSED

---

## Overall Validation Summary

| Story | DoR Status | Blockers |
|-------|-----------|----------|
| US-01 | PASSED | None |
| US-02 | PASSED | None |
| US-03 | PASSED | None |
| US-04 | PASSED | None |

All 4 stories pass the 9-item DoR checklist. Ready for handoff to DESIGN wave.
