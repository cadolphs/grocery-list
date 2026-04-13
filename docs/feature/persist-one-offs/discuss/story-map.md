# Story Map: persist-one-offs

## User: Elena Ruiz, weekly shopper who buys specialty items every few weeks
## Goal: Re-add previously purchased one-off items without re-entering store location details

## Backbone

| Add One-Off (first time) | Search for Item | Re-Add from Suggestion | View in Trip |
|--------------------------|-----------------|------------------------|--------------|
| Save one-off to library when added via MetadataBottomSheet | Search returns both staples and one-offs | Tap one-off suggestion adds to trip with saved location | One-off appears in one-offs section, not sweep |
| Handle "skip with defaults" -- still persist | Differentiate one-off from staple in suggestion list | | One-off does NOT appear in staple checklist |
| | Handle name collision (same name, different type) | | |

---

### Walking Skeleton

The thinnest end-to-end slice that proves the concept works:

1. **Add One-Off (first time)**: When user adds a one-off via MetadataBottomSheet, also save it to the staple library with `type: 'one-off'`
2. **Search for Item**: `StapleLibrary.search()` already returns all items -- no change needed, one-offs are returned automatically
3. **Re-Add from Suggestion**: When user taps a one-off suggestion, add to trip with `itemType: 'one-off'` and pre-filled store location
4. **View in Trip**: One-off appears in one-offs section (existing behavior, no change needed)

This skeleton touches: domain types, MetadataBottomSheet submit handler, HomeView suggestion handler. Three files, minimal changes, full end-to-end flow.

### Release 1: Core Persist and Re-Add (Walking Skeleton)

**Target outcome**: Users can re-add previously purchased one-offs without re-entering store location.

Stories:
- US-01: Persist one-off to library on first add
- US-02: Re-add persisted one-off from QuickAdd suggestions

### Release 2: Polish and Differentiation

**Target outcome**: Users can confidently distinguish one-offs from staples and the feature does not leak into the sweep workflow.

Stories:
- US-03: Differentiate one-off suggestions from staple suggestions
- US-04: Exclude persisted one-offs from staple checklist and trip preloading

## Scope Assessment: PASS -- 4 stories, 1 bounded context (staple library + UI), estimated 3-4 days

## Priority Rationale

| Priority | Story | Target Outcome | Rationale |
|----------|-------|---------------|-----------|
| 1 | US-01 | One-off data persisted for future use | Foundation -- without persistence, nothing else works |
| 2 | US-02 | One-off re-added in one tap | The core user payoff -- this is why we are building the feature |
| 3 | US-04 | One-offs excluded from sweep/checklist | Safety -- prevents confusion in existing workflows |
| 4 | US-03 | Visual differentiation in suggestions | Polish -- users can tell staples from one-offs at a glance |

US-01 and US-02 are tightly coupled and could be delivered together as the walking skeleton. US-04 is safety-critical (must not break existing sweep workflow) and should ship with or immediately after. US-03 is polish that improves clarity but the feature works without it.
