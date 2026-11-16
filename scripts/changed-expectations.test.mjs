import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MARKER,
  parseExpectations,
  renderComment,
} from './changed-expectations.mjs';

const DIFF = `diff --git a/src/domain/trip.test.ts b/src/domain/trip.test.ts
--- a/src/domain/trip.test.ts
+++ b/src/domain/trip.test.ts
@@ -10 +10 @@
-    expect(result.total).toBe(3);
+    expect(result.total).toBe(4);
@@ -20,0 +21 @@
+    expect(result.items).toHaveLength(2);
@@ -30 +31 @@
-    const x = 1;
+    const x = 2;
diff --git a/src/domain/trip.ts b/src/domain/trip.ts
--- a/src/domain/trip.ts
+++ b/src/domain/trip.ts
@@ -1 +1 @@
-  expect(this).not.toBeCalled();
+  expect(that).not.toBeCalled();
diff --git a/tests/old.test.tsx b/tests/old.test.tsx
deleted file mode 100644
--- a/tests/old.test.tsx
+++ /dev/null
@@ -1,2 +0,0 @@
-  expect(a).toBe(1);
-  expect(b).toBe(2);
`;

describe('parseExpectations', () => {
  it('collects removed and added expect lines in test files only', () => {
    const { removed, added } = parseExpectations(DIFF);
    assert.deepEqual(
      removed.map((r) => [r.file, r.text]),
      [
        ['src/domain/trip.test.ts', 'expect(result.total).toBe(3);'],
        ['tests/old.test.tsx', 'expect(a).toBe(1);'],
        ['tests/old.test.tsx', 'expect(b).toBe(2);'],
      ],
    );
    assert.deepEqual(
      added.map((a) => a.text),
      [
        'expect(result.total).toBe(4);',
        'expect(result.items).toHaveLength(2);',
      ],
    );
  });

  it('ignores lines that merely mention expect without calling it', () => {
    const { removed, added } = parseExpectations(
      '--- a/a.test.ts\n+++ b/a.test.ts\n-// we expect things\n+// expected',
    );
    assert.deepEqual([removed, added], [[], []]);
  });

  it('returns nothing for an empty diff', () => {
    assert.deepEqual(parseExpectations(''), { removed: [], added: [] });
  });
});

describe('renderComment', () => {
  it('is empty when no expectation changed', () => {
    assert.equal(renderComment({ removed: [], added: [] }), '');
  });

  it('starts with the marker and lists both sections with counts', () => {
    const out = renderComment(parseExpectations(DIFF));
    assert.ok(out.startsWith(MARKER));
    assert.match(out, /\*\*Removed \(3\)\*\*/);
    assert.match(out, /\*\*Added \(2\)\*\*/);
    assert.match(out, /`tests\/old\.test\.tsx`: `expect\(a\)\.toBe\(1\);`/);
  });

  it('caps long lists and says how many were left out', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({
      file: 'a.test.ts',
      text: `expect(${i})`,
    }));
    assert.match(renderComment({ removed: many, added: [] }), /and 5 more/);
  });

  it('keeps backticks in expectation text from breaking the Markdown', () => {
    const out = renderComment({
      removed: [{ file: 'a.test.ts', text: 'expect(`x`)' }],
      added: [],
    });
    assert.match(out, /`expect\('x'\)`/);
  });
});
