# Bug Fix Scope: fix-sweep-new-sections-missing

## Defect
During Sweep, user adds staples with new store sections. Navigating to re-order store sections screen does not show newly-added sections.

## Root Causes (from RCA)
- **P0 (ship):** `SectionOrderSettingsScreen.tsx:56-61` `orderedEntries` short-circuits to `order.map(parseSectionKey)` when custom order exists, ignoring new sections. `appendNewSections()` in `src/domain/section-ordering.ts:25-32` exists for this case but is unused in prod.
- **P2 (user requested in scope):** `knownSectionKeys` in `SectionOrderSettingsScreen.tsx:42-54` memoised against `[stapleLibrary]` reference which is stable — never re-evaluates. `useSectionOrder` (`src/hooks/useSectionOrder.ts:15`) has no subscription to library mutations. Would surface in any "add while screen open" scenario.

## Fix Direction
1. Wire `appendNewSections(order, knownSectionKeys)` into `orderedEntries` useMemo when `order !== null`. Read-time merge, no storage mutation.
2. Make `knownSectionKeys` reactive to staple-library mutations so the settings screen updates live (not only on re-mount).

## Regression Tests Required
- **Test A (P0):** Seed custom order, mutate staple library to introduce new section, render screen, assert new section appears in the rendered list.
- **Test B (P2):** Render screen with custom order, mutate staple library while mounted, assert list re-renders with new section (no re-mount).

## Files
- Fix: `src/ui/SectionOrderSettingsScreen.tsx`, possibly `src/hooks/useSectionOrder.ts` or staple-library subscription mechanism for P2
- Regression tests: `tests/regression/ui/section-order-settings.test.tsx`
- Reuses: `src/domain/section-ordering.ts#appendNewSections` (already tested)

## Constraints
- Functional paradigm (per project CLAUDE.md). No classes.
- Minimal scope — no refactoring beyond what P0 + P2 need.
- Do not touch domain code unnecessarily (Stryker mutation threshold).

## RCA
See `../troubleshoot/rca.md`.
