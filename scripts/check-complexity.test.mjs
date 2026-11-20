import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  DEFAULT_THRESHOLDS,
  collectFiles,
  exceeded,
  findOutliers,
  measureFiles,
  measureSource,
  parseArgs,
  renderReport,
} from './check-complexity.mjs';

const lines = (...xs) => xs.join('\n') + '\n';

describe('measureSource: lines', () => {
  it('counts lines without the trailing newline', () => {
    assert.equal(measureSource('a\nb\n').lines, 2);
    assert.equal(measureSource('a\nb').lines, 2);
    assert.equal(measureSource('').lines, 0);
  });
});

describe('measureSource: longest function', () => {
  it('measures an arrow declaration with a return type, body inclusive', () => {
    const src = lines(
      'export const HomeView = (): React.JSX.Element => {',
      '  const x = 1;',
      '  return <View>{x}</View>;',
      '};',
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: 'HomeView',
      lines: 4,
      line: 1,
    });
  });

  it('measures a function declaration with a return type', () => {
    const src = lines(
      'function total(items: Item[]): number {',
      '  return items.length;',
      '}',
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: 'total',
      lines: 3,
      line: 1,
    });
  });

  it('names a component whose destructured props span lines', () => {
    const src = lines(
      'export const AreaSection = ({',
      '  areaGroup,',
      '  onToggle,',
      '}: AreaSectionProps): React.JSX.Element => {',
      '  return null;',
      '};',
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: 'AreaSection',
      lines: 3,
      line: 4,
    });
  });

  it('reports a nameless callback under the enclosing name', () => {
    const src = lines(
      'const useThing = () => {',
      '  useEffect(() => {',
      '    const unsubscribe = subscribe(() => {',
      '      setValue(read());',
      '    });',
      '    return unsubscribe;',
      '  }, []);',
      '};',
    );
    const { longestFunction } = measureSource(src);
    assert.equal(longestFunction.name, 'useThing');
    assert.equal(longestFunction.lines, 8);
  });

  it('measures methods on an object literal and async arrows', () => {
    const src = lines(
      'export const createStore = () => ({',
      '  async load(key: string) {',
      '    const raw = await get(key);',
      '    return raw;',
      '  },',
      '  save: async (key: string) => {',
      '    await set(key);',
      '  },',
      '});',
    );
    const { longestFunction } = measureSource(src);
    assert.equal(longestFunction.name, 'load');
    assert.equal(longestFunction.lines, 4);
  });

  it('does not count object literals or control blocks as functions', () => {
    const src = lines(
      'const styles = StyleSheet.create({',
      '  row: {',
      '    flex: 1,',
      '  },',
      '  text: {',
      '    flex: 1,',
      '  },',
      '});',
      'if (styles.row) {',
      '  log(styles);',
      '  log(styles);',
      '  log(styles);',
      '}',
      'const tiny = () => {',
      '  return 1;',
      '};',
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: 'tiny',
      lines: 3,
      line: 14,
    });
  });

  it('reports no function for a file of types and constants', () => {
    const src = lines(
      'export type Item = { name: string };',
      "export const DEFAULTS = ['a', 'b'];",
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: '',
      lines: 0,
      line: 0,
    });
  });
});

describe('measureSource: nesting', () => {
  it('is the deepest bracket depth, with the line it is reached on', () => {
    const src = lines(
      'const f = () => {', // 1
      '  return items.map((item) => ({', // 2 ( 3 ( 4 {
      '    nested: [item.value],', // 5 [
      '  }));',
      '};',
    );
    assert.deepEqual(measureSource(src).maxNesting, { depth: 5, line: 3 });
  });

  it('is 0 for an empty file', () => {
    assert.deepEqual(measureSource('').maxNesting, { depth: 0, line: 0 });
  });
});

describe('measureSource: what the scan skips', () => {
  const unbalancedButFine = (body) =>
    lines('const f = () => {', body, '  return 1;', '};');

  it('ignores brackets in strings, template literals, comments and regexes', () => {
    for (const body of [
      "  const a = '{[(';",
      '  const b = "}}";',
      '  const c = `${a}{` + `${b}(`;',
      '  const d = `${items.map((i) => `${i}}`).join("")} {`;',
      '  // a comment with {{{',
      '  /* a block {{{ comment\n     over two lines */',
      '  const e = /[{(]/.test(a);',
      '  const g = a / b / c;',
    ]) {
      const { longestFunction, maxNesting } = measureSource(
        unbalancedButFine(body),
      );
      assert.equal(longestFunction.lines, 3 + body.split('\n').length, body);
      assert.ok(maxNesting.depth <= 4, body);
    }
  });

  it('treats an apostrophe in JSX text as prose', () => {
    const src = lines(
      'const Hint = () => {',
      "  return <Text>Don't have an account? {link}</Text>;",
      '};',
      'const after = () => {',
      '  return 1;',
      '};',
    );
    const { longestFunction, maxNesting } = measureSource(src);
    assert.equal(longestFunction.lines, 3);
    assert.equal(maxNesting.depth, 2);
  });

  it('does not take a self-closing JSX tag after a brace for a regex', () => {
    const src = lines(
      'const Screen = () => {',
      '  return (',
      '    <View>',
      '      <Row onPress={handle} />',
      '      {show && (',
      '        <Other />',
      '      )}',
      '    </View>',
      '  );',
      '};',
    );
    assert.deepEqual(measureSource(src).longestFunction, {
      name: 'Screen',
      lines: 10,
      line: 1,
    });
  });
});

