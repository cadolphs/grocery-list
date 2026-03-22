# Definition of Ready Checklist: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Walking Skeleton Stories

### US-01: Add a Staple Item

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Carlos finds it tedious to re-enter the same items every trip because Notion has no concept of recurring items. He just suffers through rebuilding the list from memory." |
| User/persona identified | PASS | Carlos Rivera, household grocery planner, bi-weekly shopper, maintains a system |
| 3+ domain examples | PASS | 3 examples: dairy staple with aisle, non-aisle staple (Deli), one-off item |
| UAT scenarios (3-7) | PASS | 4 scenarios: full metadata, one-off, no aisle, duplicate prevention |
| AC derived from UAT | PASS | 5 acceptance criteria derived from scenarios |
| Right-sized (1-3 days) | PASS | Estimated 1-2 days; 4 scenarios; single data model feature |
| Technical notes | PASS | Item model defined; local storage; optional aisle |
| Dependencies tracked | PASS | No dependencies (foundational story) |
| Outcome KPIs defined | PASS | K2: 20 staples created within first week |

### DoR Status: PASSED

---

### US-02: See Pre-Loaded Staples by Area

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Carlos spends 20 minutes rebuilding his shopping list from scratch. He dreads the prep." |
| User/persona identified | PASS | Carlos Rivera, bi-weekly shopper, wants list pre-populated |
| 3+ domain examples | PASS | 3 examples: staples across areas, empty area, new staple appears |
| UAT scenarios (3-7) | PASS | 3 scenarios: pre-load, new staple, empty area |
| AC derived from UAT | PASS | 5 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1 day; 3 scenarios; query + display |
| Technical notes | PASS | Query staple library on sweep start, group by area |
| Dependencies tracked | PASS | Depends on US-01 (staple items must exist) |
| Outcome KPIs defined | PASS | K1 (prep time), K2 (80% pre-populated) |

### DoR Status: PASSED

---

### US-03: Quick-Add Item

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "In Notion, adding a single item is painful because the database structure makes quick entry cumbersome." |
| User/persona identified | PASS | Carlos Rivera, mid-sweep or consolidating whiteboard |
| 3+ domain examples | PASS | 3 examples: sweep add, whiteboard known item, whiteboard unknown one-off |
| UAT scenarios (3-7) | PASS | 3 scenarios: new with metadata, whiteboard suggestion, unknown one-off |
| AC derived from UAT | PASS | 4 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1-2 days; 3 scenarios; input + metadata assignment |
| Technical notes | PASS | Speed-focused input; metadata as secondary step; offline |
| Dependencies tracked | PASS | No hard dependencies (can work without suggestions initially) |
| Outcome KPIs defined | PASS | K4: under 10 seconds per add |

### DoR Status: PASSED

---

### US-04: Toggle Between Home and Store Views

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "No existing tool supports this dual-view of the same data. Notion approximates it but friction is high." |
| User/persona identified | PASS | Carlos Rivera, transitioning from home to store |
| 3+ domain examples | PASS | 3 examples: switch to store, switch back, empty aisles excluded |
| UAT scenarios (3-7) | PASS | 3 scenarios: store view, back to home, empty aisles |
| AC derived from UAT | PASS | 6 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 2 days; 3 scenarios; groupBy logic + UI |
| Technical notes | PASS | Same data model, different groupBy; state preserved; offline |
| Dependencies tracked | PASS | Depends on US-01 (items with area + aisle metadata) |
| Outcome KPIs defined | PASS | K5: toggle under 200ms |

### DoR Status: PASSED

---

### US-05: Check Off Items in Store

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Notion check-offs sometimes fail on the store's unreliable Wi-Fi. He loses check-off state and cannot trust the list." |
| User/persona identified | PASS | Carlos Rivera, in-store, standing in an aisle |
| 3+ domain examples | PASS | 3 examples: offline check-off, app restart, uncheck by mistake |
| UAT scenarios (3-7) | PASS | 4 scenarios: offline check, restart, uncheck, progress counter |
| AC derived from UAT | PASS | 6 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1-2 days; 4 scenarios; local storage write |
| Technical notes | PASS | Local storage write per check-off; handles backgrounding and cold restart |
| Dependencies tracked | PASS | Depends on US-04 (store view must exist) |
| Outcome KPIs defined | PASS | K3: zero check-off failures |

### DoR Status: PASSED

---

### US-06: Complete Trip with Carryover

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "He must manually track what was not bought. Items occasionally slip through the cracks between trips." |
| User/persona identified | PASS | Carlos Rivera, finishing a shopping trip |
| 3+ domain examples | PASS | 3 examples: all bought, one-off not bought, staple not bought |
| UAT scenarios (3-7) | PASS | 4 scenarios: all bought, unbought one-off, unbought staple, no duplicate carryover |
| AC derived from UAT | PASS | 6 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 2 days; 4 scenarios; state transition + carryover logic |
| Technical notes | PASS | State transition not deletion; handles multi-trip carryover |
| Dependencies tracked | PASS | Depends on US-05 (check-off state must exist) |
| Outcome KPIs defined | PASS | K6: zero items lost between trips |

