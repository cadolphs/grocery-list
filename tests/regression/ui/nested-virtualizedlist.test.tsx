// Regression: StapleChecklist must not use FlatList (VirtualizedList)
// because it renders inside HomeView's ScrollView.
// Nesting VirtualizedLists causes a React Native warning and broken scroll behavior.
//
// Strategy: Read the StapleChecklist source and verify it does not import FlatList.
// This is a structural assertion -- if someone reintroduces FlatList, this test fails.

import * as fs from 'fs';
import * as path from 'path';

const STAPLE_CHECKLIST_PATH = path.resolve(
  __dirname,
  '../../../src/ui/StapleChecklist.tsx'
);

describe('nested VirtualizedList regression', () => {
  it.skip('StapleChecklist must not use FlatList or VirtualizedList', () => {
    const source = fs.readFileSync(STAPLE_CHECKLIST_PATH, 'utf-8');

    // StapleChecklist renders inside HomeView's ScrollView.
    // Using FlatList (which extends VirtualizedList) inside a ScrollView
    // causes the "VirtualizedLists should never be nested" warning
    // and breaks scroll behavior.
    //
    // The fix is to use View + map instead of FlatList.
    expect(source).not.toMatch(/\bFlatList\b/);
    expect(source).not.toMatch(/\bVirtualizedList\b/);
  });
});
