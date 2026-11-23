// GestureRoot (iOS / Android) - the app root as gesture-handler's root view,
// which every GestureDetector (the sweep row swipe) must sit inside
// (ADR-014). Web gets GestureRoot.tsx and never imports gesture-handler.

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GestureRootProps } from './GestureRoot';

export const GestureRoot = ({
  style,
  children,
}: GestureRootProps): React.JSX.Element => (
  <GestureHandlerRootView style={style}>{children}</GestureHandlerRootView>
);