### DoR Status: PASSED

---

## Release 1 Stories

### US-07: Skip Staple This Trip

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Sometimes he does not need a staple this trip. He needs to remove it from this trip without deleting it from the staple library." |
| User/persona identified | PASS | Carlos Rivera, reviewing pre-loaded staples during sweep |
| 3+ domain examples | PASS | 3 examples: skip shampoo, skip then re-add, skip multiple |
| UAT scenarios (3-7) | PASS | 3 scenarios: skip without delete, reappears next trip, re-add |
| AC derived from UAT | PASS | 4 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1 day; 3 scenarios; per-trip state flag |
| Technical notes | PASS | Per-trip state, not library mutation |
| Dependencies tracked | PASS | Depends on US-02 (pre-loaded staples) |
| Outcome KPIs defined | PASS | K2 (flexible staple management) |

### DoR Status: PASSED

---

### US-08: Navigate Areas During Sweep

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Notion shows a flat list with no sense of progression through the sweep." |
| User/persona identified | PASS | Carlos Rivera, walking room-to-room during sweep |
| 3+ domain examples | PASS | 3 examples: complete and move, progress tracking, out-of-order |
| UAT scenarios (3-7) | PASS | 3 scenarios: complete area, out-of-order, all complete |
| AC derived from UAT | PASS | 4 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1 day; 3 scenarios; navigation state |
| Technical notes | PASS | Per-sweep state; no enforced ordering |
| Dependencies tracked | PASS | Depends on US-02 (area views exist) |
| Outcome KPIs defined | PASS | K1 (sweep time) |

### DoR Status: PASSED

---

### US-09: Auto-Suggest from Staple Library

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Re-entering metadata for staples he has added before is wasted effort." |
| User/persona identified | PASS | Carlos Rivera, entering whiteboard items or adding during sweep |
| 3+ domain examples | PASS | 3 examples: known staple, multiple matches, no match |
| UAT scenarios (3-7) | PASS | 3 scenarios: suggest with metadata, one-tap add, no match |
| AC derived from UAT | PASS | 5 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1-2 days; 3 scenarios; search index + UI |
| Technical notes | PASS | Prefix match, case-insensitive, top 5 |
| Dependencies tracked | PASS | Depends on US-01 (staple library exists) |
| Outcome KPIs defined | PASS | K4 (add time under 5 sec for known items) |

### DoR Status: PASSED

---

### US-10: Navigate Store Sections

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "He needs to move from one section to the next efficiently, skipping empty aisles." |
| User/persona identified | PASS | Carlos Rivera, in-store, moving between aisles |
| 3+ domain examples | PASS | 3 examples: complete and move, partial section, return to list |
| UAT scenarios (3-7) | PASS | 3 scenarios: next section, move on with unchecked, section list |
| AC derived from UAT | PASS | 4 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1 day; 3 scenarios; navigation UI |
| Technical notes | PASS | Section order: numbered ascending then named |
| Dependencies tracked | PASS | Depends on US-04 (store view) and US-05 (check-off) |
| Outcome KPIs defined | PASS | K3 (reliable in-store experience) |

### DoR Status: PASSED

---

### US-11: Trip Summary

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "He needs confidence that the list is complete and correct before heading to the store." |
| User/persona identified | PASS | Carlos Rivera, after completing sweep and whiteboard |
| 3+ domain examples | PASS | 3 examples: normal summary, no whiteboard, many skips |
| UAT scenarios (3-7) | PASS | 3 scenarios: full breakdown, prep time, skipped staples |
| AC derived from UAT | PASS | 5 acceptance criteria |
| Right-sized (1-3 days) | PASS | Estimated 1 day; 3 scenarios; read-only summary |
| Technical notes | PASS | Timestamp from sweep start; read-only |
| Dependencies tracked | PASS | Depends on US-02 (sweep) and US-03 (quick-add) |
| Outcome KPIs defined | PASS | K1 (prep time), K7 (dread reduction) |

### DoR Status: PASSED

---

## Summary

| Story | DoR Status | Failed Items | Notes |
|-------|-----------|-------------|-------|
| US-01 | PASSED | None | Foundational story, no dependencies |
| US-02 | PASSED | None | Depends on US-01 |
| US-03 | PASSED | None | Can start without suggestions (US-09) |
| US-04 | PASSED | None | Depends on US-01 |
| US-05 | PASSED | None | Depends on US-04 |
| US-06 | PASSED | None | Depends on US-05 |
| US-07 | PASSED | None | Depends on US-02 |
| US-08 | PASSED | None | Depends on US-02 |
| US-09 | PASSED | None | Depends on US-01 |
| US-10 | PASSED | None | Depends on US-04, US-05 |
| US-11 | PASSED | None | Depends on US-02, US-03 |

All 11 stories pass the Definition of Ready. Ready for handoff to DESIGN wave.
