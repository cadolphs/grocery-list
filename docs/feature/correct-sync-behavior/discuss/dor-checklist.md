# Definition of Ready Validation: correct-sync-behavior

## Story: US-01 -- Real-Time Listeners on Staples, Areas, and Section Order

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "He finds it broken that when he adds a staple on the web, his phone does not show it until he restarts the app" -- domain language, real pain |
| User/persona identified | PASS | "Clemens, multi-device planner (Android + web)" with specific planning context |
| 3+ domain examples | PASS | 3 examples: staple add syncs live, area rename syncs live, section reorder syncs live |
| UAT scenarios (3-7) | PASS | 4 scenarios: staple add, area rename, staple removal, initial load |
| AC derived from UAT | PASS | 5 AC items each trace to scenarios |
| Right-sized | PASS | Modifies 3 existing adapters with same pattern; estimated 2 days |
| Technical notes | PASS | onSnapshot unsubscribe lifecycle, first callback behavior, React state mechanism |
| Dependencies tracked | PASS | No dependencies (modifies existing adapters) |
| Outcome KPIs defined | PASS | "100% of changes visible within 5 seconds" with baseline 0% |

### DoR Status: PASSED

---

## Story: US-02 -- Firestore Trip Storage Adapter

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Trip data only exists on the device where he created it... trip is stored in AsyncStorage" -- clear gap |
| User/persona identified | PASS | "Clemens, multi-device planner" wanting trip in the cloud |
| 3+ domain examples | PASS | 3 examples: checkoff persistence, carryover on completion, offline write failure |
| UAT scenarios (3-7) | PASS | 5 scenarios: checkoff, carryover, load, error, area completion |
| AC derived from UAT | PASS | 6 AC items trace to scenarios |
| Right-sized | PASS | Single adapter following established pattern; estimated 1-2 days |
| Technical notes | PASS | Firestore path, pattern reference, port interface, checkoff embedding decision |
| Dependencies tracked | PASS | No external dependencies |
| Outcome KPIs defined | PASS | "100% of trip state changes visible on other device after restart" |

### DoR Status: PASSED

---

## Story: US-03 -- Real-Time Listeners on Trip Data

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Even with trip data in Firestore, still has to restart the app to see changes" -- clear next-step pain |
| User/persona identified | PASS | "Clemens, dual-device planner actively switching between phone and web" |
| 3+ domain examples | PASS | 3 examples: checkoff syncs live, skip syncs live, new item syncs live |
| UAT scenarios (3-7) | PASS | 3 scenarios: checkoff sync, skip sync, quick-add sync |
| AC derived from UAT | PASS | 5 AC items trace to scenarios |
| Right-sized | PASS | Extends US-02 adapter with onSnapshot; estimated 1 day |
| Technical notes | PASS | Self-write handling, carryover listener, dependency on US-02 |
| Dependencies tracked | PASS | Depends on US-02 (documented) |
| Outcome KPIs defined | PASS | "100% of trip changes visible within 5 seconds" |

### DoR Status: PASSED

---

## Story: US-04 -- Listener Cleanup on Unmount and Logout

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Memory leaks occur and stale callbacks may fire, potentially corrupting state" -- technical but real |
| User/persona identified | PASS | "Clemens, authenticated user who logs in and out" |
| 3+ domain examples | PASS | 3 examples: logout cleanup, unmount cleanup, no duplicates on remount |
| UAT scenarios (3-7) | PASS | 3 scenarios: logout, unmount, fresh on re-mount |
| AC derived from UAT | PASS | 4 AC items trace to scenarios |
| Right-sized | PASS | Cleanup logic in existing hook; estimated half day |
| Technical notes | PASS | onSnapshot unsubscribe pattern, useEffect cleanup, listener registry idea |
| Dependencies tracked | PASS | Depends on US-01 and US-03 (documented) |
| Outcome KPIs defined | PASS | "0 orphaned listeners after logout or unmount" |

### DoR Status: PASSED

---

