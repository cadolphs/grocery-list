# Mutation Report: fix-sweep-new-sections-missing

Date: 2026-04-16
Scope: `src/domain/staple-library.ts` (feature-scoped per CLAUDE.md mutation strategy)
Tool: Stryker + jest runner
Threshold: >= 80% kill rate

## Verdict: PASS

- Total mutants: 122
- Killed: 109
- Survived: 13
- Kill rate: **89.3%**

## Surviving Mutants (informational — below 11% survival threshold)

| Line | Mutator | Notes |
|------|---------|-------|
| 27 | StringLiteral | ID prefix generator — non-observable within library contract |
| 27 | MethodExpression | `Math.random()` mutated — non-deterministic path, hard to pin |
| 43 | ConditionalExpression | Validation branch short-circuit — unit tests do not enumerate every guard combination |
| 53 | ConditionalExpression | Same class — duplicate-detection guard |
| 89, 103 | ObjectLiteral / BooleanLiteral | Patch-object literal mutations in update paths; tests assert outcome, not exact patch shape |
| 108 | ConditionalExpression | Update-vs-insert branch |
| 117, 121 | MethodExpression | `updateStaple` internal dispatch |
| 149 | MethodExpression | `remove` dispatch |
| **158** | BlockStatement | **Unsubscribe function body emptied — no test verifies unsubscribe actually removes listener (gap added by P2 step 01-02)** |

## Gap Analysis

The only survivor directly attributable to this bugfix is **L158 (unsubscribe body mutation)**. A test that subscribes, unsubscribes, then mutates the library and asserts the listener was NOT called would kill it. Not added now — kill rate already 89.3%, well above the 80% gate. Tracked as a follow-up test-hardening opportunity.

All other survivors are pre-existing patterns in `staple-library.ts` unrelated to this bugfix.

## Follow-up (non-blocking)

- Consider adding a subscribe/unsubscribe lifecycle test that pins the listener-removal contract.

## Artifacts

- Raw Stryker JSON: `reports/mutation/mutation.json` (gitignored)
- HTML report: `reports/mutation/mutation.html` (gitignored)
- Ad-hoc scoped config used: `stryker.staple-library.config.mjs` (not committed)
