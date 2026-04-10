# Outcome KPIs: correct-sync-behavior

## Feature: Multi-Device Real-Time Sync

### Objective

Changes to staples, trip items, areas, and section order propagate between Clemens's Android phone and web browser in real-time, eliminating the need for app restarts or "Reset Sweep" workarounds.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | Multi-device planner (Clemens) | Sees staple/trip changes on other device without restart | 100% of changes visible within 5 seconds | 0% (requires app restart) | Cross-device manual test: add staple on A, time appearance on B | Leading |
| 2 | Mid-planning shopper (Clemens) | Sees new staples in active trip without Reset Sweep | 100% of new staples auto-added to trip | 0% (requires Reset Sweep) | Add staple during active trip, verify in trip list | Leading |
| 3 | Existing user upgrading | Retains trip progress after update | 0 trips lost during migration | N/A (new behavior) | Pre/post migration: item count, checkoffs, completed areas match | Leading |
| 4 | Shopper with poor connectivity | Continues shopping without interruption during sync failures | 0 blocked interactions from sync errors | 0 errors today (but trip does not sync at all) | Test: disable network, verify app continues working | Guardrail |

### Metric Hierarchy

- **North Star**: Real-time cross-device sync latency -- changes visible on device B within 5 seconds of action on device A
- **Leading Indicators**: onSnapshot callback fires within 5 seconds of remote write; trip document write success rate; migration completion rate
- **Guardrail Metrics**: App initialization time must NOT degrade (Firestore listeners add zero blocking time after initial load); zero user-visible errors from sync failures; zero orphaned listeners after logout

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| Sync latency | Manual cross-device test | Act on device A, time appearance on B | Per release | Developer |
| Auto-add success | Manual test | Add staple during trip, verify in list | Per release | Developer |
| Migration success | Console logging | Count migration attempts vs successes | One-time on release | Developer |
| Init time impact | Manual timing | Compare app start time before/after | Per release | Developer |
| Listener cleanup | DevTools memory profiler | Check for orphaned listeners after logout | Per release | Developer |

### Hypothesis

We believe that replacing one-time Firestore reads with real-time listeners and persisting trip data to Firestore will achieve seamless multi-device grocery planning. We will know this is true when Clemens can add a staple on his web browser and see it appear in his trip on his Android phone within 5 seconds, without restarting either app or using Reset Sweep.
