# Outcome KPIs: web-ux-polish

## Feature: web-ux-polish

### Objective

Make desktop-web planning sessions feel as fast and discoverable as using a native web
productivity app, so Priya-style planners choose desktop web for staple management without
friction.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Desktop-web users in a planning session | Add 10 staples faster (wall-clock) | at least 40% reduction in median time-to-add-10 | TBD — measure pre-release for 2 weeks | Instrumentation: timestamp first keystroke to 10th submit within a session | Leading (primary) |
| 2 | Desktop-web users adding a staple | Complete the add action using keyboard only (no mouse clicks) | at least 60% of desktop add actions are keyboard-only | ~0% (Enter not wired) | Event: track whether the submit came from Enter key vs. click | Leading (secondary) |
| 3 | Desktop-web users editing a staple | Successfully open the edit sheet | Desktop edit-open rate rises to match mobile (±20%) | Very low on desktop (long-press unreliable in browsers) | Event: edit-sheet-opened, split by platform | Leading (secondary) |
| 4 | Mobile (iOS/Android) users | Retain existing long-press edit behavior | 100% — no regression | Existing mobile flow | Regression: mobile edit-open rate is within ±5% of pre-release | Guardrail |
| 5 | All users | Keep accessibility working (focus visible, keyboard navigable) | No increase in a11y violations | Current state | Automated a11y scan + keyboard-only smoke test | Guardrail |

### Metric Hierarchy

- **North Star:** Median time to add 10 staples on desktop web (KPI #1)
- **Leading Indicators:** Keyboard-only add rate (KPI #2), desktop edit-open rate (KPI #3)
- **Guardrail Metrics:** Mobile edit-open rate unchanged (KPI #4), a11y violations
  non-increasing (KPI #5)

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|-------------|-------------------|-----------|-------|
| 1 Time-to-add-10 | Client analytics events | Session-scoped timers around `staple.add` events | Weekly after release | Platform-architect (DEVOPS wave) |
| 2 Keyboard-only add rate | Client analytics events | Event tag: `submit_source` = `enter_key` | `button_click` | `suggestion_click` | Weekly | Platform-architect |
| 3 Desktop edit-open rate | Client analytics events | Event: `edit_sheet_opened` with `platform` tag | Weekly | Platform-architect |
| 4 Mobile edit-open rate | Client analytics events | Same event, mobile filter | Weekly | Platform-architect |
| 5 a11y violations | axe-core in CI + manual | Automated on PR; manual smoke before release | Per PR + per release | Acceptance-designer |

### Hypothesis

We believe that **wiring Enter-to-submit across QuickAdd and MetadataBottomSheet,
autofocusing inputs on web, restoring focus after sheet close, and replacing long-press
with a visible pencil icon on web** for **desktop-web planners like Priya** will achieve
**a 40% reduction in time-to-add-10-staples and a 60%+ keyboard-only add rate**.

We will know this is true when **desktop-web users add 10 staples at least 40% faster and
complete at least 60% of add actions without touching the mouse**.

### Baseline Collection Note for DEVOPS

KPIs #1 and #2 require instrumentation that may not exist. Platform-architect should plan a
pre-release measurement window of at least 2 weeks to establish baseline before rollout.
If instrumentation cannot be added in time, fallback is a targeted user study with 5-8
desktop users performing a scripted "add 10 staples" task, measuring wall-clock.
