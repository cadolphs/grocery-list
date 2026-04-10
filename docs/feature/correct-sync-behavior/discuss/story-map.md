<!-- markdownlint-disable MD024 -->

# Story Map: correct-sync-behavior

## User: Clemens, solo household grocery shopper using Android phone and web browser simultaneously during trip planning

## Goal: Changes to staples, trip items, areas, and section order propagate between devices in real-time without app restart

## Backbone

| A: Real-Time Staple/Area/SectionOrder Sync | B: Trip Cloud Storage | C: Real-Time Trip Sync | D: Auto-Add Staple to Trip | E: Migration | F: Listener Lifecycle |
|---|---|---|---|---|---|
| Replace getDoc with onSnapshot in existing Firestore adapters | Create firestore-trip-storage adapter | Add onSnapshot to trip adapter | Domain reacts to staple add by creating trip item | Migrate AsyncStorage trip to Firestore | Tie listeners to auth session |
| Propagate cache updates to React state | Persist trip/carryover to Firestore | Push trip updates to UI on remote change | Remove trip item when staple removed | Handle conflict (local vs Firestore) | Teardown on logout/unmount |
| | Wire adapter in useAppInitialization | | Prevent duplicate items from local+remote | | Re-establish on re-login |

---

### Walking Skeleton

Thinnest end-to-end slice proving real-time cross-device sync:

1. **A: Real-Time Staple Sync** -- Replace `getDoc` with `onSnapshot` in `firestore-staple-storage.ts`. Cache updates trigger React re-render. Proves the real-time push pattern works.
2. **B: Trip Cloud Storage** -- Create `firestore-trip-storage.ts` implementing `TripStorage` port. Wire in `useAppInitialization`. Trip data now in Firestore.
3. **C: Real-Time Trip Sync** -- Add `onSnapshot` to the new trip adapter. Trip changes on one device push to the other.
4. **F: Listener Lifecycle (minimal)** -- Unsubscribe from listeners on component unmount.

This delivers: Clemens adds a staple on web -> phone sees it in staple list within seconds. Clemens checks off item on phone -> web sees it checked within seconds. Core sync is working.

---

### Release 1: Real-Time Sync Foundation (Must Have)

**Outcome**: Changes to staples and trip data appear on the other device within seconds without restart.

| Story | Activity |
|---|---|
| US-01: Real-time listeners on staples, areas, and section order | A |
| US-02: Firestore trip storage adapter | B |
| US-03: Real-time listeners on trip data | C |
| US-04: Listener cleanup on unmount and logout | F |

### Release 2: Auto-Add and Migration (Must Have)

**Outcome**: New staples appear in the active trip automatically. Existing local trip data is preserved on upgrade.

| Story | Activity |
|---|---|
| US-05: New staple auto-adds to active trip | D |
| US-06: Migrate local AsyncStorage trip to Firestore | E |

### Release 3: Robustness (Should Have)

**Outcome**: Edge cases handled gracefully -- no duplicate items, no stale listeners.

| Story | Activity |
|---|---|
| US-07: Prevent duplicate trip items from concurrent local and remote adds | D |
| US-08: Listener re-establishment after re-login | F |

---

## Scope Assessment: PASS -- 8 stories, 3 bounded contexts (Firestore adapters, domain/trip, hooks/initialization), estimated 7-10 days

The feature touches storage adapters, domain logic, and the initialization hook. 8 stories is within the right-sized threshold (under 10). The 3 bounded contexts are tightly related (all data layer). No split needed.

Release 1 (4 stories) is the core fix: ~4-5 days. Release 2 (2 stories) completes the user expectations: ~2-3 days. Release 3 (2 stories) is polish: ~1-2 days.

## Priority Rationale

| Priority | Release | Story | Value | Urgency | Effort | Score | Rationale |
|---|---|---|---|---|---|---|---|
| 1 | R1 | US-01: Real-time listeners (staples/areas/sectionOrder) | 5 | 5 | 3 | 8.3 | Core pattern -- enables real-time sync for all existing Firestore data |
| 2 | R1 | US-02: Firestore trip storage adapter | 5 | 5 | 3 | 8.3 | Foundation -- trip must be in Firestore before it can sync |
| 3 | R1 | US-03: Real-time listeners on trip data | 5 | 5 | 2 | 12.5 | Completes real-time sync -- trip changes push to other device |
| 4 | R1 | US-04: Listener cleanup | 3 | 4 | 1 | 12.0 | Prevents memory leaks and stale callbacks; essential hygiene |
| 5 | R2 | US-05: Auto-add staple to trip | 4 | 4 | 3 | 5.3 | Removes "Reset Sweep" workaround -- major UX improvement |
| 6 | R2 | US-06: Migration | 4 | 5 | 2 | 10.0 | Prevents data loss for existing users -- critical for upgrade |
| 7 | R3 | US-07: Prevent duplicate trip items | 3 | 3 | 2 | 4.5 | Edge case -- only matters with simultaneous adds |
| 8 | R3 | US-08: Listener re-establishment | 2 | 2 | 1 | 4.0 | Edge case -- only matters if user logs out and back in |

R1 stories are Must Have and ship together (4-5 days). R2 stories are Must Have and follow immediately (2-3 days). R3 stories are Should Have and can wait.
