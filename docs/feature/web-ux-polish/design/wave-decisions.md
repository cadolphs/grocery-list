# DESIGN Decisions -- web-ux-polish

## Architecture Impact

**Low.** UI-only feature. No domain, port, adapter, or hook changes beyond a new `useIsWeb()` hook. Platform-split is the mechanism; detection happens in one place.

## Key Decisions

### [D1] Single `useIsWeb()` hook for platform detection

**Choice**: Create `src/hooks/useIsWeb.ts`:

```typescript
import { Platform } from 'react-native';

export const useIsWeb = (): boolean => Platform.OS === 'web';
```

**Rationale**: One import across the codebase. Trivial to stub in tests via `jest.mock('../hooks/useIsWeb')`. No re-renders (Platform.OS is a constant after JS load).

**Alternative considered**: Inline `Platform.OS === 'web'` at each call site. Rejected — scattered checks are harder to test and harder to change if we ever need runtime override (e.g., feature flag).

### [D2] Enter key in QuickAdd input opens metadata sheet

**Choice**: Use React Native's `onSubmitEditing` on the QuickAdd `TextInput`.

**Rationale**: `onSubmitEditing` fires when the user presses Enter on web, Return on iOS, or the Done button on Android. Works cross-platform. The handler invokes the existing `handleAdd` flow (which opens the metadata sheet).

**Platform behavior**: On web, this is snappy (Enter = submit). On mobile, it also works but users typically tap. No platform split needed.

**Implementation**: Add `onSubmitEditing={handleAdd}` to `TextInput` in `QuickAdd.tsx`. `blurOnSubmit={false}` to keep focus after submission.

### [D3] Enter key in MetadataBottomSheet submits the form

**Choice**: Set `onSubmitEditing={handleSubmit}` on the last text input (Aisle number) AND `blurOnSubmit={false}` so the keyboard doesn't dismiss on intermediate fields. For staple-mode, the "Aisle number" field is the last one before submit.

**Alternative considered**: Wire Enter to submit from any field. Rejected for simplicity — users can Tab to the last field, then Enter. Matches web form conventions.

**Platform behavior**: Works on web (Enter key). On mobile, the keyboard's Done button does the same.

### [D4] Autofocus QuickAdd input on web only

**Choice**: Add `autoFocus={isWeb}` to QuickAdd's `TextInput`, using the `useIsWeb()` hook.

**Rationale**: On desktop web, landing on the home page with focus in the input lets the user type immediately. On mobile, autofocus would pop up the keyboard unexpectedly — bad UX.

**Platform behavior**: Web autofocuses; iOS/Android does not.

### [D5] Autofocus first editable field when MetadataBottomSheet opens

**Choice**: Use a ref + `useEffect` to focus the first editable field (the area picker is button-based; the first text field is "Store section..."). When `visible` becomes true AND `isWeb` is true, call `sectionInputRef.current?.focus()`.

**Rationale**: After Enter in QuickAdd opens the sheet, the user should be able to immediately Tab to area buttons (skippable) or start typing section name. For the common case (add a one-off with sensible defaults), focusing "Store section..." lets them type and Enter to submit.

**Edge case**: In edit mode, focusing the section input is fine — it's pre-filled, user can edit or Tab away.

### [D6] Return focus to QuickAdd after sheet dismiss

**Choice**: Add a `useRef` to QuickAdd's `TextInput`, expose a callback or let HomeView coordinate. Simplest: after `onDismiss` fires on MetadataBottomSheet, the QuickAdd input's `autoFocus` effect re-runs if we add a `focusTrigger` counter that increments on dismiss. 

**Simpler alternative**: QuickAdd component holds its own ref, exposes a `focus()` method via `useImperativeHandle`, and HomeView calls it in `handleDismissMetadataSheet`. 

**Chosen**: Pass a `shouldFocus: boolean` prop to QuickAdd that flips on dismiss. When it flips true AND `isWeb`, focus the input. Keeps QuickAdd's imperative surface minimal.

