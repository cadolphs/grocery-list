# Outcome KPIs: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Feature: Store Section Custom Ordering

### Objective
Carlos shops his store in custom section order without backtracking, making every trip feel like the app knows his store.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Carlos (bi-weekly shopper) | Shops sections in order matching physical walk | Zero backtracks per trip | 1-2 backtracks per trip (estimated) | Count of times user re-opens a completed section | Leading |
| 2 | Carlos (bi-weekly shopper) | Sets up custom section order in one session | Under 2 minutes for initial setup | N/A (no capability) | Time from opening settings to first store view with custom order | Leading |
| 3 | Carlos (bi-weekly shopper) | Uses "Next" button to navigate between sections | 80%+ of section transitions via "Next" (vs manual selection) | Not tracked | Next-button taps / total section transitions per trip | Leading |

### Metric Hierarchy
- **North Star**: Zero backtracks per shopping trip (KPI #1)
- **Leading Indicators**: Custom order setup completion rate (KPI #2), "Next" button usage rate (KPI #3)
- **Guardrail Metrics**: Store view render time stays under 200ms; no regression in check-off reliability

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| Backtracks per trip | Section navigation events | Count of re-opens of completed sections | Per trip | Trip management feature |
| Setup time | Settings screen timestamps | Time delta: settings open to store view return | Per setup session | Section order feature |
| Next button usage | Navigation events | Next-button taps vs back-to-list taps | Per trip | Section navigation feature |
| View render time | Performance instrumentation | Time from view toggle to render complete | Per view switch | UI performance |

### Hypothesis
We believe that providing custom section ordering for Carlos will achieve zero backtracks per shopping trip.
We will know this is true when Carlos shops sections in his configured order and uses the "Next" button for 80%+ of section transitions.
