# Outcome KPIs: reorder-home-areas

**Feature ID**: reorder-home-areas
**Date**: 2026-04-17
**Job traceability**: JS1 (Home Sweep Capture)

---

## Feature: reorder-home-areas

### Objective

Carlos keeps the app's Home-sweep area order in sync with his real-life walking path, without losing staple assignments or spending more than 30 seconds to update.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| KPI-1 | User with 3+ configured areas | Completes a reorder session (enter settings → reorder → return to HomeView) | In under 30 seconds end-to-end | N/A (no reorder UI exists) | Timestamp delta between `AreaSettingsScreen` mount and last `reorderAreas` call followed by unmount | Leading (primary) |
| KPI-2 | Any user who has entered Manage Areas at least once | Performs at least one reorder within 2 weeks of first access | At least 40% of users (validates demand) | N/A (new capability) | Count distinct users with `reorderAreas` calls / distinct users who opened settings, over 14-day rolling window | Leading (adoption) |
| KPI-3 | Multi-device user (phone + tablet) | Sees reorder propagate from device A to device B | Within 5 seconds, 95% of events | Same 5s target already met for add/rename/delete in `custom-house-areas` | Log `AreaStorage.saveAll` timestamp on A and `onSnapshot` callback timestamp on B; compute 95th percentile | Leading (reliability) |
| KPI-4 (guardrail) | All users | Experiences zero staple-assignment drift after reorder | 0 occurrences of staple-to-area mismatch post-reorder | 0 (never happens today) | Integration test + runtime invariant check (staple.houseArea in getAreas() after reorder) | Guardrail |
| KPI-5 (guardrail) | All users | Does not experience reorder failures surfacing to them | ≤ 0.5% of reorder taps produce visible error | N/A (new capability) | Count `reorderAreas` returning `success: false` / total calls | Guardrail |

---

## Metric Hierarchy

- **North Star**: Time-to-reorder under 30 seconds (KPI-1). Carlos's primary pain is friction — if reorder is fast, adoption follows.
- **Leading Indicators**: KPI-2 (adoption rate) predicts whether the feature closes real pain. KPI-3 (sync latency) predicts whether multi-device users trust it.
- **Guardrail Metrics**: KPI-4 (staple safety) and KPI-5 (reorder reliability) must NOT degrade. Either breaching is a release-blocker.

---

## Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|-------------|-------------------|-----------|-------|
| KPI-1 | Client instrumentation | Emit events on settings-screen mount/unmount and on `reorderAreas` success | Per-session; aggregated weekly | platform-architect (DEVOPS) |
| KPI-2 | Client instrumentation | Emit distinct-user events on settings access and reorder; join on userId | Weekly aggregation; 14-day rolling window | platform-architect |
| KPI-3 | Firestore + client instrumentation | Write timestamp in `areas/{userId}` document; client logs onSnapshot callback delta | Continuous; 95th percentile weekly | platform-architect |
| KPI-4 | Runtime invariant | After each `reorderAreas` success, assert all staples map to an existing area (already true by construction; verify no regression) | On every call in dev/test; sampled in prod | solution-architect |
| KPI-5 | Client instrumentation | Count `reorderAreas` results by success/failure | Continuous; alert threshold > 0.5% | platform-architect |

---

## Hypothesis

**We believe that** adding up/down reorder buttons to `AreaSettingsScreen` for **Carlos Rivera and similar users with evolving sweep routines** will achieve **sub-30-second reorder and at least 40% adoption within 2 weeks of availability**.

**We will know this is true when** users with 3+ configured areas complete reorder sessions in under 30 seconds and at least 40% of users who access Manage Areas perform at least one reorder within 14 days.

---

## Leading-to-Lagging Chain

```
Business KPI (Lagging):
  App continues to be used as the primary grocery tool (retention proxy)
      |
      v
  Customer Behavior (Leading):
      +-- Carlos completes reorder and returns to HomeView matching his walk (KPI-1)
      +-- Multi-device users see synced order without manual action (KPI-3)
      |
      v
  Secondary Behavior (Leading):
      +-- Users access Manage Areas (prerequisite for KPI-2)
      +-- Users perform at least one reorder (KPI-2 numerator)
```

Each KPI can be moved by the team (through UI polish, error-handling, and sync reliability). None is a lagging vanity metric (raw user count, total sessions) — all are rates, deltas, or latencies.

---

## Instrumentation Handoff (to DEVOPS / platform-architect)

Events to instrument for this feature (new or confirm existing):

1. `area_settings_opened` — when AreaSettingsScreen mounts (userId, timestamp)
2. `area_reordered` — when `reorderAreas` returns success (userId, timestamp, new_order_hash, old_order_hash)
3. `area_reorder_failed` — when `reorderAreas` returns failure (userId, timestamp, error_reason)
4. `area_settings_closed` — when AreaSettingsScreen unmounts (userId, timestamp, reorder_count_this_session)
5. `area_order_synced` — on onSnapshot callback receiving a change (userId, device_id, delta_from_write_ms)

None of these are blocking for the DESIGN/DELIVER path — they are additive instrumentation planned for DEVOPS.

---

## Smell Tests

| Check | Result |
|-------|--------|
| Measurable today? | KPI-1, 3, 5 measurable with standard telemetry. KPI-2 requires 2 weeks of data post-release (acceptable). KPI-4 requires invariant assertion (trivial). |
| Rate not total? | YES — all KPIs are deltas, percentages, or percentiles. |
| Outcome not output? | YES — each describes user behavior or experience, not feature shipment. |
| Has baseline? | KPI-1, 2 have "N/A (new capability)" — first-release metrics establish baseline. KPI-3 has 5s baseline from custom-house-areas. KPI-4, 5 have 0 baseline (new capability). |
| Team can influence? | YES — UI polish affects KPI-1, 2; error-handling affects KPI-5; sync code affects KPI-3. |
| Has guardrails? | YES — KPI-4 and KPI-5 are guardrails. |
