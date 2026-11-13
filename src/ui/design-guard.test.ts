import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { theme } from './theme';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
  .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

const offenders = (pattern: RegExp) =>
  sources.filter(({ text }) => pattern.test(text)).map(({ name }) => name);

describe('Corner shop design guard', () => {
  it('has screens to check', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('takes font sizes from the type scale, not number literals', () => {
    expect(offenders(/fontSize:\s*\d/)).toEqual([]);
  });

  it('takes font weights from the two-weight scale, not string literals', () => {
    expect(offenders(/fontWeight:\s*['"]/)).toEqual([]);
  });

  it('has no blurred shadows or elevation: depth is the offset block', () => {
    expect(offenders(/shadow(Color|Offset|Opacity|Radius)|elevation:/)).toEqual(
      [],
    );
  });

  it('has no hard-coded hex colors in screens', () => {
    expect(offenders(/#[0-9A-Fa-f]{3,8}\b/)).toEqual([]);
  });

  it('keeps every font size at 14 or above', () => {
    for (const size of Object.values(theme.font.size)) {
      expect(size).toBeGreaterThanOrEqual(14);
    }
  });

  it('makes the offset block a solid, blur-free ink shadow', () => {
    expect(theme.shadow.block).toBe(`3px 3px 0px ${theme.color.border}`);
  });

  it('sets the minimum target at 48', () => {
    expect(theme.target.min).toBe(48);
  });
});
