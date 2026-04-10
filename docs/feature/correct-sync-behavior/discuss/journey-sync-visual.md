# Journey: Multi-Device Sync During Trip Planning

## Persona

**Clemens** -- solo user of the grocery list app. Plans grocery trips using both Android phone and web browser simultaneously (computer for planning, phone nearby). During the actual shopping trip, uses only the Android phone.

## Emotional Arc

- **Start**: Frustrated -- changes made on one device do not appear on the other without restarting
- **Middle**: Confident -- sees changes propagate between devices within seconds
- **End**: Trusting -- stops thinking about sync entirely; it just works

Pattern: **Problem Relief** (Frustrated -> Hopeful -> Relieved)

---

## Current (Broken) Flow

```
PLANNING PHASE: Clemens at desk with laptop + phone
====================================================

DEVICE A (Web browser)                    DEVICE B (Android phone)
--------------------------                --------------------------

1. Clemens adds "Olive Oil"
   to staple library on web

   Staple Library: +Olive Oil
   Firestore staples: +Olive Oil  --->    Firestore has Olive Oil
   Trip (local only): +Olive Oil          Trip (AsyncStorage): NO Olive Oil
                                          (no trip in Firestore at all)

                                          2. Clemens picks up phone
                                             Staple Library: loaded at init
                                               -> NO Olive Oil (stale cache)
                                             Trip: loaded from AsyncStorage
                                               -> NO Olive Oil

                                          PROBLEM: Must restart app to see
                                          the staple. Even then, trip won't
                                          have Olive Oil unless "Reset Sweep".

                                          3. Clemens skips "Butter" on phone

   4. Clemens looks at web
      Trip still shows Butter as needed
      (skip was in AsyncStorage only)

      Feels: confused, distrusting
```

**Root causes identified**:

1. All Firestore reads use `getDoc` (one-time fetch at init). No real-time listeners.
2. Trip data is stored in AsyncStorage only -- never reaches Firestore.
3. Adding a staple does not auto-add it to the active trip (requires "Reset Sweep").

---

## Target (Fixed) Flow

```
PLANNING PHASE: Clemens at desk with laptop + phone
====================================================

DEVICE A (Web browser)                    DEVICE B (Android phone)
--------------------------                --------------------------

Both devices have active onSnapshot listeners on:
  - users/{uid}/data/staples
  - users/{uid}/data/areas
  - users/{uid}/data/sectionOrder
  - users/{uid}/data/trip          <-- NEW document

1. Clemens adds "Olive Oil"
   to staple library on web

   Staple Library: +Olive Oil
   Firestore staples: +Olive Oil
   Domain: active trip? yes
     -> auto-add Olive Oil as TripItem
   Firestore trip: +Olive Oil
                                   ~2-3s
                                   =====>    2. Phone: onSnapshot fires
                                             for BOTH staples and trip docs

                                             Staple cache: +Olive Oil
                                             Trip cache: +Olive Oil
                                             UI re-renders: Olive Oil visible
                                             in sweep AND shopping list

                                             Feels: seamless, "it just works"

                                          3. Clemens skips "Butter" on phone
                                             Trip item updated (needed=false)
                                             Firestore trip: Butter skipped
                                   <=====
   4. Web: onSnapshot fires         ~2-3s
      Trip cache: Butter skipped
      UI re-renders: Butter dimmed/skipped
      Feels: confident, both devices agree

                                          5. Clemens renames area
                                             "Pantry" -> "Garage Pantry"
                                             Firestore areas: updated
                                             All staples/trip items with
                                             Pantry -> Garage Pantry
                                   <=====
   6. Web: onSnapshot fires          ~2-3s
      Areas cache: Garage Pantry
      UI re-renders with new area name

SHOPPING PHASE: Clemens in store with phone only
=================================================

   Phone already has latest state
   from planning phase listeners.

   Checks off items -> Firestore trip updated
   (web would see updates if open, but Clemens
   is not using web during shopping)
```

---

## Data Flow: Current vs Target

