# Slice 02: Settings Screen Section-Only Rows + Auto-Append Narrowing

## Goal
`SectionOrderSettingsScreen` lists sections only (no aisle prefix); auto-append fires only on truly new section names.

## IN Scope
- US-01: Settings screen renders one row per unique section name; row label = section name only; reorder operates on sections.
- US-03: `appendNewSections` keys on section name; new aisle in known section = no diff; new section name = append.

## OUT Scope
- Nothing remaining after this slice.

## Learning Hypothesis
- **Disproves if it fails**: section-only UI confuses user when same section spans aisles (e.g., user expects to disambiguate aisle 4 vs aisle 7).
- **Confirms if succeeds**: section-grain UI matches Carlos's mental model.

## Acceptance Criteria
- [ ] Settings screen displays unique section names only.
- [ ] Up/Down on a section moves it relative to other sections.
- [ ] Order persists across reload.
- [ ] Adding staple at `Inner Aisles@12` (existing section, new aisle) does NOT add a settings row.
- [ ] Adding staple at `Sushi Bar@null` (new section) DOES add a row at the end.
- [ ] Reset-to-default still works.

## Dependencies
- Slice 01 must land first (storage shape + grouping logic).

## Effort
≤3 hours.

## Reference Class
Original `SectionOrderSettingsScreen` build = ~3 hours; this is a label simplification + key change.
