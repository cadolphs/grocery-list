// Corner shop palette: cream page, black ink, hard borders, a sunny yellow
// accent. Contrast carries the design: src/ui/theme.test.ts asserts WCAG AA
// for every text and UI pair below. Tokens mirror design.pen. Update both in
// sync.
//
// accent is a fill, never a text colour (yellow on cream is 1.4:1). Text on an
// accent fill uses onAccent.

export const theme = {
  color: {
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
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 9999,
  },
} as const;
