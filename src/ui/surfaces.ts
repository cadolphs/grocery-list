import type { ViewStyle } from 'react-native';
import { theme } from './theme';

// Style fragments for the Corner shop look: 2px ink borders, hard offset
// blocks on the things you press or that sit raised on the page. Spread one
// first in a style, then add layout (padding, margins) after it.

const edge = {
  borderWidth: theme.border.width,
  borderColor: theme.color.border,
  borderRadius: theme.radius.md,
} as const;

const control = { ...edge, minHeight: theme.target.min } as const;

export const surfaces = {
  card: {
    ...edge,
    backgroundColor: theme.color.tile,
    boxShadow: theme.shadow.block,
  },
  dialog: {
    ...edge,
    backgroundColor: theme.color.accentSoft,
    boxShadow: theme.shadow.block,
  },
  input: { ...control, backgroundColor: theme.color.surface },
  primaryButton: {
    ...control,
    backgroundColor: theme.color.accent,
    boxShadow: theme.shadow.block,
  },
  darkButton: {
    ...control,
    backgroundColor: theme.color.inverse,
    borderColor: theme.color.inverse,
  },
  dangerButton: { ...control, backgroundColor: theme.color.danger },
  secondaryButton: { ...control, backgroundColor: theme.color.accentSoft },
} satisfies Record<string, ViewStyle>;

// A primary button collapses onto its page while pressed: the block goes and
// the button moves into its place.
export const pressedBlock = (pressed: boolean): ViewStyle =>
  pressed
    ? {
        boxShadow: 'none',
        transform: [
          { translateX: theme.border.width + 1 },
          { translateY: theme.border.width + 1 },
        ],
      }
    : {};

// Text-only links are about 20px tall. This pads their hit area out to the
// 48px target without moving anything on screen.
export const linkHit = { top: 14, bottom: 14, left: 10, right: 10 } as const;
