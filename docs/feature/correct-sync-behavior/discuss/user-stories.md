<!-- markdownlint-disable MD024 -->

# User Stories: correct-sync-behavior

## System Constraints

- All Firestore adapters follow the cached-read/background-write pattern established in `firestore-staple-storage.ts`
- All data is scoped to authenticated user (`users/{uid}/data/{document}`)
- `persistInBackground` calls `setDoc` (fire-and-forget) -- errors are not surfaced to the user
- The `TripStorage` port interface must not change (no breaking changes to domain code)
- Last-write-wins conflict resolution is accepted for this release (single-user app)
- Firestore document size limit: 1 MB (not a concern for grocery trip data)
- Functional paradigm: factory functions, no classes
- Platform: React Native / Expo SDK 54 targeting Android and web

---

## US-01: Real-Time Listeners on Staples, Areas, and Section Order

### Problem

Clemens is a household grocery shopper who plans trips using both his Android phone and laptop browser simultaneously. He finds it broken that when he adds a staple on the web, his phone does not show it until he restarts the app. He has to close and reopen the app to see changes made on the other device.

### Who

- Clemens | Multi-device planner (Android + web) | Wants changes to appear on the other device without restart

### Solution

Replace `getDoc` (one-time read at init) with `onSnapshot` (real-time listener) in the three existing Firestore storage adapters (staples, areas, section order). When the remote document changes, the in-memory cache is updated and the UI re-renders.

### Domain Examples

#### 1: Staple added on web appears on phone live

Clemens adds "Olive Oil" (area: "Kitchen Cabinets", section: "Oils", aisle: 7) to his staple library on the web app at 10:00 AM. His phone, which has been open since 9:45 AM, shows "Olive Oil" in the staple list within 3 seconds without any user action.

#### 2: Area renamed on phone reflects on web

Clemens renames "Pantry" to "Garage Pantry" on his phone. The web app, open in his browser, updates the area name within 3 seconds. All staples previously labeled "Pantry" now show "Garage Pantry".

#### 3: Section order change syncs live

Clemens reorders store sections on the web (moves "Produce" above "Dairy"). His phone's shopping list immediately reflects the new sort order.

### UAT Scenarios (BDD)

#### Scenario: Staple added on one device appears on the other without restart

Given Clemens has the app open on both his laptop browser and Android phone
And both devices are logged into his account
When Clemens adds "Olive Oil" (area: "Kitchen Cabinets") to the staple library on the web
Then within 5 seconds "Olive Oil" appears in the staple library on the phone
And no app restart or manual refresh is required

#### Scenario: Area rename propagates to other device in real-time

Given Clemens has the app open on both devices
When Clemens renames the area "Pantry" to "Garage Pantry" on the phone
Then within 5 seconds the web app shows "Garage Pantry" instead of "Pantry"
And all staples previously assigned to "Pantry" show under "Garage Pantry"

#### Scenario: Staple removed on one device disappears on the other

Given Clemens has "Soda" in his staple library
And both devices are open
When Clemens removes "Soda" from the library on the web
Then within 5 seconds "Soda" is no longer visible on the phone

#### Scenario: Initial load still works when listener is first established

Given Clemens opens the app for the first time in this session
When the app initializes and establishes onSnapshot listeners
Then all staples, areas, and section order load from Firestore
And the app becomes ready within the same time as before (no regression)

### Acceptance Criteria

- [ ] All three Firestore adapters (staples, areas, section order) use onSnapshot instead of getDoc
- [ ] Cache updates from onSnapshot trigger UI re-renders
- [ ] Initial load via onSnapshot delivers data at least as fast as the previous getDoc approach
- [ ] Listener fires when remote document changes, updating local cache
- [ ] Staple removal on one device reflected on the other

### Outcome KPIs

- **Who**: Multi-device grocery planners
- **Does what**: See staple/area/section changes appear on the other device without restart
- **By how much**: 100% of changes visible within 5 seconds (vs. 0% today without restart)
- **Measured by**: Manual cross-device test (add staple on A, observe on B)
- **Baseline**: 0% real-time propagation (all reads are one-time getDoc at init)