describe('collectFiles and measureFiles', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'check-complexity-'));
    mkdirSync(join(root, 'src', 'ui'), { recursive: true });
    mkdirSync(join(root, 'src', 'domain'));
    writeFileSync(join(root, 'App.tsx'), lines('export const App = 1;'));
    writeFileSync(
      join(root, 'src', 'ui', 'Big.tsx'),
      lines('const Big = () => {', ...Array(5).fill('  f();'), '};'),
    );
    writeFileSync(join(root, 'src', 'ui', 'Big.test.tsx'), lines('{{{{{{{{'));
    writeFileSync(join(root, 'src', 'domain', 'a.ts'), lines('export {};'));
    writeFileSync(join(root, 'src', 'domain', 'a.test.ts'), lines('{{{{'));
    writeFileSync(join(root, 'src', 'notes.md'), lines('{{{{'));
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it('lists non-test .ts/.tsx files under the paths, relative and sorted', () => {
    assert.deepEqual(collectFiles(['src', 'App.tsx'], root), [
      'src/domain/a.ts',
      'src/ui/Big.tsx',
      'App.tsx',
    ]);
  });

  it('measures each file', () => {
    const rows = measureFiles(['src/ui/Big.tsx', 'App.tsx'], root);
    assert.equal(rows[0].file, 'src/ui/Big.tsx');
    assert.equal(rows[0].lines, 7);
    assert.equal(rows[0].longestFunction.name, 'Big');
    assert.equal(rows[1].lines, 1);
  });
});

const row = (file, l, fn, depth) => ({
  file,
  lines: l,
  longestFunction: { name: 'f', lines: fn, line: 1 },
  maxNesting: { depth, line: 2 },
});

describe('exceeded and findOutliers', () => {
  it('names the thresholds a row crosses, strictly above', () => {
    assert.deepEqual(exceeded(row('a', 400, 150, 8)), []);
    assert.deepEqual(exceeded(row('a', 401, 151, 9)), [
      'file lines',
      'function lines',
      'nesting',
    ]);
    assert.deepEqual(
      exceeded(row('a', 10, 10, 3), { ...DEFAULT_THRESHOLDS, maxNesting: 2 }),
      ['nesting'],
    );
  });

  it('keeps only outliers, largest file first', () => {
    const rows = [
      row('small', 10, 5, 2),
      row('b', 500, 10, 2),
      row('a', 500, 200, 2),
    ];
    assert.deepEqual(
      findOutliers(rows).map((r) => r.file),
      ['a', 'b'],
    );
  });
});

describe('renderReport', () => {
  it('says so when nothing is over the thresholds', () => {
    assert.equal(
      renderReport([row('a', 10, 5, 2)]),
      'No complexity outliers in 1 files (file > 400 lines, function > 150 lines, nesting > 8).\n',
    );
  });

  it('renders a markdown table of the outliers', () => {
    const out = renderReport([row('src/x.ts', 500, 5, 9), row('ok', 1, 1, 1)]);
    assert.match(out, /^1 of 2 files over thresholds/);
    assert.match(
      out,
      /\| File \| Lines \| Longest function \| Max nesting \| Over \|/,
    );
    assert.match(
      out,
      /\| `src\/x\.ts` \| 500 \| `f` \(5 lines, L1\) \| 9 \(L2\) \| file lines, nesting \|/,
    );
    assert.doesNotMatch(out, /`ok`/);
  });

  it('lists every file with all, marking healthy ones with a dash', () => {
    const out = renderReport(
      [row('ok', 1, 0, 1), row('big', 500, 5, 1)],
      DEFAULT_THRESHOLDS,
      { all: true },
    );
    assert.match(
      out,
      /\| `big` \| 500 .* \| file lines \|\n\| `ok` \| 1 \| none \| 1 \(L2\) \| - \|/,
    );
  });
});

describe('parseArgs', () => {
  it('defaults to src and App.tsx with the default thresholds', () => {
    assert.deepEqual(parseArgs([]), {
      thresholds: DEFAULT_THRESHOLDS,
      all: false,
      paths: ['src', 'App.tsx'],
    });
  });

  it('reads threshold flags, --all and paths', () => {
    assert.deepEqual(
      parseArgs(['--max-file-lines=10', '--max-nesting=3', '--all', 'lib']),
      {
        thresholds: { maxFileLines: 10, maxFunctionLines: 150, maxNesting: 3 },
        all: true,
        paths: ['lib'],
      },
    );
  });

  it('rejects unknown or valueless flags', () => {
    assert.throws(() => parseArgs(['--max-nesting']), /incomplete flag/);
    assert.throws(() => parseArgs(['--verbose']), /unknown/);
  });
});