```
CURRENT (BROKEN):

  Staples -----> Firestore (getDoc at init only, stale after init)
  Areas -------> Firestore (getDoc at init only, stale after init)
  SectionOrder-> Firestore (getDoc at init only, stale after init)
  Trip --------> AsyncStorage ONLY (never syncs between devices)


TARGET (FIXED):

  Staples -----> Firestore (onSnapshot listener, real-time push)
  Areas -------> Firestore (onSnapshot listener, real-time push)
  SectionOrder-> Firestore (onSnapshot listener, real-time push)
  Trip --------> Firestore (onSnapshot listener, real-time push)  <-- NEW
                 + domain reaction: new staple -> auto-add trip item
```

---

## Key Interaction: New Staple Auto-Adds to Trip

```
  Clemens adds "Tahini" as a staple on web
       |
       v
  Web: StapleLibrary.add("Tahini")
       |
       +-- writes to Firestore staples doc
       +-- domain logic checks: active trip exists?
       |     YES -> create TripItem for "Tahini"
       |            write updated trip to Firestore
       |
       v
  Phone: onSnapshot fires for staples doc
       +-- staple cache updated with Tahini
  Phone: onSnapshot fires for trip doc
       +-- trip items updated, Tahini appears
       |
       v
  Both devices show Tahini in staples AND trip
  WITHOUT needing "Reset Sweep"
```

---

## Error Paths

### Listener Disconnection (Phone in Store)

```
  Phone loses network (poor signal in store)
       |
       v
  Firestore SDK: offline persistence activates automatically
       |
       +-- local writes queued by Firestore SDK
       +-- reads served from Firestore offline cache
       +-- app continues working normally
       |
       v
  Network restored
       |
       +-- Firestore SDK replays queued writes
       +-- onSnapshot fires with latest server state
       +-- UI updates to reflect any changes
```

### Conflicting Edits (Same-Second Writes)

```
  Both devices modify trip within the same second
       |
       v
  Firestore last-write-wins (document-level setDoc)
  One device's write may overwrite the other's

  Acceptable risk: Clemens is a single user.
  During planning, he uses devices alternately, not simultaneously editing
  the exact same item. The risk of same-second conflict is near zero.

  If conflict occurs: last write wins. No data corruption,
  but one action (e.g., a checkoff) may be lost.
  User would notice and re-apply the action.
```

### Migration: Existing Local Trip Data

```
  First launch after upgrade (trip exists in AsyncStorage, not Firestore)
       |
       v
  Check: Firestore trip doc exists?
       |
       NO  --> read AsyncStorage trip
               write to Firestore trip doc
               set up onSnapshot listener
               clear AsyncStorage trip (optional, keep as fallback)
       |
       YES --> use Firestore trip (ignore local)
               set up onSnapshot listener
```

### Corrupt/Invalid Trip Data

```
  Firestore trip doc contains unparseable data
       |
       v
  Parse error caught
       +-- log error for debugging
       +-- reset trip from current staple library
       +-- user sees fresh trip (staples present, no checkoffs)
       +-- acceptable: planning-phase data loss is recoverable
```

---

## Integration Checkpoints

1. **Staple add -> Trip auto-update**: When a staple is added to the library during an active trip, the domain layer must create a corresponding TripItem and persist the updated trip.
2. **Staple remove -> Trip item removal**: When a staple is removed, the corresponding trip item (matched by `stapleId`) must also be removed from the active trip.
3. **All storage writes -> Firestore**: Every `saveTrip()`, `saveCheckoffs()`, `saveCarryover()` must write to Firestore, not AsyncStorage.
4. **All storage reads -> onSnapshot**: Staples, areas, section order, and trip must use `onSnapshot` listeners after initial load, pushing updates to the in-memory cache and triggering UI re-renders.
5. **Listener lifecycle**: Listeners must be set up after authentication and torn down on logout or app unmount. Memory leaks from orphaned listeners are unacceptable.
6. **Migration**: First launch after upgrade must migrate local AsyncStorage trip data to Firestore if no Firestore trip doc exists.