**Actually simplest**: Use `useImperativeHandle` and expose `focus()`. That's the idiomatic React pattern. Accepting the one imperative API on QuickAdd.

### [D7] Replace long-press with visible pencil icon on web

**Choice**: In `TripItemRow`, `StapleChecklist`'s `StapleRow`, and any other long-press-enabled row, conditionally render a pencil icon at the right edge when `isWeb` is true. The icon is a `Pressable` that calls the same `onLongPress` callback (renamed semantic: "edit action" rather than "long press").

**Icon choice**: Start with a text character ("✎" U+270E PENCIL or "⋯" three dots) to avoid adding an icon library dependency. Can upgrade to `@expo/vector-icons` later if needed — it's already in the Expo SDK but not currently imported anywhere in `src/ui/`.

**Mobile behavior unchanged**: long-press continues to work; the pencil is not rendered on iOS/Android.

**Accessibility**: The `Pressable` includes an accessibility label ("Edit {item name}").

### [D8] Keep the existing `onLongPress` prop name

**Choice**: Don't rename `onLongPress` props to something more generic like `onEdit`. The prop name is an implementation detail; the callback it invokes is the same "open edit sheet" action.

**Rationale**: Renaming cascades through many components and tests for no user-visible benefit. The platform-split lives in the component that decides how to surface the action.

## Component Changes

| Component | Change | Story |
|-----------|--------|-------|
| `src/hooks/useIsWeb.ts` | NEW: trivial Platform.OS wrapper | US-01 (foundation) |
| `src/ui/QuickAdd.tsx` | autoFocus on web, onSubmitEditing opens sheet, forwardRef + useImperativeHandle.focus() | US-01, US-02, US-05 |
| `src/ui/MetadataBottomSheet.tsx` | autoFocus section input on web when visible, onSubmitEditing on last input submits | US-03, US-04 |
| `src/ui/HomeView.tsx` | quickAddRef + refocus on sheet dismiss | US-05 |
| `src/ui/StoreView.tsx` | Same refocus pattern | US-05 |
| `src/ui/TripItemRow.tsx` | Render pencil icon on web when `onLongPress` provided | US-06 |
| `src/ui/StapleChecklist.tsx` | Render pencil icon on web in StapleRow when `onLongPress` provided | US-06 |

No changes to: domain, ports, adapters, other hooks.

## Technology Stack

**No new dependencies.** Everything uses React Native APIs already in the project.

- `Platform.OS` — already in use (firebase-config.ts)
- `autoFocus`, `onSubmitEditing`, `blurOnSubmit` — standard TextInput props
- `useImperativeHandle` + `forwardRef` — standard React
- Pencil character (✎ or ✏️) — no icon library needed initially

## Constraints Established

- `useIsWeb()` returns a `boolean` (not a hook that returns state) — Platform.OS is constant, so the hook can simply return the check. No re-render issues.
- Mobile tests must NOT break: every change that adds a web behavior must have a corresponding assertion that the behavior is ABSENT on mobile (verified via `jest.mock('../hooks/useIsWeb', () => ({ useIsWeb: () => false }))` in mobile test cases).
- Jest default `Platform.OS` in this project is `'ios'` (standard Expo test config). Web-specific tests need explicit `jest.mock` of `useIsWeb`.

## Upstream Changes

None. All DISCUSS assumptions hold.

## Open Items for DISTILL

- Confirm that `autoFocus` on React Native Web's TextInput actually focuses the DOM input on mount. (Expected yes — React Native Web maps `autoFocus` to the HTML attribute.)
- Confirm that `onSubmitEditing` fires on Enter key press on React Native Web. (Expected yes — RNW dispatches it for `keyCode === 13`.)
- Verify that `useImperativeHandle` + `forwardRef` pattern works with the functional paradigm in this project (no prior usage; low risk, standard React).
