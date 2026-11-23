# ADR-014: Row swipe via react-native-gesture-handler

Status: accepted Date: 2026-11-23

## Decision

A trip row is a three-position slider for its decision (not-needed ‹ undecided
› needed). Swipe right moves one step toward `needed`, swipe left one step
toward `not-needed`; tap does nothing, long-press edits. The swipe is built on
`react-native-gesture-handler`, the project's first gesture dependency. On web
the row also shows ✓ / ✗ buttons that take the same single step.

## Why

A tri-state needs two distinct gestures, and tap-to-cycle overshoots the state
you want half the time. `PanResponder` is built in but fights the parent
`ScrollView` for the gesture and is unreliable on Android; gesture-handler is
the standard answer and ships with Expo. This is a deliberate step past the
"no new runtime dependencies" constraint recorded in
ADR-004-bottom-sheet-implementation: that record stands for the metadata
sheet, which still has no reason to use gestures. New dependencies are a
medium-tier change (`AGENTS.md`), so this ships through a human merge.

Reanimated is not added: the swipe reveals state, it does not need a
spring animation.

## Revisit if

Gesture-handler breaks under an Expo SDK upgrade and cannot be pinned, or
swipe proves hard to discover and ✓ / ✗ buttons become the primary control on
mobile too (then the dependency may go).
