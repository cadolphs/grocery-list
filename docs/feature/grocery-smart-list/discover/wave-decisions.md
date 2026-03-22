# DISCOVER Wave Decisions: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DISCOVER
**Date**: 2026-03-17
**Decision**: GO -- proceed to DISCUSS wave

---

## Discovery Summary

A 4-phase product discovery for a grocery list app that addresses a validated dual-view need: organizing items by house area at home and by store aisle/section when shopping. The primary user (builder) experiences 20 minutes of prep friction per bi-weekly shopping trip due to consolidating a physical whiteboard into a structured Notion database. Existing tools (Notion, Workflowy, generic grocery apps) fail to support this dual-view need.

## Phase Outcomes

### Phase 1: Problem Validation -- PASSED

6 pain points validated with past behavior evidence:
1. Prep friction (20 min/trip)
2. No staples vs one-off distinction
3. Adding items is painful
4. Per-item store metadata hard to manage
5. Offline reliability failures in-store
6. Multi-user input limited to physical whiteboard

Key emotional signal: "dread" around trip planning.

### Phase 2: Opportunity Mapping -- PASSED

6 opportunities scored. Top 4 (all Tier 1, score >14):
1. Dual-view support (18)
2. Eliminate consolidation (17)
3. Staples vs one-offs (16)
4. Offline reliability (15)

### Phase 3: Solution Testing -- PASSED

Solution concept defined: React Native app with dual-view, staple/one-off item types, offline-first architecture, quick-add capture. Walking skeleton built and tested.

### Phase 4: Market Viability -- PASSED

Lean Canvas complete. All 4 big risks assessed as GREEN. Personal project -- viability measured in time saved, not revenue.

## Assumptions Tracker

### Validated Assumptions

| ID | Assumption | Evidence | Status |
|---|---|---|---|
| A1 | Grocery planning causes meaningful friction | 20 min prep, "dread" signal | VALIDATED |
| A2 | Users need two views of the same list | Explicitly stated; Workflowy abandoned for this reason | VALIDATED |
| A3 | Existing tools fail at dual-view | Notion and Workflowy both tried, both inadequate | VALIDATED |
| A4 | Staple vs one-off is a real distinction | User "suffers" without it, no workaround exists | VALIDATED |
| A5 | Offline reliability is critical in-store | Store Wi-Fi unreliable, Notion fails | VALIDATED |
| A6 | Multiple household members need to add items | Wife adds to whiteboard | VALIDATED |

### Assumptions to Validate in Build

| ID | Assumption | Risk | Test |
|---|---|---|---|
| A7 | Quick-add in app will replace whiteboard | Medium | Monitor if whiteboard is retired after 2 weeks |
| A8 | Wife will adopt app over whiteboard | Medium | Observe adoption after onboarding |
| A9 | Store metadata (aisle/section) stays accurate over time | Low | Track metadata staleness over 3 months |
| A10 | Dual-view switch is intuitive without training | Low | Observe first-use of store view |

### Invalidated Assumptions

| ID | Assumption | Evidence |
|---|---|---|
| A11 | Items fall through the cracks (missed purchases) | User explicitly said items don't fall through -- pain is friction, not accuracy |

## Decisions Made

| Decision | Rationale | Evidence |
|---|---|---|
| GO: Build grocery-smart-list | All 4 gates passed. 6 validated pain points. Builder is the user -- strongest commitment signal. | Full discovery package |
| Dual-view is the core differentiator | No existing tool supports home-area + store-aisle views. Highest opportunity score (18). | OPP3, interview Q5 |
| Offline-first architecture | Non-negotiable for in-store use. Notion's offline failures are a primary pain point. | PP5, interview Q3 |
| Staples as first-class concept | No workaround exists. User "suffers." Second-highest unmet need after dual-view. | PP2, interview Q2.2 |
| Personal project evidence standard | 1 deep self-interview + corroboration appropriate when builder = user. Adapted from 5-interview standard. | User-approved adaptation |

## Handoff to DISCUSS Wave

### Deliverables

All artifacts in `docs/feature/grocery-smart-list/discover/`:

| Artifact | File | Status |
|---|---|---|
| Problem validation | `problem-validation.md` | Complete |
| Opportunity tree | `opportunity-tree.md` | Complete |
| Solution testing | `solution-testing.md` | Complete |
| Lean canvas | `lean-canvas.md` | Complete |
| Interview log | `interview-log.md` | Complete |
| Wave decisions | `wave-decisions.md` | Complete |

### Key Context for Product Owner

1. The dual-view concept is the core product insight -- do not compromise it
2. Offline-first is a hard requirement, not a nice-to-have
3. "Staple" items that auto-repopulate are the second key differentiator
4. The emotional driver is "dread" -- success means planning feels effortless
5. Monitor assumptions A7-A10 during build; they remain unvalidated
6. The invalidated assumption (A11: missed items) means the value proposition is efficiency/experience, NOT accuracy/completeness
