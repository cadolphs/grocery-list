# Outcome KPIs: Edit Staple Location

**Feature ID**: edit-staple
**Date**: 2026-03-22

---

## Objective

Carlos can keep his staple library accurate as items move around his house and the store reorganizes, without the friction of delete-and-recreate.

## Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Carlos (20+ staples) | Corrects a staple's location via edit instead of delete+recreate | 90% of corrections use edit (vs 100% delete+recreate today) | 0% edit (no capability) | Count of updateStaple calls vs remove+addStaple pairs | Leading |
| 2 | Carlos (mid-sweep) | Completes a staple edit in under 10 seconds | Median edit time < 10s | N/A (no edit exists) | Timestamp from sheet open to save | Leading |
| 3 | Carlos (after edit) | Sees correct staple location in store view on same trip | 100% of edits reflected immediately | 0% (edits only on next trip) | UI state verification after save | Leading |

## Metric Hierarchy

- **North Star**: Staple library accuracy -- percentage of staples whose location matches Carlos's physical reality
- **Leading Indicators**: Edit completion rate (edits saved / edits opened); edit speed (time to save)
- **Guardrail Metrics**: No accidental data loss (edits that result in unintended deletion = 0); no duplicate creation from edit flow

## Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| Edit vs delete+recreate ratio | Domain event log (updateStaple vs remove+add) | Count domain function calls | Per session | Product |
| Edit completion time | UI timestamps (sheet open -> save tap) | Instrumented timestamps | Per edit action | Product |
| Immediate trip reflection | UI state after save | Acceptance test verification | Per release | QA |
| Accidental data loss | Support/bug reports + acceptance tests | Manual review + automated tests | Per release | QA |

## Hypothesis

We believe that adding an edit capability to the staple management flow for Carlos (household grocery planner) will achieve faster location corrections and a more accurate staple library.

We will know this is true when Carlos corrects staple locations via edit (instead of delete+recreate) for 90% of corrections, with median edit time under 10 seconds.
