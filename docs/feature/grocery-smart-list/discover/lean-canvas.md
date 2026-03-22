# Lean Canvas: Grocery Smart List

**Feature ID**: grocery-smart-list
**Phase**: 4 -- Market Viability
**Date**: 2026-03-17
**Status**: COMPLETE -- Gate G4 passed (personal project adaptation)

---

## 1. Problem

Top 3 problems (validated in Phase 1):

1. **Prep friction**: 20 minutes consolidating unsorted whiteboard items into structured Notion database every bi-weekly trip
2. **No dual-view**: Need home-area view for restocking sweep AND store-aisle view for shopping -- no tool supports both
3. **No staple/one-off distinction**: Cannot mark items as recurring vs temporary; manual cleanup after every trip

### Existing Alternatives
- Notion (current): flexible but high-friction, poor offline, no dual-view optimization
- Workflowy (abandoned): quick entry but no structured views or metadata
- Physical whiteboard: zero-friction capture but no portability or structure
- Generic grocery apps: store-organized only, no home-area dimension

## 2. Customer Segments

**Primary**: Household grocery planner who maintains a structured shopping system

**Job-to-be-done**: When I need to restock the household, I want to efficiently identify what's needed and shop without friction, so I can spend less time and mental energy on grocery management.

**Characteristics** (by JTBD, not demographics):
- Maintains a system (not ad-hoc shoppers)
- Shops on a regular cadence (bi-weekly or weekly)
- Values efficiency in-store (aisle-order matters)
- Multi-room household (home-area organization is meaningful)

## 3. Unique Value Proposition

**One list, two views: organize by room at home, by aisle in store.**

The only grocery list that understands you need to think about groceries differently at home (what's running low where?) versus in the store (what's in this aisle?).

## 4. Solution

Top 3 features mapped to top 3 problems:

| Problem | Feature |
|---|---|
| Prep friction (20 min) | Quick-add capture that auto-organizes into both views -- no consolidation step |
| No dual-view | Home-area view + store-aisle view of the same items, one-tap switch |
| No staple/one-off distinction | Item type system: staples auto-repopulate after trip; one-offs auto-clear |

Supporting features:
- Offline-first architecture (addresses PP5)
- Shared household access (addresses PP6)
- Per-item store metadata: aisle and section (addresses PP4)

## 5. Channels

**Primary**: Personal use (builder is the customer)
**Secondary**: If expanded --
- Word of mouth (households with similar systems)
- App Store organic search ("grocery list aisle order," "shopping list by room")

## 6. Revenue Streams

**Personal project**: No monetization required.
**If expanded**: Freemium model -- free for single list, paid for multiple stores/lists/household sharing.

## 7. Cost Structure

| Cost | Type | Amount |
|---|---|---|
| Developer time | Fixed (own time) | ~hours/week |
| Expo/React Native tooling | Free tier | $0 |
| App hosting (if web) | Free tier | $0 |
| Apple Developer Account | Annual (if App Store) | $99/year |

**Total**: Effectively $0 for personal use. Time is the primary investment.

## 8. Key Metrics

| Metric | Target | Rationale |
|---|---|---|
| Prep time per trip | <5 min (from 20 min) | Primary pain point |
| Whiteboard retired | Yes/No | Capture friction eliminated |
| In-store check-off failures | 0 | Offline reliability |
| Items managed as staples | 10+ | Staple feature adoption |
| Wife using app directly | Yes/No | Shared input validated |

## 9. Unfair Advantage

- Builder is the user -- perfect product-market fit feedback loop
- Deep understanding of the dual-view need (not obvious to generic grocery app builders)
- No need for monetization -- can optimize purely for UX without growth pressure

## 4 Big Risks Assessment

| Risk | Question | Status | Evidence |
|---|---|---|---|
| Value | Will the user want this? | GREEN | Builder is the user. 6 validated pain points. "Dread" emotional signal. Building it = ultimate commitment. |
| Usability | Can the user use this? | GREEN | Walking skeleton tested. React Native + familiar mobile patterns. |
| Feasibility | Can we build this? | GREEN | Proven stack (React Native, Expo SDK 54, TypeScript). Local storage for offline. No novel technical risk. |
| Viability | Does this work as a product? | GREEN | Personal project -- viability = "is it worth my time?" Answer: yes, eliminates 20 min/trip + dread. |

## Gate G4 Evaluation

| Criterion | Target | Result | Status |
|---|---|---|---|
| Lean Canvas complete | All 9 boxes | All filled with validated evidence | PASS |
| 4 big risks | All green/yellow | All green | PASS |
| Channel validated | 1+ viable | Personal use (guaranteed) | PASS |
| Go/no-go documented | Yes | GO -- proceed to build | PASS |

**Decision**: GO -- Proceed to handoff
