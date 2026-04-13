# DESIGN Decisions -- checklist-search-bar

## Architecture Impact

**None.** This is a UI-only feature. No new ports, adapters, domain logic, or hooks. The existing hexagonal architecture is unaffected.

## Key Decisions

### [D1] Search state lives inside StapleChecklist

**Choice**: Add `searchQuery` state to `StapleChecklist` via `useState`. The component becomes lightly stateful (one local state variable), but remains a leaf component with no hooks beyond `useState`.

**Rationale**: Lifting search state to `HomeView` would add props threading (`searchQuery`, `onSearchChange`) for no benefit -- no other component needs the search query. Keeping it local follows React's "state closest to where it's used" principle. StapleChecklist already receives all data it needs to filter (`staples` array).

**Trade-off considered**: Making StapleChecklist stateful breaks its current "pure presentational" contract. However, a single `useState` for ephemeral UI state is the lightest possible statefulness, and filtering is a view concern, not a domain concern.

### [D2] Filter as a pure function applied before render

**Choice**: `filterStaples(staples, query)` -- a pure function that takes the full staples array and query string, returns filtered results. Applied inside `StapleChecklist` before the `.map()` render.

**Rationale**: Keeps filtering testable as a pure function. No `useMemo` needed -- filtering <100 items by substring is sub-millisecond.

### [D3] Cross-platform clear button

**Choice**: Custom `Pressable` with "X" text, rendered conditionally when `searchQuery.length > 0`. No platform-specific code (skip `clearButtonMode`).

**Rationale**: `clearButtonMode` is iOS-only and doesn't work on Android/web. A custom clear button provides consistent behavior across all 3 platforms. Matches the simple visual style of the existing app.

### [D4] No keyboard handling changes

**Choice**: No `KeyboardAvoidingView` needed.

**Rationale**: The checklist is already inside a `ScrollView` which handles keyboard avoidance on both platforms. The search input is at the top of the checklist content, so it will be visible above the keyboard.

### [D5] Visual style consistent with QuickAdd input

**Choice**: Same border, border-radius, padding, font size as QuickAdd's `TextInput` (`borderWidth: 1, borderColor: #e0e0e0, borderRadius: 8, padding: 12, fontSize: 16`).

**Rationale**: Visual consistency. The search bar and QuickAdd are different widgets (filter vs. add) but should feel like they belong to the same app. Different placeholder text ("Search staples..." vs "Add an item...") provides sufficient differentiation.

## Component Changes

| Component | Change | Scope |
|-----------|--------|-------|
| `StapleChecklist` | Add `TextInput` + clear button + `searchQuery` state + `filterStaples` pure function | US-01, US-02 |
| `StapleChecklist` | Add empty state message when filtered list is empty | US-02 |

No changes to: HomeView, domain layer, ports, adapters, hooks.

## Technology Stack

No new dependencies. Uses existing `TextInput`, `Pressable`, `Text` from `react-native`.

## Constraints Established

- Search query must NOT be persisted or lifted to parent
- Filter function must be a testable pure function (not inlined in JSX)
- No debouncing (list is <100 items)

## Upstream Changes

None. All DISCUSS assumptions hold.
