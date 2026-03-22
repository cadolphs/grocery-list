# Prioritization: Store Section Ordering

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Walking Skeleton | Custom section order works end-to-end | Carlos shops in his preferred order without backtracking | Validates core assumption: custom ordering improves shopping efficiency |
| 2 | Release 1: Complete Management | Full section order lifecycle (new sections, reset) | Carlos manages section order without friction across trips | Completes the feature for real-world use |

## Backlog Suggestions

| Story | Release | Priority | Outcome Link | Dependencies |
|-------|---------|----------|-------------|--------------|
| Reorder store sections | WS | P1 | Custom order matches walk | None (new feature) |
| Store view uses custom order | WS | P1 | Sections display in custom order | Reorder store sections |
| Next button follows custom order | WS | P1 | Navigation matches walk | Store view uses custom order |
| Auto-append new sections | R1 | P2 | No friction when adding new items | Reorder store sections |
| Reset to default order | R1 | P2 | Safety net for undo | Reorder store sections |

> **Note**: Story IDs (US-XX) will be assigned below in the user stories. This table uses descriptive names as Phase 2.5 task-level placeholders.

## Riskiest Assumption

**Assumption**: Carlos's store walking path is stable enough that a one-time setup of section order provides lasting value across trips.

**Validation**: Walking skeleton -- if Carlos uses the reorder once and it sticks for multiple trips, the assumption holds. If he is constantly re-ordering, we may need per-trip order or multiple store profiles (future feature).

## Value x Urgency / Effort

| Release | Value (1-5) | Urgency (1-5) | Effort (1-5) | Score |
|---------|-------------|----------------|--------------|-------|
| Walking Skeleton | 4 (directly addresses JS4 pain) | 3 (existing users notice wrong order) | 2 (well-understood patterns) | 6.0 |
| Release 1 | 3 (completeness, not core) | 2 (can work without reset initially) | 2 (incremental on WS) | 3.0 |
