# Outcome KPIs: persist-one-offs

## Feature: Persist One-Off Items

### Objective

Shoppers who buy recurring specialty items can re-add them in one tap instead of re-entering all metadata, making the app feel like it learns from their shopping habits.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Weekly shoppers who buy recurring one-offs | Re-add a known one-off via suggestion instead of re-entering metadata | 80%+ of recurring one-offs added via suggestion after first use | 0% (feature does not exist) | Ratio of one-offs added via suggestion tap vs MetadataBottomSheet | Leading |
| 2 | All shoppers | Time to add a recurring one-off item | Drops from ~15s to ~3s (one tap vs fill form) | ~15 seconds (type name + open sheet + fill section + fill aisle + tap add) | Stopwatch measurement on representative task | Leading |
| 3 | Sweep workflow users | Complete sweep without encountering one-off items in checklist | 0 one-offs in checklist (guardrail) | 0 (not applicable today) | Automated test: checklist item count = staple count | Guardrail |

### Metric Hierarchy

- **North Star**: Percentage of recurring one-offs re-added via suggestion (KPI #1)
- **Leading Indicators**: Number of one-off library entries created (adoption signal); search queries that return one-off results (discovery signal)
- **Guardrail Metrics**: Sweep checklist shows zero one-off items; trip preloading does not include one-offs; existing staple workflows unaffected

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| One-off re-add via suggestion rate | App analytics (item source tracking) | Track `source` field on trip items -- suggestion tap vs MetadataBottomSheet for one-offs | Per trip | Product |
| Time to re-add | Manual timing / user testing | Measure representative task in usability session | Post-release | Product |
| Checklist purity | Automated test | Unit test asserting `StapleChecklist` receives only `type: 'staple'` items | Every build | Engineering |

### Hypothesis

We believe that persisting one-off items to the staple library for weekly shoppers who buy recurring specialty items will achieve a significant reduction in time-to-add for returning items. We will know this is true when 80% or more of recurring one-off items are re-added via QuickAdd suggestion instead of through the MetadataBottomSheet.
