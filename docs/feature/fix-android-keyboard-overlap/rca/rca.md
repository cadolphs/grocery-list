# RCA: Android Soft Keyboard Covers TextInputs

## Problem
On Android, soft keyboard overlays bottom-anchored TextInput fields (notably aisle number in `MetadataBottomSheet`). User cannot see the field while typing.

## Root Cause
No keyboard-inset handling in modal/form components. Codebase has zero `KeyboardAvoidingView` / `KeyboardAware*` usages. `edgeToEdgeEnabled: true` (`app.json:24`) disables Android's implicit `adjustResize` window behavior, so apps must handle IME insets explicitly. RN `<Modal>` on Android does not propagate keyboard insets to ancestors — must be handled inside the modal subtree.

## Evidence Chain (5 Whys)
1. Aisle TextInput rendered at bottom of viewport (`src/ui/MetadataBottomSheet.tsx:464-471`); sheet anchored `flex-end` (`:508`).
2. No keyboard-aware wrapper anywhere (`grep src/ui/**/*.tsx` for `KeyboardAvoidingView|KeyboardAware` → 0 hits).
3. Edge-to-edge enabled (`app.json:24`); `softwareKeyboardLayoutMode` not configured; SDK 54 + Android 15 disables auto-resize for IME inset.
4. `<Modal animationType="slide" transparent>` (`MetadataBottomSheet.tsx:307`) — children layout independent of window insets on Android.
5. **Root cause:** No convention or shared component for "modal/sheet form with keyboard insets." Every form imports `TextInput` directly and assumes platform defaults.

## Scope (Approved by User)
Fix all relevant forms:
- `src/ui/MetadataBottomSheet.tsx` (primary)
- `src/ui/AreaSettingsScreen.tsx`
- `src/ui/StapleChecklist.tsx`
- `src/ui/LoginScreen.tsx`
- `src/ui/QuickAdd.tsx`

## Fix Strategy
Use built-in RN primitives. No new dependency.

- Wrap form content in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`.
- For modals: wrap sheet content; move `justifyContent: 'flex-end'` from overlay to KAV style.
- For full screens: wrap root with `behavior=padding` on iOS, `height` on Android, `flex: 1`.
- Use `<ScrollView keyboardShouldPersistTaps="handled">` where dropdowns or many fields exist.
- Extract a small shared helper / pattern if duplication is ugly.

## Risk
Low. Localized, additive on iOS, no domain logic.

## Files Affected
- `src/ui/MetadataBottomSheet.tsx`
- `src/ui/AreaSettingsScreen.tsx`
- `src/ui/StapleChecklist.tsx`
- `src/ui/LoginScreen.tsx`
- `src/ui/QuickAdd.tsx`
- Tests: `src/ui/MetadataBottomSheet.test.tsx` + relevant peers

## Regression Test Plan
Layout-presence tests asserting `KeyboardAvoidingView` rendered with correct platform behavior (mock `Platform.OS`). RED before fix, GREEN after.
