// SweepRowSwipe (web) - no gesture: web rows carry ✓ / ✗ buttons instead
// (ADR-014). iOS and Android resolve SweepRowSwipe.native.tsx, which wraps
// the row in a pan gesture; this file keeps gesture-handler out of the web
// bundle.

import React from 'react';

export type SweepRowSwipeProps = {
  readonly onSwipeRight: () => void;
  readonly onSwipeLeft: () => void;
  readonly children: React.ReactNode;
};

export const SweepRowSwipe = ({
  children,
}: SweepRowSwipeProps): React.JSX.Element => <>{children}</>;
