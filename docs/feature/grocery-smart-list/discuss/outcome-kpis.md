# Outcome KPIs: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Objective

Make grocery trip planning feel effortless instead of dreaded, reducing prep time by 75% and achieving zero data loss in-store.

---

## Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| K1 | Carlos (grocery planner) | Completes trip prep (sweep + whiteboard) | Under 5 min per trip (75% reduction) | 20 min per trip | Prep time recorded in trip summary | Leading |
| K2 | Carlos | Starts sweep with list 80%+ pre-populated | 80% of trip items are pre-loaded staples | 0% (manual rebuild from scratch) | Pre-loaded staple count / total trip items | Leading |
| K3 | Carlos | Completes full shopping trip with zero check-off failures | 0 state losses per trip | 1-3 state losses per trip (Notion on bad Wi-Fi) | Count of check-off state losses | Leading |
| K4 | Carlos | Adds items in under 10 seconds each (quick-add) | Average add time under 10 sec | 30+ sec per item in Notion | Time from quick-add start to item confirmed | Leading |
| K5 | Carlos | Switches views in under 1 second | View toggle under 200ms render | 30+ sec to switch Notion database views | Time from toggle tap to rendered view | Leading |
| K6 | Carlos | Loses zero items between trips (carryover) | 0 items lost per month | 1-2 forgotten items per month | Count of items that should have carried over but did not | Leading |
| K7 | Carlos | Reports reduced dread around trip planning | Qualitative: "no dread" | Qualitative: "dread" (stated during discovery) | Self-report after 4 trips | Lagging |
| K8 | Carlos | Retires the whiteboard for personal use | Whiteboard used only by wife | Whiteboard used by both for capture | Observe whiteboard usage after 2 weeks | Lagging |

---

## Metric Hierarchy

### North Star
**K1: Prep time under 5 minutes per trip** -- This is the single metric that captures whether the core value proposition is delivered. Every other KPI feeds into this.

### Leading Indicators
- K2 (staple pre-population rate) -- predicts K1 because pre-loaded lists need less manual work
- K4 (quick-add speed) -- predicts K1 because faster adds mean shorter prep
- K5 (view switch speed) -- predicts smooth transition from prep to shopping

### Guardrail Metrics
- K3 (zero check-off failures) -- must NOT degrade; offline reliability is non-negotiable
- K6 (zero items lost) -- must NOT degrade; carryover integrity is a trust signal

### Lagging / Qualitative
- K7 (dread reduction) -- ultimate emotional outcome, measured qualitatively
- K8 (whiteboard retirement) -- signals that the app has replaced manual capture (for Carlos)

---

## Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| K1 | Trip summary screen | Timestamp: sweep start to summary view | Every trip | App (automated) |
| K2 | Trip data | Pre-loaded count / total count at trip start | Every trip | App (automated) |
| K3 | Error log + user report | Count of check-off persistence failures | Every trip | App (automated) + user report |
| K4 | Quick-add interaction | Timestamp: input focus to item confirmed | Per item add | App (automated) |
| K5 | View toggle interaction | Timestamp: toggle tap to render complete | Per toggle | App (automated) |
| K6 | Trip completion data | Compare unbought items with next trip's pre-load | Every trip | App (automated) |
| K7 | User self-report | Ask "How did prep feel?" after 4 trips | Monthly | Manual |
| K8 | Observation | Check whiteboard usage | After 2 weeks, then monthly | Manual |

---

## Hypothesis

We believe that building a **dual-view grocery list with staple auto-population, quick-add, and offline-first architecture** for **Carlos Rivera (household grocery planner)** will achieve **prep time under 5 minutes per trip with zero in-store data loss**.

We will know this is true when **Carlos completes trip prep in under 5 minutes (K1)** with **80%+ items pre-loaded (K2)** and **zero check-off failures in-store (K3)** over **4 consecutive shopping trips**.

---

## Per-Story KPI Mapping

| Story | Primary KPI | How It Contributes |
|-------|-------------|-------------------|
| US-01: Add Staple Item | K2 | Building the staple library enables pre-population |
| US-02: Pre-Loaded Staples | K1, K2 | Pre-loaded list reduces prep time directly |
| US-03: Quick-Add | K1, K4 | Fast adding reduces per-item overhead |
| US-04: Toggle Views | K5 | Fast switch reduces transition friction |
| US-05: Check Off Items | K3 | Offline check-off prevents state loss |
| US-06: Trip Completion | K6 | Carryover prevents item loss between trips |
| US-07: Skip Staple | K2 | Flexible staple management improves pre-load quality |
| US-08: Navigate Areas | K1 | Room-by-room flow reduces sweep time |
| US-09: Auto-Suggest | K4 | Suggestions reduce add time for known items |
| US-10: Navigate Sections | K3 | Section flow supports reliable in-store experience |
| US-11: Trip Summary | K1, K7 | Summary confirms prep time and builds confidence |
