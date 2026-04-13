# Wave Decisions: Checklist Search Bar

## DISCUSS Wave Summary

**Feature**: checklist-search-bar
**Date**: 2026-04-13
**Wave**: DISCUSS
**Status**: Ready for DESIGN handoff

## Decisions Made

### Scope

- **2 user stories**, both passing DoR
- **1 bounded context**: UI layer only (StapleChecklist component + HomeView)
- **No domain, adapter, or hook changes** required
- **Estimated effort**: 2 days total (1.5 days US-01, 0.5 days US-02)

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Filter scope | Name only (v1) | Simplest useful behavior; area is already visible as secondary text. Name search covers 95%+ of use cases. |
| Match type | Case-insensitive substring | Most intuitive for mobile text input. "ch" matches "Cheddar Cheese" and "Chocolate Chips". |
| Search bar placement | Top of checklist, below QuickAdd | Always visible, no scrolling needed to reach it. Natural position for a filter control. |
| Clear mechanism | X button in search input | Standard mobile pattern (iOS clearButtonMode + custom for Android/web). |
| State management | Local component state | No persistence needed. Search is ephemeral, resets on navigation. |
| Empty state | "No staples match '{query}'" message | Prevents confusion on typos. Separate story (US-02) for clean delivery. |

### Explicitly Deferred

| Item | Reason |
|------|--------|
| Filter by area | Low value for v1. Area is visible as secondary text; name search is sufficient. Revisit if user requests. |
| Search persistence | Search query is ephemeral. No need to persist across tab switches for this feature size. |
| Debounce/throttle | Unnecessary for <100 items. Add only if performance issue is observed. |
| Highlight matched text | Nice-to-have polish. Not needed for core functionality. |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Keyboard covers list items on small screens | Low | Medium | Standard React Native KeyboardAvoidingView pattern; DESIGN wave handles specifics |
| QuickAdd and SearchBar input confusion | Low | Low | Different visual treatment and placement. QuickAdd adds new items; Search filters existing. |

### Missing Prior Waves

- **No DISCOVER artifacts** -- acceptable for lightweight feature with clear job
- **No DIVERGE artifacts** -- job is straightforward, no alternative solutions considered necessary

## Handoff Package for DESIGN Wave

### Artifacts Produced

| Artifact | Path |
|----------|------|
| Journey Visual | `docs/feature/checklist-search-bar/discuss/journey-checklist-search-visual.md` |
| Journey YAML | `docs/feature/checklist-search-bar/discuss/journey-checklist-search.yaml` |
| Story Map | `docs/feature/checklist-search-bar/discuss/story-map.md` |
| User Stories | `docs/feature/checklist-search-bar/discuss/user-stories.md` |
| Outcome KPIs | `docs/feature/checklist-search-bar/discuss/outcome-kpis.md` |
| Shared Artifacts Registry | `docs/feature/checklist-search-bar/discuss/shared-artifacts-registry.md` |
| DoR Validation | `docs/feature/checklist-search-bar/discuss/dor-validation.md` |

### What DESIGN Wave Needs to Decide

1. **Component structure**: Should search state live in StapleChecklist (making it stateful) or be lifted to HomeView (keeping StapleChecklist pure)?
2. **Cross-platform clear button**: Implementation of clear button for Android/web (iOS has native clearButtonMode)
3. **Keyboard handling**: Whether KeyboardAvoidingView is needed given existing ScrollView
4. **Visual design**: Search bar styling to be consistent with existing QuickAdd input vs. differentiated

### What DISTILL Wave Receives

- Journey YAML with embedded Gherkin per step
- User stories with BDD scenarios ready for acceptance test implementation
- Outcome KPIs for post-release validation
