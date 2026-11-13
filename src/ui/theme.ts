// Corner shop palette: cream page, black ink, hard borders, a sunny yellow
// accent. Contrast carries the design: src/ui/theme.test.ts asserts WCAG AA
// for every text and UI pair below. Tokens mirror design.pen. Update both in
// sync.
//
// accent is a fill, never a text colour (yellow on cream is 1.4:1). Text on an
// accent fill uses onAccent.

const color = {
  ground: '#FFF6DD',
  tile: '#FFFFFF',
  surface: '#FFFFFF',
  inverse: '#111111',
  inverseText: '#FFFFFF',
  text: '#111111',
  textMuted: '#4D4D4D',
  accent: '#FFC933',
  onAccent: '#111111',
  accentSoft: '#FFE9A8',
  danger: '#B3261E',
  border: '#111111',
} as const;

export const theme = {
  color,
  // Type scale: nothing under 14, two weights.
  font: {
    size: { sm: 14, md: 16, lg: 20, xl: 28 },
    weight: { regular: '500', bold: '700' },
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { md: 8, pill: 9999 },
  border: { width: 2 },
  // Hard offset block: 3px right and down, solid ink, no blur.
  shadow: { block: `3px 3px 0px ${color.border}` },
  // Minimum height for buttons, inputs and rows.
  target: { min: 48 },
} as const;
