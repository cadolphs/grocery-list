# DISCUSS Wave Decisions: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DISCUSS
**Date**: 2026-03-17
**Decision**: GO -- all stories pass DoR, ready for DESIGN wave handoff

---

## Wave Summary

The DISCUSS wave produced a complete requirements package for a grocery smart list app with dual-view capability (home areas vs store aisles), staple item auto-population, offline-first shopping, and automatic trip carryover. Discovery was grounded in 6 validated pain points from the DISCOVER wave and 10 detailed interview answers covering the complete user journey from home sweep through trip completion.

---

## Phase Outcomes

### Phase 1: JTBD Analysis -- COMPLETE

- 6 job stories identified (JS1-JS6) covering home sweep, whiteboard consolidation, staple management, store navigation, in-store check-off, and trip completion
- Four Forces analysis confirms high switch likelihood (Push + Pull exceeds Anxiety + Habit)
- 10 outcome statements scored; top opportunities: consolidation elimination (17.5), staple distinction (17.5), offline check-off (17.0)

### Phase 2: Journey Design -- COMPLETE

- 2 journeys designed: home-sweep (6 steps) and store-shop (6 steps)
- Emotional arcs defined: Problem Relief (home), Confidence Building (store)
- ASCII mockups for all 12 journey steps
- YAML schemas with shared artifacts and integration checkpoints
- Gherkin scenarios for both journeys (17 home sweep scenarios, 18 store shop scenarios)
- Shared artifacts registry with 7 tracked artifacts and 4 integration checkpoints

### Phase 2.5: Story Mapping -- COMPLETE

- 6-activity backbone: Manage Staples, Sweep Home, Consolidate Whiteboard, Switch View, Shop Store, Complete Trip
- Walking skeleton identified: 6 stories covering thinnest end-to-end slice
- 3 releases sliced by outcome: Walking Skeleton, Release 1 (Efficient Sweep), Release 2 (Reliability)
- Prioritization scored with riskiest assumption identification

### Phase 3: Coherence Validation -- COMPLETE

- Vocabulary consistent throughout all artifacts (staple, one-off, house area, store section, sweep, trip)
- Emotional arcs coherent (no jarring transitions)
- Shared artifacts have single sources of truth
- Integration checkpoints defined and testable
- 4 non-functional requirements specified with quantitative thresholds

### Phase 4: Requirements Crafting -- COMPLETE

- 11 user stories crafted (US-01 through US-11)
- 6 Walking Skeleton stories + 5 Release 1 stories
- Every story traces to at least 1 job story
- All stories have 3+ domain examples with real data (Carlos Rivera, Elena, specific items and aisles)
- 3-4 UAT scenarios per story in Given/When/Then
- 8 outcome KPIs defined with baselines, targets, and measurement methods
- Anti-pattern scan: no Implement-X, no generic data, no technical AC, all right-sized

### Phase 5: Validation -- COMPLETE

- All 11 stories pass the 9-item DoR checklist
- No failed items across any story
- Dependency chain documented: US-01 is foundational, all others trace dependencies

---

## Decisions Made

| Decision | Rationale | Evidence |
|----------|-----------|---------|
| 6 job stories, not fewer | Each job story maps to a distinct user situation with unique forces | Interview answers reveal 6 distinct trigger moments |
| Walking skeleton = 6 stories | One story per backbone activity ensures thinnest end-to-end slice | Story map analysis |
| Whiteboard coexistence, not replacement | Wife prefers whiteboard; app must consolidate FROM it, not replace it | Interview Q9: "Wife would prefer using the whiteboard" |
| House areas as fixed list | 5 areas are stable; dynamic management is over-engineering for initial scope | Interview Q2: fixed list confirmed |
| Aisle as persistent item property | Staples recur; aisle is set once and reused | Interview Q5: "aisle is a fixed property on the staple item" |
| Manual view switch | User explicitly switches when entering the store, not automatic | Interview Q10: "Manual trigger, not automatic" |
| Non-bought items carry over | Items not bought migrate to next trip automatically | Interview Q8: "Items not bought get migrated to next trip" |
| One store only | No multi-store support in initial scope | Interview Q5: "One store only" |
| Offline-first is non-negotiable | Store Wi-Fi is unreliable; Notion failures are a primary pain point | PP5 validated; Interview Q5 confirms |

