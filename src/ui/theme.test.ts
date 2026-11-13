import { theme } from './theme';

const { color } = theme;

const channel = (hex: string, start: number) => {
  const c = parseInt(hex.slice(start, start + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) =>
  0.2126 * channel(hex, 1) +
  0.7152 * channel(hex, 3) +
  0.0722 * channel(hex, 5);

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

type Token = keyof typeof color;

// WCAG AA: 4.5:1 for text, 3:1 for large text and UI components.
const TEXT = 4.5;
const UI = 3;

const pairs: [foreground: Token, background: Token, minimum: number][] = [
  ['text', 'ground', TEXT],
  ['text', 'tile', TEXT],
  ['text', 'surface', TEXT],
  ['text', 'accentSoft', TEXT],
  ['textMuted', 'ground', TEXT],
  ['textMuted', 'tile', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'accentSoft', TEXT],
  ['onAccent', 'accent', TEXT],
  ['inverseText', 'inverse', TEXT],
  ['inverseText', 'danger', TEXT],
  ['danger', 'ground', TEXT],
  ['danger', 'tile', TEXT],
  ['danger', 'accentSoft', TEXT],
  ['border', 'ground', UI],
  ['border', 'tile', UI],
  ['border', 'accentSoft', UI],
  ['border', 'accent', UI],
];

describe('theme contrast (WCAG AA)', () => {
  it.each(pairs)('%s on %s is at least %s:1', (fg, bg, minimum) => {
    expect(contrast(color[fg], color[bg])).toBeGreaterThanOrEqual(minimum);
  });

  it('keeps accent a fill: it is not readable as text on the page', () => {
    expect(contrast(color.accent, color.ground)).toBeLessThan(UI);
  });

  it('uses six-digit hex for every colour so the ratios stay checkable', () => {
    for (const value of Object.values(color)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
