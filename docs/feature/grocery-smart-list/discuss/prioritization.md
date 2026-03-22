# Prioritization: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Walking Skeleton | End-to-end dual-view flow works | Can create item, see in both views, check off, complete trip | Validates core hypothesis: one list, two views |
| 2 | Release 1: Efficient Home Sweep | Prep time under 5 min | Prep time measurement; sweep completion rate | Addresses highest-scoring opportunities (O1, O3, O4) |
| 3 | Release 2: Reliability and Polish | Zero data loss in-store | Check-off persistence rate; items carried over correctly | Addresses offline reliability (O6) and carryover (O9) |

---

## Prioritization Scoring

### Walking Skeleton

| Factor | Score | Rationale |
|--------|-------|-----------|
| Value | 5 | Validates the entire product concept |
| Urgency | 5 | Must exist before anything else can be built |
| Effort | 2 | Thin slice, minimal UI, core data model only |
| **Priority Score** | **12.5** | Highest priority by rule (skeleton always first) |

### Release 1: Efficient Home Sweep

| Factor | Score | Rationale |
|--------|-------|-----------|
| Value | 5 | Directly addresses #1 pain (20 min prep) and #1 emotional driver (dread) |
| Urgency | 4 | Riskiest assumption: will quick-add replace whiteboard consolidation? |
| Effort | 3 | Multiple stories across sweep, whiteboard, and navigation |
| **Priority Score** | **6.7** | |

### Release 2: Reliability and Polish

| Factor | Score | Rationale |
|--------|-------|-----------|
| Value | 4 | Offline reliability is critical but partially addressed in WS |
| Urgency | 3 | Important but not riskiest assumption |
| Effort | 3 | Offline persistence, bulk import, error recovery |
| **Priority Score** | **4.0** | |

---

## Riskiest Assumptions by Release

| Release | Riskiest Assumption | How Validated |
|---------|-------------------|---------------|
| Walking Skeleton | A2: Users need two views of the same list | Use the dual-view for one trip; does the switch feel natural? |
| Release 1 | A7: Quick-add will replace whiteboard consolidation | Monitor if prep time drops below 5 min after 2 trips |
| Release 2 | A5: Offline check-offs never lose state | Complete a full shopping trip offline; verify all state persists |

---

## Backlog Suggestions

| Task | Release | Priority | Outcome Link | Dependencies |
|------|---------|----------|-------------|--------------|
| Add staple item with metadata | WS | P1 | O4 (staple distinction) | None |
| See pre-loaded staples by area | WS | P1 | O1 (consolidation time) | Staple item exists |
| Quick-add item (manual) | WS | P1 | O3 (item capture speed) | None |
| Toggle home/store view | WS | P1 | O8 (dual-view switch) | Items with area + aisle metadata |
| Check off items in store view | WS | P1 | O6 (reliable check-off) | Store view exists |
| Complete trip with carryover | WS | P1 | O9 (items carry over) | Check-off state exists |
| Uncheck staple not needed | R1 | P2 | O4 (staple management) | Pre-loaded staples |
| Add one-off during sweep | R1 | P2 | O3 (item capture speed) | Area detail view |
| Navigate between areas | R1 | P2 | O1 (consolidation time) | Area views exist |
| Track sweep progress | R1 | P2 | O1 (consolidation time) | Area navigation |
| Auto-suggest from staple library | R1 | P2 | O10 (batch whiteboard entry) | Staple library exists |
| Navigate between store sections | R1 | P2 | O5 (find next item) | Store view exists |
| Skip partially-complete section | R1 | P2 | O5 (find next item) | Section navigation |
| Trip summary with breakdown | R1 | P2 | O1 (consolidation time) | Trip data complete |
| Remove staple from library | R2 | P3 | O4 (staple management) | Staple library exists |
| Import initial staples (bulk) | R2 | P3 | O7 (metadata effort) | Staple model exists |
| Batch whiteboard entry | R2 | P3 | O10 (batch whiteboard entry) | Quick-add exists |
| Switch back to home view | R2 | P3 | O8 (dual-view switch) | View toggle exists |
| Uncheck mistaken check-off | R2 | P3 | O6 (reliable check-off) | Check-off exists |
| App restart preserves state | R2 | P3 | O6 (reliable check-off) | Local storage exists |

> **Note**: Story IDs (US-XX) will be assigned in Phase 4 (Requirements). Revisit this table after user stories are crafted.