### Technical Notes

- `onSnapshot` returns an unsubscribe function that must be stored and called on cleanup (see US-04)
- The first onSnapshot callback delivers the current document state (equivalent to getDoc)
- Firestore SDK handles reconnection automatically after network interruption
- React state update mechanism needed to trigger re-renders when cache changes (callback prop or event emitter)
- Dependency: none (modifies existing adapters)

---

## US-02: Firestore Trip Storage Adapter

### Problem

Clemens is a multi-device grocery shopper who finds it broken that his trip data (items, checkoffs, skip states, area completions) only exists on the device where he created it. When he switches from phone to web, his active trip is missing entirely. The trip is stored in AsyncStorage (device-local), unlike staples/areas which already sync via Firestore.

### Who

- Clemens | Multi-device planner | Wants his trip to exist in the cloud so both devices see it

### Solution

A Firestore-backed implementation of the `TripStorage` port that persists trip and carryover to Firestore under the user's document path, following the same cached-read/background-write pattern as `firestore-staple-storage.ts`.

### Domain Examples

#### 1: Trip persists to Firestore on checkoff

Clemens has an active trip with 12 items. He checks off "Milk" on his Android phone at 9:15 AM. The trip document at `users/clemens-uid/data/trip` is updated in Firestore with "Milk" marked as `checked: true, checkedAt: "2026-04-10T09:15:00Z"`.

#### 2: Carryover persists to Firestore on trip completion

Clemens completes his trip but did not buy "Olive Oil" or "Sponges". These 2 items are saved as carryover to `users/clemens-uid/data/carryover` in Firestore. When he starts a new trip on the web app, both items appear as carryover.

#### 3: Trip write fails but app continues

Clemens is in a grocery store with spotty Wi-Fi. He checks off "Eggs" but the Firestore write fails silently. The local cache still shows "Eggs" as checked. He continues shopping without interruption.

### UAT Scenarios (BDD)

#### Scenario: Trip state persists to cloud on item checkoff

Given Clemens has an active trip with "Milk", "Eggs", and "Bread"
When Clemens checks off "Milk"
Then the trip document in Firestore contains "Milk" as checked
And the checkoff timestamp is recorded

#### Scenario: Carryover persists to cloud on trip completion

Given Clemens has an active trip with 10 items and 3 are unchecked ("Olive Oil", "Sponges", "Garlic")
When Clemens completes the trip
Then the 3 unchecked items are saved as carryover in Firestore
And the trip status is updated to "completed" in Firestore

#### Scenario: Trip loads from cloud on initialization

Given Clemens has a trip with 8 items saved in Firestore and 3 are checked
When the app initializes and reads from Firestore
Then all 8 items are loaded into the in-memory cache
And the 3 checked items retain their checked state and timestamps

#### Scenario: App continues when Firestore write fails

Given Clemens is using the app with poor network connectivity
When Clemens checks off "Eggs" and the Firestore write fails
Then "Eggs" appears checked in the local view immediately
And the app does not show an error or freeze

#### Scenario: Area completion state included in trip document

Given Clemens has completed the "Bathroom" and "Kitchen Cabinets" area sweeps
When the trip is persisted to Firestore
Then the Firestore trip document includes both areas in completedAreas

### Acceptance Criteria

- [ ] Trip document persists to Firestore on every state change (checkoff, skip, unskip, area complete, area uncomplete)
- [ ] Carryover document persists to Firestore on trip completion
- [ ] Trip loads from Firestore during initialization (same pattern as staple storage)
- [ ] Failed Firestore writes do not block user interaction
- [ ] CompletedAreas included in persisted trip document
- [ ] Implements TripStorage port interface without changes to the port

### Outcome KPIs

- **Who**: Multi-device grocery shoppers (authenticated users)
- **Does what**: See consistent trip state across devices after app restart
- **By how much**: 100% of trip state changes visible on other device after restart (vs. 0% today)
- **Measured by**: Cross-device verification (modify trip on A, restart B, verify)
- **Baseline**: 0% (trips are device-local in AsyncStorage)

