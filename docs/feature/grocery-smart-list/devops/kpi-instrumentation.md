# KPI Instrumentation: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN (Platform)
**Date**: 2026-03-17

---

## Instrumentation Context

This is a personal, offline-first mobile app with no backend. There are no server-side metrics, no analytics service, and no telemetry pipeline. KPI measurement is built into the app's own data model and UI, not into external observability infrastructure.

Most KPIs are measured by the app itself (timestamps in domain data) or by manual user observation. This document describes what data to collect and where to surface it -- not how to ship it to a monitoring system.

---

## KPI Instrumentation Summary

| KPI | Measurement Type | Data Source | Infrastructure Needed |
|-----|-----------------|-------------|----------------------|
| K1: Prep time < 5 min | Automated (app) | Trip timestamps | None -- computed from domain data |
| K2: 80%+ pre-populated | Automated (app) | Trip item source counts | None -- computed from domain data |
| K3: Zero check-off failures | Automated (app) + manual | Error boundary + user report | None -- error counting in app |
| K4: Add time < 10 sec | Automated (app) | Quick-add interaction timestamps | None -- computed from UI events |
| K5: View toggle < 200ms | Automated (app) | Render timing | None -- computed from UI events |
| K6: Zero items lost | Automated (app) | Carryover verification | None -- computed from domain data |
| K7: Reduced dread | Manual | User self-report | None -- qualitative |
| K8: Whiteboard retired | Manual | Observation | None -- qualitative |

**Total external infrastructure needed: zero.**

---

## Per-KPI Instrumentation Design

### K1: Prep Time Under 5 Minutes

**Data collection**: The Trip domain model already includes `startedAt` (when sweep begins) and the timestamp when the user transitions to store view or views the trip summary. Prep time = summary view timestamp - startedAt.

**Where surfaced**: Trip Summary screen. Display "Prep time: X min Y sec" prominently.

**Alerting**: None. The user sees the number and self-evaluates.

**Implementation note**: `startedAt` is set when a new trip is created (US-02). The trip summary (US-11) computes and displays the delta. No additional instrumentation code needed beyond what the domain model already provides.

---

### K2: Pre-Population Rate (80%+)

**Data collection**: At trip start, count items with `source: "preloaded"` vs total items. Rate = preloaded / total.

**Where surfaced**: Trip Summary screen. Display "X of Y items were pre-loaded staples (Z%)".

**Implementation note**: The `source` field on TripItem already distinguishes preloaded staples from quick-add and whiteboard items. The Trip Summary (US-11) aggregates these counts.

---

### K3: Zero Check-Off Failures

**Data collection**: Track AsyncStorage write failures for check-off operations. Increment a trip-level error counter when a check-off persistence write fails.

**Where surfaced**: If any check-off failures occurred during a trip, display a warning on the Trip Summary screen: "N check-off(s) may not have saved." Also available as a count in trip completion data.

**Implementation note**: The optimistic UI pattern (update state first, then write to storage) means the user sees immediate feedback. Failures are silent during shopping but surfaced at trip summary. Since the app is offline-first with local storage, failures should be extremely rare (device storage full, app killed mid-write).

---

### K4: Quick-Add Time Under 10 Seconds

**Data collection**: Timestamp when quick-add input receives focus. Timestamp when item is confirmed (added to trip). Delta = add time.

**Where surfaced**: Trip Summary screen. Display "Average add time: X sec" for items added via quick-add.

**Implementation note**: This requires two timestamps per quick-add interaction. Store them transiently in component state (not persisted to AsyncStorage). Compute average at trip summary time. This is lightweight -- no persistent storage overhead.

---

### K5: View Toggle Under 200ms

**Data collection**: This is a performance metric best measured during development and testing, not instrumented in production. Use React DevTools Profiler or `performance.now()` during development to verify render time.

**Where surfaced**: Not surfaced in app UI. Verified during development via profiling.

**Implementation note**: If the view toggle feels instant, it meets the KPI. No runtime instrumentation needed. The architecture (in-memory grouping, no storage reads on toggle) ensures this by design.

---

### K6: Zero Items Lost Between Trips

**Data collection**: At trip completion, the carryover logic produces a deterministic list of items for the next trip. Log (to console in development) the count of carried-over items. On next trip start, verify the count matches.

**Where surfaced**: Trip Summary screen. Display "X items carried over to next trip" at completion. On next trip start, the pre-loaded list includes carried-over items -- user can visually verify.

**Implementation note**: The carryover logic is a pure function (Trip Service). Correctness is verified by unit tests. Runtime verification is visual -- the user sees their carried-over items on the next trip.

---

### K7: Reduced Dread (Qualitative)

**Data collection**: After 4 trips, the developer (Carlos) self-reports on the experience.

**Where surfaced**: Not in app. Personal reflection.

**Implementation note**: No instrumentation needed. This is a qualitative outcome measured by the user's subjective experience.

---

### K8: Whiteboard Retired (Qualitative)

**Data collection**: Observe whiteboard usage after 2 weeks of app use.

**Where surfaced**: Not in app. Physical observation.

**Implementation note**: No instrumentation needed. Success = whiteboard is only used by Elena, not by Carlos for his own items.

---

## Dashboard Design

Since there is no external dashboard system, the **Trip Summary screen (US-11)** serves as the KPI dashboard. It should display:

1. **Prep time** (K1) -- timestamp delta, formatted as minutes and seconds
2. **Pre-population rate** (K2) -- count and percentage of preloaded items
3. **Items added via quick-add** (K4) -- count and average add time
4. **Check-off reliability** (K3) -- "All check-offs saved" or warning if failures occurred
5. **Carryover count** (K6) -- items carrying to next trip

This is a single screen, viewed at the end of each trip. It provides all the quantitative KPI data needed to evaluate whether the feature is meeting its targets.

---

## What Is NOT Instrumented (and Why)

| Capability | Why Not |
|-----------|---------|
| Server-side analytics | No server exists |
| Crash reporting (Sentry, Bugsnag) | Personal app, developer is the only user. Console errors suffice. Revisit if distributing to others. |
| Usage analytics (Mixpanel, Amplitude) | Single user, no behavioral analysis needed |
| Performance monitoring (New Relic, Datadog) | No server, no API. Client performance is verified during development. |
| A/B testing | Single user, no variants to test |
