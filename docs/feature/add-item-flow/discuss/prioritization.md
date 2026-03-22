# Prioritization: Add Item Metadata Flow

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Walking Skeleton | New items get full metadata end-to-end | MK1 (metadata completion rate) | Validates that bottom sheet flow works at all |
| 2 | Smart Defaults | Metadata entry under 5 seconds during sweep | K4 (add time under 10s), MK2 (add time) | Derisks speed assumption -- if defaults don't help, the whole feature is too slow |
| 3 | Section Intelligence | Carlos rarely types full section names | MK1 (metadata completion rate) | Reduces cognitive effort, improves section consistency |
| 4 | Safety Nets | Zero misclassified items per trip | MK3 (misclassification rate) | Prevents errors, but lower priority because errors are recoverable |

## Backlog Suggestions

| Story | Release | Priority | Outcome Link | Dependencies |
|-------|---------|----------|-------------|--------------|
| US-AIF-01: Add new item via bottom sheet | WS | P1 | MK1 | None |
| US-AIF-02: Context-aware smart defaults | R1 | P2 | K4, MK2 | US-AIF-01 |
| US-AIF-03: Skip metadata shortcut | R1 | P2 | K4, MK2 | US-AIF-01 |
| US-AIF-04: Section auto-suggest | R2 | P3 | MK1 | US-AIF-01 |
| US-AIF-05: Duplicate staple detection | R3 | P4 | MK3 | US-AIF-01 |
| US-AIF-06: Add existing staple to trip from duplicate warning | R3 | P4 | MK3 | US-AIF-05 |

> **Note**: Story IDs prefixed with AIF (Add Item Flow) to distinguish from grocery-smart-list US-01 through US-11. KPI references: K4 is from the original grocery-smart-list outcome-kpis.md. MK1-MK3 are new KPIs defined in this feature's outcome-kpis.md.

## Prioritization Scores

| Story | Value (1-5) | Urgency (1-5) | Effort (1-5) | Score (V*U/E) | Notes |
|-------|-------------|---------------|-------------|----------------|-------|
| US-AIF-01 | 5 | 5 | 3 | 8.3 | Core flow, everything depends on it |
| US-AIF-02 | 4 | 4 | 2 | 8.0 | High value, low effort -- pre-fill from existing state |
| US-AIF-03 | 3 | 4 | 1 | 12.0 | Quick win -- single button, preserves speed for rushed users |
| US-AIF-04 | 3 | 3 | 2 | 4.5 | Nice reduction in typing, moderate effort |
| US-AIF-05 | 2 | 2 | 2 | 2.0 | Safety net, but duplicates are rare |
| US-AIF-06 | 2 | 2 | 1 | 4.0 | Tiny effort, depends on US-AIF-05 |

> **Tie-breaking**: Walking Skeleton (US-AIF-01) always first regardless of score. US-AIF-03 scores highest on V*U/E but depends on US-AIF-01. Within R1, ship US-AIF-02 and US-AIF-03 together since both are small and complement each other.
