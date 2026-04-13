# Outcome KPIs: Checklist Search Bar

## Feature: checklist-search-bar

### Objective

Clemens can find and toggle any staple in the checklist within seconds, regardless of list size.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Clemens | Finds and toggles a specific staple | Time drops from ~12s to ~4s | ~12s scrolling through 60+ items | Observational timing during trip planning | Leading |
| 2 | Clemens | Recovers from a no-match search (typo) | Corrects within 3 seconds | No feedback on empty results (confusion) | Observational -- time from empty state to corrective action | Leading |

### Metric Hierarchy

- **North Star**: Time to find and toggle a known staple in checklist mode
- **Leading Indicators**: Number of characters typed before target item is visible; number of search-then-toggle sequences per trip planning session
- **Guardrail Metrics**: Toggle success rate must not degrade (toggling from filtered list must work identically to full list); long-press edit must not break

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| Time to find+toggle | Manual observation | Time 5 representative searches during next 3 trip planning sessions | Post-release, 3 sessions | Clemens |
| Typo recovery time | Manual observation | Note time from seeing "No matches" to corrective action | Post-release, 3 sessions | Clemens |

### Hypothesis

We believe that adding a search/filter bar to the staple checklist for Clemens will achieve faster staple finding and toggling. We will know this is true when Clemens finds and toggles a specific staple in under 5 seconds consistently across 3 trip planning sessions.
