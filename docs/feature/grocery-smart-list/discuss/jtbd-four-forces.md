# JTBD Four Forces Analysis: Grocery Smart List

**Feature ID**: grocery-smart-list
**Phase**: DISCUSS -- Phase 1 (JTBD Analysis)
**Date**: 2026-03-17

---

## Overall Forces Diagram

```
        PROGRESS (switching to app)
             ^
             |
Push of  ----+---- Pull of
Notion/       |     Smart List
Whiteboard    |
             |
        NO PROGRESS (staying with Notion)
             ^
             |
Anxiety  ----+---- Habit of
of App        |     Current
              |     System
```

---

## Forces Analysis: Home Sweep Journey

### Demand-Generating
- **Push**: Consolidating whiteboard into Notion takes 20 minutes every trip. The mismatch between unsorted whiteboard and structured Notion creates tedious transcription work. User uses the word "dread" about trip planning.
- **Pull**: Room-by-room digital capture during the physical walk-through. Items captured once, organized automatically into both views. No consolidation step. Prep time target: under 5 minutes.

### Demand-Reducing
- **Anxiety**: Will adding items in the app be as fast as scribbling on the whiteboard? If it takes more than a few seconds per item, the friction is worse, not better.
- **Habit**: The physical walk-through ritual is deeply ingrained and works well as a completeness check. The whiteboard is zero-friction for the wife. Both habits must be preserved, not disrupted.

### Assessment
- Switch likelihood: **High**
- Key blocker: Speed of item entry must match or beat whiteboard scribbling
- Key enabler: Elimination of the 20-minute consolidation step (strongest push)
- Design implication: Quick-add must be extremely fast. Auto-suggest from staples library. The sweep ritual (room-by-room) must be supported, not flattened.

---

## Forces Analysis: Store Navigation Journey

### Demand-Generating
- **Push**: Notion's store view is fragile and breaks offline. Checking off items fails on unreliable store Wi-Fi. Reloading the list takes a long time. Core in-store experience is unreliable.
- **Pull**: Aisle-ordered list that works fully offline. Check-off that never loses state. Empty aisles automatically skipped. Non-aisle sections (deli, bakery) included naturally in the flow.

### Demand-Reducing
- **Anxiety**: Will the aisle metadata be accurate? The user has partially maintained aisle data in Notion -- what if the app requires even more metadata effort? What about store layout changes?
- **Habit**: The user already has a Notion view grouped by section/aisle in store-walk order. The pattern is familiar. Switching tools means re-entering all that metadata.

### Assessment
- Switch likelihood: **High**
- Key blocker: Initial metadata setup cost (aisle assignments for existing items)
- Key enabler: Offline reliability (strongest push -- Notion literally breaks in-store)
- Design implication: Aisle is a persistent property on each staple item, set once and reused forever. Migration from Notion should be considered. Offline-first is non-negotiable.

---

## Forces Analysis: Staple Item Management

### Demand-Generating
- **Push**: No staple/one-off distinction exists in any tool the user has tried. User "just suffers" -- the most telling signal of an unmet need with zero workaround. Manually deletes one-off items after purchase but has no system for it.
- **Pull**: Staples auto-repopulate after each trip. One-offs auto-clear when checked off. The list is mostly ready before the sweep even begins. Only exceptions need attention.

### Demand-Reducing
- **Anxiety**: What if a staple is on the list but not needed this trip? Is it easy to skip? What if the staple library grows stale over time?
- **Habit**: Currently rebuilds the list from memory each trip, augmented by the whiteboard. This is labor-intensive but guarantees freshness (nothing stale carries over).

### Assessment
- Switch likelihood: **High**
- Key blocker: Ability to easily skip a staple without removing it from the library
- Key enabler: Zero workaround exists today (user "just suffers") -- unmet need with no competition
- Design implication: Staples must be skippable per-trip without deletion. The distinction between "skip this trip" and "remove from staples" must be clear.

---

## Forces Analysis: Whiteboard Coexistence

### Demand-Generating
- **Push**: Wife adds items to the whiteboard throughout the week. These must be transcribed into the digital system before each trip. The whiteboard is a source of consolidation friction (PP1).
- **Pull**: Easy manual entry from whiteboard into the app. Known staples auto-suggest metadata. New items are quick to categorize.

### Demand-Reducing
- **Anxiety**: Will wife adopt the app? What if the app becomes another system to manage alongside the whiteboard, increasing friction instead of reducing it?
- **Habit**: Wife prefers the whiteboard. It is tactile, always visible, shared, and zero-friction. This is a strong habit that the app should not fight.

### Assessment
- Switch likelihood: **Medium** (app coexists with whiteboard rather than replacing it)
- Key blocker: If the app tries to replace the whiteboard, wife's adoption drops to zero
- Key enabler: App accepts that whiteboard stays; optimizes the consolidation FROM whiteboard
- Design implication: The app is the consolidation target, not the sole capture surface. Quick-add must support rapid batch entry of whiteboard items. Do not design for whiteboard replacement.

---

## Combined Force Balance

| Force | Strength | Evidence |
|-------|----------|----------|
| Push (current pain) | **Very Strong** | 20 min/trip, "dread," offline failures, "just suffers" |
| Pull (new solution) | **Strong** | Dual-view, auto-staples, offline-first, aisle ordering |
| Anxiety (new risks) | **Medium** | Entry speed, metadata effort, wife adoption |
| Habit (current comfort) | **Medium** | Whiteboard ritual, Notion familiarity, physical sweep |

**Overall**: Push + Pull significantly exceeds Anxiety + Habit. High confidence in adoption, provided:
1. Quick-add speed matches whiteboard scribbling
2. Whiteboard coexistence is respected (not replaced)
3. Initial metadata setup cost is low (staples with aisle set once)
4. Offline reliability is absolute (zero failures)
