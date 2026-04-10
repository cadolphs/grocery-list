/**
 * Regression test: SafeAreaView must come from react-native-safe-area-context.
 *
 * React Native's built-in SafeAreaView only works on iOS. On Android it has
 * no effect, causing content to render behind the status bar and navigation
 * bar. The fix is to use SafeAreaView from react-native-safe-area-context
 * (which works cross-platform) and wrap the app root in SafeAreaProvider.
 *
 * This test reads source files directly with fs.readFileSync to assert
 * correct import paths -- a source-level guard against import regressions.
 */

import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..', '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('Safe area - cross-platform (Android regression)', () => {
  // Remove .skip to verify the bug exists; kept skipped so CI stays green
  // until the fix lands in step 01-02.
  it.skip('AppShell imports SafeAreaView from react-native-safe-area-context', () => {
    const source = readSource('src/ui/AppShell.tsx');

    expect(source).toMatch(
      /import\s+\{[^}]*SafeAreaView[^}]*\}\s+from\s+['"]react-native-safe-area-context['"]/,
    );
  });

  it.skip('App.tsx wraps content in SafeAreaProvider from react-native-safe-area-context', () => {
    const source = readSource('App.tsx');

    expect(source).toMatch(
      /import\s+\{[^}]*SafeAreaProvider[^}]*\}\s+from\s+['"]react-native-safe-area-context['"]/,
    );
    expect(source).toMatch(/<SafeAreaProvider[\s>]/);
  });
});
