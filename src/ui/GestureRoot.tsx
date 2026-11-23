// GestureRoot (web) - a plain View: web has no swipe, so no gesture root
// (ADR-014). iOS and Android resolve GestureRoot.native.tsx.

import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

export type GestureRootProps = {
  readonly style?: StyleProp<ViewStyle>;
  readonly children: React.ReactNode;
};

export const GestureRoot = ({
  style,
  children,
}: GestureRootProps): React.JSX.Element => (
  <View style={style}>{children}</View>
);
