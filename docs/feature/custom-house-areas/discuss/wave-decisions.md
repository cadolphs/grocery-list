# DISCUSS Wave Decisions: Custom House Areas

**Feature ID**: custom-house-areas
**Wave**: DISCUSS
**Date**: 2026-03-20
**Decision**: GO -- all 7 stories pass DoR, ready for DESIGN wave handoff

---

## Wave Summary

The DISCUSS wave produced a complete requirements package for making house areas user-configurable. This reverses the original grocery-smart-list decision to keep areas as a hardcoded list. The feature enables adding, renaming, deleting, and reordering areas, with the 5 original areas as defaults for new users. Discovery was grounded in the existing grocery-smart-list JTBD (JS1 and JS3) and extended with a new persona (Ana Lucia Rivera) representing users with different house layouts.

---

## Changed Assumptions

| Original Decision | Original Rationale | New Decision | New Rationale |
|---|---|---|---|
| House areas as fixed list (5 areas) | Dynamic management is over-engineering for initial scope | House areas are user-configurable with 5 defaults | Different households have different rooms; configurable areas enable diverse household support |

---

## Phase Outcomes

### Phase 2: Journey Design -- COMPLETE

- 1 journey designed: "Carlos Customizes His House Areas" (7 steps including 4 modification sub-steps)
- Emotional arc: Ownership Building (curious, empowered, reassured, confident)
- ASCII mockups for settings screen, add, rename, delete (with reassignment), reorder, and verification
- YAML schema with shared artifacts and 6 integration checkpoints
- Gherkin scenarios: 20 scenarios covering all CRUD operations and error paths

### Phase 2.5: Story Mapping -- COMPLETE

- 6-activity backbone: Access Settings, Add Area, Rename Area, Delete Area, Reorder Areas, Sweep with Custom Areas
- Walking skeleton: 3 stories (view list, add area, dynamic consumption)
- Release 1: 4 additional stories (rename, delete, reorder, validation)
- Scope assessment: PASS (7 stories, 2 contexts, ~5-7 days)

### Phase 3: Coherence Validation -- COMPLETE

- Shared artifacts registry: 3 tracked artifacts (area-list, area-name, area-order)
- 6 integration checkpoints defined with validation criteria
- Cross-cutting impact mapped: 7 code locations require changes
- Vocabulary consistent with original grocery-smart-list terminology

### Phase 4: Requirements Crafting -- COMPLETE

- 7 user stories (US-CHA-01 through US-CHA-07)
- 3 Walking Skeleton stories + 4 Release 1 stories
- All stories trace to JS1 and/or JS3 from original JTBD
- All stories have 3+ domain examples with real data (Carlos, Ana Lucia, Miguel, Priya)
- 3-5 UAT scenarios per story
- 5 outcome KPIs defined
- Anti-pattern scan: no Implement-X, no generic data, no technical AC, all right-sized

### Phase 5: Validation -- COMPLETE

- All 7 stories pass the 9-item DoR checklist
- No failed items

---

## Decisions Made

| Decision | Rationale | Evidence |
|---|---|---|
| 5 default areas on fresh install | Backward compatibility; Carlos's areas work for him | Original interview confirmed these 5 areas |
| Delete requires reassignment (not orphan or block) | Users should not lose data; reassignment is the safest path | Error path analysis in journey design |
| Rename propagates automatically | Manual re-tagging of staples after rename is tedious and error-prone | Emotional arc: rename should feel instant and complete |
| Case-insensitive uniqueness | "Bathroom" and "bathroom" are obviously the same room | Common validation pattern |
| Max 40 characters | Prevents layout breakage while allowing reasonable names | Longest default name is 16 chars; 40 gives 2.5x headroom |
| Minimum 1 area | Sweep requires at least 1 area to function | Domain constraint |
| Area order = array position | Simplest implementation; no separate sort field needed | Standard pattern for ordered lists |
| Settings screen (not inline editing) | Area management is infrequent; dedicated screen avoids cluttering home view | Emotional arc: settings are a deliberate, occasional action |
| HouseArea type becomes string | Union type cannot represent dynamic values; string with validation is the pragmatic path | Cross-cutting impact analysis |

---

## Artifacts Produced

All artifacts in `docs/feature/custom-house-areas/discuss/`:

| Artifact | File | Status |
|---|---|---|
| Journey Visual | `journey-customize-areas-visual.md` | Complete |
| Journey Schema | `journey-customize-areas.yaml` | Complete |
| Journey Gherkin | `journey-customize-areas.feature` | Complete |
| Shared Artifacts Registry | `shared-artifacts-registry.md` | Complete |
| Story Map | `story-map.md` | Complete |
| Prioritization | `prioritization.md` | Complete |
| User Stories | `user-stories.md` | Complete |
| Outcome KPIs | `outcome-kpis.md` | Complete |
| DoR Checklist | `dor-checklist.md` | Complete |
| Wave Decisions | `wave-decisions.md` | Complete |

---

## Handoff to DESIGN Wave

### For Solution Architect

1. **User stories**: `user-stories.md` -- 7 stories with full LeanUX template, all passing DoR
2. **Journey schema**: `journey-customize-areas.yaml` -- structured journey with shared artifacts and integration checkpoints
3. **Shared artifacts**: `shared-artifacts-registry.md` -- 3 artifacts, 6 integration checkpoints, 7 cross-cutting code impacts
4. **Prioritization**: `prioritization.md` -- Walking skeleton first (US-CHA-01, 02, 03), then Release 1 (04-07)
5. **Outcome KPIs**: `outcome-kpis.md` -- 5 KPIs with baselines and targets
6. **Story map**: `story-map.md` -- backbone, walking skeleton, releases

### Key Context for DESIGN Wave

1. **Cross-cutting change**: This touches domain types, domain logic (2 files), ports, UI (3 components), and tests
2. **Type system impact**: `HouseArea` changes from union to string -- ripples through the entire codebase
3. **Riskiest assumption**: Start with US-CHA-03 (dynamic consumption) to de-risk the cross-cutting changes before building the settings UI
4. **Data integrity is critical**: Rename propagation and delete reassignment must be atomic or rollback-safe
5. **Backward compatibility**: Existing users with 5 hardcoded areas must see their data preserved after the update
6. **Offline-first**: All area management works without network (same constraint as the rest of the app)

### For Acceptance Designer (DISTILL Wave)

1. **Journey Gherkin**: `journey-customize-areas.feature` -- 20 scenarios covering all CRUD and error paths
2. **Integration checkpoints**: documented in `shared-artifacts-registry.md` (6 checkpoints with validation criteria)
3. **Outcome KPIs**: `outcome-kpis.md` -- especially KPI-CHA-05 (zero data loss)

### For Platform Architect (DEVOPS)

1. **Outcome KPIs**: `outcome-kpis.md` -- measurement plan for adoption and data integrity tracking
2. **Key instrumentation**: area CRUD events, orphaned staple detection, rename/delete propagation success rate
