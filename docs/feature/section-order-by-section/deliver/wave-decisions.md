# DELIVER Decisions — section-order-by-section

## Key Decisions
- [DLD-01] Crafter: `nw-functional-software-crafter` (project paradigm = functional per CLAUDE.md).
- [DLD-02] Mutation strategy: `per-feature` (project default).
- [DLD-03] Walking skeleton scenario (WS-1) maps to roadmap step 01-01 (riskiest-first).
- [DLD-04] Pre-existing tests that depended on the legacy composite-key model were re-enabled and migrated in step 02-02 (UI swap) and step 02-03 (legacy export removal). No skip markers remain.
- [DLD-05] Elevator Pitch demo HARD GATE: marked N/A. This is a React Native / Expo UI feature; user-facing entry points are taps, not CLI subprocesses. Phase 2.5 substitute: full Jest acceptance suite passing (13/13) + `tsc --noEmit` clean is the strongest automated proof available without an emulator-driving harness. Manual dogfood remains the user's responsibility post-deploy per US-02 and US-04 KPIs.

## Implementation Summary
| Step | Phase | Outcome | Commit |
|------|-------|---------|--------|
| 01-01 | RED→GREEN→COMMIT | `groupBySection` implemented (intra-section aisle ascending, nulls last, stable tie-break) | 69b8fde |
| 01-02 | RED→GREEN→COMMIT | `sortByCustomOrder` alphabetical fallback for null custom order | 9c3589b |
| 01-03 | RED_ACCEPTANCE→COMMIT (test-only) | `appendNewSections` US-03 scenarios green at section-name granularity | 0ec2df1 |
| 02-01 | RED→GREEN→COMMIT | Legacy-composite migration in `useSectionOrder` first read | 954cf4c |
| 02-02 | RED→GREEN→COMMIT | UI call-site swap (StoreView, SectionOrderSettingsScreen, AisleSection) | 6c41b17 |
| 02-03 | RED→GREEN→COMMIT | Legacy `AisleGroup`/`groupByAisle` exports deleted; regression suite migrated | 753cb7c |

## Test Counts
- Acceptance (`section-order-by-section`): 13/13 passing
- Acceptance (`store-section-order` regression): green (migrated to `groupBySection`/`SectionGroup`)
- Full Jest suite: 702 passed, 23 skipped (pre-existing), 0 failed
- TypeScript: clean

## Demo Evidence — 2026-04-27
N/A per DLD-05. The Elevator Pitch HARD GATE specified by `/nw-deliver` Phase 2.5 step (d) targets CLI/HTTP/hook subprocess outputs and is not directly applicable to a React Native UI feature. Substitute proof:
- 13/13 acceptance scenarios pass through the driving ports (`groupBySection`, `sortByCustomOrder`, `appendNewSections`, `useSectionOrder` hook, `SectionOrderSettingsScreen`, `StoreView`).
- 0 occurrences of `AisleGroup`, `groupByAisle`, `__SCAFFOLD__`, or `RED scaffold` in `src/`.
- TypeScript compilation clean.

## Reuse Analysis Verdict
6 EXTEND, 6 UNCHANGED, 0 CREATE-NEW. Final state matches DESIGN intent.

## Constraints Established
- Section-keyed grouping is now the single domain shape; no fallback or dual path remains.
- Migration runs once per storage instance (idempotent thereafter).
