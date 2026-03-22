# Opportunity Solution Tree: Grocery Smart List

**Feature ID**: grocery-smart-list
**Phase**: 2 -- Opportunity Mapping
**Date**: 2026-03-17
**Status**: COMPLETE -- Gate G2 passed

---

## Desired Outcome

> Reduce dread around grocery trip planning.

## Job Map

| Step | Job Step | Current Experience |
|------|----------|-------------------|
| Define | Identify what groceries are needed | Scan house areas, check whiteboard |
| Locate | Find/gather input from all sources | Whiteboard + memory + house sweep |
| Prepare | Consolidate into shopping list | Transcribe whiteboard to Notion (~20 min) |
| Confirm | Verify list is complete | Mental review, sometimes miss items |
| Execute | Shop efficiently in store | Notion grouped by aisle/section |
| Monitor | Track progress through store | Check off items in Notion (unreliable offline) |
| Modify | Handle changes (out of stock, additions) | Ad-hoc in Notion (painful) |
| Conclude | Complete trip, reset for next cycle | Manually delete one-offs, re-check staples |

## Opportunity Tree

```
Desired Outcome: Reduce dread around grocery trip planning
|
+-- OPP1: Eliminate list consolidation effort [Score: 17]
|     +-- S1a: Single-app capture that replaces whiteboard
|     +-- S1b: Quick-add with natural language input
|     +-- S1c: Shared household input (both users add directly)
|
+-- OPP2: Automatically distinguish staples from one-offs [Score: 16]
|     +-- S2a: Item type toggle (staple vs one-off)
|     +-- S2b: Staples auto-repopulate after trip completion
|     +-- S2c: Smart detection based on purchase frequency
|
+-- OPP3: Support dual-view (home-organized + store-organized) [Score: 18]
|     +-- S3a: Two views of same data: home-area view + aisle view
|     +-- S3b: Per-item metadata for both house location and store location
|     +-- S3c: Auto-sort store view by aisle walk-order
|
+-- OPP4: Work reliably offline in-store [Score: 15]
|     +-- S4a: Offline-first architecture with sync
|     +-- S4b: Local storage with background sync when connected
|
+-- OPP5: Reduce friction of adding/managing items [Score: 14]
|     +-- S5a: One-tap add from staples checklist
|     +-- S5b: Swipe/tap to check off (minimal interaction)
|     +-- S5c: Voice input for hands-free capture
|
+-- OPP6: Enable shared household list management [Score: 11]
|     +-- S6a: Shared list with real-time sync between household members
|     +-- S6b: Simple share link (no account required for secondary user)
```

## Opportunity Scoring

**Formula**: Score = Importance + Max(0, Importance - Satisfaction)

| Opportunity | Importance (1-10) | Satisfaction (1-10) | Score | Rationale |
|---|---|---|---|---|
| OPP3: Dual-view | 9 | 0 | 18 | Core unmet need. No tool does this well. Notion approximates but poorly. |
| OPP1: Eliminate consolidation | 9 | 1 | 17 | 20 min per trip. Whiteboard-to-Notion is pure waste. Notion barely helps. |
| OPP2: Staples vs one-offs | 8 | 0 | 16 | No workaround exists. User "just suffers." Zero satisfaction. |
| OPP4: Offline reliability | 8 | 1 | 15 | Store Wi-Fi unreliable. Notion fails offline. Critical for in-store use. |
| OPP5: Reduce add/manage friction | 8 | 2 | 14 | Adding items is "painful." Whiteboard is faster than Notion. |
| OPP6: Shared household | 7 | 4 | 10 | Whiteboard works as shared surface. Pain is moderate. |

## Top Opportunities (Prioritized)

### Tier 1 -- Must address (score > 14)

1. **OPP3: Dual-view** (18) -- The defining product insight. Home-area view for restocking sweep + store-aisle view for shopping. This is the core differentiator.
2. **OPP1: Eliminate consolidation** (17) -- Remove the 20-minute prep tax entirely. Single capture surface that feeds both views.
3. **OPP2: Staples vs one-offs** (16) -- First-class item types. Staples persist across trips; one-offs auto-clear.
4. **OPP4: Offline reliability** (15) -- Non-negotiable for in-store use. Must work without network.

### Tier 2 -- Should address (score 10-14)

5. **OPP5: Reduce friction** (14) -- Quick-add, easy check-off. Table-stakes UX.
6. **OPP6: Shared household** (10) -- Wife needs to add items too. Whiteboard currently works.

## Gate G2 Evaluation

| Criterion | Target | Result | Status |
|---|---|---|---|
| Opportunities identified | 5+ distinct | 6 identified | PASS |
| Top scores | >8 | Top 4 all >14 | PASS |
| Job step coverage | 80%+ | All 8 steps covered | PASS |
| Team alignment | Confirmed | Solo project, self-aligned | PASS (adapted) |

**Decision**: PROCEED to Phase 3 (Solution Testing)