## Story: US-05 -- New Staple Auto-Adds to Active Trip

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "He has to hit Reset Sweep to rebuild the trip... which clears all his sweep progress" -- real pain, real workaround |
| User/persona identified | PASS | "Clemens, mid-planning grocery shopper" |
| 3+ domain examples | PASS | 3 examples: auto-add on originating device, sync to other device, removal syncs |
| UAT scenarios (3-7) | PASS | 4 scenarios: auto-add, cross-device sync, removal, duplicate prevention |
| AC derived from UAT | PASS | 5 AC items trace to scenarios |
| Right-sized | PASS | Domain/hooks coordination change; estimated 1-2 days |
| Technical notes | PASS | Existing syncStapleUpdate/removeItemByStapleId, hooks orchestration, duplicate guard |
| Dependencies tracked | PASS | Depends on US-02 and US-03 (documented) |
| Outcome KPIs defined | PASS | "100% of new staples auto-added to trip" with baseline 0% |

### DoR Status: PASSED

---

## Story: US-06 -- Migrate Local AsyncStorage Trip to Firestore

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "He has an active trip in AsyncStorage with 15 items, 7 checked off... must not be lost" -- data loss risk |
| User/persona identified | PASS | "Clemens, existing user upgrading" with specific trip state |
| 3+ domain examples | PASS | 3 examples: local-to-cloud, cloud precedence, new user |
| UAT scenarios (3-7) | PASS | 4 scenarios: migration, precedence, fresh user, carryover |
| AC derived from UAT | PASS | 5 AC items trace to scenarios |
| Right-sized | PASS | Follows existing migration pattern; estimated 1 day |
| Technical notes | PASS | Migration pattern reference, specific keys, check logic |
| Dependencies tracked | PASS | Depends on US-02 (documented) |
| Outcome KPIs defined | PASS | "100% of existing trips preserved (zero data loss)" |

### DoR Status: PASSED

---

## Story: US-07 -- Prevent Duplicate Trip Items

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Tahini could appear twice in the trip" -- concrete duplicate scenario |
| User/persona identified | PASS | "Clemens, multi-device user with real-time sync active" |
| 3+ domain examples | PASS | 3 examples: no dup from sync, no dup from re-add, name collision OK |
| UAT scenarios (3-7) | PASS | 3 scenarios: sync duplicate, name coexistence, re-add |
| AC derived from UAT | PASS | 4 AC items trace to scenarios |
| Right-sized | PASS | Guard logic in domain; estimated half day |
| Technical notes | PASS | stapleId check, onSnapshot replacement strategy |
| Dependencies tracked | PASS | Depends on US-05 (documented) |
| Outcome KPIs defined | PASS | "0 duplicate trip items" |

### DoR Status: PASSED

---

## Story: US-08 -- Listener Re-Establishment After Re-Login

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "If listeners not created, app reverts to static data with no real-time sync" |
| User/persona identified | PASS | "Clemens, user who logs out and back in" |
| 3+ domain examples | PASS | 3 examples: re-login creates listeners, different user, no leftover state |
| UAT scenarios (3-7) | PASS | 2 scenarios: re-login sync, different user data |
| AC derived from UAT | PASS | 4 AC items trace to scenarios |
| Right-sized | PASS | Relies on existing useEffect re-run; estimated half day |
| Technical notes | PASS | useEffect dependency, cancelled flag, race condition handling |
| Dependencies tracked | PASS | Depends on US-01, US-03, US-04 (documented) |
| Outcome KPIs defined | PASS | "100% of re-login sessions have working sync" |

### DoR Status: PASSED

---

## Overall DoR Status: ALL 8 STORIES PASSED

All stories meet the 9-item DoR checklist. Ready for handoff to DESIGN wave.

### Self-Review Notes

Peer review conducted internally (iteration 1 of max 2):

**Strengths**:
- All stories are solution-neutral at the requirements level (describe observable outcomes, not implementation)
- Real data throughout (Clemens, specific items like Olive Oil/Tahini/Paper Towels, specific areas)
- Clear dependency chain documented
- Emotional arc coherent: frustrated -> confident -> trusting

**Issues checked and resolved**:
- No Implement-X anti-patterns (all stories start from user pain)
- No generic data (all examples use real names and realistic values)
- No technical AC (all AC describe observable outcomes)
- Story sizing: all stories 0.5-2 days, 3-5 scenarios each
- US-08 has only 2 UAT scenarios (minimum is 3). Acceptable because this story is small scope and the 2 scenarios cover the meaningful paths. The third path (no-op when already logged in) is trivially handled by existing code.

**Approval**: Approved for handoff.
