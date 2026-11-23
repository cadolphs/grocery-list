// SweepRowSwipe (iOS / Android) - a sweep row as a swipe slider (ADR-014).
// Swipe right steps toward Needed, left toward Not needed. A drag short of
// the threshold snaps back and changes nothing. The pan only activates on a
// horizontal move and fails on a vertical one, so the list still scrolls.
// Web gets SweepRowSwipe.tsx and never imports gesture-handler.

import React, { useState } from 'react';
import { Animated } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { SweepRowSwipeProps } from './SweepRowSwipe';

// Points of horizontal travel before the pan takes over from the scroll.
const ACTIVE_OFFSET_X: [number, number] = [-15, 15];
// Points of vertical travel that hand the touch to the scroll instead.
const FAIL_OFFSET_Y: [number, number] = [-12, 12];
// Points the row must travel for the swipe to count as a step.
const STEP_THRESHOLD = 80;

export const SweepRowSwipe = ({
  onSwipeRight,
  onSwipeLeft,
  children,
}: SweepRowSwipeProps): React.JSX.Element => {
  const [translateX] = useState(() => new Animated.Value(0));

  const pan = usePanGesture({
    activeOffsetX: ACTIVE_OFFSET_X,
    failOffsetY: FAIL_OFFSET_Y,
    disableReanimated: true,
    runOnJS: true,
    onUpdate: (event) => {
      translateX.setValue(event.translationX);
    },
    onDeactivate: (event) => {
      if (event.canceled) return;
      if (event.translationX >= STEP_THRESHOLD) onSwipeRight();
      else if (event.translationX <= -STEP_THRESHOLD) onSwipeLeft();
    },
    onFinalize: () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
