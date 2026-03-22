# ADR-004: Bottom Sheet Implementation for Metadata Entry

## Status

Proposed

## Context

The add-item-flow feature requires a bottom sheet overlay for capturing item metadata (type, area, section, aisle). The sheet opens when the user taps "Add as new item" from QuickAdd's suggestion list.

Requirements:
- Slide-up modal containing a static form (5 fields, 2-3 buttons)
- Must work on iOS and Android
- No new runtime dependencies (project constraint)
- No gesture-based interaction needed (drag-to-dismiss, snap points) -- the form requires deliberate input
- Performance: sheet must open instantly (no async data loading)

The existing project uses Expo SDK 54 with React Native's New Architecture. No bottom sheet or modal component exists in the codebase yet.

## Decision

Use React Native's built-in `Modal` component with `animationType="slide"` for the bottom sheet behavior.

On iOS, `presentationStyle="pageSheet"` provides native bottom sheet appearance. On Android, the slide animation provides equivalent UX. The modal content is a View with absolute positioning at the bottom of the screen with a semi-transparent backdrop.

## Alternatives Considered

### Alternative 1: @gorhom/bottom-sheet (MIT license)

The most popular React Native bottom sheet library. Provides gesture-based interactions, snap points, keyboard handling, and smooth animations via Reanimated.

**Evaluation**:
- (+) Production-grade bottom sheet UX with gestures
- (+) Snap points, keyboard avoidance, backdrop handling built-in
- (+) Well-maintained (active development, 5k+ GitHub stars)
- (-) Adds react-native-reanimated + react-native-gesture-handler as transitive dependencies
- (-) Native dependencies require EAS build (cannot test in Expo Go without dev client)
- (-) Violates "no new runtime dependencies" constraint
- (-) Overkill for a static form -- gestures and snap points add no value here

**Rejected because**: Adds significant dependency footprint (3 native libraries) for features the static form does not need. The constraint explicitly prohibits new runtime dependencies.

### Alternative 2: Custom Animated.View with React Native Animated API

Build a bottom sheet from scratch using `Animated.View` with `translateY` animations and a `TouchableWithoutFeedback` backdrop.

**Evaluation**:
- (+) Zero dependencies
- (+) Full control over animation and behavior
- (-) Must implement: animation timing, backdrop tap dismiss, keyboard avoidance, safe area handling
- (-) Higher development effort for equivalent result to Modal
- (-) Must handle platform-specific edge cases (Android back button, iOS swipe gestures)

**Rejected because**: Reimplements what Modal already provides. The development effort is not justified when Modal meets all requirements. If custom animation needs emerge later, this can be revisited.

## Consequences

### Positive

- Zero new dependencies added to the project
- Modal is battle-tested React Native core API with consistent cross-platform behavior
- Slide animation provides standard bottom sheet UX out of the box
- No native rebuild required -- works in Expo Go
- Simple API: `visible` prop controls open/close

### Negative

- No gesture-based drag-to-dismiss (user must tap a button or backdrop to close)
- No snap points (sheet is either fully open or closed)
- Modal creates a new React Native root view, which can complicate keyboard handling on some Android versions (mitigated: form fields are few and above fold)
- If gesture-based interaction is later desired (e.g., for a scrollable item list sheet), this decision would need to be superseded by @gorhom/bottom-sheet

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Performance | Positive -- native Modal rendering, no JS-driven animations |
| Maintainability | Positive -- zero external dependency to maintain |
| Usability | Neutral -- adequate for a form, lacks gesture refinement |
| Testability | Positive -- Modal testable with @testing-library/react-native |