### Technical Notes

- Follow the pattern in `firestore-staple-storage.ts`: `initialize()` hydrates with initial read, mutations update cache and call `persistInBackground`
- Firestore paths: `users/{uid}/data/trip`, `users/{uid}/data/carryover`
- The checkoff state is embedded in TripItem (`checked`/`checkedAt` fields) within the Trip document -- no separate checkoffs document needed
- The `loadCheckoffs`/`saveCheckoffs` methods on TripStorage port can be no-ops or removed (checked state is in Trip.items)
- Dependency: none (new adapter file)

---

## US-03: Real-Time Listeners on Trip Data

### Problem

Clemens is a multi-device grocery shopper who, even with trip data in Firestore (US-02), still has to restart the app to see changes made on the other device. During planning, he is at his desk switching between phone and laptop frequently. He needs trip changes (checkoffs, skips, new items) to appear live.

### Who

- Clemens | Dual-device planner actively switching between phone and web | Wants trip changes to appear live

### Solution

Add `onSnapshot` listener to the Firestore trip storage adapter (from US-02). When the trip document changes in Firestore (from another device's write), the local cache is updated and the UI re-renders to show the new state.

### Domain Examples

#### 1: Checkoff on phone appears on web within seconds

Clemens checks off "Milk" on his phone at 10:02 AM. His web browser, open on the laptop, shows "Milk" as checked within 3 seconds. He did not touch the web app.

#### 2: Skip on web appears on phone within seconds

Clemens decides he does not need "Butter" and skips it on the web. His phone shows "Butter" as skipped within 3 seconds.

#### 3: New item added on one device appears on the other

Clemens quick-adds "Birthday Candles" on the web. His phone shows "Birthday Candles" in the trip within 3 seconds.

### UAT Scenarios (BDD)

#### Scenario: Trip checkoff on phone visible on web in real-time

Given Clemens has an active trip open on both his Android phone and web browser
When Clemens checks off "Milk" on the phone
Then within 5 seconds "Milk" shows as checked on the web app
And the checkoff timestamp matches

#### Scenario: Skipped item syncs in real-time

Given Clemens has an active trip open on both devices
When Clemens skips "Butter" on the web
Then within 5 seconds "Butter" shows as skipped (needed=false) on the phone

#### Scenario: Quick-add item appears on other device

Given Clemens has an active trip open on both devices
When Clemens quick-adds "Birthday Candles" (area: "Kitchen Cabinets") on the web
Then within 5 seconds "Birthday Candles" appears in the trip on the phone

### Acceptance Criteria

- [ ] Firestore trip adapter uses onSnapshot for real-time trip document changes
- [ ] Remote checkoff changes update local cache and trigger UI re-render
- [ ] Remote skip/unskip changes update local cache and trigger UI re-render
- [ ] Remote item additions appear in local trip list
- [ ] No flicker or duplicate items during sync

### Outcome KPIs

- **Who**: Multi-device grocery planners during planning phase
- **Does what**: See trip changes (checkoffs, skips, adds) appear on other device without restart
- **By how much**: 100% of trip changes visible within 5 seconds (vs. requires restart today)
- **Measured by**: Cross-device test (act on A, observe on B, time the delay)
- **Baseline**: Trip does not sync at all today (AsyncStorage only)

### Technical Notes

- Extends the Firestore trip adapter from US-02 with onSnapshot (same pattern as US-01 for staples)
- Must handle the case where local write triggers onSnapshot callback for own write (no-op or idempotent update)
- Carryover document also needs onSnapshot if it can change from another device
- Dependency: US-02 (Firestore trip adapter must exist)

---

## US-04: Listener Cleanup on Unmount and Logout

### Problem

Clemens is an authenticated user whose app creates real-time Firestore listeners. If listeners are not cleaned up when he logs out or the app unmounts, memory leaks occur and stale callbacks may fire, potentially corrupting state or causing errors.

### Who

- Clemens | Authenticated user who logs in and out | Expects the app to not leak resources

### Solution

Store unsubscribe functions returned by `onSnapshot` and call them during React component unmount (useEffect cleanup) and on logout.

### Domain Examples

#### 1: Listeners torn down on logout

Clemens logs out from the web app. All 4 onSnapshot listeners (staples, areas, section order, trip) are unsubscribed. No further Firestore callbacks fire.

#### 2: Listeners torn down on unmount

Clemens closes the browser tab. The React component unmounts. All listeners are unsubscribed via useEffect cleanup return.

#### 3: No duplicate listeners after navigation

Clemens navigates away from the main screen and back. The component unmounts and remounts. Old listeners are cleaned up before new ones are created. There are never duplicate listeners.

### UAT Scenarios (BDD)

#### Scenario: Listeners unsubscribed on logout

Given Clemens is logged in and real-time listeners are active on staples, areas, section order, and trip
When Clemens logs out
Then all 4 Firestore listeners are unsubscribed
And no further data updates are received from Firestore

#### Scenario: Listeners unsubscribed on component unmount

Given the main app component is mounted with active listeners
When the component unmounts (browser tab closed, navigation away)
Then all Firestore listeners are unsubscribed
And no memory leak occurs

#### Scenario: Fresh listeners on re-mount

Given Clemens navigated away and back to the main screen
When the main component re-mounts
Then new listeners are created
And old listeners from the previous mount are not running

### Acceptance Criteria

- [ ] All onSnapshot unsubscribe functions are stored and callable
- [ ] useEffect cleanup in useAppInitialization calls all unsubscribe functions
- [ ] Logout triggers listener cleanup before clearing auth state
- [ ] No duplicate listeners after component re-mount

### Outcome KPIs

- **Who**: All authenticated users
- **Does what**: App does not leak memory from orphaned Firestore listeners
- **By how much**: 0 orphaned listeners after logout or unmount (vs. unknown today)
- **Measured by**: DevTools memory profiling and listener count inspection
- **Baseline**: N/A (no listeners exist today)

### Technical Notes

- `onSnapshot` returns `() => void` (unsubscribe function)
- Store unsubscribe functions in ref or closure accessible to cleanup
- useEffect in useAppInitialization already has a cleanup return -- extend it
- Consider a listener registry pattern: `{ unsubscribe: () => void }[]` returned from adapter factories
- Dependency: US-01, US-03 (listeners must exist to be cleaned up)

---

## US-05: New Staple Auto-Adds to Active Trip

### Problem

Clemens is planning a grocery trip and realizes he needs to add "Paper Towels" as a new staple. He adds it to the staple library, but it does not appear in his active trip. He has to hit "Reset Sweep" to rebuild the trip from staples, which clears all his sweep progress and checkoffs. This is unacceptable -- he loses 10 minutes of sweep work.

### Who

- Clemens | Mid-planning grocery shopper | Wants new staples to appear in his trip without losing progress

### Solution

When a staple is added to the library while a trip is active, the domain layer automatically creates a corresponding TripItem and persists the updated trip. This happens on the originating device immediately. On the receiving device, the trip update arrives via the onSnapshot listener (US-03).

### Domain Examples

#### 1: New staple auto-appears in trip on originating device

Clemens has an active trip with 12 items (started from sweep). He adds "Paper Towels" (area: "Bathroom", section: "Paper Goods", aisle: 3) as a new staple. Without hitting Reset Sweep, "Paper Towels" appears in his trip with itemType "staple", source "preloaded", needed true, checked false.

#### 2: New staple on web appears in trip on phone

Clemens adds "Tahini" as a staple on the web app. His phone, which has the trip open, shows "Tahini" in the trip within 5 seconds. The trip item has stapleId matching the new staple's id.

#### 3: Removed staple disappears from trip

Clemens removes "Soda" from the staple library on the web. "Soda" is removed from the active trip on the web immediately. Within 5 seconds, "Soda" disappears from the trip on the phone.

### UAT Scenarios (BDD)

#### Scenario: New staple appears in active trip without Reset Sweep

Given Clemens has an active trip that was started with "Milk", "Eggs", and "Bread"
And he has completed the "Bathroom" area sweep
When Clemens adds "Paper Towels" (area: "Bathroom") as a new staple
Then "Paper Towels" appears in the active trip
And his sweep progress (Bathroom completed) is preserved
And no Reset Sweep is required

#### Scenario: New staple on other device appears in trip via sync

Given Clemens has an active trip open on both Android and web
When Clemens adds "Tahini" (area: "Kitchen Cabinets") as a new staple on the web
Then within 5 seconds "Tahini" appears in the trip on the phone
And the trip item has stapleId matching the new staple

#### Scenario: Removed staple disappears from trip

Given Clemens has an active trip with "Soda" (a staple, stapleId: "staple-soda-123")
When Clemens removes "Soda" from the staple library
Then "Soda" is removed from the active trip
And the removal syncs to the other device within 5 seconds

#### Scenario: Duplicate prevention when staple already in trip

Given Clemens has an active trip that already contains "Milk" (from initial sweep)
When a sync event delivers the staples list which includes "Milk"
Then the trip still contains exactly one "Milk" item
And no duplicate is created

### Acceptance Criteria

- [ ] Adding a staple during an active trip creates a TripItem automatically
- [ ] Removing a staple during an active trip removes the corresponding TripItem
- [ ] Sweep progress (completed areas, checkoffs) is preserved when staples are added
- [ ] Trip item has correct stapleId linking back to the staple
- [ ] No duplicate trip items when staple already exists in trip

### Outcome KPIs

- **Who**: Grocery planners who add staples during trip planning
- **Does what**: See new staples in the active trip without Reset Sweep
- **By how much**: 100% of new staples appear in trip automatically (vs. 0% today)
- **Measured by**: Add staple during active trip, verify it appears without Reset Sweep
- **Baseline**: 0% (new staples require Reset Sweep to appear in trip)

### Technical Notes

- The `TripService` already has `syncStapleUpdate()` and `removeItemByStapleId()` for modifying existing trip items
- New behavior needed: when `StapleLibrary.add()` is called and a trip is active, also call trip.addItem() or equivalent
- This may require the hooks/orchestration layer to coordinate between StapleLibrary and TripService
- On the receiving device, the trip document update (via onSnapshot) delivers the new item -- no separate staple-to-trip logic needed there
- Guard against duplicates: check if trip already has an item with matching stapleId before adding
- Dependency: US-02 (trip in Firestore), US-03 (real-time trip sync)

---

## US-06: Migrate Local AsyncStorage Trip to Firestore

### Problem

Clemens has been using the app for weeks. He has an active trip in AsyncStorage with 15 items, 7 checked off, and "Bathroom" and "Kitchen Cabinets" marked as completed areas. When the sync update ships, his local trip data must not be lost.

### Who

- Clemens | Existing user upgrading to sync-enabled version | Wants to keep his current trip progress

### Solution

On first app start after the update, if Firestore has no trip document but AsyncStorage has an active trip, migrate the local trip to Firestore. If Firestore already has a trip, it takes precedence.

### Domain Examples

#### 1: Local trip migrates to Firestore

Clemens updates the app. Firestore has no trip document. AsyncStorage has an active trip with 15 items, 7 checked, 2 completed areas. The app writes this trip to Firestore. On next open (or on web), the trip is available.

#### 2: Firestore trip takes precedence

Clemens already migrated on his phone. His web app also has a local trip in AsyncStorage. The Firestore trip (from phone migration) takes precedence. The web's local trip is ignored.

#### 3: No migration needed for new users

Clemens is a new user. Neither Firestore nor AsyncStorage has a trip. A new trip is created from the staple library.

### UAT Scenarios (BDD)

#### Scenario: Local trip migrates to Firestore on first sync-enabled launch

Given Clemens has an active trip in AsyncStorage with 15 items and 7 checked
And Firestore has no trip document for his user account
When the app initializes with the sync-enabled version
Then the local trip is written to Firestore
And the app uses Firestore for trip storage going forward

#### Scenario: Firestore trip takes precedence over local trip

Given Clemens has a trip in Firestore with 12 items (migrated from phone)
And AsyncStorage has a stale trip with 10 items
When the app initializes
Then the Firestore trip (12 items) is used
And the AsyncStorage trip is ignored

#### Scenario: Fresh user with no trip data anywhere

Given Clemens is a new user with no trip in Firestore or AsyncStorage
When the app initializes
Then a new trip is created from the staple library
And the new trip is persisted to Firestore

#### Scenario: Carryover data migrates alongside trip

Given Clemens has carryover items ("Olive Oil", "Sponges") in AsyncStorage
And Firestore has no carryover document
When the app initializes with the sync-enabled version
Then the carryover items are written to Firestore

### Acceptance Criteria

- [ ] Local trip migrates to Firestore when Firestore has no trip document
- [ ] Firestore trip takes precedence when both local and cloud trips exist
- [ ] Carryover data migrates alongside trip data
- [ ] Migration is idempotent (re-running does not duplicate data)
- [ ] New users with no trip data start fresh without errors

### Outcome KPIs

- **Who**: Existing app users upgrading to the sync-enabled version
- **Does what**: Retain their trip progress after the update
- **By how much**: 100% of existing trips preserved (zero data loss on upgrade)
- **Measured by**: Trip item count, checkoff state, and completed areas match before and after migration
- **Baseline**: N/A (one-time migration event)

### Technical Notes

- Follow the migration pattern in `useAppInitialization.ts` (`runMigrationIfNeeded`)
- Migration check: Firestore trip document does not exist AND AsyncStorage trip is non-null
- Must also migrate carryover (`@grocery/trip_carryover`)
- The `checkoffs` key (`@grocery/trip_checkoffs`) contains redundant data (already in Trip.items) -- can be skipped
- Dependency: US-02 (Firestore trip adapter)

---

## US-07: Prevent Duplicate Trip Items from Concurrent Local and Remote Adds

### Problem

Clemens adds "Tahini" as a staple on the web. The auto-add logic (US-05) creates a trip item locally and writes the trip to Firestore. The phone receives the trip update via onSnapshot. If the phone also runs auto-add logic when it receives the staple update, "Tahini" could appear twice in the trip.

### Who

- Clemens | Multi-device user with real-time sync active | Expects no duplicate items in his trip

### Solution

Before adding a trip item for a new staple, check if the trip already contains an item with the same stapleId. If so, skip the add. This guard applies both on the originating device (when auto-adding) and on the receiving device (when processing onSnapshot updates).

### Domain Examples

#### 1: No duplicate when both local add and sync fire

Clemens adds "Tahini" on the web. Web creates trip item (stapleId: "staple-tahini-abc"). Trip syncs to Firestore. Phone receives trip update with "Tahini" already present. Phone does not add a second "Tahini".

#### 2: No duplicate when re-adding existing staple

Clemens removes "Tahini" from staples, then re-adds it. The staple gets a new ID. The old trip item (with old stapleId) was removed (US-05). The new trip item is created with the new stapleId. Only one "Tahini" in the trip.

#### 3: Items with same name but different stapleIds are not duplicates

Clemens has a staple "Milk" (stapleId: "staple-milk-1") and quick-adds a one-off "Milk" (stapleId: null). Both items exist in the trip. The duplicate check is by stapleId, not by name.

### UAT Scenarios (BDD)

#### Scenario: No duplicate when trip sync delivers item already added locally

Given Clemens adds "Tahini" as a staple on the web (auto-added to trip)
And the trip syncs to the phone via onSnapshot
When the phone processes the updated trip
Then the phone's trip contains exactly one "Tahini" item

#### Scenario: Staple and one-off with same name coexist

Given Clemens has a staple "Milk" (stapleId: "staple-milk-1") in the trip
And Clemens quick-adds a one-off "Milk" (stapleId: null)
Then the trip contains two "Milk" items (one staple, one one-off)
And no false duplicate detection occurs

#### Scenario: Re-added staple gets fresh trip item

Given Clemens removed "Tahini" from staples (trip item removed)
When Clemens re-adds "Tahini" as a staple (new stapleId)
Then a new trip item is created for "Tahini"
And the trip contains exactly one "Tahini"

### Acceptance Criteria

- [ ] Duplicate check uses stapleId, not item name
- [ ] Trip item not created if stapleId already present in trip
- [ ] One-off items (stapleId: null) are never considered duplicates of staples
- [ ] Re-added staples (new stapleId) get new trip items

### Outcome KPIs

- **Who**: Multi-device users with real-time sync
- **Does what**: Never see duplicate items in their trip
- **By how much**: 0 duplicate trip items (vs. potential duplicates without this guard)
- **Measured by**: Add staple on device A, verify single item on device B
- **Baseline**: Unknown (sync does not exist yet)

### Technical Notes

- Guard in auto-add logic: `if (trip.getItems().some(item => item.stapleId === newStapleId)) return`
- Guard in onSnapshot handler: when replacing trip items from remote state, use the remote state directly (do not merge)
- The onSnapshot approach of replacing the entire trip state from the remote document naturally prevents duplicates
- Dependency: US-05 (auto-add logic)

---

## US-08: Listener Re-Establishment After Re-Login

### Problem

Clemens logs out of the app and logs back in. If the old listeners were cleaned up (US-04) but new ones are not created, the app reverts to static data with no real-time sync.

### Who

- Clemens | User who logs out and back in | Expects sync to resume after re-login

### Solution

When `useAppInitialization` runs after a new login, fresh onSnapshot listeners are created as part of the normal initialization flow. The existing useEffect dependency on `authUser` already triggers re-initialization when auth state changes.

### Domain Examples

#### 1: Re-login creates fresh listeners

Clemens logs out. Listeners are cleaned up (US-04). He logs back in. The useEffect in useAppInitialization fires because authUser changed. New Firestore adapters are created with fresh onSnapshot listeners. Real-time sync resumes.

#### 2: Different user login gets own data

Clemens logs out. His partner logs in on the same device. New listeners point to the partner's Firestore path (`users/{partner-uid}/data/*`). The partner sees their own staples and trip.

#### 3: No leftover state from previous user

After Clemens logs out and his partner logs in, there are no staples or trip items from Clemens visible. The partner starts fresh with their own data.

### UAT Scenarios (BDD)

#### Scenario: Real-time sync resumes after re-login

Given Clemens logged out and all listeners were cleaned up
When Clemens logs back in
Then new onSnapshot listeners are established
And changes made on other devices during the logout period are received

#### Scenario: Different user sees own data after login

Given Clemens logs out on the Android phone
When his partner logs in on the same phone
Then the partner sees their own staple library and trip
And no data from Clemens is visible

### Acceptance Criteria

- [ ] New onSnapshot listeners are created on re-login
- [ ] Auth state change triggers full re-initialization including listener setup
- [ ] No stale data from previous user's session
- [ ] Real-time sync works identically after re-login as after first login

### Outcome KPIs

- **Who**: Users who log out and back in
- **Does what**: Have working real-time sync after re-login
- **By how much**: 100% of re-login sessions have working sync (vs. untested today)
- **Measured by**: Log out, log in, verify sync works
- **Baseline**: N/A (no listeners exist today)

### Technical Notes

- The existing `useEffect` in `useAppInitialization` depends on `[authUser, factories]` -- it already re-runs when auth state changes
- The cleanup function in the useEffect cancels the previous initialization
- New adapters with new listeners are created naturally by the re-run
- The key risk is race conditions: old cleanup running after new initialization starts. The existing `cancelled` flag pattern handles this.
- Dependency: US-01, US-03, US-04
