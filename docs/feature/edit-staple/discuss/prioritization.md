# Prioritization: Edit Staple Location

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Walking Skeleton (R1: Core Edit) | Carlos can correct staple locations | Edit completion rate >90% | Validates that the edit flow works end-to-end; highest user pain |
| 2 | R2: Full Edit Experience | Carlos trusts the edit flow completely | Zero accidental data loss from edit operations | Handles edge cases: remove, trip sync, guard against one-off edits |

## Backlog Suggestions

| Story | Release | Priority | Outcome Link | Dependencies |
|-------|---------|----------|-------------|--------------|
| US-ES-01: Edit Staple House Area | R1 | P1 | Edit completion rate | None (new domain function + UI) |
| US-ES-02: Edit Staple Store Location | R1 | P1 | Edit completion rate | US-ES-01 (shares edit sheet) |
| US-ES-03: Remove Staple from Edit Sheet | R2 | P2 | Zero data loss | US-ES-01 (edit sheet must exist) |
| US-ES-04: Sync Current Trip on Staple Edit | R2 | P2 | Trip accuracy | US-ES-01, US-ES-02 |

> **Note**: Story IDs (US-ES-01 etc.) are assigned below in Phase 4. Each story is 1-2 days effort with 3-5 UAT scenarios.

## Prioritization Scores

| Story | Value (1-5) | Urgency (1-5) | Effort (1-5) | Score | Notes |
|-------|-------------|----------------|--------------|-------|-------|
| US-ES-01 | 5 | 4 | 2 | 10.0 | Core pain point, straightforward domain change |
| US-ES-02 | 4 | 4 | 1 | 16.0 | Natural extension of ES-01, very low marginal effort |
| US-ES-03 | 3 | 2 | 2 | 3.0 | Nice to have from edit context; domain `remove` already exists |
| US-ES-04 | 4 | 3 | 3 | 4.0 | Important for consistency; touches trip domain |

> Tie-breaking: Walking Skeleton > Riskiest Assumption > Highest Value