---

## Artifacts Produced

All artifacts in `docs/feature/grocery-smart-list/discuss/`:

| Artifact | File | Status |
|----------|------|--------|
| JTBD Job Stories | `jtbd-job-stories.md` | Complete |
| JTBD Four Forces | `jtbd-four-forces.md` | Complete |
| JTBD Opportunity Scores | `jtbd-opportunity-scores.md` | Complete |
| Journey Visual: Home Sweep | `journey-home-sweep-visual.md` | Complete |
| Journey Schema: Home Sweep | `journey-home-sweep.yaml` | Complete |
| Journey Gherkin: Home Sweep | `journey-home-sweep.feature` | Complete |
| Journey Visual: Store Shop | `journey-store-shop-visual.md` | Complete |
| Journey Schema: Store Shop | `journey-store-shop.yaml` | Complete |
| Journey Gherkin: Store Shop | `journey-store-shop.feature` | Complete |
| Shared Artifacts Registry | `shared-artifacts-registry.md` | Complete |
| Story Map | `story-map.md` | Complete |
| Prioritization | `prioritization.md` | Complete |
| Requirements | `requirements.md` | Complete |
| User Stories | `user-stories.md` | Complete |
| Acceptance Criteria | `acceptance-criteria.md` | Complete |
| DoR Checklist | `dor-checklist.md` | Complete |
| Outcome KPIs | `outcome-kpis.md` | Complete |
| Wave Decisions | `wave-decisions.md` | Complete |

---

## Handoff to DESIGN Wave

### For Solution Architect

1. **Requirements**: `requirements.md` -- functional, non-functional, business rules, domain glossary
2. **User stories**: `user-stories.md` -- 11 stories with full LeanUX template, all passing DoR
3. **Journey schemas**: `journey-home-sweep.yaml`, `journey-store-shop.yaml` -- structured journey definitions
4. **Shared artifacts**: `shared-artifacts-registry.md` -- 7 tracked artifacts with integration checkpoints
5. **Prioritization**: `prioritization.md` -- Walking Skeleton first, then Release 1, then Release 2
6. **Outcome KPIs**: `outcome-kpis.md` -- 8 KPIs with baselines, targets, measurement methods

### Key Context for DESIGN Wave

1. **Offline-first is a hard architectural requirement** -- all features must work without network
2. **Dual-view is the core differentiator** -- same data, two groupings (area vs aisle)
3. **Staple library is the backbone** -- persistent across trips, drives auto-population and suggestions
4. **Whiteboard coexistence** -- the app consolidates from the whiteboard; it does not replace it
5. **One store** -- no multi-store support needed initially
6. **Fixed house areas** -- 5 areas, not user-configurable in initial scope
7. **Performance targets**: view toggle under 200ms, check-off feedback under 100ms, suggestions under 300ms

### For Acceptance Designer (DISTILL Wave)

1. **Journey Gherkin**: `journey-home-sweep.feature`, `journey-store-shop.feature` -- 35 scenarios total
2. **Acceptance criteria**: `acceptance-criteria.md` -- rule-based Given/When/Then per story
3. **Integration checkpoints**: documented in `shared-artifacts-registry.md` and journey YAML files
4. **Outcome KPIs**: `outcome-kpis.md` -- measurement plan for post-release validation

### For Platform Architect (DEVOPS)

1. **Outcome KPIs**: `outcome-kpis.md` -- measurement plan includes automated data collection needs
2. **Key instrumentation**: prep time timestamps, check-off persistence rate, quick-add timing, view toggle timing
