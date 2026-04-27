# Refactor Pass: rename-staple

Single L1 → L2 → L3 → L4 sweep over the rename-staple feature delta.

Scope: `src/ui/MetadataBottomSheet.tsx`, `src/domain/staple-library.ts`,
`tests/unit/domain/staple-library.test.ts`.

Baseline: 19 in-scope tests green (3 suites). Full repo: 646 passed,
23 pre-existing skips, 0 failures. `tsc --noEmit` clean.

## L1 — Composition / Comments / Dead Code

**Outcome:** N/A.

Survey of the rename-staple delta found no dead code, no unused imports,
no WHAT-comments. The file-header comments and the `// Re-initialize
defaults when sheet opens` comment are WHY-style and were retained.
Section-marker comments (`/* Name field - only shown in edit mode */`,
`/* Type toggle - hidden in edit mode */`) sit at structural boundaries
of a 600-line component and aid navigation; retained.

## L2 — Naming

**Outcome:** N/A.

Locals introduced by the feature (`editedName`, `nameError`,
`trimmedName`, `existing`) are all unambiguous in context. `existing`
in `handleSaveEdit` matches the established pattern at line 214 in
`handleSubmit` for the duplicate-found result. No camelcase
inconsistencies. No renames warranted.

## L3 — Functions / Single-responsibility

**Outcome:** Done. One extraction, one commit.

Commit: `refactor(rename-staple): extract validateRename helper from
handleSaveEdit` — `1a5546a`.

The trim → empty → duplicate validation chain inside `handleSaveEdit`
was tangled with effectful state-setters (`setNameError`) and the
submission call (`onSaveEdit`). Extracted into two pure module-level
helpers:

- `validateRename(rawName, area, selfId, findDuplicate) →
  RenameValidationResult` — discriminated union
  `{ kind: 'invalid-empty' } | { kind: 'invalid-duplicate', trimmedName,
  area } | { kind: 'ok', trimmedName }`. Mirrors the
  `decideSectionDropdownState` pattern from the prior
  staple-section-combobox feature.
- `renameErrorMessage(result)` — maps non-ok branches to user-facing
  inline-error strings.

`handleSaveEdit` now reads as: validate → branch on kind → submit.
Behaviour preserved exactly — the untrimmed `editedName` is still what
gets passed to `onSaveEdit` (the trim is a validation-only operation,
not a normalization), and inline-error wording is byte-identical.

All 19 in-scope tests remained green after the move. Full repo
remained green (646 passed). `tsc` clean.

`updateStaple` in `staple-library.ts` was reviewed: already linear
with guard clauses, already delegates duplicate-checking to
`isDuplicateExcludingSelf`. No giant pattern match to dissolve, no
extraction warranted.

## L4 — Module structure / Duplication

**Outcome:** N/A.

Cross-file check between UI `validateRename` and domain `updateStaple`
guards:

- Domain `'name is required'` — lowercase, sentence-fragment, matches
  sibling guards `'house area is required'`, `'store section is
  required'`. Programmatic Result error.
- UI `'Name is required'` — capitalized, conventional for inline form
  error displayed directly to the user.

Both layers must independently enforce the empty-name invariant: the
UI to give the user immediate feedback without a round-trip; the
domain to remain a complete, correct port irrespective of caller
discipline. The wording difference is appropriate to each audience and
not drift. No consolidation.

Add-mode (`handleSubmit`) validation does NOT include a name field
(name is fixed from the search bar) — there is no rename/add overlap
to consolidate. No new modules introduced.

## Quality gates after the pass

- `npx jest tests/acceptance/rename-staple/ tests/unit/domain/staple-library.test.ts --no-coverage` → green (19/19)
- `npx jest --no-coverage` → 646 passed, 23 pre-existing skips, 0 failures
- `npx tsc --noEmit` → clean
- All 9 acceptance scenarios + 5 unit tests still passing
